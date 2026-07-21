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
      "É obrigatório anexar no momento do pedido a planta de situação da edificação, com a indicação do padrão de entrada e a distância do ramal de entrada, conforme ND-5.2, com exceção para solicitação de alteração de carga sem mudança de local do ramal de Conexão. O Documento deve ser encaminhado no portal Cemig Atende e no APR Web.",
      "Para atendimentos híbridos, deve ser informada na planta de situação: quantidade de ramais de Conexão com a respectiva numeração predial de cada ponto de entrega, demanda de cada ramal de Conexão com a respectiva proteção geral (quando couber) e especificações dos cabos subterrâneos. Na ART/TRT deverão ser informados todos os números prediais que serão atendidos. Em casos de desmembramento, o ramal que não sofrerá alteração poderá apenas ser indicado na planta.",
      "Se a solicitação for para atendimento híbrido, é obrigatório indicar na planta de situação o número predial de cada unidade consumidora",
    ],
  },
  callout:
    "Ao final, revise os dados na etapa Prévia & PDF, exporte o formulário e anexe-o ao seu pedido no Cemig Atende.",
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
  unidadeConsumidora: "",
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
  unidadeConsumidora: "",
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
  unidadeConsumidora: "",
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
  disjIncendio: "",
  demandaIncendio: "",
  ucs: [ucTorrePadrao(0)],
});

// Gera a lista de complementos de uma torre a partir do primeiro complemento.
// Padrão puramente numérico com 3+ dígitos (ex: "101") e aptosPorAndar
// informado → os 2 últimos dígitos são o apto dentro do andar: incrementa o
// apto (102, 103…) e, completado o andar, avança o andar (201, 202…).
// Qualquer outro padrão com número (ex: "Apto 01") → mantém o texto fixo e
// incrementa só o número, preservando zeros à esquerda (Apto 02, Apto 03…).
// Retorna null quando o primeiro complemento não contém número.
//
// `faixas` (opcional): composição por pavimento do popup "Customizar" —
// [{ ini, fim, unidades }]. Quando informada e o padrão for numérico, cada
// andar usa a quantidade de unidades da faixa em que ele se encaixa (o número
// de andar dado por `andar` inicial, não pela posição em `ini/fim`); fora de
// qualquer faixa, cai no `aptosPorAndar` padrão. Faixas têm precedência.
function gerarComplementos(primeiro, total, aptosPorAndar, faixas) {
  const n = Math.max(1, parseInt(total) || 1);
  const m = String(primeiro || "")
    .trim()
    .match(/^(.*?)(\d+)(\D*)$/);
  if (!m) return null;
  const [, pre, num, suf] = m;
  const porAndar = Math.max(0, parseInt(aptosPorAndar) || 0);
  const faixasOk = normalizarFaixasPavimento(faixas);
  const out = [];
  const numerico = !pre && !suf && num.length >= 3;
  if (numerico && (porAndar > 0 || faixasOk.length)) {
    let andar = parseInt(num.slice(0, -2), 10);
    const aptoIni = parseInt(num.slice(-2), 10);
    let apto = aptoIni;
    // Unidades do andar atual: faixa que cobre o andar, senão o padrão.
    const unidadesDoAndar = (a) => {
      const f = faixasOk.find((x) => a >= x.ini && a <= x.fim);
      return f ? f.unidades : porAndar || 1;
    };
    for (let i = 0; i < n; i++) {
      out.push(`${andar}${String(apto).padStart(2, "0")}`);
      apto++;
      if (apto - aptoIni >= unidadesDoAndar(andar)) {
        andar++;
        apto = aptoIni;
      }
    }
  } else {
    const ini = parseInt(num, 10);
    for (let i = 0; i < n; i++)
      out.push(pre + String(ini + i).padStart(num.length, "0") + suf);
  }
  return out;
}

// Sanitiza a composição por pavimento vinda do popup: mantém só faixas com
// ini/fim/unidades numéricos válidos (fim >= ini, unidades >= 1) e as ordena
// por andar inicial. Retorna [] para entrada ausente/vazia/inválida.
function normalizarFaixasPavimento(faixas) {
  if (!Array.isArray(faixas)) return [];
  return faixas
    .map((f) => ({
      ini: parseInt(f && f.ini, 10),
      fim: parseInt(f && f.fim, 10),
      unidades: parseInt(f && f.unidades, 10),
    }))
    .filter(
      (f) =>
        Number.isFinite(f.ini) &&
        Number.isFinite(f.fim) &&
        Number.isFinite(f.unidades) &&
        f.fim >= f.ini &&
        f.unidades >= 1,
    )
    .sort((a, b) => a.ini - b.ini);
}

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
      // As demais regras rurais (zona travada em Rural, limite de 1 UC) permanecem.
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
const SEC_MT = {
  titulo: "Média Tensão",
  cards: [
    {
      id: "mt-industria",
      nome: "Indústria",
      sub: "Média Tensão (MT)",
      img: "imgs/img_industria_mt.webp",
      status: "link",
      href: "mt/?atividade=Industrial",
    },
    {
      id: "mt-outros",
      nome: "Outros estabelecimentos",
      sub: "Média Tensão (MT)",
      img: "imgs/img_outros_mt.webp",
      status: "link",
      href: "mt/",
    },
    {
      id: "mt-irrigante",
      nome: "Irrigante",
      sub: "Média Tensão (MT)",
      img: "imgs/img_irrigante.webp",
      status: "link",
      href: "mt/?atividade=Irrigação",
    },
  ],
};
const SEC_GD_MINI = {
  titulo: "Geração Distribuída - Minigeração",
  cards: [
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
const SEC_GD_MICRO = {
  titulo: "Geração Distribuída - Microgeração",
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
      id: "gd-micro-fast",
      nome: "Fast Track",
      sub: "Art. 73-A (REN 1.000/2021)",
      img: "imgs/mod-gd-micro.webp",
      status: "link",
      href: "microgeracao/?modo=fasttrack",
    },
    {
      id: "gd-micro-gridzero",
      nome: "Grid Zero",
      sub: "Sem injeção na rede",
      img: "imgs/mod-gd-micro.webp",
      status: "link",
      href: "microgeracao/?modo=gridzero",
    },
  ],
};
const MODALIDADES_SECOES = [
  SEC_BT_RESIDENCIAL,
  SEC_BT_EMPREENDIMENTOS,
  SEC_BT_ESPECIAIS,
  SEC_MT,
  SEC_GD_MICRO,
  SEC_GD_MINI,
];
