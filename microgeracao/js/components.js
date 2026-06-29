/* ============================================================
   CEMIG — Componentes de interface (React + Babel)
   ============================================================ */
const { useState, useMemo, useCallback, useRef, useEffect } = React;

// Logo Cemig (imagem fornecida em imgs/logo-cemig.png)
function LogoCemig() {
  return (
    <img src="imgs/logo-cemig-branca.png" alt="Cemig" className="logo-img" />
  );
}

// Campo de formulário
function Field({ label, req, children, hint, span }) {
  const cls =
    "field" + (span === 2 ? " col-span-2" : span === 3 ? " col-span-3" : "");
  return (
    <div className={cls}>
      {label && (
        <label>
          {label} {req && <span className="req">*</span>}
        </label>
      )}
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </div>
  );
}

// Input
function Inp({ value, onChange, type = "text", placeholder }) {
  return (
    <input
      type={type}
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
    />
  );
}

// Select
function Sel({ value, onChange, children }) {
  return (
    <select value={value} onChange={onChange}>
      {children}
    </select>
  );
}

// Toggle (Sim/Não etc.)
function Toggle({ value, onChange, options }) {
  // Sim/Não usa o rótulo padrão (regular 16px); opções enumeradas recebem
  // a variante bold 14px via .toggle-group--opcoes.
  const ehSimNao =
    options.length === 2 && options.every((o) => o.v === "Sim" || o.v === "Não");
  return (
    <div
      className={"toggle-group" + (ehSimNao ? "" : " toggle-group--opcoes")}
      role="radiogroup"
    >
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          className={"toggle-btn" + (value === o.v ? " on" : "")}
          onClick={() => onChange(o.v)}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}

// Card
function Card({ title, sub, eyebrow, children }) {
  return (
    <div className="card">
      {eyebrow && <div className="section-eyebrow">{eyebrow}</div>}
      {title && <h3 className="card-title">{title}</h3>}
      {sub && <p className="card-sub">{sub}</p>}
      {children}
    </div>
  );
}

// Botão
function Btn({ children, onClick, variant = "ghost", disabled }) {
  const map = {
    primary: "btn-primary",
    dark: "btn-dark",
    ghost: "btn-ghost",
    danger: "btn-danger-ghost",
  };
  return (
    <button
      type="button"
      className={"btn " + (map[variant] || "btn-ghost")}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
}

// Badge
function Badge({ children, lime }) {
  return (
    <span className={"badge" + (lime ? " badge-lime" : "")}>{children}</span>
  );
}

