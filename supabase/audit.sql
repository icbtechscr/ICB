BEGIN;
CREATE SCHEMA IF NOT EXISTS audit_private;
REVOKE ALL ON SCHEMA audit_private FROM PUBLIC, anon, authenticated, service_role;

CREATE TABLE IF NOT EXISTS public.audit_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp(),
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  actor_id text,
  actor_email text,
  source text,
  request_id text,
  before_data jsonb,
  after_data jsonb,
  details jsonb NOT NULL DEFAULT '{}'::jsonb
);
CREATE INDEX IF NOT EXISTS audit_events_created_idx ON public.audit_events(created_at DESC, id DESC);
CREATE INDEX IF NOT EXISTS audit_events_record_idx ON public.audit_events(table_name, record_id, id DESC);
CREATE INDEX IF NOT EXISTS audit_events_request_idx ON public.audit_events(request_id);
ALTER TABLE public.audit_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.audit_events FROM PUBLIC, anon, authenticated, service_role;
GRANT SELECT, INSERT ON public.audit_events TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.audit_events_id_seq TO service_role;

CREATE OR REPLACE FUNCTION audit_private.redact(value jsonb) RETURNS jsonb
LANGUAGE plpgsql IMMUTABLE SET search_path = pg_catalog AS $$
DECLARE result jsonb; item record;
BEGIN
  IF jsonb_typeof(value) = 'object' THEN
    result := '{}';
    FOR item IN SELECT key, val FROM jsonb_each(value) AS x(key,val) LOOP
      result := result || jsonb_build_object(item.key,
        CASE WHEN item.key ~* '(password|secret|token|authorization|cookie|cvv|cvc|(^|_)pan$|card|security_code|private_key|api_key|access_key)'
          THEN '"[REDACTADO]"'::jsonb ELSE audit_private.redact(item.val) END);
    END LOOP;
    RETURN result;
  ELSIF jsonb_typeof(value) = 'array' THEN
    SELECT coalesce(jsonb_agg(audit_private.redact(v)), '[]'::jsonb) INTO result FROM jsonb_array_elements(value) AS x(v);
    RETURN result;
  END IF;
  RETURN value;
END $$;

CREATE OR REPLACE FUNCTION audit_private.block_changes() RETURNS trigger
LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'El historial de auditoría no se puede editar, borrar ni vaciar.'; END $$;
DROP TRIGGER IF EXISTS audit_immutable_rows ON public.audit_events;
CREATE TRIGGER audit_immutable_rows BEFORE UPDATE OR DELETE ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION audit_private.block_changes();
DROP TRIGGER IF EXISTS audit_immutable_truncate ON public.audit_events;
CREATE TRIGGER audit_immutable_truncate BEFORE TRUNCATE ON public.audit_events
FOR EACH STATEMENT EXECUTE FUNCTION audit_private.block_changes();

CREATE OR REPLACE FUNCTION audit_private.capture() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
DECLARE old_value jsonb; new_value jsonb; h jsonb;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD IS NOT DISTINCT FROM NEW THEN RETURN NEW; END IF;
  h := CASE WHEN current_setting('role', true) = 'service_role'
    THEN coalesce(nullif(current_setting('request.headers', true), '')::jsonb, '{}'::jsonb) ELSE '{}'::jsonb END;
  IF TG_OP IN ('UPDATE','DELETE') THEN old_value := audit_private.redact(to_jsonb(OLD)); END IF;
  IF TG_OP IN ('UPDATE','INSERT') THEN new_value := audit_private.redact(to_jsonb(NEW)); END IF;
  INSERT INTO public.audit_events(action, table_name, record_id, actor_id, actor_email, source, request_id, before_data, after_data, details)
  VALUES (TG_OP, TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,
    coalesce(new_value->>'id',old_value->>'id',new_value->>'key',old_value->>'key'),
    coalesce(auth.uid()::text, nullif(h->>'x-audit-user-id','')), coalesce(auth.jwt()->>'email', nullif(h->>'x-audit-user-email','')),
    coalesce(nullif(h->>'x-audit-path',''), 'database'), h->>'x-audit-request-id', old_value,new_value,
    jsonb_build_object('transaction',txid_current()));
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION audit_private.capture_truncate() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public AS $$
BEGIN
  EXECUTE format('INSERT INTO public.audit_events(action,table_name,record_id,before_data,source,details)
    SELECT ''DELETE'', %L, coalesce(to_jsonb(t)->>''id'',to_jsonb(t)->>''key''), audit_private.redact(to_jsonb(t)), ''database'',
      jsonb_build_object(''operation'',''TRUNCATE'',''transaction'',txid_current()) FROM %I.%I t',
    TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME,TG_TABLE_SCHEMA,TG_TABLE_NAME);
  RETURN NULL;
END $$;

CREATE OR REPLACE FUNCTION audit_private.sanitize_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog AS $$
BEGIN
  NEW.before_data := audit_private.redact(NEW.before_data);
  NEW.after_data := audit_private.redact(NEW.after_data);
  NEW.details := audit_private.redact(NEW.details);
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS audit_sanitize_insert ON public.audit_events;
CREATE TRIGGER audit_sanitize_insert BEFORE INSERT ON public.audit_events
FOR EACH ROW EXECUTE FUNCTION audit_private.sanitize_event();

-- Se auditan todas las tablas existentes del negocio y los usuarios (sin credenciales).
DO $$ DECLARE t record; BEGIN
  FOR t IN SELECT schemaname,tablename FROM pg_tables WHERE (schemaname='public' AND tablename <> 'audit_events') OR (schemaname='auth' AND tablename='users') LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS audit_capture ON %I.%I',t.schemaname,t.tablename);
    EXECUTE format('CREATE TRIGGER audit_capture AFTER INSERT OR UPDATE OR DELETE ON %I.%I FOR EACH ROW EXECUTE FUNCTION audit_private.capture()',t.schemaname,t.tablename);
    EXECUTE format('DROP TRIGGER IF EXISTS audit_capture_truncate ON %I.%I',t.schemaname,t.tablename);
    EXECUTE format('CREATE TRIGGER audit_capture_truncate BEFORE TRUNCATE ON %I.%I FOR EACH STATEMENT EXECUTE FUNCTION audit_private.capture_truncate()',t.schemaname,t.tablename);
  END LOOP;
END $$;

-- Punto de partida: no inventa un historial anterior a la instalación.
INSERT INTO public.audit_events(action,table_name,record_id,after_data,source)
SELECT 'BASELINE','public.orders',id::text,audit_private.redact(to_jsonb(o)),'audit_installation' FROM public.orders o
WHERE NOT EXISTS(SELECT 1 FROM public.audit_events WHERE action='BASELINE' AND table_name='public.orders');
INSERT INTO public.audit_events(action,table_name,record_id,after_data,source)
SELECT 'BASELINE','public.order_items',id::text,audit_private.redact(to_jsonb(o)),'audit_installation' FROM public.order_items o
WHERE NOT EXISTS(SELECT 1 FROM public.audit_events WHERE action='BASELINE' AND table_name='public.order_items');
INSERT INTO public.audit_events(action,table_name,record_id,after_data,source)
SELECT 'BASELINE','public.products',id::text,audit_private.redact(to_jsonb(p)),'audit_installation' FROM public.products p
WHERE NOT EXISTS(SELECT 1 FROM public.audit_events WHERE action='BASELINE' AND table_name='public.products');
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA audit_private FROM PUBLIC, anon, authenticated, service_role;
COMMIT;
