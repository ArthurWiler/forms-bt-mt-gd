# Handoffs — o que colar em cada chat

Um chat novo por etapa, na raiz do repositório. Cada bloco abaixo é
**autossuficiente**: copie do `---` de abertura ao `---` de fechamento e cole
como primeira mensagem da sessão. Não precisa colar mais nada.

Por que uma etapa por chat, e não tudo de uma vez:

- O próprio prompt manda tratar cada etapa como entregável independente, com
  commit próprio.
- A Etapa 1 exige que **você aprove a lista de remoção** no meio do caminho —
  é uma fronteira natural de sessão.
- Não há suíte de regressão visual: a conferência é manual, e só funciona se
  o lote for pequeno.
- Sessão longa acumula contexto e desvia; sessão nova relê as convenções do
  zero, que é justamente o motivo de elas estarem escritas.

Depois de cada etapa, opcionalmente rode `/code-review` sobre o diff antes de
commitar. (`/code-review` só funciona se **você** digitar — o modelo não
consegue acioná-lo.)

---

## Chat 1 — Podar CSS morto

```text
Leia docs/css-architecture.md (convenção vigente — nada pode violá-la) e a
seção "Contexto do levantamento" de docs/css-saneamento-prompt.md.

Execute APENAS a Etapa 1 (Podar CSS morto) de docs/css-saneamento-prompt.md.
Não avance para as etapas seguintes.

Contexto que muda a abordagem: não existe suíte de regressão visual neste
repositório (sem package.json, sem CI) e não é para criar uma. A verificação é
manual, no navegador, nas páginas afetadas por cada commit.

Atenção especial: há 460 ocorrências de class=" em template strings de JS e
385 manipulações de classList/className — só mt/js/app.js tem 167. Classe
montada dinamicamente não aparece em varredura ingênua, então cruze análise
estática (.html E .js) com cobertura em runtime antes de dar qualquer classe
como morta.

Pare e me mostre a lista de candidatos a remoção, separada em (a) alta
confiança e (b) duvidosos com o motivo da dúvida, ANTES de remover qualquer
coisa. Depois da minha aprovação, remova em commits pequenos e temáticos.
```

---

## Chat 2 — Organizar `shared.css` com `@layer`

```text
Leia docs/css-architecture.md e a seção "Contexto do levantamento" de
docs/css-saneamento-prompt.md.

Execute APENAS a Etapa 2 (Organizar shared.css com @layer nativas) de
docs/css-saneamento-prompt.md. Não avance para as etapas seguintes.

Isto é REORGANIZAÇÃO, NÃO REESCRITA: o CSS computado final tem de ser
idêntico. Não há suíte de regressão visual para arbitrar isso — a conferência
é manual, no navegador, então trabalhe em passos pequenos e verificáveis.

Riscos a tratar explicitamente: @layer muda precedência, e regras que hoje
vencem por ordem de aparição podem passar a perder. São 113 usos de :has() no
css/ (78 deles em shared.css) e 5 blocos @media print (2 em shared.css, os
outros em formulario-mt/loteamento/desistencia) — nenhum pode mudar de
comportamento, e os formulários geram PDF/impressão, então teste isso.
Se precisar ajustar especificidade, me diga o quê e por quê antes de aplicar.
```

---

## Chat 3 — Deduplicar o `shared.css` internamente

```text
Leia docs/css-architecture.md e a seção "Contexto do levantamento" de
docs/css-saneamento-prompt.md.

Execute APENAS a Etapa 3 (Deduplicar o shared.css internamente) de
docs/css-saneamento-prompt.md. Não avance para a etapa seguinte.

A tabela de duplicatas na Etapa 3 é ponto de partida medido, não lista
fechada: refaça o levantamento de forma sistemática (corpos idênticos e pares
com >=70% de declarações em comum) antes de decidir qualquer coisa.

Dois pontos que exigem decisão minha, não sua:
1. Onde os pares JÁ divergiram (.previa-card-valor 6 de 8 declarações comuns,
   .modalidade-head h1 5 de 6) pode ser bug ou intenção. Me mostre a diferença
   e proponha qual valor prevalece — não unifique sozinho.
2. Antes de promover qualquer coisa a componente canônico novo, me apresente o
   desenho (nome da classe e o que ela absorve).

Não confunda com duplicata real: regras em @media diferentes e os pares de
label flutuante com :has()/:not() têm seletores parecidos mas estados
distintos.

Sem suíte de regressão visual — conferência manual no navegador a cada commit.
```

---

## Chat 4 — Fazer valer a regra anti-duplicação

```text
Leia docs/css-architecture.md e a seção "Contexto do levantamento" de
docs/css-saneamento-prompt.md.

Execute APENAS a Etapa 4 (Fazer valer a regra anti-duplicação) de
docs/css-saneamento-prompt.md.

Fato já medido: css/formulario-microgd.css e css/formulario-minigd.css têm 909
linhas cada e diferem em APENAS 2 linhas, ambas comentários de cabeçalho. O
CSS é idêntico na prática. Já os fragmentos HTML dos dois formulários divergem
em 8 dos 10 (203 linhas em 03-dados-uc, 212 em 06-geracao) — então a
consolidação do CSS não implica consolidar o markup.

A consolidação micro/mini é a mudança de maior impacto: me apresente o desenho
PROPOSTO antes de executar. Quero decidir onde o CSS compartilhado vai morar e
como cada formulário mantém o que tem de próprio.

Para cada violação encontrada nos 6 formulario-*.css, classifique em: (a)
cópia redundante -> remover; (b) divergência real -> shared absorve como
modificador (padrão .cmg-aviso--warn) ou é exceção legítima; (c) exclusivo
daquele formulário -> mantém local COM comentário justificando.

Ao final, atualize docs/css-architecture.md se algo que você aprendeu
contradisser o que está escrito lá.

Sem suíte de regressão visual — conferência manual no navegador a cada commit.
```

---

## Não precisa de chat próprio

- **`docs/css-architecture.md`** não é tarefa, é convenção permanente: governa
  edições futuras e não se "aplica" numa passada. A auditoria do código
  existente contra ela já É a Etapa 4.
- **Migração para Tailwind**: decidida contra, e reverificada em 2026-08-03
  (ver "Por que não Tailwind"). Não reabrir sem fato novo.
