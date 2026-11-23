# Mapeamento do Módulo da Igreja (PHP/MySQL) → Painel Retiro 2027 (Supabase)

Este documento consolida a análise estrutural da Fase 0 sobre o módulo de inscrições em PHP/MySQL da secretaria da ADTC Ubajara/CE, utilizando exclusivamente o esquema DDL ([igreja-schema-only.sql](./igreja-schema-only.sql)) e o código-fonte das telas PHP, sem qualquer dado pessoal real ou credencial.

---

## 1. Estrutura dos Arquivos Analisados (Módulo PHP)

| Arquivo PHP | Papel no Site da Igreja |
|---|---|
| `config.php` | Define constantes do evento (`RETIRO_ANO = 2027`, título, prazo de inscrições até `2027-01-20 23:59:59` e aviso de privacidade). |
| `index.php` | Formulário público de inscrição. Carrega congregações de `congregacoes.nome_congregacao`, valida CPF/e-mail/data, calcula menoridade em `2027-02-06` e grava `retiro_inscricoes` + `retiro_termos_aceites`. |
| `termos.php` / `termo_pdf.php` | Texto dos termos de ciência (maiores) e autorização/pernoite (menores) e visualização imprimível do termo vinculado à inscrição. |
| `inscritos.php` | Listagem restrita à sessão da gestão com totais (`ativos`, `cancelados`, `internos`, `maiores`, `menores`), filtro em tela e **exportação CSV (`?exportar=csv`)**. |
| `gerenciar.php` | Edição de dados e alternância de situação (`ativa` ↔ `cancelada`) com proteção CSRF. |
| `camisa.php` | Página informativa estática para encomenda da camisa (R$ 45,00), cópia da chave Pix e link `wa.me` para envio manual do comprovante pelo WhatsApp. **Não possui tabela própria no MySQL.** |

---

## 2. Formato Real da Exportação CSV (`inscritos.php?exportar=csv`)

- **Codificação:** UTF-8 com BOM (`\xEF\xBB\xBF`)
- **Delimitador:** Ponto e vírgula (`;`)
- **Proteção contra Formula Injection:** Valores iniciados em `=`, `+`, `-`, `@`, tabulação ou CR recebem prefixo apóstrofo (`'`)
- **Data de nascimento:** Formato brasileiro `dd/mm/YYYY` (`date('d/m/Y', ...)`)
- **Ordem exata das 14 colunas:**
  1. `Protocolo`
  2. `Nome`
  3. `CPF`
  4. `Localidade`
  5. `E-mail`
  6. `Ficará interno` (`sim` / `nao`)
  7. `Situação` (`ativa` / `cancelada`)
  8. `Nascimento` (`dd/mm/YYYY`)
  9. `Idade` (calculada na data de início do retiro: `2027-02-06`)
  10. `WhatsApp`
  11. `Igreja`
  12. `Responsável`
  13. `WhatsApp responsável`
  14. `Registrado em`

---

## 3. Mapa de Campos (PHP / CSV → Supabase)

| Origem (`retiro_inscricoes` / CSV) | Destino no Supabase | Política de Minimização e Transformação (LGPD) |
|---|---|---|
| `protocolo` (`Protocolo`) | `participants.protocol` (`TEXT UNIQUE`) | Chave de negócio idempotente para atualizar inscrições já importadas sem duplicar. |
| `cpf` (`CPF`) | `participants.cpf_hash` (`TEXT UNIQUE`) | **Nunca armazenado em texto claro.** Convertido em HMAC-SHA256 com segredo fora do front-end apenas para detecção de duplicidade. |
| `nome` (`Nome`) | `participants.full_name` | Sanitizado (remoção eventual do `'` anti-fórmula). |
| `nascimento` (`Nascimento`) | `participants.birth_date` (`DATE`) | Convertido de `dd/mm/YYYY` para `YYYY-MM-DD`. Menoridade calculada na data-base `2027-02-06`. |
| `whatsapp` (`WhatsApp`) | `participants.phone` | Normalização numérica (DDD + número) para link rápido `wa.me`. |
| `email` (`E-mail`) | `participants.email` | Opcional. |
| `igreja` (`Igreja`) | `participants.congregation` | Preserva congregações e a opção `"Sou de outra igreja/sou convidado"`. |
| `localidade` (`Localidade`) | `participants.locality` | Sítio, distrito ou bairro para apoio logístico. |
| `ficara_interno` (`Ficará interno`) | `participants.is_resident` (`BOOLEAN`) | `sim` → `true`; `nao` → `false`; vazio → `null`. |
| `situacao` (`Situação`) | `participants.status` | `ativa` → `confirmed`; `cancelada` → `cancelled`. |
| `criado_em` (`Registrado em`) | `participants.registered_at` (`TIMESTAMPTZ`) | Alimenta gráfico de evolução diária de inscrições. |
| `responsavel_nome` (`Responsável`) | `guardians.full_name` | Associado via `participant_guardians` (sem duplicar responsável com mesmos dados). |
| `responsavel_whatsapp` (`WhatsApp responsável`) | `guardians.phone` | Normalizado para link rápido WhatsApp do responsável. |

> **Campos descartados por minimização (LGPD):** `termo_texto`, `termo_sha256`, `responsavel_cpf`, `ip_origem` e `agente_usuario` (tabela `retiro_termos_aceites`) não são exportados no CSV padrão e permanecem exclusivamente no servidor oficial da igreja.
