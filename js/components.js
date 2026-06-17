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
  return (
    <div className="toggle-group">
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
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

// ============================================================
// CALCULADORA DE DEMANDA (embutida por Unidade Consumidora)
// ============================================================
function CalcDemanda({ data, onChange, redeMono }) {
  const d = data || {};
  const qtds = d.qtds || CAT.map(() => 0);
  const tipoA = d.tipoA || "res";
  const catA = d.catA || 0;
  const mots = d.mots || [];
  const [busca, setBusca] = useState("");

  const upd = (patch) => onChange({ ...d, qtds, tipoA, catA, mots, ...patch });
  const setQ = (i, v) => {
    const n = [...qtds];
    n[i] = Math.max(0, v);
    upd({ qtds: n });
  };

  const rA = useMemo(() => {
    const ilItems = CAT.map((c, i) => ({ ...c, q: qtds[i] || 0 })).filter(
      (x) => x.g === "il" && x.q > 0,
    );
    const kwIl = ilItems.reduce((s, x) => s + x.q * x.w, 0) / 1000;
    if (tipoA === "res") {
      const r = calcA_res(kwIl);
      return { kw: kwIl, ...r };
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
    const kw = items.reduce((s, x) => s + x.q * x.w, 0) / 1000;
    return { kw, d: kw };
  }, [qtds]);

  const rD = useMemo(() => {
    const det = mots.map((m) => {
      const tab = m.fase === "mono" ? T15 : T14;
      const row = tab.find((r) => r.cv === parseFloat(m.cv));
      const col = m.col || "c1";
      const corr = row ? row[col] : null;
      const kva = corr
        ? corr *
          (m.fase === "mono" ? 0.22 : 0.38) *
          Math.sqrt(m.fase === "mono" ? 1 : 3)
        : 0;
      return { ...m, kva: (m.q || 0) * (kva || 0) };
    });
    return { det, d: det.reduce((s, x) => s + x.kva, 0) };
  }, [mots]);

  const rF = useMemo(() => {
    const items = CAT.map((c, i) => ({ ...c, q: qtds[i] || 0 })).filter(
      (x) => x.g === "f" && x.q > 0,
    );
    const kw = items.reduce((s, x) => s + x.q * x.w, 0) / 1000;
    return { kw, d: kw * 0.5 };
  }, [qtds]);

  const demandaTotal = useMemo(() => {
    const b = Object.values(rB).reduce((s, x) => s + (x.d || 0), 0);
    return rA.d + b + rC.d + rD.d + rF.d;
  }, [rA, rB, rC, rD, rF]);

  const cargaInstalada = useMemo(
    () => CAT.reduce((s, c, i) => s + (qtds[i] || 0) * c.w, 0) / 1000,
    [qtds],
  );

  const disjuntores = useMemo(
    () => selecionarDisjuntores(demandaTotal, redeMono),
    [demandaTotal, redeMono],
  );

  // Reporta resultado ao pai quando muda
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

  return (
    <div>
      <Field label="Atividade da Unidade">
        <div className="toggle-group" style={{ alignItems: "center" }}>
          <Toggle
            value={tipoA}
            onChange={(v) => upd({ tipoA: v })}
            options={[
              { v: "res", l: "Residencial" },
              { v: "nr", l: "Não-Residencial" },
            ]}
          />
          {tipoA === "nr" && (
            <select
              value={catA}
              onChange={(e) => upd({ catA: +e.target.value })}
              style={{ width: "auto" }}
            >
              {TABELA_11.map((c, i) => (
                <option key={i} value={i}>
                  {c.d}
                </option>
              ))}
            </select>
          )}
        </div>
      </Field>

      <div style={{ marginTop: 12 }}>
        <Field label="Buscar equipamento">
          <Inp
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Ex: chuveiro, geladeira, ar..."
          />
        </Field>
      </div>

      <div className="carga-box" style={{ marginTop: 8 }}>
        {GO.map((sg) => {
          const items = catFiltrado.filter((c) => c.g === sg);
          if (!items.length) return null;
          return (
            <div key={sg}>
              <div className="carga-group-title">{GL[sg]}</div>
              {items.map((c) => (
                <div key={c.i} className="carga-row">
                  <div>
                    <div className="nome">
                      {c.n} <span className="pot">({fmtW(c.w)} W)</span>
                    </div>
                  </div>
                  <div className="qtd-ctrl">
                    <button onClick={() => setQ(c.i, (qtds[c.i] || 0) - 1)}>
                      −
                    </button>
                    <input
                      type="number"
                      value={qtds[c.i] || 0}
                      onChange={(e) => setQ(c.i, parseInt(e.target.value) || 0)}
                    />
                    <button
                      className="plus"
                      onClick={() => setQ(c.i, (qtds[c.i] || 0) + 1)}
                    >
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {/* Motores */}
      <div className="subbox">
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 8,
          }}
        >
          <span className="subbox-title">Motores / Cargas Especiais</span>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: "5px 12px", fontSize: 12 }}
            onClick={() =>
              upd({
                mots: [...mots, { fase: "tri", cv: "1", col: "c1", q: 1 }],
              })
            }
          >
            + Motor
          </button>
        </div>
        {mots.length === 0 && (
          <div style={{ fontSize: 12, color: "var(--texto-suave)" }}>
            Nenhum motor adicionado.
          </div>
        )}
        {mots.map((m, mi) => (
          <div key={mi} className="motor-row">
            <select
              value={m.fase}
              onChange={(e) => {
                const n = [...mots];
                n[mi] = { ...m, fase: e.target.value };
                upd({ mots: n });
              }}
            >
              <option value="mono">Mono (T15)</option>
              <option value="tri">Tri (T14)</option>
            </select>
            <select
              value={m.cv}
              onChange={(e) => {
                const n = [...mots];
                n[mi] = { ...m, cv: e.target.value };
                upd({ mots: n });
              }}
            >
              {(m.fase === "mono" ? T15 : T14).map((r) => (
                <option key={r.cv} value={r.cv}>
                  {r.l} CV
                </option>
              ))}
            </select>
            <select
              value={m.col}
              onChange={(e) => {
                const n = [...mots];
                n[mi] = { ...m, col: e.target.value };
                upd({ mots: n });
              }}
            >
              <option value="c1">Cat.I</option>
              <option value="c2">Cat.II</option>
              <option value="c3">Cat.III</option>
              <option value="c4">Cat.IV</option>
            </select>
            <input
              type="number"
              value={m.q}
              onChange={(e) => {
                const n = [...mots];
                n[mi] = { ...m, q: parseInt(e.target.value) || 0 };
                upd({ mots: n });
              }}
              placeholder="Qtd"
              style={{ width: 60 }}
            />
            <button
              type="button"
              onClick={() => {
                const n = mots.filter((_, x) => x !== mi);
                upd({ mots: n });
              }}
              style={{
                border: "none",
                background: "none",
                color: "var(--vermelho)",
                cursor: "pointer",
              }}
            >
              ✕
            </button>
          </div>
        ))}
        {rD.d > 0 && (
          <div
            style={{
              fontSize: 12,
              marginTop: 4,
              fontWeight: 600,
              color: "var(--verde)",
            }}
          >
            Demanda motores: {fmt2(rD.d)} kVA
          </div>
        )}
      </div>
    </div>
  );
}
