-- Makes the match score derivable from the event stream instead of snapshotted.
--
-- Every event carried score_us / score_them as they stood when it was tagged,
-- and match_box_score took MAX() over them. Two things were wrong with that:
--
--   * An opponent goal after your last tagged event was never recorded at all,
--     because nothing was tagged to carry the new score.
--   * Deleting a goal you had tagged left the score at its old value, because a
--     maximum cannot go down.
--
-- Counting fixes both, and makes the score the same shape as every other
-- counter in the view. It needs two new event types, because `goal` means *you*
-- scored and feeds your personal counter - the scoreboard also moves when a
-- teammate scores and when the opponent does, and neither is something you did.
--
--   goal          -> your goal:      goals +1, us +1
--   team_goal     -> a teammate's:            us +1
--   opponent_goal -> conceded:               them +1
--
-- score_us / score_them stay on the table as context ("what was the score when
-- this happened") but are no longer authoritative and no longer read here.

ALTER TABLE public.match_events
    DROP CONSTRAINT IF EXISTS match_events_event_type_check;

ALTER TABLE public.match_events
    ADD CONSTRAINT match_events_event_type_check
    CHECK (event_type IN (
        'goal',
        'team_goal',
        'opponent_goal',
        'shot_missed',
        'shot_saved',
        'shot_attempt',
        'assist',
        'technical_fault',
        'steal',
        'block',
        'suspension_created',
        'suspension_received',
        'big_mistake'
    ));

COMMENT ON COLUMN public.match_events.score_us IS
    'Scoreboard when this was tagged, for context only. The authoritative total is counted in match_box_score.';
COMMENT ON COLUMN public.match_events.score_them IS
    'Scoreboard when this was tagged, for context only. The authoritative total is counted in match_box_score.';

-- Same columns in the same order, so CREATE OR REPLACE is enough; only the two
-- score expressions change.
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

    -- Counted, not MAX()'d. Mirrors deriveScore in lib/handball/events.ts, and
    -- the two must stay in agreement - see the verification query below.
    COUNT(e.id) FILTER (WHERE e.event_type IN ('goal', 'team_goal'))::int AS final_score_us,
    COUNT(e.id) FILTER (WHERE e.event_type = 'opponent_goal')::int        AS final_score_them,

    COUNT(e.id) FILTER (WHERE e.video_offset_seconds IS NOT NULL)::int   AS clipped_events,
    COUNT(e.id)::int                                                     AS event_count
FROM public.matches m
JOIN public.sessions s ON s.id = m.session_id
-- LEFT so a match with no events shows as zeros rather than disappearing.
LEFT JOIN public.match_events e ON e.session_id = m.session_id
GROUP BY m.session_id, s.id;

COMMENT ON VIEW public.match_box_score IS
    'Box score and score line, both derived by counting match_events. Mirrors deriveBoxScore and deriveScore in lib/handball/events.ts.';

-- Verification, run by hand after applying. Both should return 0 rows.
--
-- 1. No match should score more goals than it has goal events:
--   SELECT session_id FROM public.match_box_score
--   WHERE final_score_us < goals;
--
-- 2. The score line should equal a direct count over the events:
--   SELECT v.session_id
--   FROM public.match_box_score v
--   JOIN (
--     SELECT session_id,
--            COUNT(*) FILTER (WHERE event_type IN ('goal','team_goal')) AS us,
--            COUNT(*) FILTER (WHERE event_type = 'opponent_goal')       AS them
--     FROM public.match_events GROUP BY session_id
--   ) c USING (session_id)
--   WHERE (v.final_score_us, v.final_score_them) IS DISTINCT FROM (c.us::int, c.them::int);
