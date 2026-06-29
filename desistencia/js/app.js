/* ============================================================
   CARDS DE SELEÇÃO (Termo de Desistência de Obra) — CONFIGURAÇÃO
   ------------------------------------------------------------
   REGRA DE OURO: textos, valores de estado e classes CSS de cada
   card ficam SOMENTE aqui. O motor de renderização (mais abaixo)
   só lê este objeto — para alterar texto/valor de uma opção,
   edite apenas esta constante. Mesmo padrão visual usado em
   mt/js/app.js (cards toggle-group/toggle-btn).
   ============================================================ */
const CAMPOS_CARDS_CONFIG = {
  classes: {
    grid: "toggle-group",
    card: "toggle-btn",
    active: "on",
    destaque: "toggle-btn-destaque",
  },
  campos: [
    {
      chave: "motivoObra",
      gridId: "cardsMotivoObra",
      // Cada opção usa labelShort (texto do botão) e labelFull (texto
      // oficial do PDF): labelFull também é o valor salvo no estado e
      // entra no atributo title do botão, exibido ao passar o mouse.
      opcoes: [
        { labelShort: "Conexão Nova", labelFull: "Conexão Nova com ou sem geração distribuída" },
        { labelShort: "Aumento de Carga", labelFull: "Aumento de carga ou de geração" },
        { labelShort: "Deslocamento de Poste", labelFull: "Deslocamento ou Remoção de Poste/Rede" },
      ],
    },
    {
      chave: "pagamentoPrevio",
      gridId: "cardsPagamentoPrevio",
      opcoes: [
        { valor: "Sim", texto: "Sim" },
        { valor: "Não", texto: "Não" },
      ],
      aoSelecionar: () => onPagamentoPrevio(),
    },
  ],
};

/* ===== Estado global ===== */
const state = {};

/* ===== util ===== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

/* ============================================================
   CARDS DE SELEÇÃO — motor de renderização
   Lê exclusivamente CAMPOS_CARDS_CONFIG. Mantém o <select data-k>
   original oculto como fonte da verdade: o clique no card define
   select.value e dispara input/change, preservando syncState(),
   renderPreview() e camposObrigatoriosFaltando() sem precisar de
   lógica adicional para cada campo.
   ============================================================ */
function _campoCardBotao(texto, titulo, ativo, destaque, onSelecionar) {
  const cls = CAMPOS_CARDS_CONFIG.classes;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("role", "radio");
  btn.setAttribute("aria-checked", ativo ? "true" : "false");
  btn.className = cls.card + (destaque ? " " + cls.destaque : "") + (ativo ? " " + cls.active : "");
  btn.textContent = texto;
  if (titulo) btn.title = titulo;
  btn.addEventListener("click", onSelecionar);
  return btn;
}
function _campoCardDispatch(select, valor) {
  select.value = valor;
  state[select.dataset.k] = valor;
  select.dispatchEvent(new Event("input", { bubbles: true }));
  select.dispatchEvent(new Event("change", { bubbles: true }));
}
function _campoCardsMontar(campo) {
  const select = $(`select[data-k="${campo.chave}"]`);
  const grid = document.getElementById(campo.gridId);
  if (!select || !grid || select.dataset.cardMontado) return;
  select.dataset.cardMontado = "1";
  // Sim/Não (ex.: pagamento prévio) usa o rótulo padrão regular 16px;
  // opções enumeradas (ex.: motivo da obra) recebem bold 14px via
  // .toggle-group--opcoes.
  const ehSimNao =
    campo.opcoes.length === 2 &&
    campo.opcoes.every((op) => (op.valor ?? op.labelFull) === "Sim" || (op.valor ?? op.labelFull) === "Não");
  grid.className = CAMPOS_CARDS_CONFIG.classes.grid + (ehSimNao ? "" : " toggle-group--opcoes");
  grid.setAttribute("role", "radiogroup");
  // Normaliza os dois formatos de opção aceitos: {valor,texto} (genérico)
  // ou {labelShort,labelFull} (ex.: Motivo da Obra — labelFull também
  // aparece no atributo title do botão para exibição em hover).
  const norm = (op) => ({
    valor: op.valor ?? op.labelFull,
    texto: op.texto ?? op.labelShort,
    titulo: op.labelFull ?? null,
  });
  if (campo.valorPadrao && !select.value) _campoCardDispatch(select, campo.valorPadrao);
  const render = () => {
    grid.innerHTML = "";
    campo.opcoes.map(norm).forEach((op) => {
      const ativo = select.value === op.valor;
      grid.appendChild(
        _campoCardBotao(op.texto, op.titulo, ativo, false, () => {
          if (select.disabled) return;
          _campoCardDispatch(select, op.valor);
          render();
          if (campo.aoSelecionar) campo.aoSelecionar();
        }),
      );
    });
  };
  render();
  select.style.display = "none";
  select.setAttribute("aria-hidden", "true");
}
function inicializarCamposCards() {
  CAMPOS_CARDS_CONFIG.campos.forEach(_campoCardsMontar);
}

/* ===== Navegação ===== */
function goTo(n) {
  $$(".page").forEach((p) => p.classList.remove("show"));
  $("#page-" + n).classList.add("show");
  const steps = $$(".vstep");
  steps.forEach((s, i) => {
    s.classList.remove("active", "done");
    if (i < n) s.classList.add("done");
    if (i === n) s.classList.add("active");
  });
  window.scrollTo({ top: 0, behavior: "smooth" });
  if (n === 5) renderPreview();
}

/* ===== Bind genérico de campos (data-k) ===== */
function bindInputs() {
  $$("[data-k]").forEach((el) => {
    const k = el.dataset.k;
    if (state[k] != null && el.value === "") el.value = state[k];
    el.addEventListener("input", () => {
      state[k] = el.value;
    });
    el.addEventListener("change", () => {
      state[k] = el.value;
    });
  });
}
function syncState() {
  $$("[data-k]").forEach((el) => {
    state[el.dataset.k] = el.value;
  });
}

/* ===== Máscaras (CPF/CNPJ, telefone) ===== */
const soDigitos = (v) => String(v || "").replace(/\D/g, "");
function mascararCPF(v) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length > 9) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
  if (d.length > 6) return d.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
  if (d.length > 3) return d.replace(/(\d{3})(\d{1,3})/, "$1.$2");
  return d;
}
function mascararCNPJ(v) {
  const d = soDigitos(v).slice(0, 14);
  if (d.length > 12) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, "$1.$2.$3/$4-$5");
  if (d.length > 8) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, "$1.$2.$3/$4");
  if (d.length > 5) return d.replace(/(\d{2})(\d{3})(\d{1,3})/, "$1.$2.$3");
  if (d.length > 2) return d.replace(/(\d{2})(\d{1,3})/, "$1.$2");
  return d;
}
function mascararFixo(v) {
  const d = soDigitos(v).slice(0, 10);
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length > 0) return `(${d.slice(0)}`;
  return d;
}
function mascararCelular(v) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length > 7) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length > 0) return `(${d.slice(0)}`;
  return d;
}
// Validação híbrida: disparada no blur do campo único de CPF/CNPJ.
// Limpa os caracteres não numéricos e decide o tipo automaticamente
// pela quantidade de dígitos (<=11 → CPF; >11 → CNPJ).
function onCpfCnpj() {
  const el = $('[data-k="cpfCnpj"]');
  if (!el) return;
  const d = soDigitos(el.value);
  if (!d) {
    state.cpfCnpj = "";
    state.tipoPessoa = "";
    return;
  }
  if (d.length <= 11) {
    state.tipoPessoa = "CPF";
    el.value = mascararCPF(d);
  } else {
    state.tipoPessoa = "CNPJ";
    el.value = mascararCNPJ(d);
  }
  state.cpfCnpj = el.value;
}

/* ===== Validação leve de telefone/e-mail (feedback visual) ===== */
function _validarTelefone(v) {
  return soDigitos(v).length >= 10;
}
function _validarEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}
function _feedbackCampo(el, spanId, valido, msgErr) {
  const span = $("#" + spanId);
  if (!el.value) {
    el.classList.remove("invalid");
    if (span) {
      span.textContent = "";
      span.className = "cep-status";
    }
    return;
  }
  el.classList.toggle("invalid", !valido);
  if (span) {
    span.textContent = valido ? "✓" : msgErr;
    span.className = "cep-status" + (valido ? "" : " err");
  }
}
function onTel(k) {
  const el = $(`[data-k="${k}"]`);
  el.value = k === "telFixo" ? mascararFixo(el.value) : mascararCelular(el.value);
  state[k] = el.value;
  _feedbackCampo(el, "status-" + k, _validarTelefone(el.value), "telefone inválido");
}
function onEmail(k) {
  const el = $(`[data-k="${k}"]`);
  _feedbackCampo(el, "status-" + k, _validarEmail(el.value), "e-mail inválido");
}

/* ===== CEP (ViaCEP) ===== */
function _setField(k, v) {
  const el = $(`[data-k="${k}"]`);
  if (!el || !v) return;
  el.value = v;
  el.dispatchEvent(new Event("input", { bubbles: true }));
}
async function onCEP() {
  const el = $('[data-k="cep"]');
  const status = $("#status-cep");
  const limpo = soDigitos(el.value);
  if (limpo.length !== 8) {
    if (status) {
      status.textContent = "";
      status.className = "cep-status";
    }
    return;
  }
  if (status) {
    status.textContent = "buscando…";
    status.className = "cep-status";
  }
  try {
    const r = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    const d = await r.json();
    if (d.erro) {
      if (status) {
        status.textContent = "CEP não encontrado";
        status.className = "cep-status err";
      }
      return;
    }
    _setField("rua", d.logradouro);
    _setField("bairro", d.bairro);
    _setField("cidade", d.localidade);
    _setField("estado", d.uf);
    if (status) {
      status.textContent = "✓";
      status.className = "cep-status";
    }
  } catch (e) {
    if (status) {
      status.textContent = "erro ao buscar CEP";
      status.className = "cep-status err";
    }
  }
}

/* ===== Pagamento prévio / dados bancários ===== */
function onPagamentoPrevio() {
  const sim = state.pagamentoPrevio === "Sim";
  const box = $("#dadosBancariosBox");
  if (box) box.style.display = sim ? "block" : "none";
  if (!sim) {
    ["banco", "agencia", "contaCorrente"].forEach((k) => {
      state[k] = "";
      const el = $(`[data-k="${k}"]`);
      if (el) el.value = "";
    });
  }
}

/* ===== Motivo da desistência (contador de caracteres) ===== */
function onMotivoDesistencia() {
  const el = $('[data-k="motivoDesistencia"]');
  state.motivoDesistencia = el.value;
  const contador = $("#contadorMotivo");
  if (contador) contador.textContent = `${el.value.length}/500 caracteres`;
}

/* ===== Helpers de alerta ===== */
function alertHTML(tipo, msg) {
  const icon =
    tipo === "err"
      ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>'
      : tipo === "warn"
        ? '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>';
  return `<div class="alert ${tipo}">${icon}<div>${msg}</div></div>`;
}

/* ===== Validação de campos obrigatórios (gate de exportação) ===== */
// Considera "irrelevante" um campo dentro de um bloco condicional oculto via
// style.display (ex.: dadosBancariosBox quando pagamentoPrevio é "Não").
function elementoRelevante(el) {
  let node = el;
  while (node && !(node.classList && node.classList.contains("page"))) {
    if (node.style && node.style.display === "none") return false;
    node = node.parentElement;
  }
  return true;
}
function camposObrigatoriosFaltando() {
  syncState();
  const faltando = [];
  $$(".field").forEach((field) => {
    if (!field.querySelector(".req")) return;
    if (!elementoRelevante(field)) return;
    const ctrl = field.querySelector("[data-k]");
    if (!ctrl) return;
    const v = String(state[ctrl.dataset.k] ?? "").trim();
    if (!v) {
      const label = field.querySelector("label");
      faltando.push(label ? label.textContent.replace("*", "").trim() : ctrl.dataset.k);
    }
  });
  // Campos controlados só por cards (sem .field/.req associado a um <select> visível)
  if (!state.motivoObra) faltando.push("Motivo da obra");
  if (!state.pagamentoPrevio) faltando.push("Pagamento prévio à CEMIG");
  return [...new Set(faltando)];
}
function atualizarGateExportacao() {
  const faltando = camposObrigatoriosFaltando();
  const box = $("#exportAlert");
  const mini = $("#exportProgressMini");
  if (box)
    box.innerHTML = faltando.length
      ? alertHTML("err", "Preencha os campos obrigatórios antes de gerar o termo: " + faltando.join(", ") + ".")
      : "";
  if (mini) mini.textContent = faltando.length ? "Faltam campos obrigatórios" : "Pronto para exportar";
  const btn = $("#btnGerarPDF");
  if (btn) btn.disabled = faltando.length > 0;
  return faltando;
}

/* ===== Prévia ===== */
function pvRow(k, v) {
  const empty = v == null || v === "";
  return `<div class="pv-row"><div class="k">${k}</div><div class="v ${empty ? "empty" : ""}">${empty ? "—" : v}</div></div>`;
}
function renderPreview() {
  syncState();
  let h = `<div class="pv-title">TERMO DE DESISTÊNCIA DE OBRA</div><div class="pv-section">`;
  h += `<h4>1. Obra</h4>`;
  h += pvRow("Número da Nota de Serviço", state.numNotaServico) + pvRow("Motivo da obra", state.motivoObra);
  h += `<h4>2. Solicitante</h4>`;
  h += pvRow("Nome completo", state.nome) + pvRow("Tipo de pessoa", state.tipoPessoa) + pvRow("CPF/CNPJ", state.cpfCnpj);
  h += pvRow("RG/RNE/RANI", state.rg) + pvRow("Órgão emissor", state.orgaoEmissor) + pvRow("Estado emissor", state.ufEmissor) + pvRow("Data de expedição", state.dataExpedicao);
  h += pvRow("Telefone fixo", state.telFixo) + pvRow("Telefone celular", state.telCelular) + pvRow("E-mail", state.email);
  h += `<h4>3. Endereço do imóvel/obra</h4>`;
  h += pvRow("CEP", state.cep) + pvRow("Rua/Av.", state.rua) + pvRow("Número", state.numero) + pvRow("Complemento", state.complemento);
  h += pvRow("Bairro", state.bairro) + pvRow("Cidade", state.cidade) + pvRow("Estado", state.estado);
  h += `<h4>4. Dados bancários &amp; desistência</h4>`;
  h += pvRow("Efetuou pagamento prévio à CEMIG?", state.pagamentoPrevio);
  if (state.pagamentoPrevio === "Sim") {
    h += pvRow("Banco", state.banco) + pvRow("Agência", state.agencia) + pvRow("Conta corrente com dígito", state.contaCorrente);
  }
  h += pvRow("Motivo da desistência", state.motivoDesistencia);
  h += "</div>";
  $("#previewContent").innerHTML = h;
  atualizarGateExportacao();
}

/* ============================================================
   GERAÇÃO DO TERMO (impressão / "Salvar como PDF") — folha única A4
   Monta o documento oficial dentro de #documentoImpressao (oculto na
   tela) com o texto jurídico das Notas A, B e C na íntegra, os dados
   preenchidos, a data corrente e a linha de assinatura. O layout de
   impressão (@media print, em desistencia/index.html) força a saída
   em uma única página A4.
   ============================================================ */
function _docKV(label, valor) {
  const vazio = valor == null || valor === "";
  return `<div class="doc-kv"><b>${label}:</b><span>${vazio ? "—" : valor}</span></div>`;
}
function renderDocumentoImpressao() {
  syncState();
  const hoje = new Date();
  const dataExtenso = `${state.cidade || "_______________"}, ${String(hoje.getDate()).padStart(2, "0")} de ${hoje.toLocaleDateString("pt-BR", { month: "long" })} de ${hoje.getFullYear()}.`;

  let h = `<div class="doc-titulo">TERMO DE DESISTÊNCIA DE OBRA</div>`;
  h += `<div class="doc-notas">
    <p>A - O termo deve ser preenchido e assinado pelo solicitante ou representante legal e anexado à nota.</p>
    <p>B - Se assinado pelo representante legal, este deverá apresentar os documentos específicos que comprovem a representação para este fim ou que tenha plenos poderes para representação e também anexar à nota.</p>
    <p class="forte">C - O abaixo assinado solicita a resilição do contrato referente à obra abaixo identificada, declarando estar ciente que deverá realizar o pagamento dos custos já empreendidos para execução desta e que também será ressarcido da diferença, caso tenha efetuado algum pagamento em valores maiores aos custos ora já empreendidos.</p>
  </div>`;

  h += `<div class="doc-sec">1 — DADOS DA OBRA</div>`;
  h += _docKV("Nota de Serviço", state.numNotaServico);
  h += _docKV("Motivo da obra", state.motivoObra);

  h += `<div class="doc-sec">2 — DADOS DO SOLICITANTE</div>`;
  h += _docKV("Nome completo", state.nome);
  h += _docKV(state.tipoPessoa === "CNPJ" ? "CNPJ" : "CPF", state.cpfCnpj);
  h += _docKV("RG/RNE/RANI", [state.rg, state.orgaoEmissor, state.ufEmissor, state.dataExpedicao].filter(Boolean).join(" · "));
  h += _docKV("Telefones", [state.telFixo, state.telCelular].filter(Boolean).join(" / "));
  h += _docKV("E-mail", state.email);

  h += `<div class="doc-sec">3 — ENDEREÇO DO IMÓVEL/OBRA</div>`;
  h += _docKV("Endereço", [state.rua, state.numero, state.complemento].filter(Boolean).join(", "));
  h += _docKV(
    "Bairro/Cidade/UF",
    [state.bairro, state.cidade, state.estado].filter(Boolean).join(" - ") + (state.cep ? ` · CEP ${state.cep}` : ""),
  );

  h += `<div class="doc-sec">4 — DADOS BANCÁRIOS</div>`;
  if (state.pagamentoPrevio === "Sim") {
    h += _docKV("Banco / Agência / Conta", [state.banco, state.agencia, state.contaCorrente].filter(Boolean).join(" / "));
  } else {
    h += _docKV("Pagamento prévio à CEMIG", "Não houve pagamento prévio a ser ressarcido.");
  }

  h += `<div class="doc-sec">5 — MOTIVO DA DESISTÊNCIA</div>`;
  h += `<div class="doc-motivo">${state.motivoDesistencia || "—"}</div>`;

  h += `<div class="doc-fecho">Por ser verdade, firmo o presente termo para todos os fins de direito.<br>${dataExtenso}</div>`;

  h += `<div class="doc-assinatura">
    <div class="linha"></div>
    <div>Assinatura do solicitante ou representante legal</div>
    <div class="obs">Assinatura física ou digital (ex.: Gov.br) são aceitas.</div>
  </div>`;

  $("#documentoImpressao").innerHTML = h;
}
function gerarTermoPDF() {
  if (atualizarGateExportacao().length) {
    goTo(5);
    return;
  }
  renderDocumentoImpressao();
  document.body.classList.add("print-termo");
  window.print();
}
window.addEventListener("afterprint", () => document.body.classList.remove("print-termo"));

document.addEventListener("DOMContentLoaded", () => {
  bindInputs();
  inicializarCamposCards();
  $$(".vstep").forEach((s, i) => s.addEventListener("click", () => goTo(i)));
});
