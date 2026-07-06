# Portal de Formulários de Conexão — Cemig

Conjunto de aplicações web (React + JSX via Babel no navegador, sem build step) para preenchimento digital dos formulários de solicitação de conexão / acesso à rede da Cemig: **Baixa Tensão (BT)**, **Média Tensão (MT)**, **Loteamentos**, e **Geração Distribuída (Micro e Minigeração)**.

A raiz do projeto (`index.html`) é a **homepage / portal de seleção de modalidades**: a partir dela o usuário é direcionado para o app de Baixa Tensão (`bt/`, com pré-preenchimento via `?mod=`) ou para os demais módulos (MT, Loteamento, GD), cada um publicado em sua própria subpasta.

### Estilos (`css/`)

Todo o CSS vive em [`css/`](css), com **um único ponto de entrada por página** e a identidade visual Cemig centralizada:

```
css/
├── variables.css              Tokens de design (cores, tipografia, espaçamento, …)
├── shared.css                 Identidade Cemig compartilhada (header, footer, botões,
│                              campos, cards, tabelas, stepper) — escopada por raiz
│                              de superfície (.cemig-portal / .cemig-form / .cemig-mt)
├── homepage.css               Estilos exclusivos da homepage (portal)
├── formulario-bt.css          Estilos exclusivos do formulário BT
├── formulario-mt.css          Estilos exclusivos do MT
├── formulario-loteamento.css  Estilos exclusivos do Loteamento
├── formulario-desistencia.css Estilos exclusivos do Termo de Desistência
├── formulario-microgd.css     Estilos exclusivos da Microgeração
└── formulario-minigd.css      Estilos exclusivos da Minigeração
```

Cada página carrega **somente** `variables.css`, `shared.css` e o seu próprio arquivo de página, nesta ordem.

> **Convenção:** estilos compartilhados entre formulários têm **fonte única** no `shared.css`. Antes de criar/duplicar regra em um `formulario-*.css`, leia [`docs/css-architecture.md`](docs/css-architecture.md).

## Módulos

| Módulo | Pasta | Entrada | Descrição |
|---|---|---|---|
| Homepage / Portal | raiz | `/index.html` | Seletor de modalidades; direciona para o módulo correspondente. |
| Baixa Tensão | [`bt/`](bt) | `/bt/` | Orçamento de conexão / alteração de carga em BT — atendimento individual, coletivo, híbrido, condomínio de torres, gerador de emergência. |
| Média Tensão | [`mt/`](mt) | `/mt/` | Orçamento de conexão em MT (indústria, irrigante, outros estabelecimentos). |
| Loteamento | [`loteamento/`](loteamento) | `/loteamento/` | Solicitação inicial de fornecimento para loteamentos e chacreamentos. |
| Microgeração Distribuída | [`microgeracao/`](microgeracao) | `/microgeracao/` | Solicitação de acesso para microgeração distribuída em BT (REN 1.000/2021). |
| Minigeração Distribuída | [`minigeracao/`](minigeracao) | `/minigeracao/` | Solicitação de acesso para minigeração distribuída em MT (REN 1.000/2021). |

Cada módulo é uma SPA independente (próprio `index.html`, CSS e JS), mas vários compartilham código comum a partir de [`shared/`](shared) (geolocalização/mapa, API de CEP, componentes de UI, cálculo, base de PDF e schema de GD).

## Homepage — seletor de modalidades

A homepage (`index.html`) renderiza o portal reutilizando `MODALIDADES_SECOES` (`bt/js/model.js`) e os componentes de `bt/js/components.js`. Apresenta cards agrupados por seção, nesta ordem:

- **Média Tensão**: indústria, outros estabelecimentos e irrigante — todos `status: "link"` para `mt/` (com `?atividade=` quando aplicável).
- **Geração Distribuída — Minigeração**: minigeração (`minigeracao/`) — `status: "link"`.
- **Geração Distribuída — Microgeração**: microgeração (`microgeracao/`), **Fast Track** (`microgeracao/?modo=fasttrack`) e **Grid Zero** (`microgeracao/?modo=gridzero`) — todos `status: "link"`. Fast Track e Grid Zero abrem o mesmo formulário de microgeração com o campo correspondente pré-preenchido e bloqueado (ver abaixo).
- **Residencial · Comercial · Rural — Baixa Tensão**: casa até 50 m², casa até 100 m², casa > 100 m², comércio, indústria BT, rural — entram no fluxo BT interno, já pré-preenchido conforme o card escolhido (`prefill`).
- **Empreendimentos — Baixa Tensão**: loteamento (`status: "link"` → `loteamento/`), condomínio de torres e atendimento coletivo (fluxo BT interno).

Cards com `status: "ok"` abrem o app BT em `bt/?mod=<id>`, que aplica o pré-preenchimento do card na inicialização (`bt/js/app.js`); cards com `status: "link"` navegam para a subpasta do módulo correspondente.

### Modalidades pré-definidas de Microgeração (`?modo=`)

O app de microgeração (`microgeracao/js/app.js`) lê o parâmetro de query `modo` na inicialização:

- `?modo=fasttrack` — define e bloqueia o campo *Fast Track (art. 73-A)* como "Sim".
- `?modo=gridzero` — define e bloqueia o campo *Grid Zero* como "Sim".

O campo bloqueado fica desabilitado (via `ctx.locked` no schema de GD, `shared/js/gd-schema.js`) e um banner indica a modalidade ativa. Sem o parâmetro, o formulário abre normalmente, com todos os campos editáveis.

## Baixa Tensão (`bt/`)

Cobre os dois fluxos de atendimento do portal Cemig:

- **Atendimento individual** (urbano/rural) ou agrupamento com até 3 caixas sem proteção geral.
- **Agrupamento com mais de 3 caixas, atendimento híbrido ou individual acima de 75 kW** (Padrão em Agrupamento com Proteção Geral / APR Web).

Funcionalidades principais:

- Classificador de atendimento que indica automaticamente o formulário correto.
- Orientações de preenchimento (texto oficial do portal Cemig) na primeira etapa.
- Stepper de navegação por etapas, no padrão visual do formulário MT.
- Busca de CEP automática (ViaCEP) para áreas urbanas; coordenada obrigatória para área rural a mais de 30 m da rede (mapa via Leaflet/Turf, `shared/js/geo.js`).
- Calculadora de demanda ND-5.1 embutida por Unidade Consumidora, com dimensionamento automático de disjuntor.
- Validação da regra de disjuntores (até 3 caixas, múltiplas UCs): no máx. 1 tripolar 63 A e/ou até 2 mono/bifásicos 63 A.
- Gerador de emergência (fluxo até 3 caixas) e suporte a condomínio de torres / atendimento híbrido.
- Exportação em PDF organizado.

Estrutura:

Estilos em [`css/`](css) (`formulario-bt.css` + `shared.css` + `variables.css`).

```
bt/
├── index.html            App de Baixa Tensão (aceita `?mod=<id>` vindo da homepage)
└── js/
    ├── data.js           Constantes normativas ND-5.1/5.2 (tabelas, cargas, disjuntores)
    ├── calc.js           Cálculo de demanda e seleção de disjuntores
    ├── model.js           Modelo de dados e seletor de modalidades (MODALIDADES_SECOES)
    ├── geo.js / map.js    Geolocalização e mapa (coordenada obrigatória em área rural)
    ├── components.js      Componentes de UI + calculadora de demanda (React/JSX)
    ├── pdf.js             Geração do PDF final
    ├── app.js             Aplicação principal: classificador, stepper, navegação
    └── views/             Uma etapa do formulário por arquivo:
        orient, tipo, proprietario, correspondencia, obra, blocos,
        ucs-coletivo, ucs-individual, cargas-coletivo, cargas-individual,
        gerador, obs, revisar
```

## Média Tensão (`mt/`)

Formulário de orçamento de conexão em MT, com identidade visual compartilhada com o BT (shell `.cemig-form`, fonte Open Sans, tokens `--cmg-*` da paleta Cemig).

```
mt/
├── assets/logo-cemig.svg
└── js/
    ├── dados.js                 Constantes normativas de MT
    ├── calculo.js                Cálculo de demanda/dimensionamento
    ├── subestacoes-b64.js        Dados de subestações (lista/coordenadas)
    └── app.js                    Aplicação principal (React/JSX)
```

Aceita o parâmetro de query `?atividade=` (ex.: `Industrial`, `Irrigação`) para pré-selecionar a atividade ao chegar pelo seletor da raiz.

## Loteamento (`loteamento/`)

Solicitação inicial de fornecimento para loteamentos e chacreamentos, preservando a mesma identidade visual de MT.

```
loteamento/
├── assets/logo-cemig.svg
└── js/app.js
```

## Geração Distribuída (`microgeracao/` e `minigeracao/`)

Formulários de solicitação de acesso para sistemas de geração distribuída, conforme a REN 1.000/2021 da Aneel:

- **Microgeração** (`microgeracao/`) — sistemas de menor porte, conexão em BT.
- **Minigeração** (`minigeracao/`) — sistemas de maior porte, conexão em MT.

Os dois módulos têm a mesma estrutura interna e reaproveitam a base comum de GD em `shared/` (`gd-schema.js`, `gd-pdf-base.js`):

```
microgeracao|minigeracao/
└── js/
    ├── data.js          Constantes normativas e listas de documentos
    ├── calc.js          Cálculo de potência/dimensionamento
    ├── model.js         Modelo de dados do formulário
    ├── components.js    Componentes de UI (React/JSX)
    ├── views.js         Etapas do formulário
    ├── pdf.js           Geração do PDF final
    └── app.js           Aplicação principal
```

## Código compartilhado (`shared/`)

```
shared/
└── js/
    ├── api.js              Chamadas a APIs externas (ex.: ViaCEP)
    ├── calc.js              Funções de cálculo reutilizáveis
    ├── components.js        Componentes de UI genéricos (React/JSX)
    ├── geo.js                Consulta de coordenadas / restrição ambiental (mapa Leaflet + Turf, IDE-Sisema)
    ├── gd-schema.js          Schema de dados comum aos formulários de GD
    └── gd-pdf-base.js        Base de geração de PDF comum aos formulários de GD
```

## Imagens (`imgs/`)

Ilustrações dos cards do seletor de modalidades (`img_casa1.png`, `img_comercio.png`, `img_industria_bt.png`, `mod-gd-micro.png`, etc.) e logos institucionais em `imgs/logos/`.

## Como executar

Como o JSX é compilado no navegador via Babel, os arquivos `js/*.js` de qualquer módulo precisam ser servidos por **HTTP** — não funciona abrindo os `index.html` direto do disco (`file://`).

### Localmente

```bash
python3 -m http.server 8000
# acesse http://localhost:8000
```

A partir daí:

- `http://localhost:8000/` → seletor de modalidades + app BT.
- `http://localhost:8000/mt/` → app MT.
- `http://localhost:8000/loteamento/` → app Loteamento.
- `http://localhost:8000/microgeracao/` → app Microgeração.
- `http://localhost:8000/minigeracao/` → app Minigeração.

### Deploy

Faça o deploy da raiz do repositório em qualquer hospedagem estática (Vercel, Netlify, GitHub Pages, etc.) — todos os módulos são pastas estáticas servidas a partir da mesma raiz.

## Observações

- A API de CEP (ViaCEP) e a consulta de restrição ambiental (IDE-Sisema) são públicas/gratuitas, mas dependem de conexão com a internet.
- Estes formulários são gerados eletronicamente e **não substituem** os formulários oficiais da Cemig.
- Para produção, recomenda-se pré-compilar o JSX (build) em vez de usar o Babel no navegador.
