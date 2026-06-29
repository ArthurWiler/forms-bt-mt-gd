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
   | Botão voltar | `.form-back` | — |
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

## Como o shared alcança os dois shells (`.cemig-form` e `.cemig-mt`)

Existem **duas raízes de superfície** distintas:

- **`.cemig-form`** — shell React de BT / Microgeração / Minigeração.
- **`.cemig-mt`** — shell estático de MT / Loteamento / Desistência.

Os formulários MT **não** ficam sob `.cemig-form`. Por isso, um componente
compartilhado que precise valer nos dois shells é definido **uma única vez**, no
`shared.css`, com **seletores agrupados** cobrindo as duas raízes — e não
duplicado:

```css
/* CERTO — uma definição, dois shells */
.cemig-form .vstep-num,
.cemig-mt   .vstep-num {
  /* … */
}
```

```css
/* ERRADO — duplicação que vai derivar com o tempo */
/* shared.css */      .cemig-form .vstep-num { /* … */ }
/* formulario-mt.css */ .step .num            { /* … */ }
```

Não adicione `.cemig-form` ao `<body class="cemig-mt">` para "alcançar" a regra:
isso importaria toda a camada do shell de formulário (§ `.cemig-form` do
`shared.css`) sobre o MT e colidiria com a camada `.cemig-mt`.

### Exceções legítimas (documente sempre)

Diferenças de **mecanismo** (não de estilo) são aceitáveis e ficam escopadas à
sua raiz, com comentário justificando. Exemplo real: o "concluído" (✓) do passo.
Nos forms React (`.cemig-form`) o texto do número é trocado por `✓` via JS; no
MT (`.cemig-mt`), como o número é HTML estático, o `✓` é renderizado por CSS
(`.cemig-mt .vstep.done .vstep-num::after`). O **visual é idêntico**; só a
entrega difere.
