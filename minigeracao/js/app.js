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
function App() {
  const [d, setD] = useState(gdEstadoInicial());
  const [aba, setAba] = useState("ident");
  const [cepStatus, setCepStatus] = useState("");
  const [cnpjStatus, setCnpjStatus] = useState("");
  const set = (patch) => setD((s) => ({ ...s, ...patch }));
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
    req(d.impedanciaTrafo, "Impedância do transformador");
    if (d.entradaEnergia === GD_ENTRADA_COMPARTILHADA)
      req(d.qtdCubiculos, "Quantidade de Cubículos");
    req(d.solicitacao, "Tipo de Solicitação");
    // Formulário de Carga obrigatório para Ligação Nova / Aumento de Demanda Contratada.
    if (GD_SOLICITACOES_FORM_CARGA.includes(d.solicitacao)) {
      const c = d.cargas || {};
      const temCarga =
        (c.qtds || []).some((q) => (q || 0) > 0) ||
        (c.mots || []).some((m) => (parseInt(m.q) || 0) > 0) ||
        (c.extras || []).some((m) => (parseInt(m.q) || 0) > 0);
      if (!temCarga)
        faltas.push("Formulário de Carga (declarar as cargas elétricas)");
    }
    // Regra 10: "SEM Alteração de Demanda Contratada" não solicita nova demanda de consumo.
    if ((d.solicitacao || "").indexOf("SEM Alteração de Demanda") < 0)
      req(d.demandaConsumo, "Demanda contratada de consumo");
    req(d.potAtivaInstalada, "Potência Ativa Instalada Total");
    // Regra 11: GD existente COM alteração de potência ativa exige a geração já existente.
    if ((d.solicitacao || "").indexOf("GD Existente") >= 0)
      req(d.potGeracaoAtual, "Potência de Geração Atual");
    req(d.modalidade, "Modalidade de compensação");
    (d.fontes || []).forEach((f, i) => {
      req(f.fontePrimaria, `Fonte ${i + 1}: tipo de fonte`);
      req(f.potencia, `Fonte ${i + 1}: potência`);
    });
    // Regra 19: a GFC é calculada automaticamente — o cliente só escolhe a forma de apresentação.
    if (gdExigeGFC(d)) {
      req(d.garantiaForma, "Forma de apresentação da garantia");
    }
    if (!d.decl84) faltas.push("Declaração 9.4 (obrigatória)");
    // Regra 22: item 9.5 obrigatório quando Grid Zero = Sim.
    if (d.gridZero === "Sim" && !d.decl95)
      faltas.push("Declaração 9.5 (obrigatória para Grid Zero)");
    if (!d.decl86) faltas.push("Declaração 9.6 (obrigatória)");
    req(d.solicitanteNome, "Nome do solicitante");
    req(d.solicitanteEndereco, "Endereço de correspondência");
    req(d.solicitanteCelular, "Celular do solicitante");
    req(d.solicitanteEmail, "E-mail do solicitante");
    return { ok: faltas.length === 0, faltas };
  }, [d]);
  const idx = GD_ABAS.findIndex((a) => a.id === aba);
  const ctx = {
    d,
    set,
    cepStatus,
    cnpjStatus,
    buscarCep,
    buscarCnpj,
    validacao,
    gerarPdf: () => gerarPdfMiniGD(d),
    // Número da etapa (1-based) p/ o eyebrow das views; deriva da posição em
    // GD_ABAS e bate com o stepper lateral.
    etapaNum: idx + 1,
  };
  const Atual = GD_ABAS[idx].c;
  const irProx = () => idx < GD_ABAS.length - 1 && setAba(GD_ABAS[idx + 1].id);
  const irAnt = () => idx > 0 && setAba(GD_ABAS[idx - 1].id);
  // Trava de avanço: campos obrigatórios da aba de identificação (view escrita à
  // mão — lista explícita). Abas não mapeadas não travam o avanço.
  const abaCompleta = (() => {
    const reqPorAba = {
      ident: [
        "instalacao",
        "titular",
        "grupo",
        "classe",
        "cpfCnpj",
        "logradouro",
        "numero",
        "bairro",
        "municipio",
        "estado",
        "cep",
        "celular",
        "email",
      ],
    };
    const keys = reqPorAba[aba];
    if (!keys) return true;
    return keys.every((k) => d[k] != null && String(d[k]).trim() !== "");
  })();
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
            "Formulário de Ligação Nova e Alteração de Carga",
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
        /* @__PURE__ */ React.createElement(Atual, { ctx }),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "nav-bottom" },
          idx > 0 &&
            /* @__PURE__ */ React.createElement(
              Btn,
              { variant: "ghost", onClick: irAnt },
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
                {
                  variant: "primary",
                  onClick: irProx,
                  disabled: !abaCompleta,
                },
                "Avançar →",
              )
            : /* @__PURE__ */ React.createElement(
                Btn,
                {
                  variant: "primary",
                  onClick: () => gerarPdfMiniGD(d),
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
