-- Widens match_events.goal_cell from 1-9 to 0-9, where 0 means OFF TARGET.
--
-- The column was declared as a forward slot for the shot map with a CHECK of
-- 1-9 and NULL allowed. That leaves no way to say "the shot missed the frame":
-- both "went wide" and "not tagged yet" would be NULL, and no later analysis
-- could separate a wasteful shooter from an untagged match.
--
-- 0 rather than a separate boolean because placement is one dimension - a shot
-- ends up in one of ten places, nine of them inside the posts - and the goal
-- grid already has a surrounding off-target band that writes it in one gesture.
--
-- Cells are numbered to match a numpad (7-8-9 across the top), so Numpad9 is
-- both the top-right key and the top-right corner. See lib/handball/zones.ts.

ALTER TABLE public.match_events
    DROP CONSTRAINT IF EXISTS match_events_goal_cell_check;

ALTER TABLE public.match_events
    ADD CONSTRAINT match_events_goal_cell_check
    CHECK (goal_cell IS NULL OR (goal_cell >= 0 AND goal_cell <= 9));

COMMENT ON COLUMN public.match_events.goal_cell IS
    'Placement in the goal mouth. 1-9 numbered like a numpad (7-8-9 top row); 0 = off target; NULL = not tagged.';

COMMENT ON COLUMN public.match_events.court_x IS
    'Lateral position in metres, -10..+10, origin at the centre of the goal line. Negative is left as the shooter faces the goal.';

COMMENT ON COLUMN public.match_events.court_y IS
    'Distance out from the goal line in metres, 0..20.';
