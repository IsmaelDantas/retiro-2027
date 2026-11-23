-- =============================================
-- Retiro 2027 — Row Level Security Policies & Auditoria (LGPD)
-- Execute this AFTER schema.sql in the Supabase SQL Editor
-- =============================================

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.current_user_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role FROM public.users WHERE id = (SELECT auth.uid());
$$;

REVOKE ALL ON FUNCTION private.current_user_role() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.current_user_role() TO authenticated;

CREATE OR REPLACE FUNCTION private.guard_user_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN NEW;
  END IF;

  IF NEW.role IS DISTINCT FROM OLD.role
     AND private.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Somente administradores podem alterar perfis de acesso.';
  END IF;

  IF NEW.email IS DISTINCT FROM OLD.email
     AND private.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Somente administradores podem alterar o e-mail de perfil.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_user_role_change_trigger ON public.users;
CREATE TRIGGER guard_user_role_change_trigger
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION private.guard_user_role_change();

CREATE OR REPLACE FUNCTION private.record_audit_log()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_role TEXT;
  v_record_id TEXT;
  v_summary JSONB := '{}'::jsonb;
  v_changed_fields TEXT[];
BEGIN
  v_actor_id := auth.uid();
  IF v_actor_id IS NOT NULL THEN
    SELECT role INTO v_actor_role FROM public.users WHERE id = v_actor_id;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_record_id := NEW.id::text;
    IF TG_TABLE_NAME = 'participants' THEN
      v_summary := jsonb_build_object(
        'status', NEW.status,
        'protocol', NEW.protocol,
        'is_resident', NEW.is_resident,
        'shirt_purchased', NEW.shirt_purchased
      );
    ELSIF TG_TABLE_NAME = 'payments' THEN
      v_summary := jsonb_build_object(
        'category', NEW.category,
        'status', NEW.status,
        'shirt_size', NEW.shirt_size
      );
    ELSE
      v_summary := jsonb_build_object('op', 'created');
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    v_record_id := NEW.id::text;
    SELECT COALESCE(array_agg(n.key ORDER BY n.key), ARRAY[]::text[])
    INTO v_changed_fields
    FROM jsonb_each(to_jsonb(NEW)) n
    JOIN jsonb_each(to_jsonb(OLD)) o ON o.key = n.key
    WHERE n.value IS DISTINCT FROM o.value
      AND n.key NOT IN ('updated_at', 'cpf_hash', 'phone', 'email', 'full_name', 'notes');

    v_summary := jsonb_build_object('changed_fields', v_changed_fields);
  ELSIF TG_OP = 'DELETE' THEN
    v_record_id := OLD.id::text;
    v_summary := jsonb_build_object('op', 'deleted');
  END IF;

  INSERT INTO public.audit_logs (actor_id, actor_role, action, table_name, record_id, summary)
  VALUES (v_actor_id, v_actor_role, TG_OP, TG_TABLE_NAME, v_record_id, v_summary);

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS audit_participants_trigger ON public.participants;
CREATE TRIGGER audit_participants_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.participants
  FOR EACH ROW
  EXECUTE FUNCTION private.record_audit_log();

DROP TRIGGER IF EXISTS audit_guardians_trigger ON public.guardians;
CREATE TRIGGER audit_guardians_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.guardians
  FOR EACH ROW
  EXECUTE FUNCTION private.record_audit_log();

DROP TRIGGER IF EXISTS audit_payments_trigger ON public.payments;
CREATE TRIGGER audit_payments_trigger
  AFTER INSERT OR UPDATE OR DELETE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION private.record_audit_log();

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Users policies
-- =============================================
DROP POLICY IF EXISTS "Users can read own profile" ON public.users;
DROP POLICY IF EXISTS "Users or admins can read profiles" ON public.users;
CREATE POLICY "Users or admins can read profiles"
  ON public.users FOR SELECT TO authenticated
  USING ((SELECT auth.uid()) = id OR (SELECT private.current_user_role()) = 'admin');

DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users or admins can update profiles" ON public.users;
CREATE POLICY "Users or admins can update profiles"
  ON public.users FOR UPDATE TO authenticated
  USING ((SELECT auth.uid()) = id OR (SELECT private.current_user_role()) = 'admin')
  WITH CHECK ((SELECT auth.uid()) = id OR (SELECT private.current_user_role()) = 'admin');

-- =============================================
-- Participants policies (admin/coordinator editam; viewer apenas lê)
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can read participants" ON public.participants;
DROP POLICY IF EXISTS "Role read participants" ON public.participants;
CREATE POLICY "Role read participants"
  ON public.participants FOR SELECT TO authenticated
  USING ((SELECT private.current_user_role()) IN ('admin', 'coordinator', 'viewer'));

DROP POLICY IF EXISTS "Authenticated users can insert participants" ON public.participants;
DROP POLICY IF EXISTS "Role insert participants" ON public.participants;
CREATE POLICY "Role insert participants"
  ON public.participants FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.current_user_role()) IN ('admin', 'coordinator'));

DROP POLICY IF EXISTS "Authenticated users can update participants" ON public.participants;
DROP POLICY IF EXISTS "Role update participants" ON public.participants;
CREATE POLICY "Role update participants"
  ON public.participants FOR UPDATE TO authenticated
  USING ((SELECT private.current_user_role()) IN ('admin', 'coordinator'))
  WITH CHECK ((SELECT private.current_user_role()) IN ('admin', 'coordinator'));

DROP POLICY IF EXISTS "Authenticated users can delete participants" ON public.participants;
DROP POLICY IF EXISTS "Role delete participants" ON public.participants;
CREATE POLICY "Role delete participants"
  ON public.participants FOR DELETE TO authenticated
  USING ((SELECT private.current_user_role()) IN ('admin', 'coordinator'));

-- =============================================
-- Guardians policies
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can read guardians" ON public.guardians;
DROP POLICY IF EXISTS "Role read guardians" ON public.guardians;
CREATE POLICY "Role read guardians"
  ON public.guardians FOR SELECT TO authenticated
  USING ((SELECT private.current_user_role()) IN ('admin', 'coordinator', 'viewer'));

DROP POLICY IF EXISTS "Authenticated users can insert guardians" ON public.guardians;
DROP POLICY IF EXISTS "Role insert guardians" ON public.guardians;
CREATE POLICY "Role insert guardians"
  ON public.guardians FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.current_user_role()) IN ('admin', 'coordinator'));

DROP POLICY IF EXISTS "Authenticated users can update guardians" ON public.guardians;
DROP POLICY IF EXISTS "Role update guardians" ON public.guardians;
CREATE POLICY "Role update guardians"
  ON public.guardians FOR UPDATE TO authenticated
  USING ((SELECT private.current_user_role()) IN ('admin', 'coordinator'))
  WITH CHECK ((SELECT private.current_user_role()) IN ('admin', 'coordinator'));

DROP POLICY IF EXISTS "Authenticated users can delete guardians" ON public.guardians;
DROP POLICY IF EXISTS "Role delete guardians" ON public.guardians;
CREATE POLICY "Role delete guardians"
  ON public.guardians FOR DELETE TO authenticated
  USING ((SELECT private.current_user_role()) IN ('admin', 'coordinator'));

-- =============================================
-- Participant-Guardian junction policies
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can read participant_guardians" ON public.participant_guardians;
DROP POLICY IF EXISTS "Role read participant_guardians" ON public.participant_guardians;
CREATE POLICY "Role read participant_guardians"
  ON public.participant_guardians FOR SELECT TO authenticated
  USING ((SELECT private.current_user_role()) IN ('admin', 'coordinator', 'viewer'));

DROP POLICY IF EXISTS "Authenticated users can insert participant_guardians" ON public.participant_guardians;
DROP POLICY IF EXISTS "Role insert participant_guardians" ON public.participant_guardians;
CREATE POLICY "Role insert participant_guardians"
  ON public.participant_guardians FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.current_user_role()) IN ('admin', 'coordinator'));

DROP POLICY IF EXISTS "Authenticated users can delete participant_guardians" ON public.participant_guardians;
DROP POLICY IF EXISTS "Role delete participant_guardians" ON public.participant_guardians;
CREATE POLICY "Role delete participant_guardians"
  ON public.participant_guardians FOR DELETE TO authenticated
  USING ((SELECT private.current_user_role()) IN ('admin', 'coordinator'));

-- =============================================
-- Payments policies
-- =============================================
DROP POLICY IF EXISTS "Authenticated users can read payments" ON public.payments;
DROP POLICY IF EXISTS "Role read payments" ON public.payments;
CREATE POLICY "Role read payments"
  ON public.payments FOR SELECT TO authenticated
  USING ((SELECT private.current_user_role()) IN ('admin', 'coordinator', 'viewer'));

DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Role insert payments" ON public.payments;
CREATE POLICY "Role insert payments"
  ON public.payments FOR INSERT TO authenticated
  WITH CHECK ((SELECT private.current_user_role()) IN ('admin', 'coordinator'));

DROP POLICY IF EXISTS "Authenticated users can update payments" ON public.payments;
DROP POLICY IF EXISTS "Role update payments" ON public.payments;
CREATE POLICY "Role update payments"
  ON public.payments FOR UPDATE TO authenticated
  USING ((SELECT private.current_user_role()) IN ('admin', 'coordinator'))
  WITH CHECK ((SELECT private.current_user_role()) IN ('admin', 'coordinator'));

DROP POLICY IF EXISTS "Authenticated users can delete payments" ON public.payments;
DROP POLICY IF EXISTS "Role delete payments" ON public.payments;
CREATE POLICY "Role delete payments"
  ON public.payments FOR DELETE TO authenticated
  USING ((SELECT private.current_user_role()) IN ('admin', 'coordinator'));

-- =============================================
-- Audit logs policies (imutável)
-- =============================================
DROP POLICY IF EXISTS "Role read audit_logs" ON public.audit_logs;
CREATE POLICY "Role read audit_logs"
  ON public.audit_logs FOR SELECT TO authenticated
  USING ((SELECT private.current_user_role()) IN ('admin', 'coordinator', 'viewer'));

DROP POLICY IF EXISTS "Role insert import audit_logs" ON public.audit_logs;
CREATE POLICY "Role insert import audit_logs"
  ON public.audit_logs FOR INSERT TO authenticated
  WITH CHECK (
    (SELECT private.current_user_role()) IN ('admin', 'coordinator')
    AND action = 'IMPORT'
    AND actor_id = (SELECT auth.uid())
  );
