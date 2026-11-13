-- =============================================
-- Retiro 2027 — Row Level Security Policies
-- Execute this AFTER schema.sql in the Supabase SQL Editor
-- =============================================

-- Enable RLS on all tables
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.participant_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- =============================================
-- Users policies
-- =============================================
CREATE POLICY "Users can read own profile"
  ON public.users
  FOR SELECT
  TO authenticated
  USING ((select auth.uid()) = id);

CREATE POLICY "Users can update own profile"
  ON public.users
  FOR UPDATE
  TO authenticated
  USING ((select auth.uid()) = id)
  WITH CHECK ((select auth.uid()) = id);

-- =============================================
-- Participants policies (authenticated coordinators can manage all)
-- =============================================
CREATE POLICY "Authenticated users can read participants"
  ON public.participants
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert participants"
  ON public.participants
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update participants"
  ON public.participants
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete participants"
  ON public.participants
  FOR DELETE
  TO authenticated
  USING (true);

-- =============================================
-- Guardians policies
-- =============================================
CREATE POLICY "Authenticated users can read guardians"
  ON public.guardians
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert guardians"
  ON public.guardians
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update guardians"
  ON public.guardians
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete guardians"
  ON public.guardians
  FOR DELETE
  TO authenticated
  USING (true);

-- =============================================
-- Participant-Guardian junction policies
-- =============================================
CREATE POLICY "Authenticated users can read participant_guardians"
  ON public.participant_guardians
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert participant_guardians"
  ON public.participant_guardians
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete participant_guardians"
  ON public.participant_guardians
  FOR DELETE
  TO authenticated
  USING (true);

-- =============================================
-- Payments policies
-- =============================================
CREATE POLICY "Authenticated users can read payments"
  ON public.payments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert payments"
  ON public.payments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update payments"
  ON public.payments
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete payments"
  ON public.payments
  FOR DELETE
  TO authenticated
  USING (true);
