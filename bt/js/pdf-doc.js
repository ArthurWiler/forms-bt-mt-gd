/* ============================================================
   CEMIG BT — Documento do PDF (HTML + window.print)
   ------------------------------------------------------------
   Substitui o motor jsPDF que desenhava o PDF com doc.rect/
   doc.text. Agora o documento é HTML de verdade, estilizado por
   css/pdf/*.css e paginado aqui; quem rasteriza é o navegador.
   Ganhos: o estilo passa a ser CSS versionado (e não constantes
   espalhadas no JS), o texto sai selecionável e a fonte é a Open
   Sans do projeto, não a Helvetica embutida na biblioteca.

   Usa os helpers globais do módulo BT, como o motor antigo fazia:
   fmt2, fmtW, num, prevKwUC, ucSemAlteracao, ramoParaPdf, CAT,
   TABELA_11, MOTOR_MONO/TRI, motorColPorQtd, motorKvaUnit,
   calcBlocoMultiTorres, disjGeralTorreObrigatorio, utmString.

   Os moldes de markup ficam em bt/etapas/07-previa.html.
   ============================================================ */

/* ============================================================
   1. Moldes
   ============================================================ */

function _pdfMolde(id) {
  const t = document.getElementById(id);
  if (!t || !t.content) throw new Error("Molde do PDF ausente: " + id);
  return t.content.firstElementChild.cloneNode(true);
}

/* Mesma regra do motor antigo: campo sem valor (ou com o travessão
   de "não se aplica") não vai para o papel. */
const _pdfVazio = (v) =>
  v === undefined ||
  v === null ||
  String(v).trim() === "" ||
  String(v).trim() === "—";

/* ============================================================
   2. Construtor de blocos
   ------------------------------------------------------------
   O documento é montado como uma LISTA PLANA de blocos, não como
   uma árvore de seções: é o que permite ao paginador decidir onde
   cortar. Cada bloco carrega sua política de quebra em `prende`
   (quantos blocos seguintes têm de ficar na mesma página).
   ============================================================ */

function _pdfConstrutor() {
  const blocos = [];

  const push = (el, prende) => {
    blocos.push({ el, prende: prende || 0 });
    return el;
  };

  /* Título de seção prende o bloco seguinte: sozinho no pé da
     página ele viraria uma órfã. */
  const secao = (texto) => {
    const el = _pdfMolde("tplPdfSecao");
    el.textContent = texto;
    push(el, 1);
  };

  const subsecao = (texto) => {
    const el = _pdfMolde("tplPdfSubsecao");
    el.textContent = texto;
    push(el, 1);
  };

  const filete = () => push(_pdfMolde("tplPdfFilete"));

  /* Campos na grade de 3 colunas. `lista` = [[rótulo, valor, cols?]].
     Cada LINHA da grade vira um bloco próprio — uma seção inteira
     num só elemento seria um átomo maior que a página. */
  const campos = (lista) => {
    let linha = null;
    let usadas = 0;
    (lista || [])
      .filter((c) => c && !_pdfVazio(c[1]))
      .forEach((c) => {
        const largura = Math.min(3, c[2] || 1);
        if (!linha || usadas + largura > 3) {
          linha = push(_pdfMolde("tplPdfGrade"));
          usadas = 0;
        }
        const campo = _pdfMolde("tplPdfCampo");
        /* Nomes literais, não "pdf-campo--" + n + "col": classe
           montada por concatenação some de uma busca textual, e é
           ela que sustenta a poda de CSS morto do projeto. */
        if (largura === 2) campo.classList.add("pdf-campo--2col");
        if (largura === 3) campo.classList.add("pdf-campo--3col");
        campo.querySelector(".pdf-rotulo").textContent = c[0];
        campo.querySelector(".pdf-valor").textContent = String(c[1]);
        linha.appendChild(campo);
        usadas += largura;
      });
  };

  /* Cartões de destaque. O valor pode ser um array: cada item vira
     uma linha dentro do cartão (é o "Bipolar 63A / Individual
     abaixo de 75 kW" do mock). */
  const cartoes = (lista) => {
    const uteis = (lista || []).filter(
      (c) => c && [].concat(c[1]).some((v) => !_pdfVazio(v)),
    );
    if (!uteis.length) return;
    const linha = push(_pdfMolde("tplPdfCartoes"));
    uteis.forEach((c) => {
      const cartao = _pdfMolde("tplPdfCartao");
      cartao.querySelector(".pdf-rotulo").textContent = c[0];
      const primeiro = cartao.querySelector(".pdf-valor");
      const valores = [].concat(c[1]).filter((v) => !_pdfVazio(v));
      primeiro.textContent = String(valores[0]);
      valores.slice(1).forEach((v) => {
        const extra = primeiro.cloneNode(false);
        extra.textContent = String(v);
        cartao.appendChild(extra);
      });
      linha.appendChild(cartao);
    });
  };

  /* `colunas` = [rótulo] ou [{ rotulo, num: true }] para as
     numéricas, que saem alinhadas à direita. */
  const tabela = (colunas, linhas, modificador) => {
    if (!linhas || !linhas.length) return;
    const el = _pdfMolde("tplPdfTabela");
    if (modificador) el.classList.add(modificador);
    const cab = el.tHead.rows[0];
    colunas.forEach((col) => {
      const th = document.createElement("th");
      th.textContent = col && col.rotulo !== undefined ? col.rotulo : col;
      if (col && col.num) th.className = "pdf-col-num";
      cab.appendChild(th);
    });
    linhas.forEach((linha) => {
      const tr = document.createElement("tr");
      linha.forEach((celula, i) => {
        const td = document.createElement("td");
        td.textContent = _pdfVazio(celula) ? "—" : String(celula);
        if (colunas[i] && colunas[i].num) td.className = "pdf-col-num";
        tr.appendChild(td);
      });
      el.tBodies[0].appendChild(tr);
    });
    push(el);
  };

  /* Herdado do motor antigo: coluna inteiramente vazia não é
     impressa (ex.: "Inst. / UC / Medidor" quando todas as UCs são
     Conexão Nova). A 1ª coluna, que identifica a linha, fica sempre. */
  const tabelaAuto = (colunas, linhas, modificador) => {
    if (!linhas || !linhas.length) return;
    const manter = colunas.map(
      (_, i) => i === 0 || linhas.some((l) => !_pdfVazio(l[i])),
    );
    tabela(
      colunas.filter((_, i) => manter[i]),
      linhas.map((l) => l.filter((_, i) => manter[i])),
      modificador,
    );
  };

  const total = (rotulo, valor) => {
    const el = _pdfMolde("tplPdfTotal");
    el.querySelector(".pdf-total-rotulo").textContent = rotulo;
    el.querySelector(".pdf-total-valor").textContent = valor;
    push(el);
  };

  /* Um bloco por parágrafo: assim o corte entre páginas cai entre
     parágrafos, e só um parágrafo isolado maior que a folha
     precisa ser fatiado no meio. */
  const paragrafos = (texto) => {
    String(texto == null ? "" : texto)
      .split(/\n+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .forEach((t) => {
        const el = _pdfMolde("tplPdfObservacoes");
        el.textContent = t;
        push(el);
      });
  };

  const assinatura = () => push(_pdfMolde("tplPdfAssinatura"));

  /* Toda seção pode esvaziar: os campos são filtrados por _pdfVazio,
     e há combinações (correspondência por e-mail sem dia de
     vencimento, projeto sem nenhum nível de proteção) em que nada
     sobra. Sem esta limpeza sobrariam um título e um filete soltos,
     anunciando uma seção que não existe. Roda no fim, uma vez, em
     vez de obrigar cada chamador a conferir antes de abrir a seção. */
  const podar = () => {
    for (let i = blocos.length - 1; i >= 0; i -= 1) {
      const el = blocos[i].el;
      const proximo = blocos[i + 1] && blocos[i + 1].el;
      const vazia =
        el.classList.contains("pdf-secao-titulo") &&
        (!proximo ||
          proximo.classList.contains("pdf-secao-titulo") ||
          proximo.classList.contains("pdf-filete"));
      /* Filete que ficou encostado noutro filete, ou que sobrou no
         fim do documento, também sai. */
      const filDuplo =
        el.classList.contains("pdf-filete") &&
        (!proximo || proximo.classList.contains("pdf-filete"));
      if (vazia || filDuplo) blocos.splice(i, 1);
    }
    /* Um filete só faz sentido ENTRE seções. */
    while (blocos.length && blocos[0].el.classList.contains("pdf-filete"))
      blocos.shift();
    return blocos;
  };

  return {
    blocos,
    podar,
    secao,
    subsecao,
    filete,
    campos,
    cartoes,
    tabela,
    tabelaAuto,
    total,
    paragrafos,
    assinatura,
  };
}

/* ============================================================
   3. Conteúdo do formulário BT
   ============================================================ */

function _pdfBlocosBT(S) {
  const {
    multiTorres,
    coletivo,
    modoCalculadora,
    atend = {},
    prop = {},
    corr = {},
    obra = {},
    prevTotalKw,
    demandaPrevTotal,
    trocaDisjGeral,
    hibrido,
    ucsDet = [],
    ucBlocos = [],
    blocos = [],
    totalUcsEmpreendimento,
    obs,
    demandaTotalGeral,
    pessoaFisica,
  } = S;

  const B = _pdfConstrutor();

  /* dataBR (aaaa-mm-dd → dd/mm/aaaa) mora em js/bt-core.js: a prévia mostra a
     mesma data que o papel. */

  const coordFmt = () => {
    const f = (v) => {
      const n = parseFloat(String(v).replace(",", "."));
      return isNaN(n) ? null : n.toFixed(6);
    };
    return [f(obra.lat), f(obra.lng)].filter((x) => x !== null).join(", ");
  };

  const modalidade = multiTorres
    ? "Empreendimento com Múltiplas Torres ou Blocos"
    : coletivo
      ? "Coletivo - Agrupamento com Proteção Geral (APR Web)"
      : "Individual - até 3 caixas sem proteção geral";

  const ucPrincipal = ucsDet[0] || {};
  const obraRural = obra.localizacao === "Rural";

  /* No individual a carga total não vem pronta no estado (prevTotalKw
     só é calculado no coletivo), então soma as UCs detalhadas. */
  const cargaTotalKw =
    coletivo || multiTorres
      ? num(prevTotalKw)
      : ucsDet.reduce((s, u) => s + num((u.cargas || {})._cargaKw), 0);

  /* Faixa do cartão "Disjuntor adequado". Reaproveita a régua já
     existente (exibeTermoGrupoBBT, em individual-app.js) em vez de
     repetir o limite de 75 kW aqui — se a regra mudar, muda num
     lugar só. A página do coletivo não define essa função. */
  const acima75 =
    typeof exibeTermoGrupoBBT === "function"
      ? exibeTermoGrupoBBT()
      : num(demandaTotalGeral) > 75;

  /* ---- Dados do proprietário ---- */
  B.secao("Dados do proprietário");
  const camposProp = [];
  if (multiTorres) {
    /* Condomínio de torres: contato e razão social são campos
       distintos e ambos vão para o papel. */
    camposProp.push(
      ["Nome para contato", prop.nome, 3],
      ["Cliente / Razão Social", prop.cliente, 3],
    );
  } else {
    camposProp.push([pessoaFisica ? "Nome" : "Razão social", prop.nome, 3]);
  }
  camposProp.push(
    ["E-mail", prop.email],
    ["Celular", prop.celular],
    [pessoaFisica ? "CPF" : "CNPJ", prop.cpfCnpj],
  );
  if (pessoaFisica) {
    camposProp.push(
      ["Filiação", prop.filiacao],
      ["RG/RNE/RANI", prop.rg],
      ["Data de nascimento", dataBR(prop.nasc)],
      ["Laudo médico", prop.laudoMedico],
      ["NIS Tarifa Social", prop.nis === "Sim" ? prop.numNis : "Não"],
    );
  }
  camposProp.push(["Telefone fixo", prop.fixo]);
  B.campos(camposProp);

  /* ---- Dados da unidade consumidora ---- */
  B.filete();
  B.secao("Dados da unidade consumidora");
  B.cartoes([
    ["Demanda total", fmt2(demandaTotalGeral) + " kVA"],
    ["Carga total", fmt2(cargaTotalKw) + " kW"],
    [
      "Disjuntor adequado",
      [
        multiTorres
          ? atend.disjEmpreendimento
          : coletivo
            ? atend.disjuntorGeral
            : ucPrincipal.disjEscolhido ||
              ((ucPrincipal.cargas || {})._disjuntores || [])[0],
        coletivo || multiTorres
          ? ""
          : acima75
            ? "Individual acima de 75 kW"
            : "Individual abaixo de 75 kW",
      ],
    ],
  ]);

  B.campos([
    [
      "Tipo de solicitação",
      coletivo || multiTorres ? atend.escopo : ucPrincipal.solicitacao,
    ],
    ["Modalidade", modalidade],
    ["Atividade principal", ucPrincipal.atividade],
    ["Possui disjuntor geral?", atend.disjGeral],
    [
      "Nº de unidades consumidoras",
      multiTorres ? totalUcsEmpreendimento : atend.nUCs,
    ],
    [coletivo ? "Tipo do Atendimento" : "Disjuntor solicitado", atend.solicitacao],
  ]);

  if (obraRural) {
    B.campos([
      ["Cidade", obra.cidade],
      ["Estado", obra.estado],
      ["Distrito/Comunidade", obra.distritoComunidade],
      ["Nome da propriedade", obra.nomePropriedade],
      ["Ponto de referência", obra.pontoRef, 2],
      ["Instalação mais próxima", obra.instProxima],
    ]);
  } else {
    B.campos([
      ["CEP", obra.cep],
      ["Endereço", obra.endereco, 2],
      ["Número", obra.num],
      ["Complemento", obra.compl],
      ["Bairro", obra.bairro],
      ["Cidade", obra.cidade],
      ["Estado", obra.estado],
    ]);
  }

  B.cartoes([
    ["Coordenadas", coordFmt()],
    [
      "Coordenada UTM",
      obra.utm ||
        (typeof utmString === "function" ? utmString(obra.lat, obra.lng) : ""),
    ],
  ]);

  B.campos([
    ["Distância do padrão até a rede Cemig inferior a 30m?", obra.distMenor30],
    ["O padrão está pronto para ser ligado?", obra.prontoLigar],
    ["O padrão precisa ser mudado de local?", ucPrincipal.mudancaLocal],
    ["Tipo de rede BT que atende o local", obra.tipoRede],
    ["Localização", obra.localizacao],
    ["Transformador próximo", obra.transformador],
    coletivo ? ["Nº ART/TRT de Projeto", obra.art] : null,
    obra.restricaoAmbiental === "Sim"
      ? ["Restrições ambientais", obra.restricoesTexto, 3]
      : null,
  ]);

  /* ---- Correspondência e fatura ---- */
  B.filete();
  B.secao("Correspondência e fatura");
  const camposCorr = [
    ["Forma de recebimento da fatura", corr.alternativa],
    ["Dia de vencimento", corr.vencimento ? "Dia " + corr.vencimento : ""],
  ];
  if (corr.alternativa === "Conta globalizada")
    camposCorr.push(["Conta globalizada", corr.contaGlobal]);
  if (corr.alternativa === "E-mail informado") {
    camposCorr.push(["E-mail para envio da fatura", prop.email, 2]);
  } else if (corr.alternativa === "Outro e-mail") {
    camposCorr.push(["E-mail alternativo para a fatura", corr.outroEmail, 2]);
  } else if (corr.alternativa === "Mesmo da obra") {
    const endO = [
      [obra.endereco, obra.num].filter(Boolean).join(", "),
      obra.compl,
      obra.bairro,
      [obra.cidade, obra.estado].filter(Boolean).join("/"),
      obra.cep ? "CEP " + obra.cep : "",
    ]
      .filter(Boolean)
      .join(" - ");
    camposCorr.push([
      "Endereço de correspondência",
      "Mesmo da obra — " + endO,
      3,
    ]);
  } else if (corr.alternativa === "Endereço novo") {
    const endC = [
      [corr.rua, corr.num].filter(Boolean).join(", "),
      corr.compl,
      corr.bairro,
      corr.municipio,
      corr.estado,
      corr.cep ? "CEP " + corr.cep : "",
    ]
      .filter(Boolean)
      .join(" - ");
    camposCorr.push(["Endereço de correspondência", endC, 3]);
  }
  B.campos(camposCorr);

  /* ---- Unidades consumidoras (varia por modalidade) ---- */
  if (multiTorres) {
    B.filete();
    B.secao("Empreendimento com múltiplas torres");
    B.campos([
      ["Atendimento a", "Torre"],
      ["Nº de torres", blocos.length],
      ["Total de UCs do empreendimento", totalUcsEmpreendimento],
    ]);
    B.tabela(
      [
        "Bloco",
        "Disjuntor geral",
        { rotulo: "Dem. UCs (kVA)", num: true },
        { rotulo: "Qtd UCs", num: true },
        "Disj. cond./incêndio",
        { rotulo: "Dem. cond. (kVA)", num: true },
      ],
      blocos.map((b) => [
        b.nome,
        /* Torre que dispensa o geral imprime "Dispensado". */
        disjGeralTorreObrigatorio(b) ? b.disjGeral : "Dispensado",
        fmt2(calcBlocoMultiTorres(b).demandaUcs),
        b.qtdUCs,
        b.disjIncendio,
        b.demandaIncendio,
      ]),
    );
    B.total("Demanda total do empreendimento", `${fmt2(demandaTotalGeral)} kVA`);

    blocos.forEach((b, bi) => {
      const ucs = b.ucs || [];
      if (!ucs.length) return;
      B.subsecao(`Torre ${b.nome || bi + 1} — unidades consumidoras`);
      const cb = calcBlocoMultiTorres(b);
      const modoCalcTorre = cb.modoCalculadora;
      B.tabelaAuto(
        [
          "Unidade",
          "Compl.",
          "Inst. / UC / Medidor",
          "Solicitação",
          "Disjuntor",
          { rotulo: "Carga (kW)", num: true },
          { rotulo: "Dem. (kVA)", num: true },
        ],
        ucs.map((u, ui) => [
          u.identificacao || `UC ${ui + 1}`,
          u.complemento,
          u.solicitacao !== "Conexão Nova" ? u.instalacao : "",
          u.solicitacao,
          u.disjPara,
          ucSemAlteracao(u)
            ? ""
            : modoCalcTorre
              ? fmt2(num((u.cargas || {})._cargaKw))
              : fmt2(prevKwUC(u)),
          ucSemAlteracao(u) || !modoCalcTorre
            ? ""
            : fmt2(num((u.cargas || {})._demanda)),
        ]),
        "pdf-tabela--ucs",
      );
      B.campos([
        !modoCalcTorre
          ? [
              "Demanda residencial (ND-5.2)",
              `${fmt2(cb.demResidencial)} kVA (${cb.qtdApart} ap. · área méd. ${fmt2(cb.areaMedia)} m²)`,
              2,
            ]
          : null,
        !modoCalcTorre && cb.temNaoResidencial
          ? ["Demanda não residencial", `${fmt2(cb.demNaoResidencial)} kVA`]
          : null,
        modoCalcTorre
          ? ["Demanda das UCs (cargas detalhadas)", `${fmt2(cb.demandaUcs)} kVA`]
          : null,
        num(b.demandaIncendio)
          ? ["Demanda combate a incêndio", `${fmt2(num(b.demandaIncendio))} kVA`]
          : null,
        [
          "Demanda total da torre",
          `${fmt2(cb.demandaUcs + num(b.demandaIncendio))} kVA`,
        ],
      ]);
    });

    /* Hierarquia de proteção: só imprime os níveis configurados. */
    if (
      atend.disponibilizacaoEnergia ||
      atend.disjEmpreendimento ||
      atend.disjCondominio ||
      atend.temPrumada === "Sim"
    ) {
      B.filete();
      B.secao("Dados do projeto");
      B.campos([
        ["Disponibilização da energia", atend.disponibilizacaoEnergia],
        ["Disjuntor geral do empreendimento", atend.disjEmpreendimento],
        ["Disjuntor geral do condomínio", atend.disjCondominio],
        ["Possui disjuntor de prumada?", atend.temPrumada],
      ]);
      const prumadas = atend.temPrumada === "Sim" ? atend.prumadas || [] : [];
      B.tabela(
        ["Prumada", "Torre inicial", "Torre final", "Disjuntor"],
        prumadas.map((p, i) => [
          `Prumada ${i + 1}`,
          p.torreIni,
          p.torreFim,
          p.disj,
        ]),
      );
    }
  } else if (coletivo) {
    B.filete();
    B.secao("Unidades consumidoras");
    B.tabelaAuto(
      [
        "Unidade",
        "Nº predial",
        "Compl.",
        "Inst. / UC / Medidor",
        "Solicitação",
        "Disjuntor",
      ],
      ucBlocos.map((u, ui) => [
        u.identificacao || "UC " + (ui + 1),
        hibrido && u.nd === "5.1" ? u.nPredial : obra.num,
        u.complemento,
        u.solicitacao !== "Conexão Nova" ? u.instalacao : "",
        u.solicitacao,
        u.disjPara,
      ]),
      "pdf-tabela--ucs",
    );
    B.tabela(
      [
        "Unidade",
        "Norma",
        "Caixa",
        "Atividade principal",
        "Ramo de atividade",
        { rotulo: "Carga (kW)", num: true },
        { rotulo: "Dem. (kVA)", num: true },
      ],
      ucBlocos.map((u, ui) => [
        u.identificacao || "UC " + (ui + 1),
        hibrido ? `ND ${u.nd}` : "",
        u.caixa,
        u.atividade,
        ramoParaPdf(u.ramo),
        ucSemAlteracao(u)
          ? ""
          : modoCalculadora
            ? fmt2(num((u.cargas || {})._cargaKw))
            : fmt2(prevKwUC(u)),
        /* Demanda por UC só existe no modo calculadora (ND-5.1 por
           UC); no método 5.2 ela é agregada. */
        ucSemAlteracao(u) || !modoCalculadora
          ? ""
          : fmt2(num((u.cargas || {})._demanda)),
      ]),
      "pdf-tabela--ucs",
    );
    B.total(
      `Carga total ${fmt2(prevTotalKw)} kW · Demanda`,
      `${fmt2(demandaTotalGeral)} kVA`,
    );

    if (atend.disjuntorGeral || trocaDisjGeral) {
      B.filete();
      B.secao("Disjuntor geral");
      if (trocaDisjGeral) {
        B.campos([
          ["Disjuntor geral existente", atend.disjGeralAtual],
          ["Disjuntor geral novo", atend.disjuntorGeral],
          ["Demanda atual (kVA)", atend.demandaAtual],
          ["Demanda futura (kVA)", fmt2(demandaPrevTotal)],
        ]);
      } else {
        B.campos([
          ["Disjuntor geral do agrupamento", atend.disjuntorGeral, 2],
        ]);
      }
    }
  } else {
    B.filete();
    B.secao("Unidades consumidoras");
    /* Caixas existentes sem alteração não são detalhadas aqui — só
       aparecem no resumo, como no motor antigo. */
    ucsDet.forEach((u, ui) => {
      if (ucSemAlteracao(u)) return;
      B.subsecao(`UC ${ui + 1}`);
      const pares = [
        ["Atividade principal", u.atividade],
        ["Ramo de atividade", ramoParaPdf(u.ramo), 2],
      ];
      if (u.cargas && u.cargas.tipoA === "nr" && u.cargas.catA != null)
        pares.push([
          "Categoria de atividade",
          (TABELA_11[u.cargas.catA] || {}).d,
          3,
        ]);
      pares.push(
        ["Nº predial", u.nPredial || obra.num],
        ["Complemento do endereço", u.complemento],
        ["Caixa / identificação", u.caixa],
      );
      if (u.solicitacao !== "Conexão Nova")
        pares.push(["Instalação / UC / Medidor", u.instalacao]);
      if (u.solicitacao === "Alteração de Carga")
        pares.push(["Mudança de local", u.mudancaLocal]);
      /* Rural com mudança de local: a coordenada escolhida para o
         novo padrão. */
      if (obraRural && u.mudancaLocal === "Sim" && (u.padraoLat || u.padraoLng)) {
        pares.push([
          "Novo local do padrão (lat/long)",
          [u.padraoLat, u.padraoLng].filter(Boolean).join(", "),
          2,
        ]);
        if (u.padraoUtm)
          pares.push(["Novo local do padrão (UTM)", u.padraoUtm]);
      }
      if (u.solicitacao !== "Conexão Nova" && u.disjDe)
        pares.push(["Disjuntor atual", u.disjDe]);
      B.campos(pares);

      const qtds = (u.cargas || {}).qtds || [];
      const itens = CAT.map((c, i) => ({ ...c, q: qtds[i] || 0 })).filter(
        (x) => x.q > 0,
      );
      B.tabela(
        [
          "Equipamento",
          { rotulo: "Pot. (W)", num: true },
          { rotulo: "Qtd", num: true },
          { rotulo: "Total (W)", num: true },
        ],
        itens.map((it) => [it.n, fmtW(it.w), it.q, fmtW(it.q * it.w)]),
        "pdf-tabela--equipamentos",
      );
      B.total(
        `Carga ${fmt2((u.cargas || {})._cargaKw || 0)} kW · Demanda`,
        `${fmt2((u.cargas || {})._demanda || 0)} kVA`,
      );
    });

    /* Cargas especiais consolidadas: um motor por linha, com a UC. */
    const motores = [];
    ucsDet.forEach((u, ui) => {
      if (ucSemAlteracao(u)) return;
      const motsUC = ((u.cargas || {}).mots || []).filter((m) => (m.q || 0) > 0);
      if (!motsUC.length) return;
      const qtdTot = motsUC.reduce((s, m) => s + (parseInt(m.q) || 0), 0);
      const colM = motorColPorQtd(qtdTot);
      motsUC.forEach((m) => {
        const unit = motorKvaUnit(m.fase, m.cv, colM);
        const lbl =
          (m.fase === "mono" ? MOTOR_MONO : MOTOR_TRI).find(
            (r) => r.cv === parseFloat(m.cv),
          )?.l || m.cv;
        motores.push([
          `UC ${ui + 1}`,
          m.fase === "mono" ? "Monofásico" : "Trifásico",
          lbl,
          m.q,
          fmt2(unit),
          fmt2((parseInt(m.q) || 0) * unit),
        ]);
      });
    });
    if (motores.length) {
      B.filete();
      B.secao("Cargas especiais");
      B.tabela(
        [
          "Unidade",
          "Tipo",
          { rotulo: "Pot. (CV)", num: true },
          { rotulo: "Qtd", num: true },
          { rotulo: "Dem. unit. (kVA)", num: true },
          { rotulo: "Dem. total (kVA)", num: true },
        ],
        motores,
      );
    }

    B.filete();
    B.secao("Resumo por unidade consumidora");
    B.tabela(
      [
        "Unidade",
        "Tipo de solicitação",
        { rotulo: "Carga (kW)", num: true },
        { rotulo: "Demanda (kVA)", num: true },
        "Disjuntor",
      ],
      ucsDet.map((u, ui) =>
        ucSemAlteracao(u)
          ? [`UC ${ui + 1}`, u.solicitacao, "", "", u.disjDe]
          : [
              `UC ${ui + 1}`,
              u.solicitacao,
              fmt2((u.cargas || {})._cargaKw || 0),
              fmt2((u.cargas || {})._demanda || 0),
              u.disjEscolhido || ((u.cargas || {})._disjuntores || [])[0],
            ],
      ),
      "pdf-tabela--resumo",
    );

    B.filete();
    B.secao("Gerador de emergência");
    B.tabela(
      ["Unidade", "Possui", { rotulo: "Potência (kVA)", num: true }, "Fonte", "Observações"],
      ucsDet
        .map((u, ui) => ({ u, ui }))
        .filter(({ u }) => !ucSemAlteracao(u))
        .map(({ u, ui }) => {
          const g = u.gerador || {};
          const sim = g.possui === "Sim";
          return [
            `UC ${ui + 1}`,
            g.possui || "Não",
            sim ? g.potencia : "",
            sim ? g.fonte : "",
            sim ? g.descricao : "",
          ];
        }),
    );
  }

  /* ---- Fechamento ---- */
  if (!_pdfVazio(obs)) {
    B.filete();
    B.secao("Observações");
    B.paragrafos(obs);
  }
  B.total("Demanda total do atendimento", `${fmt2(demandaTotalGeral)} kVA`);
  B.assinatura();

  return B.podar();
}

/* ============================================================
   4. Paginação
   ------------------------------------------------------------
   O Chrome não suporta margin boxes de @page nem counter(pages),
   então não há como paginar em CSS puro e ainda carimbar "n/N".
   Medimos dentro de uma .pdf-pagina de verdade (mesma largura,
   mesma tipografia) e decidimos as quebras aqui.
   ============================================================ */

function _pdfPaginador(doc) {
  const P = { doc, paginas: [], corpo: null, util: 0 };

  P.novaPagina = () => {
    const pagina = _pdfMolde("tplPdfPagina");
    doc.appendChild(pagina);
    P.paginas.push(pagina);
    P.corpo = pagina.querySelector(".pdf-corpo");
    /* Altura útil lida do próprio layout, em vez de repetir os
       770pt como constante: .pdf-corpo é o que sobra da folha
       depois da margem e do rodapé. */
    P.util = P.corpo.clientHeight;
    return pagina;
  };
  P.por = (el) => P.corpo.appendChild(el);
  P.cabe = () => P.corpo.scrollHeight <= P.util;
  P.vazia = () => !P.corpo.firstElementChild;

  return P;
}

/* Fatia uma tabela entre páginas repetindo o cabeçalho. */
function _pdfDividirTabela(P, tabela) {
  const linhas = Array.from(tabela.tBodies[0].rows);
  if (linhas.length < 2) return false;
  linhas.forEach((tr) => tr.remove());

  const fatias = [];
  const novaFatia = () => {
    const fatia = tabela.cloneNode(true);
    Array.from(fatia.tBodies[0].rows).forEach((tr) => tr.remove());
    P.por(fatia);
    fatias.push(fatia);
    return fatia;
  };

  let fatia = novaFatia();
  linhas.forEach((tr) => {
    fatia.tBodies[0].appendChild(tr);
    if (P.cabe()) return;
    tr.remove();
    P.novaPagina();
    fatia = novaFatia();
    fatia.tBodies[0].appendChild(tr);
  });

  /* Viúva: uma única linha numa folha nova, sob um cabeçalho
     repetido, lê como erro. Puxa uma da fatia anterior — que tem
     folga, já que acabou de recusar esta. */
  const ultima = fatias[fatias.length - 1];
  const anterior = fatias[fatias.length - 2];
  if (
    anterior &&
    ultima.tBodies[0].rows.length === 1 &&
    anterior.tBodies[0].rows.length > 2
  ) {
    const corpoAnt = anterior.tBodies[0];
    ultima.tBodies[0].insertBefore(
      corpoAnt.rows[corpoAnt.rows.length - 1],
      ultima.tBodies[0].rows[0],
    );
  }
  return true;
}

/* Fatia um parágrafo entre páginas, por busca binária do maior
   prefixo que ainda cabe. */
function _pdfDividirTexto(P, el) {
  const palavras = String(el.textContent).split(/\s+/).filter(Boolean);
  if (palavras.length < 2) return false;
  let restantes = palavras;
  while (restantes.length) {
    const fatia = el.cloneNode(false);
    P.por(fatia);
    let baixo = 1;
    let alto = restantes.length;
    let melhor = 0;
    while (baixo <= alto) {
      const meio = Math.floor((baixo + alto) / 2);
      fatia.textContent = restantes.slice(0, meio).join(" ");
      if (P.cabe()) {
        melhor = meio;
        baixo = meio + 1;
      } else {
        alto = meio - 1;
      }
    }
    if (!melhor) {
      fatia.remove();
      /* Numa folha já limpa nem a primeira palavra coube: não há o
         que fatiar, devolve para o chamador tratar. */
      if (P.vazia()) return false;
      P.novaPagina();
      continue;
    }
    fatia.textContent = restantes.slice(0, melhor).join(" ");
    restantes = restantes.slice(melhor);
    if (restantes.length) P.novaPagina();
  }
  return true;
}

function _pdfDividir(P, el) {
  if (el.matches("table.pdf-tabela")) return _pdfDividirTabela(P, el);
  if (el.matches(".pdf-observacoes")) return _pdfDividirTexto(P, el);
  return false;
}

/* Grupo mais alto que uma folha limpa. Sem este tratamento o laço
   principal abriria página após página sem nunca encaixar, ou o
   `overflow: hidden` da .pdf-pagina comeria o conteúdo em silêncio. */
function _pdfEstourar(P, els) {
  els.forEach((el) => {
    P.por(el);
    if (P.cabe()) return;
    el.remove();
    if (!P.vazia()) {
      P.novaPagina();
      P.por(el);
      if (P.cabe()) return;
      el.remove();
    }
    if (_pdfDividir(P, el)) return;
    /* Último recurso: entra inteiro e transborda. Falha visível é
       melhor que corte silencioso — o aviso abaixo e a checagem
       final apontam a página. */
    P.por(el);
    console.warn("[PDF] bloco maior que a página e indivisível:", el);
  });
}

function _pdfPaginar(doc, blocos) {
  const P = _pdfPaginador(doc);
  P.novaPagina();
  /* Cabeçalho só na 1ª folha: nas seguintes o mock começa direto
     no título da seção, a 36pt do topo. */
  P.por(_pdfMolde("tplPdfCabecalho"));

  for (let i = 0; i < blocos.length; ) {
    /* keep-with-next transitivo: o título prende o 1º bloco, que
       pode prender o seguinte. */
    const grupo = [blocos[i]];
    let j = i;
    while (grupo[grupo.length - 1].prende && j + 1 < blocos.length) {
      j += 1;
      grupo.push(blocos[j]);
    }
    const els = grupo.map((b) => b.el);
    els.forEach(P.por);
    if (!P.cabe()) {
      els.forEach((el) => el.remove());
      if (!P.vazia()) {
        P.novaPagina();
        els.forEach(P.por);
      }
      if (!P.cabe()) {
        els.forEach((el) => el.remove());
        _pdfEstourar(P, els);
      }
    }
    i = j + 1;
  }

  const total = P.paginas.length;
  P.paginas.forEach((pagina, i) => {
    pagina.querySelector(".pdf-rodape").textContent = `${i + 1}/${total}`;
    /* A .pdf-pagina corta o excesso, então um erro de paginação
       apareceria como texto faltando, sem pista nenhuma. */
    const corpo = pagina.querySelector(".pdf-corpo");
    if (corpo.scrollHeight > corpo.clientHeight)
      console.warn(`[PDF] conteúdo transbordou na página ${i + 1}`, corpo);
  });
  return total;
}

/* ============================================================
   5. Pré-requisitos da medição
   ============================================================ */

/* A paginação é feita medindo altura, e css/variables.css declara
   Open Sans com font-display: swap. Medir antes de a fonte chegar
   pagina em Segoe UI — quebras no lugar errado e "n/N" incoerente.
   `document.fonts.ready` sozinha não basta: ela só resolve as
   faces JÁ solicitadas, e o peso 700 pode nunca ter sido pedido
   pela tela. Passar o texto real ainda faz o navegador escolher o
   unicode-range certo (latin × latin-ext). */
async function _pdfAguardarFontes(texto) {
  if (!document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('400 10pt "Open Sans"', texto),
      document.fonts.load('700 10pt "Open Sans"', texto),
    ]);
    await document.fonts.ready;
  } catch (e) {
    /* Cache frio sem rede: sai com a fonte de fallback, que é
       melhor que um botão que não responde. */
    console.warn("[PDF] fontes não confirmadas; paginando assim mesmo", e);
  }
}

/* O logo é um <img> externo: se ainda não decodificou quando a
   impressão começa, a folha sai sem a marca. */
async function _pdfAguardarImagens(raiz) {
  await Promise.all(
    Array.from(raiz.querySelectorAll("img")).map((img) =>
      img.decode ? img.decode().catch(() => {}) : Promise.resolve(),
    ),
  );
}

/* ============================================================
   6. Exportação
   ============================================================ */

async function gerarPdfDocumento(S) {
  const anterior = document.getElementById("documentoPdf");
  if (anterior) anterior.remove();

  const foco = document.activeElement;
  let doc = null;
  try {
    doc = _pdfMolde("tplPdfDoc");
    doc.classList.add("pdf-doc--medindo");
    document.body.appendChild(doc);

    const blocos = _pdfBlocosBT(S);
    await _pdfAguardarFontes(blocos.map((b) => b.el.textContent).join(" "));
    _pdfPaginar(doc, blocos);
    await _pdfAguardarImagens(doc);
  } catch (e) {
    if (doc) doc.remove();
    console.error("[PDF] falha ao montar o documento", e);
    alert("Não foi possível montar o PDF. Recarregue a página e tente de novo.");
    return;
  }

  doc.classList.remove("pdf-doc--medindo");
  document.body.classList.add("pdf-imprimindo");

  /* `afterprint` dispara IGUAL se o usuário salvou o PDF ou clicou
     em Cancelar, e não há API que separe os dois casos. Por isso o
     texto do diálogo abaixo não afirma que o download aconteceu —
     ele serve nos dois desfechos. */
  window.addEventListener(
    "afterprint",
    () => {
      document.body.classList.remove("pdf-imprimindo");
      doc.remove();
      if (foco && foco.focus) foco.focus();
      if (typeof mostrarModalPdfExportado === "function")
        mostrarModalPdfExportado({
          icone: "documento",
          titulo: "Conclua a exportação",
          descricao:
            "Ao salvar o PDF, leve-o impresso junto com o restante dos seus " +
            "documentos até o posto de atendimento mais próximo. Se a " +
            "exportação foi cancelada, é só clicar em Exportar PDF novamente.",
        });
    },
    { once: true },
  );

  window.print();
}
