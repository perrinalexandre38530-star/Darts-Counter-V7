-- MSS V19 — Cartes de consommation nominatives des organisations.
-- Paiement/vente hors application : l'admin valide manuellement la remise d'une carte.
-- Le solde et l'historique sont UNIQUEMENT modifiables via RPC atomiques contrôlées.
BEGIN;

CREATE TABLE IF NOT EXISTS public.ms_org_drink_card_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ms_organizations(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 80),
  description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 300),
  paid_drinks integer NOT NULL CHECK (paid_drinks BETWEEN 1 AND 200),
  bonus_drinks integer NOT NULL DEFAULT 0 CHECK (bonus_drinks BETWEEN 0 AND 100),
  price numeric(10,2) NOT NULL CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
  icon text NOT NULL DEFAULT 'cup' CHECK (icon IN ('cup','coffee','beer','soda','water','wine','cocktail')),
  color text NOT NULL DEFAULT '#D7A34D' CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
  valid_days integer CHECK (valid_days IS NULL OR valid_days BETWEEN 1 AND 3650),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','archived')),
  created_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (paid_drinks + bonus_drinks BETWEEN 1 AND 250)
);
CREATE INDEX IF NOT EXISTS ms_org_drink_card_templates_org_idx
ON public.ms_org_drink_card_templates(organization_id,status,created_at DESC);

CREATE TABLE IF NOT EXISTS public.ms_org_drink_cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ms_organizations(id) ON DELETE CASCADE,
  template_id uuid NOT NULL REFERENCES public.ms_org_drink_card_templates(id) ON DELETE RESTRICT,
  holder_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  issued_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  template_name text NOT NULL,
  icon text NOT NULL,
  color text NOT NULL,
  paid_drinks integer NOT NULL,
  bonus_drinks integer NOT NULL,
  price numeric(10,2) NOT NULL,
  currency text NOT NULL,
  remaining integer NOT NULL CHECK (remaining >= 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled')),
  issued_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (paid_drinks + bonus_drinks BETWEEN 1 AND 250),
  CHECK (remaining <= paid_drinks + bonus_drinks)
);
CREATE INDEX IF NOT EXISTS ms_org_drink_cards_org_idx
ON public.ms_org_drink_cards(organization_id,issued_at DESC);
CREATE INDEX IF NOT EXISTS ms_org_drink_cards_holder_idx
ON public.ms_org_drink_cards(holder_user_id,organization_id,issued_at DESC);

CREATE TABLE IF NOT EXISTS public.ms_org_drink_card_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.ms_organizations(id) ON DELETE CASCADE,
  card_id uuid NOT NULL REFERENCES public.ms_org_drink_cards(id) ON DELETE RESTRICT,
  actor_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  action text NOT NULL CHECK (action IN ('consume','undo')),
  delta integer NOT NULL CHECK (delta IN (-1,1)),
  reverses_event_id uuid UNIQUE REFERENCES public.ms_org_drink_card_events(id) ON DELETE RESTRICT,
  remaining_after integer NOT NULL CHECK (remaining_after >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK ((action = 'consume' AND delta = -1 AND reverses_event_id IS NULL)
      OR (action = 'undo' AND delta = 1 AND reverses_event_id IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS ms_org_drink_events_card_idx
ON public.ms_org_drink_card_events(card_id,created_at DESC);

ALTER TABLE public.ms_org_drink_card_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ms_org_drink_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ms_org_drink_card_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ms_org_drink_templates_read ON public.ms_org_drink_card_templates;
CREATE POLICY ms_org_drink_templates_read ON public.ms_org_drink_card_templates
FOR SELECT TO authenticated USING (
  public.ms_org_is_member(organization_id)
  AND (status='active' OR public.ms_org_has_role(organization_id,ARRAY['owner','admin','manager']))
);
DROP POLICY IF EXISTS ms_org_drink_templates_insert ON public.ms_org_drink_card_templates;
CREATE POLICY ms_org_drink_templates_insert ON public.ms_org_drink_card_templates
FOR INSERT TO authenticated WITH CHECK (
  public.ms_org_has_role(organization_id,ARRAY['owner','admin','manager']) AND created_by=auth.uid()
);
DROP POLICY IF EXISTS ms_org_drink_templates_update ON public.ms_org_drink_card_templates;
CREATE POLICY ms_org_drink_templates_update ON public.ms_org_drink_card_templates
FOR UPDATE TO authenticated USING (public.ms_org_has_role(organization_id,ARRAY['owner','admin','manager']))
WITH CHECK (public.ms_org_has_role(organization_id,ARRAY['owner','admin','manager']));

DROP POLICY IF EXISTS ms_org_drink_cards_read ON public.ms_org_drink_cards;
CREATE POLICY ms_org_drink_cards_read ON public.ms_org_drink_cards
FOR SELECT TO authenticated USING (
  public.ms_org_is_member(organization_id)
  AND (holder_user_id=auth.uid() OR public.ms_org_has_role(organization_id,ARRAY['owner','admin','manager']))
);
DROP POLICY IF EXISTS ms_org_drink_events_read ON public.ms_org_drink_card_events;
CREATE POLICY ms_org_drink_events_read ON public.ms_org_drink_card_events
FOR SELECT TO authenticated USING (
  public.ms_org_is_member(organization_id)
  AND (public.ms_org_has_role(organization_id,ARRAY['owner','admin','manager']) OR EXISTS (
    SELECT 1 FROM public.ms_org_drink_cards c
    WHERE c.id=ms_org_drink_card_events.card_id AND c.organization_id=ms_org_drink_card_events.organization_id AND c.holder_user_id=auth.uid()
  ))
);

REVOKE ALL ON public.ms_org_drink_card_templates FROM anon,authenticated;
REVOKE ALL ON public.ms_org_drink_cards FROM anon,authenticated;
REVOKE ALL ON public.ms_org_drink_card_events FROM anon,authenticated;
GRANT SELECT ON public.ms_org_drink_card_templates,public.ms_org_drink_cards,public.ms_org_drink_card_events TO authenticated;
GRANT INSERT (organization_id,name,description,paid_drinks,bonus_drinks,price,currency,icon,color,valid_days,status)
ON public.ms_org_drink_card_templates TO authenticated;
GRANT UPDATE (name,description,paid_drinks,bonus_drinks,price,currency,icon,color,valid_days,status)
ON public.ms_org_drink_card_templates TO authenticated;
-- AUCUN INSERT/UPDATE/DELETE client sur les cartes attribuées ou leurs consommations.

CREATE OR REPLACE FUNCTION public.ms_org_drink_card_template_updated()
RETURNS trigger LANGUAGE plpgsql SET search_path=public AS $$
BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS ms_org_drink_template_updated ON public.ms_org_drink_card_templates;
CREATE TRIGGER ms_org_drink_template_updated BEFORE UPDATE ON public.ms_org_drink_card_templates
FOR EACH ROW EXECUTE FUNCTION public.ms_org_drink_card_template_updated();

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
    template_name,icon,color,paid_drinks,bonus_drinks,price,currency,remaining,expires_at)
  VALUES (p_org_id,t.id,p_holder_user_id,auth.uid(),t.name,t.icon,t.color,t.paid_drinks,
    t.bonus_drinks,t.price,t.currency,t.paid_drinks+t.bonus_drinks,
    CASE WHEN t.valid_days IS NOT NULL THEN now()+make_interval(days=>t.valid_days) ELSE NULL END)
  RETURNING id INTO v_id;
  RETURN v_id;
END; $$;

CREATE OR REPLACE FUNCTION public.ms_org_drink_card_consume(p_org_id uuid,p_card_id uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE c public.ms_org_drink_cards%rowtype; v_remaining integer;
BEGIN
  IF auth.uid() IS NULL OR NOT public.ms_org_is_member(p_org_id)
  THEN RAISE EXCEPTION 'DRINK_CARD_NOT_MEMBER'; END IF;
  SELECT * INTO c FROM public.ms_org_drink_cards WHERE id=p_card_id AND organization_id=p_org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DRINK_CARD_NOT_FOUND'; END IF;
  IF c.holder_user_id<>auth.uid() AND NOT public.ms_org_has_role(p_org_id,ARRAY['owner','admin','manager'])
  THEN RAISE EXCEPTION 'DRINK_CARD_FORBIDDEN'; END IF;
  IF c.status<>'active' THEN RAISE EXCEPTION 'DRINK_CARD_CANCELLED'; END IF;
  IF c.expires_at IS NOT NULL AND c.expires_at<=now() THEN RAISE EXCEPTION 'DRINK_CARD_EXPIRED'; END IF;
  IF c.remaining<1 THEN RAISE EXCEPTION 'DRINK_CARD_EMPTY'; END IF;
  v_remaining := c.remaining-1;
  UPDATE public.ms_org_drink_cards SET remaining=v_remaining,updated_at=now() WHERE id=c.id;
  INSERT INTO public.ms_org_drink_card_events(organization_id,card_id,actor_user_id,action,delta,remaining_after)
  VALUES (p_org_id,c.id,auth.uid(),'consume',-1,v_remaining);
  RETURN v_remaining;
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
  SELECT * INTO c FROM public.ms_org_drink_cards
    WHERE id=e.card_id AND organization_id=p_org_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'DRINK_CARD_NOT_FOUND'; END IF;
  IF EXISTS (SELECT 1 FROM public.ms_org_drink_card_events u WHERE u.reverses_event_id=e.id)
  THEN RAISE EXCEPTION 'DRINK_CARD_ALREADY_UNDONE'; END IF;
  IF c.remaining>=c.paid_drinks+c.bonus_drinks THEN RAISE EXCEPTION 'DRINK_CARD_ALREADY_FULL'; END IF;
  v_remaining := c.remaining+1;
  UPDATE public.ms_org_drink_cards SET remaining=v_remaining,updated_at=now() WHERE id=c.id;
  INSERT INTO public.ms_org_drink_card_events(organization_id,card_id,actor_user_id,action,delta,reverses_event_id,remaining_after)
  VALUES(p_org_id,c.id,auth.uid(),'undo',1,e.id,v_remaining);
  RETURN v_remaining;
END; $$;

CREATE OR REPLACE FUNCTION public.ms_org_drink_card_cancel(p_org_id uuid,p_card_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,auth,pg_temp AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT public.ms_org_has_role(p_org_id,ARRAY['owner','admin'])
  THEN RAISE EXCEPTION 'DRINK_CARD_NOT_ADMIN'; END IF;
  UPDATE public.ms_org_drink_cards SET status='cancelled',updated_at=now()
  WHERE id=p_card_id AND organization_id=p_org_id AND status='active' RETURNING id INTO v_id;
  IF v_id IS NULL THEN RAISE EXCEPTION 'DRINK_CARD_NOT_ACTIVE'; END IF;
  RETURN true;
END; $$;

REVOKE ALL ON FUNCTION public.ms_org_drink_card_issue(uuid,uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.ms_org_drink_card_consume(uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.ms_org_drink_card_undo(uuid,uuid) FROM PUBLIC,anon;
REVOKE ALL ON FUNCTION public.ms_org_drink_card_cancel(uuid,uuid) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.ms_org_drink_card_issue(uuid,uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ms_org_drink_card_consume(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ms_org_drink_card_undo(uuid,uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ms_org_drink_card_cancel(uuid,uuid) TO authenticated;
COMMIT;
