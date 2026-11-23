# Retiro 2027 — Painel de Gestão para Coordenação (AE IV)

> **Atividade Extensionista IV: Tecnologia Aplicada à Inclusão Digital — UNINTER**  
> **Comunidade atendida:** Coordenação de Jovens da Igreja Assembleia de Deus Templo Central de Ubajara/CE  
> **Ambiente de Demonstração (Vercel):** [https://retiro-2027-seven.vercel.app/](https://retiro-2027-seven.vercel.app/)

---

## 🎯 Visão Geral

O **Retiro 2027** é um Progressive Web App (**PWA**) *mobile-first* desenvolvido para apoiar a coordenação voluntária na gestão operacional do Retiro de Jovens 2027 (inscrições até 20/01/2027; evento de 06 a 09/02/2027).

Ele **complementa** (sem substituir) o formulário público em PHP do site oficial da igreja (`adtcdeubajara.org.br`), resolvendo as principais dores da organização no celular:

- **Importação CSV Idempotente (`/import`):** lê o CSV oficial de 14 colunas exportado pelo `inscritos.php` (delimitador `;`, BOM UTF-8, proteção anti-fórmula) e atualiza dados sem criar duplicatas (`protocol` e `cpf_hash`).
- **Painel Gerencial do Coordenador (`/dashboard` e `/participants`):** totais ativos/cancelados, internos × externos, menores × adultos (calculado na data-base `06/02/2027`), alerta de menores sem responsável, distribuição por congregação, evolução diária e atalho direto para **WhatsApp** (`wa.me`) do jovem e do responsável.
- **Confirmação de Camisas (`Sim / Não`):** marcação rápida pelo coordenador de quem já adquiriu a camisa (com tamanho opcional `PP–XG`) e exportação CSV.
- **Segurança & LGPD:** controle de acesso por perfil (`admin`, `coordinator`, `viewer`) via **RLS no PostgreSQL**, trigger anti-escalação, `cpf_hash` via `HMAC-SHA256` em Edge Function (zero CPF em texto claro no banco) e trilha de auditoria imutável (`audit_logs`).

---

## 🛠 Stack Real

| Tecnologia | Versão | Propósito |
|---|---|---|
| React | `19.2.8` | Interface mobile-first |
| TypeScript | `~6.0.2` | Tipagem estática |
| Vite | `8.2.2` | Empacotamento e preview |
| Tailwind CSS | `4.3.3` | Estilização acessível |
| Supabase (`@supabase/supabase-js`) | `2.112.4` | PostgreSQL (`sa-east-1`), Auth, RLS e Edge Functions |
| React Router | `7.18.3` | Roteamento SPA |
| `vite-plugin-pwa` | `1.3.0` | Instalação PWA no smartphone |
| Vitest | `5.1.x` | Testes unitários automatizados |
| `oxlint` | `1.79.0` | Análise estática de código |

---

## ⚙️ Instalação e Execução Local

```bash
git clone https://github.com/IsmaelDantas/retiro-2027.git
cd retiro-2027
npm install
cp .env.example .env
# Preencha VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env (nunca commite o .env)
npm run dev
```

### Scripts Disponíveis

```bash
npm run dev      # Servidor de desenvolvimento (http://localhost:5173)
npm run test     # Executa os testes automatizados (Vitest)
npm run lint     # Análise estática (oxlint)
npm run build    # Compilação TypeScript + build de produção PWA (dist/)
npm run preview  # Pré-visualização local do build de produção
```

---

## 🗄 Configuração do Banco Supabase e Edge Function

1. Crie um projeto no Supabase na região **`sa-east-1` (São Paulo, Brasil)**.
2. No **SQL Editor**, execute em ordem:
   - `supabase/schema.sql` — tabelas (`users`, `participants`, `guardians`, `participant_guardians`, `payments`, `audit_logs`), índices e triggers `updated_at`.
   - `supabase/rls.sql` — schema `private`, helper `current_user_role()`, trigger anti-escalação, triggers de auditoria e políticas RLS por papel (`admin`, `coordinator`, `viewer`).
   - *(Para atualizar um banco criado antes da AE IV, execute `supabase/migrations/202611230001_fase1_roles_rls_audit_lgpd.sql`.)*
3. **Edge Function de Hash de CPF (`cpf-hash`):**
   - Faça deploy de `supabase/functions/cpf-hash/index.ts` e cadastre o segredo `CPF_HMAC_PEPPER` no painel **Edge Functions → Secrets**.
4. **Ambientes Separados (Demonstração × Produção):**
   - **Demonstração (UNINTER / Vídeo):** utiliza `supabase/seed.sql` com dados **100% fictícios** e conta de teste para validação do avaliador.
   - **Produção (Igreja):** ambiente separado, **sem conta de teste** e **sem `seed.sql`**, ativado somente após autorização da coordenação e do pastor, com plano de exclusão nominal em até 30 dias após o evento (`09/02/2027`).

---

## 📚 Documentação do Projeto

- [docs/arquitetura.md](docs/arquitetura.md) — Diagramas Mermaid (arquitetura, DER, importação e casos de uso) e plano LGPD.
- [docs/mapeamento-igreja.md](docs/mapeamento-igreja.md) — Mapeamento oficial PHP/CSV (`inscritos.php`) → Supabase.
- [docs/igreja-schema-only.sql](docs/igreja-schema-only.sql) — Estrutura DDL de referência sem dados pessoais.
- [docs/manual-do-coordenador.md](docs/manual-do-coordenador.md) — Manual ilustrado em linguagem simples para voluntários.
- [docs/testes.md](docs/testes.md) — Casos de teste, resultados Vitest, Desenho Universal e auditoria Lighthouse.
- [docs/evidencias-e-roteiro-video.md](docs/evidencias-e-roteiro-video.md) — Roteiro de demonstração (≤ 4min30s) e checklist de prints fictícios.
- [CHANGELOG.md](CHANGELOG.md) — Registro cronológico de versões e entregas.
