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
    titulo: "Orientações gerais",
    itens: [
      "Para solicitações com carga instalada acima de 75 kW, é obrigatório anexar a ART de projeto paga, planta situação, e formulário preenchdido no APR Web.",
      "Conforme artigo 9° da Resolução Normativa ANEEL Nº 1.000/2021 que trata da representação, o responsável técnico deverá apresentar procuração (pessoa física ou pessoa jurídica) para solicitações em nome de terceiros.",
      "Para os pedidos de Conexão Nova é obrigatório anexar ao formulário um documento que comprove a propriedade ou posse do local a ser atendido. Para unidade consumidora localizada em área urbana, também deverá ser anexado documento que comprove a regularidade do imóvel.",
      "Deverão ser apresentados, no ato da solicitação, documentos originais do titular pessoa física (documento oficial com foto e CPF) e, em caso de pessoa jurídica, os documentos relativos à sua constituição, ao seu registro e do(s) seus(s) representante(s) legal(is)",
      "Caso a propriedade esteja localizada em área protegida pela legislação, é obrigatório apresentar documento que comprove a regularização ambiental emitido por órgão competente.",
      "Caso a propriedade esteja em entorno de reservatório deve ser apresentada autorização da concessionária ou do responsável pelo reservatório.",
      "O padrão deverá ser instalado dentro da propriedade.",
      "Conforme regulação vigente, o responsável técnico deverá apresentar procuração (pessoa física ou pessoa jurídica) para solicitações em nome de terceiros.",
      "Para os casos de conexão com GRID ZERO é necessário protocolar solicitação como um pedido de Geração distribuída.Verificar no site da CEMIG >> Cemig Atende >> Geração Distribuída >> Manual de Solicitação de Grid Zero (GD sem injeção)",
      "Conforme regulação da ANEEL, caso seja marcado 'Sim' para a pergunta 'O padrão está pronto para ser ligado?*', o pedido de vistoria e ligação será disparado automaticamente após conclusão das etapas do orçamento de conexão.Caso seja marcado 'Não', você deve solicitar seu pedido de vistoria e ligação em até 120 dias após a conclusão das etapas do orçamento de conexão. Lembrando que o orçamento de conexão poderá ser cancelado em caso de duas reprovações pelo mesmo motivo e que há cobrança de taxa a partir do segundo serviço realizado. Diante disso, a primeira caixa relacionada no campo Unidade Consumidora 1 será a caixa a ser energizada no final do processo de conexão. A mesma regra poderá ser aplicada para alteração de carga com mudança de local.",
      "O pedido poderá ser reprovado no momento da visita técnica caso não sejam identificadas as cargas declaradas neste formulário.",
    ],
  },
  individual: {
    titulo:
      "Atendimento individual ou agrupamento com até 3 caixas sem proteção geral",
    itens: [
      "Para Conexão Nova, o número predial, a atividade principal da unidade consumidora (Residencial, Comercial, Industrial ou Rural) e o Ramo de Atividade (caso não seja residencial). Quando aplicável, informar também o complemento da caixa (ex: Cond, Lj1, Casa 1, Apto 101 etc.).",
      "Para opção Alteração de Carga ou Caixa existente sem Alteração de Carga, informar o número da instalação, o número do medidor ou o número da caixa (complemento).",
      "Para Alteração de Carga ou Caixa existente sem Alteração de Carga, informar o novo ramo de atividade e a alteração de complemento, somente se houver alteração;",
      "O cálculo da carga instalada total em kW, a demanda em kVA e o preenchimento do disjuntor será feito automaticamente",
      "Para Alteração de Carga,o cálculo da carga instalada total em kW, a demanda em kVA e o preenchimento do disjuntor futuro será feito automaticamente",
    ],
  },
  coletivo: {
    titulo:
      "Agrupamento com proteção geral, atendimento híbrido ou múltiplas torres/blocos",
    itens: [
      "O atendimento pela Cemig ao pedido de Conexão/aumento de carga ficará condicionado à apresentação do projeto elétrico juntamente com a Anotação de Responsabilidade Técnica (ou equivalente) de projeto, para todas as edificações de uso coletivo com demanda total superior a 304kVA.",
      "É obrigatório anexar no momento do pedido a planta de situação da edificação, com a indicação do padrão de entrada e a distância do ramal de entrada, conforme ND-5.2, com exceção para solicitação de alteração de carga sem mudança de local do ramal de Conexão. O Documento deve ser encaminhado no portal Cemig Atende e no APR Web.",
      "Preenche-se uma previsão de carga geral e os dados de identificação de cada unidade consumidora.",
      "Para empreendimentos com múltiplas torres ou blocos, cada bloco pode ter seu disjuntor geral e seu disjuntor de combate a incêndio.",
      "Para demanda total superior a 304 kVA, o atendimento fica condicionado à apresentação do projeto elétrico com ART/TRT.",
      "Motores monofásicos acima de 15 CV e/ou trifásicos acima de 50 CV exigem o formulário de análise de partida de motores.",
      "Para atendimentos híbridos, deve ser informada na planta de situação: quantidade de ramais de Conexão com a respectiva numeração predial de cada ponto de entrega, demanda de cada ramal de Conexão com a respectiva proteção geral (quando couber) e especificações dos cabos subterrâneos. Na ART/TRT deverão ser informados todos os números prediais que serão atendidos. Em casos de desmembramento, o ramal que não sofrerá alteração poderá apenas ser indicado na planta.",
      "Se a solicitação for para atendimento híbrido, é obrigatório indicar na planta de situação o número predial de cada unidade consumidora",
    ],
  },
  callout:
    "Pedido de vistoria e ligação: se o padrão estiver pronto para ligar, a vistoria é disparada após o orçamento; caso contrário, há prazo para solicitá-la. O orçamento pode ser cancelado após reprovações pelo mesmo motivo.",
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
  // Previsão de carga por UC (coletivo)
  prev: {
    ilum: "",
    tomada: "",
    chuveiro: "",
    ar: "",
    outros: "",
    outrosDesc: "",
    demanda: "",
  },
});

// Soma de carga prevista (kW) de uma UC do coletivo
const prevKwUC = (u) =>
  ["ilum", "tomada", "chuveiro", "ar", "outros"].reduce(
    (s, k) =>
      s + (parseFloat(String((u.prev || {})[k]).replace(",", ".")) || 0),
    0,
  );

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
  cargas: { qtds: CAT.map(() => 0), tipoA: "", catA: 0, mots: [] },
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
  instalacao: "",
  unidadeConsumidora: "",
  disjPara: "",
  prev: {
    ilum: "",
    tomada: "",
    chuveiro: "",
    ar: "",
    outros: "",
    outrosDesc: "",
    demanda: "",
  },
});

// Torre/Bloco (modo múltiplas torres) — preenchimento em massa
const blocoPadrao = (i) => ({
  nome: `${i + 1}`,
  disjGeral: "",
  demandaBloco: "",
  qtdUCs: "",
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

const MODALIDADES_SECOES = [
  {
    titulo: "Residencial · Comercial · Rural — Baixa Tensão",
    cards: [
      {
        id: "casa50",
        nome: "Casa até 50m²",
        sub: "Monofásico 63 A",
        img: "assets/portal/img_casa1.png",
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
        nome: "Casa até 100m²",
        sub: "Bifásico 63 A",
        img: "assets/portal/img_casa2.png",
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
              { n: "AC 7500 BTU", q: 1 },
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
        nome: "Casa > 100m²",
        sub: "Baixa Tensão",
        img: "assets/portal/img_casa3.png",
        status: "ok",
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
        nome: "Comércio",
        sub: "Baixa Tensão (BT)",
        img: "assets/portal/img_comercio.png",
        status: "ok",
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
        nome: "Indústria",
        sub: "Baixa Tensão (BT)",
        img: "assets/portal/img_industria_bt.png",
        status: "ok",
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
        nome: "Rural",
        sub: "Baixa Tensão (BT)",
        img: "assets/portal/img_rural.png",
        status: "ok",
        prefill: {
          atividade: "Rural",
          atend: {
            disjGeral: "Não",
            solicitacao: SOLICITACOES[0],
            escopo: "Ligação Nova",
          },
          obra: { tipoRede: "Trifásica", localizacao: "Rural" },
        },
      },
    ],
  },
  {
    titulo: "Empreendimentos — Baixa Tensão",
    cards: [
      {
        id: "loteamento",
        nome: "Loteamento",
        sub: "Baixa Tensão (BT)",
        img: "assets/portal/img_loteamento.png",
        status: "link",
        href: "loteamento/",
      },
      {
        id: "condominiotorres",
        nome: "Condomínio de torres",
        sub: "Baixa Tensão (BT)",
        img: "assets/portal/img_condominio.png",
        status: "ok",
        prefill: {
          atividade: "Residencial",
          atend: {
            disjGeral: "Sim",
            solicitacao: SOLICITACOES[4],
            escopo: "Ligação Nova",
            atendA: "Torre",
            nBlocos: 2,
          },
          obra: { tipoRede: "Trifásica", localizacao: "Urbana" },
        },
      },
      {
        id: "coletivo",
        nome: "Atendimento coletivo",
        sub: "Baixa Tensão (BT)",
        img: "assets/portal/img_coletivo.png",
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
  },
  {
    titulo: "Média Tensão",
    cards: [
      {
        id: "mt-industria",
        nome: "Indústria",
        sub: "Média Tensão (MT)",
        img: "assets/portal/img_industria_mt.png",
        status: "link",
        href: "mt/?atividade=Industrial",
      },
      {
        id: "mt-outros",
        nome: "Outros estabelecimentos",
        sub: "Média Tensão (MT)",
        img: "assets/portal/img_outros_mt.png",
        status: "link",
        href: "mt/",
      },
      {
        id: "mt-irrigante",
        nome: "Irrigante",
        sub: "Média Tensão (MT)",
        img: "assets/portal/img_irrigante.png",
        status: "link",
        href: "mt/?atividade=Irrigação",
      },
    ],
  },
  {
    titulo: "Geração Distribuída",
    cards: [
      {
        id: "gd-micro",
        nome: "Microgeração",
        sub: "Baixa Tensão (BT)",
        img: "assets/portal/mod-gd-micro.png",
        status: "link",
        href: "microgeracao/",
      },
      {
        id: "gd-mini",
        nome: "Minigeração",
        sub: "Média Tensão (MT)",
        img: "assets/portal/mod-gd-mini.png",
        status: "link",
        href: "minigeracao/",
      },
    ],
  },
];
