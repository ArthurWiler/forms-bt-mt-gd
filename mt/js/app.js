/* ============================================================
   CARDS DE SELEÇÃO (caixas robustas, sem ícones) — CONFIGURAÇÃO
   ------------------------------------------------------------
   REGRA DE OURO: textos, valores de estado e classes CSS de
   cada card ficam SOMENTE aqui. O motor de renderização (mais
   abaixo) só lê este objeto — para alterar texto/cor/valor de
   uma opção, edite apenas esta constante.
   ============================================================ */
const CAMPOS_CARDS_CONFIG = {
  // Classes CSS aplicadas pelo motor de renderização (ver css/formulario-mt.css).
  // Reaproveita o mesmo visual dos cards Sim/Não do formulário BT.
  classes: {
    grid: "toggle-group",
    card: "toggle-btn",
    active: "on",
    destaque: "toggle-btn-destaque",
  },
  // Campos com seleção simples (1 <select data-k> por campo).
  // gridId: id do container (já existente no HTML) onde os cards entram.
  campos: [
    {
      chave: "modalidadeObra",
      gridId: "cardsModalidadeObra",
      valorPadrao: "CEMIG",
      opcoes: [
        { valor: "CEMIG", texto: "CEMIG" },
        { valor: "PART", texto: "PART" },
      ],
    },
    {
      // Recebe a fatura no e-mail informado? (mesma lógica do BT). Só quando
      // "Não" é que aparece "Como deseja receber a fatura?" e a conta
      // globalizada. O onchange="onReceberEmail()" (HTML) mostra/esconde o bloco.
      chave: "receberEmail",
      gridId: "cardsReceberEmail",
      valorPadrao: "Sim",
      opcoes: [
        { valor: "Sim", texto: "Sim" },
        { valor: "Não", texto: "Não" },
      ],
    },
    {
      chave: "formaCorresp",
      gridId: "cardsFormaCorresp",
      opcoes: [
        { valor: "Novo endereço", texto: "Novo endereço" },
        { valor: "Endereço da obra", texto: "Endereço da obra" },
        { valor: "Outro e-mail", texto: "Outro e-mail" },
        {
          valor: "Agência Correios(Caixa Postal)",
          texto: "Agência dos Correios (Caixa Postal)",
        },
      ],
    },
    {
      // Zona de localização — como no BT, inicia em "Urbana" (o bloco de
      // endereço correspondente já aparece preenchível desde o início).
      chave: "localizacao",
      gridId: "cardsLocalizacao",
      valorPadrao: "Urbana",
      opcoes: [
        { valor: "Urbana", texto: "Urbana" },
        { valor: "Rural", texto: "Rural" },
      ],
    },
    {
      chave: "tensaoMT",
      gridId: "cardsTensaoMT",
      valorPadrao: "13.8",
      opcoes: [
        { valor: "13.8", texto: "13,8 kV" },
        { valor: "22", texto: "22 kV" },
        { valor: "34.5", texto: "34,5 kV" },
      ],
    },
    {
      chave: "modalidade",
      gridId: "cardsModalidade",
      valorPadrao: "Verde",
      opcoes: [
        { valor: "Verde", texto: "Verde" },
        { valor: "Azul", texto: "Azul" },
      ],
    },
    {
      // Conta globalizada (poder público) — replica a lógica do BT: só pede o
      // número quando "Sim". O clique no card dispara 'change' no <select>,
      // cujo onchange="onContaGlobal()" (no HTML) mostra/esconde o número.
      chave: "possuiContaGlobal",
      gridId: "cardsPossuiContaGlobal",
      opcoes: [
        { valor: "Sim", texto: "Sim" },
        { valor: "Não", texto: "Não" },
      ],
    },
  ],
  // Campo especial "Dia do vencimento": substitui a antiga pergunta
  // "Deseja escolher data de vencimento?" — escolher um dia define
  // desejaVenc='Sim'; o card de destaque "Não informar" define
  // desejaVenc='Não' e limpa o dia.
  diaVencimento: {
    chaveDia: "diaVenc",
    chaveDecisao: "desejaVenc",
    gridId: "cardsDiaVenc",
    dias: [
      { valor: "1", texto: "01" },
      { valor: "6", texto: "06" },
      { valor: "11", texto: "11" },
      { valor: "17", texto: "17" },
      { valor: "22", texto: "22" },
      { valor: "27", texto: "27" },
    ],
    naoInformar: { texto: "Não informar" },
  },
  // Dispositivo auxiliar de partida (Análise de Partida de Motores).
  // labelShort é o texto do botão (e o valor salvo); labelFull entra no
  // atributo title, exibindo a descrição completa ao passar o mouse.
  dispositivosPartida: [
    {
      labelShort: "Chave Estrela-Triângulo",
      labelFull:
        "Chave de partida estrela-triângulo (Y-Δ): reduz a tensão nos terminais do motor durante a partida.",
    },
    {
      labelShort: "Chave Compensadora",
      labelFull:
        "Chave compensadora (autotransformador de partida): reduz a tensão de partida por meio de taps percentuais ajustáveis.",
    },
    {
      labelShort: "Soft-Starter",
      labelFull:
        "Soft-starter: dispositivo eletrônico que controla a rampa de tensão na partida do motor.",
    },
    {
      labelShort: "Inversor de Frequência",
      labelFull:
        "Inversor de frequência: controla a partida e a velocidade do motor variando frequência e tensão.",
    },
  ],
};

/* ===== Estado global ===== */
const state = {};
let trafos = []; // {potencia, quantidade, relacao}
let motores = []; // {tipo, cv, fp, rend, volts, ipIn, tempo, dispositivo}
let cubiculos = []; // Anexo I — cubículos adicionais da subestação compartilhada
// {instalacao, trafos:[{potencia,quantidade,relacao}], modalidade, demanda, demandaPonta, demandaForaPonta}
let ramalSelecionado = null;
let mapaObra = null; // instância Leaflet (lazy, criada ao entrar na Etapa 3)
let marcadorObra = null; // pino arrastável sincronizado com state.latitude/longitude
let restricaoLayer = null; // contorno das reservas ambientais desenhado no mapa
let _mapaObraDebounce = null;

/* ATIVIDADES e DISPOSITIVOS agora em dados.js */

/* ===== util ===== */
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];
const fmt = (n, d = 2) =>
  n == null || isNaN(n)
    ? "—"
    : Number(n).toLocaleString("pt-BR", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      });

/* ============================================================
   CARDS DE SELEÇÃO — motor de renderização
   Lê exclusivamente CAMPOS_CARDS_CONFIG (topo do arquivo). Mantém
   o <select data-k> original oculto como fonte da verdade: o
   clique no card define select.value e dispara input/change,
   preservando syncState(), renderPreview(), camposObrigatoriosFaltando()
   e toda a reatividade nativa (onCorresp, onLocalizacao, onModalidade...)
   sem precisar alterá-las.
   ============================================================ */
function _campoCardBotao(texto, titulo, ativo, destaque, onSelecionar) {
  const cls = CAMPOS_CARDS_CONFIG.classes;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.setAttribute("role", "radio");
  btn.setAttribute("aria-checked", ativo ? "true" : "false");
  btn.className =
    cls.card +
    (destaque ? " " + cls.destaque : "") +
    (ativo ? " " + cls.active : "");
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
  grid.className = CAMPOS_CARDS_CONFIG.classes.grid + " toggle-group--opcoes";
  grid.setAttribute("role", "radiogroup");
  // Normaliza os dois formatos de opção aceitos: {valor,texto} (genérico)
  // ou {labelShort,labelFull} — labelFull também vira o atributo title do
  // botão, exibindo a descrição completa ao passar o mouse (hover).
  const norm = (op) => ({
    valor: op.valor ?? op.labelFull ?? op.labelShort,
    texto: op.texto ?? op.labelShort,
    titulo: op.labelFull ?? null,
  });
  if (campo.valorPadrao && !select.value)
    _campoCardDispatch(select, campo.valorPadrao);
  const render = () => {
    grid.innerHTML = "";
    campo.opcoes.map(norm).forEach((op) => {
      const ativo = select.value === op.valor;
      grid.appendChild(
        _campoCardBotao(op.texto, op.titulo, ativo, false, () => {
          if (select.disabled) return;
          _campoCardDispatch(select, op.valor);
          render();
        }),
      );
    });
  };
  render();
  select.style.display = "none";
  select.setAttribute("aria-hidden", "true");
}
function _diaVencimentoMontar() {
  const cfg = CAMPOS_CARDS_CONFIG.diaVencimento;
  const selDia = $(`select[data-k="${cfg.chaveDia}"]`);
  const selDecisao = $(`select[data-k="${cfg.chaveDecisao}"]`);
  const grid = document.getElementById(cfg.gridId);
  if (!selDia || !selDecisao || !grid || selDia.dataset.cardMontado) return;
  selDia.dataset.cardMontado = "1";
  grid.className = CAMPOS_CARDS_CONFIG.classes.grid + " toggle-group--opcoes";
  grid.setAttribute("role", "radiogroup");
  const aplicar = (diaValor, decisaoValor) => {
    _campoCardDispatch(selDia, diaValor);
    _campoCardDispatch(selDecisao, decisaoValor);
    render();
  };
  const render = () => {
    grid.innerHTML = "";
    cfg.dias.forEach((d) => {
      const ativo = selDecisao.value === "Sim" && selDia.value === d.valor;
      grid.appendChild(
        _campoCardBotao(d.texto, null, ativo, false, () =>
          aplicar(d.valor, "Sim"),
        ),
      );
    });
    const ativoNao = selDecisao.value === "Não";
    grid.appendChild(
      _campoCardBotao(cfg.naoInformar.texto, null, ativoNao, true, () =>
        aplicar("", "Não"),
      ),
    );
  };
  render();
  selDia.style.display = "none";
  selDia.setAttribute("aria-hidden", "true");
  selDecisao.style.display = "none";
  selDecisao.setAttribute("aria-hidden", "true");
}
function inicializarCamposCards() {
  CAMPOS_CARDS_CONFIG.campos.forEach(_campoCardsMontar);
  _diaVencimentoMontar();
}

/* ===== Navegação ===== */
function goTo(n, livre) {
  // Navegação pela sidebar é LIVRE (livre=true). O avanço pelo botão só ocorre
  // quando ele está habilitado (obrigatórios ok), então a validação aqui é
  // só uma rede de segurança para o clique do botão. Voltar é sempre livre.
  const _atual = document.querySelector(".page.show");
  const _atualN = _atual ? parseInt(_atual.id.replace("page-", ""), 10) : -1;
  if (!livre && n > _atualN && _atual && window.CemigMarcadores) {
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
  // O mapa inicializa quando a página que o CONTÉM é exibida (detecção por
  // #map, não por número fixo — o campo já mudou de etapa mais de uma vez).
  // Leaflet não dimensiona em container display:none, daí o invalidateSize.
  if ($("#page-" + n).querySelector("#map")) {
    initMapaObra();
    renderRestricaoAmbiental();
    if (mapaObra) setTimeout(() => mapaObra.invalidateSize(), 50);
  }
  if (n === 5) renderPreview();
  // Recalcula o estado (habilitado/desabilitado) do botão Avançar da nova etapa.
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}

// Alguns rótulos são injetados dinamicamente com "<span class=req>*</span>"
// (finalidade, coordenadas, demandas, subestação). Depois de mexer neles,
// reaplicamos a convenção de marcadores para que o "*" vire data-req / rótulo
// "(opcional)" — do contrário o asterisco cru fica visível para o usuário.
function reaplicarMarcadores() {
  if (window.CemigMarcadores) window.CemigMarcadores.aplicar();
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

/* ===== Etapa 1: finalidade ===== */
function onFinalidade() {
  const v = $("#f_finalidade").value;
  state.finalidade = v;
  const box = $("#instalBox"),
    lbl = $("#instalLabel");
  if (v && v !== "Conexão Nova") {
    // "" (não "block"): #instalBox agora é um .field padrão dentro do grid —
    // restaura o display da folha de estilo.
    box.style.display = "";
    const map = {
      "Aumento de Demanda":
        "Para Aumento de Demanda, informe o número da instalação",
      "Redução de Demanda":
        "Para Redução de Demanda, informe o número da instalação",
      "Adequação de Subestação":
        "Para Adequação de Subestação, informe o número da instalação",
      "Aderir a Tarifa Monômia":
        "Para Aderir a Tarifa Monômia, informe o número da instalação",
      "Religação de Subestação":
        "Para Religação de Subestação, informe o número da instalação",
      "Desconexão para encerramento contratual":
        "Para Desconexão, informe o número da instalação",
      "Alteração da tensão de fornecimento BT→MT":
        "Para Alteração da tensão, informe o número da instalação",
    };
    lbl.innerHTML =
      (map[v] ||
        "Para Migração Mercado livre, informe o número da instalação") +
      ' <span class="req">*</span>';
  } else box.style.display = "none";
  // mostra bloco conexão nova ou alteração na etapa técnica
  const ehNova = v === "Conexão Nova";
  $("#blocoConexaoNova").style.display = ehNova ? "block" : "none";
  $("#blocoAlteracao").style.display = v && !ehNova ? "block" : "none";
  updateCoordHint();
  updateDemandaLabels();
  recalcTecnico();
  if (state.compartilhada === "Sim") renderCubiculos();
}

/* ===== Etapa 2: CPF/CNPJ, vencimento, correspondência ===== */
// Máscaras CPF/CNPJ (validação híbrida no blur — ver onCpfCnpj)
function mascararCPF(v) {
  const d = String(v || "")
    .replace(/\D/g, "")
    .slice(0, 11);
  if (d.length > 9)
    return d.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
  if (d.length > 6) return d.replace(/(\d{3})(\d{3})(\d{1,3})/, "$1.$2.$3");
  if (d.length > 3) return d.replace(/(\d{3})(\d{1,3})/, "$1.$2");
  return d;
}
function mascararCNPJ(v) {
  const d = String(v || "")
    .replace(/\D/g, "")
    .slice(0, 14);
  if (d.length > 12)
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{1,2})/, "$1.$2.$3/$4-$5");
  if (d.length > 8)
    return d.replace(/(\d{2})(\d{3})(\d{3})(\d{1,4})/, "$1.$2.$3/$4");
  if (d.length > 5) return d.replace(/(\d{2})(\d{3})(\d{1,3})/, "$1.$2.$3");
  if (d.length > 2) return d.replace(/(\d{2})(\d{1,3})/, "$1.$2");
  return d;
}
// Máscaras de contato/RG/CEP em tempo real — mesmas do BT (bt/js/calc.js).
function mascararCelular(v) {
  const d = CalculoMT.soDigitos(v).slice(0, 11);
  if (d.length > 7) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length > 0) return `(${d}`;
  return d;
}
function mascararFixo(v) {
  const d = CalculoMT.soDigitos(v).slice(0, 10);
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length > 0) return `(${d}`;
  return d;
}
// Genérica: fixo ou celular conforme o nº de dígitos (campos "Telefone do
// cliente/solicitante" aceitam ambos — ver _validarTelefone).
function mascararTelefone(v) {
  return CalculoMT.soDigitos(v).length > 10
    ? mascararCelular(v)
    : mascararFixo(v);
}
function mascararRG(v) {
  const d = String(v || "")
    .replace(/[^0-9A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 9);
  if (d.length > 8)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8)}`;
  if (d.length > 5) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length > 2) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return d;
}
function mascararCEP(v) {
  const d = CalculoMT.soDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}
// oninput dos telefones: aplica a máscara enquanto digita (como no BT); a
// validação de DDD/tamanho continua no blur (onTel).
function onTelInput(el, tipo) {
  el.value =
    tipo === "celular"
      ? mascararCelular(el.value)
      : tipo === "fixo"
        ? mascararFixo(el.value)
        : mascararTelefone(el.value);
  state[el.dataset.k] = el.value;
}
function onRgInput(el) {
  el.value = mascararRG(el.value);
  state.rg = el.value;
}
// Validação híbrida: disparada a cada digitação no campo único de CPF/CNPJ
// (como no BT — máscara e validação em tempo real; erro só quando o
// documento está COMPLETO e inválido).
// Limpa os caracteres não numéricos e decide o tipo automaticamente
// pela quantidade de dígitos (<=11 → CPF; >11 → CNPJ).
// Mostra/oculta os campos de Pessoa Física (Filiação, RG, Nascimento, Laudo,
// NIS) — visíveis SÓ quando o documento é um CPF COMPLETO e VÁLIDO (igual ao
// BT). Ao ocultar, limpa os valores p/ não travar a validação de obrigatórios.
function mostrarCamposPF(pf) {
  $$(".pf-campo").forEach((el) => {
    el.style.display = pf ? "" : "none";
  });
  if (!pf) {
    ["filiacao", "rg", "nasc", "laudoMedico", "nis", "numNis"].forEach((k) => {
      const c = $(`[data-k="${k}"]`);
      if (c) {
        c.value = "";
        state[k] = "";
      }
    });
    const nb = $("#numNisBoxMT");
    if (nb) nb.style.display = "none";
  } else {
    onNisMT();
  }
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}
// Número do NIS só quando "Possui NIS" = Sim.
function onNisMT() {
  const nis = $('[data-k="nis"]');
  const box = $("#numNisBoxMT");
  const pfVisivel = $(".pf-campo") && $(".pf-campo").style.display !== "none";
  if (box)
    box.style.display = pfVisivel && nis && nis.value === "Sim" ? "" : "none";
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}
let _cnpjBuscado = ""; // evita repetir a consulta a cada tecla após 14 dígitos
async function onCpfCnpj() {
  const el = $("#f_cpfcnpj"),
    msg = $("#cpfMsg");
  const d = CalculoMT.soDigitos(el.value);
  if (!d) {
    state.cpfCnpj = "";
    el.classList.remove("is-invalid");
    msg.textContent = "";
    msg.className = "field-hint";
    mostrarCamposPF(false);
    _cnpjBuscado = "";
    return;
  }
  const tipo = d.length <= 11 ? "CPF" : "CNPJ";
  el.value = tipo === "CPF" ? mascararCPF(d) : mascararCNPJ(d);
  state.cpfCnpj = el.value;
  // A máscara limita a 14 dígitos — valida o que ficou no campo (digitar um
  // 15º dígito não pode "desvalidar" um CNPJ completo).
  const dv = CalculoMT.soDigitos(el.value);
  // Documento incompleto: neutro, sem erro (BT: docInfo.valido === null).
  const completo = tipo === "CPF" ? dv.length === 11 : dv.length === 14;
  if (!completo) {
    el.classList.remove("is-invalid");
    msg.textContent = "";
    msg.className = "field-hint";
    mostrarCamposPF(false);
    _cnpjBuscado = "";
    return;
  }
  const valido =
    tipo === "CPF" ? CalculoMT.validarCPF(dv) : CalculoMT.validarCNPJ(dv);
  if (!valido) {
    // O listener global de form-marcadores.js limpa .is-invalid de controles
    // data-req a cada input (roda DEPOIS deste handler); reaplica num
    // microtask para a marcação de documento inválido prevalecer.
    queueMicrotask(() => el.classList.add("is-invalid"));
    msg.textContent = tipo + " inválido";
    msg.className = "field-hint field-err";
    mostrarCamposPF(false);
    _cnpjBuscado = "";
    return;
  }
  el.classList.remove("is-invalid");
  // Campos de PF só p/ CPF válido; CNPJ não exibe (pessoa jurídica).
  mostrarCamposPF(tipo === "CPF");
  if (tipo === "CPF") {
    msg.textContent = "CPF válido ✓";
    msg.className = "field-hint field-ok";
    return;
  }
  // CNPJ completo e válido → consulta automática (BT: buscarCNPJ) preenchendo
  // a identidade do titular: razão social, e-mail e telefone (se vazio).
  if (_cnpjBuscado === dv) return;
  _cnpjBuscado = dv;
  msg.textContent = "buscando…";
  msg.className = "field-hint";
  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${dv}`);
    if (!res.ok) {
      msg.textContent = "CNPJ não encontrado";
      msg.className = "field-hint field-err";
      return;
    }
    const dd = await res.json();
    if (dd.razao_social || dd.nome_fantasia)
      _setField("nome", dd.razao_social || dd.nome_fantasia);
    if (dd.email) _setField("emailCliente", dd.email);
    const tel = $('[data-k="telCliente"]');
    if (dd.ddd_telefone_1 && tel && !tel.value)
      _setField("telCliente", mascararTelefone(dd.ddd_telefone_1));
    msg.textContent = "dados preenchidos";
    msg.className = "field-hint field-ok";
  } catch (_) {
    _cnpjBuscado = "";
    msg.textContent = "CNPJ não encontrado";
    msg.className = "field-hint field-err";
  }
}
// "Deseja receber a fatura no e-mail informado?" (mesma lógica do BT): só quando
// "Não" é que se pergunta COMO receber a fatura + conta globalizada. Ao voltar
// para "Sim", limpa a escolha alternativa para não vazar dados obsoletos.
function onReceberEmail() {
  const sel = $('select[data-k="receberEmail"]');
  const v = sel ? sel.value : "";
  state.receberEmail = v;
  const box = $("#correspNaoEmailBox");
  const mostrar = v === "Não";
  if (box) box.style.display = mostrar ? "" : "none";
  if (!mostrar) {
    state.formaCorresp = "";
    const fc = $('select[data-k="formaCorresp"]');
    if (fc) {
      fc.value = "";
      fc.dispatchEvent(new Event("change"));
    }
  }
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}
// Como deseja receber a fatura? (visível só quando NÃO recebe no e-mail):
//  - Novo endereço / Agência Correios → endereço de correspondência (ec_*)
//  - Endereço da obra → usa o endereço da UC (aviso, sem campos próprios)
//  - Outro e-mail → e-mail alternativo
function onCorresp() {
  const sel = $('select[data-k="formaCorresp"]');
  const v = sel ? sel.value : "";
  state.formaCorresp = v;
  const ehEndereco =
    v === "Novo endereço" || v === "Agência Correios(Caixa Postal)";
  $("#correspEmailBox").style.display = v === "Outro e-mail" ? "" : "none";
  // "" (não "block") restaura o display:grid do .grid grid-2 (shared.css) — um
  // "block" inline sobrescreveria a grade e empilharia os campos em 1 coluna.
  $("#endCorrespBox").style.display = ehEndereco ? "" : "none";
  const obra = $("#correspObraBox");
  if (obra) obra.style.display = v === "Endereço da obra" ? "" : "none";
}
// Conta globalizada (poder público): só pede o número quando "Sim" (lógica do
// BT). Ao esconder, limpa o número para não vazar valor obsoleto no PDF.
function onContaGlobal() {
  const sel = $('select[data-k="possuiContaGlobal"]');
  const v = sel ? sel.value : "";
  state.possuiContaGlobal = v;
  const box = $("#contaGlobalBox");
  const mostrar = v === "Sim";
  if (box) box.style.display = mostrar ? "" : "none";
  if (!mostrar) {
    state.contaGlobalizada = "";
    const inp = $('input[data-k="contaGlobalizada"]');
    if (inp) inp.value = "";
  }
}

/* ===== Etapa 3: atividade, localização, coordenadas, ambiental ===== */
function fillAtividades() {
  const s = $("#f_atividade");
  ATIVIDADES.forEach((a) => {
    const o = document.createElement("option");
    o.textContent = a;
    s.appendChild(o);
  });
}
// Detecta atividades de irrigação (e variantes, ex.: "Irrigação Noturna",
// "Agropecuária Rural Irrigação") para disparar os campos da Solicitação
// de Desconto para Irrigante/Aquicultor.
function ehAtividadeIrrigacao() {
  return /irriga[cç][aã]o/i.test(state.atividade || "");
}
function onAtividade() {
  const v = $("#f_atividade").value;
  state.atividade = v;
  const box = $("#irrigacaoAlert");
  const r = CalculoMT.alertaIrrigacao(v);
  box.innerHTML = r.nivel === "alerta" ? alertHTML("warn", r.msg) : "";
  if (!ehAtividadeIrrigacao()) {
    // Atividade deixou de ser irrigação: limpa silenciosamente os dados
    // do bloco opcional (Aba 5) para não deixar dados fantasmas em
    // background numa solicitação que não precisa mais deles.
    state.irrigacaoHorarioInicio = "";
    motores.forEach((m) => {
      delete m.destinadoIrrigacao;
    });
  }
  renderMotores();
  recalcRamal();
}
// Máscara/validação no blur do campo opcional "Horário para Início do
// Desconto" (card da Aba 5): aceita digitação livre (ex.: "2130",
// "21h30") e normaliza para HH:MM; marca o input como inválido só
// visualmente (campo é opcional e nunca bloqueia a exportação).
function onIrrigacaoHorarioBlur(input) {
  let v = String(input.value || "").trim();
  if (v && !/^\d{1,2}:\d{2}$/.test(v)) {
    const digits = v.replace(/\D/g, "");
    if (digits.length === 3) v = `0${digits[0]}:${digits.slice(1)}`;
    else if (digits.length === 4)
      v = `${digits.slice(0, 2)}:${digits.slice(2)}`;
  }
  const valido = /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
  if (valido) {
    const [hh, mm] = v.split(":");
    v = `${hh.padStart(2, "0")}:${mm}`;
  }
  input.value = v;
  state.irrigacaoHorarioInicio = v;
  input.classList.toggle("is-invalid", !!v && !valido);
}
// Card opcional da Aba 5 (Prévia): só aparece para atividades de
// irrigação/aquicultura, fundo suave + borda tracejada, totalmente
// no-print (não entra no PDF principal) e não bloqueia a exportação.
function renderIrrigacaoOpcionalCard() {
  const box = $("#irrigacaoOpcionalCard");
  if (!box) return;
  if (!ehAtividadeIrrigacao()) {
    box.innerHTML = "";
    return;
  }
  const valor = state.irrigacaoHorarioInicio || "";
  const invalido = !!valor && !/^([01]\d|2[0-3]):[0-5]\d$/.test(valor);
  box.innerHTML = `
    <div class="conditional no-print" style="margin-top:16px">
      <div class="conditional-tag">Solicitação de Desconto para Irrigante/Aquicultor (opcional)</div>
      <div class="field" style="max-width:280px">
        <label>Horário para Início do Desconto</label>
        <input type="text" id="f_irrigacaoHorarioInicio" value="${valor}" placeholder="HH:MM (ex.: 21:30)" class="${invalido ? "is-invalid" : ""}" oninput="state.irrigacaoHorarioInicio=this.value" onblur="onIrrigacaoHorarioBlur(this)">
      </div>
      <p class="field-hint" style="margin-top:8px">A distribuidora garante janela contínua de 8h30 entre 21h30 e 06h00. Este bloco é totalmente opcional e não bloqueia a exportação do formulário principal.</p>
      <div class="nav-bottom no-print" style="margin-top:14px;justify-content:flex-start">
        <button type="button" class="btn btn-ghost" id="btnExportarIrrigante" onclick="exportarPDFIrrigante()">Exportar Solicitação de Desconto</button>
      </div>
    </div>`;
}
// Última zona aplicada — os cards gravam state.localizacao ANTES de disparar
// o change, então o valor anterior precisa ser rastreado aqui para a limpeza
// dos campos da zona oposta funcionar.
let _zonaAnterior = "";
function onLocalizacao() {
  const v = $("#f_localizacao").value;
  const anterior = _zonaAnterior;
  _zonaAnterior = v;
  state.localizacao = v;
  $("#blocoUrbano").style.display = v === "Urbana" ? "block" : "none";
  $("#blocoRural").style.display = v === "Rural" ? "block" : "none";
  // Município/Estado são campos únicos, reposicionados conforme a zona para
  // manter a ordem do BT: urbano = CEP→Endereço→Nº→Bairro→Município→Estado;
  // rural = Município→Estado→Distrito→Propriedade→Ponto ref.→Instalação.
  const mun = $("#fieldMunicipio"),
    est = $("#fieldEstado");
  if (mun && est) {
    if (v === "Rural") {
      const g = $("#gridRural");
      g.prepend(est);
      g.prepend(mun);
    } else {
      const g = $("#gridUrbano"),
        compl = $("#fieldComplUC");
      g.insertBefore(mun, compl);
      g.insertBefore(est, compl);
    }
  }
  // Troca de zona limpa os campos da zona oposta (lógica trocarZona do BT);
  // Município/Estado, comuns às duas zonas, são preservados.
  if (anterior && anterior !== v) {
    const limpar =
      v === "Rural"
        ? ["uc_cep", "urb_endereco", "urb_num", "urb_compl", "urb_bairro"]
        : [
            "rur_distrito",
            "rur_propriedade",
            "pontoReferencia",
            "instalVizinho",
          ];
    limpar.forEach((k) => {
      const c = $(`[data-k="${k}"]`);
      if (c) c.value = "";
      state[k] = "";
    });
    const st = $("#cep-status-uc");
    if (st) {
      st.textContent = "";
      st.className = "field-hint";
    }
  }
  updateCoordHint(); // zona rural → coordenada obrigatória (regra do BT)
  onCoord();
  recalcRamal();
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}
// Marca/desmarca a obrigatoriedade real (data-req) de Latitude/Longitude — o
// aplicar() dos marcadores nunca REMOVE data-req, então o toggle é feito aqui.
function _setCoordReq(req) {
  ["latitude", "longitude"].forEach((k) => {
    const el = $(`[data-k=${k}]`);
    if (!el) return;
    if (req) el.setAttribute("data-req", "");
    else {
      el.removeAttribute("data-req");
      el.classList.remove("is-invalid");
    }
  });
}
function updateCoordHint() {
  const ehNova = state.finalidade === "Conexão Nova";
  $("#mudancaLocalBox").style.display =
    state.finalidade && !ehNova ? "" : "none";
  const mudanca = !ehNova && !!state.finalidade && state.mudancaLocal === "Sim";
  $("#coordHint").textContent =
    !ehNova && state.finalidade
      ? "Informe as coordenadas do local de atendimento atual. Caso haja mudança de local, informe também as novas coordenadas."
      : "Informe as coordenadas do local de atendimento.";
  // Obrigatoriedade igual ao BT: coordenada obrigatória em zona Rural. No MT
  // ela também é exigida quando há mudança do local da subestação (par
  // "atual"/"nova"); nos demais casos é opcional.
  const req = state.localizacao === "Rural" || mudanca;
  const sufixo = mudanca ? " atual" : "";
  const star = req ? ' <span class="req">*</span>' : "";
  $("#latLabel").innerHTML = "Latitude" + sufixo + star;
  $("#lonLabel").innerHTML = "Longitude" + sufixo + star;
  _setCoordReq(req);
  $("#coordNovaBox").style.display = mudanca ? "grid" : "none";
  reaplicarMarcadores();
}
function onMudancaLocal() {
  state.mudancaLocal = $("#f_mudancaLocal")?.value || "";
  updateCoordHint();
  onCoord();
}
function _utmBandLetter(lat) {
  const B = "CDEFGHJKLMNPQRSTUVWXX";
  return lat < -80 ? "C" : lat > 84 ? "X" : B[Math.floor((lat + 80) / 8)];
}
function latLonParaUTM(lat, lon) {
  const a = 6378137,
    f = 1 / 298.257223563,
    k0 = 0.9996;
  const b = a * (1 - f),
    e2 = 1 - (b * b) / (a * a);
  const latR = (lat * Math.PI) / 180,
    lonR = (lon * Math.PI) / 180;
  const zona = Math.floor((lon + 180) / 6) + 1;
  const lonC = (((zona - 1) * 6 - 180 + 3) * Math.PI) / 180;
  const sinL = Math.sin(latR),
    cosL = Math.cos(latR),
    tanL = Math.tan(latR);
  const N = a / Math.sqrt(1 - e2 * sinL ** 2);
  const T = tanL ** 2,
    C = (e2 / (1 - e2)) * cosL ** 2,
    A = cosL * (lonR - lonC);
  const e4 = e2 * e2,
    e6 = e4 * e2,
    ep2 = e2 / (1 - e2);
  const M =
    a *
    ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * latR -
      ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * latR) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * latR) -
      ((35 * e6) / 3072) * Math.sin(6 * latR));
  const E =
    k0 *
      N *
      (A +
        ((1 - T + C) * A ** 3) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5) / 120) +
    500000;
  let Nort =
    k0 *
    (M +
      N *
        tanL *
        ((A * A) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6) / 720));
  if (lat < 0) Nort += 10000000;
  return {
    zona,
    hemisferio: lat < 0 ? "S" : "N",
    easting: Math.round(E),
    northing: Math.round(Nort),
  };
}

function onCoord(imediato) {
  state.latitude = $("[data-k=latitude]").value;
  state.longitude = $("[data-k=longitude]").value;
  state.latitudeNova = $("[data-k=latitudeNova]")?.value || "";
  state.longitudeNova = $("[data-k=longitudeNova]")?.value || "";
  const r = CalculoMT.validarCoordenadas(state.latitude, state.longitude);
  const lat = parseFloat(state.latitude),
    lon = parseFloat(state.longitude);
  if (!isNaN(lat) && !isNaN(lon)) {
    const u = latLonParaUTM(lat, lon);
    const utmEl = $("[data-k=utm]");
    if (utmEl)
      utmEl.value = `${u.zona}${_utmBandLetter(lat)} E:${u.easting} N:${u.northing}`;
    // Validação ambiental automática a cada mudança de coordenada (como no BT):
    // clique/arraste no mapa aplicam de imediato; digitação usa debounce.
    clearTimeout(_mtRestrDebounce);
    _mtRestrDebounce = setTimeout(
      () => consultarRestricaoAmbientalMT(lat, lon),
      imediato ? 150 : 700,
    );
  }
  sincronizarMapaComCoordenadas(lat, lon, imediato);
  let erros = [];
  if (r.nivel === "erro") erros.push(r.msg);
  if ($("#coordNovaBox").style.display !== "none") {
    const rNova = CalculoMT.validarCoordenadas(
      state.latitudeNova,
      state.longitudeNova,
    );
    if (rNova.nivel === "erro") erros.push(rNova.msg);
    const latN = parseFloat(state.latitudeNova),
      lonN = parseFloat(state.longitudeNova);
    if (!isNaN(latN) && !isNaN(lonN)) {
      const uN = latLonParaUTM(latN, lonN);
      const utmNovaEl = $("[data-k=utmNova]");
      if (utmNovaEl)
        utmNovaEl.value = `${uN.zona}${_utmBandLetter(latN)} E:${uN.easting} N:${uN.northing}`;
    }
  }
  // Alerta do BT: em zona rural a coordenada é obrigatória — aviso enquanto
  // latitude/longitude não estiverem preenchidas.
  const ruralSemCoord =
    state.localizacao === "Rural" &&
    (!String(state.latitude || "").trim() ||
      !String(state.longitude || "").trim());
  $("#coordAlert").innerHTML =
    (erros.length ? alertHTML("err", erros.join(" ")) : "") +
    (ruralSemCoord
      ? alertHTML(
          "warn",
          "Em área rural, a coordenada é obrigatória para localização da propriedade.",
        )
      : "");
}

/* ===== Geolocalização automática a partir do endereço (Etapa 3) =====
   Espelha o comportamento do formulário BT (bt/js/map.js): assim que o
   endereço urbano (logradouro + número + município) está preenchido, o
   ponto é geocodificado, o alfinete é reposicionado e a validação
   ambiental é executada automaticamente (Regra 7). */
let _mtGeoDebounce = null,
  _mtLastGeoKey = "",
  _mtLastRestrKey = "",
  _mtRestrDebounce = null;
const _nDig = (s) => (String(s || "").match(/\d/g) || []).length;
async function geocodificarEnderecoMT() {
  // Só geocodifica em zona urbana e quando ainda não há coordenada definida
  // manualmente (preserva coordenada digitada/clicada pelo usuário).
  if (state.localizacao !== "Urbana") return;
  if (_nDig(state.latitude) >= 5 && _nDig(state.longitude) >= 5) return;
  // Exige pelo menos logradouro + número + município para buscar
  if (
    !String(state.urb_endereco || "").trim() ||
    !String(state.urb_num || "").trim() ||
    !String(state.uc_municipio || "").trim()
  )
    return;
  const key = [
    state.urb_endereco,
    state.urb_num,
    state.urb_bairro,
    state.uc_municipio,
    state.uc_cep,
  ]
    .join("|")
    .toLowerCase();
  if (_mtLastGeoKey === key) return;
  // Geocodificação ESTRUTURADA compartilhada (shared/js/geo.js): resolve o
  // NÚMERO do endereço — a antiga busca em texto livre ignorava o número e
  // posicionava o pin longe do local real.
  const r = await geocodificarEnderecoBR({
    logradouro: state.urb_endereco,
    numero: state.urb_num,
    bairro: state.urb_bairro,
    cidade: state.uc_municipio,
    uf: state.uc_estado,
    cep: state.uc_cep,
  });
  if (!r) return;
  _mtLastGeoKey = key;
  // _aplicarCoordDoMapa → onCoord dispara o reposicionamento do alfinete e a
  // validação ambiental automática (exatamente como no BT).
  _aplicarCoordDoMapa(r.lat, r.lon);
}
// Disparado no blur dos campos de endereço urbano (debounce de 800 ms).
function onEnderecoUrbanoMT() {
  clearTimeout(_mtGeoDebounce);
  _mtGeoDebounce = setTimeout(geocodificarEnderecoMT, 800);
}
// Bloco "Unidade consumidora em área de restrição ambiental?" — espelha
// exatamente os três estados do BT (bt/js/views/obra.js): orientação inicial,
// SIM (com a lista das camadas intersectadas) e NÃO.
function renderRestricaoAmbiental() {
  const box = $("#restricaoAmbientalConteudo");
  if (!box) return;
  const ra = state.restricaoAmbiental;
  // O bloco inteiro (pergunta + box) só aparece QUANDO há restrição. Sem
  // restrição (ou ainda não consultado) o campo some.
  const wrap = $("#restricaoAmbientalBox");
  if (ra === "Sim") {
    if (wrap) wrap.style.display = "";
    const det = state.restricoesDetalhe;
    // Banner (warn): título + frase de localização, num único <span> (o
    // .cmg-aviso-texto é flex — sem o span os nós inline não fluem como texto).
    const sentenca =
      typeof restricaoSentencaHTML === "function"
        ? restricaoSentencaHTML(det)
        : "";
    // Documentos mesclados (intro única + bullets + notas), sempre visíveis.
    const docs =
      typeof restricaoDocsHTML === "function" ? restricaoDocsHTML(det) : "";
    // Aceite obrigatório — bloqueia a exportação (camposObrigatoriosFaltando).
    const label =
      typeof RESTRICAO_ACEITE_LABEL !== "undefined"
        ? RESTRICAO_ACEITE_LABEL
        : "Declaro que li e estou de acordo com as informações acima.";
    const aceite = `<label class="restricao-aceite"><input type="checkbox" id="restricaoAceite"${state.restricaoAceite ? " checked" : ""}> <span>${label}</span></label>`;
    box.innerHTML =
      alertHTML("warn", `<span>${sentenca}</span>`) + docs + aceite;
    const chk = $("#restricaoAceite");
    if (chk)
      chk.onchange = (e) => {
        state.restricaoAceite = e.target.checked;
        if (typeof atualizarGateExportacao === "function")
          atualizarGateExportacao();
      };
  } else {
    if (wrap) wrap.style.display = "none";
    box.innerHTML = "";
  }
}
// Validação ambiental automática (IDE-Sisema), idêntica ao BT: usa a consulta
// compartilhada de shared/js/geo.js. Requer turf.js + geo.js; sem eles, o
// bloco mantém a orientação inicial e nada é preenchido automaticamente.
function _limparRestricaoLayer() {
  if (mapaObra && restricaoLayer) {
    mapaObra.removeLayer(restricaoLayer);
  }
  restricaoLayer = null;
}
async function consultarRestricaoAmbientalMT(lat, lon) {
  if (!window.turf || typeof consultarRestricoesObra !== "function") return;
  if (isNaN(lat) || isNaN(lon)) return;
  const key = lat.toFixed(5) + "," + lon.toFixed(5);
  if (_mtLastRestrKey === key) return;
  _mtLastRestrKey = key;
  const box = $("#restricaoAmbientalConteudo");
  if (box)
    box.innerHTML = alertHTML(
      "info",
      "Consultando restrição ambiental (IDE-Sisema)…",
    );
  try {
    const res = await consultarRestricoesObra(lat, lon);
    const resumo = resumirRestricoes(res);
    if (resumo.errosTodos) {
      state.restricaoAmbiental = "";
      state.restricaoAceite = false;
      state.restricoesTexto = "";
      state.restricoesDetalhe = [];
      _mtLastRestrKey = "";
      _limparRestricaoLayer();
      if (box)
        box.innerHTML = alertHTML(
          "warn",
          "Não foi possível consultar a restrição ambiental (verifique conexão/camadas).",
        );
      return;
    }
    state.restricaoAmbiental = resumo.restricaoAmbiental;
    state.restricaoAceite = false;
    state.restricoesTexto = resumo.restricoesTexto;
    state.restricoesDetalhe = detalhesRestricoes(res);
    renderRestricaoAmbiental();
    // Desenha o contorno das reservas no mapa (limpa o anterior primeiro).
    if (mapaObra && typeof desenharRestricoesNoMapa === "function") {
      _limparRestricaoLayer();
      restricaoLayer = desenharRestricoesNoMapa(window.L, mapaObra, res);
    }
  } catch (_) {
    _mtLastRestrKey = "";
    if (box)
      box.innerHTML = alertHTML(
        "warn",
        "Falha na consulta de restrição ambiental.",
      );
  }
}
/* ===== Mapa interativo de localização (Etapa 3) =====
   Adaptado de bt/js/map.js (LocalizacaoObra) para o estado plano do
   MT: lê/escreve diretamente state.latitude/state.longitude (em vez
   do sub-objeto obra.lat/obra.lng usado em BT), via onCoord(). */
function _aplicarCoordDoMapa(lat, lon) {
  const latEl = $("[data-k=latitude]"),
    lonEl = $("[data-k=longitude]");
  if (latEl) latEl.value = lat;
  if (lonEl) lonEl.value = lon;
  onCoord(true); // clique/arraste no mapa é intencional: aplica na hora, sem debounce
}
function initMapaObra() {
  const div = $("#map");
  if (!div || !window.L || mapaObra) return;
  mapaObra = window.L.map(div).setView([-19.9167, -43.9345], 12);
  // Camadas base alternáveis: Ruas (OSM, padrão) e Satélite (Esri World
  // Imagery — mesma fonte usada pelo Sisema). Esri não usa subdomínio {s}
  // e a ordem dos eixos é {z}/{y}/{x}.
  const ruas = window.L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    },
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
  mapaObra.on("click", (e) => {
    _aplicarCoordDoMapa(e.latlng.lat, e.latlng.lng);
  });
  setTimeout(() => mapaObra.invalidateSize(), 200);
  // Caso já existam coordenadas preenchidas (ex.: voltando de outra etapa)
  const lat = parseFloat(state.latitude),
    lon = parseFloat(state.longitude);
  if (!isNaN(lat) && !isNaN(lon)) sincronizarMapaComCoordenadas(lat, lon, true);
}
function sincronizarMapaComCoordenadas(lat, lon, imediato) {
  if (isNaN(lat) || isNaN(lon)) return;
  clearTimeout(_mapaObraDebounce);
  const atualizar = () => {
    if (!mapaObra) return;
    const ll = window.L.latLng(lat, lon);
    if (marcadorObra) {
      marcadorObra.setLatLng([lat, lon]);
      if (!mapaObra.getBounds().contains(ll))
        mapaObra.setView(ll, Math.max(mapaObra.getZoom(), 17));
    } else {
      marcadorObra = window.L.marker([lat, lon], { draggable: true }).addTo(
        mapaObra,
      );
      marcadorObra.on("dragend", (e) => {
        const p = e.target.getLatLng();
        _aplicarCoordDoMapa(p.lat, p.lng);
      });
      // Primeira aparição do pino (geocodificação, clique, coordenada
      // digitada): centraliza no ZOOM MÁXIMO dos tiles. Depois disso o
      // enquadramento só muda se o pino sair da vista (bloco acima).
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
function onSubPronta() {
  state.subPronta = event.target.value;
  const box = $("#subProntaAlert");
  // Mesmos avisos do BT (obra.prontoLigar): "Sim" → informativo; "Não" →
  // atenção com o prazo de 120 dias e as condições de cancelamento/taxa.
  if (state.subPronta === "Sim")
    box.innerHTML = alertHTML(
      "info",
      "Como a subestação já está pronta para ligar, o pedido de vistoria e ligação será disparado automaticamente após a conclusão das etapas do orçamento de conexão.",
    );
  else if (state.subPronta === "Não")
    box.innerHTML = alertHTML(
      "warn",
      "Solicite o pedido de vistoria e ligação em até 120 dias após a conclusão das etapas do orçamento de conexão. O orçamento pode ser cancelado após duas reprovações pelo mesmo motivo, e há cobrança de taxa a partir do segundo serviço realizado.",
    );
  else box.innerHTML = "";
}

/* ===== Validação de e-mail e telefone ===== */
function _validarEmail(v) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
}
function _validarTelefone(v) {
  const d = v.replace(/\D/g, "");
  if (d.length < 10 || d.length > 11) return false;
  const ddd = parseInt(d.substring(0, 2), 10);
  if (ddd < 11 || ddd > 99) return false;
  if (d.length === 11 && d[2] !== "9") return false;
  return true;
}
function _feedbackCampo(el, spanId, valido, msgErr) {
  const sp = $("#" + spanId);
  if (!el || !el.value) {
    if (el) el.classList.remove("is-invalid");
    if (sp) {
      sp.textContent = "";
      sp.className = "field-hint";
    }
    return;
  }
  if (valido) {
    el.classList.remove("is-invalid");
    if (sp) {
      sp.textContent = "";
    }
  } else {
    el.classList.add("is-invalid");
    if (sp) {
      sp.textContent = msgErr;
      sp.className = "field-hint field-err";
    }
  }
}
function onEmail(k) {
  const el = $(`[data-k="${k}"]`);
  _feedbackCampo(el, `status-${k}`, _validarEmail(el.value), "e-mail inválido");
}
function onTel(k) {
  const el = $(`[data-k="${k}"]`);
  _feedbackCampo(
    el,
    `status-${k}`,
    _validarTelefone(el.value),
    "telefone inválido",
  );
}

/* ===== Etapa 4: compartilhada, trafos, motores ===== */
function onCompartilhada() {
  state.compartilhada = $("#f_compartilhada").value;
  const compart = state.compartilhada === "Sim";
  $("#qtdCubiculosBox").style.display = compart ? "" : "none";
  $("#cubiculosBox").style.display = compart ? "block" : "none";
  $("#blocoTrafosIndividual").style.display = compart ? "none" : "block";
  $("#blocoMotoresIndividual").style.display = compart ? "none" : "block";
  $("#blocoTarifacaoDemanda").style.display = compart ? "none" : "block";
  $("#blocoTotaisConsolidados").style.display = compart ? "block" : "none";
  $("#compartilhadaAlert").innerHTML = compart
    ? alertHTML(
        "info",
        "Preencha os dados de cada cubículo abaixo. Após o orçamento e assinatura do CUSD, deverá ser solicitada a análise de projeto de cada UC de forma individualizada.",
      )
    : "";
  sincronizarCubiculos();
  recalcTecnico();
}

/* --- Transformadores --- */
function addTrafo() {
  trafos.push({ potencia: "", quantidade: "", relacao: "8" });
  renderTrafos();
}
function delTrafo(i) {
  trafos.splice(i, 1);
  renderTrafos();
  recalcTecnico();
}
function renderTrafos() {
  const tb = $("#trafoBody");
  tb.innerHTML = "";
  trafos.forEach((t, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `<td>TRF${String(i + 1).padStart(2, "0")}</td>
      <td><input type="number" step="any" value="${t.potencia}" placeholder="Ex.: 300" oninput="trafos[${i}].potencia=this.value;recalcTecnico()"></td>
      <td><input type="number" value="${t.quantidade}" placeholder="Ex.: 1" oninput="trafos[${i}].quantidade=this.value;recalcTecnico()"></td>
      <td><input type="number" step="any" value="${t.relacao}" placeholder="Ex.: 8" oninput="trafos[${i}].relacao=this.value"></td>
      <td><button class="btn-del" onclick="delTrafo(${i})">×</button></td>`;
    tb.appendChild(tr);
  });
}

/* --- Cubículos adicionais (Anexo I) --- */
function sincronizarCubiculos() {
  const qtd = parseInt($('[data-k="qtdCubiculos"]')?.value) || 0;
  const n = state.compartilhada === "Sim" ? Math.max(1, qtd) : 0;
  while (cubiculos.length < n)
    cubiculos.push({
      instalacao: "",
      trafos: [{ potencia: "", quantidade: "", relacao: "8" }],
      modalidade: "",
      demanda: "",
      demandaPonta: "",
      demandaForaPonta: "",
    });
  cubiculos.length = n;
  renderCubiculos();
}
function addTrafoCub(i) {
  cubiculos[i].trafos.push({ potencia: "", quantidade: "", relacao: "8" });
  renderCubiculos();
}
function delTrafoCub(i, j) {
  cubiculos[i].trafos.splice(j, 1);
  renderCubiculos();
}
function recalcCubiculo(i) {
  const rt = CalculoMT.calcularTrafos(cubiculos[i].trafos);
  const elPot = $("#cubTrafoPot" + i),
    elQtd = $("#cubTrafoQtd" + i);
  if (elPot) elPot.textContent = fmt(rt.potenciaTotal);
  if (elQtd) elQtd.textContent = rt.quantidadeTotal;
  validarDemandaCubiculo(i);
  recalcTecnico();
}
function demandaRepresentativaCubiculo(c) {
  if (c.modalidade === "Azul") {
    const p = parseFloat(c.demandaPonta) || 0,
      f = parseFloat(c.demandaForaPonta) || 0;
    return Math.max(p, f);
  }
  return parseFloat(c.demanda) || 0;
}
function validarDemandaCubiculo(i) {
  const c = cubiculos[i];
  if (!c) return;
  const el = $("#cubDemandaAlert" + i);
  if (!el) return;
  const potCub = CalculoMT.calcularTrafos(c.trafos).potenciaTotal;
  const demCub = demandaRepresentativaCubiculo(c);
  el.innerHTML =
    demCub > 0 && potCub > 0 && demCub > potCub
      ? alertHTML(
          "err",
          `A demanda do cubículo não pode ser superior à potência total dos seus transformadores (${fmt(potCub)} kVA).`,
        )
      : "";
}
function totaisCubiculos() {
  let potenciaTotal = 0,
    quantidadeTotal = 0,
    demandaTotal = 0;
  cubiculos.forEach((c) => {
    const rt = CalculoMT.calcularTrafos(c.trafos);
    potenciaTotal += rt.potenciaTotal;
    quantidadeTotal += rt.quantidadeTotal;
    demandaTotal += demandaRepresentativaCubiculo(c);
  });
  return { potenciaTotal, quantidadeTotal, demandaTotal };
}
// Cards de Modalidade tarifária horária dentro de cada cubículo — mesmo
// estilo (CAMPOS_CARDS_CONFIG.classes) dos demais cards do formulário.
function _cubiculoModalidadeCardsHTML(i, atual) {
  const cls = CAMPOS_CARDS_CONFIG.classes;
  return (
    `<div class="${cls.grid}">` +
    ["Verde", "Azul"]
      .map(
        (valor) =>
          `<button type="button" class="${cls.card}${atual === valor ? " " + cls.active : ""}" onclick="setCubiculoModalidade(${i},'${valor}')">${valor}</button>`,
      )
      .join("") +
    `</div>`
  );
}
function setCubiculoModalidade(i, valor) {
  cubiculos[i].modalidade = valor;
  renderCubiculos();
}
function renderCubiculos() {
  const box = $("#cubiculosCards");
  if (!box) return;
  box.innerHTML = cubiculos
    .map((c, i) => {
      const rt = CalculoMT.calcularTrafos(c.trafos);
      const trafoRows = c.trafos
        .map(
          (t, j) => `<tr>
      <td>TRF${String(j + 1).padStart(2, "0")}</td>
      <td><input type="number" step="any" value="${t.potencia}" placeholder="Ex.: 300" oninput="cubiculos[${i}].trafos[${j}].potencia=this.value;recalcCubiculo(${i})"></td>
      <td><input type="number" value="${t.quantidade}" placeholder="Ex.: 1" oninput="cubiculos[${i}].trafos[${j}].quantidade=this.value;recalcCubiculo(${i})"></td>
      <td><input type="number" step="any" value="${t.relacao}" placeholder="Ex.: 8" oninput="cubiculos[${i}].trafos[${j}].relacao=this.value"></td>
      <td><button class="btn-del" onclick="delTrafoCub(${i},${j})">×</button></td>
    </tr>`,
        )
        .join("");
      const azul = c.modalidade === "Azul";
      const demandaFields = azul
        ? `<div class="field"><label>Demanda Ponta (kW)</label><input type="number" step="any" value="${c.demandaPonta}" placeholder=" " oninput="cubiculos[${i}].demandaPonta=this.value;recalcTecnico();validarDemandaCubiculo(${i})"></div>
         <div class="field"><label>Demanda Fora de Ponta (kW)</label><input type="number" step="any" value="${c.demandaForaPonta}" placeholder=" " oninput="cubiculos[${i}].demandaForaPonta=this.value;recalcTecnico();validarDemandaCubiculo(${i})"></div>`
        : `<div class="field"><label>Demanda (kW)</label><input type="number" step="any" value="${c.demanda}" placeholder=" " oninput="cubiculos[${i}].demanda=this.value;recalcTecnico();validarDemandaCubiculo(${i})"></div>`;
      return `<div class="conditional" style="margin-top:14px">
      <div class="conditional-tag">Cubículo ${i + 1}</div>
      ${state.finalidade !== "Conexão Nova" ? `<div class="field" style="margin-bottom:14px"><label>N° Instalação</label><input type="text" value="${c.instalacao}" placeholder="Nº da instalação" oninput="cubiculos[${i}].instalacao=this.value"></div>` : ""}
      <div class="tbl-scroll">
        <table class="tbl">
          <thead><tr><th style="width:70px">Trafo</th><th>Potência (kVA)</th><th>Qtde</th><th>Relação I mag / I nominal</th><th style="width:46px"></th></tr></thead>
          <tbody>${trafoRows}</tbody>
          <tfoot><tr><td>Σ</td><td class="calc" id="cubTrafoPot${i}">${fmt(rt.potenciaTotal)}</td><td class="calc" id="cubTrafoQtd${i}">${rt.quantidadeTotal}</td><td colspan="2"></td></tr></tfoot>
        </table>
      </div>
      <button class="btn-add" onclick="addTrafoCub(${i})">+ Adicionar transformador</button>
      <div class="grid grid-2" style="margin-top:14px">
        <div class="field field--plain"><label>Modalidade tarifária horária</label>${_cubiculoModalidadeCardsHTML(i, c.modalidade)}</div>
        ${demandaFields}
      </div>
      <div id="cubDemandaAlert${i}"></div>
    </div>`;
    })
    .join("");
  cubiculos.forEach((c, i) => validarDemandaCubiculo(i));
  recalcTecnico();
}

/* --- Motores --- */
function addMotor() {
  motores.push({
    tipo: "Motor",
    fases: "Trifásico",
    cv: "",
    fp: "",
    rend: "",
    volts: "",
    ipIn: "",
    tempo: "",
    dispositivo: "",
    tap: "",
  });
  renderMotores();
}
function delMotor(i) {
  motores.splice(i, 1);
  renderMotores();
}
// Faixa de resultados calculados, no rodapé do card — sumário leve, não
// uma caixa pesada separada.
function _motorCardCalcHTML(c) {
  return `<div class="motor-card-calc">
    <div class="item"><span class="lbl">Pot (kVA)</span><span class="val" data-campo="potkVA">${fmt(c.potkVA)}</span></div>
    <div class="item"><span class="lbl">Pot (kW)</span><span class="val" data-campo="potkW">${fmt(c.potkW)}</span></div>
    <div class="item"><span class="lbl">I nom (A)</span><span class="val" data-campo="iNominal">${fmt(c.iNominal)}</span></div>
    <div class="item"><span class="lbl">I part (A)</span><span class="val" data-campo="iPartida">${fmt(c.iPartida)}</span></div>
    <div class="item"><span class="lbl">Ip prim (A)</span><span class="val" data-campo="ipPrimario">${c.ipPrimario == null ? "—" : fmt(c.ipPrimario)}</span></div>
  </div>`;
}
function renderMotores() {
  const box = $("#motoresCardsContainer");
  if (!box) return;
  box.innerHTML = "";
  const tMT = parseFloat(state.tensaoMT);
  motores.forEach((m, i) => {
    const c = CalculoMT.calcularMotor(
      {
        potenciaCV: m.cv,
        fp: m.fp,
        rendimento: m.rend,
        tensaoV: m.volts,
        relacaoIpIn: m.ipIn,
      },
      tMT,
    );
    const dispOpts = DISPOSITIVOS.map(
      (d) => `<option ${m.dispositivo === d ? "selected" : ""}>${d}</option>`,
    ).join("");
    const compensadora = m.dispositivo === "Chave Compensadora";
    const card = document.createElement("div");
    card.className = "motor-card";
    card.dataset.motorRow = i;
    card.innerHTML = `
      <div class="motor-card-head">
        <span class="motor-titulo">Motor #${String(i + 1).padStart(2, "0")}</span>
        <button type="button" class="motor-del" onclick="delMotor(${i})" title="Remover motor">×</button>
      </div>
      <div class="motor-card-grid">
        <div class="field field--plain"><label>Tipo</label><input type="text" value="${m.tipo}" placeholder="Ex.: Motor" oninput="motores[${i}].tipo=this.value"></div>
        <div class="field field--plain"><label>Fases</label><select onchange="motores[${i}].fases=this.value"><option ${m.fases === "Monofásico" ? "selected" : ""}>Monofásico</option><option ${m.fases !== "Monofásico" ? "selected" : ""}>Trifásico</option></select></div>
        <div class="field field--plain"><label>CV</label><input type="number" step="any" value="${m.cv}" placeholder="150" oninput="motores[${i}].cv=this.value" onchange="atualizarCalculosMotor(this)"></div>
        <div class="field field--plain"><label>FP</label><input type="number" step="any" value="${m.fp}" placeholder="0,88" oninput="motores[${i}].fp=this.value" onchange="atualizarCalculosMotor(this)"></div>
        <div class="field field--plain"><label>Rendimento</label><input type="number" step="any" value="${m.rend}" placeholder="0,92" oninput="motores[${i}].rend=this.value" onchange="atualizarCalculosMotor(this)"></div>
        <div class="field field--plain"><label>Tensao(V)</label><input type="number" step="any" value="${m.volts}" placeholder="380" oninput="motores[${i}].volts=this.value" onchange="atualizarCalculosMotor(this)"></div>
        <div class="field field--plain"><label>Ip/In</label><input type="number" step="any" value="${m.ipIn}" placeholder="6" oninput="motores[${i}].ipIn=this.value" onchange="atualizarCalculosMotor(this)"></div>
        <div class="field field--plain"><label>Tempo Ip (s)</label><input type="number" step="any" value="${m.tempo}" placeholder="10" oninput="motores[${i}].tempo=this.value"></div>
        <div class="field field--plain"><label>Disp. partida</label><select onchange="onDispositivoMotorChange(this,${i})"><option value="">—</option>${dispOpts}</select></div>
        <div class="field field--plain motor-tap-field" style="display:${compensadora ? "" : "none"}"><label>Tap (%)</label><input type="number" step="any" value="${m.tap || ""}" placeholder="65" oninput="motores[${i}].tap=this.value"></div>
      </div>
      ${ehAtividadeIrrigacao() ? `<label class="motor-irrigacao-check"><input type="checkbox" ${m.destinadoIrrigacao ? "checked" : ""} onchange="motores[${i}].destinadoIrrigacao=this.checked"> Destinado à Irrigação</label>` : ""}
      ${_motorCardCalcHTML(c)}`;
    box.appendChild(card);
  });
}
// Recalcula só os valores elétricos de UM motor (change/blur dos inputs
// numéricos) e atualiza pontualmente os itens .val do card — isolado via
// this.closest('.motor-card'), sem reconstruir o contêiner geral, o que
// manteria o foco instável e travaria a digitação a cada caractere.
function atualizarCalculosMotor(inputEl) {
  const card = inputEl.closest(".motor-card");
  if (!card) return;
  const i = parseInt(card.dataset.motorRow, 10);
  const m = motores[i];
  if (!m) return;
  const tMT = parseFloat(state.tensaoMT);
  const c = CalculoMT.calcularMotor(
    {
      potenciaCV: m.cv,
      fp: m.fp,
      rendimento: m.rend,
      tensaoV: m.volts,
      relacaoIpIn: m.ipIn,
    },
    tMT,
  );
  const setCalc = (campo, val) => {
    const el = card.querySelector(`.val[data-campo="${campo}"]`);
    if (el) el.textContent = val;
  };
  setCalc("potkVA", fmt(c.potkVA));
  setCalc("potkW", fmt(c.potkW));
  setCalc("iNominal", fmt(c.iNominal));
  setCalc("iPartida", fmt(c.iPartida));
  setCalc("ipPrimario", c.ipPrimario == null ? "—" : fmt(c.ipPrimario));
}
// Mostra/oculta o sub-campo Tap (%) isolado no card do motor alterado,
// sem reconstruir o contêiner geral.
function onDispositivoMotorChange(selectEl, i) {
  motores[i].dispositivo = selectEl.value;
  const compensadora = selectEl.value === "Chave Compensadora";
  if (!compensadora) motores[i].tap = "";
  const card = selectEl.closest(".motor-card");
  if (!card) return;
  const tapField = card.querySelector(".motor-tap-field");
  if (!tapField) return;
  tapField.style.display = compensadora ? "" : "none";
  const tapInput = tapField.querySelector("input");
  if (tapInput && !compensadora) tapInput.value = "";
}

/* ============================================================
   ANÁLISE DE PARTIDA DE MOTORES PESADOS
   Critério Cemig: trifásico > 50 CV OU monofásico > 15 CV.
   Cada motor pesado recebe uma ficha própria em motores[i].analisePartida.
   ============================================================ */
function motorPesado(m) {
  const cv = parseFloat(m.cv) || 0;
  if (!cv) return false;
  return m.fases === "Monofásico" ? cv > 15 : cv > 50; // Trifásico é o padrão
}
function motoresPesadosIdx() {
  return motores.map((m, i) => i).filter((i) => motorPesado(motores[i]));
}
function ensureAnalisePartida(m) {
  if (!m.analisePartida) {
    m.analisePartida = {
      fpPartida: "",
      dispositivo: "",
      tap: "",
      numPartidas: "",
      ordemPartida: "",
      cargaOperanteKVA: "",
      cargaOperanteFP: "",
      cargaSensivelTipo: "",
      cargaSensivelPercentual: "",
      simultaneidade: "",
      impedanciaZ: "",
    };
  }
  return m.analisePartida;
}
function _dispositivoPartidaCardsHTML(i, atual) {
  const cls = CAMPOS_CARDS_CONFIG.classes;
  return (
    `<div class="${cls.grid} toggle-group--opcoes" role="radiogroup">` +
    CAMPOS_CARDS_CONFIG.dispositivosPartida
      .map((op) => {
        const ativo = atual === op.labelShort;
        return `<button type="button" role="radio" aria-checked="${ativo ? "true" : "false"}" class="${cls.card}${ativo ? " " + cls.active : ""}" title="${op.labelFull}" onclick='setDispositivoPartida(${i},${JSON.stringify(op.labelShort)})'>${op.labelShort}</button>`;
      })
      .join("") +
    `</div>`
  );
}
function setDispositivoPartida(i, valor) {
  const ap = ensureAnalisePartida(motores[i]);
  ap.dispositivo = valor;
  if (valor !== "Chave Compensadora") ap.tap = "";
  renderAnaliseMotores();
}
function renderAnaliseMotores() {
  const box = $("#analiseMotoresCards");
  if (!box) return;
  const idxs = motoresPesadosIdx();
  const tMT = parseFloat(state.tensaoMT);
  if (!idxs.length) {
    box.innerHTML =
      '<div class="field-hint">Nenhum motor pesado identificado (trifásico acima de 50 CV ou monofásico acima de 15 CV).</div>';
    return;
  }
  box.innerHTML = idxs
    .map((i) => {
      const m = motores[i];
      const ap = ensureAnalisePartida(m);
      const c = CalculoMT.calcularMotor(
        {
          potenciaCV: m.cv,
          fp: m.fp,
          rendimento: m.rend,
          tensaoV: m.volts,
          relacaoIpIn: m.ipIn,
        },
        tMT,
      );
      return `<div class="conditional motor-pesado-card" style="margin-top:14px">
      <div class="conditional-tag">Motor ${i + 1} — ${m.tipo || "Motor"} (${m.fases || "Trifásico"}, ${m.cv || "—"} CV)</div>
      <div class="grid grid-3">
        <div class="field"><label>Potência do transformador (kVA)</label><input type="text" value="${fmt(state.potTotalTrafos)}" placeholder=" " readonly></div>
        <div class="field"><label>Corrente de partida (A)</label><input type="text" value="${c.iPartida == null ? "—" : fmt(c.iPartida)}" placeholder=" " readonly></div>
        <div class="field"><label>Fator de potência na partida</label><input type="number" step="any" value="${ap.fpPartida}" placeholder="Ex.: 0,35" oninput="motores[${i}].analisePartida.fpPartida=this.value"></div>
      </div>
      <div class="subbox-title" style="margin-top:16px">Dispositivo auxiliar de partida</div>
      ${_dispositivoPartidaCardsHTML(i, ap.dispositivo)}
      ${
        ap.dispositivo === "Chave Compensadora"
          ? `<div class="grid grid-3" style="margin-top:12px">
        <div class="field"><label>Tap (%)</label><input type="number" step="any" value="${ap.tap}" placeholder="Ex.: 65" oninput="motores[${i}].analisePartida.tap=this.value"></div>
      </div>`
          : ""
      }
      <div class="grid grid-2" style="margin-top:16px">
        <div class="field"><label>Número de partidas</label><input type="number" value="${ap.numPartidas}" placeholder=" " oninput="motores[${i}].analisePartida.numPartidas=this.value"></div>
        <div class="field"><label>Ordem de partida</label><input type="number" value="${ap.ordemPartida}" placeholder=" " oninput="motores[${i}].analisePartida.ordemPartida=this.value"></div>
        <div class="field"><label>Carga operando (kVA)</label><input type="number" step="any" value="${ap.cargaOperanteKVA}" placeholder=" " oninput="motores[${i}].analisePartida.cargaOperanteKVA=this.value"></div>
        <div class="field"><label>Carga operando (FP)</label><input type="number" step="any" value="${ap.cargaOperanteFP}" placeholder=" " oninput="motores[${i}].analisePartida.cargaOperanteFP=this.value"></div>
      </div>
      <div class="grid grid-2" style="margin-top:16px">
        <div class="field"><label>Carga sensível — Tipo</label><input type="text" value="${ap.cargaSensivelTipo}" placeholder="Ex.: CLP, iluminação" oninput="motores[${i}].analisePartida.cargaSensivelTipo=this.value"></div>
        <div class="field"><label>Carga sensível — % admissível</label><input type="number" step="any" value="${ap.cargaSensivelPercentual}" placeholder=" " oninput="motores[${i}].analisePartida.cargaSensivelPercentual=this.value"></div>
        <div class="field"><label>Simultaneidade</label>
          <select onchange="motores[${i}].analisePartida.simultaneidade=this.value">
            <option value=""></option>
            <option ${ap.simultaneidade === "Sim" ? "selected" : ""}>Sim</option>
            <option ${ap.simultaneidade === "Não" ? "selected" : ""}>Não</option>
          </select></div>
        <div class="field"><label>Impedância do transformador — %Z</label><input type="number" step="any" value="${ap.impedanciaZ}" placeholder=" " oninput="motores[${i}].analisePartida.impedanciaZ=this.value"></div>
      </div>
    </div>`;
    })
    .join("");
}
function abrirAnaliseMotores() {
  renderAnaliseMotores();
  $$(".page").forEach((p) => p.classList.remove("show"));
  $("#page-analise-motores").classList.add("show");
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function voltarDaAnalise() {
  goTo(5);
}

/* ============================================================
   RELATÓRIO DE MOTORES — impressão dedicada (folha oficial Cemig)
   "FORMULÁRIO PARA A ANÁLISE DE PARTIDA DE MOTORES": bloco de
   Identificação (só "Cliente:", sem NS), dados do motor com texto
   direto (sem checkbox) e Notas 1/2 originais no rodapé. Campos
   vazios saem com sublinhado para preenchimento manual.
   ============================================================ */
function _campoImpresso(valor, unidade) {
  const v = String(valor ?? "").trim();
  if (!v) return `<span class="linha-vazia"></span>`;
  return `${v}${unidade ? " " + unidade : ""}`;
}
function renderDocumentoMotoresImpressao() {
  syncState();
  const box = $("#documentoMotoresImpressao");
  if (!box) return;
  const idxs = motoresPesadosIdx();
  const tMT = parseFloat(state.tensaoMT);
  const hoje = new Date();
  const dataExtenso = `${String(hoje.getDate()).padStart(2, "0")} de ${hoje.toLocaleDateString("pt-BR", { month: "long" })} de ${hoje.getFullYear()}`;
  const notas = `<div class="doc-notas">
    <p>1 - Em caso de partida sequencial de motores, preencher uma folha para cada motor, indicando a ordem de partida.</p>
    <p>2 - Anexar, sempre que possível, a(s) folha(s) das características elétricas, fornecida(s) pelo fabricante do motor.</p>
  </div>`;
  const assinatura = `<div class="doc-assinatura">
    <div class="linha"></div>
    <div>Responsável pelas informações</div>
  </div>`;
  if (!idxs.length) {
    box.innerHTML = `<div class="folha-motor">
      <div class="doc-titulo">FORMULÁRIO PARA A ANÁLISE DE PARTIDA DE MOTORES</div>
      <div class="doc-sec">IDENTIFICAÇÃO</div>
      <div class="doc-kv"><b>Cliente:</b><span>${_campoImpresso(state.nome)}</span></div>
      <div class="doc-kv" style="margin-top:10px"><b>&nbsp;</b><span>Nenhum motor pesado identificado (trifásico acima de 50 CV ou monofásico acima de 15 CV).</span></div>
      <div class="doc-sec">NOTAS</div>
      ${notas}
      <div class="doc-kv" style="margin-top:14px"><b>Data:</b><span>${dataExtenso}</span></div>
      ${assinatura}
    </div>`;
    return;
  }
  box.innerHTML = idxs
    .map((i) => {
      const m = motores[i];
      const ap = ensureAnalisePartida(m);
      const c = CalculoMT.calcularMotor(
        {
          potenciaCV: m.cv,
          fp: m.fp,
          rendimento: m.rend,
          tensaoV: m.volts,
          relacaoIpIn: m.ipIn,
        },
        tMT,
      );
      const dispositivoTexto = ap.dispositivo
        ? ap.dispositivo +
          (ap.dispositivo === "Chave Compensadora"
            ? ` — Tap: ${_campoImpresso(ap.tap, "%")}`
            : "")
        : `<span class="linha-vazia"></span>`;
      return `<div class="folha-motor">
      <div class="doc-titulo">FORMULÁRIO PARA A ANÁLISE DE PARTIDA DE MOTORES</div>

      <div class="doc-sec">IDENTIFICAÇÃO</div>
      <div class="doc-kv"><b>Cliente:</b><span>${_campoImpresso(state.nome)}</span></div>

      <div class="doc-sec">TIPO DO MOTOR / NÚMERO DE FASES</div>
      <div class="doc-kv"><b>Tipo do motor:</b><span>${_campoImpresso(m.tipo)}</span></div>
      <div class="doc-kv"><b>Número de fases:</b><span>${_campoImpresso(m.fases || "Trifásico")}</span></div>

      <div class="doc-sec">DADOS ELÉTRICOS</div>
      <div class="doc-kv"><b>Potência do motor:</b><span>${_campoImpresso(m.cv, "CV")}</span></div>
      <div class="doc-kv"><b>Tensão no motor:</b><span>${_campoImpresso(m.volts, "V")}</span></div>
      <div class="doc-kv"><b>Corrente de partida (sem dispositivo de partida):</b><span>${_campoImpresso(c.iPartida == null ? "" : fmt(c.iPartida), "A")}</span></div>
      <div class="doc-kv"><b>Corrente nominal:</b><span>${_campoImpresso(c.iNominal == null ? "" : fmt(c.iNominal), "A")}</span></div>
      <div class="doc-kv"><b>Relação Ip/In:</b><span>${_campoImpresso(m.ipIn)}</span></div>
      <div class="doc-kv"><b>Fator de potência em regime:</b><span>${_campoImpresso(m.fp)}</span></div>
      <div class="doc-kv"><b>Fator de potência na partida:</b><span>${_campoImpresso(ap.fpPartida)}</span></div>

      <div class="doc-sec">NÚMERO DE PARTIDAS</div>
      <div class="doc-kv"><b>Número de partidas:</b><span>${_campoImpresso(ap.numPartidas)}</span></div>

      <div class="doc-sec">DISPOSITIVO AUXILIAR DE PARTIDA (QUANDO HOUVER)</div>
      <div class="doc-kv"><b>Dispositivo:</b><span>${dispositivoTexto}</span></div>

      <div class="doc-sec">ORDEM DE PARTIDA DO MOTOR (CASOS DE DOIS OU MAIS MOTORES)</div>
      <div class="doc-kv"><b>Ordem de partida:</b><span>${_campoImpresso(ap.ordemPartida)}</span></div>

      <div class="doc-sec">CARGAS OPERANDO ENQUANTO O MOTOR PARTE (QUANDO HOUVER)</div>
      <div class="doc-kv"><b>Potência:</b><span>${_campoImpresso(ap.cargaOperanteKVA, "kVA")}</span></div>
      <div class="doc-kv"><b>Fator de potência:</b><span>${_campoImpresso(ap.cargaOperanteFP)}</span></div>

      <div class="doc-sec">CARGAS SENSÍVEIS A FLUTUAÇÕES DE TENSÃO</div>
      <div class="doc-kv"><b>Tipo:</b><span>${_campoImpresso(ap.cargaSensivelTipo)}</span></div>
      <div class="doc-kv"><b>Flutuação admissível:</b><span>${_campoImpresso(ap.cargaSensivelPercentual, "%")}</span></div>

      <div class="doc-sec">SIMULTANEIDADE DE PARTIDA</div>
      <div class="doc-kv"><b>Em caso de simultaneidade, relacionar os motores e suas características elétricas:</b><span>${_campoImpresso(ap.simultaneidade)}</span></div>

      <div class="doc-sec">TRANSFORMADOR DO CONSUMIDOR</div>
      <div class="doc-kv"><b>Potência do transformador:</b><span>${_campoImpresso(fmt(state.potTotalTrafos), "kVA")}</span></div>
      <div class="doc-kv"><b>Impedância percentual do transformador:</b><span>${_campoImpresso(ap.impedanciaZ, "%")}</span></div>

      <div class="doc-sec">NOTAS</div>
      ${notas}

      <div class="doc-kv" style="margin-top:14px"><b>Data:</b><span>${dataExtenso}</span></div>
      ${assinatura}
    </div>`;
    })
    .join("");
}
// Nomeia o PDF dinamicamente: como a exportação é via impressão do
// navegador (Salvar como PDF), o nome sugerido no diálogo de impressão
// segue o document.title — por isso ele é trocado temporariamente.
function exportarPDFPartida() {
  renderDocumentoMotoresImpressao();
  const tituloOriginal = document.title;
  const nomeCliente = (state.nome || "Cliente").trim().replace(/\s+/g, "_");
  document.title = `Analise_Partida_Motores_${nomeCliente}`;
  document.body.classList.add("print-motores-only");
  window.print();
  document.title = tituloOriginal;
}
window.addEventListener("afterprint", () => {
  document.body.classList.remove("print-motores-only");
});

/* ============================================================
   Solicitação de Desconto para Irrigante/Aquicultor (Versão D) —
   folha única A4, dados do cliente vindos da Aba 2/3, tabela de
   cargas só com motores destinadoIrrigacao===true (CV convertido
   para kW a 0,7355) e Notas/assinatura no rodapé.
   ============================================================ */
function renderDocumentoIrrigacaoImpressao() {
  syncState();
  const box = $("#documentoIrrigacaoImpressao");
  if (!box) return;
  const hoje = new Date();
  const dataExtenso = `${String(hoje.getDate()).padStart(2, "0")} de ${hoje.toLocaleDateString("pt-BR", { month: "long" })} de ${hoje.getFullYear()}`;
  const motoresIrrigacao = motores.filter((m) => m.destinadoIrrigacao === true);
  const linhasMotores = motoresIrrigacao.length
    ? motoresIrrigacao
        .map((m) => {
          const cv = parseFloat(m.cv);
          const kw = isNaN(cv) ? null : cv * 0.7355;
          const potenciaTexto =
            kw == null
              ? `<span class="linha-vazia"></span>`
              : `${fmt(kw)} kW (${fmt(cv)} CV)`;
          return `<tr><td>${_campoImpresso(m.tipo || "Motor")}</td><td>${_campoImpresso(m.fases || "Trifásico")}</td><td>${potenciaTexto}</td></tr>`;
        })
        .join("")
    : `<tr><td colspan="3">Nenhum motor destinado à irrigação foi marcado.</td></tr>`;
  box.innerHTML = `<div class="folha-motor">
    <div class="doc-titulo">SOLICITAÇÃO DE DESCONTO PARA IRRIGANTE / AQUICULTOR</div>

    <div class="doc-sec">IDENTIFICAÇÃO DO CLIENTE</div>
    <div class="doc-kv"><b>Cliente:</b><span>${_campoImpresso(state.nome)}</span></div>
    <div class="doc-kv"><b>Município:</b><span>${_campoImpresso(state.uc_municipio)}</span></div>
    <div class="doc-kv"><b>Nº da Instalação:</b><span>${_campoImpresso(state.numInstalacao)}</span></div>
    <div class="doc-kv"><b>CPF/CNPJ:</b><span>${_campoImpresso(state.cpfCnpj)}</span></div>
    <div class="doc-kv"><b>E-mail:</b><span>${_campoImpresso(state.emailCliente)}</span></div>
    <div class="doc-kv"><b>Telefone:</b><span>${_campoImpresso(state.telCliente)}</span></div>

    <div class="doc-sec">HORÁRIO PARA INÍCIO DO DESCONTO</div>
    <div class="doc-kv"><b>Horário:</b><span>${_campoImpresso(state.irrigacaoHorarioInicio)}</span></div>
    <div class="doc-kv"><b>&nbsp;</b><span>A distribuidora garante janela contínua de 8h30 entre 21h30 e 06h00.</span></div>

    <div class="doc-sec">CARGAS DESTINADAS À IRRIGAÇÃO</div>
    <table class="doc-tabela">
      <thead><tr><th>Tipo</th><th>Fases</th><th>Potência</th></tr></thead>
      <tbody>${linhasMotores}</tbody>
    </table>

    <div class="doc-notas">
      <p>1 - O desconto na tarifa de energia elétrica para irrigantes e aquicultores está condicionado à comprovação de licença ambiental e outorga de uso de recursos hídricos vigentes (REN nº 1.000/2021, §7º; Lei nº 12.787/2013, arts. 22 e 23).</p>
      <p>2 - A distribuidora garante a janela contínua de 8h30 (oito horas e trinta minutos) entre 21h30 e 06h00 para o horário reduzido, conforme horário de início informado pelo cliente.</p>
    </div>

    <div class="doc-kv" style="margin-top:14px"><b>Data:</b><span>${dataExtenso}</span></div>
    <div class="doc-assinatura">
      <div class="linha"></div>
      <div>Responsável pelas informações</div>
    </div>
  </div>`;
}
function exportarPDFIrrigante() {
  renderDocumentoIrrigacaoImpressao();
  const tituloOriginal = document.title;
  const nomeCliente = (state.nome || "Cliente").trim().replace(/\s+/g, "_");
  document.title = `Solicitacao_Desconto_Irrigante_${nomeCliente}`;
  document.body.classList.add("print-irrigante-only");
  window.print();
  document.title = tituloOriginal;
}
window.addEventListener("afterprint", () => {
  document.body.classList.remove("print-irrigante-only");
});

/* ===== Recalcular bloco técnico (trafos, tipo SE, demanda) ===== */
function recalcTecnico() {
  state.tensaoMT = $("#f_tensaoMT")?.value || state.tensaoMT;
  // trafos (ou totais consolidados dos cubículos, se compartilhada)
  const rt =
    state.compartilhada === "Sim"
      ? totaisCubiculos()
      : CalculoMT.calcularTrafos(
          trafos.map((t) => ({
            potencia: t.potencia,
            quantidade: t.quantidade,
          })),
        );
  state.potTotalTrafos = rt.potenciaTotal;
  state.qtdTotalTrafos = rt.quantidadeTotal;
  $("#trafoPotTotal").textContent = fmt(rt.potenciaTotal);
  $("#trafoQtdTotal").textContent = rt.quantidadeTotal;
  // conexão nova: replica pot/qtde
  if ($("#cn_pot")) {
    $("#cn_pot").value = fmt(rt.potenciaTotal);
    state.cn_pot = rt.potenciaTotal;
  }
  if ($("#cn_qtd")) {
    $("#cn_qtd").value = rt.quantidadeTotal;
    state.cn_qtd = rt.quantidadeTotal;
  }
  if ($("#alt_potFutura")) {
    $("#alt_potFutura").value = fmt(rt.potenciaTotal);
    state.alt_potFutura = rt.potenciaTotal;
  }
  if ($("#alt_qtdFutura")) {
    $("#alt_qtdFutura").value = rt.quantidadeTotal;
    state.alt_qtdFutura = rt.quantidadeTotal;
  }
  if (state.compartilhada === "Sim") {
    state.demandaTotalCubiculos = rt.demandaTotal;
    if ($("#totConsolidadoTrafos"))
      $("#totConsolidadoTrafos").value = fmt(rt.potenciaTotal);
    if ($("#totConsolidadoDemanda"))
      $("#totConsolidadoDemanda").value = fmt(rt.demandaTotal);
  }
  renderMotores();
  // tipo de subestação automático
  preencherTiposSE();
  // tarifa monômia
  const rm = CalculoMT.validarTarifaMonomia(
    $("#f_monomia")?.value,
    rt.potenciaTotal,
  );
  $("#monomiaAlert").innerHTML =
    rm.nivel === "erro" ? alertHTML("err", rm.msg) : "";
  // demanda
  validarDemandas();
  recalcRamal();
}

function preencherTiposSE() {
  const ehNova = state.finalidade === "Conexão Nova";
  const potBase = ehNova ? state.potTotalTrafos : state.potTotalTrafos; // futura = soma trafos
  const lista = CalculoMT.tiposSubestacaoPermitidos({
    tensaoMTkV: state.tensaoMT,
    compartilhada: state.compartilhada,
    potencia: potBase,
  });
  // popula dropdown da conexão nova
  const selNova = $("#cn_tipoSE");
  if (selNova) {
    const atual = selNova.value;
    selNova.innerHTML =
      '<option value=""></option>' +
      lista
        .map((s) => `<option ${atual === s ? "selected" : ""}>${s}</option>`)
        .join("");
    if (lista.length === 1) {
      selNova.value = lista[0];
      state.cn_tipoSE = lista[0];
    }
  }
  // popula dropdown "Tipo de Subestação atual" da alteração
  const selAtual = $("#alt_tipoAtual");
  if (selAtual) {
    const baseAtual = [
      "Subestação Nº 1",
      "Subestação Nº 2",
      "Subestação Nº 4",
      "Subestação Nº 5",
      "Subestação Nº 6",
      "Subestação Nº 8",
    ];
    const potAtual = parseFloat($("[data-k=alt_potAtual]")?.value) || 0;
    const listaAtual = CalculoMT.filtrarTiposPorPotencia(baseAtual, potAtual);
    const atual = selAtual.value;
    const manter = listaAtual.includes(atual);
    selAtual.innerHTML =
      '<option value=""></option>' +
      listaAtual
        .map(
          (s) =>
            `<option ${manter && atual === s ? "selected" : ""}>${s}</option>`,
        )
        .join("");
    if (!manter) {
      selAtual.value = "";
      state.alt_tipoAtual = "";
    }
  }
  // popula dropdown "Para" da alteração
  const selPara = $("#alt_tipoPara");
  if (selPara) {
    const atual = selPara.value;
    const listaPara = CalculoMT.filtrarTiposPorPotencia(
      lista,
      state.potTotalTrafos,
    );
    selPara.innerHTML =
      '<option value=""></option>' +
      listaPara
        .map((s) => `<option ${atual === s ? "selected" : ""}>${s}</option>`)
        .join("");
  }
  renderGaleriaSE("seGallery_nova", "cn_tipoSE");
  renderGaleriaSE("seGallery_atual", "alt_tipoAtual");
  renderGaleriaSE("seGallery_para", "alt_tipoPara");
}

/* ===== Galeria visual de tipos de subestação ===== */
const SE_GALLERY_MAP = {
  cn_tipoSE: "seGallery_nova",
  alt_tipoAtual: "seGallery_atual",
  alt_tipoPara: "seGallery_para",
};
function renderGaleriaSE(containerId, selectId) {
  const cont = $("#" + containerId),
    sel = $("#" + selectId);
  if (!cont || !sel) return;
  const opts = [...sel.options].filter((o) => o.value !== "");
  cont.innerHTML = opts
    .map((o) => {
      const m = o.value.match(/(\d+)/);
      const img = m && SUBESTACAO_IMGS[m[1]];
      const info = m && SUBESTACAO_INFO[m[1]];
      const sel_ = o.value === sel.value ? "selected" : "";
      return `<div class="se-card ${sel_}" onclick="selecionarSE('${selectId}','${o.value}')">
      ${info ? `<span class="se-info">i<span class="se-tooltip">${info}</span></span>` : ""}
      ${img ? `<img src="${img}" alt="${o.value}">` : ""}
      <div class="lbl">${o.value}</div>
    </div>`;
    })
    .join("");
}
function selecionarSE(selectId, value) {
  const sel = $("#" + selectId);
  if (!sel) return;
  sel.value = value;
  if (typeof sel.onchange === "function") sel.onchange();
  renderGaleriaSE(SE_GALLERY_MAP[selectId], selectId);
}

function onMonomia() {
  state.monomia = $("#f_monomia").value;
  const isMonomia = state.monomia === "Sim";
  const boxModalidade = $("#boxModalidade"),
    boxEscalonada = $("#boxEscalonada"),
    demandaBox = $("#demandaBox");
  if (boxModalidade) boxModalidade.style.display = isMonomia ? "none" : "";
  if (boxEscalonada) boxEscalonada.style.display = isMonomia ? "none" : "";
  if (demandaBox) demandaBox.style.display = isMonomia ? "none" : "";
  if (isMonomia) {
    const escBox = $("#escalonadaBox");
    if (escBox) escBox.style.display = "none";
    $("#demandaAlert").innerHTML = "";
  }
  recalcTecnico();
}
function onModalidade() {
  state.modalidade = $("#f_modalidade").value;
  updateDemandaLabels();
  validarDemandas();
}
function onEscalonada() {
  state.escalonada = $("#f_escalonada").value;
  $("#escalonadaBox").style.display =
    state.escalonada === "Sim" ? "block" : "none";
  if (state.escalonada === "Sim") renderEscalonada();
}
function updateDemandaLabels() {
  const azul = state.modalidade === "Azul";
  const ehAlteracao =
    state.finalidade === "Aumento de Demanda" ||
    state.finalidade === "Redução de Demanda";
  [
    "dem_atual",
    "dem_futura",
    "dem_ponta_atual",
    "dem_ponta_futura",
    "dem_foraponta_atual",
    "dem_foraponta_futura",
  ].forEach((k) => {
    const b = $(`#box_${k}`);
    if (b) b.style.display = "none";
  });
  function show(k, lbl) {
    const b = $(`#box_${k}`);
    const l = $(`#lbl_${k}`);
    if (b) b.style.display = "";
    if (l && lbl) l.innerHTML = lbl;
  }
  if (ehAlteracao && !azul) {
    show("dem_atual", 'Demanda Atual (kW) <span class="req">*</span>');
    show("dem_futura", 'Demanda Futura (kW) <span class="req">*</span>');
  } else if (ehAlteracao && azul) {
    show(
      "dem_ponta_atual",
      'Demanda Ponta Atual (kW) <span class="req">*</span>',
    );
    show("dem_ponta_futura", 'Ponta Futura (kW) <span class="req">*</span>');
    show(
      "dem_foraponta_atual",
      'Fora de Ponta Atual (kW) <span class="req">*</span>',
    );
    show(
      "dem_foraponta_futura",
      'Fora de Ponta Futura (kW) <span class="req">*</span>',
    );
  } else if (!ehAlteracao && !azul) {
    show("dem_atual", 'Informar demanda em kW <span class="req">*</span>');
  } else {
    show("dem_ponta_atual", 'Demanda Ponta (kW) <span class="req">*</span>');
    show(
      "dem_foraponta_atual",
      'Demanda Fora de Ponta (kW) <span class="req">*</span>',
    );
  }
  reaplicarMarcadores();
}
function validarDemandas() {
  if (state.monomia === "Sim") {
    $("#demandaAlert").innerHTML = "";
    return [];
  }
  const azul = state.modalidade === "Azul";
  const ehAlteracao =
    state.finalidade === "Aumento de Demanda" ||
    state.finalidade === "Redução de Demanda";
  const out = [];
  let dAtual, dFutura;
  if (azul) {
    const pa = parseFloat($("[data-k=dem_ponta_atual]")?.value) || 0;
    const fa = parseFloat($("[data-k=dem_foraponta_atual]")?.value) || 0;
    const pf = parseFloat($("[data-k=dem_ponta_futura]")?.value) || 0;
    const ff = parseFloat($("[data-k=dem_foraponta_futura]")?.value) || 0;
    dAtual = pa || fa ? String(pa + fa) : "";
    dFutura = pf || ff ? String(pf + ff) : "";
  } else {
    dAtual = $("[data-k=dem_atual]")?.value || "";
    dFutura = $("[data-k=dem_futura]")?.value || "";
  }
  if (!ehAlteracao) {
    const rNova = CalculoMT.validarDemandaConexaoNova(dAtual, state.finalidade);
    if (rNova.nivel) out.push(rNova);
  }
  const rPot = CalculoMT.validarDemandaVsPotencia(dAtual, state.potTotalTrafos);
  if (rPot.nivel) out.push(rPot);
  if (ehAlteracao && dFutura) {
    const rPotFut = CalculoMT.validarDemandaVsPotencia(
      dFutura,
      state.potTotalTrafos,
    );
    if (rPotFut.nivel) out.push(rPotFut);
  }
  if (ehAlteracao && dAtual && dFutura) {
    const rFut = CalculoMT.validarDemandaFuturaVsAtual(
      state.finalidade,
      dAtual,
      dFutura,
    );
    if (rFut.nivel) out.push(rFut);
  }
  $("#demandaAlert").innerHTML = out
    .map((r) => alertHTML("err", r.msg))
    .join("");
  return out;
}

/* ===== Demanda Escalonada ===== */
let escalonada = [];
function addEscalonada() {
  escalonada.push({ demanda: "", ponta: "", foraponta: "", inicio: "" });
  renderEscalonada();
}
function delEscalonada(i) {
  escalonada.splice(i, 1);
  renderEscalonada();
}
function renderEscalonada() {
  const azul = state.modalidade === "Azul";
  const head = $("#escalonadaHead"),
    body = $("#escalonadaBody");
  if (!head || !body) return;
  head.innerHTML = azul
    ? '<tr><th>Ponta (kW)</th><th>Fora de Ponta (kW)</th><th>Início de Uso</th><th style="width:46px"></th></tr>'
    : '<tr><th>Demanda Futura (kW)</th><th>Início de Uso</th><th style="width:46px"></th></tr>';
  body.innerHTML = "";
  escalonada.forEach((e, i) => {
    const tr = document.createElement("tr");
    tr.innerHTML = azul
      ? `<td><input type="number" step="any" value="${e.ponta}" placeholder="kW" oninput="escalonada[${i}].ponta=this.value"></td>
         <td><input type="number" step="any" value="${e.foraponta}" placeholder="kW" oninput="escalonada[${i}].foraponta=this.value"></td>
         <td><input type="month" value="${e.inicio}" oninput="escalonada[${i}].inicio=this.value"></td>
         <td><button class="btn-del" onclick="delEscalonada(${i})">×</button></td>`
      : `<td><input type="number" step="any" value="${e.demanda}" placeholder="kW" oninput="escalonada[${i}].demanda=this.value"></td>
         <td><input type="month" value="${e.inicio}" oninput="escalonada[${i}].inicio=this.value"></td>
         <td><button class="btn-del" onclick="delEscalonada(${i})">×</button></td>`;
    body.appendChild(tr);
  });
}

/* ===== Alteração: troca de SE ===== */
function onTrocaSE() {
  state.alt_troca = $("#alt_troca").value;
  $("#alt_tipoParaBox").style.display = state.alt_troca === "Sim" ? "" : "none";
  $("#seGalleryBox_para").style.display =
    state.alt_troca === "Sim" ? "block" : "none";
  $("#alt_tipoAtualLbl").innerHTML =
    state.alt_troca === "Sim"
      ? 'Tipo de Subestação (De) <span class="req">*</span>'
      : 'Tipo de Subestação atual <span class="req">*</span>';
  reaplicarMarcadores();
  recalcRamal();
}

/* ===== Geração ===== */
function onGeracao(t) {
  if (t === "mom") {
    state.gerMomentaneo = event.target.value;
    const sim = state.gerMomentaneo === "Sim";
    $("#gerMomPotBox").style.display = sim ? "" : "none";
    // Aviso contextual (migrado da orientação nº 6): geração em paralelismo
    // momentâneo (gerador a diesel) deve ser informada no pedido.
    const av = $("#gerMomAviso");
    if (av) {
      av.innerHTML = sim
        ? alertHTML(
            "warn",
            "A geração em paralelismo momentâneo (gerador a diesel) deve ser informada à CEMIG. Informe a potência da geração para prosseguir.",
          )
        : "";
      av.style.display = sim ? "" : "none";
    }
  }
  if (t === "grid") {
    state.gridZero = event.target.value;
    const sim = state.gridZero === "Sim";
    $("#gridZeroPotBox").style.display = sim ? "" : "none";
    // Aviso contextual (migrado da orientação nº 6): GRID ZERO (paralelismo
    // permanente sem injeção) deve ser informado, com a potência da geração.
    const av = $("#gridZeroAviso");
    if (av) {
      av.innerHTML = sim
        ? alertHTML(
            "warn",
            "Geração em paralelismo permanente sem injeção na rede (GRID ZERO) deve ser informada à CEMIG. Informe a potência da geração para prosseguir.",
          )
        : "";
      av.style.display = sim ? "" : "none";
    }
  }
}

/* ===== RAMAL — galeria visual ===== */
function tipoSEefetivo() {
  if (state.finalidade === "Conexão Nova") return state.cn_tipoSE;
  if (state.alt_troca === "Sim") return $("#alt_tipoPara")?.value;
  return $("#alt_tipoAtual")?.value;
}
function recalcRamal() {
  state.cn_tipoSE = $("#cn_tipoSE")?.value || state.cn_tipoSE;
  const tipoSE = tipoSEefetivo();
  const g = CalculoMT.grupoRamal({
    finalidade: state.finalidade,
    localizacao: state.localizacao,
    trocaSE: state.alt_troca,
    tipoSE,
  });
  const gallery = $("#ramalGallery"),
    empty = $("#ramalEmpty");
  if (!g.indices.length) {
    gallery.innerHTML = "";
    empty.style.display = "block";
    return;
  }
  empty.style.display = "none";
  gallery.innerHTML = g.indices
    .map((idx) => {
      const sel = ramalSelecionado === idx ? "selected" : "";
      return `<div class="ramal-card ${sel}" onclick="selectRamal(${idx})">
      <div class="imgwrap"><img src="${RAMAL_IMGS[idx] || ""}" alt="Ramal ${idx}"><span class="check">✓</span></div>
      <div class="desc">${CalculoMT.textoRamal(idx).replace(/·/g, "<br>·")}</div></div>`;
    })
    .join("");
}
function selectRamal(idx) {
  ramalSelecionado = idx;
  state.ramalIndice = idx;
  recalcRamal();
}

/* ===== Helpers de alerta (banner canônico .cmg-aviso do shared.css) ===== */
function alertHTML(tipo, msg) {
  const mod =
    tipo === "err"
      ? " cmg-aviso--error"
      : tipo === "warn"
        ? " cmg-aviso--warn"
        : "";
  return `<div class="cmg-aviso${mod}"><div class="cmg-aviso-icon" aria-hidden="true"></div><div class="cmg-aviso-texto">${msg}</div></div>`;
}

/* ===== Validação de campos obrigatórios (gate de exportação) ===== */
// Considera "irrelevante" um elemento dentro de um bloco condicional oculto via
// style.display (ex.: blocoRural quando Urbana). Ignora a troca de página (.page),
// que usa classe CSS, não style inline, para não excluir campos de outras etapas.
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
  // Varre os controles marcados como obrigatórios ([data-req] — o aplicar()
  // dos marcadores converte o "*" dos rótulos nesse atributo). A visibilidade
  // é avaliada pelo .field (os selects espelhados pelos cards ficam com
  // display:none, mas o campo em si está visível).
  $$("[data-req]").forEach((ctrl) => {
    const field = ctrl.closest(".field");
    if (!elementoRelevante(field || ctrl)) return;
    const v = String(state[ctrl.dataset.k] ?? ctrl.value ?? "").trim();
    if (!v) {
      const label = field && field.querySelector("label");
      faltando.push(
        label
          ? label.textContent.replace(/\*|\(opcional\)/g, "").trim()
          : ctrl.dataset.k,
      );
    }
  });
  const blocoTrafos = $("#blocoTrafosIndividual");
  if (blocoTrafos && elementoRelevante(blocoTrafos)) {
    const ok =
      trafos.length > 0 &&
      trafos.every(
        (t) =>
          String(t.potencia).trim() !== "" &&
          String(t.quantidade).trim() !== "",
      );
    if (!ok) faltando.push("Transformador(es)");
  }
  if (state.compartilhada === "Sim") {
    const ok =
      cubiculos.length > 0 &&
      cubiculos.every(
        (c) =>
          c.trafos.length > 0 &&
          c.trafos.every(
            (t) =>
              String(t.potencia).trim() !== "" &&
              String(t.quantidade).trim() !== "",
          ),
      );
    if (!ok)
      faltando.push(
        "Transformadores dos cubículos da subestação compartilhada",
      );
  }
  if (state.ramalIndice == null) faltando.push("Ramal de Entrada");
  if (state.restricaoAmbiental === "Sim" && !state.restricaoAceite)
    faltando.push("Declaração de ciência da restrição ambiental");
  return [...new Set(faltando)];
}
function atualizarGateExportacao() {
  const faltando = camposObrigatoriosFaltando();
  // Regra 3: validações bloqueantes (ex.: demanda contratada/futura > potência
  // total instalada dos transformadores) impedem a geração do PDF e o envio do
  // formulário — não apenas exibem alerta na etapa de dados.
  const errosValidacao = (validarDemandas() || []).filter(
    (r) => r.nivel === "erro",
  );
  const box = $("#exportAlert");
  const mini = $("#exportProgressMini");
  const partes = [];
  if (faltando.length)
    partes.push(
      "Preencha os campos obrigatórios antes de exportar: " +
        faltando.join(", ") +
        ".",
    );
  errosValidacao.forEach((e) => partes.push(e.msg));
  if (box)
    box.innerHTML = partes.length
      ? partes.map((m) => alertHTML("err", m)).join("")
      : "";
  const bloqueado = faltando.length > 0 || errosValidacao.length > 0;
  if (mini)
    mini.textContent = bloqueado
      ? faltando.length
        ? "Faltam campos obrigatórios"
        : "Há erros de validação"
      : "Pronto para exportar";
  ["#btnExportarPDF", "#btnCartaMonomia"].forEach((sel) => {
    const b = $(sel);
    if (b) b.disabled = bloqueado;
  });
  return [...faltando, ...errosValidacao.map((e) => e.msg)];
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
function renderPreview() {
  syncState();
  const tipoSE = tipoSEefetivo();
  const secoes = [];

  // 1. Proprietário (etapa 2/page-1). Campos de PF só entram se preenchidos
  //    (CPF). Os telefones do RT ficam aqui (migrados da antiga Classificação).
  let propMT =
    pvCampo("Nome / Razão Social", state.nome, { full: true, step: 1 }) +
    pvCampo("E-mail do cliente", state.emailCliente, { step: 1 }) +
    pvCampo("Telefone do cliente", state.telCliente, { step: 1 }) +
    pvCampo("Telefone do solicitante", state.telSolicitante, { step: 1 }) +
    pvCampo("CPF/CNPJ", state.cpfCnpj, { step: 1 });
  if (state.filiacao)
    propMT += pvCampo("Filiação", state.filiacao, { step: 1 });
  if (state.rg) propMT += pvCampo("RG / RNE / RANI", state.rg, { step: 1 });
  if (state.nasc)
    propMT += pvCampo("Data de Nascimento", state.nasc, { step: 1 });
  if (state.laudoMedico)
    propMT += pvCampo("Laudo médico?", state.laudoMedico, { step: 1 });
  if (state.nis)
    propMT += pvCampo("NIS (Tarifa Social)?", state.nis, { step: 1 });
  if (state.nis === "Sim" && state.numNis)
    propMT += pvCampo("Número do NIS", state.numNis, { step: 1 });
  propMT += pvCampo("E-mail do solicitante", state.emailSolicitante, {
    full: true,
    step: 1,
  });
  propMT += pvCampo(
    "Tel. RT (cel/fixo)",
    [state.rtCelular, state.rtFixo].filter(Boolean).join(" / "),
    { step: 1 },
  );
  secoes.push(pvSecao("Dados do Proprietário", propMT));

  // 2. Correspondência (etapa 3/page-2) — mesma ordem/lógica do BT: recebe no
  // e-mail informado? + vencimento; só quando "Não" é que aparece COMO receber
  // a fatura, o endereço/e-mail alternativo e a conta globalizada.
  let cor =
    pvCampo("Receber fatura no e-mail informado?", state.receberEmail, {
      step: 2,
    }) +
    pvCampo(
      "Vencimento escolhido",
      state.desejaVenc === "Sim"
        ? "Sim — dia " + (state.diaVenc || "—")
        : state.desejaVenc,
      { step: 2 },
    );
  if (state.receberEmail === "Não") {
    cor += pvCampo("Como deseja receber a fatura?", state.formaCorresp, {
      step: 2,
    });
    if (state.formaCorresp === "Outro e-mail")
      cor += pvCampo("E-mail para envio da fatura", state.emailCorresp, {
        full: true,
        step: 2,
      });
    else if (state.formaCorresp === "Endereço da obra") {
      const endObra = [
        [state.urb_endereco, state.urb_num].filter(Boolean).join(", "),
        state.urb_compl,
        state.urb_bairro,
        state.uc_municipio,
        state.uc_estado,
        state.uc_cep,
      ]
        .filter(Boolean)
        .join(", ");
      cor += pvCampo(
        "Endereço da fatura",
        "Mesmo da unidade consumidora — " + endObra,
        { full: true, step: 2 },
      );
    } else if (
      state.formaCorresp === "Novo endereço" ||
      state.formaCorresp === "Agência Correios(Caixa Postal)"
    )
      cor += pvCampo(
        "Endereço da fatura",
        [
          state.ec_rua,
          state.ec_num,
          state.ec_bairro,
          state.ec_municipio,
          state.ec_estado,
          state.ec_cep,
        ]
          .filter(Boolean)
          .join(", "),
        { full: true, step: 2 },
      );
    if (state.possuiContaGlobal)
      cor += pvCampo("Possui conta globalizada?", state.possuiContaGlobal, {
        step: 2,
      });
    if (state.possuiContaGlobal === "Sim" && state.contaGlobalizada)
      cor += pvCampo("Conta globalizada", state.contaGlobalizada, { step: 2 });
  }
  secoes.push(pvSecao("Correspondência", cor));

  // 4. Unidade Consumidora (etapa 3)
  let uc =
    pvCampo("Atividade", state.atividade, { step: 3 }) +
    pvCampo("Ramo", state.ramoAtividade, { step: 3 }) +
    pvCampo("Localização", state.localizacao, { step: 3 }) +
    pvCampo("CEP", state.uc_cep, { step: 3 }) +
    pvCampo(
      "Município / Estado",
      [state.uc_municipio, state.uc_estado].filter(Boolean).join(" / "),
      { step: 3 },
    ) +
    pvCampo(
      "Coordenadas",
      [state.latitude, state.longitude].filter(Boolean).join(" , "),
      { step: 3 },
    );
  if (state.utm) uc += pvCampo("Coordenada UTM", state.utm, { step: 3 });
  if (state.finalidade && state.finalidade !== "Conexão Nova")
    uc += pvCampo(
      "Coordenadas novas",
      [state.latitudeNova, state.longitudeNova].filter(Boolean).join(" , "),
      { step: 3 },
    );
  if (state.localizacao === "Urbana")
    uc += pvCampo(
      "Endereço",
      [state.urb_endereco, state.urb_num, state.urb_bairro, state.urb_compl]
        .filter(Boolean)
        .join(", "),
      { full: true, step: 3 },
    );
  if (state.localizacao === "Rural")
    uc += pvCampo(
      "Distrito / Propriedade",
      [state.rur_distrito, state.rur_propriedade].filter(Boolean).join(" / "),
      { full: true, step: 3 },
    );
  // Restrição ambiental só aparece na prévia quando HÁ restrição (igual ao form).
  if (state.restricaoAmbiental === "Sim" && state.restricoesTexto)
    uc += pvCampo(
      "Área de restrição ambiental",
      `<span class="restricao-destaque">${state.restricoesTexto}</span>`,
      { full: true, step: 3 },
    );
  uc += pvCampo("Subestação pronta?", state.subPronta, { step: 3 });
  secoes.push(pvSecao("Unidade Consumidora", uc));

  // 4. Dados Técnicos (etapa 5). Começa pela Classificação do Atendimento
  //    (Opção/Finalidade/Nº instalação), migrada da antiga etapa própria.
  let tec =
    pvCampo("Opção de Atendimento", state.opcaoAtend, { step: 4 }) +
    pvCampo("Finalidade", state.finalidade, { step: 4 });
  if (state.finalidade && state.finalidade !== "Conexão Nova")
    tec += pvCampo("Nº da Instalação", state.numInstalacao, { step: 4 });
  tec +=
    pvCampo(
      "Nível de tensão MT",
      state.tensaoMT ? state.tensaoMT.replace(".", ",") + " kV" : "",
      { step: 4 },
    ) + pvCampo("Compartilhada?", state.compartilhada, { step: 4 });
  if (state.compartilhada === "Sim") {
    tec += pvCampo(
      "Soma dos transformadores (kVA)",
      fmt(state.potTotalTrafos),
      { step: 4 },
    );
    tec += pvCampo("Soma das demandas (kW)", fmt(state.demandaTotalCubiculos), {
      step: 4,
    });
    tec += pvCampo("Tipo de Subestação", tipoSE, { step: 4 });
  } else {
    // tabela trafos
    if (trafos.length) {
      let tt =
        '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Trafo</th><th>Pot (kVA)</th><th>Qtde</th><th>Rel. Imag/In</th></tr></thead><tbody>';
      trafos.forEach((t, i) => {
        tt += `<tr><td>TRF${String(i + 1).padStart(2, "0")}</td><td>${t.potencia || "—"}</td><td>${t.quantidade || "—"}</td><td>${t.relacao || "—"}</td></tr>`;
      });
      tt += `</tbody><tfoot><tr><td>Σ</td><td>${fmt(state.potTotalTrafos)}</td><td>${state.qtdTotalTrafos || 0}</td><td></td></tr></tfoot></table></div>`;
      tec += pvCampo("Transformadores", tt, { full: true, step: 4 });
    }
    if (motores.length) {
      let mtt =
        '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Tipo</th><th>CV</th><th>FP</th><th>η</th><th>V</th><th>Ip/In</th><th>I nom</th><th>I part</th></tr></thead><tbody>';
      motores.forEach((m) => {
        const c = CalculoMT.calcularMotor(
          {
            potenciaCV: m.cv,
            fp: m.fp,
            rendimento: m.rend,
            tensaoV: m.volts,
            relacaoIpIn: m.ipIn,
          },
          parseFloat(state.tensaoMT),
        );
        mtt += `<tr><td>${m.tipo || "—"}</td><td>${m.cv || "—"}</td><td>${m.fp || "—"}</td><td>${m.rend || "—"}</td><td>${m.volts || "—"}</td><td>${m.ipIn || "—"}</td><td>${fmt(c.iNominal)}</td><td>${fmt(c.iPartida)}</td></tr>`;
      });
      mtt += "</tbody></table></div>";
      tec += pvCampo("Motores", mtt, { full: true, step: 4 });
    }
    tec += pvCampo("Tipo de Subestação", tipoSE, { step: 4 });
    if (state.finalidade !== "Conexão Nova")
      tec += pvCampo("Troca de Subestação?", state.alt_troca, { step: 4 });
    tec +=
      pvCampo("Tarifa monômia?", state.monomia, { step: 4 }) +
      pvCampo("Modalidade tarifária", state.modalidade, { step: 4 }) +
      pvCampo("Demanda escalonada?", state.escalonada, { step: 4 });
    const azulPv = state.modalidade === "Azul";
    const ehAltPv =
      state.finalidade === "Aumento de Demanda" ||
      state.finalidade === "Redução de Demanda";
    if (azulPv) {
      tec += pvCampo("Demanda Ponta Atual (kW)", state.dem_ponta_atual, {
        step: 4,
      });
      if (ehAltPv)
        tec += pvCampo("Ponta Futura (kW)", state.dem_ponta_futura, {
          step: 4,
        });
      tec += pvCampo("Fora de Ponta Atual (kW)", state.dem_foraponta_atual, {
        step: 4,
      });
      if (ehAltPv)
        tec += pvCampo(
          "Fora de Ponta Futura (kW)",
          state.dem_foraponta_futura,
          { step: 4 },
        );
    } else {
      tec += pvCampo(
        ehAltPv ? "Demanda Atual (kW)" : "Demanda (kW)",
        state.dem_atual,
        { step: 4 },
      );
      if (ehAltPv)
        tec += pvCampo("Demanda Futura (kW)", state.dem_futura, { step: 4 });
    }
    if (escalonada.length) {
      let et = azulPv
        ? '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Ponta (kW)</th><th>Fora-ponta (kW)</th><th>Início de Uso</th></tr></thead><tbody>'
        : '<div class="tbl-scroll"><table class="tbl"><thead><tr><th>Demanda Futura (kW)</th><th>Início de Uso</th></tr></thead><tbody>';
      escalonada.forEach((e) => {
        et += azulPv
          ? `<tr><td>${e.ponta || "—"}</td><td>${e.foraponta || "—"}</td><td>${e.inicio || "—"}</td></tr>`
          : `<tr><td>${e.demanda || "—"}</td><td>${e.inicio || "—"}</td></tr>`;
      });
      et += "</tbody></table></div>";
      tec += pvCampo("Demanda Escalonada", et, { full: true, step: 4 });
    }
  }
  secoes.push(pvSecao("Dados Técnicos", tec));

  // Cubículos (etapa 4)
  if (cubiculos.length) {
    let cub = "";
    cubiculos.forEach((c, i) => {
      const rt = CalculoMT.calcularTrafos(c.trafos);
      cub += pvCampo(`Cubículo ${i + 1} — Nº Instalação`, c.instalacao, {
        step: 4,
      });
      cub += pvCampo(
        `Cubículo ${i + 1} — Transformadores`,
        `${fmt(rt.potenciaTotal)} kVA / ${rt.quantidadeTotal} un.`,
        { step: 4 },
      );
      cub += pvCampo(`Cubículo ${i + 1} — Modalidade tarifária`, c.modalidade, {
        step: 4,
      });
      if (c.modalidade === "Azul") {
        cub += pvCampo(
          `Cubículo ${i + 1} — Demanda Ponta (kW)`,
          c.demandaPonta,
          { step: 4 },
        );
        cub += pvCampo(
          `Cubículo ${i + 1} — Demanda Fora de Ponta (kW)`,
          c.demandaForaPonta,
          { step: 4 },
        );
      } else {
        cub += pvCampo(`Cubículo ${i + 1} — Demanda (kW)`, c.demanda, {
          step: 4,
        });
      }
    });
    secoes.push(pvSecao("Cubículos da Subestação Compartilhada", cub));
  }

  // Geração + Ramal + Observações (etapa 4)
  let ger =
    pvCampo("Geração paralelismo momentâneo", state.gerMomentaneo, {
      step: 4,
    }) +
    pvCampo("GRID ZERO", state.gridZero, { step: 4 }) +
    pvCampo("BT na mesma propriedade", state.btMesmaProp, { step: 4 });
  if (state.gerMomentaneo === "Sim")
    ger += pvCampo("Potência ger. momentânea (kVA)", state.gerMomentaneoPot, {
      step: 4,
    });
  if (state.gridZero === "Sim")
    ger += pvCampo("Potência GRID ZERO (kVA)", state.gridZeroPot, { step: 4 });
  secoes.push(pvSecao("Geração e Baixa Tensão", ger));

  const ramal =
    state.ramalIndice != null
      ? pvCampo(
          "Ramal de Entrada selecionado",
          `<img src="${RAMAL_IMGS[state.ramalIndice]}" style="max-width:100%;border:1px solid var(--cmg-neutral-200);border-radius:6px;margin-bottom:6px"><br>${CalculoMT.textoRamal(state.ramalIndice)}`,
          { full: true, step: 4 },
        )
      : pvCampo("Ramal de Entrada", "(não selecionado)", {
          full: true,
          step: 4,
        });
  secoes.push(pvSecao("Ramal de Entrada", ramal));

  if (state.observacoes)
    secoes.push(
      pvSecao(
        "Observações",
        pvCampo("Observações", state.observacoes, { full: true, step: 4 }),
      ),
    );

  $("#previewContent").innerHTML = secoes.join(PV_DIVISOR);
  const btnMonomia = $("#btnCartaMonomia");
  if (btnMonomia)
    btnMonomia.style.display = state.monomia === "Sim" ? "" : "none";
  renderIrrigacaoOpcionalCard();
  const alertaMotores = $("#alertaMotoresPesados");
  if (alertaMotores) {
    const idxs = motoresPesadosIdx();
    alertaMotores.innerHTML = idxs.length
      ? alertHTML(
          "warn",
          `A solicitação possui ${idxs.length} motor(es) pesado(s) que exige(m) mais informações, favor preencher o formulário: <button type="button" class="btn btn-primary no-print" style="margin-left:8px" onclick="abrirAnaliseMotores()">Preencher Análise de Partida</button>`,
        )
      : "";
  }
  atualizarGateExportacao();
}
function syncState() {
  $$("[data-k]").forEach((el) => {
    state[el.dataset.k] = el.value;
  });
}

/* ===== CEP autopreenchimento ===== */
async function buscarCEP(cep) {
  cep = cep.replace(/\D/g, "");
  if (cep.length !== 8) return null;
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cep/v2/${cep}`);
    if (r.ok) {
      const d = await r.json();
      const coords = d.location?.coordinates;
      return {
        logradouro: d.street || "",
        bairro: d.neighborhood || "",
        cidade: d.city || "",
        uf: d.state || "",
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
      };
    }
  } catch (_) {}
  try {
    const r = await fetch(`https://viacep.com.br/ws/${cep}/json/`);
    if (r.ok) {
      const d = await r.json();
      if (d.erro) return null;
      return {
        logradouro: d.logradouro || "",
        bairro: d.bairro || "",
        cidade: d.localidade || "",
        uf: d.uf || "",
        latitude: null,
        longitude: null,
      };
    }
  } catch (_) {}
  return null;
}
// oninput do CEP da UC: máscara em tempo real e busca automática ao completar
// 8 dígitos (como no BT — bt/js/views/dados-unidade.js), sem esperar o blur.
let _cepUcBuscado = "";
function onCepUcInput(el) {
  el.value = mascararCEP(el.value);
  state.uc_cep = el.value;
  const d = CalculoMT.soDigitos(el.value);
  if (d.length === 8) {
    if (_cepUcBuscado !== d) {
      _cepUcBuscado = d;
      onCEP("uc");
    }
  } else {
    _cepUcBuscado = "";
    const st = $("#cep-status-uc");
    if (st) {
      st.textContent = "";
      st.className = "field-hint";
    }
  }
}
function _setField(k, v) {
  const el = $(`[data-k="${k}"]`);
  if (!el || v == null) return;
  el.value = v;
  el.dispatchEvent(new Event("input"));
}
async function onCEP(prefixo) {
  const st = $(`#cep-status-${prefixo}`);
  if (st) {
    st.textContent = "buscando…";
    st.className = "field-hint";
  }
  const cepEl = $(`[data-k="${prefixo === "uc" ? "uc_cep" : "ec_cep"}"]`);
  const d = await buscarCEP(cepEl?.value || "");
  if (!d) {
    if (st) {
      st.textContent = "CEP não encontrado";
      st.className = "field-hint field-err";
    }
    return;
  }
  if (st) {
    st.textContent = "Endereço encontrado";
    st.className = "field-hint field-ok";
  }
  if (prefixo === "uc") {
    _setField("uc_municipio", d.cidade);
    _setField("uc_estado", d.uf);
    if (state.localizacao === "Urbana") {
      _setField("urb_endereco", d.logradouro);
      _setField("urb_bairro", d.bairro);
    }
    // O CEP NÃO define coordenadas (igual BT): o centroide do CEP é impreciso
    // e travava o refinamento pelo número (guard _nDig em geocodificarEnderecoMT).
    // O pin vem da geocodificação estruturada por endereço+número; se o número
    // já estiver preenchido, refina imediatamente.
    onEnderecoUrbanoMT();
  } else {
    _setField("ec_rua", d.logradouro);
    _setField("ec_bairro", d.bairro);
    _setField("ec_municipio", d.cidade);
    _setField("ec_estado", d.uf);
  }
}

/* ===== Exportar PDF ===== */
function exportarPDF() {
  if (atualizarGateExportacao().length) {
    goTo(5);
    return;
  }
  window.print();
}

/* ===== Modal Anexo II ===== */
function abrirAnexoII() {
  $("#modalAnexo").classList.add("show");
}
function fecharAnexoII() {
  $("#modalAnexo").classList.remove("show");
}

/* ===== Init ===== */
function aplicarAtividadeDaURL() {
  const v = new URLSearchParams(location.search).get("atividade");
  if (!v || !ATIVIDADES.includes(v)) return;
  const sel = $("#f_atividade");
  sel.value = v;
  sel.dispatchEvent(new Event("change"));
}
document.addEventListener("DOMContentLoaded", () => {
  fillAtividades();
  bindInputs();
  inicializarCamposCards();
  addTrafo(); // começa com 1 linha de trafo
  aplicarAtividadeDaURL();
  // Normaliza rótulos/obrigatoriedade das coordenadas (opcional em zona
  // urbana, obrigatória em rural — regra do BT) após montar os cards.
  updateCoordHint();
  // stepper clicável — navegação LIVRE (não bloqueia por obrigatórios).
  $$(".vstep").forEach((s, i) =>
    s.addEventListener("click", () => goTo(i, true)),
  );
  // reaplica a convenção de marcadores nos campos montados dinamicamente
  if (window.CemigMarcadores) {
    window.CemigMarcadores.aplicar();
    window.CemigMarcadores.montarNavReativa();
  }
});
