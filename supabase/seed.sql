-- =============================================
-- Retiro 2027 — Seed Data (DEVELOPMENT ONLY)
-- Execute this AFTER schema.sql and rls.sql
-- ⚠️ THIS IS TEST DATA — DO NOT USE IN PRODUCTION
-- =============================================

-- Insert test guardians
INSERT INTO public.guardians (id, full_name, relationship, phone, email) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Maria Silva', 'Mãe', '(11) 99999-0001', 'maria.silva@email.com'),
  ('a2222222-2222-2222-2222-222222222222', 'José Oliveira', 'Pai', '(11) 99999-0002', 'jose.oliveira@email.com'),
  ('a3333333-3333-3333-3333-333333333333', 'Ana Souza', 'Mãe', '(11) 99999-0003', 'ana.souza@email.com'),
  ('a4444444-4444-4444-4444-444444444444', 'Carlos Santos', 'Pai', '(11) 99999-0004', NULL);

-- Insert test participants
INSERT INTO public.participants (id, full_name, birth_date, phone, email, congregation, notes, status) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'João Silva', '2009-03-15', '(11) 98888-0001', 'joao@email.com', 'Igreja Central', NULL, 'confirmed'),
  ('b2222222-2222-2222-2222-222222222222', 'Pedro Silva', '2011-07-22', '(11) 98888-0002', NULL, 'Igreja Central', 'Alérgico a amendoim', 'pending'),
  ('b3333333-3333-3333-3333-333333333333', 'Lucas Oliveira', '2010-01-10', '(11) 98888-0003', 'lucas@email.com', 'Igreja Norte', NULL, 'confirmed'),
  ('b4444444-4444-4444-4444-444444444444', 'Mariana Souza', '2009-11-05', '(11) 98888-0004', 'mariana@email.com', 'Igreja Sul', NULL, 'pending'),
  ('b5555555-5555-5555-5555-555555555555', 'Gabriel Santos', '2010-06-18', '(11) 98888-0005', NULL, 'Igreja Leste', 'Primeira vez no retiro', 'cancelled');

-- Link participants to guardians
INSERT INTO public.participant_guardians (participant_id, guardian_id) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111'),  -- João → Maria Silva
  ('b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111'),  -- Pedro → Maria Silva (same guardian!)
  ('b3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222'),  -- Lucas → José Oliveira
  ('b4444444-4444-4444-4444-444444444444', 'a3333333-3333-3333-3333-333333333333'),  -- Mariana → Ana Souza
  ('b5555555-5555-5555-5555-555555555555', 'a4444444-4444-4444-4444-444444444444');  -- Gabriel → Carlos Santos
