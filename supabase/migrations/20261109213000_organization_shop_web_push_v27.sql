-- MULTISPORTS SCORING — V27 — Push Web des responsables de boutiques.
-- Prérequis : V23..V26 appliquées. Aucun changement sur les cartes Buvette.
-- Aucune donnée de souscription n'est exposée via SELECT public/authenticated.
BEGIN;

CREATE TABLE IF NOT EXISTS public.ms_organization_shop_push_subscriptions (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE CHECK (char_length(endpoint) BETWEEN 24 AND 2048 AND endpoint LIKE 'https://%'),
  p256dh text NOT NULL CHECK (char_length(p256dh) BETWEEN 40 AND 256 AND p256dh ~ '^[A-Za-z0-9_-]+$'),
  auth_secret text NOT NULL CHECK (char_length(auth_secret) BETWEEN 16 AND 256 AND auth_secret ~ '^[A-Za-z0-9_-]+$'),
  user_agent text NOT NULL DEFAULT '' CHECK (char_length(user_agent) <= 200),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ms_org_shop_push_subs_user_v27
  ON public.ms_organization_shop_push_subscriptions(user_id);
ALTER TABLE public.ms_organization_shop_push_subscriptions ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ms_organization_shop_push_subscriptions FROM PUBLIC,anon,authenticated;

CREATE TABLE IF NOT EXISTS public.ms_organization_shop_push_deliveries (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  notification_id bigint NOT NULL REFERENCES public.ms_organization_shop_notifications(id) ON DELETE CASCADE,
  subscription_id bigint NOT NULL REFERENCES public.ms_organization_shop_push_subscriptions(id) ON DELETE CASCADE,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sending','sent','failed')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts BETWEEN 0 AND 10),
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  locked_until timestamptz,
  sent_at timestamptz,
  last_error text NOT NULL DEFAULT '' CHECK (char_length(last_error) <= 160),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(notification_id,subscription_id)
);
CREATE INDEX IF NOT EXISTS ms_org_shop_push_due_v27
  ON public.ms_organization_shop_push_deliveries(next_attempt_at,id)
  WHERE state IN ('pending','sending');
ALTER TABLE public.ms_organization_shop_push_deliveries ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ms_organization_shop_push_deliveries FROM PUBLIC,anon,authenticated;

-- Inscription volontaire. Toujours l'utilisateur authentifié, jamais un user_id fourni.
-- Si l'appareil avait une souscription de quelqu'un d'autre, ne PAS la détourner.
CREATE OR REPLACE FUNCTION public.ms_org_shop_push_register_v27(
  p_endpoint text,p_p256dh text,p_auth text,p_user_agent text DEFAULT ''
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_user uuid := auth.uid(); v_existing uuid;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Connexion requise.'; END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.ms_organization_members m
    WHERE m.user_id=v_user AND m.status='active' AND m.role IN ('owner','admin','manager')
  ) THEN RAISE EXCEPTION 'Seuls les responsables peuvent activer le push boutique.'; END IF;
  IF p_endpoint IS NULL OR char_length(p_endpoint) NOT BETWEEN 24 AND 2048
    OR p_endpoint NOT LIKE 'https://%' OR p_p256dh IS NULL
    OR p_p256dh !~ '^[A-Za-z0-9_-]{40,256}$'
    OR p_auth IS NULL OR p_auth !~ '^[A-Za-z0-9_-]{16,256}$'
  THEN RAISE EXCEPTION 'Souscription push invalide.'; END IF;
  SELECT user_id INTO v_existing
  FROM public.ms_organization_shop_push_subscriptions WHERE endpoint=p_endpoint FOR UPDATE;
  IF FOUND AND v_existing IS DISTINCT FROM v_user THEN
    RAISE EXCEPTION 'Ce navigateur est lié à un autre compte. Désactive puis recrée la souscription.';
  END IF;
  INSERT INTO public.ms_organization_shop_push_subscriptions(user_id,endpoint,p256dh,auth_secret,user_agent)
  VALUES (v_user,p_endpoint,p_p256dh,p_auth,left(coalesce(p_user_agent,''),200))
  ON CONFLICT (endpoint) DO UPDATE SET
    p256dh=EXCLUDED.p256dh,auth_secret=EXCLUDED.auth_secret,
    user_agent=EXCLUDED.user_agent,updated_at=now()
  WHERE ms_organization_shop_push_subscriptions.user_id=EXCLUDED.user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Souscription déjà associée à un autre compte.';
  END IF;
  -- Réduire le nombre de terminaux actifs par compte (les plus anciens d'abord).
  DELETE FROM public.ms_organization_shop_push_subscriptions s
  WHERE s.user_id=v_user AND s.id NOT IN (
    SELECT id FROM public.ms_organization_shop_push_subscriptions
    WHERE user_id=v_user ORDER BY updated_at DESC,id DESC LIMIT 8
  );
END;
$$;
REVOKE ALL ON FUNCTION public.ms_org_shop_push_register_v27(text,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ms_org_shop_push_register_v27(text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.ms_org_shop_push_unsubscribe_v27(p_endpoint text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Connexion requise.'; END IF;
  DELETE FROM public.ms_organization_shop_push_subscriptions
    WHERE user_id=auth.uid() AND endpoint=p_endpoint;
END;
$$;
REVOKE ALL ON FUNCTION public.ms_org_shop_push_unsubscribe_v27(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ms_org_shop_push_unsubscribe_v27(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.ms_org_shop_push_is_registered_v27(p_endpoint text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
  SELECT auth.uid() IS NOT NULL AND EXISTS(
    SELECT 1 FROM public.ms_organization_shop_push_subscriptions
    WHERE endpoint=p_endpoint AND user_id=auth.uid()
  );
$$;
REVOKE ALL ON FUNCTION public.ms_org_shop_push_is_registered_v27(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ms_org_shop_push_is_registered_v27(text) TO authenticated;

-- Après création d'une notification V26 : une livraison par appareil de chaque
-- responsable ACTIF. Les auteurs des changements de statut sont exclus.
CREATE OR REPLACE FUNCTION public.ms_org_shop_push_enqueue_v27()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  INSERT INTO public.ms_organization_shop_push_deliveries(notification_id,subscription_id)
  SELECT NEW.id,s.id
  FROM public.ms_organization_members m
  JOIN public.ms_organization_shop_push_subscriptions s ON s.user_id=m.user_id
  WHERE m.organization_id=NEW.organization_id
    AND m.status='active' AND m.role IN ('owner','admin','manager')
    AND (NEW.kind='new_request' OR m.user_id IS DISTINCT FROM NEW.actor_id)
  ON CONFLICT(notification_id,subscription_id) DO NOTHING;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.ms_org_shop_push_enqueue_v27() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS ms_org_shop_push_enqueue_v27 ON public.ms_organization_shop_notifications;
CREATE TRIGGER ms_org_shop_push_enqueue_v27
  AFTER INSERT ON public.ms_organization_shop_notifications
  FOR EACH ROW EXECUTE FUNCTION public.ms_org_shop_push_enqueue_v27();

-- RPC exclusivement service_role : aucun secret de navigateur ne traverse la RPC
-- visible d'un utilisateur connecté. Verrou de 90 secondes, concurrence évitée.
CREATE OR REPLACE FUNCTION public.ms_org_shop_push_claim_v27(p_limit integer DEFAULT 30)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_items jsonb;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service uniquement.'; END IF;
  -- Nettoyage sans impact sur l'historique V26 (seulement la file d'envoi).
  DELETE FROM public.ms_organization_shop_push_deliveries
    WHERE state IN ('sent','failed') AND created_at<now()-interval '30 days';
  -- Ne plus tenter un push à un responsable qui a perdu ses droits.
  UPDATE public.ms_organization_shop_push_deliveries d
    SET state='failed', last_error='role_revoked',locked_until=NULL
  WHERE d.state IN ('pending','sending')
    AND NOT EXISTS (
      SELECT 1 FROM public.ms_organization_shop_push_subscriptions s
      JOIN public.ms_organization_shop_notifications n ON n.id=d.notification_id
      JOIN public.ms_organization_members m ON m.organization_id=n.organization_id
        AND m.user_id=s.user_id AND m.status='active' AND m.role IN ('owner','admin','manager')
      WHERE s.id=d.subscription_id
    );
  -- Éviter le bombardement lors d'une reprise après une très longue coupure.
  UPDATE public.ms_organization_shop_push_deliveries d
    SET state='failed',last_error='expired',locked_until=NULL
  WHERE d.state IN ('pending','sending') AND d.created_at < now()-interval '72 hours';
  WITH picked AS (
    SELECT d.id
    FROM public.ms_organization_shop_push_deliveries d
    WHERE (d.state='pending' AND d.next_attempt_at<=now())
       OR (d.state='sending' AND d.locked_until<now())
    ORDER BY d.id ASC
    LIMIT least(greatest(coalesce(p_limit,30),1),60)
    FOR UPDATE SKIP LOCKED
  ), claimed AS (
    UPDATE public.ms_organization_shop_push_deliveries d
    SET state='sending',attempts=d.attempts+1,locked_until=now()+interval '90 seconds'
    FROM picked p WHERE d.id=p.id
    RETURNING d.id,d.notification_id,d.subscription_id,d.attempts
  )
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'deliveryId',c.id,'attempts',c.attempts,
    'endpoint',s.endpoint,'p256dh',s.p256dh,'auth',s.auth_secret,
    'kind',n.kind,'status',n.new_status
  )),'[]'::jsonb) INTO v_items
  FROM claimed c
  JOIN public.ms_organization_shop_push_subscriptions s ON s.id=c.subscription_id
  JOIN public.ms_organization_shop_notifications n ON n.id=c.notification_id;
  RETURN v_items;
END;
$$;
REVOKE ALL ON FUNCTION public.ms_org_shop_push_claim_v27(integer) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ms_org_shop_push_claim_v27(integer) TO service_role;

-- Le service valide chaque résultat. Pour 404/410, le terminal invalide est
-- supprimé : les livraisons correspondantes disparaissent par cascade.
CREATE OR REPLACE FUNCTION public.ms_org_shop_push_finish_v27(
  p_delivery_id bigint,p_result text,p_error text DEFAULT ''
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE v_delivery public.ms_organization_shop_push_deliveries%ROWTYPE;
BEGIN
  IF auth.role() IS DISTINCT FROM 'service_role' THEN RAISE EXCEPTION 'Service uniquement.'; END IF;
  SELECT * INTO v_delivery FROM public.ms_organization_shop_push_deliveries
    WHERE id=p_delivery_id FOR UPDATE;
  IF NOT FOUND OR v_delivery.state<>'sending' THEN RETURN; END IF;
  IF p_result='invalid' THEN
    DELETE FROM public.ms_organization_shop_push_subscriptions
      WHERE id=v_delivery.subscription_id;
  ELSIF p_result='sent' THEN
    UPDATE public.ms_organization_shop_push_deliveries
      SET state='sent',sent_at=now(),locked_until=NULL,last_error=''
      WHERE id=p_delivery_id;
  ELSIF p_result='retry' AND v_delivery.attempts<6 THEN
    UPDATE public.ms_organization_shop_push_deliveries SET
      state='pending',locked_until=NULL,
      next_attempt_at=now()+make_interval(secs=>least(30*power(2,v_delivery.attempts)::integer,3600)),
      last_error=left(coalesce(p_error,'temporary'),160)
      WHERE id=p_delivery_id;
  ELSIF p_result IN ('failed','retry') THEN
    UPDATE public.ms_organization_shop_push_deliveries
      SET state='failed',locked_until=NULL,last_error=left(coalesce(p_error,'permanent'),160)
      WHERE id=p_delivery_id;
  ELSE
    RAISE EXCEPTION 'Résultat de livraison non reconnu.';
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.ms_org_shop_push_finish_v27(bigint,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ms_org_shop_push_finish_v27(bigint,text,text) TO service_role;

COMMIT;
