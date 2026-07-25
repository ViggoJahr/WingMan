-- Weight, body fat %, and height are three separate Google Health data
-- points (different external_ids) that should land on the same body_metrics
-- row per calendar day rather than three separate rows. Upserts now target
-- (user_id, date); external_source/external_id stay as informational
-- "last touched by" fields rather than the dedup key.
ALTER TABLE public.body_metrics
    ADD CONSTRAINT body_metrics_user_date_key UNIQUE (user_id, date);
