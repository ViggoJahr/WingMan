-- Session-RPE cannot distinguish a 90-minute tactical walkthrough from a
-- 90-minute shooting session. Both land as "handball, 90 min, RPE 14", so the
-- training-load series treats them as identical dose - but the tissue actually
-- being loaded is completely different, and handball's two dominant chronic
-- injuries are shoulder overuse (throwing volume) and knee (jump/land, cutting).
--
-- throws_count has existed on handball_sessions since the baseline schema and is
-- written by nothing: no form, no view, no adapter. It is listed in
-- docs/vision.md under "Captured but not yet surfaced". Wiring it up costs one
-- tap and finally gives a rolling shoulder-load number, so the practice form
-- starts writing it - which is why the two sibling bands are added here rather
-- than invented separately later.
--
-- The bands are 0-3 rather than a free count because nobody counts jumps, and a
-- band that gets filled in every session beats an exact number that gets skipped.
-- throws_count stays an integer (the form writes band midpoints) because a
-- rolling 7-day throw *count* is the metric the literature uses, and midpoints
-- stay summable where band indices do not.
--
-- These go on handball_sessions rather than team_practices deliberately: a match
-- and an individual shooting session carry the same tissue exposure as a team
-- practice, and they have to sit in one comparable series. team_practices would
-- exclude both.

ALTER TABLE public.handball_sessions ADD COLUMN IF NOT EXISTS jump_load smallint;
ALTER TABLE public.handball_sessions ADD COLUMN IF NOT EXISTS contact_load smallint;
ALTER TABLE public.handball_sessions ADD COLUMN IF NOT EXISTS position character varying(20);

-- Postgres has no ADD CONSTRAINT IF NOT EXISTS, so probe pg_constraint the way
-- 20260726150100_user_profile_height.sql does.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'handball_sessions_jump_load_check') THEN
        ALTER TABLE public.handball_sessions
            ADD CONSTRAINT handball_sessions_jump_load_check
            CHECK (jump_load IS NULL OR (jump_load >= 0 AND jump_load <= 3));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'handball_sessions_contact_load_check') THEN
        ALTER TABLE public.handball_sessions
            ADD CONSTRAINT handball_sessions_contact_load_check
            CHECK (contact_load IS NULL OR (contact_load >= 0 AND contact_load <= 3));
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'handball_sessions_position_check') THEN
        ALTER TABLE public.handball_sessions
            ADD CONSTRAINT handball_sessions_position_check
            CHECK (position IS NULL OR position IN (
                'left_wing', 'left_back', 'centre_back', 'right_back',
                'right_wing', 'pivot', 'defence', 'goalkeeper'));
    END IF;
END $$;

COMMENT ON COLUMN public.handball_sessions.throws_count IS
    'Estimated throws. The practice form writes band midpoints (0/15/55/110) so the series stays summable.';
COMMENT ON COLUMN public.handball_sessions.jump_load IS
    'Jump/landing exposure band, 0-3 (none/some/lots/max). Knee-directed counterpart to throws_count.';
COMMENT ON COLUMN public.handball_sessions.contact_load IS
    'Collision and duel exposure band, 0-3 (none/some/lots/max).';
COMMENT ON COLUMN public.handball_sessions.position IS
    'Position played for this session. Nullable - unknown for synced sessions.';
