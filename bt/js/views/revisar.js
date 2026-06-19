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
    validacaoHibrido
  } = ctx;
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Etapa final",
      title: "Pr\xE9via do Formul\xE1rio",
      sub: "Confira os dados. Se algo estiver incorreto, volte \xE0s etapas anteriores pela barra lateral."
    },
    /* @__PURE__ */ React.createElement("div", { className: "kpi-row" }, /* @__PURE__ */ React.createElement("div", { className: "kpi" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-label" }, "Propriet\xE1rio"), /* @__PURE__ */ React.createElement("div", { className: "kpi-value", style: { fontSize: 14 } }, prop.nome || "\u2014")), /* @__PURE__ */ React.createElement("div", { className: "kpi" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-label" }, "Unidades Consumidoras"), /* @__PURE__ */ React.createElement("div", { className: "kpi-value" }, multiTorres ? totalUcsEmpreendimento : coletivo ? ucBlocos.length : ucsDet.length)), /* @__PURE__ */ React.createElement("div", { className: "kpi dark" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-label" }, "Demanda Total"), /* @__PURE__ */ React.createElement("div", { className: "kpi-value", style: { fontSize: 18 } }, fmt2(demandaTotalGeral), " kVA"))),
    /* @__PURE__ */ React.createElement("div", { className: "preview-block" }, /* @__PURE__ */ React.createElement("h4", null, "Modalidade"), /* @__PURE__ */ React.createElement("div", { className: "preview-item" }, /* @__PURE__ */ React.createElement("span", { className: "v" }, multiTorres ? `M\xFAltiplas Torres/Blocos \xB7 ${blocos.length} ${atend.atendA.toLowerCase()}(s)` : coletivo ? "Coletivo \u2014 Agrupamento com Prote\xE7\xE3o Geral (APR Web)" : "Individual / at\xE9 3 caixas sem prote\xE7\xE3o geral", coletivo ? ` \xB7 ${atend.solicitacao} \xB7 ${atend.escopo}` : "", !multiTorres && atend.disjuntorGeral ? ` \xB7 Disjuntor geral: ${atend.disjuntorGeral}` : ""))),
    /* @__PURE__ */ React.createElement("div", { className: "preview-block" }, /* @__PURE__ */ React.createElement("h4", null, "Obra"), /* @__PURE__ */ React.createElement("div", { className: "preview-grid" }, /* @__PURE__ */ React.createElement("div", { className: "preview-item" }, /* @__PURE__ */ React.createElement("span", { className: "k" }, "Endere\xE7o"), /* @__PURE__ */ React.createElement("span", { className: "v" }, obra.endereco || "\u2014", ", ", obra.num || "s/n")), /* @__PURE__ */ React.createElement("div", { className: "preview-item" }, /* @__PURE__ */ React.createElement("span", { className: "k" }, "Cidade / UF"), /* @__PURE__ */ React.createElement("span", { className: "v" }, obra.cidade || "\u2014", " / ", obra.estado)), /* @__PURE__ */ React.createElement("div", { className: "preview-item" }, /* @__PURE__ */ React.createElement("span", { className: "k" }, "Localiza\xE7\xE3o"), /* @__PURE__ */ React.createElement("span", { className: "v" }, obra.localizacao)), /* @__PURE__ */ React.createElement("div", { className: "preview-item" }, /* @__PURE__ */ React.createElement("span", { className: "k" }, "Coordenada"), /* @__PURE__ */ React.createElement("span", { className: "v" }, [obra.lat, obra.lng].filter(Boolean).join(", ") || "\u2014")))),
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
      /* @__PURE__ */ React.createElement("span", { className: "v" }, atend.atendA, " ", b.nome || bi + 1, " \xB7 ", b.qtdUCs || 0, " UCs \xB7 Geral: ", b.disjGeral || "\u2014", " \xB7 Inc\xEAndio:", " ", b.disjIncendio || "\u2014"),
      /* @__PURE__ */ React.createElement("span", { style: { color: "var(--verde)", fontWeight: 700 } }, fmt2(
        (b.ucs || []).reduce(
          (s, u) => s + num((u.prev || {}).demanda),
          0
        ) + num(b.demandaIncendio)
      ), " ", "kVA")
    ))) : coletivo ? /* @__PURE__ */ React.createElement("div", { className: "preview-block" }, /* @__PURE__ */ React.createElement("h4", null, "Previs\xE3o de carga e UCs"), /* @__PURE__ */ React.createElement("div", { className: "preview-item" }, /* @__PURE__ */ React.createElement("span", { className: "v" }, "Total ", fmt2(prevTotalKw), " kW \xB7 Demanda ", fmt2(demandaTotalGeral), " ", "kVA")), ucBlocos.map((u, ui) => /* @__PURE__ */ React.createElement(
      "div",
      {
        key: ui,
        className: "preview-item",
        style: {
          display: "flex",
          justifyContent: "space-between"
        }
      },
      /* @__PURE__ */ React.createElement("span", { className: "v" }, u.identificacao || `UC ${ui + 1}`, " \xB7 ", u.atividade, " \xB7", " ", u.solicitacao, " ", u.complemento ? `\xB7 ${u.complemento}` : ""),
      /* @__PURE__ */ React.createElement("span", { style: { color: "var(--verde)", fontWeight: 700 } }, u.disjPara || "\u2014")
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
      /* @__PURE__ */ React.createElement("span", { className: "v" }, "UC ", ui + 1, " \xB7 ", u.atividade, " \xB7 ", u.solicitacao, " ", u.complemento ? `\xB7 ${u.complemento}` : ""),
      /* @__PURE__ */ React.createElement("span", { style: { color: "var(--verde)", fontWeight: 700 } }, fmt2(u.cargas?._demanda || 0), " kVA \xB7", " ", u.disjEscolhido || (u.cargas?._disjuntores || [])[0] || "\u2014")
    )))
  ), /* @__PURE__ */ React.createElement(Card, { sub: "Anexe \xE0 solicita\xE7\xE3o: planta de situa\xE7\xE3o (A4), ART/TRT de projeto (quando aplic\xE1vel) e documentos de regularidade do im\xF3vel, conforme as orienta\xE7\xF5es da CEMIG." }, hibrido && !validacaoHibrido.ok && /* @__PURE__ */ React.createElement("div", { className: "alert alert-warn", style: { marginBottom: 12 } }, "Corrija as pend\xEAncias do atendimento h\xEDbrido (aba Unidades Consumidoras) para liberar a exporta\xE7\xE3o do PDF."), !ctx.validacaoObrigatorios.ok && /* @__PURE__ */ React.createElement("div", { className: "alert alert-warn", style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("strong", null, "Preencha os campos obrigat\xF3rios para liberar o PDF:"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "6px 0 0 18px" } }, ctx.validacaoObrigatorios.faltando.map((f, i) => /* @__PURE__ */ React.createElement("li", { key: i }, f)))), /* @__PURE__ */ React.createElement(
    Btn,
    {
      variant: "dark",
      onClick: gerarPDF,
      disabled: !ctx.validacaoObrigatorios.ok || hibrido && !validacaoHibrido.ok
    },
    "\u{1F4C4} Exportar PDF"
  )));
}
