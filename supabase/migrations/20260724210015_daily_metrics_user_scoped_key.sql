-- daily_metrics.external_id is a plain calendar date (not a globally-unique
-- ID from the source API, unlike sessions/sleep_logs/etc. which use real
-- source-assigned IDs), so it must be scoped by user_id to stay unique -
-- otherwise two users syncing on the same date would collide.
ALTER TABLE public.daily_metrics DROP CONSTRAINT daily_metrics_external_key;
ALTER TABLE public.daily_metrics
    ADD CONSTRAINT daily_metrics_external_key UNIQUE (user_id, external_source, external_id);
