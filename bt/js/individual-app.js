/* ============================================================
   CEMIG BT — Fluxo INDIVIDUAL em HTML/JS puro (padrão MT)
   ------------------------------------------------------------
   Substitui o app React para o formulário Individual (cards
   formType:"individual" — bt/individual.html). O núcleo comum
   aos apps vanilla do BT (binding, navegação, toggles, PF/CNPJ,
   CEP, correspondência, mapa/restrição, prévia) vive em
   bt/js/bt-core.js — aqui ficam só o estado e as ilhas do fluxo.

   O estado mantém o MESMO shape que gerarPdfDoc(S) espera
   (prop/corr/obra como objetos + ucsDet[]) — pdf.js, calc.js,
   data.js e termo-grupo-b.js são reutilizados sem alteração.
   Inputs escalares são bindados por caminho (data-k="prop.nome").
   O cálculo de cargas reutiliza calcDemandaResultados
   (shared/js/calc-demanda.js) sobre o catálogo do BT (js/data.js)
   — mesma matemática do CalcDemanda React.
   ============================================================ */

/* ===== Card da modalidade (?mod=<id>) ===== */
const CARD = btResolverCard(["individual"]) || {};
const restrito = !!(CARD && CARD.restrito);
const zonaTravada = !!(CARD && CARD.travaZonaRural);
const atividadeTravada = !!(CARD && CARD.prefill && CARD.prefill.atividade);

/* ===== Estado (mesmo shape do App React / gerarPdfDoc) ===== */
// Fábricas propPadrao/corrPadrao/obraPadrao vivem no bt-core.js.
// Porte de selectModalidade (bt/js/app.js): estado limpo + prefill do card.
const _prefAtividade = (CARD.prefill && CARD.prefill.atividade) || "";
const _prefTipoA =
  _prefAtividade === "Comercial" || _prefAtividade === "Industrial"
    ? "nr"
    : _prefAtividade === "Residencial"
      ? "res"
      : "";
const _cargasPadrao = (CARD.prefill && CARD.prefill.cargas) || null;
function novaUcDet() {
  const uc = ucDetalhadaPadrao();
  if (_prefAtividade) uc.atividade = _prefAtividade;
  uc.cargas = _cargasPadrao
    ? JSON.parse(JSON.stringify(_cargasPadrao))
    : Object.assign({}, uc.cargas, { tipoA: _prefTipoA });
  return uc;
}
const state = {
  atend: Object.assign(
    atendPadrao(),
    (CARD.prefill && CARD.prefill.atend) || {},
  ),
  prop: propPadrao(),
  corr: corrPadrao(),
  obra: Object.assign(obraPadrao(), (CARD.prefill && CARD.prefill.obra) || {}),
  obs: "",
  ucsDet: [novaUcDet()],
  logoPDF: null,
};
window.state = state;
// Abertura dos blocos de UC (minimizados por padrão, como no React).
const _ucAberta = {};
// Abertura dos cards colapsáveis de identificação (etapa "Tipo de atendimento"),
// independente da abertura dos cards de cargas (etapa "Cargas das UCs").
const _ucIdentAberta = {};

/* ===== derivados (docInfo/pessoaFisica/redeMonoBT/ruralBT no core) ===== */
function demandaTotalGeralBT() {
  return state.ucsDet.reduce(
    (s, u) =>
      s + (ucSemAlteracao(u) ? 0 : (u.cargas && u.cargas._demanda) || 0),
    0,
  );
}
// Carga instalada + potência de placa dos motores (Termo Grupo B / solicitação).
function potenciaPlacaTotalBT() {
  return state.ucsDet.reduce((s, u) => {
    if (ucSemAlteracao(u)) return s;
    const cargaKw = (u.cargas && u.cargas._cargaKw) || 0;
    const motoresKw = ((u.cargas && u.cargas.mots) || []).reduce(
      (sm, m) => sm + (parseFloat(m.cv) || 0) * 0.7355 * (parseInt(m.q) || 0),
      0,
    );
    return s + cargaKw + motoresKw;
  }, 0);
}
const exibeTermoGrupoBBT = () =>
  demandaTotalGeralBT() > 75 || potenciaPlacaTotalBT() > 75;

// Motor Pesado: (tri e cv>50) OU (mono e cv>15).
function motorPesadoBT(m) {
  const cv = parseFloat(m && m.cv) || 0;
  if (!cv) return false;
  return m.fase === "mono" ? cv > 15 : cv > 50;
}
function motoresPesadosBT() {
  const lista = [];
  state.ucsDet.forEach((u, ui) => {
    ((u.cargas && u.cargas.mots) || []).forEach((m, mi) => {
      if (motorPesadoBT(m))
        lista.push({ ucIndex: ui, motorIndex: mi, motor: m });
    });
  });
  return lista;
}
// Combinação de disjuntores entre UCs (2+ UCs sem proteção geral).
function validacaoDisjuntoresBT() {
  if (state.ucsDet.length <= 1) return { ok: true, msg: "" };
  let tri = 0,
    monoBi = 0;
  state.ucsDet.forEach((u) => {
    const esc =
      u.disjEscolhido || ((u.cargas && u.cargas._disjuntores) || [])[0] || "";
    if (/Tripolar/i.test(esc)) tri++;
    else if (/Mono|Bipolar/i.test(esc)) monoBi++;
  });
  const acima63 = state.ucsDet.some((u) => {
    const esc =
      u.disjEscolhido || ((u.cargas && u.cargas._disjuntores) || [])[0] || "";
    return correnteDisj(esc) > 63;
  });
  if (acima63)
    return {
      ok: false,
      msg: "Unidade consumidora com disjuntor bipolar acima de 63 A: é obrigatório utilizar proteção geral (coletiva). Utilize o formulário Atendimento coletivo.",
    };
  if (tri > 1)
    return {
      ok: false,
      msg: "Para atendimento com dois ou mais disjuntores trifásicos, é obrigatório utilizar proteção geral (coletiva). Utilize o formulário Atendimento coletivo.",
    };
  return {
    ok: true,
    msg: `Combinação válida: ${tri} tripolar(es) + ${monoBi} mono/bifásico(s) de 63 A.`,
  };
}
// "Disjuntor Solicitado" vinculado à carga instalada (somente leitura).
function atualizarSolicitacaoAuto() {
  const alvo = SOLICITACOES[potenciaPlacaTotalBT() > 75 ? 1 : 0];
  if (state.atend.solicitacao !== alvo) state.atend.solicitacao = alvo;
  const sel = $(`select[data-k="atend.solicitacao"]`);
  if (sel) sel.value = alvo;
}

/* ===== Gates de avanço específicos do fluxo (demais no core) ===== */
// Etapa 4: combinação de disjuntores válida (2+ UCs).
window.btCargasOk = () => validacaoDisjuntoresBT().ok !== false;

/* ===== hooks por página (chamados pelo goTo do core) ===== */
window.onPaginaAtiva = function (sec) {
  if (sec.querySelector("#ucsIdentBox")) renderUcsIdentBT();
  if (sec.querySelector("#ucsBox")) renderUcsBT();
  if (sec.querySelector("#previaConteudo")) {
    mostrarAnaliseMotoresBT(false);
    renderPreviaBT();
  }
};

/* ===== Etapa 3 — Dados da unidade (zona/avisos/coordenadas) ===== */
function onZonaBT() {
  const o = state.obra;
  const rural = ruralBT();
  // Troca de zona limpa os campos da zona oposta (React trocarZona)
  if (rural) {
    Object.assign(o, { cep: "", endereco: "", num: "", compl: "", bairro: "" });
    [
      "obra.cep",
      "obra.endereco",
      "obra.num",
      "obra.compl",
      "obra.bairro",
    ].forEach((k) => $$(`[data-k="${k}"]`).forEach((c) => (c.value = "")));
  } else {
    Object.assign(o, {
      distritoComunidade: "",
      nomePropriedade: "",
      pontoRef: "",
      instProxima: "",
    });
    [
      "obra.distritoComunidade",
      "obra.nomePropriedade",
      "obra.pontoRef",
      "obra.instProxima",
    ].forEach((k) => $$(`[data-k="${k}"]`).forEach((c) => (c.value = "")));
  }
  const urb = $("#endUrbanoBox"),
    rur = $("#endRuralBox");
  if (urb) urb.style.display = rural ? "none" : "";
  if (rur) rur.style.display = rural ? "" : "none";
  const avisoUrb = $("#urbanaAviso");
  if (avisoUrb) avisoUrb.style.display = rural ? "none" : "";
  atualizarCoordRural();
  // Rural limita a 1 UC sem proteção geral (useEffect do React)
  const selN = $(`select[data-k="atend.nUCs"]`);
  if (rural) {
    state.atend.nUCs = 1;
    state.atend.disjGeral = "Não";
    if (selN) {
      selN.value = "1";
      selN.disabled = true;
    }
  } else if (selN && !zonaTravada) selN.disabled = false;
  const hintN = $("#nUCsHint");
  if (hintN) hintN.style.display = rural ? "" : "none";
  CemigMarcadores.aplicar();
  CemigMarcadores.atualizarAvancar();
}
// Coordenada: obrigatória (rótulo sem "(opcional)") apenas em zona rural;
// o bloqueio em si acontece na validação final (como no React).
function atualizarCoordRural() {
  const rural = ruralBT();
  const aviso = $("#coordRuralAviso");
  const coordOk =
    String(state.obra.lat).trim() && String(state.obra.lng).trim();
  if (aviso) aviso.style.display = rural && !coordOk ? "" : "none";
  ["latLabel", "lngLabel"].forEach((id) => {
    const lb = document.getElementById(id);
    if (!lb) return;
    const opt = lb.querySelector(".opt");
    if (rural) {
      if (opt) opt.remove();
    } else if (!opt) {
      const s = document.createElement("span");
      s.className = "opt";
      s.textContent = "(opcional)";
      lb.append(" ", s);
    }
  });
}
function onTipoRedeBT() {
  _sync("obra.tipoRede");
  // redeMono muda a lista de disjuntores das UCs
  renderUcsBT();
}

/* ============================================================
   Etapa 4 — Atendimento: blocos colapsáveis por UC
   (identificação + cargas em acordeões + gerador + resultado)
   ============================================================ */
function onNUCsBT() {
  _sync("atend.nUCs");
  state.atend.nUCs = parseInt(state.atend.nUCs, 10) || 1;
  // Nº de UCs afeta as duas etapas: identificação (Tipo de atendimento) e cargas.
  renderUcsIdentBT();
  renderUcsBT();
}
function _sincronizarUcs() {
  const n = Math.min(Math.max(1, Number(state.atend.nUCs) || 1), 3);
  const arr = state.ucsDet;
  while (arr.length < n) arr.push(novaUcDet());
  while (arr.length > n) arr.pop();
}
// Recalcula os derivados de carga/demanda/disjuntor de todas as UCs (usado por
// ambas as etapas, mesmo com o card fechado — o preset já conta na demanda).
function _recalcularCargasUcs() {
  state.ucsDet.forEach((u) => {
    if (ucSemAlteracao(u)) return;
    const d = Object.assign(
      { qtds: [], tipoA: "", catA: null, mots: [] },
      u.cargas || {},
    );
    d.qtds = CAT.map((_, i) => d.qtds[i] || 0);
    const r = calcDemandaResultados(d, redeMonoBT());
    d._demanda = r.demandaTotal;
    d._cargaKw = r.cargaInstalada;
    d._disjuntores = r.disjuntores.map((x) => x.fx);
    u.cargas = d;
  });
}
// Cabeçalho colapsável "Unidade consumidora N" reutilizado pelas duas etapas.
// `montarCorpo(corpo, u, ui)` preenche o corpo quando o card está aberto.
function _mkUcColapsavel(u, ui, aberta, aoAlternar, montarCorpo) {
  const bloco = document.createElement("div");
  bloco.className = "uc-colapsavel" + (aberta ? " is-open" : "");
  const o = state.obra;
  const endParts = [];
  if (o.endereco) endParts.push(o.endereco + (o.num ? ", " + o.num : ""));
  if (u.complemento) endParts.push(u.complemento);
  if (o.bairro) endParts.push(o.bairro);
  if (o.cidade) endParts.push(o.cidade + (o.estado ? "/" + o.estado : ""));
  const enderecoUC = endParts.join(" — ");
  const head = document.createElement("button");
  head.type = "button";
  head.className = "uc-colapsavel-head";
  head.setAttribute("aria-expanded", aberta ? "true" : "false");
  head.innerHTML =
    `<span class="uc-head-info"><span class="uc-colapsavel-titulo">Unidade consumidora ${ui + 1}</span>` +
    (enderecoUC
      ? `<span class="uc-head-endereco-label">Endereço</span><span class="uc-head-endereco">${enderecoUC}</span>`
      : "") +
    `</span><span class="carga-acc-chevron uc-colapsavel-chevron" aria-hidden="true"></span>`;
  head.addEventListener("click", aoAlternar);
  bloco.appendChild(head);
  if (aberta) {
    const corpo = document.createElement("div");
    corpo.className = "uc-colapsavel-corpo";
    montarCorpo(corpo, u, ui);
    bloco.appendChild(corpo);
  }
  return bloco;
}
// Etapa "Tipo de atendimento": identificação por UC (solicitação, atividade,
// ramo, complemento, UC/instalação/medidor, disjuntor atual, mudança de local).
// Os campos de carga e o disjuntor novo ficam na etapa "Cargas das UCs".
function renderUcsIdentBT() {
  const box = $("#ucsIdentBox");
  if (!box) return;
  _sincronizarUcs();
  _recalcularCargasUcs();
  atualizarSolicitacaoAuto();
  box.innerHTML = "";
  state.ucsDet.forEach((u, ui) => {
    const aberta = _ucIdentAberta[ui] === true;
    box.appendChild(
      _mkUcColapsavel(
        u,
        ui,
        aberta,
        () => {
          btToggleExclusivo(_ucIdentAberta, ui, !aberta);
          renderUcsIdentBT();
        },
        (corpo) => corpo.appendChild(_ucIdentificacao(u, ui)),
      ),
    );
  });
  if (window.CemigMarcadores) {
    CemigMarcadores.aplicar(box);
    CemigMarcadores.atualizarAvancar();
  }
}
// Etapa "Cargas das UCs": só as cargas, o gerador e o resultado (disjuntor novo).
function renderUcsBT() {
  const box = $("#ucsBox");
  if (!box) return;
  _sincronizarUcs();
  // Resultados sempre atualizados, mesmo com o bloco da UC fechado (o preset
  // do card já conta na demanda/validação sem o usuário precisar abrir).
  _recalcularCargasUcs();
  atualizarSolicitacaoAuto();
  box.innerHTML = "";
  const multi = state.ucsDet.length > 1;
  state.ucsDet.forEach((u, ui) => {
    const aberta = _ucAberta[ui] === true;
    box.appendChild(
      _mkUcColapsavel(
        u,
        ui,
        aberta,
        () => {
          btToggleExclusivo(_ucAberta, ui, !aberta);
          renderUcsBT();
        },
        (corpo) => {
          if (ucSemAlteracao(u)) {
            const info = document.createElement("div");
            info.className = "alert alert-info";
            info.innerHTML =
              "Esta UC foi marcada como <strong>Caixa Existente sem Alteração</strong>. O preenchimento de cargas foi omitido; ela aparecerá apenas no resumo do PDF.";
            corpo.appendChild(info);
            return;
          }
          const cargasBox = document.createElement("div");
          corpo.appendChild(cargasBox);
          corpo.appendChild(_ucGerador(u, ui));
          const resultadoBox = document.createElement("div");
          corpo.appendChild(resultadoBox);
          montarCargasBT(cargasBox, u, ui, () =>
            _renderResultadoUC(resultadoBox, u, ui, multi),
          );
          _renderResultadoUC(resultadoBox, u, ui, multi);
        },
      ),
    );
  });
  if (window.CemigMarcadores) {
    CemigMarcadores.aplicar(box);
    CemigMarcadores.atualizarAvancar();
  }
}
// Mudar Solicitação/Atividade na etapa de identificação re-renderiza esta etapa
// (campos condicionais: Ramo, UC, Instalação, Disjuntor atual, Mudança de local)
// e também a etapa de cargas (o tipoA das cargas deriva da atividade).
function _aoMudarUcIdent() {
  renderUcsIdentBT();
  renderUcsBT();
}
function _ucIdentificacao(u, ui) {
  const grid = document.createElement("div");
  grid.className = "grid grid-2";
  grid.style.marginBottom = "24px";
  // Só a UC 1 fica presa ao tipo principal do formulário; UCs 2/3 são livres.
  const atividadeBloqueada = (restrito || atividadeTravada) && ui === 0;
  // Solicitação por UC
  const selSol = _selectDe(
    ["Conexão Nova", "Alteração de Carga", "Caixa Existente sem Alteração"],
    u.solicitacao,
    (v) => {
      u.solicitacao = v;
      _aoMudarUcIdent();
    },
  );
  grid.appendChild(
    _campo('Solicitação <span class="req">*</span>', selSol, "field--float"),
  );
  // Atividade principal
  const selAtiv = _selectDe(
    ["Residencial", "Comercial", "Industrial"],
    u.atividade,
    (v) => {
      u.atividade = v;
      _aoMudarUcIdent();
    },
    true,
  );
  selAtiv.disabled = atividadeBloqueada;
  grid.appendChild(
    _campo(
      'Atividade principal <span class="req">*</span>',
      selAtiv,
      "field--float",
    ),
  );
  // Ramo (não residencial)
  if (u.atividade !== "Residencial") {
    const inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = " ";
    inp.value = u.ramo || "";
    inp.disabled = restrito && ui === 0;
    inp.addEventListener("input", () => (u.ramo = inp.value));
    grid.appendChild(
      _campo('Ramo de atividade <span class="req">*</span>', inp),
    );
  }
  // Complemento (obrigatório com 2+ UCs)
  const inpCompl = document.createElement("input");
  inpCompl.type = "text";
  inpCompl.placeholder = "Residência 1";
  inpCompl.value = u.complemento || "";
  inpCompl.addEventListener("input", () => (u.complemento = inpCompl.value));
  grid.appendChild(
    _campo(
      "Complemento do endereço" +
        (state.ucsDet.length > 1 ? ' <span class="req">*</span>' : ""),
      inpCompl,
    ),
  );
  if (u.solicitacao !== "Conexão Nova") {
    const inpUC = document.createElement("input");
    inpUC.type = "text";
    inpUC.placeholder = " ";
    inpUC.value = u.unidadeConsumidora || "";
    inpUC.addEventListener("input", () => (u.unidadeConsumidora = inpUC.value));
    grid.appendChild(_campo("Unidade Consumidora", inpUC));
    const inpInst = document.createElement("input");
    inpInst.type = "text";
    inpInst.placeholder = " ";
    inpInst.value = u.instalacao || "";
    inpInst.addEventListener("input", () => (u.instalacao = inpInst.value));
    grid.appendChild(
      _campo(
        'Instalação / Unidade Consumidora / Medidor<span class="req">*</span>',
        inpInst,
      ),
    );
    const selDisj = _selectDe(
      DISJ.map((d) => d.fx),
      u.disjDe,
      (v) => (u.disjDe = v),
      true,
    );
    grid.appendChild(_campo("Disjuntor atual", selDisj, "field--float"));
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
          // Rural + "Sim": libera o mapa de novo local do padrão (re-render da
          // etapa). Fora disso, basta alternar o destaque do botão.
          if (ruralBT()) _aoMudarUcIdent();
          else
            tg.querySelectorAll(".toggle-btn").forEach((x) =>
              x.classList.toggle("on", x === b),
            );
        });
        tg.appendChild(b);
      });
      f.append(l, tg);
      grid.appendChild(f);
    }
  }
  // Novo local do padrão: em zona rural, quando a UC pede mudança de local,
  // apresenta mapa + coordenadas para escolher o ponto do padrão (Etapa 4).
  const novoLocal =
    ruralBT() &&
    u.mudancaLocal === "Sim" &&
    (u.solicitacao === "Alteração de Carga" ||
      u.solicitacao === "Caixa Existente sem Alteração");
  if (novoLocal) return _ucIdentComNovoLocal(grid, u, ui);
  return grid;
}
// Envolve a grade de identificação e anexa a seção "Novo local do padrão"
// (mapa Leaflet clicável/arrastável + latitude/longitude + UTM). Cada UC tem
// seu próprio mapa, identificado por índice, inicializado após o DOM montar.
function _ucIdentComNovoLocal(grid, u, ui) {
  const wrap = document.createElement("div");
  wrap.appendChild(grid);
  const sec = document.createElement("div");
  sec.className = "mapa-obra divider";
  const titulo = document.createElement("div");
  titulo.className = "subbox-title";
  titulo.textContent = "Novo local do padrão";
  const hint = document.createElement("p");
  hint.className = "mapa-hint";
  hint.textContent =
    "Indique no mapa o novo ponto do padrão. Clique no mapa ou arraste o pino para ajustar; a coordenada e o UTM são preenchidos automaticamente.";
  const canvas = document.createElement("div");
  canvas.className = "mapa-canvas";
  canvas.id = `padraoMap${ui}`;
  sec.append(titulo, hint, canvas);
  wrap.appendChild(sec);

  const grade = document.createElement("div");
  grade.className = "grid grid-3";
  grade.style.marginTop = "14px";
  const inpLat = document.createElement("input");
  inpLat.type = "text";
  inpLat.placeholder = " ";
  inpLat.value = u.padraoLat || "";
  const inpLng = document.createElement("input");
  inpLng.type = "text";
  inpLng.placeholder = " ";
  inpLng.value = u.padraoLng || "";
  const inpUtm = document.createElement("input");
  inpUtm.type = "text";
  inpUtm.readOnly = true;
  inpUtm.disabled = true;
  inpUtm.placeholder = " ";
  inpUtm.value = u.padraoUtm || "";
  const recalcUtm = () => {
    u.padraoUtm = utmString(u.padraoLat, u.padraoLng);
    inpUtm.value = u.padraoUtm;
  };
  inpLat.addEventListener("input", () => {
    u.padraoLat = inpLat.value;
    recalcUtm();
    _sincronizarPadraoMapa(ui, u);
  });
  inpLng.addEventListener("input", () => {
    u.padraoLng = inpLng.value;
    recalcUtm();
    _sincronizarPadraoMapa(ui, u);
  });
  grade.appendChild(_campo("Latitude", inpLat));
  grade.appendChild(_campo("Longitude", inpLng));
  grade.appendChild(_campo("Coordenada UTM", inpUtm));
  wrap.appendChild(grade);

  // Callback para o mapa escrever de volta nos inputs quando o pino move.
  u._padraoAplicar = (lat, lng) => {
    u.padraoLat = String(lat);
    u.padraoLng = String(lng);
    inpLat.value = u.padraoLat;
    inpLng.value = u.padraoLng;
    recalcUtm();
  };
  // Inicializa o mapa após o nó entrar no DOM (renderUcsIdentBT limpa o box).
  setTimeout(() => _initPadraoMapa(ui, u), 60);
  return wrap;
}
// Registro dos mapas de novo local do padrão, por índice de UC. Recriados a
// cada render da etapa (o box é limpo), então descartamos o mapa anterior.
const _padraoMaps = {};
function _initPadraoMapa(ui, u) {
  const div = document.getElementById(`padraoMap${ui}`);
  if (!div || !window.L) return;
  if (_padraoMaps[ui]) {
    _padraoMaps[ui].remove();
    _padraoMaps[ui] = null;
  }
  const map = window.L.map(div).setView([-19.9167, -43.9345], 12);
  const ruas = window.L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { maxZoom: 19, attribution: "© OpenStreetMap" },
  );
  const satelite = window.L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 19, attribution: "" },
  );
  satelite.addTo(map);
  window.L.control.layers({ Satélite: satelite, Ruas: ruas }).addTo(map);
  const marker = { ref: null };
  const colocar = (lat, lng, centralizar) => {
    const ll = window.L.latLng(lat, lng);
    if (marker.ref) {
      marker.ref.setLatLng(ll);
      if (centralizar && !map.getBounds().contains(ll))
        map.setView(ll, Math.max(map.getZoom(), 17));
    } else {
      marker.ref = window.L.marker(ll, { draggable: true }).addTo(map);
      marker.ref.on("dragend", (e) => {
        const p = e.target.getLatLng();
        if (u._padraoAplicar) u._padraoAplicar(p.lat, p.lng);
      });
      const zMax = Number.isFinite(map.getMaxZoom()) ? map.getMaxZoom() : 19;
      map.setView(ll, zMax);
    }
  };
  map.on("click", (e) => {
    if (u._padraoAplicar) u._padraoAplicar(e.latlng.lat, e.latlng.lng);
    colocar(e.latlng.lat, e.latlng.lng, false);
  });
  map._padraoColocar = colocar;
  _padraoMaps[ui] = map;
  setTimeout(() => map.invalidateSize(), 120);
  // Semeia o mapa: coordenada do padrão já informada ou, senão, a da obra.
  const lat = num(u.padraoLat) || num(state.obra.lat);
  const lng = num(u.padraoLng) || num(state.obra.lng);
  if (lat && lng) colocar(lat, lng, true);
}
// Reposiciona o pino quando lat/long são digitados manualmente (debounce leve).
function _sincronizarPadraoMapa(ui, u) {
  const map = _padraoMaps[ui];
  if (!map || !map._padraoColocar) return;
  const lat = parseFloat(String(u.padraoLat).replace(",", "."));
  const lng = parseFloat(String(u.padraoLng).replace(",", "."));
  if (isNaN(lat) || isNaN(lng)) return;
  if (_nDig(u.padraoLat) < 5 || _nDig(u.padraoLng) < 5) return;
  map._padraoColocar(lat, lng, true);
}
function _ucGerador(u, ui) {
  const ger = u.gerador || {
    possui: "Não",
    potencia: "",
    fonte: "",
    descricao: "",
  };
  u.gerador = ger;
  const wrap = document.createElement("div");
  wrap.style.marginTop = "24px";
  const f = document.createElement("div");
  f.className = "field field--plain";
  f.setAttribute("data-noopt", "");
  const l = document.createElement("label");
  l.textContent = "Possui gerador de emergência?";
  const tg = document.createElement("div");
  tg.className = "toggle-group";
  const detalhe = document.createElement("div");
  detalhe.className = "grid grid-2";
  detalhe.style.marginTop = "14px";
  const renderDetalhe = () => {
    detalhe.style.display = ger.possui === "Sim" ? "" : "none";
    if (ger.possui !== "Sim" || detalhe.childElementCount) return;
    const inpPot = document.createElement("input");
    inpPot.type = "text";
    inpPot.placeholder = " ";
    inpPot.value = ger.potencia || "";
    inpPot.addEventListener("input", () => (ger.potencia = inpPot.value));
    detalhe.appendChild(_campo("Potência do gerador (kVA)", inpPot));
    const selFonte = _selectDe(
      ["Diesel", "Gasolina", "Gás (GLP/GNV)", "Outro"],
      ger.fonte,
      (v) => (ger.fonte = v),
      true,
    );
    detalhe.appendChild(
      _campo("Fonte / Combustível", selFonte, "field--float"),
    );
    const inpDesc = document.createElement("input");
    inpDesc.type = "text";
    inpDesc.placeholder = "Modelo, finalidade, regime de operação...";
    inpDesc.value = ger.descricao || "";
    inpDesc.addEventListener("input", () => (ger.descricao = inpDesc.value));
    detalhe.appendChild(
      _campo("Observações do gerador", inpDesc, "col-span-2"),
    );
    const aviso = document.createElement("div");
    aviso.className = "col-span-2 cmg-aviso";
    aviso.innerHTML =
      '<div class="cmg-aviso-icon" aria-hidden="true"></div><p class="cmg-aviso-texto">O gerador de emergência opera de forma isolada (sem paralelismo com a rede CEMIG).</p>';
    detalhe.appendChild(aviso);
  };
  ["Sim", "Não"].forEach((v) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "toggle-btn" + (ger.possui === v ? " on" : "");
    b.textContent = v;
    b.addEventListener("click", () => {
      ger.possui = v;
      tg.querySelectorAll(".toggle-btn").forEach((x) =>
        x.classList.toggle("on", x === b),
      );
      renderDetalhe();
    });
    tg.appendChild(b);
  });
  f.append(l, tg);
  wrap.append(f, detalhe);
  renderDetalhe();
  return wrap;
}
// Resultado da UC: cards carga/demanda + seleção do disjuntor (radio .toggle)
function _renderResultadoUC(box, u, ui, multi) {
  const c = u.cargas || {};
  const cargaKw = c._cargaKw || 0;
  const inval =
    multi && (c._disjuntores || []).length > 0 && !validacaoDisjuntoresBT().ok;
  box.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "resultado-cargas divider";
  const kpis = document.createElement("div");
  kpis.className = "resultado-kpis";
  const cardCarga = document.createElement("div");
  cardCarga.className =
    "resultado-card" + (cargaKw > 75 ? " resultado-card--warn" : "");
  cardCarga.innerHTML =
    `<div class="resultado-card-label">Carga instalada</div>` +
    `<div class="resultado-card-valor">${fmt2(cargaKw)} kW</div>` +
    (cargaKw > 75
      ? `<div class="cmg-aviso cmg-aviso--warn" style="margin-bottom:0"><div class="cmg-aviso-icon" aria-hidden="true"></div><p class="cmg-aviso-texto">Sua carga instalada ultrapassa 75 kW, é obrigatório anexar a ART/TRT de projeto paga, planta situação, e formulário preenchido no APR Web.</p></div>`
      : "");
  const cardDem = document.createElement("div");
  cardDem.className = "resultado-card";
  cardDem.innerHTML =
    `<div class="resultado-card-label">Demanda calculada</div>` +
    `<div class="resultado-card-valor">${fmt2(c._demanda || 0)} kVA</div>`;
  kpis.append(cardCarga, cardDem);
  const cardDisj = document.createElement("div");
  cardDisj.className =
    "resultado-card resultado-disjuntor" +
    (inval ? " resultado-card--error" : "");
  cardDisj.innerHTML = `<div class="resultado-card-label">Disjuntor adequado de acordo com a seleção</div>`;
  const lista = c._disjuntores || [];
  if (lista.length) {
    const atual = u.disjEscolhido || lista[0];
    const tg = document.createElement("div");
    tg.className = "toggle-group";
    lista.forEach((dj) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "toggle-btn" + (atual === dj ? " on" : "");
      b.textContent = dj;
      b.addEventListener("click", () => {
        u.disjEscolhido = dj;
        _renderResultadoUC(box, u, ui, multi);
        CemigMarcadores.atualizarAvancar();
      });
      tg.appendChild(b);
    });
    cardDisj.appendChild(tg);
  } else {
    const hint = document.createElement("div");
    hint.className = "field-hint";
    hint.textContent = "Detalhe as cargas para ver o disjuntor adequado.";
    cardDisj.appendChild(hint);
  }
  if (inval) {
    const aviso = document.createElement("div");
    aviso.className = "cmg-aviso cmg-aviso--error";
    aviso.style.cssText = "margin-top:8px;margin-bottom:0";
    aviso.innerHTML = `<div class="cmg-aviso-icon" aria-hidden="true"></div><p class="cmg-aviso-texto"><span><b>Combinação de disjuntores inválida:</b> ${validacaoDisjuntoresBT().msg}</span></p>`;
    cardDisj.appendChild(aviso);
  }
  wrap.append(kpis, cardDisj);
  box.appendChild(wrap);
}

/* ============================================================
   Formulário de Carga do BT (montarCargasBT + CARGA_CATS_BT):
   movido para bt-core.js — o fluxo coletivo/múltiplas torres
   também o usa quando o ND-5.2 não calcula.
   ============================================================ */

/* ============================================================
   Etapa 7 — Prévia & PDF
   ============================================================ */
// Validação global (porte de validacaoObrigatorios do React, ramo individual;
// o endereço urbano só é exigido fora da zona Rural — critério de
// _reqEnderecoObra, que o React usa no gating por etapa).
function validacaoObrigatoriosBT() {
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
  if (o.localizacao !== "Rural") {
    req(o.endereco, "Endereço da obra");
    req(o.num, "Nº da obra");
    req(o.bairro, "Bairro da obra");
    req(o.cep, "CEP da obra");
  }
  req(o.cidade, "Cidade da obra");
  const coordObrigatoria = o.localizacao === "Rural";
  const coordPreenchida = !!String(o.lat).trim() && !!String(o.lng).trim();
  if (coordObrigatoria && !coordPreenchida)
    faltando.push("Coordenada (latitude/longitude) da obra");
  if (!(demandaTotalGeralBT() > 0))
    faltando.push("Previsão de carga / demanda das UCs");
  const vd = validacaoDisjuntoresBT();
  if (vd.ok === false) faltando.push("Combinação de disjuntores inválida");
  if (o.restricaoAmbiental === "Sim" && !o.restricaoAceite)
    faltando.push("Declaração de ciência da restrição ambiental");
  return { ok: faltando.length === 0, faltando };
}
// Índices das etapas para os lápis da prévia (ordem real do
// bt/individual.html: orient=0, prop=1, dados=2, atend=3, corr=4).
// Índices de página para os lápis de edição da prévia. A etapa de atendimento
// (selects) e a etapa de cargas (cards por-UC) são separadas: atend=3, cargas=4,
// e correspondência passa a 5.
const PG = { prop: 1, dados: 2, atend: 3, cargas: 4, corr: 5 };
function renderPreviaBT() {
  const box = $("#previaConteudo");
  if (!box) return;
  const p = state.prop,
    c = state.corr,
    o = state.obra;
  const pf = pessoaFisica();
  const rural = ruralBT();
  const emailFatura =
    c.alternativa === "E-mail informado"
      ? p.email
      : c.alternativa === "Outro e-mail"
        ? c.outroEmail
        : c.alternativa;
  const modalidadeTexto = "Individual - até 3 caixas sem proteção geral";
  let html = `<div class="previa-secao"><h4 class="previa-secao-titulo">Dados do proprietário</h4><div class="previa-grid">`;
  html += pvCampoBT("Nome", p.nome, PG.prop, true);
  html += pvCampoBT("E-mail", p.email, PG.prop);
  html += pvCampoBT("Celular", p.celular, PG.prop);
  html += pvCampoBT(pf ? "CPF" : "CNPJ", p.cpfCnpj, PG.prop);
  if (pf) {
    html += pvCampoBT("Filiação", p.filiacao, PG.prop);
    html += pvCampoBT("RG", p.rg, PG.prop);
    html += pvCampoBT("Data de nascimento", p.nasc, PG.prop);
  }
  html += `</div></div><hr class="previa-divider" />`;
  html += `<div class="previa-secao"><h4 class="previa-secao-titulo">Correspondência</h4><div class="previa-grid">`;
  html += pvCampoBT("E-mail para receber a fatura", emailFatura, PG.corr);
  html += pvCampoBT(
    "Data de vencimento da fatura",
    c.vencimento ? "Todo dia " + c.vencimento : "",
    PG.corr,
  );
  html += `</div></div>`;
  state.ucsDet.forEach((u, ui) => {
    const cg = u.cargas || {};
    html += `<hr class="previa-divider" /><div class="previa-secao"><h4 class="previa-secao-titulo">Dados da unidade consumidora ${ui + 1}</h4>`;
    html += `<div class="previa-cards">`;
    html += pvCardBT("Modalidade", modalidadeTexto);
    html += pvCardBT("Demanda total", fmt2(cg._demanda || 0) + " kVA");
    html += pvCardBT(
      "Disjuntor adequado",
      u.disjEscolhido || (cg._disjuntores || [])[0] || "—",
    );
    html += `</div><div class="previa-grid">`;
    html += pvCampoBT("Tipo de solicitação", u.solicitacao, PG.atend);
    html += pvCampoBT("Atividade principal", u.atividade);
    html += pvCampoBT("Ramo da atividade", u.ramo);
    if (cg.tipoA === "nr" && cg.catA != null)
      html += pvCampoBT("Categoria de atividade", (TABELA_11[cg.catA] || {}).d);
    html += pvCampoBT("Solicitação", state.atend.solicitacao);
    if (!rural) {
      html += pvCampoBT("CEP", o.cep, PG.dados, true);
      html += pvCampoBT("Endereço", o.endereco, PG.dados);
      html += pvCampoBT("Número", o.num, PG.dados);
      html += pvCampoBT("Complemento", u.complemento, PG.atend);
      html += pvCampoBT("Bairro", o.bairro, PG.dados);
    } else {
      html += pvCampoBT(
        "Distrito / Comunidade",
        o.distritoComunidade,
        PG.dados,
      );
      html += pvCampoBT("Nome da propriedade", o.nomePropriedade, PG.dados);
      html += pvCampoBT("Ponto de referência", o.pontoRef, PG.dados);
    }
    html += pvCampoBT("Cidade", o.cidade, PG.dados);
    html += pvCampoBT("Estado", o.estado, PG.dados);
    html += pvCampoBT(
      "Distância do padrão até a rede Cemig inferior a 30m?",
      o.distMenor30,
      PG.dados,
    );
    html += pvCampoBT(
      "O padrão está pronto para ser ligado?",
      o.prontoLigar,
      PG.dados,
    );
    html += pvCampoBT(
      "O padrão precisa ser mudado de local?",
      u.mudancaLocal,
      PG.atend,
    );
    if (rural && u.mudancaLocal === "Sim" && (u.padraoLat || u.padraoLng)) {
      html += pvCampoBT(
        "Novo local do padrão (lat/long)",
        [u.padraoLat, u.padraoLng].filter(Boolean).join(", "),
        PG.atend,
      );
      html += pvCampoBT("Novo local do padrão (UTM)", u.padraoUtm, PG.atend);
    }
    html += pvCampoBT(
      "Tipo de rede BT que atende o local",
      o.tipoRede,
      PG.dados,
    );
    html += `</div></div>`;
  });
  box.innerHTML = html;
  // Documentos necessários (derivados do preenchimento)
  const docsBox = $("#docsNecessarios");
  if (docsBox) {
    const docs = listaDocumentosBT({
      pessoaFisica: pf,
      pessoaJuridica: pessoaJuridica(),
      coletivo: false,
      multiTorres: false,
      hibrido: false,
      obra: o,
      atend: state.atend,
      ucsDet: state.ucsDet,
      ucBlocos: [],
      blocos: [],
      exibeTermoGrupoB: exibeTermoGrupoBBT(),
      demandaTotalGeral: demandaTotalGeralBT(),
      temMotoresPesados: motoresPesadosBT().length > 0,
    });
    docsBox.innerHTML = docs
      .map(
        (dd) => `<div class="preview-item"><span class="v">${dd}</span></div>`,
      )
      .join("");
  }
  // Pendências + botão exportar
  const v = validacaoObrigatoriosBT();
  const faltasBox = $("#previaFaltas");
  if (faltasBox)
    faltasBox.innerHTML = v.ok
      ? ""
      : `<div class="alert alert-warn" style="margin-bottom:12px"><strong>Preencha os campos obrigatórios para liberar o PDF:</strong><ul style="margin:6px 0 0 18px">${v.faltando.map((f) => `<li>${f}</li>`).join("")}</ul></div>`;
  const btn = $("#btnExportarPDF");
  if (btn) btn.disabled = !v.ok;
  // Motores pesados + Termo Grupo B
  const avisoMot = $("#motoresPesadosAviso");
  if (avisoMot)
    avisoMot.style.display = motoresPesadosBT().length ? "" : "none";
  const termoBox = $("#termoGrupoBBox");
  if (termoBox) termoBox.style.display = exibeTermoGrupoBBT() ? "" : "none";
}

/* ===== Análise de Partida de Motores (sub-tela opcional) ===== */
const DISPOSITIVOS_PARTIDA_BT = [
  "Chave Estrela-Triângulo",
  "Chave Compensadora",
  "Soft-Starter",
  "Inversor de Frequência",
];
function _motorLabelCV(m) {
  const tab = m.fase === "mono" ? MOTOR_MONO : MOTOR_TRI;
  const row = tab.find((r) => r.cv === parseFloat(m.cv));
  return (row && row.l) || m.cv;
}
function mostrarAnaliseMotoresBT(mostrar) {
  const previa = $("#previaWrap"),
    analise = $("#analiseMotoresBox");
  if (!previa || !analise) return;
  previa.style.display = mostrar ? "none" : "";
  analise.style.display = mostrar ? "" : "none";
  if (mostrar) renderAnaliseMotoresBT();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function renderAnaliseMotoresBT() {
  const box = $("#analiseMotoresConteudo");
  if (!box) return;
  box.innerHTML = "";
  const lista = motoresPesadosBT();
  if (!lista.length) {
    box.innerHTML =
      '<div class="field-hint">Nenhum motor pesado identificado.</div>';
    return;
  }
  lista.forEach(({ ucIndex, motorIndex, motor }) => {
    const ap = (motor.analisePartida = motor.analisePartida || {});
    const sub = document.createElement("div");
    sub.className = "subbox";
    sub.style.marginTop = "14px";
    const titulo = document.createElement("div");
    titulo.className = "subbox-title";
    titulo.style.marginBottom = "8px";
    titulo.textContent = `UC ${ucIndex + 1} — Motor ${motorIndex + 1} (${motor.fase === "mono" ? "Monofásico" : "Trifásico"}, ${_motorLabelCV(motor)} CV)`;
    sub.appendChild(titulo);
    const grade = (campos) => {
      const g = document.createElement("div");
      g.className = "grid grid-3";
      g.style.marginTop = "10px";
      campos.forEach((f) => g.appendChild(f));
      return g;
    };
    const inputNum = (chave, placeholder) => {
      const inp = document.createElement("input");
      inp.type = "number";
      inp.placeholder = placeholder || " ";
      inp.value = ap[chave] || "";
      inp.addEventListener("input", () => {
        ap[chave] = inp.value;
        atualizarPartida();
      });
      return inp;
    };
    const inputTxt = (chave, placeholder) => {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.placeholder = placeholder || " ";
      inp.value = ap[chave] || "";
      inp.addEventListener("input", () => (ap[chave] = inp.value));
      return inp;
    };
    const travado = document.createElement("input");
    travado.value = "Cliente ligado a rede CEMIG";
    travado.disabled = true;
    const cPartidaInp = document.createElement("input");
    cPartidaInp.disabled = true;
    const atualizarPartida = () => {
      const cNom = parseFloat(ap.correnteNominal) || 0;
      const ipIn = parseFloat(ap.ipIn) || 0;
      cPartidaInp.value = cNom && ipIn ? fmt2(cNom * ipIn) : "—";
    };
    atualizarPartida();
    sub.appendChild(
      grade([
        _campo("Potência do transformador do consumidor (kVA)", travado),
        _campo(
          "Corrente Nominal (A)",
          inputNum("correnteNominal", "Ex.: 12,5"),
        ),
        _campo("Relação Ip/In", inputNum("ipIn", "Ex.: 6")),
      ]),
    );
    sub.appendChild(
      grade([
        _campo("Corrente de partida (A)", cPartidaInp),
        _campo(
          "Fator de potência na partida",
          inputNum("fpPartida", "Ex.: 0,35"),
        ),
        _campo("Número de partidas", inputNum("numPartidas")),
      ]),
    );
    const selDisp = _selectDe(
      DISPOSITIVOS_PARTIDA_BT,
      ap.dispositivo || "",
      (v) => {
        ap.dispositivo = v;
        if (v !== "Chave Compensadora") ap.tap = "";
        tapBox.style.display = v === "Chave Compensadora" ? "" : "none";
      },
      true,
    );
    sub.appendChild(_campo("Dispositivo auxiliar de partida", selDisp));
    const tapBox = grade([_campo("Tap (%)", inputNum("tap", "Ex.: 65"))]);
    tapBox.style.display =
      ap.dispositivo === "Chave Compensadora" ? "" : "none";
    sub.appendChild(tapBox);
    sub.appendChild(
      grade([
        _campo("Ordem de partida", inputNum("ordemPartida")),
        _campo("Carga operando (kVA)", inputNum("cargaOperanteKVA")),
        _campo("Carga operando (FP)", inputNum("cargaOperanteFP")),
      ]),
    );
    const simult = document.createElement("div");
    simult.className = "toggle-group";
    ["Sim", "Não"].forEach((vv) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "toggle-btn" + (ap.simultaneidade === vv ? " on" : "");
      b.textContent = vv;
      b.addEventListener("click", () => {
        ap.simultaneidade = vv;
        simult
          .querySelectorAll(".toggle-btn")
          .forEach((x) => x.classList.toggle("on", x === b));
      });
      simult.appendChild(b);
    });
    sub.appendChild(
      grade([
        _campo(
          "Carga sensível — Tipo",
          inputTxt("cargaSensivelTipo", "Ex.: CLP, iluminação"),
        ),
        _campo(
          "Carga sensível — % admissível",
          inputNum("cargaSensivelPercentual"),
        ),
        _campo("Simultaneidade", simult),
      ]),
    );
    box.appendChild(sub);
  });
}
/* Exportação do relatório de partida (porte de revisar.js — folha A4 por
   motor pesado; impedância do trafo omitida: cliente em rede secundária). */
function exportarPDFPartidaBT() {
  if (!window.jspdf) {
    alert("Biblioteca jsPDF não carregada.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW = 210,
    MG = 14,
    CW = PW - 2 * MG;
  let cy = MG;
  const drawTopBar = () => {
    doc.setFillColor(10, 47, 39);
    doc.rect(0, 0, PW, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("FORMULÁRIO PARA A ANÁLISE DE PARTIDA DE MOTORES", PW / 2, 10, {
      align: "center",
    });
    cy = 23;
  };
  const sec = (t) => {
    doc.setFillColor(230, 242, 238);
    doc.rect(MG, cy, CW, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(10, 47, 39);
    doc.text(t, MG + 2, cy + 4.2);
    cy += 9;
  };
  const kv = (label, valor) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(20, 20, 20);
    doc.text(label, MG, cy);
    doc.setFont("helvetica", "normal");
    doc.text(String(valor), MG + 78, cy);
    cy += 5.5;
  };
  const valTexto = (v, sufixo) => {
    const s = String(v == null ? "" : v).trim();
    if (!s) return "________________";
    return sufixo ? `${s} ${sufixo}` : s;
  };
  const nomeCliente = (state.prop.nome || "Cliente").trim();
  const lista = motoresPesadosBT();
  if (!lista.length) {
    drawTopBar();
    sec("IDENTIFICAÇÃO");
    kv("Cliente:", nomeCliente || "________________");
    cy += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text("Nenhum motor pesado identificado.", MG, cy);
  } else {
    lista.forEach(({ motor }, i) => {
      if (i > 0) doc.addPage();
      cy = MG;
      drawTopBar();
      sec("IDENTIFICAÇÃO");
      kv("Cliente:", nomeCliente || "________________");
      sec("TIPO DO MOTOR / NÚMERO DE FASES");
      kv(
        "Número de fases:",
        motor.fase === "mono" ? "Monofásico" : "Trifásico",
      );
      const ap = motor.analisePartida || {};
      const cNom = parseFloat(ap.correnteNominal) || 0;
      const ipIn = parseFloat(ap.ipIn) || 0;
      const cPartida = cNom && ipIn ? (cNom * ipIn).toFixed(2) : "";
      sec("DADOS ELÉTRICOS");
      kv("Potência do motor (CV):", valTexto(_motorLabelCV(motor)));
      kv("Corrente Nominal (A):", valTexto(ap.correnteNominal));
      kv("Relação Ip/In:", valTexto(ap.ipIn));
      kv("Corrente de partida (A):", valTexto(cPartida));
      kv("Fator de potência na partida:", valTexto(ap.fpPartida));
      sec("NÚMERO DE PARTIDAS");
      kv("Número de partidas:", valTexto(ap.numPartidas));
      sec("DISPOSITIVO AUXILIAR DE PARTIDA (QUANDO HOUVER)");
      const dispositivoTexto = ap.dispositivo
        ? ap.dispositivo +
          (ap.dispositivo === "Chave Compensadora"
            ? ` — Tap: ${valTexto(ap.tap, "%")}`
            : "")
        : "________________";
      kv("Dispositivo:", dispositivoTexto);
      sec("ORDEM DE PARTIDA DO MOTOR (DOIS OU MAIS MOTORES)");
      kv("Ordem de partida:", valTexto(ap.ordemPartida));
      sec("CARGAS OPERANDO ENQUANTO O MOTOR PARTE");
      kv("Potência (kVA):", valTexto(ap.cargaOperanteKVA));
      kv("Fator de potência:", valTexto(ap.cargaOperanteFP));
      sec("CARGAS SENSÍVEIS A FLUTUAÇÕES DE TENSÃO");
      kv("Tipo:", valTexto(ap.cargaSensivelTipo));
      kv("Flutuação admissível (%):", valTexto(ap.cargaSensivelPercentual));
      sec("SIMULTANEIDADE DE PARTIDA");
      kv("Simultaneidade:", valTexto(ap.simultaneidade));
      sec("TRANSFORMADOR DO CONSUMIDOR");
      kv("Potência do transformador:", "Cliente ligado a rede CEMIG");
      sec("NOTAS");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(60, 60, 60);
      doc.text(
        doc.splitTextToSize(
          "1 - Em caso de partida sequencial de motores, preencher uma folha para cada motor, indicando a ordem de partida.",
          CW,
        ),
        MG,
        cy,
      );
      cy += 8;
      doc.text(
        doc.splitTextToSize(
          "2 - Anexar, sempre que possível, a(s) folha(s) das características elétricas, fornecida(s) pelo fabricante do motor.",
          CW,
        ),
        MG,
        cy,
      );
      cy += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(20, 20, 20);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, MG, cy);
      cy += 22;
      doc.setDrawColor(60, 60, 60);
      doc.line(MG, cy, MG + 90, cy);
      cy += 4;
      doc.setFontSize(8);
      doc.text("Responsável pelas informações", MG, cy);
    });
  }
  const nomeArquivo = `Analise_Partida_Motores_${nomeCliente.replace(/\s+/g, "_") || "Cliente"}.pdf`;
  doc.save(nomeArquivo);
}

/* ===== Exportações ===== */
function exportarTermoGrupoBBT() {
  gerarTermoGrupoB({
    prop: state.prop,
    obra: state.obra,
    ucsDet: state.ucsDet,
  });
}
function exportarPdfBT() {
  const v = validacaoObrigatoriosBT();
  if (!v.ok) {
    renderPreviaBT();
    return;
  }
  gerarPdfDoc({
    multiTorres: false,
    coletivo: false,
    atend: state.atend,
    prop: state.prop,
    corr: state.corr,
    obra: state.obra,
    prevTotalKw: 0,
    demandaPrevTotal: 0,
    trocaDisjGeral: false,
    hibrido: false,
    ucsDet: state.ucsDet,
    ucBlocos: [],
    blocos: [],
    totalUcsEmpreendimento: 0,
    obs: state.obs,
    demandaTotalGeral: demandaTotalGeralBT(),
    logoPDF: state.logoPDF,
    pessoaFisica: pessoaFisica(),
  });
}
/* ===== boot (chamado pelo etapas-loader com o DOM completo) ===== */
window.initFormulario = function () {
  // Título do form-header a partir do card (Baixa Tensão - <subtipo>)
  const subtipo = _prefAtividade || (CARD && CARD.nome) || "";
  const h1 = $("#formTitulo");
  if (h1) h1.textContent = "Baixa Tensão" + (subtipo ? " - " + subtipo : "");
  btRenumerarEtapas();
  // Cards restritos (casa50/casa100): sem bloco coletivo nas orientações
  const orientColetivo = $("#orientColetivoBox");
  if (orientColetivo && restrito) orientColetivo.style.display = "none";
  bindInputs();
  montarToggles();
  // Zona travada (card Rural): toggle desabilitado + hint
  if (zonaTravada) {
    const sel = $(`select[data-k="obra.localizacao"]`);
    if (sel) {
      sel.disabled = true;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    const hint = $("#zonaHint");
    if (hint) hint.style.display = "";
  } else {
    // Cards não-rurais (residencial/comercial/industrial…): sem opção urbano/
    // rural — a zona fica fixa em Urbana e o seletor é ocultado. Rural só existe
    // no card Rural (travaZonaRural). O bloco rural fica oculto por onZonaBT().
    state.obra.localizacao = "Urbana";
    const sel = $(`select[data-k="obra.localizacao"]`);
    if (sel) sel.value = "Urbana";
    // Oculta a .grid inteira da "Zona de localização" (não só o .field): uma grid
    // vazia ainda ocupa espaço e, somada ao margin-top do #endUrbanoBox, deixava
    // o gap subtítulo→campos maior que o dos outros cards.
    const zonaToggle = $(`[data-toggle="obra.localizacao"]`);
    const zonaGrid = zonaToggle && zonaToggle.closest(".grid");
    if (zonaGrid) zonaGrid.style.display = "none";
    // Sem a linha da zona, o endereço urbano é o 1º bloco de campos — o
    // espaçamento vem do margin-bottom do .card-sub (como nos demais cards).
    const endUrbano = $("#endUrbanoBox");
    if (endUrbano) endUrbano.style.marginTop = "0";
  }
  onZonaBT();
  onReceberEmailBT();
  onProntoLigarBT();
  mostrarCamposPFBT();
  onCoordBT(true);
  renderUcsIdentBT();
  renderUcsBT();
  renderRestricaoAmbiental();
  // Sidebar: navegação livre
  $$(".vstep").forEach((s, i) =>
    s.addEventListener("click", () => goTo(i, true)),
  );
};
