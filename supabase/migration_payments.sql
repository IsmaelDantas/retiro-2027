-- =============================================
-- Retiro 2027 — Migration: Controle de Pagamentos e Blusas
-- Execute este script no SQL Editor do Supabase
-- =============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =============================================
-- Tabela de Pagamentos (Blusas, Inscrições e Outros)
-- =============================================
CREATE TABLE IF NOT EXISTS public.payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
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
-- Índices para performance
-- =============================================
CREATE INDEX IF NOT EXISTS idx_payments_participant_id ON public.payments(participant_id);
CREATE INDEX IF NOT EXISTS idx_payments_category ON public.payments(category);
CREATE INDEX IF NOT EXISTS idx_payments_status ON public.payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_shirt_size ON public.payments(shirt_size);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON public.payments(created_at DESC);

-- =============================================
-- Trigger de atualização automática de updated_at
-- =============================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_payments_updated_at ON public.payments;
CREATE TRIGGER update_payments_updated_at
  BEFORE UPDATE ON public.payments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================
-- Row Level Security (RLS)
-- =============================================
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read payments" ON public.payments;
CREATE POLICY "Authenticated users can read payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Authenticated users can insert payments" ON public.payments;
CREATE POLICY "Authenticated users can insert payments"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can update payments" ON public.payments;
CREATE POLICY "Authenticated users can update payments"
  ON public.payments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

DROP POLICY IF EXISTS "Authenticated users can delete payments" ON public.payments;
CREATE POLICY "Authenticated users can delete payments"
  ON public.payments
  FOR DELETE
  TO authenticated
  USING (true);
