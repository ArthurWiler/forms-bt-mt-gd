// ============================================================
// CEMIG BT — Aba: TabCargasColetivo  (extraído de js/views.js)
// ============================================================
function TabCargasColetivo({ ctx }) {
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
    areaMediaPonderada,
    coletivo,
    coordObrigatoria,
    coordPreenchida,
    demandaApartamentosND52,
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
    quantidadeApartamentos,
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
    temUCNaoResidencial,
    totalUcsEmpreendimento,
    trocaDisjGeral,
    validacaoDisjuntores,
    validacaoHibrido,
  } = ctx;
  return (
    <Card
      eyebrow="Carga do agrupamento"
      title="Previsão de Carga por Unidade Consumidora"
      sub="Informe a previsão de carga instalada (kW) de cada UC. A demanda total do agrupamento é calculada separadamente: parte residencial pelo ND-5.2, parte não residencial pelo campo abaixo."
    >
      {ucBlocos.length > 1 && (
        <div className="prev-toolbar">
          <Btn variant="ghost" onClick={replicarPrevTodas}>
            Replicar previsão da UC 1 para todas
          </Btn>
        </div>
      )}
      {quantidadeApartamentos > 0 &&
        (demandaApartamentosND52 ? (
          <div className="alert alert-ok" style={{ marginBottom: 14 }}>
            <b>Demanda dos apartamentos residenciais (ND-5.2):</b>{" "}
            {quantidadeApartamentos} apartamento(s) · área média ponderada{" "}
            {fmt2(areaMediaPonderada)} m² · Fator F{" "}
            {fmt2(demandaApartamentosND52.fatorF)} · A{" "}
            {fmt2(demandaApartamentosND52.demandaAreaA)} → D ={" "}
            {fmt2(demandaApartamentosND52.demandaKVA)} kVA (incluída
            automaticamente na demanda total abaixo).
          </div>
        ) : quantidadeApartamentos < 4 ? (
          <div className="alert alert-info" style={{ marginBottom: 14 }}>
            ND-5.2 exige no mínimo 4 apartamentos para o cálculo automático
            (atualmente {quantidadeApartamentos}). Informe a demanda
            manualmente para as UCs residenciais abaixo.
          </div>
        ) : (
          <div className="alert alert-warn" style={{ marginBottom: 14 }}>
            Área média ponderada inválida ou superior a 1000 m² (
            {fmt2(areaMediaPonderada)} m²). Confira a área de cada apartamento
            ou informe a demanda manualmente.
          </div>
        ))}
      {temUCNaoResidencial && (
        <div className="grid grid-2" style={{ marginBottom: 14 }}>
          <Field
            label="Demanda geral não residencial (kVA)"
            req
            hint="Demanda calculada pelo responsável técnico para o conjunto das UCs não residenciais (comercial/industrial/rural) do empreendimento — não é a soma das UCs abaixo."
          >
            <Inp
              type="number"
              value={atend.demandaNaoResidencial}
              onChange={(e) =>
                setAtend({ ...atend, demandaNaoResidencial: e.target.value })
              }
              placeholder="0,0"
            />
          </Field>
        </div>
      )}
      <div className="prev-table-wrap">
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
              <th className="col-demanda">Demanda (kVA) *</th>
            </tr>
          </thead>
          <tbody>
            {ucBlocos.map((u, ui) => (
              <tr key={ui}>
                <td className="uc-name">{u.identificacao || `UC ${ui + 1}`}</td>
                {["ilum", "tomada", "chuveiro", "ar", "outros"].map((k) => (
                  <td key={k}>
                    <input
                      type="number"
                      value={(u.prev || {})[k] || ""}
                      onChange={(e) =>
                        setBlocoPrev(ui, { [k]: e.target.value })
                      }
                      placeholder="0,0"
                    />
                  </td>
                ))}
                <td className="carga-cell">{fmt2(prevKwUC(u))}</td>
                <td className="col-demanda">
                  <input
                    className="demanda-prev"
                    type="number"
                    value={(u.prev || {}).demanda || ""}
                    onChange={(e) =>
                      setBlocoPrev(ui, { demanda: e.target.value })
                    }
                    placeholder="0,0"
                  />
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td className="uc-name">Total</td>
              <td colSpan={5}></td>
              <td className="carga-cell">{fmt2(prevTotalKw)}</td>
              <td className="col-demanda total-dem">
                {fmt2(demandaPrevTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
      <div className="prev-total" style={{ marginTop: 14 }}>
        <div className="kpi">
          <div className="kpi-label">Total Carga Instalada</div>
          <div className="kpi-value">{fmt2(prevTotalKw)} kW</div>
        </div>
        <div className="kpi dark">
          <div className="kpi-label">Demanda do atendimento</div>
          <div className="kpi-value" style={{ fontSize: 18 }}>
            {fmt2(demandaTotalGeral)} kVA
          </div>
        </div>
      </div>
      {demandaTotalGeral > 304 && (
        <div className="alert alert-info" style={{ marginTop: 14 }}>
          Demanda total acima de 304 kVA: o atendimento fica condicionado à
          apresentação do projeto elétrico com ART/TRT.
        </div>
      )}
    </Card>
  );
}

