/* ============================================================
   CEMIG — Componentes de interface (React + Babel)
   ============================================================ */
const { useState, useMemo, useCallback, useRef, useEffect } = React;

// Logo Cemig (imagem em shared/imgs/logos/)
function LogoCemig() {
  return (
    <img
      src="imgs/logos/logo-cemig-branca.png"
      alt="Cemig"
      className="logo-img"
    />
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
function Inp({ value, onChange, type = "text", placeholder, disabled, max }) {
  return (
    <input
      type={type}
      value={value || ""}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      max={max}
    />
  );
}

// Select
function Sel({ value, onChange, children, disabled }) {
  return (
    <select value={value} onChange={onChange} disabled={disabled}>
      {children}
    </select>
  );
}

// Toggle (Sim/Não etc.)
function Toggle({ value, onChange, options, disabled }) {
  return (
    <div className={"toggle-group" + (disabled ? " toggle-disabled" : "")}>
      {options.map((o) => (
        <button
          key={String(o.v)}
          type="button"
          className={"toggle-btn" + (value === o.v ? " on" : "")}
          onClick={() => onChange(o.v)}
          disabled={disabled}
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

  // Auto-seleciona o tipo de carga conforme a atividade principal da UC:
  // Comercial/Industrial -> Não-Residencial; Residencial -> Residencial.
  // Só age enquanto o usuário ainda não escolheu manualmente.
  useEffect(() => {
    if (tipoA) return;
    if (atividade === "Comercial" || atividade === "Industrial")
      upd({ tipoA: "nr" });
    else if (atividade === "Residencial") upd({ tipoA: "res" });
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
    // Coluna definida pela QUANTIDADE TOTAL de motores (mono + tri)
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
      <Field label="Tipo de carga" req>
        <div className="toggle-group" style={{ alignItems: "center" }}>
          <Sel value={tipoA} onChange={(e) => upd({ tipoA: e.target.value })}>
            <option value="">Selecionar</option>
            <option value="res">Residencial</option>
            <option value="nr">Não-Residencial</option>
          </Sel>
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

      {!tipoA ? (
        <div className="field-hint" style={{ marginTop: 10 }}>
          Selecione o tipo de carga para detalhar os equipamentos.
        </div>
      ) : (
        <React.Fragment>
          <div className="carga-min-head" style={{ marginTop: 12 }}>
            <span className="subbox-title">Equipamentos selecionados</span>
            <button
              type="button"
              className="btn btn-ghost"
              style={{ padding: "5px 12px", fontSize: 12 }}
              onClick={() => setMinimizado((m) => !m)}
            >
              {minimizado ? "Editar lista de equipamentos" : "Minimizar lista"}
            </button>
          </div>

          {minimizado ? (
            <div className="carga-resumo">
              {CAT.map((c, i) => ({ ...c, i, q: qtds[i] || 0 })).filter(
                (c) => c.q > 0,
              ).length === 0 ? (
                <div className="field-hint">
                  Nenhum equipamento selecionado.
                </div>
              ) : (
                CAT.map((c, i) => ({ ...c, i, q: qtds[i] || 0 }))
                  .filter((c) => c.q > 0)
                  .map((c) => (
                    <span key={c.i} className="carga-resumo-chip">
                      {c.q}x {c.n}
                    </span>
                  ))
              )}
            </div>
          ) : (
            <React.Fragment>
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
                            <button
                              onClick={() => setQ(c.i, (qtds[c.i] || 0) - 1)}
                            >
                              −
                            </button>
                            <input
                              type="number"
                              value={qtds[c.i] || 0}
                              onChange={(e) =>
                                setQ(c.i, parseInt(e.target.value) || 0)
                              }
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
            </React.Fragment>
          )}

          {/* Motores */}
          <div className="subbox motores-box">
            <div className="motores-head">
              <span className="subbox-title">Motores / Cargas Especiais</span>
              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: "5px 12px", fontSize: 12 }}
                onClick={() =>
                  upd({ mots: [...mots, { fase: "mono", cv: "1", q: 1 }] })
                }
              >
                + Motor
              </button>
            </div>
            {mots.length === 0 ? (
              <div style={{ fontSize: 12, color: "var(--texto-suave)" }}>
                Nenhum motor adicionado.
              </div>
            ) : (
              <table className="motores-table">
                <thead>
                  <tr>
                    <th>Tipo</th>
                    <th>Potência (CV)</th>
                    <th>Qtd</th>
                    <th>Dem. unit. (kVA)</th>
                    <th>Dem. total (kVA)</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {mots.map((m, mi) => {
                    const linha = rD.det[mi] || {};
                    return (
                      <tr key={mi}>
                        <td>
                          <select
                            value={m.fase}
                            onChange={(e) => {
                              const n = [...mots];
                              n[mi] = { ...m, fase: e.target.value };
                              upd({ mots: n });
                            }}
                          >
                            <option value="mono">Monofásico</option>
                            <option value="tri">Trifásico</option>
                          </select>
                        </td>
                        <td>
                          <select
                            value={m.cv}
                            onChange={(e) => {
                              const n = [...mots];
                              n[mi] = { ...m, cv: e.target.value };
                              upd({ mots: n });
                            }}
                          >
                            {(m.fase === "mono" ? MOTOR_MONO : MOTOR_TRI).map(
                              (r) => (
                                <option key={r.cv} value={r.cv}>
                                  {r.l}
                                </option>
                              ),
                            )}
                          </select>
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            value={m.q}
                            onChange={(e) => {
                              const n = [...mots];
                              n[mi] = {
                                ...m,
                                q: parseInt(e.target.value) || 0,
                              };
                              upd({ mots: n });
                            }}
                            style={{ width: 60 }}
                          />
                        </td>
                        <td className="num">{fmt2(linha.kvaUnit || 0)}</td>
                        <td className="num">{fmt2(linha.kva || 0)}</td>
                        <td>
                          <button
                            type="button"
                            onClick={() =>
                              upd({ mots: mots.filter((_, x) => x !== mi) })
                            }
                            className="motor-del"
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {rD.d > 0 && (
              <div className="motores-total">
                Demanda dos motores: {fmt2(rD.d)} kVA
              </div>
            )}
          </div>
        </React.Fragment>
      )}
    </div>
  );
}
