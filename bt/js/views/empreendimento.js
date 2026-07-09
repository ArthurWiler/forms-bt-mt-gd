function TabEmpreendimento({ ctx }) {
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
    restrito,
    rural,
    solicitacoesPermitidas,
  } = ctx;

  // Nesta etapa a zona é sempre Urbano: o campo de seleção fica oculto e a
  // localização é fixada em "Urbano" ao montar (cobre estados iniciais vazios
  // ou herdados como "Rural").
  useEffect(() => {
    if (obra.localizacao !== "Urbano")
      setObra({ ...obra, localizacao: "Urbano" });
  }, [obra.localizacao]);

  // Campos específicos de Pessoa Física só aparecem quando o CPF está
  // COMPLETO e VÁLIDO (docInfo.valido === true) — antes disso não se sabe
  // se o proprietário é CPF ou CNPJ.
  const pfValidado = pessoaFisica && docInfo && docInfo.valido === true;
  // Gate: os campos de endereço/coordenadas/dados técnicos (herdados de
  // TabDadosUnidade) só aparecem depois que TODOS os campos próprios do
  // empreendimento estiverem preenchidos: Nome/Razão Social, CPF/CNPJ válido
  // e Nº ART/TRT.
  const empreendimentoCompleto =
    !!(prop.nome && prop.nome.trim()) &&
    docInfo &&
    docInfo.valido === true &&
    !!(obra.art && obra.art.trim());
  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Etapa " + ctx.etapaNum,
      title: "Dados do empreendimento",
      sub: "Preencha os dados gerais do empreendimento.",
    },
    /* Ordem (2 colunas): Nome→Email, Celular→Fixo, CPF/CNPJ→Filiação,
       RG→Nascimento, Laudo→NIS. Campos de PF só após CPF válido (pfValidado). */
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid grid-2" },
      /* Nome → E-mail */
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label: "Cliente / Razão Social do empreendimento",
          req: true,
          span: 2,
        },
        /* @__PURE__ */ React.createElement(Inp, {
          value: prop.nome,
          onChange: (e) => setProp({ ...prop, nome: e.target.value }),
        }),
      ),
      /* CPF/CNPJ → Filiação */
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label: "CPF / CNPJ",
          req: true,
        },
        /* @__PURE__ */ React.createElement(
          "div",
          { style: { display: "flex", gap: 8, alignItems: "center" } },
          /* @__PURE__ */ React.createElement("input", {
            value: prop.cpfCnpj || "",
            onChange: (e) => {
              const m = mascararCpfCnpj(e.target.value);
              setProp({ ...prop, cpfCnpj: m });
              if (ehCNPJ(m)) buscarCNPJ(m);
              else setCnpjStatus("");
            },
            placeholder: "000.000.000-00",
            style: {
              borderColor:
                docInfo.valido === false ? "var(--vermelho)" : void 0,
            },
          }),
          cnpjStatus === "buscando" &&
            /* @__PURE__ */ React.createElement("span", {
              className: "spinner",
            }),
          cnpjStatus === "ok" &&
            /* @__PURE__ */ React.createElement(
              Badge,
              null,
              "dados preenchidos",
            ),
          cnpjStatus === "erro" &&
            /* @__PURE__ */ React.createElement(
              "span",
              { style: { color: "var(--vermelho)", fontSize: 12 } },
              "CNPJ não encontrado",
            ),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Nº ART/TRT de Projeto", req: true },
        /* @__PURE__ */ React.createElement(Inp, {
          value: obra.art,
          onChange: (e) => setObra({ ...obra, art: e.target.value }),
        }),
      ),
    ),
    /* Aviso (variante warn): todas as UCs do pedido devem estar no mesmo
       endereço, mudando apenas o complemento. Reutiliza o banner .cmg-aviso. */
    empreendimentoCompleto &&
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "cmg-aviso cmg-aviso--warn" },
        /* @__PURE__ */ React.createElement("div", {
          className: "cmg-aviso-icon",
          "aria-hidden": "true",
        }),
        /* @__PURE__ */ React.createElement(
          "p",
          { className: "cmg-aviso-texto" },
          "Todas as unidades deste pedido devem estar no mesmo endereço exato (rua, número, bairro, cidade e UF), mudando apenas o complemento (ex: apto, bloco). Se houver qualquer outra diferença, como o número da casa/apartamento é necessário abrir uma nova solicitação de atendimento no Cemig Atende.",
        ),
      ),

    /* Solicitação / Escopo / Nº UCs migraram para a aba "Atendimento"
       (ver views/cargas-individual.js): a Solicitação passou a ser por UC e o
       "Tipo do Atendimento" + Nº de UCs ficam no topo daquela etapa. */

    /* ── Bloco 2: Zona ── oculto: nesta etapa a zona é sempre Urbano
       (fixada via useEffect acima). O campo de seleção foi removido. */

    /* ── Bloco 3a: Endereço Urbano ── */
    empreendimentoCompleto &&
      obra.localizacao === "Urbano" &&
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "grid grid-2", style: { marginTop: 14 } },
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "CEP", req: true },
          /* @__PURE__ */ React.createElement(
            "div",
            { style: { display: "flex", gap: 8, alignItems: "center" } },
            /* @__PURE__ */ React.createElement(
              "div",
              { style: { maxWidth: 180 } },
              /* @__PURE__ */ React.createElement(Inp, {
                value: obra.cep,
                onChange: (e) => {
                  const v = mascararCEP(e.target.value);
                  setObra({ ...obra, cep: v });
                  buscarCEP(v, "obra");
                },
                placeholder: "00000-000",
              }),
            ),
            cepStatus.obra === "buscando" &&
              /* @__PURE__ */ React.createElement("span", {
                className: "spinner",
              }),
            cepStatus.obra === "ok" &&
              /* @__PURE__ */ React.createElement(
                Badge,
                null,
                "Endereço encontrado",
              ),
            cepStatus.obra === "erro" &&
              /* @__PURE__ */ React.createElement(
                "span",
                { style: { color: "var(--vermelho)", fontSize: 12 } },
                "CEP não encontrado",
              ),
          ),
        ),
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Endereço", req: true, span: 2 },
          /* @__PURE__ */ React.createElement(Inp, {
            value: obra.endereco,
            onChange: (e) => setObra({ ...obra, endereco: e.target.value }),
          }),
        ),
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Nº", req: true },
          /* @__PURE__ */ React.createElement(Inp, {
            value: obra.num,
            onChange: (e) => setObra({ ...obra, num: e.target.value }),
          }),
        ),
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Bairro", req: true },
          /* @__PURE__ */ React.createElement(Inp, {
            value: obra.bairro,
            onChange: (e) => setObra({ ...obra, bairro: e.target.value }),
          }),
        ),
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Cidade / Município", req: true },
          /* @__PURE__ */ React.createElement(Inp, {
            value: obra.cidade,
            onChange: (e) => setObra({ ...obra, cidade: e.target.value }),
          }),
        ),
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Estado", req: true },
          /* @__PURE__ */ React.createElement(Inp, {
            value: obra.estado,
            onChange: (e) => setObra({ ...obra, estado: e.target.value }),
          }),
        ),
      ),

    /* ── Bloco 3b: Endereço Rural ── removido: a zona é sempre Urbano nesta
       etapa, então o endereço rural nunca se aplica. */

    /* ── Bloco 4: Coordenadas ── */
    empreendimentoCompleto &&
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "grid grid-3 divider" },
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Latitude", req: coordObrigatoria },
          /* @__PURE__ */ React.createElement(Inp, {
            value: obra.lat,
            onChange: (e) =>
              setObra({
                ...obra,
                lat: e.target.value,
                utm: utmString(e.target.value, obra.lng),
              }),
          }),
        ),
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Longitude", req: coordObrigatoria },
          /* @__PURE__ */ React.createElement(Inp, {
            value: obra.lng,
            onChange: (e) =>
              setObra({
                ...obra,
                lng: e.target.value,
                utm: utmString(obra.lat, e.target.value),
              }),
          }),
        ),
        /* @__PURE__ */ React.createElement(
          Field,
          {
            label: "Coordenada UTM",
          },
          /* @__PURE__ */ React.createElement(Inp, {
            value: utmString(obra.lat, obra.lng) || obra.utm || "",
            readOnly: true,
            disabled: true,
          }),
        ),
      ),

    /* ── Bloco 5: Dados técnicos ── */
    empreendimentoCompleto &&
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "grid grid-2 divider" },
        /* @__PURE__ */ React.createElement(
          Field,
          {
            label: "Distância do padrão até a rede Cemig inferior a 30m?",
            req: true,
          },
          /* @__PURE__ */ React.createElement(Toggle, {
            value: obra.distMenor30,
            onChange: (v) => setObra({ ...obra, distMenor30: v }),
            options: [
              { v: "Sim", l: "Sim" },
              { v: "Não", l: "Não" },
            ],
          }),
        ),
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "O padrão está pronto para ser ligado?", req: true },
          /* @__PURE__ */ React.createElement(Toggle, {
            value: obra.prontoLigar,
            onChange: (v) => setObra({ ...obra, prontoLigar: v }),
            options: [
              { v: "Sim", l: "Sim" },
              { v: "Não", l: "Não" },
            ],
          }),
        ),
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Tipo de rede BT que atende o local" },
          /* @__PURE__ */ React.createElement(
            Sel,
            {
              value: obra.tipoRede,
              onChange: (e) => setObra({ ...obra, tipoRede: e.target.value }),
            },
            /* @__PURE__ */ React.createElement("option", null, "Monofásica"),
            /* @__PURE__ */ React.createElement("option", null, "Bifásica"),
            /* @__PURE__ */ React.createElement("option", null, "Trifásica"),
          ),
        ),
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Código do transformador mais próximo" },
          /* @__PURE__ */ React.createElement(Inp, {
            value: obra.transformador,
            onChange: (e) =>
              setObra({ ...obra, transformador: e.target.value }),
          }),
        ),
      ),

    /* ── Aviso contextual: pedido de vistoria/ligação (migrado da orientação
       geral "padrão pronto para ligar"). Reage ao toggle obra.prontoLigar. ── */
    empreendimentoCompleto &&
      obra.prontoLigar === "Sim" &&
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "cmg-aviso no-print", style: { marginTop: 14 } },
        /* @__PURE__ */ React.createElement("div", {
          className: "cmg-aviso-icon",
          "aria-hidden": "true",
        }),
        /* @__PURE__ */ React.createElement(
          "p",
          { className: "cmg-aviso-texto" },
          "Como o padrão já está pronto para ligar, o pedido de vistoria e ligação será disparado automaticamente após a conclusão das etapas do orçamento de conexão.",
        ),
      ),
    empreendimentoCompleto &&
      obra.prontoLigar === "Não" &&
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "cmg-aviso cmg-aviso--warn no-print",
          style: { marginTop: 14 },
        },
        /* @__PURE__ */ React.createElement("div", {
          className: "cmg-aviso-icon",
          "aria-hidden": "true",
        }),
        /* @__PURE__ */ React.createElement(
          "p",
          { className: "cmg-aviso-texto" },
          "Solicite o pedido de vistoria e ligação em até 120 dias após a conclusão das etapas do orçamento de conexão. O orçamento pode ser cancelado após duas reprovações pelo mesmo motivo, e há cobrança de taxa a partir do segundo serviço realizado.",
        ),
      ),

    /* ── Aviso contextual: comprovação de propriedade/posse e regularidade do
       imóvel em zona urbano (migrado da orientação geral de Conexão Nova). ── */
    empreendimentoCompleto &&
      obra.localizacao === "Urbano" &&
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "cmg-aviso no-print", style: { marginTop: 14 } },
        /* @__PURE__ */ React.createElement("div", {
          className: "cmg-aviso-icon",
          "aria-hidden": "true",
        }),
      ),

    /* ── Alerta coordenada obrigatória ── */
    empreendimentoCompleto &&
      coordObrigatoria &&
      !coordPreenchida &&
      /* @__PURE__ */ React.createElement(
        "div",
        {
          className: "cmg-aviso cmg-aviso--warn no-print",
          style: { marginTop: 8 },
        },
        /* @__PURE__ */ React.createElement("div", {
          className: "cmg-aviso-icon",
          "aria-hidden": "true",
        }),
        /* @__PURE__ */ React.createElement(
          "p",
          { className: "cmg-aviso-texto" },
          "Em área rural, a coordenada é obrigatória para localização da propriedade.",
        ),
      ),

    /* ── Mapa de localização ── */
    empreendimentoCompleto &&
      /* @__PURE__ */ React.createElement(LocalizacaoObra, { obra, setObra }),

    /* ── Restrição ambiental ── só aparece quando o ponto ESTÁ em área de
       restrição; sem restrição (ou ainda não consultado) o bloco some. ── */
    empreendimentoCompleto &&
      obra.restricaoAmbiental === "Sim" &&
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "field", style: { marginTop: 14 } },
        /* @__PURE__ */ React.createElement(
          "label",
          null,
          "Unidade consumidora em área de restrição ambiental?",
        ),
        /* Banner (warn): título em negrito + frase de localização, tudo num
           único <span> (o .cmg-aviso-texto é flex — sem o span os nós inline
           viram itens de flex e não fluem/quebram como texto corrido). */
        /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "cmg-aviso cmg-aviso--warn",
            style: { marginTop: 8 },
          },
          /* @__PURE__ */ React.createElement("div", {
            className: "cmg-aviso-icon",
            "aria-hidden": "true",
          }),
          /* @__PURE__ */ React.createElement(
            "p",
            { className: "cmg-aviso-texto" },
            /* @__PURE__ */ React.createElement(
              "span",
              null,
              /* @__PURE__ */ React.createElement(
                "strong",
                null,
                RESTRICAO_AVISO_TITULO,
              ),
              ". ",
              restricaoSentencaSegmentos(obra.restricoesDetalhe).map((s, i) =>
                s.b
                  ? /* @__PURE__ */ React.createElement(
                      "strong",
                      { key: i },
                      s.t,
                    )
                  : /* @__PURE__ */ React.createElement(
                      React.Fragment,
                      { key: i },
                      s.t,
                    ),
              ),
            ),
          ),
        ),
        /* Documentos exigidos, mesclados de todas as áreas (intro única +
           bullets unidos + notas), sempre visíveis abaixo do banner. */
        (() => {
          const d = restricaoDocsMesclado(obra.restricoesDetalhe);
          if (!d.bullets.length && !d.notas.length) return null;
          return /* @__PURE__ */ React.createElement(
            "div",
            { className: "restricao-docs" },
            d.intro &&
              /* @__PURE__ */ React.createElement(
                "p",
                { className: "restricao-docs-intro" },
                d.intro,
              ),
            d.bullets.length > 0 &&
              /* @__PURE__ */ React.createElement(
                "ul",
                { className: "restricao-docs-lista" },
                d.bullets.map((b, i) =>
                  /* @__PURE__ */ React.createElement("li", { key: i }, b),
                ),
              ),
            d.notas.map((n, i) =>
              /* @__PURE__ */ React.createElement(
                "p",
                { key: "n" + i, className: "restricao-docs-nota" },
                n,
              ),
            ),
          );
        })(),
        /* Aceite obrigatório — bloqueia a exportação do PDF (validacaoObrigatorios). */
        /* @__PURE__ */ React.createElement(
          "label",
          { className: "restricao-aceite" },
          /* @__PURE__ */ React.createElement("input", {
            type: "checkbox",
            checked: !!obra.restricaoAceite,
            onChange: (e) =>
              setObra({ ...obra, restricaoAceite: e.target.checked }),
          }),
          /* @__PURE__ */ React.createElement(
            "span",
            null,
            RESTRICAO_ACEITE_LABEL,
          ),
        ),
      ),
  );
}
