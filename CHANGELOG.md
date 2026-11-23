# Changelog

Todas as mudanças relevantes deste projeto seguem o formato [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/) e o padrão [Conventional Commits](https://www.conventionalcommits.org/pt-br/).

## [1.1.0] — Atividade Extensionista IV (UNINTER)

### Adicionado
- **Segurança & LGPD (Fase 1):** Perfis de acesso (`admin`, `coordinator`, `viewer`), RLS restritivo com `private.current_user_role()`, trigger anti-escalação de privilégio em `public.users`, log de auditoria imutável (`public.audit_logs`), Edge Function `cpf-hash` (`HMAC-SHA256` com pepper) e bloqueios de escrita na interface para perfil `viewer`.
- **Importador CSV Idempotente (Fase 2):** Tela `/import` dedicada ao layout oficial de 14 colunas exportado por `inscritos.php` (BOM UTF-8, delimitador `;`, datas `dd/mm/AAAA`, remoção do `'` anti-fórmula), com prévia visual e atualização sem duplicatas por `protocol` e `cpf_hash`.
- **Painel Mobile-First do Coordenador (Fase 3):** Indicadores de inscritos ativos, internos × não internos, menores × adultos (calculados em `06/02/2027`), alerta de menores sem responsável, distribuição por congregação, evolução diária e atalhos diretos `wa.me` para jovem e responsável.
- **Confirmação de Camisas Simplificada (Fase 4):** Fluxo direto pelo coordenador para marcar se a camisa foi comprada (**Sim / Não**, com tamanho opcional) na tela `/payments` e na ficha do participante, sem valores fixos presumidos.
- **Qualidade, Testes & Desenho Universal (Fase 5):** Suíte `vitest` cobrindo parser CSV, CPF/permissões, idempotência e métricas (8/8 testes), correção de `@layer base` no Tailwind v4, contraste WCAG AA, `min-h-[44px]` em controles, `<main>` na tela de login, `vercel.json` (SPA fallback), `public/robots.txt` e auditoria Lighthouse (Acessibilidade `82 → 100`, Performance `74 → 95`).
- **Documentação & Evidências (Fase 6):** `docs/arquitetura.md` (diagramas Mermaid), `docs/manual-do-coordenador.md`, `docs/testes.md`, `docs/evidencias-e-roteiro-video.md`, `docs/igreja-schema-only.sql` e `docs/mapeamento-igreja.md`.

## [1.0.0] — 2026-11-13

### Adicionado
- Primeira versão do módulo de controle de blusas e pagamentos, fluxo Git (`main`/`develop`) e tag `v1.0.0`.
