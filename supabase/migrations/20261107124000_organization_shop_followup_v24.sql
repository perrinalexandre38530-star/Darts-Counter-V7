-- MULTISPORTS SCORING V24 — Suivi administrateur des demandes de la boutique.
-- Aucune modification des commandes existantes, stocks, paiements, ni cartes buvette.
BEGIN;

ALTER TABLE public.ms_organization_shop_requests
  ADD COLUMN IF NOT EXISTS internal_note text NOT NULL DEFAULT '';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ms_org_shop_request_internal_note_v24') THEN
    ALTER TABLE public.ms_organization_shop_requests
      ADD CONSTRAINT ms_org_shop_request_internal_note_v24 CHECK (char_length(internal_note)<=1000);
  END IF;
END $$;

-- Journal append-only : jamais d'écriture directement depuis le client.
CREATE TABLE IF NOT EXISTS public.ms_organization_shop_request_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.ms_organizations(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.ms_organization_shop_requests(id) ON DELETE CASCADE,
  old_status text NOT NULL,
  new_status text NOT NULL,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ms_org_shop_request_events_lookup_v24
  ON public.ms_organization_shop_request_events(request_id,created_at DESC);
ALTER TABLE public.ms_organization_shop_request_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ms_org_shop_request_events_admin_select_v24 ON public.ms_organization_shop_request_events;
CREATE POLICY ms_org_shop_request_events_admin_select_v24 ON public.ms_organization_shop_request_events
  FOR SELECT TO authenticated
  USING (public.ms_org_has_role(organization_id,ARRAY['owner','admin','manager']));
REVOKE ALL ON public.ms_organization_shop_request_events FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.ms_organization_shop_request_events TO authenticated;

CREATE OR REPLACE FUNCTION public.ms_org_shop_log_status_v24()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ms_organization_shop_request_events(organization_id,request_id,old_status,new_status,actor_id)
    VALUES (NEW.organization_id,NEW.id,OLD.status,NEW.status,auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.ms_org_shop_log_status_v24() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS ms_org_shop_log_status_v24 ON public.ms_organization_shop_requests;
CREATE TRIGGER ms_org_shop_log_status_v24 AFTER UPDATE OF status
  ON public.ms_organization_shop_requests FOR EACH ROW
  EXECUTE FUNCTION public.ms_org_shop_log_status_v24();

-- Notes privées, modifiées via RPC contrôlée (pas d'UPDATE direct exposé).
CREATE OR REPLACE FUNCTION public.ms_org_shop_set_internal_note_v24(p_request_id uuid,p_note text)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_org uuid;
BEGIN
  IF auth.uid() IS NULL OR p_request_id IS NULL OR char_length(coalesce(p_note,''))>1000 THEN
    RAISE EXCEPTION 'Note invalide ou connexion requise.';
  END IF;
  SELECT organization_id INTO v_org FROM public.ms_organization_shop_requests
    WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND OR NOT public.ms_org_has_role(v_org,ARRAY['owner','admin','manager']) THEN
    RAISE EXCEPTION 'Demande introuvable ou accès refusé.';
  END IF;
  UPDATE public.ms_organization_shop_requests SET internal_note=btrim(coalesce(p_note,''))
    WHERE id=p_request_id;
END;
$$;
REVOKE ALL ON FUNCTION public.ms_org_shop_set_internal_note_v24(uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ms_org_shop_set_internal_note_v24(uuid,text) TO authenticated;

-- Anonymisation manuelle, limitée aux demandes clôturées depuis au moins 90 jours.
-- Conservation du numéro, des articles, des quantités et du statut pour le suivi des stocks.
CREATE OR REPLACE FUNCTION public.ms_org_shop_anonymize_request_v24(p_request_id uuid)
RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_req public.ms_organization_shop_requests%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL OR p_request_id IS NULL THEN RAISE EXCEPTION 'Connexion requise.'; END IF;
  SELECT * INTO v_req FROM public.ms_organization_shop_requests WHERE id=p_request_id FOR UPDATE;
  IF NOT FOUND OR NOT public.ms_org_has_role(v_req.organization_id,ARRAY['owner','admin']) THEN
    RAISE EXCEPTION 'Demande introuvable ou accès refusé.';
  END IF;
  IF v_req.status NOT IN ('completed','rejected','cancelled')
    OR v_req.updated_at>now()-interval '90 days' THEN
    RAISE EXCEPTION 'Seules les demandes clôturées âgées de 90 jours peuvent être anonymisées.';
  END IF;
  UPDATE public.ms_organization_shop_requests SET
    requester_name='Anonymisé',
    requester_email='archive-'||id::text||'@example.invalid',
    requester_phone='', selected_size='', personalized_name='', personalized_number='',
    notes='', internal_note=''
    WHERE id=p_request_id;
END;
$$;
REVOKE ALL ON FUNCTION public.ms_org_shop_anonymize_request_v24(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ms_org_shop_anonymize_request_v24(uuid) TO authenticated;
COMMIT;
