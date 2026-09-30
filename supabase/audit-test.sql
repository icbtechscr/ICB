\set ON_ERROR_STOP on
BEGIN;
CREATE TABLE public.audit_probe (id integer PRIMARY KEY, value jsonb);
CREATE TRIGGER audit_capture AFTER INSERT OR UPDATE OR DELETE ON public.audit_probe
FOR EACH ROW EXECUTE FUNCTION audit_private.capture();
CREATE TRIGGER audit_capture_truncate BEFORE TRUNCATE ON public.audit_probe
FOR EACH STATEMENT EXECUTE FUNCTION audit_private.capture_truncate();
INSERT INTO public.audit_probe VALUES (1,'{"name":"original","nested":{"password":"must-not-be-stored"}}');
UPDATE public.audit_probe SET value='{"name":"changed"}' WHERE id=1;
DELETE FROM public.audit_probe WHERE id=1;
INSERT INTO public.audit_probe VALUES (2,'{"name":"truncated"}');
TRUNCATE public.audit_probe;
DO $$
DECLARE blocked boolean := false;
BEGIN
  IF (SELECT count(*) FROM public.audit_events WHERE table_name='public.audit_probe') <> 5 THEN RAISE EXCEPTION 'Missing row audit events'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.audit_events WHERE table_name='public.audit_probe' AND action='UPDATE' AND before_data->'value'->>'name'='original' AND after_data->'value'->>'name'='changed') THEN RAISE EXCEPTION 'Missing before/after'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.audit_events WHERE table_name='public.audit_probe' AND action='INSERT' AND after_data->'value'->'nested'->>'password'='[REDACTADO]') THEN RAISE EXCEPTION 'Password not redacted'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.audit_events WHERE table_name='public.audit_probe' AND action='DELETE' AND details->>'operation'='TRUNCATE') THEN RAISE EXCEPTION 'Missing truncate snapshot'; END IF;
  BEGIN UPDATE public.audit_events SET source='tampered' WHERE table_name='public.audit_probe'; EXCEPTION WHEN raise_exception THEN blocked := true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Update not blocked'; END IF;
  blocked := false;
  BEGIN DELETE FROM public.audit_events WHERE table_name='public.audit_probe'; EXCEPTION WHEN raise_exception THEN blocked := true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Delete not blocked'; END IF;
  blocked := false;
  BEGIN TRUNCATE public.audit_events; EXCEPTION WHEN raise_exception THEN blocked := true; END;
  IF NOT blocked THEN RAISE EXCEPTION 'Truncate not blocked'; END IF;
  IF has_table_privilege('service_role','public.audit_events','UPDATE,DELETE,TRUNCATE') THEN RAISE EXCEPTION 'Service role can change audit'; END IF;
  IF has_table_privilege('anon','public.audit_events','SELECT') OR has_table_privilege('authenticated','public.audit_events','SELECT') THEN RAISE EXCEPTION 'Non-admin can read audit'; END IF;
  RAISE NOTICE 'PASS: snapshots, redaction, truncate capture, immutability and role permissions';
END $$;
GRANT SELECT, INSERT ON public.audit_probe TO service_role;
SET LOCAL ROLE service_role;
SET LOCAL request.headers = '{"x-audit-user-id":"audit-test-user","x-audit-user-email":"audit-test@example.invalid","x-audit-path":"/api/admin/audit-test","x-audit-request-id":"audit-test-request"}';
INSERT INTO public.audit_probe VALUES (3,'{"name":"attributed"}');
INSERT INTO public.audit_events(action,table_name,details) VALUES ('TEST','test','{"secret":"must-not-be-stored"}');
DO $$ BEGIN
  IF NOT EXISTS(SELECT 1 FROM public.audit_events WHERE action='TEST' AND table_name='test' AND details->>'secret'='[REDACTADO]') THEN RAISE EXCEPTION 'Service insert sanitization failed'; END IF;
  IF NOT EXISTS(SELECT 1 FROM public.audit_events WHERE table_name='public.audit_probe' AND record_id='3' AND actor_id='audit-test-user' AND source='/api/admin/audit-test' AND request_id='audit-test-request') THEN RAISE EXCEPTION 'Verified service context missing'; END IF;
  RAISE NOTICE 'PASS: service role insert and automatic sanitization';
END $$;
RESET ROLE;
ROLLBACK;
