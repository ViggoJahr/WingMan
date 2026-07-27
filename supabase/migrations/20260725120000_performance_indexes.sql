-- Until now the schema declared no indexes beyond primary keys and the one
-- sessions_merged_into_idx. Postgres does NOT auto-index foreign key columns,
-- so every page in the app (dashboard, history, training-load, handball) was
-- doing sequential scans, and the RLS policy on sync_runs re-ran an unindexed
-- subquery per row. These cover the access patterns the app actually uses.

-- Nearly every session query is "this user's sessions, newest first, excluding
-- merged duplicates". A partial index keeps it small and matches the exact
-- .is("merged_into", null) filter used across the app.
CREATE INDEX IF NOT EXISTS sessions_user_start_idx
    ON public.sessions (user_id, start_time DESC);
CREATE INDEX IF NOT EXISTS sessions_user_unmerged_start_idx
    ON public.sessions (user_id, start_time DESC)
    WHERE merged_into IS NULL;
-- Sync upserts resolve on (external_source, external_id); already unique-indexed.

-- exercise_sets will be the largest table by row count; both FKs are joined on.
CREATE INDEX IF NOT EXISTS exercise_sets_session_idx
    ON public.exercise_sets (session_id);
CREATE INDEX IF NOT EXISTS exercise_sets_exercise_idx
    ON public.exercise_sets (exercise_id);

-- Daily series, read as user + date range by /health, the dashboard and daily_facts.
CREATE INDEX IF NOT EXISTS daily_metrics_user_date_idx
    ON public.daily_metrics (user_id, date DESC);
CREATE INDEX IF NOT EXISTS sleep_logs_user_start_idx
    ON public.sleep_logs (user_id, start_time DESC);

-- /tests reads these unbounded and ordered by date.
CREATE INDEX IF NOT EXISTS strength_test_results_user_date_idx
    ON public.strength_test_results (user_id, test_date DESC);
CREATE INDEX IF NOT EXISTS mas_tests_user_date_idx
    ON public.mas_tests (user_id, test_date DESC);

-- /plan filters by resource_type within a user, with pagination.
CREATE INDEX IF NOT EXISTS external_plan_items_user_type_idx
    ON public.external_plan_items (user_id, resource_type);

-- sync_runs' RLS policy joins up to integration_accounts for every row.
CREATE INDEX IF NOT EXISTS sync_runs_account_started_idx
    ON public.sync_runs (integration_account_id, started_at DESC);
CREATE INDEX IF NOT EXISTS integration_accounts_user_idx
    ON public.integration_accounts (user_id);

-- injuries and body_metrics are user-scoped date series (body_metrics already
-- has a unique index on (user_id, date), so only injuries needs one).
CREATE INDEX IF NOT EXISTS injuries_user_injured_idx
    ON public.injuries (user_id, injured_date DESC);
