function TabUcsIndividual({ ctx }) {
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
    restrito,
    sincronizarUCsTorre,
    totalUcsEmpreendimento,
    trocaDisjGeral,
    validacaoDisjuntores,
    validacaoHibrido
  } = ctx;
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Identifica\xE7\xE3o",
      title: `Unidades Consumidoras (${ucsDet.length})`,
      sub: "Dados de identifica\xE7\xE3o de cada unidade consumidora. O detalhamento das cargas \xE9 feito na pr\xF3xima etapa. Em Conex\xE3o Nova n\xE3o h\xE1 disjuntor 'De' nem instala\xE7\xE3o."
    },
    ucsDet.map((u, ui) => /* @__PURE__ */ React.createElement("div", { key: ui, className: "uc-block" }, /* @__PURE__ */ React.createElement("div", { className: "uc-block-head" }, /* @__PURE__ */ React.createElement("span", { className: "uc-block-title" }, "UC ", ui + 1), /* @__PURE__ */ React.createElement(Badge, null, ui + 1, " de ", ucsDet.length)), /* @__PURE__ */ React.createElement("div", { className: "grid grid-3" }, /* @__PURE__ */ React.createElement(Field, { label: "Tipo de solicita\xE7\xE3o", req: true }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: u.solicitacao,
        onChange: (e) => setUcDet(ui, { solicitacao: e.target.value })
      },
      /* @__PURE__ */ React.createElement("option", null, "Conex\xE3o Nova"),
      /* @__PURE__ */ React.createElement("option", null, "Altera\xE7\xE3o de Carga"),
      /* @__PURE__ */ React.createElement("option", null, "Caixa Existente sem Altera\xE7\xE3o")
    )), /* @__PURE__ */ React.createElement(Field, { label: "Atividade principal", req: true }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: u.atividade,
        disabled: restrito,
        onChange: (e) => setUcDet(ui, { atividade: e.target.value })
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Selecionar"),
      /* @__PURE__ */ React.createElement("option", null, "Residencial"),
      /* @__PURE__ */ React.createElement("option", null, "Comercial"),
      /* @__PURE__ */ React.createElement("option", null, "Industrial"),
      /* @__PURE__ */ React.createElement("option", null, "Rural")
    )), /* @__PURE__ */ React.createElement(
      Field,
      {
        label: "Ramo de atividade",
        req: u.atividade !== "Residencial"
      },
      /* @__PURE__ */ React.createElement(
        Inp,
        {
          value: u.ramo,
          disabled: restrito,
          onChange: (e) => setUcDet(ui, { ramo: e.target.value }),
          placeholder: u.atividade === "Residencial" ? "\u2014" : "Obrigat\xF3rio"
        }
      )
    ), /* @__PURE__ */ React.createElement(Field, { label: "N\xBA Predial" }, /* @__PURE__ */ React.createElement("div", { className: "readonly-val" }, obra.num || "N\xBA Predial")), /* @__PURE__ */ React.createElement(Field, { label: "Complemento", req: ucsDet.length > 1 }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: u.complemento,
        onChange: (e) => setUcDet(ui, { complemento: e.target.value }),
        placeholder: "Casa 1"
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Caixa / Identifica\xE7\xE3o" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: u.caixa,
        onChange: (e) => setUcDet(ui, { caixa: e.target.value })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Unidade Consumidora" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: u.unidadeConsumidora,
        onChange: (e) => setUcDet(ui, { unidadeConsumidora: e.target.value }),
        placeholder: "Identifica\xE7\xE3o da UC (interna/externa)"
      }
    )), u.solicitacao !== "Conex\xE3o Nova" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Field, { label: "N\xBA Instala\xE7\xE3o / Medidor", req: true }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: u.instalacao,
        onChange: (e) => setUcDet(ui, { instalacao: e.target.value })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Disjuntor atual" }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: u.disjDe,
        onChange: (e) => setUcDet(ui, { disjDe: e.target.value })
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Selecione\u2026"),
      DISJ.map((d) => /* @__PURE__ */ React.createElement("option", { key: d.fx, value: d.fx }, d.fx))
    )), u.solicitacao === "Altera\xE7\xE3o de Carga" && /* @__PURE__ */ React.createElement(Field, { label: "Mudan\xE7a de local" }, /* @__PURE__ */ React.createElement(
      Toggle,
      {
        value: u.mudancaLocal,
        onChange: (v) => setUcDet(ui, { mudancaLocal: v }),
        options: [
          { v: "Sim", l: "Sim" },
          { v: "N\xE3o", l: "N\xE3o" }
        ]
      }
    ))))))
  ), ucsDet.length > 1 && /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "alert " + (validacaoDisjuntores.ok ? "alert-ok" : "alert-warn")
    },
    /* @__PURE__ */ React.createElement("b", null, "Regra de disjuntores (m\xFAltiplas UCs sem prote\xE7\xE3o geral):"),
    " no m\xE1ximo 1 tripolar de 63 A e/ou at\xE9 2 mono/bif\xE1sicos de 63 A.",
    " ",
    validacaoDisjuntores.ok ? "\u2714 " : "\u26A0 ",
    validacaoDisjuntores.msg
  ));
}
