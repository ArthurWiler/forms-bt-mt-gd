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

/* Miolo de "Dados do empreendimento" — idêntico no coletivo e no
   múltiplas torres a partir da razão social (svg_1 dos dois mocks).
   Só o que vem ANTES dele (cartões de totais, tipo de solicitação e
   modalidade) distingue as duas modalidades. */
function _pdfEmpreendimentoBT(B, S) {
  const { prop = {}, obra = {}, pessoaFisica } = S;
  B.campos([["Cliente / Razão Social do empreendimento", prop.cliente, 3]]);
  B.campos([
    [pessoaFisica ? "CPF" : "CNPJ", prop.cpfCnpj],
    ["Nº ART/TRT do projeto", obra.art],
    ["Área do empreendimento", obra.localizacao],
  ]);
  B.campos([
    ["CEP", obra.cep],
    ["Endereço", obra.endereco, 2],
  ]);
  B.campos([
    ["Número", obra.num],
    ["Complemento", obra.compl],
    ["Bairro", obra.bairro],
  ]);
  B.campos([
    ["Cidade", obra.cidade],
    ["Estado", obra.estado],
  ]);
  B.cartoes([
    ["Coordenadas", _pdfCoordBT(obra.lat, obra.lng)],
    ["Coordenada UTM", _pdfUtmBT(obra)],
  ]);
  B.campos([
    ["Distância do padrão até a rede Cemig inferior a 30m?", obra.distMenor30],
    ["O padrão está pronto para ser ligado?", obra.prontoLigar],
    ["Tipo de rede BT que atende o local", obra.tipoRede],
  ]);
}

/* "Correspondência" — mesma seção nas três modalidades: para onde
   vai a fatura e em que dia ela vence (svg_2 de cada mock). O
   rótulo do destino muda com a forma escolhida, e por isso não é
   uma lista fixa de campos. */
function _pdfCorrespondenciaBT(B, S) {
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
      ? ["E-mail para receber a fatura", prop.email]
      : corr.alternativa === "Outro e-mail"
        ? ["E-mail para receber a fatura", corr.outroEmail]
        : corr.alternativa === "Conta globalizada"
          ? ["Conta globalizada", corr.contaGlobal]
          : corr.alternativa === "Mesmo da obra"
            ? [
                "Endereço para receber a fatura",
                "Mesmo da obra — " + enderecoObra,
                3,
              ]
            : corr.alternativa === "Endereço novo"
              ? ["Endereço para receber a fatura", enderecoNovo, 3]
              : ["Forma de recebimento da fatura", corr.alternativa];
  B.secao("Correspondência");
  B.campos([
    destinoFatura,
    [
      "Data de vencimento da fatura",
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
   Segue docs/mocks/pdf-bt-multitorres/svg_1 … svg_4: folha 1 com
   contato e empreendimento, folha 2 com o projeto (hierarquia de
   proteção) e a correspondência, e daí uma folha por torre —
   quatro cartões de resumo e a tabela das unidades.

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
  B.cartoes([
    ["Demanda total de todas as torres", fmt2(demandaTotalGeral) + " kVA"],
    ["Carga total de todas as torres", fmt2(prevTotalKw) + " kW"],
  ]);
  B.campos([
    ["Tipo de solicitação", atend.escopo],
    [
      "Modalidade",
      /* "14 torres" no mock; o singular existe porque o
         empreendimento pode ter uma torre só. */
      `Múltiplas torres - ${blocos.length} ` +
        (blocos.length === 1 ? "torre" : "torres"),
    ],
  ]);
  _pdfEmpreendimentoBT(B, S);

  /* ---- Dados do projeto, em folha nova ----
     A quebra é do documento, não do transbordo: no mock a folha 1
     termina com bastante espaço livre e o projeto abre limpo
     (svg_1 → svg_2). */
  B.quebrarPagina();
  B.secao("Dados do projeto");
  B.campos([
    [
      "Onde a energia deverá ser disponibilizada no empreendimento?",
      atend.disponibilizacaoEnergia,
      3,
    ],
  ]);
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

  /* ---- Correspondência ---- */
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
    B.secao(`Dados da torre ${b.nome || bi + 1}`);
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
   Segue docs/mocks/pdf-bt-coletivo/svg_1 … svg_4: folha 1 com
   contato e empreendimento, folha 2 com a correspondência e folha 3
   com o resumo do agrupamento, seguido das unidades AGRUPADAS POR
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
      : (modoCalculadora
          ? fmt2(num((u.cargas || {})._cargaKw))
          : fmt2(prevKwUC(u))) + " kW";

  /* ---- Dados para contato ---- */
  _pdfContatoBT(B, prop);

  /* ---- Dados do empreendimento ---- */
  B.filete();
  B.secao("Dados do empreendimento");
  B.cartoes([
    ["Demanda total de todas as unidades", fmt2(demandaTotalGeral) + " kVA"],
    ["Carga total de todas as unidades", fmt2(prevTotalKw) + " kW"],
    ["Disjuntor geral do agrupamento", atend.disjuntorGeral],
  ]);
  B.campos([
    ["Tipo de solicitação", atend.escopo],
    [
      "Modalidade",
      "Coletivo — Agrupamento com Proteção Geral (APR Web)" +
        (atend.solicitacao ? " · " + atend.solicitacao : ""),
      2,
    ],
  ]);
  _pdfEmpreendimentoBT(B, S);

  /* ---- Correspondência, em folha nova (svg_1 → svg_2) ---- */
  B.quebrarPagina();
  _pdfCorrespondenciaBT(B, S);

  /* ---- Dados da torre (o agrupamento), em folha nova ---- */
  B.quebrarPagina();
  B.secao("Dados da torre");
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
    { tipo: "Conexão Nova", prefixo: "Unidades com pedidos para ", forte: "conexão nova" },
    {
      tipo: "Alteração de Carga",
      prefixo: "Unidades com pedidos para ",
      forte: "alteração de carga",
      detalhe: true,
    },
    {
      tipo: "Caixa Existente sem Alteração",
      prefixo: "Unidades em ",
      forte: "caixa existente sem alteração",
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
          "Carga prevista",
          "Disjuntor",
        ].filter(Boolean),
        doGrupo.map(({ u, ui }) =>
          [
            u.identificacao || `UC ${ui + 1}`,
            u.complemento,
            hibrido ? `ND ${u.nd}` : null,
            u.instalacao,
            u.atividade,
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
        ["Atividade principal", u.atividade],
        ["Ramo da atividade", ramoParaPdf(u.ramo)],
        ["Disjuntor atual", u.disjDe],
      ]);
    });
  });

  _pdfObservacoesBT(B, obs);

  return B.podar();
}

/* ============================================================
   4. Conteúdo — individual (até 3 caixas sem proteção geral)
   ------------------------------------------------------------
   Segue docs/mocks/pdf-bt-individual/svg_1 … svg_7: uma seção por
   unidade consumidora, "Correspondência" e — em folha nova —
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

  /* Sem número quando há uma só UC, numerada a partir daí — é a
     diferença entre o svg_1 e o svg_5. */
  const nomeUC = (i) => "unidade consumidora" + (varias ? " " + (i + 1) : "");

  /* Faixa do cartão "Disjuntor adequado". Reaproveita a régua já
     existente (exibeTermoGrupoBBT, em individual-app.js) em vez de
     repetir o limite de 75 kW aqui. */
  const acima75 =
    typeof exibeTermoGrupoBBT === "function"
      ? exibeTermoGrupoBBT()
      : num(demandaTotalGeral) > 75;

  /* ---- Dados do proprietário ---- */
  B.secao("Dados do proprietário");
  const camposProp = [
    [pessoaFisica ? "Nome" : "Razão social", prop.nome, 3],
    ["E-mail", prop.email],
    ["Celular", prop.celular],
    [pessoaFisica ? "CPF" : "CNPJ", prop.cpfCnpj],
  ];
  if (pessoaFisica)
    camposProp.push(
      ["Filiação", prop.filiacao],
      ["RG", prop.rg],
      ["Data de nascimento", dataBR(prop.nasc)],
      ["Laudo médico", prop.laudoMedico],
      /* Só sai quando a pergunta foi respondida: um "Não" fabricado
         acrescentaria à folha um campo que o mock não tem. */
      ["NIS Tarifa Social", prop.nis === "Sim" ? prop.numNis : prop.nis],
    );
  camposProp.push(["Telefone fixo", prop.fixo]);
  B.campos(camposProp);

  /* ---- Dados da unidade consumidora (uma seção por UC) ---- */
  ucsDet.forEach((u, i) => {
    const cargas = u.cargas || {};
    const semAlteracao = ucSemAlteracao(u);
    const alteracao = u.solicitacao === "Alteração de Carga";

    B.filete();
    B.secao("Dados da " + nomeUC(i));

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
      ["Tipo de solicitação", u.solicitacao],
      ["Modalidade", _PDF_MODALIDADE_IND],
      alteracao
        ? ["Disjuntor atual", u.disjDe]
        : ["Atividade principal", u.atividade],
    ]);
    /* Em alteração de carga o disjuntor atual toma a 3ª coluna e a
       atividade desce uma linha, junto do nº da instalação (svg_4). */
    if (alteracao)
      B.campos([
        ["Nº da unidade/instalação", u.instalacao],
        ["Atividade principal", u.atividade],
      ]);
    /* Categoria da Tabela 11 só existe em atividade não residencial —
       no exemplo residencial do mock ela não aparece por estar vazia,
       não por ter sido retirada. */
    if (cargas.tipoA === "nr" && cargas.catA != null)
      B.campos([
        ["Categoria de atividade", (TABELA_11[cargas.catA] || {}).d, 3],
      ]);

    if (rural) {
      B.campos([
        ["Cidade", obra.cidade],
        ["Estado", obra.estado],
      ]);
      B.campos([
        ["Distrito/Comunidade", obra.distritoComunidade],
        ["Nome da propriedade", obra.nomePropriedade],
      ]);
      B.campos([
        ["Ponto de referência", obra.pontoRef, 2],
        ["Instalação mais próxima", obra.instProxima],
      ]);
    } else {
      B.campos([
        ["CEP", obra.cep],
        ["Endereço", obra.endereco, 2],
      ]);
      B.campos([
        ["Número", u.nPredial || obra.num],
        ["Complemento", u.complemento || obra.compl],
        ["Bairro", obra.bairro],
      ]);
      B.campos([
        ["Cidade", obra.cidade],
        ["Estado", obra.estado],
      ]);
    }

    /* Rural com mudança de local traz a coordenada do NOVO padrão;
       nos demais casos vale a da obra, repetida em cada UC como no
       svg_6. */
    const novoPadrao =
      rural && u.mudancaLocal === "Sim" && (u.padraoLat || u.padraoLng);
    B.cartoes([
      [
        "Coordenadas",
        novoPadrao
          ? _pdfCoordBT(u.padraoLat, u.padraoLng)
          : _pdfCoordBT(obra.lat, obra.lng),
      ],
      ["Coordenada UTM", novoPadrao ? u.padraoUtm : _pdfUtmBT(obra)],
    ]);

    B.campos([
      [
        "Distância do padrão até a rede Cemig inferior a 30m?",
        obra.distMenor30,
      ],
      ["O padrão está pronto para ser ligado?", obra.prontoLigar],
      ["O padrão precisa ser mudado de local?", u.mudancaLocal],
    ]);
    B.campos([["Tipo de rede BT que atende o local", obra.tipoRede]]);
    if (obra.restricaoAmbiental === "Sim")
      B.campos([["Restrições ambientais", obra.restricoesTexto, 3]]);
  });

  /* ---- Correspondência ---- */
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
    const alvo = varias ? nomeUC(i) : "unidade";

    if (itens.length) {
      abrirCargas("Cargas da " + alvo);
      B.tabela(
        ["Equipamento", "Potência (W)", "Qtde.", "Total (W)"],
        itens.map((it) => [it.n, fmtW(it.w), it.q, fmtW(it.q * it.w)]),
        "pdf-tabela--equipamentos",
        "CARGA TOTAL: " + fmt2(cargas._cargaKw || 0) + " kW",
      );
    }

    if (!motores.length && !temGerador) return;
    abrirCargas("Cargas especiais da " + alvo);

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
