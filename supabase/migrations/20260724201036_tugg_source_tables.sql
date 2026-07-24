-- Tables for TUGG data that doesn't fit the sessions/subtype model:
-- standalone max-test records (not a "session" with start/end time) and
-- prescribed/planned workout data (not "what happened", just "what's assigned").
-- player_readiness_checkins is intentionally NOT pulled in yet - its
-- qualitative scale (energy/soreness as good/medium/some) doesn't map
-- cleanly onto the existing 0-10 numeric readiness table; deferred.

ALTER TABLE public.integration_accounts DROP CONSTRAINT integration_accounts_auth_type_check;
ALTER TABLE public.integration_accounts
    ADD CONSTRAINT integration_accounts_auth_type_check CHECK (auth_type IN ('api_key', 'oauth2', 'password_grant'));

CREATE TABLE public.strength_test_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    test_type character varying(100) NOT NULL,
    weight numeric(6,2),
    reps integer,
    estimated_1rm numeric(6,2),
    test_date date NOT NULL,
    verification_status character varying(20),
    external_source character varying(50),
    external_id character varying(255),
    raw_payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT strength_test_results_pkey PRIMARY KEY (id),
    CONSTRAINT strength_test_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT strength_test_results_external_key UNIQUE (external_source, external_id)
);

CREATE TABLE public.mas_tests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    test_time_seconds integer,
    mas_mps numeric(6,3),
    test_date date NOT NULL,
    external_source character varying(50),
    external_id character varying(255),
    raw_payload jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT mas_tests_pkey PRIMARY KEY (id),
    CONSTRAINT mas_tests_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT mas_tests_external_key UNIQUE (external_source, external_id)
);

-- Generic store for prescribed/planned data (workout_assignments, workout_plans,
-- workout_exercises, daily_team_sessions, daily_session_workouts) - reference
-- material for "what's coming up" views, not analytics-driving like sessions.
CREATE TABLE public.external_plan_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    resource_type character varying(50) NOT NULL,
    external_source character varying(50) NOT NULL,
    external_id character varying(255) NOT NULL,
    payload jsonb NOT NULL,
    synced_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT external_plan_items_pkey PRIMARY KEY (id),
    CONSTRAINT external_plan_items_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT external_plan_items_resource_type_check CHECK (resource_type IN (
        'workout_assignment', 'workout_plan', 'workout_exercise', 'daily_team_session', 'daily_session_workout'
    )),
    CONSTRAINT external_plan_items_external_key UNIQUE (resource_type, external_source, external_id)
);

ALTER TABLE public.strength_test_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mas_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.external_plan_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own rows" ON public.strength_test_results
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "own rows" ON public.mas_tests
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "own rows" ON public.external_plan_items
    FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
