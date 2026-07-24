-- Adds integration/sync bookkeeping on top of the existing schema, and RLS
-- policies (tables already had RLS enabled with zero policies, meaning
-- nothing but a service-role connection could read/write them).

-- 1. Safety net for synced session data: always keep the untouched source
--    payload so normalize() mistakes are recoverable without re-fetching.
ALTER TABLE public.sessions ADD COLUMN raw_payload jsonb;

-- 2. Idempotent upsert key for synced sessions. NULLs (manual entries) are
--    each treated as distinct by Postgres, so this never blocks manual rows.
ALTER TABLE public.sessions
    ADD CONSTRAINT sessions_external_source_id_key UNIQUE (external_source, external_id);

-- 3. Tie public.users to Supabase Auth and auto-provision a profile row on
--    signup, so app code never has to manage that insert manually.
ALTER TABLE public.users
    ADD CONSTRAINT users_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

CREATE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id) VALUES (NEW.id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Integration accounts (TUGG API key, Google Health OAuth tokens, ...)
--    and sync run observability.
CREATE TABLE public.integration_accounts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    source character varying(50) NOT NULL,
    auth_type character varying(20) NOT NULL,
    access_token text,
    refresh_token text,
    expires_at timestamp with time zone,
    external_account_id character varying(255),
    config jsonb,
    status character varying(20) NOT NULL DEFAULT 'active',
    last_synced_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT integration_accounts_pkey PRIMARY KEY (id),
    CONSTRAINT integration_accounts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT integration_accounts_source_check CHECK (source IN ('tugg', 'google_health')),
    CONSTRAINT integration_accounts_auth_type_check CHECK (auth_type IN ('api_key', 'oauth2')),
    CONSTRAINT integration_accounts_status_check CHECK (status IN ('active', 'error', 'disabled')),
    CONSTRAINT integration_accounts_user_source_key UNIQUE (user_id, source)
);

CREATE TABLE public.sync_runs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    integration_account_id uuid NOT NULL,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    finished_at timestamp with time zone,
    status character varying(20) NOT NULL DEFAULT 'running',
    items_synced integer DEFAULT 0,
    error_message text,
    CONSTRAINT sync_runs_pkey PRIMARY KEY (id),
    CONSTRAINT sync_runs_integration_account_id_fkey FOREIGN KEY (integration_account_id) REFERENCES public.integration_accounts(id) ON DELETE CASCADE,
    CONSTRAINT sync_runs_status_check CHECK (status IN ('running', 'success', 'partial', 'error'))
);

ALTER TABLE public.integration_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sync_runs ENABLE ROW LEVEL SECURITY;

-- 5. RLS policies. Everything is owner-scoped via auth.uid(); child tables
--    without a direct user_id join up through their parent session.

CREATE POLICY "own row" ON public.users
    FOR ALL USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE POLICY "own rows" ON public.body_metrics
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "own rows" ON public.readiness
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "own rows" ON public.injuries
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "own rows" ON public.sessions
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "own rows" ON public.integration_accounts
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "own rows via account" ON public.sync_runs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.integration_accounts ia
            WHERE ia.id = sync_runs.integration_account_id AND ia.user_id = auth.uid()
        )
    );

CREATE POLICY "own rows via session" ON public.cardio_sessions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = cardio_sessions.session_id AND s.user_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = cardio_sessions.session_id AND s.user_id = auth.uid())
    );

CREATE POLICY "own rows via session" ON public.active_rest
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = active_rest.session_id AND s.user_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = active_rest.session_id AND s.user_id = auth.uid())
    );

CREATE POLICY "own rows via session" ON public.strength_sessions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = strength_sessions.session_id AND s.user_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = strength_sessions.session_id AND s.user_id = auth.uid())
    );

CREATE POLICY "own rows via session" ON public.handball_sessions
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = handball_sessions.session_id AND s.user_id = auth.uid())
    ) WITH CHECK (
        EXISTS (SELECT 1 FROM public.sessions s WHERE s.id = handball_sessions.session_id AND s.user_id = auth.uid())
    );

CREATE POLICY "own rows via cardio session" ON public.interval_logs
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.cardio_sessions cs
            JOIN public.sessions s ON s.id = cs.session_id
            WHERE cs.session_id = interval_logs.session_id AND s.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.cardio_sessions cs
            JOIN public.sessions s ON s.id = cs.session_id
            WHERE cs.session_id = interval_logs.session_id AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "own rows via strength session" ON public.exercise_sets
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.strength_sessions ss
            JOIN public.sessions s ON s.id = ss.session_id
            WHERE ss.session_id = exercise_sets.session_id AND s.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.strength_sessions ss
            JOIN public.sessions s ON s.id = ss.session_id
            WHERE ss.session_id = exercise_sets.session_id AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "own rows via handball session" ON public.team_practices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.handball_sessions hs
            JOIN public.sessions s ON s.id = hs.session_id
            WHERE hs.session_id = team_practices.session_id AND s.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.handball_sessions hs
            JOIN public.sessions s ON s.id = hs.session_id
            WHERE hs.session_id = team_practices.session_id AND s.user_id = auth.uid()
        )
    );

CREATE POLICY "own rows via handball session" ON public.matches
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.handball_sessions hs
            JOIN public.sessions s ON s.id = hs.session_id
            WHERE hs.session_id = matches.session_id AND s.user_id = auth.uid()
        )
    ) WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.handball_sessions hs
            JOIN public.sessions s ON s.id = hs.session_id
            WHERE hs.session_id = matches.session_id AND s.user_id = auth.uid()
        )
    );

-- exercises is a shared reference library (no owner) - open to any
-- authenticated user, which in this single-user app is always the owner.
CREATE POLICY "authenticated read/write" ON public.exercises
    FOR ALL TO authenticated USING (true) WITH CHECK (true);
