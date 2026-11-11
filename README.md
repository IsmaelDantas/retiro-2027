# Retiro 2027 — Sistema de Gestão de Participantes

[![Deploy with Vercel](https://vercel.com/button)](https://retiro-2027-seven.vercel.app/)

> **Aplicação em Produção (Vercel):** [https://retiro-2027-seven.vercel.app/](https://retiro-2027-seven.vercel.app/)  
> **Acesso / Login:** [https://retiro-2027-seven.vercel.app/login](https://retiro-2027-seven.vercel.app/login)

---

## 🎓 Atividade Extensionista: Tecnologia Aplicada à Inclusão Digital

Este projeto foi concebido e estruturado no âmbito da **Atividade Extensionista Universitária**, sob a temática de **Tecnologia Aplicada à Inclusão Digital**.

### Impacto e Relevância Social
- **Inclusão Digital na Gestão Comunitária**: Apoia lideranças voluntárias e comunitárias (coordenadores de eventos e juventude) na transição de processos manuais baseados em cadernos de papel e planilhas desconexas para uma solução em nuvem moderna, segura e colaborativa.
- **Acessibilidade e Democratização do Acesso**: Por meio do conceito **Mobile-First** e suporte completo a **PWA (Progressive Web App)**, a aplicação pode ser executada diretamente do navegador ou instalada na tela de qualquer smartphone (Android/iOS), consumindo baixa largura de banda e viabilizando o acesso por coordenadores com diferentes níveis de letramento digital.
- **Proteção e Privacidade de Dados**: Sensibilização sobre privacidade, coletando estritamente os dados necessários e adotando práticas alinhadas às diretrizes da LGPD (Lei Geral de Proteção de Dados).

---

## 📋 Objetivo

Substituir listas e planilhas descentralizadas por uma interface simples, intuitiva e acessível principalmente pelo celular, permitindo:

- Login de coordenadores autorizados
- Dashboard com resumo do retiro
- Cadastro, edição e exclusão de participantes
- Gerenciamento de responsáveis
- Pesquisa e filtros por status
- Exportação de dados em CSV

## 🌿 Estrutura de Branches & Fluxo de Trabalho

O repositório adota um modelo de versionamento baseado no Gitflow Simplificado:

- **`main`**: Branch de produção. Contém o código estável, testado e sincronizado com o ambiente de deploy em produção na [Vercel](https://retiro-2027-seven.vercel.app/).
- **`develop`**: Branch de integração contínua e desenvolvimento ativo, utilizada para homologação de novas features antes do lançamento oficial.

---

## 🛠 Stack

| Tecnologia | Versão | Propósito |
|---|---|---|
| React | 19 | Interface de usuário |
| TypeScript | 5+ | Tipagem estática |
| Vite | 8 | Build tool |
| Tailwind CSS | 4 | Estilização |
| Supabase | - | Backend (Auth, Database, RLS) |
| PostgreSQL | 15+ | Banco de dados (via Supabase) |
| Lucide React | - | Ícones |
| React Router | 7 | Roteamento |
| vite-plugin-pwa | - | PWA |

## 📦 Requisitos

- **Node.js** 18+
- **npm** 9+
- Uma conta no [Supabase](https://supabase.com) (gratuita)

## 🚀 Como Instalar

```bash
# Clonar o repositório
git clone <url-do-repositorio>
cd retiro-2027

# Instalar dependências
npm install
```

## ⚙️ Como Configurar

### 1. Criar projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Anote a **Project URL** e a **Anon Key** (em Settings → API)

### 2. Configurar variáveis de ambiente

```bash
# Copiar template
cp .env.example .env

# Editar com suas credenciais
# VITE_SUPABASE_URL=https://seu-projeto.supabase.co
# VITE_SUPABASE_ANON_KEY=sua-anon-key
```

> ⚠️ **Nunca commit o arquivo `.env`!** Ele já está no `.gitignore`.

### 3. Criar tabelas no banco

Acesse o **SQL Editor** no painel do Supabase e execute os scripts na seguinte ordem:

1. `supabase/schema.sql` — Cria as tabelas, índices e triggers
2. `supabase/rls.sql` — Configura as políticas de segurança (RLS)
3. `supabase/seed.sql` — (Opcional) Popula com dados de teste

### 4. Criar um usuário coordenador

No painel do Supabase, vá em **Authentication → Users → Add User**:

- E-mail: `coordenador@igreja.com` (ou o e-mail desejado)
- Senha: defina uma senha segura
- Marque "Auto Confirm User"

Depois, no **SQL Editor**, crie o perfil:

```sql
INSERT INTO public.users (id, name, email, role)
VALUES (
  'ID-DO-USUARIO-CRIADO',  -- copie da aba Authentication
  'Nome do Coordenador',
  'coordenador@igreja.com',
  'coordinator'
);
```

## 💻 Como Executar Localmente

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

## 📦 Como Fazer Build

```bash
npm run build
```

Os arquivos de produção serão gerados na pasta `dist/`.

## 🚀 Como Fazer Deploy

### Vercel (Recomendado)

1. Conecte seu repositório Git à [Vercel](https://vercel.com)
2. Configure as variáveis de ambiente:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Deploy automático a cada push

### Netlify

1. Conecte seu repositório à [Netlify](https://netlify.com)
2. Build command: `npm run build`
3. Publish directory: `dist`
4. Configure as variáveis de ambiente

## 🏗 Arquitetura

```
src/
├── components/          # Componentes reutilizáveis
│   ├── ui/              # Primitivos (Button, Input, Badge, Card, Modal...)
│   └── layout/          # Layout (Sidebar, BottomNav, AppLayout)
├── pages/               # Páginas (por rota)
├── contexts/            # React contexts (Auth, Toast)
├── services/            # Acesso ao Supabase (queries e mutations)
├── types/               # Interfaces TypeScript
├── utils/               # Utilitários (date, csv, status)
├── lib/                 # Configuração do Supabase client
├── App.tsx              # Rotas e providers
└── main.tsx             # Ponto de entrada

supabase/
├── schema.sql           # DDL do banco
├── rls.sql              # Políticas de segurança
└── seed.sql             # Dados de teste
```

### Decisões de Arquitetura

| Decisão | Justificativa |
|---|---|
| **Tailwind CSS v4** | Configuração simplificada via CSS, sem arquivo de config separado |
| **Supabase como backend** | Auth + Database + RLS em um único serviço, sem necessidade de backend próprio |
| **Client-side filtering** | Para o MVP com volume pequeno de dados, filtragem no cliente oferece UX instantânea |
| **Tabela junction (participant_guardians)** | Permite relacionamento N:N entre participantes e responsáveis |
| **Formulário compartilhado** | `ParticipantFormPage` serve para criação e edição, evitando duplicação |
| **Status como string com CHECK** | Simples e adequado para o MVP, facilmente extensível |

### Modelo de Dados

```
users ─────────── Supabase Auth
participants ──── guardians (via participant_guardians)
```

- Um responsável pode ter múltiplos participantes
- Um participante pode ter múltiplos responsáveis (via tabela junction)

## 🔒 Segurança

- **RLS habilitado** em todas as tabelas
- Apenas usuários autenticados acessam os dados
- Credenciais armazenadas em variáveis de ambiente
- Nenhuma chave secreta no frontend
- `.env` nunca comitado

## 📱 PWA

A aplicação pode ser instalada na tela inicial do celular:

1. Abra a aplicação no navegador do celular
2. Toque em "Adicionar à tela inicial" (ou equivalente)
3. O app será exibido como um aplicativo nativo

## ⚖️ LGPD

- Dados coletados são apenas os necessários para organização do retiro
- Não são coletados CPF, RG, endereço, dados médicos ou financeiros
- Avisos de uso de dados são exibidos nos formulários

## 🔮 Possíveis Evoluções Futuras

- Controle de pagamentos
- Integração com WhatsApp
- Notificações push
- Controle de quartos e transporte
- Suporte a múltiplos retiros
- Relatórios avançados
- Sistema de permissões por role
