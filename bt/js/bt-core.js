/* ============================================================
   CEMIG BT — Núcleo compartilhado dos apps vanilla (individual
   e coletivo/condomínio). Extraído de individual-app.js.
   ------------------------------------------------------------
   Contém o que independe do fluxo: util/binding, navegação
   (goTo + delegação [data-nav] + renumeração de eyebrows),
   toggles, proprietário PF/CNPJ, CEP, correspondência, mapa
   Leaflet + restrição ambiental, helpers de prévia e logo do
   PDF. O app da página declara `const state = {...}` e publica
   `window.state = state` ANTES de initFormulario — o core só
   acessa o estado via window.state.
   Hooks por página específicos do fluxo: o app define
   `window.onPaginaAtiva(sec, n)` (chamado pelo goTo).
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
  let o = window.state;
  for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]];
  o[ks[ks.length - 1]] = v;
}
// Handlers inline disparam ANTES do listener do bindInputs — sincroniza.
function _sync(k) {
  const el = $(`[data-k="${k}"]`);
  if (el) _setPath(k, el.value);
  return _get(window.state, k);
}

/* ===== Card da modalidade (?mod=<id>) ===== */
// Resolve o card da URL aceitando apenas os formTypes do app. Cards
// individuais que chegarem a um app não-individual voltam ao formulário
// vanilla próprio (individual.html); qualquer outro caso inválido volta
// à home. Retorna null quando houve redirect (o script segue rodando).
function btResolverCard(formTypesAceitos) {
  const todas = MODALIDADES_SECOES.flatMap((s) => s.cards);
  const mod = new URLSearchParams(window.location.search).get("mod");
  const card = mod ? todas.find((c) => c.id === mod) : null;
  if (
    card &&
    card.status === "ok" &&
    card.formType === "individual" &&
    !formTypesAceitos.includes("individual")
  ) {
    window.location.href = "individual.html?mod=" + encodeURIComponent(card.id);
    return null;
  }
  if (
    !card ||
    card.status !== "ok" ||
    !formTypesAceitos.includes(card.formType)
  ) {
    window.location.href = "../index.html";
    return null;
  }
  return card;
}

/* ===== Fábricas de estado (mesmo shape do App React / gerarPdfDoc) ===== */
function propPadrao() {
  return {
    nome: "",
    // Cliente / Razão Social do empreendimento (condomínio de torres). Separado
    // de `nome`, que é a pessoa de contato da Etapa 2.
    cliente: "",
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
    alternativa: "E-mail informado",
    outroEmail: "",
    rua: "",
    bairro: "",
    num: "",
    compl: "",
    municipio: "",
    cep: "",
    estado: "MG",
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

/* ===== derivados de documento ===== */
const docInfo = () => validarCpfCnpj(window.state.prop.cpfCnpj);
const pessoaFisica = () => docInfo().tipo === "CPF";
const pessoaJuridica = () => docInfo().tipo === "CNPJ";
const redeMonoBT = () =>
  window.state.obra.tipoRede === "Monofásica" ||
  window.state.obra.tipoRede === "Bifásica";
const ruralBT = () => window.state.obra.localizacao === "Rural";

/* ===== Gates de avanço (form-marcadores data-gate) ===== */
// Proprietário: exige CPF/CNPJ COMPLETO e VÁLIDO (docValido do React).
window.btPropDocOk = () => docInfo().valido === true;
// Correspondência: condicionais (CAMPOS_OBRIGATORIOS.corr do React) — toggles
// usam select oculto (invisível p/ marcadores), daí o gate. A data de
// vencimento NÃO entra: informá-la é opcional.
window.btCorrOk = () => {
  const c = window.state.corr;
  const ok = (v) => String(v == null ? "" : v).trim() !== "";
  if (c.alternativa === "Outro e-mail" && !ok(c.outroEmail)) return false;
  if (
    c.alternativa === "Endereço novo" &&
    !(ok(c.cep) && ok(c.rua) && ok(c.num) && ok(c.bairro) && ok(c.municipio))
  )
    return false;
  if (c.alternativa === "Conta globalizada" && !ok(c.contaGlobal)) return false;
  return true;
};

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
    // Etapas concluídas: o check vem do CSS (ícone SVG mascarado em
    // .cemig-form .vstep.done .vstep-num::after), não do glifo "✓" da fonte.
    // Zeramos o texto para não competir com o ícone; não-concluídas mostram o nº.
    if (num) num.textContent = i < n ? "" : String(i + 1);
  });
  // Conteúdo dinâmico por presença (lição do MT). O mapa é do core; os
  // demais hooks são do fluxo e vivem em window.onPaginaAtiva.
  if (paginas[n].querySelector("#map")) {
    initMapaObra();
    if (mapaObra) setTimeout(() => mapaObra.invalidateSize(), 150);
  }
  if (typeof window.onPaginaAtiva === "function")
    window.onPaginaAtiva(paginas[n], n);
  window.scrollTo({ top: 0, behavior: "smooth" });
  CemigMarcadores.atualizarAvancar();
}
// Botões Voltar/Avançar dos fragmentos: navegação relativa por data-nav
// ("prev"|"next") — os fragmentos ficam independentes da posição absoluta
// da etapa (a mesma etapa aparece em posições diferentes por fluxo).
document.addEventListener("click", (e) => {
  const b = e.target.closest ? e.target.closest("[data-nav]") : null;
  // aria-disabled: o botão "Avançar" bloqueado continua clicável (para rolar
  // até o campo que falta — ver form-marcadores), mas não navega.
  if (!b || b.disabled || b.getAttribute("aria-disabled") === "true") return;
  goTo(pagina + (b.dataset.nav === "next" ? 1 : -1));
});
// Renumera os eyebrows "Etapa N" pela posição real da seção no DOM (os
// fragmentos são compartilhados entre fluxos com ordens/quantidades
// diferentes). Não toca em eyebrows de outro formato.
function btRenumerarEtapas() {
  $$("section.page").forEach((sec, i) => {
    const eb = $$(".section-eyebrow", sec).find((el) =>
      /^Etapa \d+$/.test(el.textContent.trim()),
    );
    if (eb) eb.textContent = "Etapa " + (i + 1);
  });
  // Sidebar: os números dos vsteps são estáticos no HTML e goTo só os
  // recalcula ao navegar — após o pruning [data-flow] a sequência inicial
  // ficaria com buracos (…5, 7, 8) até o primeiro clique.
  $$(".vstep .vstep-num").forEach((num, i) => {
    num.textContent = String(i + 1);
  });
}

/* ===== binding por caminho (data-k="prop.nome") ===== */
function bindInputs() {
  $$("[data-k]").forEach((el) => {
    const k = el.dataset.k;
    const v = _get(window.state, k);
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

/* ===== construtores de campo (ilhas dinâmicas) ===== */
function _campo(labelHtml, controle, cls) {
  const f = document.createElement("div");
  f.className = "field" + (cls ? " " + cls : "");
  const l = document.createElement("label");
  l.innerHTML = labelHtml;
  f.append(l, controle);
  // Ícone de ajuda (i): quando presente no rótulo, é movido para fora do
  // <label> e vira filho direto do .field. Assim ele fica ancorado ao campo
  // (centralizado na vertical, via .field > .field-hint-icon no CSS) e NÃO
  // acompanha o rótulo flutuante quando este sobe ao ser preenchido.
  const hint = l.querySelector(".cmg-hint, .field-info");
  if (hint) {
    hint.classList.add("field-hint-icon");
    f.appendChild(hint);
  }
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
// Acordeões exclusivos (torres/unidades/UCs/grupos de carga): abrir um item
// fecha o que estava aberto no mesmo mapa. As chaves fechadas ficam
// registradas como false — quem tem "aberto por padrão" testa a PRESENÇA da
// chave e assim não ressuscita um item fechado pelo usuário.
function btToggleExclusivo(mapa, chave, abrir) {
  Object.keys(mapa).forEach((k) => (mapa[k] = false));
  mapa[chave] = abrir;
}

/* ===== Proprietário (PF/CNPJ) ===== */
function mostrarCamposPFBT() {
  const info = docInfo();
  const pf = info.tipo === "CPF" && info.valido === true;
  $$(".pf-campo").forEach((el) => {
    el.style.display = pf ? "" : "none";
  });
  const nisBox = $("#numNisBox");
  if (nisBox)
    nisBox.style.display = pf && window.state.prop.nis === "Sim" ? "" : "none";
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
  // Mensagem do documento inválido como supporting-text ABAIXO do campo
  // (#cnpjStatus é um .field-hint irmão do input). Enquanto o usuário digita,
  // ainda incompleto, não acusa nada.
  if (info.valido === false)
    setStatus(
      "cnpjStatus",
      `<span class="cnpj-status-err">${info.tipo || "Documento"} inválido</span>`,
    );
  // Qualquer estado que NÃO seja "inválido" limpa a mensagem: documento válido
  // (CPF ou CNPJ) ou ainda incompleto enquanto se digita. Antes o CNPJ válido
  // era exceção (`info.tipo !== "CNPJ"`), na expectativa de que buscarCNPJ
  // sobrescrevesse o texto logo em seguida — mas ela só roda quando os dígitos
  // MUDAM (_cnpjBuscado), então corrigir um dígito e voltar a um CNPJ já
  // consultado deixava o "CNPJ inválido" preso na tela indefinidamente.
  else setStatus("cnpjStatus", "");
  if (info.tipo === "CNPJ") {
    // PF → PJ: limpa campos exclusivos de pessoa física (como o React)
    Object.assign(window.state.prop, {
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
    const p = window.state.prop;
    const razao = dd.razao_social || dd.nome_fantasia || "";
    // Onde existe o campo "Cliente / Razão Social do empreendimento"
    // (condomínio de torres), a razão social vai para ELE — o nome de contato
    // da Etapa 2 é de outra pessoa e não deve ser sobrescrito. Nos fluxos sem
    // esse campo, o titular continua sendo prop.nome.
    const temCliente = !!$('[data-k="prop.cliente"]');
    if (temCliente) p.cliente = razao || p.cliente;
    else p.nome = razao || p.nome;
    p.email = dd.email || p.email;
    if (dd.ddd_telefone_1 && !p.fixo)
      p.fixo = mascararTelefone(dd.ddd_telefone_1);
    ["prop.cliente", "prop.nome", "prop.email", "prop.fixo"].forEach((k) => {
      const el = $(`[data-k="${k}"]`);
      if (el) el.value = _get(window.state, k) || "";
    });
    // Consulta concluída: limpa o spinner sem deixar recado no lugar — os
    // campos preenchidos (razão social, e-mail, telefone) já são a confirmação
    // visível de que a busca deu certo.
    setStatus("cnpjStatus", "");
    // A razão social vinda da BrasilAPI preenche prop.cliente, que é uma das
    // condições de _emprCompleto (etapa "Dados do empreendimento"). Como esta
    // é uma resposta assíncrona, o onEmprGate() disparado no oninput já rodou
    // — com o campo ainda vazio — e os .empr-detalhe (CEP, endereço, nº,
    // bairro, cidade, estado) continuariam ocultos até o usuário tocar em
    // outro campo. Reavalia o gate agora que o cliente existe.
    if (typeof window.onEmprGate === "function") window.onEmprGate();
    CemigMarcadores.atualizarAvancar();
  } catch (e) {
    setStatus(
      "cnpjStatus",
      '<span class="cnpj-status-err">CNPJ não encontrado</span>',
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
      const o = window.state.obra;
      o.endereco = dd.logradouro || o.endereco;
      o.bairro = dd.bairro || o.bairro;
      o.cidade = dd.localidade || o.cidade;
      o.estado = dd.uf || o.estado;
      ["obra.endereco", "obra.bairro", "obra.cidade", "obra.estado"].forEach(
        (k) => {
          $$(`[data-k="${k}"]`).forEach(
            (c) => (c.value = _get(window.state, k) || ""),
          );
        },
      );
      onEnderecoUrbanoBT();
    } else {
      const c = window.state.corr;
      c.rua = dd.logradouro || c.rua;
      c.bairro = dd.bairro || c.bairro;
      c.municipio = dd.localidade || c.municipio;
      c.estado = dd.uf || c.estado;
      ["corr.rua", "corr.bairro", "corr.municipio", "corr.estado"].forEach(
        (k) => {
          const el2 = $(`[data-k="${k}"]`);
          if (el2) el2.value = _get(window.state, k) || "";
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

/* ===== Correspondência ===== */
// Mantido pelo nome (chamado no render das apps); apenas sincroniza os
// blocos condicionais do dropdown "Como deseja receber a fatura?".
function onReceberEmailBT() {
  onCorrAlternativaBT();
}
function onCorrAlternativaBT() {
  _sync("corr.alternativa");
  const v = window.state.corr.alternativa;
  const informado = $("#corrEmailInformadoBox"),
    obra = $("#corrObraAviso"),
    email = $("#corrEmailBox"),
    end = $("#corrEndBox"),
    global = $("#contaGlobalBox");
  if (informado) {
    informado.style.display = v === "E-mail informado" ? "" : "none";
    // Espelha o e-mail do proprietário no campo (somente leitura).
    const inp = $('[data-k="prop.email"]', informado);
    if (inp) inp.value = window.state.prop.email || "";
  }
  if (obra) obra.style.display = v === "Mesmo da obra" ? "" : "none";
  if (email) email.style.display = v === "Outro e-mail" ? "" : "none";
  if (end) end.style.display = v === "Endereço novo" ? "" : "none";
  if (global) global.style.display = v === "Conta globalizada" ? "" : "none";
}

/* ===== Avisos do padrão pronto p/ ligar ===== */
function onProntoLigarBT() {
  const v = window.state.obra.prontoLigar;
  const sim = $("#prontoSimAviso"),
    nao = $("#prontoNaoAviso");
  if (sim) sim.style.display = v === "Sim" ? "" : "none";
  if (nao) nao.style.display = v === "Não" ? "" : "none";
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
  window.state.obra.lat = String(lat);
  window.state.obra.lng = String(lng);
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
      attribution: "",
    },
  );
  satelite.addTo(mapaObra);
  window.L.control.layers({ Satélite: satelite, Ruas: ruas }).addTo(mapaObra);
  mapaObra.on("click", (e) => _aplicarCoordDoMapa(e.latlng.lat, e.latlng.lng));
  setTimeout(() => mapaObra.invalidateSize(), 200);
  const lat = parseFloat(String(window.state.obra.lat).replace(",", ".")),
    lng = parseFloat(String(window.state.obra.lng).replace(",", "."));
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
  const o = window.state.obra;
  o.utm = utmString(o.lat, o.lng);
  const utmEl = $("#bt_utm");
  if (utmEl) utmEl.value = o.utm;
  // Rótulos/aviso de coordenada rural existem só no fluxo individual.
  if (typeof atualizarCoordRural === "function") atualizarCoordRural();
  const lat = parseFloat(String(o.lat).replace(",", ".")),
    lng = parseFloat(String(o.lng).replace(",", "."));
  if (isNaN(lat) || isNaN(lng)) return;
  if (_nDig(o.lat) < 5 || _nDig(o.lng) < 5) return;
  sincronizarMapaComCoordenadas(lat, lng, !!imediato);
  consultarRestricaoAmbientalBT(lat, lng);
}
// Geocodificação estruturada pelo endereço urbano (debounce, como BT/MT).
async function geocodificarEnderecoBT() {
  const o = window.state.obra;
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
  // Some com a legenda junto do contorno (desenharRestricoesNoMapa recria).
  if (mapaObra && typeof atualizarLegendaRestricoes === "function")
    atualizarLegendaRestricoes(mapaObra, null);
}
function renderRestricaoAmbiental() {
  const box = $("#restricaoAmbientalConteudo");
  const wrap = $("#restricaoAmbientalBox");
  if (!box || !wrap) return;
  if (window.state.obra.restricaoAmbiental === "Sim") {
    wrap.style.display = "";
    const det = window.state.obra.restricoesDetalhe;
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
      `<label class="restricao-aceite"><input type="checkbox" id="restricaoAceite"${window.state.obra.restricaoAceite ? " checked" : ""}> <span>${label}</span></label>`;
    const chk = $("#restricaoAceite");
    if (chk)
      chk.onchange = (e) => {
        window.state.obra.restricaoAceite = e.target.checked;
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
      Object.assign(window.state.obra, {
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
    window.state.obra.restricaoAmbiental = dentros.length ? "Sim" : "Não";
    window.state.obra.restricaoAceite = false;
    window.state.obra.restricoesTexto = dentros
      .map(
        (r) =>
          r.rotulo + (r.nomes.length ? " (" + r.nomes.join(", ") + ")" : ""),
      )
      .join("\n");
    window.state.obra.restricoesDetalhe = detalhesRestricoes(res);
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

/* ===== helpers de prévia ===== */
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

/* ===== Logo colorida do PDF (canvas→dataURL, como o React) ===== */
(function carregarLogoPDF() {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.onload = () => {
    try {
      const cv = document.createElement("canvas");
      cv.width = img.naturalWidth;
      cv.height = img.naturalHeight;
      cv.getContext("2d").drawImage(img, 0, 0);
      if (window.state)
        window.state.logoPDF = {
          url: cv.toDataURL("image/png"),
          w: img.naturalWidth,
          h: img.naturalHeight,
        };
    } catch (e) {}
  };
  img.src = "../imgs/logos/logo-cemig-cor.png";
})();

/* ============================================================
   Formulário de Carga do BT (acordeões, Figma) — mesma matemática
   do React via calcDemandaResultados (shared/js/calc-demanda.js).
   Compartilhado pelos fluxos individual (sempre) e coletivo/
   múltiplas torres (quando o ND-5.2 não calcula).

   A ilha em si mora em shared/js/carga-bt.js (montarCargaAcordeao) —
   a microgeração usa exatamente a mesma seção. Aqui fica só o
   wrapper que a liga ao objeto da UC (u.cargas, u._acc) e ao hook
   de disjuntor solicitado do fluxo individual.
   ============================================================ */
function montarCargasBT(container, u, ui, aoMudar) {
  // A ilha normaliza e escreve os resultados NO objeto recebido — u.cargas
  // continua sendo a mesma referência que o resto do BT lê.
  u.cargas = u.cargas || {};
  return montarCargaAcordeao(container, {
    data: u.cargas,
    abertos: (u._acc = u._acc || {}),
    redeMono: redeMonoBT,
    atividade: () => u.atividade || "",
    aoMudar: () => {
      // Hook do fluxo individual (disjuntor solicitado automático); o
      // coletivo/múltiplas torres não o define.
      if (typeof atualizarSolicitacaoAuto === "function")
        atualizarSolicitacaoAuto();
      if (aoMudar) aoMudar();
    },
  });
}

