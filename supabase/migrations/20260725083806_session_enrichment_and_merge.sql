-- Enrichment fields discovered live in Google Health's exercise data type
-- (calories, active duration excluding pauses, per-workout heart-rate zone
-- breakdown, active zone minutes) - these apply to any session type, not
-- just cardio, so they live on the shared sessions table rather than
-- cardio_sessions. Also adds session-level dedup: when two sources
-- describe the same real workout (confirmed happening live - TUGG and
-- Google Health both logging the same session), the richer one is kept
-- and the other points at it via merged_into rather than being deleted,
-- so the original source data stays available for audit.

ALTER TABLE public.sessions ADD COLUMN calories_kcal integer;
ALTER TABLE public.sessions ADD COLUMN active_duration_seconds integer;
ALTER TABLE public.sessions ADD COLUMN active_zone_minutes integer;
ALTER TABLE public.sessions ADD COLUMN hr_zones jsonb;
ALTER TABLE public.sessions ADD COLUMN merged_into uuid REFERENCES public.sessions(id) ON DELETE SET NULL;

CREATE INDEX sessions_merged_into_idx ON public.sessions (merged_into);

-- Google Health also gives body fat % and height (both from Health
-- Connect/Fitbit) - fits directly into the existing body_metrics table.
ALTER TABLE public.body_metrics ADD COLUMN body_fat_percentage numeric(4,1);

-- Daily-bucketed metrics that are too high-frequency to store per-sample
-- (HRV every ~5min, SpO2 every ~1min, active zone minutes per-minute) -
-- same day-bucketing already used for steps/resting heart rate.
ALTER TABLE public.daily_metrics ADD COLUMN avg_hrv_ms numeric(6,1);
ALTER TABLE public.daily_metrics ADD COLUMN avg_spo2_percentage numeric(4,1);
ALTER TABLE public.daily_metrics ADD COLUMN active_zone_minutes integer;
