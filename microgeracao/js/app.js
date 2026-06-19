const GD_ABAS = [
  { id: "ident", n: "Identifica\xE7\xE3o", c: ViewIdentificacao },
  { id: "uc", n: "Dados da UC", c: ViewDadosUC },
  { id: "doc", n: "Documenta\xE7\xE3o", c: ViewDocumentacao },
  { id: "ger", n: "Dados da Gera\xE7\xE3o", c: ViewGeracao },
  { id: "arm", n: "Armazenamento", c: ViewArmazenamento },
  { id: "decl", n: "Declara\xE7\xF5es", c: ViewDeclaracoes },
  { id: "rev", n: "Pr\xE9via & PDF", c: ViewRevisao }
];
function App() {
  const [d, setD] = useState(gdEstadoInicial());
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
    req(d.instalacao, "N\xFAmero da instala\xE7\xE3o");
    req(d.titular, "Titular da UC");
    req(d.classe, "Classe");
    req(d.cpfCnpj, "CPF/CNPJ");
    req(d.logradouro, "Logradouro");
    req(d.numero, "N\xFAmero");
    req(d.bairro, "Bairro");
    req(d.municipio, "Munic\xEDpio");
    req(d.cep, "CEP");
    req(d.celular, "Celular");
    req(d.email, "E-mail");
    req(d.fuso, "Fuso (UTM)");
    req(d.utmE, "E (Abscissa)");
    req(d.utmN, "N (Ordenada)");
    const utm = gdValidarUTM(d.fuso, d.utmE, d.utmN);
    if (d.fuso && d.utmE && d.utmN && !utm.ok)
      faltas.push("Coordenada UTM fora da faixa do fuso");
    req(d.solicitacao, "Tipo de Solicita\xE7\xE3o");
    req(d.edificacao, "Tipo de edifica\xE7\xE3o");
    req(d.demandaConsumo, "Demanda contratada de consumo");
    req(d.fontePrimaria, "Tipo de Fonte Prim\xE1ria");
    req(d.potAtivaInstalada, "Pot\xEAncia Ativa Instalada Total");
    req(d.modalidade, "Modalidade de compensa\xE7\xE3o");
    if (!d.decl84) faltas.push("Declara\xE7\xE3o 8.4 (obrigat\xF3ria)");
    if (!d.decl86) faltas.push("Declara\xE7\xE3o 8.6 (obrigat\xF3ria)");
    req(d.solicitanteNome, "Nome do solicitante");
    req(d.solicitanteEndereco, "Endere\xE7o de correspond\xEAncia");
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
    gerarPdf: () => gerarPdfMicroGD(d)
  };
  const idx = GD_ABAS.findIndex((a) => a.id === aba);
  const Atual = GD_ABAS[idx].c;
  const irProx = () => idx < GD_ABAS.length - 1 && setAba(GD_ABAS[idx + 1].id);
  const irAnt = () => idx > 0 && setAba(GD_ABAS[idx - 1].id);
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { className: "topbar" }, /* @__PURE__ */ React.createElement("div", { className: "topbar-inner" }, /* @__PURE__ */ React.createElement("a", { className: "logo-cemig", href: "../index.html" }, /* @__PURE__ */ React.createElement(LogoCemig, null)), /* @__PURE__ */ React.createElement("div", { className: "topbar-links" }, /* @__PURE__ */ React.createElement("span", { style: { fontWeight: 700 } }, "Microgera\xE7\xE3o Distribu\xEDda"), /* @__PURE__ */ React.createElement(
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
  ))), /* @__PURE__ */ React.createElement("main", { className: "main-col fade-in", key: aba }, /* @__PURE__ */ React.createElement(Atual, { ctx }), /* @__PURE__ */ React.createElement("div", { className: "nav-bottom" }, /* @__PURE__ */ React.createElement(Btn, { variant: "ghost", onClick: irAnt, disabled: idx === 0 }, "\u2190 Voltar"), /* @__PURE__ */ React.createElement("span", { className: "nav-step-info" }, "Etapa ", idx + 1, " de ", GD_ABAS.length), idx < GD_ABAS.length - 1 ? /* @__PURE__ */ React.createElement(Btn, { variant: "primary", onClick: irProx }, "Avan\xE7ar \u2192") : /* @__PURE__ */ React.createElement(
    Btn,
    {
      variant: "primary",
      onClick: () => gerarPdfMicroGD(d),
      disabled: !validacao.ok
    },
    "\u{1F4C4} Exportar PDF"
  )))));
}
ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(App, null));
