-- Google Health data that doesn't fit the sessions model: steps/resting-HR
-- are per-day totals (no start/end event), sleep is recovery data rather
-- than training. Weight fits the existing body_metrics table directly.

ALTER TABLE public.body_metrics ADD COLUMN external_source character varying(50);
ALTER TABLE public.body_metrics ADD COLUMN external_id character varying(255);
ALTER TABLE public.body_metrics
    ADD CONSTRAINT body_metrics_external_key UNIQUE (external_source, external_id);

CREATE TABLE public.daily_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    date date NOT NULL,
    steps integer,
    resting_heart_rate integer,
    external_source character varying(50),
    external_id character varying(255),
    raw_payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT daily_metrics_pkey PRIMARY KEY (id),
    CONSTRAINT daily_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT daily_metrics_external_key UNIQUE (external_source, external_id)
);

CREATE TABLE public.sleep_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    duration_minutes integer,
    sleep_stages jsonb,
    external_source character varying(50),
    external_id character varying(255),
    raw_payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT sleep_logs_pkey PRIMARY KEY (id),
    CONSTRAINT sleep_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT sleep_logs_external_key UNIQUE (external_source, external_id)
);

ALTER TABLE public.daily_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sleep_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own rows" ON public.daily_metrics
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "own rows" ON public.sleep_logs
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
