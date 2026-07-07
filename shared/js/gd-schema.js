function gdAplicarMascara(nome, valor) {
  if (!nome) return valor;
  const fn = typeof window !== "undefined" ? window[nome] : void 0;
  return typeof fn === "function" ? fn(valor) : valor;
}
function gdNormOptions(options) {
  if (!options) return [];
  return options.map(
    (o) => typeof o === "string" ? { v: o, l: o } : o
  );
}
function CampoSchema({ c, ctx }) {
  const { d, set } = ctx;
  if (c.show && !c.show(d)) return null;
  const tipo = c.type || "text";
  const travado = !!(ctx.locked && ctx.locked[c.k]);
  const hint = c.hintKey ? ctx[c.hintKey] : c.hint;
  const aoMudarValor = (raw) => {
    if (travado) return;
    const v = gdAplicarMascara(c.mask, raw);
    set({ [c.k]: v });
    if (c.onInput) c.onInput(v, ctx);
  };
  let controle;
  if (tipo === "toggle") {
    controle = /* @__PURE__ */ React.createElement(
      Toggle,
      {
        value: d[c.k],
        disabled: travado,
        onChange: (v) => {
          if (travado) return;
          set({ [c.k]: v });
          if (c.onInput) c.onInput(v, ctx);
        },
        options: gdNormOptions(c.options)
      }
    );
  } else if (tipo === "select") {
    controle = /* @__PURE__ */ React.createElement(Sel, { value: d[c.k], disabled: travado, onChange: (e) => aoMudarValor(e.target.value) }, c.placeholder !== false && /* @__PURE__ */ React.createElement("option", { value: "" }), gdNormOptions(c.options).map((o) => /* @__PURE__ */ React.createElement("option", { key: o.v, value: o.v }, o.l)));
  } else {
    // "date" (e outros tipos de <input>) passam direto p/ o Inp; o padrão é texto.
    controle = /* @__PURE__ */ React.createElement(
      Inp,
      {
        type: tipo === "text" ? void 0 : tipo,
        value: d[c.k],
        disabled: travado,
        onChange: (e) => aoMudarValor(e.target.value),
        placeholder: typeof c.placeholder === "string" ? c.placeholder : void 0
      }
    );
  }
  return /* @__PURE__ */ React.createElement(Field, { label: c.label, req: c.req, span: c.span, hint }, controle);
}
function CamposSchema({ schema, ctx }) {
  return schema.map(
    (c, i) => c.render ? (
      // escape hatch total: campo desenha a si mesmo via função custom
      /* @__PURE__ */ React.createElement(React.Fragment, { key: c.k || i }, c.render(ctx))
    ) : /* @__PURE__ */ React.createElement(CampoSchema, { key: c.k || i, c, ctx })
  );
}
function gdValidarObrigatorios(schema, d) {
  const faltas = [];
  schema.forEach((c) => {
    if (!c.req || !c.k) return;
    if (c.show && !c.show(d)) return;
    if (!String(d[c.k] || "").trim()) faltas.push(c.label);
  });
  return faltas;
}
function gdParesPDF(schema, d) {
  const pares = [];
  schema.forEach((c) => {
    if (!c.k || c.pdf === false) return;
    if (c.show && !c.show(d)) return;
    const valor = typeof c.pdf === "function" ? c.pdf(d) : String(d[c.k] || "");
    pares.push([c.label, valor]);
  });
  return pares;
}
