/* ============================================================
   CEMIG — Dados normativos, fábricas de modelo e helpers puros
   (sem JSX — carregado como script clássico, escopo global)
   ============================================================ */

// Helper numérico compartilhado
const num = (v) => parseFloat(String(v).replace(",", ".")) || 0;

const ORIENTACOES = {
  intro:
    "Leia as orientações antes de iniciar. Este formulário destina-se a pedidos de Ligação Nova ou Alteração de Carga em Baixa Tensão (BT), conforme a Resolução Normativa ANEEL nº 1.000/2021.",
  geral: {
    // Itens vinculáveis a um campo migraram para avisos contextuais (`.cmg-aviso`)
    // exibidos ao preencher o campo correspondente: carga > 75 kW (ART/APR Web) →
    // cargas-individual.js; propriedade/regularidade em Conexão Nova e vistoria
    // "padrão pronto para ligar" (Sim/Não → 120 dias) → dados-unidade.js; área de
    // restrição ambiental → dados-unidade.js. Aqui ficam só os itens gerais/documentais.
    titulo: "Orientações gerais",
    itens: [
      "Conforme artigo 9° da Resolução Normativa ANEEL Nº 1.000/2021 que trata da representação, o responsável técnico deverá apresentar procuração (pessoa física ou pessoa jurídica) para solicitações em nome de terceiros.",
      "Caso a propriedade esteja em entorno de reservatório deve ser apresentada autorização da concessionária ou do responsável pelo reservatório.",
      "O padrão deverá ser instalado dentro da propriedade.",
      "O pedido poderá ser reprovado no momento da visita técnica caso não sejam identificadas as cargas declaradas neste formulário.",
    ],
  },
  coletivo: {
    // A demanda total > 304 kVA (projeto elétrico + ART/TRT) já é sinalizada por
    // aviso contextual ao ultrapassar o limite (cargas-coletivo.js / blocos.js), e
    // os motores pesados viram documento no PDF conforme declarados. Aqui ficam a
    // planta de situação (documental) e a descrição dos campos de previsão/torres/
    // híbrido, que orientam o preenchimento.
    titulo:
      "Agrupamento com proteção geral, atendimento híbrido ou múltiplas torres/blocos",
    itens: [
      "É obrigatório anexar no momento do pedido a planta de situação da edificação, com a indicação do padrão de entrada e a distância do ramal de entrada, conforme ND-5.2, com exceção para solicitação de alteração de carga sem mudança de local do ramal de Conexão. O Documento deve ser encaminhado junto ao pedido e no APR Web.",
      "Para atendimentos híbridos, deve ser informada na planta de situação: quantidade de ramais de Conexão com a respectiva numeração predial de cada ponto de entrega, demanda de cada ramal de Conexão com a respectiva proteção geral (quando couber) e especificações dos cabos subterrâneos. Na ART/TRT deverão ser informados todos os números prediais que serão atendidos. Em casos de desmembramento, o ramal que não sofrerá alteração poderá apenas ser indicado na planta.",
      "Se a solicitação for para atendimento híbrido, é obrigatório indicar na planta de situação o número predial de cada unidade consumidora",
    ],
  },
  callout:
    "Ao final, revise os dados na etapa Prévia & PDF, exporte o formulário e anexe-o ao seu pedido.",
};

// ===== Solicitação -> Escopos dependentes =====
const SOLICITACOES = [
  "1- Disjuntor individual abaixo de 75 kW",
  "2- Disjuntor individual acima de 75 kW",
  "3- Disjuntor geral em padrão coletivo",
  "4- Atendimento Híbrido",
  "5- Atendimento a Empreendimento com Múltiplas Torres ou Blocos",
];
const ESCOPOS = {
  "1- Disjuntor individual abaixo de 75 kW": [
    "Ligação Nova",
    "Aumento de Carga",
    "Adequação de padrão",
  ],
  "2- Disjuntor individual acima de 75 kW": [
    "Ligação Nova",
    "Aumento de Carga",
    "Adequação de padrão",
  ],
  "3- Disjuntor geral em padrão coletivo": [
    "Ligação Nova",
    "Alteração de Carga com alteração do disjuntor geral",
    "Alteração de Carga sem alteração do disjuntor geral",
    "Adequação de padrão",
  ],
  "4- Atendimento Híbrido": [
    "Ligação Nova",
    "Aumento de Carga",
    "Adequação de padrão",
  ],
  "5- Atendimento a Empreendimento com Múltiplas Torres ou Blocos": [
    "Ligação Nova",
    "Outro",
  ],
};

// Estado padrão da Etapa "Tipo de Atendimento". Centralizado aqui para que a
// troca de modalidade (selectModalidade) possa restaurar os valores iniciais e
// evitar que dados de uma categoria anterior persistam na próxima (Regra 8).
const atendPadrao = () => ({
  disjGeral: "Não",
  nUCs: 1,
  biAcima63: false,
  triAcima63: false,
  acima75: false,
  solicitacao: SOLICITACOES[0],
  escopo: "Ligação Nova",
  disjuntorGeral: "",
  disjGeralAtual: "",
  demandaAtual: "",
  demandaNaoResidencial: "",
  nBlocos: 1,
  // Etapa "Dados do projeto" (múltiplas torres). Todos os níveis são OPCIONAIS;
  // as validações da hierarquia (UC → Torre → Prumada → Disjuntor geral do
  // empreendimento) consideram só os níveis efetivamente configurados.
  disponibilizacaoEnergia:
    "Na portaria e no interior do condomínio (alimentação das torres e áreas comuns)", // radio "Onde a energia deverá ser disponibilizada"
  disjEmpreendimento: "", // Disjuntor geral do empreendimento
  disjCondominio: "", // Disjuntor geral do condomínio
  temPrumada: "Não", // "O condomínio tem disjuntor de prumada?"
  prumadas: [prumadaPadrao()], // faixas torreInicial→torreFinal com disjuntor
});

// Uma prumada da etapa "Dados do projeto": agrupa uma faixa contígua de torres
// (torre inicial → torre final) sob um disjuntor. torreIni/torreFim são os
// números (1-based) exibidos ao usuário na etapa "Dados das torres".
const prumadaPadrao = () => ({
  torreIni: "",
  torreFim: "",
  disj: "",
});

// Opções de "Solicitação" (Service Options) liberadas por família de
// atendimento. Para categorias individuais (Residencial > 100 m², Comercial,
// Industrial, Rural) só os disjuntores individuais ficam disponíveis; no
// atendimento coletivo libera-se também o Atendimento Híbrido (Regra 5).
const SOLICITACOES_INDIVIDUAIS = [SOLICITACOES[0], SOLICITACOES[1]];
const SOLICITACOES_COLETIVAS = [SOLICITACOES[2], SOLICITACOES[3]];

// Carga prevista (kW) padrão para UC Residencial no coletivo, conforme o
// disjuntor solicitado (disjPara). Valores = soma dos antigos presets por
// componente (mono: 1 + 1,5 + 4,4; bi: 1 + 1,5 + 1,3 + 12).
const PRESET_PREV_RESIDENCIAL_COLETIVO = {
  "Monopolar 63 A": "6.9",
  "Bipolar 63 A": "15.8",
};

// Bloco de UC (identificação no coletivo) — valores padrão
const ucBlocoPadrao = (i) => ({
  identificacao: `UC ${i + 1}`,
  nPredial: "",
  complemento: "",
  caixa: "",
  solicitacao: "Conexão Nova",
  mudancaLocal: "",
  atividade: "",
  ramo: "",
  area: "", // área privativa (m²) — usada no cálculo ND-5.2 quando Residencial
  instalacao: "",
  disjDe: "",
  disjPara: "",
  nd: "5.2", // norma atendente (atendimento híbrido): "5.1" ou "5.2"
  cargaPrevista: "", // carga prevista da UC (kW) — método 5.2 com mais de 3 UCs
  // Cargas detalhadas (calculadora do BT individual) — usadas quando o
  // ND-5.2 não calcula (menos de 4 aptos residenciais ou área fora da tabela)
  cargas: { qtds: CAT.map(() => 0), tipoA: "", catA: null, mots: [] },
});

// UC marcada como "Caixa Existente sem Alteração": não tem preenchimento de
// carga e não entra nos totais/previsões — aparece apenas na identificação/resumo.
const ucSemAlteracao = (u) =>
  (u && u.solicitacao) === "Caixa Existente sem Alteração";

// Carga prevista (kW) informada para uma UC do coletivo/torre
const prevKwUC = (u) =>
  parseFloat(
    String((u && u.cargaPrevista) == null ? "" : u.cargaPrevista).replace(
      ",",
      ".",
    ),
  ) || 0;

// UC detalhada (individual) — identificação + calculadora
const ucDetalhadaPadrao = () => ({
  solicitacao: "Conexão Nova",
  atividade: "",
  ramo: "",
  nPredial: "",
  complemento: "",
  caixa: "",
  instalacao: "",
  mudancaLocal: "",
  disjDe: "",
  disjPara: "",
  disjEscolhido: "",
  // Novo local do padrão (só em zona Rural com "Mudança de local" = Sim):
  // coordenada escolhida no mapa da etapa "Tipo de atendimento".
  padraoLat: "",
  padraoLng: "",
  padraoUtm: "",
  cargas: { qtds: CAT.map(() => 0), tipoA: "", catA: null, mots: [] },
  // Gerador de emergência é vinculado à UC (subseção abaixo das cargas)
  gerador: { possui: "Não", potencia: "", fonte: "", descricao: "" },
});

// UC de torre/bloco (modo múltiplas torres) — identificação por unidade
const ucTorrePadrao = (i) => ({
  identificacao: `UC ${i + 1}`,
  nPredial: "",
  complemento: "",
  caixa: "",
  solicitacao: "Conexão Nova",
  atividade: "",
  ramo: "",
  area: "", // área privativa (m²) — usada no cálculo ND-5.2 por torre
  instalacao: "",
  disjPara: "",
  cargaPrevista: "", // carga prevista da UC (kW) — método 5.2 com mais de 3 UCs
  demandaNaoResidencial: "", // demanda da UC não residencial (kVA) — método ND-5.2
  // Cargas detalhadas (calculadora do BT individual) — usadas quando o
  // ND-5.2 da torre não calcula
  cargas: { qtds: CAT.map(() => 0), tipoA: "", catA: null, mots: [] },
});

// Torre/Bloco (modo múltiplas torres) — preenchimento em massa
const blocoPadrao = (i) => ({
  nome: `${i + 1}`,
  disjGeral: "",
  demandaBloco: "",
  qtdUCs: "",
  aptosPorAndar: "", // qtd. de apartamentos por andar — usada na geração de complementos
  // Composição por pavimento (popup "Customizar"): faixas de andares com
  // unidades por andar distintas — [{ ini, fim, unidades }]. Quando preenchida,
  // tem precedência sobre aptosPorAndar na geração de complementos numéricos.
  aptosPorAndarFaixas: null,
  complInicial: "", // primeiro complemento da torre (ex: "101", "Apto 01")
  // Torre de UMA unidade: em vez do primeiro complemento (que gera a sequência),
  // o usuário escolhe o TIPO daquele complemento único — ver TIPOS_COMPLEMENTO.
  tipoComplemento: "",
  disjIncendio: "",
  demandaIncendio: "",
  ucs: [ucTorrePadrao(0)],
});





// ============================================================
// CATÁLOGO DE MODALIDADES (tela inicial)
// Cada modalidade aplica uma pré-configuração ao fluxo BT.
// status: "ok" abre o formulário | "soon" = Em breve
// img: PNG esperado em imgs/ (gerado pelo usuário)
// prefill: ajustes aplicados a atend/obra ao selecionar
// ============================================================

// Monta o array `qtds` (alinhado ao catálogo CAT) a partir de uma lista
// [{ n: "Nome no CAT", q: quantidade }] — usado no prefill de cargas.
function cargasQtdsPorNome(itens) {
  const qtds = CAT.map(() => 0);
  itens.forEach(({ n, q }) => {
    const i = CAT.findIndex((c) => c.n === n);
    if (i >= 0) qtds[i] = q;
  });
  return qtds;
}

const SEC_BT_RESIDENCIAL = {
  titulo: "Baixa Tensão - Residencial, Comercial, Industrial e Rural",
  cards: [
    {
      id: "casa50",
      formType: "individual",
      nome: "Residência até 50 m²",
      sub: "Monofásico 63 A",
      img: "imgs/img_casa1.webp",
      status: "ok",
      restrito: true, // fluxo simplificado: sem coletivo/híbrido/multitorres
      prefill: {
        atividade: "Residencial",
        atend: {
          disjGeral: "Não",
          solicitacao: SOLICITACOES[0],
          escopo: "Ligação Nova",
          nUCs: 1,
        },
        obra: { tipoRede: "Monofásica", localizacao: "Urbana" },
        cargas: {
          tipoA: "res",
          qtds: cargasQtdsPorNome([
            { n: "Chuveiro Elétrico 127V", q: 1 },
            { n: "Lâmpada LED 10W", q: 4 },
            { n: "Lâmpada LED 18W", q: 4 },
            { n: "Geladeira comum", q: 1 },
            { n: "Micro forno elétrico", q: 1 },
          ]),
        },
      },
    },
    {
      id: "casa100",
      formType: "individual",
      nome: "Residência até 100 m²",
      sub: "Bifásico 63 A",
      img: "imgs/img_casa2.webp",
      status: "ok",
      restrito: true, // fluxo simplificado: sem coletivo/híbrido/multitorres
      prefill: {
        atividade: "Residencial",
        atend: {
          disjGeral: "Não",
          solicitacao: SOLICITACOES[0],
          escopo: "Ligação Nova",
          nUCs: 1,
        },
        obra: { tipoRede: "Bifásica", localizacao: "Urbana" },
        cargas: {
          tipoA: "res",
          qtds: cargasQtdsPorNome([
            { n: "Chuveiro 4 estações", q: 2 },
            { n: "Ar condicionado 7500 BTU", q: 1 },
            { n: "Lâmpada LED 10W", q: 4 },
            { n: "Lâmpada LED 18W", q: 4 },
            { n: "Geladeira comum", q: 1 },
            { n: "Micro forno elétrico", q: 1 },
          ]),
        },
      },
    },
    {
      id: "casaluxo",
      formType: "individual",
      nome: "Residência acima de 100 m²",
      sub: "Baixa Tensão",
      img: "imgs/img_casa3.webp",
      status: "ok",
      atividadeFixa: true, // Residencial > 100 m²: atividade travada (Regra 1)
      solicitacoesPermitidas: SOLICITACOES_INDIVIDUAIS,
      prefill: {
        atividade: "Residencial",
        atend: {
          disjGeral: "Não",
          solicitacao: SOLICITACOES[0],
          escopo: "Ligação Nova",
        },
        obra: { tipoRede: "Trifásica", localizacao: "Urbana" },
      },
    },
    {
      id: "comercio",
      formType: "individual",
      nome: "Comércio",
      sub: "Baixa Tensão (BT)",
      img: "imgs/img_comercio.webp",
      status: "ok",
      atividadeFixa: true, // Comercial: atividade travada (Regra 2)
      solicitacoesPermitidas: SOLICITACOES_INDIVIDUAIS,
      prefill: {
        atividade: "Comercial",
        atend: {
          disjGeral: "Não",
          solicitacao: SOLICITACOES[0],
          escopo: "Ligação Nova",
        },
        obra: { tipoRede: "Trifásica", localizacao: "Urbana" },
      },
    },
    {
      id: "industriabt",
      formType: "individual",
      nome: "Indústria",
      sub: "Baixa Tensão (BT)",
      img: "imgs/img_industria_bt.webp",
      status: "ok",
      atividadeFixa: true, // Industrial: atividade travada (Regra 3)
      solicitacoesPermitidas: SOLICITACOES_INDIVIDUAIS,
      prefill: {
        atividade: "Industrial",
        atend: {
          disjGeral: "Não",
          solicitacao: SOLICITACOES[0],
          escopo: "Ligação Nova",
        },
        obra: { tipoRede: "Trifásica", localizacao: "Urbana" },
      },
    },
    {
      id: "rural",
      formType: "individual",
      nome: "Rural",
      sub: "Baixa Tensão (BT)",
      img: "imgs/img_rural.webp",
      status: "ok",
      travaZonaRural: true, // zona de localização fixa em Rural (não editável)
      // A categoria Rural NÃO trava nem força a "Atividade principal": o usuário
      // escolhe livremente entre Residencial/Comercial/Industrial e o tipo de
      // carga deriva sempre da atividade (res ou nr + categoria da Tabela 11).
      // Zona travada em Rural e limite de 2 UCs — a 2ª sempre de irrigação.
      solicitacoesPermitidas: SOLICITACOES_INDIVIDUAIS,
      prefill: {
        atend: {
          disjGeral: "Não",
          solicitacao: SOLICITACOES[0],
          escopo: "Ligação Nova",
        },
        obra: { tipoRede: "Trifásica", localizacao: "Rural" },
      },
    },
  ],
};
const SEC_BT_EMPREENDIMENTOS = {
  titulo: "Baixa Tensão - Empreendimentos",
  cards: [
    {
      id: "loteamento",
      nome: "Loteamento",
      sub: "Baixa Tensão (BT)",
      img: "imgs/img_loteamento.webp",
      status: "link",
      href: "loteamento/",
    },
    {
      id: "condominiotorres",
      formType: "condominio",
      nome: "Condomínio de torres",
      sub: "Baixa Tensão (BT)",
      img: "imgs/img_condominio.webp",
      status: "ok",
      prefill: {
        atividade: "Residencial",
        atend: {
          disjGeral: "Sim",
          solicitacao: SOLICITACOES[4],
          escopo: "Ligação Nova",
          nBlocos: 2,
        },
        obra: { tipoRede: "Trifásica", localizacao: "Urbana" },
      },
    },
    {
      id: "coletivo",
      formType: "coletivo",
      nome: "Atendimento coletivo",
      sub: "Baixa Tensão (BT)",
      img: "imgs/img_coletivo.webp",
      status: "ok",
      prefill: {
        atividade: "Residencial",
        atend: {
          disjGeral: "Sim",
          solicitacao: SOLICITACOES[2],
          escopo: "Ligação Nova",
          nUCs: 2,
        },
        obra: { tipoRede: "Trifásica", localizacao: "Urbana" },
      },
    },
  ],
};
const SEC_BT_ESPECIAIS = {
  titulo: "Baixa Tensão - Atendimentos Especiais",
  cards: [
    {
      id: "remocao-rede",
      nome: "Afastamento ou remoção de rede",
      sub: "Baixa Tensão (BT)",
      img: "imgs/img_loteamento.webp",
      status: "link",
      href: "loteamento/",
    },
    {
      id: "remocao-poste",
      nome: "Remoção de poste",
      sub: "Baixa Tensão (BT)",
      img: "imgs/img_loteamento.webp",
      status: "link",
      href: "loteamento/",
    },
    {
      id: "provisoria",
      nome: "Conexão provisória",
      sub: "Baixa Tensão (BT)",
      img: "imgs/img_loteamento.webp",
      status: "link",
      href: "loteamento/",
    },
    {
      id: "ilmpublica",
      nome: "Iluminação pública",
      sub: "Baixa Tensão (BT)",
      img: "imgs/img_loteamento.webp",
      status: "link",
      href: "loteamento/",
    },
    {
      id: "desistencia",
      nome: "Termo de desistência",
      sub: "Baixa Tensão (BT)",
      img: "imgs/img_loteamento.webp",
      status: "link",
      href: "desistencia/",
    },
  ],
};
// Card único de Média Tensão. Indústria, Outros estabelecimentos e Irrigante
// deixaram de ser cards/portas de entrada: os três apontavam para o mesmo
// formulário e diferiam apenas no `?atividade=` da URL, que só pré-preenchia o
// campo "Atividade desenvolvida na unidade" (etapa 3). As regras que dependem
// da atividade — alerta de outorga/licença ambiental, checkbox "Destinado à
// Irrigação" por motor e o card de desconto para irrigante/aquicultor — já
// derivam do preenchimento desse campo, não do card de origem (ver mt/js/app.js
// e mt/js/calculo.js). O deep-link `mt/?atividade=<valor>` continua funcionando.
const SEC_MT = {
  titulo: "Média Tensão",
  cards: [
    {
      id: "mt-outros",
      nome: "Indústria, comércio, irrigação e outros",
      sub: "Média Tensão (MT)",
      img: "imgs/img_outros_mt.webp",
      status: "link",
      href: "mt/",
    },
  ],
};
// Seção única de Geração Distribuída: Microgeração e Minigeração. Fast Track e
// Grid Zero deixaram de ser cards/portas de entrada — são campos do próprio
// formulário de microgeração (etapa 2), com as regras aplicadas conforme o
// preenchimento (ver microgeracao/js/app.js).
const SEC_GD = {
  titulo: "Geração Distribuída",
  cards: [
    {
      id: "gd-micro",
      nome: "Microgeração",
      sub: "Baixa Tensão (BT)",
      img: "imgs/mod-gd-micro.webp",
      status: "link",
      href: "microgeracao/",
    },
    {
      id: "gd-mini",
      nome: "Minigeração",
      sub: "Média Tensão (MT)",
      img: "imgs/mod-gd-mini.webp",
      status: "link",
      href: "minigeracao/",
    },
  ],
};
const MODALIDADES_SECOES = [
  SEC_BT_RESIDENCIAL,
  SEC_BT_EMPREENDIMENTOS,
  SEC_BT_ESPECIAIS,
  SEC_MT,
  SEC_GD,
];
