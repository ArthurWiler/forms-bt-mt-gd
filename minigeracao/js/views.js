// Etapa 1 — Orientações para preenchimento (conteúdo em GD_ORIENTACOES,
// data.js). Mesmo padrão visual do BT individual: blocos titulados
// (.subbox-title) + lista numerada (.orient-list) + aviso (.cmg-aviso)
// + legenda de obrigatoriedade. Espelhado no MicroGD (microgeracao/js/views.js).
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
  const { d, set, cnpjStatus, buscarCnpj, cepStatus, buscarCep } = ctx;
  // Campos de Pessoa Física só após CPF completo e válido (igual ao BT/MT).
  const _doc = validarCpfCnpj(d.cpfCnpj);
  const pfValidado = _doc.tipo === "CPF" && _doc.valido === true;
  return /* @__PURE__ */ React.createElement(
    Card,
    { eyebrow: "Etapa " + ctx.etapaNum, title: "Identificação da Unidade Consumidora" },
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid" },
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Número da instalação", req: true, span: 2 },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.instalacao,
          onChange: (e) =>
            set({ instalacao: e.target.value.replace(/\D/g, "") }),
          placeholder: "Nº da instalação CEMIG",
        }),
      ),
      /* ── Dados do Proprietário/Titular (ordem BT): Titular→E-mail,
         Celular→Telefone, CPF/CNPJ→Filiação, RG→Nascimento, Laudo→NIS. ── */
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Titular da Unidade Consumidora", req: true },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.titular,
          onChange: (e) => set({ titular: e.target.value }),
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "E-mail", req: true },
        /* @__PURE__ */ React.createElement(Inp, {
          type: "email",
          value: d.email,
          onChange: (e) => set({ email: e.target.value }),
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Celular", req: true },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.celular,
          onChange: (e) => set({ celular: mascararCelular(e.target.value) }),
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Telefone" },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.telefone,
          onChange: (e) => set({ telefone: mascararFixo(e.target.value) }),
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "CPF/CNPJ", req: true, hint: cnpjStatus },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.cpfCnpj,
          onChange: (e) => {
            const v = mascararCpfCnpj(e.target.value);
            set({ cpfCnpj: v });
            if (ehCNPJ(v) && soDigitos(v).length === 14) buscarCnpj(v);
          },
          placeholder: "Somente números",
        }),
      ),
      pfValidado &&
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Filiação (Mãe ou Pai)", req: true },
          /* @__PURE__ */ React.createElement(Inp, {
            value: d.filiacao,
            onChange: (e) => set({ filiacao: e.target.value }),
          }),
        ),
      pfValidado &&
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "RG / RNE / RANI" },
          /* @__PURE__ */ React.createElement(Inp, {
            value: d.rg,
            onChange: (e) => set({ rg: mascararRG(e.target.value) }),
          }),
        ),
      pfValidado &&
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Data de Nascimento", req: true },
          /* @__PURE__ */ React.createElement(Inp, {
            type: "date",
            value: d.nasc,
            onChange: (e) => set({ nasc: e.target.value }),
          }),
        ),
      pfValidado &&
        /* @__PURE__ */ React.createElement(
          Field,
          {
            label: "Possui laudo médico (equipamentos essenciais)?",
            req: true,
          },
          /* @__PURE__ */ React.createElement(Toggle, {
            value: d.laudoMedico,
            onChange: (v) => set({ laudoMedico: v }),
            options: [
              { v: "Sim", l: "Sim" },
              { v: "Não", l: "Não" },
            ],
          }),
        ),
      pfValidado &&
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Possui NIS para Tarifa Social?", req: true },
          /* @__PURE__ */ React.createElement(Toggle, {
            value: d.nis,
            onChange: (v) => set({ nis: v }),
            options: [
              { v: "Sim", l: "Sim" },
              { v: "Não", l: "Não" },
            ],
          }),
        ),
      pfValidado &&
        d.nis === "Sim" &&
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Número do NIS", req: true, span: 2 },
          /* @__PURE__ */ React.createElement(Inp, {
            value: d.numNis,
            onChange: (e) => set({ numNis: e.target.value }),
          }),
        ),
      /* ── Classificação da UC ── */
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Grupo", req: true },
        /* @__PURE__ */ React.createElement(
          Sel,
          { value: d.grupo, onChange: (e) => set({ grupo: e.target.value }) },
          GD_GRUPOS.map((g) =>
            /* @__PURE__ */ React.createElement(
              "option",
              { key: g, value: g },
              g,
            ),
          ),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Classe", req: true },
        /* @__PURE__ */ React.createElement(
          Sel,
          { value: d.classe, onChange: (e) => set({ classe: e.target.value }) },
          /* @__PURE__ */ React.createElement("option", { value: "" }),
          GD_CLASSES.map((c) =>
            /* @__PURE__ */ React.createElement(
              "option",
              { key: c, value: c },
              c,
            ),
          ),
        ),
      ),
      /* ── Endereço (ordem do BT: CEP primeiro auto-preenche o restante) ── */
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "CEP", req: true, hint: cepStatus },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.cep,
          onChange: (e) => {
            const v = mascararCEP(e.target.value);
            set({ cep: v });
            if (soDigitos(v).length === 8) buscarCep(v);
          },
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Logradouro", req: true, span: 2 },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.logradouro,
          onChange: (e) => set({ logradouro: e.target.value }),
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Número", req: true },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.numero,
          onChange: (e) => set({ numero: e.target.value }),
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Complemento do endereço" },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.complemento,
          onChange: (e) => set({ complemento: e.target.value }),
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Bairro", req: true },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.bairro,
          onChange: (e) => set({ bairro: e.target.value }),
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Município", req: true },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.municipio,
          onChange: (e) => set({ municipio: e.target.value }),
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Estado", req: true },
        /* @__PURE__ */ React.createElement(
          Sel,
          { value: d.estado, onChange: (e) => set({ estado: e.target.value }) },
          /* @__PURE__ */ React.createElement("option", { value: "MG" }, "MG"),
        ),
      ),
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
  const setTrafo = (i, patch) =>
    set({ trafos: d.trafos.map((t, k) => (k === i ? { ...t, ...patch } : t)) });
  const addTrafo = () =>
    set({ trafos: [...d.trafos, { se: d.tipoSE, qte: "", potencia: "" }] });
  const delTrafo = (i) => set({ trafos: d.trafos.filter((_, k) => k !== i) });
  // Regras 7,8,14: disponibilidade da subestação por tipo × tensão × tipo de solicitação
  // (inclui migração BT→MT tratada como ligação nova e a mudança de local da subestação).
  const seCtx = {
    solicitacao: d.solicitacao,
    tensao: d.tensaoAtendimento,
    mudancaSE: d.mudancaSE,
    instExistenteBTMT: d.instExistenteBTMT,
  };
  const seDesabilitado = (s) => !gdSEDisponivel(s, seCtx).ok;
  const seBloqueioMsg = d.tipoSE ? gdSEDisponivel(d.tipoSE, seCtx).msg : "";
  // Regra 9: limite de 300 kVA (SE Nº 1, 5, 6 e 8) e sugestão de alta tensão acima de 2500 kW.
  const potInstalada = parseFloat(d.potAtivaInstalada) || 0;
  const seLimite300 = d.tipoSE && GD_SE_LIMITE_300.includes(d.tipoSE);
  const excede300 = seLimite300 && potInstalada > GD_SE_LIMITE_KW;
  // Regra 5/7: filtragem dinâmica — só exibe (em cards) as subestações permitidas
  // pela norma para a potência informada. As Nº 1, 5, 6 e 8 (limite 300 kVA) são
  // removidas automaticamente quando a potência instalada excede 300 kVA.
  const tiposSEvisiveis = GD_TIPOS_SE.filter(
    (s) => !(GD_SE_LIMITE_300.includes(s) && potInstalada > GD_SE_LIMITE_KW),
  );
  // Se o tipo selecionado passou a ser inválido (cenário) ou foi removido por
  // exceder o limite de potência, limpa a seleção.
  React.useEffect(() => {
    if (d.tipoSE && (seDesabilitado(d.tipoSE) || !tiposSEvisiveis.includes(d.tipoSE)))
      set({ tipoSE: "" });
  }, [d.solicitacao, d.tensaoAtendimento, d.mudancaSE, d.instExistenteBTMT, potInstalada]);
  const sugereAT = potInstalada > GD_SE_SUGESTAO_AT_KW;
  // Regra 4: Formulário de Carga obrigatório (alteração de demanda / ligação nova).
  const exigeFormCarga = GD_SOLICITACOES_FORM_CARGA.includes(d.solicitacao);
  const compartilhada = d.entradaEnergia === GD_ENTRADA_COMPARTILHADA;
  // Regra 13: em Ligação de Nova UC, ocultar campos de instalação/UC existentes.
  const ehLigacaoNova = d.solicitacao === GD_SOLICITACAO_LIG_NOVA;
  // Regra 10: "SEM Alteração de Demanda Contratada" ⇒ não solicitar nova demanda de consumo.
  const semAlteracaoDemanda =
    (d.solicitacao || "").indexOf("SEM Alteração de Demanda") >= 0;
  // Regras 17/18: a demanda de geração só é forçada a 0 (e travada) quando Grid Zero = Sim.
  const gridZero = d.gridZero === "Sim";
  React.useEffect(() => {
    if (gridZero && d.demandaGeracao !== "0") set({ demandaGeracao: "0" });
  }, [gridZero]);
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
        { label: "Tipo de Subestação (ND 5.3)", hint: seBloqueioMsg, span: 3 },
        /* @__PURE__ */ React.createElement(GdSeGaleria, {
          tipos: tiposSEvisiveis,
          value: d.tipoSE,
          onSelect: (t) => set({ tipoSE: t }),
          disabledFn: seDesabilitado,
        }),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Haverá mudança de local da subestação?", span: 2 },
        /* @__PURE__ */ React.createElement(Toggle, {
          value: d.mudancaSE,
          onChange: (v) => set({ mudancaSE: v }),
          options: GD_SN.map((o) => ({ v: o, l: o })),
        }),
      ),
      excede300 &&
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "field col-span-3" },
          /* @__PURE__ */ React.createElement(
            GdAviso,
            { mod: "warn" },
            /* @__PURE__ */ React.createElement(
              "strong",
              null,
              "Limite de 300 kVA. ",
            ),
            `A Subestação ${d.tipoSE} é limitada a ${GD_SE_LIMITE_KW} kVA. A potência instalada informada (${potInstalada} kW) excede esse limite — selecione outro tipo de subestação.`,
          ),
        ),
      sugereAT &&
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "field col-span-3" },
          /* @__PURE__ */ React.createElement(
            GdAviso,
            { mod: "" },
            /* @__PURE__ */ React.createElement(
              "strong",
              null,
              "Atendimento em alta tensão. ",
            ),
            `Acima de ${GD_SE_SUGESTAO_AT_KW} kW, o planejamento deverá avaliar o atendimento em alta tensão.`,
          ),
        ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Tipo de Ligação do Transformador" },
        /* @__PURE__ */ React.createElement(
          Sel,
          {
            value: d.tipoLigTrafo,
            onChange: (e) => set({ tipoLigTrafo: e.target.value }),
          },
          /* @__PURE__ */ React.createElement("option", { value: "" }),
          GD_TIPO_LIG_TRAFO.map((s) =>
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
        { label: "Impedância Percentual do Transformador (%)", req: true },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.impedanciaTrafo,
          onChange: (e) =>
            set({ impedanciaTrafo: e.target.value.replace(/[^\d.]/g, "") }),
        }),
      ),
    ),
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
                  /* @__PURE__ */ React.createElement("input", {
                    type: "number",
                    min: "0",
                    step: "any",
                    value: t.potencia,
                    onChange: (e) =>
                      setTrafo(i, {
                        potencia: e.target.value.replace(/[^\d.]/g, ""),
                      }),
                    placeholder: "kVA",
                    style: { width: 120 },
                  }),
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
        {
          label:
            "Potência do Grupo Motor Gerador de Emergência em Paralelo (kVA)",
          span: 2,
        },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.geradorPotencia,
          onChange: (e) =>
            set({ geradorPotencia: e.target.value.replace(/[^\d.]/g, "") }),
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
          GD_TENSAO_A.map((t) =>
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
        { label: "Entrada de Energia" },
        /* @__PURE__ */ React.createElement(
          Sel,
          {
            value: d.entradaEnergia,
            onChange: (e) => set({ entradaEnergia: e.target.value }),
          },
          /* @__PURE__ */ React.createElement("option", { value: "" }),
          GD_ENTRADA_ENERGIA.map((s) =>
            /* @__PURE__ */ React.createElement(
              "option",
              { key: s, value: s },
              s,
            ),
          ),
        ),
      ),
      compartilhada &&
        /* @__PURE__ */ React.createElement(
          Field,
          {
            label: "Quantidade de Cubículos",
            req: true,
            hint: "Subestação compartilhada",
          },
          /* @__PURE__ */ React.createElement(Inp, {
            value: d.qtdCubiculos,
            onChange: (e) =>
              set({ qtdCubiculos: e.target.value.replace(/\D/g, "") }),
          }),
        ),
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label: "Tipo de Solicitação",
          req: true,
          span: 3,
          hint: "Para fonte diferente da original, deverá ser realizada solicitação de ligação nova.",
        },
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
      exigeFormCarga &&
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "field col-span-3" },
          /* @__PURE__ */ React.createElement(
            GdAviso,
            { mod: "" },
            /* @__PURE__ */ React.createElement(
              "strong",
              null,
              "O preenchimento do Formulário de Carga é obrigatório. ",
            ),
            "Para Ligação Nova ou Aumento de Demanda Contratada de consumo, o cliente deve declarar todas as cargas elétricas por meio do Formulário de Carga (Declaração descritiva da carga instalada — Item 3.2).",
          ),
        ),
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label: "Demanda a ser contratada de geração (kW)",
          hint: gridZero
            ? "Travado: empreendimento Grid Zero não contrata demanda de geração (0 kW)."
            : "",
        },
        /* @__PURE__ */ React.createElement(Inp, {
          value: gridZero ? "0" : d.demandaGeracao,
          disabled: gridZero,
          onChange: (e) =>
            set({ demandaGeracao: e.target.value.replace(/[^\d.]/g, "") }),
        }),
      ),
      !ehLigacaoNova &&
        /* @__PURE__ */ React.createElement(
          Field,
          {
            label: "Demanda de consumo atual (kW)",
            hint: "Demanda atualmente contratada da UC existente",
          },
          /* @__PURE__ */ React.createElement(Inp, {
            value: d.demandaConsumoAtual,
            onChange: (e) =>
              set({ demandaConsumoAtual: e.target.value.replace(/[^\d.]/g, "") }),
          }),
        ),
      !semAlteracaoDemanda &&
        /* @__PURE__ */ React.createElement(
          Field,
          {
            label: "Demanda a ser contratada de consumo (kW)",
            req: true,
            hint: "Não incluir potência de trafos, inversores ou placas",
          },
          /* @__PURE__ */ React.createElement(Inp, {
            value: d.demandaConsumo,
            onChange: (e) =>
              set({ demandaConsumo: e.target.value.replace(/[^\d.]/g, "") }),
          }),
        ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: 'O empreendimento será "Grid Zero"?' },
        /* @__PURE__ */ React.createElement(Toggle, {
          value: d.gridZero,
          onChange: (v) => set({ gridZero: v }),
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
              "As 2 instalações foram representadas no DUB e memorial descritivo?",
            span: 3,
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
          { label: "Número da Unidade Consumidora" },
          /* @__PURE__ */ React.createElement(Inp, {
            value: d.numUC,
            onChange: (e) => set({ numUC: e.target.value.replace(/\D/g, "") }),
            placeholder: "Nº da UC",
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
      title: "Documentação da UC a anexar (Nova UC ou Alteração de Potência)",
    },
    /* @__PURE__ */ React.createElement(
      "p",
      { className: "card-sub" },
      'Marque os documentos que serão anexados. Itens "Caso aplicável" só quando pertinentes.',
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
  const setFonte = (i, patch) =>
    set({ fontes: d.fontes.map((f, k) => (k === i ? { ...f, ...patch } : f)) });
  // Regra 18: Grid Zero ⇒ modalidade obrigatoriamente "Autoconsumo Local" e campo travado.
  const gridZero = d.gridZero === "Sim";
  React.useEffect(() => {
    if (gridZero && d.modalidade !== "Autoconsumo Local")
      set({ modalidade: "Autoconsumo Local" });
  }, [gridZero]);
  const ehGeracaoCompartilhada = d.modalidade === "Geração Compartilhada";
  // Regra 11: GD existente COM alteração de potência ativa ⇒ informar a geração já existente.
  const ehAlteracaoGeracao = (d.solicitacao || "").indexOf("GD Existente") >= 0;
  // Regras 15/16: para fontes FV, a potência da fonte é o MENOR valor entre a potência total
  // de módulos e a de inversores; a Potência Ativa Instalada Total é a soma das fontes.
  React.useEffect(() => {
    let changed = false;
    const novas = d.fontes.map((f) => {
      if (f.fontePrimaria === "Solar") {
        const pm = parseFloat(f.potTotalModulos) || 0;
        const pi = parseFloat(f.potTotalInversores) || 0;
        const calc = pm > 0 && pi > 0 ? Math.min(pm, pi) : pm || pi || 0;
        const calcS = calc ? String(calc) : "";
        if (calcS !== f.potencia) {
          changed = true;
          return { ...f, potencia: calcS };
        }
      }
      return f;
    });
    const total = novas.reduce((s, f) => s + (parseFloat(f.potencia) || 0), 0);
    const totalS = total ? String(total) : "";
    const patch = {};
    if (changed) patch.fontes = novas;
    if (totalS !== d.potAtivaInstalada) patch.potAtivaInstalada = totalS;
    if (Object.keys(patch).length) set(patch);
  }, [d.fontes, d.potAtivaInstalada]);
  const ajustarQtd = (q) => {
    q = parseInt(q) || 1;
    const arr = [...d.fontes];
    while (arr.length < q) arr.push(gdFontePadrao());
    while (arr.length > q) arr.pop();
    set({ qtdFontes: q, fontes: arr });
  };
  return /* @__PURE__ */ React.createElement(
    Card,
    { eyebrow: "Etapa " + ctx.etapaNum, title: "Dados da Geração" },
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid" },
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Quantidade de fontes de geração", req: true },
        /* @__PURE__ */ React.createElement(
          Sel,
          { value: d.qtdFontes, onChange: (e) => ajustarQtd(e.target.value) },
          GD_QTD_FONTES.map((q) =>
            /* @__PURE__ */ React.createElement(
              "option",
              { key: q, value: q },
              q,
            ),
          ),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label: "Potência Ativa Instalada Total de Geração (kW)",
          req: true,
          span: ehAlteracaoGeracao ? 1 : 2,
          hint: "Calculado automaticamente: soma das fontes (em FV, o menor entre módulos e inversores).",
        },
        /* @__PURE__ */ React.createElement(Inp, {
          value: d.potAtivaInstalada,
          disabled: true,
        }),
      ),
      ehAlteracaoGeracao &&
        /* @__PURE__ */ React.createElement(
          Field,
          {
            label: "Potência de Geração Atual (kW)",
            req: true,
            hint: "Geração já existente/conectada na UC.",
          },
          /* @__PURE__ */ React.createElement(Inp, {
            value: d.potGeracaoAtual,
            onChange: (e) =>
              set({ potGeracaoAtual: e.target.value.replace(/[^\d.]/g, "") }),
          }),
        ),
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label: "Modalidade de compensação",
          req: true,
          span: 2,
          hint: gridZero
            ? "Travado: empreendimento Grid Zero exige Autoconsumo Local."
            : "",
        },
        /* @__PURE__ */ React.createElement(
          Sel,
          {
            value: d.modalidade,
            onChange: (e) => set({ modalidade: e.target.value }),
            disabled: gridZero,
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
      gridZero &&
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "field col-span-3" },
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "gd-modo-banner" },
            /* @__PURE__ */ React.createElement(
              "strong",
              null,
              "Modalidade definida automaticamente: Autoconsumo Local",
            ),
            /* @__PURE__ */ React.createElement(
              "span",
              null,
              'Como o empreendimento é "Grid Zero" (sem injeção de excedentes na rede), a modalidade de compensação fica travada em Autoconsumo Local.',
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
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label: "Anexou contrato de constituição? (consórcio/cooperativa)",
          span: ehGeracaoCompartilhada ? 2 : 3,
        },
        /* @__PURE__ */ React.createElement(Toggle, {
          value: d.anexouContrato,
          onChange: (v) => set({ anexouContrato: v }),
          options: GD_SN.map((o) => ({ v: o, l: o })),
        }),
      ),
      ehGeracaoCompartilhada &&
        /* @__PURE__ */ React.createElement(
          Field,
          {
            label: "Documentação do consórcio verificada?",
            hint: "Geração Compartilhada com consórcio verificado dispensa a GFC.",
          },
          /* @__PURE__ */ React.createElement(Toggle, {
            value: d.consorcioVerificado,
            onChange: (v) => set({ consorcioVerificado: v }),
            options: GD_SN.map((o) => ({ v: o, l: o })),
          }),
        ),
    ),
    d.fontes.map((f, i) => {
      const ehFV = f.fontePrimaria === "Solar";
      return /* @__PURE__ */ React.createElement(
        React.Fragment,
        { key: i },
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "gd-subhead" },
          "4.",
          i + 1,
          " — Dados da Fonte de Geração ",
          i + 1,
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "grid" },
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Tipo de Fonte Primária", req: true },
            /* @__PURE__ */ React.createElement(
              Sel,
              {
                value: f.fontePrimaria,
                onChange: (e) => setFonte(i, { fontePrimaria: e.target.value }),
              },
              GD_FONTES.map((o) =>
                /* @__PURE__ */ React.createElement(
                  "option",
                  { key: o, value: o },
                  o,
                ),
              ),
            ),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            {
              label: `Potência de Geração da Fonte ${i + 1} (kW)`,
              req: true,
              hint: ehFV ? "Calculado: menor entre módulos e inversores." : "",
            },
            /* @__PURE__ */ React.createElement(Inp, {
              value: f.potencia,
              disabled: ehFV,
              onChange: (e) => {
                if (!ehFV)
                  setFonte(i, {
                    potencia: e.target.value.replace(/[^\d.]/g, ""),
                  });
              },
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Tipo de geração", req: true },
            /* @__PURE__ */ React.createElement(
              Sel,
              {
                value: f.tipoGeracao,
                onChange: (e) => setFonte(i, { tipoGeracao: e.target.value }),
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
          f.tipoGeracao === "Outra (especificar):" &&
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Especificar", span: 3 },
              /* @__PURE__ */ React.createElement(Inp, {
                value: f.tipoGeracaoOutro,
                onChange: (e) =>
                  setFonte(i, { tipoGeracaoOutro: e.target.value }),
              }),
            ),
        ),
        ehFV &&
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "grid" },
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Potência Total Módulos (kW)" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: f.potTotalModulos,
                onChange: (e) =>
                  setFonte(i, {
                    potTotalModulos: e.target.value.replace(/[^\d.]/g, ""),
                  }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Potência Total Inversores (kW)" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: f.potTotalInversores,
                onChange: (e) =>
                  setFonte(i, {
                    potTotalInversores: e.target.value.replace(/[^\d.]/g, ""),
                  }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Área dos Arranjos (m²)" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: f.areaArranjos,
                onChange: (e) =>
                  setFonte(i, {
                    areaArranjos: e.target.value.replace(/[^\d.]/g, ""),
                  }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Quantidade de Módulos" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: f.qtdModulos,
                onChange: (e) =>
                  setFonte(i, {
                    qtdModulos: e.target.value.replace(/\D/g, ""),
                  }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Modelo dos Módulos" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: f.modeloModulos,
                onChange: (e) => setFonte(i, { modeloModulos: e.target.value }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Fabricante dos Módulos" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: f.fabricanteModulos,
                onChange: (e) =>
                  setFonte(i, { fabricanteModulos: e.target.value }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Quantidade de Inversores" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: f.qtdInversores,
                onChange: (e) =>
                  setFonte(i, {
                    qtdInversores: e.target.value.replace(/\D/g, ""),
                  }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              {
                label: "Modelo dos Inversores",
                hint: "Para mais de 1 modelo, separar com barra (/)",
              },
              /* @__PURE__ */ React.createElement(Inp, {
                value: f.modeloInversores,
                onChange: (e) =>
                  setFonte(i, { modeloInversores: e.target.value }),
              }),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Fabricante dos Inversores" },
              /* @__PURE__ */ React.createElement(Inp, {
                value: f.fabricanteInversores,
                onChange: (e) =>
                  setFonte(i, { fabricanteInversores: e.target.value }),
              }),
            ),
          ),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "grid" },
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "CEG do empreendimento (se houver outorga)", span: 2 },
            /* @__PURE__ */ React.createElement(Inp, {
              value: f.ceg,
              onChange: (e) => setFonte(i, { ceg: e.target.value }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Nº do Ato de Outorga/Registro" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: f.numAtoOutorga,
              onChange: (e) => setFonte(i, { numAtoOutorga: e.target.value }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Nome da Usina", span: 2 },
            /* @__PURE__ */ React.createElement(Inp, {
              value: f.nomeUsina,
              onChange: (e) => setFonte(i, { nomeUsina: e.target.value }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Ano do Ato" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: f.anoAtoOutorga,
              onChange: (e) =>
                setFonte(i, {
                  anoAtoOutorga: e.target.value.replace(/\D/g, ""),
                }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Tipo do Ato de Outorga/Registro", span: 3 },
            /* @__PURE__ */ React.createElement(Inp, {
              value: f.tipoAtoOutorga,
              onChange: (e) => setFonte(i, { tipoAtoOutorga: e.target.value }),
            }),
          ),
        ),
      );
    }),
  );
}
function ViewArmazenamento({ ctx }) {
  const { d, set } = ctx;
  const sim = d.possuiArmazenamento === "Sim";
  return /* @__PURE__ */ React.createElement(
    Card,
    { eyebrow: "Etapa " + ctx.etapaNum, title: "Sistema de Armazenamento de Energia" },
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
            { label: "Operação ilhada?", span: 3 },
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
            { label: "Capacidade do banco (kWh)" },
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
            { label: "Potência total do banco (kW)" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.armPotenciaKw,
              onChange: (e) =>
                set({ armPotenciaKw: e.target.value.replace(/[^\d.]/g, "") }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Capacidade nominal (Ah)" },
            /* @__PURE__ */ React.createElement(Inp, {
              value: d.armCapacidadeAh,
              onChange: (e) =>
                set({ armCapacidadeAh: e.target.value.replace(/[^\d.]/g, "") }),
            }),
          ),
          /* @__PURE__ */ React.createElement(
            Field,
            { label: "Tensão CC (V)" },
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
            { label: "Produção mensal (kWh)" },
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
  const exigeGFC = gdExigeGFC(d);
  // Regra 5: Geração Compartilhada com documentação do consórcio verificada não tem cobrança de GFC.
  const isentoConsorcio =
    d.modalidade === "Geração Compartilhada" && d.consorcioVerificado === "Sim";
  const ultrapassaLimite =
    (parseFloat(d.potAtivaInstalada) || 0) > GD_GFC_LIMITE_KW;
  // Regra 19: a GFC é calculada automaticamente pelo sistema (não preenchida pelo cliente).
  const gfcCalc = gdCalcularGFC(d);
  React.useEffect(() => {
    const v = String(gfcCalc);
    if (v !== d.gfcValor) set({ gfcValor: v });
  }, [gfcCalc]);
  // Regra 22: item 9.5 é obrigatório quando o empreendimento for "Grid Zero".
  const gridZero = d.gridZero === "Sim";
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Etapa " + ctx.etapaNum,
      title: "Garantia, documentação técnica, declarações e solicitante",
    },
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "gd-subhead" },
      "6 — Garantia de Fiel Cumprimento",
    ),
    /* @__PURE__ */ React.createElement(
      GdAviso,
      { mod: "" },
      "Para minigeração com potência instalada superior a 500 kW, é necessário apresentar a garantia de fiel cumprimento (art. 655-C da REN nº 1.000/2021).",
    ),
    ultrapassaLimite &&
      isentoConsorcio &&
      /* @__PURE__ */ React.createElement(
        GdAviso,
        { mod: "", style: { marginTop: 10 } },
        /* @__PURE__ */ React.createElement("strong", null, "GFC dispensada. "),
        "Geração Compartilhada com documentação do consórcio verificada não tem cobrança de Garantia de Fiel Cumprimento.",
      ),
    exigeGFC &&
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "grid", style: { marginTop: 10 } },
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Forma de apresentação da garantia", req: true, span: 2 },
          /* @__PURE__ */ React.createElement(
            Sel,
            {
              value: d.garantiaForma,
              onChange: (e) => set({ garantiaForma: e.target.value }),
            },
            /* @__PURE__ */ React.createElement("option", { value: "" }),
            GD_GARANTIA_FORMAS.map((g) =>
              /* @__PURE__ */ React.createElement(
                "option",
                { key: g, value: g },
                g,
              ),
            ),
          ),
        ),
        /* @__PURE__ */ React.createElement(
          Field,
          {
            label: "Valor da Garantia de Fiel Cumprimento (R$)",
            span: 3,
            hint: "Calculado automaticamente: percentual × potência líquida × custo de investimento da fonte.",
          },
          /* @__PURE__ */ React.createElement(Inp, {
            value: "R$ " + fmt2(gfcCalc),
            disabled: true,
          }),
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "field col-span-3" },
          /* @__PURE__ */ React.createElement(
            GdAviso,
            { mod: "" },
            "Para informações bancárias e instruções de apresentação da garantia, consulte as ",
            /* @__PURE__ */ React.createElement(
              "a",
              {
                href: GD_GARANTIA_FAQ_URL,
                target: "_blank",
                rel: "noreferrer",
              },
              "Dúvidas Frequentes da CEMIG",
            ),
            ".",
          ),
        ),
      ),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "gd-subhead" },
      "7 — Documentação Técnica (obrigatória)",
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
      "8 — Contato na Distribuidora",
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
      "9 — Solicitações e Declarações",
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid" },
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label:
            "9.1 - O padrão está pronto para ser ligado e a usina está instalada?",
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
          /* @__PURE__ */ React.createElement("strong", null, "9.2"),
          " Renuncio ao direito de desistir do orçamento de conexão. (Opcional)",
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
          /* @__PURE__ */ React.createElement("strong", null, "9.3"),
          " Autorizo a entrega dos contratos e meio de pagamento junto ao orçamento. (Opcional)",
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
          /* @__PURE__ */ React.createElement("strong", null, "9.4"),
          " Declaro conformidade das instalações com normas da distribuidora, ABNT e órgãos oficiais. ",
          /* @__PURE__ */ React.createElement(
            "span",
            { className: "doc-req" },
            "(Obrigatório)",
          ),
        ),
      ),
      gridZero &&
        /* @__PURE__ */ React.createElement(
          "label",
          { className: "doc-item" },
          /* @__PURE__ */ React.createElement("input", {
            type: "checkbox",
            checked: d.decl95,
            onChange: (e) => set({ decl95: e.target.checked }),
          }),
          /* @__PURE__ */ React.createElement(
            "span",
            { className: "doc-text" },
            /* @__PURE__ */ React.createElement("strong", null, "9.5"),
            " Solicito dispensa da análise de inversão de fluxo em razão do atendimento ao art. 73-A, sob a seguinte regra (opcional): não injeção na rede de distribuição de energia elétrica (“Grid Zero”). ",
            /* @__PURE__ */ React.createElement(
              "span",
              { className: "doc-req" },
              "(Obrigatório para Grid Zero)",
            ),
          ),
        ),
      /* Aviso contextual (migrado da orientação): em empreendimento Grid Zero,
         a declaração 9.5 é obrigatória. Reage a gridZero && !decl95. */
      gridZero &&
        !d.decl95 &&
        /* @__PURE__ */ React.createElement(
          GdAviso,
          { mod: "warn", style: { marginTop: 10 } },
          "Como o empreendimento é Grid Zero, marque a declaração 9.5 acima — ela é obrigatória para prosseguir com a exportação.",
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
          /* @__PURE__ */ React.createElement("strong", null, "9.6"),
          " Declaro que todas as informações são verdadeiras. ",
          /* @__PURE__ */ React.createElement(
            "span",
            { className: "doc-req" },
            "(Obrigatório)",
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
        "Para Ligação Nova ou Aumento de Demanda Contratada de consumo, todas as cargas elétricas devem ser declaradas aqui.",
      ),
    /* @__PURE__ */ React.createElement(CalcDemanda, {
      data: c,
      onChange: (nc) => set({ cargas: nc }),
      redeMono: false,
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
      campo("CPF/CNPJ", d.cpfCnpj),
      d.filiacao && campo("Filiação", d.filiacao),
      d.nasc && campo("Data de Nascimento", d.nasc),
      d.filiacao && campo("Laudo médico? / NIS?", `${d.laudoMedico} / ${d.nis}`),
      d.nis === "Sim" && d.numNis && campo("Número do NIS", d.numNis),
      campo("Grupo / Classe", `${d.grupo} / ${d.classe}`),
      campo(
        "Endereço",
        `${d.logradouro}, ${d.numero} — ${d.bairro}, ${d.municipio}/${d.estado}`,
        true,
      ),
    ]),
    /* @__PURE__ */ React.createElement(PreviaDivider, null),
    secao("2 — Dados da UC", [
      campo("Coordenadas", `Lat ${d.latitude} · Lon ${d.longitude}`),
      campo("UTM (calculada)", `Fuso ${d.fuso} · E ${d.utmE} · N ${d.utmN}`),
      campo("Solicitação", d.solicitacao),
      campo(
        "Trafo (ligação/impedância)",
        `${d.tipoLigTrafo || "—"} · ${d.impedanciaTrafo || "—"}%`,
      ),
      campo(
        "Demanda consumo / geração (kW)",
        `${d.demandaConsumo || "—"} / ${d.demandaGeracao || "—"}`,
      ),
    ]),
    /* @__PURE__ */ React.createElement(PreviaDivider, null),
    secao("4 — Geração", [
      campo("Qtd. fontes", d.qtdFontes),
      campo("Pot. Ativa Instalada (kW)", d.potAtivaInstalada),
      campo("Modalidade", d.modalidade),
    ]),
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
