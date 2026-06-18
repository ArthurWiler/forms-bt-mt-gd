/* ============================================================
   CEMIG — Abas (componentes de visão). JSX via Babel.
   Cada aba recebe `ctx` (estado/handlers do App) e o desestrutura.
   ============================================================ */
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

function TabProprietario({ ctx }) {
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
      title="Dados do Proprietário"
      sub="Titular da conta de energia ou proprietário/possuidor do imóvel. (*) obrigatório · (**) obrigatório para pessoa física."
    >
      <div className="grid grid-2">
        <Field label="Nome Completo (sem abreviações)" req span={2}>
          <Inp
            value={prop.nome}
            onChange={(e) => setProp({ ...prop, nome: e.target.value })}
          />
        </Field>
        <Field
          label="CPF / CNPJ"
          req
          hint={
            docInfo.valido === false
              ? `${docInfo.tipo} inválido — verifique os dígitos.`
              : docInfo.valido === true
                ? `${docInfo.tipo} válido.`
                : "Digite CPF (pessoa física) ou CNPJ (pessoa jurídica)."
          }
        >
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={prop.cpfCnpj || ""}
              onChange={(e) => {
                const m = mascararCpfCnpj(e.target.value);
                setProp({ ...prop, cpfCnpj: m });
                if (ehCNPJ(m)) buscarCNPJ(m);
                else setCnpjStatus("");
              }}
              placeholder="000.000.000-00"
              style={{
                borderColor:
                  docInfo.valido === false ? "var(--vermelho)" : undefined,
              }}
            />
            {cnpjStatus === "buscando" && <span className="spinner"></span>}
            {cnpjStatus === "ok" && <Badge>dados preenchidos</Badge>}
            {cnpjStatus === "erro" && (
              <span style={{ color: "var(--vermelho)", fontSize: 12 }}>
                CNPJ não encontrado
              </span>
            )}
          </div>
        </Field>
        <Field label="E-mail" req>
          <Inp
            type="email"
            value={prop.email}
            onChange={(e) => setProp({ ...prop, email: e.target.value })}
          />
        </Field>
        {pessoaFisica && (
          <Field label="Filiação (Mãe ou Pai) **">
            <Inp
              value={prop.filiacao}
              onChange={(e) => setProp({ ...prop, filiacao: e.target.value })}
            />
          </Field>
        )}
        {pessoaFisica && (
          <Field label="RG / RNE / RANI **">
            <Inp
              value={prop.rg}
              onChange={(e) =>
                setProp({ ...prop, rg: mascararRG(e.target.value) })
              }
            />
          </Field>
        )}
        {pessoaFisica && (
          <Field label="Data de Nascimento **">
            <Inp
              type="date"
              value={prop.nasc}
              onChange={(e) => setProp({ ...prop, nasc: e.target.value })}
            />
          </Field>
        )}
        <Field label="Celular" req>
          <Inp
            value={prop.celular}
            onChange={(e) =>
              setProp({
                ...prop,
                celular: mascararCelular(e.target.value),
              })
            }
          />
        </Field>
        <Field label="Telefone Fixo">
          <Inp
            value={prop.fixo}
            onChange={(e) =>
              setProp({ ...prop, fixo: mascararFixo(e.target.value) })
            }
          />
        </Field>
        <Field label="Telefone do Proprietário" req>
          <Inp
            value={prop.telProp}
            onChange={(e) =>
              setProp({
                ...prop,
                telProp: mascararTelefone(e.target.value),
              })
            }
          />
        </Field>
        {pessoaFisica && (
          <Field
            label="Possui laudo médico (equipamentos essenciais)? **"
            span={2}
          >
            <Toggle
              value={prop.laudoMedico}
              onChange={(v) => setProp({ ...prop, laudoMedico: v })}
              options={[
                { v: "Sim", l: "Sim" },
                { v: "Não", l: "Não" },
              ]}
            />
          </Field>
        )}
        {pessoaFisica && (
          <Field label="Possui NIS para Tarifa Social? **">
            <Toggle
              value={prop.nis}
              onChange={(v) => setProp({ ...prop, nis: v })}
              options={[
                { v: "Sim", l: "Sim" },
                { v: "Não", l: "Não" },
              ]}
            />
          </Field>
        )}
        {pessoaFisica && prop.nis === "Sim" && (
          <Field label="Número do NIS" req>
            <Inp
              value={prop.numNis}
              onChange={(e) => setProp({ ...prop, numNis: e.target.value })}
            />
          </Field>
        )}
      </div>
    </Card>
  );
}

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

function TabObra({ ctx }) {
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
      title="Dados da Obra"
      sub="Endereço do padrão de entrada / ponto de entrega."
    >
      <div className="grid grid-2">
        <Field label="Zona de localização" req>
          <Toggle
            value={obra.localizacao}
            onChange={(v) => setObra({ ...obra, localizacao: v })}
            options={[
              { v: "Urbana", l: "Urbana" },
              { v: "Rural", l: "Rural" },
            ]}
          />
        </Field>
        {coletivo && (
          <Field label="Nº ART/TRT de Projeto" req>
            <Inp
              value={obra.art}
              onChange={(e) => setObra({ ...obra, art: e.target.value })}
            />
          </Field>
        )}
      </div>
      {obra.localizacao === "Urbana" && (
        <div className="grid grid-2" style={{ marginTop: 14 }}>
          <Field label="CEP" req span={2}>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <div style={{ maxWidth: 180 }}>
                <Inp
                  value={obra.cep}
                  onChange={(e) => {
                    const v = mascararCEP(e.target.value);
                    setObra({ ...obra, cep: v });
                    buscarCEP(v, "obra");
                  }}
                  placeholder="00000-000"
                />
              </div>
              {cepStatus.obra === "buscando" && (
                <span className="spinner"></span>
              )}
              {cepStatus.obra === "ok" && <Badge>Endereço encontrado</Badge>}
              {cepStatus.obra === "erro" && (
                <span style={{ color: "var(--vermelho)", fontSize: 12 }}>
                  CEP não encontrado
                </span>
              )}
            </div>
          </Field>
          <Field label="Endereço" req span={2}>
            <Inp
              value={obra.endereco}
              onChange={(e) => setObra({ ...obra, endereco: e.target.value })}
            />
          </Field>
          <Field label="Nº" req>
            <Inp
              value={obra.num}
              onChange={(e) => setObra({ ...obra, num: e.target.value })}
            />
          </Field>
          <Field label="Complemento">
            <Inp
              value={obra.compl}
              onChange={(e) => setObra({ ...obra, compl: e.target.value })}
            />
          </Field>
          <Field label="Bairro" req>
            <Inp
              value={obra.bairro}
              onChange={(e) => setObra({ ...obra, bairro: e.target.value })}
            />
          </Field>
          <Field label="Cidade / Município" req>
            <Inp
              value={obra.cidade}
              onChange={(e) => setObra({ ...obra, cidade: e.target.value })}
            />
          </Field>
          <Field label="Estado" req>
            <Inp
              value={obra.estado}
              onChange={(e) => setObra({ ...obra, estado: e.target.value })}
            />
          </Field>
        </div>
      )}
      {obra.localizacao === "Rural" && (
        <div className="grid grid-2" style={{ marginTop: 14 }}>
          <Field label="Município" req>
            <Inp
              value={obra.cidade}
              onChange={(e) => setObra({ ...obra, cidade: e.target.value })}
            />
          </Field>
          <Field label="Estado" req>
            <Inp
              value={obra.estado}
              onChange={(e) => setObra({ ...obra, estado: e.target.value })}
            />
          </Field>
          <Field label="Distrito / Comunidade / Região">
            <Inp
              value={obra.distritoComunidade}
              onChange={(e) =>
                setObra({ ...obra, distritoComunidade: e.target.value })
              }
            />
          </Field>
          <Field label="Nome da propriedade">
            <Inp
              value={obra.nomePropriedade}
              onChange={(e) =>
                setObra({ ...obra, nomePropriedade: e.target.value })
              }
            />
          </Field>
          <Field label="Ponto de referência">
            <Inp
              value={obra.pontoRef}
              onChange={(e) => setObra({ ...obra, pontoRef: e.target.value })}
            />
          </Field>
          <Field label="Nº instalação mais próxima">
            <Inp
              value={obra.instProxima}
              onChange={(e) =>
                setObra({ ...obra, instProxima: e.target.value })
              }
            />
          </Field>
        </div>
      )}
      <div className="grid grid-2 divider">
        <Field
          label={coordObrigatoria ? "Latitude" : "Latitude — opcional"}
          req={coordObrigatoria}
        >
          <Inp
            value={obra.lat}
            onChange={(e) => setObra({ ...obra, lat: e.target.value })}
            placeholder=""
          />
        </Field>
        <Field
          label={coordObrigatoria ? "Longitude" : "Longitude — opcional"}
          req={coordObrigatoria}
        >
          <Inp
            value={obra.lng}
            onChange={(e) => setObra({ ...obra, lng: e.target.value })}
            placeholder=""
          />
        </Field>
      </div>
      <div className="grid grid-2 divider">
        <Field label="Distância padrão→rede CEMIG inferior a 30 m?">
          <Toggle
            value={obra.distMenor30}
            onChange={(v) => setObra({ ...obra, distMenor30: v })}
            options={[
              { v: "Sim", l: "Sim" },
              { v: "Não", l: "Não" },
            ]}
          />
        </Field>
        <Field label="O padrão está pronto para ser ligado?" req>
          <Toggle
            value={obra.prontoLigar}
            onChange={(v) => setObra({ ...obra, prontoLigar: v })}
            options={[
              { v: "Sim", l: "Sim" },
              { v: "Não", l: "Não" },
            ]}
          />
        </Field>
        <Field label="Tipo de rede BT que atende o local">
          <Sel
            value={obra.tipoRede}
            onChange={(e) => setObra({ ...obra, tipoRede: e.target.value })}
          >
            <option>Monofásica</option>
            <option>Bifásica</option>
            <option>Trifásica</option>
          </Sel>
        </Field>
        <Field label="Código do transformador mais próximo">
          <Inp
            value={obra.transformador}
            onChange={(e) =>
              setObra({ ...obra, transformador: e.target.value })
            }
          />
        </Field>
      </div>
      {coordObrigatoria && !coordPreenchida && (
        <div className="alert alert-warn" style={{ marginTop: 8 }}>
          ⚠ Em área rural com distância superior a 30 m da rede CEMIG, a
          coordenada é obrigatória para localização da propriedade.
        </div>
      )}
      <LocalizacaoObra obra={obra} setObra={setObra} />
      <div className="field" style={{ marginTop: 14 }}>
        <label>Unidade consumidora em área de restrição ambiental?</label>
        {!obra.restricaoAmbiental && (
          <div className="alert alert-info">
            Consulte a coordenada no mapa acima para verificar a restrição
            ambiental.
          </div>
        )}
        {obra.restricaoAmbiental === "Sim" && (
          <div className="alert alert-warn restricao-destaque">
            <strong>⚠ SIM — em área de restrição ambiental.</strong>
            {obra.restricoesTexto && (
              <div style={{ marginTop: 6 }}>{obra.restricoesTexto}</div>
            )}
          </div>
        )}
        {obra.restricaoAmbiental === "Não" && (
          <div className="alert alert-ok restricao-destaque">
            <strong>Não há restrição ambiental.</strong>
          </div>
        )}
      </div>
    </Card>
  );
}

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
          sub={`Obrigatório quando há UC bi/trifásica com proteção acima de 60/63 A. Faixas disponíveis: acima de ${maiorCorrenteUC || "—"} A.`}
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
              correnteDisj(atend.disjuntorGeral) <= maiorCorrenteUC && (
                <div className="alert alert-warn" style={{ marginTop: 10 }}>
                  ⚠ O disjuntor geral deve ter faixa superior ao maior disjuntor
                  das UCs ({maiorCorrenteUC} A).
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
      eyebrow="Carga do agrupamento"
      title="Previsão de Carga por Unidade Consumidora"
      sub="Informe a previsão de carga instalada (kW) e a demanda prevista (kVA) de cada UC. A carga e a demanda totais são somadas automaticamente."
    >
      {ucBlocos.length > 1 && (
        <div className="prev-toolbar">
          <Btn variant="ghost" onClick={replicarPrevTodas}>
            Replicar previsão da UC 1 para todas
          </Btn>
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

function TabObs({ ctx }) {
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
      eyebrow="Informações adicionais"
      title="Observações"
      sub="Inclua informações relevantes: justificativa de disjuntor, atendimento híbrido, geração já conectada, etc."
    >
      <Field>
        <textarea
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          rows={6}
        />
      </Field>
    </Card>
  );
}

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
