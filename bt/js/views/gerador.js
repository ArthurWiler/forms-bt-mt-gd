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
      title: "Gerador de Emergência",
      sub: "Informe se a instalação possui gerador de emergência."
    },
    /* @__PURE__ */ React.createElement(Field, { label: "Há gerador de emergência?", req: true }, /* @__PURE__ */ React.createElement(
      Toggle,
      {
        value: gerador.possui,
        onChange: (v) => setGerador({ ...gerador, possui: v }),
        options: [
          { v: "Sim", l: "Sim" },
          { v: "Não", l: "Não" }
        ]
      }
    )),
    gerador.possui === "Sim" && /* @__PURE__ */ React.createElement("div", { className: "grid grid-2", style: { marginTop: 14 } }, /* @__PURE__ */ React.createElement(Field, { label: "Potência do gerador (kVA)" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: gerador.potencia,
        onChange: (e) => setGerador({ ...gerador, potencia: e.target.value })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Fonte / Combustível" }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: gerador.fonte,
        onChange: (e) => setGerador({ ...gerador, fonte: e.target.value })
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Selecione"),
      /* @__PURE__ */ React.createElement("option", null, "Diesel"),
      /* @__PURE__ */ React.createElement("option", null, "Gasolina"),
      /* @__PURE__ */ React.createElement("option", null, "Gás (GLP/GNV)"),
      /* @__PURE__ */ React.createElement("option", null, "Outro")
    )), /* @__PURE__ */ React.createElement(Field, { label: "Descrição / Observações do gerador", span: 2 }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: gerador.descricao,
        onChange: (e) => setGerador({ ...gerador, descricao: e.target.value }),
        placeholder: "Modelo, finalidade, regime de operação..."
      }
    )), /* @__PURE__ */ React.createElement("div", { className: "col-span-2 cmg-aviso" }, /* @__PURE__ */ React.createElement("div", { className: "cmg-aviso-icon", "aria-hidden": "true" }), /* @__PURE__ */ React.createElement("p", { className: "cmg-aviso-texto" }, "O gerador de emergência opera de forma isolada (sem paralelismo com a rede CEMIG).")))
  );
}
