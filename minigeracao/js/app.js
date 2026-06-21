const GD_ABAS = [
  { id: "ident", n: "Identificação", c: ViewIdentificacao },
  { id: "uc", n: "Dados da UC", c: ViewDadosUC },
  { id: "doc", n: "Documentação", c: ViewDocumentacao },
  { id: "ger", n: "Dados da Geração", c: ViewGeracao },
  { id: "arm", n: "Armazenamento", c: ViewArmazenamento },
  { id: "decl", n: "Declarações", c: ViewDeclaracoes },
  { id: "rev", n: "Prévia & PDF", c: ViewRevisao }
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
    req(d.impedanciaTrafo, "Impedância do transformador");
    if (d.entradaEnergia === GD_ENTRADA_COMPARTILHADA)
      req(d.qtdCubiculos, "Quantidade de Cubículos");
    req(d.solicitacao, "Tipo de Solicitação");
    req(d.demandaConsumo, "Demanda contratada de consumo");
    req(d.potAtivaInstalada, "Potência Ativa Instalada Total");
    req(d.modalidade, "Modalidade de compensação");
    (d.fontes || []).forEach((f, i) => {
      req(f.fontePrimaria, `Fonte ${i + 1}: tipo de fonte`);
      req(f.potencia, `Fonte ${i + 1}: potência`);
    });
    if (gdExigeGFC(d)) {
      req(d.gfcValor, "Garantia de Fiel Cumprimento (> 500 kW)");
      req(d.garantiaForma, "Forma de apresentação da garantia");
    }
    if (!d.decl84) faltas.push("Declaração 9.4 (obrigatória)");
    if (!d.decl86) faltas.push("Declaração 9.6 (obrigatória)");
    req(d.solicitanteNome, "Nome do solicitante");
    req(d.solicitanteEndereco, "Endereço de correspondência");
    req(d.solicitanteCelular, "Celular do solicitante");
    req(d.solicitanteEmail, "E-mail do solicitante");
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
    gerarPdf: () => gerarPdfMiniGD(d)
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
  ))), /* @__PURE__ */ React.createElement("main", { className: "main-col fade-in", key: aba }, /* @__PURE__ */ React.createElement(Atual, { ctx }), /* @__PURE__ */ React.createElement("div", { className: "nav-bottom" }, /* @__PURE__ */ React.createElement(Btn, { variant: "ghost", onClick: irAnt, disabled: idx === 0 }, "← Voltar"), /* @__PURE__ */ React.createElement("span", { className: "nav-step-info" }, "Etapa ", idx + 1, " de ", GD_ABAS.length), idx < GD_ABAS.length - 1 ? /* @__PURE__ */ React.createElement(Btn, { variant: "primary", onClick: irProx }, "Avançar →") : /* @__PURE__ */ React.createElement(
    Btn,
    {
      variant: "primary",
      onClick: () => gerarPdfMiniGD(d),
      disabled: !validacao.ok
    },
    "📄 Exportar PDF"
  )))));
}
ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
