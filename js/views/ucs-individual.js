// ============================================================
// CEMIG BT — Aba: TabUcsIndividual  (extraído de js/views.js)
// ============================================================
function TabUcsIndividual({ ctx }) {
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
    restrito,
    sincronizarUCsTorre,
    totalUcsEmpreendimento,
    trocaDisjGeral,
    validacaoDisjuntores,
    validacaoHibrido,
  } = ctx;
  return (
    <div>
      <Card
        eyebrow="Identificação"
        title={`Unidades Consumidoras (${ucsDet.length})`}
        sub="Dados de identificação de cada unidade consumidora. O detalhamento das cargas é feito na próxima etapa. Em Conexão Nova não há disjuntor 'De' nem instalação."
      >
        {ucsDet.map((u, ui) => (
          <div key={ui} className="uc-block">
            <div className="uc-block-head">
              <span className="uc-block-title">UC {ui + 1}</span>
              <Badge>
                {ui + 1} de {ucsDet.length}
              </Badge>
            </div>
            <div className="grid grid-3">
              <Field label="Tipo de solicitação" req>
                <Sel
                  value={u.solicitacao}
                  onChange={(e) =>
                    setUcDet(ui, { solicitacao: e.target.value })
                  }
                >
                  <option>Conexão Nova</option>
                  <option>Alteração de Carga</option>
                  <option>Caixa Existente sem Alteração</option>
                </Sel>
              </Field>
              <Field label="Atividade principal" req>
                <Sel
                  value={u.atividade}
                  disabled={restrito}
                  onChange={(e) => setUcDet(ui, { atividade: e.target.value })}
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
                  disabled={restrito}
                  onChange={(e) => setUcDet(ui, { ramo: e.target.value })}
                  placeholder={
                    u.atividade === "Residencial" ? "—" : "Obrigatório"
                  }
                />
              </Field>
              <Field label="Nº Predial">
                <div className="readonly-val">{obra.num || "Nº Predial"}</div>
              </Field>
              <Field label="Complemento" req={ucsDet.length > 1}>
                <Inp
                  value={u.complemento}
                  onChange={(e) =>
                    setUcDet(ui, { complemento: e.target.value })
                  }
                  placeholder="Casa 1"
                />
              </Field>
              <Field label="Caixa / Identificação">
                <Inp
                  value={u.caixa}
                  onChange={(e) => setUcDet(ui, { caixa: e.target.value })}
                />
              </Field>
              <Field label="Unidade Consumidora">
                <Inp
                  value={u.unidadeConsumidora}
                  onChange={(e) =>
                    setUcDet(ui, { unidadeConsumidora: e.target.value })
                  }
                  placeholder="Identificação da UC (interna/externa)"
                />
              </Field>
              {u.solicitacao !== "Conexão Nova" && (
                <React.Fragment>
                  <Field label="Nº Instalação / Medidor" req>
                    <Inp
                      value={u.instalacao}
                      onChange={(e) =>
                        setUcDet(ui, { instalacao: e.target.value })
                      }
                    />
                  </Field>
                  <Field label="Disjuntor atual">
                    <Sel
                      value={u.disjDe}
                      onChange={(e) => setUcDet(ui, { disjDe: e.target.value })}
                    >
                      <option value="">Selecione…</option>
                      {DISJ.map((d) => (
                        <option key={d.fx} value={d.fx}>
                          {d.fx}
                        </option>
                      ))}
                    </Sel>
                  </Field>
                  {u.solicitacao === "Alteração de Carga" && (
                    <Field label="Mudança de local">
                      <Toggle
                        value={u.mudancaLocal}
                        onChange={(v) => setUcDet(ui, { mudancaLocal: v })}
                        options={[
                          { v: "Sim", l: "Sim" },
                          { v: "Não", l: "Não" },
                        ]}
                      />
                    </Field>
                  )}
                </React.Fragment>
              )}
            </div>
          </div>
        ))}
      </Card>
      {ucsDet.length > 1 && (
        <div
          className={
            "alert " + (validacaoDisjuntores.ok ? "alert-ok" : "alert-warn")
          }
        >
          <b>Regra de disjuntores (múltiplas UCs sem proteção geral):</b> no
          máximo 1 tripolar de 63 A e/ou até 2 mono/bifásicos de 63 A.{" "}
          {validacaoDisjuntores.ok ? "✔ " : "⚠ "}
          {validacaoDisjuntores.msg}
        </div>
      )}
    </div>
  );
}

