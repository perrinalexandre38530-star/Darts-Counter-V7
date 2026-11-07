-- MSS V21 - catalogue de 20 fonds WebP, cartes et couverture de la Buvette du club.
-- Nécessite V19 et V20 ; ne modifie ni les consommations ni les cartes existantes.
BEGIN;
ALTER TABLE public.ms_org_drink_card_templates DROP CONSTRAINT IF EXISTS ms_org_drink_templates_background_key_chk;
ALTER TABLE public.ms_org_drink_card_templates ADD CONSTRAINT ms_org_drink_templates_background_key_chk
  CHECK (background_key IN ('bar-night','graphite','wood','gold','clean','custom','scene-01','scene-02','scene-03','scene-04','scene-05','scene-06','scene-07','scene-08','scene-09','scene-10','scene-11','scene-12','scene-13','scene-14','scene-15','scene-16','scene-17','scene-18','scene-19','scene-20'));
ALTER TABLE public.ms_org_drink_cards DROP CONSTRAINT IF EXISTS ms_org_drink_cards_background_key_chk;
ALTER TABLE public.ms_org_drink_cards ADD CONSTRAINT ms_org_drink_cards_background_key_chk
  CHECK (background_key IN ('bar-night','graphite','wood','gold','clean','custom','scene-01','scene-02','scene-03','scene-04','scene-05','scene-06','scene-07','scene-08','scene-09','scene-10','scene-11','scene-12','scene-13','scene-14','scene-15','scene-16','scene-17','scene-18','scene-19','scene-20'));

CREATE TABLE IF NOT EXISTS public.ms_org_buvette_settings (
  organization_id uuid PRIMARY KEY REFERENCES public.ms_organizations(id) ON DELETE CASCADE,
  cover_key text NOT NULL DEFAULT 'scene-02',
  updated_by uuid NOT NULL REFERENCES auth.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ms_org_buvette_cover_key_chk CHECK (cover_key IN ('scene-01','scene-02','scene-03','scene-04','scene-05','scene-06','scene-07','scene-08','scene-09','scene-10','scene-11','scene-12','scene-13','scene-14','scene-15','scene-16','scene-17','scene-18','scene-19','scene-20'))
);
ALTER TABLE public.ms_org_buvette_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ms_org_buvette_settings_read ON public.ms_org_buvette_settings;
CREATE POLICY ms_org_buvette_settings_read ON public.ms_org_buvette_settings
  FOR SELECT TO authenticated USING (public.ms_org_is_member(organization_id));
-- L'écriture de la couverture passe exclusivement par la fonction ci-dessous.
DROP POLICY IF EXISTS ms_org_buvette_settings_insert ON public.ms_org_buvette_settings;
DROP POLICY IF EXISTS ms_org_buvette_settings_update ON public.ms_org_buvette_settings;
REVOKE ALL ON public.ms_org_buvette_settings FROM anon,authenticated;
GRANT SELECT ON public.ms_org_buvette_settings TO authenticated;

CREATE OR REPLACE FUNCTION public.ms_org_buvette_cover_set(p_org_id uuid,p_cover_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT public.ms_org_has_role(p_org_id,ARRAY['owner','admin','manager'])
  THEN RAISE EXCEPTION 'BUVETTE_NOT_ADMIN'; END IF;
  INSERT INTO public.ms_org_buvette_settings(organization_id,cover_key,updated_by,updated_at)
  VALUES (p_org_id,p_cover_key,auth.uid(),now())
  ON CONFLICT (organization_id) DO UPDATE
    SET cover_key=excluded.cover_key,updated_by=excluded.updated_by,updated_at=excluded.updated_at;
END; $$;
REVOKE ALL ON FUNCTION public.ms_org_buvette_cover_set(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ms_org_buvette_cover_set(uuid,text) TO authenticated;
COMMIT;
