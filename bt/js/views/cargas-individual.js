function TabCargasIndividual({ ctx }) {
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
    restrito,
    setUcTorrePrev,
    sincronizarUCsTorre,
    totalUcsEmpreendimento,
    trocaDisjGeral,
    validacaoDisjuntores,
    validacaoHibrido
  } = ctx;
  return /* @__PURE__ */ React.createElement("div", null, ucsDet.length > 1 && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "alert " + (validacaoDisjuntores.ok ? "alert-ok" : "alert-warn")
    },
    /* @__PURE__ */ React.createElement("b", null, "Regra de disjuntores:"),
    " m\xE1x. 1 tripolar 63 A e/ou 2 mono/bif\xE1sicos 63 A. ",
    validacaoDisjuntores.ok ? "\u2714 " : "\u26A0 ",
    validacaoDisjuntores.msg
  ), ucsDet.map((u, ui) => /* @__PURE__ */ React.createElement(
    Card,
    {
      key: ui,
      eyebrow: `UC ${ui + 1} de ${ucsDet.length}`,
      title: `Cargas da Unidade Consumidora ${ui + 1}`,
      sub: "Detalhe os equipamentos. A demanda e o disjuntor s\xE3o calculados automaticamente (ND-5.1)."
    },
    /* @__PURE__ */ React.createElement(
      CalcDemanda,
      {
        data: u.cargas,
        onChange: (c) => setUcDet(ui, { cargas: c }),
        redeMono,
        atividade: u.atividade,
        minimizarPorPadrao: restrito
      }
    ),
    /* @__PURE__ */ React.createElement("div", { className: "kpi-row", style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", { className: "kpi" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-label" }, "Carga Instalada"), /* @__PURE__ */ React.createElement("div", { className: "kpi-value" }, fmt2(u.cargas?._cargaKw || 0), " kW")), /* @__PURE__ */ React.createElement("div", { className: "kpi" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-label" }, "Demanda Calculada"), /* @__PURE__ */ React.createElement("div", { className: "kpi-value" }, fmt2(u.cargas?._demanda || 0), " kVA")), /* @__PURE__ */ React.createElement("div", { className: "kpi dark" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-label" }, "Disjuntor Sugerido"), /* @__PURE__ */ React.createElement("div", { className: "kpi-value" }, u.cargas?._disjuntores?.length ? u.cargas._disjuntores.join(" \xB7 ") : "\u2014"))),
    u.cargas?._disjuntores?.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 12 } }, /* @__PURE__ */ React.createElement(Field, { label: `Disjuntor escolhido para a UC ${ui + 1}` }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: u.disjEscolhido || u.cargas._disjuntores[0],
        onChange: (e) => setUcDet(ui, { disjEscolhido: e.target.value })
      },
      u.cargas._disjuntores.map((dj) => /* @__PURE__ */ React.createElement("option", { key: dj, value: dj }, dj))
    )))
  )));
}
