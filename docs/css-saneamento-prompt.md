# Prompt — Saneamento do CSS (sem migrar para Tailwind)

> Cole o conteúdo da seção "PROMPT" abaixo numa sessão nova do Claude Code,
> na raiz do repositório. As seções seguintes são contexto de apoio: o
> levantamento que motivou o trabalho e o critério de aceite de cada etapa.

---

## PROMPT

Quero sanear o CSS deste projeto **sem migrar para Tailwind** e **sem
introduzir build step**. São quatro frentes, nesta ordem — a ordem importa,
porque podar o CSS morto antes reduz o volume que as etapas seguintes têm de
reorganizar e auditar, e deduplicar dentro do `shared.css` antes de auditar os
`formulario-*.css` evita consolidar uma regra que ainda vai mudar.

Leia `docs/css-architecture.md` antes de começar: ele é a convenção vigente do
projeto e nada aqui pode violá-lo. Leia também a seção "Contexto do
levantamento" em `docs/css-saneamento-prompt.md`, que tem os números da
auditoria inicial.

Trate cada etapa como entregável independente, com commit próprio. Se uma
etapa travar, conclua as outras e me diga explicitamente o que ficou de fora
e por quê.

### Etapa 1 — Podar CSS morto

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
- Remova em commits pequenos e temáticos. Um commit gigante de remoção é
  impossível de bissectar.
- Confira à mão, no navegador, as páginas afetadas por cada commit — sem
  suíte de regressão visual, a verificação é manual e precisa ser feita.

Critério de aceite: um resumo de quantas linhas saíram de cada arquivo e das
páginas conferidas a cada commit.

### Etapa 2 — Organizar `shared.css` com `@layer` nativas

`shared.css` tem ~3.442 linhas e ~456 regras. O objetivo é tornar a cascata
explícita e o arquivo navegável — **não** quebrá-lo em vários arquivos (isso
multiplicaria requests, já que não há bundler).

- Use `@layer` nativa do CSS. Declare a ordem uma vez no topo.
- Proposta de camadas, ajuste se o conteúdo pedir outra coisa:
  `reset, tokens, base, componentes, utilitarios, overrides`
- Isso deve ser **reorganização, não reescrita**. O CSS computado final
  precisa ser idêntico.
- Cuidado: `@layer` muda precedência. Regras que hoje vencem por ordem de
  aparição podem passar a perder. Se algo precisar de ajuste de
  especificidade, ajuste — mas me diga o quê e por quê.
- Atenção aos 113 usos de `:has()` e aos 5 blocos `@media print`; nenhum
  deles pode mudar de comportamento.

Critério de aceite: um índice comentado no topo do arquivo dizendo o que vive
em cada camada, e a conferência manual de que nada mudou visualmente.

### Etapa 3 — Deduplicar o `shared.css` internamente

A regra anti-duplicação do `docs/css-architecture.md` fala de `shared.css` vs
`formulario-*.css`. Mas há duplicação **dentro do próprio `shared.css`**:
seletores diferentes com corpos idênticos ou quase idênticos, que já começaram
a divergir.

Levantamento inicial (reconfirme — o arquivo tem ~3.677 linhas hoje): **9
corpos de regra idênticos** repetidos em 2+ seletores e **10 pares com ≥70% das
declarações em comum**. Casos concretos:

| Duplicata | Declarações | Observação |
|---|---:|---|
| `.cmg-pav-cel select` ↔ `.cmg-replic-campo select` | 17 (idênticas) | cópia verbatim, inclui o SVG da seta em `data:` URI |
| `.cmg-pav-tabela` ↔ `.cmg-replic-lista` | 4 (idênticas) | mesma caixa de tabela |
| `.cmg-pav-cel input:focus` / `select:focus` / `.cmg-replic-campo select:focus` | 2 (idênticas) | mesmo anel de foco, 3 vezes |
| `.previa-card` ↔ `.resultado-card` | 4 (idênticas) | `.previa-*` espelha `.resultado-*` |
| `.previa-card-label` ↔ `.resultado-card-label` | 5 (idênticas) | idem |
| `.previa-card-valor` ↔ `.resultado-card-valor` | 6 de 8 | **já divergiu** — decidir qual é a correta |
| `.modalidade-head p` ↔ `.form-header p` | 6 (idênticas) | título/subtítulo de página |
| `.modalidade-head h1` ↔ `.form-header h1` | 5 de 6 | **já divergiu** |
| `.uc-head-eyebrow` ↔ `.section-eyebrow` | 5 de 7 | mesmo eyebrow |
| `.previa-torre-head`, `.previa-tabela-disj`, `.uc-block-actions`, `.mapa-legenda-item` | 3 (idênticas) | `flex` + `align-items` + `gap` repetido 4× |

O que fazer:

- Levante os corpos idênticos e quase idênticos (≥70% de declarações comuns) de
  forma sistemática, não a olho — o levantamento acima é ponto de partida, não
  lista fechada.
- Para cada caso, escolha **uma** saída e me diga qual:
  (a) **agrupar seletores** numa definição só (`.previa-card, .resultado-card {…}`)
  quando forem de fato o mesmo componente;
  (b) **promover a componente canônico** com nome próprio, quando o conceito se
  repete em contextos diferentes (o caso da caixa de tabela dos modais e do
  `<select>` da célula);
  (c) **manter separado**, se a coincidência for acidental e os componentes
  puderem divergir de propósito — com comentário dizendo isso.
- Onde os pares **já divergiram** (`.previa-card-valor`, `.modalidade-head h1`),
  a divergência pode ser bug ou intenção. Não unifique sem decidir: me mostre a
  diferença e qual valor deve prevalecer.
- Atenção ao par `.cmg-pav-*` / `.cmg-replic-*`: os modais "Composição por
  pavimento", "Replicar dados" e "Replicar dados das unidades" compartilham
  casca (`.cmg-modal*`) mas repetem os internos. É o candidato mais claro a
  componente canônico.
- Cuidado com o que **parece** duplicado e não é: regras dentro de `@media`
  diferentes, e os pares de label flutuante com `:has()`/`:not()`, que têm
  seletores longos e parecidos mas estados distintos.

Critério de aceite: um resumo de quantas linhas saíram, a lista do que virou
seletor agrupado, do que virou componente canônico e do que ficou separado de
propósito — e, para cada divergência encontrada, qual valor prevaleceu e por quê.

### Etapa 4 — Fazer valer a regra anti-duplicação

`docs/css-architecture.md` já proíbe duplicar em `formulario-*.css` uma regra
que pertence ao `shared.css`. A regra existe; o que falta é aplicá-la.

- Audite os 6 `formulario-*.css` contra o `shared.css` e liste as violações
  concretas. Note que `formulario-microgd.css` e `formulario-minigd.css` têm
  909 linhas cada e **diferem em apenas 4 linhas** (`diff` de 2026-08-03) —
  é duplicação quase integral confirmada, não suspeita.
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

Critério de aceite: um relatório do que foi consolidado, do que virou
modificador e do que ficou como exceção documentada.

### Regras gerais

- Não introduza framework CSS, pré-processador ou bundler.
- **Não há suíte de regressão visual neste repositório** (nem `package.json`,
  nem CI). A verificação é manual: abra no navegador as páginas afetadas
  antes de cada commit, não só no fim.
- Não altere markup HTML/JS a não ser que uma etapa exija — e se exigir,
  avise antes.
- Como não há rede de segurança automatizada, prefira commits pequenos e
  reversíveis. Se algo quebrar e a causa não for óbvia, pare e me mostre o
  que mudou em vez de tentar consertar às cegas.

---

## Contexto do levantamento

Números recontados em **2026-08-03** (a auditoria original é de 2026-07-28 e
já estava defasada — `shared.css` passou de 3.442 para 3.677 linhas e o MT de
554 para 834). Reconfirme antes de usar como base — o código continua mudando.

| Arquivo | Linhas | Regras (aprox.) |
|---|---:|---:|
| `css/shared.css` | 3.677 | 486 |
| `css/formulario-microgd.css` | 909 | 104 |
| `css/formulario-minigd.css` | 909 | 104 |
| `css/formulario-mt.css` | 834 | 109 |
| `css/formulario-bt.css` | 769 | 92 |
| `css/homepage.css` | 279 | 33 |
| `css/variables.css` | 160 | 1 |
| `css/formulario-loteamento.css` | 154 | 22 |
| `css/formulario-desistencia.css` | 146 | 23 |
| **Total** | **7.837** | — |

Outros fatos relevantes:

- **Sem build step.** Nenhum `package.json`, `node_modules` ou CI no
  repositório. HTML estático com libs via CDN (jsPDF, Leaflet, Turf).
- **Raiz de superfície única:** `.cemig-form`. Todos os formulários (BT, Micro,
  Mini, MT, Loteamento, Desistência) ficam sob ela, cada um com um modificador
  de página (`.cemig-mtform`, `.cemig-lote`, `.cemig-desist`, …). O shell
  `.cemig-mt` foi removido. Ver `docs/css-architecture.md`.
- **Duplicação interna ao `shared.css`** (medida em 2026-08-03, com o arquivo
  em 3.677 linhas): 9 corpos de regra idênticos repetidos em 2+ seletores e 10
  pares com ≥70% de declarações em comum — ~55 linhas redundantes só nos 12
  maiores blocos. Ver Etapa 3.
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
