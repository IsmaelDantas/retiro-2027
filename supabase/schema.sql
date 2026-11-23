-- =============================================
-- Retiro 2027 — Database Schema (Atualizado AE IV)
-- Execute this in the Supabase SQL Editor
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Users profile table (linked to Supabase Auth)
-- =============================================
CREATE TABLE IF NOT EXISTS public.users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer'
    CHECK (role IN ('admin', 'coordinator', 'viewer')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Participants
-- =============================================
CREATE TABLE IF NOT EXISTS public.participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol TEXT,
  cpf_hash TEXT,
  full_name TEXT NOT NULL,
  birth_date DATE,
  phone TEXT,
  email TEXT,
  congregation TEXT,
  locality TEXT,
  is_resident BOOLEAN,
  registered_at TIMESTAMPTZ,
  shirt_purchased BOOLEAN NOT NULL DEFAULT false,
  shirt_size TEXT
    CHECK (shirt_size IS NULL OR shirt_size IN ('PP', 'P', 'M', 'G', 'GG', 'XG')),
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Guardians (Responsáveis)
-- =============================================
CREATE TABLE IF NOT EXISTS public.guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Participant <-> Guardian junction table
-- =============================================
CREATE TABLE IF NOT EXISTS public.participant_guardians (
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  PRIMARY KEY (participant_id, guardian_id)
);

-- =============================================
-- Payments (Compatibilidade v1.0.0 / Registros extras)
-- =============================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL REFERENCES public.participants(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT 'shirt'
    CHECK (category IN ('shirt', 'registration', 'other')),
  description TEXT,
  shirt_size TEXT
    CHECK (shirt_size IS NULL OR shirt_size IN ('PP', 'P', 'M', 'G', 'GG', 'XG')),
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (status IN ('unpaid', 'partial', 'paid')),
  payment_method TEXT
    CHECK (payment_method IS NULL OR payment_method IN ('pix', 'cash', 'card', 'transfer')),
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Audit Logs (Imutável — sem PII em claro)
-- =============================================
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  actor_role TEXT,
  action TEXT NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE', 'IMPORT')),
  table_name TEXT NOT NULL,
  record_id TEXT,
  summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =============================================
-- Indexes for performance & uniqueness
-- =============================================
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_protocol_unique
  ON public.participants(protocol) WHERE protocol IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_participants_cpf_hash_unique
  ON public.participants(cpf_hash) WHERE cpf_hash IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_participants_status ON public.participants(status);
CREATE INDEX IF NOT EXISTS idx_participants_full_name ON public.participants(full_name);
CREATE INDEX IF NOT EXISTS idx_participants_congregation ON public.participants(congregation);
CREATE INDEX IF NOT EXISTS idx_participants_is_resident ON public.participants(is_resident);
CREATE INDEX IF NOT EXISTS idx_participants_created_at ON public.participants(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_guardians_full_name ON public.guardians(full_name);
CREATE INDEX IF NOT EXISTS idx_participant_guardians_guardian_id ON public.participant_guardians(guardian_id);
CREATE INDEX IF NOT EXISTS idx_payments_participant_id ON public.payments(participant_id);
CREATE INDEX IF NOT EXISTS idx_payments_category ON public.payments(category);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_shirt_size ON public.payments(shirt_size);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON public.audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_table_name ON public.audit_logs(table_name);

-- =============================================
-- Auto-update updated_at trigger
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS update_participants_updated_at ON public.participants;
CREATE TRIGGER update_participants_updated_at
  BEFORE UPDATE ON public.participants
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_guardians_updated_at ON public.guardians;
CREATE TRIGGER update_guardians_updated_at
  BEFORE UPDATE ON public.guardians
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
