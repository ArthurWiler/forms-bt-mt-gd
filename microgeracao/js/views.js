// Campos de Pessoa Física (Filiação, RG, Nascimento, Laudo, NIS) só aparecem
// quando o documento é um CPF COMPLETO e VÁLIDO — igual ao BT/MT.
function gdEhCpfValido(d) {
  const r = validarCpfCnpj(d && d.cpfCnpj);
  return r.tipo === "CPF" && r.valido === true;
}
const GD_SCHEMA_IDENTIFICACAO = [
  {
    k: "instalacao",
    label: "Número da instalação",
    req: true,
    placeholder: "Nº da instalação CEMIG",
    // dígitos apenas (equivale a replace(/\D/g,""))
    mask: "soDigitos",
  },
  {
    k: "fastTrack",
    label: 'Enquadramento no inciso III do art. 73-A ("FAST TRACK")?',
    type: "toggle",
    options: GD_SN,
    pdf: false,
  },
  {
    k: "fastRegra",
    label: "Regra de enquadramento (art. 73-A)",
    type: "select",
    span: 3,
    options: GD_FAST_REGRAS,
    show: (d) => d.fastTrack === "Sim",
  },
  {
    k: "gridZero",
    label: 'O empreendimento será "Grid Zero"?',
    type: "toggle",
    options: GD_SN,
    pdf: false,
  },
  // ── Dados do Proprietário/Titular (ordem: Nome→E-mail, Celular→Telefone,
  //    CPF/CNPJ→Filiação, RG→Nascimento, Laudo→NIS). Campos de PF só após
  //    CPF válido (gdEhCpfValido). ──
  { k: "titular", label: "Titular da Unidade Consumidora", req: true },
  { k: "email", label: "E-mail", req: true },
  { k: "celular", label: "Celular", req: true, mask: "mascararCelular" },
  { k: "telefone", label: "Telefone", mask: "mascararFixo" },
  {
    k: "cpfCnpj",
    label: "CPF/CNPJ",
    req: true,
    hintKey: "cnpjStatus",
    placeholder: "Somente números",
    mask: "mascararCpfCnpj",
    onInput: (v, ctx) => {
      if (ehCNPJ(v) && soDigitos(v).length === 14) ctx.buscarCnpj(v);
    },
  },
  {
    k: "filiacao",
    label: "Filiação (Mãe ou Pai)",
    req: true,
    show: gdEhCpfValido,
  },
  { k: "rg", label: "RG / RNE / RANI", mask: "mascararRG", show: gdEhCpfValido },
  { k: "nasc", label: "Data de Nascimento", type: "date", req: true, show: gdEhCpfValido },
  {
    k: "laudoMedico",
    label: "Possui laudo médico (equipamentos essenciais)?",
    req: true,
    type: "toggle",
    options: GD_SN,
    show: gdEhCpfValido,
  },
  {
    k: "nis",
    label: "Possui NIS para Tarifa Social?",
    req: true,
    type: "toggle",
    options: GD_SN,
    show: gdEhCpfValido,
  },
  {
    k: "numNis",
    label: "Número do NIS",
    req: true,
    span: 2,
    show: (d) => gdEhCpfValido(d) && d.nis === "Sim",
  },
  // ── Classificação da UC ──
  {
    k: "grupo",
    label: "Grupo",
    req: true,
    type: "select",
    placeholder: false,
    options: GD_GRUPOS,
  },
  {
    k: "classe",
    label: "Classe",
    req: true,
    type: "select",
    options: GD_CLASSES,
  },
  // Endereço na ordem do BT: CEP primeiro (auto-preenche o restante), depois
  // Logradouro → Número → Complemento → Bairro → Município → Estado.
  {
    k: "cep",
    label: "CEP",
    req: true,
    hintKey: "cepStatus",
    mask: "mascararCEP",
    onInput: (v, ctx) => {
      if (soDigitos(v).length === 8) ctx.buscarCep(v);
    },
  },
  { k: "logradouro", label: "Logradouro", req: true, span: 2 },
  { k: "numero", label: "Número", req: true },
  { k: "complemento", label: "Complemento do endereço" },
  { k: "bairro", label: "Bairro", req: true },
  { k: "municipio", label: "Município", req: true },
  {
    k: "estado",
    label: "Estado",
    req: true,
    type: "select",
    placeholder: false,
    options: ["MG"],
  },
];
// Etapa 1 — Orientações para preenchimento (conteúdo em GD_ORIENTACOES,
// data.js). Mesmo padrão visual do BT individual: blocos titulados
// (.subbox-title) + lista numerada (.orient-list) + aviso (.cmg-aviso)
// + legenda de obrigatoriedade.
function ViewOrientacoes({ ctx }) {
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Etapa " + ctx.etapaNum,
      title: "Orientações para preenchimento",
      sub: GD_ORIENTACOES.intro,
    },
    GD_ORIENTACOES.blocos.map((bloco, bi) =>
      /* @__PURE__ */ React.createElement(
        React.Fragment,
        { key: bi },
        /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "subbox-title",
            style: bi > 0 ? { marginTop: 18 } : void 0,
          },
          bloco.titulo,
        ),
        /* @__PURE__ */ React.createElement(
          "ul",
          { className: "orient-list" },
          bloco.itens.map((it, i) =>
            /* @__PURE__ */ React.createElement(
              "li",
              { key: i, className: "orient-item" },
              /* @__PURE__ */ React.createElement(
                "span",
                { className: "orient-num" },
                i + 1,
              ),
              /* @__PURE__ */ React.createElement("p", null, it),
            ),
          ),
        ),
      ),
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "cmg-aviso" },
      /* @__PURE__ */ React.createElement("div", {
        className: "cmg-aviso-icon",
        "aria-hidden": "true",
      }),
      /* @__PURE__ */ React.createElement(
        "p",
        { className: "cmg-aviso-texto" },
        GD_ORIENTACOES.callout,
      ),
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "legend" },
      /* @__PURE__ */ React.createElement(
        "span",
        null,
        "Campos sem marcação são obrigatórios; os demais indicam ",
        /* @__PURE__ */ React.createElement("b", null, "(opcional)"),
        " no rótulo.",
      ),
    ),
    /* Aceite obrigatório: trava o "Avançar" enquanto não for marcado. */
    /* @__PURE__ */ React.createElement(
      "label",
      { className: "aceite-orient" },
      /* @__PURE__ */ React.createElement("input", {
        type: "checkbox",
        checked: !!ctx.aceiteOrient,
        onChange: (e) => ctx.setAceiteOrient(e.target.checked),
      }),
      "Declaro que li e estou de acordo com as informações acima.",
    ),
  );
}
function ViewIdentificacao({ ctx }) {
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Etapa " + ctx.etapaNum,
      title: "Identificação da Unidade Consumidora",
    },
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid" },
      /* @__PURE__ */ React.createElement(CamposSchema, {
        schema: GD_SCHEMA_IDENTIFICACAO,
        ctx,
      }),
    ),
  );
}
function ViewDadosUC({ ctx }) {
  const { d, set } = ctx;
  const utm = gdValidarUTM(d.fuso, d.utmE, d.utmN);
  // Coordenadas por Latitude/Longitude → deriva fuso/E/N automaticamente
  // (mesma lógica de BT/MT). Guarda também a string de exibição do UTM.
  const setCoord = (patch) => {
    const lat = patch.latitude != null ? patch.latitude : d.latitude;
    const lon = patch.longitude != null ? patch.longitude : d.longitude;
    const u = gdUtmDeCoordenadas(lat, lon);
    set(
      u
        ? { ...patch, fuso: u.fuso, utmE: u.utmE, utmN: u.utmN }
        : { ...patch, fuso: "", utmE: "", utmN: "" },
    );
  };
  const utmDisplay =
    d.fuso && d.utmE && d.utmN
      ? `${d.fuso}${_gdUtmBandLetter(parseFloat(d.latitude) || 0)} E:${d.utmE} N:${d.utmN}`
      : "";
  const potTrafos = d.tipoSE ? GD_TRAFO_POR_SE[d.tipoSE] || [] : [];
  const setTrafo = (i, patch) =>
    set({ trafos: d.trafos.map((t, k) => (k === i ? { ...t, ...patch } : t)) });
  const addTrafo = () =>
    set({ trafos: [...d.trafos, { se: d.tipoSE, qte: "", potencia: "" }] });
  const delTrafo = (i) => set({ trafos: d.trafos.filter((_, k) => k !== i) });
  const semAlteracao =
    d.solicitacao && d.solicitacao.indexOf("SEM Alteração") >= 0;
  const fasesDisj = semAlteracao ? GD_DISJ_FASES_ALT : GD_DISJ_FASES;
  const correntesDisj = d.disjGeralFase
    ? GD_DISJ_REVISADA.filter((x) => x.tipo === d.disjGeralFase).map((x) => x.a)
    : [];
  const limiteInj = gdLimiteInjecao(d.disjGeralFase, d.disjGeralA, false);
  // Regra 2/3: Baixa Tensão (Grupo B). Em BT não há exigência de demanda contratada.
  const ehBT = d.grupo === "B";
  // Regra 2: a seleção de subestação só está disponível em Média Tensão (Grupo A)
  // ou em migração BT→MT (instalação existente em BT conectando em MT). Em BT pura
  // a seção inteira é ocultada — sem cards, imagens ou controles de seleção.
  const ehMV = d.grupo === "A";
  const ehMigracaoBTtoMT = ehMV && d.instExistenteBTMT === GD_BT_BAIXA;
  const mostrarSE = ehMV || ehMigracaoBTtoMT;
  // Regra 1: Aumento de Potência exige declaração da nova proteção.
  const ehAumentoPotencia = GD_SOLICITACOES_AUMENTO_POTENCIA.includes(
    d.solicitacao,
  );
  // Regra 3: em Ligação de Nova UC não há instalação/disjuntor existentes — ocultar campos
  // de instalação existente para evitar contradição com o tipo de solicitação.
  const ehLigacaoNova = (d.solicitacao || "").indexOf("Nova Unidade") >= 0;
  // Regra 4: filtragem dinâmica das subestações — disponibilidade por tensão ×
  // tipo de solicitação × migração BT→MT (espelha o módulo MT/minigeração) e
  // limite de 300 kVA das SE Nº 1, 5 e 8.
  const seCtx = {
    solicitacao: d.solicitacao,
    tensao: d.tensaoAtendimento,
    instExistenteBTMT: d.instExistenteBTMT,
  };
  const seDesabilitado = (s) => !gdSEDisponivel(s, seCtx).ok;
  const seBloqueioMsg = d.tipoSE ? gdSEDisponivel(d.tipoSE, seCtx).msg : "";
  const _potInst = parseFloat(d.potAtivaInstalada) || 0;
  const tiposSEvisiveis = GD_TIPOS_SE.filter(
    (s) => !(GD_SE_LIMITE_300.includes(s) && _potInst > GD_SE_LIMITE_KW),
  );
  // Limpa a subestação/trafos quando a seção não se aplica (BT pura) ou quando o
  // tipo selecionado deixa de ser válido para o cenário/potência.
  React.useEffect(() => {
    if (!mostrarSE) {
      if (d.tipoSE || (d.trafos || []).some((t) => t.qte || t.potencia))
        set({ tipoSE: "", trafos: [gdTrafoPadrao()] });
    } else if (
      d.tipoSE &&
      (seDesabilitado(d.tipoSE) || !tiposSEvisiveis.includes(d.tipoSE))
    ) {
      set({ tipoSE: "" });
    }
  }, [
    mostrarSE,
    d.solicitacao,
    d.tensaoAtendimento,
    d.instExistenteBTMT,
    _potInst,
  ]);
  return /* @__PURE__ */ React.createElement(
    Card,
    { eyebrow: "Etapa " + ctx.etapaNum, title: "Dados da Unidade Consumidora" },
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid" },
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Latitude", req: true },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.latitude,
          onChange: (e) =>
            setCoord({ latitude: e.target.value.replace(/[^\d.\-]/g, "") }),
          placeholder: "-19.916681",
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Longitude", req: true },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.longitude,
          onChange: (e) =>
            setCoord({ longitude: e.target.value.replace(/[^\d.\-]/g, "") }),
          placeholder: "-43.934493",
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label: "Coordenada UTM (calculada)",
          hint: d.fuso && !utm.ok ? utm.msg : "",
        },
        /* @__PURE__ */ React.createElement(Inp, {
          value: utmDisplay,
          readOnly: true,
          placeholder: "Fuso E N (automático)",
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label:
            "Possui Grupo Motor Gerador de Emergência em Paralelo com a Cemig (Diesel/Gás)?",
          span: d.geradorEmergencia === "Sim" ? 2 : 3,
        },
        /* @__PURE__ */ React.createElement(Toggle, {
          value: d.geradorEmergencia,
          onChange: (v) => set({ geradorEmergencia: v }),
          options: GD_SN.map((o) => ({ v: o, l: o })),
        }),
      ),
      d.geradorEmergencia === "Sim" &&
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Potência (kVA)", req: true },
          /* @__PURE__ */ React.createElement(Inp, {
            value: d.geradorPotencia,
            onChange: (e) =>
              set({ geradorPotencia: e.target.value.replace(/[^\d.]/g, "") }),
          }),
        ),
      mostrarSE &&
        /* @__PURE__ */ React.createElement(
          Field,
          {
            label: "Tipo de Subestação (Conforme ND 5.3)",
            hint: seBloqueioMsg,
            span: 3,
          },
          /* @__PURE__ */ React.createElement(GdSeGaleria, {
            tipos: tiposSEvisiveis,
            value: d.tipoSE,
            onSelect: (t) => set({ tipoSE: t }),
            disabledFn: seDesabilitado,
          }),
        ),
    ),
    mostrarSE &&
      d.tipoSE &&
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "subbox", style: { marginTop: 12 } },
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "motores-head" },
          /* @__PURE__ */ React.createElement(
            "span",
            { className: "subbox-title" },
            "Transformadores (Qte × Potência)",
          ),
          /* @__PURE__ */ React.createElement(
            Btn,
            { variant: "primary", onClick: addTrafo },
            "+ Trafo",
          ),
        ),
        /* @__PURE__ */ React.createElement(
          "table",
          { className: "motores-table" },
          /* @__PURE__ */ React.createElement(
            "thead",
            null,
            /* @__PURE__ */ React.createElement(
              "tr",
              null,
              /* @__PURE__ */ React.createElement("th", null, "Qte"),
              /* @__PURE__ */ React.createElement("th", null, "Potência (kVA)"),
              /* @__PURE__ */ React.createElement("th", null),
            ),
          ),
          /* @__PURE__ */ React.createElement(
            "tbody",
            null,
            d.trafos.map((t, i) =>
              /* @__PURE__ */ React.createElement(
                "tr",
                { key: i },
                /* @__PURE__ */ React.createElement(
                  "td",
                  null,
                  /* @__PURE__ */ React.createElement("input", {
                    type: "number",
                    min: "0",
                    value: t.qte,
                    onChange: (e) => setTrafo(i, { qte: e.target.value }),
                    style: { width: 70 },
                  }),
                ),
                /* @__PURE__ */ React.createElement(
                  "td",
                  null,
                  /* @__PURE__ */ React.createElement(
                    "select",
                    {
                      value: t.potencia,
                      onChange: (e) =>
                        setTrafo(i, { potencia: e.target.value }),
                    },
                    /* @__PURE__ */ React.createElement("option", {
                      value: "",
                    }),
                    potTrafos.map((p) =>
                      /* @__PURE__ */ React.createElement(
                        "option",
                        { key: p, value: p },
                        p,
                      ),
                    ),
                  ),
                ),
                /* @__PURE__ */ React.createElement(
                  "td",
                  null,
                  d.trafos.length > 1 &&
                    /* @__PURE__ */ React.createElement(
                      "button",
                      {
                        type: "button",
                        className: "motor-del",
                        onClick: () => delTrafo(i),
                      },
                      "✕",
                    ),
                ),
              ),
            ),
          ),
        ),
      ),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid", style: { marginTop: 12 } },
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Tipo de Solicitação", req: true, span: 3 },
        /* @__PURE__ */ React.createElement(
          Sel,
          {
            value: d.solicitacao,
            onChange: (e) => set({ solicitacao: e.target.value }),
          },
          /* @__PURE__ */ React.createElement("option", { value: "" }),
          GD_SOLICITACOES.map((s) =>
            /* @__PURE__ */ React.createElement(
              "option",
              { key: s, value: s },
              s,
            ),
          ),
        ),
      ),
      /* Aviso contextual (migrado da orientação): a solicitação escolhida exige
         o preenchimento do Formulário de Carga (etapa própria). */
      GD_SOLICITACOES_FORM_CARGA.includes(d.solicitacao) &&
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "field col-span-3" },
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "cmg-aviso no-print" },
            /* @__PURE__ */ React.createElement("div", {
              className: "cmg-aviso-icon",
              "aria-hidden": "true",
            }),
            /* @__PURE__ */ React.createElement(
              "p",
              { className: "cmg-aviso-texto" },
              "Para este tipo de solicitação é obrigatório declarar todas as cargas elétricas da unidade na etapa Formulário de Carga.",
            ),
          ),
        ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Tipo de edificação", req: true, span: 3 },
        /* @__PURE__ */ React.createElement(
          Sel,
          {
            value: d.edificacao,
            onChange: (e) => set({ edificacao: e.target.value }),
          },
          /* @__PURE__ */ React.createElement("option", { value: "" }),
          GD_EDIFICACOES.map((s) =>
            /* @__PURE__ */ React.createElement(
              "option",
              { key: s, value: s },
              s,
            ),
          ),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Tipo de Padrão de Entrada" },
        /* @__PURE__ */ React.createElement(
          Sel,
          {
            value: d.edifTipo,
            onChange: (e) => set({ edifTipo: e.target.value }),
          },
          /* @__PURE__ */ React.createElement("option", { value: "" }),
          GD_EDIF_TIPO.map((s) =>
            /* @__PURE__ */ React.createElement(
              "option",
              { key: s, value: s },
              s,
            ),
          ),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Tipo de Ramal" },
        /* @__PURE__ */ React.createElement(
          Sel,
          { value: d.ramal, onChange: (e) => set({ ramal: e.target.value }) },
          GD_RAMAL.map((s) =>
            /* @__PURE__ */ React.createElement(
              "option",
              { key: s, value: s },
              s,
            ),
          ),
        ),
      ),
      !ehLigacaoNova &&
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Disjuntor Individual Atual (A)" },
          /* @__PURE__ */ React.createElement(Inp, {
            value: d.disjAtualA,
            onChange: (e) =>
              set({ disjAtualA: e.target.value.replace(/\D/g, "") }),
          }),
        ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Disjuntor Geral — Fase" },
        /* @__PURE__ */ React.createElement(
          Sel,
          {
            value: d.disjGeralFase,
            onChange: (e) =>
              set({ disjGeralFase: e.target.value, disjGeralA: "" }),
          },
          /* @__PURE__ */ React.createElement("option", { value: "" }),
          fasesDisj.map((s) =>
            /* @__PURE__ */ React.createElement(
              "option",
              { key: s, value: s },
              s,
            ),
          ),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label: "Disjuntor Geral — Corrente (A)",
          hint:
            limiteInj != null ? `Limite injeção: ${fmt2(limiteInj)} kW` : "",
        },
        /* @__PURE__ */ React.createElement(
          Sel,
          {
            value: d.disjGeralA,
            onChange: (e) => set({ disjGeralA: e.target.value }),
          },
          /* @__PURE__ */ React.createElement("option", { value: "" }),
          correntesDisj.map((a) =>
            /* @__PURE__ */ React.createElement(
              "option",
              { key: a, value: a },
              a,
            ),
          ),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Qte Disjuntor Geral" },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.qteDisjGeral,
          onChange: (e) =>
            set({ qteDisjGeral: e.target.value.replace(/\D/g, "") }),
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Tensão de Atendimento (V)" },
        /* @__PURE__ */ React.createElement(
          Sel,
          {
            value: d.tensaoAtendimento,
            onChange: (e) => set({ tensaoAtendimento: e.target.value }),
          },
          /* @__PURE__ */ React.createElement("option", { value: "" }),
          (d.grupo === "A" ? GD_TENSAO_A : GD_TENSAO_B).map((t) =>
            /* @__PURE__ */ React.createElement(
              "option",
              { key: t, value: t },
              t,
            ),
          ),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Haverá Mudança de Local do Padrão de Entrada?", span: 2 },
        /* @__PURE__ */ React.createElement(Toggle, {
          value: d.mudancaLocal,
          onChange: (v) => set({ mudancaLocal: v }),
          options: GD_SN.map((o) => ({ v: o, l: o })),
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label:
            "O padrão a ser ligado está a menos de 30 m do poste da CEMIG?",
          span: 3,
        },
        /* @__PURE__ */ React.createElement(Toggle, {
          value: d.distMenor30,
          onChange: (v) => set({ distMenor30: v }),
          options: GD_SN.map((o) => ({ v: o, l: o })),
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label:
            "O telhado será arrendado para pessoa/empresa diferente do proprietário?",
          span: 3,
        },
        /* @__PURE__ */ React.createElement(Toggle, {
          value: d.telhadoArrendado,
          onChange: (v) => set({ telhadoArrendado: v }),
          options: GD_SN.map((o) => ({ v: o, l: o })),
        }),
      ),
      d.telhadoArrendado === "Sim" &&
        /* @__PURE__ */ React.createElement(
          Field,
          {
            label:
              "As 2 instalações (existente + telhado) foram representadas no DUB e memorial descritivo?",
            span: 3,
            hint: "É necessário representar as 2 instalações no DUB e memorial descritivo",
          },
          /* @__PURE__ */ React.createElement(Toggle, {
            value: d.duasInstalacoesDUB,
            onChange: (v) => set({ duasInstalacoesDUB: v }),
            options: GD_SN.map((o) => ({ v: o, l: o })),
          }),
        ),
      !ehLigacaoNova &&
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Número da instalação existente no local", span: 2 },
          /* @__PURE__ */ React.createElement(Inp, {
            value: d.instExistente,
            onChange: (e) =>
              set({ instExistente: e.target.value.replace(/\D/g, "") }),
          }),
        ),
      !ehLigacaoNova &&
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "A instalação existente é atendida em BT ou MT?" },
          /* @__PURE__ */ React.createElement(
            Sel,
            {
              value: d.instExistenteBTMT,
              onChange: (e) => set({ instExistenteBTMT: e.target.value }),
            },
            /* @__PURE__ */ React.createElement("option", { value: "" }),
            GD_BT_MT.map((s) =>
              /* @__PURE__ */ React.createElement(
                "option",
                { key: s, value: s },
                s,
              ),
            ),
          ),
        ),
      ehAumentoPotencia &&
        /* @__PURE__ */ React.createElement(
          Field,
          {
            label: "Nova Proteção",
            req: true,
            span: 3,
            hint: "Para Aumento de Potência, informe a nova proteção (ex.: tipo/corrente do disjuntor geral a ser instalado).",
          },
          /* @__PURE__ */ React.createElement(Inp, {
            value: d.novaProtecao,
            onChange: (e) => set({ novaProtecao: e.target.value }),
          }),
        ),
      ehBT
        ? /* @__PURE__ */ React.createElement(
            Field,
            {
              label: "Demanda contratada de consumo (kW)",
            },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.demandaConsumo,
              onChange: (e) =>
                set({ demandaConsumo: e.target.value.replace(/[^\d.]/g, "") }),
            }),
          )
        : /* @__PURE__ */ React.createElement(
            Field,
            {
              label: "Demanda contratada de consumo (kW)",
              req: true,
              hint: "Potência em relação ao consumo da UC (não incluir trafos/inversores/placas)",
            },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.demandaConsumo,
              onChange: (e) =>
                set({ demandaConsumo: e.target.value.replace(/[^\d.]/g, "") }),
            }),
          ),
      !ehBT &&
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Demanda contratada de geração (kW)" },
          /* @__PURE__ */ React.createElement(Inp, {
            value: d.demandaGeracao,
            onChange: (e) =>
              set({ demandaGeracao: e.target.value.replace(/[^\d.]/g, "") }),
          }),
        ),
    ),
  );
}
function ViewDocumentacao({ ctx }) {
  const { d, set } = ctx;
  const setDoc = (id, v) => set({ docs: { ...d.docs, [id]: v } });
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Etapa " + ctx.etapaNum,
      title: "Documentação a anexar (Nova UC ou Alteração de Potência)",
    },
    /* @__PURE__ */ React.createElement(
      "p",
      { className: "card-sub" },
      'Marque os documentos que serão anexados à solicitação. Itens "Caso aplicável" só quando pertinentes.',
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "doc-list" },
      GD_DOCUMENTOS.map((doc) =>
        /* @__PURE__ */ React.createElement(
          "label",
          { key: doc.id, className: "doc-item" },
          /* @__PURE__ */ React.createElement("input", {
            type: "checkbox",
            checked: !!d.docs[doc.id],
            onChange: (e) => setDoc(doc.id, e.target.checked),
          }),
          /* @__PURE__ */ React.createElement(
            "span",
            { className: "doc-text" },
            /* @__PURE__ */ React.createElement("strong", null, doc.id),
            " ",
            doc.txt,
            doc.req &&
              /* @__PURE__ */ React.createElement(
                "span",
                { className: "doc-req" },
                " (obrigatório)",
              ),
          ),
        ),
      ),
    ),
  );
}
function ViewGeracao({ ctx }) {
  const { d, set } = ctx;
  const ehFV = d.fontePrimaria === "Solar";
  // Regra 4: "GD Existente COM Alteração de Potência Ativa Instalada Total" ⇒ a UC já possui
  // usina conectada; o cliente deve informar a potência de geração já existente.
  const ehAumentoTotal = (d.solicitacao || "").indexOf("GD Existente") >= 0;
  const potModulosCalc =
    ((parseFloat(d.qtdModulos) || 0) * (parseFloat(d.potNominalModulo) || 0)) /
    1e3;
  const potInversoresCalc =
    (parseFloat(d.qtdInversores) || 0) *
    (parseFloat(d.potNominalInversor) || 0);
  // Regra 5: Fast Track ⇒ usina ≤ 7,5 kW e Modalidade travada em Autoconsumo local.
  const ehFastTrack = d.fastTrack === "Sim";
  React.useEffect(() => {
    if (ehFastTrack && d.modalidade !== GD_MODALIDADE_AUTOCONSUMO_LOCAL)
      set({ modalidade: GD_MODALIDADE_AUTOCONSUMO_LOCAL });
  }, [ehFastTrack]);
  const potUsinaKw = parseFloat(d.potAtivaInstalada) || 0;
  const fastExcedeLimite = ehFastTrack && potUsinaKw > GD_FAST_LIMITE_USINA_KW;
  return /* @__PURE__ */ React.createElement(
    Card,
    { eyebrow: "Etapa " + ctx.etapaNum, title: "Dados da Geração" },
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid" },
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Tipo de Fonte Primária", req: true },
        /* @__PURE__ */ React.createElement(
          Sel,
          {
            value: d.fontePrimaria,
            onChange: (e) => set({ fontePrimaria: e.target.value }),
          },
          GD_FONTES.map((f) =>
            /* @__PURE__ */ React.createElement(
              "option",
              { key: f, value: f },
              f,
            ),
          ),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label: "Potência Ativa Instalada Total de Geração da Usina (kW)",
          req: true,
          span: 2,
          hint: ehFV
            ? "Calculado automaticamente: menor valor entre a potência total de módulos e a de inversores." +
              (ehFastTrack && fastExcedeLimite
                ? " Valor acima do limite Fast Track."
                : "")
            : ehFastTrack
              ? `Fast Track: máximo de ${GD_FAST_LIMITE_kW} kW (${GD_FAST_LIMITE_USINA_KW} kW).` +
                (fastExcedeLimite ? " Valor acima do limite permitido." : "")
              : "",
        },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.potAtivaInstalada,
          disabled: ehFV,
          onChange: (e) => {
            if (!ehFV)
              set({ potAtivaInstalada: e.target.value.replace(/[^\d.]/g, "") });
          },
        }),
      ),
      ehAumentoTotal &&
        /* @__PURE__ */ React.createElement(
          Field,
          {
            label: "Potência de geração já existente (kW)",
            req: true,
            hint: "Usina já conectada — informe a potência atualmente instalada.",
          },
          /* @__PURE__ */ React.createElement(Inp, {
            value: d.potGeracaoExistente,
            onChange: (e) =>
              set({
                potGeracaoExistente: e.target.value.replace(/[^\d.]/g, ""),
              }),
          }),
        ),
      fastExcedeLimite &&
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "field col-span-3" },
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "cmg-aviso cmg-aviso--warn no-print" },
            /* @__PURE__ */ React.createElement("div", {
              className: "cmg-aviso-icon",
              "aria-hidden": "true",
            }),
            /* @__PURE__ */ React.createElement(
              "p",
              { className: "cmg-aviso-texto" },
              /* @__PURE__ */ React.createElement(
                "strong",
                null,
                "Limite do Fast Track excedido. ",
              ),
              `No enquadramento Fast Track, a potência da usina não pode ser superior a ${GD_FAST_LIMITE_kW} kW (${GD_FAST_LIMITE_USINA_KW} kW).`,
            ),
          ),
        ),
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label: "Tipo de geração",
          req: true,
          span: d.tipoGeracao === "Outra (especificar):" ? 1 : 2,
        },
        /* @__PURE__ */ React.createElement(
          Sel,
          {
            value: d.tipoGeracao,
            onChange: (e) => set({ tipoGeracao: e.target.value }),
          },
          GD_TIPO_GERACAO.map((t) =>
            /* @__PURE__ */ React.createElement(
              "option",
              { key: t, value: t },
              t,
            ),
          ),
        ),
      ),
      d.tipoGeracao === "Outra (especificar):" &&
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Especificar" },
          /* @__PURE__ */ React.createElement(Inp, {
            value: d.tipoGeracaoOutro,
            onChange: (e) => set({ tipoGeracaoOutro: e.target.value }),
          }),
        ),
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label: "Modalidade de compensação",
          req: true,
          span: 2,
          hint: ehFastTrack
            ? "Travado: Fast Track exige Autoconsumo local."
            : "",
        },
        /* @__PURE__ */ React.createElement(
          Sel,
          {
            value: d.modalidade,
            disabled: ehFastTrack,
            onChange: (e) => set({ modalidade: e.target.value }),
          },
          /* @__PURE__ */ React.createElement("option", { value: "" }),
          GD_MODALIDADES.map((m) =>
            /* @__PURE__ */ React.createElement(
              "option",
              { key: m, value: m },
              m,
            ),
          ),
        ),
      ),
      ehFastTrack &&
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "field col-span-3" },
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "gd-modo-banner" },
            /* @__PURE__ */ React.createElement(
              "strong",
              null,
              "Modalidade definida automaticamente: Autoconsumo local",
            ),
            /* @__PURE__ */ React.createElement(
              "span",
              null,
              `Como o empreendimento é Fast Track (art. 73-A), a modalidade de compensação fica travada em Autoconsumo local e a potência da usina é limitada a ${GD_FAST_LIMITE_kW} kW.`,
            ),
          ),
        ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Qtde. de Instalações a receber o crédito" },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.qtdInstalacoesCredito,
          onChange: (e) =>
            set({ qtdInstalacoesCredito: e.target.value.replace(/\D/g, "") }),
        }),
      ),
    ),
    ehFV &&
      /* @__PURE__ */ React.createElement(
        React.Fragment,
        null,
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "gd-subhead" },
          "Central Geradora Fotovoltaica — Módulos",
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "grid" },
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Modelo dos Módulos" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.modeloModulos,
              onChange: (e) => set({ modeloModulos: e.target.value }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Fabricante dos Módulos" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.fabricanteModulos,
              onChange: (e) => set({ fabricanteModulos: e.target.value }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Potência Nominal Módulo (W)" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.potNominalModulo,
              onChange: (e) =>
                set({
                  potNominalModulo: e.target.value.replace(/[^\d.]/g, ""),
                }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Quantidade de Módulos" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.qtdModulos,
              onChange: (e) =>
                set({ qtdModulos: e.target.value.replace(/\D/g, "") }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            {
              label: "Potência Total Módulos (kW)",
              hint: "Calculado: qtd × nominal",
            },
            /* @__PURE__ */ React.createElement(Inp, {
              value: fmt2(potModulosCalc),
              onChange: () => {},
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Área dos Arranjos (m²)" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.areaArranjos,
              onChange: (e) =>
                set({ areaArranjos: e.target.value.replace(/[^\d.]/g, "") }),
            }),
          ),
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "gd-subhead" },
          "Central Geradora Fotovoltaica — Inversores",
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "grid" },
          /* @__PURE__ */ React.createElement(
            Field,
            {
              label: "Modelo dos Inversores",
              hint: "Para mais de 1 modelo, separar com barra (/)",
            },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.modeloInversores,
              onChange: (e) => set({ modeloInversores: e.target.value }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Fabricante dos Inversores" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.fabricanteInversores,
              onChange: (e) => set({ fabricanteInversores: e.target.value }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Potência Nominal Inversor (kW)" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.potNominalInversor,
              onChange: (e) =>
                set({
                  potNominalInversor: e.target.value.replace(/[^\d.]/g, ""),
                }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Quantidade de Inversores" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.qtdInversores,
              onChange: (e) =>
                set({ qtdInversores: e.target.value.replace(/\D/g, "") }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            {
              label: "Potência Total dos Inversores (kW)",
              hint: "Calculado: qtd × nominal",
            },
            /* @__PURE__ */ React.createElement(Inp, {
              value: fmt2(potInversoresCalc),
              onChange: () => {},
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Tensão de Conexão do Inversor (V)" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.tensaoConexaoInversor,
              onChange: (e) =>
                set({
                  tensaoConexaoInversor: e.target.value.replace(/[^\d.]/g, ""),
                }),
            }),
          ),
        ),
      ),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "gd-subhead" },
      "Outorga ou Registro (preencher somente se aplicável)",
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid" },
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "CEG do empreendimento", span: 2 },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.ceg,
          onChange: (e) => set({ ceg: e.target.value }),
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Número do Ato de Outorga ou Registro" },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.numAtoOutorga,
          onChange: (e) => set({ numAtoOutorga: e.target.value }),
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Nome da Usina", span: 2 },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.nomeUsina,
          onChange: (e) => set({ nomeUsina: e.target.value }),
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Ano do Ato de Outorga ou Registro" },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.anoAtoOutorga,
          onChange: (e) =>
            set({ anoAtoOutorga: e.target.value.replace(/\D/g, "") }),
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Tipo do Ato de Outorga ou Registro", span: 3 },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.tipoAtoOutorga,
          onChange: (e) => set({ tipoAtoOutorga: e.target.value }),
        }),
      ),
    ),
  );
}
function ViewArmazenamento({ ctx }) {
  const { d, set } = ctx;
  const sim = d.possuiArmazenamento === "Sim";
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Etapa " + ctx.etapaNum,
      title: "Sistema de Armazenamento de Energia",
    },
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid" },
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Possui sistema de armazenamento de energia?", span: 3 },
        /* @__PURE__ */ React.createElement(Toggle, {
          value: d.possuiArmazenamento,
          onChange: (v) => set({ possuiArmazenamento: v }),
          options: GD_SN.map((o) => ({ v: o, l: o })),
        }),
      ),
      sim &&
        /* @__PURE__ */ React.createElement(
          React.Fragment,
          null,
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Sistema com possibilidade de operação ilhada?", span: 3 },
            /* @__PURE__ */ React.createElement(Toggle, {
              value: d.armOperacaoIlhada,
              onChange: (v) => set({ armOperacaoIlhada: v }),
              options: GD_SN.map((o) => ({ v: o, l: o })),
            }),
          ),
          d.armOperacaoIlhada === "Sim" &&
            /* @__PURE__ */ React.createElement(
              React.Fragment,
              null,
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Chave de desconexão física?" },
                /* @__PURE__ */ React.createElement(Toggle, {
                  value: d.armChaveDesconexao,
                  onChange: (v) => set({ armChaveDesconexao: v }),
                  options: GD_SN.map((o) => ({ v: o, l: o })),
                }),
              ),
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Reconexão automática?" },
                /* @__PURE__ */ React.createElement(Toggle, {
                  value: d.armReconexaoAuto,
                  onChange: (v) => set({ armReconexaoAuto: v }),
                  options: GD_SN.map((o) => ({ v: o, l: o })),
                }),
              ),
            ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Capacidade do banco de baterias (kWh)" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.armCapacidadeKwh,
              onChange: (e) =>
                set({
                  armCapacidadeKwh: e.target.value.replace(/[^\d.]/g, ""),
                }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Potência total do banco de baterias (kW)" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.armPotenciaKw,
              onChange: (e) =>
                set({ armPotenciaKw: e.target.value.replace(/[^\d.]/g, "") }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Capacidade nominal do banco (Ah)" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.armCapacidadeAh,
              onChange: (e) =>
                set({ armCapacidadeAh: e.target.value.replace(/[^\d.]/g, "") }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Tensão do banco em CC (V)" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.armTensaoCC,
              onChange: (e) =>
                set({ armTensaoCC: e.target.value.replace(/[^\d.]/g, "") }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Profundidade de descarga (%)" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.armProfundidadeDescarga,
              onChange: (e) =>
                set({
                  armProfundidadeDescarga: e.target.value.replace(
                    /[^\d.]/g,
                    "",
                  ),
                }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Produção mensal da central geradora (kWh)" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.armProducaoMensal,
              onChange: (e) =>
                set({
                  armProducaoMensal: e.target.value.replace(/[^\d.]/g, ""),
                }),
            }),
          ),
        ),
    ),
  );
}
function ViewDeclaracoes({ ctx }) {
  const { d, set } = ctx;
  const setDocTec = (id, v) => set({ docsTec: { ...d.docsTec, [id]: v } });
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Etapa " + ctx.etapaNum,
      title: "Documentação técnica, declarações e solicitante",
    },
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "gd-subhead" },
      "6 — Documentação Técnica (obrigatória)",
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "doc-list" },
      GD_DOCS_TEC.map((dc) =>
        /* @__PURE__ */ React.createElement(
          "label",
          { key: dc.id, className: "doc-item" },
          /* @__PURE__ */ React.createElement("input", {
            type: "checkbox",
            checked: !!d.docsTec[dc.id],
            onChange: (e) => setDocTec(dc.id, e.target.checked),
          }),
          /* @__PURE__ */ React.createElement(
            "span",
            { className: "doc-text" },
            /* @__PURE__ */ React.createElement("strong", null, dc.id),
            " ",
            dc.txt,
            dc.req &&
              /* @__PURE__ */ React.createElement(
                "span",
                { className: "doc-req" },
                " (obrigatório)",
              ),
          ),
        ),
      ),
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "gd-subhead" },
      "7 — Contato na Distribuidora",
    ),
    /* @__PURE__ */ React.createElement(
      GdAviso,
      { mod: "" },
      /* @__PURE__ */ React.createElement(
        "span",
        { style: { display: "block" } },
        /* @__PURE__ */ React.createElement(
          "strong",
          null,
          GD_CONTATO_CEMIG.responsavel,
        ),
      ),
      /* @__PURE__ */ React.createElement(
        "span",
        { style: { display: "block" } },
        GD_CONTATO_CEMIG.endereco,
      ),
      /* @__PURE__ */ React.createElement(
        "span",
        { style: { display: "block" } },
        "Telefone: ",
        GD_CONTATO_CEMIG.telefone,
        " · E-mail: ",
        GD_CONTATO_CEMIG.email,
      ),
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "gd-subhead" },
      "8 — Solicitações e Declarações",
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid" },
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label:
            "8.1 - O padrão está pronto para ser ligado e a usina está instalada?",
          span: 3,
          hint: "Se 'Não', solicite vistoria/ligação em até 120 dias após o orçamento de conexão.",
        },
        /* @__PURE__ */ React.createElement(Toggle, {
          value: d.decl81,
          onChange: (v) => set({ decl81: v }),
          options: GD_SN.map((o) => ({ v: o, l: o })),
        }),
      ),
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "doc-list", style: { marginTop: 10 } },
      /* @__PURE__ */ React.createElement(
        "label",
        { className: "doc-item" },
        /* @__PURE__ */ React.createElement("input", {
          type: "checkbox",
          checked: d.decl82,
          onChange: (e) => set({ decl82: e.target.checked }),
        }),
        /* @__PURE__ */ React.createElement(
          "span",
          { className: "doc-text" },
          /* @__PURE__ */ React.createElement("strong", null, "8.2"),
          " Renuncio ao direito de desistir do orçamento de conexão nos termos da resolução ANEEL vigente. (Opcional)",
        ),
      ),
      /* @__PURE__ */ React.createElement(
        "label",
        { className: "doc-item" },
        /* @__PURE__ */ React.createElement("input", {
          type: "checkbox",
          checked: d.decl83,
          onChange: (e) => set({ decl83: e.target.checked }),
        }),
        /* @__PURE__ */ React.createElement(
          "span",
          { className: "doc-text" },
          /* @__PURE__ */ React.createElement("strong", null, "8.3"),
          " Autorizo a distribuidora a entregar junto com o orçamento de conexão os contratos e o meio para pagamento de custos de minha responsabilidade. (Opcional)",
        ),
      ),
      /* @__PURE__ */ React.createElement(
        "label",
        { className: "doc-item" },
        /* @__PURE__ */ React.createElement("input", {
          type: "checkbox",
          checked: d.decl84,
          onChange: (e) => set({ decl84: e.target.checked }),
        }),
        /* @__PURE__ */ React.createElement(
          "span",
          { className: "doc-text" },
          /* @__PURE__ */ React.createElement("strong", null, "8.4"),
          " Declaro que as instalações internas, incluindo a GD, atendem às normas da distribuidora, ABNT, órgãos oficiais e ao art. 8º da Lei nº 9.074/1995. ",
          /* @__PURE__ */ React.createElement(
            "span",
            { className: "doc-req" },
            "(Obrigatório)",
          ),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        "label",
        { className: "doc-item" },
        /* @__PURE__ */ React.createElement("input", {
          type: "checkbox",
          checked: d.decl86,
          onChange: (e) => set({ decl86: e.target.checked }),
        }),
        /* @__PURE__ */ React.createElement(
          "span",
          { className: "doc-text" },
          /* @__PURE__ */ React.createElement("strong", null, "8.6"),
          " Declaro que todas as informações prestadas neste documento são verdadeiras. ",
          /* @__PURE__ */ React.createElement(
            "span",
            { className: "doc-req" },
            "(Obrigatório)",
          ),
        ),
      ),
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid", style: { marginTop: 10 } },
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label:
            "8.5 - Dispensa da análise de inversão de fluxo (art. 73-A) — selecione 1 (opcional)",
          span: 3,
        },
        /* @__PURE__ */ React.createElement(
          Sel,
          {
            value: d.decl85Regra,
            onChange: (e) => set({ decl85Regra: e.target.value }),
          },
          /* @__PURE__ */ React.createElement(
            "option",
            { value: "" },
            "Nenhuma",
          ),
          GD_DECL_85.map((r) =>
            /* @__PURE__ */ React.createElement(
              "option",
              { key: r, value: r },
              r,
            ),
          ),
        ),
      ),
    ),
  );
}
// Correspondência e Fatura (etapa própria) — replica o bloco do BT: receber
// fatura por e-mail, dia de vencimento e "Possui conta globalizada (poder
// público)?" com número condicional. Inclui os dados do Solicitante (nome +
// endereço de correspondência + telefones/e-mail) e as Observações gerais.
function ViewCorrespondencia({ ctx }) {
  const { d, set } = ctx;
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Etapa " + ctx.etapaNum,
      title: "Correspondência e Fatura",
      sub: "Escolha como e quando você deseja receber a conta de energia.",
    },
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid" },
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Deseja receber a fatura no e-mail informado?", req: true },
        /* @__PURE__ */ React.createElement(Toggle, {
          value: d.receberEmail,
          onChange: (v) => set({ receberEmail: v }),
          options: [
            { v: "Sim", l: "Sim" },
            { v: "Não", l: "Não" },
          ],
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Data de Vencimento da Fatura", req: true },
        /* @__PURE__ */ React.createElement(Toggle, {
          value: d.vencimento,
          onChange: (v) => set({ vencimento: v }),
          options: DIAS_VENCIMENTO.map((dia) => ({ v: dia, l: dia })),
        }),
      ),
    ),
    d.receberEmail === "Não" &&
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "divider" },
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Como deseja receber a fatura?", req: true },
          /* @__PURE__ */ React.createElement(Toggle, {
            value: d.corrAlternativa,
            onChange: (v) => set({ corrAlternativa: v }),
            options: [
              { v: "Endereço novo", l: "Novo endereço" },
              { v: "Mesmo da obra", l: "Endereço da obra" },
              { v: "Outro e-mail", l: "Outro e-mail" },
            ],
          }),
        ),
        d.corrAlternativa === "Mesmo da obra" &&
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "alert alert-info", style: { marginTop: 12 } },
            "A fatura será enviada para o endereço informado nos",
            " ",
            /* @__PURE__ */ React.createElement(
              "strong",
              null,
              "Dados da Unidade Consumidora",
            ),
            ".",
          ),
        d.corrAlternativa === "Outro e-mail" &&
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "grid grid-2", style: { marginTop: 12 } },
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "E-mail para envio da fatura", span: 2, req: true },
              /* @__PURE__ */ React.createElement(Inp, {
                type: "email",
                value: d.corrOutroEmail,
                onChange: (e) => set({ corrOutroEmail: e.target.value }),
                placeholder: "email@exemplo.com",
              }),
            ),
          ),
        d.corrAlternativa === "Endereço novo" &&
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "grid grid-2", style: { marginTop: 12 } },
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "CEP", span: 2 },
              /* @__PURE__ */ React.createElement(
                "div",
                { style: { maxWidth: 180 } },
                /* @__PURE__ */ React.createElement(Inp, {
                  value: d.corrCep,
                  onChange: (e) =>
                    set({ corrCep: mascararCEP(e.target.value) }),
                  placeholder: "00000-000",
                }),
              ),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Rua / Av.", span: 2 },
              /* @__PURE__ */ React.createElement(Inp, {
                value: d.corrRua,
                onChange: (e) => set({ corrRua: e.target.value }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Nº" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: d.corrNum,
                onChange: (e) => set({ corrNum: e.target.value }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Complemento do endereço" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: d.corrCompl,
                onChange: (e) => set({ corrCompl: e.target.value }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Bairro / Distrito" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: d.corrBairro,
                onChange: (e) => set({ corrBairro: e.target.value }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Município" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: d.corrMunicipio,
                onChange: (e) => set({ corrMunicipio: e.target.value }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Estado" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: d.corrEstado,
                onChange: (e) => set({ corrEstado: e.target.value }),
              }),
            ),
          ),
        /* Conta globalizada (poder público): oferecida só quando o cliente NÃO
           recebe a fatura por e-mail; o número só aparece ao marcar "Sim". */
        /* @__PURE__ */ React.createElement(
          "div",
          { style: { marginTop: 12 } },
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Possui conta globalizada (poder público)?", span: 2 },
            /* @__PURE__ */ React.createElement(Toggle, {
              value: d.possuiContaGlobal,
              onChange: (v) =>
                set({
                  possuiContaGlobal: v,
                  contaGlobal: v === "Sim" ? d.contaGlobal : "",
                }),
              options: [
                { v: "Sim", l: "Sim" },
                { v: "Não", l: "Não" },
              ],
            }),
          ),
          d.possuiContaGlobal === "Sim" &&
            /* @__PURE__ */ React.createElement(
              Field,
              {
                label:
                  "Conta globalizada (código de débito automático globalizado)",
                req: true,
                span: 2,
              },
              /* @__PURE__ */ React.createElement(Inp, {
                value: d.contaGlobal,
                onChange: (e) => set({ contaGlobal: e.target.value }),
                placeholder: "000000000",
              }),
            ),
        ),
      ),
  );
}
function ViewFormularioCarga({ ctx }) {
  const { d, set } = ctx;
  const exigeFormCarga = GD_SOLICITACOES_FORM_CARGA.includes(d.solicitacao);
  // Atividade deriva da classe: Residencial usa fatores residenciais; demais usam não-residencial.
  const atividade =
    d.classe === "Residencial"
      ? "Residencial"
      : d.classe === "Industrial"
        ? "Industrial"
        : d.classe === "Comercial"
          ? "Comercial"
          : "";
  // Rede monofásica disponível apenas para atendimento em BT (Grupo B).
  const redeMono = d.grupo === "B";
  const c = d.cargas || {};
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Etapa " + ctx.etapaNum,
      title: "Formulário de Carga",
      sub: "Declare todas as cargas elétricas da unidade consumidora. A demanda e o disjuntor sugerido são calculados automaticamente (ND-5.1).",
    },
    exigeFormCarga &&
      /* @__PURE__ */ React.createElement(
        GdAviso,
        { mod: "", style: { marginBottom: 12 } },
        /* @__PURE__ */ React.createElement(
          "strong",
          null,
          "O preenchimento do Formulário de Carga é obrigatório. ",
        ),
        "Para Ligação Nova ou Aumento/Alteração de Carga, todas as cargas elétricas devem ser declaradas aqui.",
      ),
    /* @__PURE__ */ React.createElement(CalcDemanda, {
      data: c,
      onChange: (nc) => set({ cargas: nc }),
      redeMono,
      atividade,
      mostrarCargasAdicionais: true,
    }),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "kpi-row", style: { marginTop: 12 } },
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "kpi" },
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "kpi-label" },
          "Carga Instalada",
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "kpi-value" },
          fmt2(c._cargaKw || 0),
          " kW",
        ),
      ),
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "kpi" },
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "kpi-label" },
          "Demanda Calculada",
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "kpi-value" },
          fmt2(c._demanda || 0),
          " kVA",
        ),
      ),
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "kpi dark" },
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "kpi-label" },
          "Disjuntor Sugerido",
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "kpi-value" },
          c._disjuntores?.length ? c._disjuntores.join(" · ") : "—",
        ),
      ),
    ),
    c._disjuntores?.length > 0 &&
      /* @__PURE__ */ React.createElement(
        "div",
        { style: { marginTop: 12 } },
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Disjuntor escolhido" },
          /* @__PURE__ */ React.createElement(
            Sel,
            {
              value: d.cargaDisjEscolhido || c._disjuntores[0],
              onChange: (e) => set({ cargaDisjEscolhido: e.target.value }),
            },
            c._disjuntores.map((dj) =>
              /* @__PURE__ */ React.createElement(
                "option",
                { key: dj, value: dj },
                dj,
              ),
            ),
          ),
        ),
      ),
  );
}
function ViewRevisao({ ctx }) {
  const { d, validacao, gerarPdf } = ctx;
  /* Prévia no padrão Figma (ver .previa-* em shared.css): seções tituladas
     em verde com campos rótulo+valor em grade de 2 colunas e o aviso
     pós-exportação (PreviaAvisoExportacao) ao final. */
  const campo = (label, val, full) =>
    /* @__PURE__ */ React.createElement(PreviaCampo, {
      key: label,
      label,
      valor: val,
      full: !!full,
    });
  const secao = (titulo, campos) =>
    /* @__PURE__ */ React.createElement(
      PreviaSecao,
      { titulo },
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "previa-grid" },
        campos,
      ),
    );
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Etapa " + ctx.etapaNum,
      title: "Prévia do formulário",
      sub: "Confira se todos os dados estão corretos e gere o PDF para anexar à sua solicitação no Cemig Atende.",
    },
    !validacao.ok
      ? /* @__PURE__ */ React.createElement(
          "div",
          { className: "rev-faltas" },
          /* @__PURE__ */ React.createElement(
            "strong",
            null,
            "Preencha os campos obrigatórios antes de exportar:",
          ),
          /* @__PURE__ */ React.createElement(
            "ul",
            null,
            validacao.faltas.map((f) =>
              /* @__PURE__ */ React.createElement("li", { key: f }, f),
            ),
          ),
        )
      : /* @__PURE__ */ React.createElement(
          "div",
          { className: "rev-ok" },
          "Todos os campos obrigatórios preenchidos. Pronto para exportar.",
        ),
    secao("1 — Identificação", [
      campo("Instalação", d.instalacao),
      campo("Titular", d.titular),
      campo("Grupo / Classe", `${d.grupo} / ${d.classe}`),
      campo("CPF/CNPJ", d.cpfCnpj),
      campo(
        "Endereço",
        `${d.logradouro}, ${d.numero} ${d.complemento} — ${d.bairro}, ${d.municipio}/${d.estado}`,
        true,
      ),
      campo("Fast Track / Grid Zero", `${d.fastTrack} / ${d.gridZero}`),
    ]),
    /* @__PURE__ */ React.createElement(PreviaDivider, null),
    secao("2 — Dados da UC", [
      campo("Coordenadas", `Lat ${d.latitude} · Lon ${d.longitude}`),
      campo("UTM (calculada)", `Fuso ${d.fuso} · E ${d.utmE} · N ${d.utmN}`),
      campo("Solicitação", d.solicitacao),
      campo("Edificação", d.edificacao),
      campo(
        "Disjuntor Geral",
        `${d.disjGeralFase || "—"} ${d.disjGeralA || ""}`,
      ),
      campo(
        "Demanda consumo / geração (kW)",
        `${d.demandaConsumo || "—"} / ${d.demandaGeracao || "—"}`,
      ),
    ]),
    /* @__PURE__ */ React.createElement(PreviaDivider, null),
    secao("4 — Geração", [
      campo("Fonte", d.fontePrimaria),
      campo("Pot. Ativa Instalada (kW)", d.potAtivaInstalada),
      campo("Modalidade", d.modalidade),
      d.fontePrimaria === "Solar" &&
        campo(
          "Módulos / Inversores (kW)",
          `${d.potTotalModulos || "—"} / ${d.potTotalInversores || "—"}`,
        ),
    ]),
    /* @__PURE__ */ React.createElement(PreviaDivider, null),
    secao("5 — Armazenamento", [campo("Possui", d.possuiArmazenamento)]),
    /* @__PURE__ */ React.createElement(PreviaDivider, null),
    secao("Correspondência e Fatura", [
      campo("Receber fatura por e-mail", d.receberEmail),
      campo("Vencimento", d.vencimento),
      d.receberEmail === "Não" &&
        campo("Como deseja receber a fatura", d.corrAlternativa),
      d.receberEmail === "Não" &&
        d.corrAlternativa === "Outro e-mail" &&
        campo("E-mail para envio da fatura", d.corrOutroEmail, true),
      d.receberEmail === "Não" &&
        d.corrAlternativa === "Endereço novo" &&
        campo(
          "Endereço da fatura",
          [
            [d.corrRua, d.corrNum].filter(Boolean).join(", "),
            d.corrBairro,
            d.corrMunicipio,
            d.corrEstado,
            d.corrCep,
          ]
            .filter(Boolean)
            .join(" · "),
          true,
        ),
      d.receberEmail === "Não" &&
        campo(
          "Conta globalizada",
          d.possuiContaGlobal === "Sim"
            ? d.contaGlobal || "Sim"
            : d.possuiContaGlobal,
        ),
    ]),
    /* Botão "Exportar PDF" removido daqui — o único é o inferior (nav-bottom, app.js). */
    /* @__PURE__ */ React.createElement(PreviaAvisoExportacao, null),
  );
}
