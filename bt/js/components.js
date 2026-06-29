const { useState, useMemo, useCallback, useRef, useEffect } = React;
// Seção colapsável do seletor de modalidades (home).
// Reutilizável e genérica: cada instância mantém o próprio estado de abertura
// (expandida por padrão), de modo que novas seções de MODALIDADES_SECOES
// passam a ter o comportamento de expandir/recolher sem alterações de código.
function SecaoModalidade({ sec, onSelect }) {
  const [aberta, setAberta] = useState(false);
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: "modalidade-secao" + (aberta ? "" : " is-collapsed") },
    /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "modalidade-secao-titulo",
        "aria-expanded": aberta,
        onClick: () => setAberta((v) => !v),
      },
      /* @__PURE__ */ React.createElement(
        "span",
        { className: "modalidade-secao-label" },
        sec.titulo,
      ),
      /* @__PURE__ */ React.createElement(
        "span",
        { className: "modalidade-secao-chevron", "aria-hidden": "true" },
        "▾",
      ),
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "modalidade-secao-corpo" },
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "modalidade-grid" },
        sec.cards.map((card) =>
          /* @__PURE__ */ React.createElement(
            "button",
            {
              key: card.id,
              className:
                "modalidade-card" + (card.status === "soon" ? " soon" : ""),
              disabled: card.status === "soon",
              onClick: () => onSelect(card),
            },
            /* @__PURE__ */ React.createElement(
              "span",
              { className: "modalidade-img" },
              /* @__PURE__ */ React.createElement("img", {
                src: card.img,
                alt: card.nome,
                loading: "lazy",
                onError: (e) => {
                  e.target.style.display = "none";
                  e.target.parentNode.classList.add("ph");
                },
              }),
            ),
            /* @__PURE__ */ React.createElement(
              "span",
              { className: "modalidade-card-body" },
              /* @__PURE__ */ React.createElement("strong", null, card.nome),
              /* @__PURE__ */ React.createElement(
                "span",
                { className: "modalidade-sub" },
                card.sub,
              ),
            ),
          ),
        ),
      ),
    ),
  );
}
function LogoCemig() {
  return /* @__PURE__ */ React.createElement("img", {
    src: "../imgs/logos/logo-cemig-branca-com-verde.png",
    alt: "Cemig",
    className: "logo-img",
  });
}
function Field({ label, req, children, hint, span }) {
  const cls =
    "field" + (span === 2 ? " col-span-2" : span === 3 ? " col-span-3" : "");
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: cls },
    label &&
      /* @__PURE__ */ React.createElement(
        "label",
        null,
        label,
        " ",
        req &&
          /* @__PURE__ */ React.createElement(
            "span",
            { className: "req" },
            "*",
          ),
      ),
    children,
    hint &&
      /* @__PURE__ */ React.createElement(
        "span",
        { className: "field-hint" },
        hint,
      ),
  );
}
function Inp({
  value,
  onChange,
  type = "text",
  placeholder,
  disabled,
  max,
  readOnly,
}) {
  return /* @__PURE__ */ React.createElement("input", {
    type,
    value: value || "",
    onChange,
    placeholder,
    disabled,
    max,
    readOnly,
  });
}
function Sel({ value, onChange, children, disabled }) {
  return /* @__PURE__ */ React.createElement(
    "select",
    { value, onChange, disabled },
    children,
  );
}
function Toggle({ value, onChange, options, disabled }) {
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: "toggle-group" + (disabled ? " toggle-disabled" : "") },
    options.map((o) =>
      /* @__PURE__ */ React.createElement(
        "button",
        {
          key: String(o.v),
          type: "button",
          className: "toggle-btn" + (value === o.v ? " on" : ""),
          onClick: () => onChange(o.v),
          disabled,
        },
        o.l,
      ),
    ),
  );
}
function Card({ title, sub, eyebrow, children }) {
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: "card" },
    eyebrow &&
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "section-eyebrow" },
        eyebrow,
      ),
    title &&
      /* @__PURE__ */ React.createElement(
        "h3",
        { className: "card-title" },
        title,
      ),
    sub &&
      /* @__PURE__ */ React.createElement("p", { className: "card-sub" }, sub),
    children,
  );
}
function Btn({ children, onClick, variant = "ghost", disabled }) {
  const map = {
    primary: "btn-primary",
    dark: "btn-dark",
    ghost: "btn-ghost",
    danger: "btn-danger-ghost",
  };
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "btn " + (map[variant] || "btn-ghost"),
      onClick,
      disabled,
    },
    children,
  );
}
function Badge({ children, lime }) {
  return /* @__PURE__ */ React.createElement(
    "span",
    { className: "badge" + (lime ? " badge-lime" : "") },
    children,
  );
}
function CalcDemanda({
  data,
  onChange,
  redeMono,
  atividade,
  minimizarPorPadrao,
}) {
  const d = data || {};
  const qtds = d.qtds || CAT.map(() => 0);
  const tipoA = d.tipoA || "";
  const catA = d.catA || 0;
  const mots = d.mots || [];
  const [busca, setBusca] = useState("");
  const [minimizado, setMinimizado] = useState(!!minimizarPorPadrao);
  const upd = (patch) => onChange({ ...d, qtds, tipoA, catA, mots, ...patch });
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
  const rD = useMemo(() => {
    const qtdTotal = mots.reduce((s, m) => s + (parseInt(m.q) || 0), 0);
    const col = motorColPorQtd(qtdTotal);
    const det = mots.map((m) => {
      const kvaUnit = motorKvaUnit(m.fase, m.cv, col);
      return { ...m, col, kvaUnit, kva: (parseInt(m.q) || 0) * kvaUnit };
    });
    return { det, col, qtdTotal, d: det.reduce((s, x) => s + x.kva, 0) };
  }, [mots]);
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
  const disjuntores = useMemo(
    () => selecionarDisjuntores(demandaTotal, redeMono),
    [demandaTotal, redeMono],
  );
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
        _demanda: demandaTotal,
        _cargaKw: cargaInstalada,
        _disjuntores: disjuntores.map((x) => x.fx),
      });
    }
  }, [resKey]);
  const catFiltrado = CAT.map((c, i) => ({ ...c, i })).filter(
    (c) => !busca || c.n.toLowerCase().includes(busca.toLowerCase()),
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
            ),
            mots.length === 0
              ? /* @__PURE__ */ React.createElement(
                  "div",
                  { style: { fontSize: 12, color: "var(--texto-suave)" } },
                  "Nenhum motor adicionado.",
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
                      /* @__PURE__ */ React.createElement(
                        "th",
                        null,
                        "Potência (CV)",
                      ),
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
                    mots.map((m, mi) => {
                      const linha = rD.det[mi] || {};
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
                                const n = [...mots];
                                n[mi] = { ...m, fase: e.target.value };
                                upd({ mots: n });
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
                                const n = [...mots];
                                n[mi] = { ...m, cv: e.target.value };
                                upd({ mots: n });
                              },
                            },
                            (m.fase === "mono" ? MOTOR_MONO : MOTOR_TRI).map(
                              (r) =>
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
                              const n = [...mots];
                              n[mi] = {
                                ...m,
                                q: parseInt(e.target.value) || 0,
                              };
                              upd({ mots: n });
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
                                upd({ mots: mots.filter((_, x) => x !== mi) }),
                              className: "motor-del",
                            },
                            "✕",
                          ),
                        ),
                      );
                    }),
                  ),
                ),
            rD.d > 0 &&
              /* @__PURE__ */ React.createElement(
                "div",
                { className: "motores-total" },
                "Demanda dos motores: ",
                fmt2(rD.d),
                " kVA",
              ),
          ),
        ),
  );
}
