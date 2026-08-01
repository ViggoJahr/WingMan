-- Caches the per-session heart-rate timeline.
--
-- getHeartRateTimeline currently does a fresh OAuth token exchange AND a Google
-- rollUp POST on *every* session-detail page view, and stores nothing. Opening
-- the same session twice costs two round trips to Google for data that cannot
-- change - the session is over.
--
-- Stored as jsonb on `sessions` rather than as a `session_hr_samples` table:
-- the payload is ~80 buckets, it is only ever read whole for one session, and
-- it has no independent identity. A child table would add a join and an index
-- to support a query nobody makes.
--
-- SCOPE: this migration is storage only. `load_estimate` and the daily_facts
-- tier logic are deliberately untouched. Deriving TRIMP from this changes the
-- load figure for most historical sessions - and therefore every ACWR band,
-- every heatmap cell and every dashboard tile - so it has to be a separate,
-- separately reviewable change made once the cache has been populated and
-- eyeballed against a few known sessions.

ALTER TABLE public.sessions
    ADD COLUMN IF NOT EXISTS hr_timeline jsonb,
    -- Distinguishes "never looked" from "looked, and Google had nothing".
    -- Without it a session with no heart-rate data would be re-fetched on every
    -- single page view, which is the exact behaviour being removed.
    ADD COLUMN IF NOT EXISTS hr_timeline_fetched_at timestamptz;

COMMENT ON COLUMN public.sessions.hr_timeline IS
    'Cached Google Health rollUp buckets: [{startTime, endTime, avg, min, max}]. Immutable once written - the session is over.';
COMMENT ON COLUMN public.sessions.hr_timeline_fetched_at IS
    'When the timeline was last fetched. Non-null with a null hr_timeline means Google returned no samples for this window.';
