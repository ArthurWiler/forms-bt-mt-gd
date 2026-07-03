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
    motoresPesadosBT,
    setMostrarAnaliseMotores,
    exibeTermoGrupoB
  } = ctx;
  /* Prévia no padrão Figma: seções tituladas em verde com campos
     rótulo+valor e lápis que volta à etapa correspondente (setAba).
     O Individual ganha uma seção por UC com cartões-resumo (Modalidade /
     Demanda total / Disjuntor adequado); Coletivo e Múltiplas Torres usam
     os mesmos blocos com seus resumos de lista. Campos derivados do card
     (Atividade, Ramo, Solicitação) não têm lápis. */
  const formIndividual = ctx.formType === "individual";
  const abaUnidade = formIndividual ? "dados" : "ucs";
  const abaEndereco = formIndividual ? "dados" : "obra";
  const rural = obra.localizacao === "Rural";
  const irPara = (k) => () => setAba(k);
  const modalidadeTexto = multiTorres
    ? `Múltiplas Torres/Blocos · ${blocos.length} ${(atend.atendA || "").toLowerCase()}(s)`
    : coletivo
      ? "Coletivo — Agrupamento com Proteção Geral (APR Web)"
      : "Individual - até 3 caixas sem proteção geral";
  const emailFatura =
    corr.receberEmail === "Não"
      ? corr.alternativa === "Outro e-mail"
        ? corr.outroEmail
        : corr.alternativa
      : prop.email;
  return React.createElement(
    "div",
    null,
    React.createElement(
      Card,
      {
        eyebrow: "Etapa " + ctx.etapaNum,
        title: "Prévia do formulário",
        sub: "Confira se todos os dados estão corretos e gere o PDF para anexar à sua solicitação no Cemig Atende.",
      },
      /* ---- Dados do proprietário ---- */
      React.createElement(
        PreviaSecao,
        { titulo: "Dados do proprietário" },
        React.createElement(
          "div",
          { className: "previa-grid" },
          React.createElement(PreviaCampo, {
            label: "Nome",
            valor: prop.nome,
            full: true,
            onEdit: irPara("prop"),
          }),
          React.createElement(PreviaCampo, {
            label: "E-mail",
            valor: prop.email,
            onEdit: irPara("prop"),
          }),
          React.createElement(PreviaCampo, {
            label: "Celular",
            valor: prop.celular,
            onEdit: irPara("prop"),
          }),
          React.createElement(PreviaCampo, {
            label: pessoaFisica ? "CPF" : "CNPJ",
            valor: prop.cpfCnpj,
            onEdit: irPara("prop"),
          }),
          pessoaFisica &&
            React.createElement(PreviaCampo, {
              label: "Filiação",
              valor: prop.filiacao,
              onEdit: irPara("prop"),
            }),
          pessoaFisica &&
            React.createElement(PreviaCampo, {
              label: "RG",
              valor: prop.rg,
              onEdit: irPara("prop"),
            }),
          pessoaFisica &&
            React.createElement(PreviaCampo, {
              label: "Data de nascimento",
              valor: prop.nasc,
              onEdit: irPara("prop"),
            }),
        ),
      ),
      React.createElement(PreviaDivider, null),
      /* ---- Correspondência ---- */
      React.createElement(
        PreviaSecao,
        { titulo: "Correspondência" },
        React.createElement(
          "div",
          { className: "previa-grid" },
          React.createElement(PreviaCampo, {
            label: "E-mail para receber a fatura",
            valor: emailFatura,
            onEdit: irPara("corr"),
          }),
          React.createElement(PreviaCampo, {
            label: "Data de vencimento da fatura",
            valor: corr.vencimento ? "Todo dia " + corr.vencimento : "",
            onEdit: irPara("corr"),
          }),
        ),
      ),
      /* ---- Individual: uma seção por unidade consumidora ---- */
      !coletivo &&
        !multiTorres &&
        ucsDet.map((u, ui) =>
          React.createElement(
            React.Fragment,
            { key: ui },
            React.createElement(PreviaDivider, null),
            React.createElement(
              PreviaSecao,
              { titulo: `Dados da unidade consumidora ${ui + 1}` },
              React.createElement(
                "div",
                { className: "previa-cards" },
                React.createElement(PreviaCard, {
                  label: "Modalidade",
                  valor: modalidadeTexto,
                }),
                React.createElement(PreviaCard, {
                  label: "Demanda total",
                  valor: fmt2(u.cargas?._demanda || 0) + " kVA",
                }),
                React.createElement(PreviaCard, {
                  label: "Disjuntor adequado",
                  valor:
                    u.disjEscolhido || (u.cargas?._disjuntores || [])[0] || "—",
                }),
              ),
              React.createElement(
                "div",
                { className: "previa-grid" },
                React.createElement(PreviaCampo, {
                  label: "Tipo de solicitação",
                  valor: u.solicitacao,
                  onEdit: irPara(abaUnidade),
                }),
                React.createElement(PreviaCampo, {
                  label: "Atividade principal",
                  valor: u.atividade,
                }),
                React.createElement(PreviaCampo, {
                  label: "Ramo da atividade",
                  valor: u.ramo,
                }),
                React.createElement(PreviaCampo, {
                  label: "Solicitação",
                  valor: atend.solicitacao,
                }),
                !rural &&
                  React.createElement(PreviaCampo, {
                    label: "CEP",
                    valor: obra.cep,
                    full: true,
                    onEdit: irPara(abaEndereco),
                  }),
                !rural &&
                  React.createElement(PreviaCampo, {
                    label: "Endereço",
                    valor: obra.endereco,
                    onEdit: irPara(abaEndereco),
                  }),
                !rural &&
                  React.createElement(PreviaCampo, {
                    label: "Número",
                    valor: obra.num,
                    onEdit: irPara(abaEndereco),
                  }),
                !rural &&
                  React.createElement(PreviaCampo, {
                    label: "Complemento",
                    valor: u.complemento,
                    onEdit: irPara(abaUnidade),
                  }),
                !rural &&
                  React.createElement(PreviaCampo, {
                    label: "Bairro",
                    valor: obra.bairro,
                    onEdit: irPara(abaEndereco),
                  }),
                rural &&
                  React.createElement(PreviaCampo, {
                    label: "Distrito / Comunidade",
                    valor: obra.distritoComunidade,
                    onEdit: irPara(abaEndereco),
                  }),
                rural &&
                  React.createElement(PreviaCampo, {
                    label: "Nome da propriedade",
                    valor: obra.nomePropriedade,
                    onEdit: irPara(abaEndereco),
                  }),
                rural &&
                  React.createElement(PreviaCampo, {
                    label: "Ponto de referência",
                    valor: obra.pontoRef,
                    onEdit: irPara(abaEndereco),
                  }),
                React.createElement(PreviaCampo, {
                  label: "Cidade",
                  valor: obra.cidade,
                  onEdit: irPara(abaEndereco),
                }),
                React.createElement(PreviaCampo, {
                  label: "Estado",
                  valor: obra.estado,
                  onEdit: irPara(abaEndereco),
                }),
                React.createElement(PreviaCampo, {
                  label: "Distância do padrão até a rede Cemig inferior a 30m?",
                  valor: obra.distMenor30,
                  onEdit: irPara(abaEndereco),
                }),
                React.createElement(PreviaCampo, {
                  label: "O padrão está pronto para ser ligado?",
                  valor: obra.prontoLigar,
                  onEdit: irPara(abaEndereco),
                }),
                React.createElement(PreviaCampo, {
                  label: "O padrão precisa ser mudado de local?",
                  valor: u.mudancaLocal,
                  onEdit: irPara(abaUnidade),
                }),
                React.createElement(PreviaCampo, {
                  label: "Tipo de rede BT que atende o local",
                  valor: obra.tipoRede,
                  onEdit: irPara(abaEndereco),
                }),
              ),
            ),
          ),
        ),
      /* ---- Coletivo / Múltiplas Torres: resumo + obra + listas ---- */
      (coletivo || multiTorres) &&
        React.createElement(
          React.Fragment,
          null,
          React.createElement(PreviaDivider, null),
          React.createElement(
            PreviaSecao,
            { titulo: "Resumo do atendimento" },
            React.createElement(
              "div",
              { className: "previa-cards" },
              React.createElement(PreviaCard, {
                label: "Modalidade",
                valor:
                  modalidadeTexto +
                  (coletivo && !multiTorres
                    ? ` · ${atend.solicitacao || "—"} · ${atend.escopo || "—"}`
                    : "") +
                  (!multiTorres && atend.disjuntorGeral
                    ? ` · Disjuntor geral: ${atend.disjuntorGeral}`
                    : ""),
              }),
              React.createElement(PreviaCard, {
                label: "Unidades consumidoras",
                valor: String(
                  multiTorres ? totalUcsEmpreendimento : ucBlocos.length,
                ),
              }),
              React.createElement(PreviaCard, {
                label: "Demanda total",
                valor: fmt2(demandaTotalGeral) + " kVA",
              }),
            ),
            React.createElement(
              "div",
              { className: "previa-grid" },
              React.createElement(PreviaCampo, {
                label: "Endereço",
                valor: rural
                  ? `${obra.cidade || "—"}${obra.distritoComunidade ? " · " + obra.distritoComunidade : ""}`
                  : `${obra.endereco || "—"}, ${obra.num || "s/n"}`,
                onEdit: irPara("obra"),
              }),
              React.createElement(PreviaCampo, {
                label: "Cidade / UF",
                valor: `${obra.cidade || "—"} / ${obra.estado || "—"}`,
                onEdit: irPara("obra"),
              }),
              React.createElement(PreviaCampo, {
                label: "Localização",
                valor: obra.localizacao,
                onEdit: irPara("obra"),
              }),
              React.createElement(PreviaCampo, {
                label: "Coordenada",
                valor: [obra.lat, obra.lng].filter(Boolean).join(", "),
                onEdit: irPara("obra"),
              }),
            ),
          ),
          multiTorres &&
            React.createElement(
              React.Fragment,
              null,
              React.createElement(PreviaDivider, null),
              React.createElement(
                PreviaSecao,
                { titulo: "Torres / Blocos" },
                blocos.map((b, bi) =>
                  React.createElement(
                    "div",
                    {
                      key: bi,
                      className: "preview-item",
                      style: {
                        display: "flex",
                        justifyContent: "space-between",
                      },
                    },
                    React.createElement(
                      "span",
                      { className: "v" },
                      atend.atendA,
                      " ",
                      b.nome || bi + 1,
                      " · ",
                      b.qtdUCs || 0,
                      " UCs · Geral: ",
                      b.disjGeral || "—",
                      " · Incêndio: ",
                      b.disjIncendio || "—",
                    ),
                    React.createElement(
                      "span",
                      { style: { color: "var(--verde)", fontWeight: 700 } },
                      fmt2(
                        calcBlocoMultiTorres(b).demandaUcs +
                          num(b.demandaIncendio),
                      ),
                      " kVA",
                    ),
                  ),
                ),
              ),
            ),
          coletivo &&
            !multiTorres &&
            React.createElement(
              React.Fragment,
              null,
              React.createElement(PreviaDivider, null),
              React.createElement(
                PreviaSecao,
                { titulo: "Previsão de carga e UCs" },
                React.createElement(
                  "div",
                  { className: "preview-item" },
                  React.createElement(
                    "span",
                    { className: "v" },
                    "Total ",
                    fmt2(prevTotalKw),
                    " kW · Demanda ",
                    fmt2(demandaTotalGeral),
                    " kVA",
                  ),
                ),
                ucBlocos.map((u, ui) =>
                  React.createElement(
                    "div",
                    {
                      key: ui,
                      className: "preview-item",
                      style: {
                        display: "flex",
                        justifyContent: "space-between",
                      },
                    },
                    React.createElement(
                      "span",
                      { className: "v" },
                      u.identificacao || `UC ${ui + 1}`,
                      " · ",
                      u.atividade,
                      " · ",
                      u.solicitacao,
                      " ",
                      u.complemento ? `· ${u.complemento}` : "",
                    ),
                    React.createElement(
                      "span",
                      { style: { color: "var(--verde)", fontWeight: 700 } },
                      u.disjPara || "—",
                    ),
                  ),
                ),
              ),
            ),
        ),
    ),
    React.createElement(
      Card,
      {
        sub: "Documentos a apresentar com a solicitação — a lista abaixo é gerada a partir do preenchimento do formulário e pode ser exportada em PDF.",
      },
      /* Lista de documentos derivada do preenchimento (ver listaDocumentosBT). */
      React.createElement(
        PreviaSecao,
        { titulo: "Documentos necessários" },
        (ctx.documentosNecessarios || []).map((d, i) =>
          React.createElement(
            "div",
            { key: i, className: "preview-item" },
            React.createElement("span", { className: "v" }, d),
          ),
        ),
      ),
      hibrido &&
        !validacaoHibrido.ok &&
        React.createElement(
          "div",
          { className: "alert alert-warn", style: { marginBottom: 12 } },
          "Corrija as pendências do atendimento híbrido (aba Unidades Consumidoras) para liberar a exportação do PDF.",
        ),
      !ctx.validacaoObrigatorios.ok &&
        React.createElement(
          "div",
          { className: "alert alert-warn", style: { marginBottom: 12 } },
          React.createElement(
            "strong",
            null,
            "Preencha os campos obrigatórios para liberar o PDF:",
          ),
          React.createElement(
            "ul",
            { style: { margin: "6px 0 0 18px" } },
            ctx.validacaoObrigatorios.faltando.map((f, i) =>
              React.createElement("li", { key: i }, f),
            ),
          ),
        ),
      motoresPesadosBT &&
        motoresPesadosBT.length > 0 &&
        React.createElement(
          "div",
          { className: "alert alert-warn", style: { marginBottom: 12 } },
          React.createElement(
            "span",
            null,
            "A solicitação possui motores que exigem mais informações, favor preencher o formulário: ",
          ),
          React.createElement(
            Btn,
            {
              variant: "dark",
              onClick: () => setMostrarAnaliseMotores(true),
            },
            "Preencher Análise de Partida",
          ),
        ),
      /* Botões "Exportar PDF" e "Gerar lista de documentos" removidos daqui —
         o único botão de exportação é o inferior (nav-bottom, app.js); a lista
         de documentos é exibida acima, derivada do preenchimento. */
      exibeTermoGrupoB &&
        React.createElement(
          "div",
          {
            className: "btn-row",
            style: { display: "flex", gap: 10, flexWrap: "wrap" },
          },
          React.createElement(
            Btn,
            { variant: "ghost", onClick: () => gerarTermoGrupoB(ctx) },
            "📄 Exportar Termo de Opção - Grupo B",
          ),
        ),
      /* Aviso pós-exportação (Figma): anexar o PDF no pedido do Cemig Atende. */
      React.createElement(PreviaAvisoExportacao, null),
    ),
  );
}

/* ============================================================
   Análise de Partida de Motores (BT) — varredura feita em app.js
   (ctx.motoresPesadosBT). Formulário sem obrigatoriedade: nenhum
   asterisco e nenhum input "required", não bloqueia a exportação
   do formulário principal. Como o cliente está na rede secundária
   (BT), a "Potência do transformador do consumidor" é travada com
   o texto "Cliente ligado a rede CEMIG" e a Impedância percentual
   do transformador não é solicitada nem impressa no PDF.
   ============================================================ */
function _motorLabelCV(m) {
  return (
    (m.fase === "mono" ? MOTOR_MONO : MOTOR_TRI).find(
      (r) => r.cv === parseFloat(m.cv),
    )?.l || m.cv
  );
}
const DISPOSITIVOS_PARTIDA_BT = [
  "Chave Estrela-Triângulo",
  "Chave Compensadora",
  "Soft-Starter",
  "Inversor de Frequência",
];
function TabAnaliseMotoresBT({ ctx }) {
  const { motoresPesadosBT, setMotorAnalisePartida } = ctx;
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Rede secundária (BT)",
      title: "Análise de Partida de Motores",
      sub: "Preencha, quando possível, os dados de cada motor pesado identificado nas Unidades Consumidoras. Este bloco é opcional e não bloqueia a exportação do formulário principal.",
    },
    !motoresPesadosBT || motoresPesadosBT.length === 0
      ? /* @__PURE__ */ React.createElement(
          "div",
          { className: "field-hint" },
          "Nenhum motor pesado identificado.",
        )
      : motoresPesadosBT.map(({ ucIndex, motorIndex, motor }) => {
          const ap = motor.analisePartida || {};
          const cNom = parseFloat(ap.correnteNominal) || 0;
          const ipIn = parseFloat(ap.ipIn) || 0;
          const cPartida = cNom && ipIn ? cNom * ipIn : null;
          const upd = (patch) =>
            setMotorAnalisePartida(ucIndex, motorIndex, patch);
          return /* @__PURE__ */ React.createElement(
            "div",
            {
              key: `${ucIndex}-${motorIndex}`,
              className: "subbox",
              style: { marginTop: 14 },
            },
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "subbox-title", style: { marginBottom: 8 } },
              `UC ${ucIndex + 1} — Motor ${motorIndex + 1} (${motor.fase === "mono" ? "Monofásico" : "Trifásico"}, ${_motorLabelCV(motor)} CV)`,
            ),
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "grid grid-3" },
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Potência do transformador do consumidor (kVA)" },
                /* @__PURE__ */ React.createElement(Inp, {
                  value: "Cliente ligado a rede CEMIG",
                  disabled: true,
                  onChange: () => {},
                }),
              ),
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Corrente Nominal (A)" },
                /* @__PURE__ */ React.createElement(Inp, {
                  type: "number",
                  value: ap.correnteNominal || "",
                  placeholder: "Ex.: 12,5",
                  onChange: (e) => upd({ correnteNominal: e.target.value }),
                }),
              ),
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Relação Ip/In" },
                /* @__PURE__ */ React.createElement(Inp, {
                  type: "number",
                  value: ap.ipIn || "",
                  placeholder: "Ex.: 6",
                  onChange: (e) => upd({ ipIn: e.target.value }),
                }),
              ),
            ),
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "grid grid-3", style: { marginTop: 10 } },
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Corrente de partida (A)" },
                /* @__PURE__ */ React.createElement(Inp, {
                  value: cPartida == null ? "—" : fmt2(cPartida),
                  disabled: true,
                  onChange: () => {},
                }),
              ),
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Fator de potência na partida" },
                /* @__PURE__ */ React.createElement(Inp, {
                  type: "number",
                  value: ap.fpPartida || "",
                  placeholder: "Ex.: 0,35",
                  onChange: (e) => upd({ fpPartida: e.target.value }),
                }),
              ),
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Número de partidas" },
                /* @__PURE__ */ React.createElement(Inp, {
                  type: "number",
                  value: ap.numPartidas || "",
                  onChange: (e) => upd({ numPartidas: e.target.value }),
                }),
              ),
            ),
            /* @__PURE__ */ React.createElement(
              Field,
              { label: "Dispositivo auxiliar de partida" },
              /* @__PURE__ */ React.createElement(
                Sel,
                {
                  value: ap.dispositivo || "",
                  onChange: (e) =>
                    upd({
                      dispositivo: e.target.value,
                      ...(e.target.value !== "Chave Compensadora"
                        ? { tap: "" }
                        : {}),
                    }),
                },
                /* @__PURE__ */ React.createElement("option", { value: "" }),
                DISPOSITIVOS_PARTIDA_BT.map((d) =>
                  /* @__PURE__ */ React.createElement(
                    "option",
                    { key: d, value: d },
                    d,
                  ),
                ),
              ),
            ),
            ap.dispositivo === "Chave Compensadora" &&
              /* @__PURE__ */ React.createElement(
                "div",
                { className: "grid grid-3", style: { marginTop: 10 } },
                /* @__PURE__ */ React.createElement(
                  Field,
                  { label: "Tap (%)" },
                  /* @__PURE__ */ React.createElement(Inp, {
                    type: "number",
                    value: ap.tap || "",
                    placeholder: "Ex.: 65",
                    onChange: (e) => upd({ tap: e.target.value }),
                  }),
                ),
              ),
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "grid grid-3", style: { marginTop: 10 } },
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Ordem de partida" },
                /* @__PURE__ */ React.createElement(Inp, {
                  type: "number",
                  value: ap.ordemPartida || "",
                  onChange: (e) => upd({ ordemPartida: e.target.value }),
                }),
              ),
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Carga operando (kVA)" },
                /* @__PURE__ */ React.createElement(Inp, {
                  type: "number",
                  value: ap.cargaOperanteKVA || "",
                  onChange: (e) => upd({ cargaOperanteKVA: e.target.value }),
                }),
              ),
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Carga operando (FP)" },
                /* @__PURE__ */ React.createElement(Inp, {
                  type: "number",
                  value: ap.cargaOperanteFP || "",
                  onChange: (e) => upd({ cargaOperanteFP: e.target.value }),
                }),
              ),
            ),
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "grid grid-3", style: { marginTop: 10 } },
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Carga sensível — Tipo" },
                /* @__PURE__ */ React.createElement(Inp, {
                  value: ap.cargaSensivelTipo || "",
                  placeholder: "Ex.: CLP, iluminação",
                  onChange: (e) => upd({ cargaSensivelTipo: e.target.value }),
                }),
              ),
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Carga sensível — % admissível" },
                /* @__PURE__ */ React.createElement(Inp, {
                  type: "number",
                  value: ap.cargaSensivelPercentual || "",
                  onChange: (e) =>
                    upd({ cargaSensivelPercentual: e.target.value }),
                }),
              ),
              /* @__PURE__ */ React.createElement(
                Field,
                { label: "Simultaneidade" },
                /* @__PURE__ */ React.createElement(Toggle, {
                  value: ap.simultaneidade || "",
                  onChange: (v) => upd({ simultaneidade: v }),
                  options: [
                    { v: "Sim", l: "Sim" },
                    { v: "Não", l: "Não" },
                  ],
                }),
              ),
            ),
          );
        }),
  );
}

/* ===== Exportação independente (jsPDF) — folha A4 por motor pesado.
   Nome do arquivo dinâmico a partir de prop.nome. Impedância percentual
   do transformador omitida por completo (cliente em rede secundária). */
function exportarPDFPartidaBT(ctx) {
  const { motoresPesadosBT, prop } = ctx;
  if (!window.jspdf) {
    alert("Biblioteca jsPDF não carregada.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW = 210,
    PH = 297,
    MG = 14,
    CW = PW - 2 * MG;
  let cy = MG;
  const drawTopBar = () => {
    doc.setFillColor(10, 47, 39);
    doc.rect(0, 0, PW, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(
      "FORMULÁRIO PARA A ANÁLISE DE PARTIDA DE MOTORES",
      PW / 2,
      10,
      { align: "center" },
    );
    cy = 23;
  };
  const sec = (t) => {
    doc.setFillColor(230, 242, 238);
    doc.rect(MG, cy, CW, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(10, 47, 39);
    doc.text(t, MG + 2, cy + 4.2);
    cy += 9;
  };
  const kv = (label, valor) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(20, 20, 20);
    doc.text(label, MG, cy);
    doc.setFont("helvetica", "normal");
    doc.text(String(valor), MG + 78, cy);
    cy += 5.5;
  };
  const valTexto = (v, sufixo) => {
    const s = String(v ?? "").trim();
    if (!s) return "________________";
    return sufixo ? `${s} ${sufixo}` : s;
  };
  const nomeCliente = (prop.nome || "Cliente").trim();
  const lista = motoresPesadosBT || [];

  if (!lista.length) {
    drawTopBar();
    sec("IDENTIFICAÇÃO");
    kv("Cliente:", nomeCliente || "________________");
    cy += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text("Nenhum motor pesado identificado.", MG, cy);
  } else {
    lista.forEach(({ motor }, i) => {
      if (i > 0) doc.addPage();
      cy = MG;
      drawTopBar();

      sec("IDENTIFICAÇÃO");
      kv("Cliente:", nomeCliente || "________________");

      sec("TIPO DO MOTOR / NÚMERO DE FASES");
      kv(
        "Número de fases:",
        motor.fase === "mono" ? "Monofásico" : "Trifásico",
      );

      const ap = motor.analisePartida || {};
      const cNom = parseFloat(ap.correnteNominal) || 0;
      const ipIn = parseFloat(ap.ipIn) || 0;
      const cPartida = cNom && ipIn ? (cNom * ipIn).toFixed(2) : "";

      sec("DADOS ELÉTRICOS");
      kv("Potência do motor (CV):", valTexto(_motorLabelCV(motor)));
      kv("Corrente Nominal (A):", valTexto(ap.correnteNominal));
      kv("Relação Ip/In:", valTexto(ap.ipIn));
      kv("Corrente de partida (A):", valTexto(cPartida));
      kv("Fator de potência na partida:", valTexto(ap.fpPartida));

      sec("NÚMERO DE PARTIDAS");
      kv("Número de partidas:", valTexto(ap.numPartidas));

      sec("DISPOSITIVO AUXILIAR DE PARTIDA (QUANDO HOUVER)");
      const dispositivoTexto = ap.dispositivo
        ? ap.dispositivo +
          (ap.dispositivo === "Chave Compensadora"
            ? ` — Tap: ${valTexto(ap.tap, "%")}`
            : "")
        : "________________";
      kv("Dispositivo:", dispositivoTexto);

      sec("ORDEM DE PARTIDA DO MOTOR (DOIS OU MAIS MOTORES)");
      kv("Ordem de partida:", valTexto(ap.ordemPartida));

      sec("CARGAS OPERANDO ENQUANTO O MOTOR PARTE");
      kv("Potência (kVA):", valTexto(ap.cargaOperanteKVA));
      kv("Fator de potência:", valTexto(ap.cargaOperanteFP));

      sec("CARGAS SENSÍVEIS A FLUTUAÇÕES DE TENSÃO");
      kv("Tipo:", valTexto(ap.cargaSensivelTipo));
      kv("Flutuação admissível (%):", valTexto(ap.cargaSensivelPercentual));

      sec("SIMULTANEIDADE DE PARTIDA");
      kv("Simultaneidade:", valTexto(ap.simultaneidade));

      sec("TRANSFORMADOR DO CONSUMIDOR");
      kv("Potência do transformador:", "Cliente ligado a rede CEMIG");

      sec("NOTAS");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(60, 60, 60);
      doc.text(
        doc.splitTextToSize(
          "1 - Em caso de partida sequencial de motores, preencher uma folha para cada motor, indicando a ordem de partida.",
          CW,
        ),
        MG,
        cy,
      );
      cy += 8;
      doc.text(
        doc.splitTextToSize(
          "2 - Anexar, sempre que possível, a(s) folha(s) das características elétricas, fornecida(s) pelo fabricante do motor.",
          CW,
        ),
        MG,
        cy,
      );
      cy += 12;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(20, 20, 20);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, MG, cy);
      cy += 22;
      doc.setDrawColor(60, 60, 60);
      doc.line(MG, cy, MG + 90, cy);
      cy += 4;
      doc.setFontSize(8);
      doc.text("Responsável pelas informações", MG, cy);
    });
  }

  const nomeArquivo = `Analise_Partida_Motores_${(nomeCliente.replace(/\s+/g, "_") || "Cliente")}.pdf`;
  doc.save(nomeArquivo);
}
