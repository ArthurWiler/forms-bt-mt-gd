// ============================================================
// CEMIG BT — Aba: TabRevisar  (extraído de js/views.js)
// ============================================================
function TabRevisar({ ctx }) {
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
        eyebrow="Etapa final"
        title="Prévia do Formulário"
        sub="Confira os dados. Se algo estiver incorreto, volte às etapas anteriores pela barra lateral."
      >
        <div className="kpi-row">
          <div className="kpi">
            <div className="kpi-label">Proprietário</div>
            <div className="kpi-value" style={{ fontSize: 14 }}>
              {prop.nome || "—"}
            </div>
          </div>
          <div className="kpi">
            <div className="kpi-label">Unidades Consumidoras</div>
            <div className="kpi-value">
              {multiTorres
                ? totalUcsEmpreendimento
                : coletivo
                  ? ucBlocos.length
                  : ucsDet.length}
            </div>
          </div>
          <div className="kpi dark">
            <div className="kpi-label">Demanda Total</div>
            <div className="kpi-value" style={{ fontSize: 18 }}>
              {fmt2(demandaTotalGeral)} kVA
            </div>
          </div>
        </div>
        <div className="preview-block">
          <h4>Modalidade</h4>
          <div className="preview-item">
            <span className="v">
              {multiTorres
                ? `Múltiplas Torres/Blocos · ${blocos.length} ${atend.atendA.toLowerCase()}(s)`
                : coletivo
                  ? "Coletivo — Agrupamento com Proteção Geral (APR Web)"
                  : "Individual / até 3 caixas sem proteção geral"}
              {coletivo ? ` · ${atend.solicitacao} · ${atend.escopo}` : ""}
              {!multiTorres && atend.disjuntorGeral
                ? ` · Disjuntor geral: ${atend.disjuntorGeral}`
                : ""}
            </span>
          </div>
        </div>
        <div className="preview-block">
          <h4>Obra</h4>
          <div className="preview-grid">
            <div className="preview-item">
              <span className="k">Endereço</span>
              <span className="v">
                {obra.endereco || "—"}, {obra.num || "s/n"}
              </span>
            </div>
            <div className="preview-item">
              <span className="k">Cidade / UF</span>
              <span className="v">
                {obra.cidade || "—"} / {obra.estado}
              </span>
            </div>
            <div className="preview-item">
              <span className="k">Localização</span>
              <span className="v">{obra.localizacao}</span>
            </div>
            <div className="preview-item">
              <span className="k">Coordenada</span>
              <span className="v">
                {[obra.lat, obra.lng].filter(Boolean).join(", ") || "—"}
              </span>
            </div>
          </div>
        </div>
        {multiTorres ? (
          <div className="preview-block">
            <h4>Torres / Blocos</h4>
            {blocos.map((b, bi) => (
              <div
                key={bi}
                className="preview-item"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span className="v">
                  {atend.atendA} {b.nome || bi + 1} · {b.qtdUCs || 0} UCs ·
                  Geral: {b.disjGeral || "—"} · Incêndio:{" "}
                  {b.disjIncendio || "—"}
                </span>
                <span style={{ color: "var(--verde)", fontWeight: 700 }}>
                  {fmt2(
                    (b.ucs || []).reduce(
                      (s, u) => s + num((u.prev || {}).demanda),
                      0,
                    ) + num(b.demandaIncendio),
                  )}{" "}
                  kVA
                </span>
              </div>
            ))}
          </div>
        ) : coletivo ? (
          <div className="preview-block">
            <h4>Previsão de carga e UCs</h4>
            <div className="preview-item">
              <span className="v">
                Total {fmt2(prevTotalKw)} kW · Demanda {fmt2(demandaTotalGeral)}{" "}
                kVA
              </span>
            </div>
            {ucBlocos.map((u, ui) => (
              <div
                key={ui}
                className="preview-item"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span className="v">
                  {u.identificacao || `UC ${ui + 1}`} · {u.atividade} ·{" "}
                  {u.solicitacao} {u.complemento ? `· ${u.complemento}` : ""}
                </span>
                <span style={{ color: "var(--verde)", fontWeight: 700 }}>
                  {u.disjPara || "—"}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="preview-block">
            <h4>Unidades Consumidoras</h4>
            {ucsDet.map((u, ui) => (
              <div
                key={ui}
                className="preview-item"
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                }}
              >
                <span className="v">
                  UC {ui + 1} · {u.atividade} · {u.solicitacao}{" "}
                  {u.complemento ? `· ${u.complemento}` : ""}
                </span>
                <span style={{ color: "var(--verde)", fontWeight: 700 }}>
                  {fmt2(u.cargas?._demanda || 0)} kVA ·{" "}
                  {u.disjEscolhido || (u.cargas?._disjuntores || [])[0] || "—"}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card sub="Anexe à solicitação: planta de situação (A4), ART/TRT de projeto (quando aplicável) e documentos de regularidade do imóvel, conforme as orientações da CEMIG.">
        {hibrido && !validacaoHibrido.ok && (
          <div className="alert alert-warn" style={{ marginBottom: 12 }}>
            Corrija as pendências do atendimento híbrido (aba Unidades
            Consumidoras) para liberar a exportação do PDF.
          </div>
        )}
        {!ctx.validacaoObrigatorios.ok && (
          <div className="alert alert-warn" style={{ marginBottom: 12 }}>
            <strong>Preencha os campos obrigatórios para liberar o PDF:</strong>
            <ul style={{ margin: "6px 0 0 18px" }}>
              {ctx.validacaoObrigatorios.faltando.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>
          </div>
        )}
        <Btn
          variant="dark"
          onClick={gerarPDF}
          disabled={
            !ctx.validacaoObrigatorios.ok || (hibrido && !validacaoHibrido.ok)
          }
        >
          📄 Exportar PDF
        </Btn>
      </Card>
    </div>
  );
}
