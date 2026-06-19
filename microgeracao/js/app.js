const GD_ABAS = [
  { id: "ident", n: "Identificação", c: ViewIdentificacao },
  { id: "uc", n: "Dados da UC", c: ViewDadosUC },
  { id: "doc", n: "Documentação", c: ViewDocumentacao },
  { id: "ger", n: "Dados da Geração", c: ViewGeracao },
  { id: "arm", n: "Armazenamento", c: ViewArmazenamento },
  { id: "decl", n: "Declarações", c: ViewDeclaracoes },
  { id: "rev", n: "Prévia & PDF", c: ViewRevisao }
];
function gdModoDaURL() {
  let modo = "";
  try {
    modo = new URLSearchParams(location.search).get("modo") || "";
  } catch (e) {}
  if (modo === "fasttrack")
    return {
      modo,
      label: "Fast Track",
      descricao: 'Enquadramento no inciso III do art. 73-A — campo definido pela modalidade e bloqueado.',
      overrides: { fastTrack: "Sim" },
      locked: { fastTrack: true }
    };
  if (modo === "gridzero")
    return {
      modo,
      label: "Grid Zero",
      descricao: "Empreendimento sem injeção de energia na rede — campo definido pela modalidade e bloqueado.",
      overrides: { gridZero: "Sim" },
      locked: { gridZero: true }
    };
  return { modo: "", label: "", descricao: "", overrides: {}, locked: {} };
}
const GD_MODO = gdModoDaURL();
function App() {
  const [d, setD] = useState(() => ({ ...gdEstadoInicial(), ...GD_MODO.overrides }));
  const [aba, setAba] = useState("ident");
  const [cepStatus, setCepStatus] = useState("");
  const [cnpjStatus, setCnpjStatus] = useState("");
  const set = (patch) => setD((s) => ({ ...s, ...patch }));
  useEffect(() => {
    const pm = (parseFloat(d.qtdModulos) || 0) * (parseFloat(d.potNominalModulo) || 0) / 1e3;
    const pi = (parseFloat(d.qtdInversores) || 0) * (parseFloat(d.potNominalInversor) || 0);
    const pmS = pm ? String(pm) : "";
    const piS = pi ? String(pi) : "";
    if (pmS !== d.potTotalModulos || piS !== d.potTotalInversores)
      setD((s) => ({ ...s, potTotalModulos: pmS, potTotalInversores: piS }));
  }, [d.qtdModulos, d.potNominalModulo, d.qtdInversores, d.potNominalInversor]);
  const { buscarCep, buscarCnpj } = criarConsultasExternas({
    d,
    set,
    soDigitos,
    mascararFixo,
    mascararCEP,
    setCepStatus,
    setCnpjStatus
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
    req(d.demandaConsumo, "Demanda contratada de consumo");
    req(d.fontePrimaria, "Tipo de Fonte Primária");
    req(d.potAtivaInstalada, "Potência Ativa Instalada Total");
    req(d.modalidade, "Modalidade de compensação");
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
    gerarPdf: () => gerarPdfMicroGD(d)
  };
  const idx = GD_ABAS.findIndex((a) => a.id === aba);
  const Atual = GD_ABAS[idx].c;
  const irProx = () => idx < GD_ABAS.length - 1 && setAba(GD_ABAS[idx + 1].id);
  const irAnt = () => idx > 0 && setAba(GD_ABAS[idx - 1].id);
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "topbar" }, /* @__PURE__ */ React.createElement("div", { className: "topbar-inner" }, /* @__PURE__ */ React.createElement("div", { className: "topbar-left" }, /* @__PURE__ */ React.createElement("a", { className: "topbar-home", href: "../index.html" }, "← Início"), /* @__PURE__ */ React.createElement("span", { className: "app-title" }, "Assistente de formulário")), /* @__PURE__ */ React.createElement("div", { className: "topbar-links" }, /* @__PURE__ */ React.createElement(
    "a",
    {
      href: "https://atende.cemig.com.br/Login",
      target: "_blank",
      rel: "noreferrer"
    },
    "CEMIG ATENDE"
  ), /* @__PURE__ */ React.createElement(
    "a",
    {
      href: "https://partapr.cemig.com.br/PARTAPR/SelecaoModulo.aspx",
      target: "_blank",
      rel: "noreferrer"
    },
    "APR Web"
  )))), /* @__PURE__ */ React.createElement("div", { className: "layout" }, /* @__PURE__ */ React.createElement("aside", { className: "sidebar" }, /* @__PURE__ */ React.createElement("div", { className: "sidebar-title" }, "Progresso do preenchimento"), GD_ABAS.map((a, i) => /* @__PURE__ */ React.createElement(
    "button",
    {
      key: a.id,
      className: "vstep" + (a.id === aba ? " active" : i < idx ? " done" : ""),
      onClick: () => setAba(a.id)
    },
    /* @__PURE__ */ React.createElement("span", { className: "vstep-num" }, i + 1),
    /* @__PURE__ */ React.createElement("span", { className: "vstep-label" }, a.n)
  ))), /* @__PURE__ */ React.createElement("main", { className: "main-col fade-in", key: aba }, GD_MODO.modo && /* @__PURE__ */ React.createElement("div", { className: "gd-modo-banner" }, /* @__PURE__ */ React.createElement("strong", null, "Modalidade: ", GD_MODO.label), GD_MODO.descricao && /* @__PURE__ */ React.createElement("span", null, GD_MODO.descricao)), /* @__PURE__ */ React.createElement(Atual, { ctx }), /* @__PURE__ */ React.createElement("div", { className: "nav-bottom" }, /* @__PURE__ */ React.createElement(Btn, { variant: "ghost", onClick: irAnt, disabled: idx === 0 }, "← Voltar"), /* @__PURE__ */ React.createElement("span", { className: "nav-step-info" }, "Etapa ", idx + 1, " de ", GD_ABAS.length), idx < GD_ABAS.length - 1 ? /* @__PURE__ */ React.createElement(Btn, { variant: "primary", onClick: irProx }, "Avançar →") : /* @__PURE__ */ React.createElement(
    Btn,
    {
      variant: "primary",
      onClick: () => gerarPdfMicroGD(d),
      disabled: !validacao.ok
    },
    "📄 Exportar PDF"
  )))));
}
ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
