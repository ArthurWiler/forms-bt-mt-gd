/* ============================================================
   CEMIG BT — Individual · Etapa "Atendimento"
   ------------------------------------------------------------
   Um único card-container por página: as cargas de cada UC, o
   resumo (carga/demanda/disjuntor) e o Gerador de Emergência
   convivem dentro do MESMO Card, como subseções separadas por
   `.divider` — sem card aninhado nem segundo card só para o
   gerador (espelha a fusão Tipo+Obra de dados-unidade.js).

   O gerador (antes em views/gerador.js, removido) é global: uma
   única subseção ao final, lendo/gravando `gerador`/`setGerador`.
   ============================================================ */
function TabCargasIndividual({ ctx }) {
  const {
    gerador,
    setGerador,
    atend,
    setAtend,
    ucsDet,
    redeMono,
    setUcDet,
    restrito,
    rural,
    solicitacoesPermitidas,
    atividadeTravada,
    obra,
    validacaoDisjuntores,
  } = ctx;
  const multi = ucsDet.length > 1;
  // Esta view é reaproveitada pelo fluxo coletivo (quando sem proteção geral),
  // onde a identificação das UCs já vem de TabUcsIndividual e o Tipo/Nº de UCs
  // de tipo.js. Os blocos abaixo (topo + identidade por UC) são exclusivos do
  // fluxo Individual, para não duplicar campos.
  const ehIndividual = ctx.formType === "individual";
  const opcoesTipoAtend = solicitacoesPermitidas || SOLICITACOES_INDIVIDUAIS;
  const atividadeBloqueada = restrito || atividadeTravada;
  // Abertura por UC: cada bloco "Unidade consumidora N" é colapsável; aberto
  // por padrão (fechado só quando ucAberta[ui] === false).
  const [ucAberta, setUcAberta] = useState({});
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Etapa " + ctx.etapaNum,
      title: "Atendimento",
      sub: ehIndividual
        ? "Defina o tipo do atendimento e a quantidade de unidades consumidoras. Para cada UC, informe a solicitação e detalhe as cargas para calcularmos a demanda e o disjuntor adequado."
        : "Para cada UC, detalhe as cargas para calcularmos a demanda e o disjuntor adequado.",
    },
    /* ── Topo: Tipo do Atendimento (único) + Nº de UCs (lista suspensa) ──
       Os blocos por UC abaixo seguem a quantidade escolhida aqui. */
    ehIndividual &&
    /* @__PURE__ */ React.createElement(
      "div",
      {
        className: "grid grid-2",
        /* respiro entre o topo (Tipo/Nº de UCs) e os blocos de UC */
        style: { margin: "16px 0 24px" },
      },
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Tipo do Atendimento", req: true, float: true },
        /* @__PURE__ */ React.createElement(
          Sel,
          {
            value: atend.solicitacao,
            disabled: restrito,
            onChange: (e) =>
              setAtend({ ...atend, solicitacao: e.target.value }),
          },
          opcoesTipoAtend.map((s) =>
            /* @__PURE__ */ React.createElement("option", { key: s }, s),
          ),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label: "Número de unidades consumidoras",
          req: true,
          float: true,
          hint: rural
            ? "Pedido rural é limitado a 1 unidade consumidora."
            : void 0,
        },
        /* @__PURE__ */ React.createElement(
          Sel,
          {
            value: String(rural ? 1 : atend.nUCs || 1),
            disabled: rural,
            onChange: (e) =>
              setAtend({ ...atend, nUCs: parseInt(e.target.value, 10) || 1 }),
          },
          (rural ? [1] : [1, 2, 3]).map((n) =>
            /* @__PURE__ */ React.createElement(
              "option",
              { key: n, value: String(n) },
              n,
            ),
          ),
        ),
      ),
    ),
    multi &&
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className:
            "alert " + (validacaoDisjuntores.ok ? "alert-ok" : "alert-warn"),
        },
        /* @__PURE__ */ React.createElement("b", null, "Regra de disjuntores:"),
        " máx. 1 tripolar 63 A e/ou 2 mono/bifásicos 63 A. ",
        validacaoDisjuntores.ok ? "✔ " : "⚠ ",
        validacaoDisjuntores.msg,
      ),
    ucsDet.map((u, ui) => {
      // Minimizada por padrão: só abre quando o usuário clicar.
      const aberta = ucAberta[ui] === true;
      // Endereço da UC no cabeçalho (mesmo endereço da obra, mudando só o
      // complemento — ver aviso em Dados da unidade).
      const endParts = [];
      if (obra.endereco) {
        endParts.push(
          obra.endereco + (obra.num ? ", " + obra.num : ""),
        );
      }
      if (u.complemento) endParts.push(u.complemento);
      if (obra.bairro) endParts.push(obra.bairro);
      if (obra.cidade)
        endParts.push(obra.cidade + (obra.estado ? "/" + obra.estado : ""));
      const enderecoUC = endParts.join(" — ");
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: ui,
          className: "uc-colapsavel" + (aberta ? " is-open" : ""),
        },
        /* @__PURE__ */ React.createElement(
          "button",
          {
            type: "button",
            className: "uc-colapsavel-head",
            "aria-expanded": aberta,
            onClick: () => setUcAberta((p) => ({ ...p, [ui]: !aberta })),
          },
          /* @__PURE__ */ React.createElement(
            "span",
            { className: "uc-head-info" },
            /* @__PURE__ */ React.createElement(
              "span",
              { className: "uc-colapsavel-titulo" },
              `Unidade consumidora ${ui + 1}`,
            ),
            ehIndividual &&
              enderecoUC &&
              /* @__PURE__ */ React.createElement(
                React.Fragment,
                null,
                /* @__PURE__ */ React.createElement(
                  "span",
                  { className: "uc-head-endereco-label" },
                  "Endereço",
                ),
                /* @__PURE__ */ React.createElement(
                  "span",
                  { className: "uc-head-endereco" },
                  enderecoUC,
                ),
              ),
          ),
          /* @__PURE__ */ React.createElement("span", {
            className: "carga-acc-chevron uc-colapsavel-chevron",
            "aria-hidden": "true",
          }),
        ),
        aberta &&
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "uc-colapsavel-corpo" },
            /* Identificação da UC (migrado de views/ucs-individual.js): a
               Solicitação por UC governa os campos de UC existente (Nº
               Instalação, Disjuntor atual, Mudança de local). Só no Individual —
               no coletivo isso vem de TabUcsIndividual. */
            ehIndividual &&
            /* @__PURE__ */ React.createElement(
              "div",
              {
                className: "grid grid-3",
                /* separa a identificação da declaração de cargas abaixo */
                style: { marginBottom: 24 },
              },
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Solicitação", req: true, float: true },
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
                { label: "Atividade principal", req: true, float: true },
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
                  { label: "Ramo de atividade", req: true },
                  /* @__PURE__ */ React.createElement(Inp, {
                    value: u.ramo,
                    disabled: restrito,
                    onChange: (e) => setUcDet(ui, { ramo: e.target.value }),
                  }),
                ),
              /* Nº Predial e Caixa/Identificação foram removidos desta aba;
                 o Complemento diferencia as UCs (mesmo endereço da obra). */
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Complemento", req: ucsDet.length > 1 },
                /* @__PURE__ */ React.createElement(Inp, {
                  value: u.complemento,
                  onChange: (e) => setUcDet(ui, { complemento: e.target.value }),
                  placeholder: "Residência 1",
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
            ucSemAlteracao(u)
              ? /* @__PURE__ */ React.createElement(
                  "div",
                  { className: "alert alert-info" },
                  "Esta UC foi marcada como ",
                  /* @__PURE__ */ React.createElement(
                    "strong",
                    null,
                    "Caixa Existente sem Alteração",
                  ),
                  ". O preenchimento de cargas foi omitido; ela aparecerá apenas no resumo do PDF.",
                )
              : /* @__PURE__ */ React.createElement(
                  React.Fragment,
                  null,
                  /* @__PURE__ */ React.createElement(CalcDemanda, {
                    data: u.cargas,
                    onChange: (c) => setUcDet(ui, { cargas: c }),
                    redeMono,
                    atividade: u.atividade,
                    minimizarPorPadrao: restrito,
                  }),
                  /* Resultado: dois cards de valor (carga/demanda) + card de
                 seleção do disjuntor por radio (.toggle = radio canônico).
                 A lógica do disjuntor é a mesma do antigo <select>: opções
                 vêm de cargas._disjuntores; seleção em disjEscolhido. */
                  /* @__PURE__ */ React.createElement(
                    "div",
                    { className: "resultado-cargas" },
                    /* @__PURE__ */ React.createElement(
                      "div",
                      { className: "resultado-kpis" },
                      /* @__PURE__ */ React.createElement(
                        "div",
                        { className: "resultado-card" },
                        /* @__PURE__ */ React.createElement(
                          "div",
                          { className: "resultado-card-label" },
                          "Carga instalada",
                        ),
                        /* @__PURE__ */ React.createElement(
                          "div",
                          { className: "resultado-card-valor" },
                          fmt2(u.cargas?._cargaKw || 0),
                          " kW",
                        ),
                      ),
                      /* @__PURE__ */ React.createElement(
                        "div",
                        { className: "resultado-card" },
                        /* @__PURE__ */ React.createElement(
                          "div",
                          { className: "resultado-card-label" },
                          "Demanda calculada",
                        ),
                        /* @__PURE__ */ React.createElement(
                          "div",
                          { className: "resultado-card-valor" },
                          fmt2(u.cargas?._demanda || 0),
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
                        "Disjuntor adequado de acordo com a seleção",
                      ),
                      u.cargas?._disjuntores?.length
                        ? /* @__PURE__ */ React.createElement(Toggle, {
                            value: u.disjEscolhido || u.cargas._disjuntores[0],
                            onChange: (v) => setUcDet(ui, { disjEscolhido: v }),
                            options: u.cargas._disjuntores.map((dj) => ({
                              v: dj,
                              l: dj,
                            })),
                          })
                        : /* @__PURE__ */ React.createElement(
                            "div",
                            { className: "field-hint" },
                            "Detalhe as cargas para ver o disjuntor adequado.",
                          ),
                      multi &&
                        u.cargas?._disjuntores?.length > 0 &&
                        !validacaoDisjuntores.ok &&
                        /* @__PURE__ */ React.createElement(
                          "div",
                          {
                            className: "alert alert-warn",
                            style: { marginTop: 8 },
                          },
                          /* @__PURE__ */ React.createElement(
                            "b",
                            null,
                            "Combinação de disjuntores inválida:",
                          ),
                          " ",
                          validacaoDisjuntores.msg,
                        ),
                    ),
                  ),
                ),
          ),
      );
    }),
    /* ── Subseção: Gerador de Emergência (antes views/gerador.js) ── */
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "divider" },
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Possui gerador de emergência?", req: true },
        /* @__PURE__ */ React.createElement(Toggle, {
          value: gerador.possui,
          onChange: (v) => setGerador({ ...gerador, possui: v }),
          options: [
            { v: "Sim", l: "Sim" },
            { v: "Não", l: "Não" },
          ],
        }),
      ),
      gerador.possui === "Sim" &&
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "grid grid-2", style: { marginTop: 14 } },
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Potência do gerador (kVA)" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: gerador.potencia,
              onChange: (e) =>
                setGerador({ ...gerador, potencia: e.target.value }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Fonte / Combustível" },
            /* @__PURE__ */ React.createElement(
              Sel,
              {
                value: gerador.fonte,
                onChange: (e) =>
                  setGerador({ ...gerador, fonte: e.target.value }),
              },
              /* @__PURE__ */ React.createElement(
                "option",
                { value: "" },
                "Selecione",
              ),
              /* @__PURE__ */ React.createElement("option", null, "Diesel"),
              /* @__PURE__ */ React.createElement("option", null, "Gasolina"),
              /* @__PURE__ */ React.createElement(
                "option",
                null,
                "Gás (GLP/GNV)",
              ),
              /* @__PURE__ */ React.createElement("option", null, "Outro"),
            ),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Observações do gerador", span: 2 },
            /* @__PURE__ */ React.createElement(Inp, {
              value: gerador.descricao,
              onChange: (e) =>
                setGerador({ ...gerador, descricao: e.target.value }),
              placeholder: "Modelo, finalidade, regime de operação...",
            }),
          ),
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "col-span-2 cmg-aviso" },
            /* @__PURE__ */ React.createElement("div", {
              className: "cmg-aviso-icon",
              "aria-hidden": "true",
            }),
            /* @__PURE__ */ React.createElement(
              "p",
              { className: "cmg-aviso-texto" },
              "O gerador de emergência opera de forma isolada (sem paralelismo com a rede CEMIG).",
            ),
          ),
        ),
    ),
  );
}
