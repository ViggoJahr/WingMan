-- Height is a static profile attribute, not a daily measurement. It was being
-- fetched from Google Health into body_metrics.height_cm, but height is
-- recorded once and effectively never changes, so the source record always fell
-- outside the 30-day sync window - 0 of 24 body_metrics rows ever had a height.
--
-- It now lives on users alongside the other profile fields, entered by hand in
-- Settings. body_metrics.height_cm is left in place (it is part of the baseline
-- schema) but is no longer written to.
--
-- gender and birth_date already existed here and were never surfaced anywhere.
-- They matter for the planned heart-rate work: age drives max-HR estimation and
-- TRIMP applies a gender coefficient.

ALTER TABLE public.users ADD COLUMN IF NOT EXISTS height_cm numeric(5,2);

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_height_cm_check') THEN
        ALTER TABLE public.users
            ADD CONSTRAINT users_height_cm_check
            CHECK (height_cm IS NULL OR (height_cm >= 50 AND height_cm <= 260));
    END IF;
END $$;
