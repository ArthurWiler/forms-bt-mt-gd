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
    validacaoHibrido
  } = ctx;
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Empreendimento",
      title: "Atendimento a Empreendimento com Múltiplas Torres ou Blocos",
      sub: `Cada ${atend.atendA.toLowerCase()} pode ter seu disjuntor geral e seu disjuntor de combate a incêndio. Preencha o primeiro e use "Replicar" para preenchimento em massa.`
    },
    /* @__PURE__ */ React.createElement("div", { className: "kpi-row" }, /* @__PURE__ */ React.createElement("div", { className: "kpi" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-label" }, "Atendimento a"), /* @__PURE__ */ React.createElement("div", { className: "kpi-value", style: { fontSize: 15 } }, atend.atendA)), /* @__PURE__ */ React.createElement("div", { className: "kpi" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-label" }, "Total de UCs do empreendimento"), /* @__PURE__ */ React.createElement("div", { className: "kpi-value" }, totalUcsEmpreendimento)), /* @__PURE__ */ React.createElement("div", { className: "kpi dark" }, /* @__PURE__ */ React.createElement("div", { className: "kpi-label" }, "Demanda total do empreendimento"), /* @__PURE__ */ React.createElement("div", { className: "kpi-value", style: { fontSize: 18 } }, fmt2(demandaTotalGeral), " kVA"))),
    /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
          flexWrap: "wrap",
          marginBottom: 14
        }
      },
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label: `Nº de ${atend.atendA === "Bloco" ? "Blocos" : "Torres"}`
        },
        /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 120 } }, /* @__PURE__ */ React.createElement(
          Inp,
          {
            type: "number",
            value: atend.nBlocos,
            onChange: (e) => setAtend({
              ...atend,
              nBlocos: Math.max(1, parseInt(e.target.value) || 1)
            })
          }
        ))
      ),
      /* @__PURE__ */ React.createElement(Btn, { variant: "ghost", onClick: replicarPrimeiro }, "⧉ Replicar ", atend.atendA, " 1 para todos")
    ),
    blocos.map((b, bi) => /* @__PURE__ */ React.createElement("div", { key: bi, className: "uc-block" }, /* @__PURE__ */ React.createElement("div", { className: "uc-block-head" }, /* @__PURE__ */ React.createElement("span", { className: "uc-block-title" }, atend.atendA, " ", b.nome || bi + 1), /* @__PURE__ */ React.createElement(Badge, null, bi + 1, " de ", blocos.length)), /* @__PURE__ */ React.createElement("div", { className: "grid grid-3" }, /* @__PURE__ */ React.createElement(Field, { label: `Identificação do ${atend.atendA.toLowerCase()}` }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: b.nome,
        onChange: (e) => setTorre(bi, { nome: e.target.value }),
        placeholder: `${bi + 1}`
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Disjuntor Geral", req: true }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: b.disjGeral,
        onChange: (e) => setTorre(bi, { disjGeral: e.target.value })
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Selecione…"),
      DISJ_GER.filter((d) => d.tipo === "tri").map((d) => /* @__PURE__ */ React.createElement("option", { key: d.fx, value: d.fx }, d.fx))
    )), /* @__PURE__ */ React.createElement(Field, { label: `Demanda do ${atend.atendA} (kVA)` }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        type: "text",
        readOnly: true,
        disabled: true,
        value: fmt2(
          (b.ucs || []).reduce(
            (s, u) => s + num((u.prev || {}).demanda),
            0
          )
        ),
        placeholder: "0"
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: `Qtd. de UCs por ${atend.atendA}`, req: true }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        type: "number",
        value: b.qtdUCs,
        onChange: (e) => sincronizarUCsTorre(bi, e.target.value),
        placeholder: "0"
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Disjuntor do Condomínio / Sist. Combate Incêndio" }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: b.disjIncendio,
        onChange: (e) => setTorre(bi, { disjIncendio: e.target.value })
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Selecione…"),
      DISJ_CN.map((d) => /* @__PURE__ */ React.createElement("option", { key: d.fx, value: d.fx }, d.fx))
    )), /* @__PURE__ */ React.createElement(Field, { label: "Demanda Condomínio / Combate Incêndio (kVA)" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        type: "number",
        value: b.demandaIncendio,
        onChange: (e) => setTorre(bi, { demandaIncendio: e.target.value }),
        placeholder: "0"
      }
    ))), (b.ucs || []).length > 0 && /* @__PURE__ */ React.createElement("div", { className: "uc-torre-wrap" }, /* @__PURE__ */ React.createElement(
      "div",
      {
        style: {
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "4px 0 10px",
          flexWrap: "wrap",
          gap: 8
        }
      },
      /* @__PURE__ */ React.createElement("span", { className: "subbox-title" }, "Unidades consumidoras do ", atend.atendA.toLowerCase(), " (", b.ucs.length, ")"),
      b.ucs.length > 1 && /* @__PURE__ */ React.createElement(Btn, { variant: "ghost", onClick: () => replicarUC1Torre(bi) }, "⧉ Replicar UC 1 para todas")
    ), b.ucs.map((u, ui) => /* @__PURE__ */ React.createElement("div", { key: ui, className: "uc-mini" }, /* @__PURE__ */ React.createElement("div", { className: "uc-mini-head" }, "UC ", ui + 1, ui === 0 && b.ucs.length > 1 && /* @__PURE__ */ React.createElement("span", { className: "uc-mini-tag" }, "modelo p/ replicar")), /* @__PURE__ */ React.createElement("div", { className: "grid grid-3" }, /* @__PURE__ */ React.createElement(Field, { label: "Identificação" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: u.identificacao,
        onChange: (e) => setUcTorre(bi, ui, {
          identificacao: e.target.value
        })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Complemento", req: b.ucs.length > 1 }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: u.complemento,
        onChange: (e) => setUcTorre(bi, ui, {
          complemento: e.target.value
        }),
        placeholder: "999"
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Nº Predial" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: u.nPredial,
        onChange: (e) => setUcTorre(bi, ui, {
          nPredial: e.target.value
        })
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Solicitação", req: true }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: u.solicitacao,
        onChange: (e) => setUcTorre(bi, ui, {
          solicitacao: e.target.value
        })
      },
      /* @__PURE__ */ React.createElement("option", null, "Conexão Nova"),
      /* @__PURE__ */ React.createElement("option", null, "Alteração de Carga"),
      /* @__PURE__ */ React.createElement("option", null, "Caixa Existente sem Alteração")
    )), /* @__PURE__ */ React.createElement(Field, { label: "Atividade", req: true }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: u.atividade,
        onChange: (e) => setUcTorre(bi, ui, {
          atividade: e.target.value
        })
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Selecionar"),
      /* @__PURE__ */ React.createElement("option", null, "Residencial"),
      /* @__PURE__ */ React.createElement("option", null, "Comercial"),
      /* @__PURE__ */ React.createElement("option", null, "Industrial"),
      /* @__PURE__ */ React.createElement("option", null, "Rural")
    )), u.atividade !== "Residencial" && /* @__PURE__ */ React.createElement(
      Field,
      {
        label: "Ramo de atividade",
        req: true
      },
      /* @__PURE__ */ React.createElement(
        Inp,
        {
          value: u.ramo,
          onChange: (e) => setUcTorre(bi, ui, { ramo: e.target.value }),
          placeholder: "Obrigatório"
        }
      )
    ), u.solicitacao !== "Conexão Nova" && /* @__PURE__ */ React.createElement(Field, { label: "Instalação", req: true }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: u.instalacao,
        onChange: (e) => setUcTorre(bi, ui, {
          instalacao: e.target.value
        }),
        placeholder: "Nº instalação existente"
      }
    )), u.solicitacao !== "Conexão Nova" && /* @__PURE__ */ React.createElement(Field, { label: "Unidade Consumidora" }, /* @__PURE__ */ React.createElement(
      Inp,
      {
        value: u.unidadeConsumidora,
        onChange: (e) => setUcTorre(bi, ui, {
          unidadeConsumidora: e.target.value
        }),
        placeholder: "Identificação da UC"
      }
    )), /* @__PURE__ */ React.createElement(Field, { label: "Disjuntor da UC" }, /* @__PURE__ */ React.createElement(
      Sel,
      {
        value: u.disjPara,
        onChange: (e) => setUcTorre(bi, ui, {
          disjPara: e.target.value
        })
      },
      /* @__PURE__ */ React.createElement("option", { value: "" }, "Selecione…"),
      DISJ.map((d) => /* @__PURE__ */ React.createElement("option", { key: d.fx, value: d.fx }, d.fx))
    )))))), (b.ucs || []).length > 0 && /* @__PURE__ */ React.createElement("div", { className: "prev-table-wrap", style: { marginTop: 14 } }, /* @__PURE__ */ React.createElement("div", { className: "prev-toolbar" }, /* @__PURE__ */ React.createElement(
      "strong",
      {
        style: {
          marginRight: "auto",
          color: "var(--verde-escuro)"
        }
      },
      "Previsão de carga das UCs"
    ), b.ucs.length > 1 && /* @__PURE__ */ React.createElement(Btn, { variant: "ghost", onClick: () => replicarPrevTorre(bi) }, "Replicar previsão da UC 1 para todas")), /* @__PURE__ */ React.createElement("table", { className: "prev-table" }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", null, "Unidade"), /* @__PURE__ */ React.createElement("th", null, "Ilum. (kW)"), /* @__PURE__ */ React.createElement("th", null, "Tomada (kW)"), /* @__PURE__ */ React.createElement("th", null, "Chuveiro (kW)"), /* @__PURE__ */ React.createElement("th", null, "Ar Cond. (kW)"), /* @__PURE__ */ React.createElement("th", null, "Outros (kW)"), /* @__PURE__ */ React.createElement("th", null, "Carga (kW)"), /* @__PURE__ */ React.createElement("th", { className: "col-demanda" }, "Demanda (kVA)"))), /* @__PURE__ */ React.createElement("tbody", null, b.ucs.map((u, ui) => /* @__PURE__ */ React.createElement("tr", { key: ui }, /* @__PURE__ */ React.createElement("td", { className: "uc-name" }, u.identificacao || `UC ${ui + 1}`), ["ilum", "tomada", "chuveiro", "ar", "outros"].map(
      (k) => /* @__PURE__ */ React.createElement("td", { key: k }, /* @__PURE__ */ React.createElement(
        "input",
        {
          type: "number",
          value: (u.prev || {})[k] || "",
          onChange: (e) => setUcTorrePrev(bi, ui, {
            [k]: e.target.value
          }),
          placeholder: "0,0"
        }
      ))
    ), /* @__PURE__ */ React.createElement("td", { className: "carga-cell" }, fmt2(prevKwUC(u))), /* @__PURE__ */ React.createElement("td", { className: "col-demanda" }, /* @__PURE__ */ React.createElement(
      "input",
      {
        className: "demanda-prev",
        type: "number",
        value: (u.prev || {}).demanda || "",
        onChange: (e) => setUcTorrePrev(bi, ui, {
          demanda: e.target.value
        }),
        placeholder: "0,0"
      }
    ))))), /* @__PURE__ */ React.createElement("tfoot", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("td", { className: "uc-name" }, "Total do bloco"), /* @__PURE__ */ React.createElement("td", { colSpan: 5 }), /* @__PURE__ */ React.createElement("td", { className: "carga-cell" }, fmt2(b.ucs.reduce((s, u) => s + prevKwUC(u), 0))), /* @__PURE__ */ React.createElement("td", { className: "col-demanda total-dem" }, fmt2(
      b.ucs.reduce(
        (s, u) => s + num((u.prev || {}).demanda),
        0
      )
    )))))))),
    demandaTotalGeral > 304 && /* @__PURE__ */ React.createElement("div", { className: "alert alert-info", style: { marginTop: 10 } }, "Demanda total acima de 304 kVA: o atendimento fica condicionado à apresentação do projeto elétrico com ART/TRT.")
  ));
}
