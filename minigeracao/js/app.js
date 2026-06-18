// ============================================================
// MINIGERAÇÃO DISTRIBUÍDA — App principal
// ============================================================

const GD_ABAS = [
  { id: "ident", n: "Identificação", c: ViewIdentificacao },
  { id: "uc", n: "Dados da UC", c: ViewDadosUC },
  { id: "doc", n: "Documentação", c: ViewDocumentacao },
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

  const buscarCep = async (cep) => {
    const limpo = soDigitos(cep);
    if (limpo.length !== 8) return;
    setCepStatus("Buscando endereço…");
    try {
      const r = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const j = await r.json();
      if (j.erro) {
        setCepStatus("CEP não encontrado.");
        return;
      }
      setCepStatus("");
      set({
        logradouro: j.logradouro || d.logradouro,
        bairro: j.bairro || d.bairro,
        municipio: j.localidade || d.municipio,
        estado: j.uf || d.estado,
      });
    } catch (e) {
      setCepStatus("Falha ao buscar CEP.");
    }
  };
  const buscarCnpj = async (cnpj) => {
    const limpo = soDigitos(cnpj);
    if (limpo.length !== 14) return;
    setCnpjStatus("Buscando dados do CNPJ…");
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`);
      if (!r.ok) {
        setCnpjStatus("CNPJ não encontrado.");
        return;
      }
      const j = await r.json();
      setCnpjStatus("");
      set({
        titular: j.razao_social || d.titular,
        email: j.email || d.email,
        telefone: j.ddd_telefone_1
          ? mascararFixo(j.ddd_telefone_1)
          : d.telefone,
        logradouro: j.logradouro || d.logradouro,
        numero: j.numero || d.numero,
        bairro: j.bairro || d.bairro,
        municipio: j.municipio || d.municipio,
        cep: j.cep ? mascararCEP(String(j.cep)) : d.cep,
      });
    } catch (e) {
      setCnpjStatus("Falha ao buscar CNPJ.");
    }
  };

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
    req(d.solicitacao, "Tipo de Solicitação");
    req(d.demandaConsumo, "Demanda contratada de consumo");
    req(d.potAtivaInstalada, "Potência Ativa Instalada Total");
    req(d.modalidade, "Modalidade de compensação");
    (d.fontes || []).forEach((f, i) => {
      req(f.fontePrimaria, `Fonte ${i + 1}: tipo de fonte`);
      req(f.potencia, `Fonte ${i + 1}: potência`);
    });
    if ((parseFloat(d.potAtivaInstalada) || 0) > GD_GFC_LIMITE_KW)
      req(d.gfcValor, "Garantia de Fiel Cumprimento (> 500 kW)");
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
    gerarPdf: () => gerarPdfMiniGD(d),
  };

  const idx = GD_ABAS.findIndex((a) => a.id === aba);
  const Atual = GD_ABAS[idx].c;
  const irProx = () => idx < GD_ABAS.length - 1 && setAba(GD_ABAS[idx + 1].id);
  const irAnt = () => idx > 0 && setAba(GD_ABAS[idx - 1].id);

  return (
    <div>
      <div className="topbar">
        <div className="topbar-inner">
          <a className="logo-cemig" href="../index.html">
            <LogoCemig />
          </a>
          <div className="topbar-links">
            <span style={{ fontWeight: 700 }}>Minigeração Distribuída</span>
            <a href="../index.html">← Início</a>
          </div>
        </div>
      </div>
      <div className="layout">
        <aside className="sidebar">
          <div className="sidebar-title">Progresso do preenchimento</div>
          {GD_ABAS.map((a, i) => (
            <button
              key={a.id}
              className={
                "vstep" + (a.id === aba ? " active" : i < idx ? " done" : "")
              }
              onClick={() => setAba(a.id)}
            >
              <span className="vstep-num">{i + 1}</span>
              <span className="vstep-label">{a.n}</span>
            </button>
          ))}
        </aside>
        <main className="main-col fade-in" key={aba}>
          <Atual ctx={ctx} />
          <div className="nav-bottom">
            <Btn variant="ghost" onClick={irAnt} disabled={idx === 0}>
              ← Voltar
            </Btn>
            <span className="nav-step-info">
              Etapa {idx + 1} de {GD_ABAS.length}
            </span>
            {idx < GD_ABAS.length - 1 ? (
              <Btn variant="primary" onClick={irProx}>
                Avançar →
              </Btn>
            ) : (
              <Btn
                variant="primary"
                onClick={() => gerarPdfMiniGD(d)}
                disabled={!validacao.ok}
              >
                📄 Exportar PDF
              </Btn>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(<App />);
