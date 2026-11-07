-- MULTISPORTS SCORING V23 — Disponibilités et demandes boutique du club.
-- Aucun paiement. Aucune réservation de carte Buvette. Les petites annonces restent un simple contact.
-- La soumission publique accepte une demande, jamais une commande ferme ni un paiement.
BEGIN;

ALTER TABLE public.ms_organization_shop_items
  ADD COLUMN IF NOT EXISTS availability text NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS stock_quantity integer DEFAULT NULL;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ms_org_shop_availability_v23') THEN
    ALTER TABLE public.ms_organization_shop_items ADD CONSTRAINT ms_org_shop_availability_v23
      CHECK (availability IN ('available','preorder','on_request','unavailable'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ms_org_shop_stock_v23') THEN
    ALTER TABLE public.ms_organization_shop_items ADD CONSTRAINT ms_org_shop_stock_v23
      CHECK (stock_quantity IS NULL OR stock_quantity BETWEEN 0 AND 100000);
  END IF;
END $$;
GRANT UPDATE (availability,stock_quantity) ON public.ms_organization_shop_items TO authenticated;

CREATE TABLE IF NOT EXISTS public.ms_organization_shop_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ms_organizations(id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.ms_organization_shop_items(id) ON DELETE SET NULL,
  item_title text NOT NULL CHECK (char_length(item_title) BETWEEN 2 AND 120),
  item_category text NOT NULL CHECK (item_category IN ('official_kit','clothing','goodies')),
  unit_price numeric(10,2),
  currency text NOT NULL DEFAULT 'EUR',
  request_kind text NOT NULL CHECK (request_kind IN ('reservation','personalization')),
  requester_name text NOT NULL CHECK (char_length(requester_name) BETWEEN 2 AND 100),
  requester_email text NOT NULL CHECK (char_length(requester_email) BETWEEN 5 AND 180),
  requester_phone text NOT NULL DEFAULT '' CHECK (char_length(requester_phone) <= 45),
  quantity integer NOT NULL CHECK (quantity BETWEEN 1 AND 10),
  selected_size text NOT NULL DEFAULT '' CHECK (char_length(selected_size) <= 40),
  personalized_name text NOT NULL DEFAULT '' CHECK (char_length(personalized_name) <= 50),
  personalized_number text NOT NULL DEFAULT '' CHECK (char_length(personalized_number) <= 12),
  notes text NOT NULL DEFAULT '' CHECK (char_length(notes) <= 500),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','ready','completed','rejected','cancelled')),
  stock_allocated boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ms_org_shop_requests_org_idx
  ON public.ms_organization_shop_requests(organization_id,created_at DESC);
CREATE INDEX IF NOT EXISTS ms_org_shop_requests_rate_idx
  ON public.ms_organization_shop_requests(organization_id,lower(requester_email),created_at DESC);

ALTER TABLE public.ms_organization_shop_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ms_org_shop_requests_admin_read_v23 ON public.ms_organization_shop_requests;
CREATE POLICY ms_org_shop_requests_admin_read_v23 ON public.ms_organization_shop_requests
  FOR SELECT TO authenticated USING (public.ms_org_has_role(organization_id,ARRAY['owner','admin','manager']));
REVOKE ALL ON public.ms_organization_shop_requests FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.ms_organization_shop_requests TO authenticated;

CREATE OR REPLACE FUNCTION public.ms_org_shop_request_updated_v23()
RETURNS trigger LANGUAGE plpgsql SET search_path=public,pg_temp AS $$
BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS ms_org_shop_request_updated_v23 ON public.ms_organization_shop_requests;
CREATE TRIGGER ms_org_shop_request_updated_v23 BEFORE UPDATE ON public.ms_organization_shop_requests
FOR EACH ROW EXECUTE FUNCTION public.ms_org_shop_request_updated_v23();

-- Requête publique sans compte. Lecture seule du catalogue + écriture serveur contrôlée.
-- Limite par adresse : 1 demande / 5 min, 8 / jour et un champ piège contre les bots basiques.
-- Une limitation forte par IP / CAPTCHA doit être assurée en amont pour un usage à grande échelle.
CREATE OR REPLACE FUNCTION public.ms_org_shop_submit_request_v23(
  p_organization_id uuid,
  p_item_id uuid,
  p_name text,
  p_email text,
  p_phone text DEFAULT '',
  p_quantity integer DEFAULT 1,
  p_size text DEFAULT '',
  p_personalized_name text DEFAULT '',
  p_personalized_number text DEFAULT '',
  p_notes text DEFAULT '',
  p_honeypot text DEFAULT ''
) RETURNS uuid
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_item public.ms_organization_shop_items%ROWTYPE;
  v_name text := btrim(coalesce(p_name,''));
  v_email text := lower(btrim(coalesce(p_email,'')));
  v_phone text := btrim(coalesce(p_phone,''));
  v_size text := btrim(coalesce(p_size,''));
  v_personal_name text := btrim(coalesce(p_personalized_name,''));
  v_personal_number text := btrim(coalesce(p_personalized_number,''));
  v_notes text := btrim(coalesce(p_notes,''));
  v_id uuid;
BEGIN
  IF coalesce(p_honeypot,'')<>'' THEN RAISE EXCEPTION 'Demande non autorisée.'; END IF;
  IF p_organization_id IS NULL OR p_item_id IS NULL OR char_length(v_name) NOT BETWEEN 2 AND 100
    OR char_length(v_email) NOT BETWEEN 5 AND 180 OR v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
    OR char_length(v_phone)>45 OR p_quantity NOT BETWEEN 1 AND 10
    OR char_length(v_size)>40 OR char_length(v_personal_name)>50
    OR char_length(v_personal_number)>12 OR char_length(v_notes)>500 THEN
    RAISE EXCEPTION 'Informations invalides.';
  END IF;
  IF v_personal_number<>'' AND v_personal_number !~ '^[0-9A-Za-z-]{1,12}$' THEN
    RAISE EXCEPTION 'Numéro de personnalisation invalide.';
  END IF;
  -- Empêche de dépasser les limites en soumettant deux requêtes simultanément.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_organization_id::text || ':' || v_email, 0));
  IF EXISTS (SELECT 1 FROM public.ms_organization_shop_requests
    WHERE organization_id=p_organization_id AND lower(requester_email)=v_email
      AND created_at>now()-interval '5 minutes')
    OR (SELECT count(*) FROM public.ms_organization_shop_requests
    WHERE organization_id=p_organization_id AND lower(requester_email)=v_email
      AND created_at>now()-interval '1 day') >= 8 THEN
    RAISE EXCEPTION 'Trop de demandes récentes. Réessaie plus tard.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ms_organization_public_shops
    WHERE organization_id=p_organization_id AND is_published=true) THEN
    RAISE EXCEPTION 'Boutique non disponible.';
  END IF;
  SELECT * INTO v_item FROM public.ms_organization_shop_items
    WHERE id=p_item_id AND organization_id=p_organization_id AND status='published'
      AND category IN ('official_kit','clothing','goodies');
  IF NOT FOUND OR v_item.availability='unavailable'
    OR (v_item.availability='available' AND v_item.stock_quantity IS NOT NULL
       AND v_item.stock_quantity<p_quantity) THEN
    RAISE EXCEPTION 'Cet article n’est plus disponible pour cette quantité.';
  END IF;
  IF (v_personal_name<>'' OR v_personal_number<>'') AND v_item.category NOT IN ('official_kit','clothing') THEN
    RAISE EXCEPTION 'Personnalisation non disponible pour cet article.';
  END IF;
  INSERT INTO public.ms_organization_shop_requests (
    organization_id,item_id,item_title,item_category,unit_price,currency,request_kind,
    requester_name,requester_email,requester_phone,quantity,selected_size,
    personalized_name,personalized_number,notes
  ) VALUES (
    p_organization_id,p_item_id,v_item.title,v_item.category,v_item.price,v_item.currency,
    CASE WHEN v_personal_name<>'' OR v_personal_number<>'' THEN 'personalization' ELSE 'reservation' END,
    v_name,v_email,v_phone,p_quantity,v_size,v_personal_name,v_personal_number,v_notes
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;
REVOKE ALL ON FUNCTION public.ms_org_shop_submit_request_v23(uuid,uuid,text,text,text,integer,text,text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ms_org_shop_submit_request_v23(uuid,uuid,text,text,text,integer,text,text,text,text,text) TO anon,authenticated;

-- Avancement admin atomique : le stock est réservé UNE SEULE FOIS à l'acceptation.
-- Annulation d'une demande acceptée/prête : stock restitué, avec trace de statut.
CREATE OR REPLACE FUNCTION public.ms_org_shop_set_request_status_v23(p_request_id uuid,p_status text)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_request public.ms_organization_shop_requests%ROWTYPE;
  v_item public.ms_organization_shop_items%ROWTYPE;
  v_allocate boolean := false;
  v_restore boolean := false;
BEGIN
  IF auth.uid() IS NULL OR p_request_id IS NULL THEN RAISE EXCEPTION 'Connexion requise.'; END IF;
  SELECT * INTO v_request FROM public.ms_organization_shop_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND OR NOT public.ms_org_has_role(v_request.organization_id,ARRAY['owner','admin','manager']) THEN
    RAISE EXCEPTION 'Demande introuvable ou accès refusé.';
  END IF;
  IF NOT (
    (v_request.status='pending' AND p_status IN ('accepted','rejected','cancelled')) OR
    (v_request.status='accepted' AND p_status IN ('ready','completed','cancelled')) OR
    (v_request.status='ready' AND p_status IN ('completed','cancelled'))
  ) THEN RAISE EXCEPTION 'Changement de statut impossible.'; END IF;
  IF v_request.item_id IS NOT NULL THEN
    SELECT * INTO v_item FROM public.ms_organization_shop_items WHERE id=v_request.item_id FOR UPDATE;
  END IF;
  v_allocate := p_status='accepted' AND v_request.status='pending' AND v_request.item_id IS NOT NULL
    AND v_item.availability='available' AND v_item.stock_quantity IS NOT NULL;
  v_restore := p_status='cancelled' AND v_request.stock_allocated AND v_request.item_id IS NOT NULL;
  IF v_allocate THEN
    UPDATE public.ms_organization_shop_items
      SET stock_quantity=stock_quantity-v_request.quantity
      WHERE id=v_request.item_id AND stock_quantity>=v_request.quantity;
    IF NOT FOUND THEN RAISE EXCEPTION 'Stock insuffisant : mets le stock à jour ou refuse la demande.'; END IF;
  END IF;
  IF v_restore THEN
    UPDATE public.ms_organization_shop_items SET stock_quantity=LEAST(100000,stock_quantity+v_request.quantity)
      WHERE id=v_request.item_id AND stock_quantity IS NOT NULL;
  END IF;
  UPDATE public.ms_organization_shop_requests SET status=p_status,
    stock_allocated=CASE WHEN v_restore THEN false WHEN v_allocate THEN true ELSE stock_allocated END
    WHERE id=p_request_id;
END;
$$;
REVOKE ALL ON FUNCTION public.ms_org_shop_set_request_status_v23(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ms_org_shop_set_request_status_v23(uuid,text) TO authenticated;

-- Adaptation de la lecture publique V22 aux disponibilités, sans PII ni état des demandes.
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
  v_logo := COALESCE(v_organization.profile ->> 'logoUrl','');
  v_cover := COALESCE(v_shop.cover_image_url,'');
  IF v_cover='' THEN v_cover := COALESCE(v_organization.profile ->> 'coverUrl',''); END IF;
  IF v_logo !~* '^https://' OR char_length(v_logo)>1000 THEN v_logo:=''; END IF;
  IF v_cover !~* '^https://' OR char_length(v_cover)>1000 THEN v_cover:=''; END IF;
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', i.id, 'category', i.category, 'title', i.title,
    'description', i.description, 'price', i.price, 'currency', i.currency,
    'variants', i.variants, 'imageUrl', i.image_url,
    'availability', i.availability, 'stockQuantity', i.stock_quantity
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
GRANT EXECUTE ON FUNCTION public.ms_org_public_shop_read_v22(uuid) TO anon,authenticated;

COMMIT;
