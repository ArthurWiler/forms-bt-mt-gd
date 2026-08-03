# Arquitetura de CSS — Convenção do projeto

> Regra permanente. Vale para todos os formulários (BT, Micro, Mini, MT,
> Loteamento, Desistência) e qualquer módulo novo.

## Regra de arquitetura CSS — fonte única no `shared.css`

1. **Estilos compartilhados entre formulários DEVEM viver em
   [`css/shared.css`](../css/shared.css) como única fonte da verdade.** O ponto
   de partida é o escopo `.cemig-form` (o shell canônico, definido pelo BT).

2. **É PROIBIDO duplicar ou sobrescrever, em `css/formulario-*.css`, uma regra
   que já exista (ou deveria existir) no `shared.css`.** Cópias locais que só
   reafirmam ou divergem do shared geram drift — os componentes deixam de ser
   idênticos entre si.

3. **Um estilo só pode viver localmente em `formulario-*.css` quando o elemento
   for exclusivo daquele formulário** (não compartilhado com nenhum outro). Se
   for o caso, mantenha a regra local e deixe claro, em comentário, por que ela
   é exclusiva.

4. **Componentes de UI compartilhados seguem nomenclatura canônica única.** Não
   crie nomes alternativos para o mesmo conceito.

   | Componente | Classe canônica | Não use |
   |---|---|---|
   | Passo da trilha (linha) | `.vstep` | ~~`.step`~~ |
   | Número do passo | `.vstep-num` | ~~`.num`~~ |
   | Rótulo do passo | `.vstep-label` | rótulo solto no `.vstep` |
   | Volta ao portal (logo da topbar) | `.logo-link` | ~~`.form-back`~~ (botão VOLTAR removido) |
   | Lista numerada de orientações | `.orient-list` / `.orient-num` | ~~`.bullet`~~ |
   | Aviso informativo (banner com ícone + texto) | `.cmg-aviso` / `.cmg-aviso-icon` / `.cmg-aviso-texto` | ~~`.modalidade-aviso`~~, ~~`.callout`~~ |
   | Aviso de alerta (variante do banner) | `.cmg-aviso--warn` (modificador sobre `.cmg-aviso`) | classe de aviso duplicada |

   `.cmg-aviso` é o banner informativo canônico (coluna de ícone `info.png`
   sobre fundo neutra/200 + texto Open Sans 14/24 em fundo branco). É definido
   **uma única vez** no `shared.css` e, como `.cmg-container`, é **global
   (sem escopo de raiz)** — vale na home (`.cemig-portal`/`.modalidade-screen`)
   e dentro dos formulários (`.cemig-form`). A caixa **cresce com o conteúdo**:
   paddings fixos, sem largura nem altura fixas (as alturas 74px/98px do Figma
   são só efeito de 2 vs 3 linhas de texto). Substituiu os antigos
   `.modalidade-aviso*` e os usos de `.callout` em BT. Markup:
   `<div class="cmg-aviso"><div class="cmg-aviso-icon"></div><p class="cmg-aviso-texto">…</p></div>`.
   Os ícones são **SVG** (`info.svg` / `warn.svg`, `viewBox="0 0 32 32"`, cor
   neutra/600) carregados via `background-image` — vetor, sem perda de
   resolução. `.cmg-aviso--warn` é a variante de alerta canônica: um
   **modificador** que só troca a cor da borda e do fundo do ícone para
   alerta/500 (`#FFC107`) e o glifo para `warn.svg`, reusando todo o resto da
   base — não é uma classe duplicada. Markup:
   `<div class="cmg-aviso cmg-aviso--warn">…</div>`.

5. **Antes de adicionar qualquer regra a um `formulario-*.css`, verifique se ela
   pertence ao `shared.css`.** Na dúvida (o elemento aparece em mais de um
   formulário?), ela pertence ao shared.

## Regra de markup — HTML primeiro, JS por exceção

**A regra é escrever markup em `.html`.** Gerar HTML por JavaScript
(`innerHTML`, template strings, `createElement`) é a **exceção**, permitida
apenas quando fazer em `.html` for **impossível** ou exigir **esforço
desproporcional / solução complicada**.

Por que isso é uma regra de arquitetura de CSS, e não só de estilo de código:
markup gerado em JS é **invisível** para varredura estática de classes. É o que
torna a poda de CSS morto arriscada (as classes não aparecem em busca ingênua) e
o que faz o estilo derivar sem ninguém perceber — ver
[`css-saneamento-prompt.md`](css-saneamento-prompt.md).

**Fica em `.html`:**

- Estrutura de etapa/card, campos e rótulos, textos fixos.
- Blocos condicionais cuja alternância é só de visibilidade: escreva os dois
  estados no HTML e alterne com classe/atributo (é o padrão dos avisos
  `#prontoSimAviso` / `#prontoNaoAviso`), em vez de montar o bloco no JS.

**Pode ficar em `.js` (exceção justificada, sempre com comentário dizendo por
quê):**

- Listas de tamanho dinâmico, dirigidas por dado que só existe em runtime
  (cards de torre/unidade, paginação, opções de `<select>` calculadas).
- Diálogos montados sob demanda no `<body>` (padrão `.cmg-modal`).
- Estados que dependem de cálculo (resultados, KPIs, mensagens de validação).

Quando o JS for inevitável, **use as classes canônicas do `shared.css`** — não
invente nome novo nem escreva estilo inline no elemento criado. E prefira
`document.createElement` + `textContent` a template strings com `class="…"`
concatenado: além de ser mais seguro contra injeção quando o valor vem do
usuário, mantém os nomes de classe rastreáveis em busca textual.

## `.cemig-form` é o shell ÚNICO — o shared alcança só ele

Existe **uma única raiz de superfície de formulário**: **`.cemig-form`**. Todos
os formulários — BT, Microgeração, Minigeração, MT, Loteamento e Desistência —
ficam sob ela. O antigo shell `.cemig-mt` foi **removido** na migração; nenhum
formulário usa mais esse escopo.

Cada formulário adiciona um **modificador de página** ao lado do shell, e nunca
uma segunda raiz:

```html
<body class="cemig-form cemig-mtform">   <!-- MT -->
<body class="cemig-form cemig-lote">     <!-- Loteamento -->
<body class="cemig-form cemig-desist">   <!-- Desistência -->
<body class="cemig-form cemig-microgd">  <!-- Microgeração -->
<body class="cemig-form cemig-minigd">   <!-- Minigeração -->
<body class="cemig-form">                <!-- BT -->
```

Portanto, no `shared.css` **um componente compartilhado é escrito uma única vez,
escopado em `.cemig-form`** — sem seletores agrupados por shell, porque não há
segundo shell a alcançar:

```css
/* CERTO — uma definição, um shell */
.cemig-form .vstep-num {
  /* … */
}
```

```css
/* ERRADO — raiz que não existe mais */
.cemig-form .vstep-num,
.cemig-mt   .vstep-num { /* … */ }

/* ERRADO — duplicação que vai derivar com o tempo */
/* shared.css */        .cemig-form .vstep-num { /* … */ }
/* formulario-mt.css */ .step .num             { /* … */ }
```

**Não crie novas raízes de superfície.** Se um formulário precisar de algo
próprio, use o modificador de página (`.cemig-form.cemig-mtform …`) ou o
`formulario-*.css` daquela página — nunca um shell paralelo.

> `.cmg-container` e `.cmg-aviso` são as exceções conhecidas: são **globais (sem
> escopo de raiz)** de propósito, porque valem também na home
> (`.cemig-portal` / `.modalidade-screen`), que não é um formulário.

### Exceções legítimas (documente sempre)

Diferenças de **mecanismo** (não de estilo) são aceitáveis, ficam escopadas ao
modificador da página e levam comentário justificando. O **visual tem de ser
idêntico**; só a entrega difere. Quando a diferença for só "aqui o valor vem do
JS e ali é estático", prefira alinhar o markup a criar uma exceção.
