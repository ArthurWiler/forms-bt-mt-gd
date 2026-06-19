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
    demandaResidencialManualInvalida,
    totalUcsEmpreendimento,
    trocaDisjGeral,
    validacaoDisjuntores,
    validacaoHibrido
  } = ctx;
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Carga do agrupamento",
      title: "Previsão de Carga por Unidade Consumidora",
      sub: "Informe a previsão de carga instalada (kW) de cada UC. A demanda total do agrupamento é calculada separadamente: parte residencial pelo ND-5.2, parte não residencial pelo campo abaixo."
    },
    ucBlocos.length > 1 && /* @__PURE__ */ React.createElement("div", { className: "prev-toolbar" }, /* @__PURE__ */ React.createElement(Btn, { variant: "ghost", onClick: replicarPrevTodas }, "Replicar previsão da UC 1 para todas")),
    quantidadeApartamentos > 0 && demandaApartamentosND52 && /* @__PURE__ */ React.createElement("div", { className: "alert alert-ok", style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement("b", null, "Demanda dos apartamentos residenciais (ND-5.2):"), " ", quantidadeApartamentos, " apartamento(s) · área média ponderada", " ", fmt2(areaMediaPonderada), " m² · Fator F", " ", fmt2(demandaApartamentosND52.fatorF), " · A", " ", fmt2(demandaApartamentosND52.demandaAreaA), " → D =", " ", fmt2(demandaApartamentosND52.demandaKVA), " kVA (incluída automaticamente na demanda total abaixo)."),
    demandaApartamentosND52 && /* @__PURE__ */ React.createElement("div", { className: "grid grid-2", style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement(
      Field,
      {
        label: "Demanda residencial manual (kVA) — opcional",
        hint: `Substitui o valor calculado pelo ND-5.2 acima, se informado. Não pode ser menor que ${fmt2(demandaApartamentosND52.demandaKVA)} kVA.`
      },
      /* @__PURE__ */ React.createElement(
        Inp,
        {
          type: "number",
          value: atend.demandaResidencialManual,
          onChange: (e) => setAtend({
            ...atend,
            demandaResidencialManual: e.target.value
          }),
          placeholder: fmt2(demandaApartamentosND52.demandaKVA)
        }
      )
    )),
    demandaResidencialManualInvalida && /* @__PURE__ */ React.createElement("div", { className: "alert alert-warn", style: { marginBottom: 14 } }, "⚠ A demanda residencial manual (", fmt2(atend.demandaResidencialManual), " ", "kVA) é menor que a calculada pelo ND-5.2 (", fmt2(demandaApartamentosND52.demandaKVA), " kVA) e não pode ser usada — corrija ou deixe em branco para usar o valor calculado."),
    quantidadeApartamentos > 0 && !demandaApartamentosND52 && (quantidadeApartamentos < 4 ? /* @__PURE__ */ React.createElement("div", { className: "alert alert-info", style: { marginBottom: 14 } }, "ND-5.2 exige no mínimo 4 apartamentos para o cálculo automático (atualmente ", quantidadeApartamentos, "). Informe a demanda manualmente para as UCs residenciais abaixo.") : /* @__PURE__ */ React.createElement("div", { className: "alert alert-warn", style: { marginBottom: 14 } }, "Área média ponderada inválida ou superior a 1000 m² (", fmt2(areaMediaPonderada), " m²). Confira a área de cada apartamento ou informe a demanda manualmente.")),
    temUCNaoResidencial && /* @__PURE__ */ React.createElement("div", { className: "grid grid-2", style: { marginBottom: 14 } }, /* @__PURE__ */ React.createElement(
      Field,
      {
        label: "Demanda geral não residencial (kVA)",
        req: true,
        hint: "Demanda calculada pelo responsável técnico para o conjunto das UCs não residenciais (comercial/industrial/rural) do empreendimento — não é a soma das UCs abaixo."
      },
      /* @__PURE__ */ React.createElement(
        Inp,
        {
          type: "number",
          value: atend.demandaNaoResidencial,
          onChange: (e) => setAtend({ ...atend, demandaNaoResidencial: e.target.value }),
          placeholder: "0,0"
        }
      )
    )),
    /* @__PURE__ */ React.createElement("div", { className: "prev-table-wrap" }, /* @__PURE__ */ React.createElement("table", { className: "prev-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Unidade"), /* @__PURE__ */ React.createElement("th", null, "Ilum. (kW)"), /* @__PURE__ */ React.createElement("th", null, "Tomada (kW)"), /* @__PURE__ */ React.createElement("th", null, "Chuveiro (kW)"), /* @__PURE__ */ React.createElement("th", null, "Ar Cond. (kW)"), /* @__PURE__ */ React.createElement("th", null, "Outros (kW)"), /* @__PURE__ */ React.createElement("th", null, "Carga (kW)"), /* @__PURE__ */ React.createElement("th", { className: "col-demanda" }, "Demanda (kVA) *"))), /* @__PURE__ */ React.createElement("tbody", null, ucBlocos.map((u, ui) => ucSemAlteracao(u) ? /* @__PURE__ */ React.createElement("tr", { key: ui }, /* @__PURE__ */ React.createElement("td", { className: "uc-name" }, u.identificacao || `UC ${ui + 1}`), /* @__PURE__ */ React.createElement("td", { colSpan: 7, className: "field-hint" }, "Caixa existente sem alteração — não entra na previsão de carga.")) : /* @__PURE__ */ React.createElement("tr", { key: ui }, /* @__PURE__ */ React.createElement("td", { className: "uc-name" }, u.identificacao || `UC ${ui + 1}`), ["ilum", "tomada", "chuveiro", "ar", "outros"].map((k) => /* @__PURE__ */ React.createElement("td", { key: k }, /* @__PURE__ */ React.createElement(
      "input",
      {
        type: "number",
        value: (u.prev || {})[k] || "",
        onChange: (e) => setBlocoPrev(ui, { [k]: e.target.value }),
        placeholder: "0,0"
      }
    ))), /* @__PURE__ */ React.createElement("td", { className: "carga-cell" }, fmt2(prevKwUC(u))), /* @__PURE__ */ React.createElement("td", { className: "col-demanda" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "demanda-prev",
        type: "number",
        value: (u.prev || {}).demanda || "",
        onChange: (e) => setBlocoPrev(ui, { demanda: e.target.value }),
        placeholder: "0,0"
      }
    ))))), /* @__PURE__ */ React.createElement("tfoot", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { className: "uc-name" }, "Total"), /* @__PURE__ */ React.createElement("td", { colSpan: 5 }), /* @__PURE__ */ React.createElement("td", { className: "carga-cell" }, fmt2(prevTotalKw)), /* @__PURE__ */ React.createElement("td", { className: "col-demanda total-dem" }, fmt2(demandaPrevTotal)))))),
    /* @__PURE__ */ React.createElement("div", { className: "prev-total", style: { marginTop: 14 } }, /* @__PURE__ */ React.createElement("div", { className: "kpi" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-label" }, "Total Carga Instalada"), /* @__PURE__ */ React.createElement("div", { className: "kpi-value" }, fmt2(prevTotalKw), " kW")), /* @__PURE__ */ React.createElement("div", { className: "kpi dark" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-label" }, "Demanda do atendimento"), /* @__PURE__ */ React.createElement("div", { className: "kpi-value", style: { fontSize: 18 } }, fmt2(demandaTotalGeral), " kVA"))),
    demandaTotalGeral > 304 && /* @__PURE__ */ React.createElement("div", { className: "alert alert-info", style: { marginTop: 14 } }, "Demanda total acima de 304 kVA: o atendimento fica condicionado à apresentação do projeto elétrico com ART/TRT.")
  ), trocaDisjGeral && /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Alteração de carga",
      title: "Troca do Disjuntor Geral e Demandas",
      sub: "Informe o disjuntor geral existente e o novo, além da demanda atual e futura do agrupamento. A demanda futura corresponde à demanda prevista total do agrupamento."
    },
    /* @__PURE__ */ React.createElement("div", { className: "grid grid-2" }, /* @__PURE__ */ React.createElement(Field, { label: "Disjuntor geral existente", req: true }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: atend.disjGeralAtual,
        onChange: (e) => setAtend({ ...atend, disjGeralAtual: e.target.value })
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Selecione…"),
      DISJ.map((d) => /* @__PURE__ */ React.createElement("option", { key: d.fx, value: d.fx }, d.fx))
    )), /* @__PURE__ */ React.createElement(Field, { label: "Disjuntor geral novo", req: true }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: atend.disjuntorGeral,
        onChange: (e) => setAtend({ ...atend, disjuntorGeral: e.target.value })
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Selecione…"),
      opcoesDisjGeral.map((o) => /* @__PURE__ */ React.createElement("option", { key: o, value: o }, o))
    )), /* @__PURE__ */ React.createElement(Field, { label: "Demanda atual (kVA)", req: true }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        type: "number",
        value: atend.demandaAtual,
        onChange: (e) => setAtend({ ...atend, demandaAtual: e.target.value }),
        placeholder: "0,0"
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Demanda futura (kVA)" }, /* @__PURE__ */ React.createElement("div", { className: "readonly-val" }, fmt2(demandaPrevTotal), " kVA")))
  ), disjGeralObrigatorio && !trocaDisjGeral && /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Proteção geral",
      title: "Disjuntor Geral do Agrupamento",
      sub: `Sugestão automática conforme seletividade (faixa superior ao maior disjuntor das UCs, acima de ${maiorCorrenteUC || "—"} A) e capacidade para a demanda total (${fmt2(demandaPrevTotal)} kVA).`
    },
    /* @__PURE__ */ React.createElement("div", { className: "geral-box", style: { marginTop: 0 } }, /* @__PURE__ */ React.createElement(Field, { label: "Disjuntor geral", req: true }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: atend.disjuntorGeral,
        onChange: (e) => setAtend({ ...atend, disjuntorGeral: e.target.value })
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Selecione…"),
      opcoesDisjGeral.map((o) => /* @__PURE__ */ React.createElement("option", { key: o, value: o }, o))
    )), opcoesDisjGeral.length === 0 && /* @__PURE__ */ React.createElement("div", { className: "alert alert-info", style: { marginTop: 10 } }, "Preencha os disjuntores das UCs acima para liberar as opções."), atend.disjuntorGeral && !opcoesDisjGeral.includes(atend.disjuntorGeral) && /* @__PURE__ */ React.createElement("div", { className: "alert alert-warn", style: { marginTop: 10 } }, "⚠ Esse disjuntor não atende à seletividade (faixa superior ao maior disjuntor das UCs, ", maiorCorrenteUC, " A) e/ou à capacidade para a demanda total (", fmt2(demandaPrevTotal), " ", "kVA)."))
  ));
}
