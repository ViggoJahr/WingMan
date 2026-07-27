-- Google Health's auto-detected exerciseType is frequently wrong or generic:
-- a real strength session came through as LACROSSE ("Träningspass" - literally
-- "training session"), and "Styrkelyftning" (powerlifting) arrived as the
-- catch-all WORKOUT. Everything unrecognised was previously mapped to `cardio`,
-- which quietly polluted cardio analysis with sessions that were not cardio.
--
-- general_cardio means "activity we could not classify" rather than a claim
-- about what it was. The specific label is still preserved in
-- cardio_sessions.focus (from the source's displayName), so nothing is lost -
-- this just stops unclassified sessions masquerading as real cardio.
--
-- ADD VALUE is safe to run in a transaction on PG12+ as long as the new value
-- isn't also *used* in the same transaction. Existing rows are corrected by the
-- next sync, which re-upserts every session with its remapped type.

ALTER TYPE public.session_type ADD VALUE IF NOT EXISTS 'general_cardio';
