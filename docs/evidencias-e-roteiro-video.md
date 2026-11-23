# Evidências Acadêmicas e Roteiro de Vídeo — UNINTER (AE IV)

## 1. Roteiro de Demonstração em Vídeo (Máximo 4min30s)

> ⚠️ **Regra obrigatória:** grave toda a demonstração **exclusivamente no ambiente de Demonstração** (com dados fictícios de `seed.sql`), nunca exibindo nomes, telefones ou CPFs reais da igreja.

- **[0:00 – 0:35] Apresentação Pessoal e Contexto**
  - *"Olá, sou Ismael Costa Dantas, aluno de Engenharia da Computação na UNINTER (RU 3691444), de Tianguá-CE. Apresento a implementação da Atividade Extensionista IV: Tecnologia Aplicada à Inclusão Digital, desenvolvida para a coordenação de jovens da Igreja Assembleia de Deus Templo Central de Ubajara/CE para o Retiro de Jovens 2027."*
- **[0:35 – 1:20] O Problema Real da Comunidade**
  - Explicar que o site da igreja (`adtcdeubajara.org.br`) já resolve o cadastro inicial com CPF e termo de responsabilidade, mas o coordenador (Claudejan) precisava gerenciar tudo pelo celular: acompanhar totais por congregação, alojamento (internos × externos), menores de idade e responsáveis, falar rápido no WhatsApp e confirmar camisas — além de adequar o sistema à LGPD.
- **[1:20 – 2:55] Demonstração Prática do Sistema (Ambiente Demo)**
  1. Login no PWA pelo celular/navegador e visão da tela inicial (**Dashboard**: inscritos ativos, internos, menores em 06/02/2027, alerta de menor sem responsável, distribuição por congregação e evolução diária).
  2. Tela **Participantes**: filtros por congregação, faixa etária e alojamento + toque rápido abrindo o **WhatsApp** do jovem e do responsável.
  3. Tela **Controle de Camisas**: marcação simples em 1 toque (**Sim / Não**) e exportação CSV.
  4. Tela **Importar CSV**: envio de CSV fictício no layout exato do `inscritos.php`, pré-visualização e reimportação idempotente sem duplicar registros.
  5. Tela **Perfil e Auditoria**: mostrar perfil de acesso (Admin/Coordenador/Somente leitura) e registro imutável em `audit_logs`.
- **[2:55 – 3:50] Decisões Técnicas, Arquitetura, LGPD e Desenho Universal**
  - Explicar a escolha da **Opção A** (PWA React + TypeScript + Supabase `sa-east-1` + Vercel), explicando: (a) proteção de CPF somente via hash criptográfico (`cpf_hash`), (b) RLS por papel impedindo leitura/escrita indevida, (c) melhoria no **Lighthouse** (Acessibilidade de **82 para 100** e Performance de **74 para 95**) e testes automatizados com **Vitest**.
- **[3:50 – 4:25] Resultados e Encerramento**
  - Destacar os benefícios de inclusão digital para lideranças voluntárias com ODS 9 e ODS 17 e agradecer à igreja (Pastor José Alberto, Coordenador Claudejan e Irmão Luiz Carlos).

---

## 2. Checklist de Prints Sugeridos para o PDF (Somente Dados Fictícios)

1. **Tela de Login + PWA instalado** na tela inicial do celular (mostrando acesso prático e responsivo).
2. **Dashboard do Coordenador** com KPIs (ativos, internos, menores, congregações e evolução diária).
3. **Lista de Participantes com Filtros e Botões de WhatsApp**.
4. **Tela de Importação CSV** mostrando a pré-visualização (*Novos* / *Atualizações* / *CPF oculto*) e reimportação sem duplicatas.
5. **Controle de Camisas (`Sim / Não`)** pelo coordenador.
6. **Perfil e Log de Auditoria Recente (`audit_logs`)** + visão **Somente Leitura (`viewer`)** com botões de escrita ocultos.
7. **Evidências de Engenharia:** histórico de branches/PRs no GitHub, terminal com `npm run test` (8/8 passando) e comparativo do **Lighthouse** (Acessibilidade 100).

---

## 3. Lista de Funcionalidades Entregues (Cronograma Executado)

| Fase | Entregas Principais |
|---|---|
| **Fase 0 / 0.5** | Análise real do código PHP da igreja (`retiro.zip` + DDL), `.gitignore` LGPD, `docs/igreja-schema-only.sql`, `docs/mapeamento-igreja.md`, `CHANGELOG.md`. |
| **Fase 1** | Perfis `admin` / `coordinator` / `viewer`, RLS restritivo (`private.current_user_role()`), trigger anti-escalação, `audit_logs`, Edge Function `cpf-hash` (`HMAC-SHA256`) e bloqueios de UI por perfil. |
| **Fase 2** | Parser do CSV de 14 colunas do `inscritos.php` (`;`, BOM UTF-8, anti-fórmula) e importação idempotente com prévia e auditoria em `/import`. |
| **Fase 3** | Dashboard gerencial mobile-first (congregações, internos × externos, menores em `2027-02-06`, alerta de responsáveis, evolução diária) e atalhos WhatsApp. |
| **Fase 4** | Simplificação da gestão de camisas para confirmação direta **Sim / Não** pelo coordenador + relatórios CSV atualizados. |
| **Fase 5** | Suíte Vitest (8 testes críticos passando), correções de Desenho Universal (contraste, alvos ≥ 44px, `<main>`, skip-link, `robots.txt`, `vercel.json`) e auditoria Lighthouse (A11y 82 → 100, Perf 74 → 95). |
| **Fase 6** | Diagramas Mermaid (`docs/arquitetura.md`), manual de 1 página (`docs/manual-do-coordenador.md`), relatório de testes (`docs/testes.md`), roteiro de vídeo e documentação final. |
