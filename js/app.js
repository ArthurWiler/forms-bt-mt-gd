/* ============================================================
   CEMIG — Aplicação principal (React + Babel)
   Formulário unificado de Orçamento de Conexão BT
   Individual · Coletivo · Múltiplas Torres/Blocos
   ============================================================ */

// ============================================================
// APP
// ============================================================
function App() {
  const [aba, setAba] = useState("orient");
  // Tela inicial: modalidade escolhida (null = ainda na tela inicial)
  const [modalidade, setModalidade] = useState(null);
  // Card específico selecionado na tela inicial (ex.: "casa50", "casa100")
  const [cardSelecionado, setCardSelecionado] = useState(null);
  // Fluxo simplificado (Casa até 50m² / até 100m²): sem coletivo/híbrido/multitorres
  const restrito = !!cardSelecionado?.restrito;

  // ---- Tipo de atendimento ----
  const [atend, setAtend] = useState({
    disjGeral: "Não", // possui disjuntor geral? Não=Individual, Sim=Coletivo
    nUCs: 1,
    biAcima63: false,
    triAcima63: false,
    acima75: false,
    solicitacao: SOLICITACOES[0], // padrão (coletivo)
    escopo: "Ligação Nova", // padrão
    disjuntorGeral: "",
    disjGeralAtual: "", // disjuntor geral existente (alteração de carga com troca)
    demandaAtual: "", // demanda atual (kVA) em alteração de carga
    demandaNaoResidencial: "", // demanda geral (kVA) das UCs não residenciais, calculada pelo responsável técnico
    atendA: "Bloco", // múltiplas torres: atendimento a Bloco/Torre
    nBlocos: 1,
  });
  const coletivo = atend.disjGeral === "Sim";
  const multiTorres = coletivo && atend.solicitacao === SOLICITACOES[4];

  // ---- Dados compartilhados ----
  const [prop, setProp] = useState({
    nome: "",
    filiacao: "",
    email: "",
    rg: "",
    nasc: "",
    celular: "",
    fixo: "",
    cpfCnpj: "",
    laudoMedico: "Não",
    telProp: "",
    nis: "Não",
    numNis: "",
  });
  const [corr, setCorr] = useState({
    vencimento: "",
    receberEmail: "Sim",
    alternativa: "Endereço novo", // quando não recebe no e-mail informado
    outroEmail: "",
    rua: "",
    bairro: "",
    num: "",
    compl: "",
    municipio: "",
    cep: "",
    estado: "MG",
    contaGlobal: "",
  });
  const [obra, setObra] = useState({
    art: "",
    prontoLigar: "Não",
    restricaoAmbiental: "", // autopreenchido após a consulta (Sim/Não)
    restricoesTexto: "", // descrição das restrições encontradas
    endereco: "",
    num: "",
    compl: "",
    bairro: "",
    cidade: "",
    estado: "MG",
    cep: "",
    localizacao: "Urbana",
    instalacaoUC: "",
    coordenada: "",
    lat: "",
    lng: "",
    distMenor30: "Sim",
    tipoRede: "Trifásica",
    transformador: "",
    pontoRef: "",
    nomePropriedade: "",
    distritoComunidade: "",
    instProxima: "",
  });
  const [gerador, setGerador] = useState({
    possui: "Não",
    potencia: "",
    fonte: "",
    descricao: "",
  });
  const [obs, setObs] = useState("");
  const [cepStatus, setCepStatus] = useState({ obra: "", corr: "" });
  const [cnpjStatus, setCnpjStatus] = useState("");

  // ---- Logo Cemig para o PDF (pré-carregada como data URL) ----
  const [logoPDF, setLogoPDF] = useState(null); // { url, w, h }
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const c = document.createElement("canvas");
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        c.getContext("2d").drawImage(img, 0, 0);
        setLogoPDF({
          url: c.toDataURL("image/png"),
          w: img.naturalWidth,
          h: img.naturalHeight,
        });
      } catch (e) {
        /* imagem em outra origem / canvas tainted — ignora */
      }
    };
    img.src = "imgs/logo-cemig-cor.png";
  }, []);

  // Pessoa física? (depende do documento digitado em CPF/CNPJ)
  const docInfo = useMemo(() => validarCpfCnpj(prop.cpfCnpj), [prop.cpfCnpj]);
  const pessoaFisica = docInfo.tipo !== "CNPJ"; // CPF ou vazio => trata como PF

  // ---- UCs detalhadas (individual) — uma calculadora por UC ----
  const [ucsDet, setUcsDet] = useState([ucDetalhadaPadrao()]);
  const setUcDet = (i, patch) =>
    setUcsDet((p) => p.map((u, idx) => (idx === i ? { ...u, ...patch } : u)));

  // ---- Blocos de UC (coletivo comum) ----
  const [ucBlocos, setUcBlocos] = useState([ucBlocoPadrao(0)]);
  const setBloco = (i, patch) =>
    setUcBlocos((p) => p.map((u, idx) => (idx === i ? { ...u, ...patch } : u)));
  // Previsão por UC (coletivo)
  const setBlocoPrev = (i, patch) =>
    setUcBlocos((p) =>
      p.map((u, idx) =>
        idx === i ? { ...u, prev: { ...(u.prev || {}), ...patch } } : u,
      ),
    );
  // Preenchimento em massa da previsão: replica a previsão da UC 1 para todas
  const replicarPrevTodas = () =>
    setUcBlocos((p) =>
      p.map((u, idx) =>
        idx === 0 ? u : { ...u, prev: { ...(p[0].prev || {}) } },
      ),
    );
  // Totais somados automaticamente a partir de cada UC
  const prevTotalKw = useMemo(
    () => ucBlocos.reduce((s, u) => s + prevKwUC(u), 0),
    [ucBlocos],
  );

  // ===== ND-5.2: demanda do agrupamento de apartamentos residenciais =====
  // D = 1,4 × F × A, com F (Tabela 12) pela quantidade de apartamentos e
  // A (Tabela 13) pela área média ponderada dos apartamentos residenciais.
  const residenciaisColetivo = useMemo(
    () => ucBlocos.filter((u) => u.atividade === "Residencial"),
    [ucBlocos],
  );
  const quantidadeApartamentos = residenciaisColetivo.length;
  const areaMediaPonderada = useMemo(() => {
    if (!quantidadeApartamentos) return 0;
    return (
      residenciaisColetivo.reduce((s, u) => s + num(u.area), 0) /
      quantidadeApartamentos
    );
  }, [residenciaisColetivo, quantidadeApartamentos]);
  const demandaApartamentosND52 = useMemo(
    () =>
      nd52CalcularDemandaApartamentos(areaMediaPonderada, quantidadeApartamentos),
    [areaMediaPonderada, quantidadeApartamentos],
  );

  // Existem UCs não residenciais no agrupamento? Para essas, a demanda geral
  // é informada manualmente pelo responsável técnico (não é somada por UC).
  const temUCNaoResidencial = useMemo(
    () => ucBlocos.some((u) => u.atividade && u.atividade !== "Residencial"),
    [ucBlocos],
  );

  // Demanda prevista total do agrupamento:
  // - Residencial: cálculo automático ND-5.2 (quando aplicável) ou, na falta
  //   dele (< 4 apartamentos ou área > 1000 m²), soma manual por UC.
  // - Não residencial: demanda geral única informada pelo responsável
  //   técnico (atend.demandaNaoResidencial), e não a soma das UCs.
  const demandaPrevTotal = useMemo(() => {
    const demandaResidencial = demandaApartamentosND52
      ? demandaApartamentosND52.demandaKVA
      : ucBlocos
          .filter((u) => u.atividade === "Residencial")
          .reduce((s, u) => s + num((u.prev || {}).demanda), 0);
    const demandaNaoResidencial = temUCNaoResidencial
      ? num(atend.demandaNaoResidencial)
      : 0;
    return demandaResidencial + demandaNaoResidencial;
  }, [
    ucBlocos,
    demandaApartamentosND52,
    temUCNaoResidencial,
    atend.demandaNaoResidencial,
  ]);
  // Alteração de carga no coletivo / com troca de disjuntor geral
  const isAlteracaoColetivo =
    coletivo && !multiTorres && /Alteração de Carga/.test(atend.escopo || "");
  const trocaDisjGeral =
    coletivo &&
    !multiTorres &&
    atend.escopo === "Alteração de Carga com alteração do disjuntor geral";
  // Atendimento híbrido (UCs atendidas por ND 5.1 ou ND 5.2)
  const hibrido =
    coletivo && !multiTorres && atend.solicitacao === SOLICITACOES[3];
  // Validação bloqueante do híbrido:
  // - ND 5.1: número predial obrigatório e DISTINTO entre as UCs 5.1
  // - ND 5.2: compartilham o mesmo predial e devem diferir pelo COMPLEMENTO
  const validacaoHibrido = useMemo(() => {
    if (!hibrido) return { ok: true, erros: [] };
    const erros = [];
    const u51 = ucBlocos.filter((u) => u.nd === "5.1");
    const u52 = ucBlocos.filter((u) => u.nd === "5.2");
    const pred51 = u51.map((u) => (u.nPredial || "").trim());
    if (pred51.some((p) => !p))
      erros.push("ND 5.1: informe o nº predial de todas as UCs 5.1.");
    const dup51 = pred51.filter(
      (p) => p && pred51.indexOf(p) !== pred51.lastIndexOf(p),
    );
    if (dup51.length)
      erros.push(
        "ND 5.1: os números prediais devem ser distintos entre as UCs 5.1.",
      );
    const comp52 = u52.map((u) => (u.complemento || "").trim());
    if (u52.length > 1 && comp52.some((c) => !c))
      erros.push(
        "ND 5.2: informe o complemento de todas as UCs 5.2 (elas compartilham o mesmo nº predial).",
      );
    const dup52 = comp52.filter(
      (c) => c && comp52.indexOf(c) !== comp52.lastIndexOf(c),
    );
    if (dup52.length)
      erros.push(
        "ND 5.2: os complementos devem ser distintos (mesmo predial, diferindo só pelo complemento).",
      );
    return { ok: erros.length === 0, erros };
  }, [hibrido, ucBlocos]);
  // Preenchimento em massa: replica a UC 1 para as demais (mantém identificação/complemento/instalação individuais)
  const replicarUC1Coletivo = () =>
    setUcBlocos((p) => {
      const base = p[0];
      if (!base) return p;
      return p.map((u, k) =>
        k === 0
          ? u
          : {
              ...base,
              identificacao: u.identificacao || `UC ${k + 1}`,
              nPredial: u.nPredial,
              complemento: u.complemento,
              caixa: u.caixa,
              instalacao: u.instalacao,
              unidadeConsumidora: u.unidadeConsumidora,
            },
      );
    });

  // ---- Torres/Blocos (múltiplas torres) ----
  const [blocos, setBlocos] = useState([blocoPadrao(0)]);
  const setTorre = (i, patch) =>
    setBlocos((p) => p.map((b, idx) => (idx === i ? { ...b, ...patch } : b)));
  const replicarPrimeiro = () =>
    setBlocos((p) =>
      p.map((b, i) =>
        i === 0
          ? b
          : {
              ...p[0],
              nome: `${i + 1}`,
              ucs: (p[0].ucs || []).map((u, k) => ({ ...u })),
            },
      ),
    );

  // Sincroniza a lista de UCs de uma torre conforme a quantidade informada
  const sincronizarUCsTorre = (i, qtd) => {
    const n = Math.max(1, parseInt(qtd) || 1);
    setBlocos((p) =>
      p.map((b, idx) => {
        if (idx !== i) return b;
        const arr = [...(b.ucs || [])];
        while (arr.length < n) arr.push(ucTorrePadrao(arr.length));
        while (arr.length > n) arr.pop();
        return { ...b, qtdUCs: qtd, ucs: arr };
      }),
    );
  };

  // Atualiza uma UC específica dentro de uma torre
  const setUcTorre = (bi, ui, patch) =>
    setBlocos((p) =>
      p.map((b, idx) =>
        idx === bi
          ? {
              ...b,
              ucs: (b.ucs || []).map((u, k) =>
                k === ui ? { ...u, ...patch } : u,
              ),
            }
          : b,
      ),
    );

  // Atualiza a previsão de carga de uma UC dentro de uma torre
  const setUcTorrePrev = (bi, ui, patch) =>
    setBlocos((p) =>
      p.map((b, idx) =>
        idx === bi
          ? {
              ...b,
              ucs: (b.ucs || []).map((u, k) =>
                k === ui ? { ...u, prev: { ...(u.prev || {}), ...patch } } : u,
              ),
            }
          : b,
      ),
    );
  // Replica a previsão da UC 1 de uma torre para as demais UCs da mesma torre
  const replicarPrevTorre = (bi) =>
    setBlocos((p) =>
      p.map((b, idx) => {
        if (idx !== bi) return b;
        const base = ((b.ucs || [])[0] || {}).prev || {};
        return {
          ...b,
          ucs: (b.ucs || []).map((u, k) =>
            k === 0 ? u : { ...u, prev: { ...base } },
          ),
        };
      }),
    );

  // Preenchimento em massa: replica a UC 1 de uma torre para as demais UCs da mesma torre
  const replicarUC1Torre = (bi) =>
    setBlocos((p) =>
      p.map((b, idx) => {
        if (idx !== bi) return b;
        const base = (b.ucs || [])[0];
        if (!base) return b;
        return {
          ...b,
          ucs: b.ucs.map((u, k) =>
            k === 0
              ? u
              : {
                  ...base,
                  identificacao: `UC ${k + 1}`,
                  instalacao: u.instalacao,
                  unidadeConsumidora: u.unidadeConsumidora,
                },
          ),
        };
      }),
    );

  // Sincroniza nº de UCs (individual: máx 3; coletivo: blocos de identificação)
  useEffect(() => {
    const n = Math.max(1, Number(atend.nUCs) || 1);
    if (coletivo) {
      setUcBlocos((prevB) => {
        if (prevB.length === n) return prevB;
        const arr = [...prevB];
        while (arr.length < n) arr.push(ucBlocoPadrao(arr.length));
        while (arr.length > n) arr.pop();
        return arr;
      });
    } else {
      const ni = Math.min(n, 3); // individual: até 3 caixas
      setUcsDet((prevD) => {
        if (prevD.length === ni) return prevD;
        const arr = [...prevD];
        while (arr.length < ni) arr.push(ucDetalhadaPadrao());
        while (arr.length > ni) arr.pop();
        return arr;
      });
    }
  }, [atend.nUCs, coletivo]);

  // Sincroniza nº de torres/blocos
  useEffect(() => {
    if (!multiTorres) return;
    const n = Math.max(1, Number(atend.nBlocos) || 1);
    setBlocos((prevB) => {
      if (prevB.length === n) return prevB;
      const arr = [...prevB];
      while (arr.length < n) arr.push(blocoPadrao(arr.length));
      while (arr.length > n) arr.pop();
      return arr;
    });
  }, [atend.nBlocos, multiTorres]);

  // Escopo coerente com a solicitação
  useEffect(() => {
    const ops = ESCOPOS[atend.solicitacao] || [];
    if (!ops.includes(atend.escopo))
      setAtend((a) => ({ ...a, escopo: ops[0] || "" }));
  }, [atend.solicitacao]);

  // Complemento da obra -> preenche o complemento das UCs que ainda estão vazias
  // (não sobrescreve um complemento já digitado em cada UC)
  const lastComplRef = useRef(null);
  useEffect(() => {
    const c = String(obra.compl || "").trim();
    if (!c || lastComplRef.current === c) return;
    lastComplRef.current = c;
    const fill = (u) =>
      String(u.complemento || "").trim() ? u : { ...u, complemento: c };
    setUcsDet((p) => p.map(fill));
    setUcBlocos((p) => p.map(fill));
    setBlocos((p) => p.map((b) => ({ ...b, ucs: (b.ucs || []).map(fill) })));
  }, [obra.compl]);

  const redeMono =
    obra.tipoRede === "Monofásica" || obra.tipoRede === "Bifásica";

  // ===== API DE CEP (ViaCEP) =====
  const buscarCEP = async (cep, alvo) => {
    const limpo = (cep || "").replace(/\D/g, "");
    if (limpo.length !== 8) {
      setCepStatus((p) => ({ ...p, [alvo]: "" }));
      return;
    }
    setCepStatus((p) => ({ ...p, [alvo]: "buscando" }));
    try {
      const r = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
      const dd = await r.json();
      if (dd.erro) {
        setCepStatus((p) => ({ ...p, [alvo]: "erro" }));
        return;
      }
      if (alvo === "obra")
        setObra((o) => ({
          ...o,
          endereco: dd.logradouro || o.endereco,
          bairro: dd.bairro || o.bairro,
          cidade: dd.localidade || o.cidade,
          estado: dd.uf || o.estado,
        }));
      else
        setCorr((c) => ({
          ...c,
          rua: dd.logradouro || c.rua,
          bairro: dd.bairro || c.bairro,
          municipio: dd.localidade || c.municipio,
          estado: dd.uf || c.estado,
        }));
      setCepStatus((p) => ({ ...p, [alvo]: "ok" }));
    } catch (e) {
      setCepStatus((p) => ({ ...p, [alvo]: "erro" }));
    }
  };

  // ===== API DE CNPJ (BrasilAPI) =====
  const buscarCNPJ = async (doc) => {
    const limpo = soDigitos(doc);
    if (limpo.length !== 14) {
      setCnpjStatus("");
      return;
    }
    setCnpjStatus("buscando");
    try {
      const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`);
      if (!r.ok) {
        setCnpjStatus("erro");
        return;
      }
      const dd = await r.json();
      // Razão social -> Nome; e-mail e telefone quando disponíveis
      setProp((p) => ({
        ...p,
        nome: dd.razao_social || dd.nome_fantasia || p.nome,
        email: dd.email || p.email,
        fixo:
          dd.ddd_telefone_1 && !p.fixo
            ? mascararTelefone(dd.ddd_telefone_1)
            : p.fixo,
      }));
      // Endereço da obra (caso ainda vazio) — preenche a partir do CNPJ
      setObra((o) => ({
        ...o,
        cep: dd.cep ? mascararCEP(dd.cep) : o.cep,
        endereco: dd.logradouro || o.endereco,
        num: dd.numero || o.num,
        compl: dd.complemento || o.compl,
        bairro: dd.bairro || o.bairro,
        cidade: dd.municipio || o.cidade,
        estado: dd.uf || o.estado,
      }));
      setCnpjStatus("ok");
    } catch (e) {
      setCnpjStatus("erro");
    }
  };

  // ===== Disjuntor geral obrigatório? =====
  const disjGeralObrigatorio =
    atend.biAcima63 || atend.triAcima63 || atend.disjGeral === "Sim";

  const maiorCorrenteUC = useMemo(() => {
    if (multiTorres) return 0;
    if (coletivo)
      return ucBlocos.reduce(
        (mx, u) =>
          Math.max(mx, correnteDisj(u.disjPara), correnteDisj(u.disjDe)),
        0,
      );
    return ucsDet.reduce((mx, u) => {
      const esc = u.disjEscolhido || (u.cargas?._disjuntores || [])[0] || "";
      return Math.max(mx, correnteDisj(esc));
    }, 0);
  }, [multiTorres, coletivo, ucBlocos, ucsDet]);

  const opcoesDisjGeral = useMemo(
    () => disjuntoresGeraisAcima(maiorCorrenteUC, demandaPrevTotal),
    [maiorCorrenteUC, demandaPrevTotal],
  );

  // Sugestão automática: pré-seleciona o menor disjuntor geral válido
  // (seletividade + capacidade de demanda). Se a escolha atual deixar de
  // ser válida (ex.: demanda aumentou), sugere novamente automaticamente.
  useEffect(() => {
    if (!coletivo || multiTorres) return;
    if (!opcoesDisjGeral.length) return;
    if (atend.disjuntorGeral && opcoesDisjGeral.includes(atend.disjuntorGeral))
      return;
    setAtend((a) => ({ ...a, disjuntorGeral: opcoesDisjGeral[0] }));
  }, [coletivo, multiTorres, opcoesDisjGeral]);

  // ===== Validação de disjuntores (individual com várias UCs) =====
  const validacaoDisjuntores = useMemo(() => {
    if (coletivo || ucsDet.length <= 1) return { ok: true, msg: "" };
    let tri = 0,
      monoBi = 0;
    ucsDet.forEach((u) => {
      const esc = u.disjEscolhido || (u.cargas?._disjuntores || [])[0] || "";
      if (/Tripolar/i.test(esc)) tri++;
      else if (/Mono|Bipolar/i.test(esc)) monoBi++;
    });
    const acima63 = ucsDet.some((u) => {
      const esc = u.disjEscolhido || (u.cargas?._disjuntores || [])[0] || "";
      return correnteDisj(esc) > 63;
    });
    if (acima63)
      return {
        ok: false,
        msg: "Há UC com disjuntor acima de 63 A — o atendimento exige proteção geral (coletivo). Ajuste o Tipo de Atendimento.",
      };
    if (tri > 1)
      return {
        ok: false,
        msg: `Permitido no máximo 1 disjuntor tripolar de 63 A (atual: ${tri}).`,
      };
    if (monoBi > 2)
      return {
        ok: false,
        msg: `Permitidos no máximo 2 disjuntores mono/bifásicos de 63 A (atual: ${monoBi}).`,
      };
    return {
      ok: true,
      msg: `Combinação válida: ${tri} tripolar(es) + ${monoBi} mono/bifásico(s) de 63 A.`,
    };
  }, [coletivo, ucsDet]);

  // ===== Totais =====
  const totalUcsEmpreendimento = useMemo(
    () => blocos.reduce((s, b) => s + (parseInt(b.qtdUCs) || 0), 0),
    [blocos],
  );
  const demandaTotalGeral = useMemo(() => {
    if (multiTorres)
      return blocos.reduce(
        (s, b) =>
          s +
          (b.ucs || []).reduce(
            (su, u) => su + num((u.prev || {}).demanda),
            0,
          ) +
          num(b.demandaIncendio),
        0,
      );
    if (coletivo) return demandaPrevTotal;
    return ucsDet.reduce((s, u) => s + (u.cargas?._demanda || 0), 0);
  }, [multiTorres, blocos, coletivo, demandaPrevTotal, ucsDet]);

  const coordObrigatoria =
    obra.localizacao === "Rural" && obra.distMenor30 === "Não";
  const coordPreenchida =
    !!String(obra.lat).trim() && !!String(obra.lng).trim();

  // Validação de campos obrigatórios para liberar o PDF (revisar/expandir depois)
  const validacaoObrigatorios = useMemo(() => {
    const faltando = [];
    const req = (v, label) => {
      if (!String(v == null ? "" : v).trim()) faltando.push(label);
    };
    // Proprietário
    req(
      prop.nome,
      pessoaFisica ? "Nome completo do proprietário" : "Razão social",
    );
    req(prop.cpfCnpj, "CPF/CNPJ");
    req(prop.email, "E-mail");
    req(prop.celular, "Celular");
    // Correspondência (quando não recebe no e-mail informado)
    if (corr.receberEmail === "Não") {
      if (corr.alternativa === "Outro e-mail")
        req(corr.outroEmail, "E-mail alternativo da fatura");
      else if (corr.alternativa === "Endereço novo") {
        req(corr.cep, "CEP de correspondência");
        req(corr.rua, "Rua/Av. de correspondência");
        req(corr.num, "Nº de correspondência");
        req(corr.bairro, "Bairro de correspondência");
        req(corr.municipio, "Município de correspondência");
      }
    }
    // Obra
    req(obra.endereco, "Endereço da obra");
    req(obra.num, "Nº da obra");
    req(obra.bairro, "Bairro da obra");
    req(obra.cidade, "Cidade da obra");
    req(obra.cep, "CEP da obra");
    if (coordObrigatoria && !coordPreenchida)
      faltando.push("Coordenada (latitude/longitude) da obra");
    // Carga declarada
    if (!(demandaTotalGeral > 0))
      faltando.push("Previsão de carga / demanda das UCs");
    if (temUCNaoResidencial)
      req(
        atend.demandaNaoResidencial,
        "Demanda geral não residencial (kVA)",
      );
    // Validações específicas já existentes
    if (hibrido && !validacaoHibrido.ok)
      faltando.push("Pendências do atendimento híbrido");
    if (validacaoDisjuntores && validacaoDisjuntores.ok === false)
      faltando.push("Combinação de disjuntores inválida");
    return { ok: faltando.length === 0, faltando };
  }, [
    prop,
    corr,
    obra,
    coordObrigatoria,
    coordPreenchida,
    demandaTotalGeral,
    pessoaFisica,
    hibrido,
    validacaoHibrido,
    validacaoDisjuntores,
    temUCNaoResidencial,
    atend.demandaNaoResidencial,
  ]);

  // ===== ABAS (barra vertical) — UCs vem ANTES de Cargas =====
  const abas = [
    { k: "orient", l: "Orientações" },
    { k: "tipo", l: "Tipo de Atendimento" },
    { k: "prop", l: "Proprietário" },
    { k: "corr", l: "Correspondência" },
    { k: "obra", l: "Dados da Obra" },
  ];
  if (multiTorres) {
    abas.push({ k: "blocos", l: "Torres / Blocos" });
  } else {
    abas.push({ k: "ucs", l: "Unidades Consumidoras" });
    abas.push({
      k: "cargas",
      l: coletivo ? "Previsão de Carga" : "Cargas das UCs",
    });
  }
  if (!coletivo) abas.push({ k: "gerador", l: "Gerador de Emergência" });
  abas.push(
    { k: "obs", l: "Observações" },
    { k: "revisar", l: "Prévia & PDF" },
  );

  const idx = abas.findIndex((a) => a.k === aba);
  const irProx = () => setAba(abas[Math.min(idx + 1, abas.length - 1)].k);
  const irAnt = () => setAba(abas[Math.max(idx - 1, 0)].k);

  // Se a aba ativa deixou de existir (mudança de modo), volta para "tipo"
  useEffect(() => {
    if (idx === -1) setAba("tipo");
  }, [idx]);

  // ============================================================
  // GERAR PDF
  // ============================================================
  // Geração do PDF delegada a js/pdf.js (gerarPdfDoc)
  const gerarPDF = () => {
    if (!validacaoObrigatorios.ok) {
      setAba("revisar");
      return;
    }
    gerarPdfDoc({
      multiTorres,
      coletivo,
      atend,
      prop,
      corr,
      obra,
      prevTotalKw,
      demandaPrevTotal,
      trocaDisjGeral,
      hibrido,
      ucsDet,
      ucBlocos,
      blocos,
      totalUcsEmpreendimento,
      gerador,
      obs,
      demandaTotalGeral,
      logoPDF,
      pessoaFisica,
    });
  };

  // Seleciona uma modalidade da tela inicial e pré-configura o fluxo BT
  const selectModalidade = (card) => {
    if (card.status === "link" && card.href) {
      window.location.href = card.href; // formulário em subpasta
      return;
    }
    if (card.status === "soon") {
      setModalidade(card.id); // tela "em breve"
      return;
    }
    if (card.prefill) {
      if (card.prefill.atend)
        setAtend((s) => ({ ...s, ...card.prefill.atend }));
      if (card.prefill.obra) setObra((s) => ({ ...s, ...card.prefill.obra }));
      if (card.prefill.atividade) {
        const a = card.prefill.atividade;
        const tipoA = a === "Comercial" || a === "Industrial" ? "nr" : "res";
        setUcsDet((p) =>
          p.map((u) => ({
            ...u,
            atividade: a,
            cargas: {
              ...(u.cargas || {}),
              tipoA: (u.cargas || {}).tipoA || tipoA,
            },
          })),
        );
        setUcBlocos((p) => p.map((u) => ({ ...u, atividade: a })));
        setBlocos((p) =>
          p.map((b) => ({
            ...b,
            ucs: (b.ucs || []).map((u) => ({ ...u, atividade: a })),
          })),
        );
      }
      if (card.prefill.cargas) {
        setUcsDet((p) =>
          p.map((u, i) =>
            i === 0 ? { ...u, cargas: { ...card.prefill.cargas } } : u,
          ),
        );
      }
    }
    setCardSelecionado(card);
    setAba("orient");
    setModalidade("BT"); // todos os cards habilitados entram no fluxo BT
  };

  // Lista plana de cards (para detectar "em breve" e voltar)
  const todasModalidades = MODALIDADES_SECOES.flatMap((s) => s.cards);
  const modSoon = todasModalidades.find(
    (c) => c.id === modalidade && c.status === "soon",
  );

  // ============================================================
  // RENDER
  // ============================================================
  // Contexto único repassado às abas (em js/views.js)
  const ctx = {
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
    areaMediaPonderada,
    coletivo,
    coordObrigatoria,
    coordPreenchida,
    demandaApartamentosND52,
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
    quantidadeApartamentos,
    redeMono,
    replicarPrevTodas,
    replicarPrevTorre,
    replicarPrimeiro,
    replicarUC1Coletivo,
    replicarUC1Torre,
    restrito,
    setBloco,
    setBlocoPrev,
    setTorre,
    setUcDet,
    setUcTorre,
    setUcTorrePrev,
    sincronizarUCsTorre,
    totalUcsEmpreendimento,
    trocaDisjGeral,
    temUCNaoResidencial,
    validacaoDisjuntores,
    validacaoHibrido,
    validacaoObrigatorios,
  };

  return (
    <div>
      <div className="topbar">
        <div className="topbar-inner">
          <a className="logo-cemig" href="#">
            <LogoCemig />
          </a>
          <div className="topbar-links">
            <a
              href="https://atende.cemig.com.br/Login"
              target="_blank"
              rel="noreferrer"
            >
              CEMIG ATENDE
            </a>
            <a
              href="https://partapr.cemig.com.br/PARTAPR/SelecaoModulo.aspx"
              target="_blank"
              rel="noreferrer"
            >
              APR Web
            </a>
          </div>
        </div>
      </div>

      {!modalidade ? (
        <div className="modalidade-screen">
          <div className="modalidade-head">
            <h1>Selecione a modalidade de atendimento</h1>
            <p>
              Escolha a modalidade para iniciar o preenchimento. Alguns campos
              do formulário já vêm pré-configurados conforme a opção.
            </p>
          </div>
          {MODALIDADES_SECOES.map((sec) => (
            <div className="modalidade-secao" key={sec.titulo}>
              <h2 className="modalidade-secao-titulo">{sec.titulo}</h2>
              <div className="modalidade-grid">
                {sec.cards.map((card) => (
                  <button
                    key={card.id}
                    className={
                      "modalidade-card" + (card.status === "soon" ? " soon" : "")
                    }
                    disabled={card.status === "soon"}
                    onClick={() => selectModalidade(card)}
                  >
                    <span
                      className={
                        "modalidade-tag" +
                        (card.status === "soon" ? "" : " avail")
                      }
                    >
                      {card.status === "soon" ? "Em breve" : "Disponível"}
                    </span>
                    <span className="modalidade-img">
                      <img
                        src={card.img}
                        alt={card.nome}
                        loading="lazy"
                        onError={(e) => {
                          e.target.style.display = "none";
                          e.target.parentNode.classList.add("ph");
                        }}
                      />
                    </span>
                    <span className="modalidade-card-body">
                      <strong>{card.nome}</strong>
                      <span className="modalidade-sub">{card.sub}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : modSoon ? (
        <div className="modalidade-soon">
          <h1>{modSoon.nome}</h1>
          <p>
            Esta modalidade ({modSoon.sub}) ainda está em desenvolvimento e será
            disponibilizada em breve.
          </p>
          <Btn variant="primary" onClick={() => setModalidade(null)}>
            ← Voltar à seleção
          </Btn>
        </div>
      ) : (
        <React.Fragment>
          <div className="form-header">
            <h1>
              Formulário de Orçamento de Conexão / Alteração de Carga em Baixa
              Tensão
            </h1>
            <p>
              Preenchimento digital unificado para solicitações em BT, conforme
              as normas CEMIG ND-5.1 / ND-5.2 e a REN ANEEL nº 1.000/2021.
            </p>
            <span className="flow-badge">
              {multiTorres
                ? "Múltiplas Torres / Blocos"
                : coletivo
                  ? "Coletivo — Proteção Geral"
                  : "Individual / até 3 caixas"}{" "}
              · Demanda {fmt2(demandaTotalGeral)} kVA
            </span>
          </div>

          <div className="layout">
            <aside className="sidebar">
              <div className="sidebar-title">Progresso do preenchimento</div>
              {abas.map((a, i) => (
                <button
                  key={a.k}
                  className={
                    "vstep" + (a.k === aba ? " active" : i < idx ? " done" : "")
                  }
                  onClick={() => setAba(a.k)}
                >
                  <span className="vstep-num">{i === 0 ? "i" : i}</span>
                  <span className="vstep-label">{a.l}</span>
                </button>
              ))}
            </aside>

            <main className="main-col fade-in" key={aba}>
              {/* ===== ORIENTAÇÕES ===== */}
              {aba === "orient" && <TabOrient ctx={ctx} />}

              {/* ===== TIPO DE ATENDIMENTO ===== */}
              {aba === "tipo" && <TabTipo ctx={ctx} />}

              {/* ===== PROPRIETÁRIO ===== */}
              {aba === "prop" && <TabProprietario ctx={ctx} />}

              {/* ===== CORRESPONDÊNCIA ===== */}
              {aba === "corr" && <TabCorrespondencia ctx={ctx} />}

              {/* ===== OBRA ===== */}
              {aba === "obra" && <TabObra ctx={ctx} />}

              {/* ===== TORRES / BLOCOS (múltiplas torres, preenchimento em massa) ===== */}
              {aba === "blocos" && multiTorres && <TabBlocos ctx={ctx} />}

              {/* ===== UNIDADES CONSUMIDORAS — COLETIVO (identificação) ===== */}
              {aba === "ucs" && coletivo && !multiTorres && (
                <TabUcsColetivo ctx={ctx} />
              )}

              {/* ===== UNIDADES CONSUMIDORAS — INDIVIDUAL (identificação de cada UC) ===== */}
              {aba === "ucs" && !coletivo && <TabUcsIndividual ctx={ctx} />}

              {/* ===== CARGAS — COLETIVO: previsão de carga POR UC ===== */}
              {aba === "cargas" && coletivo && !multiTorres && (
                <TabCargasColetivo ctx={ctx} />
              )}

              {/* ===== CARGAS — INDIVIDUAL: calculadora POR UC ===== */}
              {aba === "cargas" && !coletivo && (
                <TabCargasIndividual ctx={ctx} />
              )}

              {/* ===== GERADOR (individual) ===== */}
              {aba === "gerador" && !coletivo && <TabGerador ctx={ctx} />}

              {/* ===== OBSERVAÇÕES ===== */}
              {aba === "obs" && <TabObs ctx={ctx} />}

              {/* ===== PRÉVIA & PDF ===== */}
              {aba === "revisar" && <TabRevisar ctx={ctx} />}

              {/* ===== NAVEGAÇÃO ===== */}
              <div className="nav-bottom">
                <Btn variant="ghost" onClick={irAnt} disabled={idx <= 0}>
                  ← Voltar
                </Btn>
                <span className="nav-step-info">
                  Etapa {Math.max(idx, 0) + 1} de {abas.length}
                </span>
                {aba === "revisar" ? (
                  <Btn
                    variant="primary"
                    onClick={gerarPDF}
                    disabled={hibrido && !validacaoHibrido.ok}
                  >
                    📄 Exportar PDF
                  </Btn>
                ) : (
                  <Btn variant="primary" onClick={irProx}>
                    Avançar →
                  </Btn>
                )}
              </div>
            </main>
          </div>

          <div className="footer">
            Documento gerado eletronicamente · não substitui o formulário
            oficial CEMIG ·
            <a
              href="https://www.cemig.com.br/como-solicitar-os-principais-servicos/ligacao-nova-e-aumento-de-carga/ligacao-nova-ou-alteracao-de-carga-para-demandas-especificas/"
              target="_blank"
              rel="noreferrer"
            >
              {" "}
              Saiba mais no portal Cemig
            </a>
          </div>
        </React.Fragment>
      )}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
