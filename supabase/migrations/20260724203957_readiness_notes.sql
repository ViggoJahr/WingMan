-- Free-text overflow for the readiness check-in (e.g. "sore throat, might
-- be getting sick") - not in the original schema. Safe additive column.
ALTER TABLE public.readiness ADD COLUMN notes text;
