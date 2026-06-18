// ============================================================
// CEMIG BT — Aba: TabCargasIndividual  (extraído de js/views.js)
// ============================================================
function TabCargasIndividual({ ctx }) {
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
    restrito,
    setUcTorrePrev,
    sincronizarUCsTorre,
    totalUcsEmpreendimento,
    trocaDisjGeral,
    validacaoDisjuntores,
    validacaoHibrido,
  } = ctx;
  return (
    <div>
      {ucsDet.length > 1 && (
        <div
          className={
            "alert " + (validacaoDisjuntores.ok ? "alert-ok" : "alert-warn")
          }
        >
          <b>Regra de disjuntores:</b> máx. 1 tripolar 63 A e/ou 2
          mono/bifásicos 63 A. {validacaoDisjuntores.ok ? "✔ " : "⚠ "}
          {validacaoDisjuntores.msg}
        </div>
      )}
      {ucsDet.map((u, ui) => (
        <Card
          key={ui}
          eyebrow={`UC ${ui + 1} de ${ucsDet.length}`}
          title={`Cargas da Unidade Consumidora ${ui + 1}`}
          sub="Detalhe os equipamentos. A demanda e o disjuntor são calculados automaticamente (ND-5.1)."
        >
          <CalcDemanda
            data={u.cargas}
            onChange={(c) => setUcDet(ui, { cargas: c })}
            redeMono={redeMono}
            atividade={u.atividade}
            minimizarPorPadrao={restrito}
          />
          <div className="kpi-row" style={{ marginTop: 12 }}>
            <div className="kpi">
              <div className="kpi-label">Carga Instalada</div>
              <div className="kpi-value">
                {fmt2(u.cargas?._cargaKw || 0)} kW
              </div>
            </div>
            <div className="kpi">
              <div className="kpi-label">Demanda Calculada</div>
              <div className="kpi-value">
                {fmt2(u.cargas?._demanda || 0)} kVA
              </div>
            </div>
            <div className="kpi dark">
              <div className="kpi-label">Disjuntor Sugerido</div>
              <div className="kpi-value">
                {u.cargas?._disjuntores?.length
                  ? u.cargas._disjuntores.join(" · ")
                  : "—"}
              </div>
            </div>
          </div>
          {u.cargas?._disjuntores?.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <Field label={`Disjuntor escolhido para a UC ${ui + 1}`}>
                <Sel
                  value={u.disjEscolhido || u.cargas._disjuntores[0]}
                  onChange={(e) =>
                    setUcDet(ui, { disjEscolhido: e.target.value })
                  }
                >
                  {u.cargas._disjuntores.map((dj) => (
                    <option key={dj} value={dj}>
                      {dj}
                    </option>
                  ))}
                </Sel>
              </Field>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

