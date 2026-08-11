/* ============================================================
   MINIGERAÇÃO DISTRIBUÍDA — app vanilla (molde microgeracao/js/app.js)
   ------------------------------------------------------------
   Estado plano de gdEstadoInicial() (js/model.js) bindado por
   [data-k]; etapas em fragmentos (etapas/*.html) via
   shared/js/etapas-loader.js. Diferenças do micro: múltiplas
   fontes de geração (fontes[]/qtdFontes), Garantia de Fiel
   Cumprimento calculada (Regra 19), Grid Zero como campo editável
   (trava modalidade e demanda de geração) e Grupo A fixo.
   O PDF (js/pdf.js, gerarPdfMiniGD) recebe o MESMO estado plano.
   ============================================================ */

/* ===== Estado global ===== */
const state = gdEstadoInicial();
window.state = state; // visível p/ depuração e harnesses
let ilhaCargas = null;

/* ===== util ===== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
// Handlers onchange do HTML disparam ANTES do listener do bindInputs —
// cada handler sincroniza o próprio campo no início (mesma razão do MT).
function _sync(k) {
  const el = $(`[data-k="${k}"]`);
  if (el) state[k] = el.value;
  return state[k];
}

/* ===== CARDS DE SELEÇÃO (motor portado do MT/micro) ===== */
const SIM_NAO = [
  { valor: "Não", texto: "Não" },
  { valor: "Sim", texto: "Sim" },
];
const CARDS_GD = [
  // laudoMedico e nis saíram daqui: a etapa 2 é cópia fiel do microGD e os
  // traz como <select> com opção vazia "—", não como cards Sim/Não.
  // localizacao vive na etapa 3, também copiada, e usa <div data-toggle>
  // — renderizado por montarToggles().
  { chave: "mudancaSE", gridId: "cardsMudancaSE", opcoes: SIM_NAO },
  { chave: "gridZero", gridId: "cardsGridZero", opcoes: SIM_NAO },
  { chave: "telhadoArrendado", gridId: "cardsTelhadoArrendado", opcoes: SIM_NAO },
  { chave: "anexouContrato", gridId: "cardsAnexouContrato", opcoes: SIM_NAO },
  { chave: "consorcioVerificado", gridId: "cardsConsorcioVerificado", opcoes: SIM_NAO },
  { chave: "possuiArmazenamento", gridId: "cardsPossuiArmazenamento", opcoes: SIM_NAO },
  { chave: "armOperacaoIlhada", gridId: "cardsArmOperacaoIlhada", opcoes: SIM_NAO },
  { chave: "armChaveDesconexao", gridId: "cardsArmChaveDesconexao", opcoes: SIM_NAO },
  { chave: "armReconexaoAuto", gridId: "cardsArmReconexaoAuto", opcoes: SIM_NAO },
  { chave: "decl81", gridId: "cardsDecl81", opcoes: SIM_NAO },
  {
    chave: "vencimento",
    gridId: "cardsVencimento",
    opcoes: ["01", "06", "11", "17", "22", "27"].map((d) => ({
      valor: d,
      texto: d,
    })),
    desmarcavel: true, // informar a data de vencimento é opcional
  },
];
function _cardDispatch(select, valor) {
  select.value = valor;
  state[select.dataset.k] = valor;
  select.dispatchEvent(new Event("input", { bubbles: true }));
  select.dispatchEvent(new Event("change", { bubbles: true }));
}
function _cardsMontar(campo) {
  const select = $(`select[data-k="${campo.chave}"]`);
  const grid = document.getElementById(campo.gridId);
  if (!select || !grid || select.dataset.cardMontado) return;
  select.dataset.cardMontado = "1";
  grid.className =
    "toggle-group" + (campo.opcoes.length > 2 ? " toggle-group--opcoes" : "");
  grid.setAttribute("role", "radiogroup");
  const render = () => {
    grid.innerHTML = "";
    campo.opcoes.forEach((op) => {
      const ativo = select.value === op.valor;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.setAttribute("role", "radio");
      btn.setAttribute("aria-checked", ativo ? "true" : "false");
      btn.className = "toggle-btn" + (ativo ? " on" : "");
      btn.textContent = op.texto;
      btn.addEventListener("click", () => {
        // `desmarcavel`: campo opcional — clicar no card já ativo limpa a
        // escolha (é o único caminho para desfazer, já que não há card de
        // recusa do tipo "Não informar").
        _cardDispatch(select, campo.desmarcavel && ativo ? "" : op.valor);
        render();
      });
      grid.appendChild(btn);
    });
  };
  select.addEventListener("change", render);
  render();
  select.style.display = "none";
  select.setAttribute("aria-hidden", "true");
}
function inicializarCards() {
  CARDS_GD.forEach(_cardsMontar);
  montarToggles();
}

/* ============================================================
   TOGGLES data-toggle — porte do microGD (que por sua vez o trouxe do
   BT). A etapa 3, cópia fiel do micro, traz <div data-toggle="chave"> +
   <select data-k> oculto; este renderizador mantém esse markup
   funcionando sem reescrever o HTML (que deve permanecer cópia fiel).
   Difere de _cardsMontar apenas na origem: lê as <option> do próprio
   select, em vez de uma lista declarada em CARDS_GD.
   ============================================================ */
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
      state[sel.dataset.k] = o.value;
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
    sel.addEventListener("change", () => _toggleRender(box, sel));
    sel.style.display = "none";
    sel.setAttribute("aria-hidden", "true");
  });
}

/* ===== Navegação ===== */
function goTo(n, livre) {
  const atual = $(".page.show");
  const atualN = atual ? parseInt(atual.id.replace("page-", ""), 10) : -1;
  if (!livre && n > atualN && atual && window.CemigMarcadores) {
    const r = window.CemigMarcadores.validar(atual);
    if (!r.ok) {
      if (r.primeiro)
        r.primeiro.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
  }
  $$(".page").forEach((p) => p.classList.remove("show"));
  const alvo = $("#page-" + n);
  if (!alvo) return;
  alvo.classList.add("show");
  $$(".vstep").forEach((s, i) => {
    s.classList.remove("active", "done");
    if (i < n) s.classList.add("done");
    if (i === n) s.classList.add("active");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (alvo.querySelector("#calcDemandaBox") && ilhaCargas) {
    ilhaCargas.atualizar();
    renderResultadoCargaGD();
  }
  if (alvo.querySelector("#fontesBox")) recalcFontes();
  if (alvo.querySelector("#gfcBloco")) atualizarGFC();
  // Leaflet mede o container ao criar o mapa; se a etapa estava oculta, os
  // tiles ficam cortados até um invalidateSize() com a página já visível.
  if (alvo.querySelector("#map")) {
    initMapaObra();
    if (mapaObra) setTimeout(() => mapaObra.invalidateSize(), 60);
  }
  if (alvo.querySelector("#previewContent")) renderPreviewGD();
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}

// As etapas 2 e 3 são cópias fiéis do microGD e trazem os botões
// Voltar/Avançar com data-nav ("prev"|"next") em vez de goTo(n) literal —
// navegação RELATIVA, que dispensa cada fragmento saber a própria posição.
document.addEventListener("click", (e) => {
  const b = e.target.closest ? e.target.closest("[data-nav]") : null;
  // aria-disabled: o "Avançar" bloqueado continua clicável (rola até o campo
  // que falta — ver form-marcadores), mas não navega.
  if (!b || b.disabled || b.getAttribute("aria-disabled") === "true") return;
  const atual = $(".page.show");
  if (!atual) return;
  const n = parseInt(atual.id.replace("page-", ""), 10);
  goTo(n + (b.dataset.nav === "next" ? 1 : -1));
});

/* ===== Bind genérico (data-k) ===== */
function bindInputs() {
  $$("[data-k]").forEach((el) => {
    const k = el.dataset.k;
    if (state[k] != null && String(state[k]) !== "") el.value = state[k];
    el.addEventListener("input", () => {
      state[k] = el.value;
    });
    el.addEventListener("change", () => {
      state[k] = el.value;
    });
  });
}
function aplicarPatch(patch) {
  Object.entries(patch).forEach(([k, v]) => {
    state[k] = v;
    const el = $(`[data-k="${k}"]`);
    if (el && v != null) el.value = v;
  });
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}

/* ===== Máscaras ===== */
function onMascara(el, fn) {
  el.value = fn(el.value);
  state[el.dataset.k] = el.value;
}
function onSoDigitos(el) {
  el.value = soDigitos(el.value);
  state[el.dataset.k] = el.value;
}
// Instalação / UC / Medidor: mantém dígitos e o hífen do verificador da UC
// nova (15 dígitos). Validação de formato via data-fmt="fmtInstalacaoUC".
function onInstalacaoUC(el) {
  el.value = mascararInstalacaoUC(el.value);
  state[el.dataset.k] = el.value;
}
function onNumDec(el) {
  el.value = String(el.value || "").replace(/[^\d.]/g, "");
  state[el.dataset.k] = el.value;
}
function setHint(id, msg, tipo) {
  const sp = document.getElementById(id);
  if (!sp) return;
  sp.textContent = msg || "";
  sp.className = "field-hint" + (tipo ? " field-" + tipo : "");
}

/* ===== Consultas externas (shared/js/api.js) ===== */
const consultas = criarConsultasExternas({
  d: state,
  set: aplicarPatch,
  soDigitos,
  mascararFixo,
  mascararCEP,
  setCepStatus: (m) => setHint("status-cep", m),
  setCnpjStatus: (m) => setHint("status-cnpj", m),
});

/* ===== Validação de contato (etapa 2, porte do microGD) ===== */
function _validarEmailGD(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}
function _validarTelefoneGD(v) {
  const d = String(v || "").replace(/\D/g, "");
  if (d.length < 10 || d.length > 11) return false;
  const ddd = parseInt(d.substring(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
}
// Campo vazio não acusa erro: o "obrigatório" é papel dos marcadores.
function _feedbackCampoGD(el, spanId, valido, msgErr) {
  if (!el || !el.value) {
    if (el) el.classList.remove("is-invalid");
    setHint(spanId, "");
    return;
  }
  el.classList.toggle("is-invalid", !valido);
  setHint(spanId, valido ? "" : msgErr, valido ? "" : "err");
}
function onEmailGD(k) {
  const el = $(`[data-k="${k}"]`);
  _feedbackCampoGD(el, `status-${k}`, _validarEmailGD(el && el.value), "e-mail inválido");
}
function onTelGD(k) {
  const el = $(`[data-k="${k}"]`);
  _feedbackCampoGD(el, `status-${k}`, _validarTelefoneGD(el && el.value), "telefone inválido");
}

/* ===== Identificação (idêntica ao micro) ===== */
function gdEhCpfValido() {
  const r = validarCpfCnpj(state.cpfCnpj);
  return r.tipo === "CPF" && r.valido === true;
}
// Gate de avanço da etapa 2 (espelha gdPropDocOk do micro): o documento
// precisa estar COMPLETO e VÁLIDO — não basta o obrigatório estar preenchido.
window.gdPropDocOk = () => validarCpfCnpj(state.cpfCnpj).valido === true;
function mostrarCamposPF(pf) {
  $$(".pf-campo").forEach((el) => {
    el.style.display = pf ? "" : "none";
  });
  if (!pf) {
    // Espelha o micro: os campos PF ocultos são zerados, inclusive laudo/NIS —
    // na etapa 2 copiada são <select> com opção vazia "—", não cards Sim/Não.
    ["filiacao", "rg", "nasc", "laudoMedico", "nis", "numNis"].forEach((k) => {
      const c = $(`[data-k="${k}"]`);
      if (c) c.value = "";
      state[k] = "";
    });
    const nb = $("#numNisBox");
    if (nb) nb.style.display = "none";
  } else {
    onNisGD();
  }
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}
function onNisGD() {
  _sync("nis");
  const box = $("#numNisBox");
  if (box) box.style.display = gdEhCpfValido() && state.nis === "Sim" ? "" : "none";
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}
let _cnpjBuscado = "";
function onCpfCnpjGD(el) {
  el.value = mascararCpfCnpj(el.value);
  state.cpfCnpj = el.value;
  const r = validarCpfCnpj(el.value);
  if (r.valido === null) {
    el.classList.remove("is-invalid");
    setHint("status-cnpj", "");
    mostrarCamposPF(false);
    _cnpjBuscado = "";
    return;
  }
  if (!r.valido) {
    queueMicrotask(() => el.classList.add("is-invalid"));
    setHint("status-cnpj", r.tipo + " inválido", "err");
    mostrarCamposPF(false);
    _cnpjBuscado = "";
    return;
  }
  el.classList.remove("is-invalid");
  if (r.tipo === "CPF") {
    setHint("status-cnpj", "CPF válido ✓", "ok");
    mostrarCamposPF(true);
    return;
  }
  mostrarCamposPF(false);
  const dv = soDigitos(el.value);
  if (_cnpjBuscado !== dv) {
    _cnpjBuscado = dv;
    consultas.buscarCnpj(dv);
  }
}
function onCepGD(el) {
  el.value = mascararCEP(el.value);
  state.cep = el.value;
  if (soDigitos(el.value).length === 8) consultas.buscarCep(el.value);
}

/* ===== Selects populados de js/data.js ===== */
function preencherSelect(k, lista) {
  const sel = $(`select[data-k="${k}"]`);
  if (!sel) return;
  const semVazio = sel.hasAttribute("data-sem-vazio");
  const atual = sel.value;
  sel.innerHTML =
    (semVazio ? "" : '<option value=""></option>') +
    lista.map((o) => `<option value="${o}">${o}</option>`).join("");
  if (atual && lista.map(String).includes(atual)) sel.value = atual;
}
function preencherSelects() {
  // "grupo" não tem select próprio: na minigeração é sempre "A" (uma única
  // opção em GD_GRUPOS), então o campo saiu da etapa 3 e o valor vem do estado.
  preencherSelect("classe", GD_CLASSES);
  preencherSelect("tipoLigTrafo", GD_TIPO_LIG_TRAFO);
  preencherSelect("tensaoAtendimento", GD_TENSAO_A);
  preencherSelect("entradaEnergia", GD_ENTRADA_ENERGIA);
  preencherSelect("solicitacao", GD_SOLICITACOES);
  preencherSelect("instExistenteBTMT", GD_BT_MT);
  // Nível de tensão da unidade arrendada (spec Figma) — mesma lista BT/MT.
  preencherSelect("arrendTensao", GD_BT_MT);
  preencherSelect("modalidade", GD_MODALIDADES);
  preencherSelect("garantiaForma", GD_GARANTIA_FORMAS);
}

/* ===== Etapa 3 — Dados da unidade (cópia do microGD) ===== */
function onCoordGD(el, imediato) {
  if (el) {
    el.value = el.value.replace(/[^\d.\-]/g, "");
    state[el.dataset.k] = el.value;
  }
  const u = gdUtmDeCoordenadas(state.latitude, state.longitude);
  if (u) {
    state.fuso = u.fuso;
    state.utmE = u.utmE;
    state.utmN = u.utmN;
  } else {
    state.fuso = "";
    state.utmE = "";
    state.utmN = "";
  }
  const disp = $("#gd_utm");
  if (disp) disp.value = u ? `${u.fuso}${u.banda} E:${u.utmE} N:${u.utmN}` : "";
  const utm = gdValidarUTM(state.fuso, state.utmE, state.utmN);
  setHint("utmHint", state.fuso && !utm.ok ? utm.msg : "");
  atualizarCoordRuralGD(); // zona rural exige coordenada (aviso do BT)
  // Mapa: só sincroniza com coordenada plausível (evita reposicionar o pino a
  // cada tecla enquanto o usuário ainda digita).
  const lat = parseFloat(String(state.latitude).replace(",", ".")),
    lng = parseFloat(String(state.longitude).replace(",", "."));
  if (isNaN(lat) || isNaN(lng)) return;
  if (_nDig(state.latitude) < 5 || _nDig(state.longitude) < 5) return;
  sincronizarMapaComCoordenadas(lat, lng, !!imediato);
  consultarRestricaoAmbientalGD(lat, lng);
}
/* ===== Etapa 3 — zona de localização (porte do microGD/BT) ===== */
// Trocar de zona limpa os campos da zona oposta, como no BT: o endereço
// urbano e o descritivo rural são mutuamente exclusivos no PDF.
function onZonaGD() {
  _sync("localizacao");
  const rural = state.localizacao === "Rural";
  if (rural) {
    ["cep", "logradouro", "numero", "complemento", "bairro"].forEach((k) => {
      state[k] = "";
      $$(`[data-k="${k}"]`).forEach((c) => (c.value = ""));
    });
  } else {
    ["distritoComunidade", "nomePropriedade", "pontoRef", "instProxima"].forEach(
      (k) => {
        state[k] = "";
        $$(`[data-k="${k}"]`).forEach((c) => (c.value = ""));
      },
    );
  }
  const urb = $("#endUrbanoBox"),
    rur = $("#endRuralBox");
  if (urb) urb.style.display = rural ? "none" : "";
  if (rur) rur.style.display = rural ? "" : "none";
  atualizarCoordRuralGD();
  if (window.CemigMarcadores) {
    window.CemigMarcadores.aplicar();
    window.CemigMarcadores.atualizarAvancar();
  }
}
// A coordenada é obrigatória em qualquer zona (o `*` está no HTML e vira
// data-req pelos marcadores); em zona rural, além disso, um aviso reforça
// que sem ela não há como localizar a propriedade.
function atualizarCoordRuralGD() {
  const rural = state.localizacao === "Rural";
  const coordOk =
    String(state.latitude).trim() && String(state.longitude).trim();
  const aviso = $("#coordRuralAviso");
  if (aviso) aviso.style.display = rural && !coordOk ? "" : "none";
}

/* ============================================================
   MAPA LEAFLET + RESTRIÇÃO AMBIENTAL — porte do microGD (que o trouxe
   do bt-core.js) para o estado plano do miniGD. Depende de Leaflet,
   Turf e shared/js/geo.js (carregados no index.html). O pino é
   arrastável e o clique no mapa define a coordenada; ambos escrevem em
   latitude/longitude, de onde o UTM é derivado por onCoordGD().
   ============================================================ */
let mapaObra = null;
let marcadorObra = null;
let restricaoLayer = null;
let _mapaObraDebounce = null;
let _gdLastRestrKey = "";
let _gdLastGeoKey = "";
let _gdGeoDebounce = null;
function _alertHTML(tipo, html) {
  const cls = tipo === "warn" ? "cmg-aviso cmg-aviso--warn" : "cmg-aviso";
  return `<div class="${cls}"><div class="cmg-aviso-icon" aria-hidden="true"></div><p class="cmg-aviso-texto">${html}</p></div>`;
}
function _aplicarCoordDoMapa(lat, lng) {
  const latEl = $(`[data-k="latitude"]`),
    lngEl = $(`[data-k="longitude"]`);
  if (latEl) latEl.value = String(lat);
  if (lngEl) lngEl.value = String(lng);
  state.latitude = String(lat);
  state.longitude = String(lng);
  onCoordGD(null, true);
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
    { maxZoom: 19, attribution: "" },
  );
  satelite.addTo(mapaObra);
  window.L.control.layers({ Satélite: satelite, Ruas: ruas }).addTo(mapaObra);
  mapaObra.on("click", (e) => _aplicarCoordDoMapa(e.latlng.lat, e.latlng.lng));
  setTimeout(() => mapaObra.invalidateSize(), 200);
  const lat = parseFloat(String(state.latitude).replace(",", ".")),
    lng = parseFloat(String(state.longitude).replace(",", "."));
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
// Geocodificação estruturada pelo endereço urbano (debounce, como no BT).
async function geocodificarEnderecoGD() {
  if (state.localizacao === "Rural") return;
  const pronto =
    String(state.logradouro || "").trim() &&
    String(state.numero || "").trim() &&
    String(state.municipio || "").trim();
  if (!pronto) return;
  if (_nDig(state.latitude) >= 5 && _nDig(state.longitude) >= 5) return;
  const key = [
    state.logradouro,
    state.numero,
    state.bairro,
    state.municipio,
    state.cep,
  ]
    .join("|")
    .toLowerCase();
  if (_gdLastGeoKey === key) return;
  const status = $("#mapaStatus");
  if (status) status.textContent = "Buscando coordenada…";
  try {
    const r = await geocodificarEnderecoBR({
      logradouro: state.logradouro,
      numero: state.numero,
      bairro: state.bairro,
      cidade: state.municipio,
      uf: state.estado,
      cep: state.cep,
    });
    _gdLastGeoKey = key;
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
function onEnderecoUrbanoGD() {
  clearTimeout(_gdGeoDebounce);
  _gdGeoDebounce = setTimeout(geocodificarEnderecoGD, 800);
}
function _limparRestricaoLayer() {
  if (mapaObra && restricaoLayer) mapaObra.removeLayer(restricaoLayer);
  restricaoLayer = null;
  if (mapaObra && typeof atualizarLegendaRestricoes === "function")
    atualizarLegendaRestricoes(mapaObra, null);
}
function renderRestricaoAmbiental() {
  const box = $("#restricaoAmbientalConteudo");
  const wrap = $("#restricaoAmbientalBox");
  if (!box || !wrap) return;
  if (state.restricaoAmbiental === "Sim") {
    wrap.style.display = "";
    const det = state.restricoesDetalhe;
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
      _alertHTML("warn", `<span>${sentenca}</span>`) +
      docs +
      `<label class="restricao-aceite"><input type="checkbox" id="restricaoAceite"${state.restricaoAceite ? " checked" : ""}> <span>${label}</span></label>`;
    const chk = $("#restricaoAceite");
    if (chk)
      chk.onchange = (e) => {
        state.restricaoAceite = e.target.checked;
      };
  } else {
    wrap.style.display = "none";
    box.innerHTML = "";
  }
}
async function consultarRestricaoAmbientalGD(lat, lng) {
  if (!window.turf || typeof consultarRestricoesObra !== "function") return;
  if (isNaN(lat) || isNaN(lng)) return;
  const key = lat.toFixed(5) + "," + lng.toFixed(5);
  if (_gdLastRestrKey === key) return;
  _gdLastRestrKey = key;
  const status = $("#mapaStatus");
  if (status) status.textContent = "Consultando restrições…";
  try {
    const res = await consultarRestricoesObra(lat, lng);
    const dentros = res.filter((r) => r.dentro);
    const errosTodos = res.length > 0 && res.every((r) => r.erro);
    if (errosTodos) {
      Object.assign(state, {
        restricaoAmbiental: "",
        restricaoAceite: false,
        restricoesTexto: "",
        restricoesDetalhe: [],
      });
      _gdLastRestrKey = "";
      _limparRestricaoLayer();
      renderRestricaoAmbiental();
      if (status)
        status.textContent =
          "Não foi possível consultar a restrição ambiental (verifique conexão/camadas).";
      return;
    }
    state.restricaoAmbiental = dentros.length ? "Sim" : "Não";
    state.restricaoAceite = false;
    state.restricoesTexto = dentros
      .map(
        (r) => r.rotulo + (r.nomes.length ? " (" + r.nomes.join(", ") + ")" : ""),
      )
      .join("\n");
    state.restricoesDetalhe = detalhesRestricoes(res);
    renderRestricaoAmbiental();
    if (mapaObra && typeof desenharRestricoesNoMapa === "function") {
      _limparRestricaoLayer();
      restricaoLayer = desenharRestricoesNoMapa(window.L, mapaObra, res);
    }
    if (status) status.textContent = "";
  } catch (e) {
    _gdLastRestrKey = "";
    if (status)
      status.textContent = (e && e.message) || "Falha na consulta de restrições.";
  }
}
// Descrições resumidas (ND-5.3) — mesmas do módulo MT/BT (tooltip "i").
const SE_INFO_GD = {
  1: "Aérea em poste: transformador instalado na rede aérea, para pequenas potências. Medição e proteção na base.",
  2: "Medição e proteção (com ou sem transformação), em alvenaria. Desde 03/07/2023 não se aplica a fornecimento individual em 13,8 kV; desde 01/01/2024 também não em compartilhado 13,8 kV. Permitida em 22/34,5 kV e uso compartilhado.",
  4: "Blindada: cubículo metálico compartimentado, com alívio de pressão e ventilação, abrigado ou ao tempo. Proteção na média tensão, sem transformação. Atende demandas de até 2500 kW.",
  5: "Medição, proteção e transformação, em alvenaria. Até 300 kW, com um transformador de 75 a 300 kVA. Proteção por chave fusível tripolar; medição a 3 elementos na média tensão.",
  8: "Blindada Simplificada (SEBS): subestação blindada metálica para uma única unidade, até 300 kW. Medição na média tensão, proteção por chave fusível tripolar e disjuntor de baixa tensão.",
};
function _seCtx() {
  return {
    solicitacao: state.solicitacao,
    tensao: state.tensaoAtendimento,
    mudancaSE: state.mudancaSE,
    instExistenteBTMT: state.instExistenteBTMT,
  };
}
function _tiposSEvisiveis() {
  const potInst = parseFloat(state.potAtivaInstalada) || 0;
  return GD_TIPOS_SE.filter(
    (s) => !(GD_SE_LIMITE_300.includes(s) && potInst > GD_SE_LIMITE_KW),
  );
}
function atualizarSE() {
  _sync("tensaoAtendimento");
  const galeria = $("#seGalleryGD");
  if (!galeria) return;
  const ctx = _seCtx();
  const visiveis = _tiposSEvisiveis();
  if (
    state.tipoSE &&
    (!gdSEDisponivel(state.tipoSE, ctx).ok || !visiveis.includes(state.tipoSE))
  ) {
    state.tipoSE = "";
  }
  setHint(
    "seBloqueioMsg",
    state.tipoSE ? gdSEDisponivel(state.tipoSE, ctx).msg : "",
  );
  const imgs =
    typeof SUBESTACAO_IMGS_B64 !== "undefined" ? SUBESTACAO_IMGS_B64 : {};
  galeria.innerHTML = "";
  visiveis.forEach((tipo) => {
    const n = (String(tipo).match(/(\d+)/) || [])[1];
    const desabilitado = !gdSEDisponivel(tipo, ctx).ok;
    const card = document.createElement("div");
    card.className =
      "se-card" +
      (state.tipoSE === tipo ? " selected" : "") +
      (desabilitado ? " disabled" : "");
    card.innerHTML =
      (n && SE_INFO_GD[n]
        ? `<span class="se-info">i<span class="se-tooltip">${SE_INFO_GD[n]}</span></span>`
        : "") +
      (n && imgs[n] ? `<img src="${imgs[n]}" alt="${tipo}">` : "") +
      `<div class="lbl">${tipo}${desabilitado ? " (indisponível)" : ""}</div>`;
    if (!desabilitado)
      card.addEventListener("click", () => {
        state.tipoSE = tipo;
        atualizarSE();
      });
    galeria.appendChild(card);
  });
  // Regra 9: aviso do limite de 300 kVA quando a SE selecionada o excede.
  const potInst = parseFloat(state.potAtivaInstalada) || 0;
  const excede =
    state.tipoSE &&
    GD_SE_LIMITE_300.includes(state.tipoSE) &&
    potInst > GD_SE_LIMITE_KW;
  const avisoEx = $("#avisoExcede300");
  if (avisoEx) {
    avisoEx.style.display = excede ? "" : "none";
    const txt = $("#avisoExcede300Texto");
    if (txt && excede)
      txt.innerHTML = `<strong>Limite de 300 kVA. </strong>A Subestação ${state.tipoSE} é limitada a ${GD_SE_LIMITE_KW} kVA. A potência instalada informada (${potInst} kW) excede esse limite — selecione outro tipo de subestação.`;
  }
  renderTrafosGD();
}
function onMudancaSE() {
  _sync("mudancaSE");
  atualizarSE();
}
function renderTrafosGD() {
  const box = $("#trafosBox");
  const tbody = $("#trafoGdBody");
  if (!box || !tbody) return;
  const mostrar = !!state.tipoSE;
  box.style.display = mostrar ? "" : "none";
  if (!mostrar) return;
  tbody.innerHTML = "";
  state.trafos.forEach((t, i) => {
    const tr = document.createElement("tr");
    // Potência LIVRE no mini (qualquer kVA, inclusive > RT — sem lista fixa).
    tr.innerHTML = `
      <td><input type="number" min="0" style="width:70px" value="${t.qte}"></td>
      <td><input type="number" min="0" step="any" style="width:120px" placeholder="kVA" value="${t.potencia}"></td>
      <td>${state.trafos.length > 1 ? '<button type="button" class="motor-del">✕</button>' : ""}</td>`;
    const inputs = tr.querySelectorAll("input");
    inputs[0].addEventListener("input", (e) => {
      state.trafos[i].qte = e.target.value;
    });
    inputs[1].addEventListener("input", (e) => {
      e.target.value = e.target.value.replace(/[^\d.]/g, "");
      state.trafos[i].potencia = e.target.value;
    });
    const del = tr.querySelector(".motor-del");
    if (del)
      del.addEventListener("click", () => {
        state.trafos.splice(i, 1);
        renderTrafosGD();
      });
    tbody.appendChild(tr);
  });
}
function addTrafoGD() {
  state.trafos.push({ se: state.tipoSE, qte: "", potencia: "" });
  renderTrafosGD();
}
function onEntradaEnergia() {
  _sync("entradaEnergia");
  const box = $("#qtdCubiculosBox");
  if (box)
    box.style.display =
      state.entradaEnergia === GD_ENTRADA_COMPARTILHADA ? "" : "none";
  if (window.CemigMarcadores) {
    window.CemigMarcadores.aplicar();
    window.CemigMarcadores.atualizarAvancar();
  }
}
function _ehLigacaoNova() {
  return state.solicitacao === GD_SOLICITACAO_LIG_NOVA;
}
function onSolicitacao() {
  _sync("solicitacao");
  const aviso = $("#avisoFormCarga");
  const exige = GD_SOLICITACOES_FORM_CARGA.includes(state.solicitacao);
  if (aviso) aviso.style.display = exige ? "" : "none";
  const avisoCarga = $("#avisoCargaObrigatoria");
  if (avisoCarga) avisoCarga.style.display = exige ? "" : "none";
  const nova = _ehLigacaoNova();
  ["#numUCBox", "#instExistenteBox", "#instExistenteBTMTBox", "#demandaConsumoAtualBox"].forEach(
    (s) => {
      const el = $(s);
      if (el) el.style.display = nova ? "none" : "";
    },
  );
  // Regra 10: "SEM Alteração de Demanda Contratada" não pede nova demanda.
  const semAlt = (state.solicitacao || "").indexOf("SEM Alteração de Demanda") >= 0;
  const dc = $("#demandaConsumoBox");
  if (dc) dc.style.display = semAlt ? "none" : "";
  // Regra 11: GD existente COM alteração ⇒ potência de geração atual.
  const pa = $("#potGeracaoAtualBox");
  if (pa)
    pa.style.display =
      (state.solicitacao || "").indexOf("GD Existente") >= 0 ? "" : "none";
  atualizarSE();
  if (window.CemigMarcadores) {
    window.CemigMarcadores.aplicar();
    window.CemigMarcadores.atualizarAvancar();
  }
}
function onInstExistenteBTMT() {
  _sync("instExistenteBTMT");
  atualizarSE();
}
// Regras 17/18: Grid Zero trava demanda de geração em 0 e modalidade em
// Autoconsumo Local.
function onGridZero() {
  _sync("gridZero");
  const gz = state.gridZero === "Sim";
  const dg = $(`[data-k="demandaGeracao"]`);
  if (dg) {
    if (gz) {
      state.demandaGeracao = "0";
      dg.value = "0";
    }
    dg.disabled = gz;
  }
  setHint(
    "demandaGeracaoHint",
    gz
      ? "Travado: empreendimento Grid Zero não contrata demanda de geração (0 kW)."
      : "",
  );
  onModalidade();
  atualizarDecl95();
}
// Arrendamento (spec Figma): "Sim" revela os dados da unidade arrendada e o
// aviso do DUB. Ao voltar para "Não" os campos são limpos — dados de um
// arrendamento que não existe não podem seguir para o PDF.
function onTelhadoArrendado() {
  _sync("telhadoArrendado");
  const sim = state.telhadoArrendado === "Sim";
  ["#arrendUCBox", "#arrendTensaoBox", "#dubBox"].forEach((s) => {
    const el = $(s);
    if (el) el.style.display = sim ? "" : "none";
  });
  if (!sim) aplicarPatch({ arrendUC: "", arrendTensao: "" });
  if (window.CemigMarcadores) {
    window.CemigMarcadores.aplicar();
    window.CemigMarcadores.atualizarAvancar();
  }
}

/* ===== Etapas 6/8 — checklists ===== */
function renderChecklist(containerId, lista, alvo) {
  const box = document.getElementById(containerId);
  if (!box) return;
  box.innerHTML = "";
  lista.forEach((doc) => {
    const label = document.createElement("label");
    label.className = "doc-item";
    const chk = document.createElement("input");
    chk.type = "checkbox";
    chk.checked = !!state[alvo][doc.id];
    chk.addEventListener("change", () => {
      state[alvo][doc.id] = chk.checked;
    });
    const span = document.createElement("span");
    span.className = "doc-text";
    span.innerHTML =
      `<strong>${doc.id}</strong> ${doc.txt}` +
      (doc.req ? ' <span class="doc-req">(obrigatório)</span>' : "");
    label.append(chk, span);
    box.appendChild(label);
  });
}

/* ===== Etapa 7 — Formulário de Carga (redeMono sempre false no mini) ===== */
function _atividadeCargas() {
  return state.classe === "Residencial" ||
    state.classe === "Industrial" ||
    state.classe === "Comercial"
    ? state.classe
    : "";
}
// Acordeões da lista de equipamentos (persistem entre re-renders da ilha).
const _accCargas = {};
function initCargas() {
  const box = $("#calcDemandaBox");
  if (!box) return;
  // Mesma ilha do BT e do microGD (shared/js/carga-bt.js): antes o mini usava
  // montarCalcDemanda + uma .kpi-row escrita à mão no fragmento, que não tinha
  // o visual dos cards .resultado-* de css/shared.css.
  ilhaCargas = montarCargaAcordeao(box, {
    data: state.cargas,
    abertos: _accCargas,
    // Grupo A, atendimento trifásico: não há rede mono/bifásica no mini.
    redeMono: () => false,
    atividade: _atividadeCargas,
    aoMudar: (c) => {
      state.cargas = c;
      renderResultadoCargaGD();
    },
  });
  renderResultadoCargaGD();
}
// Cards de carga/demanda + escolha do disjuntor (mesmo bloco do BT/micro).
function renderResultadoCargaGD() {
  const box = $("#resultadoCargaBox");
  if (!box) return;
  renderResultadoCarga(box, {
    cargas: () => state.cargas || {},
    escolhido: () => state.cargaDisjEscolhido,
    aoEscolher: (dj) => {
      state.cargaDisjEscolhido = dj;
    },
  });
}

/* ===== Etapa 5 — Geração (múltiplas fontes) ===== */
function onQtdFontes() {
  _sync("qtdFontes");
  const q = parseInt(state.qtdFontes) || 1;
  state.qtdFontes = q;
  while (state.fontes.length < q) state.fontes.push(gdFontePadrao());
  while (state.fontes.length > q) state.fontes.pop();
  renderFontes();
  recalcFontes(); // a soma (potAtivaInstalada) muda ao adicionar/remover fonte
}
function onModalidade() {
  _sync("modalidade");
  const gz = state.gridZero === "Sim";
  const sel = $(`select[data-k="modalidade"]`);
  if (sel) {
    if (gz && state.modalidade !== GD_MODALIDADE_AUTOCONSUMO_LOCAL) {
      state.modalidade = GD_MODALIDADE_AUTOCONSUMO_LOCAL;
      sel.value = state.modalidade;
    }
    sel.disabled = gz;
  }
  setHint(
    "modalidadeHint",
    gz ? "Travado: empreendimento Grid Zero exige Autoconsumo Local." : "",
  );
  const banner = $("#gridZeroBanner");
  if (banner) banner.style.display = gz ? "" : "none";
  const consorcio = $("#consorcioBox");
  if (consorcio)
    consorcio.style.display =
      state.modalidade === "Geração Compartilhada" ? "" : "none";
  atualizarGFC();
}
// Regras 15/16: em FV a potência da fonte = MENOR entre módulos e inversores;
// a Potência Ativa Instalada Total é a soma das fontes.
function recalcFontes() {
  state.fontes.forEach((f) => {
    if (f.fontePrimaria === "Solar") {
      const pm = parseFloat(f.potTotalModulos) || 0;
      const pi = parseFloat(f.potTotalInversores) || 0;
      const calc = pm > 0 && pi > 0 ? Math.min(pm, pi) : pm || pi || 0;
      f.potencia = calc ? String(calc) : "";
    }
  });
  const total = state.fontes.reduce(
    (s, f) => s + (parseFloat(f.potencia) || 0),
    0,
  );
  state.potAtivaInstalada = total ? String(total) : "";
  const inp = $(`[data-k="potAtivaInstalada"]`);
  if (inp) inp.value = state.potAtivaInstalada;
  // Potências das fontes FV exibidas nos inputs travados
  $$("#fontesBox [data-fonte-pot]").forEach((el) => {
    const i = parseInt(el.dataset.fontePot, 10);
    const f = state.fontes[i];
    if (f && f.fontePrimaria === "Solar") el.value = f.potencia;
  });
  atualizarSE(); // limite 300 kVA / sugestão AT dependem da potência
  atualizarGFC();
}
function renderFontes() {
  const box = $("#fontesBox");
  if (!box) return;
  box.innerHTML = "";
  state.fontes.forEach((f, i) => {
    const ehFV = f.fontePrimaria === "Solar";
    const bloco = document.createElement("div");
    bloco.innerHTML = `
      <div class="gd-subhead">4.${i + 1} — Dados da Fonte de Geração ${i + 1}</div>
      <div class="grid grid-2">
        <div class="field">
          <label>Tipo de Fonte Primária <span class="req">*</span></label>
          <select data-f="fontePrimaria" data-sem-vazio>
            ${GD_FONTES.map((o) => `<option value="${o}"${f.fontePrimaria === o ? " selected" : ""}>${o}</option>`).join("")}
          </select>
        </div>
        <div class="field">
          <label>Potência de Geração da Fonte ${i + 1} (kW) <span class="req">*</span></label>
          <input type="text" data-f="potencia" data-fonte-pot="${i}" placeholder=" "
            value="${f.potencia}" ${ehFV ? "readonly disabled" : ""} />
          ${ehFV ? '<span class="field-hint">Calculado: menor entre módulos e inversores.</span>' : ""}
        </div>
        <div class="field">
          <label>Tipo de geração <span class="req">*</span></label>
          <select data-f="tipoGeracao" data-sem-vazio>
            ${GD_TIPO_GERACAO.map((t) => `<option value="${t}"${f.tipoGeracao === t ? " selected" : ""}>${t}</option>`).join("")}
          </select>
        </div>
        ${
          f.tipoGeracao === "Outra (especificar):"
            ? `<div class="field col-span-2">
          <label>Especificar</label>
          <input type="text" data-f="tipoGeracaoOutro" placeholder=" " value="${f.tipoGeracaoOutro}" />
        </div>`
            : ""
        }
      </div>
      ${
        ehFV
          ? `<div class="grid grid-2" style="margin-top: 12px">
        <div class="field">
          <label>Potência Total Módulos (kW)</label>
          <input type="text" data-f="potTotalModulos" data-num placeholder=" " value="${f.potTotalModulos}" />
        </div>
        <div class="field">
          <label>Potência Total Inversores (kW)</label>
          <input type="text" data-f="potTotalInversores" data-num placeholder=" " value="${f.potTotalInversores}" />
        </div>
        <div class="field">
          <label>Área dos Arranjos (m²)</label>
          <input type="text" data-f="areaArranjos" data-num placeholder=" " value="${f.areaArranjos}" />
        </div>
        <div class="field">
          <label>Quantidade de Módulos</label>
          <input type="text" data-f="qtdModulos" data-int placeholder=" " value="${f.qtdModulos}" />
        </div>
        <div class="field">
          <label>Modelo dos Módulos</label>
          <input type="text" data-f="modeloModulos" placeholder=" " value="${f.modeloModulos}" />
        </div>
        <div class="field">
          <label>Fabricante dos Módulos</label>
          <input type="text" data-f="fabricanteModulos" placeholder=" " value="${f.fabricanteModulos}" />
        </div>
        <div class="field">
          <label>Quantidade de Inversores</label>
          <input type="text" data-f="qtdInversores" data-int placeholder=" " value="${f.qtdInversores}" />
        </div>
        <div class="field">
          <label>Modelo dos Inversores</label>
          <input type="text" data-f="modeloInversores" placeholder=" " value="${f.modeloInversores}" />
          <span class="field-hint">Para mais de 1 modelo, separar com barra (/)</span>
        </div>
        <div class="field">
          <label>Fabricante dos Inversores</label>
          <input type="text" data-f="fabricanteInversores" placeholder=" " value="${f.fabricanteInversores}" />
        </div>
      </div>`
          : ""
      }
      <div class="grid grid-2" style="margin-top: 12px">
        <div class="field col-span-2">
          <label>CEG do empreendimento (se houver outorga)</label>
          <input type="text" data-f="ceg" placeholder=" " value="${f.ceg}" />
        </div>
        <div class="field">
          <label>Nº do Ato de Outorga/Registro</label>
          <input type="text" data-f="numAtoOutorga" placeholder=" " value="${f.numAtoOutorga}" />
        </div>
        <div class="field col-span-2">
          <label>Nome da Usina</label>
          <input type="text" data-f="nomeUsina" placeholder=" " value="${f.nomeUsina}" />
        </div>
        <div class="field">
          <label>Ano do Ato</label>
          <input type="text" data-f="anoAtoOutorga" data-int placeholder=" " value="${f.anoAtoOutorga}" />
        </div>
        <div class="field col-span-2">
          <label>Tipo do Ato de Outorga/Registro</label>
          <input type="text" data-f="tipoAtoOutorga" placeholder=" " value="${f.tipoAtoOutorga}" />
        </div>
      </div>`;
    // listeners: campos da fonte i gravam em state.fontes[i]
    bloco.querySelectorAll("[data-f]").forEach((el) => {
      const chave = el.dataset.f;
      const handler = () => {
        if (el.hasAttribute("data-num"))
          el.value = el.value.replace(/[^\d.]/g, "");
        if (el.hasAttribute("data-int")) el.value = el.value.replace(/\D/g, "");
        state.fontes[i][chave] = el.value;
        if (chave === "fontePrimaria" || chave === "tipoGeracao") {
          renderFontes(); // muda a estrutura (blocos FV / campo Especificar)
          recalcFontes();
        } else if (
          chave === "potTotalModulos" ||
          chave === "potTotalInversores" ||
          chave === "potencia"
        ) {
          recalcFontes();
        }
      };
      el.addEventListener(el.tagName === "SELECT" ? "change" : "input", handler);
    });
    box.appendChild(bloco);
  });
  if (window.CemigMarcadores) window.CemigMarcadores.aplicar(box);
}

/* ===== Garantia de Fiel Cumprimento (Regras 19/21) — deriva da Geração ===== */
function atualizarGFC() {
  _sync("consorcioVerificado"); // onchange inline dispara antes do bindInputs
  const gfc = gdCalcularGFC(state);
  state.gfcValor = String(gfc);
  const disp = $("#gd_gfcValor");
  if (disp) disp.value = "R$ " + fmt2(gfc);
  const exige = gdExigeGFC(state);
  const bloco = $("#gfcBloco");
  if (bloco) bloco.style.display = exige ? "" : "none";
  const isento = $("#gfcIsentoAviso");
  if (isento) {
    const ultrapassa =
      (parseFloat(state.potAtivaInstalada) || 0) > GD_GFC_LIMITE_KW;
    const isentoConsorcio =
      state.modalidade === "Geração Compartilhada" &&
      state.consorcioVerificado === "Sim";
    isento.style.display = ultrapassa && isentoConsorcio ? "" : "none";
  }
  if (window.CemigMarcadores) {
    window.CemigMarcadores.aplicar();
    window.CemigMarcadores.atualizarAvancar();
  }
}
// Regra 22: item 9.5 só aparece (e é obrigatório) quando Grid Zero = Sim.
function atualizarDecl95() {
  const gz = state.gridZero === "Sim";
  const item = $("#decl95Item");
  if (item) item.style.display = gz ? "" : "none";
  const aviso = $("#decl95Aviso");
  if (aviso) aviso.style.display = gz && !state.decl95 ? "" : "none";
}

/* ===== Etapa 8 — Armazenamento ===== */
function onArmazenamento() {
  _sync("possuiArmazenamento");
  _sync("armOperacaoIlhada");
  const sim = state.possuiArmazenamento === "Sim";
  const bloco = $("#armBloco");
  if (bloco) bloco.style.display = sim ? "" : "none";
  const ilhada = sim && state.armOperacaoIlhada === "Sim";
  const chave = $("#armChaveBox"),
    rec = $("#armReconexaoBox");
  if (chave) chave.style.display = ilhada ? "" : "none";
  if (rec) rec.style.display = ilhada ? "" : "none";
}

/* ===== Etapa 9 — Declarações (checkboxes) ===== */
function bindDeclaracoes() {
  $$("[data-decl]").forEach((chk) => {
    const k = chk.dataset.decl;
    chk.checked = !!state[k];
    chk.addEventListener("change", () => {
      state[k] = chk.checked;
      if (k === "decl95") atualizarDecl95();
    });
  });
}

/* ===== Etapa 10 — Correspondência ===== */
function onCorrAlternativa() {
  _sync("corrAlternativa");
  const v = state.corrAlternativa;
  const informado = $("#corrEmailInformadoBox"),
    obra = $("#corrObraAviso"),
    email = $("#corrEmailBox"),
    end = $("#corrEndBox"),
    global = $("#contaGlobalBox");
  if (informado) {
    informado.style.display = v === "E-mail informado" ? "" : "none";
    // Espelha o e-mail do titular no campo (somente leitura).
    const inp = $('[data-k="email"]', informado);
    if (inp) inp.value = state.email || "";
  }
  if (obra) obra.style.display = v === "Mesmo da obra" ? "" : "none";
  if (email) email.style.display = v === "Outro e-mail" ? "" : "none";
  if (end) end.style.display = v === "Endereço novo" ? "" : "none";
  if (global) global.style.display = v === "Conta globalizada" ? "" : "none";
  if (v !== "Conta globalizada") aplicarPatch({ contaGlobal: "" });
}

/* ===== Etapa 11 — validação de exportação + prévia ===== */
// Porte 1:1 do useMemo `validacao` do app React do mini.
function validarExportacao() {
  const d = state;
  const faltas = [];
  const req = (v, label) => {
    if (!String(v || "").trim()) faltas.push(label);
  };
  req(d.instalacao, "Número da instalação");
  req(d.titular, "Titular da UC");
  req(d.classe, "Classe");
  req(d.cpfCnpj, "CPF/CNPJ");
  const _doc = validarCpfCnpj(d.cpfCnpj);
  if (_doc.valido !== true) faltas.push("CPF/CNPJ válido");
  if (_doc.tipo === "CPF" && _doc.valido === true) {
    req(d.filiacao, "Filiação");
    req(d.nasc, "Data de Nascimento");
    req(d.laudoMedico, "Possui equipamentos essenciais?");
    req(d.nis, "Possui NIS?");
    if (d.nis === "Sim") req(d.numNis, "Número do NIS");
  }
  req(d.celular, "Celular");
  req(d.email, "E-mail");
  // Responsável técnico (bloco da etapa 2 copiada do microGD).
  req(d.rtNome, "Nome do responsável técnico");
  req(d.rtEmail, "E-mail do responsável técnico");
  req(d.rtCelular, "Celular do responsável técnico");
  // Endereço: urbano e rural são mutuamente exclusivos (onZonaGD limpa os
  // campos da zona oposta), então cada zona cobra só os próprios campos.
  if (d.localizacao === "Rural") {
    req(d.municipio, "Município");
    req(d.distritoComunidade, "Distrito / Comunidade / Região");
    req(d.nomePropriedade, "Nome da propriedade");
    req(d.pontoRef, "Ponto de referência");
    req(d.instProxima, "Nº instalação / UC / medidor mais próxima");
  } else {
    req(d.logradouro, "Endereço");
    req(d.numero, "Número");
    req(d.bairro, "Bairro");
    req(d.municipio, "Município");
    req(d.cep, "CEP");
  }
  // Estado: vem "MG" por padrão e é reescrito pela busca de CEP, mas o campo é
  // editável — nada impede que fique vazio, e ele é obrigatório nas duas zonas.
  req(d.estado, "Estado");
  req(d.latitude, "Latitude");
  req(d.longitude, "Longitude");
  // Restrição ambiental detectada pelo mapa exige o aceite explícito.
  if (d.restricaoAmbiental === "Sim" && !d.restricaoAceite)
    faltas.push("Aceite das exigências de restrição ambiental");
  const utm = gdValidarUTM(d.fuso, d.utmE, d.utmN);
  if (d.fuso && d.utmE && d.utmN && !utm.ok)
    faltas.push("Coordenada UTM fora da faixa do fuso");
  req(d.impedanciaTrafo, "Impedância do transformador");
  if (d.entradaEnergia === GD_ENTRADA_COMPARTILHADA)
    req(d.qtdCubiculos, "Quantidade de Cubículos");
  req(d.solicitacao, "Tipo de Solicitação");
  if (GD_SOLICITACOES_FORM_CARGA.includes(d.solicitacao)) {
    const c = d.cargas || {};
    const temCarga =
      (c.qtds || []).some((q) => (q || 0) > 0) ||
      (c.mots || []).some((m) => (parseInt(m.q) || 0) > 0) ||
      (c.extras || []).some((m) => (parseInt(m.q) || 0) > 0);
    if (!temCarga)
      faltas.push("Formulário de Carga (declarar as cargas elétricas)");
  }
  if ((d.solicitacao || "").indexOf("SEM Alteração de Demanda") < 0)
    req(d.demandaConsumo, "Demanda contratada de consumo");
  // Demanda de consumo atual: só existe fora da ligação nova — é quando o
  // #demandaConsumoAtualBox aparece (ver onSolicitacao).
  if (!_ehLigacaoNova())
    req(d.demandaConsumoAtual, "Demanda de consumo atual");
  // Grid Zero trava a demanda de geração em 0 (onGridZero), então o campo já
  // vem preenchido; fora dele, é escolha do solicitante e precisa ser cobrada.
  req(d.demandaGeracao, "Demanda a ser contratada de geração");
  // Unidade arrendada: obrigatória só quando há arrendamento (os campos ficam
  // ocultos e zerados fora dele — ver onTelhadoArrendado).
  if (d.telhadoArrendado === "Sim") {
    req(d.arrendUC, "Nº da unidade/instalação arrendada");
    req(d.arrendTensao, "Nível de tensão da unidade arrendada");
  }
  req(d.qtdFontes, "Quantidade de fontes de geração");
  req(d.potAtivaInstalada, "Potência Ativa Instalada Total");
  if ((d.solicitacao || "").indexOf("GD Existente") >= 0)
    req(d.potGeracaoAtual, "Potência de Geração Atual");
  req(d.modalidade, "Modalidade de compensação");
  (d.fontes || []).forEach((f, i) => {
    req(f.fontePrimaria, `Fonte ${i + 1}: tipo de fonte`);
    req(f.potencia, `Fonte ${i + 1}: potência`);
  });
  if (gdExigeGFC(d)) req(d.garantiaForma, "Forma de apresentação da garantia");
  if (!d.decl84) faltas.push("Declaração 9.4 (obrigatória)");
  if (d.gridZero === "Sim" && !d.decl95)
    faltas.push("Declaração 9.5 (obrigatória para Grid Zero)");
  if (!d.decl86) faltas.push("Declaração 9.6 (obrigatória)");
  // Data de vencimento da fatura: opcional (não entra em `req`).
  // A forma de recebimento, sim: o dropdown abre em "Selecione" (sem
  // pré-seleção), então é preciso cobrar a escolha.
  req(d.corrAlternativa, "Como deseja receber a fatura");
  if (d.corrAlternativa === "Outro e-mail")
    req(d.corrOutroEmail, "E-mail alternativo da fatura");
  else if (d.corrAlternativa === "Endereço novo") {
    req(d.corrCep, "CEP de correspondência");
    req(d.corrRua, "Rua/Av. de correspondência");
    req(d.corrNum, "Número de correspondência");
    req(d.corrBairro, "Bairro de correspondência");
    req(d.corrMunicipio, "Município de correspondência");
  } else if (d.corrAlternativa === "Conta globalizada")
    req(d.contaGlobal, "Conta globalizada");
  return { ok: faltas.length === 0, faltas };
}

/* --- Prévia (padrão pvCampo/pvSecao do MT) --- */
function pvCampo(label, valor, opts) {
  opts = opts || {};
  const vazio = valor == null || valor === "";
  const lapis =
    opts.step != null
      ? `<button type="button" class="previa-edit" title="Editar" aria-label="Editar ${label}" onclick="goTo(${opts.step}, true)"></button>`
      : "";
  return (
    `<div class="previa-campo${opts.full ? " previa-campo--full" : ""}">` +
    `<div class="previa-campo-label">${label}</div>` +
    `<div class="previa-campo-valor">${vazio ? "—" : valor}${lapis}</div></div>`
  );
}
function pvSecao(titulo, campos) {
  return (
    `<div class="previa-secao"><h4 class="previa-secao-titulo">${titulo}</h4>` +
    `<div class="previa-grid">${campos}</div></div>`
  );
}
const PV_DIVISOR = '<hr class="previa-divider"/>';
function renderPreviewGD() {
  syncState();
  const d = state;
  const v = validarExportacao();
  const faltasBox = $("#revFaltas");
  if (faltasBox)
    faltasBox.innerHTML = v.ok
      ? '<div class="rev-ok">Todos os campos obrigatórios preenchidos. Pronto para exportar.</div>'
      : '<div class="rev-faltas"><strong>Preencha os campos obrigatórios antes de exportar:</strong><ul>' +
        v.faltas.map((f) => `<li>${f}</li>`).join("") +
        "</ul></div>";
  const secoes = [];
  // Etapa 2 — Dados do proprietário (índice 1) e etapa 3 — Dados da unidade
  // (índice 2). Instalação e Classe migraram para a etapa técnica (índice 3).
  let ident =
    pvCampo("Titular", d.titular, { step: 1 }) +
    pvCampo("CPF/CNPJ", d.cpfCnpj, { step: 1 }) +
    pvCampo("E-mail", d.email, { step: 1 }) +
    pvCampo("Celular", d.celular, { step: 1 });
  if (d.filiacao) ident += pvCampo("Filiação", d.filiacao, { step: 1 });
  if (d.nasc) ident += pvCampo("Data de Nascimento", d.nasc, { step: 1 });
  if (d.filiacao)
    ident += pvCampo(
      "Equipamentos essenciais? / NIS?",
      `${d.laudoMedico} / ${d.nis}`,
      { step: 1 },
    );
  if (d.nis === "Sim" && d.numNis)
    ident += pvCampo("Número do NIS", d.numNis, { step: 1 });
  ident +=
    pvCampo("Responsável técnico", d.rtNome, { step: 1 }) +
    pvCampo("E-mail do RT", d.rtEmail, { step: 1 }) +
    pvCampo("Celular do RT", d.rtCelular, { step: 1 });
  secoes.push(pvSecao("1 — Dados do proprietário", ident));
  // Endereço da unidade: urbano e rural são mutuamente exclusivos.
  const endereco =
    d.localizacao === "Rural"
      ? [
          d.distritoComunidade,
          d.nomePropriedade,
          d.pontoRef,
          [d.municipio, d.estado].filter(Boolean).join("/"),
        ]
          .filter(Boolean)
          .join(" · ")
      : `${d.logradouro}, ${d.numero} — ${d.bairro}, ${d.municipio}/${d.estado}`;
  // Grupo não entra aqui: saiu da etapa 3 e já aparece em "Grupo / Classe" na
  // seção técnica, cujo lápis leva à etapa onde ele é de fato editável.
  let uni =
    pvCampo("Zona de localização", d.localizacao, { step: 2 }) +
    pvCampo("Endereço", endereco, { full: true, step: 2 });
  if (d.localizacao === "Rural" && d.instProxima)
    uni += pvCampo("Instalação mais próxima", d.instProxima, { step: 2 });
  if (d.restricaoAmbiental)
    uni += pvCampo(
      "Restrição ambiental",
      d.restricaoAmbiental === "Sim"
        ? (d.restricoesTexto || "Sim").replace(/\n/g, "<br>")
        : "Não",
      { full: true, step: 2 },
    );
  secoes.push(pvSecao("2 — Dados da unidade", uni));
  // Coordenadas ficam na etapa 3 (mapa); o restante é da etapa técnica (3).
  secoes.push(
    pvSecao(
      "3 — Tipo de atendimento",
      pvCampo("Coordenadas", `Lat ${d.latitude} · Lon ${d.longitude}`, {
        step: 2,
      }) +
        pvCampo(
          "UTM (calculada)",
          `Fuso ${d.fuso} · E ${d.utmE} · N ${d.utmN}`,
          { step: 2 },
        ) +
        pvCampo("Instalação", d.instalacao, { step: 3 }) +
        pvCampo("Grupo / Classe", `${d.grupo} / ${d.classe}`, { step: 3 }) +
        pvCampo("Solicitação", d.solicitacao, { step: 3 }) +
        pvCampo(
          "Trafo (ligação/impedância)",
          `${d.tipoLigTrafo || "—"} · ${d.impedanciaTrafo || "—"}%`,
          { step: 3 },
        ) +
        pvCampo(
          "Demanda consumo / geração (kW)",
          `${d.demandaConsumo || "—"} / ${d.demandaGeracao || "—"}`,
          { step: 3 },
        ),
    ),
  );
  secoes.push(
    pvSecao(
      "4 — Geração",
      pvCampo("Qtd. fontes", d.qtdFontes, { step: 4 }) +
        pvCampo("Pot. Ativa Instalada (kW)", d.potAtivaInstalada, {
          step: 4,
        }) +
        pvCampo("Modalidade", d.modalidade, { step: 4 }),
    ),
  );
  let cor =
    pvCampo("Como deseja receber a fatura", d.corrAlternativa, { step: 8 }) +
    pvCampo("Vencimento", d.vencimento, { step: 8 });
  if (d.corrAlternativa === "E-mail informado")
    cor += pvCampo("E-mail para envio da fatura", d.email, {
      full: true,
      step: 8,
    });
  if (d.corrAlternativa === "Outro e-mail")
    cor += pvCampo("E-mail para envio da fatura", d.corrOutroEmail, {
      full: true,
      step: 8,
    });
  if (d.corrAlternativa === "Endereço novo")
    cor += pvCampo(
      "Endereço da fatura",
      [
        [d.corrRua, d.corrNum].filter(Boolean).join(", "),
        d.corrBairro,
        d.corrMunicipio,
        d.corrEstado,
        d.corrCep,
      ]
        .filter(Boolean)
        .join(" · "),
      { full: true, step: 8 },
    );
  if (d.corrAlternativa === "Conta globalizada")
    cor += pvCampo("Conta globalizada", d.contaGlobal, { step: 8 });
  secoes.push(pvSecao("Correspondência e Fatura", cor));
  const content = $("#previewContent");
  if (content) content.innerHTML = secoes.join(PV_DIVISOR);
  const btn = $("#btnExportarPDF");
  if (btn) btn.disabled = !v.ok;
}
function syncState() {
  $$("[data-k]").forEach((el) => {
    state[el.dataset.k] = el.value;
  });
}
function exportarPdfGD() {
  const v = validarExportacao();
  if (!v.ok) {
    renderPreviewGD();
    return;
  }
  gerarPdfMiniGD(state);
}

/* ===== Aceite das Orientações ===== */
window.aceiteOrientacoesOk = function () {
  const c = document.getElementById("aceiteOrient");
  return !c || c.checked;
};

/* ===== Init (chamado pelo etapas-loader com o DOM completo) ===== */
window.initFormulario = function () {
  preencherSelects();
  bindInputs();
  inicializarCards();
  bindDeclaracoes();
  // A etapa "Documentação da UC a anexar" foi removida do formulário; resta a
  // documentação TÉCNICA, que vive na etapa de Declarações.
  renderChecklist("docsTecChecklist", GD_DOCS_TEC, "docsTec");
  initCargas();
  renderFontes();
  // Estado inicial das condicionais
  onSolicitacao();
  onEntradaEnergia();
  onGridZero();
  onTelhadoArrendado();
  onModalidade();
  recalcFontes();
  onArmazenamento();
  onCorrAlternativa();
  // Etapa 3 (cópia do micro): zona antes da coordenada — onZonaGD decide quais
  // caixas de endereço ficam visíveis, e onCoordGD já parte do estado certo.
  onZonaGD();
  initMapaObra();
  onCoordGD();
  atualizarDecl95();
  atualizarGFC();
  mostrarCamposPF(gdEhCpfValido());
  // nis: o próprio <select> da etapa 2 copiada chama onNisGD() no onchange
  // (padrão do micro/MT) — um listener aqui faria o handler rodar duas vezes.
  // A classe define o tipo de carga (residencial x não-residencial), então
  // remonta a lista de equipamentos e recalcula os cards de resultado.
  const selClasse = $(`select[data-k="classe"]`);
  if (selClasse)
    selClasse.addEventListener("change", () => {
      if (ilhaCargas) {
        ilhaCargas.atualizar();
        renderResultadoCargaGD();
      }
    });
  const aceite = $("#aceiteOrient");
  if (aceite)
    aceite.addEventListener("change", () => {
      if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
    });
  $$(".vstep").forEach((s, i) =>
    s.addEventListener("click", () => goTo(i, true)),
  );
};
