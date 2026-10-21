/* ============================================================
   CEMIG BT — Fluxos COLETIVO e CONDOMÍNIO (múltiplas torres)
   em HTML/JS puro (padrão MT). Substitui o app React
   (bt/js/app.js + views) para os cards formType "coletivo" e
   "condominio" — um único app serve os dois (flag MULTI).
   ------------------------------------------------------------
   O núcleo comum (binding, navegação, toggles, PF/CNPJ, CEP,
   correspondência, mapa/restrição, helpers de prévia) vive em
   bt/js/bt-core.js. O estado mantém o MESMO shape que
   gerarPdfDocumento(S) espera (atend/prop/corr/obra + ucBlocos[] +
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

/* ===== Estado (mesmo shape do App React / gerarPdfDocumento) ===== */
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
  // Distância e "pronto para ligar" começam sem resposta (radios vazios no
  // spec); a zona é SEMPRE "Urbano" neste fluxo (grafia do React em
  // views/empreendimento.js — não "Urbana").
  obra: Object.assign(
    obraPadrao(),
    { distMenor30: "", prontoLigar: "" },
    (CARD.prefill && CARD.prefill.obra) || {},
    { localizacao: "Urbano" },
  ),
  obs: "",
  ucsDet: [],
  ucBlocos: [novaUcBloco(0)],
  blocos: [novaTorre(0)],
  // Grupos de torres da etapa "Dados das torres" (checkboxes "Selecione quais
  // torres compartilham os mesmos dados"): partição dos ÍNDICES de
  // state.blocos — ex.: [[0,…,6],[7],[8,…,13]]. O líder de cada grupo (menor
  // índice) é a fonte de verdade; _espelharGrupos copia os dados dele para os
  // demais membros, então cálculo, prévia e PDF continuam torre a torre.
  gruposTorres: [],
  // Coletivo — grupos de unidades da etapa "Dados das unidades" (checkboxes
  // "Selecione quais unidades compartilham os mesmos dados"): partição dos
  // índices de state.ucBlocos, no mesmo modelo dos grupos de torres. Enquanto
  // gruposUnidadesManual for false, os grupos seguem as faixas do "Customizar"
  // (ver _gruposUnidades).
  gruposUnidades: [],
  gruposUnidadesManual: false,
  logoPDF: null,
};
window.state = state;
// Múltiplas torres: "Quantidade de torres" começa em branco — os cards das
// torres (e a etapa "Dados das unidades") só aparecem depois que o usuário
// informar o número. state.blocos mantém 1 torre como armazém interno; é o
// nBlocos vazio que segura a renderização (ver renderBlocos/renderUnidadesTorres).
if (MULTI) state.atend.nBlocos = "";
// "Onde a energia deverá ser disponibilizada" começa sem resposta (spec da
// etapa "Dados do projeto"); o Avançar exige a escolha.
if (MULTI) state.atend.disponibilizacaoEnergia = "";
// Coletivo: "Quantidade de unidades na torre" também começa em branco (spec da
// etapa "Dados da torre"); state.ucBlocos mantém 1 UC como armazém interno.
else state.atend.nUCs = "";
// Abertura dos acordeões (fora do estado do formulário, como no React)
const _ucAberta = {}; // grupos de unidades do coletivo, pelo índice do líder
const _torreAberta = {}; // grupos de torres, pelo índice do líder
const _uniAberta = {}; // faixas de unidades das torres ("líder:faixa")
// Marcam a abertura automática do primeiro card (torre 1 / unidade 1 da torre
// 1), feita uma única vez — depois a abertura é só por clique do usuário.
let _torreAbertaInicial = false;
let _uniAbertaInicial = false;
let _ucAbertaInicial = false;
// Paginação e torre selecionada das etapas do condomínio (UI apenas)
const ITENS_POR_PAGINA = 10;
let _torrePagina = 0; // página da lista de grupos (etapa Dados das torres)
let _uniGrupo = 0; // grupo de torres selecionado na etapa Dados das unidades
const _previaTorrePag = {}; // página da tabela de unidades de cada torre, na prévia
const _uniPagina = {}; // página da lista de faixas de unidades, por líder
let _previaTorreExterna = 0; // torre exibida na prévia (paginação externa)
let _ucPagina = 0; // página da lista de grupos de unidades do coletivo

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
        (mx, u) => Math.max(mx, correnteDisj(u.disjPara)),
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
// Opções de "Onde a energia deverá ser disponibilizada no empreendimento?".
const OPCS_DISP = [
  "Na portaria e no interior do condomínio (alimentação das torres e áreas comuns)",
  "Apenas na portaria do condomínio",
];
// Disjuntores gerais e prumadas só existem com a energia apenas na portaria.
const soPortariaF = () => state.atend.disponibilizacaoEnergia === OPCS_DISP[1];
const usaPrumadaF = () => soPortariaF() && state.atend.temPrumada === "Sim";
// Carga total de TODAS as torres (kW): soma da carga de cada torre.
const cargaTotalEmpreendimentoF = () =>
  state.blocos.reduce((s, b) => s + cargaTotalTorre(b), 0);
// Maior corrente (A) entre os disjuntores das torres — piso do disjuntor de
// prumada (ou, sem prumadas, do disjuntor geral do empreendimento).
const maiorCorrenteTorresF = () => maiorCorrenteTorres(state.blocos, null);
// Prumadas efetivas: só com a energia apenas na portaria e "temPrumada" = Sim
// (senão a hierarquia pula o nível). Faixas incompletas/inválidas ainda entram
// na lista para validação.
const prumadasAtivasF = () => (usaPrumadaF() ? state.atend.prumadas || [] : []);
// Maior corrente (A) do disjuntor de prumada configurado — piso do disjuntor
// geral do empreendimento quando há prumadas.
const maiorCorrentePrumadaF = () =>
  prumadasAtivasF().reduce((mx, p) => Math.max(mx, correnteDisj(p.disj)), 0);
// Piso do disjuntor geral do empreendimento: maior prumada se houver, senão a
// maior torre (a hierarquia ignora os níveis inexistentes).
const pisoDisjEmpreendimentoF = () =>
  prumadasAtivasF().length
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
  if (usaPrumadaF()) {
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

/* ===== grupos de torres (dados compartilhados) =====
   Etapa "Dados das torres": cada acordeão é um GRUPO de torres que
   compartilham os mesmos dados (checkboxes "Selecione quais torres
   compartilham os mesmos dados"). Os cards editam o LÍDER do grupo (menor
   índice) e _espelharGrupos copia os dados dele para os demais membros antes
   de qualquer leitura derivada (cálculo, gates, prévia, PDF) — por isso
   calc.js e pdf-doc.js continuam lendo torre a torre, sem mudança.
   Substitui o antigo gerenciador "Replicar dados" (regras origem → destinos). */
// Campos da torre copiados do líder. A identificação (b.nome) é de cada torre;
// as unidades vão junto em _copiarDadosTorre.
const CAMPOS_TORRE = [
  "qtdUCs",
  "aptosPorAndar",
  "aptosPorAndarFaixas",
  "complInicial",
  "tipoComplemento",
  "demandaIncendio",
  "disjIncendio",
  "disjGeral",
];
const _clone = (v) =>
  v && typeof v === "object" ? JSON.parse(JSON.stringify(v)) : v;
// Copia os dados da torre `oi` (campos + unidades) para a torre `di`.
function _copiarDadosTorre(oi, di) {
  const o = state.blocos[oi];
  const d = state.blocos[di];
  if (!o || !d || o === d) return;
  CAMPOS_TORRE.forEach((c) => (d[c] = _clone(o[c])));
  d.ucs = (o.ucs || []).map((u) => Object.assign(_clone(u), { _acc: {} }));
}
// Normaliza uma partição dos índices 0…n−1 (grupos de torres ou de
// unidades): descarta índices que não existem mais, junta os que faltam como
// grupos de um e ordena (membros em ordem crescente; grupos pelo líder).
function _normalizarParticao(particao, n) {
  const vistos = new Set();
  const grupos = [];
  (particao || []).forEach((g) => {
    const m = (g || []).filter(
      (i) => Number.isInteger(i) && i >= 0 && i < n && !vistos.has(i),
    );
    m.forEach((i) => vistos.add(i));
    if (m.length) grupos.push(m.sort((a, b) => a - b));
  });
  for (let i = 0; i < n; i++) if (!vistos.has(i)) grupos.push([i]);
  grupos.sort((a, b) => a[0] - b[0]);
  return grupos;
}
function _gruposTorres() {
  state.gruposTorres = _normalizarParticao(
    state.gruposTorres,
    state.blocos.length,
  );
  return state.gruposTorres;
}
// Espelha o líder de cada grupo nos demais membros e, dentro do líder, a 1ª
// unidade de cada faixa nas outras unidades da faixa. Idempotente.
function _espelharGrupos() {
  if (!MULTI) return;
  _gruposTorres().forEach((g) => {
    const lider = state.blocos[g[0]];
    if (!lider) return;
    _espelharFaixas(lider.ucs || [], _faixasDaTorre(lider));
    g.slice(1).forEach((bi) => _copiarDadosTorre(g[0], bi));
  });
}
// Rótulo de uma lista de índices: "1 a 7", "8", "1, 3 e 5", "1 a 4 e 9"
// (números 1-based). Dois consecutivos saem separados ("1 e 2"). `nome(i)` e
// `faixa(a, b)` trocam o número e o "a a b" (complementos das unidades).
function _rotuloIndices(
  indices,
  nome = (i) => String(i + 1),
  faixa = (a, b) => `${a} a ${b}`,
) {
  const ord = (indices || []).slice().sort((a, b) => a - b);
  const partes = [];
  for (let k = 0; k < ord.length; ) {
    let j = k;
    while (j + 1 < ord.length && ord[j + 1] === ord[j] + 1) j++;
    if (j - k >= 2) partes.push(faixa(nome(ord[k]), nome(ord[j])));
    else for (let i = k; i <= j; i++) partes.push(nome(ord[i]));
    k = j + 1;
  }
  if (partes.length < 2) return partes[0] || "";
  return partes.slice(0, -1).join(", ") + " e " + partes[partes.length - 1];
}
// "Torre" ou "Torres", conforme o tamanho do grupo.
const _nomeGrupo = (g) => (g.length > 1 ? "Torres" : "Torre");
// Checkbox do índice `i` no card do grupo de líder `lider` (torres e
// unidades), alterando a partição `grupos` no lugar. Marcar tira `i` do grupo
// em que estava e o junta a este — `copiar(lider, i)` roda antes, porque `i`
// pode virar o novo líder (índice menor); desmarcar solta `i` num grupo
// próprio, com os dados que ele tinha no grupo. O único membro de um grupo não
// sai dele. Devolve um índice do grupo a manter aberto, ou null se nada mudou.
function _alternarNoGrupo(grupos, lider, i, marcar, copiar) {
  const alvo = grupos.find((g) => g[0] === lider);
  if (!alvo) return null;
  if (marcar) {
    if (alvo.includes(i)) return null;
    copiar(lider, i);
    grupos.forEach((g) => {
      const k = g.indexOf(i);
      if (k >= 0) g.splice(k, 1);
    });
    alvo.push(i);
    return lider;
  }
  if (!alvo.includes(i) || alvo.length < 2) return null;
  alvo.splice(alvo.indexOf(i), 1);
  grupos.push([i]);
  return i === lider ? alvo[0] : lider;
}
function alternarTorreNoGrupo(lider, bi, marcar) {
  _espelharGrupos();
  const grupos = _gruposTorres();
  const ancora = _alternarNoGrupo(grupos, lider, bi, marcar, _copiarDadosTorre);
  if (ancora === null) return;
  state.gruposTorres = grupos;
  const g = _gruposTorres().find((x) => x.includes(ancora));
  if (g) btToggleExclusivo(_torreAberta, g[0], true);
  autoSelecionarDisjTorres();
  renderBlocos();
}

/* ===== faixas de unidades (etapa "Dados das unidades") =====
   As unidades são preenchidas por FAIXA: uma por faixa da composição por
   pavimento ("Customizar"), na ordem dos andares — (fim − ini + 1) ×
   unidades UCs cada. Se as faixas somarem menos que o total, a sobra vira a
   última faixa; se somarem mais, o excesso é cortado. Sem composição
   customizada, uma faixa só com todas as unidades. Uma unidade diferente
   (loja, academia) ganha uma faixa própria no "Customizar". */
// [{ ini, fim }] com índices de UC (inclusivos).
function _faixasUnidades(total, faixasPav) {
  const n = Math.max(0, parseInt(total) || 0);
  const out = [];
  let pos = 0;
  normalizarFaixasPavimento(faixasPav).forEach((f) => {
    if (pos >= n) return;
    const fim = Math.min(n, pos + (f.fim - f.ini + 1) * f.unidades) - 1;
    out.push({ ini: pos, fim });
    pos = fim + 1;
  });
  if (pos < n) out.push({ ini: pos, fim: n - 1 });
  return out;
}
const _faixasDaTorre = (b) =>
  _faixasUnidades((b.ucs || []).length, b.aptosPorAndarFaixas);
// Índices de UC de uma faixa { ini, fim }.
const _indicesFaixa = (f) =>
  Array.from({ length: f.fim - f.ini + 1 }, (_, k) => f.ini + k);
// O 1º índice de cada grupo é a UC modelo: as demais recebem os campos
// configuráveis dela (_copiarUC preserva complemento, novo complemento,
// instalação, nº predial e caixa).
function _espelharUCs(ucs, grupos) {
  grupos.forEach((g) => {
    const modelo = ucs[g[0]];
    if (!modelo) return;
    g.slice(1).forEach((j) => {
      if (ucs[j]) ucs[j] = _copiarUC(modelo, ucs[j], j);
    });
  });
}
const _espelharFaixas = (ucs, faixas) =>
  _espelharUCs(ucs, faixas.map(_indicesFaixa));

/* ===== grupos de unidades do coletivo (etapa "Dados das unidades") =====
   Mesmo modelo dos grupos de torres, sobre state.ucBlocos: cada acordeão é um
   grupo de unidades que compartilham os mesmos dados e o líder (menor índice)
   é a fonte de verdade. Enquanto o usuário não mexe nos checkboxes, os grupos
   seguem as faixas do "Customizar" da etapa anterior (sem composição, todas as
   unidades num grupo só); depois do primeiro clique, vale a escolha dele. */
function _gruposUnidades() {
  const n = state.ucBlocos.length;
  state.gruposUnidades = state.gruposUnidadesManual
    ? _normalizarParticao(state.gruposUnidades, n)
    : _faixasUnidades(n, _coletivoAgr().aptosPorAndarFaixas).map(
        _indicesFaixa,
      );
  return state.gruposUnidades;
}
function _espelharColetivo() {
  if (MULTI) return;
  _espelharUCs(state.ucBlocos, _gruposUnidades());
}
function alternarUnidadeNoGrupo(lider, j, marcar) {
  _espelharColetivo();
  const ucs = state.ucBlocos;
  const grupos = _gruposUnidades();
  const ancora = _alternarNoGrupo(grupos, lider, j, marcar, (o, d) => {
    ucs[d] = _copiarUC(ucs[o], ucs[d], d);
  });
  if (ancora === null) return;
  state.gruposUnidades = grupos;
  state.gruposUnidadesManual = true;
  const lista = _gruposUnidades();
  const gi = lista.findIndex((x) => x.includes(ancora));
  if (gi >= 0) {
    btToggleExclusivo(_ucAberta, lista[gi][0], true);
    _ucPagina = Math.floor(gi / ITENS_POR_PAGINA);
  }
  renderUcsColetivo();
  atualizarCargasColetivo();
}
// Complementos de um grupo de unidades: "Ap 101 a 304" (o prefixo comum não
// se repete no fim da faixa) ou, com saltos, "101, 103 e 105".
function _complementoGrupo(ucs, g) {
  return _rotuloIndices(
    g,
    (i) => (ucs[i] || {}).complemento || `UC ${i + 1}`,
    (a, b) => {
      const pre = /^\D*/.exec(a)[0];
      return `${a} a ${pre.trim() && b.startsWith(pre) ? b.slice(pre.length) : b}`;
    },
  );
}
// Complementos de uma faixa: "101 a 604" (ou o único, se for uma UC só).
function _complementoFaixa(ucs, f) {
  const a = (ucs[f.ini] || {}).complemento || "";
  const b = (ucs[f.fim] || {}).complemento || "";
  if (f.ini === f.fim || !a || !b) return a || b;
  return `${a} a ${b}`;
}
// Badge da faixa: "1 a 24" ou "25".
const _rotuloFaixa = (f) =>
  f.ini === f.fim ? String(f.ini + 1) : `${f.ini + 1} a ${f.fim + 1}`;
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
// Cópia canônica de uma UC: devolve uma nova unidade com os campos
// CONFIGURÁVEIS de `origem` e os identificadores próprios de `destino`
// (identificação, complemento, novo complemento, nº de instalação e nº predial nunca são
// sobrescritos). `j` é o índice da unidade no destino, usado só para o rótulo
// padrão quando ela ainda não tem identificação.
function _copiarUC(origem, destino, j) {
  return Object.assign({}, origem, {
    cargas: JSON.parse(JSON.stringify(origem.cargas || {})),
    _acc: {},
    identificacao: destino.identificacao || `UC ${j + 1}`,
    complemento: destino.complemento,
    novoComplemento: destino.novoComplemento,
    instalacao: destino.instalacao,
    nPredial: destino.nPredial,
    caixa: destino.caixa,
  });
}
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
// Etapa "Dados das torres" (um card por grupo — basta checar o líder): Qtd de
// unidades e, quando a torre tem mais de uma UC, Qtd por andar e Primeiro
// complemento (mesma condição ucsLen() > 1 do render). Demanda e Disjuntor do
// condomínio são obrigatórios. O complemento da torre de uma unidade é
// digitado na etapa seguinte.
window.btBlocosOk = function () {
  if (!MULTI) return true;
  if (!(state.blocos || []).length) return false;
  _espelharGrupos();
  return _gruposTorres().every((g) => {
    const b = state.blocos[g[0]];
    const nUcs = (b.ucs || []).length;
    if (!(parseInt(b.qtdUCs) > 0)) return false;
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
// Etapa "Dados da torre" (coletivo, torre única): Quantidade, Demanda e
// Disjuntor do condomínio e a resposta do "disjuntor vinculado" (com Sim, um
// nº de instalação válido) são obrigatórios. Guardados em state.blocos[0] (ver
// _coletivoAgr).
window.btAgrupamentoColetivoOk = function () {
  if (MULTI || !coletivoF()) return true;
  const ag = state.blocos[0] || {};
  if (!(parseInt(state.atend.nUCs) > 0)) return false;
  if (!(num(ag.demandaIncendio) > 0)) return false;
  if (!_preenchido(ag.disjIncendio)) return false;
  if (!_preenchido(ag.disjVinculado)) return false;
  if (
    ag.disjVinculado === "Sim" &&
    (!_preenchido(ag.disjVinculadoInstalacao) ||
      !validarInstalacaoUC(ag.disjVinculadoInstalacao).valido)
  )
    return false;
  return true;
};
// Etapa "Dados das unidades": cada UC ativa da torre precisa de Complemento,
// Atividade e Disjuntor; Área (residencial) ou Ramo (não residencial); e, no
// método ND-5.2, Carga prevista (torre com 4+ UCs) ou Demanda não residencial.
// Espelha exatamente as condições de visibilidade de _corpoFaixaTorre.
window.btUnidadesTorresOk = function () {
  if (!MULTI) return true;
  _espelharGrupos();
  return (state.blocos || []).every((b) => {
    const modoCalc = calcBlocoMultiTorres(b).modoCalculadora;
    const ucs = b.ucs || [];
    return ucs.every((u) => {
      if (ucSemAlteracao(u)) return true;
      // Também na torre de uma unidade: o complemento dela (Academia,
      // Portaria…) é digitado nesta etapa.
      if (!_preenchido(u.complemento)) return false;
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
  _espelharGrupos();
  const nBlocos = state.blocos.length;
  const usaPrumada = usaPrumadaF();
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
  // Disjuntor geral do empreendimento (opcional, só com a energia apenas na
  // portaria): > maior prumada (se houver) ou > maior torre (sem prumadas).
  if (soPortariaF() && _preenchido(state.atend.disjEmpreendimento)) {
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
  if (!_preenchido(state.atend.disponibilizacaoEnergia)) return false;
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
// ---- Acordeão de unidades: peças comuns a torres e coletivo ----
// Acordeão de unidades — faixa das torres ("Unidades consumidoras" + badge
// "1 a 24") ou grupo do coletivo ("Unidade consumidora" + badge "1 a 12") —,
// com o endereço (obra + complemento) no topo do corpo. `eyebrow` é o grupo de
// torres (vazio no coletivo). `montarCorpo(corpo)` só roda com o card aberto.
function _mkUnidadesCard(o) {
  const { titulo, badge, endereco, aberta, eyebrow, aoAlternar, montarCorpo } =
    o;
  const bloco = document.createElement("div");
  bloco.className = "uc-colapsavel" + (aberta ? " is-open" : "");
  const head = document.createElement("button");
  head.type = "button";
  head.className = "uc-colapsavel-head";
  head.setAttribute("aria-expanded", aberta ? "true" : "false");
  head.innerHTML =
    `<span class="uc-head-info">` +
    (eyebrow ? `<span class="uc-head-eyebrow">${eyebrow}</span>` : "") +
    `<span class="uc-colapsavel-titulo">${titulo}` +
    (badge ? ` <span class="carga-acc-badge">${badge}</span>` : "") +
    `</span></span>` +
    `<span class="carga-acc-chevron uc-colapsavel-chevron" aria-hidden="true"></span>`;
  head.addEventListener("click", aoAlternar);
  bloco.appendChild(head);
  if (!aberta) return bloco;
  const corpo = document.createElement("div");
  corpo.className = "uc-colapsavel-corpo";
  corpo.appendChild(_blocoEndereco(endereco));
  montarCorpo(corpo);
  bloco.appendChild(corpo);
  return bloco;
}
// Complemento das unidades `idx`: com várias, só-leitura (`texto`, ex.
// "101 a 604", gerado pelo primeiro complemento da etapa anterior); com uma,
// editável — é ele que diz se a unidade é área comum (academia, portaria…), o
// que re-renderiza ao SAIR do campo (`aoSair`), não a cada tecla. `atual`:
// rótulo da alteração com mudança no complemento ("Complemento atual…").
function _campoComplemento(ucs, idx, texto, corpo, aoSair, atual) {
  const sufixo = atual ? " atual" : "";
  if (idx.length > 1) {
    const inp = _inp(texto, () => {});
    inp.readOnly = true;
    const c = _campo(`Complemento${sufixo} das unidades`, inp);
    c.setAttribute("data-noopt", "");
    return c;
  }
  const u = ucs[idx[0]];
  const inp = _inp(
    u.complemento,
    (v) => {
      u.complemento = v;
      const end = corpo.querySelector(".uc-head-endereco");
      if (end) end.textContent = enderecoObraTxt(v);
    },
    { placeholder: "Ex: 101 ou Academia" },
  );
  const areaAntes = ehAreaComum(u.complemento);
  inp.addEventListener("blur", () => {
    if (ehAreaComum(u.complemento) !== areaAntes) aoSair();
  });
  const c = _campo(`Complemento${sufixo} da unidade`, inp);
  c.setAttribute("data-noopt", "");
  return c;
}
// Select com rótulo diferente do valor guardado: pares [valor, rótulo].
function _selectRotulos(pares, valor, onChange) {
  const s = document.createElement("select");
  s.innerHTML = pares
    .map(([v, l]) => `<option value="${v}">${l}</option>`)
    .join("");
  s.value = valor || pares[0][0];
  s.addEventListener("change", () => onChange(s.value));
  return s;
}
// Identificador próprio de cada unidade de um grupo (nº de instalação, novo
// complemento, nº predial): o resto do grupo é preenchido uma vez, mas este
// campo é um por UC — "Rótulo — complemento" por unidade, na largura toda.
function _mkListaPorUnidade(rotulo, ucs, idx, mkInput) {
  const box = document.createElement("div");
  box.className = "col-span-2 faixa-por-unidade";
  const grid = document.createElement("div");
  grid.className = "grid grid-2";
  idx.forEach((j) => {
    const u = ucs[j];
    const c = _campo(`${rotulo} — ${u.complemento || `UC ${j + 1}`}`, mkInput(u));
    c.setAttribute("data-noopt", "");
    grid.appendChild(c);
  });
  box.appendChild(grid);
  return box;
}
// Rodapé das unidades (torres e coletivo): KPIs de carga e demanda totais à
// esquerda; à direita o disjuntor adequado (valor + "Mais opções" quando há
// alternativas) ou o rótulo `vazio` com "-" enquanto não há o que calcular.
// `disj` nulo = disjuntor geral dispensado (card oculto).
// disj = { opcoes, valor, aoEscolher, erroHtml }; `rotulos` troca os textos
// (o coletivo usa os do seu spec — RODAPE_COLETIVO).
const RODAPE_TORRES = {
  carga: "Carga total das unidades da torre",
  demanda: "Demanda total das unidades da torre",
  vazio: "Disjuntor geral da torre",
};
const RODAPE_COLETIVO = {
  carga: "Carga total da Torre",
  demanda: "Demanda total da torre",
  vazio: "Disjuntor da torre adequado de acordo com a seleção",
};
function _mkRodapeUnidades(cargaKw, demandaKva, disj, rotulos = RODAPE_TORRES) {
  const wrap = document.createElement("div");
  wrap.className = "resultado-cargas resultado-unidades";
  const kpis = document.createElement("div");
  kpis.className = "resultado-kpis";
  const val = (v, un) => (v > 0 ? `${fmt2(v)} ${un}` : "-");
  kpis.append(
    _mkKpiCard(
      rotulos.carga,
      val(cargaKw, "kW"),
      "A carga total é a soma da carga estimada para todos os apartamentos mais a carga necessária para as áreas de uso comum (como elevadores e iluminação externa).",
    ),
    _mkKpiCard(
      rotulos.demanda,
      val(demandaKva, "kVA"),
      "O cálculo da demanda total da torre é feito cruzando o tamanho médio das moradias com o número total de unidades.",
    ),
  );
  wrap.appendChild(kpis);
  if (!disj) return wrap;
  const card = document.createElement("div");
  card.className =
    "resultado-card resultado-disjuntor" +
    (disj.erroHtml ? " resultado-card--error" : "");
  const atual = disj.valor || "";
  card.innerHTML = atual
    ? `<div class="resultado-card-label">Disjuntor adequado calculado para este imóvel</div>` +
      `<div class="resultado-card-valor">${atual}</div>`
    : `<div class="resultado-card-label">${rotulos.vazio}</div>` +
      `<div class="resultado-card-valor">-</div>`;
  if (disj.opcoes.length > 1) {
    const mais = document.createElement("button");
    mais.type = "button";
    mais.className = "perfil-calc-mais";
    mais.textContent = "Mais opções";
    mais.addEventListener("click", () =>
      abrirModalDisjuntoresBT(disj.opcoes, atual, disj.aoEscolher),
    );
    card.appendChild(mais);
  }
  if (disj.erroHtml) card.insertAdjacentHTML("beforeend", disj.erroHtml);
  wrap.appendChild(card);
  return wrap;
}
// Coletivo — "Dados das unidades": um GRUPO de unidades por acordeão (ver
// _gruposUnidades); os campos editam o líder e _espelharColetivo copia para os
// demais. Nº de instalação, novo complemento e nº predial (híbrido ND 5.1)
// continuam um por unidade.
// "Alteração de carga com mudança no complemento" só existe no select: é
// gravada como no individual — solicitacao "Alteração de Carga" +
// mudaComplemento — e é assim que o PDF a reconhece.
const SOL_MUDA_COMPLEMENTO = "Alteração de Carga com mudança no complemento";
const SOLICITACOES_UC_COLETIVO = [
  ["Conexão Nova", "Ligação nova"],
  ["Alteração de Carga", "Alteração de carga"],
  [SOL_MUDA_COMPLEMENTO, "Alteração de carga com mudança no complemento"],
  ["Caixa Existente sem Alteração", "Caixa existente sem alteração"],
];
const _mudaComplemento = (u) =>
  u.solicitacao === "Alteração de Carga" && !!u.mudaComplemento;
// Valor do select a partir da UC, e o inverso para todas as UCs do grupo `g`
// (o novo complemento é de cada unidade e some fora da mudança).
const _solicitacaoUC = (u) =>
  _mudaComplemento(u) ? SOL_MUDA_COMPLEMENTO : u.solicitacao;
function _definirSolicitacao(ucs, g, v) {
  const muda = v === SOL_MUDA_COMPLEMENTO;
  g.forEach((j) => {
    const u = ucs[j];
    u.solicitacao = muda ? "Alteração de Carga" : v;
    u.mudaComplemento = muda;
    if (!muda) u.novoComplemento = "";
  });
}
function renderUcsColetivo() {
  const box = $("#ucsColetivoBox");
  if (!box) return;
  sincronizarUcBlocos();
  _espelharColetivo();
  renderHibridoAlertas();
  const hibrido = hibridoF();
  const modoCalc = modoCalculadoraF();
  const ucs = state.ucBlocos;
  const grupos = _gruposUnidades();
  // O 1º grupo já nasce ABERTO — uma única vez; depois quem manda é o clique.
  if (!_ucAbertaInicial) {
    _ucAbertaInicial = true;
    btToggleExclusivo(_ucAberta, 0, true);
  }
  const totalPag = Math.max(1, Math.ceil(grupos.length / ITENS_POR_PAGINA));
  if (_ucPagina >= totalPag) _ucPagina = totalPag - 1;
  const ini = _ucPagina * ITENS_POR_PAGINA;
  box.innerHTML = "";
  grupos.slice(ini, ini + ITENS_POR_PAGINA).forEach((g) => {
    const aberta = _ucAberta[g[0]] === true;
    box.appendChild(
      _mkUnidadesCard({
        titulo: "Unidade consumidora",
        badge: ucs.length > 1 ? _rotuloIndices(g) : "",
        endereco: (ucs[g[0]] || {}).complemento,
        aberta,
        eyebrow: "",
        aoAlternar: () => {
          btToggleExclusivo(_ucAberta, g[0], !aberta);
          renderUcsColetivo();
        },
        montarCorpo: (corpo) =>
          _corpoGrupoColetivo(corpo, ucs, g, hibrido, modoCalc),
      }),
    );
  });
  const pag = $("#ucsColetivoPag");
  if (pag) {
    pag.innerHTML = "";
    pag.appendChild(
      _mkPaginacao(totalPag, _ucPagina, (pp) => {
        _ucPagina = pp;
        renderUcsColetivo();
      }),
    );
  }
  if (window.CemigMarcadores) {
    CemigMarcadores.aplicar(box);
    CemigMarcadores.atualizarAvancar();
  }
}
// Corpo do grupo, na ordem do spec: seleção das unidades; Tipo de solicitação
// (largura toda); Nº da unidade/instalação (alteração); Complemento (atual) e
// Novo complemento; Tipo de propriedade; Ramo (não residencial); Área
// privativa; Carga prevista; Disjuntor; e, no híbrido, Norma/Nº predial. Com
// mais de uma unidade no grupo, os identificadores próprios de cada UC viram
// listas no fim do card.
function _corpoGrupoColetivo(corpo, ucs, g, hibrido, modoCalc) {
  const u = ucs[g[0]];
  const varias = g.length > 1;
  // Mudanças estruturais (campos aparecem/somem) espelham e re-renderizam.
  const refazer = () => {
    _espelharColetivo();
    renderUcsColetivo();
    atualizarCargasColetivo();
  };
  if (ucs.length > 1)
    corpo.appendChild(
      _mkSelecao(
        "Selecione quais unidades compartilham os mesmos dados",
        ucs.length,
        (j) => `Unidade ${j + 1}`,
        g,
        (j, marcar) => alternarUnidadeNoGrupo(g[0], j, marcar),
        "torres-selecao--5",
      ),
    );
  const grid = document.createElement("div");
  grid.className = "grid grid-2";
  const semAlt = ucSemAlteracao(u);
  if (modoCalc && !semAlt) grid.style.marginBottom = "24px";
  const add = (rotulo, controle, cls) => {
    const f = _campo(rotulo, controle, cls);
    f.setAttribute("data-noopt", "");
    grid.appendChild(f);
    return f;
  };
  add(
    "Tipo de solicitação",
    _selectRotulos(SOLICITACOES_UC_COLETIVO, _solicitacaoUC(u), (v) => {
      _definirSolicitacao(ucs, g, v);
      refazer();
    }),
    "field--float col-span-2",
  );
  // Identificadores por unidade: nº de instalação fora da ligação nova, novo
  // complemento na mudança de complemento e nº predial no híbrido ND 5.1
  // (validacaoHibridoF exige um distinto por UC).
  const comInstalacao = u.solicitacao !== "Conexão Nova";
  const muda = _mudaComplemento(u);
  const comPredial = hibrido && u.nd === "5.1";
  const campoInst = (x) =>
    _inpInstalacao(x.instalacao, (v) => (x.instalacao = v));
  const campoNovo = (x) =>
    _inp(x.novoComplemento, (v) => (x.novoComplemento = v), {
      placeholder: "Ex: 1101",
    });
  const campoPredial = (x) => _inp(x.nPredial, (v) => (x.nPredial = v));
  if (comInstalacao && !varias) add("Nº da unidade/instalação", campoInst(u));
  grid.appendChild(
    _campoComplemento(ucs, g, _complementoGrupo(ucs, g), corpo, refazer, muda),
  );
  if (muda && !varias) add("Novo complemento da unidade", campoNovo(u));
  add(
    "Tipo de propriedade",
    _selectDe(
      ["Residencial", "Comercial", "Industrial", "Rural"],
      u.atividade,
      (v) => {
        u.atividade = v;
        aplicarPresetResidencial();
        refazer();
      },
      true,
    ),
    "field--float",
  );
  if (u.atividade !== "Residencial")
    add(
      "Ramo da atividade",
      _inpRamo(u.ramo, (v) => {
        u.ramo = v;
        _espelharColetivo();
      }),
    );
  // Área privativa: em toda unidade (spec). Só a das residenciais entra no
  // ND-5.2 (valor A); a área não muda o método — atualiza apenas os
  // calculados, sem re-render (mantém o foco).
  add(
    "Área privativa (m²)",
    _inp(
      u.area,
      (v) => {
        u.area = v;
        _espelharColetivo();
        atualizarCargasColetivo();
      },
      { type: "number", placeholder: "Ex: 65" },
    ),
  );
  // Carga prevista (kW) — método 5.2 quando o agrupamento tem mais de 3 UCs.
  if (!modoCalc && ucs.length > 3 && !semAlt)
    add(
      "Carga prevista da unidade (kW)",
      _inp(
        u.cargaPrevista,
        (v) => {
          u.cargaPrevista = v;
          _espelharColetivo();
          atualizarCargasColetivo();
        },
        { type: "number", placeholder: "0,0" },
      ),
    );
  // Disjuntor da UC: escolha manual no método 5.2 (ou sem alteração); no modo
  // calculadora vem das cargas declaradas (disjBox abaixo).
  if (!modoCalc || semAlt)
    add(
      "Disjuntor da unidade",
      _selectDe(
        DISJ_COL.map((d) => d.fx),
        u.disjPara,
        (v) => {
          u.disjPara = v;
          // O preset de carga prevista depende do disjuntor escolhido.
          aplicarPresetResidencial();
          refazer();
        },
        true,
      ),
      "field--float",
    );
  // Norma de atendimento (só híbrido)
  if (hibrido)
    add(
      "Norma de atendimento",
      _selectDe(["ND 5.1", "ND 5.2"], "ND " + u.nd, (v) => {
        u.nd = v.replace("ND ", "");
        refazer();
      }),
      "field--float",
    );
  if (comPredial && !varias) add("Nº Predial", campoPredial(u));
  if (varias) {
    if (comInstalacao)
      grid.appendChild(
        _mkListaPorUnidade("Nº da unidade/instalação", ucs, g, campoInst),
      );
    if (muda)
      grid.appendChild(
        _mkListaPorUnidade("Novo complemento", ucs, g, campoNovo),
      );
    if (comPredial)
      grid.appendChild(_mkListaPorUnidade("Nº Predial", ucs, g, campoPredial));
  }
  corpo.appendChild(grid);
  // Modo calculadora: o grupo detalha as cargas como no BT individual (mesma
  // ilha montarCargasBT); o disjuntor da UC sai das cargas (disjBox).
  if (modoCalc && !semAlt) {
    const divisor = document.createElement("div");
    divisor.className = "divider";
    const titulo = document.createElement("span");
    titulo.className = "subbox-title";
    titulo.textContent = varias ? "Cargas de cada unidade" : "Cargas da unidade";
    divisor.appendChild(titulo);
    corpo.appendChild(divisor);
    const cargasBox = document.createElement("div");
    corpo.appendChild(cargasBox);
    const disjBox = document.createElement("div");
    corpo.appendChild(disjBox);
    const aoMudar = () => {
      _espelharColetivo();
      atualizarCargasColetivo();
    };
    montarCargasBT(cargasBox, u, g[0], () => {
      renderDisjUnidadeCalc(disjBox, u, aoMudar);
      aoMudar();
    });
    renderDisjUnidadeCalc(disjBox, u, aoMudar);
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
  _espelharColetivo();
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

  // Agrupamento que dispensa o disjuntor geral (sem bipolar > 63 A e no máximo
  // uma UC tripolar — mesma regra das torres): valor em branco e card oculto.
  let disj = null;
  if (disjGeralColetivoObrigatorio()) {
    const invalido =
      state.atend.disjuntorGeral &&
      !opcoes.includes(state.atend.disjuntorGeral);
    disj = {
      opcoes,
      valor: state.atend.disjuntorGeral || opcoes[0] || "",
      aoEscolher: (v) => {
        state.atend.disjuntorGeral = v;
        renderDisjGeralColetivo();
      },
      erroHtml: invalido
        ? `<div class="cmg-aviso cmg-aviso--error" style="margin-top:10px;margin-bottom:0"><div class="cmg-aviso-icon" aria-hidden="true"></div><p class="cmg-aviso-texto"><span>Esse disjuntor não atende à seletividade (faixa superior ao maior disjuntor das UCs, ${maior} A) e/ou à capacidade para a demanda total (${fmt2(dem)} kVA).</span></p></div>`
        : "",
    };
  } else state.atend.disjuntorGeral = "";
  geralBox.appendChild(
    _mkRodapeUnidades(prevTotalKwF(), demandaTotalGeralF(), disj, RODAPE_COLETIVO),
  );
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
  _espelharGrupos();
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
// Endereço readonly no topo dos cards de torre/unidade: só o valor, em negrito
// (sem o rótulo "Endereço" — spec das torres).
function _blocoEndereco(complemento) {
  const box = document.createElement("div");
  box.className = "endereco-bloco";
  const val = document.createElement("span");
  val.className = "uc-head-endereco";
  val.textContent = enderecoObraTxt(complemento);
  box.appendChild(val);
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
  // das torres (nem texto de apoio — a orientação já está na descrição).
  const nBlocosVazio =
    String(state.atend.nBlocos == null ? "" : state.atend.nBlocos).trim() ===
    "";
  if (nBlocosVazio) {
    box.innerHTML = "";
    const pagVazio = $("#blocosPag");
    if (pagVazio) pagVazio.innerHTML = "";
    atualizarBlocosKpis();
    if (window.CemigMarcadores) CemigMarcadores.atualizarAvancar();
    return;
  }
  sincronizarBlocos();
  _espelharGrupos();
  autoSelecionarDisjTorres();
  const grupos = _gruposTorres();
  // Informada a quantidade, o 1º grupo já nasce ABERTO e os demais fechados —
  // só na primeira montagem; depois quem manda é o clique no acordeão.
  if (!_torreAbertaInicial) {
    _torreAbertaInicial = true;
    btToggleExclusivo(_torreAberta, 0, true);
  }
  const totalPag = Math.max(1, Math.ceil(grupos.length / ITENS_POR_PAGINA));
  if (_torrePagina >= totalPag) _torrePagina = totalPag - 1;
  box.innerHTML = "";
  const ini = _torrePagina * ITENS_POR_PAGINA;
  grupos
    .slice(ini, ini + ITENS_POR_PAGINA)
    .forEach((g) => box.appendChild(_mkGrupoTorresCard(g)));
  const pag = $("#blocosPag");
  if (pag) {
    pag.innerHTML = "";
    pag.appendChild(
      _mkPaginacao(totalPag, _torrePagina, (pp) => {
        _torrePagina = pp;
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
// _preservandoFoco: ver shared/js/campos.js (cmgPreservandoFoco).
const _preservandoFoco = cmgPreservandoFoco;
// Composição por pavimento (só-leitura): UMA caixa branca com uma linha por
// faixa customizada — Andar inicial | Andar final | Unidades por andar —
// separadas por divisória (spec das torres). Ocupa a largura toda do grid.
function _faixasComposicao(faixas) {
  const box = document.createElement("div");
  box.className = "col-span-2 faixas-composicao";
  faixas.forEach((f) => {
    const linha = document.createElement("div");
    linha.className = "faixas-composicao-linha";
    [
      ["Andar inicial", f.ini],
      ["Andar final", f.fim],
      ["Unidades por andar", f.unidades],
    ].forEach(([rotulo, valor]) => {
      const cel = document.createElement("div");
      cel.className = "faixas-composicao-cel";
      const l = document.createElement("span");
      l.className = "faixa-card-label";
      l.textContent = rotulo;
      const v = document.createElement("span");
      v.className = "faixa-card-valor";
      v.textContent = String(valor);
      cel.append(l, v);
      linha.appendChild(cel);
    });
    box.appendChild(linha);
  });
  return box;
}
// Campos do agrupamento compartilhados entre torre (condomínio) e coletivo. O
// LAYOUT é o mesmo dos dois; a origem/destino de cada campo varia por fluxo e
// vem no adaptador `cfg` (ver _cfgAgrupamentoTorre / _cfgAgrupamentoColetivo).
// Ordem do spec (todo campo com a largura de uma coluna do grid-2):
//   torre, até 1 unidade:  Quantidade | Demanda do condomínio
//                          Disjuntor do condomínio
//   torre, 2+ unidades:    Quantidade | Unidades por andar (+ Customizar)
//                          [composição por pavimento, se customizada]
//                          Primeiro complemento (i) | Demanda do condomínio
//                          Disjuntor do condomínio
//   coletivo (cfg.layout = "coletivo"): Quantidade sozinha na 1ª linha — e,
//                          enquanto vazia, sozinha na etapa —; com 2+ unidades
//                          Unidades por andar | Primeiro complemento (i) e a
//                          composição; depois Demanda | Disjuntor.
// O complemento da torre de uma unidade é digitado na etapa seguinte.
function _mkAgrupamentoCampos(grid, cfg) {
  const coletivo = cfg.layout === "coletivo";
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
    if (coletivo) f.classList.add("row-solo");
    grid.appendChild(f);
  }
  if (coletivo && !_preenchido(cfg.qtd())) return;
  const mkDemanda = () =>
    _campo(
      "Demanda do condomínio (kVA)",
      _inp(cfg.demanda(), (v) => cfg.setDemanda(v), {
        type: "number",
        placeholder: "0",
      }),
    );
  // Geração de complementos das unidades: ao preencher o primeiro complemento
  // (e, opcionalmente, unidades por andar) os complementos das UCs são
  // preenchidos automaticamente (ver cfg.gerarComplementos).
  if (cfg.ucsLen() > 1) {
    const maxAptos = cfg.ucsLen();
    // Faixas customizadas (popup "Composição por pavimento"): quando existem, o
    // campo "por andar" vira só-leitura "Customizado" e a composição aparece
    // logo abaixo (uma linha Andar inicial/final/Unidades por faixa).
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
      // Só-leitura: o valor real está nas faixas (abaixo); editar é pelo
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
          // Re-render para (des)montar a composição e alternar o campo
          // "por andar" entre editável e "Customizado".
          if (cfg.rerender) cfg.rerender();
        },
        cfg.ucsLen(),
      );
    };
    btnCustom.addEventListener("click", abrirCustom);
    if (custom) inpAndar.addEventListener("click", abrirCustom);
    grid.appendChild(
      _campoComAcao("Quantidade de unidades por andar", inpAndar, btnCustom),
    );
    const hint =
      "Esse campo gera automaticamente a lista de complementos das suas unidades" +
      (coletivo ? "." : " na etapa seguinte.");
    const fCompl = _campo(
      `Primeiro complemento <span class="cmg-hint" tabindex="0" role="img" aria-label="Ajuda: primeiro complemento" data-hint="${hint}"><img class="field-info" src="../imgs/info.svg" alt="" aria-hidden="true" /></span>`,
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
    // Composição por pavimento (só-leitura), na largura toda do grid: logo
    // abaixo de "por andar" na torre; abaixo da linha do complemento no
    // coletivo.
    const composicao = custom ? _faixasComposicao(faixasCustom) : null;
    if (coletivo) grid.append(fCompl, ...(composicao ? [composicao] : []));
    else grid.append(...(composicao ? [composicao] : []), fCompl);
  }
  grid.appendChild(mkDemanda());
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
    disjId: "disjCondominio-coletivo",
    layout: "coletivo",
    focoQtdId: "qtd-coletivo",
    qtd: () => state.atend.nUCs,
    setQtd: (v) => {
      // Forma do card: quantidade vazia (só ela aparece) e 0/1 ↔ 2+ UCs
      // ("por andar"/complemento aparecem).
      const forma = () =>
        `${_preenchido(state.atend.nUCs)}|${state.ucBlocos.length > 1}`;
      const antes = forma();
      state.atend.nUCs = v;
      // Campo vazio (apagou para redigitar) não redimensiona a lista: aceita o
      // valor bruto e mantém as UCs preenchidas até vir um número válido —
      // mesma regra de sincronizarBlocos.
      if (_preenchido(v)) {
        sincronizarUcBlocos();
        // A lista de UCs fica em outra etapa (#ucsColetivoBox) — re-renderizar
        // não afeta o foco daqui.
        renderUcsColetivo();
      }
      // O card do topo contém o próprio campo de quantidade, então só é refeito
      // quando a forma muda — e mesmo aí o foco/cursor volta para o campo que
      // o usuário está usando.
      if (forma() !== antes) _preservandoFoco(renderAgrupamentoColetivo);
      if (window.CemigMarcadores) CemigMarcadores.atualizarAvancar();
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
  if (_preenchido(state.atend.nUCs)) _mkDisjVinculado(grid, _coletivoAgr());
  box.appendChild(grid);
  if (window.CemigMarcadores) {
    CemigMarcadores.aplicar(box);
    CemigMarcadores.atualizarAvancar();
  }
}
// "O disjuntor do condomínio está vinculado a alguma unidade/instalação
// existente?" (Sim/Não, sem resposta inicial) e, com Sim, o nº da instalação —
// cada um na coluna da esquerda, como no spec.
function _mkDisjVinculado(grid, ag) {
  const f = document.createElement("div");
  f.className = "field field--plain row-solo disj-vinculado";
  f.setAttribute("data-noopt", "");
  const lbl = document.createElement("label");
  lbl.textContent =
    "O disjuntor do condomínio está vinculado a alguma unidade/instalação existente?";
  const radios = document.createElement("div");
  radios.className = "toggle-group";
  _radioGrupo(radios, ["Sim", "Não"], ag.disjVinculado, (v) => {
    ag.disjVinculado = v;
    if (v !== "Sim") ag.disjVinculadoInstalacao = "";
    renderAgrupamentoColetivo();
  });
  f.append(lbl, radios);
  grid.appendChild(f);
  if (ag.disjVinculado !== "Sim") return;
  const fi = _campo(
    "Nº da unidade/instalação",
    _inpInstalacao(ag.disjVinculadoInstalacao, (v) => {
      ag.disjVinculadoInstalacao = v;
      if (window.CemigMarcadores) CemigMarcadores.atualizarAvancar();
    }),
  );
  fi.setAttribute("data-noopt", "");
  fi.classList.add("row-solo");
  grid.appendChild(fi);
}
// Card de um GRUPO de torres (etapa "Dados das torres"): cabeçalho "Torre 8"
// ou "Torres 1 a 7"; no corpo, o endereço da obra, os checkboxes que definem
// quem faz parte do grupo e os campos — editados no líder (g[0]) e espelhados
// nos demais membros por _espelharGrupos.
function _mkGrupoTorresCard(g) {
  const bi = g[0];
  const b = state.blocos[bi];
  const aberta = _torreAberta[bi] === true;
  const bloco = document.createElement("div");
  bloco.className = "uc-colapsavel" + (aberta ? " is-open" : "");
  const head = document.createElement("button");
  head.type = "button";
  head.className = "uc-colapsavel-head";
  head.setAttribute("aria-expanded", aberta ? "true" : "false");
  head.innerHTML =
    `<span class="uc-colapsavel-titulo">${_nomeGrupo(g)} <span class="carga-acc-badge">${_rotuloIndices(g)}</span></span>` +
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
  if (state.blocos.length > 1)
    corpo.appendChild(
      _mkSelecao(
        "Selecione quais torres compartilham os mesmos dados",
        state.blocos.length,
        (i) => `Torre ${i + 1}`,
        g,
        (i, marcar) => alternarTorreNoGrupo(g[0], i, marcar),
      ),
    );
  const grid = document.createElement("div");
  grid.className = "grid grid-2";
  _mkAgrupamentoCampos(grid, _cfgAgrupamentoTorre(b, bi));
  corpo.appendChild(grid);
  bloco.appendChild(corpo);
  return bloco;
}
// "Selecione quais … compartilham os mesmos dados": um checkbox por torre
// (ou unidade, no coletivo); marcados = membros do grupo `g`. `aoAlternar(i,
// marcar)` move o índice entre os grupos (alternarTorreNoGrupo /
// alternarUnidadeNoGrupo).
function _mkSelecao(titulo, total, rotulo, g, aoAlternar, classe) {
  const box = document.createElement("div");
  box.className = "torres-selecao divider" + (classe ? " " + classe : "");
  const t = document.createElement("p");
  t.className = "torres-selecao-titulo";
  t.textContent = titulo;
  const lista = document.createElement("div");
  lista.className = "torres-selecao-lista";
  for (let i = 0; i < total; i++) {
    const lbl = document.createElement("label");
    lbl.className = "cmg-check";
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = g.includes(i);
    cb.addEventListener("change", () => {
      // O único membro do grupo não sai dele (todo índice pertence a um grupo).
      if (!cb.checked && g.length === 1) {
        cb.checked = true;
        return;
      }
      aoAlternar(i, cb.checked);
    });
    lbl.append(cb, document.createTextNode(rotulo(i)));
    lista.appendChild(lbl);
  }
  box.append(t, lista);
  return box;
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
    ["unidadesBox", "unidadesPag", "unidadesResultado"].forEach((id) => {
      const el = $("#" + id);
      if (el) el.innerHTML = "";
    });
    const box = $("#unidadesBox");
    if (box)
      box.innerHTML =
        '<p class="field-hint">Informe a quantidade de torres na etapa “Dados das torres” para preencher as unidades.</p>';
    if (window.CemigMarcadores) CemigMarcadores.atualizarAvancar();
    return;
  }
  sincronizarBlocos();
  _espelharGrupos();
  autoSelecionarDisjTorres();
  const grupos = _gruposTorres();
  if (_uniGrupo >= grupos.length) _uniGrupo = 0;
  // Um chip por grupo de torres ("Torres 1 a 7", "Torre 8"…).
  chips.innerHTML = "";
  grupos.forEach((g, gi) => {
    const c = document.createElement("button");
    c.type = "button";
    c.className = "torre-chip" + (gi === _uniGrupo ? " on" : "");
    c.textContent = `${_nomeGrupo(g)} ${_rotuloIndices(g)}`;
    c.addEventListener("click", () => {
      _uniGrupo = gi;
      renderUnidadesTorres();
    });
    chips.appendChild(c);
  });
  renderUnidadesTorreAtual();
}
// Grupo selecionado nos chips e a torre líder dele (a que os cards editam).
const _grupoUni = () => _gruposTorres()[_uniGrupo] || [0];
// Re-render estrutural do grupo selecionado (faixas e rodapé).
function renderUnidadesTorreAtual() {
  const box = $("#unidadesBox");
  const g = _grupoUni();
  const bi = g[0];
  const b = state.blocos[bi];
  if (!box || !b) return;
  _espelharGrupos();
  const ucs = b.ucs || [];
  const faixas = _faixasDaTorre(b);
  const modoCalc = calcBlocoMultiTorres(b).modoCalculadora;
  // A 1ª faixa do 1º grupo já nasce ABERTA — uma única vez, na primeira
  // montagem; depois quem manda é o clique no acordeão.
  if (!_uniAbertaInicial && ucs.length) {
    _uniAbertaInicial = true;
    btToggleExclusivo(_uniAberta, `${bi}:0`, true);
  }
  const totalPag = Math.max(1, Math.ceil(faixas.length / ITENS_POR_PAGINA));
  let pagAtual = _uniPagina[bi] || 0;
  if (pagAtual >= totalPag) pagAtual = _uniPagina[bi] = totalPag - 1;
  box.innerHTML = "";
  const ini = pagAtual * ITENS_POR_PAGINA;
  faixas.slice(ini, ini + ITENS_POR_PAGINA).forEach((f, k) => {
    const chave = `${bi}:${ini + k}`;
    const aberta = _uniAberta[chave] === true;
    box.appendChild(
      _mkUnidadesCard({
        titulo: f.ini === f.fim ? "Unidade consumidora" : "Unidades consumidoras",
        badge: ucs.length > 1 ? _rotuloFaixa(f) : "",
        endereco: _complementoFaixa(ucs, f),
        aberta,
        eyebrow: `${_nomeGrupo(g)} ${_rotuloIndices(g)}`,
        aoAlternar: () => {
          btToggleExclusivo(_uniAberta, chave, !aberta);
          renderUnidadesTorreAtual();
        },
        montarCorpo: (corpo) => _corpoFaixaTorre(corpo, b, f, modoCalc),
      }),
    );
  });
  const pag = $("#unidadesPag");
  if (pag) {
    pag.innerHTML = "";
    pag.appendChild(
      _mkPaginacao(totalPag, pagAtual, (pp) => {
        _uniPagina[bi] = pp;
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
// Campos de uma faixa de unidades da torre `b` (líder do grupo): editam a 1ª
// UC da faixa; _espelharGrupos copia para o resto da faixa e para as demais
// torres do grupo.
function _corpoFaixaTorre(corpo, b, f, modoCalc) {
  const ucs = b.ucs;
  const u = ucs[f.ini];
  const grid = document.createElement("div");
  grid.className = "grid grid-2";
  if (modoCalc && !ucSemAlteracao(u)) grid.style.marginBottom = "24px";
  grid.appendChild(
    _campoComplemento(
      ucs,
      _indicesFaixa(f),
      _complementoFaixa(ucs, f),
      corpo,
      () => renderUnidadesTorreAtual(),
    ),
  );
  // Múltiplas torres: o tipo de solicitação é sempre ligação nova (valor
  // interno "Conexão Nova"); o select aparece com essa única opção.
  u.solicitacao = "Conexão Nova";
  {
    const fs = _campo(
      "Tipo de solicitação",
      _selectRotulos([["Conexão Nova", "Ligação nova"]], u.solicitacao, () => {}),
      "field--float",
    );
    fs.setAttribute("data-noopt", "");
    grid.appendChild(fs);
  }
  // Área comum do condomínio (academia, portaria…), decidida pelo
  // complemento: o tipo de propriedade não se aplica e o campo não é montado.
  if (ehAreaComum(u.complemento)) {
    normalizarAreaComumUC(u);
  } else {
    const fa = _campo(
      "Tipo de propriedade",
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
    fa.setAttribute("data-noopt", "");
    grid.appendChild(fa);
  }
  if (u.atividade === "Residencial") {
    const fr = _campo(
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
    fr.setAttribute("data-noopt", "");
    grid.appendChild(fr);
  } else {
    const fr = _campo(
      "Ramo de atividade",
      _inpRamo(u.ramo, (v) => (u.ramo = v)),
    );
    fr.setAttribute("data-noopt", "");
    grid.appendChild(fr);
    // Método ND-5.2 (torre com 4+ apartamentos residenciais): a demanda de cada
    // UC não residencial é informada pelo RT e somada na torre.
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
  const semAlt = ucSemAlteracao(u);
  // Carga prevista (kW): método 5.2 quando a torre tem mais de 3 UCs.
  if (!modoCalc && ucs.length > 3 && !semAlt) {
    const fc = _campo(
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
    fc.setAttribute("data-noopt", "");
    grid.appendChild(fc);
  }
  // Disjuntor da UC: escolha manual no método ND-5.2; no modo calculadora (até
  // 3 apartamentos) sai das cargas declaradas, como no BT individual.
  if (!modoCalc || semAlt)
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
  corpo.appendChild(grid);
  if (modoCalc && !semAlt) {
    const cargasBox = document.createElement("div");
    corpo.appendChild(cargasBox);
    const disjBox = document.createElement("div");
    corpo.appendChild(disjBox);
    montarCargasBT(cargasBox, u, f.ini, () => {
      renderDisjUnidadeCalc(disjBox, u);
      atualizarUnidadesCalc();
    });
    renderDisjUnidadeCalc(disjBox, u);
  }
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
  _espelharGrupos();
  autoSelecionarDisjTorres();
  renderUnidadesResultado();
  atualizarBlocosKpis();
}
// Rodapé do grupo selecionado (valores de UMA torre — as do grupo são iguais):
// Carga total + Demanda total das unidades + disjuntor adequado da torre.
function renderUnidadesResultado() {
  const box = $("#unidadesResultado");
  const b = state.blocos[_grupoUni()[0]];
  if (!box || !b) return;
  box.innerHTML = "";
  let disj = null;
  if (disjGeralTorreRegra(b).obrigatorio) {
    const ops = opcoesDisjGeralTorre(b);
    disj = {
      opcoes: ops,
      valor: b.disjGeral && ops.includes(b.disjGeral) ? b.disjGeral : ops[0] || "",
      aoEscolher: (v) => {
        b.disjGeral = v;
        _espelharGrupos();
        renderUnidadesResultado();
      },
    };
  } else {
    // Regra de disjuntor: no modo calculadora, sem bipolar > 63 A e com no
    // máximo uma UC tripolar, a torre dispensa o disjuntor geral — o valor
    // fica em branco e o card é apenas ocultado (restam os KPIs).
    b.disjGeral = "";
  }
  box.appendChild(
    _mkRodapeUnidades(
      cargaTotalTorre(b),
      calcBlocoMultiTorres(b).demandaUcs,
      disj,
    ),
  );
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

  // Onde a energia deverá ser disponibilizada (radio empilhado, sem default).
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
    const soPortaria = soPortariaF();
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

  // O condomínio tem disjuntor de prumada? (Sim/Não) — só com a energia
  // apenas na portaria do condomínio, como os disjuntores gerais.
  const temP = $("#projetoTemPrumada");
  const campoPrumada = temP && temP.closest(".field");
  if (campoPrumada) campoPrumada.style.display = soPortariaF() ? "" : "none";
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
  if (usaPrumadaF()) {
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
  _espelharGrupos();
  _espelharColetivo();
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
  // Coletivo: pergunta do disjuntor vinculado (etapa "Dados da torre") e os
  // campos de cada UC que os grupos espelham mas a etapa não trava sozinha.
  if (!MULTI) {
    const ag = _coletivoAgr();
    req(
      ag.disjVinculado,
      "Disjuntor do condomínio vinculado a unidade/instalação existente",
    );
    if (ag.disjVinculado === "Sim")
      req(
        ag.disjVinculadoInstalacao,
        "Nº da unidade/instalação do disjuntor do condomínio",
      );
    state.ucBlocos.forEach((u, ui) => {
      const rotulo = u.identificacao || `UC ${ui + 1}`;
      if (!ucSemAlteracao(u)) req(u.area, `Área privativa da ${rotulo}`);
      if (_mudaComplemento(u))
        req(u.novoComplemento, `Novo complemento da ${rotulo}`);
    });
  }
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
  else {
    state.ucBlocos.forEach((u, ui) =>
      _checaInst(u, u.identificacao || `UC ${ui + 1}`),
    );
    _checaInst(
      { instalacao: _coletivoAgr().disjVinculadoInstalacao },
      "Disjuntor do condomínio",
    );
  }
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
// Tabela de unidades da prévia — a MESMA nas duas modalidades
// (docs/mocks/previa-bt-coletivo.svg e previa-bt-multitorres.svg):
// identificação, complemento, tipo de pedido, atividade, carga prevista e
// disjuntor, com o lápis levando de volta à etapa de edição.
// `inicio` é o deslocamento da página em curso: sem ele a numeração de
// reserva ("UC n") recomeçaria do 1 a cada bloco paginado.
function _mkPreviaTabelaUCs(ucs, etapa, inicio) {
  const base = inicio || 0;
  const wrap = document.createElement("div");
  wrap.className = "previa-tabela-wrap";
  const linhas = ucs
    .map((u, i) => {
      const rotulo = u.identificacao || `UC ${base + i + 1}`;
      const carga = _preenchido(u.cargaPrevista)
        ? fmt2(u.cargaPrevista) + " kW"
        : "—";
      // Rótulo do select ("Ligação nova", "…com mudança no complemento") e,
      // na mudança de complemento, "atual → novo".
      const sol = SOLICITACOES_UC_COLETIVO.find(
        ([v]) => v === _solicitacaoUC(u),
      );
      const compl = _mudaComplemento(u)
        ? `${u.complemento || "—"} → ${u.novoComplemento || "—"}`
        : u.complemento || "—";
      return (
        `<tr>` +
        `<td>${rotulo}</td>` +
        `<td>${compl}</td>` +
        `<td>${(sol && sol[1]) || u.solicitacao || "—"}</td>` +
        `<td>${u.atividade || "—"}</td>` +
        `<td>${carga}</td>` +
        `<td class="previa-tabela-disj">${u.disjPara || "—"}` +
        `<button type="button" class="previa-edit" title="Editar" aria-label="Editar ${rotulo}" onclick="goTo(${etapa}, true)"></button>` +
        `</td>` +
        `</tr>`
      );
    })
    .join("");
  wrap.innerHTML =
    `<table class="previa-tabela"><thead><tr>` +
    `<th>Unidade</th><th>Complemento</th><th>Solicitação</th><th>Atividade</th>` +
    `<th>Carga prevista</th><th>Disjuntor</th>` +
    `</tr></thead><tbody>${linhas}</tbody></table>`;
  return wrap;
}

// "Quantidade de unidades por andar" quando a composição foi customizada por
// faixa de pavimento: o número único dá lugar a "Customizado", e as faixas
// aparecem logo abaixo nos mesmos cards só-leitura da etapa de edição.
const _previaPorAndar = (o) =>
  (o.aptosPorAndarFaixas || []).length ? "Customizado" : o.aptosPorAndar;

// Painel de uma torre na prévia (múltiplas torres): cabeçalho "Torre" + chip
// "n de N", os campos da torre (identificação, quantidades, complemento,
// composição por pavimento, demanda/disjuntor do condomínio e da torre) e a
// tabela de unidades. Os lápis levam de volta às etapas de edição — dados da
// torre → PG.blocos, unidades → PG.unidades.
function _mkPreviaTorre(b, bi) {
  const painel = document.createElement("div");
  painel.className = "previa-painel";
  const ucs = b.ucs || [];
  const cb = calcBlocoMultiTorres(b);
  const demandaTorre = cb.demandaUcs + num(b.demandaIncendio);

  // Cabeçalho: "Torre" + chip "bi+1 de N".
  const head = document.createElement("div");
  head.className = "previa-painel-head";
  head.innerHTML =
    `<span class="previa-painel-titulo">Torre</span>` +
    `<span class="previa-painel-chip">${bi + 1} de ${state.blocos.length}</span>`;
  painel.appendChild(head);

  // Campos da torre, na mesma ordem da etapa de edição.
  const grid = document.createElement("div");
  grid.className = "previa-grid";
  grid.innerHTML =
    pvCampoBT(
      "Quantidade de unidades na torre",
      String(b.qtdUCs || ucs.length || 0),
      PG.blocos,
    ) +
    pvCampoBT(
      "Quantidade de unidades por andar",
      _previaPorAndar(b),
      PG.blocos,
    ) +
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
  // Composição por pavimento, quando customizada: entra ENTRE o primeiro
  // complemento (que ela detalha) e a proteção do condomínio, e reaproveita
  // os cards só-leitura da etapa das torres — não há segunda implementação.
  if ((b.aptosPorAndarFaixas || []).length)
    grid.insertBefore(
      _faixasComposicao(b.aptosPorAndarFaixas),
      grid.children[3],
    );
  painel.appendChild(grid);

  // Tabela de unidades paginada em blocos de 10 — é a paginação de DENTRO
  // do painel. A de fora, montada em renderPreviaColetivo, troca a torre
  // exibida: com dezenas de torres de dezenas de unidades cada, uma
  // paginação só não dá conta de navegar as duas dimensões.
  const mount = document.createElement("div");
  const pag = document.createElement("div");
  pag.className = "previa-tabela-pag";
  const renderTabela = () => {
    const totalPag = Math.max(1, Math.ceil(ucs.length / ITENS_POR_PAGINA));
    let atual = _previaTorrePag[bi] || 0;
    if (atual >= totalPag) atual = _previaTorrePag[bi] = totalPag - 1;
    const ini = atual * ITENS_POR_PAGINA;
    mount.innerHTML = "";
    mount.appendChild(
      _mkPreviaTabelaUCs(
        ucs.slice(ini, ini + ITENS_POR_PAGINA),
        PG.unidades,
        ini,
      ),
    );
    pag.innerHTML = "";
    pag.appendChild(
      _mkPaginacao(totalPag, atual, (pp) => {
        _previaTorrePag[bi] = pp;
        renderTabela();
      }),
    );
  };
  renderTabela();
  painel.append(mount, pag);
  return painel;
}
function renderPreviaColetivo() {
  const box = $("#previaConteudo");
  if (!box) return;
  _espelharGrupos();
  _espelharColetivo();
  /* O aquecimento do jsPDF saiu daqui: o PDF do formulário agora é HTML
     impresso pelo navegador (js/pdf-doc.js) e o fluxo coletivo não tem
     documento auxiliar em jsPDF — baixar a lib nesta etapa seria ~350 kB
     de CDN que ninguém usa. */
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
  const ag = _coletivoAgr();
  const modalidadeTexto = MULTI
    ? `Múltiplas Torres/Blocos - ${state.blocos.length} torre(s)`
    : ["Coletivo — Agrupamento com Proteção Geral (APR Web)"]
        .concat(state.atend.solicitacao || [], state.atend.escopo || [])
        .join(" · ");

  // Correspondência vai para o FIM da prévia em todos os fluxos (ordem da
  // tela-alvo); montada aqui e anexada ao final do html mais abaixo.
  const corrHtml =
    `<div class="previa-secao"><h4 class="previa-secao-titulo">Conta de luz</h4><div class="previa-grid">` +
    pvCampoBT(
      "E-mail para receber a fatura do condomínio",
      emailFatura,
      PG.corr,
    ) +
    pvCampoBT(
      "Data de vencimento da fatura",
      c.vencimento ? "Todo dia " + c.vencimento : "",
      PG.corr,
    ) +
    `</div></div>`;

  /* ---- Dados para contato ----
     Só a pessoa de contato: o documento e os dados do titular ficam em
     "Dados do empreendimento", como nos dois mocks da prévia. */
  let html = `<div class="previa-secao"><h4 class="previa-secao-titulo">Dados para contato</h4><div class="previa-grid">`;
  html += pvCampoBT("Nome", p.nome, PG.tipo, true);
  html += pvCampoBT("E-mail", p.email, PG.tipo);
  html += pvCampoBT("Celular", p.celular, PG.tipo);
  html += `</div></div><hr class="previa-divider" />`;

  /* ---- Dados do empreendimento ----
     Mesma lista nas duas modalidades: os mocks da prévia só divergem daqui
     para baixo, na seção das torres/unidades. */
  html += `<div class="previa-secao"><h4 class="previa-secao-titulo">Dados do empreendimento</h4><div class="previa-grid">`;
  html += pvCampoBT(
    "Cliente / Razão Social do empreendimento",
    p.cliente,
    PG.empr,
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
  // Perguntas do padrão: respondidas no fim da etapa "Dados das unidades".
  const pgUni = MULTI ? PG.unidades : PG.cargas;
  html += pvCampoBT(
    "Distância do padrão até a rede Cemig inferior a 30m?",
    o.distMenor30,
    pgUni,
  );
  html += pvCampoBT(
    "O padrão está pronto para ser ligado?",
    o.prontoLigar,
    pgUni,
  );
  html += pvCampoBT("Tipo de rede BT que atende o local", o.tipoRede, pgUni);
  html += `</div></div><hr class="previa-divider" />`;

  /* ---- Os três cartões de resumo ----
     Abrem a seção das torres/unidades nas duas modalidades. */
  const cards =
    `<div class="previa-cards">` +
    pvCardBT("Modalidade", modalidadeTexto) +
    pvCardBT(
      "Unidades consumidoras",
      String(MULTI ? totalUcsEmpreendimentoF() : state.ucBlocos.length),
    ) +
    pvCardBT("Demanda total", fmt2(demandaTotalGeralF()) + " kVA") +
    `</div>`;

  if (MULTI) {
    /* ---- Dados das torres ----
       Cartões, quantidade de torres e UM painel por vez, trocado pela
       paginação montada logo abaixo do painel (o DOM é anexado depois de
       fixar o innerHTML). */
    html += `<div class="previa-secao"><h4 class="previa-secao-titulo">Dados das torres</h4>${cards}<div class="previa-grid">`;
    html += pvCampoBT(
      "Quantidade de torres",
      String(state.blocos.length),
      PG.blocos,
    );
    html += `</div><div id="previaTorresMount"></div></div>`;

    /* ---- Dados do projeto ----
       Disponibilização da energia, disjuntores gerais e prumadas — só os
       níveis efetivamente configurados. */
    html += `<hr class="previa-divider" /><div class="previa-secao"><h4 class="previa-secao-titulo">Dados do projeto</h4><div class="previa-grid">`;
    html += pvCampoBT(
      "Onde a energia deverá ser disponibilizada no empreendimento?",
      state.atend.disponibilizacaoEnergia,
      PG.projeto,
      true,
    );
    // Disjuntores gerais e prumadas: só com a energia apenas na portaria.
    if (soPortariaF()) {
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
        "O condomínio tem disjuntor de prumada?",
        state.atend.temPrumada,
        PG.projeto,
        true,
      );
    }
    html += `</div>`;
    if (usaPrumadaF()) {
      const linhasPrumada = (state.atend.prumadas || [])
        .map(
          (pr, i) =>
            `<tr><td>${pr.torreIni || "—"}</td><td>${pr.torreFim || "—"}</td>` +
            `<td class="previa-tabela-disj">${pr.disj || "—"}` +
            `<button type="button" class="previa-edit" title="Editar" aria-label="Editar prumada ${i + 1}" onclick="goTo(${PG.projeto}, true)"></button>` +
            `</td></tr>`,
        )
        .join("");
      html +=
        `<div class="previa-tabela-wrap"><table class="previa-tabela"><thead><tr>` +
        `<th>Torre inicial</th><th>Torre final</th><th>Disjuntor</th>` +
        `</tr></thead><tbody>${linhasPrumada}</tbody></table></div>`;
    }
    html += `</div>`;
    html += `<hr class="previa-divider" />` + corrHtml;
  } else {
    /* ---- Dados da torre e unidades ----
       O coletivo tem um agrupamento só, então os campos da torre vêm
       direto na seção (sem o painel/paginação do condomínio) e a tabela
       lista as unidades do agrupamento. */
    html += `<div class="previa-secao"><h4 class="previa-secao-titulo">Dados da torre e unidades</h4>${cards}<div class="previa-grid" id="previaAgrupamentoGrid">`;
    html += pvCampoBT(
      "Quantidade de unidades na torre",
      String(state.ucBlocos.length),
      PG.ucs,
    );
    html += pvCampoBT(
      "Quantidade de unidades por andar",
      _previaPorAndar(ag),
      PG.ucs,
    );
    /* Linha inteira: sem a "Identificação da torre" do condomínio, o
       agrupamento tem um campo a menos e o complemento fecharia par com a
       demanda do condomínio — no mock ele fica sozinho na linha, e é ele
       que a composição por pavimento detalha logo abaixo. */
    html += pvCampoBT("Primeiro complemento", ag.complInicial, PG.ucs, true);
    html += pvCampoBT(
      "Demanda do condomínio",
      ag.demandaIncendio ? fmt2(ag.demandaIncendio) + " kVA" : "",
      PG.ucs,
    );
    html += pvCampoBT("Disjuntor do condomínio", ag.disjIncendio, PG.ucs);
    html += pvCampoBT(
      "Demanda da torre",
      fmt2(demandaTotalGeralF()) + " kVA",
      PG.cargas,
    );
    html += pvCampoBT(
      "Disjuntor da torre",
      state.atend.disjuntorGeral,
      PG.cargas,
    );
    html += pvCampoBT(
      "Disjuntor do condomínio vinculado a unidade/instalação",
      ag.disjVinculado,
      PG.ucs,
    );
    if (ag.disjVinculado === "Sim")
      html += pvCampoBT(
        "Nº da unidade/instalação",
        ag.disjVinculadoInstalacao,
        PG.ucs,
      );
    html += `</div><div id="previaUcsMount" class="previa-secao-bloco"></div></div>`;
    html += `<hr class="previa-divider" />` + corrHtml;
  }
  box.innerHTML = html;

  if (MULTI) {
    /* Uma torre por vez, com DUAS paginações: esta, abaixo do painel,
       troca a torre exibida; a de dentro do painel corre as unidades
       daquela torre em blocos de 10 (ver _mkPreviaTorre). */
    const mount = $("#previaTorresMount");
    if (mount) {
      const nTorres = state.blocos.length;
      const renderTorreExterna = () => {
        if (_previaTorreExterna >= nTorres) _previaTorreExterna = nTorres - 1;
        if (_previaTorreExterna < 0) _previaTorreExterna = 0;
        const bi = _previaTorreExterna;
        mount.innerHTML = "";
        mount.appendChild(_mkPreviaTorre(state.blocos[bi], bi));
        const pagExt = document.createElement("div");
        pagExt.className = "previa-tabela-pag";
        pagExt.appendChild(
          _mkPaginacao(nTorres, bi, (pg) => {
            _previaTorreExterna = pg;
            renderTorreExterna();
          }),
        );
        mount.appendChild(pagExt);
      };
      renderTorreExterna();
    }
  } else {
    // Composição por pavimento do agrupamento: entre o primeiro
    // complemento e a proteção do condomínio, como no painel da torre.
    const gridAgr = $("#previaAgrupamentoGrid");
    if (gridAgr && (ag.aptosPorAndarFaixas || []).length)
      gridAgr.insertBefore(
        _faixasComposicao(ag.aptosPorAndarFaixas),
        gridAgr.children[3],
      );
    const mountUcs = $("#previaUcsMount");
    if (mountUcs)
      mountUcs.appendChild(_mkPreviaTabelaUCs(state.ucBlocos, PG.cargas));
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
  // validacaoObrigatoriosColetivo já espelha grupos de torres e faixas.
  const v = validacaoObrigatoriosColetivo();
  if (!v.ok) {
    renderPreviaColetivo();
    return;
  }
  // O documento é montado em HTML por bt/js/pdf-doc.js e baixado como PDF
  // por shared/js/pdf-render.js — sem diálogo de impressão.
  // Paridade com o React (app.js:853-872): `coletivo` é a flag runtime
  // disjGeral==="Sim" — verdadeira TAMBÉM no multiTorres (é por ela que a
  // ART de projeto sai no documento).
  await gerarPdfDocumento({
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
