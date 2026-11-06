/* ============================================================
   CEMIG BT — Conteúdo do PDF (quais seções, quais campos)
   ------------------------------------------------------------
   A MECÂNICA do documento (moldes, construtor de blocos,
   paginador, exportação) mora em shared/js/pdf-doc.js e é a mesma
   em todos os formulários. Aqui fica só o que é do BT: a lista de
   blocos de cada uma das três modalidades.

   Cada modalidade segue os SVGs de referência exportados do Figma
   (creditados no cabeçalho de css/pdf/variables-pdf.css):

     · individual      docs/mocks/pdf-bt-individual/svg_1 … svg_7
     · múltiplas torres docs/mocks/pdf-bt-multitorres/svg_1 … svg_4
     · coletivo         docs/mocks/pdf-bt-coletivo/svg_1 … svg_4

   A revisão de 06/11/2026 (docs/mocks/pdf-bt-2026-11/) prevalece
   sobre esses mocks onde diverge: "Imóvel e atendimento" com
   endereço numa linha e chip "Imóvel N de M" no individual,
   empreendimento com endereço numa linha nas torres e no coletivo,
   e "Conta de luz" no lugar de "Correspondência".

   Usa os helpers globais do módulo BT: fmt2, fmtW, num, prevKwUC,
   ucSemAlteracao, ramoParaPdf, CAT, TABELA_11, MOTOR_MONO/TRI,
   motorColPorQtd, motorKvaUnit, calcBlocoMultiTorres,
   disjGeralTorreObrigatorio, utmString, dataBR.

   Carregue depois de shared/js/pdf-render.js e shared/js/pdf-doc.js.
   ============================================================ */

/* ============================================================
   1. Peças repetidas entre as modalidades
   ============================================================ */

/* Grau decimal com 6 casas, como nos mocks ("-19.863788, -43.955397"). */
function _pdfCoordBT(lat, lng) {
  const f = (v) => {
    const n = parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? null : n.toFixed(6);
  };
  return [f(lat), f(lng)].filter((x) => x !== null).join(", ");
}

/* A UTM digitada tem precedência sobre a calculada: é ela que o
   usuário viu na tela. */
function _pdfUtmBT(obra) {
  return (
    obra.utm ||
    (typeof utmString === "function" ? utmString(obra.lat, obra.lng) : "")
  );
}

/* "Dados para contato" — a mesma abertura nas três modalidades
   (svg_1 de cada mock): o nome ocupa a linha inteira e e-mail e
   celular dividem a seguinte. */
function _pdfContatoBT(B, prop) {
  B.secao("Dados para contato");
  B.campos([["Nome", prop.nome, 3]]);
  B.campos([
    ["E-mail", prop.email],
    ["Celular", prop.celular],
  ]);
}

/* Endereço numa linha só, como o campo "Endereço" dos mocks
   ("Rua …, 530, apto. 202, bloco 4, Nova Gameleira, Belo Horizonte -
   MG, CEP 30510420"). O rural não tem logradouro: a linha é município,
   estado, distrito e nome da propriedade (individual/svg_2). */
function _pdfEnderecoLinhaBT(obra, rural) {
  const o = obra || {};
  const partes = rural
    ? [o.cidade, o.estado, o.distritoComunidade, o.nomePropriedade]
    : [
        o.endereco,
        o.num,
        o.compl,
        o.bairro,
        [o.cidade, o.estado].filter((x) => !_pdfVazio(x)).join(" - "),
        _pdfVazio(o.cep) ? "" : "CEP " + o.cep,
      ];
  return partes.filter((x) => !_pdfVazio(x)).join(", ");
}

/* Coordenadas da obra — os dois cartões que vêm logo abaixo do
   endereço em todas as modalidades. */
function _pdfCoordenadasBT(B, obra) {
  B.cartoes([
    ["Coordenadas", _pdfCoordBT(obra.lat, obra.lng)],
    ["Coordenada UTM", _pdfUtmBT(obra)],
  ]);
}

/* "Dados do empreendimento" do coletivo e do múltiplas torres:
   endereço, coordenadas, os cartões de totais e a modalidade são
   comuns; a ordem do miolo muda entre os dois mocks.
     · torres (mtorres1): Cliente | CNPJ, ART, Distância | Pronto, Rede
     · coletivo (col1):   CNPJ | Cliente | ART, Distância, Pronto | Rede
   Cada LINHA do mock é uma chamada de B.campos(); as últimas são uma
   lista só porque, no mock, as perguntas do padrão e a rede fluem
   pela linha que a anterior deixou. */
function _pdfEmpreendimentoBT(B, S, totais, solicitacaoModalidade, coletivo) {
  const { prop = {}, obra = {}, pessoaFisica } = S;
  B.campos([["Endereço", _pdfEnderecoLinhaBT(obra, false), 3]]);
  _pdfCoordenadasBT(B, obra);
  B.cartoes(totais);
  B.campos(solicitacaoModalidade);
  const documento = [pessoaFisica ? "CPF" : "CNPJ", prop.cpfCnpj];
  const cliente = ["Cliente / Razão Social do empreendimento", prop.cliente, 3];
  const art = ["Nº ART/TRT do projeto", obra.art];
  const dist = [
    "Distância do padrão até a rede Cemig inferior a 30m?",
    obra.distMenor30,
  ];
  const pronto = ["O padrão está pronto para ser ligado?", obra.prontoLigar];
  const rede = ["Tipo de rede BT que atende o local", obra.tipoRede];
  if (coletivo) {
    B.campos([documento]);
    B.campos([cliente]);
    B.campos([art, dist, pronto, rede]);
  } else {
    B.campos([cliente]);
    B.campos([documento, art, dist]);
    B.campos([pronto, rede]);
  }
}

/* "Conta de luz" — mesma seção nas três modalidades: para onde vai
   a conta e em que dia ela vence. O rótulo do destino muda com a
   forma escolhida, e por isso não é uma lista fixa de campos.
   `fatura` nomeia o documento nos rótulos: "conta de luz" no
   individual e nas torres, "fatura do condomínio" no coletivo (col1). */
function _pdfCorrespondenciaBT(B, S, fatura) {
  const doc = fatura || "conta de luz";
  const { prop = {}, corr = {}, obra = {} } = S;
  const enderecoObra = [
    [obra.endereco, obra.num].filter(Boolean).join(", "),
    obra.compl,
    obra.bairro,
    [obra.cidade, obra.estado].filter(Boolean).join("/"),
    obra.cep ? "CEP " + obra.cep : "",
  ]
    .filter(Boolean)
    .join(" - ");
  const enderecoNovo = [
    [corr.rua, corr.num].filter(Boolean).join(", "),
    corr.compl,
    corr.bairro,
    corr.municipio,
    corr.estado,
    corr.cep ? "CEP " + corr.cep : "",
  ]
    .filter(Boolean)
    .join(" - ");
  const destinoFatura =
    corr.alternativa === "E-mail informado"
      ? ["E-mail para receber a " + doc, prop.email]
      : corr.alternativa === "Outro e-mail"
        ? ["E-mail para receber a " + doc, corr.outroEmail]
        : corr.alternativa === "Conta globalizada"
          ? ["Conta globalizada", corr.contaGlobal]
          : corr.alternativa === "Mesmo da obra"
            ? [
                "Endereço para receber a " + doc,
                "Mesmo da unidade — " + enderecoObra,
                3,
              ]
            : corr.alternativa === "Endereço novo"
              ? ["Endereço para receber a " + doc, enderecoNovo, 3]
              : ["Forma de recebimento da " + doc, corr.alternativa];
  B.secao("Conta de luz");
  B.campos([
    destinoFatura,
    [
      "Data de vencimento",
      corr.vencimento ? "Todo dia " + corr.vencimento : "",
    ],
  ]);
}

/* "Observações" fecha os três documentos, quando há texto. É o
   único bloco que os mocks não desenham e que mesmo assim continua
   sendo impresso: o campo existe no formulário e o que a pessoa
   escreveu não pode sumir do papel. */
function _pdfObservacoesBT(B, obs) {
  if (_pdfVazio(obs)) return;
  B.filete();
  B.secao("Observações");
  B.paragrafos(obs);
}

/* ============================================================
   2. Conteúdo — múltiplas torres (condomínio)
   ------------------------------------------------------------
   Segue pdf-bt-2026-11/mtorres1 … mtorres4: contato, empreendimento
   e o projeto (hierarquia de proteção) correm a partir da folha 1,
   seguidos da conta de luz; daí uma folha por torre — quatro
   cartões de resumo e a tabela das unidades.

   Cada LINHA do mock é uma chamada de B.campos() própria, e não uma
   lista só: como campo vazio é descartado, numa lista única o campo
   seguinte subiria para o buraco e a linha sairia com outra
   composição de colunas.
   ============================================================ */

function _pdfBlocosMultiTorresBT(S) {
  const {
    prop = {},
    atend = {},
    blocos = [],
    prevTotalKw,
    demandaTotalGeral,
    obs,
  } = S;

  const B = _pdfConstrutor();

  /* ---- Dados para contato ---- */
  _pdfContatoBT(B, prop);

  /* ---- Dados do empreendimento ---- */
  B.filete();
  B.secao("Dados do empreendimento");
  /* O Figma repete "Demanda total" no 2º cartão — erro de cópia; o
     segundo é a carga (decisão de 06/11/2026). */
  const qtdUnidades = blocos.reduce((s, b) => s + (b.ucs || []).length, 0);
  _pdfEmpreendimentoBT(
    B,
    S,
    [
      ["Demanda total de todas as torres", fmt2(demandaTotalGeral) + " kVA"],
      ["Carga total de todas as torres", fmt2(prevTotalKw) + " kW"],
      ["Quantidade de unidades total", qtdUnidades || ""],
    ],
    [
      ["Tipo de solicitação", atend.escopo],
      [
        "Modalidade",
        /* "14 torres" no mock; o singular existe porque o
           empreendimento pode ter uma torre só. */
        `Múltiplas torres - ${blocos.length} ` +
          (blocos.length === 1 ? "torre" : "torres"),
      ],
    ],
  );

  /* ---- Dados do projeto ----
     Corre na folha 1, logo após o empreendimento; o que não couber
     segue para a folha 2 com o título repetido pelo paginador
     (svg_1 → svg_2). */
  B.filete();
  B.secao("Dados do projeto");
  B.campos([
    [
      "Onde a energia deverá ser disponibilizada no empreendimento?",
      atend.disponibilizacaoEnergia,
      3,
    ],
  ]);
  /* Disjuntores gerais e prumadas só existem com a energia apenas na
     portaria do condomínio (etapa "Dados do projeto"). */
  if (atend.disponibilizacaoEnergia === "Apenas na portaria do condomínio") {
    B.cartoes([
      ["Disjuntor geral do condomínio", atend.disjCondominio],
      ["Disjuntor geral do empreendimento", atend.disjEmpreendimento],
    ]);
    B.campos([
      ["O condomínio tem disjuntor de prumada?", atend.temPrumada, 3],
    ]);
    if (atend.temPrumada === "Sim")
      B.tabela(
        ["Torre inicial", "Torre final", "Disjuntor"],
        (atend.prumadas || []).map((p) => [p.torreIni, p.torreFim, p.disj]),
        "pdf-tabela--auto",
      );
  }

  /* ---- Conta de luz ---- */
  B.filete();
  _pdfCorrespondenciaBT(B, S);

  /* ---- Uma folha por torre ----
     Também decisão do documento: no mock a torre 1 abre folha nova
     com a anterior ainda meio vazia (svg_2 → svg_3). */
  blocos.forEach((b, bi) => {
    const ucs = b.ucs || [];
    if (!ucs.length) return;
    const cb = calcBlocoMultiTorres(b);

    B.quebrarPagina();
    /* A tabela que transborda segue sem o título (multitorres/svg_4):
       quem se repete é o cabeçalho da tabela. */
    B.secao(`Dados da torre ${b.nome || bi + 1}`, { repete: false });
    B.cartoes(
      [
        [
          "Demanda do condomínio",
          num(b.demandaIncendio) ? fmt2(b.demandaIncendio) + " kVA" : "",
        ],
        ["Disjuntor do condomínio", b.disjIncendio],
        [
          "Demanda da torre",
          fmt2(cb.demandaUcs + num(b.demandaIncendio)) + " kVA",
        ],
        /* Torre que dispensa o geral imprime "Dispensado". */
        [
          "Disjuntor da torre",
          disjGeralTorreObrigatorio(b) ? b.disjGeral : "Dispensado",
        ],
      ],
      "pdf-cartoes--4col",
    );
    /* Sem as colunas "Solicitação" e "Inst. / UC / Medidor" do
       documento anterior: no múltiplas torres a solicitação é
       sempre Conexão Nova (bt/js/coletivo-app.js), logo o número de
       instalação nunca é preenchido e a coluna sairia vazia. */
    B.tabela(
      [
        "Unidade",
        "Complemento",
        "Atividade",
        "Área (m²)",
        "Carga prevista (kW)",
        "Disjuntor",
      ],
      ucs.map((u, ui) => [
        u.identificacao || `UC ${ui + 1}`,
        u.complemento,
        u.atividade,
        u.area,
        ucSemAlteracao(u)
          ? ""
          : cb.modoCalculadora
            ? fmt2(num((u.cargas || {})._cargaKw))
            : fmt2(prevKwUC(u)),
        u.disjPara,
      ]),
      "pdf-tabela--ucs",
    );
  });

  _pdfObservacoesBT(B, obs);

  return B.podar();
}

/* ============================================================
   3. Conteúdo — coletivo (agrupamento com proteção geral)
   ------------------------------------------------------------
   Segue pdf-bt-2026-11/col1, coletivo2 e coletivo3: folha 1 com
   contato, empreendimento e conta
   de luz; folha 2 com o resumo do agrupamento, seguido das unidades AGRUPADAS POR
   TIPO DE PEDIDO — uma seção para cada, com a conexão nova em
   tabela e a alteração de carga em um bloco por unidade.

   O agrupamento do coletivo é guardado em blocos[0] — a etapa
   "Dados da torre" reaproveita o mesmo card do condomínio, sem a
   identificação da torre (ver bt/js/coletivo-app.js).
   ============================================================ */

function _pdfBlocosColetivoBT(S) {
  const {
    prop = {},
    atend = {},
    ucBlocos = [],
    blocos = [],
    hibrido,
    modoCalculadora,
    prevTotalKw,
    demandaTotalGeral,
    obs,
  } = S;

  const B = _pdfConstrutor();
  const agrupamento = blocos[0] || {};

  /* Carga da UC: no método 5.2 vem do campo "Carga prevista"; no
     modo calculadora, do total das cargas detalhadas. */
  const cargaUC = (u) =>
    ucSemAlteracao(u)
      ? ""
      : (modoCalculadora || u.nd === "5.1" // medição separada: perfil de carga
          ? fmt2(num((u.cargas || {})._cargaKw))
          : fmt2(prevKwUC(u))) + " kW";

  /* ---- Dados para contato ---- */
  _pdfContatoBT(B, prop);

  /* ---- Dados do empreendimento ---- */
  B.filete();
  B.secao("Dados do empreendimento");
  _pdfEmpreendimentoBT(
    B,
    S,
    [
      ["Demanda total de todas as unidades", fmt2(demandaTotalGeral) + " kVA"],
      ["Carga total de todas as unidades", fmt2(prevTotalKw) + " kW"],
      ["Disjuntor geral do agrupamento", atend.disjuntorGeral],
    ],
    /* Sem "Tipo de solicitação": no coletivo o pedido é por unidade,
       e cada uma aparece no seu grupo (col1). */
    [
      [
        "Modalidade",
        "Coletivo — Agrupamento com Proteção Geral (APR Web)" +
          (atend.solicitacao ? " · " + atend.solicitacao : ""),
        2,
      ],
    ],
    true,
  );

  /* ---- Conta de luz, ainda na folha 1 ----
     "Dados da torre" é quem abre a folha 2 (coletivo2). */
  B.filete();
  _pdfCorrespondenciaBT(B, S, "fatura do condomínio");

  /* ---- Dados da torre (o agrupamento), em folha nova ---- */
  B.quebrarPagina();
  B.secao("Dados da torre", { repete: false });
  B.cartoes(
    [
      [
        "Demanda do condomínio",
        num(agrupamento.demandaIncendio)
          ? fmt2(agrupamento.demandaIncendio) + " kVA"
          : "",
      ],
      ["Disjuntor do condomínio", agrupamento.disjIncendio],
      ["Demanda da torre", fmt2(demandaTotalGeral) + " kVA"],
      ["Disjuntor da torre", atend.disjuntorGeral],
    ],
    "pdf-cartoes--4col",
  );
  B.campos([
    [
      "Disjuntor do condomínio vinculado a unidade/instalação existente",
      agrupamento.disjVinculado,
      2,
    ],
    agrupamento.disjVinculado === "Sim"
      ? ["Nº da unidade/instalação", agrupamento.disjVinculadoInstalacao]
      : null,
  ].filter(Boolean));

  /* ---- Unidades consumidoras, agrupadas por tipo de pedido ----
     Uma seção por tipo (svg_3/svg_4), na ordem em que a etapa das
     UCs os oferece — e não uma tabela só com uma coluna
     "Solicitação": misturar conexão nova e alteração de carga na
     mesma lista esconde que são pedidos diferentes, com campos
     diferentes. O tipo sai do título, então não vira coluna.

     A alteração de carga não cabe numa linha de tabela: ela traz
     nº da instalação, ramo de atividade e o disjuntor que está lá
     hoje. Por isso ganha um bloco por unidade, e não uma lista. */
  const GRUPOS_UC = [
    { tipo: "Conexão Nova", prefixo: "Unidades com pedidos para ", forte: "ligação nova" },
    {
      tipo: "Alteração de Carga",
      prefixo: "Unidades com pedidos para ",
      forte: "alteração de carga",
      detalhe: true,
    },
    {
      tipo: "Caixa Existente sem Alteração",
      prefixo: "Unidades ",
      forte: "existentes sem alteração",
    },
  ];

  GRUPOS_UC.forEach((g) => {
    const doGrupo = ucBlocos
      .map((u, ui) => ({ u, ui }))
      .filter(({ u }) => u.solicitacao === g.tipo);
    if (!doGrupo.length) return;

    B.filete();
    B.secaoDestaque(g.prefixo, g.forte);

    if (!g.detalhe) {
      /* tabelaAuto derruba a coluna que ficou vazia no GRUPO: o nº
         da instalação não existe em conexão nova, e a caixa
         existente sem alteração não tem carga nem disjuntor novo —
         cada tabela sai com as colunas que aquele tipo preenche. */
      B.tabelaAuto(
        [
          "Unidade",
          "Comp.",
          hibrido ? "Norma" : null,
          "Inst. / UC / Medidor",
          "Atividade",
          "Área",
          "Carga prevista",
          "Disjuntor",
        ].filter(Boolean),
        doGrupo.map(({ u, ui }) =>
          [
            u.identificacao || `UC ${ui + 1}`,
            u.complemento,
            // Medição separada (híbrido): nº predial próprio, quando houver.
            hibrido
              ? `ND ${u.nd}` + (u.nd === "5.1" && u.nPredial ? ` · nº ${u.nPredial}` : "")
              : null,
            u.instalacao,
            u.atividade,
            _pdfVazio(u.area) ? "" : u.area + "m²",
            cargaUC(u),
            u.disjPara,
          ].filter((c) => c !== null),
        ),
        "pdf-tabela--ucs",
      );
      return;
    }

    /* Um bloco por UC: a tabelinha de quatro colunas com o que muda
       e, abaixo, os campos que só existem em alteração. Os quatro
       campos vão numa lista só porque é assim que o mock se
       comporta — sem ramo de atividade (UC residencial), o disjuntor
       atual sobe para a primeira linha (svg_4). */
    doGrupo.forEach(({ u, ui }) => {
      B.subsecao(`Unidade consumidora ${ui + 1}`);
      B.tabela(
        ["Comp.", "Área", "Carga prevista", "Disjuntor novo"],
        [
          [
            u.complemento,
            _pdfVazio(u.area) ? "" : u.area + "m²",
            cargaUC(u),
            u.disjPara,
          ],
        ],
        "pdf-tabela--uc-alterada",
      );
      B.campos([
        ["Nº da unidade/instalação", u.instalacao],
        ["Tipo de propriedade", tipoPropriedadeDe(u)],
        ["Ramo da atividade", ramoParaPdf(u.ramo)],
      ]);
      /* Alteração com mudança no complemento (mesma gravação do
         individual): o complemento da tabela é o atual. */
      if (u.mudaComplemento)
        B.campos([
          ["Tipo de solicitação", "Alteração de Carga com mudança no complemento"],
          ["Novo complemento", u.novoComplemento],
        ]);
    });
  });

  _pdfObservacoesBT(B, obs);

  return B.podar();
}

/* ============================================================
   4. Conteúdo — individual (até 3 caixas sem proteção geral)
   ------------------------------------------------------------
   Segue pdf-bt-2026-11/bt_indivi, bt_rural, bt_indiv_2_m_consum(2) e
   bt_cargas: "Imóvel e atendimento" (um bloco por imóvel), "Conta de
   luz" e — em folha nova —
   "Cargas da unidade" e "Cargas especiais da unidade".

   Cada LINHA do mock é uma chamada de B.campos() própria, e não uma
   lista só: como campo vazio é descartado, numa lista única o campo
   seguinte subiria para o buraco e a linha sairia com outra
   composição de colunas.
   ============================================================ */

const _PDF_MODALIDADE_IND = "Individual - até 3 caixas sem proteção geral";

function _pdfBlocosIndividualBT(S) {
  const {
    prop = {},
    obra = {},
    ucsDet = [],
    obs,
    demandaTotalGeral,
    pessoaFisica,
  } = S;

  const B = _pdfConstrutor();
  const rural = obra.localizacao === "Rural";
  const varias = ucsDet.length > 1;

  /* Alvo dos títulos das cargas: "Cargas da unidade" com um imóvel
     só (svg_3), "Cargas do imóvel N" com vários — o mesmo nome dos
     blocos "Imóvel N de M" da folha 1. */
  const alvoCargas = (i) => (varias ? "do imóvel " + (i + 1) : "da unidade");

  /* Faixa do cartão "Disjuntor adequado". Reaproveita a régua já
     existente (exibeTermoGrupoBBT, em individual-app.js) em vez de
     repetir o limite de 75 kW aqui. */
  const acima75 =
    typeof exibeTermoGrupoBBT === "function"
      ? exibeTermoGrupoBBT()
      : num(demandaTotalGeral) > 75;

  /* ---- Dados do proprietário ----
     Linhas do svg_1: Nome | E-mail, Celular, CPF | Filiação, RG,
     Data de nascimento. */
  B.secao("Dados do proprietário");
  B.campos([[pessoaFisica ? "Nome" : "Razão social", prop.nome, 3]]);
  const camposProp = [
    ["E-mail", prop.email],
    ["Celular", prop.celular],
    // Pessoa estrangeira não tem CPF/CNPJ: o documento é o RNE/RNM.
    prop.estrangeiro
      ? ["Nº do RNE/RNM", prop.rne]
      : [pessoaFisica ? "CPF" : "CNPJ", prop.cpfCnpj],
  ];
  if (pessoaFisica && !prop.estrangeiro)
    camposProp.push(["Filiação", prop.filiacao], ["RG", prop.rg]);
  if (pessoaFisica) camposProp.push(["Data de nascimento", dataBR(prop.nasc)]);
  if (pessoaFisica && !prop.estrangeiro)
    camposProp.push(
      /* Só sai quando a pergunta foi respondida: um "Não" fabricado
         acrescentaria à folha um campo que o mock não tem. */
      ["NIS Tarifa Social", prop.nis === "Sim" ? prop.numNis : prop.nis],
      ["Laudo médico", prop.laudoMedico],
    );
  B.campos(camposProp);

  /* ---- Imóvel e atendimento ----
     O endereço e as coordenadas são do pedido, ditos uma vez só no
     topo da seção (svg_1/svg_2); daí um bloco por imóvel. */
  /* Sem repetir o título: com vários imóveis a folha 2 abre direto
     em "Imóvel 2 de 3" (bt_indiv_2_m_consum2). */
  B.filete();
  B.secao("Imóvel e atendimento", { repete: false });
  B.campos([["Endereço", _pdfEnderecoLinhaBT(obra, rural), 3]]);
  if (rural)
    B.campos([
      ["Ponto de referência", obra.pontoRef, 2],
      ["Nº instalação mais próxima", obra.instProxima],
    ]);
  _pdfCoordenadasBT(B, obra);

  ucsDet.forEach((u, i) => {
    const cargas = u.cargas || {};
    const semAlteracao = ucSemAlteracao(u);
    const alteracao = u.solicitacao === "Alteração de Carga";

    /* Vários imóveis: cada um abre com "Imóvel" + chip "N de M" e o
       complemento que o distingue; do 2º em diante, um filete antes
       (bt_indiv_2_m_consum2). Com um imóvel só, o complemento já está
       no endereço — só sai se for outro. */
    const complAtual = [
      u.mudaComplemento ? "Complemento atual" : "Complemento",
      u.complemento,
    ];
    const novoCompl = u.mudaComplemento
      ? ["Novo complemento", u.novoComplemento, 2]
      : null;
    /* Número predial próprio do imóvel (diferente do endereço). */
    const numero =
      u.nPredial && u.nPredial !== obra.num ? ["Número", u.nPredial] : null;
    if (varias) {
      if (i > 0) B.filete();
      B.subsecaoChip("Imóvel", `${i + 1} de ${ucsDet.length}`, "contador");
      /* Chip e complemento presos aos cartões: o bloco do imóvel nunca
         começa no pé de uma folha e continua na outra. */
      B.campos([complAtual, novoCompl, numero], 1);
    } else if (
      u.mudaComplemento ||
      numero ||
      (u.complemento && u.complemento !== obra.compl)
    )
      B.campos([complAtual, novoCompl, numero]);

    /* Caixa existente sem alteração não tem carga preenchida: os
       cartões sairiam zerados, anunciando uma demanda que ninguém
       calculou. */
    if (!semAlteracao)
      B.cartoes([
        ["Demanda total", fmt2(cargas._demanda || 0) + " kVA"],
        ["Carga total", fmt2(cargas._cargaKw || 0) + " kW"],
        [
          "Disjuntor adequado",
          [
            u.disjEscolhido || (cargas._disjuntores || [])[0],
            acima75 ? "Individual acima de 75kW" : "Individual abaixo de 75kW",
          ],
        ],
      ]);

    B.campos([
      [
        "Tipo de solicitação",
        u.mudaComplemento
          ? "Alteração de Carga com mudança no complemento"
          : semAlteracao
            ? "Imóvel existente sem alteração"
            : u.solicitacao === "Conexão Nova"
              ? "Ligação Nova"
              : u.solicitacao,
      ],
      ["Modalidade", _PDF_MODALIDADE_IND],
      /* Residencial ou a categoria da Tabela 11 (urbano e rural). */
      ["Tipo de propriedade", tipoPropriedadeDe(u)],
    ]);
    if (
      u.atividade &&
      u.atividade !== "Residencial" &&
      u.atividade !== ATIVIDADE_IRRIGACAO
    )
      B.campos([["Ramo da atividade", ramoParaPdf(u.ramo), 3]]);
    if (alteracao)
      B.campos([["Nº da unidade/instalação", u.instalacao]]);
    /* Perfil de carga escolhido na Etapa 5 (perfis-carga.js). */
    if (!semAlteracao && typeof perfilRotuloUcBT === "function")
      B.campos([["Perfil de carga", perfilRotuloUcBT(u), 3]]);
    /* Categoria da Tabela 11 só existe em atividade não residencial —
       no exemplo residencial do mock ela não aparece por estar vazia,
       não por ter sido retirada. */
    if (cargas.tipoA === "nr" && cargas.catA != null)
      B.campos([
        ["Categoria de atividade", (TABELA_11[cargas.catA] || {}).d, 3],
      ]);

    /* Padrão de energia: no individual cada imóvel responde por si
       (Etapa 4). Ligação nova não pergunta mudança de local — não há
       padrão existente para mudar. No imóvel existente, "pronto para
       ligar" e "distância" só existem se o padrão muda de local
       (mesma ordem da Etapa 4). A rede fecha a mesma lista: no mock as
       três perguntas dividem uma linha. */
    const dist = [
      "Distância do padrão até a rede Cemig inferior a 30m?",
      u.distMenor30,
    ];
    const pronto = ["O padrão está pronto para ser ligado?", u.prontoLigar];
    const camposPadrao =
      u.solicitacao === "Conexão Nova"
        ? [dist, pronto]
        : [["O padrão precisa ser mudado de local?", u.mudancaLocal]].concat(
            u.mudancaLocal === "Sim" ? [pronto, dist] : [],
          );
    B.campos(
      camposPadrao.concat([["Tipo de rede BT que atende o local", obra.tipoRede]]),
    );

    /* Rural com mudança de local: a coordenada do NOVO padrão é do
       imóvel, não do pedido. */
    if (rural && u.mudancaLocal === "Sim" && (u.padraoLat || u.padraoLng))
      B.cartoes([
        ["Coordenadas do novo padrão", _pdfCoordBT(u.padraoLat, u.padraoLng)],
        ["UTM do novo padrão", u.padraoUtm],
      ]);
  });

  if (obra.restricaoAmbiental === "Sim")
    B.campos([["Restrições ambientais", obra.restricoesTexto, 3]]);

  /* ---- Conta de luz ---- */
  B.filete();
  _pdfCorrespondenciaBT(B, S);

  /* ---- Cargas, em folha nova ----
     A quebra é do documento, não do transbordo: no mock as cargas
     começam numa folha limpa mesmo com a anterior quase vazia
     (svg_2 → svg_3). Só a PRIMEIRA UC abre folha; as seguintes
     fluem. */
  let primeiraCarga = true;
  const abrirCargas = (titulo) => {
    if (primeiraCarga) {
      B.quebrarPagina();
      primeiraCarga = false;
    }
    B.secao(titulo);
  };

  ucsDet.forEach((u, i) => {
    if (ucSemAlteracao(u)) return;
    const cargas = u.cargas || {};
    const qtds = cargas.qtds || [];
    const itens = CAT.map((c, k) => ({ ...c, q: qtds[k] || 0 })).filter(
      (x) => x.q > 0,
    );
    const motores = (cargas.mots || []).filter((m) => (m.q || 0) > 0);
    const gerador = u.gerador || {};
    const temGerador = gerador.possui === "Sim";
    const alvo = alvoCargas(i);

    if (itens.length) {
      abrirCargas("Cargas " + alvo);
      B.tabela(
        ["Equipamento", "Potência (W)", "Qtde.", "Total (W)"],
        itens.map((it) => [it.n, fmtW(it.w), it.q, fmtW(it.q * it.w)]),
        "pdf-tabela--equipamentos",
        "CARGA TOTAL: " + fmt2(cargas._cargaKw || 0) + " kW",
      );
    }

    if (!motores.length && !temGerador) return;
    abrirCargas("Cargas especiais " + alvo);

    if (motores.length) {
      B.subsecao("Motores");
      /* A coluna da tabela de demanda depende da QUANTIDADE total de
         motores da UC — a mesma régua da calculadora. */
      const col = motorColPorQtd(
        motores.reduce((soma, m) => soma + (parseInt(m.q) || 0), 0),
      );
      B.tabela(
        [
          "Tipo de sistema elétrico",
          "Potência (CV)",
          "Qtde.",
          "Demanda unit. (kVA)",
          "Demanda total (kVA)",
        ],
        motores.map((m) => {
          const unit = motorKvaUnit(m.fase, m.cv, col);
          const faixa = m.fase === "mono" ? MOTOR_MONO : MOTOR_TRI;
          const rotulo =
            (faixa.find((r) => r.cv === parseFloat(m.cv)) || {}).l || m.cv;
          return [
            m.fase === "mono" ? "Monofásico" : "Trifásico",
            rotulo,
            m.q,
            fmt2(unit),
            fmt2((parseInt(m.q) || 0) * unit),
          ];
        }),
        "pdf-tabela--motores",
      );
    }

    if (temGerador) {
      B.subsecao("Gerador de emergência");
      /* tabelaAuto derruba "Observações" quando ninguém descreveu o
         gerador — é a coluna que o mock não desenha. */
      B.tabelaAuto(
        ["Potência (kVA)", "Fonte de combustível", "Observações"],
        [[gerador.potencia, gerador.fonte, gerador.descricao]],
        "pdf-tabela--gerador",
      );
    }
  });

  _pdfObservacoesBT(B, obs);

  return B.podar();
}

/* ============================================================
   5. Despacho
   ------------------------------------------------------------
   O despacho NÃO pode olhar só para `coletivo`: essa flag é
   disjGeral === "Sim" (bt/js/coletivo-app.js), e fica falsa no
   agrupamento que dispensa a proteção geral. Quem separa os
   documentos de verdade é a forma do estado — a página do
   individual preenche `ucsDet`, a do coletivo manda `ucsDet` vazio
   e as unidades em `ucBlocos`/`blocos` —, e o condomínio se anuncia
   pela própria flag `multiTorres`.
   ============================================================ */

function _pdfBlocosBT(S) {
  if (S.multiTorres) return _pdfBlocosMultiTorresBT(S);
  const individual = !S.coletivo && (S.ucsDet || []).length > 0;
  return individual ? _pdfBlocosIndividualBT(S) : _pdfBlocosColetivoBT(S);
}

/* ============================================================
   6. Exportação
   ============================================================ */

async function gerarPdfDocumento(S) {
  await _pdfMontarEBaixar(() => _pdfBlocosBT(S), {
    arquivo: _pdfNomeArquivo("BT", S && S.prop && S.prop.nome),
    titulo: "Formulário de Ligação Nova e Alteração de Carga",
  });
}
