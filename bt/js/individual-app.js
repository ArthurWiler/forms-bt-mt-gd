/* ============================================================
   CEMIG BT — Fluxo INDIVIDUAL em HTML/JS puro (padrão MT)
   ------------------------------------------------------------
   Substitui o app React para o formulário Individual (cards
   formType:"individual" — bt/individual.html). O núcleo comum
   aos apps vanilla do BT (binding, navegação, toggles, PF/CNPJ,
   CEP, correspondência, mapa/restrição, prévia) vive em
   bt/js/bt-core.js — aqui ficam só o estado e as ilhas do fluxo.

   O estado mantém o MESMO shape que gerarPdfDocumento(S) espera
   (prop/corr/obra como objetos + ucsDet[]) — pdf.js, calc.js,
   data.js e termo-grupo-b.js são reutilizados sem alteração.
   Inputs escalares são bindados por caminho (data-k="prop.nome").
   O cálculo de cargas reutiliza calcDemandaResultados
   (shared/js/calc-demanda.js) sobre o catálogo do BT (js/data.js)
   — mesma matemática do CalcDemanda React.
   ============================================================ */

/* ===== Card da modalidade (?mod=<id>) ===== */
const CARD = btResolverCard(["individual"]) || {};
const restrito = !!(CARD && CARD.restrito);
const zonaTravada = !!(CARD && CARD.travaZonaRural);
const atividadeTravada = !!(CARD && CARD.prefill && CARD.prefill.atividade);

/* ===== Estado (mesmo shape do App React / gerarPdfDocumento) ===== */
// Fábricas propPadrao/corrPadrao/obraPadrao vivem no bt-core.js.
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
  // Cards legados com cargas pré-definidas (?mod=casa50…): a sugestão do card
  // entra como "Perfil personalizado" já escolhido — editável na Etapa 5.
  if (_cargasPadrao) {
    uc.perfilPers = {
      base: "",
      cargas: JSON.parse(JSON.stringify(_cargasPadrao)),
      gerador: Object.assign({}, uc.gerador),
      disjEscolhido: "",
    };
    uc.perfil = "personalizado";
    uc.perfilFamilia = familiaPerfisBT(uc);
  }
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
  // A Etapa 4 começa sem imóveis (os contadores em 0, spec svg1); só os cards
  // legados que já trazem a UC (atividade/cargas pré-definidas) começam com 1.
  ucsDet: _prefAtividade || _cargasPadrao ? [novaUcDet()] : [],
  logoPDF: null,
};
window.state = state;

/* ===== derivados (docInfo/pessoaFisica/redeMonoBT/ruralBT no core) ===== */
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
// "Disjuntor Solicitado" derivado da carga instalada: o campo não é exibido no
// formulário (era um select travado) — o valor fica só no state, alimentando a
// prévia e o PDF.
function atualizarSolicitacaoAuto() {
  const alvo = SOLICITACOES[potenciaPlacaTotalBT() > 75 ? 1 : 0];
  if (state.atend.solicitacao !== alvo) state.atend.solicitacao = alvo;
}

/* ===== Gates de avanço específicos do fluxo (demais no core) ===== */
// Etapa 4: pelo menos um imóvel, cada um com o tipo de propriedade (é ele que
// escolhe os perfis de carga da Etapa 5).
window.btImoveisOk = () =>
  state.ucsDet.length > 0 &&
  state.ucsDet.every((u) => !!tipoPropriedadeDe(u)) &&
  window.btTipoRedeOk();
// Etapa 5: todo imóvel com carga tem um perfil escolhido, nenhum editor de
// perfil ficou aberto e a combinação de disjuntores é válida (2+ imóveis).
window.btCargasOk = () =>
  state.ucsDet.every((u) => ucSemAlteracao(u) || !!u.perfil) &&
  !editorPerfilAbertoBT() &&
  validacaoDisjuntoresBT().ok !== false;

/* ===== hooks por página (chamados pelo goTo do core) ===== */
window.onPaginaAtiva = function (sec) {
  if (sec.querySelector("#ucsIdentBox")) renderUcsIdentBT();
  if (sec.querySelector("#ucsBox")) renderUcsBT();
  if (sec.querySelector("#previaConteudo")) {
    mostrarAnaliseMotoresBT(false);
    renderPreviaBT();
  }
};

/* ===== Etapa 3 — Endereço da unidade (zona/avisos/coordenadas) ===== */
function onZonaBT() {
  const o = state.obra;
  const rural = ruralBT();
  // Textos das etapas por zona: html[data-zona] mostra o par certo de cada
  // [data-so-zona] (trilha, títulos, subtítulos e exemplo — specs rurais).
  document.documentElement.dataset.zona = rural ? "rural" : "urbana";
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
  // Rural: até 2 UCs (a 2ª é sempre de irrigação) e sem disjuntor geral.
  if (rural) state.atend.disjGeral = "Não";
  // A troca de zona pode cortar o 3º imóvel e fixa a atividade do 2º — as duas
  // etapas por UC precisam refletir isso (os renders ignoram etapas ausentes).
  renderUcsIdentBT();
  renderUcsBT();
  // O texto da Unidade de Conservação depende da zona (geo.js).
  renderRestricaoAmbiental();
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
    // data-noopt impede o marcador de devolver o "(opcional)" no próximo
    // CemigMarcadores.aplicar().
    lb.closest(".field").toggleAttribute("data-noopt", rural);
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
function onTipoRedeBT() {
  _sync("obra.tipoRede");
  // redeMono muda a lista de disjuntores dos imóveis (e dos perfis)
  renderUcsBT();
}

/* ============================================================
   Etapa 4 — Imóveis e atendimento (spec Figma svg1–8)
   ------------------------------------------------------------
   "O que você precisa neste endereço?": um contador por tipo de
   solicitação. Cada unidade contada vira um card "Imóvel N de M" com a
   identificação e o padrão de energia DESTE imóvel. state.ucsDet é a
   única fonte de verdade — os contadores são derivados dele e
   atend.nUCs só o acompanha (PDF/termo leem o array).
   ============================================================ */
// Máximo de imóveis do pedido: 3 em zona urbana; 2 em zona rural (1 pedido
// de qualquer tipo + 1 de irrigação — ver _podeAdicionarBT).
function maxUcsBT() {
  return ruralBT() ? 2 : 3;
}
// Linhas de contadores. "Alteração de carga com mudança no complemento" é
// gravada como "Alteração de Carga" + u.mudaComplemento — o PDF agrupa as UCs
// pelo valor exato da solicitação. "Imóvel existente sem alteração" grava o
// valor normativo "Caixa Existente sem Alteração" (é ele que o PDF agrupa).
const TIPOS_SOLICITACAO_BT = [
  {
    id: "nova",
    l: "Ligação nova",
    desc: "Imóvel que ainda não tem medidor de energia",
    sol: "Conexão Nova",
  },
  {
    id: "alt",
    l: "Alteração de carga",
    desc: "Imóvel já ligado, com alteração de carga",
    sol: "Alteração de Carga",
  },
  {
    id: "alt-compl",
    l: "Alteração de carga com mudança no complemento",
    desc: "Imóvel já ligado à energia, com alteração de carga e em que o complemento do endereço também altera <em>(por exemplo: Casa para Loja 1)</em>",
    sol: "Alteração de Carga",
    compl: true,
  },
  {
    id: "caixa",
    l: "Imóvel existente sem alteração",
    desc: "Imóvel já ligado à energia, sem alteração de carga",
    sol: "Caixa Existente sem Alteração",
  },
];
const tipoSolicitacaoBT = (u) =>
  u.solicitacao === "Alteração de Carga"
    ? u.mudaComplemento
      ? "alt-compl"
      : "alt"
    : u.solicitacao === "Caixa Existente sem Alteração"
      ? "caixa"
      : "nova";
const _tipoBT = (id) => TIPOS_SOLICITACAO_BT.find((t) => t.id === id);
// Rural: os mesmos contadores do urbano + a linha "Irrigação". Regras do
// rural: no máximo 1 imóvel entre os 4 tipos (cada solicitação atende 1
// imóvel) e no máximo 1 de irrigação. O imóvel de irrigação é o que tem a
// atividade fixa "Irrigação"; a solicitação dele (ligação nova, alteração…)
// é trocada pelo lápis do card, sem sair da linha de irrigação.
const CONTADOR_IRRIGACAO_BT = {
  id: "irr",
  l: "Irrigação",
  desc: "Imóvel com medidor de energia próprio usado exclusivamente para irrigação da propriedade",
};
const _ehIrrigacaoBT = (u) => u.atividade === ATIVIDADE_IRRIGACAO;
// Linhas de contador da zona atual e a linha em que cada imóvel é contado.
const contadoresBT = () =>
  ruralBT()
    ? TIPOS_SOLICITACAO_BT.concat([CONTADOR_IRRIGACAO_BT])
    : TIPOS_SOLICITACAO_BT;
const contadorDoImovelBT = (u) =>
  ruralBT() && _ehIrrigacaoBT(u) ? "irr" : tipoSolicitacaoBT(u);
// Ordena os imóveis pela ordem das linhas de contador.
function _ordenarUcsBT() {
  const ordem = contadoresBT().map((t) => t.id);
  state.ucsDet.sort(
    (a, b) =>
      ordem.indexOf(contadorDoImovelBT(a)) -
      ordem.indexOf(contadorDoImovelBT(b)),
  );
}
// "+" da linha: limite total do pedido e, no rural, 1 por grupo (pedido ×
// irrigação).
function _podeAdicionarBT(id) {
  const arr = state.ucsDet;
  if (arr.length >= maxUcsBT()) return false;
  if (!ruralBT()) return true;
  const irr = arr.filter(_ehIrrigacaoBT).length;
  return id === "irr" ? irr === 0 : arr.length - irr === 0;
}
const solicitacaoRotuloBT = (u) => _tipoBT(tipoSolicitacaoBT(u)).l;
// Mais de um imóvel no pedido (qualquer tipo, inclusive a irrigação rural):
// o complemento passa a ser obrigatório em todos.
const complementoObrigatorioBT = () => state.ucsDet.length > 1;
function _aplicarTipoBT(u, t) {
  u.solicitacao = t.sol;
  u.mudaComplemento = !!t.compl;
  if (!t.compl) u.novoComplemento = "";
  // Ligação nova não tem instalação existente nem padrão a mudar de lugar.
  if (t.id === "nova") {
    u.instalacao = "";
    u.mudancaLocal = "";
  }
}
// Cards abertos por padrão (o Figma mostra todos expandidos); o mapa guarda só
// os que o usuário fechou. Mudou a lista, os índices mudam: o mapa zera.
const _ucIdentFechada = {};
const _ucCargaFechada = {};
const _zerarAberturasBT = () =>
  [_ucIdentFechada, _ucCargaFechada].forEach((m) =>
    Object.keys(m).forEach((k) => delete m[k]),
  );
// + insere no fim do grupo do tipo (os cards seguem a ordem dos contadores);
// − remove o último imóvel daquele tipo.
function alterarContadorBT(id, delta) {
  const arr = state.ucsDet;
  const ordem = contadoresBT().map((t) => t.id);
  if (delta > 0) {
    if (!_podeAdicionarBT(id)) return;
    const u = novaUcDet();
    // Irrigação nasce como ligação nova; o lápis do card troca o tipo.
    _aplicarTipoBT(u, _tipoBT(id === "irr" ? "nova" : id));
    if (id === "irr") aplicarTipoPropriedade(u, ATIVIDADE_IRRIGACAO);
    let pos = 0;
    arr.forEach((x, i) => {
      if (ordem.indexOf(contadorDoImovelBT(x)) <= ordem.indexOf(id))
        pos = i + 1;
    });
    arr.splice(pos, 0, u);
  } else {
    let ult = -1;
    arr.forEach((x, i) => {
      if (contadorDoImovelBT(x) === id) ult = i;
    });
    if (ult < 0) return;
    arr.splice(ult, 1);
  }
  _zerarAberturasBT();
  Object.keys(_editorPerfil).forEach((k) => delete _editorPerfil[k]);
  _aoMudarUcIdent();
}
// Zona/limite: corta o excedente; irrigação só existe no rural.
function _sincronizarUcs() {
  const arr = state.ucsDet;
  if (arr.length > maxUcsBT()) arr.length = maxUcsBT();
  if (!ruralBT())
    arr.forEach((u) => {
      if (_ehIrrigacaoBT(u)) aplicarTipoPropriedade(u, "");
    });
  state.atend.nUCs = arr.length;
}
// Revalida o perfil (família que não vale mais zera a escolha) e recalcula
// os derivados de carga/demanda/disjuntor de todas as UCs (usado por ambas
// as etapas — a escolha de perfil já conta na demanda). Ver perfis-carga.js.
function _recalcularCargasUcs() {
  state.ucsDet.forEach((u) => {
    revalidarPerfilBT(u);
    if (!ucSemAlteracao(u)) recalcularCargasBT(u);
  });
}
// Endereço do topo da etapa ("Rua Exemplo, 100 - Centro, Belo Horizonte/MG").
function _enderecoAtendTxt() {
  const o = state.obra;
  const j = (xs, sep) => xs.filter((x) => String(x || "").trim()).join(sep);
  const cidadeUf = j([o.cidade, o.estado], "/");
  // Rural (spec rural svg2): "Município, Distrito, UF, Propriedade".
  if (ruralBT())
    return j(
      [o.cidade, o.distritoComunidade, o.estado, o.nomePropriedade],
      ", ",
    );
  return j(
    [j([o.endereco, o.num], ", "), j([o.bairro, cidadeUf], ", ")],
    " - ",
  );
}
// Endereço do imóvel na Etapa 5: rua, nº e o complemento (o novo, quando muda).
function _enderecoUCTxt(u) {
  const o = state.obra;
  const partes = ruralBT()
    ? [o.cidade, o.distritoComunidade, o.estado, o.nomePropriedade]
    : [o.endereco, o.num];
  partes.push(u.mudaComplemento ? u.novoComplemento : u.complemento);
  return partes.filter((x) => String(x || "").trim()).join(", ") || "—";
}
// Card "Imóvel N de M" das duas etapas: caixa cinza com cabeçalho clicável
// (título + badge + chevron) e o corpo, montado só quando aberto.
function _mkUcColapsavel(ui, aberta, aoAlternar, montarCorpo) {
  const bloco = document.createElement("div");
  bloco.className = "uc-colapsavel uc-imovel" + (aberta ? " is-open" : "");
  const head = document.createElement("div");
  head.className = "uc-colapsavel-head";
  head.setAttribute("role", "button");
  head.tabIndex = 0;
  head.setAttribute("aria-expanded", aberta ? "true" : "false");
  head.innerHTML =
    `<span class="uc-colapsavel-titulo">Imóvel <span class="carga-acc-badge">${ui + 1} de ${state.ucsDet.length}</span></span>` +
    '<span class="carga-acc-chevron uc-colapsavel-chevron" aria-hidden="true"></span>';
  head.addEventListener("click", aoAlternar);
  head.addEventListener("keydown", (e) => {
    if (e.target !== head || (e.key !== "Enter" && e.key !== " ")) return;
    e.preventDefault();
    aoAlternar();
  });
  bloco.appendChild(head);
  if (aberta) {
    const corpo = document.createElement("div");
    corpo.className = "uc-colapsavel-corpo";
    montarCorpo(corpo);
    bloco.appendChild(corpo);
  }
  return bloco;
}
// Contadores (− N +) — mesmo componente .qtd-ctrl da lista de equipamentos.
const _ICONE_MENOS_BT =
  '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M6 12h12"/></svg>';
const _ICONE_MAIS_BT =
  '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M12 6v12M6 12h12"/></svg>';
function renderContadoresBT() {
  const box = $("#atendContadores");
  if (!box) return;
  const n = {};
  contadoresBT().forEach((t) => (n[t.id] = 0));
  state.ucsDet.forEach((u) => n[contadorDoImovelBT(u)]++);
  box.innerHTML = "";
  contadoresBT().forEach((t) => {
    const linha = document.createElement("div");
    linha.className = "atend-contador";
    linha.innerHTML =
      `<div class="atend-contador-texto"><strong>${t.l}</strong><span>${t.desc}</span></div>` +
      `<div class="qtd-ctrl qtd-ctrl--atend">` +
      `<button type="button" class="minus" aria-label="Remover ${t.l}"${n[t.id] ? "" : " disabled"}>${_ICONE_MENOS_BT}</button>` +
      `<input type="text" value="${n[t.id]}" readonly tabindex="-1" aria-label="Quantidade de ${t.l}" />` +
      `<button type="button" class="plus" aria-label="Adicionar ${t.l}"${_podeAdicionarBT(t.id) ? "" : " disabled"}>${_ICONE_MAIS_BT}</button>` +
      `</div>`;
    linha
      .querySelector(".minus")
      .addEventListener("click", () => alterarContadorBT(t.id, -1));
    linha
      .querySelector(".plus")
      .addEventListener("click", () => alterarContadorBT(t.id, 1));
    box.appendChild(linha);
  });
}
function renderUcsIdentBT() {
  const box = $("#ucsIdentBox");
  if (!box) return;
  _sincronizarUcs();
  _recalcularCargasUcs();
  atualizarSolicitacaoAuto();
  const end = $("#atendEndereco");
  if (end) end.textContent = _enderecoAtendTxt();
  renderContadoresBT();
  const rede = $("#tipoRedeBox");
  if (rede) rede.style.display = state.ucsDet.length ? "" : "none";
  box.innerHTML = "";
  state.ucsDet.forEach((u, ui) => {
    const aberta = !_ucIdentFechada[ui];
    box.appendChild(
      _mkUcColapsavel(
        ui,
        aberta,
        () => {
          _ucIdentFechada[ui] = aberta;
          renderUcsIdentBT();
        },
        (corpo) => corpo.appendChild(_ucIdentificacao(u, ui)),
      ),
    );
  });
  if (window.CemigMarcadores) {
    CemigMarcadores.aplicar(box);
    CemigMarcadores.atualizarAvancar();
  }
}
// Mudar solicitação/tipo/ramo re-renderiza esta etapa (campos condicionais)
// e a de cargas (os perfis e o tipoA derivam da atividade e do ramo).
function _aoMudarUcIdent() {
  renderUcsIdentBT();
  renderUcsBT();
}
// "Pronto para ser ligado?" e "distância até o poste": sempre na ligação
// nova; no imóvel existente, só quando o padrão muda de local.
const perguntasPadraoBT = (u) =>
  u.solicitacao === "Conexão Nova" || u.mudancaLocal === "Sim";
// Pergunta Sim/Não por imóvel (mesmo radio .toggle-btn dos demais Sim/Não).
function _simNaoBT(label, valor, aoMudar) {
  const f = document.createElement("div");
  f.className = "field field--plain";
  f.setAttribute("data-noopt", "");
  const l = document.createElement("label");
  l.textContent = label;
  const tg = document.createElement("div");
  tg.className = "toggle-group";
  tg.setAttribute("role", "radiogroup");
  ["Sim", "Não"].forEach((v) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "toggle-btn" + (valor === v ? " on" : "");
    b.setAttribute("role", "radio");
    b.setAttribute("aria-checked", valor === v ? "true" : "false");
    b.textContent = v;
    b.addEventListener("click", () => {
      tg.querySelectorAll(".toggle-btn").forEach((x) => {
        x.classList.toggle("on", x === b);
        x.setAttribute("aria-checked", x === b ? "true" : "false");
      });
      aoMudar(v);
    });
    tg.appendChild(b);
  });
  f.append(l, tg);
  return f;
}
// Avisos do "padrão pronto para ser ligado?" (antes globais, agora do imóvel).
const _AVISO_PRONTO_BT = {
  Sim: [
    "cmg-aviso",
    "Depois que você apresentar este formulário na agência, a Cemig irá analisar o pedido. Quando for aprovado, a vistoria e a ligação serão solicitadas automaticamente. Você não precisa fazer nenhuma solicitação adicional.",
  ],
  Não: [
    "cmg-aviso cmg-aviso--warn",
    "Depois que você apresentar este formulário na agência, a Cemig irá analisar o pedido. Quando for aprovado, você terá até 120 dias para solicitar a vistoria e a ligação. Se não solicitar nesse prazo, o pedido pode ser cancelado.",
  ],
};
function _avisoProntoBT(box, v) {
  box.innerHTML = "";
  const a = _AVISO_PRONTO_BT[v];
  box.style.display = a ? "" : "none";
  if (!a) return;
  box.innerHTML = `<div class="${a[0]} no-print"><div class="cmg-aviso-icon" aria-hidden="true"></div><p class="cmg-aviso-texto">${a[1]}</p></div>`;
}
// "Solicitação de atendimento": rótulo + lápis; o lápis troca o rótulo por um
// select com os tipos — mudar o tipo move o imóvel de contador.
function _ucSolicitacao(u, ui) {
  const wrap = document.createElement("div");
  wrap.className = "uc-solicitacao";
  const rot = document.createElement("span");
  rot.className = "uc-solicitacao-rotulo";
  rot.textContent = "Solicitação de atendimento";
  const linha = document.createElement("div");
  linha.className = "uc-solicitacao-valor";
  const valor = document.createElement("strong");
  valor.textContent = solicitacaoRotuloBT(u);
  const lapis = document.createElement("button");
  lapis.type = "button";
  lapis.className = "previa-edit uc-solicitacao-editar";
  lapis.title = "Alterar";
  lapis.setAttribute("aria-label", "Alterar a solicitação de atendimento");
  lapis.addEventListener("click", () => {
    const sel = document.createElement("select");
    sel.innerHTML = TIPOS_SOLICITACAO_BT.map(
      (t) => `<option value="${t.id}">${t.l}</option>`,
    ).join("");
    sel.value = tipoSolicitacaoBT(u);
    sel.addEventListener("change", () => {
      _aplicarTipoBT(u, _tipoBT(sel.value));
      // Reposiciona o imóvel no grupo do novo tipo (ordem dos contadores).
      _ordenarUcsBT();
      _zerarAberturasBT();
      _aoMudarUcIdent();
    });
    sel.addEventListener("blur", () => {
      if (sel.isConnected) renderUcsIdentBT();
    });
    const campo = _campo("Solicitação de atendimento", sel, "field--float");
    campo.classList.add("row-solo");
    wrap.replaceWith(campo);
    sel.focus();
  });
  linha.append(valor, lapis);
  wrap.append(rot, linha);
  return wrap;
}
// Corpo do card na Etapa 4 (svg3–8): solicitação · complemento(s) · tipo de
// propriedade · [ramo] · [nº da instalação] · padrão de energia do imóvel.
function _ucIdentificacao(u, ui) {
  const wrap = document.createElement("div");
  wrap.appendChild(_ucSolicitacao(u, ui));
  const grid = document.createElement("div");
  grid.className = "grid grid-2";
  // Só o 1º imóvel fica preso ao tipo principal do formulário (cards
  // restritos); exceção rural: o 2º só existe para irrigação.
  const irrigacaoFixa = ruralBT() && _ehIrrigacaoBT(u);
  const atividadeBloqueada =
    irrigacaoFixa || ((restrito || atividadeTravada) && ui === 0);
  const inpTexto = (v, aoDigitar) => {
    const inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = " ";
    inp.value = v || "";
    inp.addEventListener("input", () => aoDigitar(inp.value));
    return inp;
  };
  if (u.mudaComplemento) {
    grid.appendChild(
      _campo(
        'Complemento atual <span class="req">*</span>',
        inpTexto(u.complemento, (v) => (u.complemento = v)),
      ),
    );
    grid.appendChild(
      _campo(
        'Novo complemento <span class="req">*</span>',
        inpTexto(u.novoComplemento, (v) => (u.novoComplemento = v)),
      ),
    );
  } else {
    // Sem data-k o marcador não acrescenta o "(opcional)" — vai no rótulo.
    // Com mais de um imóvel o complemento é o que distingue cada um.
    grid.appendChild(
      _campo(
        complementoObrigatorioBT()
          ? 'Complemento <span class="req">*</span>'
          : 'Complemento <span class="opt">(opcional)</span>',
        inpTexto(u.complemento, (v) => (u.complemento = v)),
      ),
    );
  }
  // Tipo de propriedade = Residencial + categorias da Tabela 11 (urbano e
  // rural): é ele que define o cálculo de demanda (shared/js/carga-bt.js).
  // Card travado numa classe só oferece os tipos dela; com um tipo único o
  // select já vem escolhido e bloqueado. A irrigação rural é fixa.
  const opcoesTipo = irrigacaoFixa
    ? [ATIVIDADE_IRRIGACAO]
    : tiposPropriedade(atividadeBloqueada ? _prefAtividade : "");
  if (opcoesTipo.length === 1 && tipoPropriedadeDe(u) !== opcoesTipo[0])
    aplicarTipoPropriedade(u, opcoesTipo[0]);
  const selTipo = _selectDe(
    opcoesTipo,
    tipoPropriedadeDe(u),
    (v) => {
      aplicarTipoPropriedade(u, v);
      _aoMudarUcIdent();
    },
    true,
  );
  selTipo.disabled = opcoesTipo.length === 1;
  grid.appendChild(
    _campo(
      'Tipo de propriedade <span class="req">*</span>',
      selTipo,
      "field--float",
    ),
  );
  // Ramo da atividade: texto livre ("Salão de beleza", "Padaria"…), só
  // informativo — não entra no cálculo.
  if (u.atividade && u.atividade !== "Residencial" && !irrigacaoFixa) {
    const inp = inpTexto(ramoDescricao(u.ramo), (v) => (u.ramo = v));
    inp.disabled = restrito && ui === 0;
    grid.appendChild(
      _campo('Ramo da atividade <span class="req">*</span>', inp),
    );
  }
  if (u.solicitacao !== "Conexão Nova") {
    // Um único campo para o número que identifica a UC existente: a Cemig
    // aceita instalação, unidade consumidora ou medidor. Instalação (10
    // dígitos, inicia por 3) ou UC nova (15 dígitos, "018" antes do
    // verificador) — REN ANEEL 1.095/2024.
    const inpInst = document.createElement("input");
    inpInst.type = "text";
    inpInst.placeholder = " ";
    inpInst.value = u.instalacao || "";
    inpInst.setAttribute("data-fmt", "fmtInstalacaoUC");
    inpInst.addEventListener("input", () => {
      inpInst.value = mascararInstalacaoUC(inpInst.value);
      u.instalacao = inpInst.value;
    });
    grid.appendChild(
      _campo('Nº da unidade/instalação <span class="req">*</span>', inpInst),
    );
  }
  wrap.appendChild(grid);
  // Padrão de energia deste imóvel
  const padrao = document.createElement("div");
  padrao.className = "divider uc-padrao";
  padrao.innerHTML =
    '<h5 class="uc-padrao-titulo">Padrão de energia deste imóvel</h5>';
  const gp = document.createElement("div");
  gp.className = "grid grid-2";
  // Imóvel existente (com ou sem alteração): primeiro "precisa ser mudado de
  // local?", sozinho na linha; só com "Sim" vêm "pronto para ser ligado?" e
  // "distância até o poste". Ligação nova pergunta as duas direto.
  if (u.solicitacao !== "Conexão Nova") {
    const fMuda = _simNaoBT(
      "O padrão precisa ser mudado de local?",
      u.mudancaLocal,
      (v) => {
        u.mudancaLocal = v;
        // Mostra/esconde as demais perguntas (e, no rural, o mapa do novo
        // local do padrão neste card).
        renderUcsIdentBT();
      },
    );
    fMuda.classList.add("col-span-2");
    gp.appendChild(fMuda);
  }
  if (perguntasPadraoBT(u)) {
    const avisoPronto = document.createElement("div");
    avisoPronto.className = "col-span-2";
    const fPronto = _simNaoBT(
      "O padrão está pronto para ser ligado?",
      u.prontoLigar,
      (v) => {
        u.prontoLigar = v;
        _avisoProntoBT(avisoPronto, v);
      },
    );
    const fDist = _simNaoBT(
      "Distância do padrão até o poste inferior a 30m?",
      u.distMenor30,
      (v) => (u.distMenor30 = v),
    );
    if (u.solicitacao === "Conexão Nova") gp.append(fDist, fPronto);
    else gp.append(fPronto, fDist);
    gp.appendChild(avisoPronto);
    _avisoProntoBT(avisoPronto, u.prontoLigar);
  }
  padrao.appendChild(gp);
  wrap.appendChild(padrao);
  // Novo local do padrão: em zona rural, quando o imóvel pede mudança de
  // local, mapa + coordenadas para escolher o ponto do padrão.
  const novoLocal =
    ruralBT() && u.mudancaLocal === "Sim" && u.solicitacao !== "Conexão Nova";
  if (novoLocal) return _ucIdentComNovoLocal(wrap, u, ui);
  return wrap;
}
// Envolve a grade de identificação e anexa a seção "Novo local do padrão"
// (mapa Leaflet clicável/arrastável + latitude/longitude + UTM). Cada UC tem
// seu próprio mapa, identificado por índice, inicializado após o DOM montar.
function _ucIdentComNovoLocal(grid, u, ui) {
  const wrap = document.createElement("div");
  wrap.appendChild(grid);
  const sec = document.createElement("div");
  sec.className = "mapa-obra divider";
  const titulo = document.createElement("div");
  titulo.className = "subbox-title";
  titulo.textContent = "Novo local do padrão";
  const hint = document.createElement("p");
  hint.className = "mapa-hint";
  hint.textContent =
    "Indique no mapa o novo ponto do padrão. Clique no mapa ou arraste o pino para ajustar; a coordenada e o UTM são preenchidos automaticamente.";
  const canvas = document.createElement("div");
  canvas.className = "mapa-canvas";
  canvas.id = `padraoMap${ui}`;
  sec.append(titulo, hint, canvas);
  wrap.appendChild(sec);

  const grade = document.createElement("div");
  grade.className = "grid grid-3";
  grade.style.marginTop = "14px";
  const inpLat = document.createElement("input");
  inpLat.type = "text";
  inpLat.placeholder = " ";
  inpLat.value = u.padraoLat || "";
  const inpLng = document.createElement("input");
  inpLng.type = "text";
  inpLng.placeholder = " ";
  inpLng.value = u.padraoLng || "";
  const inpUtm = document.createElement("input");
  inpUtm.type = "text";
  inpUtm.readOnly = true;
  inpUtm.disabled = true;
  inpUtm.placeholder = " ";
  inpUtm.value = u.padraoUtm || "";
  const recalcUtm = () => {
    u.padraoUtm = utmString(u.padraoLat, u.padraoLng);
    inpUtm.value = u.padraoUtm;
  };
  inpLat.addEventListener("input", () => {
    u.padraoLat = inpLat.value;
    recalcUtm();
    _sincronizarPadraoMapa(ui, u);
  });
  inpLng.addEventListener("input", () => {
    u.padraoLng = inpLng.value;
    recalcUtm();
    _sincronizarPadraoMapa(ui, u);
  });
  grade.appendChild(_campo("Latitude", inpLat));
  grade.appendChild(_campo("Longitude", inpLng));
  grade.appendChild(_campo("Coordenada UTM", inpUtm));
  wrap.appendChild(grade);

  // Callback para o mapa escrever de volta nos inputs quando o pino move.
  u._padraoAplicar = (lat, lng) => {
    u.padraoLat = String(lat);
    u.padraoLng = String(lng);
    inpLat.value = u.padraoLat;
    inpLng.value = u.padraoLng;
    recalcUtm();
  };
  // Inicializa o mapa após o nó entrar no DOM (renderUcsIdentBT limpa o box).
  setTimeout(() => _initPadraoMapa(ui, u), 60);
  return wrap;
}
// Registro dos mapas de novo local do padrão, por índice de UC. Recriados a
// cada render da etapa (o box é limpo), então descartamos o mapa anterior.
const _padraoMaps = {};
// Leaflet sob demanda (shared/js/libs.js). A flag é POR ÍNDICE: cada UC pede o
// seu mapa de forma independente, e o re-render da etapa pode disparar vários
// _initPadraoMapa no mesmo tick. O re-call refaz a checagem do container —
// necessário porque a etapa pode ter sido re-renderizada durante o download,
// e aí `padraoMap${ui}` já não é o mesmo nó (ou nem existe mais).
const _padraoPendentes = {};
function _initPadraoMapa(ui, u) {
  const div = document.getElementById(`padraoMap${ui}`);
  if (!div || _padraoPendentes[ui]) return;
  if (!window.L) {
    _padraoPendentes[ui] = true;
    window.CemigLibs.leaflet()
      .then(() => {
        _padraoPendentes[ui] = false;
        _initPadraoMapa(ui, u);
      })
      .catch(() => {
        _padraoPendentes[ui] = false;
      });
    return;
  }
  if (_padraoMaps[ui]) {
    _padraoMaps[ui].remove();
    _padraoMaps[ui] = null;
  }
  const map = window.L.map(div).setView([-19.9167, -43.9345], 12);
  camadasBaseMapa(map);
  const marker = { ref: null };
  const colocar = (lat, lng, centralizar) => {
    const ll = window.L.latLng(lat, lng);
    if (marker.ref) {
      marker.ref.setLatLng(ll);
      if (centralizar && !map.getBounds().contains(ll))
        map.setView(ll, Math.max(map.getZoom(), 17));
    } else {
      marker.ref = window.L.marker(ll, { draggable: true }).addTo(map);
      marker.ref.on("dragend", (e) => {
        const p = e.target.getLatLng();
        if (u._padraoAplicar) u._padraoAplicar(p.lat, p.lng);
      });
      const zMax = Number.isFinite(map.getMaxZoom()) ? map.getMaxZoom() : 19;
      map.setView(ll, zMax);
    }
  };
  map.on("click", (e) => {
    if (u._padraoAplicar) u._padraoAplicar(e.latlng.lat, e.latlng.lng);
    colocar(e.latlng.lat, e.latlng.lng, false);
  });
  map._padraoColocar = colocar;
  _padraoMaps[ui] = map;
  setTimeout(() => map.invalidateSize(), 120);
  // Semeia o mapa: coordenada do padrão já informada ou, senão, a da obra.
  const lat = num(u.padraoLat) || num(state.obra.lat);
  const lng = num(u.padraoLng) || num(state.obra.lng);
  if (lat && lng) colocar(lat, lng, true);
}
// Reposiciona o pino quando lat/long são digitados manualmente (debounce leve).
function _sincronizarPadraoMapa(ui, u) {
  const map = _padraoMaps[ui];
  if (!map || !map._padraoColocar) return;
  const lat = parseFloat(String(u.padraoLat).replace(",", "."));
  const lng = parseFloat(String(u.padraoLng).replace(",", "."));
  if (isNaN(lat) || isNaN(lng)) return;
  if (_nDig(u.padraoLat) < 5 || _nDig(u.padraoLng) < 5) return;
  map._padraoColocar(lat, lng, true);
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
  wrap.className = "uc-gerador";
  const f = document.createElement("div");
  f.className = "field field--plain uc-gerador-campo";
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
/* ============================================================
   Etapa 5 — Cargas dos imóveis: perfis de carga (spec Figma svg9–14)
   A grade, o editor "Personalizar perfil" e o recálculo vivem em
   bt/js/perfis-carga.js ("UI dos perfis"), compartilhados com o
   modo calculadora do coletivo/múltiplas torres.
   ============================================================ */
// Contexto dos perfis do imóvel `ui` (ver montarPerfisBT).
function _ctxPerfilBT(ui) {
  return {
    chave: ui,
    comGerador: true,
    avisoSemTipo:
      "Escolha o <b>tipo de propriedade</b> deste imóvel na etapa Imóveis e atendimento para ver os perfis de carga.",
    aoMudar: renderUcsBT,
    aoAbrirEditor: () => {
      _ucCargaFechada[ui] = false;
      renderUcsBT();
      const card = document.querySelectorAll("#ucsBox > .uc-imovel")[ui];
      if (card) card.scrollIntoView({ block: "start", behavior: "smooth" });
    },
  };
}
function renderUcsBT() {
  const box = $("#ucsBox");
  if (!box) return;
  _sincronizarUcs();
  // Resultados sempre atualizados, mesmo com o card fechado.
  _recalcularCargasUcs();
  atualizarSolicitacaoAuto();
  box.innerHTML = "";
  state.ucsDet.forEach((u, ui) => {
    const aberta = !_ucCargaFechada[ui];
    box.appendChild(
      _mkUcColapsavel(
        ui,
        aberta,
        () => {
          _ucCargaFechada[ui] = aberta;
          renderUcsBT();
        },
        (corpo) => {
          const res = document.createElement("div");
          res.className = "uc-imovel-resumo";
          res.innerHTML = "<strong></strong><span></span>";
          res.firstChild.textContent = _enderecoUCTxt(u);
          res.lastChild.textContent = solicitacaoRotuloBT(u);
          corpo.appendChild(res);
          if (ucSemAlteracao(u)) {
            const info = document.createElement("div");
            info.className = "alert alert-info";
            info.innerHTML =
              "Este imóvel foi marcado como <strong>Imóvel existente sem alteração</strong>. O preenchimento de cargas foi omitido; ele aparecerá apenas no resumo do PDF.";
            corpo.appendChild(info);
            return;
          }
          montarPerfisBT(corpo, u, _ctxPerfilBT(ui));
        },
      ),
    );
  });
  // Combinação de disjuntores entre os imóveis (2+ sem proteção geral).
  const vd = validacaoDisjuntoresBT();
  if (!vd.ok) {
    const aviso = document.createElement("div");
    aviso.className = "cmg-aviso cmg-aviso--error perfil-aviso-combinacao";
    aviso.innerHTML = `<div class="cmg-aviso-icon" aria-hidden="true"></div><p class="cmg-aviso-texto"><span><b>Combinação de disjuntores inválida:</b> ${vd.msg}</span></p>`;
    box.appendChild(aviso);
  }
  if (window.CemigMarcadores) {
    CemigMarcadores.aplicar(box);
    CemigMarcadores.atualizarAvancar();
  }
}

/* ============================================================
   Formulário de Carga do BT (montarCargasBT + CARGA_CATS_BT):
   movido para bt-core.js — o fluxo coletivo/múltiplas torres
   também o usa quando o ND-5.2 não calcula.
   ============================================================ */

/* ============================================================
   Etapa 8 — Prévia & PDF
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
  if (p.estrangeiro) req(p.rne, "Nº do RNE/RNM");
  else req(p.cpfCnpj, "CPF/CNPJ");
  req(p.email, "E-mail");
  req(p.celular, "Celular");
  if (c.alternativa === "Outro e-mail")
    req(c.outroEmail, "E-mail alternativo da fatura");
  else if (c.alternativa === "Endereço novo") {
    req(c.cep, "CEP de correspondência");
    req(c.rua, "Rua/Av. de correspondência");
    req(c.num, "Nº de correspondência");
    req(c.bairro, "Bairro de correspondência");
    req(c.municipio, "Município de correspondência");
  } else if (c.alternativa === "Conta globalizada")
    req(c.contaGlobal, "Conta globalizada");
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
  if (!state.ucsDet.length) faltando.push("Pelo menos um imóvel");
  req(o.tipoRede, "Tipo de rede que atende o local");
  const temCarga = state.ucsDet.some((u) => !ucSemAlteracao(u));
  if (temCarga && !(demandaTotalGeralBT() > 0))
    faltando.push("Previsão de carga / demanda dos imóveis");
  const vd = validacaoDisjuntoresBT();
  if (vd.ok === false) faltando.push("Combinação de disjuntores inválida");
  state.ucsDet.forEach((u, ui) => {
    const im = `Imóvel ${ui + 1}`;
    if (!tipoPropriedadeDe(u)) faltando.push(`${im}: Tipo de propriedade`);
    else if (temRamoBT(u) && !String(u.ramo || "").trim())
      faltando.push(`${im}: Ramo da atividade`);
    if (!ucSemAlteracao(u) && !u.perfil)
      faltando.push(`${im}: Perfil de carga`);
    // Número de instalação/UC fora do padrão (REN ANEEL 1.095/2024): os
    // cards são re-renderizados, então o gate do data-fmt não basta.
    const r = validarInstalacaoUC(u.instalacao);
    if (!r.valido) faltando.push(`${im}: Instalação / UC / Medidor — ${r.msg}`);
    if (u.mudaComplemento) {
      if (!String(u.complemento || "").trim())
        faltando.push(`${im}: Complemento atual`);
      if (!String(u.novoComplemento || "").trim())
        faltando.push(`${im}: Novo complemento`);
    } else if (
      complementoObrigatorioBT() &&
      !String(u.complemento || "").trim()
    )
      faltando.push(`${im}: Complemento`);
  });
  if (o.restricaoAmbiental === "Sim" && !o.restricaoAceite)
    faltando.push("Declaração de ciência da restrição ambiental");
  return { ok: faltando.length === 0, faltando };
}
// Índices das etapas para os lápis da prévia (ordem real do
// Índices de página para os lápis de edição da prévia — a ordem das
// `section.page` em bt/individual.html: orientações=0, dados pessoais=1,
// endereço da unidade=2, imóveis e atendimento=3, cargas dos imóveis=4,
// conta de luz=5, observações=6, prévia=7. "Tipo de atendimento" voltou a ser
// uma etapa própria (referência do Figma da trilha, com 8 passos), separada do
// endereço — daí `dados` e `atend` apontarem para etapas diferentes.
const PG = { prop: 1, dados: 2, atend: 3, cargas: 4, corr: 5 };
// Residencial ou a categoria da Tabela 11 (urbano e rural).
const tipoPropriedadeBT = (u) => tipoPropriedadeDe(u);
// Ramo (texto livre) só existe nos imóveis não residenciais — a irrigação
// rural não pergunta.
const temRamoBT = (u) =>
  !!u.atividade &&
  u.atividade !== "Residencial" &&
  u.atividade !== ATIVIDADE_IRRIGACAO;
const ramoRotuloBT = (u) => (temRamoBT(u) ? ramoParaPdf(u.ramo) : "");
// Rótulo do perfil escolhido para a prévia e o PDF.
function perfilRotuloUcBT(u) {
  if (u.perfil === "personalizado") {
    const base = u.perfilPers && rotuloPerfilBT(u, u.perfilPers.base);
    return "Perfil personalizado" + (base ? ` (baseado no ${base})` : "");
  }
  return rotuloPerfilBT(u, u.perfil);
}
// Card "Perfil de carga escolhido" da prévia (svg_previa/svg_previa2): título
// + lápis, descrição e o resumo da carga ativa do imóvel. `linha` = layout
// horizontal (descrição | resumo), usado dentro do painel "Imóvel N de M".
function _pvPerfilBT(u, linha) {
  const pp = u.perfilPers;
  const p = u.perfil === "personalizado" ? null : perfilPorIdBT(u.perfil);
  const nBase = pp ? perfisDoImovel(u).findIndex((x) => x.id === pp.base) : -1;
  const desc = p
    ? p.desc
    : nBase >= 0
      ? `Baseado no Perfil ${nBase + 1}, com os equipamentos e o disjuntor que você ajustou.`
      : "Com os equipamentos e o disjuntor que você ajustou.";
  const titulo =
    u.perfil === "personalizado"
      ? "Perfil personalizado"
      : rotuloPerfilBT(u, u.perfil);
  const r = resumoCargasBT(u.cargas || {});
  const disj = u.disjEscolhido || r.disjuntores[0] || "—";
  // Mesmas linhas do resumo do card de perfil da Etapa 5 (_linhaPerfilBT).
  const lin = (esq, dir) =>
    `<div class="perfil-linha"><span class="perfil-linha-nome">${esq}</span>` +
    (dir != null
      ? `<span class="perfil-linha-pontos" aria-hidden="true"></span><span class="perfil-linha-qtd">${dir}</span>`
      : "") +
    `</div>`;
  return (
    `<div class="previa-perfil${linha ? " previa-perfil--linha" : ""}">` +
    `<div class="previa-perfil-info"><div class="previa-perfil-titulo">${_escBT(titulo)}` +
    `<button type="button" class="previa-edit" title="Editar" aria-label="Editar perfil de carga" onclick="goTo(${PG.cargas}, true)"></button></div>` +
    `<p class="previa-perfil-desc">${_escBT(desc)}</p></div>` +
    `<div class="previa-perfil-resumo">` +
    lin(
      `<strong>Carga total</strong> aprox. ${_kwBT(r.kw)} kW`,
      `aprox. ${r.n}`,
    ) +
    lin(`<strong>Demanda total</strong> aprox. ${_kwBT(r.kva)} kVA`) +
    lin(`<strong>Disjuntor adequado</strong> ${_escBT(disj)}`) +
    `</div></div>`
  );
}
// Corpo de um imóvel na prévia: identificação, padrão de energia e perfil.
function _pvImovelBT(u, painel) {
  const rural = ruralBT();
  const nova = u.solicitacao === "Conexão Nova";
  let h = `<div class="previa-grid">`;
  h += pvCampoBT(
    "Solicitação de atendimento",
    solicitacaoRotuloBT(u),
    PG.atend,
  );
  if (u.mudaComplemento) {
    h += pvCampoBT("Complemento atual", u.complemento, PG.atend);
    h += pvCampoBT("Novo complemento", u.novoComplemento, PG.atend);
  } else h += pvCampoBT("Complemento", u.complemento, PG.atend);
  h += pvCampoBT("Tipo de propriedade", tipoPropriedadeBT(u), PG.atend);
  if (temRamoBT(u))
    h += pvCampoBT("Ramo da atividade", ramoRotuloBT(u), PG.atend);
  if (!nova && u.instalacao)
    h += pvCampoBT("Nº da unidade/instalação", u.instalacao, PG.atend);
  h +=
    `</div><hr class="previa-divider" />` +
    `<h5 class="previa-imovel-sub">Padrão de energia deste imóvel</h5>` +
    `<div class="previa-grid">`;
  // Mesma ordem e mesmas condições da Etapa 4 (perguntasPadraoBT).
  const dist = pvCampoBT(
    "Distância do padrão até o poste inferior a 30m?",
    u.distMenor30,
    PG.atend,
  );
  const pronto = pvCampoBT(
    "O padrão está pronto para ser ligado?",
    u.prontoLigar,
    PG.atend,
  );
  if (nova) h += dist + pronto;
  else {
    h += pvCampoBT(
      "O padrão precisa ser mudado de local?",
      u.mudancaLocal,
      PG.atend,
    );
    if (perguntasPadraoBT(u)) h += pronto + dist;
  }
  if (rural && u.mudancaLocal === "Sim" && (u.padraoLat || u.padraoLng)) {
    h += pvCampoBT(
      "Novo local do padrão (lat/long)",
      [u.padraoLat, u.padraoLng].filter(Boolean).join(", "),
      PG.atend,
    );
    h += pvCampoBT("Novo local do padrão (UTM)", u.padraoUtm, PG.atend);
  }
  h += `</div>`;
  if (!ucSemAlteracao(u) && u.perfil)
    h +=
      `<hr class="previa-divider" />` +
      `<h5 class="previa-imovel-sub">Perfil de carga escolhido</h5>` +
      _pvPerfilBT(u, painel);
  return h;
}
function renderPreviaBT() {
  const box = $("#previaConteudo");
  if (!box) return;
  // Aquecimento do jsPDF (carga sob demanda): é a lib que desenha os três
  // documentos desta etapa — o PDF do formulário (shared/js/pdf-render.js),
  // o Termo de Opção Grupo B e a Análise de Partida de Motores.
  window.CemigLibs.jspdf().catch(() => {});
  const p = state.prop,
    c = state.corr,
    o = state.obra;
  const pf = pessoaFisica();
  const rural = ruralBT();
  const emailFatura =
    c.alternativa === "E-mail informado"
      ? p.email
      : c.alternativa === "Outro e-mail"
        ? c.outroEmail
        : c.alternativa;
  const secao = (titulo, corpo) =>
    `<div class="previa-secao"><h4 class="previa-secao-titulo">${titulo}</h4>${corpo}</div>`;
  const secoes = [];
  // Dados do proprietário
  let h = `<div class="previa-grid">`;
  h += pvCampoBT("Nome", p.nome, PG.prop, true);
  h += pvCampoBT("E-mail", p.email, PG.prop);
  h += pvCampoBT("Celular", p.celular, PG.prop);
  h += p.estrangeiro
    ? pvCampoBT("Nº do RNE/RNM", p.rne, PG.prop)
    : pvCampoBT(pf ? "CPF" : "CNPJ", p.cpfCnpj, PG.prop);
  if (pf && !p.estrangeiro) {
    h += pvCampoBT("Filiação", p.filiacao, PG.prop);
    h += pvCampoBT("RG", p.rg, PG.prop);
  }
  if (pf) h += pvCampoBT("Data de nascimento", dataBR(p.nasc), PG.prop);
  secoes.push(secao("Dados do proprietário", h + `</div>`));
  // Endereço da unidade consumidora: um só para todos os imóveis.
  h = `<div class="previa-grid">`;
  if (!rural) {
    h += pvCampoBT("CEP", o.cep, PG.dados, true);
    h += pvCampoBT("Endereço", o.endereco, PG.dados);
    h += pvCampoBT("Número", o.num, PG.dados);
    h += pvCampoBT("Complemento", o.compl, PG.dados);
    h += pvCampoBT("Bairro", o.bairro, PG.dados);
    h += pvCampoBT("Cidade", o.cidade, PG.dados);
    h += pvCampoBT("Estado", o.estado, PG.dados);
  } else {
    h += pvCampoBT("Município", o.cidade, PG.dados);
    h += pvCampoBT("Estado", o.estado, PG.dados);
    h += pvCampoBT(
      "Distrito / Comunidade / Região",
      o.distritoComunidade,
      PG.dados,
    );
    h += pvCampoBT("Nome da propriedade", o.nomePropriedade, PG.dados);
    h += pvCampoBT("Ponto de referência", o.pontoRef, PG.dados);
  }
  secoes.push(secao("Endereço da unidade consumidora", h + `</div>`));
  // Imóvel(is) e atendimento: com mais de um imóvel, cada um num painel
  // "Imóvel N de M" (recolhível); com um só, os campos vêm direto na seção.
  const ucs = state.ucsDet;
  const varios = ucs.length > 1;
  if (varios)
    h = ucs
      .map(
        (u, ui) =>
          `<details class="previa-painel previa-imovel" open>` +
          `<summary class="previa-painel-head"><span class="previa-painel-titulo">Imóvel</span>` +
          `<span class="previa-painel-chip">${ui + 1} de ${ucs.length}</span></summary>` +
          `<div class="previa-imovel-corpo">${_pvImovelBT(u, true)}</div></details>`,
      )
      .join("");
  else
    h = ucs.length
      ? `<div class="previa-imovel-corpo">${_pvImovelBT(ucs[0], false)}</div>`
      : "";
  // A rede é uma resposta só, para o endereço inteiro.
  h += `<div class="previa-grid previa-secao-bloco">${pvCampoBT("Tipo de rede que atende o local", o.tipoRede, PG.atend)}</div>`;
  secoes.push(
    secao(varios ? "Imóveis e atendimento" : "Imóvel e atendimento", h),
  );
  // Correspondência
  h = `<div class="previa-grid">`;
  h += pvCampoBT("E-mail para receber a fatura", emailFatura, PG.corr);
  h += pvCampoBT(
    "Data de vencimento da fatura",
    c.vencimento ? "Todo dia " + c.vencimento : "",
    PG.corr,
  );
  secoes.push(secao("Correspondência", h + `</div>`));
  // Observações: só quando há texto.
  const obs = pvObservacoesBT(state.obs);
  if (obs) secoes.push(obs);
  box.classList.add("previa-bt");
  box.innerHTML = secoes.join(`<hr class="previa-divider" />`);
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
  atualizarAvisosPreviaBT();
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
async function exportarPDFPartidaBT() {
  // jsPDF sob demanda; o guard logo abaixo segue valendo se a carga falhar.
  await window.CemigLibs.jspdf().catch(() => {});
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
  if (typeof mostrarModalPdfExportado === "function")
    mostrarModalPdfExportado();
}

/* ===== Exportações ===== */
async function exportarTermoGrupoBBT() {
  // jsPDF sob demanda; o guard de gerarTermoGrupoB alerta se a carga falhar.
  await window.CemigLibs.jspdf().catch(() => {});
  gerarTermoGrupoB({
    prop: state.prop,
    obra: state.obra,
    ucsDet: state.ucsDet,
  });
}
async function exportarPdfBT() {
  const v = validacaoObrigatoriosBT();
  if (!v.ok) {
    renderPreviaBT();
    return;
  }
  // O documento é montado em HTML por bt/js/pdf-doc.js e baixado como PDF
  // por shared/js/pdf-render.js — sem diálogo de impressão.
  await gerarPdfDocumento({
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
/* ===== boot (chamado pelo etapas-loader com o DOM completo) ===== */
window.initFormulario = function () {
  // Título do form-header a partir do card (Baixa Tensão - <subtipo>)
  const subtipo = _prefAtividade || (CARD && CARD.nome) || "";
  const h1 = $("#formTitulo");
  if (h1) h1.textContent = "Baixa Tensão" + (subtipo ? " - " + subtipo : "");
  // Etapa 1 ("Análise técnica antecipada"): o passo 2 cita este formulário.
  document
    .querySelectorAll(".orient-form-nome")
    .forEach((s) => (s.textContent = h1 ? h1.textContent : "Baixa Tensão"));
  btRenumerarEtapas();
  bindInputs();
  montarToggles();
  // Zona travada (card Rural): toggle desabilitado
  if (zonaTravada) {
    const sel = $(`select[data-k="obra.localizacao"]`);
    if (sel) {
      sel.disabled = true;
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
    // Zona fixa em Rural: o seletor (desabilitado) também sai da tela, como
    // no urbano (spec rural svg1).
    const zonaToggle = $(`[data-toggle="obra.localizacao"]`);
    const zonaGrid = zonaToggle && zonaToggle.closest(".grid");
    if (zonaGrid) zonaGrid.style.display = "none";
    const endRural = $("#endRuralBox");
    if (endRural) endRural.style.marginTop = "0";
  } else {
    // Cards não-rurais (residencial/comercial/industrial…): sem opção urbano/
    // rural — a zona fica fixa em Urbana e o seletor é ocultado. Rural só existe
    // no card Rural (travaZonaRural). O bloco rural fica oculto por onZonaBT().
    state.obra.localizacao = "Urbana";
    const sel = $(`select[data-k="obra.localizacao"]`);
    if (sel) sel.value = "Urbana";
    // Oculta a .grid inteira da "Zona de localização" (não só o .field): uma grid
    // vazia ainda ocupa espaço e, somada ao margin-top do #endUrbanoBox, deixava
    // o gap subtítulo→campos maior que o dos outros cards.
    const zonaToggle = $(`[data-toggle="obra.localizacao"]`);
    const zonaGrid = zonaToggle && zonaToggle.closest(".grid");
    if (zonaGrid) zonaGrid.style.display = "none";
    // Sem a linha da zona, o endereço urbano é o 1º bloco de campos — o
    // espaçamento vem do margin-bottom do .card-sub (como nos demais cards).
    const endUrbano = $("#endUrbanoBox");
    if (endUrbano) endUrbano.style.marginTop = "0";
  }
  onZonaBT();
  onReceberEmailBT();
  mostrarCamposPFBT();
  onCoordBT(true);
  renderUcsIdentBT();
  renderUcsBT();
  renderRestricaoAmbiental();
  // Sidebar: navegação livre
  $$(".vstep").forEach((s, i) =>
    s.addEventListener("click", () => goTo(i, true)),
  );
};
