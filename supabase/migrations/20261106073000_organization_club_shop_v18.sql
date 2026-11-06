-- MULTISPORTS SCORING V18 — Catalogue du club / buvette.
-- Pas de panier ni de paiement. Les équipements sont uniquement des petites annonces facultatives.
-- Les images sont stockées dans le bucket médias existant; ici seulement une URL HTTPS.
BEGIN;

CREATE TABLE IF NOT EXISTS public.ms_organization_shop_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ms_organizations(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('official_kit','clothing','goodies','drinks','equipment_ad')),
  title text NOT NULL CHECK (char_length(btrim(title)) BETWEEN 2 AND 120),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 1200),
  price numeric(10,2) CHECK (price IS NULL OR price >= 0),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
  variants text NOT NULL DEFAULT '' CHECK (char_length(variants) <= 250),
  image_url text NOT NULL DEFAULT '' CHECK (char_length(image_url) <= 1000 AND (image_url = '' OR image_url ~* '^https://')),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','archived')),
  sort_order integer NOT NULL DEFAULT 0 CHECK (sort_order BETWEEN 0 AND 1000000),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ms_org_shop_org_status_idx
  ON public.ms_organization_shop_items(organization_id, status, sort_order, created_at DESC);

ALTER TABLE public.ms_organization_shop_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ms_org_shop_read ON public.ms_organization_shop_items;
CREATE POLICY ms_org_shop_read ON public.ms_organization_shop_items
FOR SELECT TO authenticated USING (
  public.ms_org_is_member(organization_id)
  AND (status = 'published' OR public.ms_org_has_role(organization_id, ARRAY['owner','admin','manager']))
);

DROP POLICY IF EXISTS ms_org_shop_insert ON public.ms_organization_shop_items;
CREATE POLICY ms_org_shop_insert ON public.ms_organization_shop_items
FOR INSERT TO authenticated WITH CHECK (
  public.ms_org_has_role(organization_id, ARRAY['owner','admin','manager']) AND created_by = auth.uid()
);

DROP POLICY IF EXISTS ms_org_shop_update ON public.ms_organization_shop_items;
CREATE POLICY ms_org_shop_update ON public.ms_organization_shop_items
FOR UPDATE TO authenticated
USING (public.ms_org_has_role(organization_id, ARRAY['owner','admin','manager']))
WITH CHECK (public.ms_org_has_role(organization_id, ARRAY['owner','admin','manager']));

DROP POLICY IF EXISTS ms_org_shop_delete ON public.ms_organization_shop_items;
CREATE POLICY ms_org_shop_delete ON public.ms_organization_shop_items
FOR DELETE TO authenticated
USING (public.ms_org_has_role(organization_id, ARRAY['owner','admin']));

-- Ne permet pas la mutation de created_by, organization_id ou dates système.
REVOKE ALL ON public.ms_organization_shop_items FROM anon, authenticated;
GRANT SELECT ON public.ms_organization_shop_items TO authenticated;
GRANT INSERT (organization_id,category,title,description,price,currency,variants,image_url,status,sort_order)
  ON public.ms_organization_shop_items TO authenticated;
GRANT UPDATE (category,title,description,price,currency,variants,image_url,status,sort_order)
  ON public.ms_organization_shop_items TO authenticated;
GRANT DELETE ON public.ms_organization_shop_items TO authenticated;

CREATE OR REPLACE FUNCTION public.ms_org_shop_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END; $$;
DROP TRIGGER IF EXISTS ms_org_shop_updated_at_trigger ON public.ms_organization_shop_items;
CREATE TRIGGER ms_org_shop_updated_at_trigger BEFORE UPDATE ON public.ms_organization_shop_items
FOR EACH ROW EXECUTE FUNCTION public.ms_org_shop_updated_at();

COMMIT;
