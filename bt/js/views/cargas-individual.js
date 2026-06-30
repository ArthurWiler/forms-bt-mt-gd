/* ============================================================
   CEMIG BT — Individual · Etapa "Cargas das UCs"
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
    ucsDet,
    redeMono,
    setUcDet,
    restrito,
    validacaoDisjuntores,
  } = ctx;
  const multi = ucsDet.length > 1;
  // Abertura por UC: cada bloco "Unidade consumidora N" é colapsável; aberto
  // por padrão (fechado só quando ucAberta[ui] === false).
  const [ucAberta, setUcAberta] = useState({});
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Etapa " + ctx.etapaNum,
      title: "Cargas da unidade consumidora",
      sub: "Para identificar o disjuntor correto para a sua unidade consumidora, selecione abaixo os equipamentos que farão parte do imóvel. Com base na sua escolha, calcularemos a demanda de energia que a sua rede elétrica precisará suportar com total segurança.",
    },
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
      const aberta = ucAberta[ui] !== false;
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
            { className: "uc-colapsavel-titulo" },
            `Unidade consumidora ${ui + 1}`,
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
