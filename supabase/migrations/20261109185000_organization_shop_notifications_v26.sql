-- MULTISPORTS SCORING V26 — Centre de notifications de la boutique du club.
-- Dépend des migrations V23, V24 et V25 déjà présentes dans la base V108(5).
-- Notifications internes sans coordonnées personnelles, ni notes / paiements.
-- Pas d'envoi de courriel, de push serveur ou de nouveaux droits sur les cartes Buvette.
BEGIN;

CREATE TABLE IF NOT EXISTS public.ms_organization_shop_notifications (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES public.ms_organizations(id) ON DELETE CASCADE,
  request_id uuid NOT NULL REFERENCES public.ms_organization_shop_requests(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('new_request','status_changed')),
  item_title text NOT NULL,
  new_status text NOT NULL CHECK (new_status IN ('pending','accepted','ready','completed','rejected','cancelled')),
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS ms_org_shop_notifications_by_club_v26
  ON public.ms_organization_shop_notifications(organization_id,id DESC);
ALTER TABLE public.ms_organization_shop_notifications ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ms_organization_shop_notifications FROM PUBLIC,anon,authenticated;

-- Curseur de lecture PROPRE À CHAQUE RESPONSABLE : un admin ne marque pas les
-- notifications comme lues pour ses collègues, même sur un autre appareil.
CREATE TABLE IF NOT EXISTS public.ms_organization_shop_notification_cursors (
  organization_id uuid NOT NULL REFERENCES public.ms_organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_read_id bigint NOT NULL DEFAULT 0 CHECK (last_read_id>=0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id,user_id)
);
ALTER TABLE public.ms_organization_shop_notification_cursors ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.ms_organization_shop_notification_cursors FROM PUBLIC,anon,authenticated;

-- Une notification est émise à la création et à chaque véritable changement de
-- statut. L'édition d'une note interne ou l'anonymisation n'en crée jamais.
CREATE OR REPLACE FUNCTION public.ms_org_shop_emit_notification_v26()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,pg_temp AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.ms_organization_shop_notifications
      (organization_id,request_id,kind,item_title,new_status,actor_id)
    VALUES (NEW.organization_id,NEW.id,'new_request',NEW.item_title,NEW.status,auth.uid());
  ELSIF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.ms_organization_shop_notifications
      (organization_id,request_id,kind,item_title,new_status,actor_id)
    VALUES (NEW.organization_id,NEW.id,'status_changed',NEW.item_title,NEW.status,auth.uid());
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.ms_org_shop_emit_notification_v26() FROM PUBLIC,anon,authenticated;
DROP TRIGGER IF EXISTS ms_org_shop_new_notification_v26 ON public.ms_organization_shop_requests;
CREATE TRIGGER ms_org_shop_new_notification_v26
  AFTER INSERT ON public.ms_organization_shop_requests
  FOR EACH ROW EXECUTE FUNCTION public.ms_org_shop_emit_notification_v26();
DROP TRIGGER IF EXISTS ms_org_shop_status_notification_v26 ON public.ms_organization_shop_requests;
CREATE TRIGGER ms_org_shop_status_notification_v26
  AFTER UPDATE OF status ON public.ms_organization_shop_requests
  FOR EACH ROW WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION public.ms_org_shop_emit_notification_v26();

-- Uniquement pour un responsable authentifié du club. Aucun SELECT brut exposé
-- et aucune identité de client retournée à la boîte de notifications.
CREATE OR REPLACE FUNCTION public.ms_org_shop_list_notifications_v26(p_organization_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_read_id bigint := 0;
  v_unread bigint := 0;
  v_rows jsonb := '[]'::jsonb;
BEGIN
  IF v_user IS NULL OR p_organization_id IS NULL
    OR NOT public.ms_org_has_role(p_organization_id,ARRAY['owner','admin','manager']) THEN
    RAISE EXCEPTION 'Accès aux notifications refusé.';
  END IF;
  SELECT last_read_id INTO v_read_id
    FROM public.ms_organization_shop_notification_cursors
    WHERE organization_id=p_organization_id AND user_id=v_user;
  v_read_id := coalesce(v_read_id,0);
  SELECT count(*) INTO v_unread
    FROM public.ms_organization_shop_notifications n
    WHERE n.organization_id=p_organization_id AND n.id>v_read_id
      AND (n.kind='new_request' OR n.actor_id IS DISTINCT FROM v_user);
  SELECT coalesce(jsonb_agg(jsonb_build_object(
    'id',n.id,'requestId',n.request_id,'kind',n.kind,
    'itemTitle',n.item_title,'status',n.new_status,
    'createdAt',n.created_at,'isRead',n.id<=v_read_id
  ) ORDER BY n.id DESC),'[]'::jsonb) INTO v_rows
  FROM (
    SELECT id,request_id,kind,item_title,new_status,created_at
    FROM public.ms_organization_shop_notifications
    WHERE organization_id=p_organization_id AND (kind='new_request' OR actor_id IS DISTINCT FROM v_user)
    ORDER BY id DESC LIMIT 60
  ) n;
  RETURN jsonb_build_object('unreadCount',v_unread,'lastReadId',v_read_id,'items',v_rows);
END;
$$;
REVOKE ALL ON FUNCTION public.ms_org_shop_list_notifications_v26(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ms_org_shop_list_notifications_v26(uuid) TO authenticated;

-- Bouton « Marquer toutes comme lues » ; ID serveur plafonné au dernier du club.
-- N'autorise jamais un utilisateur à modifier le curseur d'un autre responsable.
CREATE OR REPLACE FUNCTION public.ms_org_shop_mark_notifications_read_v26(
  p_organization_id uuid,p_last_id bigint
) RETURNS void LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=public,pg_temp AS $$
DECLARE
  v_user uuid := auth.uid();
  v_max bigint;
BEGIN
  IF v_user IS NULL OR p_organization_id IS NULL OR p_last_id IS NULL OR p_last_id<0
    OR NOT public.ms_org_has_role(p_organization_id,ARRAY['owner','admin','manager']) THEN
    RAISE EXCEPTION 'Accès aux notifications refusé.';
  END IF;
  SELECT max(id) INTO v_max FROM public.ms_organization_shop_notifications
    WHERE organization_id=p_organization_id;
  IF v_max IS NULL THEN RETURN; END IF;
  INSERT INTO public.ms_organization_shop_notification_cursors
    (organization_id,user_id,last_read_id)
  VALUES (p_organization_id,v_user,least(p_last_id,v_max))
  ON CONFLICT (organization_id,user_id) DO UPDATE SET
    last_read_id=greatest(ms_organization_shop_notification_cursors.last_read_id,EXCLUDED.last_read_id),
    updated_at=now();
END;
$$;
REVOKE ALL ON FUNCTION public.ms_org_shop_mark_notifications_read_v26(uuid,bigint) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.ms_org_shop_mark_notifications_read_v26(uuid,bigint) TO authenticated;
COMMIT;
