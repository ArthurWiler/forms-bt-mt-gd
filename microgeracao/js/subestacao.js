/* ============================================================
   subestacao.js — BLOCO TÉCNICO DA SUBESTAÇÃO (microgeração)
   ------------------------------------------------------------
   Porte do bloco de média tensão do formulário MT (mt/js/app.js):
   transformadores, motores/cargas especiais, carga operante na
   partida, resumo dos totais e escolha do tipo de subestação.

   DIFERENÇAS DELIBERADAS EM RELAÇÃO AO MT
   ---------------------------------------
   1. NÃO existe subestação compartilhada (multimedição) na
      microgeração. Some com ela todo o ramo de cubículos, a
      pergunta que o governa e os "Totais Consolidados": os
      totais são sempre os dos transformadores da própria UC.
      Onde o MT lê state.compartilhada, aqui vale sempre "Não".
   2. O bloco inteiro só vale no GRUPO A. A microgeração atende
      Grupo B (baixa tensão) e Grupo A (média): em BT não há
      subestação, e o atendimento é dimensionado pelo disjuntor.
   3. A "finalidade" do MT é derivada da solicitação da micro
      (ver _finalidadeGD) — a micro não tem esse campo.
   4. A tensão é guardada em VOLTS ("13800"); o CalculoMT espera
      kV (13.8). A conversão vive em _tensaoMTkVGD().

   A regra de quais modelos de subestação são permitidos vem de
   CalculoMT.tiposSubestacaoPermitidos (mt/js/calculo.js), carregado
   pelo index.html — fonte única com o MT, para as duas telas não
   divergirem com o tempo.
   ============================================================ */

/* ===== Estado modular (espelha o do MT) ===== */
let trafosGD = []; // {potencia, quantidade, tipoLigacao, situacao, substituir, nova*}
let trafosGDAbertos = new Set([0]); // índices dos cards expandidos (acordeão)
let motoresGD = []; // {tipo, fases, cv, fp, rend, volts, ipIn, tempo, dispositivo, tap}
let motoresGDAbertos = new Set([0]);

/* ===== Pontes micro → MT ===== */
/* O MT pergunta a "finalidade" (Conexão Nova / Aumento de Demanda); a micro já
   sabe disso pela solicitação. Ligação nova (inclusive migração BT→MT, que
   estreia um padrão de média tensão) equivale à Conexão Nova do MT. */
function _finalidadeGD() {
  const ehBTtoMT = state.instExistenteBTMT === GD_BT_BAIXA;
  return _ehLigacaoNova() || ehBTtoMT ? "Conexão Nova" : "Aumento de Demanda";
}
/* CalculoMT raciocina em kV; o estado guarda o volt "cru" porque ele é chave
   de regra (ver GD_TENSAO_LIGNOVA_138 em data.js). */
function _tensaoMTkVGD() {
  const v = parseFloat(state.tensaoAtendimento);
  return v ? v / 1000 : "";
}
function _fmtGD(n) {
  const v = parseFloat(n);
  if (!isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
/* Só o Grupo A tem subestação: em BT o atendimento é pelo disjuntor. */
function _mostrarBlocoTecnicoGD() {
  return state.grupo === "A";
}

/* ============================================================
   TRANSFORMADORES
   ============================================================ */
/* 1 card = 1 transformador (mesma premissa do MT): a quantidade total vem do
   número de cards, por isso `quantidade` fica fixa em 1 e não é perguntada
   dentro do card — quem a controla é "Quantidade de transformadores". */
function novoTrafoGD() {
  return {
    potencia: "",
    quantidade: "1",
    // Tipo de ligação (∆-Y, ∆-∆, …) no lugar da corrente de inrush do MT: a
    // microgeração não calcula nada com o inrush — quem dimensiona a
    // subestação aqui é só potência × demanda. Abre vazio, como o select
    // equivalente da minigeração.
    tipoLigacao: "",
    // Situação declarada: "troca" | "novo" | "sem". `substituir` é derivado
    // dela — só a troca usa os campos nova*.
    situacao: "novo",
    substituir: false,
    novaPotencia: "",
    novaTipoLigacao: "",
  };
}
/* <option>s do tipo de ligação, com o valor do trafo já marcado. */
function _opcoesTipoLigGD(valor) {
  return (
    '<option value=""></option>' +
    GD_TIPO_LIG_TRAFO.map(
      (v) => `<option value="${v}"${v === valor ? " selected" : ""}>${v}</option>`,
    ).join("")
  );
}
/* A troca de transformador só existe quando há instalação anterior: em
   Conexão Nova todo trafo é, por definição, novo. */
function _permiteTrocaTrafoGD() {
  return _finalidadeGD() !== "Conexão Nova";
}
function _potenciaFuturaTrafoGD(t) {
  return t.substituir ? t.novaPotencia : t.potencia;
}
/* Projeta a lista no que ela será DEPOIS da obra — é ela que dimensiona a
   instalação (o equipamento substituído sai). */
function _trafosFuturosGD(lista) {
  return lista.map((t) => ({
    potencia: _potenciaFuturaTrafoGD(t),
    quantidade: t.quantidade,
  }));
}
// O rótulo do card é a AÇÃO ("Manter/Trocar este transformador"); o badge do
// cabeçalho é o ESTADO resultante ("Mantido"/"Substituído"/"Novo").
const TRAFO_SITUACOES_GD = [
  { v: "troca", label: "Trocar este transformador" },
  { v: "novo", label: "Novo transformador" },
  { v: "sem", label: "Manter este transformador" },
];
function _situacaoTrafoGD(t) {
  return t.situacao || (t.substituir ? "troca" : "novo");
}
function setTrafoSituacaoGD(i, valor) {
  const t = trafosGD[i];
  if (!t) return;
  t.situacao = valor;
  t.substituir = valor === "troca";
  // Ao marcar a troca pela primeira vez, semeia a nova potência com a atual —
  // o usuário costuma alterar só esse número.
  if (t.substituir && t.novaPotencia === "") t.novaPotencia = t.potencia;
  renderTrafosGD();
  recalcTecnicoGD();
}
/* Cria/remove cards para bater com o valor digitado no campo de quantidade. */
function sincronizarTrafos() {
  const el = $('[data-k="qtdTransformador"]');
  const bruto = parseInt(el?.value, 10);
  if (el && el.value !== "" && (isNaN(bruto) || bruto < 1)) return; // aguarda valor válido
  const n = Math.min(Math.max(bruto || 0, 0), 99); // teto igual ao max do input
  while (trafosGD.length < n) trafosGD.push(novoTrafoGD());
  trafosGD.length = n;
  state.qtdTransformador = n;
  if (!trafosGDAbertos.size && n) trafosGDAbertos.add(0);
  renderTrafosGD();
  recalcTecnicoGD();
}
function toggleTrafoGD(i) {
  trafosGDAbertos.has(i) ? trafosGDAbertos.delete(i) : trafosGDAbertos.add(i);
  renderTrafosGD();
}
function renderTrafosGD() {
  const box = $("#trafoCards");
  if (!box) return;
  const total = trafosGD.length;
  box.innerHTML = trafosGD
    .map((t, i) => {
      const aberto = trafosGDAbertos.has(i);
      const troca = _permiteTrocaTrafoGD();
      const situacao = _situacaoTrafoGD(t);
      const subst = troca && situacao === "troca";
      // "Mantido" é neutro: o equipamento já existe e permanece — não é novo
      // nem uma substituição.
      const semAlt = troca && situacao === "sem";
      // Em Conexão Nova não há badge de status: todo trafo é novo.
      const status = !troca
        ? ""
        : `<span class="trafo-status${subst ? " is-substituido" : semAlt ? " is-existente" : " is-novo"}">${subst ? "Substituído" : semAlt ? "Mantido" : "Novo"}</span>`;
      const radios = !troca
        ? ""
        : `<div class="toggle-group trafo-troca" role="radiogroup" aria-label="Situação do transformador ${i + 1}">
          ${TRAFO_SITUACOES_GD.map(
            (o) =>
              `<button type="button" role="radio" class="toggle-btn${situacao === o.v ? " on" : ""}"
                       aria-checked="${situacao === o.v}"
                       onclick="setTrafoSituacaoGD(${i},'${o.v}')">${o.label}</button>`,
          ).join("")}
        </div>`;
      // Num trafo substituído a primeira linha descreve o equipamento atual;
      // a segunda, o que entra no lugar.
      const linhaNova = !subst
        ? ""
        : `<div class="trafo-card-grid">
          <div class="field">
            <label for="trafoGdNovaPotencia${i}">Nova potência (kVA)</label>
            <input id="trafoGdNovaPotencia${i}" type="number" step="any" value="${t.novaPotencia ?? ""}" placeholder=" "
                   oninput="trafosGD[${i}].novaPotencia=this.value;recalcTecnicoGD()">
          </div>
          <div class="field">
            <label for="trafoGdNovaTipoLig${i}">Tipo de ligação</label>
            <select id="trafoGdNovaTipoLig${i}"
                    onchange="trafosGD[${i}].novaTipoLigacao=this.value">${_opcoesTipoLigGD(t.novaTipoLigacao)}</select>
          </div>
        </div>`;
      return `<div class="trafo-card${aberto ? " is-open" : ""}">
      <button type="button" class="trafo-card-head" onclick="toggleTrafoGD(${i})"
              aria-expanded="${aberto}" aria-controls="trafoGdCardBody${i}">
        <span class="trafo-titulo">Transformador</span>
        <span class="trafo-badge">${i + 1} de ${total}</span>
        ${status}
        <span class="trafo-chevron" aria-hidden="true"></span>
      </button>
      <div class="trafo-card-body" id="trafoGdCardBody${i}"${aberto ? "" : " hidden"}>
        ${radios}
        <div class="trafo-card-grid">
          <div class="field">
            <label for="trafoGdPotencia${i}">Potência (kVA)</label>
            <input id="trafoGdPotencia${i}" type="number" step="any" value="${t.potencia}" placeholder=" "
                   oninput="trafosGD[${i}].potencia=this.value;recalcTecnicoGD()">
          </div>
          <div class="field">
            <label for="trafoGdTipoLig${i}">Tipo de ligação</label>
            <select id="trafoGdTipoLig${i}"
                    onchange="trafosGD[${i}].tipoLigacao=this.value">${_opcoesTipoLigGD(t.tipoLigacao)}</select>
          </div>
        </div>
        ${linhaNova}
      </div>
    </div>`;
    })
    .join("");
  // Aviso de demanda × potência: fica depois de todos os cards, fora deles.
  _validarDemandaVsPotenciaGD();
  if (window.CemigMarcadores) window.CemigMarcadores.aplicar();
}

/* ============================================================
   DEMANDA QUE DIMENSIONA A SUBESTAÇÃO
   ------------------------------------------------------------
   A microgeração NÃO tem modalidade tarifária horária (Verde/Azul)
   nem demanda escalonada — os dois blocos do MT não vieram.

   A demanda que dimensiona a subestação é a potência contratada que a
   própria etapa já pergunta no Grupo A. Não se cria um segundo campo:
   vale a potência A CONTRATAR (state.demandaConsumo — "a ser contratada"
   na conexão nova, "futura" na alteração de potência) e, quando ela não
   se aplica (existente SEM alteração), a potência atual
   (state.demandaConsumoAtual). O campo que não se aplica fica oculto e
   zerado por _atualizarPotenciaContratada() (js/app.js).

   Sem nenhuma das duas preenchidas a demanda fica 0 — CalculoMT então
   cai na potência instalada dos transformadores, que é o comportamento
   documentado em tiposSubestacaoPermitidos: "sem demanda declarada,
   cai-se na potência instalada para não liberar modelo que o valor real
   excluiria".
   ============================================================ */
function demandaRepresentativaGD() {
  const aContratar = parseFloat(state.demandaConsumo);
  if (Number.isFinite(aContratar)) return aContratar;
  const atual = parseFloat(state.demandaConsumoAtual);
  return Number.isFinite(atual) ? atual : 0;
}
/* A potência contratada vive fora deste bloco (são campos da própria etapa),
   mas alimenta o dimensionamento: ao mudar, refaz os modelos permitidos, o
   resumo e o aviso de coerência. Chamada pelo oninput dos dois campos, por
   isso sincroniza ambos. */
function onDemandaConsumoGD() {
  _sync("demandaConsumo");
  _sync("demandaConsumoAtual");
  if (_mostrarBlocoTecnicoGD()) recalcTecnicoGD();
}
/* A potência declarada não pode superar a potência instalada. */
function _validarDemandaVsPotenciaGD() {
  const el = $("#demandaVsPotenciaAlert");
  if (!el) return;
  const pot = parseFloat(state.potTotalTrafos) || 0;
  const dem = demandaRepresentativaGD();
  el.innerHTML =
    dem > 0 && pot > 0 && dem > pot
      ? `<div class="cmg-aviso cmg-aviso--error no-print">
           <div class="cmg-aviso-icon" aria-hidden="true"></div>
           <p class="cmg-aviso-texto">A potência contratada (${_fmtGD(dem)} kW) não pode ser superior à potência total dos transformadores (${_fmtGD(pot)} kVA).</p>
         </div>`
      : "";
}

/* ============================================================
   MOTORES E CARGAS ESPECIAIS
   ------------------------------------------------------------
   Diferente do MT, NÃO se coletam aqui os dados de "Análise de
   Partida" do motor pesado: a microgeração não tem essa página
   nem o PDF correspondente.
   ============================================================ */
function novoMotorGD() {
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
function sincronizarMotores() {
  const el = $('[data-k="qtdMotores"]');
  const bruto = parseInt(el?.value, 10);
  if (el && el.value !== "" && (isNaN(bruto) || bruto < 0)) return; // aguarda valor válido
  const n = Math.min(Math.max(bruto || 0, 0), 99); // teto igual ao max do input
  while (motoresGD.length < n) motoresGD.push(novoMotorGD());
  motoresGD.length = n;
  state.qtdMotores = n;
  if (!motoresGDAbertos.size && n) motoresGDAbertos.add(0);
  renderMotoresGD();
  atualizarCargaOperanteGD();
}
function toggleMotorGD(i) {
  motoresGDAbertos.has(i)
    ? motoresGDAbertos.delete(i)
    : motoresGDAbertos.add(i);
  renderMotoresGD();
}
function _motorCalcHTMLGD(c) {
  return `<div class="motor-card-calc">
    <div class="item"><span class="lbl">Pot (kVA)</span><span class="val" data-campo="potkVA">${_fmtGD(c.potkVA)}</span></div>
    <div class="item"><span class="lbl">Pot (kW)</span><span class="val" data-campo="potkW">${_fmtGD(c.potkW)}</span></div>
    <div class="item"><span class="lbl">I nom (A)</span><span class="val" data-campo="iNominal">${_fmtGD(c.iNominal)}</span></div>
    <div class="item"><span class="lbl">I part (A)</span><span class="val" data-campo="iPartida">${_fmtGD(c.iPartida)}</span></div>
    <div class="item"><span class="lbl">Ip prim (A)</span><span class="val" data-campo="ipPrimario">${c.ipPrimario == null ? "—" : _fmtGD(c.ipPrimario)}</span></div>
  </div>`;
}
function _calcMotorGD(m) {
  return CalculoMT.calcularMotor(
    {
      potenciaCV: m.cv,
      fp: m.fp,
      rendimento: m.rend,
      tensaoV: m.volts,
      relacaoIpIn: m.ipIn,
    },
    _tensaoMTkVGD(),
  );
}
function renderMotoresGD() {
  const box = $("#motoresCardsContainer");
  if (!box) return;
  box.innerHTML = "";
  const total = motoresGD.length;
  motoresGD.forEach((m, i) => {
    const c = _calcMotorGD(m);
    const dispOpts = GD_DISPOSITIVOS_MOTOR.map(
      (d) => `<option ${m.dispositivo === d ? "selected" : ""}>${d}</option>`,
    ).join("");
    const compensadora = m.dispositivo === "Chave Compensadora";
    const aberto = motoresGDAbertos.has(i);
    const card = document.createElement("div");
    card.className = "motor-card" + (aberto ? " is-open" : "");
    card.dataset.motorRow = i;
    card.innerHTML = `
      <button type="button" class="motor-card-head" onclick="toggleMotorGD(${i})"
              aria-expanded="${aberto}" aria-controls="motorGdCardBody${i}">
        <span class="motor-titulo">Motor</span>
        <span class="motor-badge">${i + 1} de ${total}</span>
        <span class="motor-chevron" aria-hidden="true"></span>
      </button>
      <div class="motor-card-body" id="motorGdCardBody${i}"${aberto ? "" : " hidden"}>
        <div class="motor-card-grid">
          <div class="field"><label>Fases</label><select onchange="motoresGD[${i}].fases=this.value;renderMotoresGD()"><option ${m.fases === "Monofásico" ? "selected" : ""}>Monofásico</option><option ${m.fases !== "Monofásico" ? "selected" : ""}>Trifásico</option></select></div>
          <div class="field"><label>CV</label><input type="number" step="any" value="${m.cv}" placeholder=" " oninput="motoresGD[${i}].cv=this.value;atualizarCalculosMotorGD(this)"></div>
          <div class="field"><label>FP</label><input type="number" step="any" value="${m.fp}" placeholder=" " oninput="motoresGD[${i}].fp=this.value;atualizarCalculosMotorGD(this)"></div>
          <div class="field"><label>Rendimento</label><input type="number" step="any" value="${m.rend}" placeholder=" " oninput="motoresGD[${i}].rend=this.value;atualizarCalculosMotorGD(this)"></div>
          <div class="field"><label>Tensão (V)</label><input type="number" step="any" value="${m.volts}" placeholder=" " oninput="motoresGD[${i}].volts=this.value;atualizarCalculosMotorGD(this)"></div>
          <div class="field"><label>IP/IN</label><input type="number" step="any" value="${m.ipIn}" placeholder=" " oninput="motoresGD[${i}].ipIn=this.value;atualizarCalculosMotorGD(this)"></div>
          <div class="field"><label>Tempo IP (s)</label><input type="number" step="any" value="${m.tempo}" placeholder=" " oninput="motoresGD[${i}].tempo=this.value"></div>
          <div class="field"><label>Disp. Partida</label><select onchange="onDispositivoMotorGD(this,${i})"><option value=""></option>${dispOpts}</select></div>
          <div class="field motor-tap-field" style="display:${compensadora ? "" : "none"}"><label>Tap (%)</label><input type="number" step="any" value="${m.tap || ""}" placeholder=" " oninput="motoresGD[${i}].tap=this.value"></div>
        </div>
        ${_motorCalcHTMLGD(c)}
      </div>`;
    box.appendChild(card);
  });
  if (window.CemigMarcadores) window.CemigMarcadores.aplicar();
}
/* Recalcula só os valores elétricos de UM motor e atualiza pontualmente os
   itens .val do card — isolado via this.closest('.motor-card'), sem
   reconstruir o contêiner geral, o que manteria o foco instável e travaria a
   digitação a cada caractere. */
function atualizarCalculosMotorGD(inputEl) {
  const card = inputEl.closest(".motor-card");
  if (!card) return;
  const i = parseInt(card.dataset.motorRow, 10);
  const m = motoresGD[i];
  if (!m) return;
  const c = _calcMotorGD(m);
  const setCalc = (campo, val) => {
    const el = card.querySelector(`.val[data-campo="${campo}"]`);
    if (el) el.textContent = val;
  };
  setCalc("potkVA", _fmtGD(c.potkVA));
  setCalc("potkW", _fmtGD(c.potkW));
  setCalc("iNominal", _fmtGD(c.iNominal));
  setCalc("iPartida", _fmtGD(c.iPartida));
  setCalc("ipPrimario", c.ipPrimario == null ? "—" : _fmtGD(c.ipPrimario));
}
/* Mostra/oculta o sub-campo Tap (%) isolado no card alterado, sem reconstruir
   o contêiner geral. */
function onDispositivoMotorGD(selectEl, i) {
  if (motoresGD[i]) motoresGD[i].dispositivo = selectEl.value;
  const card = selectEl.closest(".motor-card");
  const tap = card && card.querySelector(".motor-tap-field");
  if (tap)
    tap.style.display = selectEl.value === "Chave Compensadora" ? "" : "none";
}
/* Carga operante na partida só faz sentido havendo motores declarados. */
function atualizarCargaOperanteGD() {
  const box = $("#blocoCargaOperante");
  if (box) box.style.display = motoresGD.length > 0 ? "" : "none";
  // Campo oculto não pode manter valor: sem motores, um número digitado antes
  // continuaria no estado e sairia no PDF.
  if (!motoresGD.length) {
    if (state.cargaOperante || state.ipPrevista || state.tempoPartida)
      aplicarPatch({ cargaOperante: "", ipPrevista: "", tempoPartida: "" });
  }
}

/* ============================================================
   RESUMO DOS DADOS (KPIs) + ESCOLHA DO TIPO DE SUBESTAÇÃO
   ------------------------------------------------------------
   Os KPIs mostram os totais que DETERMINAM quais modelos são
   permitidos (demanda e potência respondem pelos tetos), por isso
   ficam imediatamente acima da galeria.

   A seção só aparece quando há dados suficientes para os totais
   fazerem sentido — do contrário o usuário veria "0 kVA" e uma
   lista de modelos calculada sobre o vazio.
   ============================================================ */
function _resumoSEProntoGD() {
  if (!state.tensaoAtendimento) return false;
  // Sem potência declarada não há como dimensionar: os cards de transformador
  // ainda não foram preenchidos. A demanda NÃO entra como condição — em
  // ligação nova ela nem é perguntada, e exigi-la esconderia o resumo (e a
  // escolha da subestação) justamente no caso em que ela não existe.
  return state.potTotalTrafos > 0;
}
function renderResumoSEGD() {
  const box = $("#blocoResumoSE");
  const grade = $("#resumoSEKpis");
  if (!box || !grade) return false;
  const pronto = _resumoSEProntoGD();
  box.style.display = pronto ? "block" : "none";
  if (!pronto) {
    grade.innerHTML = "";
    return false;
  }
  const dem = demandaRepresentativaGD();
  const kpis = [
    // Sem potência contratada declarada o dimensionamento recai sobre a
    // potência instalada — o KPI diz isso em vez de mostrar "0 kW".
    [
      "Potência contratada",
      dem > 0 ? `${_fmtGD(dem)} kW` : "— (dimensiona pela potência)",
    ],
    [
      "Potência total dos transformadores",
      `${_fmtGD(state.potTotalTrafos)} kVA`,
    ],
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
/* Exibe a escolha do tipo de subestação (nova ou alteração) só quando os
   totais já existem — os mesmos totais dos KPIs, que são o que filtra os
   modelos permitidos. Conexão Nova e alteração são caminhos EXCLUSIVOS. */
function atualizarVisibilidadeSEGD() {
  const ehNova = _finalidadeGD() === "Conexão Nova";
  const pronto = renderResumoSEGD();
  const boxNova = $("#blocoSubestacaoNova");
  const boxAlt = $("#blocoSubestacaoAlteracao");
  if (boxNova) boxNova.style.display = ehNova && pronto ? "block" : "none";
  if (boxAlt) boxAlt.style.display = !ehNova && pronto ? "block" : "none";
}
function preencherTiposSEGD() {
  const lista = CalculoMT.tiposSubestacaoPermitidos({
    finalidade: _finalidadeGD(),
    tensaoMTkV: _tensaoMTkVGD(),
    compartilhada: "Não", // a microgeração não tem subestação compartilhada
    potencia: state.potTotalTrafos,
    demanda: demandaRepresentativaGD(),
  });
  // Conexão nova: só os modelos permitidos.
  const selNova = $("#cn_tipoSE");
  if (selNova) {
    const atual = selNova.value;
    selNova.innerHTML =
      '<option value=""></option>' +
      lista
        .map((s) => `<option ${atual === s ? "selected" : ""}>${s}</option>`)
        .join("");
    // Modelo único: não há escolha a fazer, então já vem marcado.
    if (lista.length === 1) {
      selNova.value = lista[0];
      state.cn_tipoSE = lista[0];
    } else if (!lista.includes(atual)) {
      selNova.value = "";
      state.cn_tipoSE = "";
    }
  }
  // Alteração: o modelo ATUAL parte da lista completa (o que já existe no
  // local pode ser um modelo que hoje não seria mais permitido); o modelo
  // NOVO segue a lista filtrada.
  const selAtual = $("#alt_tipoAtual");
  if (selAtual) {
    const atual = selAtual.value;
    selAtual.innerHTML =
      '<option value=""></option>' +
      CalculoMT.tiposSubestacao()
        .map((s) => `<option ${atual === s ? "selected" : ""}>${s}</option>`)
        .join("");
    selAtual.value = atual;
  }
  const selPara = $("#alt_tipoPara");
  if (selPara) {
    const atual = selPara.value;
    selPara.innerHTML =
      '<option value=""></option>' +
      lista
        .map((s) => `<option ${atual === s ? "selected" : ""}>${s}</option>`)
        .join("");
    if (!lista.includes(atual)) {
      selPara.value = "";
      state.alt_tipoPara = "";
    }
  }
  renderGaleriaSEGD("seGallery_nova", "cn_tipoSE");
  renderGaleriaSEGD("seGallery_atual", "alt_tipoAtual");
  renderGaleriaSEGD("seGallery_para", "alt_tipoPara");
}
/* Galeria visual dos modelos: os <select> ficam como fonte de estado e são
   espelhados pelos cards. Usa as imagens em base64 que a micro já carrega
   (SUBESTACAO_IMGS_B64) — o MT usa arquivos soltos, cujo caminho relativo não
   valeria a partir de microgeracao/. */
function renderGaleriaSEGD(containerId, selectId) {
  const cont = $("#" + containerId),
    sel = $("#" + selectId);
  if (!cont || !sel) return;
  const imgs =
    typeof SUBESTACAO_IMGS_B64 !== "undefined" ? SUBESTACAO_IMGS_B64 : {};
  const opts = [...sel.options].filter((o) => o.value !== "");
  cont.innerHTML = opts
    .map((o) => {
      const n = (String(o.value).match(/(\d+)/) || [])[1];
      const marcado = o.value === sel.value ? " selected" : "";
      return `<div class="se-card${marcado}" onclick="selecionarSEGD('${selectId}','${o.value}')">
      ${n && SE_INFO_GD[n] ? `<span class="se-info">i<span class="se-tooltip">${SE_INFO_GD[n]}</span></span>` : ""}
      ${n && imgs[n] ? `<img src="${imgs[n]}" alt="${o.value}">` : ""}
      <div class="lbl">${o.value}</div>
    </div>`;
    })
    .join("");
}
function selecionarSEGD(selectId, value) {
  const sel = $("#" + selectId);
  if (!sel) return;
  // Clicar no card já marcado não desmarca: a escolha é obrigatória.
  sel.value = value;
  if (typeof sel.onchange === "function") sel.onchange();
  else recalcRamal();
}
/* A troca do tipo de subestação é DEDUZIDA: há troca quando o novo modelo foi
   escolhido e difere do atual. Enquanto o usuário não escolher, vale "Não". */
function _trocaSEDeduzidaGD() {
  if (_finalidadeGD() === "Conexão Nova") return "";
  const atual = $("#alt_tipoAtual")?.value || "";
  const novo = $("#alt_tipoPara")?.value || "";
  if (!novo) return "Não";
  return novo === atual ? "Não" : "Sim";
}
/* Tipo de subestação EFETIVO — o que vale para a instalação depois da obra. */
function tipoSEefetivoGD() {
  if (_finalidadeGD() === "Conexão Nova") return $("#cn_tipoSE")?.value || "";
  if (state.alt_troca === "Sim") return $("#alt_tipoPara")?.value || "";
  return $("#alt_tipoAtual")?.value || "";
}
/* Nome mantido por ser o que os <select> do fragmento chamam no onchange.
   Diferente do MT, aqui NÃO existe galeria de ramal (o ramal da micro é o
   campo Aéreo/Subterrâneo da própria etapa): a função só consolida o estado
   derivado das galerias. */
function recalcRamal() {
  state.cn_tipoSE = $("#cn_tipoSE")?.value || "";
  state.alt_tipoAtual = $("#alt_tipoAtual")?.value || "";
  state.alt_tipoPara = $("#alt_tipoPara")?.value || "";
  state.alt_troca = _trocaSEDeduzidaGD();
  // tipoSE é o campo que a prévia e o PDF leem — sempre o modelo efetivo.
  state.tipoSE = tipoSEefetivoGD();
  renderGaleriaSEGD("seGallery_nova", "cn_tipoSE");
  renderGaleriaSEGD("seGallery_atual", "alt_tipoAtual");
  renderGaleriaSEGD("seGallery_para", "alt_tipoPara");
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}

/* ============================================================
   RECÁLCULO GERAL + VISIBILIDADE DO BLOCO
   ============================================================ */
function recalcTecnicoGD() {
  // Num trafo marcado para troca o que dimensiona a instalação é a potência
  // NOVA — a atual sai junto com o equipamento antigo.
  const rt = CalculoMT.calcularTrafos(_trafosFuturosGD(trafosGD));
  state.potTotalTrafos = rt.potenciaTotal;
  state.qtdTotalTrafos = rt.quantidadeTotal;
  // Espelho para o PDF/prévia, que já liam state.trafos no formato {qte,potencia}.
  state.trafos = trafosGD.map((t) => ({
    qte: t.quantidade,
    potencia: _potenciaFuturaTrafoGD(t),
  }));
  state.motores = motoresGD;
  _validarDemandaVsPotenciaGD();
  atualizarVisibilidadeSEGD();
  preencherTiposSEGD();
  recalcRamal();
}
/* Ponto de entrada único do bloco — chamado pela tensão de conexão, pelo
   grupo, pela solicitação e pela potência instalada. Nome mantido: já era o
   que o resto do app.js chamava quando a subestação era a galeria antiga. */
function atualizarSE() {
  const bloco = $("#blocoTecnicoIndividual");
  const mostrar = _mostrarBlocoTecnicoGD();
  if (bloco) bloco.style.display = mostrar ? "block" : "none";
  if (!mostrar) {
    // Grupo B não tem subestação: o que foi declarado aqui não pode
    // sobreviver escondido e sair no PDF.
    if (trafosGD.length || motoresGD.length) {
      trafosGD = [];
      motoresGD = [];
    }
    state.tipoSE = "";
    state.cn_tipoSE = "";
    state.alt_tipoAtual = "";
    state.alt_tipoPara = "";
    state.alt_troca = "";
    state.potTotalTrafos = 0;
    state.qtdTotalTrafos = 0;
    state.trafos = [];
    state.motores = [];
    return;
  }
  // Em Conexão Nova não há trafo "existente" a trocar: uma situação de troca
  // escolhida antes de mudar a solicitação ficaria presa no estado.
  if (!_permiteTrocaTrafoGD())
    trafosGD.forEach((t) => {
      t.situacao = "novo";
      t.substituir = false;
    });
  renderTrafosGD();
  renderMotoresGD();
  atualizarCargaOperanteGD();
  recalcTecnicoGD();
}
/* Faltas do bloco técnico para o gate de exportação (etapa Prévia). */
function gdValidarSubestacao() {
  const faltas = [];
  if (!_mostrarBlocoTecnicoGD()) return faltas;
  if (!trafosGD.length) faltas.push("Dados dos transformadores");
  // Só a potência é validada: a quantidade não é campo do card (1 card = 1
  // transformador), então não há como o usuário deixá-la inválida.
  trafosGD.forEach((t, i) => {
    if (!(parseFloat(_potenciaFuturaTrafoGD(t)) > 0))
      faltas.push(`Potência do transformador ${i + 1}`);
  });
  // A potência contratada em si NÃO é exigida aqui: quem a exige é
  // validarExportacao(), no mesmo critério dos campos (ver
  // _atualizarPotenciaContratada). O que se valida aqui é a coerência dela com
  // os transformadores declarados.
  const pot = parseFloat(state.potTotalTrafos) || 0;
  const dem = demandaRepresentativaGD();
  if (dem > 0 && pot > 0 && dem > pot)
    faltas.push(
      `Potência contratada (${_fmtGD(dem)} kW) acima da potência dos transformadores (${_fmtGD(pot)} kVA)`,
    );
  if (!tipoSEefetivoGD()) faltas.push("Tipo de subestação");
  return faltas;
}
