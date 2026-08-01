-- Match context that the drivers view will want, and that cannot be recovered
-- after the fact.
--
-- Deliberately NOT added: kickoff time of day. The roadmap listed it, but
-- sessions.start_time is already a timestamptz, so it is
--
--     EXTRACT(hour FROM s.start_time AT TIME ZONE 'Europe/Oslo')
--
-- A column would be a second source of truth for a fact already recorded, and
-- the two would drift the first time a start time was corrected.

ALTER TABLE public.matches
    -- play_time_min is the total. Splitting it matters because a second half
    -- spent on the bench and a first half spent there mean opposite things
    -- about the same total.
    ADD COLUMN IF NOT EXISTS minutes_period_1 smallint
        CHECK (minutes_period_1 IS NULL OR (minutes_period_1 >= 0 AND minutes_period_1 <= 40)),
    ADD COLUMN IF NOT EXISTS minutes_period_2 smallint
        CHECK (minutes_period_2 IS NULL OR (minutes_period_2 >= 0 AND minutes_period_2 <= 40)),
    -- Goal difference while on court. Signed, and wide enough for a rout in
    -- either direction.
    ADD COLUMN IF NOT EXISTS plus_minus smallint
        CHECK (plus_minus IS NULL OR (plus_minus >= -60 AND plus_minus <= 60));

COMMENT ON COLUMN public.matches.minutes_period_1 IS 'Minutes played in the first half.';
COMMENT ON COLUMN public.matches.minutes_period_2 IS 'Minutes played in the second half.';
COMMENT ON COLUMN public.matches.plus_minus IS 'Team goal difference accumulated while on court.';
