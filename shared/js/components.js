const { useState, useMemo, useCallback, useRef, useEffect } = React;
function LogoCemig() {
  return /* @__PURE__ */ React.createElement("img", { src: "../imgs/logos/logo-cemig-branca.png", alt: "Cemig", className: "logo-img" });
}
function Field({ label, req, children, hint, span }) {
  const cls = "field" + (span === 2 ? " col-span-2" : span === 3 ? " col-span-3" : "");
  return /* @__PURE__ */ React.createElement("div", { className: cls }, label && /* @__PURE__ */ React.createElement("label", null, label, " ", req && /* @__PURE__ */ React.createElement("span", { className: "req" }, "*")), children, hint && /* @__PURE__ */ React.createElement("span", { className: "field-hint" }, hint));
}
function Inp({ value, onChange, type = "text", placeholder }) {
  return /* @__PURE__ */ React.createElement(
    "input",
    {
      type,
      value: value || "",
      onChange,
      placeholder
    }
  );
}
function Sel({ value, onChange, children }) {
  return /* @__PURE__ */ React.createElement("select", { value, onChange }, children);
}
function Toggle({ value, onChange, options }) {
  return /* @__PURE__ */ React.createElement("div", { className: "toggle-group" }, options.map((o) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: String(o.v),
      type: "button",
      className: "toggle-btn" + (value === o.v ? " on" : ""),
      onClick: () => onChange(o.v)
    },
    o.l
  )));
}
function Card({ title, sub, eyebrow, children }) {
  return /* @__PURE__ */ React.createElement("div", { className: "card" }, eyebrow && /* @__PURE__ */ React.createElement("div", { className: "section-eyebrow" }, eyebrow), title && /* @__PURE__ */ React.createElement("h3", { className: "card-title" }, title), sub && /* @__PURE__ */ React.createElement("p", { className: "card-sub" }, sub), children);
}
function Btn({ children, onClick, variant = "ghost", disabled }) {
  const map = {
    primary: "btn-primary",
    dark: "btn-dark",
    ghost: "btn-ghost",
    danger: "btn-danger-ghost"
  };
  return /* @__PURE__ */ React.createElement(
    "button",
    {
      type: "button",
      className: "btn " + (map[variant] || "btn-ghost"),
      onClick,
      disabled
    },
    children
  );
}
function Badge({ children, lime }) {
  return /* @__PURE__ */ React.createElement("span", { className: "badge" + (lime ? " badge-lime" : "") }, children);
}
