-- Migration: Remove 10-template limit
-- Description: Removes the trigger and function that enforced the 10-template limit per agency.
-- Note: The CASCADE delete constraint on scouting_offers remains intact.

DROP TRIGGER IF EXISTS enforce_template_limit ON scouting_templates;
DROP FUNCTION IF EXISTS check_template_limit();
