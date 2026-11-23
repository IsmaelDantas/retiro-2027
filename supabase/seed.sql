-- =============================================
-- Retiro 2027 — Seed Data (DEMONSTRAÇÃO / DADOS FICTÍCIOS)
-- Execute AFTER schema.sql and rls.sql
-- ⚠️ NUNCA USE EM PRODUÇÃO — DADOS 100% FICTÍCIOS
-- =============================================

INSERT INTO public.guardians (id, full_name, relationship, phone, email) VALUES
  ('a1111111-1111-1111-1111-111111111111', 'Maria Silva (Demo)', 'Mãe', '(88) 99999-0001', 'maria.demo@exemplo.com'),
  ('a2222222-2222-2222-2222-222222222222', 'José Oliveira (Demo)', 'Pai', '(88) 99999-0002', 'jose.demo@exemplo.com'),
  ('a3333333-3333-3333-3333-333333333333', 'Ana Souza (Demo)', 'Mãe', '(88) 99999-0003', 'ana.demo@exemplo.com'),
  ('a4444444-4444-4444-4444-444444444444', 'Carlos Santos (Demo)', 'Pai', '(88) 99999-0004', NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.participants (
  id, protocol, full_name, birth_date, phone, email, congregation, locality,
  is_resident, registered_at, shirt_purchased, shirt_size, notes, status
) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'RET-2027-0001', 'João Silva (Demo)', '2007-03-15', '(88) 98888-0001', 'joao.demo@exemplo.com', 'Templo Central', 'Centro', true, NOW() - INTERVAL '4 days', true, 'M', NULL, 'confirmed'),
  ('b2222222-2222-2222-2222-222222222222', 'RET-2027-0002', 'Pedro Silva (Demo)', '2011-07-22', '(88) 98888-0002', NULL, 'Templo Central', 'Centro', true, NOW() - INTERVAL '3 days', false, NULL, 'Menor em observação', 'pending'),
  ('b3333333-3333-3333-3333-333333333333', 'RET-2027-0003', 'Lucas Oliveira (Demo)', '2010-01-10', '(88) 98888-0003', 'lucas.demo@exemplo.com', 'Congregação Nova Veneza', 'Distrito Nova Veneza', false, NOW() - INTERVAL '2 days', true, 'G', NULL, 'confirmed'),
  ('b4444444-4444-4444-4444-444444444444', 'RET-2027-0004', 'Mariana Souza (Demo)', '2006-11-05', '(88) 98888-0004', 'mariana.demo@exemplo.com', 'Congregação Monte Castelo', 'Monte Castelo', true, NOW() - INTERVAL '1 day', true, 'M', NULL, 'confirmed'),
  ('b5555555-5555-5555-5555-555555555555', 'RET-2027-0005', 'Gabriel Santos (Demo)', '2012-06-18', '(88) 98888-0005', NULL, 'Sou de outra igreja/sou convidado', 'Zona Rural', false, NOW(), false, NULL, 'Desistência de exemplo', 'cancelled')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.participant_guardians (participant_id, guardian_id) VALUES
  ('b1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111'),
  ('b2222222-2222-2222-2222-222222222222', 'a1111111-1111-1111-1111-111111111111'),
  ('b3333333-3333-3333-3333-333333333333', 'a2222222-2222-2222-2222-222222222222'),
  ('b4444444-4444-4444-4444-444444444444', 'a3333333-3333-3333-3333-333333333333'),
  ('b5555555-5555-5555-5555-555555555555', 'a4444444-4444-4444-4444-444444444444')
ON CONFLICT DO NOTHING;
