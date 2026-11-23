# Changelog

Todas as mudanças relevantes deste projeto seguem o formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/).

## [Não lançado] — Atividade Extensionista IV

### Adicionado
- Bloqueio preventivo no `.gitignore` contra arquivos `.sql` com dados reais, arquivos compactados `.zip` e planilhas CSV/Excel.
- Esquema de referência sanitizado do módulo PHP da igreja ([docs/igreja-schema-only.sql](docs/igreja-schema-only.sql)) sem nenhum dado pessoal (`INSERT`).
- Mapeamento oficial De → Para entre o módulo da igreja (`inscritos.php?exportar=csv`) e o modelo Supabase ([docs/mapeamento-igreja.md](docs/mapeamento-igreja.md)).

### Planejado
- Perfis de acesso (`admin`, `coordinator`, `viewer`) com RLS restritivo e log de auditoria (`audit_logs`).
- Importador CSV idempotente com detecção de duplicidade via `cpf_hash` (HMAC-SHA256) e `protocol`.
- Painel gerencial mobile-first (congregações, internos × não internos, menores × adultos, alertas de responsáveis e atalhos WhatsApp).
- Evolução do módulo de camisas com comprovantes Pix em bucket privado no Supabase Storage.
- Testes automatizados (Vitest), relatório Lighthouse (antes/depois) e separação entre ambiente de Demonstração e Produção.

## [1.0.0] — 2026-11-13

### Adicionado
- Módulo completo de **Pagamentos e Lista de Blusas** (`PaymentsPage`, `PaymentModal`, `PaymentBadge`, `services/payments.ts`, `migration_payments.sql`).
- Controle de pagamentos pagos, parciais e pendentes, grade de tamanhos (`PP`–`XG`), geração em lote e exportação CSV.
- Fluxo Git com branches `main`, `develop` e tag `v1.0.0`.
