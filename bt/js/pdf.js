/* ============================================================
   CEMIG — Geração do PDF (jsPDF). Sem JSX — script clássico.
   Recebe um objeto de estado (S) e produz/baixa o PDF.
   Usa helpers globais: fmt2, num, prevKwUC, CAT (data.js/model.js).
   ============================================================ */
function gerarPdfDoc(S) {
  const {
    multiTorres,
    coletivo,
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
    gerador,
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
        doc.text(
          doc.splitTextToSize(String(p[1]), Math.max(10, colW - 4 - lw))[0],
          x + 1 + lw,
          cy + 4.5,
        );
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
        doc.text(
          doc.splitTextToSize(String(cell ?? "—"), widths[i] - 2)[0] || "—",
          xx,
          cy + 3.5,
        );
        xx += widths[i];
      });
      ri++;
      cy += 5;
    });
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
      ["Solicitação", atend.solicitacao],
      ["Escopo do atendimento", atend.escopo],
    );
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
    ["Telefone do Proprietário", prop.telProp],
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
  kvPairs([
    ["Receber fatura por e-mail", corr.receberEmail],
    ["Dia de vencimento", corr.vencimento ? "Dia " + corr.vencimento : ""],
    ["Conta globalizada", corr.contaGlobal],
    ["", ""],
  ]);
  if (corr.receberEmail === "Não") {
    if (corr.alternativa === "Outro e-mail") {
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
    } else {
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
    ["Padrão pronto p/ ligar?", obra.prontoLigar],
    [
      "Em área de restrição ambiental?",
      obra.restricaoAmbiental || "Não consultada",
    ],
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
    sec("4.  EMPREENDIMENTO COM MÚLTIPLAS TORRES OU BLOCOS");
    kvPairs([
      ["Atendimento a", atend.atendA],
      ["Nº de blocos/torres", blocos.length],
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
        `4.${bi + 1}  ${atend.atendA.toUpperCase()} ${b.nome || bi + 1} — UNIDADES CONSUMIDORAS`,
      );
      // Tabela 1: identificação das UCs
      tabela(
        ["Unidade", "Compl.", "Unid. Consum.", "Instalação", "Solicitação", "Disjuntor"],
        [26, 22, 30, 28, 38, 26],
        ucs.map((u, ui) => [
          u.identificacao || `UC ${ui + 1}`,
          u.complemento || "—",
          u.unidadeConsumidora || "—",
          u.solicitacao !== "Conexão Nova" ? u.instalacao || "—" : "—",
          u.solicitacao,
          u.disjPara || "—",
        ]),
      );
      cy += 2;
      // Tabela 2: previsão de carga das UCs
      sec(
        `4.${bi + 1}.1  ${atend.atendA} ${b.nome || bi + 1} — PREVISÃO DE CARGA`,
      );
      tabela(
        [
          "Unidade",
          "Ilum.",
          "Tomada",
          "Chuv.",
          "Ar Cond.",
          "Outros",
          "Carga (kW)",
          "Dem. (kVA)",
        ],
        [30, 20, 22, 20, 22, 20, 24, 24],
        ucs.filter((u) => !ucSemAlteracao(u)).map((u, ui) => [
          u.identificacao || `UC ${ui + 1}`,
          (u.prev || {}).ilum || "—",
          (u.prev || {}).tomada || "—",
          (u.prev || {}).chuveiro || "—",
          (u.prev || {}).ar || "—",
          (u.prev || {}).outros || "—",
          fmt2(prevKwUC(u)),
          (u.prev || {}).demanda || "—",
        ]),
      );
      cy += 2;
      // Demanda da torre (ND-5.2 por torre): residencial + não residencial + incêndio
      const cb = calcBlocoMultiTorres(b);
      kvPairs([
        cb.qtdApart
          ? [
              "Demanda residencial (ND-5.2)",
              `${fmt2(cb.demResidencial)} kVA` +
                (cb.nd52
                  ? ` (${cb.qtdApart} ap. · área méd. ${fmt2(cb.areaMedia)} m²)`
                  : " (manual)"),
            ]
          : null,
        cb.temNaoResidencial
          ? ["Demanda não residencial", `${fmt2(cb.demNaoResidencial)} kVA`]
          : null,
        num(b.demandaIncendio)
          ? ["Demanda combate a incêndio", `${fmt2(num(b.demandaIncendio))} kVA`]
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
    tabela(
      ["Unidade", "Nº Predial", "Compl.", "Unid. Consum.", "Instalação", "Solicitação", "Disjuntor"],
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
      ["Unidade", "Norma", "Caixa", "Atividade principal", "Ramo de atividade"],
      [26, 22, 26, 50, 50],
      ucBlocos.map((u, ui) => [
        u.identificacao || "UC " + (ui + 1),
        hibrido ? `ND ${u.nd}` : "—",
        u.caixa || "—",
        u.atividade || "—",
        u.ramo || "—",
      ]),
    );
    cy += 2;
    sec("5.  PREVISÃO DE CARGA POR UNIDADE CONSUMIDORA");
    tabela(
      [
        "Unidade",
        "Ilum.",
        "Tomada",
        "Chuveiro",
        "Ar Cond.",
        "Outros",
        "Carga (kW)",
        "Dem. (kVA)",
      ],
      [30, 20, 22, 24, 22, 20, 22, 22],
      ucBlocos.filter((u) => !ucSemAlteracao(u)).map((u) => [
        u.identificacao || "UC",
        (u.prev || {}).ilum || "—",
        (u.prev || {}).tomada || "—",
        (u.prev || {}).chuveiro || "—",
        (u.prev || {}).ar || "—",
        (u.prev || {}).outros || "—",
        fmt2(prevKwUC(u)),
        (u.prev || {}).demanda || "—",
      ]),
    );
    totRow(
      `Total ${fmt2(prevTotalKw)} kW  |  Demanda`,
      `${fmt2(demandaTotalGeral)} kVA`,
    );
    cy += 2;
    if (atend.disjuntorGeral || trocaDisjGeral) {
      sec("6.  DISJUNTOR GERAL");
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
        ["Ramo de atividade", u.ramo],
        ["Nº Predial", obra.num],
        ["Complemento", u.complemento],
        ["Caixa / Identificação", u.caixa],
      ];
      if (u.solicitacao !== "Conexão Nova")
        pares.push(["Nº Instalação", u.instalacao]);
      if (u.solicitacao === "Alteração de Carga")
        pares.push(["Mudança de local", u.mudancaLocal]);
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
        fullLine("Disjuntor anterior (De)", u.disjDe);
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
        ["Unidade", "Tipo", "Pot. (CV)", "Qtd", "Dem. unit. (kVA)", "Dem. total (kVA)"],
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
    sec("6.  GERADOR DE EMERGÊNCIA");
    const gp = [["Há gerador de emergência?", gerador.possui]];
    if (gerador.possui === "Sim")
      gp.push(
        ["Potência (kVA)", gerador.potencia],
        ["Fonte/Combustível", gerador.fonte],
      );
    kvPairs(gp);
    if (gerador.possui === "Sim" && gerador.descricao)
      fullLine("Descrição", gerador.descricao);
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
}

/* ============================================================
   CEMIG — Lista de documentos para a solicitação.
   Gera um checklist em PDF. Os itens são placeholders, a serem
   ajustados conforme a regra de negócio definitiva.
   ============================================================ */
// Itens placeholder da lista de documentos.
const LISTA_DOCUMENTOS_PLACEHOLDER = [
  "Documento de identificação com foto e CPF do titular",
  "Comprovante de propriedade ou posse do imóvel",
  "Comprovante de regularidade do imóvel (área urbana)",
  "ART/TRT de projeto paga (quando aplicável)",
  "Planta de situação conforme ND-5.2 (quando aplicável)",
  "Procuração do responsável técnico (solicitações de terceiros)",
  "Documento de regularização ambiental (quando aplicável)",
  "[Documento adicional 1 — placeholder]",
  "[Documento adicional 2 — placeholder]",
];

function gerarListaDocumentosDoc(S) {
  const { prop } = S || {};
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

  // Barra superior (mesmo estilo do formulário, sem logo)
  doc.setFillColor(10, 47, 39);
  doc.rect(0, 0, PW, 18, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.setTextColor(255, 255, 255);
  doc.text("Lista de Documentos — Orçamento de Conexão BT", MG, 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(169, 230, 191);
  doc.text("Documentos a apresentar na solicitação", MG, 13.5);
  cy = 28;

  if (prop && prop.nome) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30, 32, 42);
    doc.text(`Solicitante: ${prop.nome}`, MG, cy);
    cy += 9;
  }

  doc.setFontSize(11);
  LISTA_DOCUMENTOS_PLACEHOLDER.forEach((item) => {
    if (cy > PH - 20) {
      doc.addPage();
      cy = MG + 6;
    }
    // checkbox
    doc.setDrawColor(16, 119, 98);
    doc.rect(MG, cy - 3.6, 4.2, 4.2);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(30, 32, 42);
    const linhas = doc.splitTextToSize(item, CW - 10);
    doc.text(linhas, MG + 7, cy);
    cy += Math.max(6, linhas.length * 5 + 2.5);
  });

  const nomeArq = (prop?.nome || "documentos")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .slice(0, 30);
  doc.save(`CEMIG_lista_documentos_${nomeArq}.pdf`);
}
