# Arquitetura e Modelagem — Retiro de Jovens 2027 (AE IV)

Este documento descreve a arquitetura técnica adotada na **Atividade Extensionista IV (UNINTER)** para a **ADTC Templo Central de Ubajara/CE**, integrando o painel gerencial em React/Supabase ao sistema de inscrições PHP já existente na igreja.

---

## 1. Arquitetura Geral do Sistema (Opção A)

Optou-se por manter e evoluir o aplicativo PWA (`React + TypeScript + Vite + Supabase + Vercel`) acoplado por **importação CSV idempotente** ao módulo PHP da igreja (`inscritos.php?exportar=csv`), evitando modificar o servidor da secretaria em produção e preservando a continuidade das AEs II e III.

```mermaid
flowchart LR
  Igreja["Site da Igreja (PHP / MySQL)\nadtcdeubajara.org.br"] -->|"Exportação manual CSV\n(UTF-8 BOM + ';')"| ImportUI["Tela Importar CSV\n(Prévia + Mapeamento)"]
  ImportUI -->|"CPFs normalizados (HTTPS)"| EdgeFn["Edge Function cpf-hash\n(HMAC-SHA256 + PEPPER)"]
  EdgeFn -->|"Somente cpf_hash"| ImportUI
  ImportUI -->|"Upsert idempotente\n(protocol / cpf_hash)"| SupaDB["Supabase PostgreSQL (sa-east-1)\nparticipants, guardians, audit_logs"]
  SupaAuth["Supabase Auth + Perfis\n(admin, coordinator, viewer)"] -->|"JWT + RLS Restritivo"| SupaDB
  Painel["PWA Mobile-First (Vercel)\nDashboard, Participantes, Camisas"] <-->|"Bearer JWT + HTTPS"| SupaDB
  Painel -->|"Atalho wa.me"| WhatsApp["WhatsApp (Jovem / Responsável)"]
```

---

## 2. Modelo de Dados (PostgreSQL + RLS + Auditoria)

```mermaid
erDiagram
  AUTH_USERS ||--|| USERS : "id = id"
  PARTICIPANTS ||--o{ PARTICIPANT_GUARDIANS : "possui"
  GUARDIANS ||--o{ PARTICIPANT_GUARDIANS : "vincula"
  PARTICIPANTS ||--o{ PAYMENTS : "historico_v1"
  AUTH_USERS ||--o{ AUDIT_LOGS : "actor_id"

  USERS {
    uuid id PK
    text name
    text email
    text role "admin | coordinator | viewer"
    timestamptz created_at
  }

  PARTICIPANTS {
    uuid id PK
    text protocol UK "Chave idempotente PHP"
    text cpf_hash UK "HMAC-SHA256 (sem CPF puro)"
    text full_name
    date birth_date
    text phone
    text email
    text congregation
    text locality
    boolean is_resident "Interno ou externo"
    timestamptz registered_at
    boolean shirt_purchased "Camisa Sim/Nao"
    text shirt_size "PP a XG (opcional)"
    text status "pending | confirmed | cancelled"
  }

  GUARDIANS {
    uuid id PK
    text full_name
    text relationship
    text phone
    text email
  }

  AUDIT_LOGS {
    uuid id PK
    uuid actor_id FK
    text actor_role
    text action "INSERT | UPDATE | DELETE | IMPORT"
    text table_name
    text record_id
    jsonb summary "Metadados sem PII"
    timestamptz created_at
  }
```

---

## 3. Fluxo de Importação Idempotente e Proteção LGPD

```mermaid
flowchart TD
  Start["1. Upload CSV (inscritos.php)"] --> Parse["2. Parser UTF-8 BOM + ';' + remove prefixo '"]
  Parse --> Validate["3. Valida campos, datas dd/mm/aaaa e menores em 06/02/2027"]
  Validate --> Hash["4. Converte CPF em cpf_hash via Edge Function HMAC-SHA256"]
  Hash --> Match{"5. Existe no banco por protocol,\ncpf_hash ou nome+nascimento?"}
  Match -->|"Não"| Create["Classifica como NOVO (Insert)"]
  Match -->|"Sim, com diferenças"| Update["Classifica como ATUALIZAÇÃO (Update sem duplicar)"]
  Match -->|"Sim, idêntico"| Skip["Classifica como SEM MUDANÇA"]
  Create --> Audit["6. Grava lote + registra resumo em audit_logs (sem PII)"]
  Update --> Audit
  Skip --> Audit
```

---

## 4. Casos de Uso por Perfil de Acesso (RLS)

```mermaid
flowchart LR
  Admin["Administrador\n(Ismael / Coordenação)"] --> U1["Gerir inscritos, importar CSV,\nconfirmar camisas e auditar"]
  Coord["Coordenador\n(Claudejan / Equipe)"] --> U2["Consultar painel mobile,\ncontatar WhatsApp, importar CSV\ne marcar camisa Sim/Não"]
  Viewer["Somente Leitura\n(Pastor / Secretaria)"] --> U3["Visualizar totais, listas,\ncontatos e logs (bloqueado\npara alterar/excluir no RLS)"]
```

---

## 5. Decisões Técnicas e Plano de Retenção (LGPD)

1. **Região do Banco:** PostgreSQL hospedado no Supabase em **`sa-east-1` (São Paulo, Brasil)**, atendendo às boas práticas de residência de dados sob a LGPD.
2. **Minimização de Dados Sensíveis:** Não armazenamos CPF em texto puro, nem RG, endereço completo, IP de acesso ou cópia de termos de imagem do site da igreja. A conferência anti-duplicidade ocorre exclusivamente via `cpf_hash` (`HMAC-SHA256` com segredo `CPF_HMAC_PEPPER` no servidor) e `protocol`.
3. **Controle de Acesso e Anti-Escalação:** Políticas RLS por perfil em [rls.sql](../supabase/rls.sql) usando função isolada `private.current_user_role()` (`SECURITY DEFINER`, `SET search_path = ''`) e trigger `guard_user_role_change_trigger` impedindo que usuários comuns alterem o próprio papel para `admin`.
4. **Exclusão Pós-Evento:** Após o encerramento do Retiro de Jovens 2027 (em **09/02/2027**) e prestação de contas final da igreja (prazo sugerido de até **30 dias**, até **11/03/2027**), os registros nominais de participantes e responsáveis devem ser exportados para guarda exclusiva da secretaria oficial da igreja e removidos do painel operacional, preservando apenas totalizadores estatísticos anônimos.
