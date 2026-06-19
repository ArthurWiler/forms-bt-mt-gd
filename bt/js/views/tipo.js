function TabTipo({ ctx }) {
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
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Etapa 1",
      title: "Tipo de Atendimento",
      sub: "O tipo de formul\xE1rio \xE9 definido pela presen\xE7a ou n\xE3o de disjuntor geral. Os campos seguintes se adaptam \xE0 sua escolha."
    },
    /* @__PURE__ */ React.createElement("div", { className: "grid grid-2 divider" }, /* @__PURE__ */ React.createElement(Field, { label: "Solicita\xE7\xE3o", req: true }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: atend.solicitacao,
        disabled: restrito,
        onChange: (e) => setAtend({ ...atend, solicitacao: e.target.value })
      },
      SOLICITACOES.map((s) => /* @__PURE__ */ React.createElement("option", { key: s }, s))
    )), /* @__PURE__ */ React.createElement(Field, { label: "Escopo do Atendimento", req: true }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: atend.escopo,
        onChange: (e) => setAtend({ ...atend, escopo: e.target.value })
      },
      (ESCOPOS[atend.solicitacao] || []).map((s) => /* @__PURE__ */ React.createElement("option", { key: s }, s))
    )), multiTorres && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement(Field, { label: "Atendimento a" }, /* @__PURE__ */ React.createElement(
      Toggle,
      {
        value: atend.atendA,
        onChange: (v) => setAtend({ ...atend, atendA: v }),
        options: [
          { v: "Bloco", l: "Bloco" },
          { v: "Torre", l: "Torre" }
        ]
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "N\xBA de Blocos / Torres", req: true }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        type: "number",
        value: atend.nBlocos,
        onChange: (e) => setAtend({
          ...atend,
          nBlocos: Math.max(1, parseInt(e.target.value))
        })
      }
    )))),
    /* @__PURE__ */ React.createElement("div", { className: "grid grid-2" }, /* @__PURE__ */ React.createElement(Field, { label: "Possui disjuntor geral (prote\xE7\xE3o geral)?", req: true }, /* @__PURE__ */ React.createElement(
      Toggle,
      {
        value: atend.disjGeral,
        disabled: restrito,
        onChange: (v) => setAtend({ ...atend, disjGeral: v }),
        options: [
          { v: "N\xE3o", l: "N\xE3o" },
          { v: "Sim", l: "Sim" }
        ]
      }
    )), !multiTorres && /* @__PURE__ */ React.createElement(Field, { label: "N\xBA de Unidades Consumidoras", req: true }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        type: "number",
        max: restrito ? 3 : void 0,
        value: atend.nUCs,
        onChange: (e) => {
          const n = restrito ? Math.min(3, Math.max(1, parseInt(e.target.value) || 1)) : Math.max(1, parseInt(e.target.value));
          setAtend({
            ...atend,
            nUCs: n,
            disjGeral: restrito ? "N\xE3o" : n > 3 ? "Sim" : "N\xE3o"
          });
        },
        options: [
          { v: true, l: "Sim" },
          { v: false, l: "N\xE3o" }
        ]
      }
    ))),
    /* @__PURE__ */ React.createElement("div", { className: "grid grid-2 divider" }, /* @__PURE__ */ React.createElement(Field, { label: "H\xE1 m\xFAltiplas unidades consumidoras com prote\xE7\xE3o acima de 63 A?" }, /* @__PURE__ */ React.createElement(
      Toggle,
      {
        value: atend.biAcima63,
        disabled: restrito,
        onChange: (v) => setAtend({
          ...atend,
          biAcima63: v,
          triAcima63: v,
          disjGeral: v ? "Sim" : "N\xE3o"
          // converte booleano para string
        }),
        options: [
          { v: true, l: "Sim" },
          { v: false, l: "N\xE3o" }
        ]
      }
    ))),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "alert " + (coletivo ? "alert-ok" : "alert-info"),
        style: { marginTop: 16 }
      },
      multiTorres ? "Atendimento caracterizado como empreendimento com 'M\xFAltiplas Torres ou Blocos'." : coletivo ? "Atendimento caracterizado como 'Coletivo'." : "Atendimento caracterizado como 'Individual'."
    )
  );
}
