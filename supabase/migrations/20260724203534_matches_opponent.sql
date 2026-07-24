-- The existing matches table has opposition_difficulty (1-10) and is_home
-- but nothing to identify who was actually played - needed for a coherent
-- match log. Safe additive column since no data exists yet.
ALTER TABLE public.matches ADD COLUMN opponent character varying(255);
