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
      // Zona de localização — sem valor padrão: a etapa revela em cascata
      // (atividade + ramo → Localização → zona escolhida → endereço), então
      // a zona precisa ser uma escolha real do usuário, não um pré-preenchido.
      chave: "localizacao",
      gridId: "cardsLocalizacao",
      opcoes: [
        { valor: "Urbana", texto: "Urbana" },
        { valor: "Rural", texto: "Rural" },
      ],
    },
    // "tensaoMT" não entra aqui: o nível de tensão da rede MT é um <select>
    // nativo (dropdown), não cards — as três opções não têm o mesmo peso de
    // escolha rápida dos demais campos e o rótulo flutuante já basta.
    // "modalidade" saiu daqui: os cards passaram a ser montados em JS —
    // _instalacaoModalidadeCardsHTML (não-compartilhada, uma para toda a
    // instalação) e _cubiculoModalidadeCardsHTML (um por cubículo).
  ],
  // Campo especial "Dia do vencimento": substitui a antiga pergunta
  // "Deseja escolher data de vencimento?" — escolher um dia define
  // desejaVenc='Sim'. Informar a data é OPCIONAL: não há card de recusa
  // ("Não informar"); deixar em branco já significa não escolher, e
  // clicar de novo no dia ativo desmarca (desejaVenc='Não').
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
let trafos = []; // {potencia, quantidade, relacao, demanda} — 1 card = 1 trafo
let trafosAbertos = new Set([0]); // índices dos cards expandidos (acordeão)
let motores = []; // {tipo, cv, fp, rend, volts, ipIn, tempo, dispositivo}
let motoresAbertos = new Set([0]); // índices dos cards expandidos (acordeão)
let cubiculos = []; // Anexo I — cubículos adicionais da subestação compartilhada
// {instalacao, trafos:[{potencia,quantidade,relacao}], modalidade, demanda, demandaPonta, demandaForaPonta}
let ramalSelecionado = null;
let mapaObra = null; // instância Leaflet da UC (lazy, etapa "Empreendimento")
// Pinos arrastáveis, em caixas para que _sincronizarPino() possa criá-los.
const _refPinoObra = { pino: null }; // sincronizado com state.latitude/longitude
let restricaoLayer = null; // contorno das reservas ambientais desenhado no mapa
let _mapaObraDebounce = null;
// Mapa do NOVO local da subestação (só com mudancaLocal === "Sim").
let mapaNovo = null;
const _refPinoNovo = { pino: null }; // state.latitudeNova/longitudeNova
let _mapaNovoDebounce = null;

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
      // Campo opcional: clicar no dia já ativo desmarca (volta a "sem data
      // escolhida"), que é o caminho para desfazer sem um card de recusa.
      grid.appendChild(
        _campoCardBotao(d.texto, null, ativo, false, () =>
          ativo ? aplicar("", "Não") : aplicar(d.valor, "Sim"),
        ),
      );
    });
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
  // Mapa do novo local: mesma detecção por container, mas só quando o bloco
  // condicional está de fato aberto (mudança de local = "Sim").
  if ($("#page-" + n).querySelector("#mapNovo") && _mudancaLocalAtiva()) {
    initMapaNovo();
    if (mapaNovo) setTimeout(() => mapaNovo.invalidateSize(), 50);
  }
  if (n === 8) renderPreview();
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
    // Ramo de atividade: lista com filtro de digitação. O campo mostra só a
    // descrição; state.ramoAtividade guarda "código - descrição" (o código
    // não é escolhido pelo usuário, mas sai no PDF).
    if (k === "ramoAtividade") {
      el.value = ramoDescricao(state[k]);
      ramoAtivAttach(el, (v) => {
        state[k] = v;
        atualizarCascataUC();
        if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
      });
      return;
    }
    if (state[k] != null && el.value === "") el.value = state[k];
    el.addEventListener("input", () => {
      state[k] = el.value;
    });
    el.addEventListener("change", () => {
      state[k] = el.value;
    });
  });
}

/* ===== Etapa "Tipo de atendimento": finalidade =====
   O select vive na etapa 4, mas controla blocos da etapa 5 (Subestação):
   #instalBox, #blocoSubestacaoNova e #blocoSubestacaoAlteracao. */
function onFinalidade() {
  const v = $("#f_finalidade").value;
  state.finalidade = v;
  const box = $("#instalBox");
  if (v && v !== "Conexão Nova") {
    // "" (não "block"): #instalBox agora é um .field padrão dentro do grid —
    // restaura o display da folha de estilo.
    box.style.display = "";
    _setReq(["numInstalacao"], true);
  } else {
    box.style.display = "none";
    // Conexão Nova (ou finalidade em branco) não tem instalação anterior:
    // além de esconder, descarta o valor para não vazar no PDF/prévia.
    _setReq(["numInstalacao"], false);
    const inst = $("[data-k=numInstalacao]");
    if (inst) inst.value = "";
    state.numInstalacao = "";
    // Sem finalidade "de alteração" não existe pergunta de mudança de local:
    // zera a resposta para que updateCoordHint() feche o bloco do novo local.
    const selMud = $("#f_mudancaLocal");
    if (selMud) selMud.value = "";
    state.mudancaLocal = "";
  }
  // mostra a galeria de subestação da conexão nova ou a da alteração
  const ehNova = v === "Conexão Nova";
  atualizarVisibilidadeSE();
  // Em Conexão Nova não existe trafo a substituir: descarta a marcação e os
  // valores novos para que não vazem no cálculo nem no PDF.
  if (ehNova) {
    const limpar = (t) => {
      t.substituir = false;
      t.situacao = "novo"; // idem nos trafos de cubículo (3 situações)
      t.novaPotencia = "";
      t.novaDemanda = "";
    };
    trafos.forEach(limpar);
    cubiculos.forEach((c) => {
      c.existente = false;
      c.trafos.forEach(limpar);
    });
  }
  renderTrafos(); // os radios de troca aparecem/somem conforme a finalidade
  updateCoordHint();
  recalcTecnico();
  if (state.compartilhada === "Sim") renderCubiculos();
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
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
// Como deseja receber a fatura? (dropdown único, mesma lógica do BT):
//  - E-mail informado → mostra o e-mail do proprietário (somente leitura)
//  - Novo endereço / Agência Correios → endereço de correspondência (ec_*)
//  - Endereço da obra → usa o endereço da UC (aviso, sem campos próprios)
//  - Outro e-mail → e-mail alternativo
//  - Conta globalizada → pede o número da conta globalizada
function onCorresp() {
  const sel = $('select[data-k="formaCorresp"]');
  const v = sel ? sel.value : "";
  state.formaCorresp = v;
  const ehEndereco =
    v === "Novo endereço" || v === "Agência Correios(Caixa Postal)";
  const informado = $("#corrEmailInformadoBox");
  if (informado) {
    informado.style.display = v === "E-mail informado" ? "" : "none";
    // Espelha o e-mail do proprietário no campo (somente leitura).
    const inp = $('[data-k="emailCliente"]', informado);
    if (inp) inp.value = state.emailCliente || "";
  }
  $("#correspEmailBox").style.display = v === "Outro e-mail" ? "" : "none";
  // "" (não "block") restaura o display:grid do .grid grid-2 (shared.css) — um
  // "block" inline sobrescreveria a grade e empilharia os campos em 1 coluna.
  $("#endCorrespBox").style.display = ehEndereco ? "" : "none";
  const obra = $("#correspObraBox");
  if (obra) obra.style.display = v === "Endereço da obra" ? "" : "none";
  const global = $("#contaGlobalBox");
  if (global) global.style.display = v === "Conta globalizada" ? "" : "none";
  if (v !== "Conta globalizada") {
    state.contaGlobalizada = "";
    const inp = $('input[data-k="contaGlobalizada"]');
    if (inp) inp.value = "";
  }
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
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
// Revelação em cascata da Etapa 3: o endereço só faz sentido depois de
// caracterizada a UC. Enquanto atividade e ramo não estiverem preenchidos, o
// card de Localização fica oculto; enquanto a zona não for escolhida, nenhum
// bloco de endereço aparece (blocoUrbano/blocoRural seguem sob onLocalizacao).
function _ucIdentificada() {
  return (
    !!String(state.atividade || "").trim() &&
    !!String(state.ramoAtividade || "").trim()
  );
}
function atualizarCascataUC() {
  const pronto = _ucIdentificada();
  const zona = $("#blocoZona");
  if (zona) zona.style.display = pronto ? "" : "none";
  // Zona escondida não pode continuar comandando os blocos de endereço: sem
  // isto, um preenchimento seguido de limpeza da atividade deixaria o endereço
  // visível sem a zona correspondente na tela.
  if (!pronto) {
    $("#blocoUrbano").style.display = "none";
    $("#blocoRural").style.display = "none";
    const mapa = $("#blocoMapaCoord");
    if (mapa) mapa.style.display = "none";
  } else {
    onLocalizacao();
  }
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
  atualizarCascataUC();
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
  // Mapa/coordenadas fecham a cascata: dependem da zona (v) além de atividade
  // e ramo, já garantidos por quem chama daqui.
  const blocoMapa = $("#blocoMapaCoord");
  if (blocoMapa) {
    // O Leaflet nasce com 0px quando criado em container display:none, mas o
    // ResizeObserver de _criarMapa() dispara o invalidateSize() assim que o
    // bloco ganha largura — nenhum ajuste extra é necessário aqui.
    blocoMapa.style.display = !!v && _ucIdentificada() ? "" : "none";
  }
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
// Marca/desmarca a obrigatoriedade real (data-req) de um conjunto de campos —
// o aplicar() dos marcadores nunca REMOVE data-req, então o toggle é aqui.
// O rótulo também é sincronizado: o aplicar() roda no load, quando um bloco
// condicional ainda está oculto, e carimba "(opcional)" de forma permanente —
// sem esta limpeza um campo que vira obrigatório continuaria exibindo o
// sufixo errado (e o inverso deixaria o campo opcional sem sufixo nenhum).
function _setReq(chaves, req) {
  chaves.forEach((k) => {
    const el = $(`[data-k=${k}]`);
    if (!el) return;
    if (req) el.setAttribute("data-req", "");
    else {
      el.removeAttribute("data-req");
      el.classList.remove("is-invalid");
    }
    const campo = el.closest(".field");
    const label = campo && campo.querySelector(":scope > label");
    if (!label) return;
    const opt = label.querySelector(".opt");
    if (req) {
      if (opt) opt.remove();
    } else if (!opt) {
      const s = document.createElement("span");
      s.className = "opt";
      s.textContent = "(opcional)";
      label.append(" ", s);
    }
  });
}
function _setCoordReq(req) {
  _setReq(["latitude", "longitude"], req);
}
// Regra do bloco "novo local": ele só existe quando a finalidade NÃO é
// Conexão Nova (subestação já existente) E o usuário respondeu "Sim" em
// "Haverá mudança do local da subestação?".
function _mudancaLocalAtiva() {
  return (
    !!state.finalidade &&
    state.finalidade !== "Conexão Nova" &&
    state.mudancaLocal === "Sim"
  );
}
/* Endereço do NOVO local (etapa "Tipo de atendimento") — a zona é HERDADA da
   etapa 3 ("Localização"): a subestação se move dentro do mesmo imóvel, então
   não se pergunta a zona duas vezes. Só o bloco da zona escolhida aparece, e
   seus campos só são obrigatórios enquanto estão visíveis.
   Chamado por updateCoordHint() (mudança de local / finalidade) e por
   onLocalizacao() (troca de zona na etapa 3). */
const _REQ_URB_NOVO = [
  "nv_cep",
  "nv_endereco",
  "nv_num",
  "nv_bairro",
  "nv_municipio",
  "nv_estado",
];
const _REQ_RUR_NOVO = ["nv_municipio_rur", "nv_estado_rur"];
function sincronizarZonaNovoLocal() {
  const box = $("#blocoUrbanoNovo"),
    boxR = $("#blocoRuralNovo");
  if (!box || !boxR) return;
  // A etapa 3 já nasce com "Urbana" pré-selecionada, então a zona nunca fica
  // vazia na prática; ainda assim o `mudanca &&` mantém os dois blocos
  // fechados enquanto não há mudança de local declarada.
  const mudanca = _mudancaLocalAtiva();
  const zona = mudanca ? state.localizacao : "";
  box.style.display = zona === "Urbana" ? "block" : "none";
  boxR.style.display = zona === "Rural" ? "block" : "none";
  _setReq(_REQ_URB_NOVO, zona === "Urbana");
  _setReq(_REQ_RUR_NOVO, zona === "Rural");
}

/* Gate do botão "Avançar" da etapa "Tipo de atendimento"
   (data-gate="localNovoOk"). O data-req já cobre "coordenada nova em
   branco"; aqui entram as regras que ele não expressa: coordenada fora de
   faixa e novo local idêntico ao atual. */
window.localNovoOk = function () {
  if (!_mudancaLocalAtiva()) return true;
  // Sem zona definida na etapa 3 não há bloco de endereço para preencher —
  // o data-req não pega esse caso (os dois blocos ficam ocultos).
  if (!state.localizacao) return false;
  const lt = String(state.latitudeNova || "").trim(),
    lg = String(state.longitudeNova || "").trim();
  if (!lt || !lg) return false;
  if (CalculoMT.validarCoordenadas(lt, lg).nivel === "erro") return false;
  // Novo local igual ao atual: provável cópia acidental — não é mudança.
  return !(
    parseFloat(lt) === parseFloat(state.latitude) &&
    parseFloat(lg) === parseFloat(state.longitude)
  );
};

function updateCoordHint() {
  const ehNova = state.finalidade === "Conexão Nova";
  // "Haverá mudança do local?" só faz sentido para instalação existente —
  // em Conexão Nova não há local anterior. Enquanto a finalidade não é
  // escolhida, a pergunta fica oculta.
  const boxMud = $("#mudancaLocalBox");
  if (boxMud) boxMud.style.display = state.finalidade && !ehNova ? "" : "none";
  const mudanca = _mudancaLocalAtiva();
  // O antigo #coordHint foi removido do HTML: a orientação sobre as
  // coordenadas agora é dada pela .mapa-hint acima do mapa.
  // Obrigatoriedade igual ao BT: coordenada obrigatória em zona Rural. No MT
  // ela também é exigida quando há mudança do local da subestação (par
  // "atual"/"nova"); nos demais casos é opcional.
  const req = state.localizacao === "Rural" || mudanca;
  const sufixo = mudanca ? " atual" : "";
  const star = req ? ' <span class="req">*</span>' : "";
  $("#latLabel").innerHTML = "Latitude" + sufixo + star;
  $("#lonLabel").innerHTML = "Longitude" + sufixo + star;
  _setCoordReq(req);
  // Bloco do novo local (mapa + coordenadas novas): visível só com mudança.
  // As coordenadas novas são obrigatórias apenas enquanto ele está visível —
  // o validar() ignora campos ocultos, mas o data-req é removido mesmo assim
  // para que um bloco reaberto não herde .is-invalid de uma tentativa antiga.
  const box = $("#localNovoBox");
  if (box) box.style.display = mudanca ? "" : "none";
  _setReq(["latitudeNova", "longitudeNova"], mudanca);
  // Endereço do novo local: herda a zona da etapa 3.
  sincronizarZonaNovoLocal();
  if (mudanca) {
    initMapaNovo();
    // O container acabou de sair do display:none — o Leaflet precisa remedir.
    if (mapaNovo) setTimeout(() => mapaNovo.invalidateSize(), 60);
  }
  reaplicarMarcadores();
}
function onMudancaLocal() {
  state.mudancaLocal = $("#f_mudancaLocal")?.value || "";
  // Trocar para "Não" descarta as coordenadas novas: mantê-las em state
  // faria o PDF/prévia exibirem um local novo que o usuário já desistiu de
  // informar (mesma lógica de limpeza de zona em onLocalizacao).
  if (!_mudancaLocalAtiva()) {
    // Coordenadas + endereço do novo local são descartados juntos: o bloco
    // inteiro deixou de existir para este pedido.
    [
      "latitudeNova",
      "longitudeNova",
      "utmNova",
      ..._REQ_URB_NOVO,
      ..._REQ_RUR_NOVO,
      "nv_compl",
      "nv_distrito",
      "nv_propriedade",
      "nv_pontoReferencia",
      "nv_instalVizinho",
    ].forEach((k) => {
      const el = $(`[data-k=${k}]`);
      // "MG" é o default do Estado no HTML — restaura em vez de esvaziar.
      const padrao = k === "nv_estado" || k === "nv_estado_rur" ? "MG" : "";
      if (el) el.value = padrao;
      state[k] = padrao;
    });
    if (mapaNovo && _refPinoNovo.pino) {
      mapaNovo.removeLayer(_refPinoNovo.pino);
      _refPinoNovo.pino = null;
    }
    // Endereço zerado ⇒ zera também o cache anti-repetição da geocodificação,
    // senão reativar a mudança com o MESMO endereço não recriaria o pino.
    _mtLastGeoNovoKey = "";
    const al = $("#coordNovaAlert");
    if (al) al.innerHTML = "";
    const st = $("#cep-status-nv");
    if (st) {
      st.textContent = "";
      st.className = "field-hint";
    }
  }
  updateCoordHint();
  onCoord();
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
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

  // Coordenadas NOVAS (etapa "Tipo de atendimento"): validadas e exibidas em
  // alerta próprio (#coordNovaAlert), pois vivem em outra etapa — misturá-las
  // no #coordAlert mostraria o erro numa página onde o campo nem aparece.
  const latN = parseFloat(state.latitudeNova),
    lonN = parseFloat(state.longitudeNova);
  let errosNova = [];
  if (_mudancaLocalAtiva()) {
    const rNova = CalculoMT.validarCoordenadas(
      state.latitudeNova,
      state.longitudeNova,
    );
    if (rNova.nivel === "erro") errosNova.push(rNova.msg);
    if (!isNaN(latN) && !isNaN(lonN)) {
      const uN = latLonParaUTM(latN, lonN);
      const utmNovaEl = $("[data-k=utmNova]");
      if (utmNovaEl)
        utmNovaEl.value = `${uN.zona}${_utmBandLetter(latN)} E:${uN.easting} N:${uN.northing}`;
      // Novo local igual ao atual não é uma "mudança de local" — provável
      // cópia acidental das coordenadas atuais.
      if (!isNaN(lat) && !isNaN(lon) && latN === lat && lonN === lon)
        errosNova.push(
          "As coordenadas do novo local são idênticas às do local atual. Ajuste o pin no mapa para o novo ponto da subestação.",
        );
      sincronizarMapaNovoComCoordenadas(latN, lonN, imediato);
    }
  } else if ($("[data-k=utmNova]")) $("[data-k=utmNova]").value = "";
  const alNova = $("#coordNovaAlert");
  if (alNova)
    alNova.innerHTML = errosNova.length
      ? alertHTML("err", errosNova.join(" "))
      : "";

  let erros = [];
  if (r.nivel === "erro") erros.push(r.msg);
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
let _mtGeoNovoDebounce = null,
  _mtLastGeoNovoKey = "";
const _nDig = (s) => (String(s || "").match(/\d/g) || []).length;
/* Núcleo compartilhado da geocodificação por endereço. `campos` diz de quais
   chaves do state ler o endereço e a coordenada já existente; `aplicar` grava
   o resultado (é o mesmo _aplicarCoord*DoMapa usado pelo clique no mapa, então
   o pino e as validações seguem o mesmo caminho). Devolve a chave do endereço
   geocodificado (para o cache anti-repetição) ou "". */
async function _geocodificarBloco(campos, ultimaKey, aplicar) {
  const { endereco, num, bairro, municipio, estado, cep, lat, lon } = campos;
  // Só geocodifica em zona urbana e quando ainda não há coordenada definida
  // manualmente (preserva coordenada digitada/clicada pelo usuário).
  if (state.localizacao !== "Urbana") return "";
  if (_nDig(state[lat]) >= 5 && _nDig(state[lon]) >= 5) return "";
  // Exige pelo menos logradouro + número + município para buscar
  if (
    !String(state[endereco] || "").trim() ||
    !String(state[num] || "").trim() ||
    !String(state[municipio] || "").trim()
  )
    return "";
  const key = [
    state[endereco],
    state[num],
    state[bairro],
    state[municipio],
    state[cep],
  ]
    .join("|")
    .toLowerCase();
  if (ultimaKey === key) return "";
  // Geocodificação ESTRUTURADA compartilhada (shared/js/geo.js): resolve o
  // NÚMERO do endereço — a antiga busca em texto livre ignorava o número e
  // posicionava o pin longe do local real.
  const r = await geocodificarEnderecoBR({
    logradouro: state[endereco],
    numero: state[num],
    bairro: state[bairro],
    cidade: state[municipio],
    uf: state[estado],
    cep: state[cep],
  });
  if (!r) return "";
  aplicar(r.lat, r.lon);
  return key;
}
async function geocodificarEnderecoMT() {
  // _aplicarCoordDoMapa → onCoord dispara o reposicionamento do alfinete e a
  // validação ambiental automática (exatamente como no BT).
  const key = await _geocodificarBloco(
    {
      endereco: "urb_endereco",
      num: "urb_num",
      bairro: "urb_bairro",
      municipio: "uc_municipio",
      estado: "uc_estado",
      cep: "uc_cep",
      lat: "latitude",
      lon: "longitude",
    },
    _mtLastGeoKey,
    _aplicarCoordDoMapa,
  );
  if (key) _mtLastGeoKey = key;
}
// Disparado no blur dos campos de endereço urbano (debounce de 800 ms).
function onEnderecoUrbanoMT() {
  clearTimeout(_mtGeoDebounce);
  _mtGeoDebounce = setTimeout(geocodificarEnderecoMT, 800);
}
/* Mesma geocodificação para o endereço do NOVO local da subestação (etapa
   "Tipo de atendimento"), que só existe quando há alteração de carga
   (finalidade ≠ Conexão Nova) com mudança de local. Sem isto o pin do
   #mapNovo só se movia por clique/arraste. */
async function geocodificarEnderecoNovoMT() {
  if (!_mudancaLocalAtiva()) return;
  // O mapa do novo local é criado sob demanda (goTo); se o usuário preencher o
  // endereço antes disso, garante a instância para o pino ter onde aparecer.
  initMapaNovo();
  const key = await _geocodificarBloco(
    {
      endereco: "nv_endereco",
      num: "nv_num",
      bairro: "nv_bairro",
      municipio: "nv_municipio",
      estado: "nv_estado",
      cep: "nv_cep",
      lat: "latitudeNova",
      lon: "longitudeNova",
    },
    _mtLastGeoNovoKey,
    _aplicarCoordNovaDoMapa,
  );
  if (key) _mtLastGeoNovoKey = key;
}
// Disparado no blur dos campos de endereço do novo local (debounce de 800 ms).
function onEnderecoNovoMT() {
  clearTimeout(_mtGeoNovoDebounce);
  _mtGeoNovoDebounce = setTimeout(geocodificarEnderecoNovoMT, 800);
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
  // Some com a legenda junto do contorno (desenharRestricoesNoMapa recria).
  if (mapaObra && typeof atualizarLegendaRestricoes === "function")
    atualizarLegendaRestricoes(mapaObra, null);
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
/* ===== Mapa interativo de localização (Etapa 3 — Unidade Consumidora) =====
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
/* Criação genérica de um mapa Leaflet ligado a um par de coordenadas.
   `aoMover(lat, lon)` é chamado no clique no mapa e no arraste do pino.
   Devolve a instância ou null (container ausente / Leaflet não carregado). */
function _criarMapa(seletor, aoMover) {
  const div = $(seletor);
  if (!div || !window.L) return null;
  const mapa = window.L.map(div).setView([-19.9167, -43.9345], 12);
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
      attribution: "",
    },
  );
  satelite.addTo(mapa);
  window.L.control.layers({ Satélite: satelite, Ruas: ruas }).addTo(mapa);
  mapa.on("click", (e) => aoMover(e.latlng.lat, e.latlng.lng));
  setTimeout(() => mapa.invalidateSize(), 200);
  // O Leaflet mede o container na criação. Se a etapa ainda estiver oculta
  // (display:none) nesse instante, o mapa nasce com 0x0 e fica cinza/vazio
  // até um invalidateSize() posterior. O ResizeObserver cobre TODOS os casos
  // em que o container ganha tamanho depois (troca de etapa, resize da
  // janela, colapso de bloco condicional) sem depender do goTo().
  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      if (div.clientWidth > 0) mapa.invalidateSize();
    }).observe(div);
  }
  return mapa;
}

/* Posiciona/cria o pino arrastável de `mapa` em (lat, lon). `refPino` é um
   objeto-caixa { pino } para que a referência criada aqui persista no
   chamador (_refPinoObra / _refPinoNovo). */
function _sincronizarPino(mapa, refPino, lat, lon, aoMover) {
  if (!mapa || isNaN(lat) || isNaN(lon)) return;
  const ll = window.L.latLng(lat, lon);
  if (refPino.pino) {
    refPino.pino.setLatLng([lat, lon]);
    if (!mapa.getBounds().contains(ll))
      mapa.setView(ll, Math.max(mapa.getZoom(), 17));
  } else {
    refPino.pino = window.L.marker([lat, lon], { draggable: true }).addTo(mapa);
    refPino.pino.on("dragend", (e) => {
      const p = e.target.getLatLng();
      aoMover(p.lat, p.lng);
    });
    // Primeira aparição do pino (geocodificação, clique, coordenada
    // digitada): centraliza no ZOOM MÁXIMO dos tiles. Depois disso o
    // enquadramento só muda se o pino sair da vista (bloco acima).
    const zMax = Number.isFinite(mapa.getMaxZoom()) ? mapa.getMaxZoom() : 19;
    mapa.setView(ll, zMax);
  }
  setTimeout(() => mapa.invalidateSize(), 100);
}

function initMapaObra() {
  if (mapaObra) return;
  mapaObra = _criarMapa("#map", _aplicarCoordDoMapa);
  if (!mapaObra) return;
  // Caso já existam coordenadas preenchidas (ex.: voltando de outra etapa)
  const lat = parseFloat(state.latitude),
    lon = parseFloat(state.longitude);
  if (!isNaN(lat) && !isNaN(lon)) sincronizarMapaComCoordenadas(lat, lon, true);
}
function sincronizarMapaComCoordenadas(lat, lon, imediato) {
  if (isNaN(lat) || isNaN(lon)) return;
  clearTimeout(_mapaObraDebounce);
  const atualizar = () =>
    _sincronizarPino(mapaObra, _refPinoObra, lat, lon, _aplicarCoordDoMapa);
  if (imediato) atualizar();
  else _mapaObraDebounce = setTimeout(atualizar, 600);
}

/* ===== Mapa do NOVO local da subestação (etapa "Tipo de atendimento") =====
   Só existe quando "Haverá mudança do local da subestação? = Sim". Espelha o
   mapa da UC, mas escreve em state.latitudeNova/longitudeNova. */
function _aplicarCoordNovaDoMapa(lat, lon) {
  const latEl = $("[data-k=latitudeNova]"),
    lonEl = $("[data-k=longitudeNova]");
  if (latEl) latEl.value = lat;
  if (lonEl) lonEl.value = lon;
  onCoord(true); // clique/arraste é intencional: aplica na hora, sem debounce
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}
function initMapaNovo() {
  if (mapaNovo) return;
  mapaNovo = _criarMapa("#mapNovo", _aplicarCoordNovaDoMapa);
  if (!mapaNovo) return;
  const lat = parseFloat(state.latitudeNova),
    lon = parseFloat(state.longitudeNova);
  if (!isNaN(lat) && !isNaN(lon))
    sincronizarMapaNovoComCoordenadas(lat, lon, true);
  else {
    // Sem coordenada nova ainda: parte do local ATUAL da UC, que é o ponto
    // de referência natural para escolher o novo local da subestação.
    const latA = parseFloat(state.latitude),
      lonA = parseFloat(state.longitude);
    if (!isNaN(latA) && !isNaN(lonA)) mapaNovo.setView([latA, lonA], 16);
  }
}
function sincronizarMapaNovoComCoordenadas(lat, lon, imediato) {
  if (isNaN(lat) || isNaN(lon)) return;
  clearTimeout(_mapaNovoDebounce);
  const atualizar = () =>
    _sincronizarPino(mapaNovo, _refPinoNovo, lat, lon, _aplicarCoordNovaDoMapa);
  if (imediato) atualizar();
  else _mapaNovoDebounce = setTimeout(atualizar, 600);
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

/* ===== Etapa 5 (Subestação): compartilhada, trafos, motores ===== */
function onCompartilhada() {
  state.compartilhada = $("#f_compartilhada").value;
  const compart = state.compartilhada === "Sim";
  // A seção alterna: ou os transformadores da UC, ou os cubículos da
  // subestação compartilhada (o campo de quantidade vive dentro do bloco).
  $("#cubiculosBox").style.display = compart ? "block" : "none";
  $("#blocoTrafosIndividual").style.display = compart ? "none" : "block";
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

/* --- Transformadores ---
   Cada card representa UM transformador (quantidade fixa = 1); o total de
   transformadores vem do campo "Quantidade de transformadores". Os cards são
   um acordeão: só o primeiro nasce aberto. */
const HINT_INRUSH =
  "É o pico de corrente que ocorre no instante da energização do " +
  "transformadores. O valor em % indica o quanto esse pico excede a " +
  "corrente nominal de operação.";
function novoTrafo() {
  return {
    potencia: "",
    quantidade: "1",
    relacao: "8",
    demanda: "",
    // Substituição (só em finalidade ≠ Conexão Nova): quando `substituir` é
    // true, o trafo já existe e será trocado — os campos acima descrevem o
    // equipamento ATUAL e os `nova*` descrevem o que entra no lugar.
    substituir: false,
    // Situação declarada pelo usuário: "troca" | "novo" | "sem" (inalterado).
    // Ver TRAFO_SITUACOES / situacaoTrafo — `substituir` é derivado dela.
    situacao: "novo",
    novaPotencia: "",
    novaDemanda: "",
    novaRelacao: "8",
  };
}
/* A troca de transformador só existe quando há instalação anterior; em
   Conexão Nova todo trafo é, por definição, novo. */
function permiteTrocaTrafo() {
  return !!state.finalidade && state.finalidade !== "Conexão Nova";
}
/* Potência/demanda que valem para o futuro da instalação: num trafo
   substituído são os valores novos; nos demais, os próprios campos. */
function potenciaFuturaTrafo(t) {
  return t.substituir ? t.novaPotencia : t.potencia;
}
function demandaFuturaTrafo(t) {
  return t.substituir ? t.novaDemanda : t.demanda;
}
/* Projeta uma lista de trafos no que ela será DEPOIS da obra — é essa lista
   que dimensiona a instalação (o equipamento substituído sai). */
function trafosFuturos(lista) {
  return lista.map((t) => ({
    potencia: potenciaFuturaTrafo(t),
    quantidade: t.quantidade,
  }));
}
/* Situação de um transformador em finalidade ≠ Conexão Nova. Vale tanto para
   o trafo individual quanto para o de cubículo: em ambos os casos declara-se
   TODO o parque existente, alterado ou não —
     "troca" → o equipamento atual sai e outro entra (campos nova*);
     "novo"  → equipamento acrescentado à instalação;
     "sem"   → já existe e permanece inalterado.
   `substituir` (booleano) segue derivado daqui — só "troca" o liga — porque é
   o que potenciaFuturaTrafo/demandaFuturaTrafo e o PDF já leem. */
const TRAFO_SITUACOES = [
  { v: "troca", label: "Trocar este transformador" },
  { v: "novo", label: "Novo transformador" },
  { v: "sem", label: "Sem alteração" },
];
/* Tolerante a estado anterior à 3ª opção (quando só havia `substituir`). */
function situacaoTrafo(t) {
  return t.situacao || (t.substituir ? "troca" : "novo");
}
/* Aplica a situação a um trafo qualquer (individual ou de cubículo). */
function _aplicarSituacaoTrafo(t, valor) {
  t.situacao = valor;
  // Só a troca usa os campos nova*; nas demais o equipamento é o dos campos
  // principais, então `substituir` fica falso (é o que o cálculo/PDF leem).
  t.substituir = valor === "troca";
  // Ao marcar a troca pela primeira vez, semeia os campos novos com os
  // atuais — o usuário costuma alterar só a potência.
  if (t.substituir && t.novaPotencia === "" && t.novaDemanda === "") {
    t.novaPotencia = t.potencia;
    t.novaDemanda = t.demanda;
  }
}
function setTrafoSituacao(i, valor) {
  const t = trafos[i];
  if (!t) return;
  _aplicarSituacaoTrafo(t, valor);
  renderTrafos();
  recalcTecnico();
}

function addTrafo() {
  trafos.push(novoTrafo());
  sincronizarCampoQtdTrafos();
  renderTrafos();
  recalcTecnico();
}
function delTrafo(i) {
  trafos.splice(i, 1);
  trafosAbertos.delete(i);
  // reindexa o conjunto de cards abertos após a remoção
  trafosAbertos = new Set(
    [...trafosAbertos].map((k) => (k > i ? k - 1 : k)).filter((k) => k >= 0),
  );
  if (!trafosAbertos.size && trafos.length) trafosAbertos.add(0);
  sincronizarCampoQtdTrafos();
  renderTrafos();
  recalcTecnico();
}
/* Mantém o input "Quantidade de transformadores" em sincronia com os cards. */
function sincronizarCampoQtdTrafos() {
  const el = $('[data-k="qtdTransformador"]');
  if (el) el.value = trafos.length || "";
  state.qtdTransformador = trafos.length;
}
/* Cria/remove cards para bater com o valor digitado no campo de quantidade. */
function sincronizarTrafos() {
  const el = $('[data-k="qtdTransformador"]');
  const bruto = parseInt(el?.value, 10);
  if (el && el.value !== "" && (isNaN(bruto) || bruto < 1)) return; // aguarda valor válido
  const n = Math.min(Math.max(bruto || 0, 0), 99); // teto igual ao max do input
  while (trafos.length < n) trafos.push(novoTrafo());
  trafos.length = n;
  state.qtdTransformador = n;
  if (!trafosAbertos.size && n) trafosAbertos.add(0);
  renderTrafos();
  recalcTecnico();
}
function toggleTrafo(i) {
  trafosAbertos.has(i) ? trafosAbertos.delete(i) : trafosAbertos.add(i);
  renderTrafos();
}
function renderTrafos() {
  const box = $("#trafoCards");
  if (!box) return;
  const total = trafos.length;
  box.innerHTML = trafos
    .map((t, i) => {
      const aberto = trafosAbertos.has(i);
      const troca = permiteTrocaTrafo();
      const situacao = situacaoTrafo(t);
      const subst = troca && situacao === "troca";
      // "Sem alteração" é neutro (.is-existente): o equipamento já existe e
      // permanece — não é novo nem uma substituição.
      const semAlt = troca && situacao === "sem";
      // Em Conexão Nova não há badge de status: todo trafo é novo.
      const status = !troca
        ? ""
        : `<span class="trafo-status${subst ? " is-substituido" : semAlt ? " is-existente" : " is-novo"}">${subst ? "Substituído" : semAlt ? "Sem alteração" : "Novo"}</span>`;
      const radios = !troca
        ? ""
        : `<div class="trafo-troca" role="radiogroup" aria-label="Situação do transformador ${i + 1}">
          ${TRAFO_SITUACOES.map(
            (o) =>
              `<button type="button" role="radio" class="trafo-troca-opt${situacao === o.v ? " is-active" : ""}"
                       aria-checked="${situacao === o.v}"
                       onclick="setTrafoSituacao(${i},'${o.v}')"><span class="trafo-troca-dot" aria-hidden="true"></span>${o.label}</button>`,
          ).join("")}
        </div>`;
      // Num trafo substituído a primeira linha descreve o equipamento atual;
      // a segunda, o que entra no lugar.
      const linhaNova = !subst
        ? ""
        : `<div class="trafo-card-grid">
          <div class="field">
            <label for="trafoNovaDemanda${i}">Nova demanda (kVA)</label>
            <input id="trafoNovaDemanda${i}" type="number" step="any" value="${t.novaDemanda ?? ""}" placeholder=" "
                   oninput="trafos[${i}].novaDemanda=this.value;recalcTecnico()">
          </div>
          <div class="field">
            <label for="trafoNovaPotencia${i}">Nova potência (kVA)</label>
            <input id="trafoNovaPotencia${i}" type="number" step="any" value="${t.novaPotencia ?? ""}" placeholder=" "
                   oninput="trafos[${i}].novaPotencia=this.value;recalcTecnico()">
          </div>
          <div class="field">
            <label for="trafoNovaRelacao${i}">Corrente de Inrush (%)</label>
            <input id="trafoNovaRelacao${i}" type="number" step="any" value="${t.novaRelacao ?? ""}" placeholder=" "
                   oninput="trafos[${i}].novaRelacao=this.value">
            <span class="cmg-hint field-hint-icon" tabindex="0" role="img" aria-label="Ajuda: corrente de inrush" data-hint="${HINT_INRUSH}"><img class="field-info" src="../imgs/info.svg" alt="" aria-hidden="true" /></span>
          </div>
        </div>`;
      return `<div class="trafo-card${aberto ? " is-open" : ""}">
      <button type="button" class="trafo-card-head" onclick="toggleTrafo(${i})"
              aria-expanded="${aberto}" aria-controls="trafoCardBody${i}">
        <span class="trafo-titulo">Transformador</span>
        <span class="trafo-badge">${i + 1} de ${total}</span>
        ${status}
        <span class="trafo-chevron" aria-hidden="true"></span>
      </button>
      <div class="trafo-card-body" id="trafoCardBody${i}"${aberto ? "" : " hidden"}>
        ${radios}
        <div class="trafo-card-grid">
          <div class="field">
            <label for="trafoDemanda${i}">Demanda (kVA)</label>
            <input id="trafoDemanda${i}" type="number" step="any" value="${t.demanda ?? ""}" placeholder=" "
                   oninput="trafos[${i}].demanda=this.value;recalcTecnico()">
          </div>
          <div class="field">
            <label for="trafoPotencia${i}">Potência (kVA)</label>
            <input id="trafoPotencia${i}" type="number" step="any" value="${t.potencia}" placeholder=" "
                   oninput="trafos[${i}].potencia=this.value;recalcTecnico()">
          </div>
          <div class="field">
            <label for="trafoRelacao${i}">Corrente de Inrush (%)</label>
            <input id="trafoRelacao${i}" type="number" step="any" value="${t.relacao}" placeholder=" "
                   oninput="trafos[${i}].relacao=this.value">
            <span class="cmg-hint field-hint-icon" tabindex="0" role="img" aria-label="Ajuda: corrente de inrush" data-hint="${HINT_INRUSH}"><img class="field-info" src="../imgs/info.svg" alt="" aria-hidden="true" /></span>
          </div>
        </div>
        ${linhaNova}
      </div>
    </div>`;
    })
    .join("");
  // Tarifação/demanda é ÚNICA para a instalação (não-compartilhada): fica
  // depois de todos os cards, fora deles.
  renderTarifacaoInstalacao();
  // A tabela de etapas traz campos "Início de uso" (input[type=month]): sem
  // reaplicar, ficam com o "mm/aaaa" nativo e sem os handlers de foco/blur.
  reaplicarMarcadores();
}

/* --- Tarifação e demanda da INSTALAÇÃO (não-compartilhada) ---
   UMA seção para todos os transformadores: modalidade tarifária, demanda
   contratada e demanda escalonada valem para a instalação inteira. (Na
   compartilhada o equivalente é declarado por cubículo.) O estado vive em
   `state` e em `escalonadaInstalacao`, e a seção é renderizada depois dos
   cards, em #trafoTarifacao. */
let escalonadaInstalacao = [];
function setInstalacaoModalidade(valor) {
  state.modalidade = valor;
  renderTarifacaoInstalacao();
  recalcTecnico();
}
function setInstalacaoEscalonada(valor) {
  state.escalonada = valor;
  // A primeira etapa nasce junto para o usuário já ter onde digitar.
  if (valor === "Sim" && !escalonadaInstalacao.length)
    addEtapaEscalonadaInstalacao();
  else {
    renderTarifacaoInstalacao();
    recalcTecnico();
  }
}
function addEtapaEscalonadaInstalacao() {
  escalonadaInstalacao.push(novaEtapaEscalonada());
  renderTarifacaoInstalacao();
  recalcTecnico();
}
function delEtapaEscalonadaInstalacao(k) {
  escalonadaInstalacao.splice(k, 1);
  renderTarifacaoInstalacao();
  recalcTecnico();
}
function _instalacaoModalidadeCardsHTML(atual) {
  const cls = CAMPOS_CARDS_CONFIG.classes;
  return (
    `<div class="${cls.grid}" role="radiogroup" aria-label="Modalidade tarifária horária">` +
    ["Verde", "Azul"]
      .map(
        (v) =>
          `<button type="button" role="radio" aria-checked="${atual === v}" class="${cls.card}${atual === v ? " " + cls.active : ""}" onclick="setInstalacaoModalidade('${v}')">${v}</button>`,
      )
      .join("") +
    `</div>`
  );
}
function _instalacaoEscalonadaCardsHTML(atual) {
  const cls = CAMPOS_CARDS_CONFIG.classes;
  return (
    `<div class="${cls.grid} toggle-group--opcoes" role="radiogroup" aria-label="Haverá demanda escalonada?">` +
    ["Sim", "Não"]
      .map(
        (v) =>
          `<button type="button" role="radio" aria-checked="${atual === v}" class="${cls.card}${atual === v ? " " + cls.active : ""}" onclick="setInstalacaoEscalonada('${v}')">${v}</button>`,
      )
      .join("") +
    `</div>`
  );
}
/* Tabela de etapas da instalação — colunas conforme a modalidade. */
function _instalacaoEscalonadaTabelaHTML() {
  // As colunas saem da modalidade (Azul = ponta/fora ponta): sem ela a tabela
  // não tem como nascer com o cabeçalho certo.
  if (state.escalonada !== "Sim" || !state.modalidade) return "";
  const azul = state.modalidade === "Azul";
  const head = azul
    ? `<tr><th>Demanda ponta (kW)</th><th>Demanda fora ponta (kW)</th><th>Início de uso</th><th></th></tr>`
    : `<tr><th>Demanda (kW)</th><th>Início de uso</th><th></th></tr>`;
  const ref = "escalonadaInstalacao";
  const linhas = escalonadaInstalacao
    .map((e, k) =>
      azul
        ? `<tr><td><input type="number" step="any" value="${e.ponta}" placeholder="kW" oninput="${ref}[${k}].ponta=this.value;recalcTecnico()"></td>
             <td><input type="number" step="any" value="${e.foraponta}" placeholder="kW" oninput="${ref}[${k}].foraponta=this.value;recalcTecnico()"></td>
             <td>${_inicioUsoHTML(`${ref}[${k}].inicio`, e.inicio)}</td>
             <td><button class="btn-del" onclick="delEtapaEscalonadaInstalacao(${k})">×</button></td></tr>`
        : `<tr><td><input type="number" step="any" value="${e.demanda}" placeholder="kW" oninput="${ref}[${k}].demanda=this.value;recalcTecnico()"></td>
             <td>${_inicioUsoHTML(`${ref}[${k}].inicio`, e.inicio)}</td>
             <td><button class="btn-del" onclick="delEtapaEscalonadaInstalacao(${k})">×</button></td></tr>`,
    )
    .join("");
  return `<div class="cub-escalonada-box">
      <p class="card-sub">Preencha a evolução da sua necessidade de carga ao longo do tempo. Para cada etapa, informe os valores de demanda${azul ? " de Ponta e Fora Ponta" : ""} (em kW) e a data (mês/ano) prevista para o início do consumo de cada fase.</p>
      <div class="tbl-scroll">
        <table class="tbl"><thead>${head}</thead><tbody>${linhas}</tbody></table>
      </div>
      <div class="motores-add"><button type="button" class="btn btn-ghost motores-add-btn" onclick="addEtapaEscalonadaInstalacao()">+ Adicionar etapa de demanda</button></div>
    </div>`;
}
/* Demanda simples e escalonada são exclusivas: com escalonamento, a tabela de
   etapas passa a ser a única entrada de demanda.
   Os campos dependem das DUAS perguntas (modalidade define ponta/fora ponta x
   demanda única; escalonada define se existem): enquanto uma delas estiver em
   branco não há o que renderizar sem chutar. */
function _instalacaoDemandaFieldsHTML() {
  if (!state.modalidade || !state.escalonada) return "";
  if (state.escalonada === "Sim") return "";
  return state.modalidade === "Azul"
    ? `<div class="field"><label>Demanda ponta contratada (kVA)</label><input type="number" step="any" data-k="demandaPontaContratada" value="${state.demandaPontaContratada ?? ""}" placeholder=" " oninput="state.demandaPontaContratada=this.value;recalcTecnico()"></div>
       <div class="field"><label>Demanda fora ponta contratada (kVA)</label><input type="number" step="any" data-k="demandaForaPontaContratada" value="${state.demandaForaPontaContratada ?? ""}" placeholder=" " oninput="state.demandaForaPontaContratada=this.value;recalcTecnico()"></div>`
    : `<div class="field"><label>Demanda contratada (kVA)</label><input type="number" step="any" data-k="demandaContratada" value="${state.demandaContratada ?? ""}" placeholder=" " oninput="state.demandaContratada=this.value;recalcTecnico()"></div>`;
}
function renderTarifacaoInstalacao() {
  const box = $("#trafoTarifacao");
  if (!box) return;
  const demandaFields = _instalacaoDemandaFieldsHTML();
  // As duas perguntas dividem a linha: são a entrada da seção e juntas definem
  // quais campos de demanda existem abaixo. Em <=720px o .grid-2 já colapsa.
  box.innerHTML = `
      <div class="grid grid-2">
        <div class="field field--plain"><label>Modalidade tarifária horária</label>${_instalacaoModalidadeCardsHTML(state.modalidade)}</div>
        <div class="field field--plain"><label>Haverá demanda escalonada?</label>${_instalacaoEscalonadaCardsHTML(state.escalonada)}</div>
      </div>
      ${demandaFields ? `<div class="grid grid-2 cub-demanda-grid">${demandaFields}</div>` : ""}
      ${_instalacaoEscalonadaTabelaHTML()}`;
  // O innerHTML acima recria os "Início de uso" (input[type=month]) crus: sem
  // reaplicar, ficam com o placeholder nativo ("--------- de ----") e sem os
  // handlers de foco/blur que o escondem. Vale para todos os caminhos que
  // chamam esta função (add/remover etapa, trocar modalidade/escalonada).
  reaplicarMarcadores();
}
/* ---- Campo "Início de Uso" (mês/ano) ----
   Um campo ÚNICO e fechado, com o ícone de calendário: mostra "Mês/Ano"
   enquanto vazio e "Março/2028" depois de escolhido. O clique em qualquer
   ponto abre um seletor próprio (painel de 12 meses + navegação de ano).

   Por que não input[type=month]: um month VAZIO sempre desenha o placeholder
   nativo do browser ("--------- de ----" em pt-BR), que nenhum atributo ou CSS
   remove, e o seletor nativo só abre pelo indicador, não pelo campo todo.
   Com um widget próprio o texto e o comportamento são 100% nossos.

   O valor continua sendo gravado no MESMO formato ISO "YYYY-MM" do month, então
   nada muda para quem consome (state, PDF em conteudo.js, rascunho salvo).
   Só o ano corrente em diante é ofertado — a etapa é previsão de início de uso.
   `alvo` é a expressão de destino (ex.: "trafos[0].etapasEscalonada[1].inicio"),
   avaliada na escolha. */
const INICIO_USO_MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
const INICIO_USO_ANOS = 15; // ano corrente + 14
/* "2028-03" → "Março/2028" (rótulo do campo). Vazio/inválido → "". */
function _inicioUsoRotulo(valor) {
  const m = /^(\d{4})-(\d{2})$/.exec(valor || "");
  if (!m) return "";
  const mes = INICIO_USO_MESES[Number(m[2]) - 1];
  return mes ? `${mes}/${m[1]}` : "";
}
function _inicioUsoHTML(alvo, valor) {
  const rot = _inicioUsoRotulo(valor);
  // O alvo vai no data-* e só é avaliado na escolha (eval no _inicioUsoEscolher).
  // Botão, não input: nada de teclado nativo nem placeholder do browser.
  return `<button type="button" class="mesano-campo" data-alvo="${alvo}" data-valor="${valor || ""}" onclick="_inicioUsoAbrir(this)" aria-haspopup="dialog">
      <span class="mesano-campo-txt${rot ? "" : " is-vazio"}">${rot || "Mês/Ano"}</span>
      <img class="mesano-campo-icone" src="../imgs/calendar.svg" alt="" aria-hidden="true">
    </button>`;
}
/* Painel único reaproveitado por todos os campos (só um fica aberto por vez).
   Vive no <body> porque .tbl-scroll tem overflow-x:auto e recortaria um
   painel posicionado dentro da célula. */
let _mesanoPainel = null;
let _mesanoCampo = null; // botão que abriu o painel
let _mesanoAno = 0; // ano exibido na navegação
function _inicioUsoAbrir(botao) {
  if (_mesanoCampo === botao) return _inicioUsoFechar(); // clique no mesmo = alterna
  _mesanoCampo = botao;
  const m = /^(\d{4})-(\d{2})$/.exec(botao.dataset.valor || "");
  _mesanoAno = m ? Number(m[1]) : new Date().getFullYear();
  if (!_mesanoPainel) {
    _mesanoPainel = document.createElement("div");
    _mesanoPainel.className = "mesano-painel";
    _mesanoPainel.setAttribute("role", "dialog");
    _mesanoPainel.setAttribute("aria-label", "Escolha o mês e o ano");
    document.body.appendChild(_mesanoPainel);
    // Fecha ao clicar fora, no ESC, ou quando a página rola/redimensiona (o
    // painel é position:fixed e descolaria do campo).
    document.addEventListener("mousedown", (e) => {
      if (
        _mesanoCampo &&
        !_mesanoPainel.contains(e.target) &&
        !e.target.closest(".mesano-campo")
      )
        _inicioUsoFechar();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") _inicioUsoFechar();
    });
    window.addEventListener("scroll", () => _mesanoCampo && _inicioUsoFechar(), true);
    window.addEventListener("resize", () => _mesanoCampo && _inicioUsoFechar());
  }
  _inicioUsoPintar();
  _mesanoPainel.hidden = false;
  _inicioUsoPosicionar();
}
function _inicioUsoFechar() {
  if (_mesanoPainel) _mesanoPainel.hidden = true;
  _mesanoCampo = null;
}
/* Desenha o painel para o ano corrente da navegação. Meses fora da faixa
   permitida (antes do ano atual, além do teto) ficam desabilitados. */
function _inicioUsoPintar() {
  const anoMin = new Date().getFullYear();
  const anoMax = anoMin + INICIO_USO_ANOS - 1;
  const sel = /^(\d{4})-(\d{2})$/.exec(_mesanoCampo.dataset.valor || "");
  const selAno = sel ? Number(sel[1]) : 0;
  const selMes = sel ? Number(sel[2]) : 0;
  const grade = INICIO_USO_MESES.map((nome, i) => {
    const mm = i + 1;
    const ativo = selAno === _mesanoAno && selMes === mm;
    return `<button type="button" class="mesano-mes${ativo ? " is-sel" : ""}" onclick="_inicioUsoEscolher(${mm})">${nome.slice(0, 3)}</button>`;
  }).join("");
  _mesanoPainel.innerHTML = `
      <div class="mesano-nav">
        <button type="button" class="mesano-nav-btn" onclick="_inicioUsoAno(-1)" ${_mesanoAno <= anoMin ? "disabled" : ""} aria-label="Ano anterior">‹</button>
        <span class="mesano-nav-ano">${_mesanoAno}</span>
        <button type="button" class="mesano-nav-btn" onclick="_inicioUsoAno(1)" ${_mesanoAno >= anoMax ? "disabled" : ""} aria-label="Próximo ano">›</button>
      </div>
      <div class="mesano-grade">${grade}</div>`;
}
function _inicioUsoAno(d) {
  _mesanoAno += d;
  _inicioUsoPintar();
  _inicioUsoPosicionar();
}
/* Grava no state (via o alvo do data-*) e atualiza o rótulo do campo. */
function _inicioUsoEscolher(mes) {
  const iso = `${_mesanoAno}-${String(mes).padStart(2, "0")}`;
  const botao = _mesanoCampo;
  botao.dataset.valor = iso;
  const txt = botao.querySelector(".mesano-campo-txt");
  txt.textContent = _inicioUsoRotulo(iso);
  txt.classList.remove("is-vazio");
  // eslint-disable-next-line no-eval -- mesmo contrato dos oninput inline das
  // tabelas: o alvo é uma expressão de caminho gerada aqui, não entrada do usuário.
  eval(`${botao.dataset.alvo}=iso`);
  _inicioUsoFechar();
  recalcTecnico();
}
/* position:fixed ancorado ao campo; vira para cima se não couber embaixo. */
function _inicioUsoPosicionar() {
  const r = _mesanoCampo.getBoundingClientRect();
  const p = _mesanoPainel;
  p.style.visibility = "hidden";
  p.hidden = false;
  const alt = p.offsetHeight;
  const larg = p.offsetWidth;
  const cabeEmbaixo = r.bottom + 4 + alt <= window.innerHeight;
  p.style.top = `${cabeEmbaixo ? r.bottom + 4 : Math.max(4, r.top - 4 - alt)}px`;
  // Alinha pela esquerda do campo, sem vazar da janela.
  p.style.left = `${Math.max(4, Math.min(r.left, window.innerWidth - larg - 4))}px`;
  p.style.visibility = "";
}
/* --- Cubículos adicionais (Anexo I) --- */
let cubiculosAbertos = new Set([0]); // índices dos cards expandidos (acordeão)
function novoCubiculo() {
  return {
    instalacao: "",
    trafos: [novoTrafo()],
    modalidade: "",
    demanda: "",
    demandaPonta: "",
    demandaForaPonta: "",
    // Demanda escalonada do cubículo: "Sim" abre a tabela de etapas abaixo.
    // Cada etapa segue a modalidade do próprio cubículo (Azul = ponta/fora
    // de ponta; Verde = demanda única).
    escalonada: "",
    etapasEscalonada: [],
    // Cubículo já existente (será alterado) x novo (será acrescentado).
    // Só relevante em finalidade ≠ Conexão Nova — ver permiteTrocaTrafo().
    existente: false,
  };
}
/* --- Demanda escalonada por cubículo ---
   Espelha a tabela global que existia em "Tarifação e Demanda", agora vivendo
   dentro do card de cada cubículo. */
function setCubiculoEscalonada(i, valor) {
  const c = cubiculos[i];
  if (!c) return;
  c.escalonada = valor;
  // A primeira etapa nasce junto para o usuário já ter onde digitar.
  if (valor === "Sim" && !c.etapasEscalonada.length) addEtapaEscalonadaCub(i);
  else renderCubiculos();
}
function novaEtapaEscalonada() {
  return { demanda: "", ponta: "", foraponta: "", inicio: "" };
}
function addEtapaEscalonadaCub(i) {
  cubiculos[i]?.etapasEscalonada.push(novaEtapaEscalonada());
  renderCubiculos();
}
function delEtapaEscalonadaCub(i, k) {
  cubiculos[i]?.etapasEscalonada.splice(k, 1);
  renderCubiculos();
}
function _cubiculoEscalonadaCardsHTML(i, atual) {
  const cls = CAMPOS_CARDS_CONFIG.classes;
  return (
    `<div class="${cls.grid} toggle-group--opcoes" role="radiogroup" aria-label="Haverá demanda escalonada no cubículo ${i + 1}?">` +
    ["Sim", "Não"]
      .map(
        (v) =>
          `<button type="button" role="radio" aria-checked="${atual === v}" class="${cls.card}${atual === v ? " " + cls.active : ""}" onclick="setCubiculoEscalonada(${i},'${v}')">${v}</button>`,
      )
      .join("") +
    `</div>`
  );
}
/* Tabela de etapas — colunas conforme a modalidade do cubículo. */
function _cubiculoEscalonadaTabelaHTML(i, c) {
  if (c.escalonada !== "Sim") return "";
  const azul = c.modalidade === "Azul";
  const head = azul
    ? `<tr><th>Ponta (kW)</th><th>Fora de Ponta (kW)</th><th>Início de Uso</th><th></th></tr>`
    : `<tr><th>Demanda (kW)</th><th>Início de Uso</th><th></th></tr>`;
  const ref = `cubiculos[${i}].etapasEscalonada`;
  const linhas = c.etapasEscalonada
    .map((e, k) =>
      // As etapas passam a ser a demanda do cubículo quando há escalonamento,
      // então cada digitação realimenta totais e validação (mesmo par de
      // chamadas dos campos de demanda simples).
      azul
        ? `<tr><td><input type="number" step="any" value="${e.ponta}" placeholder="kW" oninput="${ref}[${k}].ponta=this.value;recalcTecnico();validarDemandaCubiculo(${i})"></td>
             <td><input type="number" step="any" value="${e.foraponta}" placeholder="kW" oninput="${ref}[${k}].foraponta=this.value;recalcTecnico();validarDemandaCubiculo(${i})"></td>
             <td>${_inicioUsoHTML(`${ref}[${k}].inicio`, e.inicio)}</td>
             <td><button class="btn-del" onclick="delEtapaEscalonadaCub(${i},${k})">×</button></td></tr>`
        : `<tr><td><input type="number" step="any" value="${e.demanda}" placeholder="kW" oninput="${ref}[${k}].demanda=this.value;recalcTecnico();validarDemandaCubiculo(${i})"></td>
             <td>${_inicioUsoHTML(`${ref}[${k}].inicio`, e.inicio)}</td>
             <td><button class="btn-del" onclick="delEtapaEscalonadaCub(${i},${k})">×</button></td></tr>`,
    )
    .join("");
  return `<div class="cub-escalonada-box">
      <div class="tbl-scroll">
        <table class="tbl"><thead>${head}</thead><tbody>${linhas}</tbody></table>
      </div>
      <div class="motores-add"><button type="button" class="btn btn-ghost motores-add-btn" onclick="addEtapaEscalonadaCub(${i})">+ Adicionar etapa de demanda</button></div>
    </div>`;
}
/* Radio "Sobre a subestação" — nova x já existente. Numa subestação que já
   existe só se informa o cubículo novo a ser adicionado. */
function _subestacaoExistenteCardsHTML() {
  const cls = CAMPOS_CARDS_CONFIG.classes;
  const atual = state.subestacaoExistente || "Nova subestação";
  return (
    `<div class="${cls.grid} toggle-group--opcoes" role="radiogroup" aria-label="Sobre a subestação">` +
    ["Nova subestação", "Subestação já existente"]
      .map(
        (v) =>
          `<button type="button" role="radio" aria-checked="${atual === v}" class="${cls.card}${atual === v ? " " + cls.active : ""}" onclick="setSubestacaoExistente('${v}')">${v}</button>`,
      )
      .join("") +
    `</div>`
  );
}
function setSubestacaoExistente(valor) {
  state.subestacaoExistente = valor;
  renderSubestacaoExistente();
  recalcTecnico();
}
function renderSubestacaoExistente() {
  const box = $("#cardsSubestacaoExistente");
  if (box) box.innerHTML = _subestacaoExistenteCardsHTML();
}
function sincronizarCubiculos() {
  const qtd = parseInt($('[data-k="qtdCubiculos"]')?.value) || 0;
  const n = state.compartilhada === "Sim" ? Math.max(1, qtd) : 0;
  while (cubiculos.length < n) cubiculos.push(novoCubiculo());
  cubiculos.length = n;
  if (!cubiculosAbertos.size && n) cubiculosAbertos.add(0);
  renderSubestacaoExistente();
  renderCubiculos();
}
function toggleCubiculo(i) {
  cubiculosAbertos.has(i)
    ? cubiculosAbertos.delete(i)
    : cubiculosAbertos.add(i);
  renderCubiculos();
}
/* Cria/remove transformadores do cubículo conforme o campo de quantidade. */
function sincronizarTrafosCub(i) {
  const el = $(`#qtdTrafoCub${i}`);
  const bruto = parseInt(el?.value, 10);
  if (el && el.value !== "" && (isNaN(bruto) || bruto < 1)) return;
  const n = Math.min(Math.max(bruto || 0, 0), 99);
  const c = cubiculos[i];
  while (c.trafos.length < n) c.trafos.push(novoTrafo());
  c.trafos.length = n;
  renderCubiculos();
  recalcCubiculo(i);
}
function addTrafoCub(i) {
  cubiculos[i].trafos.push(novoTrafo());
  renderCubiculos();
}
function delTrafoCub(i, j) {
  cubiculos[i].trafos.splice(j, 1);
  renderCubiculos();
}
function recalcCubiculo(i) {
  // O rodapé de totais por cubículo saiu do layout (os totais consolidados
  // continuam em #blocoTotaisConsolidados, via recalcTecnico).
  validarDemandaCubiculo(i);
  recalcTecnico();
}
function demandaRepresentativaCubiculo(c) {
  const azul = c.modalidade === "Azul";
  // Com demanda escalonada os campos simples não são exibidos: o que
  // dimensiona o cubículo é a MAIOR etapa informada (o patamar final
  // contratado), lida com o mesmo critério ponta/fora-ponta da modalidade.
  if (c.escalonada === "Sim") {
    return (c.etapasEscalonada || []).reduce((maior, e) => {
      const v = azul
        ? Math.max(parseFloat(e.ponta) || 0, parseFloat(e.foraponta) || 0)
        : parseFloat(e.demanda) || 0;
      return Math.max(maior, v);
    }, 0);
  }
  if (azul) {
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
  const potCub = CalculoMT.calcularTrafos(
    trafosFuturos(c.trafos),
  ).potenciaTotal;
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
    const rt = CalculoMT.calcularTrafos(trafosFuturos(c.trafos));
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
/* Mesmas três situações do trafo individual (TRAFO_SITUACOES), aplicadas ao
   trafo de um cubículo. */
function setTrafoCubSituacao(i, j, valor) {
  const t = cubiculos[i]?.trafos[j];
  if (!t) return;
  _aplicarSituacaoTrafo(t, valor);
  renderCubiculos();
  recalcCubiculo(i);
}
/* Radio "Cubículo já existente / novo" — um cubículo existente é alterado;
   um novo é acrescentado à subestação compartilhada. */
function setCubiculoExistente(i, valor) {
  const c = cubiculos[i];
  if (!c) return;
  c.existente = valor;
  // Cubículo novo não tem trafo a substituir nem a manter: limpa a marcação
  // dos seus trafos (todos passam a ser "novo").
  if (!valor)
    c.trafos.forEach((t) => {
      t.substituir = false;
      t.situacao = "novo";
      t.novaPotencia = "";
      t.novaDemanda = "";
    });
  renderCubiculos();
  recalcCubiculo(i);
}
function _cubiculoExistenteCardsHTML(i, existente) {
  return (
    `<div class="trafo-troca" role="radiogroup" aria-label="Situação do cubículo ${i + 1}">` +
    [
      { v: true, label: "Cubículo já existente" },
      { v: false, label: "Cubículo novo" },
    ]
      .map(
        (o) =>
          `<button type="button" role="radio" class="trafo-troca-opt${existente === o.v ? " is-active" : ""}"
             aria-checked="${existente === o.v}"
             onclick="setCubiculoExistente(${i},${o.v})"><span class="trafo-troca-dot" aria-hidden="true"></span>${o.label}</button>`,
      )
      .join("") +
    `</div>`
  );
}
function renderCubiculos() {
  const box = $("#cubiculosCards");
  if (!box) return;
  const total = cubiculos.length;
  box.innerHTML = cubiculos
    .map((c, i) => {
      const aberto = cubiculosAbertos.has(i);
      // Um bloco de campos por transformador do cubículo (mesmo trio dos
      // cards de transformador individual).
      const trocaCub = permiteTrocaTrafo();
      const trafoBlocos = c.trafos
        .map((t, j) => {
          const situacao = situacaoTrafo(t);
          const subst = trocaCub && situacao === "troca";
          // Badge: "Sem alteração" é neutro (.is-existente) — não é um
          // equipamento novo nem uma substituição.
          const semAlt = trocaCub && situacao === "sem";
          const status = !trocaCub
            ? ""
            : `<span class="trafo-status${subst ? " is-substituido" : semAlt ? " is-existente" : " is-novo"}">${subst ? "Substituído" : semAlt ? "Sem alteração" : "Novo"}</span>`;
          const radios = !trocaCub
            ? ""
            : `<div class="trafo-troca" role="radiogroup" aria-label="Situação do transformador ${j + 1} do cubículo ${i + 1}">
          ${TRAFO_SITUACOES.map(
            (o) =>
              `<button type="button" role="radio" class="trafo-troca-opt${situacao === o.v ? " is-active" : ""}"
                       aria-checked="${situacao === o.v}"
                       onclick="setTrafoCubSituacao(${i},${j},'${o.v}')"><span class="trafo-troca-dot" aria-hidden="true"></span>${o.label}</button>`,
          ).join("")}
        </div>`;
          const linhaNova = !subst
            ? ""
            : `<div class="trafo-card-grid">
          <div class="field"><label for="cubTrafoNovaDem${i}_${j}">Nova demanda (kVA)</label><input id="cubTrafoNovaDem${i}_${j}" type="number" step="any" value="${t.novaDemanda ?? ""}" placeholder=" " oninput="cubiculos[${i}].trafos[${j}].novaDemanda=this.value;recalcCubiculo(${i})"></div>
          <div class="field"><label for="cubTrafoNovaPot${i}_${j}">Nova potência (kVA)</label><input id="cubTrafoNovaPot${i}_${j}" type="number" step="any" value="${t.novaPotencia ?? ""}" placeholder=" " oninput="cubiculos[${i}].trafos[${j}].novaPotencia=this.value;recalcCubiculo(${i})"></div>
          <div class="field"><label for="cubTrafoNovaRel${i}_${j}">Corrente de Inrush (%)</label><input id="cubTrafoNovaRel${i}_${j}" type="number" step="any" value="${t.novaRelacao ?? ""}" placeholder=" " oninput="cubiculos[${i}].trafos[${j}].novaRelacao=this.value"><span class="cmg-hint field-hint-icon" tabindex="0" role="img" aria-label="Ajuda: corrente de inrush" data-hint="${HINT_INRUSH}"><img class="field-info" src="../imgs/info.svg" alt="" aria-hidden="true" /></span></div>
        </div>`;
          return `<div class="cub-trafo-bloco">
        <div class="cub-trafo-titulo">Transformador ${j + 1}${status}</div>
        ${radios}
        <div class="trafo-card-grid">
          <div class="field"><label for="cubTrafoDem${i}_${j}">Demanda (kVA)</label><input id="cubTrafoDem${i}_${j}" type="number" step="any" value="${t.demanda ?? ""}" placeholder=" " oninput="cubiculos[${i}].trafos[${j}].demanda=this.value;recalcCubiculo(${i})"></div>
          <div class="field"><label for="cubTrafoPot${i}_${j}">Potência (kVA)</label><input id="cubTrafoPot${i}_${j}" type="number" step="any" value="${t.potencia}" placeholder=" " oninput="cubiculos[${i}].trafos[${j}].potencia=this.value;recalcCubiculo(${i})"></div>
          <div class="field"><label for="cubTrafoRel${i}_${j}">Corrente de Inrush (%)</label><input id="cubTrafoRel${i}_${j}" type="number" step="any" value="${t.relacao}" placeholder=" " oninput="cubiculos[${i}].trafos[${j}].relacao=this.value"><span class="cmg-hint field-hint-icon" tabindex="0" role="img" aria-label="Ajuda: corrente de inrush" data-hint="${HINT_INRUSH}"><img class="field-info" src="../imgs/info.svg" alt="" aria-hidden="true" /></span></div>
        </div>
        ${linhaNova}
      </div>`;
        })
        .join("");
      const azul = c.modalidade === "Azul";
      // Demanda simples e demanda escalonada são exclusivas: quando há
      // escalonamento, a tabela de etapas passa a ser a única entrada de
      // demanda do cubículo (com as mesmas colunas que estes campos teriam).
      const temEscalonada = c.escalonada === "Sim";
      const demandaFields = temEscalonada
        ? ""
        : azul
          ? `<div class="field"><label>Demanda Ponta (kW)</label><input type="number" step="any" value="${c.demandaPonta}" placeholder=" " oninput="cubiculos[${i}].demandaPonta=this.value;recalcTecnico();validarDemandaCubiculo(${i})"></div>
         <div class="field"><label>Demanda Fora de Ponta (kW)</label><input type="number" step="any" value="${c.demandaForaPonta}" placeholder=" " oninput="cubiculos[${i}].demandaForaPonta=this.value;recalcTecnico();validarDemandaCubiculo(${i})"></div>`
          : `<div class="field"><label>Demanda contratada (kVA)</label><input type="number" step="any" value="${c.demanda}" placeholder=" " oninput="cubiculos[${i}].demanda=this.value;recalcTecnico();validarDemandaCubiculo(${i})"></div>`;
      return `<div class="trafo-card cub-card${aberto ? " is-open" : ""}">
      <button type="button" class="trafo-card-head" onclick="toggleCubiculo(${i})"
              aria-expanded="${aberto}" aria-controls="cubCardBody${i}">
        <span class="trafo-titulo">Cubículo</span>
        <span class="trafo-badge">${i + 1} de ${total}</span>
        ${
          trocaCub
            ? `<span class="trafo-status${c.existente ? " is-existente" : " is-novo"}">${c.existente ? "Já existente" : "Novo"}</span>`
            : ""
        }
        <span class="trafo-chevron" aria-hidden="true"></span>
      </button>
      <div class="trafo-card-body" id="cubCardBody${i}"${aberto ? "" : " hidden"}>
        <p class="cub-card-sub">Preencha os dados de cada transformador deste cubículo.${
          trocaCub
            ? " Informe a <strong>quantidade total de transformadores</strong> considerando os <strong>que serão alterados + novos</strong> a serem adicionados."
            : ""
        }</p>
        ${trocaCub ? _cubiculoExistenteCardsHTML(i, c.existente) : ""}
        <div class="grid grid-2">
          <div class="field"><label for="cubInstal${i}">Número da unidade consumidora / instalação</label><input id="cubInstal${i}" type="text" value="${c.instalacao}" placeholder=" " oninput="cubiculos[${i}].instalacao=this.value"></div>
          <div class="field"><label for="qtdTrafoCub${i}">Quantidade de transformadores</label><input id="qtdTrafoCub${i}" type="number" min="1" max="99" step="1" value="${c.trafos.length || ""}" placeholder=" " oninput="sincronizarTrafosCub(${i})"></div>
        </div>
        ${trafoBlocos}
        <div class="cub-trafo-bloco">
          <div class="field field--plain"><label>Modalidade tarifária horária</label>${_cubiculoModalidadeCardsHTML(i, c.modalidade)}</div>
          ${demandaFields ? `<div class="grid grid-2 cub-demanda-grid">${demandaFields}</div>` : ""}
          <div class="field field--plain bloco-sub-gap"><label>Haverá demanda escalonada?</label>${_cubiculoEscalonadaCardsHTML(i, c.escalonada)}</div>
          ${_cubiculoEscalonadaTabelaHTML(i, c)}
        </div>
        <div id="cubDemandaAlert${i}"></div>
      </div>
    </div>`;
    })
    .join("");
  cubiculos.forEach((c, i) => validarDemandaCubiculo(i));
  recalcTecnico();
  // Idem renderTrafos: a tabela de etapas do cubículo traz os campos
  // "Início de Uso" (input[type=month]) e precisa da convenção de datas.
  reaplicarMarcadores();
}

/* --- Motores ---
   Um card por motor, em acordeão (só o primeiro nasce aberto); a quantidade
   vem do campo "Quantidade de motores". */
function novoMotor() {
  return {
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
  };
}
function addMotor() {
  motores.push(novoMotor());
  sincronizarCampoQtdMotores();
  renderMotores();
}
function delMotor(i) {
  motores.splice(i, 1);
  motoresAbertos.delete(i);
  // reindexa o conjunto de cards abertos após a remoção
  motoresAbertos = new Set(
    [...motoresAbertos].map((k) => (k > i ? k - 1 : k)).filter((k) => k >= 0),
  );
  if (!motoresAbertos.size && motores.length) motoresAbertos.add(0);
  sincronizarCampoQtdMotores();
  renderMotores();
}
/* Mantém o input "Quantidade de motores" em sincronia com os cards. */
function sincronizarCampoQtdMotores() {
  const el = $('[data-k="qtdMotores"]');
  if (el) el.value = motores.length || "";
  state.qtdMotores = motores.length;
}
/* Cria/remove cards para bater com o valor digitado no campo de quantidade. */
function sincronizarMotores() {
  const el = $('[data-k="qtdMotores"]');
  const bruto = parseInt(el?.value, 10);
  if (el && el.value !== "" && (isNaN(bruto) || bruto < 0)) return; // aguarda valor válido
  const n = Math.min(Math.max(bruto || 0, 0), 99); // teto igual ao max do input
  while (motores.length < n) motores.push(novoMotor());
  motores.length = n;
  state.qtdMotores = n;
  if (!motoresAbertos.size && n) motoresAbertos.add(0);
  renderMotores();
  recalcRamal();
}
function toggleMotor(i) {
  motoresAbertos.has(i) ? motoresAbertos.delete(i) : motoresAbertos.add(i);
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
/* Campos exigidos só de motor pesado (>50 CV trifásico / >15 CV monofásico).
   Gravam em m.analisePartida — a página "Análise de Partida" lê os MESMOS
   dados, sem duplicar entrada. Não vão para o PDF comum, só para o de
   Análise de Partida. */
function _motorCamposPesadoHTML(i, m, ap) {
  const ref = `motores[${i}].analisePartida`;
  return `<div class="motor-card-grid" style="margin-top:12px">
    <div class="field"><label>Número de partidas</label><input type="number" value="${ap.numPartidas}" placeholder=" " oninput="${ref}.numPartidas=this.value"></div>
    <div class="field"><label>Ordem de partida</label><input type="number" value="${ap.ordemPartida}" placeholder=" " oninput="${ref}.ordemPartida=this.value"></div>
    <div class="field"><label>Carga operando (kVA)</label><input type="number" step="any" value="${ap.cargaOperanteKVA}" placeholder=" " oninput="${ref}.cargaOperanteKVA=this.value"></div>
    <div class="field"><label>Carga operando (FP)</label><input type="number" step="any" value="${ap.cargaOperanteFP}" placeholder=" " oninput="${ref}.cargaOperanteFP=this.value"></div>
    <div class="field"><label>Tipo de carga sensível</label><input type="text" value="${ap.cargaSensivelTipo}" placeholder=" " oninput="${ref}.cargaSensivelTipo=this.value"></div>
    <div class="field"><label>% admissível da carga sensível</label><input type="number" step="any" value="${ap.cargaSensivelPercentual}" placeholder=" " oninput="${ref}.cargaSensivelPercentual=this.value"></div>
    <div class="field"><label>Simultaneidade</label><select onchange="${ref}.simultaneidade=this.value"><option value=""></option><option ${ap.simultaneidade === "Sim" ? "selected" : ""}>Sim</option><option ${ap.simultaneidade === "Não" ? "selected" : ""}>Não</option></select></div>
    <div class="field"><label>Impedância do transformador (%Z)</label><input type="number" step="any" value="${ap.impedanciaZ}" placeholder=" " oninput="${ref}.impedanciaZ=this.value"></div>
    <div class="field"><label>Rendimento</label><input type="number" step="any" value="${m.rend}" placeholder=" " oninput="motores[${i}].rend=this.value" onchange="atualizarCalculosMotor(this)"></div>
    <div class="field"><label>FP</label><input type="number" step="any" value="${m.fp}" placeholder=" " oninput="motores[${i}].fp=this.value" onchange="atualizarCalculosMotor(this)"></div>
    <div class="field"><label>Tensão (V)</label><input type="number" step="any" value="${m.volts}" placeholder=" " oninput="motores[${i}].volts=this.value" onchange="atualizarCalculosMotor(this)"></div>
    <div class="field"><label>IP/IN</label><input type="number" step="any" value="${m.ipIn}" placeholder=" " oninput="motores[${i}].ipIn=this.value" onchange="atualizarCalculosMotor(this)"></div>
    <div class="field"><label>Tempo IP (s)</label><input type="number" step="any" value="${m.tempo}" placeholder=" " oninput="motores[${i}].tempo=this.value"></div>
  </div>`;
}
function renderMotores() {
  const box = $("#motoresCardsContainer");
  if (!box) return;
  box.innerHTML = "";
  const tMT = parseFloat(state.tensaoMT);
  const total = motores.length;
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
    // Motor pesado (trifásico > 50 CV ou monofásico > 15 CV) exige o conjunto
    // completo de dados de partida, exibido no próprio card.
    const pesado = motorPesado(m);
    const ap = pesado ? ensureAnalisePartida(m) : null;
    const aberto = motoresAbertos.has(i);
    const card = document.createElement("div");
    card.className = "motor-card" + (aberto ? " is-open" : "");
    card.dataset.motorRow = i;
    card.dataset.pesado = pesado ? "1" : "0";
    card.innerHTML = `
      <button type="button" class="motor-card-head" onclick="toggleMotor(${i})"
              aria-expanded="${aberto}" aria-controls="motorCardBody${i}">
        <span class="motor-titulo">Motor</span>
        <span class="motor-badge">${i + 1} de ${total}</span>
        <span class="motor-chevron" aria-hidden="true"></span>
      </button>
      <div class="motor-card-body" id="motorCardBody${i}"${aberto ? "" : " hidden"}>
        <div class="motor-card-grid">
          <div class="field"><label>Fases</label><select onchange="motores[${i}].fases=this.value;renderMotores()"><option ${m.fases === "Monofásico" ? "selected" : ""}>Monofásico</option><option ${m.fases !== "Monofásico" ? "selected" : ""}>Trifásico</option></select></div>
          <div class="field"><label>CV</label><input type="number" step="any" value="${m.cv}" placeholder=" " oninput="motores[${i}].cv=this.value;atualizarCalculosMotor(this)" onchange="atualizarCalculosMotor(this)"></div>
          <div class="field"><label>Disp. Partida</label><select onchange="onDispositivoMotorChange(this,${i})"><option value=""></option>${dispOpts}</select></div>
          <div class="field motor-tap-field" style="display:${compensadora ? "" : "none"}"><label>Tap (%)</label><input type="number" step="any" value="${m.tap || ""}" placeholder=" " oninput="motores[${i}].tap=this.value"></div>
        </div>
        ${pesado ? _motorCamposPesadoHTML(i, m, ap) : ""}
        ${ehAtividadeIrrigacao() ? `<label class="motor-irrigacao-check"><input type="checkbox" ${m.destinadoIrrigacao ? "checked" : ""} onchange="motores[${i}].destinadoIrrigacao=this.checked"> Destinado à Irrigação</label>` : ""}
        ${_motorCardCalcHTML(c)}
      </div>`;
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
  // Se o motor cruzou o limite de "pesado" (>50 CV trifásico / >15 CV
  // monofásico), o card ganha/perde os campos de partida: aí sim vale
  // reconstruir. Fora isso, só os valores calculados são atualizados.
  const eraPesado = card.dataset.pesado === "1";
  if (motores[i] && motorPesado(motores[i]) !== eraPesado) {
    renderMotores();
    return;
  }
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
      const v = (x) => (String(x ?? "").trim() === "" ? "—" : x);
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
      <!-- Dados abaixo vêm do card do motor (Etapa 5) — leitura apenas, para
           não haver dois pontos de entrada do mesmo dado. -->
      <div class="subbox-title" style="margin-top:16px">
        Dados de partida <span class="opt">(preenchidos no card do motor)</span>
      </div>
      <div class="motor-card-calc" style="margin-top:12px">
        <div class="item"><span class="lbl">Número de partidas</span><span class="val">${v(ap.numPartidas)}</span></div>
        <div class="item"><span class="lbl">Ordem de partida</span><span class="val">${v(ap.ordemPartida)}</span></div>
        <div class="item"><span class="lbl">Carga operando (kVA)</span><span class="val">${v(ap.cargaOperanteKVA)}</span></div>
        <div class="item"><span class="lbl">Carga operando (FP)</span><span class="val">${v(ap.cargaOperanteFP)}</span></div>
        <div class="item"><span class="lbl">Tipo de carga sensível</span><span class="val">${v(ap.cargaSensivelTipo)}</span></div>
        <div class="item"><span class="lbl">% admissível</span><span class="val">${v(ap.cargaSensivelPercentual)}</span></div>
        <div class="item"><span class="lbl">Simultaneidade</span><span class="val">${v(ap.simultaneidade)}</span></div>
        <div class="item"><span class="lbl">Impedância (%Z)</span><span class="val">${v(ap.impedanciaZ)}</span></div>
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
  goTo(8);
}

function exportarPDFPartida() {
  gerarPdfAnalisePartidaMT();
}

function exportarPDFIrrigante() {
  gerarPdfIrriganteMT();
}

/* ===== Recalcular bloco técnico (trafos, tipo SE, demanda) ===== */
function recalcTecnico() {
  state.tensaoMT = $("#f_tensaoMT")?.value || state.tensaoMT;
  // trafos (ou totais consolidados dos cubículos, se compartilhada)
  const rt =
    state.compartilhada === "Sim"
      ? totaisCubiculos()
      : // Num trafo marcado para troca o que dimensiona a instalação é a
        // potência NOVA — a atual sai junto com o equipamento antigo.
        CalculoMT.calcularTrafos(trafosFuturos(trafos));
  // Os totais alimentam state (tipo de SE, tarifa monômia, conexão nova…);
  // a faixa de resumo dos transformadores foi removida da tela, por isso a
  // escrita nos elementos é condicional.
  state.potTotalTrafos = rt.potenciaTotal;
  state.qtdTotalTrafos = rt.quantidadeTotal;
  if ($("#trafoPotTotal"))
    $("#trafoPotTotal").textContent = fmt(rt.potenciaTotal);
  if ($("#trafoQtdTotal")) $("#trafoQtdTotal").textContent = rt.quantidadeTotal;
  // Os campos readonly que replicavam pot/qtde (cn_pot, cn_qtd, alt_potFutura,
  // alt_qtdFutura) saíram da tela junto com os blocos de Conexão Nova e
  // Alteração: a tabela de transformadores já é a fonte desses totais.
  if (state.compartilhada === "Sim") {
    state.demandaTotalCubiculos = rt.demandaTotal;
    if ($("#totConsolidadoTrafos"))
      $("#totConsolidadoTrafos").value = fmt(rt.potenciaTotal);
    if ($("#totConsolidadoDemanda"))
      $("#totConsolidadoDemanda").value = fmt(rt.demandaTotal);
  }
  renderMotores();
  // KPIs + visibilidade da escolha de subestação: dependem dos totais recém
  // calculados acima, então vêm antes de popular as listas de tipos.
  atualizarVisibilidadeSE();
  // tipo de subestação automático
  preencherTiposSE();
  // A validação de tarifa monômia e de demanda era feita sobre os campos
  // globais, que não existem mais — a demanda agora é declarada por
  // transformador/cubículo e validada no próprio card.
  recalcRamal();
}

/* ===== Resumo dos dados (KPIs) + visibilidade da escolha de subestação =====
   Os KPIs mostram os totais que DETERMINAM quais modelos de subestação são
   permitidos (demanda e potência respondem pelos tetos de cada modelo), por
   isso ficam imediatamente acima da galeria.

   A seção só aparece quando há dados suficientes para os totais fazerem
   sentido — do contrário o usuário veria "0 kVA" e uma lista de modelos
   calculada sobre o vazio. O critério é o mesmo que alimenta
   tiposSubestacaoPermitidos(): nível de tensão, o tipo de instalação
   (compartilhada ou não) e potência/demanda já lançadas. */
function _resumoSEPronto() {
  if (!state.tensaoMT || !state.compartilhada) return false;
  // Sem potência declarada não há como dimensionar: os cards de transformador
  // (ou de cubículo) ainda não foram preenchidos.
  if (!(state.potTotalTrafos > 0)) return false;
  const demanda =
    state.compartilhada === "Sim"
      ? state.demandaTotalCubiculos
      : demandaRepresentativaInstalacao();
  return demanda > 0;
}
function renderResumoSE() {
  const box = $("#blocoResumoSE");
  const grade = $("#resumoSEKpis");
  if (!box || !grade) return false;
  const pronto = _resumoSEPronto();
  box.style.display = pronto ? "block" : "none";
  if (!pronto) {
    grade.innerHTML = "";
    return false;
  }
  const compart = state.compartilhada === "Sim";
  const demanda = compart
    ? state.demandaTotalCubiculos
    : demandaRepresentativaInstalacao();
  // "Cubículos" só existe na compartilhada; nas demais o primeiro KPI não faz
  // sentido e a linha fica com 3 cards.
  const kpis = [
    ...(compart ? [["Cubículos", String(cubiculos.length)]] : []),
    ["Demanda total dos transformadores", `${fmt(demanda)} kVA`],
    ["Potência total dos transformadores", `${fmt(state.potTotalTrafos)} kVA`],
    ["Quantidade total de transformadores", String(state.qtdTotalTrafos ?? 0)],
  ];
  grade.innerHTML = kpis
    .map(
      ([rot, val]) =>
        `<div class="resultado-card">
          <div class="resultado-card-label">${rot}</div>
          <div class="resultado-card-valor">${val}</div>
        </div>`,
    )
    .join("");
  return true;
}
/* Exibe a escolha do tipo de subestação (nova ou alteração) só quando a
   finalidade está definida E os totais já existem — os mesmos totais dos KPIs,
   que são o que filtra os modelos permitidos. Fonte única da visibilidade:
   chamada tanto por onFinalidade() quanto por recalcTecnico(), para que o
   critério não divirja entre os dois caminhos. */
function atualizarVisibilidadeSE() {
  const v = state.finalidade;
  const ehNova = v === "Conexão Nova";
  const pronto = renderResumoSE();
  const boxNova = $("#blocoSubestacaoNova");
  const boxAlt = $("#blocoSubestacaoAlteracao");
  if (boxNova) boxNova.style.display = ehNova && pronto ? "block" : "none";
  if (boxAlt) boxAlt.style.display = v && !ehNova && pronto ? "block" : "none";
}
function preencherTiposSE() {
  // A demanda contratada é quem responde pelos tetos de 300 kW dos modelos;
  // a potência instalada entra como piso de existência. Na compartilhada a
  // demanda é a soma dos cubículos.
  const demanda =
    state.compartilhada === "Sim"
      ? state.demandaTotalCubiculos
      : demandaRepresentativaInstalacao();
  const lista = CalculoMT.tiposSubestacaoPermitidos({
    finalidade: state.finalidade,
    tensaoMTkV: state.tensaoMT,
    compartilhada: state.compartilhada,
    potencia: state.potTotalTrafos,
    demanda,
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
  // "Tipo de Subestação atual": o modelo JÁ instalado não é escolhido pelas
  // regras de aceitação (ele existe), só pelo teto de demanda de cada modelo.
  const selAtual = $("#alt_tipoAtual");
  if (selAtual) {
    const baseAtual = CalculoMT.tiposSubestacao();
    const listaAtual = CalculoMT.filtrarTiposPorPotencia(baseAtual, demanda);
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
  // "Para": o novo modelo segue as mesmas regras de aceitação da lista acima.
  const selPara = $("#alt_tipoPara");
  if (selPara) {
    const atual = selPara.value;
    selPara.innerHTML =
      '<option value=""></option>' +
      lista
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
      const sel_ = o.value === sel.value ? "selected" : "";
      return `<div class="se-card ${sel_}" onclick="selecionarSE('${selectId}','${o.value}')">
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

/* A tarifação (monômia/modalidade) e a demanda deixaram de ser globais: cada
   transformador (não-compartilhada) e cada cubículo (compartilhada) declara a
   sua própria modalidade, demanda contratada e demanda escalonada nos
   respectivos cards. As funções onMonomia/onModalidade/onEscalonada,
   updateDemandaLabels, validarDemandas e a tabela global de demanda
   escalonada foram removidas junto com o #blocoTarifacaoDemanda. */

/* Demanda representativa da INSTALAÇÃO (não-compartilhada) — espelha
   demandaRepresentativaCubiculo: com escalonamento vale a maior etapa; sem
   ele, a demanda contratada (soma ponta + fora ponta na modalidade Azul). */
function demandaRepresentativaInstalacao() {
  const azul = state.modalidade === "Azul";
  if (state.escalonada === "Sim") {
    return escalonadaInstalacao.reduce((maior, e) => {
      const v = azul
        ? (parseFloat(e.ponta) || 0) + (parseFloat(e.foraponta) || 0)
        : parseFloat(e.demanda) || 0;
      return Math.max(maior, v);
    }, 0);
  }
  return azul
    ? (parseFloat(state.demandaPontaContratada) || 0) +
        (parseFloat(state.demandaForaPontaContratada) || 0)
    : parseFloat(state.demandaContratada) || 0;
}
/* Regra 3 (gate de exportação): a demanda declarada não pode superar a
   potência instalada. Na compartilhada vale por cubículo; na não-compartilhada
   a demanda é única e é comparada com a soma dos transformadores. Devolve a
   lista de erros no mesmo formato que validarDemandas devolvia. */
function validarDemandasTodas() {
  const out = [];
  if (state.compartilhada === "Sim") {
    cubiculos.forEach((c, i) => {
      const pot = CalculoMT.calcularTrafos(
        trafosFuturos(c.trafos),
      ).potenciaTotal;
      const dem = demandaRepresentativaCubiculo(c);
      if (dem > 0 && pot > 0 && dem > pot)
        out.push({
          nivel: "erro",
          msg: `Cubículo ${i + 1}: a demanda não pode ser superior à potência total dos seus transformadores (${fmt(pot)} kVA).`,
        });
    });
  } else {
    const pot = parseFloat(state.potTotalTrafos) || 0;
    const dem = demandaRepresentativaInstalacao();
    if (dem > 0 && pot > 0 && dem > pot)
      out.push({
        nivel: "erro",
        msg: `A demanda contratada não pode ser superior à potência total dos transformadores (${fmt(pot)} kVA).`,
      });
  }
  return out;
}

/* ===== Alteração: troca de SE (deduzida) =====
   A pergunta "Haverá troca do tipo de subestação?" saiu da tela: as duas
   galerias (modelo atual e novo modelo) são sempre exibidas fora de Conexão
   Nova, e a troca é DEDUZIDA da comparação entre elas.

   Há troca quando o novo modelo foi escolhido e difere do atual. Enquanto o
   usuário não escolher o novo modelo, vale "Não" — é o mesmo default de antes
   (campo vazio), e grupoRamal() já trata "" como sem troca. Isso preserva os
   grupos RAMAL4/RAMAL5, que só existem no caminho sem troca. */
function _trocaSEDeduzida() {
  if (state.finalidade === "Conexão Nova") return "";
  const atual = $("#alt_tipoAtual")?.value || "";
  const novo = $("#alt_tipoPara")?.value || "";
  if (!novo) return "Não";
  return novo === atual ? "Não" : "Sim";
}

/* ===== Geração ===== */
function onGeracao(t) {
  if (t === "mom") {
    state.gerMomentaneo = event.target.value;
    const sim = state.gerMomentaneo === "Sim";
    $("#gerMomPotBox").style.display = sim ? "" : "none";
  }
  if (t === "grid") {
    state.gridZero = event.target.value;
    const sim = state.gridZero === "Sim";
    $("#gridZeroPotBox").style.display = sim ? "" : "none";
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
  // A troca deixou de ser perguntada: recalcula a partir das duas galerias
  // ANTES de tipoSEefetivo(), que depende dela para saber qual modelo vale.
  state.alt_troca = _trocaSEDeduzida();
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
    // Blocos desativados via atributo `hidden` (ex.: #blocoTarifacaoDemanda,
    // mantido no DOM só como fonte de estado) também saem da validação.
    if (node.hasAttribute && node.hasAttribute("hidden")) return false;
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
          String(t.demanda ?? "").trim() !== "",
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
              String(t.demanda ?? "").trim() !== "",
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
  // Mudança do local da subestação: além de preenchidas (data-req acima), as
  // coordenadas novas precisam ser válidas e diferentes das atuais.
  if (_mudancaLocalAtiva()) {
    const rNova = CalculoMT.validarCoordenadas(
      state.latitudeNova,
      state.longitudeNova,
    );
    if (rNova.nivel === "erro")
      faltando.push("Coordenadas válidas do novo local da subestação");
    else if (
      String(state.latitudeNova || "").trim() &&
      parseFloat(state.latitudeNova) === parseFloat(state.latitude) &&
      parseFloat(state.longitudeNova) === parseFloat(state.longitude)
    )
      faltando.push("Novo local da subestação diferente do local atual");
  }
  return [...new Set(faltando)];
}
function atualizarGateExportacao() {
  const faltando = camposObrigatoriosFaltando();
  // Regra 3: validações bloqueantes (ex.: demanda contratada/futura > potência
  // total instalada dos transformadores) impedem a geração do PDF e o envio do
  // formulário — não apenas exibem alerta na etapa de dados.
  const errosValidacao = validarDemandasTodas().filter(
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

/* ===== Prévia a partir do modelo de conteúdo =====
   O QUE a prévia mostra vem de conteudoFormularioMT() (mt/js/conteudo.js);
   aqui só há a tradução para HTML. O PDF (mt/js/pdf.js) renderiza o MESMO
   modelo — então um campo criado no modelo aparece nos dois de uma vez,
   sem a duplicação que existia quando cada saída montava seu conteúdo. */
const _pvVal = (v) =>
  v === undefined || v === null || String(v).trim() === "" ? "—" : v;

function pvCampoModelo(c) {
  if (c.tipo === "tabela") {
    if (!c.rows || !c.rows.length) return "";
    const th = c.headers.map((h) => `<th>${h}</th>`).join("");
    const tb = c.rows
      .map(
        (r) =>
          "<tr>" + r.map((v) => `<td>${_pvVal(v)}</td>`).join("") + "</tr>",
      )
      .join("");
    const tf = c.rodape
      ? "<tfoot><tr>" +
        c.rodape.map((v) => `<td>${v === "" ? "" : _pvVal(v)}</td>`).join("") +
        "</tr></tfoot>"
      : "";
    const tabela =
      `<div class="tbl-scroll"><table class="tbl"><thead><tr>${th}</tr></thead>` +
      `<tbody>${tb}</tbody>${tf}</table></div>`;
    return pvCampo(c.label, tabela, { full: true, step: c.step });
  }
  if (c.tipo === "imagem") {
    const img = `<img src="${c.src}" style="max-width:100%;border:1px solid var(--cmg-neutral-200);border-radius:6px;margin-bottom:6px">`;
    return pvCampo(c.label, img + "<br>" + (c.valor || ""), {
      full: true,
      step: c.step,
    });
  }
  const valor = c.destaque
    ? `<span class="restricao-destaque">${c.valor}</span>`
    : c.valor;
  return pvCampo(c.label, valor, { full: c.full, step: c.step });
}

function renderPreview() {
  syncState();
  $("#previewContent").innerHTML = conteudoFormularioMT()
    .map((s) => pvSecao(s.titulo, s.campos.map(pvCampoModelo).join("")))
    .join(PV_DIVISOR);

  // A pergunta "Tarifa monômia?" saiu do formulário junto com a seção global
  // de tarifação. A carta passa a ser oferecida por ELEGIBILIDADE: REN
  // 1.000/2021, Art. 292, I — soma das potências ≤ 112,5 kVA (MONOMIA_MAX).
  const btnMonomia = $("#btnCartaMonomia");
  if (btnMonomia) {
    const pot = parseFloat(state.potTotalTrafos) || 0;
    const elegivel = pot > 0 && pot <= CalculoMT.limites.MONOMIA_MAX;
    btnMonomia.style.display = elegivel ? "" : "none";
  }
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
// CEP do endereço do NOVO local (etapa "Tipo de atendimento").
let _cepNovoBuscado = "";
function onCepNovoInput(el) {
  el.value = mascararCEP(el.value);
  state.nv_cep = el.value;
  const d = CalculoMT.soDigitos(el.value);
  if (d.length === 8) {
    if (_cepNovoBuscado !== d) {
      _cepNovoBuscado = d;
      onCEP("nv");
    }
  } else {
    _cepNovoBuscado = "";
    const st = $("#cep-status-nv");
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
  const CEP_K = { uc: "uc_cep", ec: "ec_cep", nv: "nv_cep" };
  const cepEl = $(`[data-k="${CEP_K[prefixo] || "ec_cep"}"]`);
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
  } else if (prefixo === "nv") {
    // Endereço do NOVO local: preenche os campos nv_*. O CEP sozinho NÃO define
    // a coordenada (centroide impreciso, igual ao bloco da UC) — o pin vem da
    // geocodificação estruturada, que refina assim que o número está informado.
    _setField("nv_endereco", d.logradouro);
    _setField("nv_bairro", d.bairro);
    _setField("nv_municipio", d.cidade);
    _setField("nv_estado", d.uf);
    onEnderecoNovoMT();
  } else {
    _setField("ec_rua", d.logradouro);
    _setField("ec_bairro", d.bairro);
    _setField("ec_municipio", d.cidade);
    _setField("ec_estado", d.uf);
  }
}

/* ===== Exportar PDF =====
   Gerado por jsPDF (mt/js/pdf.js), não mais pela impressão do navegador:
   a saída não depende das margens/opções do usuário e o modal de sucesso
   dispara no momento certo (o afterprint não distinguia salvar de cancelar). */
function exportarPDF() {
  if (atualizarGateExportacao().length) {
    goTo(8);
    return;
  }
  gerarPdfFormularioMT();
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
  onCorresp(); // sincroniza os blocos condicionais da correspondência
  // Sincroniza os blocos de Subestação (trafos x cubículos) já no load: sem
  // isto o estado inicial vinha só dos style="display" do HTML, que podiam
  // divergir do valor restaurado em state.compartilhada.
  onCompartilhada();
  addTrafo(); // começa com 1 linha de trafo
  aplicarAtividadeDaURL();
  // Estado inicial da cascata da Etapa 3 — roda depois de bindInputs() (que
  // restaura o rascunho) e de aplicarAtividadeDaURL(), para que uma atividade
  // vinda da URL ou de um rascunho já revele Localização/endereço.
  atualizarCascataUC();
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
  // Mapa: cria a instância já no load, sem esperar o goTo() chegar à etapa.
  // O goTo() continua chamando initMapaObra() (idempotente pelo guard
  // `mapaObra`), mas a criação aqui garante que o mapa exista mesmo se o
  // gate de obrigatórios impedir o avanço — o ResizeObserver de
  // initMapaObra() faz o invalidateSize() quando a etapa ficar visível.
  initMapaObra();
});
