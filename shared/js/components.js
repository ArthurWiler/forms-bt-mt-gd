const { useState, useMemo, useCallback, useRef, useEffect } = React;
function LogoCemig() {
  return /* @__PURE__ */ React.createElement("img", {
    src: "../imgs/logos/logo-cemig-branca.png",
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
function Inp({ value, onChange, type = "text", placeholder, disabled }) {
  return /* @__PURE__ */ React.createElement("input", {
    type,
    value: value || "",
    onChange,
    placeholder,
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
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: "toggle-group" + (disabled ? " is-locked" : "") },
    options.map((o) =>
      /* @__PURE__ */ React.createElement(
        "button",
        {
          key: String(o.v),
          type: "button",
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
