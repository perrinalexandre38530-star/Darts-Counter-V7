-- MULTISPORTS SCORING V22 — Boutique publique des organisations.
-- Opt-in explicite. Catalogue en lecture seule. Jamais de données de membres,
-- de cartes buvette, de codes d'adhésion, de brouillons ou de coordonnées privées.
BEGIN;

CREATE TABLE IF NOT EXISTS public.ms_organization_public_shops (
  organization_id uuid PRIMARY KEY REFERENCES public.ms_organizations(id) ON DELETE CASCADE,
  is_published boolean NOT NULL DEFAULT false,
  headline text NOT NULL DEFAULT '' CHECK (char_length(headline) <= 100),
  subtitle text NOT NULL DEFAULT '' CHECK (char_length(subtitle) <= 380),
  cover_image_url text NOT NULL DEFAULT '' CHECK (char_length(cover_image_url) <= 1000 AND (cover_image_url = '' OR cover_image_url ~* '^https://')),
  contact_email text NOT NULL DEFAULT '' CHECK (char_length(contact_email) <= 180),
  contact_phone text NOT NULL DEFAULT '' CHECK (char_length(contact_phone) <= 45),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ms_organization_public_shops ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ms_org_public_shop_manage_select_v22 ON public.ms_organization_public_shops;
CREATE POLICY ms_org_public_shop_manage_select_v22 ON public.ms_organization_public_shops
  FOR SELECT TO authenticated USING (public.ms_org_has_role(organization_id, ARRAY['owner','admin']));
DROP POLICY IF EXISTS ms_org_public_shop_manage_insert_v22 ON public.ms_organization_public_shops;
CREATE POLICY ms_org_public_shop_manage_insert_v22 ON public.ms_organization_public_shops
  FOR INSERT TO authenticated WITH CHECK (public.ms_org_has_role(organization_id, ARRAY['owner','admin']));
DROP POLICY IF EXISTS ms_org_public_shop_manage_update_v22 ON public.ms_organization_public_shops;
CREATE POLICY ms_org_public_shop_manage_update_v22 ON public.ms_organization_public_shops
  FOR UPDATE TO authenticated USING (public.ms_org_has_role(organization_id, ARRAY['owner','admin']))
  WITH CHECK (public.ms_org_has_role(organization_id, ARRAY['owner','admin']));

REVOKE ALL ON public.ms_organization_public_shops FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.ms_organization_public_shops TO authenticated;
GRANT INSERT (organization_id,is_published,headline,subtitle,cover_image_url,contact_email,contact_phone)
  ON public.ms_organization_public_shops TO authenticated;
GRANT UPDATE (is_published,headline,subtitle,cover_image_url,contact_email,contact_phone)
  ON public.ms_organization_public_shops TO authenticated;

CREATE OR REPLACE FUNCTION public.ms_organization_public_shop_updated_v22()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END;
$$;
DROP TRIGGER IF EXISTS ms_organization_public_shop_updated_v22 ON public.ms_organization_public_shops;
CREATE TRIGGER ms_organization_public_shop_updated_v22
  BEFORE UPDATE ON public.ms_organization_public_shops
  FOR EACH ROW EXECUTE FUNCTION public.ms_organization_public_shop_updated_v22();

-- Réponse publique strictement explicitée : aucune lecture de table privée depuis le navigateur.
-- SECURITY DEFINER nécessaire pour lire uniquement le catalogue publié sous RLS.
CREATE OR REPLACE FUNCTION public.ms_org_public_shop_read_v22(p_organization_id uuid)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_organization public.ms_organizations%ROWTYPE;
  v_shop public.ms_organization_public_shops%ROWTYPE;
  v_items jsonb := '[]'::jsonb;
  v_logo text;
  v_cover text;
BEGIN
  SELECT * INTO v_shop FROM public.ms_organization_public_shops
    WHERE organization_id=p_organization_id AND is_published=true;
  IF NOT FOUND THEN RETURN NULL; END IF;

  SELECT * INTO v_organization FROM public.ms_organizations WHERE id=p_organization_id;
  IF NOT FOUND THEN RETURN NULL; END IF;

  -- Médias publics du club uniquement (pas de clés privées ni d'URLs internes).
  v_logo := COALESCE(v_organization.profile ->> 'logoUrl','');
  v_cover := COALESCE(v_shop.cover_image_url,'');
  IF v_cover = '' THEN v_cover := COALESCE(v_organization.profile ->> 'coverUrl',''); END IF;
  IF v_logo !~* '^https://' OR char_length(v_logo)>1000 THEN v_logo:=''; END IF;
  IF v_cover !~* '^https://' OR char_length(v_cover)>1000 THEN v_cover:=''; END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', i.id, 'category', i.category, 'title', i.title,
    'description', i.description, 'price', i.price, 'currency', i.currency,
    'variants', i.variants, 'imageUrl', i.image_url
  ) ORDER BY i.sort_order ASC, i.created_at DESC), '[]'::jsonb)
  INTO v_items FROM public.ms_organization_shop_items i
  WHERE i.organization_id=p_organization_id AND i.status='published';

  RETURN jsonb_build_object(
    'organizationId', v_organization.id, 'name', v_organization.name,
    'city', COALESCE(v_organization.city,''), 'logoUrl', v_logo,
    'coverUrl', v_cover, 'headline', COALESCE(v_shop.headline,''),
    'subtitle', COALESCE(v_shop.subtitle,''),
    'contactEmail', COALESCE(v_shop.contact_email,''),
    'contactPhone', COALESCE(v_shop.contact_phone,''),
    'items', v_items
  );
END;
$$;
REVOKE ALL ON FUNCTION public.ms_org_public_shop_read_v22(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ms_org_public_shop_read_v22(uuid) TO anon, authenticated;

COMMIT;
