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
    validacaoHibrido
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
    /* @__PURE__ */ React.createElement("div", { className: "preview-block" }, /* @__PURE__ */ React.createElement("h4", null, "Obra"), /* @__PURE__ */ React.createElement("div", { className: "preview-grid" }, /* @__PURE__ */ React.createElement("div", { className: "preview-item" }, /* @__PURE__ */ React.createElement("span", { className: "k" }, "Endereço"), /* @__PURE__ */ React.createElement("span", { className: "v" }, obra.endereco || "—", ", ", obra.num || "s/n")), /* @__PURE__ */ React.createElement("div", { className: "preview-item" }, /* @__PURE__ */ React.createElement("span", { className: "k" }, "Cidade / UF"), /* @__PURE__ */ React.createElement("span", { className: "v" }, obra.cidade || "—", " / ", obra.estado)), /* @__PURE__ */ React.createElement("div", { className: "preview-item" }, /* @__PURE__ */ React.createElement("span", { className: "k" }, "Localização"), /* @__PURE__ */ React.createElement("span", { className: "v" }, obra.localizacao)), /* @__PURE__ */ React.createElement("div", { className: "preview-item" }, /* @__PURE__ */ React.createElement("span", { className: "k" }, "Coordenada"), /* @__PURE__ */ React.createElement("span", { className: "v" }, [obra.lat, obra.lng].filter(Boolean).join(", ") || "—")))),
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
        (b.ucs || []).reduce(
          (s, u) => s + num((u.prev || {}).demanda),
          0
        ) + num(b.demandaIncendio)
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
  ), /* @__PURE__ */ React.createElement(Card, { sub: "Anexe à solicitação: planta de situação (A4), ART/TRT de projeto (quando aplicável) e documentos de regularidade do imóvel, conforme as orientações da CEMIG." }, hibrido && !validacaoHibrido.ok && /* @__PURE__ */ React.createElement("div", { className: "alert alert-warn", style: { marginBottom: 12 } }, "Corrija as pendências do atendimento híbrido (aba Unidades Consumidoras) para liberar a exportação do PDF."), !ctx.validacaoObrigatorios.ok && /* @__PURE__ */ React.createElement("div", { className: "alert alert-warn", style: { marginBottom: 12 } }, /* @__PURE__ */ React.createElement("strong", null, "Preencha os campos obrigatórios para liberar o PDF:"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "6px 0 0 18px" } }, ctx.validacaoObrigatorios.faltando.map((f, i) => /* @__PURE__ */ React.createElement("li", { key: i }, f)))), /* @__PURE__ */ React.createElement("div", { className: "btn-row", style: { display: "flex", gap: 10, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement(
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
  ))));
}
