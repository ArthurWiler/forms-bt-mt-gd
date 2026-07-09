/* ============================================================
   CEMIG BT — Fluxo INDIVIDUAL em HTML/JS puro (padrão MT)
   ------------------------------------------------------------
   Substitui o app React (bt/js/app.js) APENAS para o formulário
   Individual (cards formType:"individual" — bt/individual.html).
   Coletivo/Condomínio continuam no React em bt/index.html.

   O estado mantém o MESMO shape que gerarPdfDoc(S) espera
   (prop/corr/obra como objetos + ucsDet[]) — pdf.js, calc.js,
   data.js e termo-grupo-b.js são reutilizados sem alteração.
   Inputs escalares são bindados por caminho (data-k="prop.nome").
   O cálculo de cargas reutiliza calcDemandaResultados
   (shared/js/calc-demanda.js) sobre o catálogo do BT (js/data.js)
   — mesma matemática do CalcDemanda React.
   ============================================================ */

/* ===== util ===== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

function _get(obj, path) {
  return String(path)
    .split(".")
    .reduce((o, k) => (o == null ? o : o[k]), obj);
}
function _setPath(path, v) {
  const ks = String(path).split(".");
  let o = state;
  for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
  o[ks[ks.length - 1]] = v;
}
// Handlers inline disparam ANTES do listener do bindInputs — sincroniza.
function _sync(k) {
  const el = $(`[data-k="${k}"]`);
  if (el) _setPath(k, el.value);
  return _get(state, k);
}

/* ===== Card da modalidade (?mod=<id>) ===== */
const _todasModalidades = MODALIDADES_SECOES.flatMap((s) => s.cards);
const CARD = (() => {
  const mod = new URLSearchParams(window.location.search).get("mod");
  const card = mod ? _todasModalidades.find((c) => c.id === mod) : null;
  if (!card || card.status !== "ok" || card.formType !== "individual") {
    window.location.href = "../index.html";
    return {}; // o redirect não interrompe o script — segue com card vazio
  }
  return card;
})();
const restrito = !!(CARD && CARD.restrito);
const zonaTravada = !!(CARD && CARD.travaZonaRural);
const atividadeTravada = !!(CARD && CARD.prefill && CARD.prefill.atividade);

/* ===== Estado (mesmo shape do App React / gerarPdfDoc) ===== */
function propPadrao() {
  return {
    nome: "",
    filiacao: "",
    email: "",
    rg: "",
    nasc: "",
    celular: "",
    fixo: "",
    cpfCnpj: "",
    laudoMedico: "Não",
    nis: "Não",
    numNis: "",
  };
}
function corrPadrao() {
  return {
    vencimento: "",
    receberEmail: "Sim",
    alternativa: "Endereço novo",
    outroEmail: "",
    rua: "",
    bairro: "",
    num: "",
    compl: "",
    municipio: "",
    cep: "",
    estado: "MG",
    possuiContaGlobal: "Não",
    contaGlobal: "",
  };
}
function obraPadrao() {
  return {
    art: "",
    prontoLigar: "",
    restricaoAmbiental: "",
    restricaoAceite: false,
    restricoesTexto: "",
    restricoesDetalhe: [],
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
    utm: "",
    distMenor30: "",
    tipoRede: "Trifásica",
    transformador: "",
    pontoRef: "",
    nomePropriedade: "",
    distritoComunidade: "",
    instProxima: "",
  };
}
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

/* ===== derivados ===== */
const docInfo = () => validarCpfCnpj(state.prop.cpfCnpj);
const pessoaFisica = () => docInfo().tipo === "CPF";
const pessoaJuridica = () => docInfo().tipo === "CNPJ";
const redeMonoBT = () =>
  state.obra.tipoRede === "Monofásica" || state.obra.tipoRede === "Bifásica";
const ruralBT = () => state.obra.localizacao === "Rural";

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

/* ===== Gates de avanço (form-marcadores data-gate) ===== */
// Etapa 2: exige CPF/CNPJ COMPLETO e VÁLIDO (docValido do React).
window.btPropDocOk = () => docInfo().valido === true;
// Etapa 3: vencimento + condicionais (CAMPOS_OBRIGATORIOS.corr do React) —
// toggles usam select oculto (invisível p/ marcadores), daí o gate.
window.btCorrOk = () => {
  const c = state.corr;
  const ok = (v) => String(v == null ? "" : v).trim() !== "";
  if (!ok(c.vencimento)) return false;
  if (c.receberEmail === "Não") {
    if (c.alternativa === "Outro e-mail" && !ok(c.outroEmail)) return false;
    if (
      c.alternativa === "Endereço novo" &&
      !(ok(c.cep) && ok(c.rua) && ok(c.num) && ok(c.bairro) && ok(c.municipio))
    )
      return false;
    if (c.possuiContaGlobal === "Sim" && !ok(c.contaGlobal)) return false;
  }
  return true;
};
// Etapa 5: combinação de disjuntores válida (2+ UCs).
window.btCargasOk = () => validacaoDisjuntoresBT().ok !== false;

/* ===== navegação ===== */
let pagina = 0;
function goTo(n, livre) {
  const paginas = $$("section.page");
  const passos = $$(".vstep");
  if (n < 0 || n >= paginas.length) return;
  if (!livre && n > pagina) {
    const v = CemigMarcadores.validar(paginas[pagina]);
    if (!v.ok) {
      if (v.primeiro) v.primeiro.focus();
      return;
    }
  }
  pagina = n;
  paginas.forEach((p, i) => p.classList.toggle("show", i === n));
  passos.forEach((s, i) => {
    s.classList.toggle("active", i === n);
    s.classList.toggle("done", i < n);
    const num = s.querySelector(".vstep-num");
    if (num) num.textContent = i < n ? "✓" : String(i + 1);
  });
  // Conteúdo dinâmico por presença (lição do MT)
  if (paginas[n].querySelector("#map")) {
    initMapaObra();
    if (mapaObra) setTimeout(() => mapaObra.invalidateSize(), 150);
  }
  if (paginas[n].querySelector("#ucsBox")) renderUcsBT();
  if (paginas[n].querySelector("#previaConteudo")) {
    mostrarAnaliseMotoresBT(false);
    renderPreviaBT();
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
  CemigMarcadores.atualizarAvancar();
}

/* ===== binding por caminho (data-k="prop.nome") ===== */
function bindInputs() {
  $$("[data-k]").forEach((el) => {
    const k = el.dataset.k;
    const v = _get(state, k);
    if (v != null && String(v) !== "") el.value = String(v);
    else if (el.tagName === "SELECT" && !el.hasAttribute("data-sem-vazio"))
      el.value = "";
    const ev = el.tagName === "SELECT" ? "change" : "input";
    el.addEventListener(ev, () => {
      _setPath(k, el.value);
      // Campos duplicados (ex.: obra.cidade nos blocos urbano e rural)
      $$(`[data-k="${k}"]`).forEach((outro) => {
        if (outro !== el && outro.value !== el.value) outro.value = el.value;
      });
    });
  });
}
function onMascara(el, fn) {
  el.value = fn(el.value);
  _setPath(el.dataset.k, el.value);
}

/* ===== Toggles (padrão .toggle-btn do BT; select oculto = fonte) ===== */
function _toggleRender(box, sel) {
  const valor = sel.value;
  const opts = [...sel.options].filter((o) => o.value !== "" || o.textContent);
  const ehSimNao =
    opts.length === 2 &&
    opts.every((o) => o.value === "Sim" || o.value === "Não");
  const desab = sel.disabled;
  box.className =
    "toggle-group" +
    (ehSimNao ? "" : " toggle-group--opcoes") +
    (desab ? " toggle-disabled" : "");
  box.setAttribute("role", "radiogroup");
  box.innerHTML = "";
  opts.forEach((o) => {
    if (o.value === "" && !o.textContent) return; // placeholder vazio
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", valor === o.value ? "true" : "false");
    b.className = "toggle-btn" + (valor === o.value ? " on" : "");
    b.textContent = o.textContent;
    b.disabled = desab;
    b.addEventListener("click", () => {
      _setPath(sel.dataset.k, o.value);
      sel.value = o.value;
      sel.dispatchEvent(new Event("input", { bubbles: true }));
      sel.dispatchEvent(new Event("change", { bubbles: true }));
      const fn = box.dataset.toggleOnchange;
      if (fn && typeof window[fn] === "function") window[fn]();
      _toggleRender(box, sel);
    });
    box.appendChild(b);
  });
}
function montarToggles() {
  $$("[data-toggle]").forEach((box) => {
    const k = box.dataset.toggle;
    const sel =
      $(`select[data-k="${k}"]`, box.parentElement) ||
      $(`select[data-k="${k}"]`);
    if (!sel) return;
    _toggleRender(box, sel);
    // Mudanças externas (bind/estado) re-renderizam os botões
    sel.addEventListener("change", () => _toggleRender(box, sel));
  });
}

/* ===== Etapa 2 — Proprietário ===== */
function mostrarCamposPFBT() {
  const info = docInfo();
  const pf = info.tipo === "CPF" && info.valido === true;
  $$(".pf-campo").forEach((el) => {
    el.style.display = pf ? "" : "none";
  });
  const nisBox = $("#numNisBox");
  if (nisBox)
    nisBox.style.display = pf && state.prop.nis === "Sim" ? "" : "none";
  CemigMarcadores.aplicar();
  CemigMarcadores.atualizarAvancar();
}
window.onNisBT = mostrarCamposPFBT;
let _cnpjBuscado = "";
function onCpfCnpjBT(el) {
  el.value = mascararCpfCnpj(el.value);
  _setPath("prop.cpfCnpj", el.value);
  const info = docInfo();
  el.classList.toggle("is-invalid", info.valido === false);
  if (info.tipo === "CNPJ") {
    // PF → PJ: limpa campos exclusivos de pessoa física (como o React)
    Object.assign(state.prop, {
      filiacao: "",
      rg: "",
      nasc: "",
      laudoMedico: "Não",
      nis: "Não",
      numNis: "",
    });
    ["prop.filiacao", "prop.rg", "prop.nasc", "prop.numNis"].forEach((k) => {
      const c = $(`[data-k="${k}"]`);
      if (c) c.value = "";
    });
    if (info.valido === true && soDigitos(el.value) !== _cnpjBuscado) {
      _cnpjBuscado = soDigitos(el.value);
      buscarCNPJ(el.value);
    }
  }
  mostrarCamposPFBT();
}
function setStatus(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}
async function buscarCNPJ(doc) {
  const limpo = soDigitos(doc);
  if (limpo.length !== 14) return setStatus("cnpjStatus", "");
  setStatus("cnpjStatus", '<span class="spinner"></span>');
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${limpo}`);
    if (!r.ok) throw new Error();
    const dd = await r.json();
    const p = state.prop;
    p.nome = dd.razao_social || dd.nome_fantasia || p.nome;
    p.email = dd.email || p.email;
    if (dd.ddd_telefone_1 && !p.fixo)
      p.fixo = mascararTelefone(dd.ddd_telefone_1);
    ["prop.nome", "prop.email", "prop.fixo"].forEach((k) => {
      const el = $(`[data-k="${k}"]`);
      if (el) el.value = _get(state, k) || "";
    });
    setStatus("cnpjStatus", '<span class="badge">dados preenchidos</span>');
    CemigMarcadores.atualizarAvancar();
  } catch (e) {
    setStatus(
      "cnpjStatus",
      '<span style="color:var(--vermelho);font-size:12px">CNPJ não encontrado</span>',
    );
  }
}

/* ===== CEP (obra/correspondência) ===== */
async function onCepBT(el, alvo) {
  el.value = mascararCEP(el.value);
  _setPath(el.dataset.k, el.value);
  const statusId = alvo === "obra" ? "cepStatusObra" : "cepStatusCorr";
  const limpo = soDigitos(el.value);
  if (limpo.length !== 8) return setStatus(statusId, "");
  setStatus(statusId, '<span class="spinner"></span>');
  try {
    const r = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    const dd = await r.json();
    if (dd.erro) throw new Error();
    if (alvo === "obra") {
      const o = state.obra;
      o.endereco = dd.logradouro || o.endereco;
      o.bairro = dd.bairro || o.bairro;
      o.cidade = dd.localidade || o.cidade;
      o.estado = dd.uf || o.estado;
      ["obra.endereco", "obra.bairro", "obra.cidade", "obra.estado"].forEach(
        (k) => {
          $$(`[data-k="${k}"]`).forEach(
            (c) => (c.value = _get(state, k) || ""),
          );
        },
      );
      onEnderecoUrbanoBT();
    } else {
      const c = state.corr;
      c.rua = dd.logradouro || c.rua;
      c.bairro = dd.bairro || c.bairro;
      c.municipio = dd.localidade || c.municipio;
      c.estado = dd.uf || c.estado;
      ["corr.rua", "corr.bairro", "corr.municipio", "corr.estado"].forEach(
        (k) => {
          const el2 = $(`[data-k="${k}"]`);
          if (el2) el2.value = _get(state, k) || "";
        },
      );
    }
    setStatus(statusId, '<span class="badge">Endereço encontrado</span>');
    CemigMarcadores.atualizarAvancar();
  } catch (e) {
    setStatus(
      statusId,
      '<span style="color:var(--vermelho);font-size:12px">CEP não encontrado</span>',
    );
  }
}

/* ===== Etapa 3 — Correspondência ===== */
function onReceberEmailBT() {
  const box = $("#correspNaoBox");
  const mostrar = state.corr.receberEmail === "Não";
  if (box) box.style.display = mostrar ? "" : "none";
  if (mostrar) onCorrAlternativaBT();
}
function onCorrAlternativaBT() {
  const v = state.corr.alternativa;
  const obra = $("#corrObraAviso"),
    email = $("#corrEmailBox"),
    end = $("#corrEndBox");
  if (obra) obra.style.display = v === "Mesmo da obra" ? "" : "none";
  if (email) email.style.display = v === "Outro e-mail" ? "" : "none";
  if (end) end.style.display = v === "Endereço novo" ? "" : "none";
}
function onContaGlobalBT() {
  const box = $("#contaGlobalBox");
  if (box)
    box.style.display = state.corr.possuiContaGlobal === "Sim" ? "" : "none";
}

/* ===== Etapa 4 — Dados da unidade (zona/avisos/coordenadas) ===== */
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
function onProntoLigarBT() {
  const v = state.obra.prontoLigar;
  const sim = $("#prontoSimAviso"),
    nao = $("#prontoNaoAviso");
  if (sim) sim.style.display = v === "Sim" ? "" : "none";
  if (nao) nao.style.display = v === "Não" ? "" : "none";
}
function onTipoRedeBT() {
  _sync("obra.tipoRede");
  // redeMono muda a lista de disjuntores das UCs
  renderUcsBT();
}

/* ===== Mapa Leaflet + restrição ambiental (porte do MT/BT) ===== */
let mapaObra = null;
let marcadorObra = null;
let restricaoLayer = null;
let _mapaObraDebounce = null;
let _btLastRestrKey = "";
let _btLastGeoKey = "";
let _btGeoDebounce = null;
function alertHTML(tipo, html) {
  const cls = tipo === "warn" ? "cmg-aviso cmg-aviso--warn" : "cmg-aviso";
  return `<div class="${cls}"><div class="cmg-aviso-icon" aria-hidden="true"></div><p class="cmg-aviso-texto">${html}</p></div>`;
}
function _aplicarCoordDoMapa(lat, lng) {
  const latEl = $(`[data-k="obra.lat"]`),
    lngEl = $(`[data-k="obra.lng"]`);
  if (latEl) latEl.value = String(lat);
  if (lngEl) lngEl.value = String(lng);
  state.obra.lat = String(lat);
  state.obra.lng = String(lng);
  onCoordBT(true);
}
function initMapaObra() {
  const div = $("#map");
  if (!div || !window.L || mapaObra) return;
  mapaObra = window.L.map(div).setView([-19.9167, -43.9345], 12);
  const ruas = window.L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { maxZoom: 19, attribution: "© OpenStreetMap" },
  );
  const satelite = window.L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    {
      maxZoom: 19,
      attribution:
        "Tiles © Esri — Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community",
    },
  );
  satelite.addTo(mapaObra);
  window.L.control.layers({ Satélite: satelite, Ruas: ruas }).addTo(mapaObra);
  mapaObra.on("click", (e) => _aplicarCoordDoMapa(e.latlng.lat, e.latlng.lng));
  setTimeout(() => mapaObra.invalidateSize(), 200);
  const lat = parseFloat(String(state.obra.lat).replace(",", ".")),
    lng = parseFloat(String(state.obra.lng).replace(",", "."));
  if (!isNaN(lat) && !isNaN(lng)) sincronizarMapaComCoordenadas(lat, lng, true);
}
function sincronizarMapaComCoordenadas(lat, lng, imediato) {
  if (isNaN(lat) || isNaN(lng)) return;
  clearTimeout(_mapaObraDebounce);
  const atualizar = () => {
    if (!mapaObra) return;
    const ll = window.L.latLng(lat, lng);
    if (marcadorObra) {
      marcadorObra.setLatLng([lat, lng]);
      if (!mapaObra.getBounds().contains(ll))
        mapaObra.setView(ll, Math.max(mapaObra.getZoom(), 17));
    } else {
      marcadorObra = window.L.marker([lat, lng], { draggable: true }).addTo(
        mapaObra,
      );
      marcadorObra.on("dragend", (e) => {
        const p = e.target.getLatLng();
        _aplicarCoordDoMapa(p.lat, p.lng);
      });
      // Primeira aparição do pino: centraliza no ZOOM MÁXIMO dos tiles.
      const zMax = Number.isFinite(mapaObra.getMaxZoom())
        ? mapaObra.getMaxZoom()
        : 19;
      mapaObra.setView(ll, zMax);
    }
    setTimeout(() => mapaObra.invalidateSize(), 100);
  };
  if (imediato) atualizar();
  else _mapaObraDebounce = setTimeout(atualizar, 600);
}
const _nDig = (s) => (String(s || "").match(/\d/g) || []).length;
function onCoordBT(imediato) {
  _sync("obra.lat");
  _sync("obra.lng");
  const o = state.obra;
  o.utm = utmString(o.lat, o.lng);
  const utmEl = $("#bt_utm");
  if (utmEl) utmEl.value = o.utm;
  atualizarCoordRural();
  const lat = parseFloat(String(o.lat).replace(",", ".")),
    lng = parseFloat(String(o.lng).replace(",", "."));
  if (isNaN(lat) || isNaN(lng)) return;
  if (_nDig(o.lat) < 5 || _nDig(o.lng) < 5) return;
  sincronizarMapaComCoordenadas(lat, lng, !!imediato);
  consultarRestricaoAmbientalBT(lat, lng);
}
// Geocodificação estruturada pelo endereço urbano (debounce, como BT/MT).
async function geocodificarEnderecoBT() {
  const o = state.obra;
  if (ruralBT()) return;
  const pronto =
    String(o.endereco || "").trim() &&
    String(o.num || "").trim() &&
    String(o.cidade || "").trim();
  if (!pronto) return;
  if (_nDig(o.lat) >= 5 && _nDig(o.lng) >= 5) return;
  const key = [o.endereco, o.num, o.bairro, o.cidade, o.cep]
    .join("|")
    .toLowerCase();
  if (_btLastGeoKey === key) return;
  const status = $("#mapaStatus");
  if (status) status.textContent = "Buscando coordenada…";
  try {
    const r = await geocodificarEnderecoBR({
      logradouro: o.endereco,
      numero: o.num,
      bairro: o.bairro,
      cidade: o.cidade,
      uf: o.estado,
      cep: o.cep,
    });
    _btLastGeoKey = key;
    if (!r) {
      if (status)
        status.textContent =
          "Endereço não encontrado. Informe a coordenada manualmente.";
      return;
    }
    if (status) status.textContent = "";
    _aplicarCoordDoMapa(r.lat, r.lon);
  } catch (e) {
    if (status) status.textContent = "Falha ao geocodificar o endereço.";
  }
}
function onEnderecoUrbanoBT() {
  clearTimeout(_btGeoDebounce);
  _btGeoDebounce = setTimeout(geocodificarEnderecoBT, 800);
}
function _limparRestricaoLayer() {
  if (mapaObra && restricaoLayer) mapaObra.removeLayer(restricaoLayer);
  restricaoLayer = null;
}
function renderRestricaoAmbiental() {
  const box = $("#restricaoAmbientalConteudo");
  const wrap = $("#restricaoAmbientalBox");
  if (!box || !wrap) return;
  if (state.obra.restricaoAmbiental === "Sim") {
    wrap.style.display = "";
    const det = state.obra.restricoesDetalhe;
    const sentenca =
      typeof restricaoSentencaHTML === "function"
        ? restricaoSentencaHTML(det)
        : "";
    const docs =
      typeof restricaoDocsHTML === "function" ? restricaoDocsHTML(det) : "";
    const label =
      typeof RESTRICAO_ACEITE_LABEL !== "undefined"
        ? RESTRICAO_ACEITE_LABEL
        : "Declaro que li e estou de acordo com as informações acima.";
    box.innerHTML =
      alertHTML("warn", `<span>${sentenca}</span>`) +
      docs +
      `<label class="restricao-aceite"><input type="checkbox" id="restricaoAceite"${state.obra.restricaoAceite ? " checked" : ""}> <span>${label}</span></label>`;
    const chk = $("#restricaoAceite");
    if (chk)
      chk.onchange = (e) => {
        state.obra.restricaoAceite = e.target.checked;
      };
  } else {
    wrap.style.display = "none";
    box.innerHTML = "";
  }
}
async function consultarRestricaoAmbientalBT(lat, lng) {
  if (!window.turf || typeof consultarRestricoesObra !== "function") return;
  if (isNaN(lat) || isNaN(lng)) return;
  const key = lat.toFixed(5) + "," + lng.toFixed(5);
  if (_btLastRestrKey === key) return;
  _btLastRestrKey = key;
  const status = $("#mapaStatus");
  if (status) status.textContent = "Consultando restrições…";
  try {
    const res = await consultarRestricoesObra(lat, lng);
    const dentros = res.filter((r) => r.dentro);
    const errosTodos = res.length > 0 && res.every((r) => r.erro);
    if (errosTodos) {
      Object.assign(state.obra, {
        restricaoAmbiental: "",
        restricaoAceite: false,
        restricoesTexto: "",
        restricoesDetalhe: [],
      });
      _btLastRestrKey = "";
      _limparRestricaoLayer();
      renderRestricaoAmbiental();
      if (status)
        status.textContent =
          "Não foi possível consultar a restrição ambiental (verifique conexão/camadas).";
      return;
    }
    state.obra.restricaoAmbiental = dentros.length ? "Sim" : "Não";
    state.obra.restricaoAceite = false;
    state.obra.restricoesTexto = dentros
      .map(
        (r) =>
          r.rotulo + (r.nomes.length ? " (" + r.nomes.join(", ") + ")" : ""),
      )
      .join("\n");
    state.obra.restricoesDetalhe = detalhesRestricoes(res);
    renderRestricaoAmbiental();
    if (mapaObra && typeof desenharRestricoesNoMapa === "function") {
      _limparRestricaoLayer();
      restricaoLayer = desenharRestricoesNoMapa(window.L, mapaObra, res);
    }
    if (status) status.textContent = "";
  } catch (e) {
    _btLastRestrKey = "";
    if (status)
      status.textContent =
        (e && e.message) || "Falha na consulta de restrições.";
  }
}

/* ============================================================
   Etapa 5 — Atendimento: blocos colapsáveis por UC
   (identificação + cargas em acordeões + gerador + resultado)
   ============================================================ */
function onNUCsBT() {
  _sync("atend.nUCs");
  state.atend.nUCs = parseInt(state.atend.nUCs, 10) || 1;
  renderUcsBT();
}
function _sincronizarUcs() {
  const n = Math.min(Math.max(1, Number(state.atend.nUCs) || 1), 3);
  const arr = state.ucsDet;
  while (arr.length < n) arr.push(novaUcDet());
  while (arr.length > n) arr.pop();
}
function renderUcsBT() {
  const box = $("#ucsBox");
  if (!box) return;
  _sincronizarUcs();
  // Resultados sempre atualizados, mesmo com o bloco da UC fechado (o preset
  // do card já conta na demanda/validação sem o usuário precisar abrir).
  state.ucsDet.forEach((u) => {
    if (ucSemAlteracao(u)) return;
    const d = Object.assign(
      { qtds: [], tipoA: "", catA: 0, mots: [] },
      u.cargas || {},
    );
    d.qtds = CAT.map((_, i) => d.qtds[i] || 0);
    const r = calcDemandaResultados(d, redeMonoBT());
    d._demanda = r.demandaTotal;
    d._cargaKw = r.cargaInstalada;
    d._disjuntores = r.disjuntores.map((x) => x.fx);
    u.cargas = d;
  });
  atualizarSolicitacaoAuto();
  box.innerHTML = "";
  const multi = state.ucsDet.length > 1;
  state.ucsDet.forEach((u, ui) => {
    const aberta = _ucAberta[ui] === true;
    const bloco = document.createElement("div");
    bloco.className = "uc-colapsavel" + (aberta ? " is-open" : "");
    // Cabeçalho (endereço da obra + complemento da UC)
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
    head.addEventListener("click", () => {
      _ucAberta[ui] = !aberta;
      renderUcsBT();
    });
    bloco.appendChild(head);
    if (aberta) {
      const corpo = document.createElement("div");
      corpo.className = "uc-colapsavel-corpo";
      corpo.appendChild(_ucIdentificacao(u, ui));
      if (ucSemAlteracao(u)) {
        const info = document.createElement("div");
        info.className = "alert alert-info";
        info.innerHTML =
          "Esta UC foi marcada como <strong>Caixa Existente sem Alteração</strong>. O preenchimento de cargas foi omitido; ela aparecerá apenas no resumo do PDF.";
        corpo.appendChild(info);
      } else {
        const cargasBox = document.createElement("div");
        corpo.appendChild(cargasBox);
        corpo.appendChild(_ucGerador(u, ui));
        const resultadoBox = document.createElement("div");
        corpo.appendChild(resultadoBox);
        montarCargasBT(cargasBox, u, ui, () =>
          _renderResultadoUC(resultadoBox, u, ui, multi),
        );
        _renderResultadoUC(resultadoBox, u, ui, multi);
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
function _campo(labelHtml, controle, cls) {
  const f = document.createElement("div");
  f.className = "field" + (cls ? " " + cls : "");
  const l = document.createElement("label");
  l.innerHTML = labelHtml;
  f.append(l, controle);
  return f;
}
function _selectDe(opcoes, valor, onchange, comVazio) {
  const s = document.createElement("select");
  s.innerHTML =
    (comVazio ? '<option value=""></option>' : "") +
    opcoes.map((o) => `<option value="${o}">${o}</option>`).join("");
  s.value = valor || (comVazio ? "" : opcoes[0]);
  s.addEventListener("change", () => onchange(s.value));
  return s;
}
function _ucIdentificacao(u, ui) {
  const grid = document.createElement("div");
  grid.className = "grid grid-2";
  grid.style.marginBottom = "24px";
  const atividadeBloqueada = restrito || atividadeTravada;
  // Solicitação por UC
  const selSol = _selectDe(
    ["Conexão Nova", "Alteração de Carga", "Caixa Existente sem Alteração"],
    u.solicitacao,
    (v) => {
      u.solicitacao = v;
      renderUcsBT();
    },
  );
  grid.appendChild(
    _campo('Solicitação <span class="req">*</span>', selSol, "field--float"),
  );
  // Atividade principal
  const selAtiv = _selectDe(
    ["Residencial", "Comercial", "Industrial", "Rural"],
    u.atividade,
    (v) => {
      u.atividade = v;
      renderUcsBT();
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
    inp.disabled = restrito;
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
  return grid;
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
   Formulário de Carga do BT (acordeões, Figma) — mesma matemática
   do React via calcDemandaResultados (shared/js/calc-demanda.js).
   ============================================================ */
const _REFRI = new Set([
  "Geladeira comum",
  "Geladeira duplex",
  "Freezer vertical",
  "Freezer horiz. médio",
  "Freezer horiz. grande",
  "Adega climatizada",
]);
const _ehRefri = (c) => c.g === "b5" && _REFRI.has(c.n);
const CARGA_CATS_BT = [
  { id: "il", label: "Iluminação e tomada", match: (c) => c.g === "il" },
  {
    id: "b1",
    label: "Chuveiro, torneira e cafeteira",
    match: (c) => c.g === "b1",
  },
  { id: "b2", label: "Aquecedor de água", match: (c) => c.g === "b2" },
  { id: "b3", label: "Forno, fogão e grill", match: (c) => c.g === "b3" },
  {
    id: "b4",
    label: "Lavadoras, secadores e ferro",
    match: (c) => c.g === "b4",
  },
  { id: "refri", label: "Refrigeração", match: _ehRefri },
  { id: "c", label: "Ar condicionado", match: (c) => c.g === "c" },
  {
    id: "demais",
    label: "Demais aparelhos",
    match: (c) => (c.g === "b5" && !_ehRefri(c)) || c.g === "f",
  },
];
function montarCargasBT(container, u, ui, aoMudar) {
  const d = Object.assign(
    { qtds: [], tipoA: "", catA: 0, mots: [] },
    u.cargas || {},
  );
  d.qtds = CAT.map((_, i) => d.qtds[i] || 0);
  u.cargas = d;
  let busca = "";
  const abertos = (u._acc = u._acc || {});
  function notificar() {
    const r = calcDemandaResultados(d, redeMonoBT());
    d._demanda = r.demandaTotal;
    d._cargaKw = r.cargaInstalada;
    d._disjuntores = r.disjuntores.map((x) => x.fx);
    atualizarSolicitacaoAuto();
    if (aoMudar) aoMudar();
    CemigMarcadores.atualizarAvancar();
    return r;
  }
  // Trava do tipo de carga pela atividade (Residencial → res; Com/Ind → nr)
  function aplicarAtividade() {
    const a = u.atividade || "";
    if (a === "Residencial") {
      if (d.tipoA !== "res") d.tipoA = "res";
      return true;
    }
    if (a === "Comercial" || a === "Industrial") {
      if (d.tipoA !== "nr") d.tipoA = "nr";
      return true;
    }
    return false;
  }
  function render() {
    const bloqueado = aplicarAtividade();
    notificar();
    container.innerHTML = "";
    // Tipo de carga: o BT OCULTA o campo quando a atividade o define.
    if (!bloqueado) container.appendChild(_fieldTipo());
    if (!d.tipoA) {
      const hint = document.createElement("div");
      hint.className = "field-hint";
      hint.style.marginTop = "10px";
      hint.textContent =
        "Selecione o tipo de carga para detalhar os equipamentos.";
      container.appendChild(hint);
      return;
    }
    container.appendChild(_busca());
    container.appendChild(_accList());
  }
  function _fieldTipo() {
    const field = document.createElement("div");
    field.className = "field field--plain";
    const label = document.createElement("label");
    label.innerHTML = 'Tipo de carga <span class="req">*</span>';
    field.appendChild(label);
    const group = document.createElement("div");
    group.className = "toggle-group";
    group.style.alignItems = "center";
    const sel = document.createElement("select");
    sel.innerHTML =
      '<option value=""></option><option value="res">Residencial</option><option value="nr">Não-Residencial</option>';
    sel.value = d.tipoA;
    sel.addEventListener("change", () => {
      d.tipoA = sel.value;
      render();
    });
    group.appendChild(sel);
    if (d.tipoA === "nr") {
      const selCat = document.createElement("select");
      selCat.style.width = "auto";
      selCat.innerHTML = TABELA_11.map(
        (c, i) => `<option value="${i}">${c.d}</option>`,
      ).join("");
      selCat.value = String(d.catA);
      selCat.addEventListener("change", () => {
        d.catA = +selCat.value;
        notificar();
      });
      group.appendChild(selCat);
    }
    field.appendChild(group);
    if (window.CemigMarcadores)
      CemigMarcadores.aplicar(field.parentElement || field);
    return field;
  }
  function _busca() {
    const box = document.createElement("div");
    box.className = "carga-busca";
    box.innerHTML =
      '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
    const inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = "Buscar equipamento";
    inp.value = busca;
    inp.addEventListener("input", () => {
      busca = inp.value;
      const lista = container.querySelector(".carga-acc-list");
      if (lista) _renderAccList(lista);
    });
    box.appendChild(inp);
    return box;
  }
  function _accList() {
    const lista = document.createElement("div");
    lista.className = "carga-acc-list";
    _renderAccList(lista);
    return lista;
  }
  function _accHead(k, label, count, open, onToggle) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "carga-acc-head";
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.innerHTML =
      `<span class="carga-acc-label">${label}</span>` +
      `<span class="carga-acc-meta">${count > 0 ? `<span class="carga-acc-badge">${count}</span>` : ""}<span class="carga-acc-chevron" aria-hidden="true"></span></span>`;
    btn.addEventListener("click", onToggle);
    return btn;
  }
  function _renderAccList(lista) {
    lista.innerHTML = "";
    const filtrado = CAT.map((c, i) => ({ ...c, i })).filter(
      (c) => !busca || c.n.toLowerCase().includes(busca.toLowerCase()),
    );
    CARGA_CATS_BT.forEach((cat) => {
      const items = filtrado.filter(cat.match);
      if (busca && !items.length) return;
      const open = busca ? items.length > 0 : !!abertos[cat.id];
      const acc = document.createElement("div");
      acc.className = "carga-acc" + (open ? " is-open" : "");
      const count = CAT.reduce(
        (s, c, i) => s + (cat.match(c) ? d.qtds[i] || 0 : 0),
        0,
      );
      acc.appendChild(
        _accHead(cat.id, cat.label, count, open, () => {
          abertos[cat.id] = !abertos[cat.id];
          _renderAccList(lista);
        }),
      );
      if (open) {
        const body = document.createElement("div");
        body.className = "carga-acc-body";
        items.forEach((c) => {
          const row = document.createElement("div");
          row.className = "carga-row";
          const nome = document.createElement("div");
          nome.innerHTML = `<div class="nome">${c.n} <span class="pot">(${fmtW(c.w)} W)</span></div>`;
          const ctrl = document.createElement("div");
          ctrl.className = "qtd-ctrl";
          const menos = document.createElement("button");
          menos.type = "button";
          menos.textContent = "−";
          const inp = document.createElement("input");
          inp.type = "number";
          inp.value = d.qtds[c.i] || 0;
          const mais = document.createElement("button");
          mais.type = "button";
          mais.className = "plus";
          mais.textContent = "+";
          const setQ = (v) => {
            d.qtds[c.i] = Math.max(0, v);
            if (inp.value !== String(d.qtds[c.i])) inp.value = d.qtds[c.i];
            notificar();
            // Badge da categoria acompanha a contagem
            const badge = acc.querySelector(".carga-acc-meta");
            const novo = CAT.reduce(
              (s, cc, i) => s + (cat.match(cc) ? d.qtds[i] || 0 : 0),
              0,
            );
            badge.innerHTML =
              (novo > 0 ? `<span class="carga-acc-badge">${novo}</span>` : "") +
              '<span class="carga-acc-chevron" aria-hidden="true"></span>';
          };
          menos.addEventListener("click", () => setQ((d.qtds[c.i] || 0) - 1));
          mais.addEventListener("click", () => setQ((d.qtds[c.i] || 0) + 1));
          inp.addEventListener("input", () => setQ(parseInt(inp.value) || 0));
          ctrl.append(menos, inp, mais);
          row.append(nome, ctrl);
          body.appendChild(row);
        });
        acc.appendChild(body);
      }
      lista.appendChild(acc);
    });
    lista.appendChild(_accMotores(lista));
  }
  function _accMotores(lista) {
    const open = !!abertos._mot;
    const acc = document.createElement("div");
    acc.className = "carga-acc" + (open ? " is-open" : "");
    acc.appendChild(
      _accHead(
        "_mot",
        "Motores e cargas especiais",
        d.mots.length,
        open,
        () => {
          abertos._mot = !abertos._mot;
          _renderAccList(lista);
        },
      ),
    );
    if (open) {
      const body = document.createElement("div");
      body.className = "carga-acc-body";
      const r = calcDemandaResultados(d, redeMonoBT());
      if (d.mots.length) {
        const table = document.createElement("table");
        table.className = "motores-table";
        table.innerHTML =
          "<thead><tr><th>Tipo</th><th>Potência (CV)</th><th>Quantidade</th><th>Dem. Unit. (KVA)</th><th>Dem. Total (KVA)</th><th></th></tr></thead>";
        const tbody = document.createElement("tbody");
        d.mots.forEach((m, mi) => {
          const linha = r.rD.det[mi] || {};
          const tr = document.createElement("tr");
          const tdFase = document.createElement("td");
          const selFase = document.createElement("select");
          selFase.innerHTML =
            '<option value="mono">Monofásico</option><option value="tri">Trifásico</option>';
          selFase.value = m.fase;
          selFase.addEventListener("change", () => {
            m.fase = selFase.value;
            _renderAccList(lista); // troca a tabela de CVs
            notificar();
          });
          tdFase.appendChild(selFase);
          const tdCv = document.createElement("td");
          const selCv = document.createElement("select");
          selCv.innerHTML = (m.fase === "mono" ? MOTOR_MONO : MOTOR_TRI)
            .map((rr) => `<option value="${rr.cv}">${rr.l}</option>`)
            .join("");
          selCv.value = String(m.cv);
          selCv.addEventListener("change", () => {
            m.cv = selCv.value;
            notificar();
            _atualizarCelulasMotores(lista);
          });
          tdCv.appendChild(selCv);
          const tdQ = document.createElement("td");
          const inpQ = document.createElement("input");
          inpQ.type = "number";
          inpQ.min = "0";
          inpQ.value = m.q;
          inpQ.style.width = "60px";
          inpQ.addEventListener("input", () => {
            m.q = parseInt(inpQ.value) || 0;
            notificar();
            _atualizarCelulasMotores(lista);
          });
          tdQ.appendChild(inpQ);
          const tdUnit = document.createElement("td");
          tdUnit.className = "num";
          tdUnit.dataset.calcCel = "kvaUnit";
          tdUnit.textContent = fmt2(linha.kvaUnit || 0);
          const tdTot = document.createElement("td");
          tdTot.className = "num";
          tdTot.dataset.calcCel = "kva";
          tdTot.textContent = fmt2(linha.kva || 0);
          const tdDel = document.createElement("td");
          const del = document.createElement("button");
          del.type = "button";
          del.className = "motor-del";
          del.setAttribute("aria-label", "Remover motor");
          del.textContent = "✕";
          del.addEventListener("click", () => {
            d.mots.splice(mi, 1);
            notificar();
            _renderAccList(lista);
          });
          tdDel.appendChild(del);
          tr.append(tdFase, tdCv, tdQ, tdUnit, tdTot, tdDel);
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        body.appendChild(table);
        if (r.rD.d > 0) {
          const total = document.createElement("div");
          total.className = "motores-total";
          total.innerHTML = `Demanda total dos motores: <strong>${fmt2(r.rD.d)} kVA</strong>`;
          body.appendChild(total);
        }
      }
      const addBox = document.createElement("div");
      addBox.className = "motores-add";
      const add = document.createElement("button");
      add.type = "button";
      add.className = "btn btn-ghost motores-add-btn";
      add.textContent = "+ Adicionar motor";
      add.addEventListener("click", () => {
        d.mots.push({ fase: "mono", cv: 1, q: 1 });
        notificar();
        _renderAccList(lista);
      });
      addBox.appendChild(add);
      body.appendChild(addBox);
      acc.appendChild(body);
    }
    return acc;
  }
  function _atualizarCelulasMotores(lista) {
    // A coluna c1..c4 depende da contagem total: recalcula todas as células
    const r = calcDemandaResultados(d, redeMonoBT());
    const trs = lista.querySelectorAll(".motores-table tbody tr");
    trs.forEach((tr, mi) => {
      const linha = r.rD.det[mi] || {};
      const unit = tr.querySelector('[data-calc-cel="kvaUnit"]');
      const tot = tr.querySelector('[data-calc-cel="kva"]');
      if (unit) unit.textContent = fmt2(linha.kvaUnit || 0);
      if (tot) tot.textContent = fmt2(linha.kva || 0);
    });
    const totalEl = lista.querySelector(".motores-total");
    if (totalEl && r.rD.d > 0)
      totalEl.innerHTML = `Demanda total dos motores: <strong>${fmt2(r.rD.d)} kVA</strong>`;
  }
  render();
}

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
  if (c.receberEmail === "Não") {
    if (c.alternativa === "Outro e-mail")
      req(c.outroEmail, "E-mail alternativo da fatura");
    else if (c.alternativa === "Endereço novo") {
      req(c.cep, "CEP de correspondência");
      req(c.rua, "Rua/Av. de correspondência");
      req(c.num, "Nº de correspondência");
      req(c.bairro, "Bairro de correspondência");
      req(c.municipio, "Município de correspondência");
    }
  }
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
function pvCampoBT(label, valor, step, full) {
  const vazio = valor == null || valor === "";
  const lapis =
    step != null
      ? `<button type="button" class="previa-edit" title="Editar" aria-label="Editar ${label}" onclick="goTo(${step}, true)"></button>`
      : "";
  return `<div class="previa-campo${full ? " previa-campo--full" : ""}"><div class="previa-campo-label">${label}</div><div class="previa-campo-valor">${vazio ? "—" : valor}${lapis}</div></div>`;
}
function pvCardBT(label, valor) {
  return `<div class="previa-card"><div class="previa-card-label">${label}</div><div class="previa-card-valor">${valor || "—"}</div></div>`;
}
function renderPreviaBT() {
  const box = $("#previaConteudo");
  if (!box) return;
  const p = state.prop,
    c = state.corr,
    o = state.obra;
  const pf = pessoaFisica();
  const rural = ruralBT();
  const emailFatura =
    c.receberEmail === "Não"
      ? c.alternativa === "Outro e-mail"
        ? c.outroEmail
        : c.alternativa
      : p.email;
  const modalidadeTexto = "Individual - até 3 caixas sem proteção geral";
  let html = `<div class="previa-secao"><h4 class="previa-secao-titulo">Dados do proprietário</h4><div class="previa-grid">`;
  html += pvCampoBT("Nome", p.nome, 1, true);
  html += pvCampoBT("E-mail", p.email, 1);
  html += pvCampoBT("Celular", p.celular, 1);
  html += pvCampoBT(pf ? "CPF" : "CNPJ", p.cpfCnpj, 1);
  if (pf) {
    html += pvCampoBT("Filiação", p.filiacao, 1);
    html += pvCampoBT("RG", p.rg, 1);
    html += pvCampoBT("Data de nascimento", p.nasc, 1);
  }
  html += `</div></div><hr class="previa-divider" />`;
  html += `<div class="previa-secao"><h4 class="previa-secao-titulo">Correspondência</h4><div class="previa-grid">`;
  html += pvCampoBT("E-mail para receber a fatura", emailFatura, 2);
  html += pvCampoBT(
    "Data de vencimento da fatura",
    c.vencimento ? "Todo dia " + c.vencimento : "",
    2,
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
    html += pvCampoBT("Tipo de solicitação", u.solicitacao, 4);
    html += pvCampoBT("Atividade principal", u.atividade);
    html += pvCampoBT("Ramo da atividade", u.ramo);
    html += pvCampoBT("Solicitação", state.atend.solicitacao);
    if (!rural) {
      html += pvCampoBT("CEP", o.cep, 3, true);
      html += pvCampoBT("Endereço", o.endereco, 3);
      html += pvCampoBT("Número", o.num, 3);
      html += pvCampoBT("Complemento", u.complemento, 4);
      html += pvCampoBT("Bairro", o.bairro, 3);
    } else {
      html += pvCampoBT("Distrito / Comunidade", o.distritoComunidade, 3);
      html += pvCampoBT("Nome da propriedade", o.nomePropriedade, 3);
      html += pvCampoBT("Ponto de referência", o.pontoRef, 3);
    }
    html += pvCampoBT("Cidade", o.cidade, 3);
    html += pvCampoBT("Estado", o.estado, 3);
    html += pvCampoBT(
      "Distância do padrão até a rede Cemig inferior a 30m?",
      o.distMenor30,
      3,
    );
    html += pvCampoBT(
      "O padrão está pronto para ser ligado?",
      o.prontoLigar,
      3,
    );
    html += pvCampoBT(
      "O padrão precisa ser mudado de local?",
      u.mudancaLocal,
      4,
    );
    html += pvCampoBT("Tipo de rede BT que atende o local", o.tipoRede, 3);
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
// Logo colorida do PDF (mesmo carregamento canvas→dataURL do React).
(function carregarLogoPDF() {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const cv = document.createElement("canvas");
      cv.width = img.naturalWidth;
      cv.height = img.naturalHeight;
      cv.getContext("2d").drawImage(img, 0, 0);
      state.logoPDF = {
        url: cv.toDataURL("image/png"),
        w: img.naturalWidth,
        h: img.naturalHeight,
      };
    } catch (e) {}
  };
  img.src = "../imgs/logos/logo-cemig-cor.png";
})();

/* ===== boot (chamado pelo etapas-loader com o DOM completo) ===== */
window.initFormulario = function () {
  // Título do form-header a partir do card (Baixa Tensão - <subtipo>)
  const subtipo = _prefAtividade || (CARD && CARD.nome) || "";
  const h1 = $("#formTitulo");
  if (h1) h1.textContent = "Baixa Tensão" + (subtipo ? " - " + subtipo : "");
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
  }
  onZonaBT();
  onReceberEmailBT();
  onContaGlobalBT();
  onProntoLigarBT();
  mostrarCamposPFBT();
  onCoordBT(true);
  renderUcsBT();
  renderRestricaoAmbiental();
  // Sidebar: navegação livre
  $$(".vstep").forEach((s, i) =>
    s.addEventListener("click", () => goTo(i, true)),
  );
};
