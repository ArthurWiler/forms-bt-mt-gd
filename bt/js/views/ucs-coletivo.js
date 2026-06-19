function TabUcsColetivo({ ctx }) {
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
  return /* @__PURE__ */ React.createElement("div", null, hibrido && !validacaoHibrido.ok && /* @__PURE__ */ React.createElement("div", { className: "alert alert-warn", style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("strong", null, "Atendimento h\xEDbrido \u2014 pend\xEAncias:"), /* @__PURE__ */ React.createElement("ul", { style: { margin: "6px 0 0", paddingLeft: 18 } }, validacaoHibrido.erros.map((e, i) => /* @__PURE__ */ React.createElement("li", { key: i }, e)))), hibrido && validacaoHibrido.ok && /* @__PURE__ */ React.createElement("div", { className: "alert alert-ok", style: { marginBottom: 14 } }, "Classifica\xE7\xE3o ND 5.1 / ND 5.2 das UCs est\xE1 consistente."), /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Identifica\xE7\xE3o",
      title: `Unidades Consumidoras (${ucBlocos.length})`,
      sub: "Preencha os dados de identifica\xE7\xE3o de cada UC. Campos com valor padr\xE3o j\xE1 v\xEAm preenchidos. Em Conex\xE3o Nova n\xE3o h\xE1 disjuntor 'De' (a instala\xE7\xE3o ainda n\xE3o existe)."
    },
    ucBlocos.length > 1 && /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "flex-end",
          marginBottom: 12
        }
      },
      /* @__PURE__ */ React.createElement(Btn, { variant: "ghost", onClick: replicarUC1Coletivo }, "\u29C9 Replicar UC 1 para todas")
    ),
    ucBlocos.map((u, ui) => /* @__PURE__ */ React.createElement("div", { key: ui, className: "uc-block" }, /* @__PURE__ */ React.createElement("div", { className: "uc-block-head" }, /* @__PURE__ */ React.createElement("span", { className: "uc-block-title" }, u.identificacao || `UC ${ui + 1}`), /* @__PURE__ */ React.createElement(Badge, null, ui + 1, " de ", ucBlocos.length)), /* @__PURE__ */ React.createElement("div", { className: "grid grid-3" }, hibrido && /* @__PURE__ */ React.createElement(Field, { label: "Norma de atendimento" }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: u.nd,
        onChange: (e) => setBloco(ui, { nd: e.target.value })
      },
      /* @__PURE__ */ React.createElement("option", { value: "5.1" }, "ND 5.1"),
      /* @__PURE__ */ React.createElement("option", { value: "5.2" }, "ND 5.2")
    )), /* @__PURE__ */ React.createElement(Field, { label: "Identifica\xE7\xE3o" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: u.identificacao,
        onChange: (e) => setBloco(ui, { identificacao: e.target.value })
      }
    )), hibrido && u.nd === "5.1" ? /* @__PURE__ */ React.createElement(Field, { label: "N\xBA Predial", req: true, hint: "Distinto entre as UCs" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: u.nPredial,
        onChange: (e) => setBloco(ui, { nPredial: e.target.value })
      }
    )) : /* @__PURE__ */ React.createElement(Field, { label: "N\xBA Predial" }, /* @__PURE__ */ React.createElement("div", { className: "readonly-val" }, obra.num || "N\xBA Predial")), /* @__PURE__ */ React.createElement(Field, { label: "Complemento", req: ucBlocos.length > 1 }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: u.complemento,
        onChange: (e) => setBloco(ui, { complemento: e.target.value }),
        placeholder: "999"
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Caixa" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: u.caixa,
        onChange: (e) => setBloco(ui, { caixa: e.target.value }),
        placeholder: "Apartamento"
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Solicita\xE7\xE3o", req: true }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: u.solicitacao,
        onChange: (e) => setBloco(ui, { solicitacao: e.target.value })
      },
      /* @__PURE__ */ React.createElement("option", null, "Conex\xE3o Nova"),
      /* @__PURE__ */ React.createElement("option", null, "Altera\xE7\xE3o de Carga"),
      /* @__PURE__ */ React.createElement("option", null, "Caixa Existente sem Altera\xE7\xE3o")
    )), u.solicitacao === "Altera\xE7\xE3o de Carga" && /* @__PURE__ */ React.createElement(Field, { label: "Mudan\xE7a de local" }, /* @__PURE__ */ React.createElement(
      Toggle,
      {
        value: u.mudancaLocal,
        onChange: (v) => setBloco(ui, { mudancaLocal: v }),
        options: [
          { v: "Sim", l: "Sim" },
          { v: "N\xE3o", l: "N\xE3o" }
        ]
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Atividade principal", req: true }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: u.atividade,
        onChange: (e) => setBloco(ui, { atividade: e.target.value })
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
          onChange: (e) => setBloco(ui, { ramo: e.target.value }),
          placeholder: u.atividade === "Residencial" ? "\u2014" : "Obrigat\xF3rio"
        }
      )
    ), u.atividade === "Residencial" && /* @__PURE__ */ React.createElement(
      Field,
      {
        label: "\xC1rea (m\xB2)",
        req: true,
        hint: "\xC1rea privativa do apartamento \u2014 usada no c\xE1lculo de demanda ND-5.2."
      },
      /* @__PURE__ */ React.createElement(
        Inp,
        {
          type: "number",
          value: u.area,
          onChange: (e) => setBloco(ui, { area: e.target.value }),
          placeholder: "Ex: 65"
        }
      )
    ), u.solicitacao !== "Conex\xE3o Nova" && /* @__PURE__ */ React.createElement(Field, { label: "Instala\xE7\xE3o", req: true }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: u.instalacao,
        onChange: (e) => setBloco(ui, { instalacao: e.target.value }),
        placeholder: "N\xBA instala\xE7\xE3o existente"
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Unidade Consumidora" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: u.unidadeConsumidora,
        onChange: (e) => setBloco(ui, { unidadeConsumidora: e.target.value }),
        placeholder: "Identifica\xE7\xE3o da UC (interna/externa)"
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Disjuntor", span: 3 }, /* @__PURE__ */ React.createElement("div", { className: "disj-pair" }, u.solicitacao !== "Conex\xE3o Nova" && /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: u.disjDe,
        onChange: (e) => setBloco(ui, { disjDe: e.target.value })
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "De: (atual)\u2026"),
      DISJ.map((d) => /* @__PURE__ */ React.createElement("option", { key: d.fx, value: d.fx }, d.fx))
    )), /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: u.disjPara,
        onChange: (e) => setBloco(ui, { disjPara: e.target.value })
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, u.solicitacao === "Conex\xE3o Nova" ? "Disjuntor solicitado\u2026" : "Para: (solicitado)\u2026"),
      DISJ_CN.map((d) => /* @__PURE__ */ React.createElement("option", { key: d.fx, value: d.fx }, d.fx))
    )))))))
  ));
}
