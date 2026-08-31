# Plano — Empacotamento (bundle + minify) dos formulários

> Levantamento feito em 13/08/2026 sobre o estado atual do repositório.
> Escopo: empacotar o JS servido, **sem** converter o código para módulos ES.

## Objetivo

Reduzir as 21–24 requisições de script por página a **um arquivo por formulário**,
minificado, sem os comentários de desenvolvimento e sem expor a estrutura de pastas
do projeto.

### O que este plano **não** resolve

Empacotar **não é controle de segurança**. O bundle continua inteiro e legível em
DevTools → Sources (o *pretty print* reformata em um clique), breakpoints continuam
funcionando, e o *Local Overrides* permite servir uma cópia adulterada.

Contra o risco de um usuário burlar uma regra e emitir PDF fora da norma, o que vale é
**recalcular no servidor** — viável quando a aplicação for internalizada na CEMIG.
Este plano é sobre desempenho e higiene de entrega, não sobre isso.

---

## Levantamento

| Métrica | Valor |
|---|---|
| Arquivos JS | 49 (30.173 linhas, 1,4 MB) |
| Páginas (entry points) | 8 |
| Scripts externos por página | 21–24 (BT, MT, GD) · 2–5 (portal, desistência, loteamento) |
| Peso JS por página | micro 629 KB · bt/individual 404 KB · mt 380 KB |
| Declarações de topo | 1.111 |
| **Colisões de nome dentro de uma mesma página** | **0** |
| Nomes chamados por handler inline no HTML | 87 |
| Nomes lidos via `window.X` | ~8 |
| `window.X =` já existentes | 23 |
| Ferramentas disponíveis | Node 24.11.1 · npm 11.6.2 · Python 3.11.5 |

Não há React nem Babel em nenhuma página — o README está desatualizado nesse ponto e
deve ser corrigido ao final (ver E7).

---

## Estratégia

Os 49 arquivos são scripts globais que se enxergam por escopo compartilhado — não há
`import`/`export` em lugar nenhum. Portanto **não se usa `--bundle`**: concatena-se na
ordem das tags `<script>` e envolve-se tudo num único IIFE.

Isso é seguro porque **não existe colisão de nome dentro de nenhuma página** (medido).
O escopo de função do IIFE preserva a visibilidade mútua que hoje vem do escopo global;
o que se perde é o acesso externo, restaurado pela lista de exposição.

```js
(function () {
  /* ... os N arquivos da página, concatenados na ordem atual ... */
  Object.assign(window, { onCepBT, onCoordBT, initFormulario, /* ~110 nomes */ });
})();
```

A lista de exposição é gerada automaticamente a partir do HTML — não é escrita à mão.

---

## Etapas

### E0 · Preparação

- [ ] `npm init -y` e `npm i -D esbuild` (primeiro `package.json` do projeto)
- [ ] Criar `build/` (scripts de build) e `dist/` (saída)
- [ ] Acrescentar `dist/` e `node_modules/` ao `.gitignore`
- [ ] Decidir se `dist/` é versionado — **recomendado versionar** enquanto o deploy for
      cópia de arquivos estáticos, para não exigir Node no servidor

### E1 · Extrair a ordem dos scripts por página

- [ ] Script que lê cada entry point, captura os `<script defer src="...">` **na ordem**
      e resolve os caminhos relativos
- [ ] Saída: um manifesto (`build/manifest.json`) com a lista de arquivos por página
- [ ] Gerar a partir do HTML, nunca manter a lista escrita à mão — ela desatualiza

### E2 · Gerar a lista de exposição

Três origens, todas mecânicas:

- [ ] **Handlers inline** (87 nomes) — varrer `on(click|change|input|submit|blur|focus|keyup|keydown)="nome(...)"` nos `*.html`, inclusive nos fragmentos de `bt/etapas/`
- [ ] **Leituras `window.X`** (~8) — `CemigMarcadores`, `state`, `initFormulario`, `onPaginaAtiva`, `cmgMesAnoAoEscolher`, entre outros
- [ ] **Atribuições `window.X =` já existentes** (23) — preservar todas
- [ ] Excluir globais de terceiros (`L`, `turf`, `jspdf`) — vêm do CDN, não do bundle
- [ ] Filtrar a lista final contra os nomes realmente declarados na página, para não
      gerar `ReferenceError` ao montar o `Object.assign`

### E3 · Piloto: `bt/individual.html`

A página mais complexa — 22 scripts, 16 etapas. Se ela passar, as outras são repetição.

- [ ] Concatenar na ordem do manifesto
- [ ] Envolver no IIFE + bloco de exposição
- [ ] `esbuild dist/individual.js --minify --sourcemap=false --outfile=dist/individual.min.js`
- [ ] Trocar as 22 tags por uma só, **preservando o `defer`**
- [ ] Registrar o antes/depois (KB e nº de requisições)

### E4 · Validar o piloto

- [ ] Percorrer as 16 etapas com o console aberto — zero erro
- [ ] Executar o checklist funcional (abaixo)
- [ ] Revisar os 71 `typeof` espalhados por 18 arquivos: separar checagem de tipo comum
      (inofensiva) de *guard* de existência de global (pode mudar de comportamento
      dentro do IIFE)
- [ ] Conferir que nenhum handler inline quebrou — o console acusa
      `ReferenceError: nome is not defined` no clique

### E5 · Replicar nas 7 páginas restantes

Ordem sugerida, da menor para a maior, deixando as complexas por último:

- [ ] `index.html` (3 scripts) · `desistencia/` (2) · `loteamento/` (5)
- [ ] `mt/` (15) · `minigeracao/` (18)
- [ ] `bt/index.html` (21) · `microgeracao/` (24)

### E6 · Internalizar as bibliotecas de terceiros

Leaflet, Turf e jsPDF vêm de `unpkg` e `cdnjs` via [`shared/js/libs.js`](shared/js/libs.js).
Rede interna CEMIG provavelmente bloqueia CDN externo.

- [ ] Baixar as três libs para `vendor/` (fixando as versões atuais: Leaflet 1.9.4,
      Turf 6, jsPDF 2.5.1)
- [ ] Trocar as constantes de URL em `libs.js` por caminhos locais
- [ ] Preservar o carregamento sob demanda e a memoização por Promise — o mecanismo
      atual está correto e não deve ser simplificado junto
- [ ] Testar o mapa (etapa de localização) e a geração de PDF em cada formulário

### E7 · Integrar ao deploy

- [ ] Documentar o comando de build no README
- [ ] Corrigir o README: não há mais React/Babel; descrever o passo de build
- [ ] Definir a política — build no deploy, ou `dist/` versionado
- [ ] Garantir `--sourcemap=false` na saída de produção

---

## Pontos de atenção

**Scripts inline devem continuar inline e continuar primeiro.**
`bt/index.html` tem 2 e `index.html` tem 1. Os do BT fazem *pruning* do superset de
etapas antes de qualquer script externo, justamente para evitar o flash da sidebar sendo
podada. Dobrá-los no bundle quebra esse propósito — o bundle carrega com `defer`, tarde
demais.

**A ordem de concatenação é a ordem das tags.** Não alfabética, não por pasta. Um
arquivo que hoje depende de outro já ter sido avaliado continua dependendo.

**Atribuição implícita a global** (variável sem declaração) continua funcionando dentro
do IIFE — vira global de verdade. Não é problema, mas vale identificar se existe.

**Fragmentos de etapa não são afetados.** O [`shared/js/etapas-loader.js`](shared/js/etapas-loader.js)
busca os `*.html` por `fetch` em caminho relativo; isso não muda. Mas ele chama
`window.initFormulario()` — esse nome **tem** que estar na lista de exposição.

**Não minificar HTML nem CSS neste plano.** Escopo é só JS; misturar aumenta a
superfície de regressão sem necessidade.

---

## Checklist funcional por formulário

Rodar em cada uma das 8 páginas após o empacotamento:

- [ ] Carrega sem erro no console, da primeira etapa à última
- [ ] Máscaras: CPF/CNPJ, telefone, CEP, RG, instalação/UC
- [ ] Busca automática de CEP (ViaCEP) e de CNPJ (BrasilAPI)
- [ ] Mapa abre, marca coordenada e a consulta ambiental responde
- [ ] Cálculos: demanda, dimensionamento de disjuntor, validações da ND-5.2
- [ ] Navegação entre etapas, ida e volta, com estado preservado
- [ ] Prévia reflete o preenchimento
- [ ] PDF gera e sai correto — `doc.save()` em todos; o BT baixa o documento
      HTML desenhado por `shared/js/pdf-render.js`, os demais ainda desenham
      direto no jsPDF (ou imprimem, nos casos de loteamento e desistência)
- [ ] Termos e anexos auxiliares (Termo Grupo B, Anexo II, carta monomia)
- [ ] Campos condicionais aparecem/somem conforme as regras

---

## Estimativa

| Fase | Esforço |
|---|---|
| E0–E2 (build + manifesto + exposição) | ~meio dia |
| E3–E4 (piloto e validação) | ~meio dia |
| E5 (7 páginas restantes) | ~meio dia |
| E6 (libs locais) | ~2 horas |
| E7 (deploy e README) | ~2 horas |
| **Total** | **1 a 2 dias**, sendo o teste o grosso |

### Retorno esperado

- 21–24 requisições → 1 por página
- Peso servido em torno da metade (comentários e espaços fora)
- Estrutura de pastas e nomes de arquivo não aparecem mais no DevTools

Os nomes das ~110 funções expostas **continuam legíveis** — são a API que o HTML chama.
Embaralhá-los exigiria converter os 49 arquivos para módulos ES e reescrever os 87
handlers inline como `addEventListener`: 1 a 2 semanas, com risco de regressão real, e
sem ganho de segurança (ver a seção de objetivo). Fica como refatoração futura,
justificada por engenharia — dependências explícitas, testabilidade, fim da sopa de
1.111 globais — e não por ocultação.
