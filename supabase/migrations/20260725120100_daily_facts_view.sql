-- daily_facts: one row per user per calendar day, joining every data source
-- into a single denormalised series.
--
-- This is deliberately the one query that feeds many features: the activity
-- heatmap, the dashboard tiles, rolling load metrics (ACWR / monotony /
-- strain), the future spreadsheet-style explore view, and eventually an LLM
-- asking questions about the data. Adding a fact here makes it available to
-- all of them at once.
--
-- security_invoker keeps the caller's RLS in force, so an authenticated user
-- only ever sees their own rows through this view.

-- Day boundaries for timestamptz columns need a fixed zone; bucketing in UTC
-- would push evening sessions onto the following day. This function is the
-- single place to change if the athlete relocates.
CREATE OR REPLACE FUNCTION public.app_local_date(ts timestamptz)
RETURNS date
LANGUAGE sql
STABLE
AS $$ SELECT (ts AT TIME ZONE 'Europe/Oslo')::date $$;

CREATE OR REPLACE VIEW public.daily_facts
WITH (security_invoker = on)
AS
WITH span AS (
    -- The calendar spans from the user's earliest datapoint to today, so
    -- rest days exist as real rows (zero load) rather than being absent.
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
session_day AS (
    -- Mirrors computeSessionLoad() in src/lib/services/trainingLoad.ts:
    -- session-RPE load = rpe x duration_hours, rounded per session.
    SELECT
        s.user_id,
        public.app_local_date(s.start_time) AS day,
        COUNT(*)::int AS session_count,
        COALESCE(SUM(
            CASE
                WHEN s.rpe IS NOT NULL AND s.end_time IS NOT NULL AND s.end_time > s.start_time
                THEN ROUND((s.rpe * EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 3600.0)::numeric, 1)
                ELSE 0
            END
        ), 0) AS total_load,
        MAX(s.rpe)::int AS max_rpe,
        COALESCE(SUM(
            CASE
                WHEN s.end_time IS NOT NULL AND s.end_time > s.start_time
                THEN EXTRACT(EPOCH FROM (s.end_time - s.start_time)) / 60.0
                ELSE 0
            END
        ), 0)::int AS total_duration_min,
        SUM(s.calories_kcal)::int AS calories_kcal,
        COALESCE(BOOL_OR(hs.subtype = 'match'), false) AS had_match,
        COALESCE(BOOL_OR(hs.subtype = 'team_practice'), false) AS had_practice,
        COALESCE(BOOL_OR(s.type = 'strength_power'), false) AS had_strength,
        MAX(hs.perceived_performance)::int AS perceived_performance,
        MAX(hs.perceived_challenge)::int AS perceived_challenge
    FROM public.sessions s
    LEFT JOIN public.handball_sessions hs ON hs.session_id = s.id
    WHERE s.merged_into IS NULL AND s.user_id IS NOT NULL
    GROUP BY s.user_id, public.app_local_date(s.start_time)
),
metrics_day AS (
    -- One row per source per day today (only google_health writes), so MAX
    -- collapses without losing anything if a second source appears later.
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
    -- Attributed to the wake date, not the date sleep began: that is the day
    -- the sleep actually fuels, which is what correlations want.
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

        -- Load
        COALESCE(sd.session_count, 0) AS session_count,
        COALESCE(sd.total_load, 0) AS total_load,
        sd.max_rpe,
        COALESCE(sd.total_duration_min, 0) AS total_duration_min,
        sd.calories_kcal,

        -- Handball
        COALESCE(sd.had_match, false) AS had_match,
        COALESCE(sd.had_practice, false) AS had_practice,
        COALESCE(sd.had_strength, false) AS had_strength,
        sd.perceived_performance,
        sd.perceived_challenge,

        -- Readiness (score plus the nine sub-dimensions)
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

        -- Body & recovery
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
