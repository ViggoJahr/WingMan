-- Drops columns that nothing reads and nothing writes.
--
-- 1. The twelve hand-tallied counters on `matches`. These were superseded by
--    20260728093000, which derives every one of them from `match_events` in the
--    `match_box_score` view and backfilled the existing rows. The match form
--    stopped writing them at the same time, so they have been inert since.
--
--    The view selects only session_id, opponent, is_home, importance,
--    opposition_difficulty and play_time_min from `matches` - none of the
--    counters - so these drops carry no view dependency and need no CASCADE and
--    no recreate. Verified against the shipped definition before writing this.
--
-- 2. body_metrics.height_cm. Height is recorded once and never changes, so the
--    source record always fell outside the 30-day sync window and 0 of 24 rows
--    ever received one. It lives on users.height_cm now, entered in Settings,
--    and its normaliser was removed at that time.
--
-- Checked against the live database immediately before writing: `matches` holds
-- 0 rows, and 0 body_metrics rows have a non-null height_cm. Nothing is lost.

ALTER TABLE public.matches
    DROP COLUMN IF EXISTS goals,
    DROP COLUMN IF EXISTS shots_missed,
    DROP COLUMN IF EXISTS shots_saved,
    DROP COLUMN IF EXISTS nine_m_shots,
    DROP COLUMN IF EXISTS breakthroughs,
    DROP COLUMN IF EXISTS technical_faults,
    DROP COLUMN IF EXISTS assists,
    DROP COLUMN IF EXISTS suspensions_created,
    DROP COLUMN IF EXISTS suspensions_received,
    DROP COLUMN IF EXISTS steals,
    DROP COLUMN IF EXISTS blocks,
    DROP COLUMN IF EXISTS big_mistakes;

COMMENT ON TABLE public.matches IS
    'Per-match context. Box-score counters are derived from match_events via the match_box_score view, never stored here.';

ALTER TABLE public.body_metrics
    DROP COLUMN IF EXISTS height_cm;
