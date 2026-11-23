-- ============================================================================
-- Retiro 2027 — Fase 8: Contas por Nome de Usuário e Gestão Hierárquica
-- Idempotente: segura para aplicar em bancos Demo e Produção.
-- ============================================================================

-- 1. Coluna username em public.users para login simplificado sem exigir e-mail real
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS username TEXT;

UPDATE public.users
SET username = lower(regexp_replace(split_part(email, '@', 1), '[^a-zA-Z0-9._-]+', '.', 'g'))
WHERE username IS NULL
  AND email LIKE '%@retiro2027.app';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_username_format_check;

ALTER TABLE public.users
  ADD CONSTRAINT users_username_format_check
  CHECK (
    username IS NULL
    OR username ~ '^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$'
  );

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username_unique
  ON public.users (lower(username))
  WHERE username IS NOT NULL;

-- 2. Endurece trigger anti-escalação para proteger role, email e username
CREATE OR REPLACE FUNCTION private.guard_user_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
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

  IF NEW.username IS DISTINCT FROM OLD.username
     AND private.current_user_role() IS DISTINCT FROM 'admin' THEN
    RAISE EXCEPTION 'Somente administradores podem alterar o nome de usuário.';
  END IF;

  RETURN NEW;
END;
$$;

-- 3. RLS de leitura em public.users: admin e coordinator podem listar a equipe;
--    viewer (Supervisor) continua lendo apenas o próprio perfil.
DROP POLICY IF EXISTS "Users or admins can read profiles" ON public.users;
DROP POLICY IF EXISTS "Users, coordinators, or admins can read profiles" ON public.users;
CREATE POLICY "Users, coordinators, or admins can read profiles"
  ON public.users FOR SELECT TO authenticated
  USING (
    (SELECT auth.uid()) = id
    OR (SELECT private.current_user_role()) IN ('admin', 'coordinator')
  );
