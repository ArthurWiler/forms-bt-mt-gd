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
    validacaoHibrido
  } = ctx;
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Dados",
      title: "Dados da Obra",
      sub: "Endereço do padrão de entrada / ponto de entrega."
    },
    /* @__PURE__ */ React.createElement("div", { className: "grid grid-2" }, /* @__PURE__ */ React.createElement(Field, { label: "Zona de localização", req: true }, /* @__PURE__ */ React.createElement(
      Toggle,
      {
        value: obra.localizacao,
        onChange: (v) => setObra({ ...obra, localizacao: v }),
        options: [
          { v: "Urbana", l: "Urbana" },
          { v: "Rural", l: "Rural" }
        ]
      }
    )), coletivo && /* @__PURE__ */ React.createElement(Field, { label: "Nº ART/TRT de Projeto", req: true }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: obra.art,
        onChange: (e) => setObra({ ...obra, art: e.target.value })
      }
    ))),
    obra.localizacao === "Urbana" && /* @__PURE__ */ React.createElement("div", { className: "grid grid-2", style: { marginTop: 14 } }, /* @__PURE__ */ React.createElement(Field, { label: "CEP", req: true, span: 2 }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, alignItems: "center" } }, /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 180 } }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: obra.cep,
        onChange: (e) => {
          const v = mascararCEP(e.target.value);
          setObra({ ...obra, cep: v });
          buscarCEP(v, "obra");
        },
        placeholder: "00000-000"
      }
    )), cepStatus.obra === "buscando" && /* @__PURE__ */ React.createElement("span", { className: "spinner" }), cepStatus.obra === "ok" && /* @__PURE__ */ React.createElement(Badge, null, "Endereço encontrado"), cepStatus.obra === "erro" && /* @__PURE__ */ React.createElement("span", { style: { color: "var(--vermelho)", fontSize: 12 } }, "CEP não encontrado"))), /* @__PURE__ */ React.createElement(Field, { label: "Endereço", req: true, span: 2 }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: obra.endereco,
        onChange: (e) => setObra({ ...obra, endereco: e.target.value })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Nº", req: true }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: obra.num,
        onChange: (e) => setObra({ ...obra, num: e.target.value })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Complemento" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: obra.compl,
        onChange: (e) => setObra({ ...obra, compl: e.target.value })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Bairro", req: true }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: obra.bairro,
        onChange: (e) => setObra({ ...obra, bairro: e.target.value })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Cidade / Município", req: true }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: obra.cidade,
        onChange: (e) => setObra({ ...obra, cidade: e.target.value })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Estado", req: true }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: obra.estado,
        onChange: (e) => setObra({ ...obra, estado: e.target.value })
      }
    ))),
    obra.localizacao === "Rural" && /* @__PURE__ */ React.createElement("div", { className: "grid grid-2", style: { marginTop: 14 } }, /* @__PURE__ */ React.createElement(Field, { label: "Município", req: true }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: obra.cidade,
        onChange: (e) => setObra({ ...obra, cidade: e.target.value })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Estado", req: true }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: obra.estado,
        onChange: (e) => setObra({ ...obra, estado: e.target.value })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Distrito / Comunidade / Região" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: obra.distritoComunidade,
        onChange: (e) => setObra({ ...obra, distritoComunidade: e.target.value })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Nome da propriedade" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: obra.nomePropriedade,
        onChange: (e) => setObra({ ...obra, nomePropriedade: e.target.value })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Ponto de referência" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: obra.pontoRef,
        onChange: (e) => setObra({ ...obra, pontoRef: e.target.value })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Nº instalação mais próxima" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: obra.instProxima,
        onChange: (e) => setObra({ ...obra, instProxima: e.target.value })
      }
    ))),
    /* @__PURE__ */ React.createElement("div", { className: "grid grid-2 divider" }, /* @__PURE__ */ React.createElement(
      Field,
      {
        label: coordObrigatoria ? "Latitude" : "Latitude — opcional",
        req: coordObrigatoria
      },
      /* @__PURE__ */ React.createElement(
        Inp,
        {
          value: obra.lat,
          onChange: (e) => setObra({ ...obra, lat: e.target.value }),
          placeholder: ""
        }
      )
    ), /* @__PURE__ */ React.createElement(
      Field,
      {
        label: coordObrigatoria ? "Longitude" : "Longitude — opcional",
        req: coordObrigatoria
      },
      /* @__PURE__ */ React.createElement(
        Inp,
        {
          value: obra.lng,
          onChange: (e) => setObra({ ...obra, lng: e.target.value }),
          placeholder: ""
        }
      )
    )),
    /* @__PURE__ */ React.createElement("div", { className: "grid grid-2 divider" }, /* @__PURE__ */ React.createElement(Field, { label: "Distância padrão→rede CEMIG inferior a 30 m?" }, /* @__PURE__ */ React.createElement(
      Toggle,
      {
        value: obra.distMenor30,
        onChange: (v) => setObra({ ...obra, distMenor30: v }),
        options: [
          { v: "Sim", l: "Sim" },
          { v: "Não", l: "Não" }
        ]
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "O padrão está pronto para ser ligado?", req: true }, /* @__PURE__ */ React.createElement(
      Toggle,
      {
        value: obra.prontoLigar,
        onChange: (v) => setObra({ ...obra, prontoLigar: v }),
        options: [
          { v: "Sim", l: "Sim" },
          { v: "Não", l: "Não" }
        ]
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Tipo de rede BT que atende o local" }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: obra.tipoRede,
        onChange: (e) => setObra({ ...obra, tipoRede: e.target.value })
      },
      /* @__PURE__ */ React.createElement("option", null, "Monofásica"),
      /* @__PURE__ */ React.createElement("option", null, "Bifásica"),
      /* @__PURE__ */ React.createElement("option", null, "Trifásica")
    )), /* @__PURE__ */ React.createElement(Field, { label: "Código do transformador mais próximo" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: obra.transformador,
        onChange: (e) => setObra({ ...obra, transformador: e.target.value })
      }
    ))),
    coordObrigatoria && !coordPreenchida && /* @__PURE__ */ React.createElement("div", { className: "alert alert-warn", style: { marginTop: 8 } }, "⚠ Em área rural com distância superior a 30 m da rede CEMIG, a coordenada é obrigatória para localização da propriedade."),
    /* @__PURE__ */ React.createElement(LocalizacaoObra, { obra, setObra }),
    /* @__PURE__ */ React.createElement("div", { className: "field", style: { marginTop: 14 } }, /* @__PURE__ */ React.createElement("label", null, "Unidade consumidora em área de restrição ambiental?"), !obra.restricaoAmbiental && /* @__PURE__ */ React.createElement("div", { className: "alert alert-info" }, "Consulte a coordenada no mapa acima para verificar a restrição ambiental."), obra.restricaoAmbiental === "Sim" && /* @__PURE__ */ React.createElement("div", { className: "alert alert-warn restricao-destaque" }, /* @__PURE__ */ React.createElement("strong", null, "⚠ SIM — em área de restrição ambiental."), obra.restricoesTexto && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6 } }, obra.restricoesTexto)), obra.restricaoAmbiental === "Não" && /* @__PURE__ */ React.createElement("div", { className: "alert alert-ok restricao-destaque" }, /* @__PURE__ */ React.createElement("strong", null, "Não há restrição ambiental.")))
  );
}
