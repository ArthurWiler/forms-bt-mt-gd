# Prompt — Saneamento do CSS (sem migrar para Tailwind)

> Cole o conteúdo da seção "PROMPT" abaixo numa sessão nova do Claude Code,
> na raiz do repositório. As seções seguintes são contexto de apoio: o
> levantamento que motivou o trabalho e o critério de aceite de cada etapa.

---

## PROMPT

Quero sanear o CSS deste projeto **sem migrar para Tailwind** e **sem
introduzir build step**. São quatro frentes, nesta ordem — a ordem importa,
porque a rede de segurança precisa existir antes da poda.

Leia `docs/css-architecture.md` antes de começar: ele é a convenção vigente do
projeto e nada aqui pode violá-lo. Leia também a seção "Contexto do
levantamento" em `docs/css-saneamento-prompt.md`, que tem os números da
auditoria inicial.

Trate cada etapa como entregável independente, com commit próprio. Se uma
etapa travar, conclua as outras e me diga explicitamente o que ficou de fora
e por quê.

### Etapa 1 — Rede de segurança: screenshots com Playwright

Antes de qualquer mudança em CSS, crie um teste de regressão visual.

- Instale Playwright como devDependency. Isto vai criar um `package.json`, o
  que é aceitável **porque é ferramenta de teste, não de build** — o site
  continua servindo HTML/CSS estático sem compilação. Deixe isso explícito
  num comentário no `package.json` ou no README do teste.
- Cubra os 8 entrypoints reais:
  - `index.html` (portal)
  - `bt/index.html`, `bt/individual.html`
  - `mt/index.html`
  - `loteamento/index.html`
  - `desistencia/index.html`
  - `microgeracao/index.html`
  - `minigeracao/index.html`
- Para cada um, capture em 3 viewports: 1440px (desktop), 768px (tablet),
  390px (mobile). São 24 baselines.
- **Cubra também os estados que só existem via JS**, senão a poda da Etapa 2
  vai remover o CSS deles. No mínimo: um campo com `.is-invalid`, um
  accordion `.is-open`, um passo `.done` na trilha, e um `.cmg-aviso--warn`.
  Se for difícil alcançar esses estados navegando, crie uma página de
  fixture em `tests/fixtures/` que renderize os componentes em todos os
  estados de uma vez — ela serve tanto de baseline visual quanto de
  inventário de classes.
- Documente em uma linha como rodar e como atualizar baselines.

Critério de aceite: `npx playwright test` passa verde no repositório limpo,
e falha se eu mudar uma cor no `shared.css`. Verifique isso de fato — faça a
mudança, veja falhar, reverta.

### Etapa 2 — Podar CSS morto

Só depois da Etapa 1 estar verde.

- Levante o CSS não utilizado. Não confie numa fonte só: cruze uma análise
  estática (varrer os `.html` **e os `.js`** por nomes de classe) com a
  cobertura em runtime. Atenção: há ~292 ocorrências de `class="` dentro de
  template strings em JS e ~318 manipulações de `classList`/`className` —
  classes montadas dinamicamente não aparecem em varredura ingênua.
- Me apresente a lista de candidatos a remoção **antes de remover**,
  separada em: (a) alta confiança, (b) duvidosos, com o motivo da dúvida.
- Preste atenção especial aos tokens legados descritos no cabeçalho de
  `css/variables.css` (`--verde`, `--borda`, e a paleta `--cemig-green`,
  `--ink`, `--line`). O comentário diz que são resquício de migração; vale
  verificar quais ainda têm consumidor real.
- Remova em commits pequenos e temáticos, rodando os testes visuais a cada
  um. Um commit gigante de remoção é impossível de bissectar.

Critério de aceite: testes visuais verdes após cada commit, e um resumo de
quantas linhas saíram de cada arquivo.

### Etapa 3 — Organizar `shared.css` com `@layer` nativas

`shared.css` tem ~3.442 linhas e ~456 regras. O objetivo é tornar a cascata
explícita e o arquivo navegável — **não** quebrá-lo em vários arquivos (isso
multiplicaria requests, já que não há bundler).

- Use `@layer` nativa do CSS. Declare a ordem uma vez no topo.
- Proposta de camadas, ajuste se o conteúdo pedir outra coisa:
  `reset, tokens, base, componentes, utilitarios, overrides`
- Isso deve ser **reorganização, não reescrita**. O CSS computado final
  precisa ser idêntico. Os testes visuais da Etapa 1 são o árbitro disso.
- Cuidado: `@layer` muda precedência. Regras que hoje vencem por ordem de
  aparição podem passar a perder. Se algo precisar de ajuste de
  especificidade, ajuste — mas me diga o quê e por quê.
- Atenção aos 113 usos de `:has()` e aos 5 blocos `@media print`; nenhum
  deles pode mudar de comportamento.

Critério de aceite: testes visuais verdes sem atualizar nenhuma baseline, e
um índice comentado no topo do arquivo dizendo o que vive em cada camada.

### Etapa 4 — Fazer valer a regra anti-duplicação

`docs/css-architecture.md` já proíbe duplicar em `formulario-*.css` uma regra
que pertence ao `shared.css`. A regra existe; o que falta é aplicá-la.

- Audite os 6 `formulario-*.css` contra o `shared.css` e liste as violações
  concretas. Note que `formulario-microgd.css` e `formulario-minigd.css`
  têm 913 linhas cada — provável duplicação quase integral entre os dois.
- Para cada violação, classifique: (a) cópia redundante → remover; (b)
  divergência real → decidir se o shared absorve a variação (ex.: como
  modificador, no padrão de `.cmg-aviso--warn`) ou se é exceção legítima; (c)
  exclusivo daquele formulário → manter local e **adicionar o comentário
  justificando**, como o item 3 do doc exige.
- Se micro e mini forem de fato quase idênticos, proponha a consolidação
  antes de executá-la — é a mudança de maior impacto e quero decidir o
  desenho.
- Ao final, atualize `docs/css-architecture.md` se algo que você aprendeu
  contradizer o que está escrito lá.

Critério de aceite: testes visuais verdes, e um relatório do que foi
consolidado, do que virou modificador e do que ficou como exceção
documentada.

### Regras gerais

- Não introduza framework CSS, pré-processador ou bundler.
- Não altere markup HTML/JS a não ser que uma etapa exija — e se exigir,
  avise antes.
- Rode os testes visuais antes de cada commit, não só no fim.
- Se em qualquer ponto os testes ficarem vermelhos e a causa não for óbvia,
  pare e me mostre o diff visual em vez de tentar consertar às cegas.

---

## Contexto do levantamento

Números da auditoria de 2026-07-28, para calibrar expectativa. Reconfirme
antes de usar como base — o código pode ter mudado.

| Arquivo | Linhas | Regras (aprox.) |
|---|---:|---:|
| `css/shared.css` | 3.442 | 456 |
| `css/formulario-microgd.css` | 913 | 177 |
| `css/formulario-minigd.css` | 913 | 177 |
| `css/formulario-bt.css` | 769 | 151 |
| `css/formulario-mt.css` | 554 | 73 |
| `css/homepage.css` | 279 | 39 |
| `css/variables.css` | 156 | 1 |
| `css/formulario-loteamento.css` | 154 | 22 |
| `css/formulario-desistencia.css` | 146 | 23 |
| **Total** | **7.326** | — |

Outros fatos relevantes:

- **Sem build step.** Nenhum `package.json`, `node_modules` ou CI no
  repositório. HTML estático com libs via CDN (jsPDF, Leaflet, Turf).
- **Duas raízes de superfície:** `.cemig-form` (BT/Micro/Mini) e `.cemig-mt`
  (MT/Loteamento/Desistência). Ver `docs/css-architecture.md`.
- **113 usos de `:has()`** em `shared.css`, incluindo cadeias longas de
  `:not(:has(...))` que implementam label flutuante e estado de validação.
  São lógica, não decoração.
- **39 blocos `@media`**, dos quais **5 são `@media print`** — os
  formulários geram PDF/impressão.
- **~292 `class="` dentro de JS** e **~318 `classList`/`className`**: boa
  parte do markup é gerada por template string.
- Estados dinâmicos observados em `shared.css`: `.is-ativo`, `.is-collapsed`,
  `.is-invalid`, `.is-locked`, `.is-open`, `.is-toggle`, `.active`.

## Por que não Tailwind

Registro da decisão, para não reabrir a discussão sem fato novo. Migrar para
Tailwind exigiria build step onde hoje não há nenhum; quebraria silenciosamente
nas classes montadas dinamicamente em JS; não expressa os 113 `:has()`
estruturais sem empurrar essa lógica para o JavaScript; e, como o markup está
duplicado em 44 HTMLs em vez de componentizado, duplicaria o estilo junto em
vez de centralizá-lo — invalidando a convenção de fonte única já documentada
em `docs/css-architecture.md`.
