const GD_ABAS = [
  { id: "ident", n: "Identificação", c: ViewIdentificacao },
  { id: "uc", n: "Dados da UC", c: ViewDadosUC },
  { id: "doc", n: "Documentação", c: ViewDocumentacao },
  { id: "carga", n: "Formulário de Carga", c: ViewFormularioCarga },
  { id: "ger", n: "Dados da Geração", c: ViewGeracao },
  { id: "arm", n: "Armazenamento", c: ViewArmazenamento },
  { id: "decl", n: "Declarações", c: ViewDeclaracoes },
  { id: "rev", n: "Prévia & PDF", c: ViewRevisao },
];
function gdModoDaURL() {
  let modo = "";
  try {
    modo = new URLSearchParams(location.search).get("modo") || "";
  } catch (e) {}
  // Regra 1/2: Fast Track e Grid Zero são definidos pela porta de entrada (modo) e
  // ficam SEMPRE travados. Quando o modo não for selecionado, o campo é travado em "Não".
  if (modo === "fasttrack")
    return {
      modo,
      label: "Fast Track",
      descricao:
        "Enquadramento no inciso III do art. 73-A — campo definido pela modalidade e bloqueado.",
      overrides: { fastTrack: "Sim", gridZero: "Não" },
      locked: { fastTrack: true, gridZero: true },
    };
  if (modo === "gridzero")
    return {
      modo,
      label: "Grid Zero",
      descricao:
        "Empreendimento sem injeção de energia na rede — campo definido pela modalidade e bloqueado.",
      overrides: { gridZero: "Sim", fastTrack: "Não" },
      locked: { gridZero: true, fastTrack: true },
    };
  // Sem modo: nem Fast Track nem Grid Zero foram selecionados ⇒ ambos travados em "Não".
  return {
    modo: "",
    label: "",
    descricao: "",
    overrides: { fastTrack: "Não", gridZero: "Não" },
    locked: { fastTrack: true, gridZero: true },
  };
}
const GD_MODO = gdModoDaURL();
function App() {
  const [d, setD] = useState(() => ({
    ...gdEstadoInicial(),
    ...GD_MODO.overrides,
  }));
  const [aba, setAba] = useState("ident");
  const [cepStatus, setCepStatus] = useState("");
  const [cnpjStatus, setCnpjStatus] = useState("");
  const set = (patch) => setD((s) => ({ ...s, ...patch }));
  useEffect(() => {
    const pm =
      ((parseFloat(d.qtdModulos) || 0) *
        (parseFloat(d.potNominalModulo) || 0)) /
      1e3;
    const pi =
      (parseFloat(d.qtdInversores) || 0) *
      (parseFloat(d.potNominalInversor) || 0);
    const pmS = pm ? String(pm) : "";
    const piS = pi ? String(pi) : "";
    const patch = {};
    if (pmS !== d.potTotalModulos) patch.potTotalModulos = pmS;
    if (piS !== d.potTotalInversores) patch.potTotalInversores = piS;
    // Regra 6: em FV, a Potência Ativa Instalada de geração é calculada automaticamente
    // como o MENOR valor entre a potência total de módulos e a potência total de inversores.
    if (d.fontePrimaria === "Solar") {
      const calc = pm > 0 && pi > 0 ? Math.min(pm, pi) : pm || pi || 0;
      const calcS = calc ? String(calc) : "";
      if (calcS !== d.potAtivaInstalada) patch.potAtivaInstalada = calcS;
    }
    if (Object.keys(patch).length) setD((s) => ({ ...s, ...patch }));
  }, [
    d.qtdModulos,
    d.potNominalModulo,
    d.qtdInversores,
    d.potNominalInversor,
    d.fontePrimaria,
  ]);
  const { buscarCep, buscarCnpj } = criarConsultasExternas({
    d,
    set,
    soDigitos,
    mascararFixo,
    mascararCEP,
    setCepStatus,
    setCnpjStatus,
  });
  const validacao = useMemo(() => {
    const faltas = [];
    const req = (v, label) => {
      if (!String(v || "").trim()) faltas.push(label);
    };
    req(d.instalacao, "Número da instalação");
    req(d.titular, "Titular da UC");
    req(d.classe, "Classe");
    req(d.cpfCnpj, "CPF/CNPJ");
    req(d.logradouro, "Logradouro");
    req(d.numero, "Número");
    req(d.bairro, "Bairro");
    req(d.municipio, "Município");
    req(d.cep, "CEP");
    req(d.celular, "Celular");
    req(d.email, "E-mail");
    req(d.fuso, "Fuso (UTM)");
    req(d.utmE, "E (Abscissa)");
    req(d.utmN, "N (Ordenada)");
    const utm = gdValidarUTM(d.fuso, d.utmE, d.utmN);
    if (d.fuso && d.utmE && d.utmN && !utm.ok)
      faltas.push("Coordenada UTM fora da faixa do fuso");
    req(d.solicitacao, "Tipo de Solicitação");
    req(d.edificacao, "Tipo de edificação");
    // Formulário de Carga obrigatório para Ligação Nova / Aumento de Carga.
    if (GD_SOLICITACOES_FORM_CARGA.includes(d.solicitacao)) {
      const c = d.cargas || {};
      const temCarga =
        (c.qtds || []).some((q) => (q || 0) > 0) ||
        (c.mots || []).some((m) => (parseInt(m.q) || 0) > 0) ||
        (c.extras || []).some((m) => (parseInt(m.q) || 0) > 0);
      if (!temCarga)
        faltas.push("Formulário de Carga (declarar as cargas elétricas)");
    }
    // Regra 3: em Baixa Tensão (Grupo B) não há contratação de demanda de consumo.
    if (d.grupo !== "B") req(d.demandaConsumo, "Demanda contratada de consumo");
    // Regra 1: Aumento de Potência exige declaração da nova proteção.
    if (GD_SOLICITACOES_AUMENTO_POTENCIA.includes(d.solicitacao))
      req(d.novaProtecao, "Nova Proteção (Aumento de Potência)");
    req(d.fontePrimaria, "Tipo de Fonte Primária");
    req(d.potAtivaInstalada, "Potência Ativa Instalada Total");
    // Regra 4: usina já existente exige informar a potência de geração já conectada.
    if ((d.solicitacao || "").indexOf("GD Existente") >= 0)
      req(d.potGeracaoExistente, "Potência de geração já existente");
    req(d.modalidade, "Modalidade de compensação");
    // Regra 5: no Fast Track, a potência da usina não pode exceder 7,5 kW.
    if (
      d.fastTrack === "Sim" &&
      (parseFloat(d.potAtivaInstalada) || 0) > GD_FAST_LIMITE_USINA_KW
    )
      faltas.push(
        `Potência da usina acima do limite Fast Track (${GD_FAST_LIMITE_kW} kW)`,
      );
    if (!d.decl84) faltas.push("Declaração 8.4 (obrigatória)");
    if (!d.decl86) faltas.push("Declaração 8.6 (obrigatória)");
    req(d.solicitanteNome, "Nome do solicitante");
    req(d.solicitanteEndereco, "Endereço de correspondência");
    req(d.solicitanteCelular, "Celular do solicitante");
    req(d.solicitanteEmail, "E-mail do solicitante");
    if (d.fastTrack === "Sim")
      req(d.fastRegra, "Regra de enquadramento (Fast Track)");
    return { ok: faltas.length === 0, faltas };
  }, [d]);
  const ctx = {
    d,
    set,
    cepStatus,
    cnpjStatus,
    buscarCep,
    buscarCnpj,
    validacao,
    locked: GD_MODO.locked,
    gerarPdf: () => gerarPdfMicroGD(d),
  };
  const idx = GD_ABAS.findIndex((a) => a.id === aba);
  const Atual = GD_ABAS[idx].c;
  const irProx = () => idx < GD_ABAS.length - 1 && setAba(GD_ABAS[idx + 1].id);
  const irAnt = () => idx > 0 && setAba(GD_ABAS[idx - 1].id);
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: "cemig-form" },
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "topbar" },
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "topbar-inner cmg-container" },
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "topbar-left" },
          /* @__PURE__ */ React.createElement(LogoCemig),
          /* @__PURE__ */ React.createElement(
            "span",
            { className: "app-title" },
            "Formulário de Microgeração Distribuída",
          ),
        ),
      ),
    ),
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "layout" },
      /* @__PURE__ */ React.createElement(
        "aside",
        { className: "sidebar" },
        /* @__PURE__ */ React.createElement(
          "a",
          { className: "form-back", href: "../index.html" },
          "VOLTAR",
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "sidebar-title" },
          "Progresso do preenchimento",
        ),
        GD_ABAS.map((a, i) =>
          /* @__PURE__ */ React.createElement(
            "button",
            {
              key: a.id,
              className:
                "vstep" + (a.id === aba ? " active" : i < idx ? " done" : ""),
              onClick: () => setAba(a.id),
            },
            /* @__PURE__ */ React.createElement(
              "span",
              { className: "vstep-num" },
              i < idx ? "✓" : i + 1,
            ),
            /* @__PURE__ */ React.createElement(
              "span",
              { className: "vstep-label" },
              a.n,
            ),
          ),
        ),
      ),
      /* @__PURE__ */ React.createElement(
        "main",
        { className: "main-col fade-in", key: aba },
        GD_MODO.modo &&
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "gd-modo-banner" },
            /* @__PURE__ */ React.createElement(
              "strong",
              null,
              "Modalidade: ",
              GD_MODO.label,
            ),
            GD_MODO.descricao &&
              /* @__PURE__ */ React.createElement(
                "span",
                null,
                GD_MODO.descricao,
              ),
          ),
        /* @__PURE__ */ React.createElement(Atual, { ctx }),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "nav-bottom" },
          /* @__PURE__ */ React.createElement(
            Btn,
            { variant: "ghost", onClick: irAnt, disabled: idx === 0 },
            "← Voltar",
          ),
          /* @__PURE__ */ React.createElement(
            "span",
            { className: "nav-step-info" },
            "Etapa ",
            idx + 1,
            " de ",
            GD_ABAS.length,
          ),
          idx < GD_ABAS.length - 1
            ? /* @__PURE__ */ React.createElement(
                Btn,
                { variant: "primary", onClick: irProx },
                "Avançar →",
              )
            : /* @__PURE__ */ React.createElement(
                Btn,
                {
                  variant: "primary",
                  onClick: () => gerarPdfMicroGD(d),
                  disabled: !validacao.ok,
                },
                "📄 Exportar PDF",
              ),
        ),
      ),
    ),
    /* @__PURE__ */ React.createElement(
      "footer",
      { className: "portal-footer" },
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "portal-footer-inner" },
        /* @__PURE__ */ React.createElement(LogoCemig),
        /* @__PURE__ */ React.createElement(
          "p",
          { className: "portal-footer-copy" },
          "CEMIG " +
            new Date().getFullYear() +
            "© - Todos os Direitos Reservados",
        ),
      ),
    ),
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ React.createElement(App, null),
);
