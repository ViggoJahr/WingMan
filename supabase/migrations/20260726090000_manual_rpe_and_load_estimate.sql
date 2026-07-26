-- Session-RPE load is only defined when a session has an RPE, and only 26% of
-- real sessions do (18/65 TUGG, 1/9 Google Health). TUGG's gym workout_sessions
-- carry no rpe field at all, so this cannot be fixed by mapping more fields.
-- The result was that a real training day showed as a rest day, and the
-- downstream ACWR/monotony numbers were computed over a series that was ~74%
-- false zeros.
--
-- Two changes:
--   1. manual_rpe - a user-supplied RPE that sync never writes, so it can be
--      added to a synced session without the next sync overwriting it.
--   2. daily_facts now exposes a tiered load estimate alongside the strictly
--      measured load, plus the counts needed to judge how trustworthy it is.

ALTER TABLE public.sessions ADD COLUMN IF NOT EXISTS manual_rpe integer;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'sessions_manual_rpe_check'
    ) THEN
        ALTER TABLE public.sessions
            ADD CONSTRAINT sessions_manual_rpe_check
            CHECK (manual_rpe IS NULL OR (manual_rpe >= 1 AND manual_rpe <= 20));
    END IF;
END $$;

-- Borg 6-20 anchors for each heart-rate zone, used to convert a zone-time
-- breakdown into an RPE-equivalent so every tier lands in the same unit
-- (RPE x hours) and one colour scale stays meaningful.
CREATE OR REPLACE FUNCTION public.zone_rpe_equivalent(hr_zones jsonb)
RETURNS numeric
LANGUAGE sql
IMMUTABLE
AS $$
    WITH z AS (
        SELECT
            COALESCE((hr_zones->>'light_sec')::numeric, 0) AS light,
            COALESCE((hr_zones->>'moderate_sec')::numeric, 0) AS moderate,
            COALESCE((hr_zones->>'vigorous_sec')::numeric, 0) AS vigorous,
            COALESCE((hr_zones->>'peak_sec')::numeric, 0) AS peak
    )
    SELECT CASE
        WHEN (light + moderate + vigorous + peak) <= 0 THEN NULL
        ELSE ROUND(
            (light * 10 + moderate * 13 + vigorous * 16 + peak * 19)
            / (light + moderate + vigorous + peak),
            2
        )
    END
    FROM z;
$$;

-- Fallback RPE for a session with neither an RPE nor heart-rate zones. Chosen
-- low on the Borg scale on purpose: this number is a guess, and it should
-- under-state rather than inflate training stress.
CREATE OR REPLACE FUNCTION public.assumed_rpe()
RETURNS numeric LANGUAGE sql IMMUTABLE AS $$ SELECT 11::numeric $$;

CREATE OR REPLACE VIEW public.daily_facts
WITH (security_invoker = on)
AS
WITH span AS (
    SELECT user_id, MIN(d) AS first_day, MAX(d) AS last_day
    FROM (
        SELECT user_id, public.app_local_date(start_time) AS d FROM public.sessions
        UNION ALL SELECT user_id, date FROM public.readiness
        UNION ALL SELECT user_id, date FROM public.daily_metrics
        UNION ALL SELECT user_id, date FROM public.body_metrics
        UNION ALL SELECT user_id, public.app_local_date(start_time) FROM public.sleep_logs
    ) all_days
    WHERE user_id IS NOT NULL AND d IS NOT NULL
    GROUP BY user_id
),
calendar AS (
    SELECT span.user_id, gs::date AS day
    FROM span,
         generate_series(span.first_day, GREATEST(span.last_day, CURRENT_DATE), interval '1 day') AS gs
),
session_scored AS (
    -- One row per session with its load resolved through the tiers:
    --   measured   - a real RPE (manual takes precedence over synced)
    --   hr_derived - inferred from heart-rate zone durations
    --   assumed    - duration only, using a deliberately conservative RPE
    SELECT
        s.user_id,
        public.app_local_date(s.start_time) AS day,
        s.type,
        s.rpe,
        s.manual_rpe,
        s.calories_kcal,
        hs.subtype,
        hs.perceived_performance,
        hs.perceived_challenge,
        CASE
            WHEN s.end_time IS NOT NULL AND s.end_time > s.start_time
            THEN EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600.0
            ELSE 0
        END AS hours,
        COALESCE(s.manual_rpe, s.rpe) AS effective_rpe,
        public.zone_rpe_equivalent(s.hr_zones) AS zone_rpe
    FROM public.sessions s
    LEFT JOIN public.handball_sessions hs ON hs.session_id = s.id
    WHERE s.merged_into IS NULL AND s.user_id IS NOT NULL
),
session_load AS (
    SELECT
        ss.*,
        CASE
            WHEN ss.effective_rpe IS NOT NULL THEN 'measured'
            WHEN ss.zone_rpe IS NOT NULL THEN 'hr_derived'
            WHEN ss.hours > 0 THEN 'assumed'
            ELSE 'none'
        END AS load_quality,
        ROUND(
            CASE
                WHEN ss.effective_rpe IS NOT NULL THEN ss.effective_rpe * ss.hours
                WHEN ss.zone_rpe IS NOT NULL THEN ss.zone_rpe * ss.hours
                WHEN ss.hours > 0 THEN public.assumed_rpe() * ss.hours
                ELSE 0
            END,
            1
        ) AS load_estimate
    FROM session_scored ss
),
session_day AS (
    SELECT
        user_id,
        day,
        COUNT(*)::int AS session_count,
        -- Strictly measured session-RPE load; 0 where RPE is absent. Kept so
        -- the honest number stays available next to the estimate.
        COALESCE(SUM(CASE WHEN load_quality = 'measured' THEN load_estimate ELSE 0 END), 0) AS total_load,
        COALESCE(SUM(load_estimate), 0) AS load_estimate,
        COUNT(*) FILTER (WHERE load_quality IN ('measured', 'hr_derived'))::int AS sessions_with_intensity,
        COUNT(*) FILTER (WHERE load_quality = 'measured')::int AS sessions_with_rpe,
        MAX(effective_rpe)::int AS max_rpe,
        COALESCE(SUM(hours * 60), 0)::int AS total_duration_min,
        SUM(calories_kcal)::int AS calories_kcal,
        COALESCE(BOOL_OR(subtype = 'match'), false) AS had_match,
        COALESCE(BOOL_OR(subtype = 'team_practice'), false) AS had_practice,
        COALESCE(BOOL_OR(type = 'strength_power'), false) AS had_strength,
        MAX(perceived_performance)::int AS perceived_performance,
        MAX(perceived_challenge)::int AS perceived_challenge
    FROM session_load
    GROUP BY user_id, day
),
metrics_day AS (
    SELECT
        user_id,
        date AS day,
        MAX(steps)::int AS steps,
        MAX(resting_heart_rate)::int AS resting_heart_rate,
        MAX(avg_hrv_ms) AS avg_hrv_ms,
        MAX(avg_spo2_percentage) AS avg_spo2_percentage,
        MAX(active_zone_minutes)::int AS active_zone_minutes
    FROM public.daily_metrics
    GROUP BY user_id, date
),
sleep_day AS (
    SELECT
        user_id,
        public.app_local_date(COALESCE(end_time, start_time)) AS day,
        SUM(duration_minutes)::int AS sleep_minutes
    FROM public.sleep_logs
    GROUP BY user_id, public.app_local_date(COALESCE(end_time, start_time))
),
joined AS (
    SELECT
        c.user_id,
        c.day,

        COALESCE(sd.session_count, 0) AS session_count,
        COALESCE(sd.total_load, 0) AS total_load,
        COALESCE(sd.load_estimate, 0) AS load_estimate,
        COALESCE(sd.sessions_with_intensity, 0) AS sessions_with_intensity,
        COALESCE(sd.sessions_with_rpe, 0) AS sessions_with_rpe,
        sd.max_rpe,
        COALESCE(sd.total_duration_min, 0) AS total_duration_min,
        sd.calories_kcal,

        COALESCE(sd.had_match, false) AS had_match,
        COALESCE(sd.had_practice, false) AS had_practice,
        COALESCE(sd.had_strength, false) AS had_strength,
        sd.perceived_performance,
        sd.perceived_challenge,

        r.total_score AS readiness_score,
        r.training_load AS readiness_training_load,
        r.muscle_soreness,
        r.mental_stress,
        r.current_injury,
        r.current_illness,
        r.sleep_quality,
        r.food_beverage,
        r.mood,
        r.recovery_energy,

        bm.weight_kg,
        bm.body_fat_percentage,
        md.steps,
        md.resting_heart_rate,
        md.avg_hrv_ms,
        md.avg_spo2_percentage,
        md.active_zone_minutes,
        ROUND((sl.sleep_minutes / 60.0)::numeric, 2) AS sleep_hours
    FROM calendar c
    LEFT JOIN session_day sd ON sd.user_id = c.user_id AND sd.day = c.day
    LEFT JOIN public.readiness r ON r.user_id = c.user_id AND r.date = c.day
    LEFT JOIN public.body_metrics bm ON bm.user_id = c.user_id AND bm.date = c.day
    LEFT JOIN metrics_day md ON md.user_id = c.user_id AND md.day = c.day
    LEFT JOIN sleep_day sl ON sl.user_id = c.user_id AND sl.day = c.day
)
SELECT
    j.*,
    EXTRACT(ISODOW FROM j.day)::int AS dow,
    (EXTRACT(ISODOW FROM j.day) >= 6) AS is_weekend,
    (j.day - MAX(CASE WHEN j.had_match THEN j.day END) OVER (
        PARTITION BY j.user_id ORDER BY j.day
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ))::int AS days_since_last_match
FROM joined j;

GRANT SELECT ON public.daily_facts TO authenticated;
