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
  // Trava de avanço: valida os obrigatórios visíveis da etapa atual só ao
  // avançar (ou pular adiante). Voltar é livre.
  const _atual = document.querySelector(".page.show");
  const _atualN = _atual ? parseInt(_atual.id.replace("page-", ""), 10) : -1;
  if (n > _atualN && _atual && window.CemigMarcadores) {
    const r = window.CemigMarcadores.validar(_atual);
    if (!r.ok) {
      if (r.primeiro)
        r.primeiro.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
  }
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
    el.classList.remove("is-invalid");
    if (span) {
      span.textContent = "";
      span.className = "field-hint";
    }
    return;
  }
  el.classList.toggle("is-invalid", !valido);
  if (span) {
    span.textContent = valido ? "✓" : msgErr;
    span.className = "field-hint" + (valido ? "" : " field-err");
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
      status.className = "field-hint";
    }
    return;
  }
  if (status) {
    status.textContent = "buscando…";
    status.className = "field-hint";
  }
  try {
    const r = await fetch(`https://viacep.com.br/ws/${limpo}/json/`);
    const d = await r.json();
    if (d.erro) {
      if (status) {
        status.textContent = "CEP não encontrado";
        status.className = "field-hint field-err";
      }
      return;
    }
    _setField("rua", d.logradouro);
    _setField("bairro", d.bairro);
    _setField("cidade", d.localidade);
    _setField("estado", d.uf);
    if (status) {
      status.textContent = "✓";
      status.className = "field-hint";
    }
  } catch (e) {
    if (status) {
      status.textContent = "erro ao buscar CEP";
      status.className = "field-hint field-err";
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

/* ===== Helpers de alerta (banner canônico .cmg-aviso do shared.css) ===== */
function alertHTML(tipo, msg) {
  const mod = tipo === "err" ? " cmg-aviso--error" : tipo === "warn" ? " cmg-aviso--warn" : "";
  return `<div class="cmg-aviso${mod}"><div class="cmg-aviso-icon" aria-hidden="true"></div><div class="cmg-aviso-texto">${msg}</div></div>`;
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
    // A convenção de marcadores (shared/js/form-marcadores.js) converte os
    // antigos <span class="req"> em `data-req` no próprio controle.
    if (!field.querySelector("[data-req]")) return;
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

/* ===== Prévia — padrão Figma do BT (previa-* do shared.css): seções
   tituladas em verde, campos rótulo+valor em grade de 2 colunas e lápis
   que volta à etapa correspondente (mesmo markup dos componentes
   PreviaSecao/PreviaCampo do bt/js/components.js). ===== */
function pvCampo(label, valor, opts) {
  opts = opts || {};
  const vazio = valor == null || valor === "";
  const lapis =
    opts.step != null
      ? `<button type="button" class="previa-edit" title="Editar" aria-label="Editar ${label}" onclick="goTo(${opts.step})"></button>`
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
function fmtData(iso) {
  if (!iso) return "";
  const [a, m, d] = String(iso).split("-");
  return d && m && a ? `${d}/${m}/${a}` : iso;
}
function renderPreview() {
  syncState();
  const secoes = [
    pvSecao(
      "Obra",
      pvCampo("Número da Nota de Serviço", state.numNotaServico, { step: 1 }) +
        pvCampo("Motivo da obra", state.motivoObra, { step: 1 }),
    ),
    pvSecao(
      "Solicitante",
      pvCampo("Nome completo", state.nome, { full: true, step: 2 }) +
        pvCampo("Tipo de pessoa", state.tipoPessoa, { step: 2 }) +
        pvCampo("CPF/CNPJ", state.cpfCnpj, { step: 2 }) +
        pvCampo("RG/RNE/RANI", state.rg, { step: 2 }) +
        pvCampo("Órgão emissor", state.orgaoEmissor, { step: 2 }) +
        pvCampo("Estado emissor", state.ufEmissor, { step: 2 }) +
        pvCampo("Data de expedição", fmtData(state.dataExpedicao), { step: 2 }) +
        pvCampo("Telefone fixo", state.telFixo, { step: 2 }) +
        pvCampo("Telefone celular", state.telCelular, { step: 2 }) +
        pvCampo("E-mail", state.email, { step: 2 }),
    ),
    pvSecao(
      "Endereço do imóvel/obra",
      pvCampo("CEP", state.cep, { step: 3 }) +
        pvCampo("Rua/Av.", state.rua, { step: 3 }) +
        pvCampo("Número", state.numero, { step: 3 }) +
        pvCampo("Complemento", state.complemento, { step: 3 }) +
        pvCampo("Bairro", state.bairro, { step: 3 }) +
        pvCampo("Cidade", state.cidade, { step: 3 }) +
        pvCampo("Estado", state.estado, { step: 3 }),
    ),
  ];
  let banc = pvCampo("Efetuou pagamento prévio à CEMIG?", state.pagamentoPrevio, { step: 4 });
  if (state.pagamentoPrevio === "Sim") {
    banc +=
      pvCampo("Banco", state.banco, { step: 4 }) +
      pvCampo("Agência", state.agencia, { step: 4 }) +
      pvCampo("Conta corrente com dígito", state.contaCorrente, { step: 4 });
  }
  banc += pvCampo("Motivo da desistência", state.motivoDesistencia, { full: true, step: 4 });
  secoes.push(pvSecao("Dados bancários &amp; desistência", banc));
  $("#previewContent").innerHTML = secoes.join(PV_DIVISOR);
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
