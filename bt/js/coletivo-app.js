/* ============================================================
   CEMIG BT — Fluxos COLETIVO e CONDOMÍNIO (múltiplas torres)
   em HTML/JS puro (padrão MT). Substitui o app React
   (bt/js/app.js + views) para os cards formType "coletivo" e
   "condominio" — um único app serve os dois (flag MULTI).
   ------------------------------------------------------------
   O núcleo comum (binding, navegação, toggles, PF/CNPJ, CEP,
   correspondência, mapa/restrição, helpers de prévia) vive em
   bt/js/bt-core.js. O estado mantém o MESMO shape que
   gerarPdfDoc(S) espera (atend/prop/corr/obra + ucBlocos[] +
   blocos[]) — pdf.js, calc.js, data.js e model.js reutilizados
   sem alteração. Os derivados (demanda ND-5.2, disjuntores,
   validações) são portes VERBATIM dos useMemo de app.js; os
   useEffect viram chamadas explícitas pós-mutação.
   ============================================================ */

/* ===== Card da modalidade (?mod=<id>) + fluxo ===== */
const CARD = btResolverCard(["coletivo", "condominio"]) || {};
const MULTI = CARD.formType === "condominio";

// Pruning do superset [data-flow]: feito por script inline no index.html,
// antes do primeiro paint e dos CDNs — aqui já chegaria tarde (a lista
// aparecia sendo podada/renumerada na tela).

/* ===== Estado (mesmo shape do App React / gerarPdfDoc) ===== */
const _prefAtividade = (CARD.prefill && CARD.prefill.atividade) || "";
function novaUcBloco(i) {
  const u = ucBlocoPadrao(i);
  if (_prefAtividade) u.atividade = _prefAtividade;
  return u;
}
function novaTorre(i) {
  const b = blocoPadrao(i);
  if (_prefAtividade)
    b.ucs = (b.ucs || []).map((u) =>
      Object.assign(u, { atividade: _prefAtividade }),
    );
  return b;
}
const state = {
  atend: Object.assign(
    atendPadrao(),
    (CARD.prefill && CARD.prefill.atend) || {},
  ),
  prop: propPadrao(),
  corr: corrPadrao(),
  // Paridade com o app React: distMenor30 "Sim" e prontoLigar "Não" são os
  // valores iniciais do coletivo; a zona é SEMPRE "Urbano" neste fluxo
  // (grafia do React em views/empreendimento.js — não "Urbana").
  obra: Object.assign(
    obraPadrao(),
    { distMenor30: "Sim", prontoLigar: "Não" },
    (CARD.prefill && CARD.prefill.obra) || {},
    { localizacao: "Urbano" },
  ),
  obs: "",
  ucsDet: [],
  ucBlocos: [novaUcBloco(0)],
  blocos: [novaTorre(0)],
  // Regras de replicação entre torres (gerenciador do botão "Replicar dados").
  // Cada regra é { origem, destinos: [] } com ÍNDICES de state.blocos. As regras
  // ficam guardadas para que o usuário possa revisá-las/editá-las depois; só são
  // aplicadas quando ele confirma no modal (ver aplicarReplicacoes).
  replicacoes: [],
  // Regras de replicação de UNIDADES (botão "Replicar dados para todas
  // unidades de todas as torres").
  // Cada regra é { torreOrigem, ucOrigem, torresDestino: [] } com ÍNDICES —
  // a UC modelo completa a própria torre e preenche todas as UCs das torres
  // de destino (ver aplicarReplicacoesUC).
  replicacoesUC: [],
  logoPDF: null,
};
window.state = state;
// Múltiplas torres: "Quantidade de torres" começa em branco — os cards das
// torres (e a etapa "Dados das unidades") só aparecem depois que o usuário
// informar o número. state.blocos mantém 1 torre como armazém interno; é o
// nBlocos vazio que segura a renderização (ver renderBlocos/renderUnidadesTorres).
if (MULTI) state.atend.nBlocos = "";
// Abertura dos acordeões (fora do estado do formulário, como no React)
const _ucAberta = {};
const _torreAberta = {};
const _uniAberta = {}; // unidades da etapa Dados das unidades ("bi:ui")
// Marcam a abertura automática do primeiro card (torre 1 / unidade 1 da torre
// 1), feita uma única vez — depois a abertura é só por clique do usuário.
let _torreAbertaInicial = false;
let _uniAbertaInicial = false;
// Paginação e torre selecionada das etapas do condomínio (UI apenas)
const ITENS_POR_PAGINA = 10;
let _torrePagina = 0; // página da lista de torres (etapa Dados das torres)
let _uniTorre = 0; // torre selecionada na etapa Dados das unidades
const _uniPagina = {}; // página da lista de unidades, por torre
const _previaTorrePag = {}; // página da tabela de UCs de cada torre, na prévia
let _previaTorreExterna = 0; // torre exibida na prévia (paginação externa)

/* ===== flags de fluxo (paridade com app.js:67-68) ===== */
const coletivoF = () => state.atend.disjGeral === "Sim";
const hibridoF = () =>
  coletivoF() && !MULTI && state.atend.solicitacao === SOLICITACOES[3];
const trocaDisjGeralF = () =>
  coletivoF() &&
  !MULTI &&
  state.atend.escopo === "Alteração de Carga com alteração do disjuntor geral";
// Concordância dos rótulos: "Torre" é feminino, "Bloco" masculino.

/* ===== derivados (portes verbatim dos useMemo de app.js) ===== */
// Modo de previsão do coletivo, decidido SÓ pela quantidade de apartamentos
// residenciais (a área não participa da escolha do método — ela só define o
// valor A dentro do ND-5.2):
//  • 4+ apartamentos residenciais → método 5.2 (Carga prevista por UC +
//    demanda geral não residencial informada pelo RT);
//  • menos de 4 (ou nenhuma UC residencial) → TODAS as UCs detalham as
//    cargas como no BT individual (montarCargasBT / ND-5.1).
const modoCalculadoraF = () => nd52InfoF().quantidadeApartamentos < 4;
// Carga instalada total (kW): campo Carga prevista no método 5.2; soma das
// cargas detalhadas (calculadora) quando o ND-5.2 não calcula.
const prevTotalKwF = () => {
  const calc = modoCalculadoraF();
  return state.ucBlocos.reduce((s, u) => {
    if (ucSemAlteracao(u)) return s;
    return s + (calc ? num((u.cargas || {})._cargaKw) : prevKwUC(u));
  }, 0);
};
// app.js:246-268
function nd52InfoF() {
  const residenciais = state.ucBlocos.filter(
    (u) => u.atividade === "Residencial" && !ucSemAlteracao(u),
  );
  const quantidadeApartamentos = residenciais.length;
  const areaMediaPonderada = !quantidadeApartamentos
    ? 0
    : residenciais.reduce((s, u) => s + num(u.area), 0) /
      quantidadeApartamentos;
  return {
    quantidadeApartamentos,
    areaMediaPonderada,
    nd52: nd52CalcularDemandaApartamentos(
      areaMediaPonderada,
      quantidadeApartamentos,
    ),
  };
}
// app.js:269-276
const temUCNaoResidencialF = () =>
  state.ucBlocos.some(
    (u) => u.atividade && u.atividade !== "Residencial" && !ucSemAlteracao(u),
  );
// Demanda total das UCs do agrupamento, conforme o modo (ver modoCalculadoraF)
function demandaPrevTotalF() {
  if (modoCalculadoraF())
    // Modo calculadora: soma das demandas calculadas pelas cargas de cada UC
    return state.ucBlocos.reduce(
      (s, u) => s + (ucSemAlteracao(u) ? 0 : num((u.cargas || {})._demanda)),
      0,
    );
  // Método 5.2: residencial pelo ND-5.2 (0 enquanto a área média estiver
  // fora da tabela — a validação aponta a pendência) + não residencial do RT.
  const nd52 = nd52InfoF().nd52;
  const demandaNaoResidencial = temUCNaoResidencialF()
    ? num(state.atend.demandaNaoResidencial)
    : 0;
  return (nd52 ? nd52.demandaKVA : 0) + demandaNaoResidencial;
}
// app.js:315-343
function validacaoHibridoF() {
  if (!hibridoF()) return { ok: true, erros: [] };
  const erros = [];
  const u51 = state.ucBlocos.filter((u) => u.nd === "5.1");
  const u52 = state.ucBlocos.filter((u) => u.nd === "5.2");
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
}
// app.js:622-634 (ramo coletivo; multiTorres → 0)
const maiorCorrenteUCF = () =>
  MULTI
    ? 0
    : state.ucBlocos.reduce(
        (mx, u) =>
          Math.max(mx, correnteDisj(u.disjPara), correnteDisj(u.disjDe)),
        0,
      );
// app.js:635-638
// Mesmo critério de dimensionamento mínimo do disjuntor da torre e dos demais
// campos: só o MENOR disjuntor geral adequado (seletividade + capacidade).
const opcoesDisjGeralF = () =>
  disjuntoresGeraisAcima(maiorCorrenteUCF(), demandaPrevTotalF()).slice(0, 1);
// Disjuntor geral do agrupamento: OPCIONAL pela mesma regra do multi-torres
// (disjGeralTorreRegra) e do BT individual (validacaoDisjuntoresBT) — só é
// obrigatório quando a combinação dos disjuntores das UCs exige a proteção
// coletiva: alguma UC bipolar acima de 63 A, ou duas ou mais UCs tripolares.
// Fora do modo calculadora (método ND-5.2, 4+ apartamentos) é sempre exigido.
function disjGeralColetivoObrigatorio() {
  // Escopo "Alteração de Carga com alteração do disjuntor geral": o geral é o
  // próprio objeto da solicitação, então nunca é dispensado.
  if (trocaDisjGeralF()) return true;
  if (!modoCalculadoraF()) return true;
  const ativos = (state.ucBlocos || []).filter((u) => !ucSemAlteracao(u));
  let tri = 0;
  let acima63 = false;
  ativos.forEach((u) => {
    // Mesmo fallback do multi-torres: no modo calculadora o disjuntor da UC é
    // o escolhido ou o menor adequado calculado pelas cargas declaradas.
    const esc = disjUCTorre(u);
    if (/Tripolar/i.test(esc)) tri++;
    if (/Bipolar/i.test(esc) && correnteDisj(esc) > 63) acima63 = true;
  });
  return acima63 || tri > 1;
}
// app.js:698-701
const totalUcsEmpreendimentoF = () =>
  state.blocos.reduce((s, b) => s + (parseInt(b.qtdUCs) || 0), 0);
// app.js:702-714 (ramos multi/coletivo)
const demandaTotalGeralF = () =>
  MULTI
    ? state.blocos.reduce(
        (s, b) =>
          s + calcBlocoMultiTorres(b).demandaUcs + num(b.demandaIncendio),
        0,
      )
    : demandaPrevTotalF();

/* ===== derivados da etapa "Dados do projeto" (múltiplas torres) ===== */
// Carga total de TODAS as torres (kW): soma da carga de cada torre.
const cargaTotalEmpreendimentoF = () =>
  state.blocos.reduce((s, b) => s + cargaTotalTorre(b), 0);
// Maior corrente (A) entre os disjuntores das torres — piso do disjuntor de
// prumada (ou, sem prumadas, do disjuntor geral do empreendimento).
const maiorCorrenteTorresF = () => maiorCorrenteTorres(state.blocos, null);
// Prumadas efetivas: só quando "temPrumada" = Sim (senão a hierarquia pula o
// nível). Faixas incompletas/inválidas ainda entram na lista para validação.
const prumadasAtivasF = () =>
  state.atend.temPrumada === "Sim" ? state.atend.prumadas || [] : [];
// Maior corrente (A) do disjuntor de prumada configurado — piso do disjuntor
// geral do empreendimento quando há prumadas.
const maiorCorrentePrumadaF = () =>
  prumadasAtivasF().reduce((mx, p) => Math.max(mx, correnteDisj(p.disj)), 0);
// Piso do disjuntor geral do empreendimento: maior prumada se houver, senão a
// maior torre (a hierarquia ignora os níveis inexistentes).
const pisoDisjEmpreendimentoF = () =>
  state.atend.temPrumada === "Sim" && prumadasAtivasF().length
    ? maiorCorrentePrumadaF()
    : maiorCorrenteTorresF();
// Opções sugeridas (menor válido primeiro) de cada disjuntor da hierarquia.
const opcoesDisjEmpreendimentoF = () =>
  disjEmpreendimentoAcima(pisoDisjEmpreendimentoF(), demandaTotalGeralF());
const opcoesDisjCondominioF = () =>
  disjEmpreendimentoAcima(
    0,
    state.blocos.reduce((s, b) => s + num(b.demandaIncendio), 0),
  );
const opcoesDisjPrumadaF = (p) =>
  disjEmpreendimentoAcima(
    maiorCorrenteTorres(state.blocos, torresDaPrumada(p, state.blocos.length)),
    null,
  );
// Auto-seleção (menor disjuntor válido) da hierarquia do projeto: prumadas
// primeiro (são o piso do geral), depois empreendimento e condomínio. Só
// preenche o que está vazio ou fora das opções — não sobrescreve escolha válida.
// Lista vazia zera o valor em vez de preservá-lo: sem opção adequada o
// <select> fica só com a opção vazia, e um valor órfão no state continuaria
// alimentando validacaoHierarquiaProjeto — que reprovaria o avanço citando um
// disjuntor que o campo não mostra. Mesma regra de autoSelecionarDisjCondominio.
function autoSelecionarDisjProjeto() {
  if (!MULTI) return;
  if (state.atend.temPrumada === "Sim") {
    (state.atend.prumadas || []).forEach((p) => {
      const ops = opcoesDisjPrumadaF(p);
      if (!ops.length) p.disj = "";
      else if (!(p.disj && ops.includes(p.disj))) p.disj = ops[0];
    });
  }
  const opsE = opcoesDisjEmpreendimentoF();
  if (!opsE.length) state.atend.disjEmpreendimento = "";
  else if (
    !(
      state.atend.disjEmpreendimento &&
      opsE.includes(state.atend.disjEmpreendimento)
    )
  )
    state.atend.disjEmpreendimento = opsE[0];
  const opsC = opcoesDisjCondominioF();
  if (!opsC.length) state.atend.disjCondominio = "";
  else if (
    !(state.atend.disjCondominio && opsC.includes(state.atend.disjCondominio))
  )
    state.atend.disjCondominio = opsC[0];
}

/* ===== efeitos React → chamadas explícitas pós-mutação ===== */
// app.js:474-502 (ramo coletivo): ucBlocos acompanha atend.nUCs
function sincronizarUcBlocos() {
  const n = Math.max(1, Number(state.atend.nUCs) || 1);
  const arr = state.ucBlocos;
  while (arr.length < n) arr.push(novaUcBloco(arr.length));
  while (arr.length > n) arr.pop();
}
// Preset de carga prevista da UC Residencial pelo disjPara: preenche quando
// o campo está vazio ou ainda com o valor de outro preset (não sobrescreve
// valor digitado pelo usuário).
function aplicarPresetResidencial() {
  const presets = Object.values(PRESET_PREV_RESIDENCIAL_COLETIVO);
  state.ucBlocos.forEach((u) => {
    if (u.atividade !== "Residencial") return;
    const preset = PRESET_PREV_RESIDENCIAL_COLETIVO[u.disjPara];
    if (!preset) return;
    const atual = String(u.cargaPrevista == null ? "" : u.cargaPrevista);
    if (atual === "" || (presets.includes(atual) && atual !== preset))
      u.cargaPrevista = preset;
  });
}
// app.js:522-535: blocos acompanha atend.nBlocos (aceita valor bruto —
// só redimensiona com número válido, sem apagar torres preenchidas)
function sincronizarBlocos() {
  if (!MULTI) return;
  if (
    String(state.atend.nBlocos == null ? "" : state.atend.nBlocos).trim() === ""
  )
    return;
  const n = Math.max(1, Number(state.atend.nBlocos) || 1);
  const arr = state.blocos;
  while (arr.length < n) arr.push(novaTorre(arr.length));
  while (arr.length > n) arr.pop();
}
// app.js:639-645: auto-seleção do disjuntor geral do agrupamento
function autoSelecionarDisjGeral() {
  if (!coletivoF() || MULTI) return;
  // Agrupamento que dispensa o disjuntor geral fica sem ele (o rodapé oculta
  // o card) — não faz sentido pré-selecionar um valor que não será exibido.
  if (!disjGeralColetivoObrigatorio()) {
    state.atend.disjuntorGeral = "";
    return;
  }
  const ops = opcoesDisjGeralF();
  if (!ops.length) return;
  if (state.atend.disjuntorGeral && ops.includes(state.atend.disjuntorGeral))
    return;
  state.atend.disjuntorGeral = ops[0];
}
// app.js:651-669: auto-seleção dos disjuntores geral/incêndio por torre
function autoSelecionarDisjTorres() {
  if (!MULTI) return;
  state.blocos.forEach((b) => {
    // Regra de disjuntor: torre que dispensa o disjuntor geral fica sem ele
    // (não sugere nem mantém valor antigo).
    if (!disjGeralTorreObrigatorio(b)) {
      b.disjGeral = "";
    } else {
      const ops = opcoesDisjGeralTorre(b);
      // Lista vazia (demanda das UCs acima do catálogo, ou nenhum disjuntor
      // seletivo acima do maior das UCs): o valor guardado não é mais uma
      // opção oferecida — some do <select> e precisa sumir do state também,
      // senão os dois ficam divergentes (mesma regra do disjuntor do
      // condomínio, em autoSelecionarDisjCondominio).
      if (!ops.length) b.disjGeral = "";
      else if (!(b.disjGeral && ops.includes(b.disjGeral))) b.disjGeral = ops[0];
    }
    autoSelecionarDisjCondominio(b);
  });
}
// Auto-seleção do Disjuntor do condomínio (incêndio) de um agrupamento a partir
// da sua demanda: escolhe o MENOR disjuntor adequado. Mantém a escolha do
// usuário se ela ainda constar nas opções. Sem demanda informada, o disjuntor
// fica em branco (é sugerido só depois que a demanda existe). Usada por torre
// (MULTI) e coletivo.
function autoSelecionarDisjCondominio(ag) {
  if (!ag) return;
  if (!(num(ag.demandaIncendio) > 0)) {
    ag.disjIncendio = "";
    return;
  }
  const ops = opcoesDisjIncendioTorre(ag);
  // Sem opção adequada (demanda acima do teto do catálogo, 304 kVA) o valor
  // anterior deixa de ser válido: o <select> passa a ter só a opção vazia e o
  // campo aparece EM BRANCO. Manter o disjuntor antigo no state deixava os dois
  // fora de sincronia — o gate (btBlocosOk) lia "preenchido" e liberava o
  // avanço com um disjuntor que a tela não mostra e que não atende à demanda.
  if (!ops.length) {
    ag.disjIncendio = "";
    return;
  }
  if (!(ag.disjIncendio && ops.includes(ag.disjIncendio)))
    ag.disjIncendio = ops[0];
}

/* ===== replicações (portes de app.js) ===== */
// app.js:344-361
function replicarUC1Coletivo() {
  const base = state.ucBlocos[0];
  if (!base) return;
  state.ucBlocos = state.ucBlocos.map((u, k) =>
    k === 0
      ? u
      : Object.assign({}, base, {
          cargas: JSON.parse(JSON.stringify(base.cargas || {})),
          _acc: {},
          identificacao: u.identificacao || `UC ${k + 1}`,
          nPredial: u.nPredial,
          complemento: u.complemento,
          caixa: u.caixa,
          instalacao: u.instalacao,
        }),
  );
  renderUcsColetivo();
}
/* ===== vínculo entre torres (replicação contínua) =====
   Uma regra de replicação não é um copiar/colar de uma vez só: enquanto ela
   existir, a torre de origem é a fonte de verdade e cada campo de DADOS DA
   TORRE preenchido nela propaga para os destinos ao sair do campo (blur).
   Os dados das UNIDADES não entram aqui — têm o gerenciador próprio
   (abrirGerenciadorReplicacaoUC).
   Exceção: um campo editado à mão num destino "trava" e para de receber a
   propagação; os demais campos daquela torre seguem vinculados. O registro
   desses campos travados fica em b._travados (Set de chaves). */
const CAMPOS_TORRE = [
  "qtdUCs",
  "aptosPorAndar",
  "aptosPorAndarFaixas",
  "complInicial",
  "tipoComplemento",
  "demandaIncendio",
  "disjIncendio",
];
// A identificação da torre (b.nome) NÃO propaga: é o que distingue um card do
// outro, e _copiarTorre sempre a preservou.

// Regra cuja origem é `bi`, se houver (uma torre é origem de no máximo uma).
function _regraDaOrigem(bi) {
  return (state.replicacoes || []).find(
    (r) => r.origem === bi && (r.destinos || []).length,
  );
}
// Marca `campo` da torre `bi` como editado à mão — para de receber propagação.
function _travarCampo(bi, campo) {
  const b = state.blocos[bi];
  if (!b) return;
  if (!b._travados) b._travados = [];
  if (!b._travados.includes(campo)) b._travados.push(campo);
}
function _campoTravado(bi, campo) {
  const b = state.blocos[bi];
  return !!(b && b._travados && b._travados.includes(campo));
}
// Propaga UM campo da torre de origem para os destinos da sua regra. Chamado no
// blur do campo, e não a cada tecla, para não reescrever o destino no meio da
// digitação. Retorna true se algo mudou (o chamador decide re-renderizar).
function propagarCampoTorre(bi, campo) {
  const regra = _regraDaOrigem(bi);
  if (!regra || !CAMPOS_TORRE.includes(campo)) return false;
  const base = state.blocos[bi];
  if (!base) return false;
  const valor = base[campo];
  let mudou = false;
  regra.destinos.forEach((di) => {
    const d = state.blocos[di];
    // Um campo travado no destino foi digitado à mão: preservar.
    if (!d || _campoTravado(di, campo)) return;
    if (d[campo] === valor) return;
    d[campo] = typeof valor === "object" && valor !== null
      ? JSON.parse(JSON.stringify(valor))
      : valor;
    // Quantidade de unidades muda a lista de UCs da torre de destino.
    if (campo === "qtdUCs") sincronizarUCsTorre(di, valor);
    mudou = true;
  });
  if (mudou) {
    regra.destinos.forEach((di) => autoGerarComplementosTorre(di));
    autoSelecionarDisjTorres();
  }
  return mudou;
}
// Rótulos dos campos de torre, para avisar o usuário em português.
const ROTULO_CAMPO_TORRE = {
  qtdUCs: "quantidade de unidades",
  aptosPorAndar: "unidades por andar",
  aptosPorAndarFaixas: "composição por pavimento",
  complInicial: "primeiro complemento",
  tipoComplemento: "tipo de complemento",
  demandaIncendio: "demanda do condomínio",
  disjIncendio: "disjuntor do condomínio",
};
function _vazio(v) {
  if (v == null) return true;
  if (Array.isArray(v)) return v.length === 0;
  return String(v).trim() === "";
}
// Torres de destino que perderiam dados ao aplicar as regras: campo preenchido
// e diferente do valor da origem. Usado para confirmar antes de sobrescrever.
function _conflitosReplicacao(regras) {
  const out = [];
  (regras || []).forEach((r) => {
    const origem = state.blocos[r.origem];
    if (!origem) return;
    (r.destinos || []).forEach((di) => {
      const d = state.blocos[di];
      if (!d) return;
      const campos = CAMPOS_TORRE.filter(
        (c) =>
          !_vazio(d[c]) && JSON.stringify(d[c]) !== JSON.stringify(origem[c]),
      ).map((c) => ROTULO_CAMPO_TORRE[c] || c);
      if (campos.length) out.push({ torre: di, campos: campos });
    });
  });
  return out;
}
// Propaga TODOS os campos de torre da origem `bi` de uma vez.
function propagarTorre(bi) {
  let mudou = false;
  CAMPOS_TORRE.forEach((c) => {
    if (propagarCampoTorre(bi, c)) mudou = true;
  });
  return mudou;
}
// Copia os DADOS DA TORRE de `oi` para `di` (os campos de CAMPOS_TORRE). A
// identificação (nome) é do destino, e o conteúdo das UNIDADES não vem junto —
// as UCs têm o gerenciador próprio (abrirGerenciadorReplicacaoUC). A lista de
// UCs do destino é apenas redimensionada para a quantidade da origem.
function _copiarTorre(oi, di) {
  const base = state.blocos[oi];
  const destino = state.blocos[di];
  if (!base || !destino) return;
  CAMPOS_TORRE.forEach((c) => {
    const v = base[c];
    destino[c] =
      typeof v === "object" && v !== null ? JSON.parse(JSON.stringify(v)) : v;
  });
  // Aplicar a regra é uma decisão explícita: a torre volta a acompanhar a
  // origem em todos os campos.
  destino._travados = [];
  sincronizarUCsTorre(di, base.qtdUCs);
}
// Aplica TODAS as regras de replicação de uma vez (botão "Aplicar" do modal).
// As origens são lidas antes de qualquer escrita — assim uma torre que seja
// origem de uma regra e destino de outra não propaga dados já sobrescritos.
function aplicarReplicacoes(regras) {
  const validas = (regras || []).filter(
    (r) => state.blocos[r.origem] && (r.destinos || []).length,
  );
  if (!validas.length) return;
  // Congela as origens: cada regra copia o estado ORIGINAL da sua torre-origem.
  const origens = validas.map((r) =>
    JSON.parse(JSON.stringify(state.blocos[r.origem])),
  );
  validas.forEach((r, k) => {
    const guardada = state.blocos[r.origem];
    state.blocos[r.origem] = origens[k];
    r.destinos.forEach((di) => _copiarTorre(r.origem, di));
    state.blocos[r.origem] = guardada;
  });
  // Replicar a torre copia o primeiro complemento/aptos por andar; reaplica a
  // geração de complementos em cada torre para que as UCs fiquem numeradas.
  state.blocos.forEach((_, i) => autoGerarComplementosTorre(i));
  autoSelecionarDisjTorres();
  renderBlocos();
}
// Resume uma lista de índices de torre em intervalos legíveis, agrupando os
// consecutivos: [1,2,3,5,7,8] (0-based) → "2–4, 6, 8–9".
function _resumirTorres(indices) {
  const ord = (indices || []).slice().sort((a, b) => a - b);
  if (!ord.length) return "";
  const partes = [];
  let ini = ord[0];
  let fim = ord[0];
  const fechar = () => {
    // Faixa de 2 sai como "2, 3" — um intervalo só compensa a partir de 3.
    if (fim - ini >= 2) partes.push(`${ini + 1}–${fim + 1}`);
    else for (let i = ini; i <= fim; i++) partes.push(String(i + 1));
  };
  for (let k = 1; k < ord.length; k++) {
    if (ord[k] === fim + 1) {
      fim = ord[k];
      continue;
    }
    fechar();
    ini = fim = ord[k];
  }
  fechar();
  return partes.join(", ");
}
// Rótulo de uma regra na lista do modal: "Torre 1 → Torres 2–8".
function _rotuloReplicacao(regra) {
  const destinos = _resumirTorres(regra.destinos);
  const plural = (regra.destinos || []).length > 1 ? "Torres" : "Torre";
  return `Torre ${regra.origem + 1} → ${plural} ${destinos}`;
}
// Valida uma regra contra as demais. Uma torre não pode ser origem e destino da
// MESMA regra, nem destino de mais de uma regra — nesse caso o salvamento é
// barrado apontando a torre em conflito. Regra sem destino também não salva.
// `idx` é a posição da regra em edição (-1 ao adicionar), ignorada na busca.
function _validarReplicacao(regra, regras, idx) {
  if (!(regra.destinos || []).length)
    return "Selecione ao menos uma torre de destino.";
  if (regra.destinos.includes(regra.origem))
    return `A Torre ${regra.origem + 1} não pode ser origem e destino da mesma replicação.`;
  for (let k = 0; k < regras.length; k++) {
    if (k === idx) continue;
    const conflito = regra.destinos.find((d) =>
      (regras[k].destinos || []).includes(d),
    );
    if (conflito != null)
      return `A Torre ${conflito + 1} já é destino da replicação “${_rotuloReplicacao(regras[k])}”.`;
  }
  return "";
}
// app.js:377-391 (aceita valor bruto durante a digitação)
function sincronizarUCsTorre(bi, qtd) {
  const b = state.blocos[bi];
  if (!b) return;
  const n = parseInt(qtd);
  b.qtdUCs = qtd;
  if (!Number.isFinite(n) || n < 1) return;
  const arr = b.ucs || (b.ucs = []);
  while (arr.length < n) {
    const nova = ucTorrePadrao(arr.length);
    if (_prefAtividade) nova.atividade = _prefAtividade;
    arr.push(nova);
  }
  while (arr.length > n) arr.pop();
}
// Preenche os complementos das UCs da torre a partir do primeiro complemento
// (+ aptos por andar). Não re-renderiza — os campos que disparam ficam na etapa
// "Dados das torres" e não devem perder o foco enquanto o usuário digita.
function autoGerarComplementosTorre(bi) {
  const b = state.blocos[bi];
  if (!b) return;
  const lista = gerarComplementos(
    b.complInicial,
    (b.ucs || []).length,
    b.aptosPorAndar,
    b.aptosPorAndarFaixas,
  );
  if (!lista) return;
  (b.ucs || []).forEach((u, k) => (u.complemento = lista[k]));
}
// Coletivo: reaproveita state.blocos[0] SÓ como armazém do card de agrupamento
// (aptos por andar / primeiro complemento / demanda / disjuntor do card) — o
// fluxo coletivo não usa `blocos` para cálculo/PDF (usa `ucBlocos`).
function _coletivoAgr() {
  if (!state.blocos[0]) state.blocos[0] = novaTorre(0);
  return state.blocos[0];
}
// Coletivo: preenche os complementos das UCs (ucBlocos) a partir do primeiro
// complemento (+ unidades por andar) do card de agrupamento. Não re-renderiza —
// os campos que disparam ficam no topo da etapa e não devem perder o foco.
function autoGerarComplementosColetivo() {
  const ag = _coletivoAgr();
  const lista = gerarComplementos(
    ag.complInicial,
    state.ucBlocos.length,
    ag.aptosPorAndar,
    ag.aptosPorAndarFaixas,
  );
  if (!lista) return;
  state.ucBlocos.forEach((u, k) => (u.complemento = lista[k]));
  // Reflete os complementos gerados nos cabeçalhos/campos das UCs abaixo.
  renderUcsColetivo();
}
// app.js:450-473 (preserva complemento/instalação/nº UC de cada unidade)
function replicarUC1Torre(bi) {
  const b = state.blocos[bi];
  if (!b || !(b.ucs || []).length) return;
  const base = b.ucs[0];
  b.ucs = b.ucs.map((u, k) =>
    k === 0
      ? u
      : Object.assign({}, base, {
          cargas: JSON.parse(JSON.stringify(base.cargas || {})),
          _acc: {},
          identificacao: `UC ${k + 1}`,
          complemento: u.complemento,
          instalacao: u.instalacao,
        }),
  );
  autoSelecionarDisjTorres();
  renderUnidadesTorreAtual();
}
// Cópia canônica de uma UC: devolve uma nova unidade com os campos
// CONFIGURÁVEIS de `origem` e os identificadores próprios de `destino`
// (identificação, complemento, nº de instalação e nº predial nunca são
// sobrescritos). `j` é o índice da unidade no destino, usado só para o rótulo
// padrão quando ela ainda não tem identificação.
function _copiarUC(origem, destino, j) {
  return Object.assign({}, origem, {
    cargas: JSON.parse(JSON.stringify(origem.cargas || {})),
    _acc: {},
    identificacao: destino.identificacao || `UC ${j + 1}`,
    complemento: destino.complemento,
    instalacao: destino.instalacao,
    nPredial: destino.nPredial,
  });
}
// Copia a UC `origem` para TODAS as unidades da torre `bi`. `pularUi` preserva
// a própria unidade modelo quando a torre é a de origem da regra.
function _preencherTorreComUC(bi, origem, pularUi) {
  const b = state.blocos[bi];
  if (!b) return;
  b.ucs = (b.ucs || []).map((u, j) =>
    j === pularUi ? u : _copiarUC(origem, u, j),
  );
}
// Aplica TODAS as regras de replicação de unidades (botão "Aplicar" do modal).
// Cada regra usa a UC modelo para (1) completar a própria torre de origem e
// (2) preencher todas as UCs de cada torre de destino. As UCs modelo são lidas
// antes de qualquer escrita — assim uma torre que seja origem de uma regra e
// destino de outra não propaga dados já sobrescritos.
function aplicarReplicacoesUC(regras) {
  const validas = (regras || []).filter(
    (r) =>
      ((state.blocos[r.torreOrigem] || {}).ucs || [])[r.ucOrigem] &&
      (r.torresDestino || []).length,
  );
  if (!validas.length) return;
  // Congela as UCs modelo: cada regra copia o estado ORIGINAL da sua UC.
  const modelos = validas.map((r) =>
    JSON.parse(JSON.stringify(state.blocos[r.torreOrigem].ucs[r.ucOrigem])),
  );
  validas.forEach((r, k) => {
    _preencherTorreComUC(r.torreOrigem, modelos[k], r.ucOrigem);
    (r.torresDestino || []).forEach((di) => {
      // A torre de origem pode constar entre os destinos ("Torre 1 → Torres 1 a
      // 7"): ela já foi preenchida acima, e repetir aqui sem `pularUi`
      // sobrescreveria a própria UC modelo (perdendo complemento/instalação).
      if (di === r.torreOrigem) return;
      _preencherTorreComUC(di, modelos[k], -1);
    });
  });
  autoSelecionarDisjTorres();
  renderUnidadesTorreAtual();
}
// A validação de conflitos entre regras de unidades (_validarReplicacaoUC) e o
// rótulo textual de cada regra (_rotuloReplicacaoUC) saíram junto com a tela de
// "adicionar/editar" do modal: na tabela de tela única cada regra é uma linha
// com selects, e as torres já usadas por outra regra simplesmente não são
// oferecidas (ver origensDisponiveis/destinosDisponiveis em
// abrirGerenciadorReplicacaoUC). O conflito passou a ser impossível por
// construção, em vez de detectado depois.

/* ===== Gate da etapa Empreendimento ===== */
// Campos próprios (cliente + doc válido + ART) e o endereço urbano completo
// (_reqEnderecoObra do React com s.coletivo: art, cep, endereco, num, bairro,
// cidade, estado) liberam o avanço.
function _emprCompleto() {
  return (
    !!String(state.prop.cliente || "").trim() &&
    docInfo().valido === true &&
    !!String(state.obra.art || "").trim()
  );
}
window.btEmprOk = () => {
  const o = state.obra;
  const ok = (v) => String(v == null ? "" : v).trim() !== "";
  return (
    _emprCompleto() &&
    ok(o.cep) &&
    ok(o.endereco) &&
    ok(o.num) &&
    ok(o.bairro) &&
    ok(o.cidade) &&
    ok(o.estado)
  );
};
// Endereço e mapa só aparecem depois de cliente + documento válido + ART
// (_emprCompleto). Os campos de endereço são irmãos dos demais no MESMO grid —
// para o espaçamento ficar uniforme —, então são revelados um a um pela classe
// .empr-detalhe; o mapa/coordenadas, que já ficam fora do grid, pelo
// #emprDetalhes.
let _emprRevelado = false;
function onEmprGate() {
  const det = $("#emprDetalhes");
  if (!det) return;
  const mostrar = _emprCompleto();
  det.style.display = mostrar ? "" : "none";
  $$(".empr-detalhe").forEach((f) => {
    f.style.display = mostrar ? "" : "none";
  });
  if (mostrar && !_emprRevelado) {
    _emprRevelado = true;
    CemigMarcadores.aplicar(det);
    initMapaObra();
    if (mapaObra) setTimeout(() => mapaObra.invalidateSize(), 150);
    onCoordBT(true);
  }
  CemigMarcadores.atualizarAvancar();
}

/* ============================================================
   Travas de avanço das etapas de múltiplas torres
   ------------------------------------------------------------
   Os campos das torres e das UCs são ilhas dinâmicas dentro de
   acordeões (colapsados = fora do DOM visível), então o gate por
   [data-req] visível de form-marcadores.js não os alcança. Estes
   gates leem o estado diretamente e travam o "Avançar" até que
   TODOS os dados obrigatórios estejam preenchidos, independentemente
   de a torre/UC estar aberta. Referenciados via data-gate no botão
   das etapas 12-blocos.html e 15-unidades-torres.html. Só valem no
   fluxo de múltiplas torres (MULTI); nos demais liberam sempre.
   ============================================================ */
const _preenchido = (v) => String(v == null ? "" : v).trim() !== "";
// Unidade de área comum do condomínio (complemento tipo "Portaria", "Academia"…):
// o formulário não pergunta a atividade principal dela — assume Comercial e usa o
// próprio complemento como ramo. Idempotente; chamado tanto ao montar o card
// quanto na validação (unidades ainda fechadas também precisam ficar coerentes).
function normalizarAreaComumUC(u) {
  if (!u || !ehAreaComum(u.complemento)) return false;
  if (u.atividade !== "Comercial") u.atividade = "Comercial";
  if (!_preenchido(u.ramo)) u.ramo = u.complemento;
  return true;
}
// Etapa "Dados das torres": Identificação, Qtd de unidades, e — quando a torre
// tem mais de uma UC — Qtd por andar e Primeiro complemento (mesma condição
// ucsLen() > 1 do render). Demanda e Disjuntor do condomínio são obrigatórios.
window.btBlocosOk = function () {
  if (!MULTI) return true;
  const blocos = state.blocos || [];
  if (!blocos.length) return false;
  return blocos.every((b) => {
    if (!_preenchido(b.nome)) return false;
    const nUcs = (b.ucs || []).length;
    if (!(parseInt(b.qtdUCs) > 0) && !(nUcs > 0)) return false;
    if (nUcs > 1) {
      if (
        !_preenchido(b.aptosPorAndar) &&
        !(b.aptosPorAndarFaixas || []).length
      )
        return false;
      if (!_preenchido(b.complInicial)) return false;
    } else if (nUcs === 1) {
      // Torre de uma unidade: no lugar do primeiro complemento, o tipo dela.
      if (!_preenchido(b.tipoComplemento)) return false;
    }
    // Demanda e Disjuntor do condomínio da torre são obrigatórios.
    if (!(num(b.demandaIncendio) > 0)) return false;
    if (!_preenchido(b.disjIncendio)) return false;
    return true;
  });
};
// Etapa "Dados da torre" (coletivo, torre única): Demanda e Disjuntor do
// condomínio são obrigatórios. Guardados em state.blocos[0] (ver _coletivoAgr).
window.btAgrupamentoColetivoOk = function () {
  if (MULTI || !coletivoF()) return true;
  const ag = state.blocos[0] || {};
  if (!(num(ag.demandaIncendio) > 0)) return false;
  if (!_preenchido(ag.disjIncendio)) return false;
  return true;
};
// Etapa "Dados das unidades": cada UC ativa da torre precisa de Complemento,
// Atividade e Disjuntor; Área (residencial) ou Ramo (não residencial); e, no
// método ND-5.2, Carga prevista (torre com 4+ UCs) ou Demanda não residencial.
// Espelha exatamente as condições de visibilidade de _mkUnidadeCard.
window.btUnidadesTorresOk = function () {
  if (!MULTI) return true;
  return (state.blocos || []).every((b) => {
    const modoCalc = calcBlocoMultiTorres(b).modoCalculadora;
    const ucs = b.ucs || [];
    return ucs.every((u) => {
      if (ucSemAlteracao(u)) return true;
      if (ucs.length > 1 && !_preenchido(u.complemento)) return false;
      // Área comum (portaria, academia…): o card não pergunta a atividade —
      // normaliza aqui para valer também nas unidades ainda não abertas.
      normalizarAreaComumUC(u);
      if (!_preenchido(u.atividade)) return false;
      if (u.atividade === "Residencial") {
        if (!_preenchido(u.area)) return false;
      } else {
        if (!_preenchido(u.ramo)) return false;
        // Método 5.2: demanda da UC não residencial informada individualmente.
        if (!modoCalc && !_preenchido(u.demandaNaoResidencial)) return false;
      }
      // Carga prevista (kW): método 5.2 com torre de mais de 3 UCs.
      if (!modoCalc && ucs.length > 3 && !_preenchido(u.cargaPrevista))
        return false;
      // Modo calculadora: a demanda calculada das cargas detalhadas.
      if (modoCalc && !(num((u.cargas || {})._demanda) > 0)) return false;
      // Disjuntor da UC: no modo calculadora ele é calculado pelas cargas
      // (disjUCTorre resolve disjPara → cargas._disjuntores[0]); no método 5.2
      // é escolhido manualmente (disjPara). Exige um disjuntor válido nos dois.
      if (!_preenchido(disjUCTorre(u))) return false;
      return true;
    });
  });
};

/* ============================================================
   Etapa "Dados do projeto" (múltiplas torres) — hierarquia de
   proteção UC → Torre → Prumada → Disjuntor geral do empreendimento.
   Prumada e Disjuntor geral do empreendimento são OPCIONAIS; as
   validações consideram apenas os níveis efetivamente configurados
   e exigem que o disjuntor de cada nível superior tenha corrente
   ESTRITAMENTE maior que a do maior disjuntor do nível inferior.
   ============================================================ */
// Lista de pendências da hierarquia (strings). Vazia = tudo consistente.
// Cada regra roda só quando o nível envolvido está configurado.
function validacaoHierarquiaProjeto() {
  const erros = [];
  if (!MULTI) return erros;
  const nBlocos = state.blocos.length;
  const usaPrumada = state.atend.temPrumada === "Sim";
  const prumadas = usaPrumada ? state.atend.prumadas || [] : [];
  const maiorTorre = maiorCorrenteTorresF();
  // Prumadas: faixa válida + disjuntor > maior torre da faixa.
  if (usaPrumada) {
    const cobertas = {};
    prumadas.forEach((p, i) => {
      const rotulo = `Prumada ${i + 1}`;
      const ini = parseInt(p.torreIni, 10);
      const fim = parseInt(p.torreFim, 10);
      // Faixa não preenchida ou fora de ordem: com os dropdowns filtrados isso
      // não deveria ocorrer, então apenas ignora esta linha (sem aviso).
      if (!Number.isFinite(ini) || !Number.isFinite(fim)) return;
      if (ini < 1 || fim < ini || fim > nBlocos) return;
      // Sobreposição com outra prumada (uma torre não pode ter duas prumadas).
      for (let t = ini; t <= fim; t++) {
        if (cobertas[t])
          erros.push(
            `${rotulo}: a torre ${t} já está atribuída à Prumada ${cobertas[t]}.`,
          );
        else cobertas[t] = i + 1;
      }
      if (!_preenchido(p.disj)) {
        erros.push(`${rotulo}: selecione o disjuntor.`);
        return;
      }
      const pisoFaixa = maiorCorrenteTorres(
        state.blocos,
        torresDaPrumada(p, nBlocos),
      );
      if (correnteDisj(p.disj) <= pisoFaixa)
        erros.push(
          `${rotulo}: o disjuntor (${p.disj}) deve ter corrente maior que o maior disjuntor das torres da prumada (${pisoFaixa} A).`,
        );
    });
  }
  // Disjuntor geral do empreendimento (opcional): > maior prumada (se houver)
  // ou > maior torre (se não houver prumadas).
  if (_preenchido(state.atend.disjEmpreendimento)) {
    const piso = pisoDisjEmpreendimentoF();
    const nivel =
      usaPrumada && prumadas.length
        ? "maior disjuntor de prumada"
        : "maior disjuntor das torres";
    if (correnteDisj(state.atend.disjEmpreendimento) <= piso)
      erros.push(
        `Disjuntor geral do empreendimento (${state.atend.disjEmpreendimento}): deve ter corrente maior que o ${nivel} (${piso} A).`,
      );
  }
  return erros;
}
// Gate de avanço: a etapa é toda opcional, mas se algum disjuntor da hierarquia
// estiver preenchido ele precisa respeitar a regra (estritamente maior). Faixas
// de prumada incompletas/sobrepostas também travam. Nada preenchido = libera.
window.btDadosProjetoOk = function () {
  if (!MULTI) return true;
  return validacaoHierarquiaProjeto().length === 0;
};

/* ============================================================
   Etapa "Dados das unidades" do coletivo (renderUcsColetivo —
   porte de views/ucs-coletivo.js). Divide a página com a
   Demanda do atendimento (renderCargasColetivo).
   ============================================================ */
// _inp / _inpInstalacao: ver shared/js/campos.js (cmgInp / cmgInpInstalacao).
const _inp = cmgInp;
const _inpInstalacao = cmgInpInstalacao;
// Campo "Ramo de atividade": input com lista filtrada (shared/js/ramo-atividade.js).
// Exibe só a descrição; o valor guardado é "código - descrição" (o código
// não é escolhido pelo usuário, mas sai no PDF).
function _inpRamo(valor, onChange) {
  const i = document.createElement("input");
  i.type = "text";
  i.placeholder = "Obrigatório";
  i.value = ramoDescricao(valor);
  ramoAtivAttach(i, onChange);
  return i;
}
function renderHibridoAlertas() {
  const box = $("#hibridoAlertas");
  if (!box) return;
  if (!hibridoF()) {
    box.innerHTML = "";
    return;
  }
  const v = validacaoHibridoF();
  box.innerHTML = v.ok
    ? '<div class="alert alert-ok" style="margin-bottom:14px">Classificação ND 5.1 / ND 5.2 das UCs está consistente.</div>'
    : `<div class="alert alert-warn" style="margin-bottom:14px"><strong>Atendimento híbrido — pendências:</strong><ul style="margin:6px 0 0;padding-left:18px">${v.erros.map((e) => `<li>${e}</li>`).join("")}</ul></div>`;
}
function renderUcsColetivo() {
  const box = $("#ucsColetivoBox");
  if (!box) return;
  sincronizarUcBlocos();
  renderHibridoAlertas();
  const hibrido = hibridoF();
  const modoCalc = modoCalculadoraF();
  box.innerHTML = "";
  state.ucBlocos.forEach((u, ui) => {
    const aberta = _ucAberta[ui] === true;
    const bloco = document.createElement("div");
    bloco.className = "uc-colapsavel" + (aberta ? " is-open" : "");
    const head = document.createElement("button");
    head.type = "button";
    head.className = "uc-colapsavel-head";
    head.setAttribute("aria-expanded", aberta ? "true" : "false");
    head.innerHTML =
      `<span class="uc-head-info"><span class="uc-colapsavel-titulo">Unidade consumidora ` +
      `<span class="carga-acc-badge">${ui + 1} de ${state.ucBlocos.length}</span></span></span>` +
      `<span class="carga-acc-chevron uc-colapsavel-chevron" aria-hidden="true"></span>`;
    head.addEventListener("click", () => {
      btToggleExclusivo(_ucAberta, ui, !aberta);
      renderUcsColetivo();
    });
    bloco.appendChild(head);
    if (aberta) {
      const corpo = document.createElement("div");
      corpo.className = "uc-colapsavel-corpo";
      const endereco = _blocoEndereco(u.complemento);
      corpo.appendChild(endereco);
      const grid = document.createElement("div");
      grid.className = "grid grid-2";
      if (modoCalc && !ucSemAlteracao(u)) grid.style.marginBottom = "24px";
      // Norma de atendimento (só híbrido)
      if (hibrido) {
        grid.appendChild(
          _campo(
            "Norma de atendimento",
            _selectDe(["ND 5.1", "ND 5.2"], "ND " + u.nd, (v) => {
              u.nd = v.replace("ND ", "");
              renderUcsColetivo();
            }),
            "field--float",
          ),
        );
      }
      // Nº Predial: só aparece no híbrido ND 5.1, onde validacaoHibridoF()
      // exige um número distinto por UC. Fora daí o predial é o da obra
      // (obra.num) e o campo não é editável — por isso não é exibido.
      if (hibrido && u.nd === "5.1") {
        const f = _campo(
          "Nº Predial",
          _inp(u.nPredial, (v) => (u.nPredial = v)),
        );
        f.setAttribute("data-noopt", "");
        const hint = document.createElement("span");
        hint.className = "field-hint";
        hint.textContent = "Distinto entre as UCs";
        f.appendChild(hint);
        grid.appendChild(f);
      }
      // Complemento (obrigatório com 2+ UCs — visual; não trava o avanço)
      {
        const f = _campo(
          "Complemento da unidade",
          _inp(
            u.complemento,
            (v) => {
              u.complemento = v;
              endereco.querySelector(".uc-head-endereco").textContent =
                enderecoObraTxt(v);
            },
            { placeholder: "Ex: 101" },
          ),
        );
        if (state.ucBlocos.length > 1) f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      }
      // Solicitação (estrutural: campos aparecem/somem)
      {
        const f = _campo(
          "Tipo de solicitação",
          _selectDe(
            [
              "Conexão Nova",
              "Alteração de Carga",
              "Caixa Existente sem Alteração",
            ],
            u.solicitacao,
            (v) => {
              u.solicitacao = v;
              renderUcsColetivo();
            },
          ),
          "field--float",
        );
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      }
      // Atividade principal (estrutural: Ramo × Área)
      {
        const f = _campo(
          "Atividade principal",
          _selectDe(
            ["Residencial", "Comercial", "Industrial", "Rural"],
            u.atividade,
            (v) => {
              u.atividade = v;
              aplicarPresetResidencial();
              renderUcsColetivo();
            },
            true,
          ),
          "field--float",
        );
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      }
      if (u.atividade !== "Residencial") {
        const f = _campo(
          "Ramo de atividade",
          _inpRamo(u.ramo, (v) => (u.ramo = v)),
        );
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      } else {
        const f = _campo(
          "Área privativa (m²)",
          _inp(
            u.area,
            (v) => {
              u.area = v;
              // A área não muda o método (só o valor A do ND-5.2) —
              // atualiza apenas os calculados, sem re-render (mantém o foco).
              atualizarCargasColetivo();
            },
            {
              type: "number",
              placeholder: "Ex: 65",
            },
          ),
        );
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      }
      if (u.solicitacao !== "Conexão Nova") {
        // Um só campo para o número que identifica a UC existente (instalação,
        // unidade consumidora ou medidor) — antes havia um campo "Unidade
        // Consumidora" separado duplicando esta informação.
        const f = _campo(
          "Instalação / Unidade Consumidora / Medidor",
          _inpInstalacao(u.instalacao, (v) => (u.instalacao = v)),
        );
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
        grid.appendChild(
          _campo(
            "Disjuntor atual",
            _selectDe(
              DISJ.map((d) => d.fx),
              u.disjDe,
              (v) => {
                u.disjDe = v;
              },
              true,
            ),
            "field--float",
          ),
        );
      }
      const semAlt = ucSemAlteracao(u);
      // Carga prevista (kW) — substitui a antiga tabela de previsão de carga;
      // aparece no método 5.2 quando o agrupamento tem mais de 3 UCs.
      if (!modoCalc && state.ucBlocos.length > 3 && !semAlt) {
        const f = _campo(
          "Carga prevista da unidade (kW)",
          _inp(
            u.cargaPrevista,
            (v) => {
              u.cargaPrevista = v;
              atualizarCargasColetivo();
            },
            { type: "number", placeholder: "0,0" },
          ),
        );
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      }
      // Disjuntor da UC (mesma regra do multi-torres — ver _mkUnidadeCard):
      //  • Método ND-5.2 (4+ UCs): escolha manual na lista DISJ_COL, já que
      //    não há cargas detalhadas para calcular.
      //  • Modo calculadora (até 3 UCs): calculado a partir das cargas
      //    declaradas, igual ao BT individual — radio com a lista adequada
      //    (cargas._disjuntores), renderizado abaixo das cargas (disjBox).
      if (!modoCalc || semAlt) {
        grid.appendChild(
          _campo(
            "Disjuntor da unidade",
            _selectDe(
              DISJ_COL.map((d) => d.fx),
              u.disjPara,
              (v) => {
                u.disjPara = v;
                // O preset de carga prevista depende do disjuntor escolhido —
                // re-renderiza para o campo refletir o novo valor.
                aplicarPresetResidencial();
                renderUcsColetivo();
                atualizarCargasColetivo();
              },
              true,
            ),
            "field--float",
          ),
        );
      }
      corpo.appendChild(grid);
      // ND-5.2 não calcula → a UC detalha as cargas como no BT individual
      // (mesma ilha montarCargasBT; demanda/carga da UC saem do cálculo). O
      // disjuntor da UC também é calculado pelas cargas (disjBox abaixo).
      if (modoCalc && !semAlt) {
        const divisor = document.createElement("div");
        divisor.className = "divider";
        const titulo = document.createElement("span");
        titulo.className = "subbox-title";
        titulo.textContent = "Cargas da unidade";
        divisor.appendChild(titulo);
        corpo.appendChild(divisor);
        const cargasBox = document.createElement("div");
        corpo.appendChild(cargasBox);
        const disjBox = document.createElement("div");
        corpo.appendChild(disjBox);
        // atualizarCargasColetivo() já reajusta o disjuntor geral.
        montarCargasBT(cargasBox, u, ui, () => {
          renderDisjUnidadeCalc(disjBox, u, atualizarCargasColetivo);
          atualizarCargasColetivo();
        });
        renderDisjUnidadeCalc(disjBox, u, atualizarCargasColetivo);
      }
      // Replicar UC 1 para as demais — dentro da própria UC 1.
      if (ui === 0 && state.ucBlocos.length > 1) {
        const row = document.createElement("div");
        row.className = "acao-central";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-ghost btn-outlined-acao";
        btn.textContent = "Replicar dados para todas unidades";
        btn.addEventListener("click", () => replicarUC1Coletivo());
        row.appendChild(btn);
        corpo.appendChild(row);
      }
      bloco.appendChild(corpo);
    }
    box.appendChild(bloco);
  });
  if (window.CemigMarcadores) {
    CemigMarcadores.aplicar(box);
    CemigMarcadores.atualizarAvancar();
  }
}

/* ============================================================
   Demanda do coletivo: divide a etapa "Dados das unidades" com
   a lista de UCs (a antiga tabela de previsão de carga foi
   substituída pelo campo Carga prevista por UC, na lista acima).
   ============================================================ */
function renderCargasColetivo() {
  sincronizarUcBlocos();
  aplicarPresetResidencial();
  atualizarCargasColetivo();
}
// Atualiza SÓ o que é calculado (campo não residencial e o rodapé com KPIs +
// disjuntor geral, montado por renderDisjGeralColetivo). O resultado do ND-5.2
// não é mais exibido em aviso próprio — a demanda calculada já aparece no KPI
// do rodapé desta etapa.
function atualizarCargasColetivo() {
  // Demanda geral não residencial: só no método 5.2 (quando o ND-5.2 calcula
  // a parte residencial); no modo calculadora as UCs não residenciais também
  // detalham as próprias cargas.
  const naoResBox = $("#demandaNaoResBox");
  if (naoResBox)
    naoResBox.style.display =
      !modoCalculadoraF() && temUCNaoResidencialF() ? "" : "none";
  autoSelecionarDisjGeral();
  renderDisjGeralColetivo();
}
// Card "Troca do Disjuntor Geral" (alteração de carga) + rodapé da etapa
// "Dados das unidades": KPIs (carga/demanda) e Disjuntor geral do agrupamento
// em botões — padrão do rodapé do fluxo multi-torres (renderUnidadesResultado).
function renderDisjGeralColetivo() {
  const troca = trocaDisjGeralF();
  const dem = demandaPrevTotalF();
  const maior = maiorCorrenteUCF();
  const opcoes = opcoesDisjGeralF();
  const trocaBox = $("#trocaDisjBox");
  if (trocaBox) {
    trocaBox.style.display = troca ? "" : "none";
    if (troca) {
      const campos = $("#trocaDisjCampos");
      campos.innerHTML = "";
      const selAtual = _selectDe(
        DISJ.map((d) => d.fx),
        state.atend.disjGeralAtual,
        (v) => (state.atend.disjGeralAtual = v),
        true,
      );
      const fAtual = _campo(
        "Disjuntor geral existente",
        selAtual,
        "field--float",
      );
      fAtual.setAttribute("data-noopt", "");
      campos.appendChild(fAtual);
      const selNovo = _selectDe(
        opcoes,
        state.atend.disjuntorGeral,
        (v) => (state.atend.disjuntorGeral = v),
        true,
      );
      const fNovo = _campo("Disjuntor geral novo", selNovo, "field--float");
      fNovo.setAttribute("data-noopt", "");
      campos.appendChild(fNovo);
      const fDem = _campo(
        "Demanda atual (kVA)",
        _inp(state.atend.demandaAtual, (v) => (state.atend.demandaAtual = v), {
          type: "number",
          placeholder: "0,0",
        }),
      );
      fDem.setAttribute("data-noopt", "");
      campos.appendChild(fDem);
      const ro = document.createElement("div");
      ro.className = "readonly-val";
      ro.textContent = fmt2(dem) + " kVA";
      const fFut = _campo("Demanda futura (kVA)", ro);
      fFut.setAttribute("data-noopt", "");
      campos.appendChild(fFut);
    }
  }
  // Rodapé da etapa "Dados das unidades": KPIs (carga/demanda) + Disjuntor
  // geral do agrupamento em botões — mesmo padrão de renderUnidadesResultado
  // (rodapé do fluxo multi-torres). Substitui o antigo card "Demanda do
  // Atendimento" (KPIs em prev-total) e o card "Disjuntor Geral" (select).
  const geralBox = $("#disjGeralBox");
  if (!geralBox) return;
  const mostrar = coletivoF() && !troca;
  geralBox.style.display = mostrar ? "" : "none";
  geralBox.innerHTML = "";
  if (!mostrar) return;

  const wrap = document.createElement("div");
  wrap.className = "resultado-cargas divider";
  const kpis = document.createElement("div");
  kpis.className = "resultado-kpis";
  kpis.append(
    _mkKpiCard(
      "Total Carga Instalada",
      `${fmt2(prevTotalKwF())} kW`,
      "Soma da carga prevista de todas as unidades consumidoras do agrupamento.",
    ),
    _mkKpiCard(
      "Demanda do atendimento",
      `${fmt2(demandaTotalGeralF())} kVA`,
      "Demanda total do agrupamento (parte residencial pelo ND-5.2 mais a demanda não residencial, ou a soma das demandas calculadas pelas UCs). É ela que dimensiona o disjuntor geral do agrupamento.",
    ),
  );
  wrap.appendChild(kpis);

  if (!disjGeralColetivoObrigatorio()) {
    // Igual ao multi-torres (renderUnidadesResultado): sem bipolar > 63 A e com
    // no máximo uma UC tripolar, o agrupamento dispensa o disjuntor geral. O
    // valor fica em branco e o card é apenas ocultado (sem aviso) — restam os
    // KPIs, que passam a ocupar a largura toda (ver .resultado-cargas no CSS).
    state.atend.disjuntorGeral = "";
    geralBox.appendChild(wrap);
    if (window.CemigMarcadores) CemigMarcadores.aplicar(geralBox);
    return;
  }
  const invalido =
    state.atend.disjuntorGeral && !opcoes.includes(state.atend.disjuntorGeral);
  const card = document.createElement("div");
  card.className =
    "resultado-card resultado-disjuntor" + (invalido ? " resultado-card--error" : "");
  card.innerHTML = `<div class="resultado-card-label">Disjuntor geral do agrupamento</div>`;
  if (opcoes.length) {
    const tg = document.createElement("div");
    tg.className = "toggle-group";
    opcoes.forEach((dj) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "toggle-btn" + (state.atend.disjuntorGeral === dj ? " on" : "");
      btn.textContent = dj;
      btn.addEventListener("click", () => {
        state.atend.disjuntorGeral = dj;
        renderDisjGeralColetivo();
      });
      tg.appendChild(btn);
    });
    card.appendChild(tg);
  } else {
    const hint = document.createElement("div");
    hint.className = "field-hint";
    hint.textContent =
      "Preencha os disjuntores e a previsão de carga das unidades para ver o disjuntor adequado.";
    card.appendChild(hint);
  }
  if (invalido) {
    const aviso = document.createElement("div");
    aviso.className = "cmg-aviso cmg-aviso--error";
    aviso.style.cssText = "margin-top:10px;margin-bottom:0";
    aviso.innerHTML = `<div class="cmg-aviso-icon" aria-hidden="true"></div><p class="cmg-aviso-texto"><span>Esse disjuntor não atende à seletividade (faixa superior ao maior disjuntor das UCs, ${maior} A) e/ou à capacidade para a demanda total (${fmt2(dem)} kVA).</span></p></div>`;
    card.appendChild(aviso);
  }
  wrap.appendChild(card);
  geralBox.appendChild(wrap);
  if (window.CemigMarcadores) CemigMarcadores.aplicar(geralBox);
}

/* ============================================================
   Etapa "Dados das torres" (condomínio) — torres em acordeões
   paginados com os dados gerais de cada torre (identificação,
   qtd. de unidades, demanda/disjuntor do condomínio); as
   unidades são preenchidas na etapa seguinte, "Dados das
   unidades" (renderUnidadesTorres abaixo).
   ============================================================ */
function onNBlocos(el) {
  state.atend.nBlocos = el.value;
  sincronizarBlocos();
  autoSelecionarDisjTorres();
  renderBlocos();
}
function atualizarBlocosKpis() {
  const dem = demandaTotalGeralF();
  const kTot = $("#kpiTotalUcs");
  if (kTot) kTot.textContent = String(totalUcsEmpreendimentoF());
  const kDem = $("#kpiDemandaTotal");
  if (kDem) kDem.textContent = fmt2(dem);
  const aviso = $("#aviso304Blocos");
  if (aviso) aviso.style.display = dem > 304 ? "" : "none";
  const avisoUni = $("#aviso304Unidades");
  if (avisoUni) avisoUni.style.display = dem > 304 ? "" : "none";
}
// Carga total da torre (kW): soma da Carga prevista por UC (método 5.2) ou
// das cargas detalhadas na calculadora — só das UCs ativas.
function cargaTotalTorre(b) {
  const modoCalc = calcBlocoMultiTorres(b).modoCalculadora;
  return (b.ucs || []).reduce((s, u) => {
    if (ucSemAlteracao(u)) return s;
    return s + num(modoCalc ? (u.cargas || {})._cargaKw : u.cargaPrevista);
  }, 0);
}
// Endereço da obra (readonly nos cards de torre/unidade)
function enderecoObraTxt(complemento) {
  const o = state.obra;
  const base = [o.endereco, o.num].filter(Boolean).join(", ");
  return (base || "—") + (complemento ? `, ${complemento}` : "");
}
// _mkKpiCard: ver shared/js/campos.js (cmgKpiCard).
const _mkKpiCard = cmgKpiCard;
function _blocoEndereco(complemento) {
  const box = document.createElement("div");
  box.className = "endereco-bloco";
  const lbl = document.createElement("span");
  lbl.className = "uc-head-endereco-label";
  lbl.textContent = "Endereço";
  const val = document.createElement("span");
  val.className = "uc-head-endereco";
  val.textContent = enderecoObraTxt(complemento);
  box.append(lbl, val);
  return box;
}
// Paginação (torres e unidades): « ‹ [n] de N › »
function _mkPaginacao(totalPaginas, atual, aoIr) {
  const nav = document.createElement("div");
  nav.className = "paginacao";
  if (totalPaginas <= 1) return nav;
  const btn = (rotulo, alvo, aria) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "paginacao-btn";
    b.textContent = rotulo;
    b.setAttribute("aria-label", aria);
    b.disabled = alvo < 0 || alvo >= totalPaginas || alvo === atual;
    b.addEventListener("click", () => aoIr(alvo));
    return b;
  };
  nav.append(
    btn("«", 0, "Primeira página"),
    btn("‹", atual - 1, "Página anterior"),
  );
  const inp = document.createElement("input");
  inp.type = "number";
  inp.className = "paginacao-input";
  inp.min = "1";
  inp.max = String(totalPaginas);
  inp.value = String(atual + 1);
  inp.addEventListener("change", () => {
    const n = Math.min(totalPaginas, Math.max(1, parseInt(inp.value) || 1));
    aoIr(n - 1);
  });
  const de = document.createElement("span");
  de.className = "paginacao-total";
  de.textContent = `de ${totalPaginas}`;
  nav.append(
    inp,
    de,
    btn("›", atual + 1, "Próxima página"),
    btn("»", totalPaginas - 1, "Última página"),
  );
  return nav;
}
// Botão "Replicar dados para todas as torres", ao lado de "Quantidade de
// torres". Fica SEMPRE visível (para o usuário saber que a ação existe) e
// desabilitado enquanto não houver mais de uma torre para replicar — ou seja,
// com a quantidade em branco/0/1. `disabled` já traz o estilo de .btn:disabled.
function renderBotaoReplicarTorres(habilitado) {
  const slot = $("#blocosReplicarAcao");
  if (!slot) return;
  slot.innerHTML = "";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "btn btn-ghost btn-outlined-acao";
  btn.textContent = "Replicar dados para todas as torres";
  btn.disabled = !habilitado;
  if (!habilitado)
    btn.title = "Informe a quantidade de torres (2 ou mais) para replicar.";
  btn.addEventListener("click", () => abrirGerenciadorReplicacao());
  slot.appendChild(btn);
}
function renderBlocos() {
  const box = $("#blocosBox");
  if (!box) return;
  // Enquanto "Quantidade de torres" estiver em branco, não apresentar os cards
  // das torres.
  const nBlocosVazio =
    String(state.atend.nBlocos == null ? "" : state.atend.nBlocos).trim() ===
    "";
  if (nBlocosVazio) {
    // Sem quantidade informada não há cards de torre — e nenhum texto de apoio
    // abaixo do campo (a orientação já está na descrição da etapa).
    box.innerHTML = "";
    const pagVazio = $("#blocosPag");
    if (pagVazio) pagVazio.innerHTML = "";
    // Sem quantidade informada não há o que replicar: o botão continua visível,
    // porém desabilitado.
    renderBotaoReplicarTorres(false);
    atualizarBlocosKpis();
    if (window.CemigMarcadores) CemigMarcadores.atualizarAvancar();
    return;
  }
  sincronizarBlocos();
  autoSelecionarDisjTorres();
  // Informada a quantidade, a Torre 1 já nasce ABERTA e as demais fechadas —
  // o usuário começa a preencher sem um clique extra. Só na primeira montagem
  // dos cards: depois disso quem manda é o clique no acordeão.
  if (!_torreAbertaInicial) {
    _torreAbertaInicial = true;
    btToggleExclusivo(_torreAberta, 0, true);
  }
  const total = state.blocos.length;
  const totalPag = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA));
  if (_torrePagina >= totalPag) _torrePagina = totalPag - 1;
  box.innerHTML = "";
  const ini = _torrePagina * ITENS_POR_PAGINA;
  state.blocos.slice(ini, ini + ITENS_POR_PAGINA).forEach((b, k) => {
    box.appendChild(_mkTorreCard(ini + k, total));
  });
  // Abre o gerenciador de replicações entre torres — as regras valem para o
  // empreendimento inteiro, por isso o botão fica ao lado de "Quantidade de
  // torres" (slot #blocosReplicarAcao), e não dentro de cada card. Só há o que
  // replicar com 2+ torres; com 1 o botão aparece desabilitado.
  renderBotaoReplicarTorres(total > 1);
  const pag = $("#blocosPag");
  if (pag) {
    pag.innerHTML = "";
    pag.appendChild(
      _mkPaginacao(totalPag, _torrePagina, (p) => {
        _torrePagina = p;
        renderBlocos();
      }),
    );
  }
  atualizarBlocosKpis();
  if (window.CemigMarcadores) {
    CemigMarcadores.aplicar(box);
    CemigMarcadores.atualizarAvancar();
  }
}
// Campo com botão de ação DENTRO da própria célula (uma única caixa com borda):
// rótulo flutuante + valor à esquerda, botão à direita. Usado por "Quantidade
// de unidades por andar" + "Customizar". O rótulo flutua como nos demais campos
// (encolhe quando há valor); o input não tem borda própria (a borda é da célula).
function _campoComAcao(labelTxt, controle, botao) {
  const f = document.createElement("div");
  // field--plain sai do rótulo flutuante automático; a caixa/estados ficam por
  // conta de .field--com-acao no CSS. data-noopt: não recebe marca de opcional.
  f.className = "field field--plain field--com-acao";
  f.setAttribute("data-noopt", "");
  const corpo = document.createElement("div");
  corpo.className = "field-acao-corpo";
  const lbl = document.createElement("label");
  lbl.className = "field-acao-label";
  lbl.textContent = labelTxt;
  controle.classList.add("field-acao-input");
  corpo.append(lbl, controle);
  f.append(corpo, botao);
  return f;
}
// ============================================================
// Popup "Composição por pavimento" (botão Customizar)
// O usuário informa andar INICIAL, andar FINAL e unidades por andar de cada
// pavimento — os três campos são editáveis e nenhum é bloqueado (não sabemos
// quantos andares o prédio tem). A única conveniência é a ÚLTIMA linha: suas
// unidades por andar são sugeridas para fechar o total de UCs da torre
// (sugerirUnidadesUltimoPavimento) — e mesmo ela continua editável.
// Ao salvar, chama onSalvar(faixas) com as faixas preenchidas (ou null quando
// não há pavimento válido). Overlay + diálogo montados no <body>, fechados por
// Cancelar/X/Esc/clique no overlay.
// ============================================================
// ============================================================
// Popup "Replicar dados" — gerenciador de replicações entre torres
// O usuário monta uma ou mais regras "torre de origem → torres de destino"
// (ex.: Torre 1 → Torres 2–8, Torre 9 → Torres 10–15) e todas são aplicadas
// juntas ao confirmar. O modal tem duas telas na mesma caixa: a LISTA das
// regras já configuradas e o FORMULÁRIO de adicionar/editar uma regra.
// As regras ficam em state.replicacoes mesmo depois de aplicadas, para que o
// usuário possa revisá-las ao reabrir. Overlay + diálogo montados no <body>,
// fechados por Cancelar/X/Esc/clique no overlay.
// ============================================================
function abrirGerenciadorReplicacao() {
  const total = state.blocos.length;
  if (total < 2) return;
  // Cópia de trabalho: Cancelar descarta tudo, Aplicar é que grava em state.
  let regras = (state.replicacoes || []).map((r) => ({
    origem: r.origem,
    destinos: (r.destinos || []).slice(),
  }));

  const overlay = document.createElement("div");
  overlay.className = "cmg-modal-overlay";

  const dialog = document.createElement("div");
  dialog.className = "cmg-modal cmg-modal-replic";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "cmg-modal-titulo");

  const fechar = () => {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  };
  const onKey = (e) => {
    if (e.key === "Escape") fechar();
  };

  const btnX = document.createElement("button");
  btnX.type = "button";
  btnX.className = "cmg-modal-fechar";
  btnX.setAttribute("aria-label", "Fechar");
  btnX.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  btnX.addEventListener("click", fechar);

  const corpo = document.createElement("div");
  corpo.className = "cmg-modal-conteudo";
  const rodape = document.createElement("div");
  rodape.className = "cmg-modal-rodape";

  const nomeTorre = (i) => `Torre ${(state.blocos[i] || {}).nome || i + 1}`;

  // Resumo dos destinos no campo fechado: "Torres 2 a 7" quando a seleção é uma
  // faixa contínua, senão a lista ("Torres 2, 5 e 9"). Vazio → placeholder.
  const resumoDestinos = (destinos) => {
    const d = (destinos || []).slice().sort((a, b) => a - b);
    if (!d.length) return "";
    if (d.length === 1) return nomeTorre(d[0]);
    const continua = d.every((v, k) => k === 0 || v === d[k - 1] + 1);
    if (continua)
      return `Torres ${d[0] + 1} a ${d[d.length - 1] + 1}`;
    const nums = d.map((i) => i + 1);
    return `Torres ${nums.slice(0, -1).join(", ")} e ${nums[nums.length - 1]}`;
  };

  // Torres que a linha `idx` pode oferecer como destino: exclui a própria
  // origem e as que já são destino de OUTRA regra (cada torre pertence a uma
  // única replicação, então o conflito é impossível por construção).
  const destinosDisponiveis = (idx) => {
    const r = regras[idx];
    const ocupadas = new Set();
    regras.forEach((o, k) => {
      if (k !== idx) (o.destinos || []).forEach((d) => ocupadas.add(d));
    });
    const livres = [];
    state.blocos.forEach((_, i) => {
      if (i === r.origem) return;
      if (ocupadas.has(i)) return;
      livres.push(i);
    });
    return livres;
  };

  // Origens que a linha `idx` pode assumir: qualquer torre que não seja destino
  // de outra regra (nem origem de outra), para não haver duas regras na mesma.
  const origensDisponiveis = (idx) => {
    const usadas = new Set();
    regras.forEach((o, k) => {
      if (k === idx) return;
      usadas.add(o.origem);
      (o.destinos || []).forEach((d) => usadas.add(d));
    });
    const livres = [];
    state.blocos.forEach((_, i) => {
      if (!usadas.has(i)) livres.push(i);
    });
    return livres;
  };

  // ---- Tela única: tabela com uma linha por replicação ----
  const renderLista = () => {
    corpo.innerHTML = "";
    rodape.innerHTML = "";

    const titulo = document.createElement("h2");
    titulo.className = "cmg-modal-titulo";
    titulo.id = "cmg-modal-titulo";
    titulo.textContent = "Replicar dados para todas as torres";

    const desc = document.createElement("p");
    desc.className = "cmg-modal-desc";
    desc.textContent =
      "Esta ferramenta permite a replicação de dados entre as torres. Informe a torre de origem e selecione as torres de destino para colar as informações correspondentes. Caso o condomínio tenha mais de um conjunto de torres com dados distintos, adicione quantas replicações forem necessárias.";

    // Tabela: cabeçalho + uma linha por regra + linha do "Adicionar replicação".
    // Sem nenhuma regra os rótulos não têm o que rotular: no lugar do cabeçalho
    // entra o mesmo aviso de lista vazia usado no gerenciador de unidades.
    const tabela = document.createElement("div");
    tabela.className = "cmg-replic-tabela";

    if (regras.length) {
      const cab = document.createElement("div");
      cab.className = "cmg-replic-cab";
      const cabOrigem = document.createElement("span");
      cabOrigem.className = "cmg-replic-cab-rotulo";
      cabOrigem.textContent = "Torre de origem";
      const cabDest = document.createElement("span");
      cabDest.className = "cmg-replic-cab-rotulo";
      cabDest.textContent = "Torres de destino";
      cab.append(cabOrigem, cabDest);
      tabela.appendChild(cab);
    } else {
      const vazio = document.createElement("p");
      vazio.className = "cmg-replic-vazio";
      vazio.textContent = "Nenhuma replicação configurada.";
      tabela.appendChild(vazio);
    }

    regras.forEach((r, idx) => {
      const linha = document.createElement("div");
      linha.className = "cmg-replic-linha";

      // --- Célula 1: origem (select nativo) ---
      const celOrigem = document.createElement("div");
      celOrigem.className = "cmg-replic-cel cmg-replic-cel--origem";
      const selOrigem = document.createElement("select");
      selOrigem.className = "cmg-replic-select";
      selOrigem.setAttribute("aria-label", "Torre de origem");
      const opcoesOrigem = origensDisponiveis(idx);
      if (!opcoesOrigem.includes(r.origem)) opcoesOrigem.push(r.origem);
      opcoesOrigem
        .sort((a, b) => a - b)
        .forEach((i) => {
          const o = document.createElement("option");
          o.value = String(i);
          o.textContent = nomeTorre(i);
          selOrigem.appendChild(o);
        });
      selOrigem.value = String(r.origem);
      selOrigem.addEventListener("change", () => {
        r.origem = parseInt(selOrigem.value, 10) || 0;
        // A nova origem não pode continuar como destino dela mesma.
        r.destinos = (r.destinos || []).filter((d) => d !== r.origem);
        renderLista();
      });
      celOrigem.appendChild(selOrigem);

      // --- Célula 2: seta ---
      const celSeta = document.createElement("div");
      celSeta.className = "cmg-replic-cel cmg-replic-cel--seta";
      celSeta.innerHTML =
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m0 0l-6-6m6 6l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      // --- Célula 3: destinos (multiselect com checkboxes) ---
      const celDest = document.createElement("div");
      celDest.className = "cmg-replic-cel cmg-replic-cel--destinos";
      celDest.appendChild(mkMultiDestinos(idx, r));

      // --- Célula 4: excluir ---
      const celAcao = document.createElement("div");
      celAcao.className = "cmg-replic-cel cmg-replic-cel--acao";
      const btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "cmg-replic-excluir";
      btnDel.setAttribute("aria-label", `Excluir replicação ${idx + 1}`);
      btnDel.innerHTML =
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      btnDel.addEventListener("click", () => {
        regras.splice(idx, 1);
        renderLista();
      });
      celAcao.appendChild(btnDel);

      linha.append(celOrigem, celSeta, celDest, celAcao);
      tabela.appendChild(linha);
    });

    // Linha final: adicionar replicação. Desabilita quando não há mais torre
    // livre para servir de origem (todas já pertencem a alguma regra).
    const addWrap = document.createElement("div");
    addWrap.className = "cmg-replic-add-linha";
    const btnAdd = document.createElement("button");
    btnAdd.type = "button";
    btnAdd.className = "btn btn-ghost btn-outlined-acao cmg-pav-adicionar";
    btnAdd.innerHTML =
      '<span class="cmg-pav-mais" aria-hidden="true">+</span> Adicionar replicação';
    const livresParaNova = origensDisponiveis(-1);
    btnAdd.disabled = livresParaNova.length < 2;
    if (btnAdd.disabled)
      btnAdd.title = "Não há torres livres suficientes para uma nova replicação.";
    btnAdd.addEventListener("click", () => {
      regras.push({ origem: livresParaNova[0], destinos: [] });
      renderLista();
    });
    addWrap.appendChild(btnAdd);
    tabela.appendChild(addWrap);

    corpo.append(titulo, desc, tabela);

    const btnCancelar = document.createElement("button");
    btnCancelar.type = "button";
    btnCancelar.className = "btn btn-ghost";
    btnCancelar.textContent = "Cancelar";
    btnCancelar.addEventListener("click", fechar);
    const btnSalvar = document.createElement("button");
    btnSalvar.type = "button";
    btnSalvar.className = "btn btn-primary";
    btnSalvar.textContent = "Salvar";
    btnSalvar.addEventListener("click", () => {
      // Regras sem destino são descartadas em silêncio (linha só começada).
      const validas = regras.filter((r) => (r.destinos || []).length);
      // Só avisa quando a replicação vai REALMENTE apagar algo: destino com
      // campo preenchido e diferente da origem. Destino em branco é o caso
      // comum e passa direto.
      const conflitos = _conflitosReplicacao(validas);
      if (conflitos.length) {
        const lista = conflitos
          .map((c) => `Torre ${c.torre + 1} (${c.campos.join(", ")})`)
          .join("; ");
        const ok = window.confirm(
          `Estas torres já têm dados preenchidos que serão substituídos pelos da torre de origem: ${lista}.\n\nDeseja substituir?`,
        );
        if (!ok) return;
        // Substituir é a decisão do usuário: destrava os campos para que a
        // origem volte a mandar neles.
        conflitos.forEach((c) => {
          const d = state.blocos[c.torre];
          if (d) d._travados = [];
        });
      }
      state.replicacoes = validas;
      aplicarReplicacoes(validas);
      fechar();
    });
    rodape.append(btnCancelar, btnSalvar);
  };

  // Multiselect de destinos: campo fechado com o resumo + painel de checkboxes
  // (Selecionar todas + uma por torre livre). Fecha ao clicar fora ou com Esc.
  function mkMultiDestinos(idx, regra) {
    const wrap = document.createElement("div");
    wrap.className = "cmg-multi";

    const campo = document.createElement("button");
    campo.type = "button";
    campo.className = "cmg-multi-campo";
    campo.setAttribute("aria-haspopup", "true");
    campo.setAttribute("aria-expanded", "false");
    const texto = document.createElement("span");
    texto.className = "cmg-multi-texto";
    const pintarTexto = () => {
      const resumo = resumoDestinos(regra.destinos);
      texto.textContent = resumo || "Selecione as torres";
      texto.classList.toggle("is-placeholder", !resumo);
    };
    pintarTexto();
    const seta = document.createElement("span");
    seta.className = "cmg-multi-seta";
    seta.setAttribute("aria-hidden", "true");
    seta.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    campo.append(texto, seta);

    const painel = document.createElement("div");
    painel.className = "cmg-multi-painel";
    painel.hidden = true;

    const opcoes = destinosDisponiveis(idx);

    const mkItem = (rotuloTxt, marcada, onToggle, classe) => {
      const item = document.createElement("label");
      item.className = "cmg-multi-item" + (classe ? " " + classe : "");
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.className = "cmg-multi-chk";
      chk.checked = marcada;
      chk.addEventListener("change", () => onToggle(chk.checked));
      const txt = document.createElement("span");
      txt.textContent = rotuloTxt;
      item.append(chk, txt);
      return item;
    };

    const repintar = () => {
      painel.innerHTML = "";
      const todas =
        opcoes.length > 0 && opcoes.every((i) => regra.destinos.includes(i));
      painel.appendChild(
        mkItem(
          "Selecionar todas",
          todas,
          (marcar) => {
            regra.destinos = marcar ? opcoes.slice() : [];
            repintar();
            pintarTexto();
          },
          "cmg-multi-item--todas",
        ),
      );
      const grade = document.createElement("div");
      grade.className = "cmg-multi-grade";
      opcoes.forEach((i) => {
        grade.appendChild(
          mkItem(nomeTorre(i), regra.destinos.includes(i), (marcar) => {
            if (marcar) regra.destinos.push(i);
            else regra.destinos = regra.destinos.filter((d) => d !== i);
            repintar();
            pintarTexto();
          }),
        );
      });
      painel.appendChild(grade);
      if (!opcoes.length) {
        const vazio = document.createElement("p");
        vazio.className = "cmg-multi-vazio";
        vazio.textContent = "Nenhuma torre disponível.";
        painel.appendChild(vazio);
      }
    };
    repintar();

    const fecharPainel = () => {
      painel.hidden = true;
      campo.setAttribute("aria-expanded", "false");
      wrap.classList.remove("is-aberto");
    };
    const foraClique = (e) => {
      if (!wrap.contains(e.target)) fecharPainel();
    };
    campo.addEventListener("click", () => {
      const abrir = painel.hidden;
      // Só um painel aberto por vez dentro do modal.
      dialog
        .querySelectorAll(".cmg-multi.is-aberto")
        .forEach((o) => o !== wrap && o.querySelector(".cmg-multi-campo").click());
      painel.hidden = !abrir;
      campo.setAttribute("aria-expanded", abrir ? "true" : "false");
      wrap.classList.toggle("is-aberto", abrir);
      if (abrir) document.addEventListener("mousedown", foraClique);
      else document.removeEventListener("mousedown", foraClique);
    });
    wrap.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !painel.hidden) {
        e.stopPropagation();
        fecharPainel();
      }
    });

    wrap.append(campo, painel);
    return wrap;
  }

  renderLista();
  dialog.append(btnX, corpo, rodape);
  overlay.appendChild(dialog);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fechar();
  });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(overlay);
}
// ============================================================
// Popup "Replicar dados para todas as torres" — gerenciador de replicações de UC
// MESMA tela única do gerenciador de torres (abrirGerenciadorReplicacao): uma
// tabela com uma linha por regra e a linha final "Adicionar replicação", tudo
// aplicado junto no "Salvar". A diferença é a coluna extra "Unidade de origem"
// — a regra parte de UMA unidade, não da torre inteira — e o que ela faz: a UC
// modelo COMPLETA a própria torre de origem e ainda preenche todas as UCs das
// torres de destino, de modo que o usuário preencha uma UC por padrão de torre
// e nada mais.
// ============================================================
function abrirGerenciadorReplicacaoUC() {
  const total = state.blocos.length;
  if (!total) return;
  // Cópia de trabalho: Cancelar descarta tudo, Aplicar é que grava em state.
  let regras = (state.replicacoesUC || []).map((r) => ({
    torreOrigem: r.torreOrigem,
    ucOrigem: r.ucOrigem,
    torresDestino: (r.torresDestino || []).slice(),
  }));

  const overlay = document.createElement("div");
  overlay.className = "cmg-modal-overlay";

  const dialog = document.createElement("div");
  dialog.className = "cmg-modal cmg-modal-replic";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "cmg-modal-titulo");

  const fechar = () => {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  };
  const onKey = (e) => {
    if (e.key === "Escape") fechar();
  };

  const btnX = document.createElement("button");
  btnX.type = "button";
  btnX.className = "cmg-modal-fechar";
  btnX.setAttribute("aria-label", "Fechar");
  btnX.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  btnX.addEventListener("click", fechar);

  const corpo = document.createElement("div");
  corpo.className = "cmg-modal-conteudo";
  const rodape = document.createElement("div");
  rodape.className = "cmg-modal-rodape";

  const nomeTorre = (i) => `Torre ${(state.blocos[i] || {}).nome || i + 1}`;
  const ucsDa = (i) => (state.blocos[i] || {}).ucs || [];
  const nomeUC = (bi, j) => {
    const u = ucsDa(bi)[j];
    return (u && u.identificacao) || `Unidade ${j + 1}`;
  };

  // Resumo dos destinos no campo fechado: "Torres 2 a 7" quando a seleção é uma
  // faixa contínua, senão a lista ("Torres 2, 5 e 9"). Vazio → placeholder.
  const resumoDestinos = (destinos) => {
    const d = (destinos || []).slice().sort((a, b) => a - b);
    if (!d.length) return "";
    if (d.length === 1) return nomeTorre(d[0]);
    const continua = d.every((v, k) => k === 0 || v === d[k - 1] + 1);
    if (continua) return `Torres ${d[0] + 1} a ${d[d.length - 1] + 1}`;
    const nums = d.map((i) => i + 1);
    return `Torres ${nums.slice(0, -1).join(", ")} e ${nums[nums.length - 1]}`;
  };

  // Torres que a linha `idx` pode oferecer como destino: exclui apenas as que já
  // são destino de OUTRA regra, para que cada torre seja preenchida por uma
  // única replicação. A torre de ORIGEM continua na lista: a regra usa a UC
  // modelo para completar as demais unidades da própria torre, então "Torre 1 →
  // Torres 1 a 7" é uma seleção válida (e é o caso do spec).
  const destinosDisponiveis = (idx) => {
    const ocupadas = new Set();
    regras.forEach((o, k) => {
      if (k !== idx) (o.torresDestino || []).forEach((d) => ocupadas.add(d));
    });
    const livres = [];
    state.blocos.forEach((_, i) => {
      if (ocupadas.has(i)) return;
      livres.push(i);
    });
    return livres;
  };

  // Torres que a linha `idx` pode assumir como origem: TODAS. Ao contrário do
  // gerenciador de torres, a origem aqui não é consumida — a regra apenas LÊ uma
  // UC modelo dela, então a mesma torre pode ser origem de várias regras (ex.:
  // Torre 1 → Torres 1 a 7 e Torre 1 → Torres 8 a 14, dividindo um condomínio
  // grande em faixas). Só os DESTINOS são exclusivos (ver destinosDisponiveis).
  const origensDisponiveis = () => state.blocos.map((_, i) => i);

  // ---- Tela única: tabela com uma linha por replicação ----
  const renderLista = () => {
    corpo.innerHTML = "";
    rodape.innerHTML = "";

    const titulo = document.createElement("h2");
    titulo.className = "cmg-modal-titulo";
    titulo.id = "cmg-modal-titulo";
    titulo.textContent = "Replicar dados para todas as torres";

    const desc = document.createElement("p");
    desc.className = "cmg-modal-desc";
    desc.textContent =
      "Esta ferramenta permite a replicação de dados de uma unidade específica. Primeiro, indique a torre e a unidade de origem que contêm as informações já preenchidas. Em seguida, selecione as torres de destino que receberão esses mesmos dados.";

    // Tabela: cabeçalho + uma linha por regra + linha do "Adicionar replicação".
    // Sem nenhuma regra os rótulos não têm o que rotular: no lugar do cabeçalho
    // entra o aviso de lista vazia.
    const tabela = document.createElement("div");
    tabela.className = "cmg-replic-tabela cmg-replic-tabela--uc";

    if (regras.length) {
      const cab = document.createElement("div");
      cab.className = "cmg-replic-cab";
      ["Torre de origem", "Unidade de origem", "Torres de destino"].forEach(
        (txt) => {
          const c = document.createElement("span");
          c.className = "cmg-replic-cab-rotulo";
          c.textContent = txt;
          cab.appendChild(c);
        },
      );
      tabela.appendChild(cab);
    } else {
      const vazio = document.createElement("p");
      vazio.className = "cmg-replic-vazio";
      vazio.textContent = "Nenhuma replicação configurada.";
      tabela.appendChild(vazio);
    }

    regras.forEach((r, idx) => {
      const linha = document.createElement("div");
      linha.className = "cmg-replic-linha";

      // --- Célula 1: torre de origem ---
      const celTorre = document.createElement("div");
      celTorre.className = "cmg-replic-cel cmg-replic-cel--origem";
      const selTorre = document.createElement("select");
      selTorre.className = "cmg-replic-select";
      selTorre.setAttribute("aria-label", "Torre de origem");
      origensDisponiveis().forEach((i) => {
        const o = document.createElement("option");
        o.value = String(i);
        o.textContent = nomeTorre(i);
        selTorre.appendChild(o);
      });
      selTorre.value = String(r.torreOrigem);
      selTorre.addEventListener("change", () => {
        r.torreOrigem = parseInt(selTorre.value, 10) || 0;
        // A unidade escolhida pode não existir na torre nova (o nº de UCs varia
        // entre torres). Os destinos ficam como estão — a própria origem pode
        // ser destino dela mesma.
        if (r.ucOrigem >= ucsDa(r.torreOrigem).length) r.ucOrigem = 0;
        renderLista();
      });
      celTorre.appendChild(selTorre);

      // --- Célula 2: unidade de origem (UCs da torre escolhida) ---
      const celUC = document.createElement("div");
      celUC.className = "cmg-replic-cel cmg-replic-cel--uc";
      const selUC = document.createElement("select");
      selUC.className = "cmg-replic-select";
      selUC.setAttribute("aria-label", "Unidade de origem");
      const ucs = ucsDa(r.torreOrigem);
      ucs.forEach((_, j) => {
        const o = document.createElement("option");
        o.value = String(j);
        o.textContent = nomeUC(r.torreOrigem, j);
        selUC.appendChild(o);
      });
      selUC.value = String(r.ucOrigem);
      selUC.disabled = !ucs.length;
      selUC.addEventListener("change", () => {
        r.ucOrigem = parseInt(selUC.value, 10) || 0;
      });
      celUC.appendChild(selUC);

      // --- Célula 3: seta ---
      const celSeta = document.createElement("div");
      celSeta.className = "cmg-replic-cel cmg-replic-cel--seta";
      celSeta.innerHTML =
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12h15m0 0l-6-6m6 6l-6 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

      // --- Célula 4: torres de destino (multiselect com checkboxes) ---
      const celDest = document.createElement("div");
      celDest.className = "cmg-replic-cel cmg-replic-cel--destinos";
      celDest.appendChild(mkMultiDestinos(idx, r));

      // --- Célula 5: excluir ---
      const celAcao = document.createElement("div");
      celAcao.className = "cmg-replic-cel cmg-replic-cel--acao";
      const btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "cmg-replic-excluir";
      btnDel.setAttribute("aria-label", `Excluir replicação ${idx + 1}`);
      btnDel.innerHTML =
        '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      btnDel.addEventListener("click", () => {
        regras.splice(idx, 1);
        renderLista();
      });
      celAcao.appendChild(btnDel);

      linha.append(celTorre, celUC, celSeta, celDest, celAcao);
      tabela.appendChild(linha);
    });

    // Linha final: adicionar replicação. Como a origem não é exclusiva, o que
    // esgota o modal é o DESTINO: desabilita só quando toda torre já é destino
    // de alguma regra e uma nova linha não teria o que preencher.
    const addWrap = document.createElement("div");
    addWrap.className = "cmg-replic-add-linha";
    const btnAdd = document.createElement("button");
    btnAdd.type = "button";
    btnAdd.className = "btn btn-ghost btn-outlined-acao cmg-pav-adicionar";
    btnAdd.innerHTML =
      '<span class="cmg-pav-mais" aria-hidden="true">+</span> Adicionar replicação';
    const jaDestino = new Set();
    regras.forEach((o) => (o.torresDestino || []).forEach((d) => jaDestino.add(d)));
    btnAdd.disabled = jaDestino.size >= state.blocos.length;
    if (btnAdd.disabled)
      btnAdd.title = "Todas as torres já são destino de alguma replicação.";
    btnAdd.addEventListener("click", () => {
      regras.push({ torreOrigem: 0, ucOrigem: 0, torresDestino: [] });
      renderLista();
    });
    addWrap.appendChild(btnAdd);
    tabela.appendChild(addWrap);

    corpo.append(titulo, desc, tabela);

    const btnCancelar = document.createElement("button");
    btnCancelar.type = "button";
    btnCancelar.className = "btn btn-ghost";
    btnCancelar.textContent = "Cancelar";
    btnCancelar.addEventListener("click", fechar);
    const btnSalvar = document.createElement("button");
    btnSalvar.type = "button";
    btnSalvar.className = "btn btn-primary";
    btnSalvar.textContent = "Salvar";
    btnSalvar.addEventListener("click", () => {
      // Regras sem destino são descartadas em silêncio (linha só começada).
      const validas = regras.filter((r) => (r.torresDestino || []).length);
      state.replicacoesUC = validas;
      aplicarReplicacoesUC(validas);
      fechar();
    });
    rodape.append(btnCancelar, btnSalvar);
  };

  // Multiselect de destinos: campo fechado com o resumo + painel de checkboxes
  // (Selecionar todas + uma por torre livre). Fecha ao clicar fora ou com Esc.
  function mkMultiDestinos(idx, regra) {
    const wrap = document.createElement("div");
    wrap.className = "cmg-multi";

    const campo = document.createElement("button");
    campo.type = "button";
    campo.className = "cmg-multi-campo";
    campo.setAttribute("aria-haspopup", "true");
    campo.setAttribute("aria-expanded", "false");
    const texto = document.createElement("span");
    texto.className = "cmg-multi-texto";
    const pintarTexto = () => {
      const resumo = resumoDestinos(regra.torresDestino);
      texto.textContent = resumo || "Selecione as torres";
      texto.classList.toggle("is-placeholder", !resumo);
    };
    pintarTexto();
    const seta = document.createElement("span");
    seta.className = "cmg-multi-seta";
    seta.setAttribute("aria-hidden", "true");
    seta.innerHTML =
      '<svg width="24" height="24" viewBox="0 0 24 24" fill="none"><path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    campo.append(texto, seta);

    const painel = document.createElement("div");
    painel.className = "cmg-multi-painel";
    painel.hidden = true;

    const opcoes = destinosDisponiveis(idx);

    const mkItem = (rotuloTxt, marcada, onToggle, classe) => {
      const item = document.createElement("label");
      item.className = "cmg-multi-item" + (classe ? " " + classe : "");
      const chk = document.createElement("input");
      chk.type = "checkbox";
      chk.className = "cmg-multi-chk";
      chk.checked = marcada;
      chk.addEventListener("change", () => onToggle(chk.checked));
      const txt = document.createElement("span");
      txt.textContent = rotuloTxt;
      item.append(chk, txt);
      return item;
    };

    const repintar = () => {
      painel.innerHTML = "";
      const todas =
        opcoes.length > 0 &&
        opcoes.every((i) => (regra.torresDestino || []).includes(i));
      painel.appendChild(
        mkItem(
          "Selecionar todas",
          todas,
          (marcar) => {
            regra.torresDestino = marcar ? opcoes.slice() : [];
            repintar();
            pintarTexto();
          },
          "cmg-multi-item--todas",
        ),
      );
      const grade = document.createElement("div");
      grade.className = "cmg-multi-grade";
      opcoes.forEach((i) => {
        grade.appendChild(
          mkItem(nomeTorre(i), (regra.torresDestino || []).includes(i), (marcar) => {
            if (marcar) regra.torresDestino.push(i);
            else
              regra.torresDestino = regra.torresDestino.filter((d) => d !== i);
            repintar();
            pintarTexto();
          }),
        );
      });
      painel.appendChild(grade);
      if (!opcoes.length) {
        const vazio = document.createElement("p");
        vazio.className = "cmg-multi-vazio";
        vazio.textContent = "Nenhuma torre disponível.";
        painel.appendChild(vazio);
      }
    };
    repintar();

    const fecharPainel = () => {
      painel.hidden = true;
      campo.setAttribute("aria-expanded", "false");
      wrap.classList.remove("is-aberto");
    };
    const foraClique = (e) => {
      if (!wrap.contains(e.target)) fecharPainel();
    };
    campo.addEventListener("click", () => {
      const abrir = painel.hidden;
      // Só um painel aberto por vez dentro do modal.
      dialog
        .querySelectorAll(".cmg-multi.is-aberto")
        .forEach(
          (o) => o !== wrap && o.querySelector(".cmg-multi-campo").click(),
        );
      painel.hidden = !abrir;
      campo.setAttribute("aria-expanded", abrir ? "true" : "false");
      wrap.classList.toggle("is-aberto", abrir);
      if (abrir) document.addEventListener("mousedown", foraClique);
      else document.removeEventListener("mousedown", foraClique);
    });
    wrap.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !painel.hidden) {
        e.stopPropagation();
        fecharPainel();
      }
    });

    wrap.append(campo, painel);
    return wrap;
  }

  renderLista();
  dialog.append(btnX, corpo, rodape);
  overlay.appendChild(dialog);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fechar();
  });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(overlay);
}
// _preservandoFoco: ver shared/js/campos.js (cmgPreservandoFoco).
const _preservandoFoco = cmgPreservandoFoco;
// Card só-leitura de exibição (rótulo fixo em cima + valor embaixo). Card
// estático (sem <input>), no visual da spec do Figma (.faixa-card): padding
// 20px, borda neutra/200, radius 8px. field--plain sai do rótulo flutuante e
// data-noopt tira a marca de opcional.
function _campoLeitura(labelTxt, valor) {
  const f = document.createElement("div");
  f.className = "field field--plain faixa-card";
  f.setAttribute("data-noopt", "");
  const lbl = document.createElement("span");
  lbl.className = "faixa-card-label";
  lbl.textContent = labelTxt;
  const val = document.createElement("span");
  val.className = "faixa-card-valor";
  val.textContent = valor;
  f.append(lbl, val);
  return f;
}
// Composição por pavimento (só-leitura): uma linha por faixa customizada, cada
// uma com Andar inicial | Andar final | Unidades por andar. Ocupa a largura
// toda do grid do card (col-span-2) e organiza os três campos em .grid-3.
function _faixasComposicao(faixas) {
  const box = document.createElement("div");
  box.className = "col-span-2 faixas-composicao";
  faixas.forEach((f) => {
    const linha = document.createElement("div");
    linha.className = "grid grid-3";
    linha.append(
      _campoLeitura("Andar inicial", String(f.ini)),
      _campoLeitura("Andar final", String(f.fim)),
      _campoLeitura("Unidades por andar", String(f.unidades)),
    );
    box.appendChild(linha);
  });
  return box;
}
// Campos do agrupamento compartilhados entre torre (condomínio) e coletivo. O
// LAYOUT é o mesmo dos dois; a origem/destino de cada campo varia por fluxo e
// vem no adaptador `cfg` (ver _cfgAgrupamentoTorre / _cfgAgrupamentoColetivo).
// Ordem-alvo (imagem) — todo campo tem a largura de uma coluna do grid-2:
//   Quantidade de unidades            (sozinha na linha no fluxo coletivo)
//   Unidades por andar (+ Customizar) | Primeiro complemento (i)
//   Demanda do condomínio             | Disjuntor do condomínio
// A "Identificação da torre" (exclusiva do condomínio) é montada por quem chama.
function _mkAgrupamentoCampos(grid, cfg) {
  {
    const inpQtd = _inp(cfg.qtd(), (v) => cfg.setQtd(v), {
      type: "number",
      placeholder: "0",
    });
    // Identifica o campo entre re-renders do card (ver _preservandoFoco): mudar
    // a quantidade monta/desmonta os campos vizinhos e refaz este input.
    inpQtd.setAttribute("data-foco", cfg.focoQtdId || "qtd-agrupamento");
    const f = _campo(cfg.qtdLabel || "Quantidade de unidades na torre", inpQtd);
    f.setAttribute("data-noopt", "");
    // Sem "Identificação da torre" ao lado (fluxo coletivo), a Quantidade fica
    // sozinha na linha — com a largura de uma coluna, sem esticar — para os
    // pares abaixo (Andar|Complemento, Demanda|Disjuntor) ficarem alinhados.
    if (cfg.qtdSozinhaNaLinha) f.classList.add("row-solo");
    grid.appendChild(f);
  }
  // Torre com UMA unidade: não há sequência de complementos a gerar, mas o
  // usuário ainda precisa dizer QUE tipo de complemento é aquela unidade
  // (Apartamento, Casa, Loja, Portaria…) — o valor vira o complemento da UC.
  if (cfg.ucsLen() === 1) {
    const sel = _selectDe(
      TIPOS_COMPLEMENTO,
      cfg.tipoCompl ? cfg.tipoCompl() : "",
      (v) => {
        if (cfg.setTipoCompl) cfg.setTipoCompl(v);
      },
      true,
    );
    const f = _campo("Tipo de complemento", sel, "field--float");
    f.setAttribute("data-noopt", "");
    grid.appendChild(f);
  }
  // Geração de complementos das unidades: ao preencher o primeiro complemento
  // (e, opcionalmente, unidades por andar) os complementos das UCs são
  // preenchidos automaticamente (ver cfg.gerarComplementos).
  if (cfg.ucsLen() > 1) {
    const maxAptos = cfg.ucsLen();
    // Faixas customizadas (popup "Composição por pavimento"): quando existem, o
    // campo "por andar" vira só-leitura "Customizado" e a composição aparece em
    // cards abaixo (uma linha Andar inicial/final/Unidades por faixa).
    const faixasCustom = normalizarFaixasPavimento(cfg.faixas());
    const custom = faixasCustom.length > 0;
    const inpAndar = _inp(
      custom ? "Customizado" : cfg.andar(),
      (v) => {
        // Não faz sentido mais unidades por andar do que UCs; limita ao total.
        const n = parseInt(v);
        if (Number.isFinite(n) && n > maxAptos) {
          v = String(maxAptos);
          inpAndar.value = v;
        }
        cfg.setAndar(v);
        // Digitar aqui volta ao caso uniforme (mesmas unidades em todos os
        // andares): as faixas do popup teriam precedência e fariam o valor
        // digitado ser ignorado silenciosamente.
        cfg.setFaixas(null);
        cfg.gerarComplementos();
      },
      custom ? { type: "text" } : { type: "number", placeholder: "Ex: 4" },
    );
    if (custom) {
      // Só-leitura: o valor real está nas faixas (cards abaixo); editar é pelo
      // botão "Customizar". Um clique no campo também abre o popup.
      inpAndar.readOnly = true;
    } else {
      inpAndar.max = String(maxAptos);
    }
    // Botão "Customizar" — abre o popup "Composição por pavimento" para
    // descrever faixas de andares com unidades distintas por andar.
    // Ícone: imagem imgs/edit.svg (lápis), sempre centralizada no botão.
    const btnCustom = document.createElement("button");
    btnCustom.type = "button";
    btnCustom.className = "btn btn-ghost btn-outlined-acao field-acao-btn";
    btnCustom.innerHTML =
      '<img class="field-acao-icon" src="../imgs/edit.svg" alt="" aria-hidden="true" />Customizar';
    btnCustom.title = "Personalizar a quantidade de unidades por andar";
    const abrirCustom = () => {
      abrirComposicaoPavimento(
        cfg.faixas(),
        (faixas) => {
          cfg.setFaixas(faixas);
          // As unidades do 1º pavimento passam a ser o padrão do campo
          // "Quantidade de unidades por andar" (o popup é a fonte da verdade).
          if (faixas && faixas.length) {
            cfg.setAndar(String(faixas[0].unidades));
          }
          cfg.gerarComplementos();
          // Re-render para (des)montar os cards das faixas e alternar o campo
          // "por andar" entre editável e "Customizado".
          if (cfg.rerender) cfg.rerender();
        },
        cfg.ucsLen(),
      );
    };
    btnCustom.addEventListener("click", abrirCustom);
    if (custom) inpAndar.addEventListener("click", abrirCustom);
    const fAndar = _campoComAcao(
      "Quantidade de unidades por andar",
      inpAndar,
      btnCustom,
    );
    grid.appendChild(fAndar);
    const fCompl = _campo(
      'Primeiro complemento <span class="cmg-hint" tabindex="0" role="img" aria-label="Ajuda: primeiro complemento" data-hint="Esse campo gera automaticamente a lista de complementos das suas unidades."><img class="field-info" src="../imgs/info.svg" alt="" aria-hidden="true" /></span>',
      _inp(
        cfg.compl(),
        (v) => {
          cfg.setCompl(v);
          cfg.gerarComplementos();
        },
        { placeholder: "Ex: 101 ou Apto 01" },
      ),
    );
    fCompl.setAttribute("data-noopt", "");
    grid.appendChild(fCompl);
    // Composição por pavimento (só-leitura): uma linha por faixa, com os três
    // valores calculados (Andar inicial | Andar final | Unidades por andar),
    // no mesmo visual dos demais campos. Ocupa a largura toda do grid.
    if (custom) grid.appendChild(_faixasComposicao(faixasCustom));
  }
  grid.appendChild(
    _campo(
      "Demanda do condomínio (kVA)",
      _inp(cfg.demanda(), (v) => cfg.setDemanda(v), {
        type: "number",
        placeholder: "0",
      }),
    ),
  );
  {
    const sel = _selectDe(
      cfg.disjOpts(),
      cfg.disj(),
      (v) => cfg.setDisj(v),
      true,
    );
    if (cfg.disjId) sel.id = cfg.disjId;
    grid.appendChild(_campo("Disjuntor do condomínio", sel, "field--float"));
  }
}
// Adaptador do condomínio (torre bi): mesma lógica de antes do adaptador.
function _cfgAgrupamentoTorre(b, bi) {
  return {
    disjId: `disjCondominio-${bi}`,
    focoQtdId: `qtd-torre-${bi}`,
    qtd: () => b.qtdUCs,
    setQtd: (v) => {
      const antes = (b.ucs || []).length > 1;
      sincronizarUCsTorre(bi, v);
      // Re-renderiza só quando a visibilidade de "por andar"/complemento muda
      // (não a cada tecla), preservando o foco/cursor do campo de quantidade.
      if ((b.ucs || []).length > 1 !== antes) _preservandoFoco(renderBlocos);
    },
    ucsLen: () => (b.ucs || []).length,
    andar: () => b.aptosPorAndar,
    setAndar: (v) => (b.aptosPorAndar = v),
    faixas: () => b.aptosPorAndarFaixas,
    setFaixas: (v) => (b.aptosPorAndarFaixas = v),
    rerender: () => renderBlocos(),
    compl: () => b.complInicial,
    setCompl: (v) => (b.complInicial = v),
    // Torre de uma unidade: o tipo escolhido vira o complemento daquela UC.
    tipoCompl: () => b.tipoComplemento,
    setTipoCompl: (v) => {
      b.tipoComplemento = v;
      const uc = (b.ucs || [])[0];
      if (uc) {
        uc.complemento = v;
        normalizarAreaComumUC(uc);
      }
      renderBlocos();
    },
    gerarComplementos: () => autoGerarComplementosTorre(bi),
    demanda: () => b.demandaIncendio,
    setDemanda: (v) => {
      b.demandaIncendio = v;
      autoSelecionarDisjTorres();
      _refreshDisjCondominio(bi);
      atualizarBlocosKpis();
      if (window.CemigMarcadores) CemigMarcadores.atualizarAvancar();
    },
    disjOpts: () => opcoesDisjIncendioTorre(b),
    disj: () => b.disjIncendio,
    setDisj: (v) => {
      b.disjIncendio = v;
      if (window.CemigMarcadores) CemigMarcadores.atualizarAvancar();
    },
  };
}
// Adaptador do coletivo: "Quantidade de unidades" = nº de UCs (ucBlocos, via
// atend.nUCs); "por andar"/"primeiro complemento" geram os complementos das UCs.
// Demanda/Disjuntor do condomínio ficam guardados em state.blocos[0] (armazém do
// card — destino de cálculo/PDF a definir; ver _coletivoAgr).
function _cfgAgrupamentoColetivo() {
  const ag = _coletivoAgr();
  return {
    // Coletivo não tem "Identificação da torre": Quantidade fica só na linha.
    qtdSozinhaNaLinha: true,
    disjId: "disjCondominio-coletivo",
    qtdLabel: "Quantidade de unidades",
    focoQtdId: "qtd-coletivo",
    qtd: () => state.atend.nUCs,
    setQtd: (v) => {
      const antes = state.ucBlocos.length > 1;
      state.atend.nUCs = v;
      // Campo vazio (apagou para redigitar) não redimensiona a lista: aceita o
      // valor bruto e mantém as UCs preenchidas até vir um número válido —
      // mesma regra de sincronizarBlocos.
      if (String(v == null ? "" : v).trim() === "") return;
      sincronizarUcBlocos();
      // A lista de UCs fica em outra etapa (#ucsColetivoBox) — re-renderizar
      // não afeta o foco daqui.
      renderUcsColetivo();
      // O card do topo contém o próprio campo de quantidade, então só é refeito
      // quando a visibilidade de "por andar"/complemento muda (0/1 ↔ 2+ UCs) —
      // e mesmo aí o foco/cursor volta para o campo que o usuário está usando.
      if (state.ucBlocos.length > 1 !== antes)
        _preservandoFoco(renderAgrupamentoColetivo);
    },
    ucsLen: () => state.ucBlocos.length,
    andar: () => ag.aptosPorAndar,
    setAndar: (v) => (ag.aptosPorAndar = v),
    faixas: () => ag.aptosPorAndarFaixas,
    setFaixas: (v) => (ag.aptosPorAndarFaixas = v),
    rerender: () => renderAgrupamentoColetivo(),
    compl: () => ag.complInicial,
    setCompl: (v) => (ag.complInicial = v),
    tipoCompl: () => ag.tipoComplemento,
    setTipoCompl: (v) => {
      ag.tipoComplemento = v;
      const uc = state.ucBlocos[0];
      if (uc) {
        uc.complemento = v;
        normalizarAreaComumUC(uc);
      }
      renderAgrupamentoColetivo();
      renderUcsColetivo();
    },
    gerarComplementos: () => autoGerarComplementosColetivo(),
    demanda: () => ag.demandaIncendio,
    setDemanda: (v) => {
      ag.demandaIncendio = v;
      autoSelecionarDisjCondominio(ag);
      _refreshDisjCondominioSel("coletivo", ag);
      if (window.CemigMarcadores) CemigMarcadores.atualizarAvancar();
    },
    disjOpts: () => opcoesDisjIncendioTorre(ag),
    disj: () => ag.disjIncendio,
    setDisj: (v) => {
      ag.disjIncendio = v;
      if (window.CemigMarcadores) CemigMarcadores.atualizarAvancar();
    },
  };
}
// Card de agrupamento do coletivo (etapa "Dados da torre"): mesmo card do
// condomínio, SEM "Identificação da torre". O endereço da obra é reapresentado
// no topo (readonly), como nos cards de torre do condomínio.
function renderAgrupamentoColetivo() {
  const box = $("#agrupamentoColetivoBox");
  if (!box) return;
  const endBox = $("#agrupamentoColetivoEndereco");
  if (endBox) {
    endBox.innerHTML = "";
    endBox.appendChild(_blocoEndereco(""));
  }
  // Auto-sugere o Disjuntor do condomínio a partir da demanda já informada.
  autoSelecionarDisjCondominio(_coletivoAgr());
  box.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "grid grid-2";
  _mkAgrupamentoCampos(grid, _cfgAgrupamentoColetivo());
  box.appendChild(grid);
  if (window.CemigMarcadores) {
    CemigMarcadores.aplicar(box);
    CemigMarcadores.atualizarAvancar();
  }
}
function _mkTorreCard(bi, total) {
  const b = state.blocos[bi];
  const aberta = _torreAberta[bi] === true;
  const bloco = document.createElement("div");
  bloco.className = "uc-colapsavel" + (aberta ? " is-open" : "");
  const head = document.createElement("button");
  head.type = "button";
  head.className = "uc-colapsavel-head";
  head.setAttribute("aria-expanded", aberta ? "true" : "false");
  head.innerHTML =
    `<span class="uc-colapsavel-titulo">Torre <span class="carga-acc-badge">${bi + 1} de ${total}</span></span>` +
    `<span class="carga-acc-chevron uc-colapsavel-chevron" aria-hidden="true"></span>`;
  head.addEventListener("click", () => {
    btToggleExclusivo(_torreAberta, bi, !aberta);
    renderBlocos();
  });
  bloco.appendChild(head);
  if (!aberta) return bloco;
  const corpo = document.createElement("div");
  corpo.className = "uc-colapsavel-corpo";
  corpo.appendChild(_blocoEndereco(""));
  const grid = document.createElement("div");
  grid.className = "grid grid-2";
  // Ordem-alvo do card (identidade da torre é o único campo exclusivo do
  // condomínio; ver _mkAgrupamentoCampos, compartilhado com o coletivo):
  //   Identificação | Quantidade de unidades
  //   Unidades por andar (+ Customizar) | Primeiro complemento (i)
  //   Demanda do condomínio | Disjuntor do condomínio
  grid.appendChild(
    _campo(
      "Identificação da torre",
      _inp(b.nome, (v) => (b.nome = v), { placeholder: `${bi + 1}` }),
    ),
  );
  _mkAgrupamentoCampos(grid, _cfgAgrupamentoTorre(b, bi));
  corpo.appendChild(grid);
  // Vínculo de replicação: ao sair de qualquer campo do card, a torre de origem
  // propaga os dados para os seus destinos; num destino, o campo mexido à mão
  // trava e deixa de acompanhar a origem. Um único listener no card (fase de
  // captura, porque blur não borbulha) evita tocar nos construtores de campo,
  // que são compartilhados com o fluxo individual.
  corpo.addEventListener(
    "blur",
    () => {
      if (_regraDaOrigem(bi)) {
        if (propagarTorre(bi)) _preservandoFoco(renderBlocos);
        return;
      }
      const dono = (state.replicacoes || []).find((r) =>
        (r.destinos || []).includes(bi),
      );
      if (!dono) return;
      // Destino: trava os campos que já divergem da origem — foram digitados
      // aqui, e a origem não deve mais sobrescrevê-los.
      const origem = state.blocos[dono.origem];
      if (!origem) return;
      CAMPOS_TORRE.forEach((c) => {
        if (JSON.stringify(b[c]) !== JSON.stringify(origem[c]))
          _travarCampo(bi, c);
      });
    },
    true,
  );
  bloco.appendChild(corpo);
  return bloco;
}
// Reapresenta as opções do Disjuntor do condomínio quando a demanda muda
// (sem re-render do card — mantém o foco no campo de demanda). Reflete o valor
// já auto-selecionado (autoSelecionarDisjCondominio) no <select>. `sufixo` é a
// parte após "disjCondominio-" no id (índice da torre, ou "coletivo").
function _refreshDisjCondominioSel(sufixo, ag) {
  const sel = $(`#disjCondominio-${sufixo}`);
  if (!sel || !ag) return;
  const ops = opcoesDisjIncendioTorre(ag);
  sel.innerHTML =
    '<option value=""></option>' +
    ops.map((o) => `<option value="${o}">${o}</option>`).join("");
  sel.value =
    ag.disjIncendio && ops.includes(ag.disjIncendio) ? ag.disjIncendio : "";
}
function _refreshDisjCondominio(bi) {
  _refreshDisjCondominioSel(bi, state.blocos[bi]);
}

/* ============================================================
   Etapa "Dados das unidades" (condomínio) — chips por torre +
   unidades da torre selecionada em acordeões paginados; no
   rodapé os totais da torre e o disjuntor geral (radio).
   ============================================================ */
function renderUnidadesTorres() {
  const chips = $("#unidadesChips");
  if (!chips) return;
  // Só apresentar as unidades depois que a quantidade de torres for informada
  // (etapa "Dados das torres"); antes disso não há torres definidas.
  const nBlocosVazio =
    String(state.atend.nBlocos == null ? "" : state.atend.nBlocos).trim() ===
    "";
  if (nBlocosVazio) {
    chips.innerHTML = "";
    ["unidadesTopo", "unidadesBox", "unidadesPag", "unidadesResultado"].forEach(
      (id) => {
        const el = $("#" + id);
        if (el) el.innerHTML = "";
      },
    );
    const box = $("#unidadesBox");
    if (box)
      box.innerHTML =
        '<p class="field-hint">Informe a quantidade de torres na etapa “Dados das torres” para preencher as unidades.</p>';
    if (window.CemigMarcadores) CemigMarcadores.atualizarAvancar();
    return;
  }
  sincronizarBlocos();
  autoSelecionarDisjTorres();
  if (_uniTorre >= state.blocos.length) _uniTorre = 0;
  chips.innerHTML = "";
  state.blocos.forEach((b, bi) => {
    const c = document.createElement("button");
    c.type = "button";
    c.className = "torre-chip" + (bi === _uniTorre ? " on" : "");
    c.textContent = `Torre ${b.nome || bi + 1}`;
    c.addEventListener("click", () => {
      _uniTorre = bi;
      renderUnidadesTorres();
    });
    chips.appendChild(c);
  });
  renderUnidadesTorreAtual();
}
// Re-render estrutural da torre selecionada (topo, acordeões, rodapé).
function renderUnidadesTorreAtual() {
  const box = $("#unidadesBox");
  const bi = _uniTorre;
  const b = state.blocos[bi];
  if (!box || !b) return;
  const ucs = b.ucs || [];
  const modoCalc = calcBlocoMultiTorres(b).modoCalculadora;
  // A unidade 1 da torre 1 já nasce ABERTA e as demais fechadas — uma única vez,
  // na primeira montagem; depois quem manda é o clique no acordeão.
  if (!_uniAbertaInicial && ucs.length) {
    _uniAbertaInicial = true;
    btToggleExclusivo(_uniAberta, `${bi}:0`, true);
  }
  renderUnidadesTopo(bi);
  const totalPag = Math.max(1, Math.ceil(ucs.length / ITENS_POR_PAGINA));
  let pagAtual = _uniPagina[bi] || 0;
  if (pagAtual >= totalPag) pagAtual = _uniPagina[bi] = totalPag - 1;
  box.innerHTML = "";
  const ini = pagAtual * ITENS_POR_PAGINA;
  ucs.slice(ini, ini + ITENS_POR_PAGINA).forEach((u, k) => {
    box.appendChild(_mkUnidadeCard(bi, ini + k, modoCalc));
  });
  const pag = $("#unidadesPag");
  if (pag) {
    pag.innerHTML = "";
    pag.appendChild(
      _mkPaginacao(totalPag, pagAtual, (p) => {
        _uniPagina[bi] = p;
        renderUnidadesTorreAtual();
      }),
    );
  }
  renderUnidadesResultado();
  if (window.CemigMarcadores) {
    CemigMarcadores.aplicar(box.closest(".card") || box);
    CemigMarcadores.atualizarAvancar();
  }
}
// Ferramentas acima da lista de unidades. Aptos por andar / primeiro
// complemento e a geração de complementos vivem na etapa "Dados das torres"; a
// demanda não residencial é preenchida por UC (ver _mkUnidadeCard). Sobra aqui
// o botão "Replicar dados para todas unidades de todas as torres", que abre o
// gerenciador de regras — elas valem para o empreendimento inteiro, por isso o
// botão fica acima da lista (e não dentro de cada unidade, como na versão
// anterior).
function renderUnidadesTopo(bi) {
  const topo = $("#unidadesTopo");
  const b = state.blocos[bi];
  if (!topo || !b) return;
  topo.innerHTML = "";
  if (totalUcsEmpreendimentoF() > 1) {
    // Alinhado à ESQUERDA, logo abaixo dos chips de torre: a ação vale para o
    // empreendimento inteiro e abre a etapa, em vez de fechá-la como as ações
    // centradas dentro dos cards (.acao-central).
    const row = document.createElement("div");
    row.className = "unidades-replicar-acao";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-ghost btn-outlined-acao";
    btn.textContent = "Replicar dados para todas unidades de todas as torres";
    btn.addEventListener("click", () => abrirGerenciadorReplicacaoUC());
    row.appendChild(btn);
    topo.appendChild(row);
  }
}
function _mkUnidadeCard(bi, ui, modoCalc) {
  const b = state.blocos[bi];
  const u = b.ucs[ui];
  const chave = `${bi}:${ui}`;
  const aberta = _uniAberta[chave] === true;
  const bloco = document.createElement("div");
  bloco.className = "uc-colapsavel" + (aberta ? " is-open" : "");
  const head = document.createElement("button");
  head.type = "button";
  head.className = "uc-colapsavel-head";
  head.setAttribute("aria-expanded", aberta ? "true" : "false");
  head.innerHTML =
    `<span class="uc-head-info"><span class="uc-head-eyebrow">Torre ${b.nome || bi + 1}</span>` +
    `<span class="uc-colapsavel-titulo">Unidade consumidora <span class="carga-acc-badge">${ui + 1} de ${b.ucs.length}</span></span></span>` +
    `<span class="carga-acc-chevron uc-colapsavel-chevron" aria-hidden="true"></span>`;
  head.addEventListener("click", () => {
    btToggleExclusivo(_uniAberta, chave, !aberta);
    renderUnidadesTorreAtual();
  });
  bloco.appendChild(head);
  if (!aberta) return bloco;
  const corpo = document.createElement("div");
  corpo.className = "uc-colapsavel-corpo";
  const endereco = _blocoEndereco(u.complemento);
  corpo.appendChild(endereco);
  const grid = document.createElement("div");
  grid.className = "grid grid-2";
  if (modoCalc && !ucSemAlteracao(u)) grid.style.marginBottom = "24px";
  // Área comum do condomínio (academia, portaria, salão…), decidida pelo
  // complemento: "atividade principal" não se aplica e o campo não é montado.
  const areaComumNoRender = ehAreaComum(u.complemento);
  {
    const inpCompl = _inp(
      u.complemento,
      (v) => {
        u.complemento = v;
        endereco.querySelector(".uc-head-endereco").textContent =
          enderecoObraTxt(v);
      },
      { placeholder: "Ex: 101" },
    );
    // O complemento decide se a unidade é área comum (e some o campo
    // "Atividade principal"): re-renderiza ao SAIR do campo, não a cada tecla —
    // digitar "Portaria" não pode remontar o card no meio da palavra.
    inpCompl.addEventListener("blur", () => {
      if (ehAreaComum(u.complemento) !== areaComumNoRender)
        renderUnidadesTorreAtual();
    });
    const f = _campo("Complemento da unidade", inpCompl);
    if (b.ucs.length > 1) f.setAttribute("data-noopt", "");
    grid.appendChild(f);
  }
  {
    // Múltiplas torres: o tipo de solicitação é sempre Conexão Nova (travado).
    u.solicitacao = "Conexão Nova";
    const sel = _selectDe(["Conexão Nova"], u.solicitacao, () => {});
    sel.disabled = true;
    const f = _campo("Tipo de solicitação", sel, "field--float");
    f.setAttribute("data-noopt", "");
    grid.appendChild(f);
  }
  if (areaComumNoRender) {
    normalizarAreaComumUC(u);
  } else {
    const f = _campo(
      "Atividade principal",
      _selectDe(
        ["Residencial", "Comercial", "Industrial", "Rural"],
        u.atividade,
        (v) => {
          u.atividade = v;
          renderUnidadesTorreAtual();
        },
        true,
      ),
      "field--float",
    );
    f.setAttribute("data-noopt", "");
    grid.appendChild(f);
  }
  if (u.atividade === "Residencial") {
    const f = _campo(
      "Área privativa (m²)",
      _inp(
        u.area,
        (v) => {
          u.area = v;
          // A área não muda o método (só o valor A do ND-5.2) — atualiza
          // apenas os calculados, sem re-render (mantém o foco).
          atualizarUnidadesCalc();
        },
        { type: "number", placeholder: "Ex: 65" },
      ),
    );
    f.setAttribute("data-noopt", "");
    grid.appendChild(f);
  } else {
    const f = _campo(
      "Ramo de atividade",
      _inpRamo(u.ramo, (v) => (u.ramo = v)),
    );
    f.setAttribute("data-noopt", "");
    grid.appendChild(f);
    // Método ND-5.2 (torre com 4+ apartamentos residenciais): a demanda de cada
    // UC não residencial é informada individualmente pelo RT e somada na torre.
    if (!modoCalc && !ucSemAlteracao(u)) {
      const fd = _campo(
        "Demanda não residencial (kVA)",
        _inp(
          u.demandaNaoResidencial,
          (v) => {
            u.demandaNaoResidencial = v;
            atualizarUnidadesCalc();
          },
          { type: "number", placeholder: "0,0" },
        ),
      );
      fd.setAttribute("data-noopt", "");
      grid.appendChild(fd);
    }
  }
  if (u.solicitacao !== "Conexão Nova") {
    const f = _campo(
      "Instalação / Unidade Consumidora / Medidor",
      _inpInstalacao(u.instalacao, (v) => (u.instalacao = v)),
    );
    f.setAttribute("data-noopt", "");
    grid.appendChild(f);
  }
  const semAlt = ucSemAlteracao(u);
  // Carga prevista (kW) — substitui a antiga tabela de previsão de carga;
  // aparece no método 5.2 quando a torre tem mais de 3 UCs.
  if (!modoCalc && b.ucs.length > 3 && !semAlt) {
    const f = _campo(
      "Carga prevista da unidade (kW)",
      _inp(
        u.cargaPrevista,
        (v) => {
          u.cargaPrevista = v;
          atualizarUnidadesCalc();
        },
        { type: "number", placeholder: "0,0" },
      ),
    );
    f.setAttribute("data-noopt", "");
    grid.appendChild(f);
  }
  // Disjuntor da UC:
  //  • Método ND-5.2 (torre com 4+ apartamentos): escolha manual limitada ao
  //    Tripolar 250 A (não há cargas detalhadas para calcular).
  //  • Modo calculadora (até 3 UCs): calculado a partir das cargas declaradas,
  //    igual ao BT individual — radio com a lista adequada (cargas._disjuntores),
  //    renderizado abaixo das cargas (ver disjBox).
  if (!modoCalc || semAlt) {
    grid.appendChild(
      _campo(
        "Disjuntor da unidade",
        _selectDe(
          DISJ_COL.map((d) => d.fx),
          u.disjPara,
          (v) => {
            u.disjPara = v;
            atualizarUnidadesCalc();
          },
          true,
        ),
        "field--float",
      ),
    );
  }
  corpo.appendChild(grid);
  // ND-5.2 não calcula → a UC detalha as cargas como no BT individual
  // (mesma ilha montarCargasBT; demanda/carga da UC saem do cálculo). O
  // disjuntor da UC também é calculado pelas cargas (disjBox abaixo).
  if (modoCalc && !semAlt) {
    const cargasBox = document.createElement("div");
    corpo.appendChild(cargasBox);
    const disjBox = document.createElement("div");
    corpo.appendChild(disjBox);
    montarCargasBT(cargasBox, u, ui, () => {
      renderDisjUnidadeCalc(disjBox, u);
      atualizarUnidadesCalc();
    });
    renderDisjUnidadeCalc(disjBox, u);
  }
  bloco.appendChild(corpo);
  return bloco;
}
// Disjuntor da UC no modo calculadora (até 3 UCs): calculado pelas cargas
// declaradas, exatamente como no BT individual. Radio com a lista adequada
// (u.cargas._disjuntores); a escolha vai para u.disjPara. Se o valor guardado
// não estiver mais na lista (as cargas mudaram), volta ao menor adequado.
// `aoMudar` é o recalculo do fluxo que chamou (multi-torres ou coletivo).
function renderDisjUnidadeCalc(box, u, aoMudar) {
  const atualizar = aoMudar || atualizarUnidadesCalc;
  const lista = (u.cargas && u.cargas._disjuntores) || [];
  if (!(u.disjPara && lista.includes(u.disjPara))) u.disjPara = lista[0] || "";
  box.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "resultado-cargas divider";
  // Carga e demanda calculadas da própria UC, ao lado da escolha do disjuntor
  // (mesmo par de KPIs do rodapé da torre/agrupamento, na escala da unidade).
  const kpis = document.createElement("div");
  kpis.className = "resultado-kpis";
  kpis.append(
    _mkKpiCard(
      "Carga instalada da unidade",
      `${fmt2(num((u.cargas || {})._cargaKw))} kW`,
      "Soma da carga instalada declarada nas cargas desta unidade consumidora.",
    ),
    _mkKpiCard(
      "Demanda da unidade",
      `${fmt2(num((u.cargas || {})._demanda))} kVA`,
      "Demanda calculada a partir das cargas detalhadas desta unidade consumidora. É ela que dimensiona o disjuntor da unidade.",
    ),
  );
  wrap.appendChild(kpis);
  const card = document.createElement("div");
  card.className = "resultado-card resultado-disjuntor";
  card.innerHTML = `<div class="resultado-card-label">Disjuntor da unidade adequado de acordo com a seleção</div>`;
  if (lista.length) {
    const tg = document.createElement("div");
    tg.className = "toggle-group";
    lista.forEach((dj) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "toggle-btn" + (u.disjPara === dj ? " on" : "");
      btn.textContent = dj;
      btn.addEventListener("click", () => {
        u.disjPara = dj;
        renderDisjUnidadeCalc(box, u, aoMudar);
        atualizar();
      });
      tg.appendChild(btn);
    });
    card.appendChild(tg);
  } else {
    const hint = document.createElement("div");
    hint.className = "field-hint";
    hint.textContent = "Detalhe as cargas para ver o disjuntor adequado.";
    card.appendChild(hint);
  }
  wrap.appendChild(card);
  box.appendChild(wrap);
}
// Atualiza SÓ os derivados da torre selecionada (rodapé, KPIs, avisos) —
// mudanças estruturais (solicitação/atividade/qtd) re-renderizam a torre.
function atualizarUnidadesCalc() {
  autoSelecionarDisjTorres();
  renderUnidadesResultado();
  atualizarBlocosKpis();
}
// Rodapé da torre: Carga total + Demanda total + Disjuntor da torre (radio).
function renderUnidadesResultado() {
  const box = $("#unidadesResultado");
  const b = state.blocos[_uniTorre];
  if (!box || !b) return;
  const calcTorre = calcBlocoMultiTorres(b);
  box.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "resultado-cargas divider";
  const kpis = document.createElement("div");
  kpis.className = "resultado-kpis";
  kpis.append(
    _mkKpiCard(
      "Carga total da Torre",
      `${fmt2(cargaTotalTorre(b))} kW`,
      "A carga total é a soma da carga estimada para todos os apartamentos mais a carga necessária para as áreas de uso comum (como elevadores e iluminação externa).",
    ),
    _mkKpiCard(
      "Demanda das UCs da torre",
      `${fmt2(calcTorre.demandaUcs)} kVA`,
      "Demanda das unidades consumidoras da torre (cruzando o tamanho médio das moradias com o número de unidades). É esta demanda que dimensiona o disjuntor da torre. O combate a incêndio/condomínio tem demanda e disjuntor próprios, informados na etapa das torres.",
    ),
  );
  wrap.appendChild(kpis);
  const regra = disjGeralTorreRegra(b);
  if (!regra.obrigatorio) {
    // Regra de disjuntor: no modo calculadora, sem bipolar > 63 A e com no
    // máximo uma UC tripolar, a torre dispensa o disjuntor geral (proteção
    // coletiva). O disjuntor da torre fica em branco (b.disjGeral = "") e a
    // etapa não o exige. Sem disjuntor obrigatório, o card é apenas ocultado
    // (nada de aviso) — restam só os KPIs.
    b.disjGeral = "";
    box.appendChild(wrap);
    return;
  }
  const card = document.createElement("div");
  card.className = "resultado-card resultado-disjuntor";
  card.innerHTML = `<div class="resultado-card-label">Disjuntor da torre adequado de acordo com a seleção</div>`;
  const ops = opcoesDisjGeralTorre(b);
  if (ops.length) {
    const tg = document.createElement("div");
    tg.className = "toggle-group";
    ops.forEach((dj) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "toggle-btn" + ((b.disjGeral || ops[0]) === dj ? " on" : "");
      btn.textContent = dj;
      btn.addEventListener("click", () => {
        b.disjGeral = dj;
        renderUnidadesResultado();
      });
      tg.appendChild(btn);
    });
    card.appendChild(tg);
  } else {
    const hint = document.createElement("div");
    hint.className = "field-hint";
    hint.textContent =
      "Informe os disjuntores e a previsão de carga das unidades para ver o disjuntor adequado.";
    card.appendChild(hint);
  }
  wrap.appendChild(card);
  box.appendChild(wrap);
}

/* ============================================================
   Etapa "Dados do projeto" (múltiplas torres) — KPIs de carga/demanda
   totais, ponto de disponibilização da energia, disjuntores gerais do
   empreendimento e do condomínio, e a tabela de disjuntores de prumada
   (faixa de torres → disjuntor). Toda a hierarquia é auto-sugerida
   (menor disjuntor válido) e validada por validacaoHierarquiaProjeto.
   ============================================================ */
// Grupo de opções tipo radio (reaproveita .toggle-group/.toggle-btn). `onSel`
// recebe o valor escolhido; re-render fica por conta de quem chama.
function _radioGrupo(container, opcoes, valor, onSel) {
  container.innerHTML = "";
  opcoes.forEach((op) => {
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", valor === op ? "true" : "false");
    b.className = "toggle-btn" + (valor === op ? " on" : "");
    b.textContent = op;
    b.addEventListener("click", () => onSel(op));
    container.appendChild(b);
  });
}
// Select de disjuntor da hierarquia: mostra as opções sugeridas; se o valor
// salvo estiver fora delas (ex.: hierarquia mudou), acrescenta-o para não
// sumir silenciosamente — a validação sinaliza a inconsistência.
function _selectDisjHierarquia(opcoes, valor, onChange) {
  const lista = opcoes.slice();
  if (valor && !lista.includes(valor)) lista.push(valor);
  return _selectDe(lista, valor, onChange, true);
}
function renderDadosProjeto() {
  const box = $("#projetoPrumadasBox");
  if (!box) return; // etapa não montada (fluxo coletivo)
  autoSelecionarDisjTorres();
  autoSelecionarDisjProjeto();

  // KPIs: carga e demanda totais de todas as torres.
  const kpis = $("#projetoKpis");
  if (kpis) {
    const mkKpi = (label, valor, titulo) =>
      `<div class="resultado-card">` +
      `<span class="resultado-card-info cmg-hint" tabindex="0" role="img" aria-label="${label}: ajuda" data-hint="${titulo}"><img class="field-info" src="../imgs/info.svg" alt="" aria-hidden="true" /></span>` +
      `<div class="resultado-card-label">${label}</div>` +
      `<div class="resultado-card-valor">${valor}</div></div>`;
    kpis.innerHTML =
      mkKpi(
        "Carga total de todas as torres",
        `${fmt2(cargaTotalEmpreendimentoF())} kW`,
        "Soma da carga prevista de todas as torres do empreendimento.",
      ) +
      mkKpi(
        "Demanda total de todas as torres",
        `${fmt2(demandaTotalGeralF())} kVA`,
        "O cálculo da demanda total da torre é feito cruzando o tamanho médio das moradias com o número total de unidades.",
      );
  }

  // Onde a energia deverá ser disponibilizada (radio empilhado).
  const OPCS_DISP = [
    "Na portaria e no interior do condomínio (alimentação das torres e áreas comuns)",
    "Apenas na portaria do condomínio",
  ];
  // Default: primeira opção marcada.
  if (!state.atend.disponibilizacaoEnergia)
    state.atend.disponibilizacaoEnergia = OPCS_DISP[0];
  const disp = $("#projetoDisponibilizacao");
  if (disp)
    _radioGrupo(
      disp,
      OPCS_DISP,
      state.atend.disponibilizacaoEnergia,
      (v) => {
        state.atend.disponibilizacaoEnergia = v;
        renderDadosProjeto();
      },
    );

  // Disjuntores gerais do empreendimento e do condomínio: só quando a energia
  // é disponibilizada apenas na portaria do condomínio (segunda opção).
  const gerais = $("#projetoDisjGerais");
  if (gerais) {
    gerais.innerHTML = "";
    const soPortaria = state.atend.disponibilizacaoEnergia === OPCS_DISP[1];
    gerais.style.display = soPortaria ? "" : "none";
    if (soPortaria) {
    const fEmpr = _campo(
      "Disjuntor geral do empreendimento",
      _selectDisjHierarquia(
        opcoesDisjEmpreendimentoF(),
        state.atend.disjEmpreendimento,
        (v) => {
          state.atend.disjEmpreendimento = v;
          renderDadosProjeto();
        },
      ),
      "field--float",
    );
    fEmpr.setAttribute("data-noopt", "");
    gerais.appendChild(fEmpr);
    const fCond = _campo(
      "Disjuntor geral do condomínio",
      _selectDisjHierarquia(
        opcoesDisjCondominioF(),
        state.atend.disjCondominio,
        (v) => {
          state.atend.disjCondominio = v;
        },
      ),
      "field--float",
    );
    fCond.setAttribute("data-noopt", "");
    gerais.appendChild(fCond);
    }
  }

  // O condomínio tem disjuntor de prumada? (Sim/Não)
  const temP = $("#projetoTemPrumada");
  if (temP)
    _radioGrupo(temP, ["Sim", "Não"], state.atend.temPrumada, (v) => {
      state.atend.temPrumada = v;
      // Garante ao menos uma linha ao ligar; auto-sugere ao mudar o nível.
      if (v === "Sim" && !(state.atend.prumadas || []).length)
        state.atend.prumadas = [prumadaPadrao()];
      autoSelecionarDisjProjeto();
      renderDadosProjeto();
    });

  // Tabela de prumadas (só quando "Sim").
  box.innerHTML = "";
  if (state.atend.temPrumada === "Sim") {
    const intro = document.createElement("p");
    intro.className = "card-sub";
    intro.style.marginTop = "12px";
    intro.textContent =
      "Descreva a distribuição dos disjuntores pelas torres (ex: disjuntor Tripolar 100A para as torres 1 a 5 e disjuntor Tripolar 150A para as torres 6 a 8).";
    box.appendChild(intro);
    box.appendChild(_mkPrumadasTabela());
  }

  // Avisos da hierarquia (faixas inválidas / disjuntores fora da regra).
  const avisos = $("#projetoAvisos");
  if (avisos) {
    const erros = validacaoHierarquiaProjeto();
    if (erros.length) {
      avisos.style.display = "";
      avisos.innerHTML =
        `<strong>Reveja a hierarquia de proteção:</strong>` +
        `<ul style="margin:6px 0 0;padding-left:18px">${erros
          .map((e) => `<li>${e}</li>`)
          .join("")}</ul>`;
    } else {
      avisos.style.display = "none";
      avisos.innerHTML = "";
    }
  }
  if (window.CemigMarcadores) {
    CemigMarcadores.aplicar(box.closest(".card") || box);
    CemigMarcadores.atualizarAvancar();
  }
}
// Tabela "Torre inicial | Torre final | Disjuntor" + "Adicionar prumada".
// Reaproveita o grid .cmg-pav-* das faixas de pavimento.
function _mkPrumadasTabela() {
  const nBlocos = state.blocos.length;
  const tabela = document.createElement("div");
  tabela.className = "cmg-pav-tabela";
  tabela.style.marginTop = "12px";
  const head = document.createElement("div");
  head.className = "cmg-pav-linha cmg-pav-head";
  ["Torre inicial", "Torre final", "Disjuntor"].forEach((t) => {
    const c = document.createElement("div");
    c.className = "cmg-pav-cel";
    c.textContent = t;
    head.appendChild(c);
  });
  head.appendChild(
    Object.assign(document.createElement("div"), {
      className: "cmg-pav-cel cmg-pav-cel-acao",
    }),
  );
  tabela.appendChild(head);

  const prumadas = state.atend.prumadas || (state.atend.prumadas = []);
  // Torres já cobertas pelas prumadas ANTERIORES a `idx` (para não oferecer
  // torres repetidas na inicial): a inicial só lista torres ainda livres.
  const torresAntesDe = (idx) => {
    const usadas = new Set();
    for (let k = 0; k < idx; k++) {
      const a = parseInt(prumadas[k].torreIni, 10);
      const b = parseInt(prumadas[k].torreFim, 10);
      if (Number.isFinite(a) && Number.isFinite(b))
        for (let t = a; t <= b; t++) usadas.add(t);
    }
    return usadas;
  };
  // Dropdown de torre (inicial/final) com filtro automático: recebe a lista de
  // números de torre permitidos e o valor atual.
  const campoTorre = (permitidos, valor, onChange) => {
    const cel = document.createElement("div");
    cel.className = "cmg-pav-cel";
    const opcoes = permitidos.map(String);
    cel.appendChild(_selectDe(opcoes, valor ? String(valor) : "", onChange, true));
    return cel;
  };
  prumadas.forEach((p, i) => {
    const linha = document.createElement("div");
    linha.className = "cmg-pav-linha";
    // Torre inicial: torres 1..nBlocos que ainda não foram usadas por prumadas
    // anteriores (mantém a atual, se já selecionada).
    const usadasAntes = torresAntesDe(i);
    const iniAtual = parseInt(p.torreIni, 10);
    const permIni = [];
    for (let t = 1; t <= nBlocos; t++)
      if (!usadasAntes.has(t) || t === iniAtual) permIni.push(t);
    // Torre final: de torreIni (se válida) até nBlocos.
    const baseFim = Number.isFinite(iniAtual) ? iniAtual : 1;
    const permFim = [];
    for (let t = baseFim; t <= nBlocos; t++) permFim.push(t);
    linha.appendChild(
      campoTorre(permIni, p.torreIni, (v) => {
        p.torreIni = v;
        // Se a final ficou menor que a inicial, realinha.
        if (parseInt(p.torreFim, 10) < parseInt(v, 10)) p.torreFim = v;
        autoSelecionarDisjProjeto();
        renderDadosProjeto();
      }),
    );
    linha.appendChild(
      campoTorre(permFim, p.torreFim, (v) => {
        p.torreFim = v;
        autoSelecionarDisjProjeto();
        renderDadosProjeto();
      }),
    );
    const celDisj = document.createElement("div");
    celDisj.className = "cmg-pav-cel";
    celDisj.appendChild(
      _selectDisjHierarquia(opcoesDisjPrumadaF(p), p.disj, (v) => {
        p.disj = v;
        autoSelecionarDisjProjeto();
        renderDadosProjeto();
      }),
    );
    linha.appendChild(celDisj);
    // Remover (só quando há mais de uma prumada — sempre resta ao menos uma).
    const celAcao = document.createElement("div");
    celAcao.className = "cmg-pav-cel cmg-pav-cel-acao";
    if (prumadas.length > 1) {
      const btnDel = document.createElement("button");
      btnDel.type = "button";
      btnDel.className = "cmg-pav-remover";
      btnDel.setAttribute("aria-label", `Remover prumada ${i + 1}`);
      btnDel.innerHTML =
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
      btnDel.addEventListener("click", () => {
        prumadas.splice(i, 1);
        renderDadosProjeto();
      });
      celAcao.appendChild(btnDel);
    }
    linha.appendChild(celAcao);
    tabela.appendChild(linha);
  });

  const rodape = document.createElement("div");
  rodape.className = "cmg-pav-adicionar-wrap";
  const btnAdd = document.createElement("button");
  btnAdd.type = "button";
  btnAdd.className = "btn btn-ghost btn-outlined-acao cmg-pav-adicionar";
  btnAdd.innerHTML =
    '<span class="cmg-pav-mais" aria-hidden="true">+</span> Adicionar prumada';
  btnAdd.addEventListener("click", () => {
    prumadas.push(prumadaPadrao());
    autoSelecionarDisjProjeto();
    renderDadosProjeto();
  });
  rodape.appendChild(btnAdd);
  tabela.appendChild(rodape);
  return tabela;
}

/* ============================================================
   Prévia & PDF (porte dos ramos coletivo/multi de
   views/revisar.js + validacaoObrigatorios de app.js:750-823)
   ============================================================ */
// Índices das etapas para os lápis (após o pruning): coletivo e condomínio
// têm 8 páginas — tipo=1, empr=2 e o miolo varia. No condomínio a etapa "Dados
// do projeto" vem antes da Correspondência; no coletivo a Correspondência é a
// penúltima antes de obs/prévia.
const PG = MULTI
  ? { tipo: 1, empr: 2, blocos: 3, unidades: 4, projeto: 5, corr: 6 }
  : { tipo: 1, empr: 2, ucs: 3, cargas: 4, corr: 5 };
function validacaoObrigatoriosColetivo() {
  const faltando = [];
  const req = (v, label) => {
    if (!String(v == null ? "" : v).trim()) faltando.push(label);
  };
  const p = state.prop,
    c = state.corr,
    o = state.obra;
  req(
    p.nome,
    pessoaFisica() ? "Nome completo do proprietário" : "Nome para contato",
  );
  // Condomínio de torres: a razão social do empreendimento é campo próprio.
  if (MULTI) req(p.cliente, "Cliente / Razão Social do empreendimento");
  req(p.cpfCnpj, "CPF/CNPJ");
  req(p.email, "E-mail");
  req(p.celular, "Celular");
  if (c.alternativa === "Outro e-mail")
    req(c.outroEmail, "E-mail alternativo da fatura");
  else if (c.alternativa === "Endereço novo") {
    req(c.cep, "CEP de correspondência");
    req(c.rua, "Rua/Av. de correspondência");
    req(c.num, "Nº de correspondência");
    req(c.bairro, "Bairro de correspondência");
    req(c.municipio, "Município de correspondência");
  } else if (c.alternativa === "Conta globalizada")
    req(c.contaGlobal, "Conta globalizada");
  req(o.endereco, "Endereço da obra");
  req(o.num, "Nº da obra");
  req(o.bairro, "Bairro da obra");
  req(o.cidade, "Cidade da obra");
  req(o.cep, "CEP da obra");
  req(o.art, "Nº ART/TRT de Projeto");
  if (!(demandaTotalGeralF() > 0)) faltando.push("Demanda das UCs");
  // Demanda geral não residencial: exigida apenas no método 5.2 (no modo
  // calculadora as UCs não residenciais detalham as próprias cargas).
  if (!MULTI && !modoCalculadoraF() && temUCNaoResidencialF())
    req(
      state.atend.demandaNaoResidencial,
      "Demanda geral não residencial (kVA)",
    );
  // Método 5.2 sem ND-5.2 calculando = área média fora da tabela (vazia ou
  // acima de 1000 m²) — a demanda residencial está zerada até corrigir.
  if (!MULTI && !modoCalculadoraF() && !nd52InfoF().nd52)
    faltando.push(
      "Área dos apartamentos residenciais (média ponderada entre 1 e 1000 m²)",
    );
  if (!MULTI && modoCalculadoraF())
    state.ucBlocos.forEach((u, ui) => {
      if (!ucSemAlteracao(u) && !(num((u.cargas || {})._demanda) > 0))
        faltando.push(
          `Cargas da ${u.identificacao || `UC ${ui + 1}`} (demanda calculada)`,
        );
    });
  if (MULTI)
    state.blocos.forEach((b, bi) => {
      const cb = calcBlocoMultiTorres(b);
      if (!cb.modoCalculadora)
        (b.ucs || []).forEach((u, ui) => {
          if (
            !ucSemAlteracao(u) &&
            u.atividade &&
            u.atividade !== "Residencial" &&
            !String(u.demandaNaoResidencial || "").trim()
          )
            faltando.push(
              `Demanda não residencial da ${u.identificacao || `UC ${ui + 1}`} — Torre ${b.nome || bi + 1} (kVA)`,
            );
        });
      if (!cb.modoCalculadora && !cb.nd52)
        faltando.push(
          `Área dos apartamentos residenciais — Torre ${b.nome || bi + 1} (média ponderada entre 1 e 1000 m²)`,
        );
      if (cb.modoCalculadora)
        (b.ucs || []).forEach((u, ui) => {
          if (!ucSemAlteracao(u) && !(num((u.cargas || {})._demanda) > 0))
            faltando.push(
              `Cargas da ${u.identificacao || `UC ${ui + 1}`} — Torre ${b.nome || bi + 1}`,
            );
        });
    });
  // Número de instalação/UC fora do padrão (REN ANEEL 1.095/2024) — as UCs
  // são re-renderizadas, então o gate do data-fmt não basta na exportação.
  const _checaInst = (u, rotulo) => {
    const r = validarInstalacaoUC(u.instalacao);
    if (!r.valido)
      faltando.push(`${rotulo}: Instalação / UC / Medidor — ${r.msg}`);
  };
  if (MULTI)
    state.blocos.forEach((b, bi) =>
      (b.ucs || []).forEach((u, ui) =>
        _checaInst(
          u,
          `${u.identificacao || `UC ${ui + 1}`} — Torre ${b.nome || bi + 1}`,
        ),
      ),
    );
  else
    state.ucBlocos.forEach((u, ui) =>
      _checaInst(u, u.identificacao || `UC ${ui + 1}`),
    );
  if (hibridoF() && !validacaoHibridoF().ok)
    faltando.push("Pendências do atendimento híbrido");
  if (o.restricaoAmbiental === "Sim" && !o.restricaoAceite)
    faltando.push("Declaração de ciência da restrição ambiental");
  // Hierarquia de proteção do empreendimento (etapa "Dados do projeto"): os
  // níveis são opcionais, mas os configurados precisam respeitar a regra do
  // disjuntor estritamente maior (ver validacaoHierarquiaProjeto).
  if (MULTI)
    validacaoHierarquiaProjeto().forEach((e) =>
      faltando.push(`Dados do projeto — ${e}`),
    );
  return { ok: faltando.length === 0, faltando };
}
// Painel de uma torre na prévia (múltiplas torres): cabeçalho "Torre X (n de N)",
// os campos da torre (identificação, quantidades, complemento, demanda/disjuntor
// do condomínio e da torre) e a tabela de UCs paginada. Os lápis levam de volta
// às etapas de edição — dados da torre → PG.blocos, UCs → PG.unidades.
function _mkPreviaTorre(b, bi) {
  const painel = document.createElement("div");
  painel.className = "previa-torre";
  const ucs = b.ucs || [];
  const cb = calcBlocoMultiTorres(b);
  const demandaTorre = cb.demandaUcs + num(b.demandaIncendio);

  // Cabeçalho: "Torre <nome>" + chip "bi+1 de N"
  const head = document.createElement("div");
  head.className = "previa-torre-head";
  head.innerHTML =
    `<span class="previa-torre-titulo">Torre ${b.nome || bi + 1}</span>` +
    `<span class="previa-torre-chip">${bi + 1} de ${state.blocos.length}</span>`;
  painel.appendChild(head);

  // Cards de resumo da torre (mesmo trio da seção "Dados do empreendimento"):
  // Modalidade, Unidades consumidoras e Demanda total.
  const cards = document.createElement("div");
  cards.className = "previa-cards";
  cards.innerHTML =
    pvCardBT("Modalidade", `Torre · ${ucs.length} unidade(s)`) +
    pvCardBT("Unidades consumidoras", String(ucs.length)) +
    pvCardBT("Demanda total", fmt2(demandaTorre) + " kVA");
  painel.appendChild(cards);

  // Campos da torre (mesma ordem da etapa de edição).
  const grid = document.createElement("div");
  grid.className = "previa-grid";
  grid.innerHTML =
    pvCampoBT("Identificação da torre", b.nome || String(bi + 1), PG.blocos) +
    pvCampoBT(
      "Quantidade de unidades na torre",
      String(b.qtdUCs || ucs.length || 0),
      PG.blocos,
    ) +
    pvCampoBT("Quantidade de unidades por andar", b.aptosPorAndar, PG.blocos) +
    pvCampoBT("Primeiro complemento", b.complInicial, PG.blocos) +
    pvCampoBT(
      "Demanda do condomínio",
      b.demandaIncendio ? fmt2(b.demandaIncendio) + " kVA" : "",
      PG.blocos,
    ) +
    pvCampoBT("Disjuntor do condomínio", b.disjIncendio, PG.blocos) +
    pvCampoBT("Demanda da torre", fmt2(demandaTorre) + " kVA", PG.blocos) +
    pvCampoBT(
      "Disjuntor da torre",
      // Regra de disjuntor: torre que dispensa o geral aparece como "Dispensado".
      disjGeralTorreObrigatorio(b) ? b.disjGeral : "Dispensado",
      PG.blocos,
    );
  painel.appendChild(grid);

  // Tabela de UCs paginada.
  const tabelaWrap = document.createElement("div");
  tabelaWrap.className = "previa-tabela-wrap";
  const pag = document.createElement("div");
  pag.className = "previa-tabela-pag";
  const renderTabela = () => {
    const totalPag = Math.max(1, Math.ceil(ucs.length / ITENS_POR_PAGINA));
    let atual = _previaTorrePag[bi] || 0;
    if (atual >= totalPag) atual = _previaTorrePag[bi] = totalPag - 1;
    const ini = atual * ITENS_POR_PAGINA;
    const linhas = ucs
      .slice(ini, ini + ITENS_POR_PAGINA)
      .map((u, k) => {
        const idx = ini + k;
        const carga =
          u.cargaPrevista != null && String(u.cargaPrevista).trim() !== ""
            ? fmt2(u.cargaPrevista)
            : "—";
        return (
          `<tr>` +
          `<td>${u.identificacao || `UC ${idx + 1}`}</td>` +
          `<td>${u.complemento || "—"}</td>` +
          `<td>${u.solicitacao || "—"}</td>` +
          `<td>${u.atividade || "—"}</td>` +
          `<td>${carga}</td>` +
          `<td class="previa-tabela-disj">${u.disjPara || "—"}` +
          `<button type="button" class="previa-edit" title="Editar" aria-label="Editar UC ${idx + 1}" onclick="goTo(${PG.unidades}, true)"></button>` +
          `</td>` +
          `</tr>`
        );
      })
      .join("");
    tabelaWrap.innerHTML =
      `<table class="previa-tabela"><thead><tr>` +
      `<th>Unidade</th><th>Complemento</th><th>Solicitação</th><th>Atividade</th>` +
      `<th>Carga prevista (kW)</th><th>Disjuntor</th>` +
      `</tr></thead><tbody>${linhas}</tbody></table>`;
    pag.innerHTML = "";
    pag.appendChild(
      _mkPaginacao(totalPag, atual, (pp) => {
        _previaTorrePag[bi] = pp;
        renderTabela();
      }),
    );
  };
  renderTabela();
  painel.append(tabelaWrap, pag);
  return painel;
}
function renderPreviaColetivo() {
  const box = $("#previaConteudo");
  if (!box) return;
  // Aquecimento do jsPDF (carga sob demanda): chegar nesta etapa é o melhor
  // sinal de que o PDF vem a seguir. Sem await — não bloqueia a renderização,
  // e o clique em Exportar encontra a lib pronta.
  window.CemigLibs.jspdf().catch(() => {});
  const p = state.prop,
    c = state.corr,
    o = state.obra;
  const pf = pessoaFisica();
  const emailFatura =
    c.alternativa === "E-mail informado"
      ? p.email
      : c.alternativa === "Outro e-mail"
        ? c.outroEmail
        : c.alternativa;
  const modalidadeTexto = MULTI
    ? `Múltiplas Torres · ${state.blocos.length} torre(s)`
    : "Coletivo — Agrupamento com Proteção Geral (APR Web)";
  let html = `<div class="previa-secao"><h4 class="previa-secao-titulo">${MULTI ? "Dados para contato" : "Dados do proprietário"}</h4><div class="previa-grid">`;
  html += pvCampoBT("Nome", p.nome, PG.tipo, true);
  html += pvCampoBT("E-mail", p.email, PG.tipo);
  html += pvCampoBT("Celular", p.celular, PG.tipo);
  // No múltiplas torres, CPF/CNPJ é mostrado em "Dados do empreendimento".
  if (!MULTI) html += pvCampoBT(pf ? "CPF" : "CNPJ", p.cpfCnpj, PG.empr);
  if (!MULTI && pf) {
    html += pvCampoBT("Filiação", p.filiacao);
    html += pvCampoBT("RG", p.rg);
    html += pvCampoBT("Data de nascimento", p.nasc);
  }
  html += `</div></div><hr class="previa-divider" />`;
  // Correspondência vai para o FIM da prévia em todos os fluxos (ordem da
  // tela-alvo); montada aqui e anexada ao final do html mais abaixo.
  const corrHtml =
    `<div class="previa-secao"><h4 class="previa-secao-titulo">Correspondência</h4><div class="previa-grid">` +
    pvCampoBT(
      "E-mail para receber a fatura da torre/condomínio",
      emailFatura,
      PG.corr,
    ) +
    pvCampoBT(
      "Data de vencimento da fatura",
      c.vencimento ? "Todo dia " + c.vencimento : "",
      PG.corr,
    ) +
    `</div></div>`;
  // Resumo do atendimento
  const modalidadeCard =
    modalidadeTexto +
    (!MULTI
      ? ` · ${state.atend.solicitacao || "—"} · ${state.atend.escopo || "—"}`
      : "") +
    (!MULTI && state.atend.disjuntorGeral
      ? ` · Disjuntor geral: ${state.atend.disjuntorGeral}`
      : "");
  html += `<div class="previa-secao"><h4 class="previa-secao-titulo">${MULTI ? "Dados do empreendimento" : "Resumo do atendimento"}</h4><div class="previa-cards">`;
  html += pvCardBT("Modalidade", modalidadeCard);
  html += pvCardBT(
    "Unidades consumidoras",
    String(MULTI ? totalUcsEmpreendimentoF() : state.ucBlocos.length),
  );
  html += pvCardBT("Demanda total", fmt2(demandaTotalGeralF()) + " kVA");
  html += `</div><div class="previa-grid">`;
  if (MULTI) {
    // Múltiplas torres: campos do empreendimento como na prévia-alvo (razão
    // social/CNPJ, ART, endereço completo, e as perguntas de rede/padrão).
    html += pvCampoBT(
      "Cliente / Razão Social do empreendimento",
      p.cliente,
      PG.empr,
      true,
    );
    html += pvCampoBT(pf ? "CPF" : "CNPJ", p.cpfCnpj, PG.empr);
    html += pvCampoBT("Nº ART/TRT do projeto", o.art, PG.empr);
    html += pvCampoBT("Área do empreendimento", o.localizacao, PG.empr);
    html += pvCampoBT("CEP", o.cep, PG.empr);
    html += pvCampoBT("Endereço", o.endereco, PG.empr);
    html += pvCampoBT("Número", o.num, PG.empr);
    html += pvCampoBT("Bairro", o.bairro, PG.empr);
    html += pvCampoBT("Cidade / Município", o.cidade, PG.empr);
    html += pvCampoBT("Estado", o.estado, PG.empr);
    html += pvCampoBT(
      "Distância do padrão até a rede Cemig inferior a 30m?",
      o.distMenor30,
      PG.empr,
    );
    html += pvCampoBT(
      "O padrão está pronto para ser ligado?",
      o.prontoLigar,
      PG.empr,
    );
    html += pvCampoBT(
      "Tipo de rede BT que atende o local",
      o.tipoRede,
      PG.empr,
    );
  } else {
    html += pvCampoBT(
      "Endereço",
      `${o.endereco || "—"}, ${o.num || "s/n"}`,
      PG.empr,
    );
    html += pvCampoBT(
      "Cidade / UF",
      `${o.cidade || "—"} / ${o.estado || "—"}`,
      PG.empr,
    );
    html += pvCampoBT("Localização", o.localizacao, PG.empr);
    html += pvCampoBT(
      "Coordenada",
      [o.lat, o.lng].filter(Boolean).join(", "),
      PG.empr,
    );
  }
  html += `</div></div>`;
  if (MULTI) {
    // Seção "Dados das torres": card "Quantidade de torres" + um painel por
    // torre (campos + tabela paginada de UCs). Montada como DOM depois de fixar
    // o innerHTML, pois a tabela de cada torre pagina interativamente.
    html += `<hr class="previa-divider" /><div class="previa-secao"><h4 class="previa-secao-titulo">Dados das torres</h4><div class="previa-grid">`;
    html += pvCampoBT(
      "Quantidade de torres",
      String(state.blocos.length),
      PG.blocos,
    );
    html += `</div><div id="previaTorresMount"></div></div>`;
    // Seção "Dados do projeto": disponibilização da energia, disjuntores gerais
    // e prumadas — só os níveis efetivamente configurados.
    html += `<hr class="previa-divider" /><div class="previa-secao"><h4 class="previa-secao-titulo">Dados do projeto</h4><div class="previa-grid">`;
    html += pvCampoBT(
      "Onde a energia deverá ser disponibilizada",
      state.atend.disponibilizacaoEnergia,
      PG.projeto,
      true,
    );
    html += pvCampoBT(
      "Disjuntor geral do empreendimento",
      state.atend.disjEmpreendimento,
      PG.projeto,
    );
    html += pvCampoBT(
      "Disjuntor geral do condomínio",
      state.atend.disjCondominio,
      PG.projeto,
    );
    html += pvCampoBT(
      "Disjuntor de prumada?",
      state.atend.temPrumada,
      PG.projeto,
    );
    html += `</div>`;
    if (state.atend.temPrumada === "Sim") {
      const linhasPrumada = (state.atend.prumadas || [])
        .map((p, i) => {
          const faixa =
            p.torreIni && p.torreFim
              ? `Torres ${p.torreIni} a ${p.torreFim}`
              : "—";
          return (
            `<tr><td>Prumada ${i + 1}</td><td>${faixa}</td>` +
            `<td class="previa-tabela-disj">${p.disj || "—"}` +
            `<button type="button" class="previa-edit" title="Editar" aria-label="Editar prumada ${i + 1}" onclick="goTo(${PG.projeto}, true)"></button>` +
            `</td></tr>`
          );
        })
        .join("");
      html +=
        `<div class="previa-tabela-wrap"><table class="previa-tabela"><thead><tr>` +
        `<th>Prumada</th><th>Torres</th><th>Disjuntor</th>` +
        `</tr></thead><tbody>${linhasPrumada}</tbody></table></div>`;
    }
    html += `</div>`;
    // Correspondência ao fim (ordem da tela-alvo).
    html += `<hr class="previa-divider" />` + corrHtml;
  } else {
    html += `<hr class="previa-divider" /><div class="previa-secao"><h4 class="previa-secao-titulo">Previsão de carga e UCs</h4>`;
    html += `<div class="preview-item"><span class="v">Total ${fmt2(prevTotalKwF())} kW · Demanda ${fmt2(demandaTotalGeralF())} kVA</span></div>`;
    state.ucBlocos.forEach((u, ui) => {
      html += `<div class="preview-item" style="display:flex;justify-content:space-between"><span class="v">${u.identificacao || `UC ${ui + 1}`} · ${u.atividade || "—"} · ${u.solicitacao} ${u.complemento ? "· " + u.complemento : ""}</span><span style="color:var(--verde);font-weight:700">${u.disjPara || "—"}</span></div>`;
    });
    html += `</div>`;
    // Correspondência ao fim (ordem da tela-alvo).
    html += `<hr class="previa-divider" />` + corrHtml;
  }
  box.innerHTML = html;
  // Painéis das torres (múltiplas torres): DUAS paginações — a externa troca a
  // torre exibida (uma por vez); a interna (dentro do painel) pagina as UCs da
  // torre em blocos de 10 (ver _mkPreviaTorre).
  if (MULTI) {
    const mount = $("#previaTorresMount");
    if (mount) {
      const nTorres = state.blocos.length;
      const renderTorreExterna = () => {
        if (_previaTorreExterna >= nTorres) _previaTorreExterna = nTorres - 1;
        if (_previaTorreExterna < 0) _previaTorreExterna = 0;
        const bi = _previaTorreExterna;
        mount.innerHTML = "";
        mount.appendChild(_mkPreviaTorre(state.blocos[bi], bi));
        // Paginação externa (troca de torre) abaixo do painel.
        const pagExt = document.createElement("div");
        pagExt.appendChild(
          _mkPaginacao(nTorres, bi, (p) => {
            _previaTorreExterna = p;
            renderTorreExterna();
          }),
        );
        mount.appendChild(pagExt);
      };
      renderTorreExterna();
    }
  }
  // Documentos necessários
  const docsBox = $("#docsNecessarios");
  if (docsBox) {
    const docs = listaDocumentosBT({
      pessoaFisica: pf,
      pessoaJuridica: pessoaJuridica(),
      coletivo: coletivoF(),
      multiTorres: MULTI,
      hibrido: hibridoF(),
      obra: o,
      atend: state.atend,
      ucsDet: [],
      ucBlocos: state.ucBlocos,
      blocos: state.blocos,
      exibeTermoGrupoB: false,
      demandaTotalGeral: demandaTotalGeralF(),
      temMotoresPesados: false,
    });
    docsBox.innerHTML = docs
      .map(
        (dd) => `<div class="preview-item"><span class="v">${dd}</span></div>`,
      )
      .join("");
  }
  // Pendências + botão exportar
  const v = validacaoObrigatoriosColetivo();
  const faltasBox = $("#previaFaltas");
  if (faltasBox) {
    let html2 = "";
    if (hibridoF() && !validacaoHibridoF().ok)
      html2 +=
        '<div class="alert alert-warn" style="margin-bottom:12px">Corrija as pendências do atendimento híbrido (aba Dados das unidades) para liberar a exportação do PDF.</div>';
    if (!v.ok)
      html2 += `<div class="alert alert-warn" style="margin-bottom:12px"><strong>Preencha os campos obrigatórios para liberar o PDF:</strong><ul style="margin:6px 0 0 18px">${v.faltando.map((f) => `<li>${f}</li>`).join("")}</ul></div>`;
    faltasBox.innerHTML = html2;
  }
  const btn = $("#btnExportarPDF");
  if (btn) btn.disabled = !v.ok;
}
async function exportarPdfBT() {
  const v = validacaoObrigatoriosColetivo();
  if (!v.ok) {
    renderPreviaColetivo();
    return;
  }
  // jsPDF é carregado sob demanda (shared/js/libs.js). O aquecimento na etapa
  // de prévia normalmente já resolveu isto; o `catch` vazio deixa o guard de
  // gerarPdfDoc dar o alerta de sempre caso a rede tenha falhado.
  await window.CemigLibs.jspdf().catch(() => {});
  // Paridade com o React (app.js:853-872): `coletivo` é a flag runtime
  // disjGeral==="Sim" — verdadeira TAMBÉM no multiTorres (pdf.js imprime a
  // ART por ela).
  gerarPdfDoc({
    multiTorres: MULTI,
    coletivo: coletivoF(),
    // ND-5.2 não calculou: as UCs detalharam as cargas (ND-5.1) e o PDF
    // imprime carga/demanda calculadas por UC.
    modoCalculadora: !MULTI && modoCalculadoraF(),
    atend: state.atend,
    prop: state.prop,
    corr: state.corr,
    obra: state.obra,
    prevTotalKw: prevTotalKwF(),
    demandaPrevTotal: demandaPrevTotalF(),
    trocaDisjGeral: trocaDisjGeralF(),
    hibrido: hibridoF(),
    ucsDet: [],
    ucBlocos: state.ucBlocos,
    blocos: state.blocos,
    totalUcsEmpreendimento: totalUcsEmpreendimentoF(),
    obs: state.obs,
    demandaTotalGeral: demandaTotalGeralF(),
    logoPDF: state.logoPDF,
    pessoaFisica: pessoaFisica(),
  });
}

/* ===== hooks por página (chamados pelo goTo do core) ===== */
window.onPaginaAtiva = function (sec) {
  if (sec.querySelector("#agrupamentoColetivoBox")) renderAgrupamentoColetivo();
  if (sec.querySelector("#ucsColetivoBox")) renderUcsColetivo();
  if (sec.querySelector("#disjGeralBox")) renderCargasColetivo();
  if (sec.querySelector("#blocosBox")) renderBlocos();
  if (sec.querySelector("#unidadesChips")) renderUnidadesTorres();
  if (sec.querySelector("#projetoPrumadasBox")) renderDadosProjeto();
  if (sec.querySelector("#previaConteudo")) renderPreviaColetivo();
};

/* ===== boot (chamado pelo etapas-loader com o DOM completo) ===== */
window.initFormulario = function () {
  // Título do form-header a partir do card ("Baixa Tensão - <nome do card>";
  // no coletivo/condomínio o subtipo é o NOME do card — a atividade do
  // prefill é só valor inicial das UCs; paridade com app.js:837-842).
  const h1 = $("#formTitulo");
  if (h1)
    h1.textContent = "Baixa Tensão" + (CARD.nome ? " - " + CARD.nome : "");
  btRenumerarEtapas();
  bindInputs();
  montarToggles();
  sincronizarUcBlocos();
  sincronizarBlocos();
  autoSelecionarDisjTorres();
  autoSelecionarDisjProjeto();
  onReceberEmailBT();
  onProntoLigarBT();
  onEmprGate();
  renderRestricaoAmbiental();
  // Sidebar: navegação livre
  $$(".vstep").forEach((s, i) =>
    s.addEventListener("click", () => goTo(i, true)),
  );
};
