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
function autoSelecionarDisjProjeto() {
  if (!MULTI) return;
  if (state.atend.temPrumada === "Sim") {
    (state.atend.prumadas || []).forEach((p) => {
      const ops = opcoesDisjPrumadaF(p);
      if (ops.length && !(p.disj && ops.includes(p.disj))) p.disj = ops[0];
    });
  }
  const opsE = opcoesDisjEmpreendimentoF();
  if (
    opsE.length &&
    !(
      state.atend.disjEmpreendimento &&
      opsE.includes(state.atend.disjEmpreendimento)
    )
  )
    state.atend.disjEmpreendimento = opsE[0];
  const opsC = opcoesDisjCondominioF();
  if (
    opsC.length &&
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
      if (ops.length && !(b.disjGeral && ops.includes(b.disjGeral)))
        b.disjGeral = ops[0];
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
  if (!ops.length) return;
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
// app.js:365-376
function replicarPrimeiro() {
  const base = state.blocos[0];
  if (!base) return;
  state.blocos = state.blocos.map((b, i) =>
    i === 0
      ? b
      : Object.assign({}, base, {
          nome: `${i + 1}`,
          ucs: (base.ucs || []).map((u) =>
            Object.assign({}, u, {
              cargas: JSON.parse(JSON.stringify(u.cargas || {})),
              _acc: {},
            }),
          ),
        }),
  );
  // Replicar a torre 1 copia o primeiro complemento/aptos por andar; reaplica a
  // geração de complementos em cada torre para que as UCs fiquem numeradas.
  state.blocos.forEach((_, i) => autoGerarComplementosTorre(i));
  autoSelecionarDisjTorres();
  renderBlocos();
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

/* ===== Gate da etapa Empreendimento ===== */
// Campos próprios (nome + doc válido + ART) liberam os detalhes; o avanço
// exige também o endereço urbano completo (_reqEnderecoObra do React com
// s.coletivo: art, cep, endereco, num, bairro, cidade, estado).
function _emprCompleto() {
  return (
    !!String(state.prop.nome || "").trim() &&
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
let _emprRevelado = false;
function onEmprGate() {
  const det = $("#emprDetalhes");
  if (!det) return;
  const mostrar = _emprCompleto();
  det.style.display = mostrar ? "" : "none";
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
function _inp(valor, oninput, props) {
  const i = document.createElement("input");
  i.type = (props && props.type) || "text";
  i.placeholder = (props && props.placeholder) || " ";
  i.value = valor == null ? "" : valor;
  i.addEventListener("input", () => oninput(i.value));
  return i;
}
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
// Campo "Instalação / UC / Medidor": máscara + validação de formato
// (10 dígitos iniciando por 3, ou 15 dígitos com "018" antes do verificador).
function _inpInstalacao(valor, onChange) {
  const i = document.createElement("input");
  i.type = "text";
  i.placeholder = "Nº instalação, UC ou medidor";
  i.value = valor == null ? "" : valor;
  i.setAttribute("data-fmt", "fmtInstalacaoUC");
  i.addEventListener("input", () => {
    i.value = mascararInstalacaoUC(i.value);
    onChange(i.value);
  });
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
  const toolbar = $("#ucsColetivoToolbar");
  if (toolbar) {
    toolbar.style.display = state.ucBlocos.length > 1 ? "flex" : "none";
  }
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
    const headHtml = () =>
      `<span class="uc-head-info"><span class="uc-colapsavel-titulo">${u.identificacao || `UC ${ui + 1}`}</span>` +
      (u.complemento
        ? `<span class="uc-head-endereco-label">Complemento</span><span class="uc-head-endereco">${u.complemento}</span>`
        : "") +
      `</span><span class="carga-acc-chevron uc-colapsavel-chevron" aria-hidden="true"></span>`;
    head.innerHTML = headHtml();
    head.addEventListener("click", () => {
      btToggleExclusivo(_ucAberta, ui, !aberta);
      renderUcsColetivo();
    });
    bloco.appendChild(head);
    if (aberta) {
      const corpo = document.createElement("div");
      corpo.className = "uc-colapsavel-corpo";
      const grid = document.createElement("div");
      grid.className = "grid grid-3";
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
      // Identificação (opcional)
      grid.appendChild(
        _campo(
          "Identificação",
          _inp(u.identificacao, (v) => {
            u.identificacao = v;
            head.innerHTML = headHtml();
          }),
        ),
      );
      // Nº Predial: editável só no híbrido ND 5.1; senão readonly (obra.num)
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
      } else {
        const ro = document.createElement("div");
        ro.className = "readonly-val";
        ro.textContent = state.obra.num || "—";
        const f = _campo("Nº Predial", ro);
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      }
      // Complemento (obrigatório com 2+ UCs — visual; não trava o avanço)
      {
        const f = _campo(
          "Complemento do endereço",
          _inp(
            u.complemento,
            (v) => {
              u.complemento = v;
              head.innerHTML = headHtml();
            },
            { placeholder: "999" },
          ),
        );
        if (state.ucBlocos.length > 1) f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      }
      // Caixa (opcional)
      grid.appendChild(
        _campo(
          "Caixa",
          _inp(u.caixa, (v) => (u.caixa = v), { placeholder: "Apartamento" }),
        ),
      );
      // Solicitação (estrutural: campos aparecem/somem)
      {
        const f = _campo(
          "Solicitação",
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
      // Mudança de local (Alteração / Caixa Existente)
      if (
        u.solicitacao === "Alteração de Carga" ||
        u.solicitacao === "Caixa Existente sem Alteração"
      ) {
        const f = document.createElement("div");
        f.className = "field field--plain";
        f.setAttribute("data-noopt", "");
        const l = document.createElement("label");
        l.textContent = "Mudança de local";
        const tg = document.createElement("div");
        tg.className = "toggle-group";
        ["Sim", "Não"].forEach((v) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "toggle-btn" + (u.mudancaLocal === v ? " on" : "");
          b.textContent = v;
          b.addEventListener("click", () => {
            u.mudancaLocal = v;
            tg.querySelectorAll(".toggle-btn").forEach((x) =>
              x.classList.toggle("on", x === b),
            );
          });
          tg.appendChild(b);
        });
        f.append(l, tg);
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
          "Área (m²)",
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
      grid.appendChild(
        _campo(
          "Disjuntor solicitado",
          _selectDe(
            DISJ_CN.map((d) => d.fx),
            u.disjPara,
            (v) => {
              u.disjPara = v;
              aplicarPresetResidencial();
              autoSelecionarDisjGeral();
              // Re-render para o campo Carga prevista refletir o preset
              renderUcsColetivo();
            },
            true,
          ),
          "field--float",
        ),
      );
      // Carga prevista (kW) — substitui a antiga tabela de previsão de carga;
      // aparece no método 5.2 quando o agrupamento tem mais de 3 UCs.
      if (!modoCalc && state.ucBlocos.length > 3 && !ucSemAlteracao(u)) {
        const f = _campo(
          "Carga prevista (kW)",
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
      corpo.appendChild(grid);
      // ND-5.2 não calcula → a UC detalha as cargas como no BT individual
      // (mesma ilha montarCargasBT; demanda/carga da UC saem do cálculo).
      if (modoCalc && !ucSemAlteracao(u)) {
        const divisor = document.createElement("div");
        divisor.className = "divider";
        const titulo = document.createElement("span");
        titulo.className = "subbox-title";
        titulo.textContent = "Cargas da unidade";
        divisor.appendChild(titulo);
        corpo.appendChild(divisor);
        const cargasBox = document.createElement("div");
        corpo.appendChild(cargasBox);
        montarCargasBT(cargasBox, u, ui, () => atualizarCargasColetivo());
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
// Atualiza SÓ o que é calculado (alertas ND-5.2, campo não residencial e o
// rodapé com KPIs + disjuntor geral, montado por renderDisjGeralColetivo).
function atualizarCargasColetivo() {
  const info = nd52InfoF();
  // Alertas ND-5.2 / modo calculadora
  const alertas = $("#nd52Alertas");
  if (alertas) {
    let html = "";
    if (!modoCalculadoraF()) {
      html = info.nd52
        ? `<div class="alert alert-ok" style="margin-bottom:14px"><b>Demanda dos apartamentos residenciais (ND-5.2):</b> ${info.quantidadeApartamentos} apartamento(s) · área média ponderada ${fmt2(info.areaMediaPonderada)} m² · Fator F ${fmt2(info.nd52.fatorF)} · A ${fmt2(info.nd52.demandaAreaA)} → D = ${fmt2(info.nd52.demandaKVA)} kVA (incluída automaticamente na demanda total abaixo).</div>`
        : `<div class="alert alert-warn" style="margin-bottom:14px"><b>Método ND-5.2 (${info.quantidadeApartamentos} apartamentos):</b> informe a área de cada apartamento residencial — a área média ponderada precisa ficar entre 1 e 1000 m² (atual: ${fmt2(info.areaMediaPonderada)} m²). A demanda residencial permanece zerada até lá.</div>`;
    } else {
      const motivo =
        info.quantidadeApartamentos === 0
          ? "Não há UCs residenciais para o cálculo automático pelo ND-5.2"
          : `ND-5.2 exige no mínimo 4 apartamentos para o cálculo automático (atualmente ${info.quantidadeApartamentos})`;
      html = `<div class="alert alert-info" style="margin-bottom:14px">${motivo}: a demanda do agrupamento é a soma das demandas calculadas pelas cargas detalhadas em cada UC (método ND-5.1), acima.</div>`;
    }
    alertas.innerHTML = html;
  }
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
  const mkKpi = (label, valor, titulo) => {
    const card = document.createElement("div");
    card.className = "resultado-card";
    card.innerHTML =
      `<span class="resultado-card-info cmg-hint" tabindex="0" role="img" aria-label="${label}: ajuda" data-hint="${titulo}"><img class="field-info" src="../imgs/info.svg" alt="" aria-hidden="true" /></span>` +
      `<div class="resultado-card-label">${label}</div>` +
      `<div class="resultado-card-valor">${valor}</div>`;
    return card;
  };
  kpis.append(
    mkKpi(
      "Total Carga Instalada",
      `${fmt2(prevTotalKwF())} kW`,
      "Soma da carga prevista de todas as unidades consumidoras do agrupamento.",
    ),
    mkKpi(
      "Demanda do atendimento",
      `${fmt2(demandaTotalGeralF())} kVA`,
      "Demanda total do agrupamento (parte residencial pelo ND-5.2 mais a demanda não residencial, ou a soma das demandas calculadas pelas UCs). É ela que dimensiona o disjuntor geral do agrupamento.",
    ),
  );
  wrap.appendChild(kpis);

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
function renderBlocos() {
  const box = $("#blocosBox");
  if (!box) return;
  // Enquanto "Quantidade de torres" estiver em branco, não apresentar os cards
  // das torres — só uma orientação para o usuário informar o número primeiro.
  const nBlocosVazio =
    String(state.atend.nBlocos == null ? "" : state.atend.nBlocos).trim() ===
    "";
  if (nBlocosVazio) {
    box.innerHTML =
      '<p class="field-hint">Informe a quantidade de torres para preencher os dados de cada torre.</p>';
    const pagVazio = $("#blocosPag");
    if (pagVazio) pagVazio.innerHTML = "";
    atualizarBlocosKpis();
    if (window.CemigMarcadores) CemigMarcadores.atualizarAvancar();
    return;
  }
  sincronizarBlocos();
  autoSelecionarDisjTorres();
  const total = state.blocos.length;
  const totalPag = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA));
  if (_torrePagina >= totalPag) _torrePagina = totalPag - 1;
  box.innerHTML = "";
  const ini = _torrePagina * ITENS_POR_PAGINA;
  state.blocos.slice(ini, ini + ITENS_POR_PAGINA).forEach((b, k) => {
    box.appendChild(_mkTorreCard(ini + k, total));
  });
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
// Frase de resumo do cálculo do popup de pavimentos: quantos andares e
// pavimentos as unidades por andar informadas produzem.
/*function _resumoPavimentos(calculadas, total) {
  if (!total)
    return "Informe a quantidade de unidades para calcular os andares.";
  if (!calculadas.length) return `${total} unidades a distribuir.`;
  const andares = calculadas.reduce((s, f) => s + f.andares, 0);
  const p = (n, sing, plur) => `${n} ${n === 1 ? sing : plur}`;
  return `${total} unidades → ${p(andares, "andar", "andares")}, ${p(calculadas.length, "pavimento", "pavimentos")}.`;
}*/
// ============================================================
// Popup "Composição por pavimento" (botão Customizar)
// O usuário informa SÓ as unidades por andar de cada pavimento; os andares
// (inicial/final) são calculados a partir do total de UCs e ficam bloqueados —
// o primeiro andar de um pavimento é o seguinte ao último do anterior
// (ver calcularFaixasPavimento). Ao salvar, chama onSalvar(faixas) com as
// faixas calculadas (ou null quando não há pavimento válido). Overlay +
// diálogo montados no <body>, fechados por Cancelar/X/Esc/clique no overlay.
// ============================================================
function abrirComposicaoPavimento(faixasAtuais, onSalvar, totalUCs) {
  const total = Math.max(0, parseInt(totalUCs) || 0);
  // Cópia de trabalho: só as unidades por andar de cada pavimento (os andares
  // vêm do cálculo). Sem faixas salvas, começa com um pavimento em branco.
  const base = normalizarFaixasPavimento(faixasAtuais);
  const linhas = base.length
    ? base.map((f) => ({ unidades: f.unidades }))
    : [{ unidades: "" }];
  // Faixas calculadas da vez — recalculadas a cada digitação.
  let calculadas = calcularFaixasPavimento(linhas, total);

  const overlay = document.createElement("div");
  overlay.className = "cmg-modal-overlay";

  const dialog = document.createElement("div");
  dialog.className = "cmg-modal";
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

  // Cabeçalho: botão X
  const btnX = document.createElement("button");
  btnX.type = "button";
  btnX.className = "cmg-modal-fechar";
  btnX.setAttribute("aria-label", "Fechar");
  btnX.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  btnX.addEventListener("click", fechar);

  const titulo = document.createElement("h2");
  titulo.className = "cmg-modal-titulo";
  titulo.id = "cmg-modal-titulo";
  titulo.textContent = "Composição por pavimento";

  const desc = document.createElement("p");
  desc.className = "cmg-modal-desc";
  desc.textContent =
    "Informe apenas quantas unidades há por andar em cada pavimento — os andares são calculados automaticamente a partir da quantidade de unidades. Cada pavimento adicionado ocupa um andar (ex: uma ou duas coberturas); o último da lista é o corpo da torre e recebe as unidades restantes.";

  // Tabela de faixas
  const tabela = document.createElement("div");
  tabela.className = "cmg-pav-tabela";

  // Resumo do cálculo, abaixo da tabela (preenchido por renderTabela).
  const resumo = document.createElement("p");
  resumo.className = "cmg-pav-resumo";

  const corpo = document.createElement("div");
  corpo.className = "cmg-modal-conteudo";

  const rodape = document.createElement("div");
  rodape.className = "cmg-modal-rodape";
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
    const validas = normalizarFaixasPavimento(calculadas);
    onSalvar(validas.length ? validas : null);
    fechar();
  });
  rodape.append(btnCancelar, btnSalvar);

  // Renderiza as linhas da tabela (cabeçalho + campos por faixa + adicionar).
  const renderTabela = () => {
    tabela.innerHTML = "";
    const head = document.createElement("div");
    head.className = "cmg-pav-linha cmg-pav-head";
    ["Andar inicial", "Andar final", "Unidades por andar"].forEach((t) => {
      const c = document.createElement("div");
      c.className = "cmg-pav-cel";
      c.textContent = t;
      head.appendChild(c);
    });
    // Espaço da coluna de remover (mantém o alinhamento das colunas)
    head.appendChild(
      Object.assign(document.createElement("div"), {
        className: "cmg-pav-cel cmg-pav-cel-acao",
      }),
    );
    tabela.appendChild(head);

    // Célula só-leitura de andar (inicial/final), calculada.
    const campoCalculado = (valor) => {
      const cel = document.createElement("div");
      cel.className = "cmg-pav-cel";
      const inp = document.createElement("input");
      inp.type = "text";
      inp.readOnly = true;
      inp.tabIndex = -1;
      inp.className = "cmg-pav-calculado";
      inp.value = valor == null ? "—" : String(valor);
      cel.appendChild(inp);
      return cel;
    };
    // Re-renderiza recalculando, devolvendo o foco/caret ao input de unidades
    // da linha `posFoco` (índice na tabela renderizada).
    const rerender = (posFoco, caret) => {
      calculadas = calcularFaixasPavimento(linhas, total);
      renderTabela();
      const inputs = tabela.querySelectorAll(
        ".cmg-pav-linha input[type=number]",
      );
      const alvo = inputs[posFoco];
      if (alvo) {
        alvo.focus();
        try {
          if (caret != null) alvo.setSelectionRange(caret, caret);
        } catch (_) {}
      }
    };
    // Monta uma linha de pavimento. `valor` é a unidade exibida; `faixa` traz
    // ini/fim calculados. `onInput(v)` recebe o valor digitado; `onRemover`,
    // quando presente, mostra o botão de remover; `onFocus`, quando presente,
    // roda ao focar o campo (usado para materializar a linha da sobra ANTES de
    // qualquer digitação, evitando push por-tecla). `posFoco` é o índice desta
    // linha entre as linhas renderizadas (para devolver o foco no rerender).
    const mkLinha = (valor, faixa, posFoco, onInput, onRemover, onFocus) => {
      const linha = document.createElement("div");
      linha.className = "cmg-pav-linha";
      const celUnidades = document.createElement("div");
      celUnidades.className = "cmg-pav-cel";
      const inp = document.createElement("input");
      inp.type = "number";
      inp.min = "1";
      // Não faz sentido mais unidades por andar do que o total de UCs da torre.
      if (total > 0) inp.max = String(total);
      inp.placeholder = "4";
      inp.value = valor == null ? "" : valor;
      if (onFocus) inp.addEventListener("focus", onFocus);
      inp.addEventListener("input", () => {
        // Limita ao total de UCs (igual ao campo principal "por andar").
        const n = parseInt(inp.value, 10);
        if (total > 0 && Number.isFinite(n) && n > total) {
          inp.value = String(total);
        }
        const caret = inp.selectionStart;
        onInput(inp.value, caret);
      });
      celUnidades.appendChild(inp);
      linha.append(
        campoCalculado(faixa ? faixa.ini : null),
        campoCalculado(faixa ? faixa.fim : null),
        celUnidades,
      );
      const celAcao = document.createElement("div");
      celAcao.className = "cmg-pav-cel cmg-pav-cel-acao";
      if (onRemover) {
        const btnDel = document.createElement("button");
        btnDel.type = "button";
        btnDel.className = "cmg-pav-remover";
        btnDel.setAttribute("aria-label", "Remover faixa");
        btnDel.innerHTML =
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
        btnDel.addEventListener("click", onRemover);
        celAcao.appendChild(btnDel);
      }
      linha.appendChild(celAcao);
      tabela.appendChild(linha);
    };

    // Faixa calculada de cada linha real: a i-ésima entre os pavimentos com
    // "unidades" preenchido (os em branco não entram no cálculo).
    const faixasReais = calculadas.filter((f) => !f.sobra);
    let posCalc = 0;
    const sobra = calculadas.find((f) => f.sobra);
    // As linhas reais só ganham remover quando há mais de um pavimento visível
    // (real + sobra), garantindo que sempre reste ao menos um pavimento.
    const totalLinhasVisiveis = linhas.length + (sobra ? 1 : 0);

    linhas.forEach((ln, idx) => {
      const preenchida = (parseInt(ln.unidades, 10) || 0) >= 1;
      const faixa = preenchida ? faixasReais[posCalc++] : null;
      mkLinha(
        ln.unidades,
        faixa,
        idx,
        (v, caret) => {
          ln.unidades = v;
          rerender(idx, caret);
        },
        totalLinhasVisiveis > 1
          ? () => {
              linhas.splice(idx, 1);
              calculadas = calcularFaixasPavimento(linhas, total);
              renderTabela();
            }
          : null,
      );
    });

    // Linha da sobra: pavimento das UCs que não completam um andar. Aparece já
    // com o valor calculado. Ao FOCAR o campo (antes de digitar), ela se
    // materializa em `linhas` como linha real — a partir daí a digitação é a de
    // uma linha comum (sem push por-tecla, que embaralhava foco e valor). Uma
    // vez materializada, ganha botão de remover e pode gerar uma nova sobra.
    if (sobra) {
      const idxSobra = linhas.length; // posição desta linha na tabela
      let materializada = false;
      mkLinha(
        sobra.unidades,
        sobra,
        idxSobra,
        () => {}, // input tratado após materializar (a linha vira real)
        null,
        () => {
          if (materializada) return;
          materializada = true;
          // Vira linha real com o valor atual da sobra; re-renderiza e devolve
          // o foco ao mesmo campo, com o conteúdo selecionado para digitar por
          // cima (apagar e trocar por 1, por ex.).
          linhas.push({ unidades: String(sobra.unidades) });
          calculadas = calcularFaixasPavimento(linhas, total);
          renderTabela();
          const inputs = tabela.querySelectorAll(
            ".cmg-pav-linha input[type=number]",
          );
          const alvo = inputs[idxSobra];
          if (alvo) {
            alvo.focus();
            try {
              alvo.select();
            } catch (_) {}
          }
        },
      );
    }

    const rodapeTabela = document.createElement("div");
    rodapeTabela.className = "cmg-pav-adicionar-wrap";
    const btnAdd = document.createElement("button");
    btnAdd.type = "button";
    btnAdd.className = "btn btn-ghost btn-outlined-acao cmg-pav-adicionar";
    btnAdd.innerHTML =
      '<span class="cmg-pav-mais" aria-hidden="true">+</span> Adicionar pavimento';
    btnAdd.addEventListener("click", () => {
      linhas.push({ unidades: "" });
      calculadas = calcularFaixasPavimento(linhas, total);
      renderTabela();
    });
    rodapeTabela.appendChild(btnAdd);
    tabela.appendChild(rodapeTabela);
    // Resumo do cálculo (total de andares/pavimentos e UCs não alocadas).
    // resumo.textContent = _resumoPavimentos(calculadas, total);
  };
  renderTabela();

  corpo.append(titulo, desc, tabela, resumo);
  dialog.append(btnX, corpo, rodape);
  overlay.appendChild(dialog);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fechar();
  });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(overlay);
  // Foco inicial no primeiro campo para acessibilidade.
  const primeiro = tabela.querySelector("input");
  if (primeiro) primeiro.focus();
}
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
// Ordem-alvo (imagem):
//   Quantidade de unidades
//   Unidades por andar (+ Customizar) | Primeiro complemento (i)
//   Demanda do condomínio | Disjuntor do condomínio
// A "Identificação da torre" (exclusiva do condomínio) é montada por quem chama.
function _mkAgrupamentoCampos(grid, cfg) {
  {
    const f = _campo(
      cfg.qtdLabel || "Quantidade de unidades na torre",
      _inp(cfg.qtd(), (v) => cfg.setQtd(v), {
        type: "number",
        placeholder: "0",
      }),
    );
    f.setAttribute("data-noopt", "");
    // Sem "Identificação da torre" antes (fluxo coletivo), a Quantidade ocupa a
    // linha inteira para os pares abaixo (Andar|Complemento, Demanda|Disjuntor)
    // ficarem alinhados — mesmo layout do card do condomínio.
    if (cfg.semIdentificacao) f.classList.add("col-span-2");
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
    qtd: () => b.qtdUCs,
    setQtd: (v) => {
      const antes = (b.ucs || []).length > 1;
      sincronizarUCsTorre(bi, v);
      // Re-renderiza só quando a visibilidade de "por andar"/complemento muda
      // (não a cada tecla, para não perder o foco do campo de quantidade).
      if ((b.ucs || []).length > 1 !== antes) renderBlocos();
    },
    ucsLen: () => (b.ucs || []).length,
    andar: () => b.aptosPorAndar,
    setAndar: (v) => (b.aptosPorAndar = v),
    faixas: () => b.aptosPorAndarFaixas,
    setFaixas: (v) => (b.aptosPorAndarFaixas = v),
    rerender: () => renderBlocos(),
    compl: () => b.complInicial,
    setCompl: (v) => (b.complInicial = v),
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
    // Coletivo não tem "Identificação da torre": Quantidade ocupa a linha toda.
    semIdentificacao: true,
    disjId: "disjCondominio-coletivo",
    qtdLabel: "Quantidade de unidades",
    qtd: () => state.atend.nUCs,
    setQtd: (v) => {
      const antes = state.ucBlocos.length > 1;
      state.atend.nUCs = v;
      sincronizarUcBlocos();
      // A lista de UCs abaixo acompanha a quantidade (não contém o campo que
      // dispara, então não há perda de foco). O card do topo só é refeito
      // quando a visibilidade de "por andar"/complemento muda (0/1 ↔ 2+ UCs),
      // para não perder o foco do próprio campo de quantidade a cada tecla.
      renderUcsColetivo();
      if (state.ucBlocos.length > 1 !== antes) renderAgrupamentoColetivo();
    },
    ucsLen: () => state.ucBlocos.length,
    andar: () => ag.aptosPorAndar,
    setAndar: (v) => (ag.aptosPorAndar = v),
    faixas: () => ag.aptosPorAndarFaixas,
    setFaixas: (v) => (ag.aptosPorAndarFaixas = v),
    rerender: () => renderAgrupamentoColetivo(),
    compl: () => ag.complInicial,
    setCompl: (v) => (ag.complInicial = v),
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
  if (bi === 0 && total > 1) {
    const row = document.createElement("div");
    row.className = "acao-central";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-ghost btn-outlined-acao";
    btn.textContent = "Replicar dados para todas as torres";
    btn.addEventListener("click", replicarPrimeiro);
    row.appendChild(btn);
    corpo.appendChild(row);
  }
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
// Ferramentas da torre acima da lista: Demanda geral não residencial (só no
// método 5.2 com UCs não residenciais). Aptos por andar / primeiro complemento
// e a geração de complementos vivem agora na etapa "Dados das torres"; a
// replicação da UC 1 fica dentro da própria primeira unidade (ver _mkUnidadeCard).
function renderUnidadesTopo(bi) {
  const topo = $("#unidadesTopo");
  const b = state.blocos[bi];
  if (!topo || !b) return;
  // A demanda não residencial agora é preenchida por UC (ver _mkUnidadeCard);
  // não há mais ferramenta de topo nesta etapa.
  topo.innerHTML = "";
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
  {
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
  // Replicar UC 1 para as demais unidades da torre — dentro da própria UC 1.
  if (ui === 0 && b.ucs.length > 1) {
    const row = document.createElement("div");
    row.className = "acao-central";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-ghost btn-outlined-acao";
    btn.textContent = "Replicar UC 1 para todas";
    btn.addEventListener("click", () => replicarUC1Torre(bi));
    row.appendChild(btn);
    corpo.appendChild(row);
  }
  bloco.appendChild(corpo);
  return bloco;
}
// Disjuntor da UC no modo calculadora (até 3 UCs): calculado pelas cargas
// declaradas, exatamente como no BT individual. Radio com a lista adequada
// (u.cargas._disjuntores); a escolha vai para u.disjPara. Se o valor guardado
// não estiver mais na lista (as cargas mudaram), volta ao menor adequado.
function renderDisjUnidadeCalc(box, u) {
  const lista = (u.cargas && u.cargas._disjuntores) || [];
  if (!(u.disjPara && lista.includes(u.disjPara))) u.disjPara = lista[0] || "";
  box.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "resultado-cargas divider";
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
        renderDisjUnidadeCalc(box, u);
        atualizarUnidadesCalc();
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
  // Método 5.2 com área média fora da tabela: avisa e mantém residencial 0.
  /*if (!calcTorre.modoCalculadora && !calcTorre.nd52) {
    const aviso = document.createElement("div");
    aviso.className = "alert alert-warn";
    aviso.style.marginTop = "14px";
    aviso.textContent = `Método ND-5.2 (${calcTorre.qtdApart} apartamentos): informe a área de cada apartamento residencial da torre — a área média ponderada precisa ficar entre 1 e 1000 m² (atual: ${fmt2(calcTorre.areaMedia)} m²). A demanda residencial permanece zerada até lá.`;
    box.appendChild(aviso);
  }*/
  const wrap = document.createElement("div");
  wrap.className = "resultado-cargas divider";
  const kpis = document.createElement("div");
  kpis.className = "resultado-kpis";
  const mkKpi = (label, valor, titulo) => {
    const card = document.createElement("div");
    card.className = "resultado-card";
    card.innerHTML =
      `<span class="resultado-card-info cmg-hint" tabindex="0" role="img" aria-label="${label}: ajuda" data-hint="${titulo}"><img class="field-info" src="../imgs/info.svg" alt="" aria-hidden="true" /></span>` +
      `<div class="resultado-card-label">${label}</div>` +
      `<div class="resultado-card-valor">${valor}</div>`;
    return card;
  };
  kpis.append(
    mkKpi(
      "Carga total da Torre",
      `${fmt2(cargaTotalTorre(b))} kW`,
      "A carga total é a soma da carga estimada para todos os apartamentos mais a carga necessária para as áreas de uso comum (como elevadores e iluminação externa).",
    ),
    mkKpi(
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
        "Demanda total do empreendimento (soma da demanda das UCs e do condomínio de cada torre). É ela que dimensiona o disjuntor geral do empreendimento.",
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
    pessoaFisica() ? "Nome completo do proprietário" : "Razão social",
  );
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
      p.nome,
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
function exportarPdfBT() {
  const v = validacaoObrigatoriosColetivo();
  if (!v.ok) {
    renderPreviaColetivo();
    return;
  }
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
