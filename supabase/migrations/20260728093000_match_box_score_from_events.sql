-- Makes match_events the source of truth for the box score.
--
-- Two steps, in this order and this file: convert whatever the 12 hand-tallied
-- counters on `matches` still hold into timestamp-less events, then expose a
-- view that re-derives those same 12 numbers by counting events. After this the
-- match form stops writing the counters entirely - the columns stay put until a
-- later migration drops them, so there is a window where they can be inspected
-- against the derived numbers and a rollback is just dropping the view.
--
-- The backfill is deliberately reversible:
--     DELETE FROM public.match_events WHERE source = 'backfill';
--
-- ELIGIBILITY. A match is backfilled only if it has NO events at all. Guarding
-- on `source = 'backfill'` alone would be wrong: a match that had already been
-- tagged from video would sail past that check and get its stale counters added
-- on top of its real events, so a match tagged with 7 goals and still carrying a
-- typed `goals = 5` would report 12. Once a match has been tagged, the events
-- are the truth and the counters are stale by definition.
--
-- The eligible set is captured in a CTE before anything is inserted, so the
-- outcome rows and the origin rows below both see the pre-insert state. Doing it
-- as two sequential INSERTs would mean the first one's rows made every match
-- ineligible for the second.

WITH eligible AS (
    SELECT m.*
    FROM public.matches m
    WHERE NOT EXISTS (
        SELECT 1 FROM public.match_events e WHERE e.session_id = m.session_id
    )
),
-- Ten counters map 1:1 onto an outcome. They carry no origin: legacy rows never
-- recorded where a goal was thrown from.
outcomes AS (
    SELECT e.session_id, t.event_type, NULL::character varying AS shot_origin, t.n
    FROM eligible e
    CROSS JOIN LATERAL (VALUES
        ('goal'::character varying,   e.goals),
        ('shot_missed',               e.shots_missed),
        ('shot_saved',                e.shots_saved),
        ('assist',                    e.assists),
        ('technical_fault',           e.technical_faults),
        ('steal',                     e.steals),
        ('block',                     e.blocks),
        ('suspension_created',        e.suspensions_created),
        ('suspension_received',       e.suspensions_received),
        ('big_mistake',               e.big_mistakes)
    ) AS t(event_type, n)
),
-- nine_m_shots and breakthroughs are ORIGINS, not outcomes - they already
-- double-count with goals in the legacy data. They become outcome-unknown
-- attempts carrying the origin, which reproduces the old numbers exactly
-- without inflating shots_missed with shots that may well have gone in.
origins AS (
    SELECT e.session_id, 'shot_attempt'::character varying AS event_type, t.origin, t.n
    FROM eligible e
    CROSS JOIN LATERAL (VALUES
        ('nine_m'::character varying, e.nine_m_shots),
        ('breakthrough',              e.breakthroughs)
    ) AS t(origin, n)
)
INSERT INTO public.match_events (session_id, event_type, shot_origin, source)
SELECT s.session_id, s.event_type, s.shot_origin, 'backfill'
FROM (
    SELECT session_id, event_type, shot_origin, n FROM outcomes
    UNION ALL
    SELECT session_id, event_type, origin, n FROM origins
) s
CROSS JOIN LATERAL generate_series(1, COALESCE(s.n, 0)) AS g;


-- The view carries the descriptive columns from `matches` and the two from
-- `sessions` that every match screen needs, so the readers stop hand-rolling a
-- join between three queries. security_invoker keeps RLS evaluating as the
-- caller, exactly like daily_facts.
CREATE OR REPLACE VIEW public.match_box_score
WITH (security_invoker = on)
AS
SELECT
    m.session_id,
    s.start_time,
    s.rpe,
    s.merged_into,
    m.opponent,
    m.is_home,
    m.importance,
    m.opposition_difficulty,
    m.play_time_min,

    COUNT(e.id) FILTER (WHERE e.event_type = 'goal')::int                AS goals,
    COUNT(e.id) FILTER (WHERE e.event_type = 'shot_missed')::int         AS shots_missed,
    COUNT(e.id) FILTER (WHERE e.event_type = 'shot_saved')::int          AS shots_saved,
    -- Origin-derived, so every attempt from 9m counts however it ended.
    COUNT(e.id) FILTER (WHERE e.shot_origin = 'nine_m')::int             AS nine_m_shots,
    COUNT(e.id) FILTER (WHERE e.shot_origin = 'breakthrough')::int       AS breakthroughs,
    COUNT(e.id) FILTER (WHERE e.event_type = 'technical_fault')::int     AS technical_faults,
    COUNT(e.id) FILTER (WHERE e.event_type = 'assist')::int              AS assists,
    COUNT(e.id) FILTER (WHERE e.event_type = 'suspension_created')::int  AS suspensions_created,
    COUNT(e.id) FILTER (WHERE e.event_type = 'suspension_received')::int AS suspensions_received,
    COUNT(e.id) FILTER (WHERE e.event_type = 'steal')::int               AS steals,
    COUNT(e.id) FILTER (WHERE e.event_type = 'block')::int               AS blocks,
    COUNT(e.id) FILTER (WHERE e.event_type = 'big_mistake')::int         AS big_mistakes,

    -- Facts the counters never carried. `matches` has no result columns at all,
    -- so the running score recorded at each goal is the only place a final score
    -- can come from.
    MAX(e.score_us)::int                                                 AS final_score_us,
    MAX(e.score_them)::int                                               AS final_score_them,
    COUNT(e.id) FILTER (WHERE e.video_offset_seconds IS NOT NULL)::int   AS clipped_events,
    COUNT(e.id)::int                                                     AS event_count
FROM public.matches m
JOIN public.sessions s ON s.id = m.session_id
-- LEFT so a match with no events shows as zeros rather than disappearing.
LEFT JOIN public.match_events e ON e.session_id = m.session_id
GROUP BY m.session_id, s.id;

GRANT SELECT ON public.match_box_score TO authenticated;

COMMENT ON VIEW public.match_box_score IS
    'Box score derived by counting match_events. Replaces the hand-tallied counter columns on matches.';

-- Verification, run by hand after applying. Scoped to backfilled matches: a
-- match that was already tagged legitimately disagrees with its stale counters,
-- which is the entire point.
--
--   SELECT m.session_id
--   FROM public.matches m
--   JOIN public.match_box_score v USING (session_id)
--   WHERE EXISTS (
--       SELECT 1 FROM public.match_events e
--       WHERE e.session_id = m.session_id AND e.source = 'backfill')
--     AND (m.goals, m.assists, m.steals, m.technical_faults, m.shots_missed,
--          m.shots_saved, m.nine_m_shots, m.breakthroughs, m.suspensions_created,
--          m.suspensions_received, m.blocks, m.big_mistakes)
--         IS DISTINCT FROM
--         (v.goals, v.assists, v.steals, v.technical_faults, v.shots_missed,
--          v.shots_saved, v.nine_m_shots, v.breakthroughs, v.suspensions_created,
--          v.suspensions_received, v.blocks, v.big_mistakes);
--
-- Result when this migration was written: 0 rows.
