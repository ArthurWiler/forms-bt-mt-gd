// ============================================================
// CEMIG BT — Aba: TabUcsColetivo  (extraído de js/views.js)
// ============================================================
function TabUcsColetivo({ ctx }) {
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
      {trocaDisjGeral && (
        <Card
          eyebrow="Alteração de carga"
          title="Troca do Disjuntor Geral e Demandas"
          sub="Informe o disjuntor geral existente e o novo, além da demanda atual e futura do agrupamento. A demanda futura corresponde à soma das demandas previstas das UCs."
        >
          <div className="grid grid-2">
            <Field label="Disjuntor geral existente" req>
              <Sel
                value={atend.disjGeralAtual}
                onChange={(e) =>
                  setAtend({ ...atend, disjGeralAtual: e.target.value })
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
            <Field label="Disjuntor geral novo" req>
              <Sel
                value={atend.disjuntorGeral}
                onChange={(e) =>
                  setAtend({ ...atend, disjuntorGeral: e.target.value })
                }
              >
                <option value="">Selecione…</option>
                {opcoesDisjGeral.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Sel>
            </Field>
            <Field label="Demanda atual (kVA)" req>
              <Inp
                type="number"
                value={atend.demandaAtual}
                onChange={(e) =>
                  setAtend({ ...atend, demandaAtual: e.target.value })
                }
                placeholder="0,0"
              />
            </Field>
            <Field label="Demanda futura (kVA)">
              <div className="readonly-val">{fmt2(demandaPrevTotal)} kVA</div>
            </Field>
          </div>
        </Card>
      )}
      {disjGeralObrigatorio && !trocaDisjGeral && (
        <Card
          eyebrow="Proteção geral"
          title="Disjuntor Geral do Agrupamento"
          sub={`Sugestão automática conforme seletividade (faixa superior ao maior disjuntor das UCs, acima de ${maiorCorrenteUC || "—"} A) e capacidade para a demanda total (${fmt2(demandaPrevTotal)} kVA).`}
        >
          <div className="geral-box" style={{ marginTop: 0 }}>
            <Field label="Disjuntor geral" req>
              <Sel
                value={atend.disjuntorGeral}
                onChange={(e) =>
                  setAtend({ ...atend, disjuntorGeral: e.target.value })
                }
              >
                <option value="">Selecione…</option>
                {opcoesDisjGeral.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </Sel>
            </Field>
            {opcoesDisjGeral.length === 0 && (
              <div className="alert alert-info" style={{ marginTop: 10 }}>
                Preencha os disjuntores das UCs acima para liberar as opções.
              </div>
            )}
            {atend.disjuntorGeral &&
              !opcoesDisjGeral.includes(atend.disjuntorGeral) && (
                <div className="alert alert-warn" style={{ marginTop: 10 }}>
                  ⚠ Esse disjuntor não atende à seletividade (faixa superior ao
                  maior disjuntor das UCs, {maiorCorrenteUC} A) e/ou à
                  capacidade para a demanda total ({fmt2(demandaPrevTotal)}{" "}
                  kVA).
                </div>
              )}
          </div>
        </Card>
      )}

      {hibrido && !validacaoHibrido.ok && (
        <div className="alert alert-warn" style={{ marginBottom: 14 }}>
          <strong>Atendimento híbrido — pendências:</strong>
          <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
            {validacaoHibrido.erros.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}
      {hibrido && validacaoHibrido.ok && (
        <div className="alert alert-ok" style={{ marginBottom: 14 }}>
          Classificação ND 5.1 / ND 5.2 das UCs está consistente.
        </div>
      )}
      <Card
        eyebrow="Identificação"
        title={`Unidades Consumidoras (${ucBlocos.length})`}
        sub="Preencha os dados de identificação de cada UC. Campos com valor padrão já vêm preenchidos. Em Conexão Nova não há disjuntor 'De' (a instalação ainda não existe)."
      >
        {ucBlocos.length > 1 && (
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              marginBottom: 12,
            }}
          >
            <Btn variant="ghost" onClick={replicarUC1Coletivo}>
              ⧉ Replicar UC 1 para todas
            </Btn>
          </div>
        )}
        {ucBlocos.map((u, ui) => (
          <div key={ui} className="uc-block">
            <div className="uc-block-head">
              <span className="uc-block-title">
                {u.identificacao || `UC ${ui + 1}`}
              </span>
              <Badge>
                {ui + 1} de {ucBlocos.length}
              </Badge>
            </div>
            <div className="grid grid-3">
              {hibrido && (
                <Field label="Norma de atendimento">
                  <Sel
                    value={u.nd}
                    onChange={(e) => setBloco(ui, { nd: e.target.value })}
                  >
                    <option value="5.1">ND 5.1</option>
                    <option value="5.2">ND 5.2</option>
                  </Sel>
                </Field>
              )}
              <Field label="Identificação">
                <Inp
                  value={u.identificacao}
                  onChange={(e) =>
                    setBloco(ui, { identificacao: e.target.value })
                  }
                />
              </Field>
              {hibrido && u.nd === "5.1" ? (
                <Field label="Nº Predial" req hint="Distinto entre as UCs">
                  <Inp
                    value={u.nPredial}
                    onChange={(e) => setBloco(ui, { nPredial: e.target.value })}
                  />
                </Field>
              ) : (
                <Field label="Nº Predial">
                  <div className="readonly-val">{obra.num || "Nº Predial"}</div>
                </Field>
              )}
              <Field label="Complemento" req={ucBlocos.length > 1}>
                <Inp
                  value={u.complemento}
                  onChange={(e) =>
                    setBloco(ui, { complemento: e.target.value })
                  }
                  placeholder="999"
                />
              </Field>
              <Field label="Caixa">
                <Inp
                  value={u.caixa}
                  onChange={(e) => setBloco(ui, { caixa: e.target.value })}
                  placeholder="Apartamento"
                />
              </Field>
              <Field label="Solicitação" req>
                <Sel
                  value={u.solicitacao}
                  onChange={(e) =>
                    setBloco(ui, { solicitacao: e.target.value })
                  }
                >
                  <option>Conexão Nova</option>
                  <option>Alteração de Carga</option>
                  <option>Caixa Existente sem Alteração</option>
                </Sel>
              </Field>
              {u.solicitacao === "Alteração de Carga" && (
                <Field label="Mudança de local">
                  <Toggle
                    value={u.mudancaLocal}
                    onChange={(v) => setBloco(ui, { mudancaLocal: v })}
                    options={[
                      { v: "Sim", l: "Sim" },
                      { v: "Não", l: "Não" },
                    ]}
                  />
                </Field>
              )}
              <Field label="Atividade principal" req>
                <Sel
                  value={u.atividade}
                  onChange={(e) => setBloco(ui, { atividade: e.target.value })}
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
                  onChange={(e) => setBloco(ui, { ramo: e.target.value })}
                  placeholder={
                    u.atividade === "Residencial" ? "—" : "Obrigatório"
                  }
                />
              </Field>
              {u.atividade === "Residencial" && (
                <Field
                  label="Área (m²)"
                  req
                  hint="Área privativa do apartamento — usada no cálculo de demanda ND-5.2."
                >
                  <Inp
                    type="number"
                    value={u.area}
                    onChange={(e) => setBloco(ui, { area: e.target.value })}
                    placeholder="Ex: 65"
                  />
                </Field>
              )}
              {u.solicitacao !== "Conexão Nova" && (
                <Field label="Instalação" req>
                  <Inp
                    value={u.instalacao}
                    onChange={(e) =>
                      setBloco(ui, { instalacao: e.target.value })
                    }
                    placeholder="Nº instalação existente"
                  />
                </Field>
              )}
              <Field label="Unidade Consumidora">
                <Inp
                  value={u.unidadeConsumidora}
                  onChange={(e) =>
                    setBloco(ui, { unidadeConsumidora: e.target.value })
                  }
                  placeholder="Identificação da UC (interna/externa)"
                />
              </Field>
              <Field label="Disjuntor" span={3}>
                <div className="disj-pair">
                  {u.solicitacao !== "Conexão Nova" && (
                    <div>
                      <Sel
                        value={u.disjDe}
                        onChange={(e) =>
                          setBloco(ui, { disjDe: e.target.value })
                        }
                      >
                        <option value="">De: (atual)…</option>
                        {DISJ.map((d) => (
                          <option key={d.fx} value={d.fx}>
                            {d.fx}
                          </option>
                        ))}
                      </Sel>
                    </div>
                  )}
                  <div>
                    <Sel
                      value={u.disjPara}
                      onChange={(e) =>
                        setBloco(ui, { disjPara: e.target.value })
                      }
                    >
                      <option value="">
                        {u.solicitacao === "Conexão Nova"
                          ? "Disjuntor solicitado…"
                          : "Para: (solicitado)…"}
                      </option>
                      {DISJ_CN.map((d) => (
                        <option key={d.fx} value={d.fx}>
                          {d.fx}
                        </option>
                      ))}
                    </Sel>
                  </div>
                </div>
              </Field>
            </div>
          </div>
        ))}
      </Card>
    </div>
  );
}

