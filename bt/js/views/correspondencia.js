function TabCorrespondencia({ ctx }) {
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
      title: "Correspondência e Fatura",
      sub: "Como o cliente deseja receber a conta de energia.",
    },
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid" },
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Deseja receber a fatura no e-mail informado?", req: true },
        /* @__PURE__ */ React.createElement(Toggle, {
          value: corr.receberEmail,
          onChange: (v) => setCorr({ ...corr, receberEmail: v }),
          options: [
            { v: "Sim", l: "Sim" },
            { v: "Não", l: "Não" },
          ],
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Data de Vencimento da Fatura", req: true },
        /* @__PURE__ */ React.createElement(Toggle, {
          value: corr.vencimento,
          onChange: (v) => setCorr({ ...corr, vencimento: v }),
          options: DIAS_VENCIMENTO.map((d) => ({ v: d, l: d })),
        }),
      ),
    ),
    corr.receberEmail === "Não" &&
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "divider" },
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Como deseja receber a fatura?", req: true },
          /* @__PURE__ */ React.createElement(Toggle, {
            value: corr.alternativa,
            onChange: (v) => setCorr({ ...corr, alternativa: v }),
            options: [
              { v: "Endereço novo", l: "Novo endereço" },
              { v: "Mesmo da obra", l: "Endereço da obra" },
              { v: "Outro e-mail", l: "Outro e-mail" },
            ],
          }),
        ),
        corr.alternativa === "Mesmo da obra" &&
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "alert alert-info", style: { marginTop: 12 } },
            "A fatura será enviada para o endereço informado em",
            " ",
            /* @__PURE__ */ React.createElement(
              "strong",
              null,
              "Dados da Obra",
            ),
            ".",
          ),
        corr.alternativa === "Outro e-mail" &&
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "grid grid-2", style: { marginTop: 12 } },
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "E-mail para envio da fatura", span: 2, req: true },
              /* @__PURE__ */ React.createElement(Inp, {
                type: "email",
                value: corr.outroEmail,
                onChange: (e) =>
                  setCorr({ ...corr, outroEmail: e.target.value }),
                placeholder: "email@exemplo.com",
              }),
            ),
          ),
        corr.alternativa === "Endereço novo" &&
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "grid grid-2", style: { marginTop: 12 } },
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "CEP", span: 2 },
              /* @__PURE__ */ React.createElement(
                "div",
                { style: { display: "flex", gap: 8, alignItems: "center" } },
                /* @__PURE__ */ React.createElement(
                  "div",
                  { style: { maxWidth: 180 } },
                  /* @__PURE__ */ React.createElement(Inp, {
                    value: corr.cep,
                    onChange: (e) => {
                      const v = mascararCEP(e.target.value);
                      setCorr({ ...corr, cep: v });
                      buscarCEP(v, "corr");
                    },
                    placeholder: "00000-000",
                  }),
                ),
                cepStatus.corr === "buscando" &&
                  /* @__PURE__ */ React.createElement("span", {
                    className: "spinner",
                  }),
                cepStatus.corr === "ok" &&
                  /* @__PURE__ */ React.createElement(
                    Badge,
                    null,
                    "Endereço encontrado",
                  ),
                cepStatus.corr === "erro" &&
                  /* @__PURE__ */ React.createElement(
                    "span",
                    { style: { color: "var(--vermelho)", fontSize: 12 } },
                    "CEP não encontrado",
                  ),
              ),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Rua / Av.", span: 2 },
              /* @__PURE__ */ React.createElement(Inp, {
                value: corr.rua,
                onChange: (e) => setCorr({ ...corr, rua: e.target.value }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Nº" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: corr.num,
                onChange: (e) => setCorr({ ...corr, num: e.target.value }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Complemento" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: corr.compl,
                onChange: (e) => setCorr({ ...corr, compl: e.target.value }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Bairro / Distrito" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: corr.bairro,
                onChange: (e) => setCorr({ ...corr, bairro: e.target.value }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Município" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: corr.municipio,
                onChange: (e) =>
                  setCorr({ ...corr, municipio: e.target.value }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Estado" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: corr.estado,
                onChange: (e) => setCorr({ ...corr, estado: e.target.value }),
              }),
            ),
          ),
        /* Conta globalizada (poder público): oferecida só quando o cliente NÃO
           recebe a fatura por e-mail; o número só aparece ao marcar "Sim". */
        /* @__PURE__ */ React.createElement(
          "div",
          { style: { marginTop: 12 } },
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Possui conta globalizada (poder público)?", span: 2 },
            /* @__PURE__ */ React.createElement(Toggle, {
              value: corr.possuiContaGlobal,
              onChange: (v) => setCorr({ ...corr, possuiContaGlobal: v }),
              options: [
                { v: "Sim", l: "Sim" },
                { v: "Não", l: "Não" },
              ],
            }),
          ),
          corr.possuiContaGlobal === "Sim" &&
            /* @__PURE__ */ React.createElement(
              Field,
              {
                label:
                  "Conta globalizada (código de débito automático globalizado)",
                req: true,
                span: 2,
              },
              /* @__PURE__ */ React.createElement(Inp, {
                value: corr.contaGlobal,
                onChange: (e) =>
                  setCorr({ ...corr, contaGlobal: e.target.value }),
                placeholder: "000000000",
              }),
            ),
        ),
      ),
  );
}
