-- The box score is 12 hand-tallied integers on `matches` that link to nothing
-- that actually happened. They cannot be audited ("did I really have 4 technical
-- faults, or did I lose count?"), corrected without re-counting, or reviewed.
-- Nine of the twelve are not displayed anywhere either - see docs/vision.md,
-- "Captured but not yet surfaced".
--
-- A timestamped event log is the finest-grained thing that is free to collect,
-- and every counter falls out of it by COUNT(). Tagging happens after the match
-- against video, deliberately, so the events carry a video offset and the review
-- UI can seek straight back to any moment instead of scrubbing for it.
--
-- The critical modelling decision is that OUTCOME and ORIGIN are separate
-- dimensions. The 12 counters are not 12 parallel things: nine_m_shots and
-- breakthroughs describe where a shot came from and already double-count with
-- goals (a 9m goal increments both). If those were event types you would have to
-- tag the same shot twice, which defeats the whole point. So event_type is the
-- outcome, shot_origin is an optional qualifier, and one tag ("goal, from 9m")
-- feeds three counters.
--
-- This migration is deliberately additive. `matches` keeps its 12 columns and
-- every reader keeps working; the backfill and the derived view land separately,
-- once the taxonomy has survived one real match.
--
-- varchar + CHECK rather than a Postgres enum: every table added since the
-- migrations began (integration_accounts.source/auth_type/status,
-- sync_runs.status) uses varchar + CHECK IN. The two existing enums are pg_dump
-- artefacts from before this repo. Enum values can never be removed, and the
-- authoritative TS union lives in src/lib/handball/events.ts regardless.

CREATE TABLE IF NOT EXISTS public.match_videos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    label character varying(60),
    kind character varying(20) DEFAULT 'local_file' NOT NULL,
    -- Only for kind = 'url': a directly playable media URL. Not a YouTube or
    -- Drive link - those give no programmatic currentTime, which kills seeking.
    url text,
    file_name text,
    file_size_bytes bigint,
    -- Key into the browser's IndexedDB, where the FileSystemFileHandle lives.
    -- The file itself never touches the server: a match is 1-3 GB against a 1 GB
    -- Supabase quota and a 4.5 MB Vercel request limit.
    handle_key uuid DEFAULT gen_random_uuid(),
    duration_seconds numeric(10,3),
    -- Video-time seconds at which each period's clock reads 0:00, e.g.
    -- {"1": 132.5, "2": 1490.0}. One global offset cannot work: halftime length
    -- varies, so period 2 needs its own anchor.
    period_offsets jsonb DEFAULT '{}'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT match_videos_pkey PRIMARY KEY (id),
    CONSTRAINT match_videos_session_id_fkey FOREIGN KEY (session_id)
        REFERENCES public.matches(session_id) ON DELETE CASCADE,
    CONSTRAINT match_videos_kind_check CHECK (kind IN ('local_file', 'url'))
);

CREATE TABLE IF NOT EXISTS public.match_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    video_id uuid,
    event_type character varying(40) NOT NULL,
    shot_origin character varying(20),
    phase character varying(20),
    -- Canonical timeline anchor, in video seconds. NULL for backfilled rows and
    -- for anything tagged without video. period/clock_seconds are DERIVED from
    -- this at tag time and stored denormalised, so correcting a period offset is
    -- one UPDATE - going the other way would be lossy.
    video_offset_seconds numeric(10,3),
    period smallint,
    clock_seconds integer,
    -- matches has no result columns at all. Recording the running score at each
    -- goal yields the final score via MAX() without a new column on matches.
    score_us smallint,
    score_them smallint,
    position character varying(20),
    -- Forward slots for the shot map in docs/vision.md. Nothing writes them yet;
    -- having them here means the court diagram is pure UI work, not a migration.
    court_x numeric(5,2),
    court_y numeric(5,2),
    goal_cell smallint,
    note text,
    source character varying(20) DEFAULT 'video' NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT match_events_pkey PRIMARY KEY (id),
    CONSTRAINT match_events_session_id_fkey FOREIGN KEY (session_id)
        REFERENCES public.matches(session_id) ON DELETE CASCADE,
    CONSTRAINT match_events_video_id_fkey FOREIGN KEY (video_id)
        REFERENCES public.match_videos(id) ON DELETE SET NULL,
    -- shot_attempt means "a shot happened, outcome unknown". It feeds none of
    -- the 12 counters and exists so the later backfill can materialise legacy
    -- nine_m_shots/breakthroughs without inflating shots_missed. Hidden from the
    -- tagging palette.
    CONSTRAINT match_events_type_check CHECK (event_type IN (
        'goal', 'shot_missed', 'shot_saved', 'shot_attempt', 'assist',
        'technical_fault', 'steal', 'block', 'suspension_created',
        'suspension_received', 'big_mistake')),
    CONSTRAINT match_events_shot_origin_check CHECK (shot_origin IS NULL OR shot_origin IN (
        'nine_m', 'breakthrough', 'wing', 'pivot', 'fastbreak', 'seven_metre', 'other')),
    CONSTRAINT match_events_phase_check CHECK (phase IS NULL OR phase IN (
        'positional', 'counter', 'power_play', 'short_handed')),
    -- 'live' is allowed even though no live-tagging UI ships, so adding one
    -- later is not a drop-and-re-add of this constraint.
    CONSTRAINT match_events_source_check CHECK (source IN ('video', 'live', 'backfill')),
    CONSTRAINT match_events_period_check CHECK (period IS NULL OR (period >= 1 AND period <= 4)),
    CONSTRAINT match_events_goal_cell_check CHECK (goal_cell IS NULL OR (goal_cell >= 1 AND goal_cell <= 9)),
    CONSTRAINT match_events_position_check CHECK (position IS NULL OR position IN (
        'left_wing', 'left_back', 'centre_back', 'right_back',
        'right_wing', 'pivot', 'defence', 'goalkeeper'))
);

-- Postgres does not index FK columns automatically; the timeline index is what
-- the review page orders by.
CREATE INDEX IF NOT EXISTS match_videos_session_idx ON public.match_videos (session_id);
CREATE INDEX IF NOT EXISTS match_events_session_idx ON public.match_events (session_id);
CREATE INDEX IF NOT EXISTS match_events_video_idx ON public.match_events (video_id);
CREATE INDEX IF NOT EXISTS match_events_session_timeline_idx
    ON public.match_events (session_id, period, video_offset_seconds);

ALTER TABLE public.match_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.match_events ENABLE ROW LEVEL SECURITY;

-- sessions, handball_sessions and matches all share the same uuid primary key,
-- so session_id IS sessions.id and the hop through matches -> handball_sessions
-- would be redundant.
CREATE POLICY "own rows via session" ON public.match_videos
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = match_videos.session_id AND s.user_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = match_videos.session_id AND s.user_id = auth.uid())
    );

CREATE POLICY "own rows via session" ON public.match_events
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = match_events.session_id AND s.user_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = match_events.session_id AND s.user_id = auth.uid())
    );

COMMENT ON COLUMN public.match_events.video_offset_seconds IS
    'Canonical timeline anchor in video seconds. period/clock_seconds are derived from this.';
COMMENT ON COLUMN public.match_events.shot_origin IS
    'Where the shot came from. Separate dimension from event_type - nine_m_shots and breakthroughs derive from this.';
COMMENT ON COLUMN public.match_videos.period_offsets IS
    'Video seconds where each period clock reads 0:00, keyed by period number.';
