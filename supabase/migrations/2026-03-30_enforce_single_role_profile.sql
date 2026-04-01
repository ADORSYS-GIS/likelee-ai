CREATE OR REPLACE FUNCTION public.enforce_single_role_profile()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_TABLE_NAME = 'creators' THEN
    IF EXISTS (SELECT 1 FROM public.brands WHERE id = NEW.id) THEN
      RAISE EXCEPTION 'This account already has a brand profile. Use a separate account for creator access.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.agencies WHERE id = NEW.id) THEN
      RAISE EXCEPTION 'This account already has an agency profile. Use a separate account for creator access.';
    END IF;
  ELSIF TG_TABLE_NAME = 'brands' THEN
    IF EXISTS (SELECT 1 FROM public.creators WHERE id = NEW.id) THEN
      RAISE EXCEPTION 'This account already has a creator profile. Use a separate account for brand access.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.agencies WHERE id = NEW.id) THEN
      RAISE EXCEPTION 'This account already has an agency profile. Use a separate account for brand access.';
    END IF;
  ELSIF TG_TABLE_NAME = 'agencies' THEN
    IF EXISTS (SELECT 1 FROM public.creators WHERE id = NEW.id) THEN
      RAISE EXCEPTION 'This account already has a creator profile. Use a separate account for agency access.';
    END IF;

    IF EXISTS (SELECT 1 FROM public.brands WHERE id = NEW.id) THEN
      RAISE EXCEPTION 'This account already has a brand profile. Use a separate account for agency access.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS creators_enforce_single_role_profile ON public.creators;
CREATE TRIGGER creators_enforce_single_role_profile
  BEFORE INSERT ON public.creators
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_role_profile();

DROP TRIGGER IF EXISTS brands_enforce_single_role_profile ON public.brands;
CREATE TRIGGER brands_enforce_single_role_profile
  BEFORE INSERT ON public.brands
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_role_profile();

DROP TRIGGER IF EXISTS agencies_enforce_single_role_profile ON public.agencies;
CREATE TRIGGER agencies_enforce_single_role_profile
  BEFORE INSERT ON public.agencies
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_single_role_profile();
