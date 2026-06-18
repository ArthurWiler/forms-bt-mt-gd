// ============================================================
// CEMIG BT — Aba: TabObra  (extraído de js/views.js)
// ============================================================
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

