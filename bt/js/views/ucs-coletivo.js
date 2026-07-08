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
    validacaoHibrido,
  } = ctx;
  // UCs colapsáveis (padrão da aba Atendimento do BT individual): minimizadas
  // por padrão; abrem só quando o usuário clica.
  const [ucAberta, setUcAberta] = useState({});
  return /* @__PURE__ */ React.createElement(
    "div",
    null,
    hibrido &&
      !validacaoHibrido.ok &&
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "alert alert-warn", style: { marginBottom: 14 } },
        /* @__PURE__ */ React.createElement(
          "strong",
          null,
          "Atendimento híbrido — pendências:",
        ),
        /* @__PURE__ */ React.createElement(
          "ul",
          { style: { margin: "6px 0 0", paddingLeft: 18 } },
          validacaoHibrido.erros.map((e, i) =>
            /* @__PURE__ */ React.createElement("li", { key: i }, e),
          ),
        ),
      ),
    hibrido &&
      validacaoHibrido.ok &&
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "alert alert-ok", style: { marginBottom: 14 } },
        "Classificação ND 5.1 / ND 5.2 das UCs está consistente.",
      ),
    /* @__PURE__ */ React.createElement(
      Card,
      {
        eyebrow: "Etapa " + ctx.etapaNum,
        title: `Unidades Consumidoras (${ucBlocos.length})`,
        sub: "Preencha os dados de identificação de cada UC. Campos com valor padrão já vêm preenchidos. Em Conexão Nova não há disjuntor 'De' (a instalação ainda não existe).",
      },
      ucBlocos.length > 1 &&
        /* @__PURE__ */ React.createElement(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 12,
            },
          },
          /* @__PURE__ */ React.createElement(
            Btn,
            { variant: "ghost", onClick: replicarUC1Coletivo },
            "⧉ Replicar UC 1 para todas",
          ),
        ),
      ucBlocos.map((u, ui) => {
        const abertaUC = ucAberta[ui] === true;
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: ui,
            className: "uc-colapsavel" + (abertaUC ? " is-open" : ""),
          },
          /* @__PURE__ */ React.createElement(
            "button",
            {
              type: "button",
              className: "uc-colapsavel-head",
              "aria-expanded": abertaUC,
              onClick: () => setUcAberta((p) => ({ ...p, [ui]: !abertaUC })),
            },
            /* @__PURE__ */ React.createElement(
              "span",
              { className: "uc-head-info" },
              /* @__PURE__ */ React.createElement(
                "span",
                { className: "uc-colapsavel-titulo" },
                u.identificacao || `UC ${ui + 1}`,
              ),
              u.complemento &&
                /* @__PURE__ */ React.createElement(
                  React.Fragment,
                  null,
                  /* @__PURE__ */ React.createElement(
                    "span",
                    { className: "uc-head-endereco-label" },
                    "Complemento",
                  ),
                  /* @__PURE__ */ React.createElement(
                    "span",
                    { className: "uc-head-endereco" },
                    u.complemento,
                  ),
                ),
            ),
            /* @__PURE__ */ React.createElement("span", {
              className: "carga-acc-chevron uc-colapsavel-chevron",
              "aria-hidden": "true",
            }),
          ),
          abertaUC &&
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "uc-colapsavel-corpo" },
              /* @__PURE__ */ React.createElement(
                "div",
                { className: "grid grid-3" },
                hibrido &&
                  /* @__PURE__ */ React.createElement(
                    Field,
                    { label: "Norma de atendimento" },
                    /* @__PURE__ */ React.createElement(
                      Sel,
                      {
                        value: u.nd,
                        onChange: (e) => setBloco(ui, { nd: e.target.value }),
                      },
                      /* @__PURE__ */ React.createElement(
                        "option",
                        { value: "5.1" },
                        "ND 5.1",
                      ),
                      /* @__PURE__ */ React.createElement(
                        "option",
                        { value: "5.2" },
                        "ND 5.2",
                      ),
                    ),
                  ),
                /* @__PURE__ */ React.createElement(
                  Field,
                  { label: "Identificação" },
                  /* @__PURE__ */ React.createElement(Inp, {
                    value: u.identificacao,
                    onChange: (e) =>
                      setBloco(ui, { identificacao: e.target.value }),
                  }),
                ),
                hibrido && u.nd === "5.1"
                  ? /* @__PURE__ */ React.createElement(
                      Field,
                      {
                        label: "Nº Predial",
                        req: true,
                        hint: "Distinto entre as UCs",
                      },
                      /* @__PURE__ */ React.createElement(Inp, {
                        value: u.nPredial,
                        onChange: (e) =>
                          setBloco(ui, { nPredial: e.target.value }),
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
                  {
                    label: "Complemento do endereço",
                    req: ucBlocos.length > 1,
                  },
                  /* @__PURE__ */ React.createElement(Inp, {
                    value: u.complemento,
                    onChange: (e) =>
                      setBloco(ui, { complemento: e.target.value }),
                    placeholder: "999",
                  }),
                ),
                /* @__PURE__ */ React.createElement(
                  Field,
                  { label: "Caixa" },
                  /* @__PURE__ */ React.createElement(Inp, {
                    value: u.caixa,
                    onChange: (e) => setBloco(ui, { caixa: e.target.value }),
                    placeholder: "Apartamento",
                  }),
                ),
                /* @__PURE__ */ React.createElement(
                  Field,
                  { label: "Solicitação", req: true, float: true },
                  /* @__PURE__ */ React.createElement(
                    Sel,
                    {
                      value: u.solicitacao,
                      onChange: (e) =>
                        setBloco(ui, { solicitacao: e.target.value }),
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
                (u.solicitacao === "Alteração de Carga" ||
                  u.solicitacao === "Caixa Existente sem Alteração") &&
                  /* @__PURE__ */ React.createElement(
                    Field,
                    { label: "Mudança de local" },
                    /* @__PURE__ */ React.createElement(Toggle, {
                      value: u.mudancaLocal,
                      onChange: (v) => setBloco(ui, { mudancaLocal: v }),
                      options: [
                        { v: "Sim", l: "Sim" },
                        { v: "Não", l: "Não" },
                      ],
                    }),
                  ),
                /* @__PURE__ */ React.createElement(
                  Field,
                  { label: "Atividade principal", req: true, float: true },
                  /* @__PURE__ */ React.createElement(
                    Sel,
                    {
                      value: u.atividade,
                      onChange: (e) =>
                        setBloco(ui, { atividade: e.target.value }),
                    },
                    /* @__PURE__ */ React.createElement("option", {
                      value: "",
                    }),
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
                    /* @__PURE__ */ React.createElement(
                      "option",
                      null,
                      "Rural",
                    ),
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
                      onChange: (e) => setBloco(ui, { ramo: e.target.value }),
                      placeholder: "Obrigatório",
                    }),
                  ),
                u.atividade === "Residencial" &&
                  /* @__PURE__ */ React.createElement(
                    Field,
                    {
                      label: "Área (m²)",
                      req: true,
                    },
                    /* @__PURE__ */ React.createElement(Inp, {
                      type: "number",
                      value: u.area,
                      onChange: (e) => setBloco(ui, { area: e.target.value }),
                      placeholder: "Ex: 65",
                    }),
                  ),
                u.solicitacao !== "Conexão Nova" &&
                  /* @__PURE__ */ React.createElement(
                    Field,
                    { label: "Instalação", req: true },
                    /* @__PURE__ */ React.createElement(Inp, {
                      value: u.instalacao,
                      onChange: (e) =>
                        setBloco(ui, { instalacao: e.target.value }),
                      placeholder: "Nº instalação existente",
                    }),
                  ),
                u.solicitacao !== "Conexão Nova" &&
                  /* @__PURE__ */ React.createElement(
                    Field,
                    { label: "Unidade Consumidora" },
                    /* @__PURE__ */ React.createElement(Inp, {
                      value: u.unidadeConsumidora,
                      onChange: (e) =>
                        setBloco(ui, { unidadeConsumidora: e.target.value }),
                    }),
                  ),
                /* Disjuntores em Fields padrão (rótulo flutuante + opção vazia),
               como na aba Atendimento do BT — substitui o antigo par "De/Para"
               num único campo (.disj-pair). */
                u.solicitacao !== "Conexão Nova" &&
                  /* @__PURE__ */ React.createElement(
                    Field,
                    { label: "Disjuntor atual", float: true },
                    /* @__PURE__ */ React.createElement(
                      Sel,
                      {
                        value: u.disjDe,
                        onChange: (e) =>
                          setBloco(ui, { disjDe: e.target.value }),
                      },
                      /* @__PURE__ */ React.createElement("option", {
                        value: "",
                      }),
                      DISJ.map((d) =>
                        /* @__PURE__ */ React.createElement(
                          "option",
                          { key: d.fx, value: d.fx },
                          d.fx,
                        ),
                      ),
                    ),
                  ),
                /* @__PURE__ */ React.createElement(
                  Field,
                  { label: "Disjuntor solicitado", float: true },
                  /* @__PURE__ */ React.createElement(
                    Sel,
                    {
                      value: u.disjPara,
                      onChange: (e) =>
                        setBloco(ui, { disjPara: e.target.value }),
                    },
                    /* @__PURE__ */ React.createElement("option", {
                      value: "",
                    }),
                    DISJ_CN.map((d) =>
                      /* @__PURE__ */ React.createElement(
                        "option",
                        { key: d.fx, value: d.fx },
                        d.fx,
                      ),
                    ),
                  ),
                ),
              ),
            ),
        );
      }),
    ),
  );
}
