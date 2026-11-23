# Relatório de Testes, Qualidade e Acessibilidade — Retiro 2027

## 1. Testes Automatizados (`Vitest`)

Comando de execução: `npm run test` (`vitest run`).

| Suíte | Casos Cobertos | Resultado |
|---|---|---|
| [`tests/importParser.test.ts`](../tests/importParser.test.ts) | 1) Remoção de BOM UTF-8 + delimitador `;` + mapeamento das 14 colunas do `inscritos.php`; 2) Remoção de prefixo anti-fórmula (`'`), conversão `dd/mm/AAAA`, flag `ficara_interno`, situação `ativa`/`cancelada` e cálculo exato de menoridade em `2027-02-06`; 3) Detecção de protocolo/CPF duplicado no mesmo CSV e máscara transitória. | **3/3 passaram** |
| [`tests/cpfAndPermissions.test.ts`](../tests/cpfAndPermissions.test.ts) | 1) Validação de dígitos verificadores de CPF; 2) Geração de hash SHA-256 determinístico sem expor CPF original; 3) Matriz de permissões para `admin`, `coordinator`, `viewer` e nulo. | **3/3 passaram** |
| [`tests/idempotencyAndMetrics.test.ts`](../tests/idempotencyAndMetrics.test.ts) | 1) Classificação idempotente `create` → `unchanged` → `update` (por `protocol` / `cpf_hash`) evitando duplicatas na reimportação; 2) Totalizadores do painel (ativos, cancelados, internos, externos, menores, adultos, menores sem responsável, camisas `Sim`/`Não` e congregações). | **2/2 passaram** |

**Total:** **3 suítes / 8 testes aprovados (`100%`)**, além de `npm run lint` (`oxlint`, `0` erros) e `npm run build` (`tsc -b && vite build`).

---

## 2. Medição Lighthouse (Antes × Depois)

Auditorias executadas com Google Chrome headless (`npx lighthouse --only-categories=performance,accessibility,best-practices,seo`). Dados consolidados em [`docs/lighthouse/resumo.json`](lighthouse/resumo.json).

| Categoria | Antes (`v1.0.0` Vercel) | Depois (Build AE IV) | Melhorias Aplicadas |
|---|---|---|---|
| **Performance** | 74 | **95** (+21) | Correção de carregamento, CSS enxuto com Tailwind v4 em `@layer base` e build otimizado. |
| **Accessibility** | 82 | **100** (+18) | Contraste `--color-text-tertiary` (`#64748b`, WCAG AA), tag `<main>` na tela de login, link *Pular para o conteúdo* e alvos de toque `>= 44px` (`Input`, `Select`, `Button`) corrigindo erro de reset CSS fora de `@layer`. |
| **Best Practices** | 100 | **100** | Mantido em nota máxima. |
| **SEO** | 100 | **100** | Adição de `public/robots.txt` válido e meta descrições em PT-BR. |

---

## 3. Adesão aos 7 Princípios do Desenho Universal

1. **Igualitário:** Funciona em qualquer celular Android/iOS ou computador via navegador e PWA sem custo adicional.
2. **Adaptável:** Layout *mobile-first* com barra de navegação inferior no celular e drawer lateral no desktop.
3. **Intuitivo:** Fluxos diretos com ícones claros, confirmação de camisa em 1 toque (**Sim / Não**) e prévia visual antes de gravar importações.
4. **Informação de fácil percepção:** Contraste validado (100 no Lighthouse), badges semânticos (status, menoridade, interno/externo) e alertas visuais para pendências de responsáveis.
5. **Tolerância ao erro:** Confirmação modal em exclusões, proteção contra duplo clique em envios, validação de CPF/datas e importação idempotente que evita duplicidades ao reenviar CSV.
6. **Baixo esforço físico:** Alvos de toque ≥ 44px, links diretos `wa.me` sem digitar números e preenchimento automático de colunas do CSV.
7. **Dimensão e espaço para aproximação e uso:** Espaçamento generoso entre cartões, botões e campos para uso confortável com uma mão no celular.

---

## 4. Roteiro de Testes Manuais (QA)

1. **Login e Controle de Perfil:** Acessar como `viewer` e confirmar que os botões *Nova Inscrição*, *Editar*, *Excluir*, *Importar CSV* e *Sim/Não* ficam ocultos e qualquer tentativa de escrita é bloqueada pelo RLS.
2. **Importação Idempotente:** Exportar CSV de teste com 3 registros no formato do `inscritos.php`, importar via `/import` (deve criar 3), reimportar o mesmo arquivo (deve classificar 3 como *Sem mudança* e criar 0).
3. **Painel e WhatsApp:** Conferir na tela inicial os totais de internos/externos, menores, congregações e clicar no atalho de WhatsApp.
4. **Controle de Camisas:** Abrir `/payments`, marcar um participante como **Sim** (e tamanho opcional), filtrar por *Comprou: Sim* e exportar o CSV.
5. **Auditoria LGPD:** Abrir `/profile` e verificar o registro em *Log de Auditoria Recente* confirmando ausência de CPF ou PII sensível no resumo.
