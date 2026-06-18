// ============================================================
// CEMIG BT — Aba: TabGerador  (extraído de js/views.js)
// ============================================================
function TabGerador({ ctx }) {
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
    <Card
      eyebrow="Complementar"
      title="Gerador de Emergência"
      sub="Informe se a instalação possui gerador de emergência."
    >
      <Field label="Há gerador de emergência?" req>
        <Toggle
          value={gerador.possui}
          onChange={(v) => setGerador({ ...gerador, possui: v })}
          options={[
            { v: "Sim", l: "Sim" },
            { v: "Não", l: "Não" },
          ]}
        />
      </Field>
      {gerador.possui === "Sim" && (
        <div className="grid grid-2" style={{ marginTop: 14 }}>
          <Field label="Potência do gerador (kVA)">
            <Inp
              value={gerador.potencia}
              onChange={(e) =>
                setGerador({ ...gerador, potencia: e.target.value })
              }
            />
          </Field>
          <Field label="Fonte / Combustível">
            <Sel
              value={gerador.fonte}
              onChange={(e) =>
                setGerador({ ...gerador, fonte: e.target.value })
              }
            >
              <option value="">Selecione</option>
              <option>Diesel</option>
              <option>Gasolina</option>
              <option>Gás (GLP/GNV)</option>
              <option>Outro</option>
            </Sel>
          </Field>
          <Field label="Descrição / Observações do gerador" span={2}>
            <Inp
              value={gerador.descricao}
              onChange={(e) =>
                setGerador({ ...gerador, descricao: e.target.value })
              }
              placeholder="Modelo, finalidade, regime de operação..."
            />
          </Field>
          <div className="col-span-2 callout">
            O gerador de emergência opera de forma isolada (sem paralelismo com
            a rede CEMIG).
          </div>
        </div>
      )}
    </Card>
  );
}

