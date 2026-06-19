function TabProprietario({ ctx }) {
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
      eyebrow: "Dados",
      title: "Dados do Propriet\xE1rio",
      sub: "Titular da conta de energia ou propriet\xE1rio/possuidor do im\xF3vel. (*) obrigat\xF3rio \xB7 (**) obrigat\xF3rio para pessoa f\xEDsica."
    },
    /* @__PURE__ */ React.createElement("div", { className: "grid grid-2" }, /* @__PURE__ */ React.createElement(Field, { label: "Nome Completo (sem abrevia\xE7\xF5es)", req: true, span: 2 }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: prop.nome,
        onChange: (e) => setProp({ ...prop, nome: e.target.value })
      }
    )), /* @__PURE__ */ React.createElement(
      Field,
      {
        label: "CPF / CNPJ",
        req: true,
        hint: docInfo.valido === false ? `${docInfo.tipo} inv\xE1lido \u2014 verifique os d\xEDgitos.` : docInfo.valido === true ? `${docInfo.tipo} v\xE1lido.` : "Digite CPF (pessoa f\xEDsica) ou CNPJ (pessoa jur\xEDdica)."
      },
      /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement(
        "input",
        {
          value: prop.cpfCnpj || "",
          onChange: (e) => {
            const m = mascararCpfCnpj(e.target.value);
            setProp({ ...prop, cpfCnpj: m });
            if (ehCNPJ(m)) buscarCNPJ(m);
            else setCnpjStatus("");
          },
          placeholder: "000.000.000-00",
          style: {
            borderColor: docInfo.valido === false ? "var(--vermelho)" : void 0
          }
        }
      ), cnpjStatus === "buscando" && /* @__PURE__ */ React.createElement("span", { className: "spinner" }), cnpjStatus === "ok" && /* @__PURE__ */ React.createElement(Badge, null, "dados preenchidos"), cnpjStatus === "erro" && /* @__PURE__ */ React.createElement("span", { style: { color: "var(--vermelho)", fontSize: 12 } }, "CNPJ n\xE3o encontrado"))
    ), /* @__PURE__ */ React.createElement(Field, { label: "E-mail", req: true }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        type: "email",
        value: prop.email,
        onChange: (e) => setProp({ ...prop, email: e.target.value })
      }
    )), pessoaFisica && /* @__PURE__ */ React.createElement(Field, { label: "Filia\xE7\xE3o (M\xE3e ou Pai) **" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: prop.filiacao,
        onChange: (e) => setProp({ ...prop, filiacao: e.target.value })
      }
    )), pessoaFisica && /* @__PURE__ */ React.createElement(Field, { label: "RG / RNE / RANI **" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: prop.rg,
        onChange: (e) => setProp({ ...prop, rg: mascararRG(e.target.value) })
      }
    )), pessoaFisica && /* @__PURE__ */ React.createElement(Field, { label: "Data de Nascimento **" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        type: "date",
        value: prop.nasc,
        onChange: (e) => setProp({ ...prop, nasc: e.target.value })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Celular", req: true }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: prop.celular,
        onChange: (e) => setProp({
          ...prop,
          celular: mascararCelular(e.target.value)
        })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Telefone Fixo" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: prop.fixo,
        onChange: (e) => setProp({ ...prop, fixo: mascararFixo(e.target.value) })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Telefone do Propriet\xE1rio", req: true }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: prop.telProp,
        onChange: (e) => setProp({
          ...prop,
          telProp: mascararTelefone(e.target.value)
        })
      }
    )), pessoaFisica && /* @__PURE__ */ React.createElement(
      Field,
      {
        label: "Possui laudo m\xE9dico (equipamentos essenciais)? **",
        span: 2
      },
      /* @__PURE__ */ React.createElement(
        Toggle,
        {
          value: prop.laudoMedico,
          onChange: (v) => setProp({ ...prop, laudoMedico: v }),
          options: [
            { v: "Sim", l: "Sim" },
            { v: "N\xE3o", l: "N\xE3o" }
          ]
        }
      )
    ), pessoaFisica && /* @__PURE__ */ React.createElement(Field, { label: "Possui NIS para Tarifa Social? **" }, /* @__PURE__ */ React.createElement(
      Toggle,
      {
        value: prop.nis,
        onChange: (v) => setProp({ ...prop, nis: v }),
        options: [
          { v: "Sim", l: "Sim" },
          { v: "N\xE3o", l: "N\xE3o" }
        ]
      }
    )), pessoaFisica && prop.nis === "Sim" && /* @__PURE__ */ React.createElement(Field, { label: "N\xFAmero do NIS", req: true }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: prop.numNis,
        onChange: (e) => setProp({ ...prop, numNis: e.target.value })
      }
    )))
  );
}
