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
// Renderiza o rótulo aplicando a convenção de marcadores (fonte única):
//   • obrigatório → sem sufixo;
//   • opcional    → sufixo "(opcional)" em <span class="opt"> (ver shared.css).
// A intenção ("é opcional?") vem do Field via opts.optional — NÃO se inspeciona
// o texto do rótulo. Marcadores legados no fim ("*", "**", "— opcional",
// "(opcional)") são removidos para não duplicar.
function renderFieldLabel(label, opts) {
  const optional = !!(opts && opts.optional);
  const suffix = optional
    ? [
        " ",
        /* @__PURE__ */ React.createElement(
          "span",
          { className: "opt" },
          "(opcional)",
        ),
      ]
    : [];
  if (typeof label !== "string") {
    return /* @__PURE__ */ React.createElement(
      React.Fragment,
      null,
      label,
      ...suffix,
    );
  }
  let base = label
    .replace(/\s*(?:[—-]\s*)?\(?\s*opcional\s*\)?\s*$/i, "")
    .replace(/\s*\*+\s*$/, "")
    .trim();
  if (!base) base = label;
  return /* @__PURE__ */ React.createElement(
    React.Fragment,
    null,
    base,
    ...suffix,
  );
}
// Convenção de obrigatoriedade (global): req=true → sem marcador; req=false →
// "(opcional)"; req=false + hideOpt → sem marcador (rótulos calculados/somente-
// leitura, sub-rótulos, etc.).
function Field({ label, req, children, hint, span, float, hideOpt }) {
  const cls =
    "field" +
    (float ? " field--float" : "") +
    (span === 2 ? " col-span-2" : span === 3 ? " col-span-3" : "");
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: cls },
    label &&
      /* @__PURE__ */ React.createElement(
        "label",
        null,
        renderFieldLabel(label, { optional: !req && !hideOpt }),
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
    // Placeholder " " garante :placeholder-shown quando vazio → o rótulo
    // flutuante ocupa a célula (ver .field--float em shared.css).
    placeholder: placeholder || " ",
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
  // Rótulo: Sim/Não usa o padrão regular 16px; demais (opções enumeradas)
  // recebem a variante bold 14px via .toggle-group--opcoes.
  const ehSimNao =
    options.length === 2 &&
    options.every((o) => o.v === "Sim" || o.v === "Não");
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className:
        "toggle-group" +
        (ehSimNao ? "" : " toggle-group--opcoes") +
        (disabled ? " toggle-disabled" : ""),
      role: "radiogroup",
    },
    options.map((o) =>
      /* @__PURE__ */ React.createElement(
        "button",
        {
          key: String(o.v),
          type: "button",
          role: "radio",
          "aria-checked": value === o.v,
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
  // Estado de abertura dos acordeões: { [grupo]: bool, _mot: bool }.
  const [abertos, setAbertos] = useState({});
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
  // Regra: um motor trifásico exige alimentação trifásica — quando há ao menos
  // um motor trifásico com quantidade > 0, oculta os disjuntores mono/bifásicos.
  const disjuntores = useMemo(() => {
    const lista = selecionarDisjuntores(demandaTotal, redeMono);
    const temMotorTri = mots.some(
      (m) => m.fase === "tri" && (parseInt(m.q) || 0) > 0,
    );
    return temMotorTri ? lista.filter((x) => x.tipo === "tri") : lista;
  }, [demandaTotal, redeMono, mots]);
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
  // Categorias de EXIBIÇÃO dos acordeões (Figma). São independentes do grupo
  // de cálculo c.g: as parcelas rA/rB/rC/rF continuam somando por c.g e NÃO
  // mudam. Aqui só decidimos sob qual acordeão cada item aparece:
  //  • "Refrigeração" reúne geladeiras/freezers/adega — que no cálculo seguem
  //    em b5 (mesmo fator de demanda de antes);
  //  • "Demais aparelhos" absorve o restante de b5 e os Raios-X (grupo f),
  //    que deixam de ter acordeão próprio.
  const REFRI = new Set([
    "Geladeira comum",
    "Geladeira duplex",
    "Freezer vertical",
    "Freezer horiz. médio",
    "Freezer horiz. grande",
    "Adega climatizada",
  ]);
  const ehRefri = (c) => c.g === "b5" && REFRI.has(c.n);
  const CARGA_CATS = [
    { id: "il", label: "Iluminação e tomada", match: (c) => c.g === "il" },
    {
      id: "b1",
      label: "Chuveiro, torneira e cafeteira",
      match: (c) => c.g === "b1",
    },
    { id: "b2", label: "Aquecedor de água", match: (c) => c.g === "b2" },
    { id: "b3", label: "Forno, fogão e grill", match: (c) => c.g === "b3" },
    {
      id: "b4",
      label: "Lavadoras, secadores e ferro",
      match: (c) => c.g === "b4",
    },
    { id: "refri", label: "Refrigeração", match: ehRefri },
    { id: "c", label: "Ar condicionado", match: (c) => c.g === "c" },
    {
      id: "demais",
      label: "Demais aparelhos",
      match: (c) => (c.g === "b5" && !ehRefri(c)) || c.g === "f",
    },
  ];
  const grupoQtd = (cat) =>
    CAT.reduce((s, c, i) => s + (cat.match(c) ? qtds[i] || 0 : 0), 0);
  const toggleAcc = (k) => setAbertos((p) => ({ ...p, [k]: !p[k] }));
  const chevron = /* @__PURE__ */ React.createElement("span", {
    className: "carga-acc-chevron",
    "aria-hidden": "true",
  });
  const accHead = (k, label, count) =>
    /* @__PURE__ */ React.createElement(
      "button",
      {
        type: "button",
        className: "carga-acc-head",
        "aria-expanded": !!abertos[k] || (k !== "_mot" && !!busca),
        onClick: () => toggleAcc(k),
      },
      /* @__PURE__ */ React.createElement(
        "span",
        { className: "carga-acc-label" },
        label,
      ),
      /* @__PURE__ */ React.createElement(
        "span",
        { className: "carga-acc-meta" },
        count > 0 &&
          /* @__PURE__ */ React.createElement(
            "span",
            { className: "carga-acc-badge" },
            count,
          ),
        chevron,
      ),
    );
  return /* @__PURE__ */ React.createElement(
    "div",
    null,
    !tipoCargaBloqueado &&
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
            /* @__PURE__ */ React.createElement("option", { value: "" }),
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
          /* Busca de equipamento (ícone de lupa + placeholder). */
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "carga-busca" },
            /* @__PURE__ */ React.createElement(
              "svg",
              {
                viewBox: "0 0 24 24",
                width: "24",
                height: "24",
                fill: "none",
                stroke: "currentColor",
                "stroke-width": "2",
                "stroke-linecap": "round",
                "stroke-linejoin": "round",
                "aria-hidden": "true",
              },
              /* @__PURE__ */ React.createElement("circle", {
                cx: "11",
                cy: "11",
                r: "7",
              }),
              /* @__PURE__ */ React.createElement("line", {
                x1: "21",
                y1: "21",
                x2: "16.65",
                y2: "16.65",
              }),
            ),
            /* @__PURE__ */ React.createElement("input", {
              type: "text",
              value: busca,
              onChange: (e) => setBusca(e.target.value),
              placeholder: "Buscar equipamento",
            }),
          ),
          /* Acordeões por grupo de equipamento. */
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "carga-acc-list" },
            CARGA_CATS.map((cat) => {
              const items = catFiltrado.filter(cat.match);
              if (busca && !items.length) return null;
              const open = busca ? items.length > 0 : !!abertos[cat.id];
              return /* @__PURE__ */ React.createElement(
                "div",
                {
                  key: cat.id,
                  className: "carga-acc" + (open ? " is-open" : ""),
                },
                accHead(cat.id, cat.label, grupoQtd(cat)),
                open &&
                  /* @__PURE__ */ React.createElement(
                    "div",
                    { className: "carga-acc-body" },
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
                  ),
              );
            }),
            /* Acordeão: Motores e cargas especiais. */
            /* @__PURE__ */ React.createElement(
              "div",
              {
                className: "carga-acc" + (abertos._mot ? " is-open" : ""),
              },
              accHead("_mot", "Motores e cargas especiais", mots.length),
              abertos._mot &&
                /* @__PURE__ */ React.createElement(
                  "div",
                  { className: "carga-acc-body" },
                  mots.length > 0 &&
                    /* @__PURE__ */ React.createElement(
                      "table",
                      { className: "motores-table" },
                      /* @__PURE__ */ React.createElement(
                        "thead",
                        null,
                        /* @__PURE__ */ React.createElement(
                          "tr",
                          null,
                          /* @__PURE__ */ React.createElement(
                            "th",
                            null,
                            "Tipo",
                          ),
                          /* @__PURE__ */ React.createElement(
                            "th",
                            null,
                            "Potência (CV)",
                          ),
                          /* @__PURE__ */ React.createElement(
                            "th",
                            null,
                            "Quantidade",
                          ),
                          /* @__PURE__ */ React.createElement(
                            "th",
                            null,
                            "Dem. Unit (KVA)",
                          ),
                          /* @__PURE__ */ React.createElement(
                            "th",
                            null,
                            "Dem. Total (KVA)",
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
                                (m.fase === "mono"
                                  ? MOTOR_MONO
                                  : MOTOR_TRI
                                ).map((r) =>
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
                                  "aria-label": "Remover motor",
                                  onClick: () =>
                                    upd({
                                      mots: mots.filter((_, x) => x !== mi),
                                    }),
                                  className: "motor-del",
                                },
                                /* @__PURE__ */ React.createElement(
                                  "svg",
                                  {
                                    viewBox: "0 0 24 24",
                                    width: "20",
                                    height: "20",
                                    fill: "none",
                                    stroke: "currentColor",
                                    "stroke-width": "2",
                                    "stroke-linecap": "round",
                                    "stroke-linejoin": "round",
                                    "aria-hidden": "true",
                                  },
                                  /* @__PURE__ */ React.createElement("path", {
                                    d: "M3 6h18",
                                  }),
                                  /* @__PURE__ */ React.createElement("path", {
                                    d: "M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2",
                                  }),
                                  /* @__PURE__ */ React.createElement("path", {
                                    d: "M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6",
                                  }),
                                  /* @__PURE__ */ React.createElement("line", {
                                    x1: "10",
                                    y1: "11",
                                    x2: "10",
                                    y2: "17",
                                  }),
                                  /* @__PURE__ */ React.createElement("line", {
                                    x1: "14",
                                    y1: "11",
                                    x2: "14",
                                    y2: "17",
                                  }),
                                ),
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
                      "Demanda total dos motores: ",
                      /* @__PURE__ */ React.createElement(
                        "strong",
                        null,
                        fmt2(rD.d),
                        " kVA",
                      ),
                    ),
                  /* @__PURE__ */ React.createElement(
                    "div",
                    { className: "motores-add" },
                    /* @__PURE__ */ React.createElement(
                      "button",
                      {
                        type: "button",
                        className: "btn btn-ghost motores-add-btn",
                        onClick: () =>
                          upd({
                            mots: [...mots, { fase: "mono", cv: 1, q: 1 }],
                          }),
                      },
                      "+ Adicionar motor",
                    ),
                  ),
                ),
            ),
          ),
        ),
  );
}
