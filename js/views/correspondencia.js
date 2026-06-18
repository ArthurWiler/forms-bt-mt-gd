// ============================================================
// CEMIG BT — Aba: TabCorrespondencia  (extraído de js/views.js)
// ============================================================
function TabCorrespondencia({ ctx }) {
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
      eyebrow="Dados"
      title="Correspondência e Fatura"
      sub="Como o cliente deseja receber a conta de energia."
    >
      <div className="grid grid-2">
        <Field label="Deseja receber a fatura no e-mail informado?" req>
          <Toggle
            value={corr.receberEmail}
            onChange={(v) => setCorr({ ...corr, receberEmail: v })}
            options={[
              { v: "Sim", l: "Sim" },
              { v: "Não", l: "Não" },
            ]}
          />
        </Field>
        <Field label="Data de Vencimento da Fatura">
          <Toggle
            value={corr.vencimento}
            onChange={(v) => setCorr({ ...corr, vencimento: v })}
            options={DIAS_VENCIMENTO.map((d) => ({ v: d, l: d }))}
          />
        </Field>
      </div>
      {corr.receberEmail === "Não" && (
        <div className="divider">
          <Field label="Como deseja receber a fatura?" req>
            <Toggle
              value={corr.alternativa}
              onChange={(v) => setCorr({ ...corr, alternativa: v })}
              options={[
                { v: "Endereço novo", l: "Novo endereço" },
                { v: "Mesmo da obra", l: "Endereço da obra" },
                { v: "Outro e-mail", l: "Outro e-mail" },
              ]}
            />
          </Field>

          {corr.alternativa === "Mesmo da obra" && (
            <div className="alert alert-info" style={{ marginTop: 12 }}>
              A fatura será enviada para o endereço informado em{" "}
              <strong>Dados da Obra</strong>.
            </div>
          )}

          {corr.alternativa === "Outro e-mail" && (
            <div className="grid grid-2" style={{ marginTop: 12 }}>
              <Field label="E-mail para envio da fatura" span={2} req>
                <Inp
                  type="email"
                  value={corr.outroEmail}
                  onChange={(e) =>
                    setCorr({ ...corr, outroEmail: e.target.value })
                  }
                  placeholder="email@exemplo.com"
                />
              </Field>
            </div>
          )}

          {corr.alternativa === "Endereço novo" && (
            <div className="grid grid-2" style={{ marginTop: 12 }}>
              <Field label="CEP" span={2}>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <div style={{ maxWidth: 180 }}>
                    <Inp
                      value={corr.cep}
                      onChange={(e) => {
                        const v = mascararCEP(e.target.value);
                        setCorr({ ...corr, cep: v });
                        buscarCEP(v, "corr");
                      }}
                      placeholder="00000-000"
                    />
                  </div>
                  {cepStatus.corr === "buscando" && (
                    <span className="spinner"></span>
                  )}
                  {cepStatus.corr === "ok" && (
                    <Badge>Endereço encontrado</Badge>
                  )}
                  {cepStatus.corr === "erro" && (
                    <span style={{ color: "var(--vermelho)", fontSize: 12 }}>
                      CEP não encontrado
                    </span>
                  )}
                </div>
              </Field>
              <Field label="Rua / Av." span={2}>
                <Inp
                  value={corr.rua}
                  onChange={(e) => setCorr({ ...corr, rua: e.target.value })}
                />
              </Field>
              <Field label="Nº">
                <Inp
                  value={corr.num}
                  onChange={(e) => setCorr({ ...corr, num: e.target.value })}
                />
              </Field>
              <Field label="Complemento">
                <Inp
                  value={corr.compl}
                  onChange={(e) => setCorr({ ...corr, compl: e.target.value })}
                />
              </Field>
              <Field label="Bairro / Distrito">
                <Inp
                  value={corr.bairro}
                  onChange={(e) => setCorr({ ...corr, bairro: e.target.value })}
                />
              </Field>
              <Field label="Município">
                <Inp
                  value={corr.municipio}
                  onChange={(e) =>
                    setCorr({ ...corr, municipio: e.target.value })
                  }
                />
              </Field>
              <Field label="Estado">
                <Inp
                  value={corr.estado}
                  onChange={(e) => setCorr({ ...corr, estado: e.target.value })}
                />
              </Field>
            </div>
          )}
        </div>
      )}
      <div style={{ marginTop: 14 }}>
        <Field label="Conta globalizada (poder público — código de débito automático globalizado)">
          <Inp
            value={corr.contaGlobal}
            onChange={(e) => setCorr({ ...corr, contaGlobal: e.target.value })}
            placeholder="Opcional"
          />
        </Field>
      </div>
    </Card>
  );
}

