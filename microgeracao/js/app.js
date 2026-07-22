/* ============================================================
   MICROGERAÇÃO DISTRIBUÍDA — app vanilla (molde mt/js/app.js)
   ------------------------------------------------------------
   Estado plano de gdEstadoInicial() (js/model.js) bindado por
   [data-k]; etapas em fragmentos HTML (etapas/*.html) injetados
   por shared/js/etapas-loader.js, que chama window.initFormulario()
   com o DOM completo. Gating de avanço por etapa via
   shared/js/form-marcadores.js (obrigatórios visíveis) e gate de
   exportação via validarExportacao() (regras portadas do React).
   O PDF (js/pdf.js) recebe o MESMO objeto de estado plano.
   ============================================================ */

/* ===== Modo de entrada (Fast Track / Grid Zero via ?modo=) ===== */
function gdModoDaURL() {
  let modo = "";
  try {
    modo = new URLSearchParams(location.search).get("modo") || "";
  } catch (e) {}
  // Regra 1/2: Fast Track e Grid Zero são definidos pela porta de entrada
  // (modo) e ficam SEMPRE travados. Sem modo, ambos travados em "Não".
  if (modo === "fasttrack")
    return {
      modo,
      label: "Fast Track",
      descricao:
        "Enquadramento no inciso III do art. 73-A — campo definido pela modalidade e bloqueado.",
      overrides: { fastTrack: "Sim", gridZero: "Não" },
    };
  if (modo === "gridzero")
    return {
      modo,
      label: "Grid Zero",
      descricao:
        "Empreendimento sem injeção de energia na rede — campo definido pela modalidade e bloqueado.",
      overrides: { gridZero: "Sim", fastTrack: "Não" },
    };
  return {
    modo: "",
    label: "",
    descricao: "",
    overrides: { fastTrack: "Não", gridZero: "Não" },
  };
}
const GD_MODO = gdModoDaURL();

/* ===== Estado global ===== */
const state = Object.assign(gdEstadoInicial(), GD_MODO.overrides);
window.state = state; // visível p/ depuração e harnesses (const não vaza p/ window)
let ilhaCargas = null; // ilha do Formulário de Carga (shared/js/calc-demanda.js)

/* ===== util ===== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
// Handlers declarados como onchange NO HTML disparam ANTES do listener do
// bindInputs (ordem de registro) — cada handler sincroniza o próprio campo
// no início para não ler estado defasado (mesma razão do MT ler o DOM).
function _sync(k) {
  const el = $(`[data-k="${k}"]`);
  if (el) state[k] = el.value;
  return state[k];
}

/* ============================================================
   CARDS DE SELEÇÃO — motor portado do MT (mt/js/app.js). O <select
   data-k> original fica oculto como fonte da verdade: o clique no
   card define select.value e dispara input/change, preservando
   bindInputs, marcadores e os onchange declarados no HTML.
   ============================================================ */
const SIM_NAO = [
  { valor: "Não", texto: "Não" },
  { valor: "Sim", texto: "Sim" },
];
const CARDS_GD = [
  { chave: "fastTrack", gridId: "cardsFastTrack", opcoes: SIM_NAO, travado: true },
  { chave: "gridZero", gridId: "cardsGridZero", opcoes: SIM_NAO, travado: true },
  { chave: "laudoMedico", gridId: "cardsLaudoMedico", opcoes: SIM_NAO },
  { chave: "nis", gridId: "cardsNis", opcoes: SIM_NAO },
  { chave: "geradorEmergencia", gridId: "cardsGeradorEmergencia", opcoes: SIM_NAO },
  { chave: "mudancaLocal", gridId: "cardsMudancaLocal", opcoes: SIM_NAO },
  { chave: "distMenor30", gridId: "cardsDistMenor30", opcoes: SIM_NAO },
  { chave: "telhadoArrendado", gridId: "cardsTelhadoArrendado", opcoes: SIM_NAO },
  { chave: "duasInstalacoesDUB", gridId: "cardsDuasInstalacoesDUB", opcoes: SIM_NAO },
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
  if (campo.travado) grid.classList.add("is-locked");
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
      btn.disabled = !!campo.travado;
      if (!campo.travado)
        btn.addEventListener("click", () => {
          _cardDispatch(select, op.valor);
          render();
        });
      grid.appendChild(btn);
    });
  };
  // re-renderiza quando o valor muda por fora (ex.: prefill)
  select.addEventListener("change", render);
  render();
  select.style.display = "none";
  select.setAttribute("aria-hidden", "true");
}
function inicializarCards() {
  CARDS_GD.forEach(_cardsMontar);
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
  // Conteúdo dinâmico detectado por presença (lição do MT), não por índice:
  if (alvo.querySelector("#calcDemandaBox") && ilhaCargas) ilhaCargas.atualizar();
  if (alvo.querySelector("#previewContent")) renderPreviewGD();
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}

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
// Aplica um patch ao estado refletindo nos controles (usado pelo CEP/CNPJ).
function aplicarPatch(patch) {
  Object.entries(patch).forEach(([k, v]) => {
    state[k] = v;
    const el = $(`[data-k="${k}"]`);
    if (el && v != null) el.value = v;
  });
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}

/* ===== Máscaras (shared/js/calc.js) ===== */
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
// números decimais (mantém dígitos e ponto)
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

/* ===== Identificação ===== */
function gdEhCpfValido() {
  const r = validarCpfCnpj(state.cpfCnpj);
  return r.tipo === "CPF" && r.valido === true;
}
function mostrarCamposPF(pf) {
  $$(".pf-campo").forEach((el) => {
    el.style.display = pf ? "" : "none";
  });
  if (!pf) {
    ["filiacao", "rg", "nasc", "numNis"].forEach((k) => {
      const c = $(`[data-k="${k}"]`);
      if (c) c.value = "";
      state[k] = "";
    });
    state.laudoMedico = "Não";
    state.nis = "Não";
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
  const pfVisivel = gdEhCpfValido();
  if (box)
    box.style.display = pfVisivel && state.nis === "Sim" ? "" : "none";
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

/* ===== Selects populados de js/data.js (fonte única das listas) ===== */
function preencherSelect(k, lista, opts) {
  const sel = $(`select[data-k="${k}"]`);
  if (!sel) return;
  const semVazio = sel.hasAttribute("data-sem-vazio");
  const rotuloVazio = sel.getAttribute("data-vazio-rotulo") || "";
  const atual = sel.value;
  sel.innerHTML =
    (semVazio ? "" : `<option value="">${rotuloVazio}</option>`) +
    lista.map((o) => `<option value="${o}">${o}</option>`).join("");
  if (atual && lista.includes(atual)) sel.value = atual;
}
function preencherSelects() {
  preencherSelect("fastRegra", GD_FAST_REGRAS);
  preencherSelect("grupo", GD_GRUPOS);
  preencherSelect("classe", GD_CLASSES);
  preencherSelect("solicitacao", GD_SOLICITACOES);
  preencherSelect("edificacao", GD_EDIFICACOES);
  preencherSelect("edifTipo", GD_EDIF_TIPO);
  preencherSelect("ramal", GD_RAMAL);
  preencherSelect("instExistenteBTMT", GD_BT_MT);
  preencherSelect("fontePrimaria", GD_FONTES);
  preencherSelect("tipoGeracao", GD_TIPO_GERACAO);
  preencherSelect("modalidade", GD_MODALIDADES);
  preencherSelect("decl85Regra", GD_DECL_85);
  atualizarTensoes();
  atualizarFasesDisj();
}

/* ===== Etapa 3 — Dados da UC ===== */
function onCoordGD(el) {
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
  if (disp)
    disp.value = u ? `${u.fuso}${u.banda} E:${u.utmE} N:${u.utmN}` : "";
  const utm = gdValidarUTM(state.fuso, state.utmE, state.utmN);
  setHint("utmHint", state.fuso && !utm.ok ? utm.msg : "");
}
function onGeradorEmergencia() {
  _sync("geradorEmergencia");
  const sim = state.geradorEmergencia === "Sim";
  const box = $("#geradorPotBox");
  if (box) box.style.display = sim ? "" : "none";
  if (!sim) aplicarPatch({ geradorPotencia: "" });
}
function onTelhadoArrendado() {
  _sync("telhadoArrendado");
  const box = $("#dubBox");
  if (box)
    box.style.display = state.telhadoArrendado === "Sim" ? "" : "none";
}

/* --- Subestação (Grupo A / migração BT→MT) --- */
// Descrições resumidas (ND-5.3) — mesmas do módulo MT/BT (tooltip "i").
const SE_INFO_GD = {
  1: "Aérea em poste: transformador instalado na rede aérea, para pequenas potências. Medição e proteção na base.",
  2: "Medição e proteção (com ou sem transformação), em alvenaria. Desde 03/07/2023 não se aplica a fornecimento individual em 13,8 kV; desde 01/01/2024 também não em compartilhado 13,8 kV. Permitida em 22/34,5 kV e uso compartilhado.",
  4: "Blindada: cubículo metálico compartimentado, com alívio de pressão e ventilação, abrigado ou ao tempo. Proteção na média tensão, sem transformação. Atende demandas de até 2500 kW.",
  5: "Medição, proteção e transformação, em alvenaria. Até 300 kW, com um transformador de 75 a 300 kVA. Proteção por chave fusível tripolar; medição a 3 elementos na média tensão.",
  8: "Blindada Simplificada (SEBS): subestação blindada metálica para uma única unidade, até 300 kW. Medição na média tensão, proteção por chave fusível tripolar e disjuntor de baixa tensão.",
};
function _mostrarSE() {
  return state.grupo === "A";
}
function _seCtx() {
  return {
    solicitacao: state.solicitacao,
    tensao: state.tensaoAtendimento,
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
  const box = $("#seBox");
  if (!box) return;
  const mostrar = _mostrarSE();
  box.style.display = mostrar ? "" : "none";
  const ctx = _seCtx();
  const visiveis = _tiposSEvisiveis();
  // Limpa a seleção quando a seção não se aplica ou o tipo ficou inválido
  // (mesma lógica do useEffect do React).
  if (!mostrar) {
    if (state.tipoSE || state.trafos.some((t) => t.qte || t.potencia)) {
      state.tipoSE = "";
      state.trafos = [gdTrafoPadrao()];
    }
  } else if (
    state.tipoSE &&
    (!gdSEDisponivel(state.tipoSE, ctx).ok || !visiveis.includes(state.tipoSE))
  ) {
    state.tipoSE = "";
  }
  setHint(
    "seBloqueioMsg",
    state.tipoSE ? gdSEDisponivel(state.tipoSE, ctx).msg : "",
  );
  const galeria = $("#seGalleryGD");
  if (galeria && mostrar) {
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
          state.tipoSE = state.tipoSE === tipo ? state.tipoSE : tipo;
          atualizarSE();
        });
      galeria.appendChild(card);
    });
  }
  renderTrafosGD();
}
function renderTrafosGD() {
  const box = $("#trafosBox");
  const tbody = $("#trafoGdBody");
  if (!box || !tbody) return;
  const mostrar = _mostrarSE() && !!state.tipoSE;
  box.style.display = mostrar ? "" : "none";
  if (!mostrar) return;
  const potes = GD_TRAFO_POR_SE[state.tipoSE] || [];
  tbody.innerHTML = "";
  state.trafos.forEach((t, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input type="number" min="0" style="width:70px" value="${t.qte}"></td>
      <td><select>
        <option value=""></option>
        ${potes.map((p) => `<option value="${p}"${String(t.potencia) === String(p) ? " selected" : ""}>${p}</option>`).join("")}
      </select></td>
      <td>${state.trafos.length > 1 ? '<button type="button" class="motor-del">✕</button>' : ""}</td>`;
    tr.querySelector("input").addEventListener("input", (e) => {
      state.trafos[i].qte = e.target.value;
    });
    tr.querySelector("select").addEventListener("change", (e) => {
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

/* --- Solicitação e campos dependentes --- */
function _ehLigacaoNova() {
  return (state.solicitacao || "").indexOf("Nova Unidade") >= 0;
}
function onSolicitacao() {
  _sync("solicitacao");
  const aviso = $("#avisoFormCarga");
  if (aviso)
    aviso.style.display = GD_SOLICITACOES_FORM_CARGA.includes(
      state.solicitacao,
    )
      ? ""
      : "none";
  const nova = _ehLigacaoNova();
  ["#disjAtualBox", "#instExistenteBox", "#instExistenteBTMTBox"].forEach(
    (s) => {
      const el = $(s);
      if (el) el.style.display = nova ? "none" : "";
    },
  );
  const np = $("#novaProtecaoBox");
  if (np)
    np.style.display = GD_SOLICITACOES_AUMENTO_POTENCIA.includes(
      state.solicitacao,
    )
      ? ""
      : "none";
  const pe = $("#potExistenteBox");
  if (pe)
    pe.style.display =
      (state.solicitacao || "").indexOf("GD Existente") >= 0 ? "" : "none";
  const avisoCarga = $("#avisoCargaObrigatoria");
  if (avisoCarga)
    avisoCarga.style.display = GD_SOLICITACOES_FORM_CARGA.includes(
      state.solicitacao,
    )
      ? ""
      : "none";
  atualizarFasesDisj();
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
function atualizarFasesDisj() {
  const sel = $(`select[data-k="disjGeralFase"]`);
  if (!sel) return;
  const semAlteracao =
    state.solicitacao && state.solicitacao.indexOf("SEM Alteração") >= 0;
  const fases = semAlteracao ? GD_DISJ_FASES_ALT : GD_DISJ_FASES;
  const atual = sel.value;
  sel.innerHTML =
    '<option value=""></option>' +
    fases.map((f) => `<option value="${f}">${f}</option>`).join("");
  if (fases.includes(atual)) sel.value = atual;
  else {
    sel.value = state.disjGeralFase = "";
    state.disjGeralA = "";
  }
  onDisjFase(true);
}
function onDisjFase(manterCorrente) {
  _sync("disjGeralFase");
  const selA = $(`select[data-k="disjGeralA"]`);
  if (!selA) return;
  if (!manterCorrente) state.disjGeralA = "";
  const correntes = state.disjGeralFase
    ? GD_DISJ_REVISADA.filter((x) => x.tipo === state.disjGeralFase).map(
        (x) => x.a,
      )
    : [];
  selA.innerHTML =
    '<option value=""></option>' +
    correntes.map((a) => `<option value="${a}">${a}</option>`).join("");
  if (correntes.map(String).includes(String(state.disjGeralA)))
    selA.value = state.disjGeralA;
  onDisjCorrente();
}
function onDisjCorrente() {
  _sync("disjGeralA");
  const limite = gdLimiteInjecao(state.disjGeralFase, state.disjGeralA, false);
  setHint(
    "limiteInjHint",
    limite != null ? `Limite injeção: ${fmt2(limite)} kW` : "",
  );
}
function atualizarTensoes() {
  const sel = $(`select[data-k="tensaoAtendimento"]`);
  if (!sel) return;
  const lista = state.grupo === "A" ? GD_TENSAO_A : GD_TENSAO_B;
  const atual = sel.value;
  sel.innerHTML =
    '<option value=""></option>' +
    lista.map((t) => `<option value="${t}">${t}</option>`).join("");
  if (lista.includes(atual)) sel.value = atual;
  else sel.value = state.tensaoAtendimento = "";
}
// Grupo B ⇔ A: tensões, demanda de consumo (obrigatória só no Grupo A),
// demanda de geração (só Grupo A) e disponibilidade da seção de subestação.
function onGrupo() {
  _sync("grupo");
  atualizarTensoes();
  const ehBT = state.grupo === "B";
  const lbl = $("#demandaConsumoLbl");
  if (lbl)
    lbl.innerHTML =
      "Demanda contratada de consumo (kW)" +
      (ehBT ? "" : ' <span class="req">*</span>');
  const inp = $(`[data-k="demandaConsumo"]`);
  if (inp) {
    if (ehBT) {
      inp.removeAttribute("data-req");
      inp.classList.remove("is-invalid");
    } else inp.setAttribute("data-req", "");
  }
  const hint = $("#demandaConsumoHint");
  if (hint) hint.style.display = ehBT ? "none" : "";
  const dg = $("#demandaGeracaoBox");
  if (dg) dg.style.display = ehBT ? "none" : "";
  atualizarSE();
  if (ilhaCargas) ilhaCargas.atualizar(); // redeMono depende do grupo
  if (window.CemigMarcadores) {
    window.CemigMarcadores.aplicar();
    window.CemigMarcadores.atualizarAvancar();
  }
}

/* ===== Etapa 4/8 — checklists (GD_DOCUMENTOS / GD_DOCS_TEC) ===== */
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

/* ===== Etapa 5 — Formulário de Carga ===== */
function _atividadeCargas() {
  return state.classe === "Residencial" ||
    state.classe === "Industrial" ||
    state.classe === "Comercial"
    ? state.classe
    : "";
}
function initCargas() {
  const box = $("#calcDemandaBox");
  if (!box) return;
  ilhaCargas = montarCalcDemanda(box, {
    data: state.cargas,
    aoMudar: (c) => {
      state.cargas = c;
      atualizarKpisCargas();
    },
    redeMono: () => state.grupo === "B",
    atividade: _atividadeCargas,
    minimizarPorPadrao: false,
    mostrarCargasAdicionais: true,
  });
  atualizarKpisCargas();
}
function atualizarKpisCargas() {
  const c = state.cargas || {};
  const kw = $("#kpiCargaKw"),
    dem = $("#kpiDemanda"),
    disj = $("#kpiDisjuntores");
  if (kw) kw.textContent = fmt2(c._cargaKw || 0);
  if (dem) dem.textContent = fmt2(c._demanda || 0);
  if (disj)
    disj.textContent =
      c._disjuntores && c._disjuntores.length
        ? c._disjuntores.join(" · ")
        : "—";
  const box = $("#disjEscolhidoBox");
  const sel = $(`select[data-k="cargaDisjEscolhido"]`);
  if (box && sel) {
    const lista = c._disjuntores || [];
    box.style.display = lista.length ? "" : "none";
    sel.innerHTML = lista
      .map((d) => `<option value="${d}">${d}</option>`)
      .join("");
    sel.value = lista.includes(state.cargaDisjEscolhido)
      ? state.cargaDisjEscolhido
      : lista[0] || "";
  }
}

/* ===== Etapa 6 — Geração ===== */
function _ehFastTrack() {
  return state.fastTrack === "Sim";
}
function onFonte() {
  _sync("fontePrimaria");
  const ehFV = state.fontePrimaria === "Solar";
  const blocos = $("#fvBlocos");
  if (blocos) blocos.style.display = ehFV ? "" : "none";
  const pot = $(`[data-k="potAtivaInstalada"]`);
  if (pot) pot.disabled = ehFV;
  recalcGeracao();
}
function onTipoGeracao() {
  _sync("tipoGeracao");
  const box = $("#tipoGeracaoOutroBox");
  if (box)
    box.style.display =
      state.tipoGeracao === "Outra (especificar):" ? "" : "none";
}
function onPotAtivaInput(el) {
  if (state.fontePrimaria === "Solar") return; // calculado, campo travado
  onNumDec(el);
  recalcGeracao();
}
function recalcGeracao() {
  const pm =
    ((parseFloat(state.qtdModulos) || 0) *
      (parseFloat(state.potNominalModulo) || 0)) /
    1e3;
  const pi =
    (parseFloat(state.qtdInversores) || 0) *
    (parseFloat(state.potNominalInversor) || 0);
  state.potTotalModulos = pm ? String(pm) : "";
  state.potTotalInversores = pi ? String(pi) : "";
  const dispM = $("#gd_potTotalModulos"),
    dispI = $("#gd_potTotalInversores");
  if (dispM) dispM.value = fmt2(pm);
  if (dispI) dispI.value = fmt2(pi);
  // Regra 6: em FV a Potência Ativa Instalada = MENOR entre módulos e inversores.
  if (state.fontePrimaria === "Solar") {
    const calc = pm > 0 && pi > 0 ? Math.min(pm, pi) : pm || pi || 0;
    state.potAtivaInstalada = calc ? String(calc) : "";
    const inp = $(`[data-k="potAtivaInstalada"]`);
    if (inp) inp.value = state.potAtivaInstalada;
  }
  // Regra 5: Fast Track trava a modalidade em Autoconsumo local e limita 7,5 kW.
  const fast = _ehFastTrack();
  const potUsina = parseFloat(state.potAtivaInstalada) || 0;
  const excede = fast && potUsina > GD_FAST_LIMITE_USINA_KW;
  const aviso = $("#fastExcedeAviso");
  if (aviso) aviso.style.display = excede ? "" : "none";
  const banner = $("#fastBanner");
  if (banner) banner.style.display = fast ? "" : "none";
  const selMod = $(`select[data-k="modalidade"]`);
  if (selMod) {
    if (fast && state.modalidade !== GD_MODALIDADE_AUTOCONSUMO_LOCAL) {
      state.modalidade = GD_MODALIDADE_AUTOCONSUMO_LOCAL;
      selMod.value = state.modalidade;
    }
    selMod.disabled = fast;
  }
  setHint(
    "modalidadeHint",
    fast ? "Travado: Fast Track exige Autoconsumo local." : "",
  );
  const ehFV = state.fontePrimaria === "Solar";
  setHint(
    "potAtivaHint",
    ehFV
      ? "Calculado automaticamente: menor valor entre a potência total de módulos e a de inversores." +
          (excede ? " Valor acima do limite Fast Track." : "")
      : fast
        ? `Fast Track: máximo de ${GD_FAST_LIMITE_kW} kW (${GD_FAST_LIMITE_USINA_KW} kW).` +
          (excede ? " Valor acima do limite permitido." : "")
        : "",
  );
  atualizarSE(); // limite de 300 kVA das SE Nº 1/5/8 depende da potência
}

/* ===== Etapa 7 — Armazenamento ===== */
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

/* ===== Etapa 8 — Declarações (checkboxes booleanos) ===== */
function bindDeclaracoes() {
  $$("[data-decl]").forEach((chk) => {
    const k = chk.dataset.decl;
    chk.checked = !!state[k];
    chk.addEventListener("change", () => {
      state[k] = chk.checked;
    });
  });
}

/* ===== Etapa 9 — Correspondência ===== */
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
  // "" (não "block"): restaura o display:grid do .grid (lição do MT).
  if (end) end.style.display = v === "Endereço novo" ? "" : "none";
  if (global) global.style.display = v === "Conta globalizada" ? "" : "none";
  if (v !== "Conta globalizada") aplicarPatch({ contaGlobal: "" });
}

/* ===== Etapa 10 — validação de exportação + prévia ===== */
// Porte 1:1 do useMemo `validacao` do app React.
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
  req(d.logradouro, "Logradouro");
  req(d.numero, "Número");
  req(d.bairro, "Bairro");
  req(d.municipio, "Município");
  req(d.cep, "CEP");
  req(d.celular, "Celular");
  req(d.email, "E-mail");
  req(d.latitude, "Latitude");
  req(d.longitude, "Longitude");
  const utm = gdValidarUTM(d.fuso, d.utmE, d.utmN);
  if (d.fuso && d.utmE && d.utmN && !utm.ok)
    faltas.push("Coordenada UTM fora da faixa do fuso");
  req(d.solicitacao, "Tipo de Solicitação");
  req(d.edificacao, "Tipo de edificação");
  if (GD_SOLICITACOES_FORM_CARGA.includes(d.solicitacao)) {
    const c = d.cargas || {};
    const temCarga =
      (c.qtds || []).some((q) => (q || 0) > 0) ||
      (c.mots || []).some((m) => (parseInt(m.q) || 0) > 0) ||
      (c.extras || []).some((m) => (parseInt(m.q) || 0) > 0);
    if (!temCarga)
      faltas.push("Formulário de Carga (declarar as cargas elétricas)");
  }
  if (d.grupo !== "B") req(d.demandaConsumo, "Demanda contratada de consumo");
  if (GD_SOLICITACOES_AUMENTO_POTENCIA.includes(d.solicitacao))
    req(d.novaProtecao, "Nova Proteção (Aumento de Potência)");
  req(d.fontePrimaria, "Tipo de Fonte Primária");
  req(d.potAtivaInstalada, "Potência Ativa Instalada Total");
  if ((d.solicitacao || "").indexOf("GD Existente") >= 0)
    req(d.potGeracaoExistente, "Potência de geração já existente");
  req(d.modalidade, "Modalidade de compensação");
  if (
    d.fastTrack === "Sim" &&
    (parseFloat(d.potAtivaInstalada) || 0) > GD_FAST_LIMITE_USINA_KW
  )
    faltas.push(
      `Potência da usina acima do limite Fast Track (${GD_FAST_LIMITE_kW} kW)`,
    );
  if (!d.decl84) faltas.push("Declaração 8.4 (obrigatória)");
  if (!d.decl86) faltas.push("Declaração 8.6 (obrigatória)");
  req(d.vencimento, "Data de vencimento da fatura");
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
  if (d.fastTrack === "Sim")
    req(d.fastRegra, "Regra de enquadramento (Fast Track)");
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
  secoes.push(
    pvSecao(
      "1 — Identificação",
      pvCampo("Instalação", d.instalacao, { step: 1 }) +
        pvCampo("Titular", d.titular, { step: 1 }) +
        pvCampo("Grupo / Classe", `${d.grupo} / ${d.classe}`, { step: 1 }) +
        pvCampo("CPF/CNPJ", d.cpfCnpj, { step: 1 }) +
        pvCampo(
          "Endereço",
          `${d.logradouro}, ${d.numero} ${d.complemento} — ${d.bairro}, ${d.municipio}/${d.estado}`,
          { full: true, step: 1 },
        ) +
        pvCampo("Fast Track / Grid Zero", `${d.fastTrack} / ${d.gridZero}`, {
          step: 1,
        }),
    ),
  );
  secoes.push(
    pvSecao(
      "2 — Dados da UC",
      pvCampo("Coordenadas", `Lat ${d.latitude} · Lon ${d.longitude}`, {
        step: 2,
      }) +
        pvCampo(
          "UTM (calculada)",
          `Fuso ${d.fuso} · E ${d.utmE} · N ${d.utmN}`,
          { step: 2 },
        ) +
        pvCampo("Solicitação", d.solicitacao, { step: 2 }) +
        pvCampo("Edificação", d.edificacao, { step: 2 }) +
        pvCampo(
          "Disjuntor Geral",
          `${d.disjGeralFase || "—"} ${d.disjGeralA || ""}`,
          { step: 2 },
        ) +
        pvCampo(
          "Demanda consumo / geração (kW)",
          `${d.demandaConsumo || "—"} / ${d.demandaGeracao || "—"}`,
          { step: 2 },
        ),
    ),
  );
  secoes.push(
    pvSecao(
      "4 — Geração",
      pvCampo("Fonte", d.fontePrimaria, { step: 5 }) +
        pvCampo("Pot. Ativa Instalada (kW)", d.potAtivaInstalada, {
          step: 5,
        }) +
        pvCampo("Modalidade", d.modalidade, { step: 5 }) +
        (d.fontePrimaria === "Solar"
          ? pvCampo(
              "Módulos / Inversores (kW)",
              `${d.potTotalModulos || "—"} / ${d.potTotalInversores || "—"}`,
              { step: 5 },
            )
          : ""),
    ),
  );
  secoes.push(
    pvSecao(
      "5 — Armazenamento",
      pvCampo("Possui", d.possuiArmazenamento, { step: 6 }),
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
  gerarPdfMicroGD(state);
}

/* ===== Aceite das Orientações (gate do botão Iniciar) ===== */
window.aceiteOrientacoesOk = function () {
  const c = document.getElementById("aceiteOrient");
  return !c || c.checked;
};

/* ===== Init (chamado pelo etapas-loader com o DOM completo) ===== */
window.initFormulario = function () {
  // Banner do modo (Fast Track / Grid Zero)
  const banner = $("#modoBanner");
  if (banner && GD_MODO.modo)
    banner.innerHTML = `<div class="gd-modo-banner"><strong>Modalidade: ${GD_MODO.label}</strong>${GD_MODO.descricao ? `<span>${GD_MODO.descricao}</span>` : ""}</div>`;
  preencherSelects();
  bindInputs();
  inicializarCards();
  bindDeclaracoes();
  renderChecklist("docsChecklist", GD_DOCUMENTOS, "docs");
  renderChecklist("docsTecChecklist", GD_DOCS_TEC, "docsTec");
  initCargas();
  // Estado inicial das condicionais
  onGrupo();
  onSolicitacao();
  onGeradorEmergencia();
  onTelhadoArrendado();
  onFonte();
  onTipoGeracao();
  onArmazenamento();
  onCorrAlternativa();
  onCoordGD();
  mostrarCamposPF(gdEhCpfValido());
  // nis: nº do NIS condicionado (o card dispara change no select oculto)
  const selNis = $(`select[data-k="nis"]`);
  if (selNis) selNis.addEventListener("change", onNisGD);
  const selGrupo = $(`select[data-k="grupo"]`);
  if (selGrupo) selGrupo.addEventListener("change", onGrupo);
  const selClasse = $(`select[data-k="classe"]`);
  if (selClasse)
    selClasse.addEventListener("change", () => {
      if (ilhaCargas) ilhaCargas.atualizar(); // atividade deriva da classe
    });
  const selTensao = $(`select[data-k="tensaoAtendimento"]`);
  if (selTensao) selTensao.addEventListener("change", atualizarSE);
  // Aceite das Orientações reavalia o botão "Iniciar preenchimento".
  const aceite = $("#aceiteOrient");
  if (aceite)
    aceite.addEventListener("change", () => {
      aceiteOrientMarcado = aceite.checked;
      if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
    });
  // stepper clicável — navegação LIVRE (não bloqueia por obrigatórios).
  $$(".vstep").forEach((s, i) =>
    s.addEventListener("click", () => goTo(i, true)),
  );
};
