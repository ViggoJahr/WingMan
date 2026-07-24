-- Baseline migration representing the schema as it already existed in the
-- linked Supabase project before this repo's migration history began.
-- Captured via pg_dump from the live project on 2026-07-24; not hand-written.
-- This file documents current state and is marked "applied" via
-- `supabase migration repair`, not executed against the already-live database.

CREATE TYPE public.handball_subtype AS ENUM (
    'individual',
    'team_practice',
    'match'
);

CREATE TYPE public.session_type AS ENUM (
    'strength_power',
    'cardio',
    'mobility_rehab',
    'active_rest',
    'handball'
);

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    gender character varying(50),
    birth_date date,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT users_pkey PRIMARY KEY (id)
);

CREATE TABLE public.body_metrics (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    date date NOT NULL,
    height_cm numeric(5,2),
    weight_kg numeric(5,2),
    CONSTRAINT body_metrics_pkey PRIMARY KEY (id),
    CONSTRAINT body_metrics_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.readiness (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    date date NOT NULL,
    training_load integer,
    muscle_soreness integer,
    mental_stress integer,
    current_injury integer,
    current_illness integer,
    sleep_quality integer,
    food_beverage integer,
    mood integer,
    recovery_energy integer,
    total_score integer,
    CONSTRAINT readiness_pkey PRIMARY KEY (id),
    CONSTRAINT readiness_user_id_date_key UNIQUE (user_id, date),
    CONSTRAINT readiness_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT readiness_current_illness_check CHECK (((current_illness >= 0) AND (current_illness <= 10))),
    CONSTRAINT readiness_current_injury_check CHECK (((current_injury >= 0) AND (current_injury <= 10))),
    CONSTRAINT readiness_food_beverage_check CHECK (((food_beverage >= 0) AND (food_beverage <= 10))),
    CONSTRAINT readiness_mental_stress_check CHECK (((mental_stress >= 0) AND (mental_stress <= 10))),
    CONSTRAINT readiness_mood_check CHECK (((mood >= 0) AND (mood <= 10))),
    CONSTRAINT readiness_muscle_soreness_check CHECK (((muscle_soreness >= 0) AND (muscle_soreness <= 10))),
    CONSTRAINT readiness_recovery_energy_check CHECK (((recovery_energy >= 0) AND (recovery_energy <= 10))),
    CONSTRAINT readiness_sleep_quality_check CHECK (((sleep_quality >= 0) AND (sleep_quality <= 10))),
    CONSTRAINT readiness_total_score_check CHECK (((total_score >= 0) AND (total_score <= 100))),
    CONSTRAINT readiness_training_load_check CHECK (((training_load >= 0) AND (training_load <= 10)))
);

CREATE TABLE public.injuries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    type character varying(255),
    injured_date date NOT NULL,
    cleared_date date,
    grade character varying(50),
    description text,
    CONSTRAINT injuries_pkey PRIMARY KEY (id),
    CONSTRAINT injuries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid,
    type public.session_type NOT NULL,
    start_time timestamp with time zone NOT NULL,
    end_time timestamp with time zone,
    rpe integer,
    location character varying(255),
    surface character varying(255),
    external_source character varying(50),
    external_id character varying(255),
    CONSTRAINT sessions_pkey PRIMARY KEY (id),
    CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
    CONSTRAINT sessions_rpe_check CHECK (((rpe >= 1) AND (rpe <= 20)))
);

CREATE TABLE public.cardio_sessions (
    session_id uuid NOT NULL,
    focus character varying(255),
    distance_m integer,
    avg_hr integer,
    CONSTRAINT cardio_sessions_pkey PRIMARY KEY (session_id),
    CONSTRAINT cardio_sessions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE
);

CREATE TABLE public.interval_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    work_duration_sec integer,
    rest_duration_sec integer,
    sets integer,
    reps integer,
    zone_target character varying(50),
    CONSTRAINT interval_logs_pkey PRIMARY KEY (id),
    CONSTRAINT interval_logs_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.cardio_sessions(session_id) ON DELETE CASCADE
);

CREATE TABLE public.active_rest (
    session_id uuid NOT NULL,
    focus character varying(255),
    description text,
    CONSTRAINT active_rest_pkey PRIMARY KEY (session_id),
    CONSTRAINT active_rest_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE
);

CREATE TABLE public.strength_sessions (
    session_id uuid NOT NULL,
    focus character varying(255),
    CONSTRAINT strength_sessions_pkey PRIMARY KEY (session_id),
    CONSTRAINT strength_sessions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE
);

CREATE TABLE public.exercises (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    category character varying(255),
    CONSTRAINT exercises_pkey PRIMARY KEY (id)
);

CREATE TABLE public.exercise_sets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid,
    exercise_id uuid,
    set_number integer,
    weight_kg numeric(6,2),
    reps integer,
    rpe integer,
    rest_period_sec integer,
    CONSTRAINT exercise_sets_pkey PRIMARY KEY (id),
    CONSTRAINT exercise_sets_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.strength_sessions(session_id) ON DELETE CASCADE,
    CONSTRAINT exercise_sets_exercise_id_fkey FOREIGN KEY (exercise_id) REFERENCES public.exercises(id) ON DELETE RESTRICT
);

CREATE TABLE public.handball_sessions (
    session_id uuid NOT NULL,
    subtype public.handball_subtype NOT NULL,
    perceived_performance integer,
    perceived_challenge integer,
    throws_count integer,
    defense_vs_attack_ratio character varying(50),
    comments text,
    CONSTRAINT handball_sessions_pkey PRIMARY KEY (session_id),
    CONSTRAINT handball_sessions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE,
    CONSTRAINT handball_sessions_perceived_challenge_check CHECK (((perceived_challenge >= 1) AND (perceived_challenge <= 10))),
    CONSTRAINT handball_sessions_perceived_performance_check CHECK (((perceived_performance >= 1) AND (perceived_performance <= 10)))
);

CREATE TABLE public.team_practices (
    session_id uuid NOT NULL,
    practice_focus character varying(255),
    tactical_complexity integer,
    CONSTRAINT team_practices_pkey PRIMARY KEY (session_id),
    CONSTRAINT team_practices_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.handball_sessions(session_id) ON DELETE CASCADE,
    CONSTRAINT team_practices_tactical_complexity_check CHECK (((tactical_complexity >= 1) AND (tactical_complexity <= 10)))
);

CREATE TABLE public.matches (
    session_id uuid NOT NULL,
    importance integer,
    opposition_difficulty integer,
    is_home boolean,
    play_time_min integer,
    goals integer DEFAULT 0,
    shots_missed integer DEFAULT 0,
    shots_saved integer DEFAULT 0,
    nine_m_shots integer DEFAULT 0,
    breakthroughs integer DEFAULT 0,
    technical_faults integer DEFAULT 0,
    assists integer DEFAULT 0,
    suspensions_created integer DEFAULT 0,
    suspensions_received integer DEFAULT 0,
    steals integer DEFAULT 0,
    blocks integer DEFAULT 0,
    big_mistakes integer DEFAULT 0,
    CONSTRAINT matches_pkey PRIMARY KEY (session_id),
    CONSTRAINT matches_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.handball_sessions(session_id) ON DELETE CASCADE,
    CONSTRAINT matches_importance_check CHECK (((importance >= 1) AND (importance <= 10))),
    CONSTRAINT matches_opposition_difficulty_check CHECK (((opposition_difficulty >= 1) AND (opposition_difficulty <= 10)))
);

ALTER TABLE public.active_rest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.body_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cardio_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.handball_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.injuries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interval_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.readiness ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.strength_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_practices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
