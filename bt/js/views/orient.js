// ============================================================
// CEMIG BT — Aba: TabOrient  (extraído de js/views.js)
// ============================================================
function TabOrient({ ctx }) {
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
    restrito,
    totalUcsEmpreendimento,
    trocaDisjGeral,
    validacaoDisjuntores,
    validacaoHibrido,
  } = ctx;
  return (
    <Card
      eyebrow="Comece por aqui"
      title="Orientações para preenchimento"
      sub={ORIENTACOES.intro}
    >
      <div
        style={{
          fontWeight: 700,
          color: "var(--verde-escuro)",
          fontSize: 14,
          marginBottom: 4,
        }}
      >
        {ORIENTACOES.geral.titulo}
      </div>
      <ul className="orient-list">
        {ORIENTACOES.geral.itens.map((it, i) => (
          <li key={i} className="orient-item">
            <span className="orient-num">{i + 1}</span>
            <p>{it}</p>
          </li>
        ))}
      </ul>
      <div
        style={{
          fontWeight: 700,
          color: "var(--verde-escuro)",
          fontSize: 14,
          margin: "18px 0 4px",
        }}
      >
        {ORIENTACOES.individual.titulo}
      </div>
      <ul className="orient-list">
        {ORIENTACOES.individual.itens.map((it, i) => (
          <li key={i} className="orient-item">
            <span className="orient-num">{i + 1}</span>
            <p>{it}</p>
          </li>
        ))}
      </ul>
      {!restrito && (
        <React.Fragment>
          <div
            style={{
              fontWeight: 700,
              color: "var(--verde-escuro)",
              fontSize: 14,
              margin: "18px 0 4px",
            }}
          >
            {ORIENTACOES.coletivo.titulo}
          </div>
          <ul className="orient-list">
            {ORIENTACOES.coletivo.itens.map((it, i) => (
              <li key={i} className="orient-item">
                <span className="orient-num">{i + 1}</span>
                <p>{it}</p>
              </li>
            ))}
          </ul>
        </React.Fragment>
      )}
      <div className="callout">{ORIENTACOES.callout}</div>
      <div className="legend">
        <span>
          <span className="req">*</span> Campo de preenchimento obrigatório
        </span>
        <span>
          <span className="req">**</span> Obrigatório para pessoa física
        </span>
      </div>
      <div style={{ marginTop: 16 }}>
        <Btn variant="primary" onClick={irProx}>
          Iniciar preenchimento →
        </Btn>
      </div>
    </Card>
  );
}

