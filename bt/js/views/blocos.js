function TabBlocos({ ctx }) {
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
    gerarComplementosTorre,
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
  // Concordância dos rótulos: "Torre" é feminino, "Bloco" masculino.
  const fem = atend.atendA !== "Bloco";
  const dArt = fem ? "da" : "do";
  const unidLower = (atend.atendA || "Torre").toLowerCase();
  // Torres colapsáveis (padrão da aba Atendimento do BT individual):
  // minimizadas por padrão; abrem só quando o usuário clica.
  const [torreAberta, setTorreAberta] = useState({});
  // Seções colapsáveis dentro da torre (Identificação / Previsão de carga),
  // no padrão do acordeão de cargas (.carga-acc); chave `${bi}-ident|prev`.
  const [secAberta, setSecAberta] = useState({});
  return /* @__PURE__ */ React.createElement(
    "div",
    null,
    /* @__PURE__ */ React.createElement(
      Card,
      {
        eyebrow: "Etapa " + ctx.etapaNum,
        title: "Atendimento a Empreendimento com Múltiplas Torres ou Blocos",
        sub: `Cada ${unidLower} tem seu disjuntor geral — sugerido a partir da demanda calculada — e seu disjuntor de combate a incêndio. Preencha ${fem ? "a primeira" : "o primeiro"} e use "Replicar" para preenchimento em massa.`,
      },
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "kpi-row" },
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "kpi" },
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "kpi-label" },
            "Atendimento a",
          ),
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "kpi-value", style: { fontSize: 15 } },
            atend.atendA,
          ),
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "kpi" },
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "kpi-label" },
            "Total de UCs do empreendimento",
          ),
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "kpi-value" },
            totalUcsEmpreendimento,
          ),
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "kpi dark" },
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "kpi-label" },
            "Demanda total do empreendimento",
          ),
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "kpi-value", style: { fontSize: 18 } },
            fmt2(demandaTotalGeral),
            " kVA",
          ),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        "div",
        {
          style: {
            display: "flex",
            gap: 10,
            alignItems: "flex-end",
            flexWrap: "wrap",
            marginBottom: 14,
          },
        },
        /* @__PURE__ */ React.createElement(
          Field,
          {
            label: `Nº de ${atend.atendA === "Bloco" ? "Blocos" : "Torres"}`,
          },
          /* @__PURE__ */ React.createElement(
            "div",
            { style: { maxWidth: 120 } },
            /* @__PURE__ */ React.createElement(Inp, {
              type: "number",
              value: atend.nBlocos,
              // Aceita o valor bruto (permite apagar para digitar outro
              // número); o efeito em app.js só redimensiona com nº válido.
              onChange: (e) => setAtend({ ...atend, nBlocos: e.target.value }),
            }),
          ),
        ),
        /* @__PURE__ */ React.createElement(
          Btn,
          { variant: "ghost", onClick: replicarPrimeiro },
          "⧉ Replicar ",
          atend.atendA,
          ` 1 para ${fem ? "todas" : "todos"}`,
        ),
      ),
      blocos.map((b, bi) => {
        const calcTorre = calcBlocoMultiTorres(b);
        const demandaTorre = calcTorre.demandaUcs + num(b.demandaIncendio);
        const opcoesDG = opcoesDisjGeralTorre(b);
        const opcoesDI = opcoesDisjIncendioTorre(b);
        const abertaTorre = torreAberta[bi] === true;
        return /* @__PURE__ */ React.createElement(
          "div",
          {
            key: bi,
            className: "uc-colapsavel" + (abertaTorre ? " is-open" : ""),
          },
          /* @__PURE__ */ React.createElement(
            "button",
            {
              type: "button",
              className: "uc-colapsavel-head",
              "aria-expanded": abertaTorre,
              onClick: () =>
                setTorreAberta((p) => ({ ...p, [bi]: !abertaTorre })),
            },
            /* @__PURE__ */ React.createElement(
              "span",
              { className: "uc-head-info" },
              /* @__PURE__ */ React.createElement(
                "span",
                { className: "uc-colapsavel-titulo" },
                `${atend.atendA} ${b.nome || bi + 1}`,
              ),
              /* @__PURE__ */ React.createElement(
                "span",
                { className: "uc-head-endereco-label" },
                "Demanda",
              ),
              /* @__PURE__ */ React.createElement(
                "span",
                { className: "uc-head-endereco" },
                `${fmt2(demandaTorre)} kVA · ${(b.ucs || []).length} UC(s)`,
              ),
            ),
            /* @__PURE__ */ React.createElement("span", {
              className: "carga-acc-chevron uc-colapsavel-chevron",
              "aria-hidden": "true",
            }),
          ),
          abertaTorre &&
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "uc-colapsavel-corpo" },
              /* Grid em 2 colunas: colunas mais largas evitam campos menores
                 que o próprio rótulo. */
              /* @__PURE__ */ React.createElement(
                "div",
                { className: "grid grid-2" },
                /* @__PURE__ */ React.createElement(
                  Field,
                  { label: `Identificação ${dArt} ${unidLower}` },
                  /* @__PURE__ */ React.createElement(Inp, {
                    value: b.nome,
                    onChange: (e) => setTorre(bi, { nome: e.target.value }),
                    placeholder: `${bi + 1}`,
                  }),
                ),
                /* Disjuntor Geral e Demanda saíram deste grid: agora são
               apresentados no card de resultado ao final da torre, derivados
               da demanda calculada (padrão da aba Atendimento do BT). */
                /* @__PURE__ */ React.createElement(
                  Field,
                  { label: `Qtd. de UCs ${dArt} ${unidLower}`, req: true },
                  /* @__PURE__ */ React.createElement(Inp, {
                    type: "number",
                    value: b.qtdUCs,
                    onChange: (e) => sincronizarUCsTorre(bi, e.target.value),
                    placeholder: "0",
                  }),
                ),
                /* O Disjuntor do Condomínio/Incêndio saiu deste grid: é
                   apresentado no card de resultado ao final da torre,
                   vinculado à demanda informada abaixo. */
                /* @__PURE__ */ React.createElement(
                  Field,
                  { label: "Demanda Condomínio / Incêndio (kVA)" },
                  /* @__PURE__ */ React.createElement(Inp, {
                    type: "number",
                    value: b.demandaIncendio,
                    onChange: (e) =>
                      setTorre(bi, { demandaIncendio: e.target.value }),
                    placeholder: "0",
                  }),
                ),
                calcTorre.temNaoResidencial &&
                  /* @__PURE__ */ React.createElement(
                    Field,
                    {
                      label: "Demanda geral não residencial (kVA)",
                      req: true,
                    },
                    /* @__PURE__ */ React.createElement(Inp, {
                      type: "number",
                      value: b.demandaNaoResidencial,
                      onChange: (e) =>
                        setTorre(bi, { demandaNaoResidencial: e.target.value }),
                      placeholder: "0,0",
                    }),
                  ),
              ),
              /* Geração automática de complementos: a partir do primeiro
             complemento (ex: 101 ou Apto 01) preenche todas as UCs da torre
             — ver gerarComplementos em model.js. */
              (b.ucs || []).length > 1 &&
                /* @__PURE__ */ React.createElement(
                  "div",
                  {
                    style: {
                      display: "flex",
                      gap: 10,
                      alignItems: "flex-end",
                      flexWrap: "wrap",
                      marginTop: 10,
                    },
                  },
                  /* @__PURE__ */ React.createElement(
                    Field,
                    { label: "Aptos por andar" },
                    /* @__PURE__ */ React.createElement(
                      "div",
                      { style: { maxWidth: 120 } },
                      /* @__PURE__ */ React.createElement(Inp, {
                        type: "number",
                        value: b.aptosPorAndar,
                        onChange: (e) =>
                          setTorre(bi, { aptosPorAndar: e.target.value }),
                        placeholder: "Ex: 4",
                      }),
                    ),
                  ),
                  /* @__PURE__ */ React.createElement(
                    Field,
                    {
                      label: "Primeiro complemento",
                    },
                    /* @__PURE__ */ React.createElement(Inp, {
                      value: b.complInicial,
                      onChange: (e) =>
                        setTorre(bi, { complInicial: e.target.value }),
                      placeholder: "Ex: 101 ou Apto 01",
                    }),
                  ),
                  /* @__PURE__ */ React.createElement(
                    Btn,
                    {
                      variant: "ghost",
                      disabled: !/\d/.test(String(b.complInicial || "")),
                      onClick: () => gerarComplementosTorre(bi),
                    },
                    "⧉ Gerar complementos das ",
                    b.ucs.length,
                    " UCs",
                  ),
                ),
              calcTorre.nd52 &&
                /* @__PURE__ */ React.createElement(
                  "div",
                  { className: "alert alert-ok", style: { marginTop: 6 } },
                  /* @__PURE__ */ React.createElement(
                    "b",
                    null,
                    `Demanda residencial (ND-5.2) dest${fem ? "a" : "e"} ${unidLower}:`,
                  ),
                  " ",
                  calcTorre.qtdApart,
                  " apartamento(s) · área média ",
                  fmt2(calcTorre.areaMedia),
                  " m² → ",
                  fmt2(calcTorre.nd52.demandaKVA),
                  " kVA.",
                ),
              /* Identificação das UCs — formatação da tabela de motores
                 (.motores-table) em duas linhas por UC (variante
                 .uc-ident-table, rótulo dentro da célula): dispensa a barra
                 de rolagem e oculta os campos não utilizados. Botões ficam
                 fora do container da tabela. */
              (b.ucs || []).length > 0 &&
                /* Seção colapsável no padrão do acordeão de cargas
                   (.carga-acc, o mesmo dos Motores): cabeçalho com contador
                   e chevron; o Replicar fica no rodapé do corpo
                   (.motores-add), como o "Adicionar motor". */
                /* @__PURE__ */ React.createElement(
                  "div",
                  {
                    className:
                      "carga-acc" +
                      (secAberta[`${bi}-ident`] ? " is-open" : ""),
                    style: { marginTop: 14 },
                  },
                  /* @__PURE__ */ React.createElement(
                    "button",
                    {
                      type: "button",
                      className: "carga-acc-head",
                      "aria-expanded": !!secAberta[`${bi}-ident`],
                      onClick: () =>
                        setSecAberta((p) => ({
                          ...p,
                          [`${bi}-ident`]: !p[`${bi}-ident`],
                        })),
                    },
                    /* @__PURE__ */ React.createElement(
                      "span",
                      { className: "carga-acc-label" },
                      "Identificação das UCs",
                    ),
                    /* @__PURE__ */ React.createElement(
                      "span",
                      { className: "carga-acc-meta" },
                      /* @__PURE__ */ React.createElement(
                        "span",
                        { className: "carga-acc-badge" },
                        b.ucs.length,
                      ),
                      /* @__PURE__ */ React.createElement("span", {
                        className: "carga-acc-chevron",
                        "aria-hidden": "true",
                      }),
                    ),
                  ),
                  secAberta[`${bi}-ident`] &&
                    /* @__PURE__ */ React.createElement(
                      "div",
                      { className: "carga-acc-body" },
                  /* @__PURE__ */ React.createElement(
                    "table",
                    { className: "motores-table uc-ident-table" },
                    /* @__PURE__ */ React.createElement(
                      "tbody",
                      null,
                      b.ucs.map((u, ui) => {
                        const residencial = u.atividade === "Residencial";
                        const conexaoNova = u.solicitacao === "Conexão Nova";
                        const setU = (patch) => setUcTorre(bi, ui, patch);
                        /* Célula auto-rotulada: o rótulo fica dentro da
                           célula porque a 2ª linha varia por UC (sem thead). */
                        const cel = (rotulo, controle, extra) =>
                          /* @__PURE__ */ React.createElement(
                            "td",
                            { key: rotulo, ...(extra || {}) },
                            /* @__PURE__ */ React.createElement(
                              "span",
                              { className: "cell-label" },
                              rotulo,
                            ),
                            controle,
                          );
                        /* 2ª linha: só os campos utilizados — Área OU Ramo;
                           Instalação/Nº UC apenas para UC existente. */
                        const defs2 = [
                          [
                            "Disjuntor da UC",
                            /* @__PURE__ */ React.createElement(
                              "select",
                              {
                                value: u.disjPara,
                                onChange: (e) =>
                                  setU({ disjPara: e.target.value }),
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
                          ],
                          residencial
                            ? [
                                "Área (m²)",
                                /* @__PURE__ */ React.createElement("input", {
                                  type: "number",
                                  value: u.area,
                                  onChange: (e) =>
                                    setU({ area: e.target.value }),
                                  placeholder: "Ex: 65",
                                }),
                              ]
                            : [
                                "Ramo de atividade",
                                /* @__PURE__ */ React.createElement("input", {
                                  value: u.ramo,
                                  onChange: (e) =>
                                    setU({ ramo: e.target.value }),
                                  placeholder: "Obrigatório",
                                }),
                              ],
                        ];
                        if (!conexaoNova)
                          defs2.push(
                            [
                              "Instalação",
                              /* @__PURE__ */ React.createElement("input", {
                                value: u.instalacao,
                                onChange: (e) =>
                                  setU({ instalacao: e.target.value }),
                                placeholder: "Nº instalação",
                              }),
                            ],
                            [
                              "Nº UC",
                              /* @__PURE__ */ React.createElement("input", {
                                value: u.unidadeConsumidora,
                                onChange: (e) =>
                                  setU({
                                    unidadeConsumidora: e.target.value,
                                  }),
                              }),
                            ],
                          );
                        return /* @__PURE__ */ React.createElement(
                          React.Fragment,
                          { key: ui },
                          /* @__PURE__ */ React.createElement(
                            "tr",
                            { className: "uc-linha-1" },
                            cel(
                              "Unidade",
                              /* @__PURE__ */ React.createElement("input", {
                                value: u.identificacao,
                                onChange: (e) =>
                                  setU({ identificacao: e.target.value }),
                                placeholder: `UC ${ui + 1}`,
                              }),
                            ),
                            cel(
                              "Complemento",
                              /* @__PURE__ */ React.createElement("input", {
                                value: u.complemento,
                                onChange: (e) =>
                                  setU({ complemento: e.target.value }),
                                placeholder: "101",
                              }),
                            ),
                            cel(
                              "Solicitação",
                              /* @__PURE__ */ React.createElement(
                                "select",
                                {
                                  value: u.solicitacao,
                                  onChange: (e) =>
                                    setU({ solicitacao: e.target.value }),
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
                            cel(
                              "Atividade",
                              /* @__PURE__ */ React.createElement(
                                "select",
                                {
                                  value: u.atividade,
                                  onChange: (e) =>
                                    setU({ atividade: e.target.value }),
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
                          ),
                          /* @__PURE__ */ React.createElement(
                            "tr",
                            { className: "uc-linha-2" },
                            defs2.map(([rotulo, controle], i) =>
                              cel(
                                rotulo,
                                controle,
                                i === defs2.length - 1
                                  ? { colSpan: 4 - defs2.length + 1 }
                                  : null,
                              ),
                            ),
                          ),
                        );
                      }),
                    ),
                  ),
                  b.ucs.length > 1 &&
                    /* @__PURE__ */ React.createElement(
                      "div",
                      { className: "motores-add" },
                      /* @__PURE__ */ React.createElement(
                        Btn,
                        {
                          variant: "ghost",
                          onClick: () => replicarUC1Torre(bi),
                        },
                        "⧉ Replicar UC 1 para todas",
                      ),
                    ),
                    ),
                ),
              (b.ucs || []).length > 0 &&
                /* Seção colapsável (.carga-acc), como a Identificação acima;
                   o Replicar fica no rodapé do corpo (.motores-add). */
                /* @__PURE__ */ React.createElement(
                  "div",
                  {
                    className:
                      "carga-acc" +
                      (secAberta[`${bi}-prev`] ? " is-open" : ""),
                    style: { marginTop: 14 },
                  },
                  /* @__PURE__ */ React.createElement(
                    "button",
                    {
                      type: "button",
                      className: "carga-acc-head",
                      "aria-expanded": !!secAberta[`${bi}-prev`],
                      onClick: () =>
                        setSecAberta((p) => ({
                          ...p,
                          [`${bi}-prev`]: !p[`${bi}-prev`],
                        })),
                    },
                    /* @__PURE__ */ React.createElement(
                      "span",
                      { className: "carga-acc-label" },
                      "Previsão de carga das UCs",
                    ),
                    /* @__PURE__ */ React.createElement(
                      "span",
                      { className: "carga-acc-meta" },
                      /* @__PURE__ */ React.createElement(
                        "span",
                        { className: "carga-acc-badge" },
                        b.ucs.length,
                      ),
                      /* @__PURE__ */ React.createElement("span", {
                        className: "carga-acc-chevron",
                        "aria-hidden": "true",
                      }),
                    ),
                  ),
                  secAberta[`${bi}-prev`] &&
                    /* @__PURE__ */ React.createElement(
                      "div",
                      { className: "carga-acc-body" },
                  /* @__PURE__ */ React.createElement(
                    "div",
                    { className: "prev-table-wrap" },
                  /* @__PURE__ */ React.createElement(
                    "table",
                    { className: "prev-table" },
                    /* @__PURE__ */ React.createElement(
                      "thead",
                      null,
                      /* @__PURE__ */ React.createElement(
                        "tr",
                        null,
                        /* @__PURE__ */ React.createElement(
                          "th",
                          null,
                          "Unidade",
                        ),
                        /* @__PURE__ */ React.createElement(
                          "th",
                          null,
                          "Ilum. (kW)",
                        ),
                        /* @__PURE__ */ React.createElement(
                          "th",
                          null,
                          "Tomada (kW)",
                        ),
                        /* @__PURE__ */ React.createElement(
                          "th",
                          null,
                          "Chuveiro (kW)",
                        ),
                        /* @__PURE__ */ React.createElement(
                          "th",
                          null,
                          "Ar Cond. (kW)",
                        ),
                        /* @__PURE__ */ React.createElement(
                          "th",
                          null,
                          "Outros (kW)",
                        ),
                        /* @__PURE__ */ React.createElement(
                          "th",
                          null,
                          "Carga (kW)",
                        ),
                        /* @__PURE__ */ React.createElement(
                          "th",
                          { className: "col-demanda" },
                          "Demanda (kVA)",
                        ),
                      ),
                    ),
                    /* @__PURE__ */ React.createElement(
                      "tbody",
                      null,
                      b.ucs.map((u, ui) =>
                        ucSemAlteracao(u)
                          ? /* @__PURE__ */ React.createElement(
                              "tr",
                              { key: ui },
                              /* @__PURE__ */ React.createElement(
                                "td",
                                { className: "uc-name" },
                                u.identificacao || `UC ${ui + 1}`,
                              ),
                              /* @__PURE__ */ React.createElement(
                                "td",
                                { colSpan: 7, className: "field-hint" },
                                "Caixa existente sem alteração — não entra na previsão de carga.",
                              ),
                            )
                          : /* @__PURE__ */ React.createElement(
                              "tr",
                              { key: ui },
                              /* @__PURE__ */ React.createElement(
                                "td",
                                { className: "uc-name" },
                                u.identificacao || `UC ${ui + 1}`,
                              ),
                              [
                                "ilum",
                                "tomada",
                                "chuveiro",
                                "ar",
                                "outros",
                              ].map((k) =>
                                /* @__PURE__ */ React.createElement(
                                  "td",
                                  { key: k },
                                  /* @__PURE__ */ React.createElement("input", {
                                    type: "number",
                                    value: (u.prev || {})[k] || "",
                                    onChange: (e) =>
                                      setUcTorrePrev(bi, ui, {
                                        [k]: e.target.value,
                                      }),
                                    placeholder: "0,0",
                                  }),
                                ),
                              ),
                              /* @__PURE__ */ React.createElement(
                                "td",
                                { className: "carga-cell" },
                                fmt2(prevKwUC(u)),
                              ),
                              /* @__PURE__ */ React.createElement(
                                "td",
                                { className: "col-demanda" },
                                /* @__PURE__ */ React.createElement("input", {
                                  className: "demanda-prev",
                                  type: "number",
                                  value: (u.prev || {}).demanda || "",
                                  onChange: (e) =>
                                    setUcTorrePrev(bi, ui, {
                                      demanda: e.target.value,
                                    }),
                                  placeholder: "0,0",
                                }),
                              ),
                            ),
                      ),
                    ),
                    /* @__PURE__ */ React.createElement(
                      "tfoot",
                      null,
                      /* @__PURE__ */ React.createElement(
                        "tr",
                        null,
                        /* @__PURE__ */ React.createElement(
                          "td",
                          { className: "uc-name" },
                          `Total ${dArt} ${unidLower}`,
                        ),
                        /* @__PURE__ */ React.createElement("td", {
                          colSpan: 5,
                        }),
                        /* @__PURE__ */ React.createElement(
                          "td",
                          { className: "carga-cell" },
                          fmt2(b.ucs.reduce((s, u) => s + prevKwUC(u), 0)),
                        ),
                        /* @__PURE__ */ React.createElement(
                          "td",
                          { className: "col-demanda total-dem" },
                          fmt2(calcTorre.demandaUcs),
                        ),
                      ),
                    ),
                  ),
                ),
                  b.ucs.length > 1 &&
                    /* @__PURE__ */ React.createElement(
                      "div",
                      { className: "motores-add" },
                      /* @__PURE__ */ React.createElement(
                        Btn,
                        {
                          variant: "ghost",
                          onClick: () => replicarPrevTorre(bi),
                        },
                        "Replicar previsão da UC 1 para todas",
                      ),
                    ),
                    ),
                ),
              /* ── Resultado da torre (padrão da aba Atendimento do BT):
             demanda calculada + Disjuntor Geral (pela Demanda das UCs, com
             seletividade sobre os disjuntores das UCs) e Disjuntor do
             Condomínio/Incêndio (pela demanda informada). ── */
              /* @__PURE__ */ React.createElement(
                "div",
                { className: "resultado-cargas divider" },
                /* @__PURE__ */ React.createElement(
                  "div",
                  { className: "resultado-kpis" },
                  /* @__PURE__ */ React.createElement(
                    "div",
                    { className: "resultado-card" },
                    /* @__PURE__ */ React.createElement(
                      "div",
                      { className: "resultado-card-label" },
                      "Demanda das UCs",
                    ),
                    /* @__PURE__ */ React.createElement(
                      "div",
                      { className: "resultado-card-valor" },
                      fmt2(calcTorre.demandaUcs),
                      " kVA",
                    ),
                  ),
                  /* @__PURE__ */ React.createElement(
                    "div",
                    { className: "resultado-card" },
                    /* @__PURE__ */ React.createElement(
                      "div",
                      { className: "resultado-card-label" },
                      `Demanda total ${dArt} ${unidLower} (com condomínio/incêndio)`,
                    ),
                    /* @__PURE__ */ React.createElement(
                      "div",
                      { className: "resultado-card-valor" },
                      fmt2(demandaTorre),
                      " kVA",
                    ),
                  ),
                ),
                /* @__PURE__ */ React.createElement(
                  "div",
                  { className: "resultado-card resultado-disjuntor" },
                  /* @__PURE__ */ React.createElement(
                    "div",
                    { className: "resultado-card-label" },
                    "Disjuntor Geral adequado de acordo com a Demanda das UCs",
                  ),
                  opcoesDG.length
                    ? /* @__PURE__ */ React.createElement(Toggle, {
                        value: b.disjGeral || opcoesDG[0],
                        onChange: (v) => setTorre(bi, { disjGeral: v }),
                        options: opcoesDG.map((dj) => ({ v: dj, l: dj })),
                      })
                    : /* @__PURE__ */ React.createElement(
                        "div",
                        { className: "field-hint" },
                        "Informe os disjuntores e a previsão de carga das UCs para ver o disjuntor geral adequado.",
                      ),
                ),
                /* @__PURE__ */ React.createElement(
                  "div",
                  { className: "resultado-card resultado-disjuntor" },
                  /* @__PURE__ */ React.createElement(
                    "div",
                    { className: "resultado-card-label" },
                    "Disjuntor do Condomínio / Combate a Incêndio adequado à demanda",
                  ),
                  opcoesDI.length
                    ? /* @__PURE__ */ React.createElement(Toggle, {
                        value: b.disjIncendio || opcoesDI[0],
                        onChange: (v) => setTorre(bi, { disjIncendio: v }),
                        options: opcoesDI.map((dj) => ({ v: dj, l: dj })),
                      })
                    : /* @__PURE__ */ React.createElement(
                        "div",
                        { className: "field-hint" },
                        "Informe a Demanda Condomínio / Incêndio (kVA) para ver o disjuntor adequado.",
                      ),
                ),
              ),
            ),
        );
      }),
      demandaTotalGeral > 304 &&
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "alert alert-info", style: { marginTop: 10 } },
          "Demanda total acima de 304 kVA: o atendimento fica condicionado à apresentação do projeto elétrico com ART/TRT.",
        ),
    ),
  );
}
