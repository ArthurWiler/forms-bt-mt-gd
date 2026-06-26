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
    rural,
    sincronizarUCsTorre,
    totalUcsEmpreendimento,
    trocaDisjGeral,
    validacaoDisjuntores,
    validacaoHibrido,
    atividadeTravada,
  } = ctx;
  const atividadeBloqueada = restrito || atividadeTravada;
  // Regra 1 (Rural): em área rural, o "Nº Predial" deixa de ser herdado do
  // endereço (que não existe em zona rural) e passa a ser um campo editável
  // opcional. Vale só no atendimento individual e para atividades
  // Residencial/Comercial/Industrial (não para a atividade "Rural").
  const numPredialEditavel = (u) =>
    rural && ["Residencial", "Comercial", "Industrial"].includes(u.atividade);
  return /* @__PURE__ */ React.createElement(
    "div",
    null,
    /* @__PURE__ */ React.createElement(
      Card,
      {
        eyebrow: "Identificação",
        title: `Unidades Consumidoras (${ucsDet.length})`,
        sub: "Dados de identificação de cada unidade consumidora. O detalhamento das cargas é feito na próxima etapa. Em Conexão Nova não há disjuntor 'De' nem instalação.",
      },
      ucsDet.map((u, ui) =>
        /* @__PURE__ */ React.createElement(
          "div",
          { key: ui, className: "uc-block" },
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "uc-block-head" },
            /* @__PURE__ */ React.createElement(
              "span",
              { className: "uc-block-title" },
              "UC ",
              ui + 1,
            ),
            /* @__PURE__ */ React.createElement(
              Badge,
              null,
              ui + 1,
              " de ",
              ucsDet.length,
            ),
          ),
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "grid grid-3" },
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Tipo de solicitação", req: true },
              /* @__PURE__ */ React.createElement(
                Sel,
                {
                  value: u.solicitacao,
                  onChange: (e) =>
                    setUcDet(ui, { solicitacao: e.target.value }),
                },
                /* @__PURE__ */ React.createElement(
                  "option",
                  null,
                  "Conexão Nova",
                ),
                /* @__PURE__ */ React.createElement(
                  "option",
                  null,
                  "Alteração de Carga",
                ),
                /* @__PURE__ */ React.createElement(
                  "option",
                  null,
                  "Caixa Existente sem Alteração",
                ),
              ),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Atividade principal", req: true },
              /* @__PURE__ */ React.createElement(
                Sel,
                {
                  value: u.atividade,
                  disabled: atividadeBloqueada,
                  onChange: (e) => setUcDet(ui, { atividade: e.target.value }),
                },
                /* @__PURE__ */ React.createElement(
                  "option",
                  { value: "" },
                  "Selecionar",
                ),
                /* @__PURE__ */ React.createElement(
                  "option",
                  null,
                  "Residencial",
                ),
                /* @__PURE__ */ React.createElement(
                  "option",
                  null,
                  "Comercial",
                ),
                /* @__PURE__ */ React.createElement(
                  "option",
                  null,
                  "Industrial",
                ),
                /* @__PURE__ */ React.createElement("option", null, "Rural"),
              ),
            ),
            u.atividade !== "Residencial" &&
              /* @__PURE__ */ React.createElement(
                Field,
                {
                  label: "Ramo de atividade",
                  req: true,
                },
                /* @__PURE__ */ React.createElement(Inp, {
                  value: u.ramo,
                  disabled: restrito,
                  onChange: (e) => setUcDet(ui, { ramo: e.target.value }),
                  placeholder: "Obrigatório",
                }),
              ),
            numPredialEditavel(u)
              ? /* @__PURE__ */ React.createElement(
                  Field,
                  { label: "Nº Predial" },
                  /* @__PURE__ */ React.createElement(Inp, {
                    value: u.nPredial,
                    onChange: (e) => setUcDet(ui, { nPredial: e.target.value }),
                    placeholder: "Opcional",
                  }),
                )
              : /* @__PURE__ */ React.createElement(
                  Field,
                  { label: "Nº Predial" },
                  /* @__PURE__ */ React.createElement(
                    "div",
                    { className: "readonly-val" },
                    obra.num,
                  ),
                ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Complemento", req: ucsDet.length > 1 },
              /* @__PURE__ */ React.createElement(Inp, {
                value: u.complemento,
                onChange: (e) => setUcDet(ui, { complemento: e.target.value }),
                placeholder: "Residência 1",
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Caixa / Identificação" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: u.caixa,
                onChange: (e) => setUcDet(ui, { caixa: e.target.value }),
              }),
            ),
            u.solicitacao !== "Conexão Nova" &&
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Unidade Consumidora" },
                /* @__PURE__ */ React.createElement(Inp, {
                  value: u.unidadeConsumidora,
                  onChange: (e) =>
                    setUcDet(ui, { unidadeConsumidora: e.target.value }),
                }),
              ),
            u.solicitacao !== "Conexão Nova" &&
              /* @__PURE__ */ React.createElement(
                React.Fragment,
                null,
                /* @__PURE__ */ React.createElement(
                  Field,
                  { label: "Nº Instalação / Medidor", req: true },
                  /* @__PURE__ */ React.createElement(Inp, {
                    value: u.instalacao,
                    onChange: (e) =>
                      setUcDet(ui, { instalacao: e.target.value }),
                  }),
                ),
                /* @__PURE__ */ React.createElement(
                  Field,
                  { label: "Disjuntor atual" },
                  /* @__PURE__ */ React.createElement(
                    Sel,
                    {
                      value: u.disjDe,
                      onChange: (e) => setUcDet(ui, { disjDe: e.target.value }),
                    },
                    /* @__PURE__ */ React.createElement(
                      "option",
                      { value: "" },
                      "Selecione…",
                    ),
                    DISJ.map((d) =>
                      /* @__PURE__ */ React.createElement(
                        "option",
                        { key: d.fx, value: d.fx },
                        d.fx,
                      ),
                    ),
                  ),
                ),
                (u.solicitacao === "Alteração de Carga" ||
                  u.solicitacao === "Caixa Existente sem Alteração") &&
                  /* @__PURE__ */ React.createElement(
                    Field,
                    { label: "Mudança de local" },
                    /* @__PURE__ */ React.createElement(Toggle, {
                      value: u.mudancaLocal,
                      onChange: (v) => setUcDet(ui, { mudancaLocal: v }),
                      options: [
                        { v: "Sim", l: "Sim" },
                        { v: "Não", l: "Não" },
                      ],
                    }),
                  ),
              ),
          ),
        ),
      ),
    ),
    ucsDet.length > 1 &&
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className:
            "alert " + (validacaoDisjuntores.ok ? "alert-ok" : "alert-warn"),
        },
        /* @__PURE__ */ React.createElement(
          "b",
          null,
          "Regra de disjuntores (múltiplas UCs sem proteção geral):",
        ),
        " no máximo 1 tripolar de 63 A e/ou até 2 mono/bifásicos de 63 A.",
        " ",
        validacaoDisjuntores.ok ? "✔ " : "⚠ ",
        validacaoDisjuntores.msg,
      ),
  );
}
