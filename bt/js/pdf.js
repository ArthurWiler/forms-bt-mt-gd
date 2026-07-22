/* ============================================================
   CEMIG — Geração do PDF (jsPDF). Sem JSX — script clássico.
   Recebe um objeto de estado (S) e produz/baixa o PDF.
   Usa helpers globais: fmt2, num, prevKwUC, CAT (data.js/model.js).
   ============================================================ */
function gerarPdfDoc(S) {
  const {
    multiTorres,
    coletivo,
    modoCalculadora, // coletivo com ND-5.2 sem calcular: cargas detalhadas por UC
    atend,
    prop,
    corr,
    obra,
    prevTotalKw,
    demandaPrevTotal,
    trocaDisjGeral,
    hibrido,
    ucsDet,
    ucBlocos,
    blocos,
    totalUcsEmpreendimento,
    obs,
    demandaTotalGeral,
    logoPDF,
    pessoaFisica,
  } = S;
  if (!window.jspdf) {
    alert("Biblioteca jsPDF não carregada.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW = 210,
    PH = 297,
    MG = 14,
    CW = PW - 2 * MG;
  let cy = MG;
  const drawTopBar = () => {
    doc.setFillColor(10, 47, 39);
    doc.rect(0, 0, PW, 18, "F");
    // Linha de gradiente da marca (verde digital -> verde on) sob a barra
    {
      const gy = 18,
        gh = 1.3,
        steps = 60;
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const r = Math.round(30 + (196 - 30) * t);
        const b = Math.round(140 + (63 - 140) * t);
        doc.setFillColor(r, 255, b);
        doc.rect((PW / steps) * i, gy, PW / steps + 0.3, gh, "F");
      }
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text("Formulário CEMIG - Orçamento de Conexão BT", MG, 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(169, 230, 191);
    doc.text(
      multiTorres
        ? "Empreendimento com Múltiplas Torres ou Blocos"
        : coletivo
          ? "Agrupamento com Proteção Geral / Projeto BT (APR Web)"
          : "Atendimento individual ou agrupamento até 3 caixas sem proteção geral",
      MG,
      13.5,
    );
    cy = 24;
  };
  const footer = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    doc.text("", MG, PH - 7);
  };
  const checkSpace = (h) => {
    if (cy + h > PH - 14) {
      footer();
      doc.addPage();
      cy = MG;
      drawTopBar();
    }
  };
  const sec = (t) => {
    checkSpace(11);
    doc.setFillColor(230, 242, 238);
    doc.rect(MG, cy, CW, 7, "F");
    doc.setFillColor(16, 119, 98);
    doc.rect(MG, cy, 2.5, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(16, 119, 98);
    doc.text(t, MG + 5, cy + 4.8);
    cy += 9;
  };
  // Subseção (ex.: "4.1  UC 1") — cabeçalho leve sob uma seção principal
  const subSec = (t) => {
    checkSpace(8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(16, 119, 98);
    doc.text(t, MG + 1, cy + 4);
    doc.setDrawColor(200, 224, 216);
    doc.line(MG + 1, cy + 5.6, MG + CW - 1, cy + 5.6);
    cy += 8;
  };
  const _vazio = (v) =>
    v === undefined ||
    v === null ||
    String(v).trim() === "" ||
    String(v).trim() === "—";
  const kvPairs = (pairs) => {
    const colW = CW / 2;
    const kept = (pairs || []).filter((p) => p && !_vazio(p[1]));
    for (let i = 0; i < kept.length; i += 2) {
      checkSpace(6);
      [kept[i], kept[i + 1]].forEach((p, ci) => {
        if (!p) return;
        const x = MG + ci * colW;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 32, 42);
        const lbl = p[0] + ": ";
        doc.text(lbl, x + 1, cy + 4.5);
        const lw = doc.getTextWidth(lbl);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        // Altura de linha fixa: corta com reticências o valor que não cabe na
        // meia-coluna (ex.: ramo de atividade com código + descrição longa).
        const larg = Math.max(10, colW - 4 - lw);
        const ls = doc.splitTextToSize(String(p[1]), larg);
        let val = ls[0] || "";
        if (ls.length > 1) {
          while (val && doc.getTextWidth(val + "…") > larg)
            val = val.slice(0, -1);
          val += "…";
        }
        doc.text(val, x + 1 + lw, cy + 4.5);
      });
      cy += 7;
    }
  };
  const fullLine = (label, val) => {
    if (_vazio(val)) return;
    const lbl = label + ": ";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const lw = doc.getTextWidth(lbl);
    const lines = doc.splitTextToSize(String(val), Math.max(20, CW - 4 - lw));
    checkSpace(4 + lines.length * 4.2);
    // re-aplica estilo após possível quebra de página (drawTopBar altera fonte/cor)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 32, 42);
    doc.text(lbl, MG + 1, cy + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(lines, MG + 1 + lw, cy + 4.5);
    cy += 2 + lines.length * 4.2;
  };
  // Data ISO (AAAA-MM-DD) -> BR (DD/MM/AAAA)
  const dataBR = (s) => {
    const m = String(s || "").match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    return m
      ? `${m[3].padStart(2, "0")}/${m[2].padStart(2, "0")}/${m[1]}`
      : s || "";
  };
  // Coordenada com até 6 casas decimais
  const coordFmt = () => {
    const f = (v) => {
      const n = parseFloat(String(v).replace(",", "."));
      return isNaN(n) ? null : n.toFixed(6);
    };
    return [f(obra.lat), f(obra.lng)].filter((x) => x !== null).join(", ");
  };
  const totRow = (label, val) => {
    checkSpace(8);
    doc.setFillColor(16, 119, 98);
    doc.rect(MG, cy, CW, 7.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(label, MG + 5, cy + 5.2);
    doc.text(val, MG + CW - 2, cy + 5.2, { align: "right" });
    cy += 9;
  };
  const tabela = (headers, widths, rows) => {
    checkSpace(6);
    doc.setFillColor(230, 242, 238);
    doc.rect(MG, cy, CW, 5.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(16, 119, 98);
    let x = MG + 2;
    headers.forEach((h, i) => {
      doc.text(h, x, cy + 3.8);
      x += widths[i];
    });
    cy += 5.5;
    let ri = 0;
    rows.forEach((row) => {
      checkSpace(5);
      doc.setFillColor(
        ri % 2 ? 240 : 255,
        ri % 2 ? 246 : 255,
        ri % 2 ? 244 : 255,
      );
      doc.rect(MG, cy, CW, 5, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(30, 32, 42);
      let xx = MG + 2;
      row.forEach((cell, i) => {
        // A linha da tabela é de altura fixa: o texto que não cabe na coluna
        // é cortado com reticências (antes ele sumia sem aviso no meio da
        // palavra — nota-se no "Ramo de atividade", que traz o código CNAE).
        const linhas = doc.splitTextToSize(String(cell ?? "—"), widths[i] - 2);
        let txt = linhas[0] || "—";
        if (linhas.length > 1) {
          while (txt && doc.getTextWidth(txt + "…") > widths[i] - 2)
            txt = txt.slice(0, -1);
          txt += "…";
        }
        doc.text(txt, xx, cy + 3.5);
        xx += widths[i];
      });
      ri++;
      cy += 5;
    });
  };
  // Regra 2 (PDF): variante de `tabela` que omite colunas inteiramente vazias
  // ou não aplicáveis (ex.: "Unid. Consum." / "Instalação" quando todas as UCs
  // são Conexão Nova). Preserva sempre a 1ª coluna (identificação da UC).
  const tabelaAuto = (headers, widths, rows) => {
    const manter = headers.map(
      (_, ci) => ci === 0 || rows.some((r) => !_vazio(r[ci])),
    );
    tabela(
      headers.filter((_, i) => manter[i]),
      widths.filter((_, i) => manter[i]),
      rows.map((r) => r.filter((_, i) => manter[i])),
    );
  };

  drawTopBar();

  sec("TIPO DE ATENDIMENTO");
  fullLine(
    "Modalidade",
    multiTorres
      ? "Empreendimento com Múltiplas Torres ou Blocos"
      : coletivo
        ? "Coletivo - Agrupamento com Proteção Geral (APR Web)"
        : "Individual / até 3 caixas sem proteção geral",
  );
  const tipoPairs = [
    ["Possui disjuntor geral?", atend.disjGeral],
    [
      "Nº de unidades consumidoras",
      multiTorres ? totalUcsEmpreendimento : atend.nUCs,
    ],
  ];
  if (coletivo)
    tipoPairs.push(
      ["Tipo do Atendimento", atend.solicitacao],
      ["Solicitação", atend.escopo],
    );
  /* Individual: campo renomeado de "Tipo do Atendimento" p/ "Disjuntor
     Solicitado" (ver cargas-individual.js). */
  else tipoPairs.push(["Disjuntor Solicitado", atend.solicitacao]);
  kvPairs(tipoPairs);
  if (coletivo && !multiTorres && atend.disjuntorGeral)
    fullLine("Disjuntor geral", atend.disjuntorGeral);
  cy += 2;

  sec("1.  DADOS DO PROPRIETÁRIO");
  const propPairs = [
    [pessoaFisica ? "Nome Completo" : "Razão Social", prop.nome],
    ["CPF/CNPJ", prop.cpfCnpj],
    ["E-mail", prop.email],
    ["Celular", prop.celular],
    ["Telefone Fixo", prop.fixo],
  ];
  if (pessoaFisica) {
    propPairs.push(
      ["RG/RNE/RANI", prop.rg],
      ["Data Nasc.", dataBR(prop.nasc)],
      ["Filiação", prop.filiacao],
      ["Laudo médico", prop.laudoMedico],
      ["NIS Tarifa Social", prop.nis === "Sim" ? prop.numNis : "Não"],
    );
  }
  propPairs.push(["", ""]);
  kvPairs(propPairs);
  cy += 2;

  sec("2.  CORRESPONDÊNCIA E FATURA");
  {
    const corrPairs = [
      ["Forma de recebimento da fatura", corr.alternativa],
      ["Dia de vencimento", corr.vencimento ? "Dia " + corr.vencimento : ""],
    ];
    if (corr.alternativa === "Conta globalizada") {
      corrPairs.push(["Conta globalizada", corr.contaGlobal]);
    }
    corrPairs.push(["", ""]);
    kvPairs(corrPairs);
  }
  if (corr.alternativa === "E-mail informado") {
    fullLine("E-mail para envio da fatura", prop.email);
  } else if (corr.alternativa === "Outro e-mail") {
    fullLine("E-mail alternativo para a fatura", corr.outroEmail);
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
    fullLine("Endereço de correspondência", "Mesmo da obra — " + endO);
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
    fullLine("Endereço de correspondência", endC);
  }
  cy += 2;

  sec("3.  DADOS DA OBRA (PADRÃO DE ENTRADA)");
  const obraRural = obra.localizacao === "Rural";
  // Imprime apenas o endereço da zona ativa (evita misturar urbano e rural).
  const endObra = obraRural
    ? [obra.cidade, obra.estado].filter(Boolean).join("/")
    : [
        [obra.endereco, obra.num].filter(Boolean).join(", "),
        obra.compl,
        obra.bairro,
        [obra.cidade, obra.estado].filter(Boolean).join("/"),
        obra.cep ? "CEP " + obra.cep : "",
      ]
        .filter(Boolean)
        .join(" - ");
  fullLine(obraRural ? "Município" : "Endereço", endObra);
  const obraPairs = [["Localização", obra.localizacao]];
  if (coletivo) obraPairs.push(["Nº ART/TRT de Projeto", obra.art]);
  obraPairs.push(
    ["Coordenadas", coordFmt()],
    [
      "Coordenada UTM",
      obra.utm ||
        (typeof utmString === "function" ? utmString(obra.lat, obra.lng) : ""),
    ],
    ["Padrão pronto p/ ligar?", obra.prontoLigar],
    ["Tipo de rede BT", obra.tipoRede],
    ["Distância < 30 m da rede?", obra.distMenor30],
    ["Transformador próximo", obra.transformador],
  );
  kvPairs(obraPairs);
  if (obra.restricaoAmbiental === "Sim" && obra.restricoesTexto)
    fullLine("Restrições ambientais", obra.restricoesTexto);
  if (obra.localizacao === "Rural")
    kvPairs([
      ["Distrito/Comunidade", obra.distritoComunidade],
      ["Nome da propriedade", obra.nomePropriedade],
      ["Ponto de referência", obra.pontoRef],
      ["Inst. mais próxima", obra.instProxima],
    ]);
  cy += 2;

  if (multiTorres) {
    sec("4.  EMPREENDIMENTO COM MÚLTIPLAS TORRES");
    kvPairs([
      ["Atendimento a", "Torre"],
      ["Nº de torres", blocos.length],
      ["Total de UCs do empreendimento", totalUcsEmpreendimento],
      ["", ""],
    ]);
    tabela(
      [
        "Bloco",
        "Disjuntor Geral",
        "Dem. UCs (kVA)",
        "Qtd UCs",
        "Disj. Cond./Incêndio",
        "Dem. Cond. (kVA)",
      ],
      [16, 38, 28, 18, 46, 36],
      blocos.map((b) => [
        b.nome,
        b.disjGeral,
        fmt2(calcBlocoMultiTorres(b).demandaUcs),
        b.qtdUCs,
        b.disjIncendio,
        b.demandaIncendio,
      ]),
    );
    cy += 2;
    totRow("DEMANDA TOTAL DO EMPREENDIMENTO", `${fmt2(demandaTotalGeral)} kVA`);
    cy += 2;
    // Detalhamento das UCs de cada torre/bloco — uma linha por UC
    blocos.forEach((b, bi) => {
      const ucs = b.ucs || [];
      if (!ucs.length) return;
      sec(
        `4.${bi + 1}  TORRE ${b.nome || bi + 1} — UNIDADES CONSUMIDORAS`,
      );
      // Identificação das UCs (carga/demanda integram a identificação).
      // Modo da torre: 4+ apartamentos residenciais → método 5.2 (Carga
      // prevista informada); senão → carga/demanda calculadas pelas cargas
      // detalhadas (ND-5.1) da UC.
      const cb = calcBlocoMultiTorres(b);
      const modoCalcTorre = cb.modoCalculadora;
      tabelaAuto(
        [
          "Unidade",
          "Compl.",
          "Unid. Consum.",
          "Instalação",
          "Solicitação",
          "Disjuntor",
          "Carga (kW)",
          "Dem. (kVA)",
        ],
        [22, 18, 24, 22, 30, 22, 18, 18],
        ucs.map((u, ui) => [
          u.identificacao || `UC ${ui + 1}`,
          u.complemento || "—",
          u.unidadeConsumidora || "—",
          u.solicitacao !== "Conexão Nova" ? u.instalacao || "—" : "—",
          u.solicitacao,
          u.disjPara || "—",
          ucSemAlteracao(u)
            ? "—"
            : modoCalcTorre
              ? fmt2(num((u.cargas || {})._cargaKw))
              : fmt2(prevKwUC(u)),
          ucSemAlteracao(u) || !modoCalcTorre
            ? "—"
            : fmt2(num((u.cargas || {})._demanda)),
        ]),
      );
      cy += 2;
      // Demanda da torre: ND-5.2 (residencial + não residencial) ou soma
      // das demandas calculadas por UC; incêndio somado à parte.
      kvPairs([
        !modoCalcTorre
          ? [
              "Demanda residencial (ND-5.2)",
              `${fmt2(cb.demResidencial)} kVA (${cb.qtdApart} ap. · área méd. ${fmt2(cb.areaMedia)} m²)`,
            ]
          : null,
        !modoCalcTorre && cb.temNaoResidencial
          ? ["Demanda não residencial", `${fmt2(cb.demNaoResidencial)} kVA`]
          : null,
        modoCalcTorre
          ? [
              "Demanda das UCs (cargas detalhadas)",
              `${fmt2(cb.demandaUcs)} kVA`,
            ]
          : null,
        num(b.demandaIncendio)
          ? [
              "Demanda combate a incêndio",
              `${fmt2(num(b.demandaIncendio))} kVA`,
            ]
          : null,
        [
          "Demanda total da torre",
          `${fmt2(cb.demandaUcs + num(b.demandaIncendio))} kVA`,
        ],
      ]);
      cy += 2;
    });
  } else if (coletivo) {
    sec("4.  UNIDADES CONSUMIDORAS");
    tabelaAuto(
      [
        "Unidade",
        "Nº Predial",
        "Compl.",
        "Unid. Consum.",
        "Instalação",
        "Solicitação",
        "Disjuntor",
      ],
      [24, 22, 20, 28, 26, 32, 22],
      ucBlocos.map((u, ui) => [
        u.identificacao || "UC " + (ui + 1),
        hibrido && u.nd === "5.1" ? u.nPredial : obra.num,
        u.complemento || "—",
        u.unidadeConsumidora || "—",
        u.solicitacao !== "Conexão Nova" ? u.instalacao || "—" : "—",
        u.solicitacao,
        u.disjPara || "—",
      ]),
    );
    cy += 1;
    tabela(
      [
        "Unidade",
        "Norma",
        "Caixa",
        "Atividade principal",
        "Ramo de atividade",
        "Carga (kW)",
        "Dem. (kVA)",
      ],
      [24, 18, 22, 38, 36, 20, 20],
      ucBlocos.map((u, ui) => [
        u.identificacao || "UC " + (ui + 1),
        hibrido ? `ND ${u.nd}` : "—",
        u.caixa || "—",
        u.atividade || "—",
        ramoParaPdf(u.ramo) || "—",
        ucSemAlteracao(u)
          ? "—"
          : modoCalculadora
            ? fmt2(num((u.cargas || {})._cargaKw))
            : fmt2(prevKwUC(u)),
        // Demanda por UC só existe no modo calculadora (ND-5.1 por UC);
        // no método 5.2 a demanda é agregada (ND-5.2 + não residencial).
        ucSemAlteracao(u) || !modoCalculadora
          ? "—"
          : fmt2(num((u.cargas || {})._demanda)),
      ]),
    );
    totRow(
      `Total ${fmt2(prevTotalKw)} kW  |  Demanda`,
      `${fmt2(demandaTotalGeral)} kVA`,
    );
    cy += 2;
    if (atend.disjuntorGeral || trocaDisjGeral) {
      sec("5.  DISJUNTOR GERAL");
      if (trocaDisjGeral) {
        kvPairs([
          ["Disjuntor geral existente", atend.disjGeralAtual],
          ["Disjuntor geral novo", atend.disjuntorGeral],
          ["Demanda atual (kVA)", atend.demandaAtual],
          ["Demanda futura (kVA)", fmt2(demandaPrevTotal)],
        ]);
      } else {
        fullLine("Disjuntor geral do agrupamento", atend.disjuntorGeral);
      }
      cy += 2;
    }
  } else {
    // INDIVIDUAL: "4. Unidades Consumidoras" com subseções 4.1 UC 1, 4.2 UC 2...
    // As caixas existentes sem alteração não são detalhadas aqui (só no resumo).
    sec("4.  UNIDADES CONSUMIDORAS");
    ucsDet.forEach((u, ui) => {
      if (ucSemAlteracao(u)) return;
      subSec(`4.${ui + 1}  UC ${ui + 1}`);
      const pares = [
        ["Atividade principal", u.atividade],
        ["Ramo de atividade", ramoParaPdf(u.ramo)],
      ];
      if (u.cargas?.tipoA === "nr" && u.cargas?.catA != null)
        pares.push([
          "Categoria de atividade",
          (TABELA_11[u.cargas.catA] || {}).d,
        ]);
      pares.push(
        ["Nº Predial", u.nPredial || obra.num],
        ["Complemento do endereço", u.complemento],
        ["Caixa / Identificação", u.caixa],
      );
      if (u.solicitacao !== "Conexão Nova")
        pares.push(["Nº Instalação", u.instalacao]);
      if (u.solicitacao === "Alteração de Carga")
        pares.push(["Mudança de local", u.mudancaLocal]);
      // Novo local do padrão (rural + mudança de local): coordenada escolhida.
      if (
        obra.localizacao === "Rural" &&
        u.mudancaLocal === "Sim" &&
        (u.padraoLat || u.padraoLng)
      ) {
        pares.push([
          "Novo local do padrão (lat/long)",
          [u.padraoLat, u.padraoLng].filter(Boolean).join(", "),
        ]);
        if (u.padraoUtm) pares.push(["Novo local do padrão (UTM)", u.padraoUtm]);
      }
      kvPairs(pares);
      const qtds = u.cargas?.qtds || [];
      const itens = CAT.map((c, i) => ({ ...c, q: qtds[i] || 0 })).filter(
        (x) => x.q > 0,
      );
      if (itens.length) {
        tabela(
          ["Equipamento", "Pot. (W)", "Qtd", "Total (W)"],
          [96, 30, 18, 38],
          itens.map((it) => [it.n, fmtW(it.w), it.q, fmtW(it.q * it.w)]),
        );
      }
      checkSpace(8);
      totRow(
        `Carga ${fmt2(u.cargas?._cargaKw || 0)} kW  |  Demanda`,
        `${fmt2(u.cargas?._demanda || 0)} kVA`,
      );
      // Disjuntor anterior (apenas em alteração de carga; o escolhido vai no resumo)
      if (u.solicitacao !== "Conexão Nova" && u.disjDe)
        fullLine("Disjuntor atual", u.disjDe);
      cy += 2;
    });
    // 4.N  Cargas Especiais — consolidado: um motor por linha, identificando a UC.
    const motoresConsolidados = [];
    ucsDet.forEach((u, ui) => {
      if (ucSemAlteracao(u)) return;
      const motsUC = (u.cargas?.mots || []).filter((m) => (m.q || 0) > 0);
      if (!motsUC.length) return;
      const qtdTot = motsUC.reduce((s, m) => s + (parseInt(m.q) || 0), 0);
      const colM = motorColPorQtd(qtdTot);
      motsUC.forEach((m) => {
        const unit = motorKvaUnit(m.fase, m.cv, colM);
        const lbl =
          (m.fase === "mono" ? MOTOR_MONO : MOTOR_TRI).find(
            (r) => r.cv === parseFloat(m.cv),
          )?.l || m.cv;
        motoresConsolidados.push([
          `UC ${ui + 1}`,
          m.fase === "mono" ? "Monofásico" : "Trifásico",
          lbl,
          m.q,
          fmt2(unit),
          fmt2((parseInt(m.q) || 0) * unit),
        ]);
      });
    });
    if (motoresConsolidados.length) {
      sec(`4.${ucsDet.length + 1}  CARGAS ESPECIAIS`);
      tabela(
        [
          "Unidade",
          "Tipo",
          "Pot. (CV)",
          "Qtd",
          "Dem. unit. (kVA)",
          "Dem. total (kVA)",
        ],
        [30, 30, 26, 16, 38, 30],
        motoresConsolidados,
      );
      cy += 2;
    }
    // Resumo consolidado: solicitação, carga, demanda e disjuntor por UC.
    // Inclui as caixas existentes sem alteração (que não foram detalhadas acima).
    sec("5.  RESUMO POR UNIDADE CONSUMIDORA");
    tabela(
      [
        "Unidade",
        "Tipo de solicitação",
        "Carga (kW)",
        "Demanda (kVA)",
        "Disjuntor",
      ],
      [26, 56, 28, 32, 40],
      ucsDet.map((u, ui) =>
        ucSemAlteracao(u)
          ? [`UC ${ui + 1}`, u.solicitacao, "—", "—", u.disjDe || "—"]
          : [
              `UC ${ui + 1}`,
              u.solicitacao,
              fmt2(u.cargas?._cargaKw || 0),
              fmt2(u.cargas?._demanda || 0),
              u.disjEscolhido || (u.cargas?._disjuntores || [])[0] || "—",
            ],
      ),
    );
    cy += 2;
    // Gerador de emergência vinculado à UC (u.gerador) — uma linha por UC.
    sec("6.  GERADOR DE EMERGÊNCIA");
    tabela(
      ["Unidade", "Possui", "Potência (kVA)", "Fonte", "Observações"],
      [26, 22, 34, 40, 60],
      ucsDet
        .map((u, ui) => ({ u, ui }))
        .filter(({ u }) => !ucSemAlteracao(u))
        .map(({ u, ui }) => {
          const g = u.gerador || {};
          const sim = g.possui === "Sim";
          return [
            `UC ${ui + 1}`,
            g.possui || "Não",
            sim ? g.potencia || "—" : "—",
            sim ? g.fonte || "—" : "—",
            sim ? g.descricao || "—" : "—",
          ];
        }),
    );
    cy += 2;
  }

  sec("OBSERVAÇÕES");
  fullLine("Obs.", obs || "—");
  cy += 4;
  totRow("DEMANDA TOTAL DO ATENDIMENTO", `${fmt2(demandaTotalGeral)} kVA`);
  cy += 4;
  checkSpace(20);
  doc.setDrawColor(180, 180, 180);
  doc.line(MG + 30, cy + 8, MG + CW - 30, cy + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(90, 90, 90);
  doc.text(
    "Local e data / Assinatura do proprietário ou representante legal",
    PW / 2,
    cy + 12,
    { align: "center" },
  );
  footer();
  const nomeArq = (prop.nome || "formulario")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .slice(0, 30);
  doc.save(
    `CEMIG_${multiTorres ? "torres" : coletivo ? "coletivo" : "individual"}_${nomeArq}.pdf`,
  );
  if (typeof mostrarModalPdfExportado === "function")
    mostrarModalPdfExportado();
}

/* ============================================================
   CEMIG — Lista de documentos para a solicitação.
   Os itens são GERADOS a partir do preenchimento do formulário
   (dados da Prévia & PDF): tipo de pessoa, tipo de conexão,
   localização, carga/demanda e modalidade do atendimento. A mesma
   lista é exibida na etapa "Prévia & PDF" e exportada em PDF.
   ============================================================ */
function listaDocumentosBT(S) {
  const {
    pessoaJuridica,
    coletivo,
    multiTorres,
    hibrido,
    obra = {},
    atend = {},
    ucsDet = [],
    ucBlocos = [],
    blocos = [],
    exibeTermoGrupoB,
    demandaTotalGeral,
    temMotoresPesados,
  } = S || {};
  const docs = [];
  // Titular
  docs.push(
    pessoaJuridica
      ? "Documentos de constituição e registro da pessoa jurídica e documento oficial com foto do(s) representante(s) legal(is)"
      : "Documento oficial com foto e CPF do titular",
  );
  // Conexão nova → comprovação de propriedade/posse (+ regularidade urbana)
  const ucs = multiTorres
    ? blocos.flatMap((b) => b.ucs || [])
    : coletivo
      ? ucBlocos
      : ucsDet;
  const temConexaoNova =
    atend.escopo === "Ligação Nova" ||
    ucs.some((u) => (u.solicitacao || "") === "Conexão Nova");
  if (temConexaoNova) {
    docs.push("Comprovante de propriedade ou posse do local a ser atendido");
    if (obra.localizacao !== "Rural")
      docs.push(
        "Documento que comprove a regularidade do imóvel (unidade em área urbana)",
      );
  }
  // Individual com carga instalada/demanda acima de 75 kW
  if (!coletivo && exibeTermoGrupoB) {
    docs.push("ART de projeto paga (carga instalada acima de 75 kW)");
    docs.push("Planta de situação");
    docs.push("Formulário preenchido no APR Web");
    docs.push("Termo de Opção pelo Atendimento em Baixa Tensão — Grupo B");
  }
  // Coletivo / múltiplas torres
  if (coletivo) {
    docs.push(
      "Planta de situação da edificação com indicação do padrão de entrada e distância do ramal de entrada (ND-5.2) — enviar junto ao pedido e no APR Web",
    );
    if ((demandaTotalGeral || 0) > 304)
      docs.push(
        "Projeto elétrico com ART/TRT de projeto (demanda total acima de 304 kVA)",
      );
  }
  if (hibrido)
    docs.push(
      "Planta de situação com o número predial de cada unidade consumidora (atendimento híbrido)",
    );
  if (temMotoresPesados)
    docs.push(
      "Formulário de Análise de Partida de Motores (motores monofásicos acima de 15 CV e/ou trifásicos acima de 50 CV)",
    );
  if (obra.restricaoAmbiental === "Sim")
    docs.push(
      "Documento de regularização ambiental emitido por órgão competente (propriedade em área protegida)",
    );
  docs.push(
    "Procuração do titular (apenas para solicitações feitas por terceiros/responsável técnico)",
  );
  return docs;
}

/* gerarListaDocumentosDoc removido: o botão "Gerar lista de documentos" foi
   descontinuado — a lista (listaDocumentosBT acima) é exibida na Prévia & PDF. */
