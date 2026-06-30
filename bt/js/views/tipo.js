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
    rural,
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
    validacaoHibrido,
    solicitacoesPermitidas
  } = ctx;
  const opcoesSolicitacao = solicitacoesPermitidas || SOLICITACOES;
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Etapa " + ctx.etapaNum,
      title: "Tipo de Atendimento",
      sub: "O tipo de formulário é definido pela presença ou não de disjuntor geral. Os campos seguintes se adaptam à sua escolha."
    },
    /* @__PURE__ */ React.createElement("div", { className: "grid grid-2 divider" }, /* @__PURE__ */ React.createElement(Field, { label: "Solicitação", req: true, float: true }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: atend.solicitacao,
        disabled: restrito || multiTorres,
        onChange: (e) => setAtend({ ...atend, solicitacao: e.target.value })
      },
      opcoesSolicitacao.map((s) => /* @__PURE__ */ React.createElement("option", { key: s }, s))
    )), /* @__PURE__ */ React.createElement(Field, { label: "Escopo do Atendimento", req: true, float: true }, /* @__PURE__ */ React.createElement(
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
    )), /* @__PURE__ */ React.createElement(Field, { label: "Nº de Blocos / Torres", req: true }, /* @__PURE__ */ React.createElement(
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
    /* @__PURE__ */ React.createElement("div", { className: "grid grid-2" }, /* @__PURE__ */ React.createElement(Field, { label: "Possui disjuntor geral (proteção geral)?", req: true }, /* @__PURE__ */ React.createElement(
      Toggle,
      {
        value: atend.disjGeral,
        disabled: restrito,
        onChange: (v) => setAtend({ ...atend, disjGeral: v }),
        options: [
          { v: "Não", l: "Não" },
          { v: "Sim", l: "Sim" }
        ]
      }
    )), !multiTorres && /* @__PURE__ */ React.createElement(Field, { label: "Nº de Unidades Consumidoras", req: true, float: true, hint: rural ? "Pedido rural é limitado a 1 unidade consumidora." : void 0 }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        type: "number",
        max: rural ? 1 : restrito ? 3 : void 0,
        disabled: rural,
        value: atend.nUCs,
        onChange: (e) => {
          if (rural) {
            setAtend({ ...atend, nUCs: 1, disjGeral: "Não" });
            return;
          }
          const n = restrito ? Math.min(3, Math.max(1, parseInt(e.target.value) || 1)) : Math.max(1, parseInt(e.target.value));
          setAtend({
            ...atend,
            nUCs: n,
            disjGeral: restrito ? "Não" : n > 3 ? "Sim" : "Não"
          });
        },
        options: [
          { v: true, l: "Sim" },
          { v: false, l: "Não" }
        ]
      }
    ))),
    /* @__PURE__ */ React.createElement("div", { className: "grid grid-2 divider" }, /* @__PURE__ */ React.createElement(Field, { label: "Há múltiplas unidades consumidoras com proteção acima de 63 A?" }, /* @__PURE__ */ React.createElement(
      Toggle,
      {
        value: atend.biAcima63,
        disabled: restrito,
        onChange: (v) => setAtend({
          ...atend,
          biAcima63: v,
          triAcima63: v,
          disjGeral: v ? "Sim" : "Não"
          // converte booleano para string
        }),
        options: [
          { v: true, l: "Sim" },
          { v: false, l: "Não" }
        ]
      }
    ))),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "alert " + (coletivo ? "alert-ok" : "alert-info"),
        style: { marginTop: 16 }
      },
      multiTorres ? "Atendimento caracterizado como empreendimento com 'Múltiplas Torres ou Blocos'." : coletivo ? "Atendimento caracterizado como 'Coletivo'." : "Atendimento caracterizado como 'Individual'."
    )
  );
}
