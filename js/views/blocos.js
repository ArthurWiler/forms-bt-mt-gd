// ============================================================
// CEMIG BT — Aba: TabBlocos  (extraído de js/views.js)
// ============================================================
function TabBlocos({ ctx }) {
  const {
    aba,
    setAba,
    modalidade,
    setModalidade,
    atend,
    setAtend,
    prop,
    setProp,
    corr,
    setCorr,
    obra,
    setObra,
    gerador,
    setGerador,
    obs,
    setObs,
    cepStatus,
    setCepStatus,
    cnpjStatus,
    setCnpjStatus,
    logoPDF,
    setLogoPDF,
    ucsDet,
    setUcsDet,
    ucBlocos,
    setUcBlocos,
    blocos,
    setBlocos,
    abas,
    buscarCEP,
    buscarCNPJ,
    coletivo,
    coordObrigatoria,
    coordPreenchida,
    demandaPrevTotal,
    demandaTotalGeral,
    disjGeralObrigatorio,
    docInfo,
    gerarPDF,
    hibrido,
    idx,
    irAnt,
    irProx,
    isAlteracaoColetivo,
    maiorCorrenteUC,
    multiTorres,
    opcoesDisjGeral,
    pessoaFisica,
    prevTotalKw,
    redeMono,
    replicarPrevTodas,
    replicarPrevTorre,
    replicarPrimeiro,
    replicarUC1Coletivo,
    replicarUC1Torre,
    setBloco,
    setBlocoPrev,
    setTorre,
    setUcDet,
    setUcTorre,
    setUcTorrePrev,
    sincronizarUCsTorre,
    totalUcsEmpreendimento,
    trocaDisjGeral,
    validacaoDisjuntores,
    validacaoHibrido,
  } = ctx;
  return (
    <div>
      <Card
        eyebrow="Empreendimento"
        title="Atendimento a Empreendimento com Múltiplas Torres ou Blocos"
        sub={`Cada ${atend.atendA.toLowerCase()} pode ter seu disjuntor geral e seu disjuntor de combate a incêndio. Preencha o primeiro e use "Replicar" para preenchimento em massa.`}
      >
        <div className="kpi-row">
          <div className="kpi">
            <div className="kpi-label">Atendimento a</div>
            <div className="kpi-value" style={{ fontSize: 15 }}>
              {atend.atendA}
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Total de UCs do empreendimento</div>
            <div className="kpi-value">{totalUcsEmpreendimento}</div>
          </div>
          <div className="kpi dark">
            <div className="kpi-label">Demanda total do empreendimento</div>
            <div className="kpi-value" style={{ fontSize: 18 }}>
              {fmt2(demandaTotalGeral)} kVA
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "flex-end",
            flexWrap: "wrap",
            marginBottom: 14,
          }}
        >
          <Field
            label={`Nº de ${atend.atendA === "Bloco" ? "Blocos" : "Torres"}`}
          >
            <div style={{ maxWidth: 120 }}>
              <Inp
                type="number"
                value={atend.nBlocos}
                onChange={(e) =>
                  setAtend({
                    ...atend,
                    nBlocos: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
              />
            </div>
          </Field>
          <Btn variant="ghost" onClick={replicarPrimeiro}>
            ⧉ Replicar {atend.atendA} 1 para todos
          </Btn>
        </div>

        {blocos.map((b, bi) => (
          <div key={bi} className="uc-block">
            <div className="uc-block-head">
              <span className="uc-block-title">
                {atend.atendA} {b.nome || bi + 1}
              </span>
              <Badge>
                {bi + 1} de {blocos.length}
              </Badge>
            </div>
            <div className="grid grid-3">
              <Field label={`Identificação do ${atend.atendA.toLowerCase()}`}>
                <Inp
                  value={b.nome}
                  onChange={(e) => setTorre(bi, { nome: e.target.value })}
                  placeholder={`${bi + 1}`}
                />
              </Field>
              <Field label="Disjuntor Geral" req>
                <Sel
                  value={b.disjGeral}
                  onChange={(e) => setTorre(bi, { disjGeral: e.target.value })}
                >
                  <option value="">Selecione…</option>
                  {DISJ_GER.filter((d) => d.tipo === "tri").map((d) => (
                    <option key={d.fx} value={d.fx}>
                      {d.fx}
                    </option>
                  ))}
                </Sel>
              </Field>
              <Field label={`Demanda do ${atend.atendA} (kVA)`}>
                <Inp
                  type="text"
                  readOnly
                  disabled
                  value={fmt2(
                    (b.ucs || []).reduce(
                      (s, u) => s + num((u.prev || {}).demanda),
                      0,
                    ),
                  )}
                  placeholder="0"
                />
              </Field>
              <Field label={`Qtd. de UCs por ${atend.atendA}`} req>
                <Inp
                  type="number"
                  value={b.qtdUCs}
                  onChange={(e) => sincronizarUCsTorre(bi, e.target.value)}
                  placeholder="0"
                />
              </Field>
              <Field label="Disjuntor do Condomínio / Sist. Combate Incêndio">
                <Sel
                  value={b.disjIncendio}
                  onChange={(e) =>
                    setTorre(bi, { disjIncendio: e.target.value })
                  }
                >
                  <option value="">Selecione…</option>
                  {DISJ_CN.map((d) => (
                    <option key={d.fx} value={d.fx}>
                      {d.fx}
                    </option>
                  ))}
                </Sel>
              </Field>
              <Field label="Demanda Condomínio / Combate Incêndio (kVA)">
                <Inp
                  type="number"
                  value={b.demandaIncendio}
                  onChange={(e) =>
                    setTorre(bi, { demandaIncendio: e.target.value })
                  }
                  placeholder="0"
                />
              </Field>
            </div>

            {/* UCs da torre/bloco — preenchimento em massa */}
            {(b.ucs || []).length > 0 && (
              <div className="uc-torre-wrap">
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    margin: "4px 0 10px",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <span className="subbox-title">
                    Unidades consumidoras do {atend.atendA.toLowerCase()} (
                    {b.ucs.length})
                  </span>
                  {b.ucs.length > 1 && (
                    <Btn variant="ghost" onClick={() => replicarUC1Torre(bi)}>
                      ⧉ Replicar UC 1 para todas
                    </Btn>
                  )}
                </div>
                {b.ucs.map((u, ui) => (
                  <div key={ui} className="uc-mini">
                    <div className="uc-mini-head">
                      UC {ui + 1}
                      {ui === 0 && b.ucs.length > 1 && (
                        <span className="uc-mini-tag">modelo p/ replicar</span>
                      )}
                    </div>
                    <div className="grid grid-3">
                      <Field label="Identificação">
                        <Inp
                          value={u.identificacao}
                          onChange={(e) =>
                            setUcTorre(bi, ui, {
                              identificacao: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Complemento" req={b.ucs.length > 1}>
                        <Inp
                          value={u.complemento}
                          onChange={(e) =>
                            setUcTorre(bi, ui, {
                              complemento: e.target.value,
                            })
                          }
                          placeholder="999"
                        />
                      </Field>
                      <Field label="Nº Predial">
                        <Inp
                          value={u.nPredial}
                          onChange={(e) =>
                            setUcTorre(bi, ui, {
                              nPredial: e.target.value,
                            })
                          }
                        />
                      </Field>
                      <Field label="Solicitação" req>
                        <Sel
                          value={u.solicitacao}
                          onChange={(e) =>
                            setUcTorre(bi, ui, {
                              solicitacao: e.target.value,
                            })
                          }
                        >
                          <option>Conexão Nova</option>
                          <option>Alteração de Carga</option>
                          <option>Caixa Existente sem Alteração</option>
                        </Sel>
                      </Field>
                      <Field label="Atividade" req>
                        <Sel
                          value={u.atividade}
                          onChange={(e) =>
                            setUcTorre(bi, ui, {
                              atividade: e.target.value,
                            })
                          }
                        >
                          <option value="">Selecionar</option>
                          <option>Residencial</option>
                          <option>Comercial</option>
                          <option>Industrial</option>
                          <option>Rural</option>
                        </Sel>
                      </Field>
                      <Field
                        label="Ramo de atividade"
                        req={u.atividade !== "Residencial"}
                      >
                        <Inp
                          value={u.ramo}
                          onChange={(e) =>
                            setUcTorre(bi, ui, { ramo: e.target.value })
                          }
                          placeholder={
                            u.atividade === "Residencial" ? "—" : "Obrigatório"
                          }
                        />
                      </Field>
                      {/* Instalação somente se NÃO for conexão nova */}
                      {u.solicitacao !== "Conexão Nova" && (
                        <Field label="Instalação" req>
                          <Inp
                            value={u.instalacao}
                            onChange={(e) =>
                              setUcTorre(bi, ui, {
                                instalacao: e.target.value,
                              })
                            }
                            placeholder="Nº instalação existente"
                          />
                        </Field>
                      )}
                      <Field label="Unidade Consumidora">
                        <Inp
                          value={u.unidadeConsumidora}
                          onChange={(e) =>
                            setUcTorre(bi, ui, {
                              unidadeConsumidora: e.target.value,
                            })
                          }
                          placeholder="Identificação da UC"
                        />
                      </Field>
                      <Field label="Disjuntor da UC">
                        <Sel
                          value={u.disjPara}
                          onChange={(e) =>
                            setUcTorre(bi, ui, {
                              disjPara: e.target.value,
                            })
                          }
                        >
                          <option value="">Selecione…</option>
                          {DISJ.map((d) => (
                            <option key={d.fx} value={d.fx}>
                              {d.fx}
                            </option>
                          ))}
                        </Sel>
                      </Field>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {(b.ucs || []).length > 0 && (
              <div className="prev-table-wrap" style={{ marginTop: 14 }}>
                <div className="prev-toolbar">
                  <strong
                    style={{
                      marginRight: "auto",
                      color: "var(--verde-escuro)",
                    }}
                  >
                    Previsão de carga das UCs
                  </strong>
                  {b.ucs.length > 1 && (
                    <Btn variant="ghost" onClick={() => replicarPrevTorre(bi)}>
                      Replicar previsão da UC 1 para todas
                    </Btn>
                  )}
                </div>
                <table className="prev-table">
                  <thead>
                    <tr>
                      <th>Unidade</th>
                      <th>Ilum. (kW)</th>
                      <th>Tomada (kW)</th>
                      <th>Chuveiro (kW)</th>
                      <th>Ar Cond. (kW)</th>
                      <th>Outros (kW)</th>
                      <th>Carga (kW)</th>
                      <th className="col-demanda">Demanda (kVA)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {b.ucs.map((u, ui) => (
                      <tr key={ui}>
                        <td className="uc-name">
                          {u.identificacao || `UC ${ui + 1}`}
                        </td>
                        {["ilum", "tomada", "chuveiro", "ar", "outros"].map(
                          (k) => (
                            <td key={k}>
                              <input
                                type="number"
                                value={(u.prev || {})[k] || ""}
                                onChange={(e) =>
                                  setUcTorrePrev(bi, ui, {
                                    [k]: e.target.value,
                                  })
                                }
                                placeholder="0,0"
                              />
                            </td>
                          ),
                        )}
                        <td className="carga-cell">{fmt2(prevKwUC(u))}</td>
                        <td className="col-demanda">
                          <input
                            className="demanda-prev"
                            type="number"
                            value={(u.prev || {}).demanda || ""}
                            onChange={(e) =>
                              setUcTorrePrev(bi, ui, {
                                demanda: e.target.value,
                              })
                            }
                            placeholder="0,0"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr>
                      <td className="uc-name">Total do bloco</td>
                      <td colSpan={5}></td>
                      <td className="carga-cell">
                        {fmt2(b.ucs.reduce((s, u) => s + prevKwUC(u), 0))}
                      </td>
                      <td className="col-demanda total-dem">
                        {fmt2(
                          b.ucs.reduce(
                            (s, u) => s + num((u.prev || {}).demanda),
                            0,
                          ),
                        )}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        ))}

        {demandaTotalGeral > 304 && (
          <div className="alert alert-info" style={{ marginTop: 10 }}>
            Demanda total acima de 304 kVA: o atendimento fica condicionado à
            apresentação do projeto elétrico com ART/TRT.
          </div>
        )}
      </Card>
    </div>
  );
}

