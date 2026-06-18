// ============================================================
// CEMIG BT — Aba: TabProprietario  (extraído de js/views.js)
// ============================================================
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

