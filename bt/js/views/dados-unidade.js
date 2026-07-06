/* ============================================================
   CEMIG BT — Individual · Etapa "Dados da unidade" (Fase 4)
   ------------------------------------------------------------
   Funde TabDadosUnidade + TabObra num único Card, evitando
   dois cabeçalhos separados. Os campos de solicitação/escopo/
   nUCs aparecem na primeira linha; os de endereço e dados
   técnicos continuam logo abaixo, na mesma superfície visual.
   ============================================================ */
function TabDadosUnidade({ ctx }) {
  const {
    atend,
    setAtend,
    restrito,
    rural,
    solicitacoesPermitidas,
    obra,
    setObra,
    cepStatus,
    buscarCEP,
    coordObrigatoria,
    coordPreenchida,
    coletivo,
    zonaTravada,
  } = ctx;

  // Troca de zona limpa os campos da zona oposta.
  const trocarZona = (v) => {
    if (v === obra.localizacao) return;
    if (v === "Rural")
      setObra({
        ...obra,
        localizacao: v,
        cep: "",
        endereco: "",
        num: "",
        compl: "",
        bairro: "",
      });
    else
      setObra({
        ...obra,
        localizacao: v,
        distritoComunidade: "",
        nomePropriedade: "",
        pontoRef: "",
        instProxima: "",
      });
  };

  return /* @__PURE__ */ React.createElement(
    Card,
    {
      eyebrow: "Etapa " + ctx.etapaNum,
      /* A view serve o Individual ("dados") e o Coletivo/Múltiplas Torres
         ("obra" — antiga TabObra, fundida aqui). */
      title:
        ctx.formType === "individual"
          ? "Dados da unidade consumidora"
          : "Dados da Obra",
      sub: "Preencha os dados de identificação das unidades consumidoras.",
    },

    /* Aviso (variante warn): todas as UCs do pedido devem estar no mesmo
       endereço, mudando apenas o complemento. Reutiliza o banner .cmg-aviso. */
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

    /* ── Bloco 2: Zona + ART ── */
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid grid-2" },
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label: "Zona de localização",
          req: true,
          hint: zonaTravada
            ? "Modalidade rural: zona fixada em Rural."
            : void 0,
        },
        /* @__PURE__ */ React.createElement(Toggle, {
          value: obra.localizacao,
          disabled: zonaTravada,
          onChange: trocarZona,
          options: [
            { v: "Urbana", l: "Urbana" },
            { v: "Rural", l: "Rural" },
          ],
        }),
      ),
      coletivo &&
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Nº ART/TRT de Projeto", req: true },
          /* @__PURE__ */ React.createElement(Inp, {
            value: obra.art,
            onChange: (e) => setObra({ ...obra, art: e.target.value }),
          }),
        ),
    ),

    /* ── Bloco 3a: Endereço Urbano ── */
    obra.localizacao === "Urbana" &&
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "grid grid-2", style: { marginTop: 14 } },
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "CEP", req: true, span: 2 },
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

    /* ── Bloco 3b: Endereço Rural ── */
    obra.localizacao === "Rural" &&
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "grid grid-2", style: { marginTop: 14 } },
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Município", req: true },
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
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Distrito / Comunidade / Região" },
          /* @__PURE__ */ React.createElement(Inp, {
            value: obra.distritoComunidade,
            onChange: (e) =>
              setObra({ ...obra, distritoComunidade: e.target.value }),
          }),
        ),
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Nome da propriedade" },
          /* @__PURE__ */ React.createElement(Inp, {
            value: obra.nomePropriedade,
            onChange: (e) =>
              setObra({ ...obra, nomePropriedade: e.target.value }),
          }),
        ),
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Ponto de referência" },
          /* @__PURE__ */ React.createElement(Inp, {
            value: obra.pontoRef,
            onChange: (e) => setObra({ ...obra, pontoRef: e.target.value }),
          }),
        ),
        /* @__PURE__ */ React.createElement(
          Field,
          { label: "Nº instalação mais próxima" },
          /* @__PURE__ */ React.createElement(Inp, {
            value: obra.instProxima,
            onChange: (e) => setObra({ ...obra, instProxima: e.target.value }),
          }),
        ),
      ),

    /* ── Bloco 4: Coordenadas ── */
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
          onChange: (e) => setObra({ ...obra, transformador: e.target.value }),
        }),
      ),
    ),

    /* ── Aviso contextual: pedido de vistoria/ligação (migrado da orientação
       geral "padrão pronto para ligar"). Reage ao toggle obra.prontoLigar. ── */
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
       imóvel em zona urbana (migrado da orientação geral de Conexão Nova). ── */
    obra.localizacao === "Urbana" &&
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
          "Para pedidos de Conexão Nova, anexe documento que comprove a propriedade ou posse do local a ser atendido. Por se tratar de unidade em área urbana, anexe também documento que comprove a regularidade do imóvel.",
        ),
      ),

    /* ── Alerta coordenada obrigatória ── */
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
    /* @__PURE__ */ React.createElement(LocalizacaoObra, { obra, setObra }),

    /* ── Restrição ambiental ── */
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "field", style: { marginTop: 14 } },
      /* @__PURE__ */ React.createElement(
        "label",
        null,
        "Unidade consumidora em área de restrição ambiental?",
      ),
      !obra.restricaoAmbiental &&
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "cmg-aviso", style: { marginTop: 8 } },
          /* @__PURE__ */ React.createElement("div", {
            className: "cmg-aviso-icon",
            "aria-hidden": "true",
          }),
          /* @__PURE__ */ React.createElement(
            "p",
            { className: "cmg-aviso-texto" },
            "Consulte a coordenada no mapa acima para verificar a restrição ambiental.",
          ),
        ),
      obra.restricaoAmbiental === "Sim" &&
        /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "cmg-aviso cmg-aviso--warn restricao-destaque",
            style: { marginTop: 8 },
          },
          /* @__PURE__ */ React.createElement("div", {
            className: "cmg-aviso-icon",
            "aria-hidden": "true",
          }),
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "cmg-aviso-texto" },
            /* @__PURE__ */ React.createElement(
              "strong",
              null,
              "Em área de restrição ambiental.",
            ),
            /* Um dropdown por área de preservação (frase + documentos). */
            (obra.restricoesDetalhe || []).map((a, i) =>
              /* @__PURE__ */ React.createElement(
                "details",
                { key: a.id + "-" + i, className: "restricao-area" },
                /* @__PURE__ */ React.createElement(
                  "summary",
                  { className: "restricao-area-head" },
                  a.cor &&
                    /* @__PURE__ */ React.createElement("span", {
                      className: "restricao-area-cor",
                      style: { background: a.cor },
                      "aria-hidden": "true",
                    }),
                  /* @__PURE__ */ React.createElement(
                    "span",
                    { className: "restricao-area-titulo" },
                    a.rotulo,
                  ),
                ),
                /* @__PURE__ */ React.createElement(
                  "div",
                  { className: "restricao-area-body" },
                  /* @__PURE__ */ React.createElement(
                    "p",
                    { className: "restricao-area-frase" },
                    a.fraseAntes,
                    /* @__PURE__ */ React.createElement("strong", null, a.nome),
                    ".",
                  ),
                  a.documentos &&
                    /* @__PURE__ */ React.createElement(
                      "p",
                      {
                        className: "restricao-area-docs",
                        style: { whiteSpace: "pre-line" },
                      },
                      a.documentos,
                    ),
                ),
              ),
            ),
          ),
        ),
      obra.restricaoAmbiental === "Não" &&
        /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "cmg-aviso restricao-destaque",
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
              "strong",
              null,
              "Não há restrição ambiental.",
            ),
          ),
        ),
    ),
  );
}
