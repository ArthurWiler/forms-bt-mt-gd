function TabRevisar({ ctx }) {
  const {
    aba,
    setAba,
    modalidade,
    setModalidade,
    atend,
    setAtend,
    prop,
    setProp,
    corr,
    setCorr,
    obra,
    setObra,
    gerador,
    setGerador,
    obs,
    setObs,
    cepStatus,
    setCepStatus,
    cnpjStatus,
    setCnpjStatus,
    logoPDF,
    setLogoPDF,
    ucsDet,
    setUcsDet,
    ucBlocos,
    setUcBlocos,
    blocos,
    setBlocos,
    abas,
    buscarCEP,
    buscarCNPJ,
    coletivo,
    coordObrigatoria,
    coordPreenchida,
    demandaPrevTotal,
    demandaTotalGeral,
    disjGeralObrigatorio,
    docInfo,
    gerarPDF,
    gerarListaDocs,
    hibrido,
    idx,
    irAnt,
    irProx,
    isAlteracaoColetivo,
    maiorCorrenteUC,
    multiTorres,
    opcoesDisjGeral,
    pessoaFisica,
    prevTotalKw,
    redeMono,
    replicarPrevTodas,
    replicarPrevTorre,
    replicarPrimeiro,
    replicarUC1Coletivo,
    replicarUC1Torre,
    setBloco,
    setBlocoPrev,
    setTorre,
    setUcDet,
    setUcTorre,
    setUcTorrePrev,
    sincronizarUCsTorre,
    totalUcsEmpreendimento,
    trocaDisjGeral,
    validacaoDisjuntores,
    validacaoHibrido,
    motoresPesadosBT,
    setMostrarAnaliseMotores,
    exibeTermoGrupoB
  } = ctx;
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Etapa final",
      title: "Prévia do Formulário",
      sub: "Confira os dados. Se algo estiver incorreto, volte às etapas anteriores pela barra lateral."
    },
    /* @__PURE__ */ React.createElement("div", { className: "kpi-row" }, /* @__PURE__ */ React.createElement("div", { className: "kpi" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-label" }, "Proprietário"), /* @__PURE__ */ React.createElement("div", { className: "kpi-value", style: { fontSize: 14 } }, prop.nome || "—")), /* @__PURE__ */ React.createElement("div", { className: "kpi" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-label" }, "Unidades Consumidoras"), /* @__PURE__ */ React.createElement("div", { className: "kpi-value" }, multiTorres ? totalUcsEmpreendimento : coletivo ? ucBlocos.length : ucsDet.length)), /* @__PURE__ */ React.createElement("div", { className: "kpi dark" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-label" }, "Demanda Total"), /* @__PURE__ */ React.createElement("div", { className: "kpi-value", style: { fontSize: 18 } }, fmt2(demandaTotalGeral), " kVA"))),
    /* @__PURE__ */ React.createElement("div", { className: "preview-block" }, /* @__PURE__ */ React.createElement("h4", null, "Modalidade"), /* @__PURE__ */ React.createElement("div", { className: "preview-item" }, /* @__PURE__ */ React.createElement("span", { className: "v" }, multiTorres ? `Múltiplas Torres/Blocos · ${blocos.length} ${atend.atendA.toLowerCase()}(s)` : coletivo ? "Coletivo — Agrupamento com Proteção Geral (APR Web)" : "Individual / até 3 caixas sem proteção geral", coletivo ? ` · ${atend.solicitacao} · ${atend.escopo}` : "", !multiTorres && atend.disjuntorGeral ? ` · Disjuntor geral: ${atend.disjuntorGeral}` : ""))),
    /* @__PURE__ */ React.createElement("div", { className: "preview-block" }, /* @__PURE__ */ React.createElement("h4", null, "Obra"), /* @__PURE__ */ React.createElement("div", { className: "preview-grid" }, /* @__PURE__ */ React.createElement("div", { className: "preview-item" }, /* @__PURE__ */ React.createElement("span", { className: "k" }, "Endereço"), /* @__PURE__ */ React.createElement("span", { className: "v" }, obra.localizacao === "Rural" ? `${obra.cidade || "—"}${obra.distritoComunidade ? " · " + obra.distritoComunidade : ""}` : `${obra.endereco || "—"}, ${obra.num || "s/n"}`)), /* @__PURE__ */ React.createElement("div", { className: "preview-item" }, /* @__PURE__ */ React.createElement("span", { className: "k" }, "Cidade / UF"), /* @__PURE__ */ React.createElement("span", { className: "v" }, obra.cidade || "—", " / ", obra.estado)), /* @__PURE__ */ React.createElement("div", { className: "preview-item" }, /* @__PURE__ */ React.createElement("span", { className: "k" }, "Localização"), /* @__PURE__ */ React.createElement("span", { className: "v" }, obra.localizacao)), /* @__PURE__ */ React.createElement("div", { className: "preview-item" }, /* @__PURE__ */ React.createElement("span", { className: "k" }, "Coordenada"), /* @__PURE__ */ React.createElement("span", { className: "v" }, [obra.lat, obra.lng].filter(Boolean).join(", ") || "—")))),
    multiTorres ? /* @__PURE__ */ React.createElement("div", { className: "preview-block" }, /* @__PURE__ */ React.createElement("h4", null, "Torres / Blocos"), blocos.map((b, bi) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: bi,
        className: "preview-item",
        style: {
          display: "flex",
          justifyContent: "space-between"
        }
      },
      /* @__PURE__ */ React.createElement("span", { className: "v" }, atend.atendA, " ", b.nome || bi + 1, " · ", b.qtdUCs || 0, " UCs · Geral: ", b.disjGeral || "—", " · Incêndio:", " ", b.disjIncendio || "—"),
      /* @__PURE__ */ React.createElement("span", { style: { color: "var(--verde)", fontWeight: 700 } }, fmt2(
        calcBlocoMultiTorres(b).demandaUcs + num(b.demandaIncendio)
      ), " ", "kVA")
    ))) : coletivo ? /* @__PURE__ */ React.createElement("div", { className: "preview-block" }, /* @__PURE__ */ React.createElement("h4", null, "Previsão de carga e UCs"), /* @__PURE__ */ React.createElement("div", { className: "preview-item" }, /* @__PURE__ */ React.createElement("span", { className: "v" }, "Total ", fmt2(prevTotalKw), " kW · Demanda ", fmt2(demandaTotalGeral), " ", "kVA")), ucBlocos.map((u, ui) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: ui,
        className: "preview-item",
        style: {
          display: "flex",
          justifyContent: "space-between"
        }
      },
      /* @__PURE__ */ React.createElement("span", { className: "v" }, u.identificacao || `UC ${ui + 1}`, " · ", u.atividade, " ·", " ", u.solicitacao, " ", u.complemento ? `· ${u.complemento}` : ""),
      /* @__PURE__ */ React.createElement("span", { style: { color: "var(--verde)", fontWeight: 700 } }, u.disjPara || "—")
    ))) : /* @__PURE__ */ React.createElement("div", { className: "preview-block" }, /* @__PURE__ */ React.createElement("h4", null, "Unidades Consumidoras"), ucsDet.map((u, ui) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: ui,
        className: "preview-item",
        style: {
          display: "flex",
          justifyContent: "space-between"
        }
      },
      /* @__PURE__ */ React.createElement("span", { className: "v" }, "UC ", ui + 1, " · ", u.atividade, " · ", u.solicitacao, " ", u.complemento ? `· ${u.complemento}` : ""),
      /* @__PURE__ */ React.createElement("span", { style: { color: "var(--verde)", fontWeight: 700 } }, fmt2(u.cargas?._demanda || 0), " kVA ·", " ", u.disjEscolhido || (u.cargas?._disjuntores || [])[0] || "—")
    )))
  ), /* @__PURE__ */ React.createElement(Card, { sub: "Anexe à solicitação: planta de situação (A4), ART/TRT de projeto (quando aplicável) e documentos de regularidade do imóvel, conforme as orientações da CEMIG." }, hibrido && !validacaoHibrido.ok && /* @__PURE__ */ React.createElement("div", { className: "alert alert-warn", style: { marginBottom: 12 } }, "Corrija as pendências do atendimento híbrido (aba Unidades Consumidoras) para liberar a exportação do PDF."), !ctx.validacaoObrigatorios.ok && /* @__PURE__ */ React.createElement("div", { className: "alert alert-warn", style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("strong", null, "Preencha os campos obrigatórios para liberar o PDF:"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "6px 0 0 18px" } }, ctx.validacaoObrigatorios.faltando.map((f, i) => /* @__PURE__ */ React.createElement("li", { key: i }, f)))), motoresPesadosBT && motoresPesadosBT.length > 0 && /* @__PURE__ */ React.createElement("div", { className: "alert alert-warn", style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("span", null, "A solicitação possui motores que exigem mais informações, favor preencher o formulário: "), /* @__PURE__ */ React.createElement(
    Btn,
    {
      variant: "dark",
      onClick: () => setMostrarAnaliseMotores(true)
    },
    "Preencher Análise de Partida"
  )), /* @__PURE__ */ React.createElement("div", { className: "btn-row", style: { display: "flex", gap: 10, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(
    Btn,
    {
      variant: "dark",
      onClick: gerarPDF,
      disabled: !ctx.validacaoObrigatorios.ok || hibrido && !validacaoHibrido.ok
    },
    "📄 Exportar PDF"
  ), /* @__PURE__ */ React.createElement(
    Btn,
    {
      variant: "ghost",
      onClick: gerarListaDocs
    },
    "📋 Gerar lista de documentos"
  ), exibeTermoGrupoB && /* @__PURE__ */ React.createElement(
    Btn,
    {
      variant: "ghost",
      onClick: () => gerarTermoGrupoB(ctx)
    },
    "📄 Exportar Termo de Opção - Grupo B"
  ))));
}

/* ============================================================
   Análise de Partida de Motores (BT) — varredura feita em app.js
   (ctx.motoresPesadosBT). Formulário sem obrigatoriedade: nenhum
   asterisco e nenhum input "required", não bloqueia a exportação
   do formulário principal. Como o cliente está na rede secundária
   (BT), a "Potência do transformador do consumidor" é travada com
   o texto "Cliente ligado a rede CEMIG" e a Impedância percentual
   do transformador não é solicitada nem impressa no PDF.
   ============================================================ */
function _motorLabelCV(m) {
  return (
    (m.fase === "mono" ? MOTOR_MONO : MOTOR_TRI).find(
      (r) => r.cv === parseFloat(m.cv),
    )?.l || m.cv
  );
}
const DISPOSITIVOS_PARTIDA_BT = [
  "Chave Estrela-Triângulo",
  "Chave Compensadora",
  "Soft-Starter",
  "Inversor de Frequência",
];
function TabAnaliseMotoresBT({ ctx }) {
  const { motoresPesadosBT, setMotorAnalisePartida } = ctx;
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Rede secundária (BT)",
      title: "Análise de Partida de Motores",
      sub: "Preencha, quando possível, os dados de cada motor pesado identificado nas Unidades Consumidoras. Este bloco é opcional e não bloqueia a exportação do formulário principal.",
    },
    !motoresPesadosBT || motoresPesadosBT.length === 0
      ? /* @__PURE__ */ React.createElement(
          "div",
          { className: "field-hint" },
          "Nenhum motor pesado identificado.",
        )
      : motoresPesadosBT.map(({ ucIndex, motorIndex, motor }) => {
          const ap = motor.analisePartida || {};
          const cNom = parseFloat(ap.correnteNominal) || 0;
          const ipIn = parseFloat(ap.ipIn) || 0;
          const cPartida = cNom && ipIn ? cNom * ipIn : null;
          const upd = (patch) =>
            setMotorAnalisePartida(ucIndex, motorIndex, patch);
          return /* @__PURE__ */ React.createElement(
            "div",
            {
              key: `${ucIndex}-${motorIndex}`,
              className: "subbox",
              style: { marginTop: 14 },
            },
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "subbox-title", style: { marginBottom: 8 } },
              `UC ${ucIndex + 1} — Motor ${motorIndex + 1} (${motor.fase === "mono" ? "Monofásico" : "Trifásico"}, ${_motorLabelCV(motor)} CV)`,
            ),
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "grid grid-3" },
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Potência do transformador do consumidor (kVA)" },
                /* @__PURE__ */ React.createElement(Inp, {
                  value: "Cliente ligado a rede CEMIG",
                  disabled: true,
                  onChange: () => {},
                }),
              ),
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Corrente Nominal (A)" },
                /* @__PURE__ */ React.createElement(Inp, {
                  type: "number",
                  value: ap.correnteNominal || "",
                  placeholder: "Ex.: 12,5",
                  onChange: (e) => upd({ correnteNominal: e.target.value }),
                }),
              ),
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Relação Ip/In" },
                /* @__PURE__ */ React.createElement(Inp, {
                  type: "number",
                  value: ap.ipIn || "",
                  placeholder: "Ex.: 6",
                  onChange: (e) => upd({ ipIn: e.target.value }),
                }),
              ),
            ),
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "grid grid-3", style: { marginTop: 10 } },
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Corrente de partida (A)" },
                /* @__PURE__ */ React.createElement(Inp, {
                  value: cPartida == null ? "—" : fmt2(cPartida),
                  disabled: true,
                  onChange: () => {},
                }),
              ),
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Fator de potência na partida" },
                /* @__PURE__ */ React.createElement(Inp, {
                  type: "number",
                  value: ap.fpPartida || "",
                  placeholder: "Ex.: 0,35",
                  onChange: (e) => upd({ fpPartida: e.target.value }),
                }),
              ),
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Número de partidas" },
                /* @__PURE__ */ React.createElement(Inp, {
                  type: "number",
                  value: ap.numPartidas || "",
                  onChange: (e) => upd({ numPartidas: e.target.value }),
                }),
              ),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Dispositivo auxiliar de partida" },
              /* @__PURE__ */ React.createElement(
                Sel,
                {
                  value: ap.dispositivo || "",
                  onChange: (e) =>
                    upd({
                      dispositivo: e.target.value,
                      ...(e.target.value !== "Chave Compensadora"
                        ? { tap: "" }
                        : {}),
                    }),
                },
                /* @__PURE__ */ React.createElement(
                  "option",
                  { value: "" },
                  "Selecionar",
                ),
                DISPOSITIVOS_PARTIDA_BT.map((d) =>
                  /* @__PURE__ */ React.createElement(
                    "option",
                    { key: d, value: d },
                    d,
                  ),
                ),
              ),
            ),
            ap.dispositivo === "Chave Compensadora" &&
              /* @__PURE__ */ React.createElement(
                "div",
                { className: "grid grid-3", style: { marginTop: 10 } },
                /* @__PURE__ */ React.createElement(
                  Field,
                  { label: "Tap (%)" },
                  /* @__PURE__ */ React.createElement(Inp, {
                    type: "number",
                    value: ap.tap || "",
                    placeholder: "Ex.: 65",
                    onChange: (e) => upd({ tap: e.target.value }),
                  }),
                ),
              ),
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "grid grid-3", style: { marginTop: 10 } },
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Ordem de partida" },
                /* @__PURE__ */ React.createElement(Inp, {
                  type: "number",
                  value: ap.ordemPartida || "",
                  onChange: (e) => upd({ ordemPartida: e.target.value }),
                }),
              ),
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Carga operando (kVA)" },
                /* @__PURE__ */ React.createElement(Inp, {
                  type: "number",
                  value: ap.cargaOperanteKVA || "",
                  onChange: (e) => upd({ cargaOperanteKVA: e.target.value }),
                }),
              ),
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Carga operando (FP)" },
                /* @__PURE__ */ React.createElement(Inp, {
                  type: "number",
                  value: ap.cargaOperanteFP || "",
                  onChange: (e) => upd({ cargaOperanteFP: e.target.value }),
                }),
              ),
            ),
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "grid grid-3", style: { marginTop: 10 } },
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Carga sensível — Tipo" },
                /* @__PURE__ */ React.createElement(Inp, {
                  value: ap.cargaSensivelTipo || "",
                  placeholder: "Ex.: CLP, iluminação",
                  onChange: (e) => upd({ cargaSensivelTipo: e.target.value }),
                }),
              ),
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Carga sensível — % admissível" },
                /* @__PURE__ */ React.createElement(Inp, {
                  type: "number",
                  value: ap.cargaSensivelPercentual || "",
                  onChange: (e) =>
                    upd({ cargaSensivelPercentual: e.target.value }),
                }),
              ),
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Simultaneidade" },
                /* @__PURE__ */ React.createElement(Toggle, {
                  value: ap.simultaneidade || "",
                  onChange: (v) => upd({ simultaneidade: v }),
                  options: [
                    { v: "Sim", l: "Sim" },
                    { v: "Não", l: "Não" },
                  ],
                }),
              ),
            ),
          );
        }),
  );
}

/* ===== Exportação independente (jsPDF) — folha A4 por motor pesado.
   Nome do arquivo dinâmico a partir de prop.nome. Impedância percentual
   do transformador omitida por completo (cliente em rede secundária). */
function exportarPDFPartidaBT(ctx) {
  const { motoresPesadosBT, prop } = ctx;
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
    doc.rect(0, 0, PW, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(
      "FORMULÁRIO PARA A ANÁLISE DE PARTIDA DE MOTORES",
      PW / 2,
      10,
      { align: "center" },
    );
    cy = 23;
  };
  const sec = (t) => {
    doc.setFillColor(230, 242, 238);
    doc.rect(MG, cy, CW, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(10, 47, 39);
    doc.text(t, MG + 2, cy + 4.2);
    cy += 9;
  };
  const kv = (label, valor) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(20, 20, 20);
    doc.text(label, MG, cy);
    doc.setFont("helvetica", "normal");
    doc.text(String(valor), MG + 78, cy);
    cy += 5.5;
  };
  const valTexto = (v, sufixo) => {
    const s = String(v ?? "").trim();
    if (!s) return "________________";
    return sufixo ? `${s} ${sufixo}` : s;
  };
  const nomeCliente = (prop.nome || "Cliente").trim();
  const lista = motoresPesadosBT || [];

  if (!lista.length) {
    drawTopBar();
    sec("IDENTIFICAÇÃO");
    kv("Cliente:", nomeCliente || "________________");
    cy += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text("Nenhum motor pesado identificado.", MG, cy);
  } else {
    lista.forEach(({ motor }, i) => {
      if (i > 0) doc.addPage();
      cy = MG;
      drawTopBar();

      sec("IDENTIFICAÇÃO");
      kv("Cliente:", nomeCliente || "________________");

      sec("TIPO DO MOTOR / NÚMERO DE FASES");
      kv(
        "Número de fases:",
        motor.fase === "mono" ? "Monofásico" : "Trifásico",
      );

      const ap = motor.analisePartida || {};
      const cNom = parseFloat(ap.correnteNominal) || 0;
      const ipIn = parseFloat(ap.ipIn) || 0;
      const cPartida = cNom && ipIn ? (cNom * ipIn).toFixed(2) : "";

      sec("DADOS ELÉTRICOS");
      kv("Potência do motor (CV):", valTexto(_motorLabelCV(motor)));
      kv("Corrente Nominal (A):", valTexto(ap.correnteNominal));
      kv("Relação Ip/In:", valTexto(ap.ipIn));
      kv("Corrente de partida (A):", valTexto(cPartida));
      kv("Fator de potência na partida:", valTexto(ap.fpPartida));

      sec("NÚMERO DE PARTIDAS");
      kv("Número de partidas:", valTexto(ap.numPartidas));

      sec("DISPOSITIVO AUXILIAR DE PARTIDA (QUANDO HOUVER)");
      const dispositivoTexto = ap.dispositivo
        ? ap.dispositivo +
          (ap.dispositivo === "Chave Compensadora"
            ? ` — Tap: ${valTexto(ap.tap, "%")}`
            : "")
        : "________________";
      kv("Dispositivo:", dispositivoTexto);

      sec("ORDEM DE PARTIDA DO MOTOR (DOIS OU MAIS MOTORES)");
      kv("Ordem de partida:", valTexto(ap.ordemPartida));

      sec("CARGAS OPERANDO ENQUANTO O MOTOR PARTE");
      kv("Potência (kVA):", valTexto(ap.cargaOperanteKVA));
      kv("Fator de potência:", valTexto(ap.cargaOperanteFP));

      sec("CARGAS SENSÍVEIS A FLUTUAÇÕES DE TENSÃO");
      kv("Tipo:", valTexto(ap.cargaSensivelTipo));
      kv("Flutuação admissível (%):", valTexto(ap.cargaSensivelPercentual));

      sec("SIMULTANEIDADE DE PARTIDA");
      kv("Simultaneidade:", valTexto(ap.simultaneidade));

      sec("TRANSFORMADOR DO CONSUMIDOR");
      kv("Potência do transformador:", "Cliente ligado a rede CEMIG");

      sec("NOTAS");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(60, 60, 60);
      doc.text(
        doc.splitTextToSize(
          "1 - Em caso de partida sequencial de motores, preencher uma folha para cada motor, indicando a ordem de partida.",
          CW,
        ),
        MG,
        cy,
      );
      cy += 8;
      doc.text(
        doc.splitTextToSize(
          "2 - Anexar, sempre que possível, a(s) folha(s) das características elétricas, fornecida(s) pelo fabricante do motor.",
          CW,
        ),
        MG,
        cy,
      );
      cy += 12;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(20, 20, 20);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, MG, cy);
      cy += 22;
      doc.setDrawColor(60, 60, 60);
      doc.line(MG, cy, MG + 90, cy);
      cy += 4;
      doc.setFontSize(8);
      doc.text("Responsável pelas informações", MG, cy);
    });
  }

  const nomeArquivo = `Analise_Partida_Motores_${(nomeCliente.replace(/\s+/g, "_") || "Cliente")}.pdf`;
  doc.save(nomeArquivo);
}
