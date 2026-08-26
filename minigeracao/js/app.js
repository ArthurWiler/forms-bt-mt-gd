/* ============================================================
   MINIGERAÇÃO DISTRIBUÍDA — app vanilla (molde microgeracao/js/app.js)
   ------------------------------------------------------------
   Estado plano de gdEstadoInicial() (js/model.js) bindado por
   [data-k]; etapas em fragmentos (etapas/*.html) via
   shared/js/etapas-loader.js. Diferenças do micro: múltiplas
   fontes de geração (fontes[]/qtdFontes) — cada uma com o conjunto
   completo da etapa de geração do micro —, Garantia de Fiel
   Cumprimento calculada (Regra 19) e Grupo A fixo.
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
  // A etapa 5 é porte da etapa de geração do microGD e traz os Sim/Não como
  // <div data-toggle> + <select data-k> oculto (montarToggles) — gridZero saiu
  // junto: virou a modalidade de operação, um card de três opções.
  { chave: "mudancaSE", gridId: "cardsMudancaSE", opcoes: SIM_NAO },
  { chave: "telhadoArrendado", gridId: "cardsTelhadoArrendado", opcoes: SIM_NAO },
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
// Aceita uma lista de strings ou de {valor, texto} — o segundo formato separa
// o que é GRAVADO (chave de regra e texto do PDF) do que é EXIBIDO. Usado pela
// tensão de atendimento, que guarda volts e mostra kV.
function preencherSelect(k, lista) {
  const sel = $(`select[data-k="${k}"]`);
  if (!sel) return;
  const itens = lista.map((o) =>
    typeof o === "object" ? o : { valor: o, texto: o },
  );
  const semVazio = sel.hasAttribute("data-sem-vazio");
  const atual = sel.value;
  sel.innerHTML =
    (semVazio ? "" : '<option value=""></option>') +
    itens.map((o) => `<option value="${o.valor}">${o.texto}</option>`).join("");
  if (atual && itens.some((o) => String(o.valor) === atual)) sel.value = atual;
}
// A tensão é GRAVADA em volts ("13800") — é assim que o PDF a imprimiu sempre e
// é a chave que _tensaoMTkVGD() converte para o CalculoMT. Na tela, porém, o
// solicitante lê kV, como no MT.
function _rotuloTensaoGD(v) {
  return (parseFloat(v) / 1000).toFixed(1).replace(".", ",") + " kV";
}
function preencherSelects() {
  // "grupo" não tem select próprio: na minigeração é sempre "A" (uma única
  // opção em GD_GRUPOS), então o campo saiu da etapa 3 e o valor vem do estado.
  preencherSelect("classe", GD_CLASSES);
  // tipoLigTrafo saiu da etapa: a ligação passou a ser perguntada POR
  // transformador, dentro do card (ver _opcoesTipoLigGD, js/subestacao.js).
  preencherSelect(
    "tensaoAtendimento",
    GD_TENSAO_A.map((v) => ({ valor: v, texto: _rotuloTensaoGD(v) })),
  );
  preencherSelect("entradaEnergia", GD_ENTRADA_ENERGIA);
  preencherSelect("solicitacao", GD_SOLICITACOES);
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
// Última zona aplicada — o toggle grava state.localizacao ANTES de chamar este
// handler, então o valor anterior precisa ser rastreado aqui para a limpeza da
// zona oposta funcionar (mesma solução do MT, mt/js/app.js).
let _zonaAnteriorGD = "";
// A zona tem TRÊS estados: "" (nada escolhido), "Urbana" e "Rural". Com ""
// nenhum bloco de endereço aparece — o endereço só faz sentido depois de saber
// a zona, e um bloco aberto por padrão fazia o usuário preencher CEP numa área
// rural. Trocar de zona limpa os campos da zona oposta, como no BT: o endereço
// urbano e o descritivo rural são mutuamente exclusivos no PDF.
function onZonaGD() {
  _sync("localizacao");
  const zona = state.localizacao;
  const anterior = _zonaAnteriorGD;
  _zonaAnteriorGD = zona;
  const rural = zona === "Rural";
  // Só limpa quando houve TROCA de zona: sem esta guarda o onZonaGD() do boot
  // (e um segundo clique no mesmo card) apagaria campos que o usuário nunca
  // trocou — inclusive dados vindos de prefill.
  if (anterior && anterior !== zona) {
    const limpar = rural
      ? ["cep", "logradouro", "numero", "complemento", "bairro"]
      : ["distritoComunidade", "nomePropriedade", "pontoRef", "instProxima"];
    limpar.forEach((k) => {
      state[k] = "";
      $$(`[data-k="${k}"]`).forEach((c) => (c.value = ""));
    });
  }
  const urb = $("#endUrbanoBox"),
    rur = $("#endRuralBox");
  if (urb) urb.style.display = zona === "Urbana" ? "" : "none";
  if (rur) rur.style.display = rural ? "" : "none";
  // Mapa e coordenadas fecham a cascata do endereço (como o #blocoMapaCoord do
  // MT). O Leaflet mede o container na criação: com o bloco oculto o mapa nasce
  // com 0px, então só instanciar depois de revelá-lo — mesma lição do goTo().
  const blocoMapa = $("#blocoMapaCoord");
  if (blocoMapa) {
    blocoMapa.style.display = zona ? "" : "none";
    if (zona) {
      initMapaObra();
      if (mapaObra) setTimeout(() => mapaObra.invalidateSize(), 60);
    }
  }
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
// Leaflet sob demanda (shared/js/libs.js); a flag impede que um segundo
// goTo() durante o download enfileire outra criação — ver bt/js/bt-core.js.
let _mapaObraPendente = false;
function initMapaObra() {
  const div = $("#map");
  if (!div || mapaObra || _mapaObraPendente) return;
  if (!window.L) {
    _mapaObraPendente = true;
    window.CemigLibs.leaflet()
      .then(() => {
        _mapaObraPendente = false;
        initMapaObra();
      })
      .catch(() => {
        _mapaObraPendente = false;
      });
    return;
  }
  // O container só ganha largura depois da zona escolhida (#blocoMapaCoord).
  // Criar o mapa antes disso o deixa com 0px e os tiles saem cortados; quem
  // revela o bloco (onZonaGD) chama de novo — e aí o Leaflet já está em cache.
  if (!div.offsetWidth) return;
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
  // Sem `!window.turf`: a lib é carregada sob demanda dentro de
  // consultarRestricoesObra — ver bt/js/bt-core.js.
  if (typeof consultarRestricoesObra !== "function") return;
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
/* ===== Etapa 4 — bloco técnico da subestação =====
   SE_INFO_GD, _seCtx, _tiposSEvisiveis, atualizarSE, renderTrafosGD e
   addTrafoGD saíram daqui: a galeria única de tipos de subestação e a tabela
   Qte × Potência foram substituídas pelo bloco técnico portado do MT — ver
   js/subestacao.js, que define o novo atualizarSE(). A regra de quais modelos
   são permitidos agora vem de CalculoMT.tiposSubestacaoPermitidos
   (mt/js/calculo.js), e a subestação COMPARTILHADA ganhou os cubículos.
   O que sobrou aqui são os handlers dos campos que continuam na etapa. */

// Regra 12: campo de negócio próprio (sai no PDF). Deixou de filtrar a galeria
// junto com gdSEDisponivel(), então não refaz mais o bloco técnico.
function onMudancaSE() {
  _sync("mudancaSE");
}
/* "Tipo de edificação" (o antigo "Entrada de energia") é a segunda pergunta
   da etapa e governa o resto dela: individual e compartilhada levam a blocos
   técnicos diferentes, então nada abaixo aparece antes da resposta. */
function onEntradaEnergia() {
  _sync("entradaEnergia");
  const bloco = $("#atendimentoBloco");
  if (bloco) bloco.style.display = state.entradaEnergia ? "" : "none";
  // atualizarSE() (js/subestacao.js) é o dono único da visibilidade: alterna
  // entre o ramo individual (transformadores da UC) e o compartilhado
  // (cubículos + totais consolidados).
  atualizarSE();
  if (window.CemigMarcadores) {
    window.CemigMarcadores.aplicar();
    window.CemigMarcadores.atualizarAvancar();
  }
}
function _ehLigacaoNova() {
  return state.solicitacao === GD_SOLICITACAO_LIG_NOVA;
}
// Regra 10: só a alteração da demanda CONTRATADA tem uma demanda futura a
// declarar. O texto conferido é o completo de propósito: "COM Alteração"
// sozinho também casaria com "GD Existente COM Alteração de Potência Ativa
// Instalada Total de Geração", que altera a GERAÇÃO, não a demanda.
function _ehAlteracaoDemandaGD() {
  return GD_SOLICITACOES_ALTERACAO_DEMANDA.includes(state.solicitacao);
}
/* Quais campos de demanda contratada aparecem sai do tipo de solicitação:
     • Ligação nova            → só a demanda a contratar
     • Existente COM alteração → atual + futura
     • Existente SEM alteração → só a atual (a demanda não muda)
     • GD existente            → só a atual (o que muda é a geração)
   A minigeração é sempre Grupo A, então não há o ramo de baixa tensão do
   microGD. Os campos em si vivem DENTRO dos cards — um par por transformador
   no ramo individual, um par por cubículo no compartilhado (_camposDemandaGD,
   js/subestacao.js) —, mas a regra é uma só e vale para o card, para a
   validação e para o PDF; por isso mora aqui e não em cada um. */
function _paresPotenciaGD() {
  const nova = _ehLigacaoNova();
  return {
    nova,
    // Sem solicitação escolhida não há o que perguntar.
    verNovaOuFutura:
      !!state.solicitacao && (nova || _ehAlteracaoDemandaGD()),
    verAtual: !!state.solicitacao && !nova,
  };
}
function onSolicitacao() {
  _sync("solicitacao");
  const exige = GD_SOLICITACOES_FORM_CARGA.includes(state.solicitacao);
  const avisoCarga = $("#avisoCargaObrigatoria");
  if (avisoCarga) avisoCarga.style.display = exige ? "" : "none";
  const nova = _ehLigacaoNova();
  // Campo da unidade JÁ existente: numa ligação nova não há instalação
  // anterior. Sem solicitação escolhida também fica fora de tela.
  const instBox = $("#instalacaoUCBox");
  if (instBox)
    instBox.style.display = state.solicitacao && !nova ? "" : "none";
  // Regra 11: GD existente COM alteração ⇒ potência de geração atual (etapa 5).
  const pa = $("#potGeracaoAtualBox");
  if (pa)
    pa.style.display =
      (state.solicitacao || "").indexOf("GD Existente") >= 0 ? "" : "none";
  // atualizarSE() redesenha os cards: é lá que os campos de demanda vivem, e
  // os rótulos deles dependem da solicitação recém-escolhida.
  atualizarSE();
  if (window.CemigMarcadores) {
    window.CemigMarcadores.aplicar();
    window.CemigMarcadores.atualizarAvancar();
  }
}
// Regras 17/18: Grid Zero trava a demanda de geração em 0 e a modalidade em
// Autoconsumo Local. `gridZero` não tem mais campo próprio — é DERIVADO da
// modalidade de operação (ver onModoOperacaoGD), que é quem chama esta função.
function onGridZero() {
  const gz = _ehGridZero();
  const dg = $(`[data-k="demandaGeracao"]`);
  if (dg) {
    if (gz) {
      state.demandaGeracao = "0";
      dg.value = "0";
    }
    dg.disabled = gz;
  }
  onModalidade();
  atualizarDecl95();
}
function onGeradorEmergencia() {
  _sync("geradorEmergencia");
  const sim = state.geradorEmergencia === "Sim";
  const box = $("#geradorPotBox");
  if (box) box.style.display = sim ? "" : "none";
  if (!sim) aplicarPatch({ geradorPotencia: "" });
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

/* ===== Etapa 7 — checklists ===== */
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

/* ===== Etapa 6 — Formulário de Carga (redeMono sempre false no mini) ===== */
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

/* ===== Etapa 5 — Geração =====
   Porte do conjunto da etapa de geração do microGD
   (microgeracao/etapas/04-geracao.html + js/app.js), com UMA diferença de
   estrutura: lá existe uma única fonte primária e o estado é plano; aqui o
   mini admite 1 ou 2 fontes (qtdFontes), então cada fonte carrega o conjunto
   inteiro dentro de state.fontes[i] (ver gdFontePadrao, js/model.js) e os
   blocos são ESCRITOS por JS, não pelo fragmento HTML.
   O que vale para o EMPREENDIMENTO — modalidade de operação, modalidade de
   compensação, UCs beneficiadas, a soma das potências — segue no estado plano
   e no grid do topo da etapa. ===== */
function _ehGridZero() {
  return state.gridZero === "Sim";
}
// Modalidade de operação: card único portado do microGD, no lugar da antiga
// pergunta "O empreendimento será Grid Zero?". `gridZero` continua existindo
// no estado — DERIVADO desta escolha — porque o PDF, a prévia e as regras
// 17/18/22 dependem dele.
// Só duas opções, não as três do micro: o "Fast Track" de lá é a conexão
// simplificada de até 7,5 kW (art. 73-A, III), faixa da microgeração.
function onModoOperacaoGD(el) {
  if (el) state.modoOperacao = el.value;
  state.gridZero = state.modoOperacao === "Grid Zero" ? "Sim" : "Não";
  onGridZero(); // travas da demanda de geração, da modalidade e do item 9.5
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}
// Gate de avanço da etapa: a modalidade de operação são <input type="radio">
// SEM data-k, então os marcadores (que só enxergam controles bindados) não a
// cobrem. Diferente do microGD, aqui a pergunta está sempre em tela — não
// espera a escolha da fonte —, então é sempre exigida.
window.gdModoOperacaoOk = () => !!state.modoOperacao;
// Segurança de barragens: só as fontes HIDRÁULICAS têm o que classificar. As
// respostas são rádios e toggles dentro do bloco da fonte, sem data-k, então
// quem as cobra é este gate — pelo data-gate do botão Avançar.
window.gdBarragemOk = () =>
  (state.fontes || []).every(
    (f) =>
      f.fontePrimaria !== "Hidráulica" ||
      (!!f.hidroBarragemAltura &&
        GD_BARRAGEM_PERGUNTAS.every((p) => !!f[p.chave])),
  );
// Gate único do botão Avançar da etapa: as perguntas em rádio (modalidade de
// operação e classificação da barragem) ficam fora dos marcadores.
window.gdEtapaGeracaoOk = () => gdModoOperacaoOk() && gdBarragemOk();

function onQtdFontes() {
  _sync("qtdFontes");
  const q = parseInt(state.qtdFontes) || 1;
  state.qtdFontes = q;
  while (state.fontes.length < q) state.fontes.push(gdFontePadrao());
  while (state.fontes.length > q) state.fontes.pop();
  renderFontes();
  recalcFontes(); // a soma (potAtivaInstalada) muda ao adicionar/remover fonte
}
// Regras 17/18: o Grid Zero trava a modalidade em Autoconsumo Local — sem
// injeção na rede não há excedente a transferir para outra unidade.
function onModalidade() {
  _sync("modalidade");
  const trava = _ehGridZero();
  const sel = $(`select[data-k="modalidade"]`);
  if (sel) {
    if (trava && state.modalidade !== GD_MODALIDADE_AUTOCONSUMO_LOCAL) {
      state.modalidade = GD_MODALIDADE_AUTOCONSUMO_LOCAL;
      sel.value = state.modalidade;
    }
    sel.disabled = trava;
  }
  const consorcio = $("#consorcioBox");
  if (consorcio)
    consorcio.style.display =
      state.modalidade === "Geração Compartilhada" ? "" : "none";
  atualizarGFC();
}

/* ============================================================
   MÓDULOS E INVERSORES — um bloco por MODELO
   ------------------------------------------------------------
   Porte do microGD. A usina raramente tem um modelo só, e o campo único
   obrigava a espremer vários num texto ("separar com barra"), do qual nada se
   somava — os antigos modeloModulos/fabricanteModulos (e os equivalentes dos
   inversores) deram lugar a esta lista. Cada modelo declara os próprios dados
   e a potência total sai da soma de quantidade × potência nominal.

   Sem acordeão: são quatro campos por modelo, que cabem numa olhada. Os
   campos não têm `data-k` nem `data-f` (são indexados dentro da fonte), então
   o marcador de obrigatório não os alcança pelo caminho normal — o `data-req`
   vai escrito à mão no markup, que é o que o gate do "Avançar" lê. A
   exportação revalida em gdValidarFVGD(), que independe do que está em tela.
   ============================================================ */
function novoEquipFVGD() {
  return { modelo: "", fabricante: "", potNominal: "", quantidade: "" };
}
/* Modelo e fabricante são texto livre que volta para dentro de um atributo
   value="…". Sem escapar, uma aspa no nome do equipamento ("Painel 21\"")
   fecharia o atributo e quebraria o bloco. */
function _escAttrGD(v) {
  return String(v == null ? "" : v)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}
// Soma das potências instaladas de uma lista de modelos (kW): a potência
// nominal já é declarada em kW, então não há conversão.
function _somaPotFVGD(lista) {
  return (lista || []).reduce(
    (soma, e) =>
      soma + (parseFloat(e.potNominal) || 0) * (parseFloat(e.quantidade) || 0),
    0,
  );
}
// Soma das UNIDADES de uma lista de modelos — é o "Quantidade de módulos"
// (ou de inversores) que o PDF imprime, agora somando todos os modelos.
function _somaQtdFVGD(lista) {
  return (lista || []).reduce(
    (soma, e) => soma + (parseInt(e.quantidade, 10) || 0),
    0,
  );
}
const GD_CHAVE_QTD_MODELOS = {
  modulos: "qtdModeloModulos",
  inversores: "qtdModeloInversores",
};
/* Ajusta a lista de modelos de uma fonte para `n` blocos, com o teto de 99 do
   input — mesma mecânica de sincronizarTrafos() (js/subestacao.js). */
function _ajustarModelosFVGD(f, tipo, n) {
  const alvo = Math.min(Math.max(n, 0), 99);
  const lista = f[tipo] || (f[tipo] = []);
  while (lista.length < alvo) lista.push(novoEquipFVGD());
  lista.length = alvo;
  f[GD_CHAVE_QTD_MODELOS[tipo]] = alvo;
}
/* Em FV sempre há ao menos um modelo de cada: ao ESCOLHER a fonte Solar (ou ao
   restaurar um formulário salvo) o conjunto abre com o primeiro bloco pronto
   para preencher. Não passa pelo input — ele ainda não está em tela. */
function _garantirModelosFVGD(f) {
  ["modulos", "inversores"].forEach((tipo) => {
    const atual = parseInt(f[GD_CHAVE_QTD_MODELOS[tipo]], 10);
    _ajustarModelosFVGD(f, tipo, atual > 0 ? atual : 1);
  });
}
/* Cria/remove blocos para bater com o valor digitado no campo "Quantidade de
   modelos" da fonte. */
function _sincronizarEquipFVGD(i, tipo) {
  const f = state.fontes[i];
  if (!f) return;
  const el = $(`#fonteBloco${i} [data-f="${GD_CHAVE_QTD_MODELOS[tipo]}"]`);
  if (!el) return;
  const bruto = parseInt(el.value, 10);
  if (el.value !== "" && (isNaN(bruto) || bruto < 1)) return; // aguarda valor válido
  _ajustarModelosFVGD(f, tipo, bruto || 0);
}
function sincronizarEquipFVGD(i, tipo) {
  _sincronizarEquipFVGD(i, tipo);
  renderEquipFVGD(i, tipo);
  recalcFontes();
}
/* Um render para os dois: módulos e inversores declaram exatamente os mesmos
   quatro campos. Os listeners são ligados aqui (não por `oninput` inline)
   porque o índice da fonte e o do modelo entram no mesmo handler. */
function renderEquipFVGD(i, tipo) {
  const box = $(`#${tipo === "modulos" ? "modulo" : "inversor"}Modelos${i}`);
  if (!box) return;
  const f = state.fontes[i];
  if (!f) return;
  const titulo = tipo === "modulos" ? "Módulo" : "Inversor";
  box.innerHTML = (f[tipo] || [])
    .map(
      (e, j) => `<div class="gd-modelo-bloco">
      <div class="gd-modelo-titulo">${titulo} ${j + 1}</div>
      <div class="grid grid-2">
        <div class="field">
          <label>Modelo</label>
          <input type="text" data-req data-fm="modelo" data-fm-idx="${j}" value="${_escAttrGD(e.modelo)}" placeholder=" ">
        </div>
        <div class="field">
          <label>Fabricante</label>
          <input type="text" data-req data-fm="fabricante" data-fm-idx="${j}" value="${_escAttrGD(e.fabricante)}" placeholder=" ">
        </div>
        <div class="field">
          <label>Potência nominal (kW)</label>
          <input type="number" step="any" data-req data-fm="potNominal" data-fm-idx="${j}" value="${_escAttrGD(e.potNominal)}" placeholder=" ">
        </div>
        <div class="field">
          <label>Quantidade</label>
          <input type="number" min="1" step="1" data-req data-fm="quantidade" data-fm-idx="${j}" value="${_escAttrGD(e.quantidade)}" placeholder=" ">
        </div>
      </div>
    </div>`,
    )
    .join("");
  box.querySelectorAll("[data-fm]").forEach((el) => {
    const chave = el.dataset.fm;
    const j = parseInt(el.dataset.fmIdx, 10);
    el.addEventListener("input", () => {
      const lista = state.fontes[i] && state.fontes[i][tipo];
      if (!lista || !lista[j]) return;
      lista[j][chave] = el.value;
      if (chave === "potNominal" || chave === "quantidade") recalcFontes();
      else if (window.CemigMarcadores)
        window.CemigMarcadores.atualizarAvancar();
    });
  });
  if (window.CemigMarcadores) {
    window.CemigMarcadores.aplicar(box);
    window.CemigMarcadores.atualizarAvancar();
  }
}
/* O gate do "Avançar" já cobre os campos em tela (todos ficam visíveis, sem
   acordeão), mas ele só olha a ETAPA ativa: a exportação revalida a lista
   inteira, como gdValidarSubestacao() faz com os transformadores. Só nas
   fontes Solares — fora delas o conjunto nem é montado. */
function gdValidarFVGD() {
  const faltas = [];
  (state.fontes || []).forEach((f, i) => {
    if (f.fontePrimaria !== "Solar") return;
    const pre = (state.fontes || []).length > 1 ? `Fonte ${i + 1} — ` : "";
    [
      ["módulo", "Módulo", f.modulos],
      ["inversor", "Inversor", f.inversores],
    ].forEach(([nome, rotulo, lista]) => {
      if (!(lista || []).length) {
        faltas.push(`${pre}Modelos de ${nome} (nenhum declarado)`);
        return;
      }
      lista.forEach((e, j) => {
        const rot = `${pre}${rotulo} ${j + 1}`;
        if (!String(e.modelo || "").trim()) faltas.push(`${rot} — Modelo`);
        if (!String(e.fabricante || "").trim())
          faltas.push(`${rot} — Fabricante`);
        if (!(parseFloat(e.potNominal) > 0))
          faltas.push(`${rot} — Potência nominal`);
        if (!(parseInt(e.quantidade, 10) > 0))
          faltas.push(`${rot} — Quantidade`);
      });
    });
  });
  return faltas;
}
// Resumo da fonte em KPIs — mesmo molde de renderResumoSEGD()
// (js/subestacao.js). Substituiu o campo "Potência de Geração da Fonte": o
// número nunca foi digitado (sai dos inversores), e ao lado das duas parcelas
// ele se explica sozinho — dá para ver o quanto os módulos passam do que o
// inversor entrega. Só vale no Solar: nas demais fontes não há módulos nem
// inversores a somar, e a potência da usina é declarada no bloco da própria
// fonte. Fica oculto enquanto nada há para mostrar — três travessões liam como
// cálculo já feito, dando zero.
function _renderKpisGeracaoGD(i, potModulos, potInversores) {
  const box = $(`#gdGeracaoKpis${i}`);
  const wrap = $(`#gdGeracaoResumo${i}`);
  if (!box) return;
  const f = state.fontes[i] || {};
  const usina = parseFloat(f.potencia) || 0;
  const pronto =
    f.fontePrimaria === "Solar" &&
    (usina > 0 || potModulos > 0 || potInversores > 0);
  if (wrap) wrap.style.display = pronto ? "" : "none";
  if (!pronto) {
    box.innerHTML = "";
    return;
  }
  const kw = (v) => (v > 0 ? `${fmt2(v)} kW` : "—");
  box.innerHTML = [
    ["Potência de geração", kw(usina)],
    ["Potência dos módulos", kw(potModulos)],
    ["Potência dos inversores", kw(potInversores)],
  ]
    .map(
      ([rot, val]) =>
        `<div class="resultado-card">
          <div class="resultado-card-label">${rot}</div>
          <div class="resultado-card-valor">${val}</div>
        </div>`,
    )
    .join("");
}
// Fontes cujo bloco próprio já declara a potência da usina: a chave do campo
// "Potência Instalada (kW)" de cada uma. O valor é copiado para `potencia` da
// fonte (ver recalcFontes), que é o que entra na soma, no PDF e na prévia —
// cada fonte nova entra aqui junto com o seu bloco. Com a Eólica, TODAS as
// fontes fora do Solar (que calcula a sua) estão cobertas.
const GD_POT_INSTALADA_POR_FONTE = {
  Hidráulica: "hidroPotInstalada",
  // As duas fontes da central térmica declaram a potência no MESMO campo do
  // bloco compartilhado (ver GD_FONTES_CENTRAL_TERMICA, js/data.js).
  Biomassa: "bioPotInstalada",
  "Cogeração Qualificada": "bioPotInstalada",
  Eólica: "eolPotInstalada",
};
// Regras 15/16: a potência de cada fonte é sempre DERIVADA — em FV é a dos
// INVERSORES (são eles que limitam a injeção na rede, então um arranjo de
// módulos maior não aumenta o que a usina entrega), nas demais é espelhada do
// "Potência Instalada (kW)" do bloco da fonte. A Potência Ativa Instalada
// Total é a soma das fontes.
function recalcFontes() {
  (state.fontes || []).forEach((f, i) => {
    // Soma de TODOS os modelos declarados (quantidade × potência nominal). A
    // potência nominal já é digitada em kW, então o total sai em kW.
    const pm = _somaPotFVGD(f.modulos);
    const pi = _somaPotFVGD(f.inversores);
    f.potTotalModulos = pm ? String(pm) : "";
    f.potTotalInversores = pi ? String(pi) : "";
    // Espelhos para a prévia e o PDF: o total de unidades (o "Quantidade de
    // módulos"/"de inversores" que o PDF imprime, agora somando os modelos).
    f.qtdModulos = String(_somaQtdFVGD(f.modulos) || "");
    f.qtdInversores = String(_somaQtdFVGD(f.inversores) || "");
    // Os totais são exibidos como texto (não são inputs): "5,76 kW" enquanto
    // houver o que mostrar, senão VAZIO — o produto só existe com quantidade e
    // potência nominal preenchidas, e um "—" fixo lia como valor calculado.
    const txt = (v) => (v > 0 ? fmt2(v) + " kW" : "");
    const dispM = $(`#gd_potTotalModulos${i}`),
      dispI = $(`#gd_potTotalInversores${i}`);
    if (dispM) dispM.textContent = txt(pm);
    if (dispI) dispI.textContent = txt(pi);
    if (f.fontePrimaria === "Solar") {
      f.potencia = pi ? String(pi) : "";
    } else {
      const chave = GD_POT_INSTALADA_POR_FONTE[f.fontePrimaria];
      f.potencia = chave ? f[chave] || "" : "";
    }
    _renderKpisGeracaoGD(i, pm, pi);
  });
  const total = (state.fontes || []).reduce(
    (s, f) => s + (parseFloat(f.potencia) || 0),
    0,
  );
  state.potAtivaInstalada = total ? String(total) : "";
  // O input portador (type=hidden) nunca aparece em tela, mas syncState() relê
  // o DOM antes da prévia e apagaria o valor derivado se ele ficasse vazio.
  const inp = $(`[data-k="potAtivaInstalada"]`);
  if (inp) inp.value = state.potAtivaInstalada;
  const disp = $("#gd_potAtivaTotal");
  if (disp) disp.textContent = total ? fmt2(total) + " kW" : "";
  // Regra 9: a potência de geração filtra os modelos de subestação. Basta
  // recalcular — refazer os cards a cada tecla da etapa 5 seria desperdício, e
  // atualizarSE() é quem os redesenha.
  recalcTecnicoGD();
  atualizarGFC();
}

/* ============================================================
   BLOCOS DA FONTE — montagem
   ------------------------------------------------------------
   Cada fonte primária tem o seu conjunto de campos, como no microGD:
     • SOLAR      — módulos e inversores (um bloco por modelo), área ocupada,
                    tensão de conexão, os totais calculados e os KPIs;
     • HIDRÁULICA — dados da central e do aproveitamento (potências, tensão,
                    rio, sub-bacia, níveis de operação) e a classificação de
                    segurança de barragens da REN 696/2015;
     • CENTRAL TÉRMICA — compartilhada por BIOMASSA e COGERAÇÃO QUALIFICADA
                    (GD_FONTES_CENTRAL_TERMICA, js/data.js): as duas declaram a
                    mesma central e só o TÍTULO muda entre elas;
     • EÓLICA     — quantidade, potência instalada, fabricante e modelo dos
                    aerogeradores, altura da pá, eixo do rotor e fator de
                    potência.
   Enquanto nenhuma fonte for escolhida o bloco mostra só a própria pergunta —
   a validação de exportação não pode cobrar campo fora de tela.
   ============================================================ */
// Campo de texto de uma fonte. `req` só é omitido nos poucos opcionais (ver
// bioDespachoQualificacao e o bloco de outorga).
function _fCampoGD(f, chave, rotulo, opts) {
  opts = opts || {};
  const attrs = [
    `data-f="${chave}"`,
    opts.num ? "data-num" : "",
    opts.int ? "data-int" : "",
    opts.recalc ? "data-f-recalc" : "",
  ]
    .filter(Boolean)
    .join(" ");
  return (
    `<div class="field${opts.span ? " col-span-2" : ""}">` +
    `<label>${rotulo}${opts.opcional ? "" : ' <span class="req">*</span>'}</label>` +
    `<input type="text" ${attrs} value="${_escAttrGD(f[chave])}" placeholder=" " />` +
    `</div>`
  );
}
function _fSelectGD(f, chave, rotulo, lista, opts) {
  opts = opts || {};
  const opcoes = lista
    .map(
      (o) =>
        `<option value="${_escAttrGD(o)}"${f[chave] === o ? " selected" : ""}>${o}</option>`,
    )
    .join("");
  return (
    `<div class="field${opts.span ? " col-span-2" : ""}">` +
    `<label>${rotulo} <span class="req">*</span></label>` +
    `<select data-f="${chave}"><option value=""></option>${opcoes}</select>` +
    `</div>`
  );
}
/* Escolha de dois valores → toggle, como no microGD. O <select> oculto por
   trás é o mesmo recurso de lá: é ele que os marcadores enxergam (ver
   _visivel em shared/js/form-marcadores.js, que reconhece o select
   substituído por cards), então o obrigatório continua valendo. Quem grava é
   o clique no botão (ver a ligação dos listeners em renderFontes). */
function _fToggleGD(f, chave, rotulo, opcoes, opts) {
  opts = opts || {};
  const simNao =
    opcoes.length === 2 && opcoes.every((o) => o === "Sim" || o === "Não");
  const btns = opcoes
    .map(
      (o) =>
        `<button type="button" role="radio" data-ftoggle="${chave}" data-fvalor="${_escAttrGD(o)}"` +
        ` aria-checked="${f[chave] === o ? "true" : "false"}"` +
        ` class="toggle-btn${f[chave] === o ? " on" : ""}">${o}</button>`,
    )
    .join("");
  return (
    `<div class="field field--plain${opts.span ? " col-span-2" : ""}${opts.pergunta ? " gd-pergunta" : ""}" data-noopt>` +
    `<label>${rotulo} <span class="req">*</span></label>` +
    `<div class="toggle-group${simNao ? "" : " toggle-group--opcoes"}" role="radiogroup" data-ftoggle-grupo="${chave}">${btns}</div>` +
    // Opção vazia à frente: sem ela o estado nasceria já respondido e o
    // obrigatório passaria em branco.
    `<select data-f="${chave}" style="display: none" aria-hidden="true">` +
    `<option value=""></option>` +
    opcoes
      .map(
        (o) =>
          `<option value="${_escAttrGD(o)}"${f[chave] === o ? " selected" : ""}>${o}</option>`,
      )
      .join("") +
    `</select></div>`
  );
}
// Conjunto fotovoltaico: módulos e inversores em blocos, um por MODELO. Área
// ocupada, tensão de conexão e as potências totais ficam FORA dos blocos: as
// duas primeiras valem para a usina inteira (é assim que o PDF as imprime) e
// as últimas são a soma de todos os modelos.
function _fvBlocosHTML(f, i) {
  const qtdCampo = (chave, tipo) =>
    `<div class="field">
      <label>Quantidade de modelos <span class="req">*</span></label>
      <input type="number" min="1" max="99" step="1" data-f="${chave}" data-f-sync="${tipo}"
             value="${_escAttrGD(f[chave])}" placeholder=" " />
    </div>`;
  return (
    `<h4 class="card-subtitle divider">Módulos da central geradora fotovoltaica</h4>` +
    `<p class="card-sub">Preencha os dados de cada modelo de módulo instalado na usina.</p>` +
    `<div class="grid grid-2 bloco-sub-gap">` +
    qtdCampo("qtdModeloModulos", "modulos") +
    _fCampoGD(f, "areaArranjos", "Área ocupada (m²)", { num: true }) +
    `</div>` +
    `<div id="moduloModelos${i}" class="gd-modelos-lista"></div>` +
    // Total da lista acima, no padrão .readonly-val (shared.css): rótulo no
    // topo e valor na moldura cinza de campo bloqueado.
    `<div class="grid grid-2 bloco-sub-gap">` +
    `<div class="field" data-noopt><label>Potência total calculada</label>` +
    `<div class="readonly-val" id="gd_potTotalModulos${i}"></div></div>` +
    `</div>` +
    `<h4 class="card-subtitle divider">Inversores da central geradora fotovoltaica</h4>` +
    `<p class="card-sub">Preencha os dados de cada modelo de inversor instalado na usina.</p>` +
    `<div class="grid grid-2 bloco-sub-gap">` +
    qtdCampo("qtdModeloInversores", "inversores") +
    _fSelectGD(f, "tensaoConexaoInversor", "Tensão de conexão (V)", GD_TENSOES_INVERSOR) +
    `</div>` +
    `<div id="inversorModelos${i}" class="gd-modelos-lista"></div>` +
    `<div class="grid grid-2 bloco-sub-gap">` +
    `<div class="field" data-noopt><label>Potência total calculada</label>` +
    `<div class="readonly-val" id="gd_potTotalInversores${i}"></div></div>` +
    `</div>` +
    // Resumo da fonte: os KPIs da usina. O wrapper é quem carrega o vão, e
    // _renderKpisGeracaoGD() o liga/desliga — sem isso a margem sobraria com o
    // bloco vazio.
    `<div id="gdGeracaoResumo${i}" class="gd-fonte-resumo" style="display: none">` +
    `<div class="resultado-kpis resultado-kpis--linha" id="gdGeracaoKpis${i}"></div>` +
    `</div>`
  );
}
// Conjunto da fonte HIDRÁULICA: dados da central e do aproveitamento + a
// classificação de segurança de barragens da REN 696/2015. A "Potência
// Instalada (kW)" daqui é a potência da usina nesta fonte — recalcFontes() a
// espelha em `potencia`.
function _hidroBlocosHTML(f, i) {
  // As quatro perguntas de classificação trazem o critério oficial junto do
  // rótulo: são longas demais para os cards de toggle e aparecem como lista de
  // rádios, no mesmo desenho da modalidade de operação. Saem de
  // GD_BARRAGEM_PERGUNTAS (js/data.js) — a mesma lista que dá os rótulos
  // curtos ao PDF e à validação.
  const perguntas = GD_BARRAGEM_PERGUNTAS.map((p) => {
    const opcoes = p.opcoes
      .map(
        (o) =>
          `<label class="doc-item">` +
          `<input type="radio" name="fonte${i}_${p.chave}" data-fradio="${p.chave}" value="${_escAttrGD(o.valor)}"${f[p.chave] === o.valor ? " checked" : ""} />` +
          `<span class="doc-text">${o.valor}<span class="doc-sub">${o.sub}</span></span>` +
          `</label>`,
      )
      .join("");
    return (
      `<div class="field field--plain col-span-2 gd-pergunta" data-noopt>` +
      `<label>${p.num}) ${p.pergunta} <span class="req">*</span></label>` +
      `<div class="doc-list gd-radio-list">${opcoes}</div></div>`
    );
  }).join("");
  return (
    `<h4 class="card-subtitle divider">Dados da central geradora hidráulica</h4>` +
    `<div class="grid grid-2 bloco-sub-gap">` +
    _fCampoGD(f, "hidroPotAparente", "Potência Aparente (kVA)", { num: true }) +
    _fCampoGD(f, "hidroTensao", "Tensão (kV)", { num: true }) +
    _fCampoGD(f, "hidroRio", "Nome do rio") +
    _fCampoGD(f, "hidroNivelJusante", "Nív. Oper. Normal Jusante (m)", {
      num: true,
    }) +
    _fCampoGD(f, "hidroFatorPotencia", "Fator de Potência", { num: true }) +
    _fCampoGD(f, "hidroPotInstalada", "Potência Instalada (kW)", {
      num: true,
      recalc: true,
    }) +
    _fCampoGD(f, "hidroNivelMontante", "Nív. Oper. Normal Montante (m)", {
      num: true,
    }) +
    _fCampoGD(f, "hidroSubBacia", "Sub-bacia") +
    `</div>` +
    `<h4 class="card-subtitle divider">Segurança de barragens</h4>` +
    // Um único .grid governa as cinco perguntas: a 1ª é Sim/Não (toggle, como
    // os demais Sim/Não da etapa) e as outras quatro são os rádios acima, com
    // um gap único na seção.
    `<div class="grid grid-2 bloco-sub-gap">` +
    _fToggleGD(
      f,
      "hidroBarragemAltura",
      "1) A altura da barragem, contada do ponto mais baixo da fundação à crista, é maior ou igual a 15m (quinze metros)?",
      ["Sim", "Não"],
      { span: true, pergunta: true },
    ) +
    perguntas +
    `</div>`
  );
}
// Conjunto da CENTRAL TÉRMICA — serve as fontes Biomassa e Cogeração
// Qualificada (GD_FONTES_CENTRAL_TERMICA, js/data.js): as duas declaram a
// mesma central (combustível, máquina motriz, ciclo termodinâmico), então o
// bloco e as chaves bio* são um só. Só o TÍTULO muda entre elas.
function _bioBlocosHTML(f) {
  return (
    `<h4 class="card-subtitle divider">${GD_TITULO_CENTRAL_TERMICA[f.fontePrimaria] || "Dados da central geradora"}</h4>` +
    `<div class="grid grid-2 bloco-sub-gap">` +
    _fCampoGD(f, "bioPotAparente", "Potência Aparente (kVA)", { num: true }) +
    _fCampoGD(f, "bioPotInstalada", "Potência Instalada (kW)", {
      num: true,
      recalc: true,
    }) +
    _fCampoGD(f, "bioCombustivel", "Combustível") +
    // Despacho de qualificação: é o reconhecimento da cogeração qualificada
    // pela ANEEL (item 6.8 da documentação técnica, "caso aplicável") — segue
    // opcional NAS DUAS fontes, o único campo sem obrigatoriedade do bloco.
    _fCampoGD(f, "bioDespachoQualificacao", "Nº do Despacho de qualificação", {
      opcional: true,
    }) +
    _fToggleGD(f, "bioMaqMotriz", "Máq. Motriz", ["Motor", "Turbina"]) +
    _fToggleGD(f, "bioCicloTermodinamico", "Ciclo Termodin.", [
      "Aberto",
      "Fechado",
    ]) +
    _fCampoGD(f, "bioFatorPotencia", "Fator de Potência", { num: true }) +
    `</div>`
  );
}
// Conjunto da fonte EÓLICA. Mesma convenção da hidráulica e da central
// térmica: a "Potência Instalada (kW)" é a potência da usina nesta fonte.
function _eolBlocosHTML(f) {
  return (
    `<h4 class="card-subtitle divider">Dados da central geradora eólica</h4>` +
    `<div class="grid grid-2 bloco-sub-gap">` +
    _fCampoGD(f, "eolQtdAerogeradores", "Quantidade de Aerogeradores", {
      int: true,
    }) +
    _fCampoGD(f, "eolPotInstalada", "Potência Instalada (kW)", {
      num: true,
      recalc: true,
    }) +
    _fCampoGD(f, "eolFabricante", "Fabricante dos Aerogeradores") +
    _fCampoGD(f, "eolModelo", "Modelo dos Aerogeradores") +
    _fCampoGD(f, "eolAlturaPa", "Altura da pá (m)", { num: true }) +
    _fToggleGD(f, "eolEixoRotor", "Eixo do rotor", [
      "Horizontal",
      "Vertical",
    ]) +
    _fCampoGD(f, "eolFatorPotencia", "Fator de Potência", { num: true }) +
    `</div>`
  );
}
// Outorga: campos próprios do mini (o microGD os mantém na área de não
// alocados). Fecham o bloco da fonte, depois do que as duas telas
// compartilham. Todos opcionais — só existem havendo outorga/registro.
function _outorgaHTML(f) {
  return (
    `<h4 class="card-subtitle divider">Outorga do empreendimento</h4>` +
    `<div class="grid grid-2 bloco-sub-gap">` +
    _fCampoGD(f, "ceg", "CEG do empreendimento (se houver outorga)", {
      span: true,
      opcional: true,
    }) +
    _fCampoGD(f, "numAtoOutorga", "Nº do Ato de Outorga/Registro", {
      opcional: true,
    }) +
    _fCampoGD(f, "anoAtoOutorga", "Ano do Ato", {
      int: true,
      opcional: true,
    }) +
    _fCampoGD(f, "tipoAtoOutorga", "Tipo do Ato de Outorga/Registro", {
      opcional: true,
    }) +
    _fCampoGD(f, "nomeUsina", "Nome da Usina", {
      span: true,
      opcional: true,
    }) +
    `</div>`
  );
}
function renderFontes() {
  const box = $("#fontesBox");
  if (!box) return;
  box.innerHTML = "";
  (state.fontes || []).forEach((f, i) => {
    const ehFV = f.fontePrimaria === "Solar";
    const ehHidro = f.fontePrimaria === "Hidráulica";
    const ehBio = GD_FONTES_CENTRAL_TERMICA.includes(f.fontePrimaria);
    const ehEol = f.fontePrimaria === "Eólica";
    const bloco = document.createElement("div");
    bloco.className = "gd-fonte-bloco";
    bloco.id = `fonteBloco${i}`;
    bloco.innerHTML =
      // Cabeçalho do bloco no MESMO padrão dos blocos de modelo ("Módulo 1"):
      // subtítulo/18px em peso regular, SEM divider — o .gd-subhead (12px
      // caixa-alta com linha embaixo) é o cabeçalho de SEÇÃO da etapa 8, não
      // de um bloco repetido dentro do card.
      `<div class="gd-fonte-titulo">Fonte de geração ${i + 1}</div>` +
      `<div class="grid grid-2">` +
      _fSelectGD(f, "fontePrimaria", "Fonte primária", GD_FONTES) +
      // Tecnologia de geração: perguntada só no Solar, como no microGD — nas
      // demais fontes a máquina é a própria central declarada no bloco.
      (ehFV
        ? _fSelectGD(f, "tipoGeracao", "Tecnologia de geração", GD_TIPO_GERACAO)
        : "") +
      `</div>` +
      (ehFV ? _fvBlocosHTML(f, i) : "") +
      (ehHidro ? _hidroBlocosHTML(f, i) : "") +
      (ehBio ? _bioBlocosHTML(f) : "") +
      (ehEol ? _eolBlocosHTML(f) : "") +
      (f.fontePrimaria ? _outorgaHTML(f) : "");
    // ----- listeners: campos da fonte i gravam em state.fontes[i] -----
    bloco.querySelectorAll("[data-f]").forEach((el) => {
      const chave = el.dataset.f;
      const handler = () => {
        if (el.hasAttribute("data-num"))
          el.value = el.value.replace(/[^\d.]/g, "");
        if (el.hasAttribute("data-int")) el.value = el.value.replace(/\D/g, "");
        state.fontes[i][chave] = el.value;
        if (chave === "fontePrimaria") {
          onFontePrimariaGD(i);
        } else if (el.hasAttribute("data-f-sync")) {
          sincronizarEquipFVGD(i, el.dataset.fSync);
        } else if (el.hasAttribute("data-f-recalc")) {
          recalcFontes();
        } else if (window.CemigMarcadores) {
          window.CemigMarcadores.atualizarAvancar();
        }
      };
      el.addEventListener(el.tagName === "SELECT" ? "change" : "input", handler);
    });
    bloco.querySelectorAll("[data-ftoggle]").forEach((btn) => {
      btn.addEventListener("click", () =>
        onFonteToggleGD(i, btn.dataset.ftoggle, btn.dataset.fvalor),
      );
    });
    bloco.querySelectorAll("[data-fradio]").forEach((r) => {
      r.addEventListener("change", () => {
        state.fontes[i][r.dataset.fradio] = r.value;
        if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
      });
    });
    box.appendChild(bloco);
    if (ehFV) {
      renderEquipFVGD(i, "modulos");
      renderEquipFVGD(i, "inversores");
    }
  });
  if (window.CemigMarcadores) {
    window.CemigMarcadores.aplicar(box);
    window.CemigMarcadores.atualizarAvancar();
  }
}
// Troca de fonte primária: o bloco inteiro muda, então é remontado. Solar é
// sempre inversor — a tecnologia é consequência da fonte, não uma segunda
// pergunta; o select continua editável, só a marcação vem pronta. Em FV a
// contagem de modelos abre em 1, para o conjunto entrar em tela com o primeiro
// bloco pronto para preencher.
function onFontePrimariaGD(i) {
  const f = state.fontes[i];
  if (!f) return;
  if (f.fontePrimaria === "Solar") {
    if (!f.tipoGeracao) f.tipoGeracao = GD_TIPO_GERACAO_INVERSOR;
    _garantirModelosFVGD(f);
  }
  renderFontes();
  recalcFontes();
}
// Clique num toggle da fonte: grava no estado, repinta o grupo e mantém o
// <select> oculto em dia — é ele que os marcadores leem.
function onFonteToggleGD(i, chave, valor) {
  const f = state.fontes[i];
  if (!f) return;
  f[chave] = valor;
  const bloco = $(`#fonteBloco${i}`);
  if (bloco) {
    const sel = bloco.querySelector(`select[data-f="${chave}"]`);
    if (sel) sel.value = valor;
    const grupo = bloco.querySelector(`[data-ftoggle-grupo="${chave}"]`);
    if (grupo)
      grupo.querySelectorAll("[data-ftoggle]").forEach((b) => {
        const on = b.dataset.fvalor === valor;
        b.classList.toggle("on", on);
        b.setAttribute("aria-checked", on ? "true" : "false");
      });
  }
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
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

/* ===== Etapa 5 — Armazenamento =====
   O bloco "Armazenamento e banco de baterias" passou a viver DENTRO da etapa
   de geração, como na microgeração — a etapa própria deixou de existir. ===== */
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

/* ===== Etapa 7 — Declarações (checkboxes) ===== */
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

/* ===== Etapa 8 — Correspondência ===== */
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

/* ===== Etapa 9 — validação de exportação + prévia ===== */
// Porte 1:1 do useMemo `validacao` do app React do mini.
function validarExportacao() {
  const d = state;
  const faltas = [];
  const req = (v, label) => {
    if (!String(v || "").trim()) faltas.push(label);
  };
  // Numa ligação nova ainda não existe instalação — o campo nem aparece na
  // etapa 4 (ver onSolicitacao).
  if (!_ehLigacaoNova()) req(d.instalacao, "Número da instalação");
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
  req(d.solicitacao, "Tipo de Solicitação");
  // "Tipo de edificação" (entradaEnergia) NÃO entra aqui: gdValidarSubestacao()
  // já o cobra logo abaixo, com o texto que explica o que se espera da resposta.
  req(d.tensaoAtendimento, "Tensão de atendimento");
  // A impedância deixou de ser uma resposta da instalação: agora é campo de
  // cada transformador, e quem a cobra é gdValidarSubestacao() logo abaixo —
  // nos dois ramos, individual e cubículos.
  // Bloco técnico da subestação: transformadores, cubículos e tipo de SE. Os
  // cards são construídos por JS, então esta é a rede que fecha o que o
  // CemigMarcadores não alcança. Cobre também a quantidade de cubículos.
  faltas.push(...gdValidarSubestacao());
  if (GD_SOLICITACOES_FORM_CARGA.includes(d.solicitacao)) {
    const c = d.cargas || {};
    const temCarga =
      (c.qtds || []).some((q) => (q || 0) > 0) ||
      (c.mots || []).some((m) => (parseInt(m.q) || 0) > 0) ||
      (c.extras || []).some((m) => (parseInt(m.q) || 0) > 0);
    if (!temCarga)
      faltas.push("Formulário de Carga (declarar as cargas elétricas)");
  }
  // A demanda contratada é campo de card (transformador ou cubículo): quem a
  // cobra, com o rótulo que o usuário viu, é gdValidarSubestacao().
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
  req(d.modoOperacao, "Modalidade de operação do sistema");
  req(d.potAtivaInstalada, "Potência Ativa Instalada Total");
  if ((d.solicitacao || "").indexOf("GD Existente") >= 0)
    req(d.potGeracaoAtual, "Potência de Geração Atual");
  req(d.modalidade, "Modalidade de compensação");
  // Cada fonte cobra o SEU conjunto (ver renderFontes): o que não entra em
  // tela não pode ser exigido, senão a exportação trava sem nada a preencher.
  (d.fontes || []).forEach((f, i) => {
    const pre = (d.fontes || []).length > 1 ? `Fonte ${i + 1} — ` : "";
    req(f.fontePrimaria, `${pre}Tipo de Fonte Primária`);
    if (f.fontePrimaria === "Solar") {
      req(f.tipoGeracao, `${pre}Tecnologia de geração`);
      req(f.potencia, `${pre}Potência de geração`);
      req(f.areaArranjos, `${pre}Área ocupada pelos arranjos`);
      req(f.tensaoConexaoInversor, `${pre}Tensão de conexão do inversor`);
    } else if (f.fontePrimaria === "Hidráulica") {
      req(f.hidroPotAparente, `${pre}Potência Aparente (kVA)`);
      req(f.hidroTensao, `${pre}Tensão (kV)`);
      req(f.hidroRio, `${pre}Nome do rio`);
      req(f.hidroNivelJusante, `${pre}Nív. Oper. Normal Jusante (m)`);
      req(f.hidroFatorPotencia, `${pre}Fator de Potência`);
      req(f.hidroPotInstalada, `${pre}Potência Instalada (kW)`);
      req(f.hidroNivelMontante, `${pre}Nív. Oper. Normal Montante (m)`);
      req(f.hidroSubBacia, `${pre}Sub-bacia`);
      req(f.hidroBarragemAltura, `${pre}Altura da barragem (>= 15 m)`);
      // As quatro perguntas de classificação da barragem, pelos rótulos curtos
      // da própria lista (js/data.js) — a pergunta inteira não cabe aqui.
      GD_BARRAGEM_PERGUNTAS.forEach((q) => req(f[q.chave], pre + q.rotulo));
    } else if (GD_FONTES_CENTRAL_TERMICA.includes(f.fontePrimaria)) {
      // Biomassa e Cogeração Qualificada dividem o bloco da central e, com
      // ele, a mesma lista de obrigatórios. bioDespachoQualificacao fica de
      // fora: o reconhecimento da ANEEL é "caso aplicável" (item 6.8).
      req(f.bioPotAparente, `${pre}Potência Aparente (kVA)`);
      req(f.bioPotInstalada, `${pre}Potência Instalada (kW)`);
      req(f.bioCombustivel, `${pre}Combustível`);
      req(f.bioMaqMotriz, `${pre}Máq. Motriz`);
      req(f.bioCicloTermodinamico, `${pre}Ciclo Termodin.`);
      req(f.bioFatorPotencia, `${pre}Fator de Potência`);
    } else if (f.fontePrimaria === "Eólica") {
      req(f.eolQtdAerogeradores, `${pre}Quantidade de Aerogeradores`);
      req(f.eolPotInstalada, `${pre}Potência Instalada (kW)`);
      req(f.eolFabricante, `${pre}Fabricante dos Aerogeradores`);
      req(f.eolModelo, `${pre}Modelo dos Aerogeradores`);
      req(f.eolAlturaPa, `${pre}Altura da pá (m)`);
      req(f.eolEixoRotor, `${pre}Eixo do rotor`);
      req(f.eolFatorPotencia, `${pre}Fator de Potência`);
    }
  });
  // Os modelos de módulo/inversor vivem em blocos indexados: o gate do
  // "Avançar" só olha a etapa ativa, então a lista inteira é revalidada aqui.
  faltas.push(...gdValidarFVGD());
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
// Resumo de UMA fonte na prévia — o conjunto muda com a fonte primária, como
// na etapa. O prefixo só aparece havendo mais de uma fonte.
function _pvFonteGD(f, i, total) {
  const pre = total > 1 ? `F${i + 1}: ` : "";
  const linha = (rot, val) => pvCampo(pre + rot, val, { step: 4 });
  let out =
    linha("Fonte", f.fontePrimaria) +
    linha("Potência da fonte (kW)", f.potencia);
  if (f.fontePrimaria === "Solar")
    out +=
      linha(
        "Módulos",
        `${(f.modulos || []).length} modelo(s) · ${f.qtdModulos || "—"} un · ${f.potTotalModulos || "—"} kW`,
      ) +
      linha(
        "Inversores",
        `${(f.inversores || []).length} modelo(s) · ${f.qtdInversores || "—"} un · ${f.potTotalInversores || "—"} kW`,
      );
  else if (f.fontePrimaria === "Hidráulica")
    out +=
      linha(
        "Rio / Sub-bacia",
        `${f.hidroRio || "—"} / ${f.hidroSubBacia || "—"}`,
      ) +
      linha("Pot. Aparente (kVA)", f.hidroPotAparente) +
      linha("Barragem >= 15 m", f.hidroBarragemAltura) +
      GD_BARRAGEM_PERGUNTAS.map((q) => linha(q.rotulo, f[q.chave])).join("");
  else if (GD_FONTES_CENTRAL_TERMICA.includes(f.fontePrimaria))
    out +=
      linha("Combustível", f.bioCombustivel) +
      linha("Pot. Aparente (kVA)", f.bioPotAparente) +
      linha(
        "Máq. motriz / Ciclo",
        `${f.bioMaqMotriz || "—"} / ${f.bioCicloTermodinamico || "—"}`,
      );
  else if (f.fontePrimaria === "Eólica")
    out +=
      linha("Aerogeradores", `${f.eolQtdAerogeradores || "—"} un`) +
      linha(
        "Fabricante / Modelo",
        `${f.eolFabricante || "—"} / ${f.eolModelo || "—"}`,
      ) +
      linha(
        "Altura da pá (m) / Eixo",
        `${f.eolAlturaPa || "—"} / ${f.eolEixoRotor || "—"}`,
      );
  return out;
}
function renderPreviewGD() {
  // Aquecimento do jsPDF (carga sob demanda): chegar nesta etapa é o melhor
  // sinal de que o PDF vem a seguir. Sem await — não bloqueia a renderização.
  window.CemigLibs.jspdf().catch(() => {});
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
          "Tensão de atendimento",
          d.tensaoAtendimento ? _rotuloTensaoGD(d.tensaoAtendimento) : "",
          { step: 3 },
        ) +
        pvCampo("Tipo de edificação", d.entradaEnergia, { step: 3 }) +
        pvCampo("Subestação (ND 5.3)", d.tipoSE, { step: 3 }) +
        // Individual e compartilhada resumem coisas diferentes: lá são os
        // transformadores da própria UC, aqui os cubículos do bloco.
        (d.entradaEnergia === GD_ENTRADA_COMPARTILHADA
          ? pvCampo(
              "Cubículos",
              `${(d.cubiculos || []).length} · ${d.qtdTotalTrafos || 0} trafos · ${d.potTotalTrafos || 0} kVA · demanda ${d.demandaTotalCubiculos || 0} kW`,
              { full: true, step: 3 },
            )
          : pvCampo(
              "Transformadores",
              // A impedância saiu do resumo: com um valor por transformador não
              // há um número único a exibir — a tabela do PDF traz a coluna.
              `${d.qtdTotalTrafos || 0} un · ${d.potTotalTrafos || 0} kVA · demanda ${d.demandaTotalTrafos || 0} kW`,
              { full: true, step: 3 },
            )) +
        // A demanda é campo de card (transformador ou cubículo): a linha acima
        // já traz a soma declarada, nos dois ramos. Aqui resta a da geração.
        pvCampo("Demanda de geração (kW)", d.demandaGeracao, { step: 4 }),
    ),
  );
  secoes.push(
    pvSecao(
      "4 — Geração",
      pvCampo("Qtd. fontes", d.qtdFontes, { step: 4 }) +
        pvCampo("Modalidade de operação", d.modoOperacao, { step: 4 }) +
        pvCampo("Pot. Ativa Instalada (kW)", d.potAtivaInstalada, {
          step: 4,
        }) +
        pvCampo("Modalidade", d.modalidade, { step: 4 }) +
        // Uma linha por fonte com o resumo do conjunto dela: o detalhe todo
        // (níveis de operação, critérios de risco, modelos) fica para o PDF.
        (d.fontes || [])
          .map((f, i) => _pvFonteGD(f, i, (d.fontes || []).length))
          .join(""),
    ),
  );
  let cor =
    pvCampo("Como deseja receber a fatura", d.corrAlternativa, { step: 7 }) +
    pvCampo("Vencimento", d.vencimento, { step: 7 });
  if (d.corrAlternativa === "E-mail informado")
    cor += pvCampo("E-mail para envio da fatura", d.email, {
      full: true,
      step: 7,
    });
  if (d.corrAlternativa === "Outro e-mail")
    cor += pvCampo("E-mail para envio da fatura", d.corrOutroEmail, {
      full: true,
      step: 7,
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
      { full: true, step: 7 },
    );
  if (d.corrAlternativa === "Conta globalizada")
    cor += pvCampo("Conta globalizada", d.contaGlobal, { step: 7 });
  secoes.push(pvSecao("Correspondência e Fatura", cor));
  const content = $("#previewContent");
  if (content) content.innerHTML = secoes.join(PV_DIVISOR);
  const btn = $("#btnExportarPDF");
  if (btn) btn.disabled = !v.ok;
  // O PDF de Análise de Partida só existe havendo motor pesado — mesma
  // condição com que o MT oferece o documento na prévia dele.
  const btnPartida = $("#btnExportarPartida");
  if (btnPartida)
    btnPartida.style.display = motoresPesadosGD(d).length ? "" : "none";
}
function syncState() {
  $$("[data-k]").forEach((el) => {
    state[el.dataset.k] = el.value;
  });
}
async function exportarPdfGD() {
  const v = validarExportacao();
  if (!v.ok) {
    renderPreviewGD();
    return;
  }
  // jsPDF sob demanda (shared/js/libs.js): o aquecimento na etapa de prévia
  // normalmente já resolveu; aqui é a garantia antes de criar o documento.
  // criarPdfGD pressupõe a lib presente, então a falha para aqui.
  try {
    await window.CemigLibs.jspdf();
  } catch (e) {
    alert("Biblioteca jsPDF não carregada.");
    return;
  }
  gerarPdfMiniGD(state);
}

/* PDF complementar de Análise de Partida (documento à parte, anexado ao
   pedido). Sem o gate de validarExportacao(): como no MT, o preenchimento é
   opcional e não bloqueia nem depende da exportação do formulário. */
async function exportarPdfAnalisePartidaGD() {
  try {
    await window.CemigLibs.jspdf();
  } catch (e) {
    alert("Biblioteca jsPDF não carregada.");
    return;
  }
  syncState();
  gerarPdfAnalisePartidaGD(state);
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
  // Blocos de modelo de módulo/inversor: sem esta garantia uma fonte Solar
  // restaurada abriria com as listas vazias, sem nenhum campo a preencher.
  // Vem antes de renderFontes(), que é quem os desenha.
  (state.fontes || []).forEach((f) => {
    if (f.fontePrimaria === "Solar") _garantirModelosFVGD(f);
  });
  renderFontes();
  // Estado inicial das condicionais.
  // A ordem importa: onEntradaEnergia() decide SE o bloco técnico existe;
  // onSolicitacao() define a finalidade (conexão nova × alteração) e o par de
  // demandas. Os dois terminam em atualizarSE(), que é idempotente.
  onEntradaEnergia();
  onSolicitacao();
  sincronizarTrafos();
  sincronizarMotores();
  onGeradorEmergencia();
  onTelhadoArrendado();
  // Modalidade de operação: radios sem data-k — restaura a marcação a partir
  // do estado (prefill / volta à etapa) e deriva gridZero, que é quem chama
  // onGridZero() -> onModalidade().
  const radioModo = $(
    `input[name="modoOperacao"][value="${state.modoOperacao}"]`,
  );
  if (radioModo) radioModo.checked = true;
  onModoOperacaoGD();
  recalcFontes();
  onArmazenamento();
  onCorrAlternativa();
  // Etapa 3 (cópia do micro): zona antes da coordenada — onZonaGD decide quais
  // caixas de endereço ficam visíveis, e onCoordGD já parte do estado certo.
  onZonaGD();
  // initMapaObra() saiu daqui: no boot a etapa 3 ainda está oculta (e, sem zona,
  // o #blocoMapaCoord também). Quem cria o mapa é onZonaGD(), ao revelar o
  // bloco, ou goTo(), ao entrar na etapa — os dois com o container já medindo.
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
