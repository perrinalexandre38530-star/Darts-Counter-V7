-- MSS V20 · Personnalisation visuelle des cartes buvette.
-- Rétrocompatible avec V19, préserve toutes les cartes et consommations existantes.
BEGIN;
ALTER TABLE public.ms_org_drink_card_templates
  ADD COLUMN IF NOT EXISTS background_key text NOT NULL DEFAULT 'graphite',
  ADD COLUMN IF NOT EXISTS background_url text NOT NULL DEFAULT '';
ALTER TABLE public.ms_org_drink_cards
  ADD COLUMN IF NOT EXISTS background_key text NOT NULL DEFAULT 'graphite',
  ADD COLUMN IF NOT EXISTS background_url text NOT NULL DEFAULT '';
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ms_org_drink_templates_background_key_chk') THEN
    ALTER TABLE public.ms_org_drink_card_templates ADD CONSTRAINT ms_org_drink_templates_background_key_chk
      CHECK (background_key IN ('bar-night','graphite','wood','gold','clean','custom'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ms_org_drink_cards_background_key_chk') THEN
    ALTER TABLE public.ms_org_drink_cards ADD CONSTRAINT ms_org_drink_cards_background_key_chk
      CHECK (background_key IN ('bar-night','graphite','wood','gold','clean','custom'));
  END IF;
END $$;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ms_org_drink_templates_background_url_chk') THEN
    ALTER TABLE public.ms_org_drink_card_templates ADD CONSTRAINT ms_org_drink_templates_background_url_chk
      CHECK (length(background_url)<=1200 AND (background_url='' OR background_url ~* '^https://'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ms_org_drink_cards_background_url_chk') THEN
    ALTER TABLE public.ms_org_drink_cards ADD CONSTRAINT ms_org_drink_cards_background_url_chk
      CHECK (length(background_url)<=1200 AND (background_url='' OR background_url ~* '^https://'));
  END IF;
END $$;
-- Les adhérents ne peuvent jamais modifier une carte attribuée ou son solde.
GRANT INSERT (background_key,background_url) ON public.ms_org_drink_card_templates TO authenticated;
GRANT UPDATE (background_key,background_url) ON public.ms_org_drink_card_templates TO authenticated;
-- Chaque case possède désormais une identité : une restitution vise la case réellement cochée.
ALTER TABLE public.ms_org_drink_cards ADD COLUMN IF NOT EXISTS used_slots integer[] NOT NULL DEFAULT '{}'::integer[];
ALTER TABLE public.ms_org_drink_card_events ADD COLUMN IF NOT EXISTS slot_index integer;
-- V19 n'enregistrait que les soldes : attribution déterministe des emplacements aux événements non corrigés.
WITH old_live AS (
  SELECT e.id, ROW_NUMBER() OVER (PARTITION BY e.card_id ORDER BY e.created_at, e.id)::integer AS slot_number
  FROM public.ms_org_drink_card_events e
  WHERE e.action='consume' AND e.slot_index IS NULL
    AND NOT EXISTS (SELECT 1 FROM public.ms_org_drink_card_events u WHERE u.reverses_event_id=e.id)
)
UPDATE public.ms_org_drink_card_events e SET slot_index=l.slot_number
FROM old_live l WHERE e.id=l.id;
UPDATE public.ms_org_drink_cards c SET used_slots = COALESCE((
  SELECT array_agg(slot_index ORDER BY slot_index)
  FROM public.ms_org_drink_card_events e
  WHERE e.card_id=c.id AND e.action='consume' AND e.slot_index IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM public.ms_org_drink_card_events u WHERE u.reverses_event_id=e.id)
), '{}'::integer[]);
CREATE OR REPLACE FUNCTION public.ms_org_drink_card_issue(p_org_id uuid,p_template_id uuid,p_holder_user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE t public.ms_org_drink_card_templates%rowtype; v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.ms_org_has_role(p_org_id,ARRAY['owner','admin','manager'])
  THEN RAISE EXCEPTION 'DRINK_CARD_NOT_ADMIN'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.ms_organization_members m
    WHERE m.organization_id=p_org_id AND m.user_id=p_holder_user_id AND m.status='active')
  THEN RAISE EXCEPTION 'DRINK_CARD_HOLDER_NOT_MEMBER'; END IF;
  SELECT * INTO t FROM public.ms_org_drink_card_templates
  WHERE id=p_template_id AND organization_id=p_org_id AND status='active' FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DRINK_CARD_TEMPLATE_UNAVAILABLE'; END IF;
  INSERT INTO public.ms_org_drink_cards (organization_id,template_id,holder_user_id,issued_by,
    template_name,icon,color,background_key,background_url,paid_drinks,bonus_drinks,price,currency,remaining,expires_at)
  VALUES (p_org_id,t.id,p_holder_user_id,auth.uid(),t.name,t.icon,t.color,t.background_key,t.background_url,t.paid_drinks,
    t.bonus_drinks,t.price,t.currency,t.paid_drinks+t.bonus_drinks,
    CASE WHEN t.valid_days IS NOT NULL THEN now()+make_interval(days=>t.valid_days) ELSE NULL END)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;


-- La ligne de carte est verrouillée pendant chaque consommation / annulation.
CREATE OR REPLACE FUNCTION public.ms_org_drink_card_stamp(p_org_id uuid,p_card_id uuid,p_slot_index integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE c public.ms_org_drink_cards%rowtype; v_remaining integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.ms_org_is_member(p_org_id) THEN RAISE EXCEPTION 'DRINK_CARD_NOT_MEMBER'; END IF;
  SELECT * INTO c FROM public.ms_org_drink_cards WHERE id=p_card_id AND organization_id=p_org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DRINK_CARD_NOT_FOUND'; END IF;
  IF c.holder_user_id<>auth.uid() AND NOT public.ms_org_has_role(p_org_id,ARRAY['owner','admin','manager'])
  THEN RAISE EXCEPTION 'DRINK_CARD_FORBIDDEN'; END IF;
  IF c.status<>'active' THEN RAISE EXCEPTION 'DRINK_CARD_CANCELLED'; END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at<=now() THEN RAISE EXCEPTION 'DRINK_CARD_EXPIRED'; END IF;
  IF c.remaining<1 THEN RAISE EXCEPTION 'DRINK_CARD_EMPTY'; END IF;
  IF p_slot_index IS NULL OR p_slot_index<1 OR p_slot_index>(c.paid_drinks+c.bonus_drinks)
  THEN RAISE EXCEPTION 'DRINK_CARD_SLOT_INVALID'; END IF;
  IF p_slot_index=ANY(c.used_slots) THEN RAISE EXCEPTION 'DRINK_CARD_SLOT_USED'; END IF;
  v_remaining:=c.remaining-1;
  UPDATE public.ms_org_drink_cards SET remaining=v_remaining, used_slots=array_append(c.used_slots,p_slot_index),updated_at=now() WHERE id=c.id;
  INSERT INTO public.ms_org_drink_card_events(organization_id,card_id,actor_user_id,action,delta,remaining_after,slot_index)
  VALUES(p_org_id,c.id,auth.uid(),'consume',-1,v_remaining,p_slot_index);
  RETURN v_remaining;
END; $$;

-- L'ancienne méthode V19 reste compatible avec les clients pas encore mis à jour.
CREATE OR REPLACE FUNCTION public.ms_org_drink_card_consume(p_org_id uuid,p_card_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE c public.ms_org_drink_cards%rowtype; v_slot integer;
BEGIN
  SELECT * INTO c FROM public.ms_org_drink_cards WHERE id=p_card_id AND organization_id=p_org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DRINK_CARD_NOT_FOUND'; END IF;
  SELECT candidate.slot INTO v_slot FROM generate_series(1,c.paid_drinks+c.bonus_drinks) AS candidate(slot)
    WHERE NOT (candidate.slot=ANY(c.used_slots)) ORDER BY candidate.slot LIMIT 1;
  IF v_slot IS NULL THEN RAISE EXCEPTION 'DRINK_CARD_EMPTY'; END IF;
  RETURN public.ms_org_drink_card_stamp(p_org_id,p_card_id,v_slot);
END; $$;

CREATE OR REPLACE FUNCTION public.ms_org_drink_card_undo(p_org_id uuid,p_event_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE e public.ms_org_drink_card_events%rowtype; c public.ms_org_drink_cards%rowtype; v_remaining integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.ms_org_has_role(p_org_id,ARRAY['owner','admin'])
  THEN RAISE EXCEPTION 'DRINK_CARD_NOT_ADMIN'; END IF;
  SELECT * INTO e FROM public.ms_org_drink_card_events
    WHERE id=p_event_id AND organization_id=p_org_id AND action='consume';
  IF NOT FOUND THEN RAISE EXCEPTION 'DRINK_CARD_EVENT_NOT_FOUND'; END IF;
  SELECT * INTO c FROM public.ms_org_drink_cards WHERE id=e.card_id AND organization_id=p_org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DRINK_CARD_NOT_FOUND'; END IF;
  IF EXISTS(SELECT 1 FROM public.ms_org_drink_card_events u WHERE u.reverses_event_id=e.id)
  THEN RAISE EXCEPTION 'DRINK_CARD_ALREADY_UNDONE'; END IF;
  IF c.remaining>=c.paid_drinks+c.bonus_drinks THEN RAISE EXCEPTION 'DRINK_CARD_ALREADY_FULL'; END IF;
  IF e.slot_index IS NULL OR NOT (e.slot_index=ANY(c.used_slots))
  THEN RAISE EXCEPTION 'DRINK_CARD_ALREADY_UNDONE'; END IF;
  v_remaining:=c.remaining+1;
  UPDATE public.ms_org_drink_cards SET remaining=v_remaining,used_slots=array_remove(c.used_slots,e.slot_index),updated_at=now() WHERE id=c.id;
  INSERT INTO public.ms_org_drink_card_events(organization_id,card_id,actor_user_id,action,delta,reverses_event_id,remaining_after,slot_index)
  VALUES(p_org_id,c.id,auth.uid(),'undo',1,e.id,v_remaining,e.slot_index);
  RETURN v_remaining;
END; $$;

REVOKE ALL ON FUNCTION public.ms_org_drink_card_issue(uuid,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.ms_org_drink_card_stamp(uuid,uuid,integer) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.ms_org_drink_card_consume(uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.ms_org_drink_card_undo(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ms_org_drink_card_issue(uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ms_org_drink_card_stamp(uuid,uuid,integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ms_org_drink_card_consume(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ms_org_drink_card_undo(uuid,uuid) TO authenticated;
COMMIT;
