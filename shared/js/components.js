const { useState, useMemo, useCallback, useRef, useEffect } = React;
function LogoCemig() {
  return /* @__PURE__ */ React.createElement("img", {
    src: "../imgs/logos/logo-cemig-branca.png",
    alt: "Cemig",
    className: "logo-img",
  });
}
// Renderiza o rótulo aplicando a convenção de marcadores (fonte única):
//   • obrigatório → sem sufixo;
//   • opcional    → sufixo "(opcional)" em <span class="opt"> (ver shared.css).
// A intenção ("é opcional?") vem do Field via opts.optional — NÃO se inspeciona
// o texto do rótulo. Marcadores legados no fim ("*", "**", "— opcional",
// "(opcional)") são removidos para não duplicar. Vale para Micro/Mini.
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
// "(opcional)"; req=false + hideOpt → sem marcador.
function Field({ label, req, children, hint, span, hideOpt }) {
  const cls =
    "field" + (span === 2 ? " col-span-2" : span === 3 ? " col-span-3" : "");
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
function Inp({ value, onChange, type = "text", placeholder, disabled }) {
  return /* @__PURE__ */ React.createElement("input", {
    type,
    value: value || "",
    onChange,
    // Placeholder " " garante :placeholder-shown quando vazio → o rótulo
    // flutuante ocupa a célula (ver .field--float em shared.css).
    placeholder: placeholder || " ",
    disabled,
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
    options.length === 2 && options.every((o) => o.v === "Sim" || o.v === "Não");
  return /* @__PURE__ */ React.createElement(
    "div",
    {
      className:
        "toggle-group" +
        (ehSimNao ? "" : " toggle-group--opcoes") +
        (disabled ? " is-locked" : ""),
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
          disabled,
          onClick: disabled ? void 0 : () => onChange(o.v),
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

// Descrições resumidas (ND-5.3) dos tipos de subestação — texto idêntico ao
// usado no módulo MT (mt/js/dados.js), para o tooltip "i" dos cards.
const SUBESTACAO_INFO = {
  1: "Aérea em poste: transformador instalado na rede aérea, para pequenas potências. Medição e proteção na base.",
  2: "Medição e proteção (com ou sem transformação), em alvenaria. Desde 03/07/2023 não se aplica a fornecimento individual em 13,8 kV; desde 01/01/2024 também não em compartilhado 13,8 kV. Permitida em 22/34,5 kV e uso compartilhado.",
  4: "Blindada: cubículo metálico compartimentado, com alívio de pressão e ventilação, abrigado ou ao tempo. Proteção na média tensão, sem transformação. Atende demandas de até 2500 kW.",
  5: "Medição, proteção e transformação, em alvenaria. Até 300 kW, com um transformador de 75 a 300 kVA. Proteção por chave fusível tripolar; medição a 3 elementos na média tensão.",
  8: "Blindada Simplificada (SEBS): subestação blindada metálica para uma única unidade, até 300 kW. Medição na média tensão, proteção por chave fusível tripolar e disjuntor de baixa tensão.",
};
// Extrai o número da subestação de um rótulo como "Nº 5" → 5.
function _seNumero(label) {
  const m = String(label || "").match(/(\d+)/);
  return m ? m[1] : null;
}
// Galeria visual de seleção de tipo de subestação — mesma experiência por
// cards do módulo MT (mt/js/app.js renderGaleriaSE). As imagens vêm de
// SUBESTACAO_IMGS_B64 (mt/js/subestacoes-b64.js, incluído no index do módulo).
// Props:
//   tipos       : lista de rótulos (ex.: ["Nº 1","Nº 2",...])
//   value       : rótulo selecionado
//   onSelect    : (rótulo) => void
//   disabledFn  : (rótulo) => bool — card cinza, não clicável (filtragem dinâmica)
function GdSeGaleria({ tipos, value, onSelect, disabledFn }) {
  const imgs =
    typeof SUBESTACAO_IMGS_B64 !== "undefined" ? SUBESTACAO_IMGS_B64 : {};
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: "se-gallery" },
    (tipos || []).map((tipo) => {
      const n = _seNumero(tipo);
      const img = n && imgs[n];
      const info = n && SUBESTACAO_INFO[n];
      const desabilitado = disabledFn ? disabledFn(tipo) : false;
      const selecionado = value === tipo;
      return /* @__PURE__ */ React.createElement(
        "div",
        {
          key: tipo,
          className:
            "se-card" +
            (selecionado ? " selected" : "") +
            (desabilitado ? " disabled" : ""),
          onClick: desabilitado ? void 0 : () => onSelect && onSelect(tipo),
        },
        info &&
          /* @__PURE__ */ React.createElement(
            "span",
            { className: "se-info" },
            "i",
            /* @__PURE__ */ React.createElement(
              "span",
              { className: "se-tooltip" },
              info,
            ),
          ),
        img &&
          /* @__PURE__ */ React.createElement("img", { src: img, alt: tipo }),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "lbl" },
          tipo,
          desabilitado ? " (indisponível)" : "",
        ),
      );
    }),
  );
}

/* ============================================================
   Prévia do formulário (Figma) — blocos canônicos da etapa
   "Prévia & PDF": seção titulada em verde, campo rótulo+valor
   com lápis de edição (volta à etapa), divisor, cartão-resumo e
   aviso pós-exportação. Espelhado em bt/js/components.js
   (BT) — manter os dois em sincronia.
   ============================================================ */
function PreviaSecao({ titulo, children }) {
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: "previa-secao" },
    titulo &&
      /* @__PURE__ */ React.createElement(
        "h4",
        { className: "previa-secao-titulo" },
        titulo,
      ),
    children,
  );
}
function PreviaCampo({ label, valor, onEdit, full }) {
  const vazio = valor == null || valor === "";
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: "previa-campo" + (full ? " previa-campo--full" : "") },
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "previa-campo-label" },
      label,
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "previa-campo-valor" },
      vazio ? "—" : valor,
      onEdit &&
        /* @__PURE__ */ React.createElement("button", {
          type: "button",
          className: "previa-edit",
          "aria-label": "Editar " + label,
          title: "Editar",
          onClick: onEdit,
        }),
    ),
  );
}
function PreviaDivider() {
  return /* @__PURE__ */ React.createElement("hr", {
    className: "previa-divider",
  });
}
function PreviaCard({ label, valor }) {
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: "previa-card" },
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "previa-card-label" },
      label,
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "previa-card-valor" },
      valor || "—",
    ),
  );
}
function PreviaAvisoExportacao() {
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: "cmg-aviso cmg-aviso--warn" },
    /* @__PURE__ */ React.createElement("div", {
      className: "cmg-aviso-icon",
      "aria-hidden": "true",
    }),
    /* @__PURE__ */ React.createElement(
      "p",
      { className: "cmg-aviso-texto" },
      /* @__PURE__ */ React.createElement(
        "span",
        null,
        "Após exportar o PDF da sua solicitação, anexe-o no seu pedido no ",
        /* @__PURE__ */ React.createElement("b", null, "Cemig Atende"),
        ".",
      ),
    ),
  );
}
