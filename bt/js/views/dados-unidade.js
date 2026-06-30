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

  const opcoesSolicitacao = solicitacoesPermitidas || SOLICITACOES_INDIVIDUAIS;

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
      title: "Dados da unidade consumidora",
      sub: "Preencha os dados de identificação, endereço e informações técnicas da unidade.",
    },

    /* ── Bloco 1: Solicitação / Escopo / Nº UCs ── */
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid grid-2" },
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Solicitação", req: true, float: true },
        /* @__PURE__ */ React.createElement(
          Sel,
          {
            value: atend.solicitacao,
            disabled: restrito,
            onChange: (e) =>
              setAtend({ ...atend, solicitacao: e.target.value }),
          },
          opcoesSolicitacao.map((s) =>
            /* @__PURE__ */ React.createElement("option", { key: s }, s),
          ),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Escopo do Atendimento", req: true, float: true },
        /* @__PURE__ */ React.createElement(
          Sel,
          {
            value: atend.escopo,
            onChange: (e) => setAtend({ ...atend, escopo: e.target.value }),
          },
          (ESCOPOS[atend.solicitacao] || []).map((s) =>
            /* @__PURE__ */ React.createElement("option", { key: s }, s),
          ),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        Field,
        {
          label: "Nº de Unidades Consumidoras",
          req: true,
          float: true,
          hint: rural
            ? "Pedido rural é limitado a 1 unidade consumidora."
            : void 0,
        },
        /* @__PURE__ */ React.createElement(Inp, {
          type: "number",
          max: rural ? 1 : 3,
          disabled: rural,
          value: atend.nUCs,
          onChange: (e) => {
            if (rural) {
              setAtend({ ...atend, nUCs: 1 });
              return;
            }
            const n = Math.min(3, Math.max(1, parseInt(e.target.value) || 1));
            setAtend({ ...atend, nUCs: n });
          },
        }),
      ),
    ),

    /* ── Bloco 2: Zona + ART ── */
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid grid-2 divider" },
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
          { label: "Complemento" },
          /* @__PURE__ */ React.createElement(Inp, {
            value: obra.compl,
            onChange: (e) => setObra({ ...obra, compl: e.target.value }),
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
        }),
      ),
    ),

    /* ── Bloco 5: Dados técnicos ── */
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "grid grid-2 divider" },
      /* @__PURE__ */ React.createElement(
        Field,
        { label: "Distância do padrão até a rede Cemig inferior a 30m?" },
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

    /* ── Alerta coordenada obrigatória ── */
    coordObrigatoria &&
      !coordPreenchida &&
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "alert alert-warn", style: { marginTop: 8 } },
        "⚠ Em área rural com distância superior a 30 m da rede CEMIG, a coordenada é obrigatória para localização da propriedade.",
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
          { className: "alert alert-info" },
          "Consulte a coordenada no mapa acima para verificar a restrição ambiental.",
        ),
      obra.restricaoAmbiental === "Sim" &&
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "alert alert-warn restricao-destaque" },
          /* @__PURE__ */ React.createElement(
            "strong",
            null,
            "⚠ SIM — em área de restrição ambiental.",
          ),
          obra.restricoesTexto &&
            /* @__PURE__ */ React.createElement(
              "div",
              { style: { marginTop: 6 } },
              obra.restricoesTexto,
            ),
        ),
      obra.restricaoAmbiental === "Não" &&
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "alert alert-ok restricao-destaque" },
          /* @__PURE__ */ React.createElement(
            "strong",
            null,
            "Não há restrição ambiental.",
          ),
        ),
    ),
  );
}
