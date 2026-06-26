function App() {
  const [aba, setAba] = useState("orient");
  const [modalidade, setModalidade] = useState(null);
  const [cardSelecionado, setCardSelecionado] = useState(null);
  const restrito = !!cardSelecionado?.restrito;
  const zonaTravada = !!cardSelecionado?.travaZonaRural;
  const [atend, setAtend] = useState(atendPadrao());
  const coletivo = atend.disjGeral === "Sim";
  const multiTorres = coletivo && atend.solicitacao === SOLICITACOES[4];
  // Categoria fixa a atividade principal (Residencial > 100 m², Comercial,
  // Industrial, Rural). No coletivo cada UC mantém atividade própria.
  const atividadeTravada = !coletivo && !!cardSelecionado?.prefill?.atividade;
  // Opções de "Solicitação" disponíveis: no coletivo libera-se o Híbrido;
  // nas categorias individuais restringe-se aos disjuntores individuais.
  const solicitacoesPermitidas =
    coletivo && !multiTorres
      ? SOLICITACOES_COLETIVAS
      : cardSelecionado?.solicitacoesPermitidas || null;
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
    alternativa: "Endereço novo",
    // quando não recebe no e-mail informado
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
    restricaoAmbiental: "",
    // autopreenchido após a consulta (Sim/Não)
    restricoesTexto: "",
    // descrição das restrições encontradas
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
    utm: "", // coordenada UTM (zona/fuso calculados automaticamente)
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
  const [logoPDF, setLogoPDF] = useState(null);
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
      } catch (e) {}
    };
    img.src = "imgs/logos/logo-cemig-cor.png";
  }, []);
  const docInfo = useMemo(() => validarCpfCnpj(prop.cpfCnpj), [prop.cpfCnpj]);
  const pessoaFisica = docInfo.tipo !== "CNPJ";
  const [ucsDet, setUcsDet] = useState([ucDetalhadaPadrao()]);
  const [cargasPadrao, setCargasPadrao] = useState(null);
  const setUcDet = (i, patch) =>
    setUcsDet((p) => p.map((u, idx2) => (idx2 === i ? { ...u, ...patch } : u)));

  /* ===== Análise de Partida de Motores (varredura em ucsDet[].cargas.mots) =====
     Motor Pesado: (fase tri e cv>50) OU (fase mono e cv>15). */
  const [mostrarAnaliseMotores, setMostrarAnaliseMotores] = useState(false);
  const motorPesadoBT = (m) => {
    const cv = parseFloat(m?.cv) || 0;
    if (!cv) return false;
    return m.fase === "mono" ? cv > 15 : cv > 50;
  };
  const motoresPesadosBT = useMemo(() => {
    const lista = [];
    ucsDet.forEach((u, ui) => {
      (u.cargas?.mots || []).forEach((m, mi) => {
        if (motorPesadoBT(m))
          lista.push({ ucIndex: ui, motorIndex: mi, motor: m });
      });
    });
    return lista;
  }, [ucsDet]);
  const setMotorAnalisePartida = (ucIndex, motorIndex, patch) =>
    setUcsDet((p) =>
      p.map((u, ui) => {
        if (ui !== ucIndex) return u;
        const mots = (u.cargas?.mots || []).map((m, mi) =>
          mi === motorIndex
            ? {
                ...m,
                analisePartida: { ...(m.analisePartida || {}), ...patch },
              }
            : m,
        );
        return { ...u, cargas: { ...u.cargas, mots } };
      }),
    );
  const [ucBlocos, setUcBlocos] = useState([ucBlocoPadrao(0)]);
  const setBloco = (i, patch) =>
    setUcBlocos((p) =>
      p.map((u, idx2) => (idx2 === i ? { ...u, ...patch } : u)),
    );
  const setBlocoPrev = (i, patch) =>
    setUcBlocos((p) =>
      p.map((u, idx2) =>
        idx2 === i ? { ...u, prev: { ...(u.prev || {}), ...patch } } : u,
      ),
    );
  const replicarPrevTodas = () =>
    setUcBlocos((p) =>
      p.map((u, idx2) =>
        idx2 === 0 ? u : { ...u, prev: { ...(p[0].prev || {}) } },
      ),
    );
  const prevTotalKw = useMemo(
    () =>
      ucBlocos.reduce((s, u) => s + (ucSemAlteracao(u) ? 0 : prevKwUC(u)), 0),
    [ucBlocos],
  );
  const residenciaisColetivo = useMemo(
    () =>
      ucBlocos.filter(
        (u) => u.atividade === "Residencial" && !ucSemAlteracao(u),
      ),
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
      nd52CalcularDemandaApartamentos(
        areaMediaPonderada,
        quantidadeApartamentos,
      ),
    [areaMediaPonderada, quantidadeApartamentos],
  );
  const temUCNaoResidencial = useMemo(
    () =>
      ucBlocos.some(
        (u) =>
          u.atividade && u.atividade !== "Residencial" && !ucSemAlteracao(u),
      ),
    [ucBlocos],
  );
  const demandaResidencialManualInvalida =
    !!demandaApartamentosND52 &&
    String(atend.demandaResidencialManual).trim() !== "" &&
    num(atend.demandaResidencialManual) < demandaApartamentosND52.demandaKVA;
  const demandaPrevTotal = useMemo(() => {
    let demandaResidencial;
    if (demandaApartamentosND52) {
      const manual = num(atend.demandaResidencialManual);
      const manualValida =
        String(atend.demandaResidencialManual).trim() !== "" &&
        manual >= demandaApartamentosND52.demandaKVA;
      demandaResidencial = manualValida
        ? manual
        : demandaApartamentosND52.demandaKVA;
    } else {
      demandaResidencial = ucBlocos
        .filter((u) => u.atividade === "Residencial" && !ucSemAlteracao(u))
        .reduce((s, u) => s + num((u.prev || {}).demanda), 0);
    }
    const demandaNaoResidencial = temUCNaoResidencial
      ? num(atend.demandaNaoResidencial)
      : 0;
    return demandaResidencial + demandaNaoResidencial;
  }, [
    ucBlocos,
    demandaApartamentosND52,
    temUCNaoResidencial,
    atend.demandaNaoResidencial,
    atend.demandaResidencialManual,
  ]);
  const isAlteracaoColetivo =
    coletivo && !multiTorres && /Alteração de Carga/.test(atend.escopo || "");
  const trocaDisjGeral =
    coletivo &&
    !multiTorres &&
    atend.escopo === "Alteração de Carga com alteração do disjuntor geral";
  const hibrido =
    coletivo && !multiTorres && atend.solicitacao === SOLICITACOES[3];
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
  const [blocos, setBlocos] = useState([blocoPadrao(0)]);
  const setTorre = (i, patch) =>
    setBlocos((p) => p.map((b, idx2) => (idx2 === i ? { ...b, ...patch } : b)));
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
  const sincronizarUCsTorre = (i, qtd) => {
    const n = Math.max(1, parseInt(qtd) || 1);
    setBlocos((p) =>
      p.map((b, idx2) => {
        if (idx2 !== i) return b;
        const arr = [...(b.ucs || [])];
        while (arr.length < n) arr.push(ucTorrePadrao(arr.length));
        while (arr.length > n) arr.pop();
        return { ...b, qtdUCs: qtd, ucs: arr };
      }),
    );
  };
  const setUcTorre = (bi, ui, patch) =>
    setBlocos((p) =>
      p.map((b, idx2) =>
        idx2 === bi
          ? {
              ...b,
              ucs: (b.ucs || []).map((u, k) =>
                k === ui ? { ...u, ...patch } : u,
              ),
            }
          : b,
      ),
    );
  const setUcTorrePrev = (bi, ui, patch) =>
    setBlocos((p) =>
      p.map((b, idx2) =>
        idx2 === bi
          ? {
              ...b,
              ucs: (b.ucs || []).map((u, k) =>
                k === ui ? { ...u, prev: { ...(u.prev || {}), ...patch } } : u,
              ),
            }
          : b,
      ),
    );
  const replicarPrevTorre = (bi) =>
    setBlocos((p) =>
      p.map((b, idx2) => {
        if (idx2 !== bi) return b;
        const base = ((b.ucs || [])[0] || {}).prev || {};
        return {
          ...b,
          ucs: (b.ucs || []).map((u, k) =>
            k === 0 ? u : { ...u, prev: { ...base } },
          ),
        };
      }),
    );
  const replicarUC1Torre = (bi) =>
    setBlocos((p) =>
      p.map((b, idx2) => {
        if (idx2 !== bi) return b;
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
      const ni = Math.min(n, 3);
      setUcsDet((prevD) => {
        if (prevD.length === ni) return prevD;
        const arr = [...prevD];
        while (arr.length < ni) {
          const nova = ucDetalhadaPadrao();
          if (cargasPadrao) nova.cargas = { ...cargasPadrao };
          arr.push(nova);
        }
        while (arr.length > ni) arr.pop();
        return arr;
      });
    }
  }, [atend.nUCs, coletivo]);
  useEffect(() => {
    if (!coletivo) return;
    setUcBlocos((prevB) => {
      let mudou = false;
      const next = prevB.map((u) => {
        if (u.atividade !== "Residencial") return u;
        const preset = PRESET_PREV_RESIDENCIAL_COLETIVO[u.disjPara];
        if (!preset) return u;
        const atual = u.prev || {};
        const jaAplicado = Object.keys(preset).every(
          (k) => String(atual[k] ?? "") === String(preset[k]),
        );
        if (jaAplicado) return u;
        mudou = true;
        return { ...u, prev: { ...atual, ...preset } };
      });
      return mudou ? next : prevB;
    });
  }, [coletivo, ucBlocos]);
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
  useEffect(() => {
    const ops = ESCOPOS[atend.solicitacao] || [];
    if (!ops.includes(atend.escopo))
      setAtend((a) => ({ ...a, escopo: ops[0] || "" }));
  }, [atend.solicitacao]);
  // Mantém a Solicitação dentro das opções liberadas pela categoria/família
  // de atendimento (ex.: ao alternar disjuntor geral Não→Sim).
  useEffect(() => {
    if (!solicitacoesPermitidas) return;
    if (!solicitacoesPermitidas.includes(atend.solicitacao))
      setAtend((a) => ({ ...a, solicitacao: solicitacoesPermitidas[0] }));
  }, [solicitacoesPermitidas, atend.solicitacao]);
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
  const rural = obra.localizacao === "Rural";
  useEffect(() => {
    if (rural && Number(atend.nUCs) !== 1)
      setAtend((a) => ({ ...a, nUCs: 1, disjGeral: "Não" }));
  }, [rural]);
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
      setProp((p) => ({
        ...p,
        nome: dd.razao_social || dd.nome_fantasia || p.nome,
        email: dd.email || p.email,
        fixo:
          dd.ddd_telefone_1 && !p.fixo
            ? mascararTelefone(dd.ddd_telefone_1)
            : p.fixo,
      }));
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
  useEffect(() => {
    if (!coletivo || multiTorres) return;
    if (!opcoesDisjGeral.length) return;
    if (atend.disjuntorGeral && opcoesDisjGeral.includes(atend.disjuntorGeral))
      return;
    setAtend((a) => ({ ...a, disjuntorGeral: opcoesDisjGeral[0] }));
  }, [coletivo, multiTorres, opcoesDisjGeral]);
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
    if (monoBi > 3)
      return {
        ok: false,
        msg: `Permitidos no máximo 3 disjuntores mono/bifásicos de 63 A (atual: ${monoBi}).`,
      };
    return {
      ok: true,
      msg: `Combinação válida: ${tri} tripolar(es) + ${monoBi} mono/bifásico(s) de 63 A.`,
    };
  }, [coletivo, ucsDet]);
  const totalUcsEmpreendimento = useMemo(
    () => blocos.reduce((s, b) => s + (parseInt(b.qtdUCs) || 0), 0),
    [blocos],
  );
  const demandaTotalGeral = useMemo(() => {
    if (multiTorres)
      return blocos.reduce(
        (s, b) =>
          s + calcBlocoMultiTorres(b).demandaUcs + num(b.demandaIncendio),
        0,
      );
    if (coletivo) return demandaPrevTotal;
    return ucsDet.reduce(
      (s, u) => s + (ucSemAlteracao(u) ? 0 : u.cargas?._demanda || 0),
      0,
    );
  }, [multiTorres, blocos, coletivo, demandaPrevTotal, ucsDet]);

  /* ===== Termo de Opção pelo Atendimento em Baixa Tensão (Grupo B) =====
     Disparado para atendimento individual (não coletivo) quando a
     demanda calculada OU a soma das potências de placa de motores e
     cargas instaladas ultrapassa 75 kW/kVA (ND-5.1, Cap. 2, Item 12). */
  const potenciaPlacaTotal = useMemo(() => {
    if (coletivo) return 0;
    return ucsDet.reduce((s, u) => {
      if (ucSemAlteracao(u)) return s;
      const cargaKw = u.cargas?._cargaKw || 0;
      const motoresKw = (u.cargas?.mots || []).reduce(
        (sm, m) => sm + (parseFloat(m.cv) || 0) * 0.7355 * (parseInt(m.q) || 0),
        0,
      );
      return s + cargaKw + motoresKw;
    }, 0);
  }, [coletivo, ucsDet]);
  const exibeTermoGrupoB =
    !coletivo && (demandaTotalGeral > 75 || potenciaPlacaTotal > 75);

  const coordObrigatoria =
    obra.localizacao === "Rural" && obra.distMenor30 === "Não";
  const coordPreenchida =
    !!String(obra.lat).trim() && !!String(obra.lng).trim();
  const validacaoObrigatorios = useMemo(() => {
    const faltando = [];
    const req = (v, label) => {
      if (!String(v == null ? "" : v).trim()) faltando.push(label);
    };
    req(
      prop.nome,
      pessoaFisica ? "Nome completo do proprietário" : "Razão social",
    );
    req(prop.cpfCnpj, "CPF/CNPJ");
    req(prop.email, "E-mail");
    req(prop.celular, "Celular");
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
    req(obra.endereco, "Endereço da obra");
    req(obra.num, "Nº da obra");
    req(obra.bairro, "Bairro da obra");
    req(obra.cidade, "Cidade da obra");
    req(obra.cep, "CEP da obra");
    if (coordObrigatoria && !coordPreenchida)
      faltando.push("Coordenada (latitude/longitude) da obra");
    if (!(demandaTotalGeral > 0))
      faltando.push("Previsão de carga / demanda das UCs");
    if (coletivo && temUCNaoResidencial)
      req(atend.demandaNaoResidencial, "Demanda geral não residencial (kVA)");
    if (multiTorres)
      blocos.forEach((b, bi) => {
        if (
          calcBlocoMultiTorres(b).temNaoResidencial &&
          !String(b.demandaNaoResidencial || "").trim()
        )
          faltando.push(
            `Demanda geral não residencial — ${atend.atendA} ${b.nome || bi + 1} (kVA)`,
          );
      });
    if (demandaResidencialManualInvalida)
      faltando.push(
        "Demanda residencial manual não pode ser menor que a calculada (ND-5.2)",
      );
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
    coletivo,
    temUCNaoResidencial,
    atend.demandaNaoResidencial,
    demandaResidencialManualInvalida,
    multiTorres,
    blocos,
    atend.atendA,
  ]);
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
  useEffect(() => {
    if (idx === -1) setAba("tipo");
  }, [idx]);
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
  const gerarListaDocs = () =>
    gerarListaDocumentosDoc({ prop, obra, atend, coletivo, multiTorres });
  const selectModalidade = (card) => {
    if (card.status === "link" && card.href) {
      window.location.href = card.href;
      return;
    }
    if (card.status === "soon") {
      setModalidade(card.id);
      return;
    }
    // Troca de categoria reinicia TODOS os campos dependentes (atividade, tipo
    // de carga, cargas, UCs, solicitação/escopo) para que valores de uma
    // categoria anterior não persistam na próxima (Regras 8/9/10). O endereço,
    // o proprietário e a correspondência são preservados (independem da
    // categoria). A partir do estado limpo aplicamos o prefill do card.
    const a = card.prefill?.atividade || "";
    // Tipo de carga (Load Type) derivado da categoria: Comercial/Industrial =
    // Não-Residencial; Residencial = Residencial; Rural fica em aberto.
    const tipoA =
      a === "Comercial" || a === "Industrial"
        ? "nr"
        : a === "Residencial"
          ? "res"
          : "";
    const cargasBase = card.prefill?.cargas || null;

    setAtend({ ...atendPadrao(), ...(card.prefill?.atend || {}) });
    if (card.prefill?.obra) setObra((s) => ({ ...s, ...card.prefill.obra }));

    const novaUcDet = ucDetalhadaPadrao();
    if (a) novaUcDet.atividade = a;
    novaUcDet.cargas = cargasBase
      ? { ...cargasBase }
      : { ...novaUcDet.cargas, tipoA };
    setUcsDet([novaUcDet]);
    setCargasPadrao(cargasBase);

    const novoBloco = ucBlocoPadrao(0);
    if (a) novoBloco.atividade = a;
    setUcBlocos([novoBloco]);

    const novaTorre = blocoPadrao(0);
    if (a)
      novaTorre.ucs = (novaTorre.ucs || []).map((u) => ({
        ...u,
        atividade: a,
      }));
    setBlocos([novaTorre]);

    setCardSelecionado(card);
    setAba("orient");
    setModalidade("BT");
  };
  const todasModalidades = MODALIDADES_SECOES.flatMap((s) => s.cards);
  const modSoon = todasModalidades.find(
    (c) => c.id === modalidade && c.status === "soon",
  );
  const ctx = {
    aba,
    setAba,
    modalidade,
    setModalidade,
    mostrarAnaliseMotores,
    setMostrarAnaliseMotores,
    motoresPesadosBT,
    setMotorAnalisePartida,
    exibeTermoGrupoB,
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
    demandaResidencialManualInvalida,
    demandaTotalGeral,
    disjGeralObrigatorio,
    docInfo,
    gerarPDF,
    gerarListaDocs,
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
    rural,
    replicarPrevTodas,
    replicarPrevTorre,
    replicarPrimeiro,
    replicarUC1Coletivo,
    replicarUC1Torre,
    restrito,
    zonaTravada,
    atividadeTravada,
    solicitacoesPermitidas,
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
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: modalidade ? "" : "cemig-portal" },
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "topbar" },
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "topbar-inner cmg-container" },
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "topbar-left" },
          !modalidade && /* @__PURE__ */ React.createElement(LogoCemig),
          modalidade &&
            /* @__PURE__ */ React.createElement(
              "button",
              {
                className: "topbar-home",
                onClick: () => setModalidade(null),
              },
              "← Início",
            ),
          /* @__PURE__ */ React.createElement(
            "span",
            { className: "app-title" },
            modalidade
              ? "Assistente de formulário"
              : "Formulário de Ligação Nova e Alteração de Carga",
          ),
        ),
      ),
    ),
    !modalidade
      ? /* @__PURE__ */ React.createElement(
          React.Fragment,
          null,
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "modalidade-screen cmg-container cmg-container--gutter" },
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "modalidade-head" },
              /* @__PURE__ */ React.createElement(
                "h1",
                null,
                "Selecione uma modalidade",
              ),
              /* @__PURE__ */ React.createElement(
                "p",
                null,
                "Para iniciar o processo de preenchimento do formulário, identifique e selecione a modalidade correspondente ao seu perfil de consumo. Dependendo da modalidade escolhida, alguns campos do formulário poderão aparecer pré-preenchidos.",
              ),
              /* @__PURE__ */ React.createElement(
                "div",
                { className: "modalidade-aviso" },
                /* @__PURE__ */ React.createElement("span", {
                  className: "modalidade-aviso-icon",
                  "aria-hidden": "true",
                }),
                /* @__PURE__ */ React.createElement(
                  "p",
                  null,
                  "Antes de dar início ao preenchimento, certifique-se de ter em mãos a lista dos equipamentos e a documentação do imóvel.",
                ),
              ),
            ),
            MODALIDADES_SECOES.map((sec) =>
              /* @__PURE__ */ React.createElement(SecaoModalidade, {
                key: sec.titulo,
                sec,
                onSelect: selectModalidade,
              }),
            ),
          ),
          /* @__PURE__ */ React.createElement(
            "footer",
            { className: "portal-footer" },
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "portal-footer-inner cmg-container cmg-container--gutter" },
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
        )
      : modSoon
        ? /* @__PURE__ */ React.createElement(
            "div",
            { className: "modalidade-soon" },
            /* @__PURE__ */ React.createElement("h1", null, modSoon.nome),
            /* @__PURE__ */ React.createElement(
              "p",
              null,
              "Esta modalidade (",
              modSoon.sub,
              ") ainda está em desenvolvimento e será disponibilizada em breve.",
            ),
            /* @__PURE__ */ React.createElement(
              Btn,
              { variant: "primary", onClick: () => setModalidade(null) },
              "← Voltar à seleção",
            ),
          )
        : /* @__PURE__ */ React.createElement(
            React.Fragment,
            null,
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "form-header" },
              /* @__PURE__ */ React.createElement(
                "h1",
                null,
                "Formulário de Orçamento de Conexão / Alteração de Carga em Baixa Tensão",
              ),
              /* @__PURE__ */ React.createElement(
                "p",
                null,
                "Preenchimento digital unificado para solicitações em BT, conforme as normas CEMIG ND-5.1 / ND-5.2 e a REN ANEEL nº 1.000/2021.",
              ),
              /* @__PURE__ */ React.createElement(
                "span",
                { className: "flow-badge" },
                multiTorres
                  ? "Múltiplas Torres / Blocos"
                  : coletivo
                    ? "Coletivo — Proteção Geral"
                    : "Individual / até 3 caixas",
                " ",
                "· Demanda ",
                fmt2(demandaTotalGeral),
                " kVA",
              ),
            ),
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "layout" },
              /* @__PURE__ */ React.createElement(
                "aside",
                { className: "sidebar" },
                /* @__PURE__ */ React.createElement(
                  "div",
                  { className: "sidebar-title" },
                  "Progresso do preenchimento",
                ),
                abas.map((a, i) =>
                  /* @__PURE__ */ React.createElement(
                    "button",
                    {
                      key: a.k,
                      className:
                        "vstep" +
                        (a.k === aba ? " active" : i < idx ? " done" : ""),
                      onClick: () => setAba(a.k),
                    },
                    /* @__PURE__ */ React.createElement(
                      "span",
                      { className: "vstep-num" },
                      i === 0 ? "i" : i,
                    ),
                    /* @__PURE__ */ React.createElement(
                      "span",
                      { className: "vstep-label" },
                      a.l,
                    ),
                  ),
                ),
              ),
              /* @__PURE__ */ React.createElement(
                "main",
                { className: "main-col fade-in", key: aba },
                mostrarAnaliseMotores
                  ? /* @__PURE__ */ React.createElement(
                      React.Fragment,
                      null,
                      /* @__PURE__ */ React.createElement(TabAnaliseMotoresBT, {
                        ctx,
                      }),
                      /* @__PURE__ */ React.createElement(
                        "div",
                        { className: "nav-bottom" },
                        /* @__PURE__ */ React.createElement(
                          Btn,
                          {
                            variant: "ghost",
                            onClick: () => setMostrarAnaliseMotores(false),
                          },
                          "← Voltar à prévia",
                        ),
                        /* @__PURE__ */ React.createElement(
                          "span",
                          { className: "nav-step-info" },
                          "Análise de Partida de Motores",
                        ),
                        /* @__PURE__ */ React.createElement(
                          Btn,
                          {
                            variant: "primary",
                            onClick: () => exportarPDFPartidaBT(ctx),
                          },
                          "📄 Exportar Relatório de Motores",
                        ),
                      ),
                    )
                  : /* @__PURE__ */ React.createElement(
                      React.Fragment,
                      null,
                      aba === "orient" &&
                        /* @__PURE__ */ React.createElement(TabOrient, { ctx }),
                      aba === "tipo" &&
                        /* @__PURE__ */ React.createElement(TabTipo, { ctx }),
                      aba === "prop" &&
                        /* @__PURE__ */ React.createElement(TabProprietario, {
                          ctx,
                        }),
                      aba === "corr" &&
                        /* @__PURE__ */ React.createElement(
                          TabCorrespondencia,
                          { ctx },
                        ),
                      aba === "obra" &&
                        /* @__PURE__ */ React.createElement(TabObra, { ctx }),
                      aba === "blocos" &&
                        multiTorres &&
                        /* @__PURE__ */ React.createElement(TabBlocos, { ctx }),
                      aba === "ucs" &&
                        coletivo &&
                        !multiTorres &&
                        /* @__PURE__ */ React.createElement(TabUcsColetivo, {
                          ctx,
                        }),
                      aba === "ucs" &&
                        !coletivo &&
                        /* @__PURE__ */ React.createElement(TabUcsIndividual, {
                          ctx,
                        }),
                      aba === "cargas" &&
                        coletivo &&
                        !multiTorres &&
                        /* @__PURE__ */ React.createElement(TabCargasColetivo, {
                          ctx,
                        }),
                      aba === "cargas" &&
                        !coletivo &&
                        /* @__PURE__ */ React.createElement(
                          TabCargasIndividual,
                          { ctx },
                        ),
                      aba === "gerador" &&
                        !coletivo &&
                        /* @__PURE__ */ React.createElement(TabGerador, {
                          ctx,
                        }),
                      aba === "obs" &&
                        /* @__PURE__ */ React.createElement(TabObs, { ctx }),
                      aba === "revisar" &&
                        /* @__PURE__ */ React.createElement(TabRevisar, {
                          ctx,
                        }),
                      /* @__PURE__ */ React.createElement(
                        "div",
                        { className: "nav-bottom" },
                        /* @__PURE__ */ React.createElement(
                          Btn,
                          {
                            variant: "ghost",
                            onClick: irAnt,
                            disabled: idx <= 0,
                          },
                          "← Voltar",
                        ),
                        /* @__PURE__ */ React.createElement(
                          "span",
                          { className: "nav-step-info" },
                          "Etapa ",
                          Math.max(idx, 0) + 1,
                          " de ",
                          abas.length,
                        ),
                        aba === "revisar"
                          ? /* @__PURE__ */ React.createElement(
                              Btn,
                              {
                                variant: "primary",
                                onClick: gerarPDF,
                                disabled: hibrido && !validacaoHibrido.ok,
                              },
                              "📄 Exportar PDF",
                            )
                          : /* @__PURE__ */ React.createElement(
                              Btn,
                              { variant: "primary", onClick: irProx },
                              "Avançar →",
                            ),
                      ),
                    ),
              ),
            ),
            /* @__PURE__ */ React.createElement(
              "div",
              { className: "footer" },
              "Documento gerado eletronicamente · não substitui o formulário oficial CEMIG ·",
              /* @__PURE__ */ React.createElement(
                "a",
                {
                  href: "https://www.cemig.com.br/como-solicitar-os-principais-servicos/ligacao-nova-e-aumento-de-carga/ligacao-nova-ou-alteracao-de-carga-para-demandas-especificas/",
                  target: "_blank",
                  rel: "noreferrer",
                },
                " ",
                "Saiba mais no portal Cemig",
              ),
            ),
          ),
  );
}
ReactDOM.createRoot(document.getElementById("root")).render(
  /* @__PURE__ */ React.createElement(App, null),
);
