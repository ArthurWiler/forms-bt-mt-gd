// ============================================================
// CEMIG BT — Aba: TabTipo  (extraído de js/views.js)
// ============================================================
function TabTipo({ ctx }) {
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
    <Card
      eyebrow="Etapa 1"
      title="Tipo de Atendimento"
      sub="O tipo de formulário é definido pela presença ou não de disjuntor geral. Os campos seguintes se adaptam à sua escolha."
    >
      <div className="grid grid-2 divider">
        <Field label="Solicitação" req>
          <Sel
            value={atend.solicitacao}
            disabled={restrito}
            onChange={(e) =>
              setAtend({ ...atend, solicitacao: e.target.value })
            }
          >
            {SOLICITACOES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Sel>
        </Field>
        <Field label="Escopo do Atendimento" req>
          <Sel
            value={atend.escopo}
            onChange={(e) => setAtend({ ...atend, escopo: e.target.value })}
          >
            {(ESCOPOS[atend.solicitacao] || []).map((s) => (
              <option key={s}>{s}</option>
            ))}
          </Sel>
        </Field>
        {multiTorres && (
          <React.Fragment>
            <Field label="Atendimento a">
              <Toggle
                value={atend.atendA}
                onChange={(v) => setAtend({ ...atend, atendA: v })}
                options={[
                  { v: "Bloco", l: "Bloco" },
                  { v: "Torre", l: "Torre" },
                ]}
              />
            </Field>
            <Field label="Nº de Blocos / Torres" req>
              <Inp
                type="number"
                value={atend.nBlocos}
                onChange={(e) =>
                  setAtend({
                    ...atend,
                    nBlocos: Math.max(1, parseInt(e.target.value)),
                  })
                }
              />
            </Field>
          </React.Fragment>
        )}
      </div>

      <div className="grid grid-2">
        <Field label="Possui disjuntor geral (proteção geral)?" req>
          <Toggle
            value={atend.disjGeral}
            disabled={restrito}
            onChange={(v) => setAtend({ ...atend, disjGeral: v })}
            options={[
              { v: "Não", l: "Não" },
              { v: "Sim", l: "Sim" },
            ]}
          />
        </Field>
        {!multiTorres && (
          <Field label="Nº de Unidades Consumidoras" req>
            <Inp
              type="number"
              max={restrito ? 3 : undefined}
              value={atend.nUCs}
              onChange={(e) => {
                const n = restrito
                  ? Math.min(3, Math.max(1, parseInt(e.target.value) || 1))
                  : Math.max(1, parseInt(e.target.value));
                setAtend({
                  ...atend,
                  nUCs: n,
                  disjGeral: restrito ? "Não" : n > 3 ? "Sim" : "Não",
                });
              }}
              options={[
                { v: true, l: "Sim" },
                { v: false, l: "Não" },
              ]}
            />
          </Field>
        )}
      </div>

      <div className="grid grid-2 divider">
        <Field label="Há múltiplas unidades consumidoras com proteção acima de 63 A?">
          <Toggle
            value={atend.biAcima63}
            disabled={restrito}
            onChange={(v) =>
              setAtend({
                ...atend,
                biAcima63: v,
                triAcima63: v,
                disjGeral: v ? "Sim" : "Não", // converte booleano para string
              })
            }
            options={[
              { v: true, l: "Sim" },
              { v: false, l: "Não" },
            ]}
          />
        </Field>
      </div>

      <div
        className={"alert " + (coletivo ? "alert-ok" : "alert-info")}
        style={{ marginTop: 16 }}
      >
        {multiTorres
          ? "Atendimento caracterizado como empreendimento com 'Múltiplas Torres ou Blocos'."
          : coletivo
            ? "Atendimento caracterizado como 'Coletivo'."
            : "Atendimento caracterizado como 'Individual'."}
      </div>
    </Card>
  );
}

