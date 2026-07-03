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
    validacaoHibrido,
  } = ctx;
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Etapa " + ctx.etapaNum,
      title: "Dados do Proprietário",
      sub: "Preencha os dados do titular da conta de energia ou do proprietário do imóvel.",
    },
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid grid-2" },
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Nome Completo (sem abreviações)", req: true, span: 2 },
        /* @__PURE__ */ React.createElement(Inp, {
          value: prop.nome,
          onChange: (e) => setProp({ ...prop, nome: e.target.value }),
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label: "CPF / CNPJ",
          req: true,
        },
        /* @__PURE__ */ React.createElement(
          "div",
          { style: { display: "flex", gap: 8, alignItems: "center" } },
          /* @__PURE__ */ React.createElement("input", {
            value: prop.cpfCnpj || "",
            onChange: (e) => {
              const m = mascararCpfCnpj(e.target.value);
              setProp({ ...prop, cpfCnpj: m });
              if (ehCNPJ(m)) buscarCNPJ(m);
              else setCnpjStatus("");
            },
            placeholder: "000.000.000-00",
            style: {
              borderColor:
                docInfo.valido === false ? "var(--vermelho)" : void 0,
            },
          }),
          cnpjStatus === "buscando" &&
            /* @__PURE__ */ React.createElement("span", {
              className: "spinner",
            }),
          cnpjStatus === "ok" &&
            /* @__PURE__ */ React.createElement(
              Badge,
              null,
              "dados preenchidos",
            ),
          cnpjStatus === "erro" &&
            /* @__PURE__ */ React.createElement(
              "span",
              { style: { color: "var(--vermelho)", fontSize: 12 } },
              "CNPJ não encontrado",
            ),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "E-mail", req: true },
        /* @__PURE__ */ React.createElement(Inp, {
          type: "email",
          value: prop.email,
          onChange: (e) => setProp({ ...prop, email: e.target.value }),
        }),
      ),
      pessoaFisica &&
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Filiação (Mãe ou Pai)", req: true },
          /* @__PURE__ */ React.createElement(Inp, {
            value: prop.filiacao,
            onChange: (e) => setProp({ ...prop, filiacao: e.target.value }),
          }),
        ),
      pessoaFisica &&
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "RG / RNE / RANI" },
          /* @__PURE__ */ React.createElement(Inp, {
            value: prop.rg,
            onChange: (e) =>
              setProp({ ...prop, rg: mascararRG(e.target.value) }),
          }),
        ),
      pessoaFisica &&
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Data de Nascimento", req: true },
          /* @__PURE__ */ React.createElement(Inp, {
            type: "date",
            value: prop.nasc,
            onChange: (e) => setProp({ ...prop, nasc: e.target.value }),
          }),
        ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Celular", req: true },
        /* @__PURE__ */ React.createElement(Inp, {
          value: prop.celular,
          onChange: (e) =>
            setProp({
              ...prop,
              celular: mascararCelular(e.target.value),
            }),
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Telefone Fixo" },
        /* @__PURE__ */ React.createElement(Inp, {
          value: prop.fixo,
          onChange: (e) =>
            setProp({ ...prop, fixo: mascararFixo(e.target.value) }),
        }),
      ),
      pessoaFisica &&
        /* @__PURE__ */ React.createElement(
          Field,
          {
            label: "Possui laudo médico (equipamentos essenciais)?",
            req: true,
            span: 2,
          },
          /* @__PURE__ */ React.createElement(Toggle, {
            value: prop.laudoMedico,
            onChange: (v) => setProp({ ...prop, laudoMedico: v }),
            options: [
              { v: "Sim", l: "Sim" },
              { v: "Não", l: "Não" },
            ],
          }),
        ),
      pessoaFisica &&
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Possui NIS para Tarifa Social?", req: true },
          /* @__PURE__ */ React.createElement(Toggle, {
            value: prop.nis,
            onChange: (v) => setProp({ ...prop, nis: v }),
            options: [
              { v: "Sim", l: "Sim" },
              { v: "Não", l: "Não" },
            ],
          }),
        ),
      pessoaFisica &&
        prop.nis === "Sim" &&
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Número do NIS", req: true },
          /* @__PURE__ */ React.createElement(Inp, {
            value: prop.numNis,
            onChange: (e) => setProp({ ...prop, numNis: e.target.value }),
          }),
        ),
    ),
  );
}
