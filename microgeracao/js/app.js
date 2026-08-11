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

/* ============================================================
   Regra 1/2 — Fast Track (art. 73-A) e Grid Zero
   ------------------------------------------------------------
   Antes eram portas de entrada (cards próprios na homepage +
   ?modo=fasttrack|gridzero) que pré-definiam e TRAVAVAM os campos.
   Agora são campos livres da etapa 2, independentes entre si, e
   as regras derivam do preenchimento:
     - fastTrack="Sim"  → exige a regra de enquadramento (8.5.x),
       trava a modalidade em Autoconsumo local e limita a potência
       da usina a GD_FAST_LIMITE_USINA_KW (7,5 kW).
     - gridZero="Sim"   → informativo (consta no PDF); não deriva
       trava alguma, pois o enquadramento correspondente é
       declarado pelo próprio campo 8.5.1.
   ============================================================ */

/* ===== Estado global ===== */
const state = gdEstadoInicial();
window.state = state; // visível p/ depuração e harnesses (const não vaza p/ window)
let ilhaCargas = null; // ilha do Formulário de Carga (shared/js/carga-bt.js)

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
  { chave: "fastTrack", gridId: "cardsFastTrack", opcoes: SIM_NAO },
  { chave: "gridZero", gridId: "cardsGridZero", opcoes: SIM_NAO },
  // geradorEmergencia foi para a etapa "Dados da geração" e usa <div
  // data-toggle>, como os demais campos daquela etapa — ver montarToggles().
  // localizacao e prontoLigar vivem na etapa 3, que é cópia fiel
  // do BT e usa <div data-toggle> — renderizados por montarToggles().
  { chave: "mudancaLocal", gridId: "cardsMudancaLocal", opcoes: SIM_NAO },
  {
    chave: "telhadoArrendado",
    gridId: "cardsTelhadoArrendado",
    opcoes: SIM_NAO,
  },
  {
    chave: "duasInstalacoesDUB",
    gridId: "cardsDuasInstalacoesDUB",
    opcoes: SIM_NAO,
  },
  {
    chave: "possuiArmazenamento",
    gridId: "cardsPossuiArmazenamento",
    opcoes: SIM_NAO,
  },
  {
    chave: "armOperacaoIlhada",
    gridId: "cardsArmOperacaoIlhada",
    opcoes: SIM_NAO,
  },
  {
    chave: "armChaveDesconexao",
    gridId: "cardsArmChaveDesconexao",
    opcoes: SIM_NAO,
  },
  {
    chave: "armReconexaoAuto",
    gridId: "cardsArmReconexaoAuto",
    opcoes: SIM_NAO,
  },
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
          // `desmarcavel`: campo opcional — clicar no card já ativo limpa a
          // escolha (é o único caminho para desfazer, já que não há card de
          // recusa do tipo "Não informar").
          _cardDispatch(
            select,
            campo.desmarcavel && ativo ? "" : op.valor,
          );
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
  montarToggles();
}

/* ============================================================
   TOGGLES data-toggle — porte literal do BT (bt-core.js). As etapas
   copiadas do BT trazem <div data-toggle="chave"> + <select data-k>
   oculto; este renderizador mantém esse markup funcionando aqui sem
   precisar reescrever o HTML (que deve permanecer cópia fiel).
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

/* ===== Navegação =====
   O índice é POSICIONAL sobre as etapas visíveis, não o sufixo do id: a etapa
   "Dados das unidades" tem uma versão por fluxo (Individual x Coletivo) e a
   escolha acontece no meio do formulário (etapa 5), então QUAL seção ocupa a
   posição 6 muda em tempo de execução — embora a quantidade de etapas e os
   rótulos sejam sempre os mesmos. Ver gdEtapasVisiveis / gdRenumerarEtapas. */

// Etapas que fazem parte do fluxo ativo, na ordem do DOM. As etapas do fluxo
// alheio ficam com [hidden] (gdAplicarFluxoEdificacao) e saem daqui.
function gdEtapasVisiveis() {
  return $$("section.page:not(.page--oculta)").filter((p) => !p.hidden);
}
function gdVstepsVisiveis() {
  return $$(".vstep").filter((s) => !s.hidden);
}
// Posição (0-based) da etapa atualmente exibida dentro do fluxo ativo.
function gdPaginaAtual() {
  return gdEtapasVisiveis().findIndex((p) => p.classList.contains("show"));
}

function goTo(n, livre) {
  const paginas = gdEtapasVisiveis();
  if (n < 0 || n >= paginas.length) return;
  const atualN = gdPaginaAtual();
  const atual = atualN >= 0 ? paginas[atualN] : null;
  if (!livre && n > atualN && atual && window.CemigMarcadores) {
    const r = window.CemigMarcadores.validar(atual);
    if (!r.ok) {
      if (r.primeiro)
        r.primeiro.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
  }
  $$(".page").forEach((p) => p.classList.remove("show"));
  const alvo = paginas[n];
  if (!alvo) return;
  alvo.classList.add("show");
  gdVstepsVisiveis().forEach((s, i) => {
    s.classList.remove("active", "done");
    if (i < n) s.classList.add("done");
    if (i === n) s.classList.add("active");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  // Conteúdo dinâmico detectado por presença (lição do MT), não por índice:
  if (alvo.querySelector("#calcDemandaBox") && ilhaCargas) {
    ilhaCargas.atualizar();
    renderResultadoCargaGD();
  }
  // Leaflet mede o container ao criar o mapa; se a etapa estava oculta, os
  // tiles ficam cortados até um invalidateSize() com a página já visível.
  if (alvo.querySelector("#map")) {
    initMapaObra();
    if (mapaObra) setTimeout(() => mapaObra.invalidateSize(), 60);
  }
  // Etapas do fluxo Coletivo/Agrupamento (js/coletivo.js).
  if (alvo.querySelector("#gdTorreBox") && typeof gdRenderTorre === "function")
    gdRenderTorre();
  if (alvo.querySelector("#gdUcsBox") && typeof gdRenderUcs === "function")
    gdRenderUcs();
  if (alvo.querySelector("#previewContent")) renderPreviewGD();
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}

// Botões Voltar/Avançar dos fragmentos: navegação RELATIVA por data-nav
// ("prev"|"next"), como no BT. Sem isso cada fragmento teria de saber a própria
// posição absoluta — que muda conforme o fluxo (Individual x Coletivo).
document.addEventListener("click", (e) => {
  const b = e.target.closest ? e.target.closest("[data-nav]") : null;
  // aria-disabled: o "Avançar" bloqueado continua clicável (rola até o campo
  // que falta — ver form-marcadores), mas não navega.
  if (!b || b.disabled || b.getAttribute("aria-disabled") === "true") return;
  const atual = gdPaginaAtual();
  if (atual < 0) return;
  goTo(atual + (b.dataset.nav === "next" ? 1 : -1));
});

/* ===== Fluxo por tipo de edificação (Individual x Coletivo/Agrupamento) =====
   Diferente do BT — onde o fluxo vem da URL e as etapas do fluxo alheio são
   REMOVIDAS antes do primeiro paint — aqui a escolha acontece na etapa 5, no
   meio do preenchimento. As etapas dos dois fluxos ficam sempre no DOM e são
   alternadas por [hidden], para que o usuário possa trocar de ideia. */
const gdEhColetivo = () =>
  state.edifTipo === "Edificação Coletiva ou Agrupamento";

// Os CAMPOS de "Dados das unidades" só se aplicam quando:
//   • Tipo de solicitação que MEXE na potência — ligação nova ou conexão de GD
//     com alteração de potência disponibilizada (GD_SOLICITACOES_FORM_CARGA).
//     Sem alterar potência, a carga da UC não muda e não há o que declarar;
//   • Grupo "B" (etapa 3) — no Grupo A a demanda é contratada, não sai do
//     formulário de carga da ND-5.1/5.2;
//   • "Tipo de edificação" preenchido (etapa 5) — define QUAL versão se aplica,
//     a individual (uma UC) ou a coletiva (torre + lista de UCs).
// Quando algo falta, a ETAPA continua no fluxo (número e rótulo fixos — ver
// gdAplicarFluxoEdificacao); só o conteúdo dos dois fragmentos é ocultado.
// Campo oculto sai da validação por _visivel() (shared/js/form-marcadores.js),
// então o "Avançar" não trava numa etapa sem nada a preencher.
const gdEtapaCargaDefinida = () =>
  !!state.edifTipo &&
  state.grupo === "B" &&
  GD_SOLICITACOES_FORM_CARGA.includes(state.solicitacao);

function gdAplicarFluxoEdificacao() {
  const coletivo = gdEhColetivo();
  // A etapa "Dados das unidades" NUNCA sai do fluxo: seu número e seu rótulo
  // têm de ficar estáveis durante todo o preenchimento. Por isso `alvo` sempre
  // aponta para um dos dois fragmentos — quando os campos não se aplicam, é o
  // CONTEÚDO dele que fica oculto (gdAplicarConteudoCarga), não a etapa.
  const alvo = coletivo ? "coletivo" : "individual";
  // Guarda a etapa atual ANTES de ocultar: se ela pertencia ao fluxo que está
  // saindo, o usuário precisa ser reposicionado em alguma etapa válida.
  const exibida = $(".page.show");
  $$("[data-flow]").forEach((el) => {
    el.hidden = el.dataset.flow !== alvo;
  });
  // A etapa exibida acabou de ser ocultada (estava na versão individual de
  // "Dados das unidades" e trocou para Coletivo, ou vice-versa): mostra a
  // versão que entrou, que ocupa exatamente a mesma posição.
  if (exibida && exibida.hidden) {
    exibida.classList.remove("show");
    const entrando = gdEtapasVisiveis().find((p) => p.dataset.flow === alvo);
    if (entrando) entrando.classList.add("show");
  }
  gdAplicarConteudoCarga();
  gdRenumerarEtapas();
  if (coletivo && typeof gdRenderColetivo === "function") gdRenderColetivo();
  if (window.CemigMarcadores) {
    window.CemigMarcadores.aplicar();
    window.CemigMarcadores.atualizarAvancar();
  }
}

// Mostra/oculta o CONTEÚDO de "Dados das unidades" (os dois fragmentos) sem
// mexer na etapa em si — ela permanece na sidebar com número e rótulo fixos.
// Sem aviso no lugar dos campos: o card fica só com o cabeçalho.
function gdAplicarConteudoCarga() {
  const aplica = gdEtapaCargaDefinida();
  $$("[data-carga-conteudo]").forEach((el) => {
    el.hidden = !aplica;
  });
}

// Navega até a etapa que contém o marcador data-etapa="<nome>". Usado pelos
// lápis de edição da prévia. Busca só entre as etapas VISÍVEIS, então
// "unidades" — marcador comum às versões Individual e Coletiva — cai sempre
// na que está ativa.
function gdIrParaAncora(nome) {
  const i = gdEtapasVisiveis().findIndex((p) =>
    p.querySelector(`[data-etapa="${nome}"]`),
  );
  if (i >= 0) goTo(i, true);
}

// Renumera os "Etapa N" dos fragmentos e os números da sidebar pela posição
// real no fluxo ativo. Hoje a sequência é fixa (9 etapas nos dois fluxos), mas
// os fragmentos trazem o número no HTML: isto mantém eyebrow e sidebar
// coerentes com a posição, sem depender do que está escrito em cada arquivo.
function gdRenumerarEtapas() {
  gdEtapasVisiveis().forEach((sec, i) => {
    const eb = $$(".section-eyebrow", sec).find((el) =>
      /^Etapa \d+$/.test(el.textContent.trim()),
    );
    if (eb) eb.textContent = "Etapa " + (i + 1);
  });
  gdVstepsVisiveis().forEach((s, i) => {
    const num = s.querySelector(".vstep-num");
    // Etapas concluídas exibem o check do CSS no lugar do número (.vstep.done);
    // aqui só reescrevemos o número, preservando esse estado.
    if (num && !s.classList.contains("done")) num.textContent = String(i + 1);
  });
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

/* ===== Validação de e-mail e telefone (porte do MT: feedback no blur) ===== */
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

/* ===== Identificação ===== */
function gdEhCpfValido() {
  const r = validarCpfCnpj(state.cpfCnpj);
  return r.tipo === "CPF" && r.valido === true;
}
// Gate de avanço da etapa 2 (espelha btPropDocOk do BT): o documento precisa
// estar COMPLETO e VÁLIDO — não basta o campo obrigatório estar preenchido.
window.gdPropDocOk = () => validarCpfCnpj(state.cpfCnpj).valido === true;
function mostrarCamposPF(pf) {
  $$(".pf-campo").forEach((el) => {
    el.style.display = pf ? "" : "none";
  });
  if (!pf) {
    // Espelha o MT: os campos PF ocultos são zerados, inclusive laudo/NIS —
    // aqui são <select> com opção vazia "—", e não mais cards Sim/Não.
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
  const pfVisivel = gdEhCpfValido();
  if (box) box.style.display = pfVisivel && state.nis === "Sim" ? "" : "none";
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}
// Regra 1: Fast Track = "Sim" revela e exige a regra de enquadramento (8.5.x)
// e propaga as travas da etapa 6 (modalidade + limite de potência da usina).
function onFastTrack() {
  _sync("fastTrack");
  const sim = state.fastTrack === "Sim";
  const box = $("#fastRegraBox");
  if (box) box.style.display = sim ? "" : "none";
  const sel = $(`select[data-k="fastRegra"]`);
  if (sel) {
    if (sim) sel.setAttribute("data-req", "");
    else {
      sel.removeAttribute("data-req");
      sel.classList.remove("is-invalid");
      sel.value = state.fastRegra = "";
    }
  }
  recalcGeracao(); // reavalia trava de modalidade e limite de 7,5 kW
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

/* ===== Selects populados de js/data.js (fonte única das listas) =====
   A lista aceita strings simples OU objetos { valor, texto } — este segundo
   formato existe para casos como GD_SOLICITACOES, em que o rótulo do Figma é
   curto mas o valor gravado é o texto normativo de que as regras dependem. */
function preencherSelect(k, lista, opts) {
  const sel = $(`select[data-k="${k}"]`);
  if (!sel) return;
  const itens = lista.map((o) =>
    typeof o === "object" ? o : { valor: o, texto: o },
  );
  const semVazio = sel.hasAttribute("data-sem-vazio");
  const rotuloVazio = sel.getAttribute("data-vazio-rotulo") || "";
  const atual = sel.value;
  sel.innerHTML =
    (semVazio ? "" : `<option value="">${rotuloVazio}</option>`) +
    itens
      .map((o) => `<option value="${o.valor}">${o.texto}</option>`)
      .join("");
  if (atual && itens.some((o) => o.valor === atual)) sel.value = atual;
}
function preencherSelects() {
  preencherSelect("fastRegra", GD_FAST_REGRAS);
  preencherSelect("grupo", GD_GRUPOS);
  preencherSelect("classe", GD_CLASSES);
  preencherSelect("solicitacao", GD_SOLICITACOES);
  preencherSelect("edificacao", GD_EDIFICACOES);
  preencherSelect("edifTipo", GD_EDIF_TIPO);
  preencherSelect("ramal", GD_RAMAL);
  preencherSelect("mudEstado", GD_UFS);
  preencherSelect("instExistenteBTMT", GD_BT_MT);
  preencherSelect("fontePrimaria", GD_FONTES);
  preencherSelect("tipoGeracao", GD_TIPO_GERACAO);
  preencherSelect("tensaoConexaoInversor", GD_TENSOES_INVERSOR);
  preencherSelect("modalidade", GD_MODALIDADES);
  preencherSelect("decl85Regra", GD_DECL_85);
  atualizarTensoes();
  atualizarFasesDisj();
}

/* ===== Etapa 3 — Dados da UC ===== */
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
/* ===== Etapa 3 — zona, pronto p/ ligar (porte do BT) ===== */
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
// Os avisos "pronto para ligar" (Sim/Não) foram removidos da etapa 3 junto
// com a pergunta; resta sincronizar o estado para o campo na área de espera.
function onProntoLigarGD() {
  _sync("prontoLigar");
}
// Como no BT, o tipo de rede re-renderiza a lista de correntes do disjuntor
// individual atual na etapa "Tipo de atendimento".
function onTipoRedeGD() {
  _sync("tipoRede");
  atualizarDisjAtual();
  atualizarFasesDisj(); // a fase do disjuntor geral deriva do tipo de rede
}
/* ============================================================
   MAPA LEAFLET + RESTRIÇÃO AMBIENTAL — porte do bt-core.js para o
   estado plano do microGD. Depende de Leaflet, Turf e shared/js/geo.js
   (carregados no index.html). O pino é arrastável e o clique no mapa
   define a coordenada; ambos escrevem em latitude/longitude, de onde
   o UTM é derivado por onCoordGD().
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
  if (box) box.style.display = state.telhadoArrendado === "Sim" ? "" : "none";
}

/* ============================================================
   ETAPA 5 — Tipo de atendimento
   ------------------------------------------------------------
   O restante da etapa (ramal, disjuntor, demanda, perguntas
   Sim/Não) só aparece depois que o tipo de edificação é
   escolhido — é a tela inicial do Figma, com apenas os dois
   primeiros campos.
   Qual disjuntor aparece:
     • Edificação Individual            → Disjuntor individual atual
     • Coletiva/Agrupamento             → Disjuntor geral atual
   Em Ligação Nova NÃO existe disjuntor "atual" (a unidade ainda
   não existe): nenhum dos dois é exibido, como no Figma.
   ============================================================ */
function onEdifTipoGD() {
  _sync("edifTipo");
  const bloco = $("#atendimentoBloco");
  if (bloco) bloco.style.display = state.edifTipo ? "" : "none";
  const nova = _ehLigacaoNova();
  const individual = state.edifTipo === "Edificação Individual";
  const verInd = !!state.edifTipo && !nova && individual;
  const verGeral = !!state.edifTipo && !nova && !individual;
  const bInd = $("#disjIndividualBox");
  if (bInd) bInd.style.display = verInd ? "" : "none";
  const bGeral = $("#disjGeralBox");
  if (bGeral) bGeral.style.display = verGeral ? "" : "none";
  // Campo oculto não pode manter valor: em Ligação Nova o disjuntor "atual"
  // não existe, e ao alternar a edificação o disjuntor do outro tipo ficaria
  // preso no estado e sairia no PDF.
  if (!verInd && state.disjAtualA) aplicarPatch({ disjAtualA: "" });
  if (!verGeral && state.disjGeralA) aplicarPatch({ disjGeralA: "" });
  atualizarDisjAtual();
  // Alterna as duas versões de "Dados das unidades": Individual (uma UC,
  // ND-5.1) x Coletivo/Agrupamento (torre + lista de UCs, ND-5.2). Já chama
  // CemigMarcadores.aplicar/atualizarAvancar no fim.
  gdAplicarFluxoEdificacao();
}
// Disjuntor individual atual: correntes da ND-5.1 para a rede que atende o
// local (tipoRede), no mesmo formato "40 A" do disjuntor geral.
function atualizarDisjAtual() {
  const sel = $(`select[data-k="disjAtualA"]`);
  if (!sel) return;
  const fase =
    state.tipoRede === "Monofásica"
      ? "Monopolar"
      : state.tipoRede === "Bifásica"
        ? "Bipolar"
        : "Tripolar";
  const correntes = GD_DISJ_REVISADA.filter((x) => x.tipo === fase).map(
    (x) => x.a,
  );
  const atual = sel.value;
  sel.innerHTML =
    '<option value=""></option>' +
    correntes.map((a) => `<option value="${a}">${a} A</option>`).join("");
  if (correntes.map(String).includes(String(atual))) sel.value = atual;
  else sel.value = state.disjAtualA = "";
}
/* --- Novo local do padrão de entrada (mudancaLocal = "Sim") --- */
function onMudancaLocalGD() {
  _sync("mudancaLocal");
  const bloco = $("#mudancaLocalBloco");
  const mostrar = state.mudancaLocal === "Sim";
  if (bloco) bloco.style.display = mostrar ? "" : "none";
  if (mostrar) {
    // Leaflet mede o container na criação: só dá para instanciar o mapa com o
    // bloco já visível, senão os tiles saem cortados (mesma lição do goTo).
    initMapaPadrao();
    if (mapaPadrao) setTimeout(() => mapaPadrao.invalidateSize(), 60);
  }
  if (window.CemigMarcadores) {
    window.CemigMarcadores.aplicar();
    window.CemigMarcadores.atualizarAvancar();
  }
}
function onCepPadraoGD(el) {
  el.value = mascararCEP(el.value);
  state.mudCep = el.value;
  if (soDigitos(el.value).length === 8) buscarCepPadraoGD(el.value);
}
// ViaCEP direto: criarConsultasExternas().buscarCep escreve nos campos do
// endereço DA UNIDADE (cep/logradouro/…), e aqui o alvo são os campos mud*.
async function buscarCepPadraoGD(cep) {
  const status = $("#mapaPadraoStatus");
  const limpo = soDigitos(cep);
  if (limpo.length !== 8) return;
  if (status) status.textContent = "Buscando endereço…";
  try {
    const r = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    const j = await r.json();
    if (j.erro) {
      if (status) status.textContent = "CEP não encontrado.";
      return;
    }
    if (status) status.textContent = "";
    aplicarPatch({
      mudLogradouro: j.logradouro || state.mudLogradouro,
      mudBairro: j.bairro || state.mudBairro,
      mudMunicipio: j.localidade || state.mudMunicipio,
      mudEstado: j.uf || state.mudEstado,
    });
    onEnderecoPadraoGD();
  } catch (e) {
    if (status) status.textContent = "Não foi possível consultar o CEP.";
  }
}
function onCoordPadraoGD(el) {
  if (el) {
    el.value = el.value.replace(/[^\d.\-]/g, "");
    state[el.dataset.k] = el.value;
  }
  const u = gdUtmDeCoordenadas(state.mudLatitude, state.mudLongitude);
  state.mudFuso = u ? u.fuso : "";
  state.mudUtmE = u ? u.utmE : "";
  state.mudUtmN = u ? u.utmN : "";
  const disp = $("#gd_utm_padrao");
  if (disp) disp.value = u ? `${u.fuso}${u.banda} E:${u.utmE} N:${u.utmN}` : "";
  const lat = parseFloat(String(state.mudLatitude).replace(",", ".")),
    lng = parseFloat(String(state.mudLongitude).replace(",", "."));
  if (isNaN(lat) || isNaN(lng)) return;
  if (_nDig(state.mudLatitude) < 5 || _nDig(state.mudLongitude) < 5) return;
  sincronizarMapaPadrao(lat, lng, !!(el === null));
}
let mapaPadrao = null;
let marcadorPadrao = null;
let _mapaPadraoDebounce = null;
let _gdLastGeoKeyPadrao = "";
let _gdGeoDebouncePadrao = null;
function _aplicarCoordDoMapaPadrao(lat, lng) {
  aplicarPatch({ mudLatitude: String(lat), mudLongitude: String(lng) });
  onCoordPadraoGD(null);
}
function initMapaPadrao() {
  const div = $("#mapPadrao");
  if (!div || !window.L || mapaPadrao) return;
  mapaPadrao = window.L.map(div).setView([-19.9167, -43.9345], 12);
  const ruas = window.L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    { maxZoom: 19, attribution: "© OpenStreetMap" },
  );
  const satelite = window.L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 19, attribution: "" },
  );
  satelite.addTo(mapaPadrao);
  window.L.control.layers({ Satélite: satelite, Ruas: ruas }).addTo(mapaPadrao);
  mapaPadrao.on("click", (e) =>
    _aplicarCoordDoMapaPadrao(e.latlng.lat, e.latlng.lng),
  );
  setTimeout(() => mapaPadrao.invalidateSize(), 200);
  const lat = parseFloat(String(state.mudLatitude).replace(",", ".")),
    lng = parseFloat(String(state.mudLongitude).replace(",", "."));
  if (!isNaN(lat) && !isNaN(lng)) sincronizarMapaPadrao(lat, lng, true);
}
function sincronizarMapaPadrao(lat, lng, imediato) {
  if (isNaN(lat) || isNaN(lng)) return;
  clearTimeout(_mapaPadraoDebounce);
  const atualizar = () => {
    if (!mapaPadrao) return;
    const ll = window.L.latLng(lat, lng);
    if (marcadorPadrao) {
      marcadorPadrao.setLatLng([lat, lng]);
      if (!mapaPadrao.getBounds().contains(ll))
        mapaPadrao.setView(ll, Math.max(mapaPadrao.getZoom(), 17));
    } else {
      marcadorPadrao = window.L.marker([lat, lng], { draggable: true }).addTo(
        mapaPadrao,
      );
      marcadorPadrao.on("dragend", (e) => {
        const p = e.target.getLatLng();
        _aplicarCoordDoMapaPadrao(p.lat, p.lng);
      });
      const zMax = Number.isFinite(mapaPadrao.getMaxZoom())
        ? mapaPadrao.getMaxZoom()
        : 19;
      mapaPadrao.setView(ll, zMax);
    }
    setTimeout(() => mapaPadrao.invalidateSize(), 100);
  };
  if (imediato) atualizar();
  else _mapaPadraoDebounce = setTimeout(atualizar, 600);
}
async function geocodificarEnderecoPadraoGD() {
  const pronto =
    String(state.mudLogradouro || "").trim() &&
    String(state.mudNumero || "").trim() &&
    String(state.mudMunicipio || "").trim();
  if (!pronto) return;
  if (_nDig(state.mudLatitude) >= 5 && _nDig(state.mudLongitude) >= 5) return;
  const key = [
    state.mudLogradouro,
    state.mudNumero,
    state.mudBairro,
    state.mudMunicipio,
    state.mudCep,
  ]
    .join("|")
    .toLowerCase();
  if (_gdLastGeoKeyPadrao === key) return;
  const status = $("#mapaPadraoStatus");
  if (status) status.textContent = "Buscando coordenada…";
  try {
    const r = await geocodificarEnderecoBR({
      logradouro: state.mudLogradouro,
      numero: state.mudNumero,
      bairro: state.mudBairro,
      cidade: state.mudMunicipio,
      uf: state.mudEstado,
      cep: state.mudCep,
    });
    _gdLastGeoKeyPadrao = key;
    if (!r) {
      if (status)
        status.textContent =
          "Endereço não encontrado. Informe a coordenada manualmente.";
      return;
    }
    if (status) status.textContent = "";
    _aplicarCoordDoMapaPadrao(r.lat, r.lon);
  } catch (e) {
    if (status) status.textContent = "Falha ao geocodificar o endereço.";
  }
}
function onEnderecoPadraoGD() {
  clearTimeout(_gdGeoDebouncePadrao);
  _gdGeoDebouncePadrao = setTimeout(geocodificarEnderecoPadraoGD, 800);
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
    aviso.style.display = GD_SOLICITACOES_FORM_CARGA.includes(state.solicitacao)
      ? ""
      : "none";
  const nova = _ehLigacaoNova();
  ["#disjAtualBox", "#instExistenteBox", "#instExistenteBTMTBox"].forEach(
    (s) => {
      const el = $(s);
      if (el) el.style.display = nova ? "none" : "";
    },
  );
  // #instalacaoUCBox (etapa 5): a UC existente só é perguntada quando há uma
  // solicitação escolhida E ela não é ligação nova (numa ligação nova ainda
  // não existe instalação). Sem solicitação, o campo fica fora da tela — como
  // o disjuntor "atual" em onEdifTipoGD().
  const instBox = $("#instalacaoUCBox");
  if (instBox)
    instBox.style.display = state.solicitacao && !nova ? "" : "none";
  // #mudancaLocalBox (etapa 5): mesma lógica da UC existente — numa ligação
  // nova o padrão ainda será construído, então não há local a mudar. Ao
  // ocultar, força "Não" e fecha o bloco de endereço do novo local: sem isso
  // um "Sim" respondido antes de trocar a solicitação sobreviveria escondido
  // e entraria no PDF/prévia.
  const mudBox = $("#mudancaLocalBox");
  if (mudBox) mudBox.style.display = state.solicitacao && !nova ? "" : "none";
  if (nova && state.mudancaLocal === "Sim") {
    // O select oculto é a fonte da verdade — daí escrevê-lo antes de chamar
    // onMudancaLocalGD(), que começa com _sync() lendo dele. A chamada é
    // manual porque data-toggle-onchange só roda no clique do botão; ela
    // fecha #mudancaLocalBloco e reaplica os marcadores.
    const selMud = $('select[data-k="mudancaLocal"]');
    if (selMud) {
      selMud.value = "Não";
      // Redesenha o destaque do toggle (montarToggles escuta "change"),
      // senão o botão "Sim" seguiria marcado quando o campo reaparecer.
      selMud.dispatchEvent(new Event("change", { bubbles: true }));
    }
    state.mudancaLocal = "Não";
    onMudancaLocalGD();
  }
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
  atualizarFasesDisj();
  atualizarSE();
  onEdifTipoGD(); // o disjuntor visível depende de solicitação × edificação
  if (window.CemigMarcadores) {
    window.CemigMarcadores.aplicar();
    window.CemigMarcadores.atualizarAvancar();
  }
}
function onInstExistenteBTMT() {
  _sync("instExistenteBTMT");
  atualizarSE();
}
// Fase do disjuntor (Mono/Bi/Tripolar) derivada do tipo de rede que atende o
// local — a etapa 5 do Figma tem um único select "Disjuntor geral atual", sem
// campo de fase. O select de fase segue existindo (área de não alocados) e,
// quando preenchido, prevalece sobre a derivação.
function _faseDoTipoRede() {
  return state.tipoRede === "Monofásica"
    ? "Monopolar"
    : state.tipoRede === "Bifásica"
      ? "Bipolar"
      : "Tripolar";
}
function atualizarFasesDisj() {
  const sel = $(`select[data-k="disjGeralFase"]`);
  const semAlteracao =
    state.solicitacao && state.solicitacao.indexOf("SEM Alteração") >= 0;
  const fases = semAlteracao ? GD_DISJ_FASES_ALT : GD_DISJ_FASES;
  if (!sel) {
    // Sem o select na tela, a fase é sempre a derivada do tipo de rede.
    state.disjGeralFase = _faseDoTipoRede();
    onDisjFase(true);
    return;
  }
  const atual = sel.value;
  sel.innerHTML =
    '<option value=""></option>' +
    fases.map((f) => `<option value="${f}">${f}</option>`).join("");
  if (fases.includes(atual)) sel.value = atual;
  else {
    sel.value = state.disjGeralFase = "";
    state.disjGeralA = "";
  }
  // Nada escolhido: cai na fase do tipo de rede para que a lista de correntes
  // do "Disjuntor geral atual" (etapa 5) não abra vazia.
  if (!sel.value) state.disjGeralFase = _faseDoTipoRede();
  onDisjFase(true);
}
function onDisjFase(manterCorrente) {
  // _sync só quando o select tem escolha: com ele vazio (ou ausente da tela),
  // a fase é a derivada do tipo de rede, definida por atualizarFasesDisj().
  const selF = $(`select[data-k="disjGeralFase"]`);
  if (selF && selF.value) state.disjGeralFase = selF.value;
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
    correntes.map((a) => `<option value="${a}">${a} A</option>`).join("");
  if (correntes.map(String).includes(String(state.disjGeralA)))
    selA.value = state.disjGeralA;
  onDisjCorrente();
}
function onDisjCorrente() {
  _sync("disjGeralA");
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
  // Demanda contratada (consumo e geração): só o Grupo A contrata demanda —
  // no Grupo B o atendimento é dimensionado pelo disjuntor. Os campos somem
  // da tela em vez de ficarem visíveis e opcionais.
  const dc = $("#demandaConsumoBox");
  if (dc) dc.style.display = ehBT ? "none" : "";
  const lbl = $("#demandaConsumoLbl");
  if (lbl)
    lbl.innerHTML =
      "Demanda de consumo contratada (kW)" +
      (ehBT ? "" : ' <span class="req">*</span>');
  const inp = $(`[data-k="demandaConsumo"]`);
  if (inp) {
    if (ehBT) {
      inp.removeAttribute("data-req");
      inp.classList.remove("is-invalid");
      // Campo oculto não pode manter valor: um kW digitado antes de trocar
      // para o Grupo B continuaria no estado e sairia no PDF.
      if (state.demandaConsumo) aplicarPatch({ demandaConsumo: "" });
    } else inp.setAttribute("data-req", "");
  }
  const dg = $("#demandaGeracaoBox");
  if (dg) dg.style.display = ehBT ? "none" : "";
  atualizarSE();
  if (ilhaCargas) {
    ilhaCargas.atualizar(); // redeMono depende do tipo de rede
    renderResultadoCargaGD();
  }
  // Os campos de carga só valem no Grupo B — ver gdEtapaCargaDefinida(); a
  // etapa em si continua na lista. Já chama CemigMarcadores.aplicar/
  // atualizarAvancar no fim.
  gdAplicarFluxoEdificacao();
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
// Classe da UC (etapa 6): o tipo de carga — e portanto a lista de equipamentos
// — deriva dela, como a "Atividade principal" faz no BT.
function onClasseGD() {
  _sync("classe");
  // Sai do campo depois de escolher, como nos demais selects: o rótulo
  // flutuante volta ao estado neutro em vez de ficar preso em :focus-within
  // enquanto a lista abaixo é remontada.
  const sel = $(`select[data-k="classe"]`);
  if (sel) sel.blur();
  if (ilhaCargas) {
    ilhaCargas.atualizar();
    renderResultadoCargaGD();
  }
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}
// Acordeões da lista de equipamentos (persistem entre re-renders da ilha).
const _accCargas = {};
function initCargas() {
  const box = $("#calcDemandaBox");
  if (!box) return;
  ilhaCargas = montarCargaAcordeao(box, {
    data: state.cargas,
    abertos: _accCargas,
    redeMono: () =>
      state.tipoRede === "Monofásica" || state.tipoRede === "Bifásica",
    atividade: _atividadeCargas,
    // O select de classe fica logo acima: o hint seria redundante.
    hintAtividade: false,
    aoMudar: (c) => {
      state.cargas = c;
      renderResultadoCargaGD();
    },
  });
  renderResultadoCargaGD();
}
// Cards de carga/demanda + escolha do disjuntor (mesmo bloco do BT).
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

/* ===== Etapa 6 — Geração ===== */
function _ehFastTrack() {
  return state.fastTrack === "Sim";
}
// Modalidade de operação (etapa 4): um card único no lugar dos antigos campos
// Fast Track e Grid Zero. Eles continuam existindo no estado — derivados desta
// escolha — porque PDF, prévia e as regras do art. 73-A dependem deles.
function onModoOperacaoGD(el) {
  if (el) state.modoOperacao = el.value;
  state.fastTrack = state.modoOperacao === "Fast Track" ? "Sim" : "Não";
  state.gridZero = state.modoOperacao === "Grid Zero" ? "Sim" : "Não";
  const selFast = $(`select[data-k="fastTrack"]`),
    selGrid = $(`select[data-k="gridZero"]`);
  if (selFast) selFast.value = state.fastTrack;
  if (selGrid) selGrid.value = state.gridZero;
  onFastTrack(); // revela/exige a regra de enquadramento 8.5.x
  recalcGeracao(); // trava de modalidade + limite de 7,5 kW
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}
// Gate de avanço da etapa 4: a modalidade de operação são <input type="radio">
// SEM data-k, então os marcadores (que só enxergam controles bindados) não a
// cobrem. Só é exigida quando o box está visível — ele some fora de FV.
window.gdModoOperacaoOk = () => {
  const box = $("#modoOperacaoBox");
  if (!box || box.offsetParent === null) return true;
  return !!state.modoOperacao;
};
function onFonte() {
  _sync("fontePrimaria");
  const ehFV = state.fontePrimaria === "Solar";
  const blocos = $("#fvBlocos");
  if (blocos) blocos.style.display = ehFV ? "" : "none";
  // A modalidade de operação (Padrão/Fast Track/Grid Zero) é específica de
  // sistemas solares — some junto com os blocos FV.
  const modo = $("#modoOperacaoBox");
  if (modo) modo.style.display = ehFV ? "" : "none";
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
  // Módulos e inversores têm a potência nominal digitada em kW, então o total
  // já sai em kW — sem conversão.
  const pm =
    (parseFloat(state.qtdModulos) || 0) *
    (parseFloat(state.potNominalModulo) || 0);
  const pi =
    (parseFloat(state.qtdInversores) || 0) *
    (parseFloat(state.potNominalInversor) || 0);
  state.potTotalModulos = pm ? String(pm) : "";
  state.potTotalInversores = pi ? String(pi) : "";
  // Os totais são exibidos como texto (não são inputs): "5,76 kW" ou "—".
  const dispM = $("#gd_potTotalModulos"),
    dispI = $("#gd_potTotalInversores");
  const txt = (v) => (v > 0 ? fmt2(v) + " kW" : "—");
  if (dispM) dispM.textContent = txt(pm);
  if (dispI) dispI.textContent = txt(pi);
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
  const selMod = $(`select[data-k="modalidade"]`);
  if (selMod) {
    if (fast && state.modalidade !== GD_MODALIDADE_AUTOCONSUMO_LOCAL) {
      state.modalidade = GD_MODALIDADE_AUTOCONSUMO_LOCAL;
      selMod.value = state.modalidade;
    }
    selMod.disabled = fast;
  }
  const ehFV = state.fontePrimaria === "Solar";
  setHint(
    "potAtivaHint",
    ehFV
      ? excede
        ? "Valor acima do limite Fast Track."
        : ""
      : fast
        ? `Fast Track: máximo de ${GD_FAST_LIMITE_USINA_KW} kW.` +
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
  // Número da instalação: exigido só fora da ligação nova — é quando o campo
  // aparece na etapa 5 (ver #instalacaoUCBox em onSolicitacao()).
  if (!_ehLigacaoNova()) req(d.instalacao, "Número da instalação");
  req(d.titular, "Titular da UC");
  // Classe: fora da tela (área de não alocados), então não é exigida — cobrar
  // um campo que não há como preencher travaria a exportação para sempre.
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
  // Tipo de edificação da etapa 5 (Individual × Coletiva/Agrupamento). O campo
  // `edificacao` (4 opções normativas) segue na área de não alocados e por
  // isso NÃO é exigido aqui — não há como preenchê-lo na tela.
  req(d.edifTipo, "Tipo de edificação");
  req(d.ramal, "Ramal");
  req(d.telhadoArrendado, "Telhado arrendado");
  // Mudança de local: exigida só fora da ligação nova — é quando o campo
  // aparece na etapa 5 (ver #mudancaLocalBox em onSolicitacao()).
  if (!_ehLigacaoNova()) req(d.mudancaLocal, "Mudança de local do padrão");
  if (d.mudancaLocal === "Sim" && !_ehLigacaoNova()) {
    req(d.mudCep, "CEP do novo local do padrão");
    req(d.mudLogradouro, "Endereço do novo local do padrão");
    req(d.mudNumero, "Número do novo local do padrão");
    req(d.mudBairro, "Bairro do novo local do padrão");
    req(d.mudMunicipio, "Município do novo local do padrão");
    req(d.mudLatitude, "Latitude do novo local do padrão");
    req(d.mudLongitude, "Longitude do novo local do padrão");
  }
  if (GD_SOLICITACOES_FORM_CARGA.includes(d.solicitacao)) {
    if (gdEhColetivo()) {
      // Coletivo/Agrupamento: a carga é das UCs do agrupamento (etapa "Dados
      // das unidades"), não do state.cargas de UC única.
      faltas.push(...gdValidarColetivo());
    } else {
      const c = d.cargas || {};
      const temCarga =
        (c.qtds || []).some((q) => (q || 0) > 0) ||
        (c.mots || []).some((m) => (parseInt(m.q) || 0) > 0) ||
        (c.extras || []).some((m) => (parseInt(m.q) || 0) > 0);
      if (!temCarga)
        faltas.push("Formulário de Carga (declarar as cargas elétricas)");
    }
  }
  if (d.grupo !== "B") req(d.demandaConsumo, "Demanda contratada de consumo");
  if (GD_SOLICITACOES_AUMENTO_POTENCIA.includes(d.solicitacao))
    req(d.novaProtecao, "Nova Proteção (Aumento de Potência)");
  req(d.fontePrimaria, "Tipo de Fonte Primária");
  req(d.tipoGeracao, "Tecnologia de geração");
  req(d.potAtivaInstalada, "Potência Ativa Instalada Total");
  if ((d.solicitacao || "").indexOf("GD Existente") >= 0)
    req(d.potGeracaoExistente, "Potência de geração já existente");
  req(d.modalidade, "Modalidade de compensação");
  if (
    d.fastTrack === "Sim" &&
    (parseFloat(d.potAtivaInstalada) || 0) > GD_FAST_LIMITE_USINA_KW
  )
    faltas.push(
      `Potência da usina acima do limite Fast Track (${GD_FAST_LIMITE_USINA_KW} kW)`,
    );
  if (!d.decl84) faltas.push("Declaração 8.4 (obrigatória)");
  if (!d.decl86) faltas.push("Declaração 8.6 (obrigatória)");
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
  if (d.fastTrack === "Sim")
    req(d.fastRegra, "Regra de enquadramento (Fast Track)");
  return { ok: faltas.length === 0, faltas };
}

/* --- Prévia (padrão pvCampo/pvSecao do MT) --- */
// `step` identifica a etapa de destino do lápis por um ANCORA (id de um
// elemento dentro do fragmento), não por índice: a posição das etapas muda
// conforme a edificação (Individual x Coletivo/Agrupamento) — ver gdIrParaAncora.
function pvCampo(label, valor, opts) {
  opts = opts || {};
  const vazio = valor == null || valor === "";
  const lapis =
    opts.step != null
      ? `<button type="button" class="previa-edit" title="Editar" aria-label="Editar ${label}" onclick="gdIrParaAncora('${opts.step}')"></button>`
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
      pvCampo("Instalação", d.instalacao, { step: "atendimento" }) +
        pvCampo("Titular", d.titular, { step: "identificacao" }) +
        pvCampo("Grupo / Classe", `${d.grupo} / ${d.classe}`, {
          step: "identificacao",
        }) +
        pvCampo("CPF/CNPJ", d.cpfCnpj, { step: "identificacao" }) +
        pvCampo(
          "Endereço",
          `${d.logradouro}, ${d.numero} ${d.complemento} — ${d.bairro}, ${d.municipio}/${d.estado}`,
          { full: true, step: "identificacao" },
        ) +
        pvCampo("Fast Track / Grid Zero", `${d.fastTrack} / ${d.gridZero}`, {}),
    ),
  );
  secoes.push(
    pvSecao(
      "2 — Dados da UC",
      pvCampo("Coordenadas", `Lat ${d.latitude} · Lon ${d.longitude}`, {
        step: "dados-uc",
      }) +
        pvCampo(
          "UTM (calculada)",
          `Fuso ${d.fuso} · E ${d.utmE} · N ${d.utmN}`,
          { step: "dados-uc" },
        ) +
        pvCampo(
          "Demanda consumo / geração (kW)",
          `${d.demandaConsumo || "—"} / ${d.demandaGeracao || "—"}`,
          {},
        ),
    ),
  );
  // Etapa 5 — Tipo de atendimento (page-4 no stepper).
  let atend =
    pvCampo("Solicitação", d.solicitacao, { full: true, step: "atendimento" }) +
    pvCampo("Edificação", d.edifTipo, { step: "atendimento" }) +
    pvCampo("Ramal", d.ramal, { step: "atendimento" }) +
    pvCampo(
      d.edifTipo === "Edificação Individual"
        ? "Disjuntor individual atual"
        : "Disjuntor geral atual",
      d.edifTipo === "Edificação Individual" ? d.disjAtualA : d.disjGeralA,
      { step: "atendimento" },
    ) +
    pvCampo("Telhado arrendado", d.telhadoArrendado, { step: "atendimento" });
  // Mudança de local só existe quando há padrão instalado — omitida na
  // ligação nova, como o campo na etapa 5.
  if (!_ehLigacaoNova())
    atend += pvCampo("Mudança de local do padrão", d.mudancaLocal, { step: "atendimento" });
  if (d.mudancaLocal === "Sim" && !_ehLigacaoNova())
    atend +=
      pvCampo(
        "Novo local do padrão",
        [
          [d.mudLogradouro, d.mudNumero].filter(Boolean).join(", "),
          d.mudBairro,
          [d.mudMunicipio, d.mudEstado].filter(Boolean).join("/"),
          d.mudCep ? "CEP " + d.mudCep : "",
        ]
          .filter(Boolean)
          .join(" - "),
        { full: true, step: "atendimento" },
      ) +
      pvCampo(
        "Coordenadas do novo local",
        `Lat ${d.mudLatitude || "—"} · Lon ${d.mudLongitude || "—"}`,
        { full: true, step: "atendimento" },
      );
  secoes.push(pvSecao("5 — Tipo de atendimento", atend));
  secoes.push(
    pvSecao(
      "4 — Geração",
      pvCampo("Fonte", d.fontePrimaria, {}) +
        pvCampo("Pot. Ativa Instalada (kW)", d.potAtivaInstalada, {}) +
        pvCampo("Modalidade", d.modalidade, {}) +
        (d.fontePrimaria === "Solar"
          ? pvCampo(
              "Módulos / Inversores (kW)",
              `${d.potTotalModulos || "—"} / ${d.potTotalInversores || "—"}`,
              {},
            )
          : ""),
    ),
  );
  secoes.push(
    pvSecao(
      "5 — Armazenamento",
      pvCampo("Possui", d.possuiArmazenamento, {}),
    ),
  );
  let cor =
    pvCampo("Como deseja receber a fatura", d.corrAlternativa, { step: "correspondencia" }) +
    pvCampo("Vencimento", d.vencimento, { step: "correspondencia" });
  if (d.corrAlternativa === "E-mail informado")
    cor += pvCampo("E-mail para envio da fatura", d.email, {
      full: true,
      step: "correspondencia",
    });
  if (d.corrAlternativa === "Outro e-mail")
    cor += pvCampo("E-mail para envio da fatura", d.corrOutroEmail, {
      full: true,
      step: "correspondencia",
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
      { full: true, step: "correspondencia" },
    );
  if (d.corrAlternativa === "Conta globalizada")
    cor += pvCampo("Conta globalizada", d.contaGlobal, { step: "correspondencia" });
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
  preencherSelects();
  bindInputs();
  inicializarCards();
  bindDeclaracoes();
  renderChecklist("docsChecklist", GD_DOCUMENTOS, "docs");
  renderChecklist("docsTecChecklist", GD_DOCS_TEC, "docsTec");
  initCargas();
  // Estado inicial das condicionais
  onGrupo();
  onSolicitacao(); // já chama onEdifTipoGD() (disjuntor × edificação)
  onMudancaLocalGD();
  onGeradorEmergencia();
  onTelhadoArrendado();
  onFonte();
  onTipoGeracao();
  onArmazenamento();
  onCorrAlternativa();
  // Modalidade de operação: radios sem data-k — restaura a marcação a partir
  // do estado (prefill/voltar à etapa) e deriva fastTrack/gridZero.
  const radioModo = $(
    `input[name="modoOperacao"][value="${state.modoOperacao}"]`,
  );
  if (radioModo) radioModo.checked = true;
  onModoOperacaoGD();
  onZonaGD();
  onProntoLigarGD();
  initMapaObra();
  onCoordGD();
  onFastTrack();
  mostrarCamposPF(gdEhCpfValido());
  // nis: o próprio <select> da etapa 2 chama onNisGD() no onchange (padrão MT).
  // fastTrack: regra de enquadramento condicionada (card dispara change)
  const selFast = $(`select[data-k="fastTrack"]`);
  if (selFast) selFast.addEventListener("change", onFastTrack);
  const selGrupo = $(`select[data-k="grupo"]`);
  if (selGrupo) selGrupo.addEventListener("change", onGrupo);
  // A classe da UC re-renderiza a lista de cargas pelo onchange do próprio
  // select (onClasseGD), no fragmento da etapa 6.
  const selTensao = $(`select[data-k="tensaoAtendimento"]`);
  if (selTensao) selTensao.addEventListener("change", atualizarSE);
  // Aceite das Orientações reavalia o botão "Avançar".
  const aceite = $("#aceiteOrient");
  if (aceite)
    aceite.addEventListener("change", () => {
      aceiteOrientMarcado = aceite.checked;
      if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
    });
  // stepper clicável — navegação LIVRE (não bloqueia por obrigatórios).
  // A posição é resolvida NO CLIQUE, não na montagem: o fluxo
  // Coletivo/Agrupamento oculta/exibe etapas, então um índice capturado aqui
  // apontaria para a etapa errada depois da primeira troca de edificação.
  $$(".vstep").forEach((s) =>
    s.addEventListener("click", () => {
      const i = gdVstepsVisiveis().indexOf(s);
      if (i >= 0) goTo(i, true);
    }),
  );
};
