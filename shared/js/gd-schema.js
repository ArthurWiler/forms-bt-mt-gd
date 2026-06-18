// ============================================================
// CEMIG GD — Infraestrutura schema-driven (fonte única por campo)
// Descreve seções como dados e renderiza com componente genérico.
// Validação de obrigatórios e conteúdo do PDF são DERIVADOS do schema.
//
// Forma de um campo:
//   {
//     k:       chave no estado (string) — obrigatório p/ campos de dado
//     label:   rótulo exibido
//     req:     true se obrigatório (entra na validação e marca * no label)
//     type:    "text" | "select" | "toggle"  (default "text")
//     options: para select/toggle — array de strings OU {v,l}
//     mask:    nome de função global de máscara (ex.: "mascararCEP") aplicada no onChange
//     span:    span de grid (1..3 / "full")
//     placeholder, hint: opcionais
//     show:    (d) => boolean — renderização condicional
//     onInput: (v, api) => void — escape hatch p/ lógica custom (dispara APIs etc.)
//              api = { set, d, buscarCep, buscarCnpj, soDigitos, ... }  (o próprio ctx)
//     pdf:     false p/ omitir do PDF; ou (d) => string p/ formatar valor
//   }
// ============================================================

// Aplica a máscara nomeada (se houver) e devolve o valor tratado.
function gdAplicarMascara(nome, valor) {
  if (!nome) return valor;
  const fn = typeof window !== "undefined" ? window[nome] : undefined;
  return typeof fn === "function" ? fn(valor) : valor;
}

// Normaliza options para [{v,l}]
function gdNormOptions(options) {
  if (!options) return [];
  return options.map((o) =>
    typeof o === "string" ? { v: o, l: o } : o
  );
}

// Componente genérico de campo a partir do schema.
// Recebe o descritor `c` e o `ctx` (estado + setters + helpers de API).
function CampoSchema({ c, ctx }) {
  const { d, set } = ctx;
  if (c.show && !c.show(d)) return null;

  const tipo = c.type || "text";
  const hint = c.hintKey ? ctx[c.hintKey] : c.hint;

  const aoMudarValor = (raw) => {
    const v = gdAplicarMascara(c.mask, raw);
    set({ [c.k]: v });
    if (c.onInput) c.onInput(v, ctx);
  };

  let controle;
  if (tipo === "toggle") {
    controle = (
      <Toggle
        value={d[c.k]}
        onChange={(v) => {
          set({ [c.k]: v });
          if (c.onInput) c.onInput(v, ctx);
        }}
        options={gdNormOptions(c.options)}
      />
    );
  } else if (tipo === "select") {
    controle = (
      <Sel value={d[c.k]} onChange={(e) => aoMudarValor(e.target.value)}>
        {c.placeholder !== false && <option value="">Selecionar</option>}
        {gdNormOptions(c.options).map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </Sel>
    );
  } else {
    controle = (
      <Inp
        value={d[c.k]}
        onChange={(e) => aoMudarValor(e.target.value)}
        placeholder={typeof c.placeholder === "string" ? c.placeholder : undefined}
      />
    );
  }

  return (
    <Field label={c.label} req={c.req} span={c.span} hint={hint}>
      {controle}
    </Field>
  );
}

// Renderiza uma lista de descritores de campo (uma seção).
function CamposSchema({ schema, ctx }) {
  return schema.map((c, i) =>
    c.render ? (
      // escape hatch total: campo desenha a si mesmo via função custom
      <React.Fragment key={c.k || i}>{c.render(ctx)}</React.Fragment>
    ) : (
      <CampoSchema key={c.k || i} c={c} ctx={ctx} />
    )
  );
}

// ---- Derivações a partir do schema (fonte única) ----

// Lista de obrigatórios faltando, dado um schema (achatado de várias seções).
function gdValidarObrigatorios(schema, d) {
  const faltas = [];
  schema.forEach((c) => {
    if (!c.req || !c.k) return;
    if (c.show && !c.show(d)) return; // condicional oculto não exige
    if (!String(d[c.k] || "").trim()) faltas.push(c.label);
  });
  return faltas;
}

// Pares (label, valor) para o PDF, derivados do schema.
function gdParesPDF(schema, d) {
  const pares = [];
  schema.forEach((c) => {
    if (!c.k || c.pdf === false) return;
    if (c.show && !c.show(d)) return;
    const valor =
      typeof c.pdf === "function" ? c.pdf(d) : String(d[c.k] || "");
    pares.push([c.label, valor]);
  });
  return pares;
}
