function TabGerador({ ctx }) {
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
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Complementar",
      title: "Gerador de Emerg\xEAncia",
      sub: "Informe se a instala\xE7\xE3o possui gerador de emerg\xEAncia."
    },
    /* @__PURE__ */ React.createElement(Field, { label: "H\xE1 gerador de emerg\xEAncia?", req: true }, /* @__PURE__ */ React.createElement(
      Toggle,
      {
        value: gerador.possui,
        onChange: (v) => setGerador({ ...gerador, possui: v }),
        options: [
          { v: "Sim", l: "Sim" },
          { v: "N\xE3o", l: "N\xE3o" }
        ]
      }
    )),
    gerador.possui === "Sim" && /* @__PURE__ */ React.createElement("div", { className: "grid grid-2", style: { marginTop: 14 } }, /* @__PURE__ */ React.createElement(Field, { label: "Pot\xEAncia do gerador (kVA)" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: gerador.potencia,
        onChange: (e) => setGerador({ ...gerador, potencia: e.target.value })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Fonte / Combust\xEDvel" }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: gerador.fonte,
        onChange: (e) => setGerador({ ...gerador, fonte: e.target.value })
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Selecione"),
      /* @__PURE__ */ React.createElement("option", null, "Diesel"),
      /* @__PURE__ */ React.createElement("option", null, "Gasolina"),
      /* @__PURE__ */ React.createElement("option", null, "G\xE1s (GLP/GNV)"),
      /* @__PURE__ */ React.createElement("option", null, "Outro")
    )), /* @__PURE__ */ React.createElement(Field, { label: "Descri\xE7\xE3o / Observa\xE7\xF5es do gerador", span: 2 }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: gerador.descricao,
        onChange: (e) => setGerador({ ...gerador, descricao: e.target.value }),
        placeholder: "Modelo, finalidade, regime de opera\xE7\xE3o..."
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "col-span-2 callout" }, "O gerador de emerg\xEAncia opera de forma isolada (sem paralelismo com a rede CEMIG)."))
  );
}
