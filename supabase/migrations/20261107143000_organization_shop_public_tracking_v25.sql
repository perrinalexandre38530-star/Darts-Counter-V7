-- MULTISPORTS SCORING — V25: suivi public minimal par référence + courriel,
-- et garde-fou de volume par club contre les demandes automatisées.
-- Dépend de V23 et V24; ne modifie aucune demande, aucun stock ni aucune carte Buvette.
BEGIN;

-- Retour volontairement minimal : aucune donnée nominative, aucun numéro de téléphone,
-- aucune note client / interne, aucun événement interne.
-- Une référence UUID seule ne suffit PAS : l'adresse e-mail d'origine est requise.
CREATE OR REPLACE FUNCTION public.ms_org_shop_track_request_v25(
  p_organization_id uuid,
  p_request_id uuid,
  p_requester_email text
) RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_email text := lower(btrim(coalesce(p_requester_email,'')));
  v_request public.ms_organization_shop_requests%ROWTYPE;
BEGIN
  IF p_organization_id IS NULL OR p_request_id IS NULL
    OR char_length(v_email) NOT BETWEEN 5 AND 180
    OR v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  THEN RETURN NULL; END IF;

  SELECT * INTO v_request
  FROM public.ms_organization_shop_requests
  WHERE id=p_request_id AND organization_id=p_organization_id
    AND lower(requester_email)=v_email;
  IF NOT FOUND THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'status', v_request.status,
    'itemTitle', v_request.item_title,
    'quantity', v_request.quantity,
    'createdAt', v_request.created_at,
    'updatedAt', v_request.updated_at
  );
END;
$$;
REVOKE ALL ON FUNCTION public.ms_org_shop_track_request_v25(uuid,uuid,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ms_org_shop_track_request_v25(uuid,uuid,text) TO anon,authenticated;

-- Garde-fou supplémentaire : les limites V23 par e-mail restent inchangées.
-- Ces seuils par club évitent un flot illimité en variant les adresses e-mail.
-- Ils ne remplacent PAS Turnstile, WAF ou limitation par IP sur le serveur frontal.
CREATE OR REPLACE FUNCTION public.ms_org_shop_request_volume_guard_v25()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_last_ten_minutes bigint;
  v_last_day bigint;
BEGIN
  -- Sérialisation des demandes d'un même club, même si les e-mails diffèrent.
  PERFORM pg_advisory_xact_lock(hashtextextended('shop-volume:'||NEW.organization_id::text, 0));
  SELECT COUNT(*) FILTER (WHERE created_at > now() - interval '10 minutes'), COUNT(*)
    INTO v_last_ten_minutes, v_last_day
    FROM public.ms_organization_shop_requests
    WHERE organization_id=NEW.organization_id AND created_at > now()-interval '1 day';
  IF v_last_ten_minutes >= 60 OR v_last_day >= 400 THEN
    RAISE EXCEPTION 'Trop de demandes pour cette boutique. Réessaie plus tard.';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.ms_org_shop_request_volume_guard_v25() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS ms_org_shop_request_volume_guard_v25 ON public.ms_organization_shop_requests;
CREATE TRIGGER ms_org_shop_request_volume_guard_v25
  BEFORE INSERT ON public.ms_organization_shop_requests FOR EACH ROW
  EXECUTE FUNCTION public.ms_org_shop_request_volume_guard_v25();

COMMIT;
