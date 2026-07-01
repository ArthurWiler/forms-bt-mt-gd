/* ============================================================
   CEMIG — Componente reutilizável do Formulário de Carga (ND-5.1)
   Reaproveitado do formulário de Baixa Tensão. Calcula carga instalada,
   demanda (D = a + b + c + d + e + f) e sugestão de disjuntores.

   Props:
   - data, onChange: estado do formulário de carga (qtds/tipoA/catA/mots/extras...)
   - redeMono, atividade, minimizarPorPadrao: iguais ao BT.
   - mostrarCargasAdicionais (bool): habilita a seção "Cargas Adicionais",
     para cargas inexistentes na lista predefinida. Cada item segue a MESMA
     estrutura de campos dos motores (fase, CV, quantidade) e entra na demanda.

   Requer: shared/js/load-form-data.js (CAT, MOTOR_*, motorColPorQtd, etc.)
   e shared/js/calc.js (calcA_res, calcA_nr, calcBsg, selecionarDisjuntores).
   ============================================================ */
function CalcDemanda({
  data,
  onChange,
  redeMono,
  atividade,
  minimizarPorPadrao,
  mostrarCargasAdicionais,
}) {
  const d = data || {};
  const qtds = d.qtds || CAT.map(() => 0);
  const tipoA = d.tipoA || "";
  const catA = d.catA || 0;
  const mots = d.mots || [];
  const extras = d.extras || [];
  const [busca, setBusca] = useState("");
  const [minimizado, setMinimizado] = useState(!!minimizarPorPadrao);
  const upd = (patch) =>
    onChange({ ...d, qtds, tipoA, catA, mots, extras, ...patch });
  const tipoCargaBloqueado =
    atividade === "Residencial" ||
    atividade === "Comercial" ||
    atividade === "Industrial";
  useEffect(() => {
    if (atividade === "Residencial") {
      if (tipoA !== "res") upd({ tipoA: "res" });
      return;
    }
    if (atividade === "Comercial" || atividade === "Industrial") {
      if (tipoA !== "nr") upd({ tipoA: "nr" });
    }
  }, [atividade]);
  const setQ = (i, v) => {
    const n = [...qtds];
    n[i] = Math.max(0, v);
    upd({ qtds: n });
  };
  const rA = useMemo(() => {
    if (!tipoA) return { kw: 0, d: 0 };
    const ilItems = CAT.map((c, i) => ({ ...c, q: qtds[i] || 0 })).filter(
      (x) => x.g === "il" && x.q > 0,
    );
    const kwIl = ilItems.reduce((s, x) => s + x.q * x.w, 0) / 1e3;
    if (tipoA === "res") {
      const r2 = calcA_res(kwIl);
      return { kw: kwIl, ...r2 };
    }
    const r = calcA_nr(kwIl, catA);
    return { kw: kwIl, ...r };
  }, [qtds, tipoA, catA]);
  const rB = useMemo(() => {
    const out = {};
    ["b1", "b2", "b3", "b4", "b5"].forEach((sg) => {
      const items = CAT.map((c, i) => ({ ...c, q: qtds[i] || 0 })).filter(
        (x) => x.g === sg && x.q > 0,
      );
      out[sg] = calcBsg(items, sg);
    });
    return out;
  }, [qtds]);
  const rC = useMemo(() => {
    const items = CAT.map((c, i) => ({ ...c, q: qtds[i] || 0 })).filter(
      (x) => x.g === "c" && x.q > 0,
    );
    const kw = items.reduce((s, x) => s + x.q * x.w, 0) / 1e3;
    return { kw, d: kw };
  }, [qtds]);
  // Demanda dos motores (parcela d). Motores + cargas adicionais compartilham
  // a mesma estrutura e a contagem total define a coluna (c1..c4).
  const rD = useMemo(() => {
    const todos = [...mots, ...extras];
    const qtdTotal = todos.reduce((s, m) => s + (parseInt(m.q) || 0), 0);
    const col = motorColPorQtd(qtdTotal);
    const calcLinha = (m) => {
      const kvaUnit = motorKvaUnit(m.fase, m.cv, col);
      return { ...m, col, kvaUnit, kva: (parseInt(m.q) || 0) * kvaUnit };
    };
    const det = mots.map(calcLinha);
    const detExtras = extras.map(calcLinha);
    return {
      det,
      detExtras,
      col,
      qtdTotal,
      d:
        det.reduce((s, x) => s + x.kva, 0) +
        detExtras.reduce((s, x) => s + x.kva, 0),
    };
  }, [mots, extras]);
  const rF = useMemo(() => {
    const items = CAT.map((c, i) => ({ ...c, q: qtds[i] || 0 })).filter(
      (x) => x.g === "f" && x.q > 0,
    );
    const kw = items.reduce((s, x) => s + x.q * x.w, 0) / 1e3;
    return { kw, d: kw * 0.5 };
  }, [qtds]);
  const demandaTotal = useMemo(() => {
    const b = Object.values(rB).reduce((s, x) => s + (x.d || 0), 0);
    return rA.d + b + rC.d + rD.d + rF.d;
  }, [rA, rB, rC, rD, rF]);
  const cargaInstalada = useMemo(
    () => CAT.reduce((s, c, i) => s + (qtds[i] || 0) * c.w, 0) / 1e3,
    [qtds],
  );
  // Regra: um motor trifásico exige alimentação trifásica — quando há ao menos
  // um motor trifásico com quantidade > 0, oculta os disjuntores mono/bifásicos.
  const disjuntores = useMemo(() => {
    const lista = selecionarDisjuntores(demandaTotal, redeMono);
    const temMotorTri = [...mots, ...extras].some(
      (m) => m.fase === "tri" && (parseInt(m.q) || 0) > 0,
    );
    return temMotorTri ? lista.filter((x) => x.tipo === "tri") : lista;
  }, [demandaTotal, redeMono, mots, extras]);
  const lastRef = useRef("");
  const resKey = `${demandaTotal.toFixed(3)}|${cargaInstalada.toFixed(3)}|${disjuntores.map((x) => x.fx).join(",")}`;
  useEffect(() => {
    if (lastRef.current !== resKey) {
      lastRef.current = resKey;
      onChange({
        ...d,
        qtds,
        tipoA,
        catA,
        mots,
        extras,
        _demanda: demandaTotal,
        _cargaKw: cargaInstalada,
        _disjuntores: disjuntores.map((x) => x.fx),
      });
    }
  }, [resKey]);
  const catFiltrado = CAT.map((c, i) => ({ ...c, i })).filter(
    (c) => !busca || c.n.toLowerCase().includes(busca.toLowerCase()),
  );
  // Tabela editável de cargas no formato dos motores (motores ou adicionais)
  const tabelaMotores = (linhas, detalhes, lista, chave, rotuloVazio) =>
    linhas.length === 0
      ? /* @__PURE__ */ React.createElement(
          "div",
          { style: { fontSize: 12, color: "var(--texto-suave)" } },
          rotuloVazio,
        )
      : /* @__PURE__ */ React.createElement(
          "table",
          { className: "motores-table" },
          /* @__PURE__ */ React.createElement(
            "thead",
            null,
            /* @__PURE__ */ React.createElement(
              "tr",
              null,
              /* @__PURE__ */ React.createElement("th", null, "Tipo"),
              /* @__PURE__ */ React.createElement("th", null, "Potência (CV)"),
              /* @__PURE__ */ React.createElement("th", null, "Qtd"),
              /* @__PURE__ */ React.createElement(
                "th",
                null,
                "Dem. unit. (kVA)",
              ),
              /* @__PURE__ */ React.createElement(
                "th",
                null,
                "Dem. total (kVA)",
              ),
              /* @__PURE__ */ React.createElement("th", null),
            ),
          ),
          /* @__PURE__ */ React.createElement(
            "tbody",
            null,
            linhas.map((m, mi) => {
              const linha = detalhes[mi] || {};
              return /* @__PURE__ */ React.createElement(
                "tr",
                { key: mi },
                /* @__PURE__ */ React.createElement(
                  "td",
                  null,
                  /* @__PURE__ */ React.createElement(
                    "select",
                    {
                      value: m.fase,
                      onChange: (e) => {
                        const n = [...linhas];
                        n[mi] = { ...m, fase: e.target.value };
                        upd({ [chave]: n });
                      },
                    },
                    /* @__PURE__ */ React.createElement(
                      "option",
                      { value: "mono" },
                      "Monofásico",
                    ),
                    /* @__PURE__ */ React.createElement(
                      "option",
                      { value: "tri" },
                      "Trifásico",
                    ),
                  ),
                ),
                /* @__PURE__ */ React.createElement(
                  "td",
                  null,
                  /* @__PURE__ */ React.createElement(
                    "select",
                    {
                      value: m.cv,
                      onChange: (e) => {
                        const n = [...linhas];
                        n[mi] = { ...m, cv: e.target.value };
                        upd({ [chave]: n });
                      },
                    },
                    (m.fase === "mono" ? MOTOR_MONO : MOTOR_TRI).map((r) =>
                      /* @__PURE__ */ React.createElement(
                        "option",
                        { key: r.cv, value: r.cv },
                        r.l,
                      ),
                    ),
                  ),
                ),
                /* @__PURE__ */ React.createElement(
                  "td",
                  null,
                  /* @__PURE__ */ React.createElement("input", {
                    type: "number",
                    min: "0",
                    value: m.q,
                    onChange: (e) => {
                      const n = [...linhas];
                      n[mi] = { ...m, q: parseInt(e.target.value) || 0 };
                      upd({ [chave]: n });
                    },
                    style: { width: 60 },
                  }),
                ),
                /* @__PURE__ */ React.createElement(
                  "td",
                  { className: "num" },
                  fmt2(linha.kvaUnit || 0),
                ),
                /* @__PURE__ */ React.createElement(
                  "td",
                  { className: "num" },
                  fmt2(linha.kva || 0),
                ),
                /* @__PURE__ */ React.createElement(
                  "td",
                  null,
                  /* @__PURE__ */ React.createElement(
                    "button",
                    {
                      type: "button",
                      onClick: () =>
                        upd({ [chave]: linhas.filter((_, x) => x !== mi) }),
                      className: "motor-del",
                    },
                    "✕",
                  ),
                ),
              );
            }),
          ),
        );
  return /* @__PURE__ */ React.createElement(
    "div",
    null,
    /* @__PURE__ */ React.createElement(
      Field,
      { label: "Tipo de carga", req: true },
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "toggle-group", style: { alignItems: "center" } },
        /* @__PURE__ */ React.createElement(
          Sel,
          {
            value: tipoA,
            disabled: tipoCargaBloqueado,
            onChange: (e) => upd({ tipoA: e.target.value }),
          },
          /* @__PURE__ */ React.createElement(
            "option",
            { value: "" },
            "Selecionar",
          ),
          /* @__PURE__ */ React.createElement(
            "option",
            { value: "res" },
            "Residencial",
          ),
          /* @__PURE__ */ React.createElement(
            "option",
            { value: "nr" },
            "Não-Residencial",
          ),
        ),
        tipoA === "nr" &&
          /* @__PURE__ */ React.createElement(
            "select",
            {
              value: catA,
              onChange: (e) => upd({ catA: +e.target.value }),
              style: { width: "auto" },
            },
            TABELA_11.map((c, i) =>
              /* @__PURE__ */ React.createElement(
                "option",
                { key: i, value: i },
                c.d,
              ),
            ),
          ),
      ),
    ),
    !tipoA
      ? /* @__PURE__ */ React.createElement(
          "div",
          { className: "field-hint", style: { marginTop: 10 } },
          "Selecione o tipo de carga para detalhar os equipamentos.",
        )
      : /* @__PURE__ */ React.createElement(
          React.Fragment,
          null,
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "carga-min-head", style: { marginTop: 12 } },
            /* @__PURE__ */ React.createElement(
              "span",
              { className: "subbox-title" },
              "Equipamentos selecionados",
            ),
            /* @__PURE__ */ React.createElement(
              "button",
              {
                type: "button",
                className: "btn btn-ghost",
                style: { padding: "5px 12px", fontSize: 12 },
                onClick: () => setMinimizado((m) => !m),
              },
              minimizado ? "Editar lista de equipamentos" : "Minimizar lista",
            ),
          ),
          minimizado
            ? /* @__PURE__ */ React.createElement(
                "div",
                { className: "carga-resumo" },
                CAT.map((c, i) => ({ ...c, i, q: qtds[i] || 0 })).filter(
                  (c) => c.q > 0,
                ).length === 0
                  ? /* @__PURE__ */ React.createElement(
                      "div",
                      { className: "field-hint" },
                      "Nenhum equipamento selecionado.",
                    )
                  : CAT.map((c, i) => ({ ...c, i, q: qtds[i] || 0 }))
                      .filter((c) => c.q > 0)
                      .map((c) =>
                        /* @__PURE__ */ React.createElement(
                          "span",
                          { key: c.i, className: "carga-resumo-chip" },
                          c.q,
                          "x ",
                          c.n,
                        ),
                      ),
              )
            : /* @__PURE__ */ React.createElement(
                React.Fragment,
                null,
                /* @__PURE__ */ React.createElement(
                  "div",
                  { style: { marginTop: 12 } },
                  /* @__PURE__ */ React.createElement(
                    Field,
                    { label: "Buscar equipamento" },
                    /* @__PURE__ */ React.createElement(Inp, {
                      value: busca,
                      onChange: (e) => setBusca(e.target.value),
                      placeholder: "Ex: chuveiro, geladeira, ar...",
                    }),
                  ),
                ),
                /* @__PURE__ */ React.createElement(
                  "div",
                  { className: "carga-box", style: { marginTop: 8 } },
                  GO.map((sg) => {
                    const items = catFiltrado.filter((c) => c.g === sg);
                    if (!items.length) return null;
                    return /* @__PURE__ */ React.createElement(
                      "div",
                      { key: sg },
                      /* @__PURE__ */ React.createElement(
                        "div",
                        { className: "carga-group-title" },
                        GL[sg],
                      ),
                      items.map((c) =>
                        /* @__PURE__ */ React.createElement(
                          "div",
                          { key: c.i, className: "carga-row" },
                          /* @__PURE__ */ React.createElement(
                            "div",
                            null,
                            /* @__PURE__ */ React.createElement(
                              "div",
                              { className: "nome" },
                              c.n,
                              " ",
                              /* @__PURE__ */ React.createElement(
                                "span",
                                { className: "pot" },
                                "(",
                                fmtW(c.w),
                                " W)",
                              ),
                            ),
                          ),
                          /* @__PURE__ */ React.createElement(
                            "div",
                            { className: "qtd-ctrl" },
                            /* @__PURE__ */ React.createElement(
                              "button",
                              {
                                onClick: () => setQ(c.i, (qtds[c.i] || 0) - 1),
                              },
                              "−",
                            ),
                            /* @__PURE__ */ React.createElement("input", {
                              type: "number",
                              value: qtds[c.i] || 0,
                              onChange: (e) =>
                                setQ(c.i, parseInt(e.target.value) || 0),
                            }),
                            /* @__PURE__ */ React.createElement(
                              "button",
                              {
                                className: "plus",
                                onClick: () => setQ(c.i, (qtds[c.i] || 0) + 1),
                              },
                              "+",
                            ),
                          ),
                        ),
                      ),
                    );
                  }),
                ),
              ),
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "subbox motores-box" },
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "motores-head" },
              /* @__PURE__ */ React.createElement(
                "span",
                { className: "subbox-title" },
                "Motores / Cargas Especiais",
              ),
              /* @__PURE__ */ React.createElement(
                "button",
                {
                  type: "button",
                  className: "btn btn-primary",
                  style: { padding: "5px 12px", fontSize: 12 },
                  onClick: () =>
                    upd({ mots: [...mots, { fase: "mono", cv: "1", q: 1 }] }),
                },
                "+ Motor",
              ),
            ),
            tabelaMotores(
              mots,
              rD.det,
              mots,
              "mots",
              "Nenhum motor adicionado.",
            ),
          ),
          mostrarCargasAdicionais &&
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "subbox motores-box", style: { marginTop: 12 } },
              /* @__PURE__ */ React.createElement(
                "div",
                { className: "motores-head" },
                /* @__PURE__ */ React.createElement(
                  "span",
                  { className: "subbox-title" },
                  "Cargas Adicionais",
                ),
                /* @__PURE__ */ React.createElement(
                  "button",
                  {
                    type: "button",
                    className: "btn btn-primary",
                    style: { padding: "5px 12px", fontSize: 12 },
                    onClick: () =>
                      upd({
                        extras: [...extras, { fase: "mono", cv: "1", q: 1 }],
                      }),
                  },
                  "+ Carga Adicional",
                ),
              ),
              /* @__PURE__ */ React.createElement(
                "div",
                { className: "field-hint", style: { marginBottom: 8 } },
                "Para cargas que não constam na lista predefinida. Cada item usa a mesma estrutura dos motores e é somado à demanda.",
              ),
              tabelaMotores(
                extras,
                rD.detExtras,
                extras,
                "extras",
                "Nenhuma carga adicional informada.",
              ),
            ),
          rD.d > 0 &&
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "motores-total" },
              "Demanda dos motores e cargas adicionais: ",
              fmt2(rD.d),
              " kVA",
            ),
        ),
  );
}
