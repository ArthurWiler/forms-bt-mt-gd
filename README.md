# Formulário de Orçamento de Conexão BT — CEMIG

Aplicação web para preenchimento digital do **Orçamento de Conexão / Alteração de Carga em Baixa Tensão (BT)**, seguindo o padrão visual do formulário de Média Tensão da CEMIG e as orientações do portal oficial.

Cobre os dois fluxos de atendimento descritos no portal Cemig:

- **Atendimento individual (urbano/rural) ou agrupamento com até 3 caixas sem proteção geral.**
- **Agrupamento com mais de 3 caixas, atendimento híbrido ou individual acima de 75 kW em BT** (Padrão em Agrupamento com Proteção Geral / APR Web).

## Funcionalidades

- **Classificador de atendimento** que indica automaticamente o formulário correto.
- **Orientações de preenchimento** (texto oficial do portal Cemig) na primeira etapa.
- **Stepper** de navegação por etapas, no padrão do formulário MT.
- **Busca de CEP** automática (API pública ViaCEP) para áreas urbanas.
- **Coordenada obrigatória** para área rural a mais de 30 m da rede.
- **Calculadora de demanda ND-5.1 embutida** em cada Unidade Consumidora, com dimensionamento automático de disjuntor.
- **Validação da regra de disjuntores** (até 3 caixas, múltiplas UCs): no máx. 1 tripolar 63 A e/ou até 2 mono/bifásicos 63 A.
- **Gerador de emergência** (fluxo até 3 caixas).
- **Classificação do atendimento** exclusiva do fluxo coletivo, posicionada após a declaração de cargas.
- **Exportação em PDF** limpo e organizado.

## Estrutura de arquivos

```
cemig-app/
├── index.html          Página principal (carrega CSS e JS)
├── css/
│   └── styles.css      Estilos (padrão visual CEMIG)
├── js/
│   ├── data.js         Constantes normativas ND-5.1/5.2 (tabelas, cargas, disjuntores)
│   ├── calc.js         Funções de cálculo de demanda e seleção de disjuntores
│   ├── components.js   Componentes de UI + calculadora de demanda (React/JSX)
│   └── app.js          Aplicação principal: classificador, etapas, PDF (React/JSX)
└── assets/             (reservado para imagens/ícones)
```

## Como executar

Como o JSX é compilado no navegador via Babel, os arquivos `js/*.js` precisam ser
servidos por **HTTP** (não funciona abrindo `index.html` direto do disco).

### Localmente

```bash
cd cemig-app
python3 -m http.server 8000
# acesse http://localhost:8000
```

### Deploy

Faça o deploy da pasta `cemig-app/` em qualquer hospedagem estática
(Vercel, Netlify, GitHub Pages, etc.).

## Observações

- A API de CEP (ViaCEP) é pública e gratuita, mas depende de conexão com a internet.
- Este documento é gerado eletronicamente e **não substitui** o formulário oficial da CEMIG.
- Para produção, recomenda-se pré-compilar o JSX (build) em vez de usar o Babel no navegador.
