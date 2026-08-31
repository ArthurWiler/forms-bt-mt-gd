/* ============================================================
   subestacao.js — BLOCO TÉCNICO DA SUBESTAÇÃO (minigeração)
   ------------------------------------------------------------
   Porte do bloco de média tensão do MT (mt/js/app.js) por meio do
   equivalente da microgeração (microgeracao/js/subestacao.js):
   transformadores, motores/cargas especiais, carga operante na
   partida, resumo dos totais e escolha do tipo de subestação.

   DIFERENÇAS DELIBERADAS
   ----------------------
   1. Em relação à MICROGERAÇÃO: aqui EXISTE subestação
      compartilhada (multimedição). Volta todo o ramo de cubículos
      do MT e os "Totais Consolidados". Cada cubículo tem a sua
      instalação, os seus transformadores e a sua demanda.
   2. Em relação ao MT: o cliente NÃO informa modalidade tarifária
      (Verde/Azul) nem demanda escalonada — a tarifa é padronizada
      pela CEMIG. O cubículo declara uma demanda única em kW.
      Sai junto a corrente de inrush, substituída pelo tipo de
      ligação do transformador (como na microgeração).
   3. O modelo NOVO de subestação (#alt_tipoPara) é filtrado pelo
      critério de CONEXÃO NOVA, não pelo da finalidade corrente —
      ver preencherTiposSEGD(). Divergência restrita à minigeração.
   4. Regra 9 (teto de 300 kVA) sobrevive como pós-filtro por
      POTÊNCIA DE GERAÇÃO — ver _tiposSEminiGD().

   A regra de quais modelos são permitidos vem de
   CalculoMT.tiposSubestacaoPermitidos (mt/js/calculo.js), carregado
   pelo index.html — fonte única com o MT e com a microgeração.
   ============================================================ */

/* ===== Estado modular (espelha o do MT) ===== */
let trafosGD = []; // {potencia, quantidade, tipoLigacao, situacao, substituir, nova*}
let trafosGDAbertos = new Set([0]); // índices dos cards expandidos (acordeão)
let motoresGD = []; // {tipo, fases, cv, fp, rend, volts, ipIn, tempo, dispositivo, tap}
let motoresGDAbertos = new Set([0]);
let cubiculosGD = []; // {instalacao, trafos[], demanda, demandaAtual, existente}
let cubiculosGDAbertos = new Set([0]);

/* ===== Pontes mini → MT ===== */
/* O MT pergunta a "finalidade" (Conexão Nova / Aumento de Demanda); a mini já
   sabe disso pela solicitação: ligação nova equivale à Conexão Nova do MT.
   O ramo da migração BT→MT saiu junto com o campo instExistenteBTMT, removido
   da etapa 4 por repetir o "Número da Instalação / UC / Medidor" do topo. */
function _finalidadeGD() {
  return _ehLigacaoNova() ? "Conexão Nova" : "Aumento de Demanda";
}
/* CalculoMT raciocina em kV; o estado guarda o volt "cru" porque é o que o PDF
   sempre imprimiu e o que o <select> grava. */
function _tensaoMTkVGD() {
  const v = parseFloat(state.tensaoAtendimento);
  return v ? v / 1000 : "";
}
/* O campo "Tipo de edificação" da minigeração (data-k entradaEnergia) é o
   "Subestação compartilhada (multimedição)?" do MT com outro rótulo.
   CalculoMT espera "Sim"/"Não". */
function _compartilhadaGD() {
  return state.entradaEnergia === GD_ENTRADA_COMPARTILHADA ? "Sim" : "Não";
}
function _ehCompartilhadaGD() {
  return _compartilhadaGD() === "Sim";
}
/* A minigeração é sempre Grupo A — não existe o ramo de baixa tensão da micro.
   O que governa a exibição é o "Tipo de edificação": Individual e Compartilhada
   levam a blocos diferentes, então nada aparece antes de ele ser respondido. */
function _mostrarBlocoTecnicoGD() {
  return !!state.entradaEnergia;
}
function _fmtGD(n) {
  const v = parseFloat(n);
  if (!isFinite(v)) return "—";
  return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}
/* Aviso do bloco. _alertHTML (js/app.js) não conhece o nível "error" nem
   acrescenta `no-print` — os avisos daqui são de tela, não do PDF. */
function _avisoGD(tipo, html) {
  const mod =
    tipo === "error"
      ? " cmg-aviso--error"
      : tipo === "warn"
        ? " cmg-aviso--warn"
        : "";
  return (
    '<div class="cmg-aviso' +
    mod +
    ' no-print"><div class="cmg-aviso-icon" aria-hidden="true"></div>' +
    '<p class="cmg-aviso-texto">' +
    html +
    "</p></div>"
  );
}
/* Valor vindo do usuário dentro de um atributo HTML de template. */
function _escAttrGD(v) {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
}
function _setHTMLGD(id, html) {
  const el = $("#" + id);
  if (el) el.innerHTML = html;
}
function _mostrarGD(sel, ver) {
  const el = $(sel);
  if (el) el.style.display = ver ? "" : "none";
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
    // minigeração não calcula nada com o inrush.
    tipoLigacao: "",
    // Impedância percentual: característica do EQUIPAMENTO, não da instalação —
    // por isso é declarada em cada card (individual e de cubículo) e não uma vez
    // para a UC inteira, como era até então (state.impedanciaTrafo).
    impedancia: "",
    // Situação declarada: "troca" | "novo" | "sem". `substituir` é derivado
    // dela — só a troca usa os campos nova*.
    situacao: "novo",
    substituir: false,
    novaPotencia: "",
    novaTipoLigacao: "",
    novaImpedancia: "",
    // Par de demanda do transformador, espelho do par do cubículo: a
    // CONTRATAR ("a ser contratada" na ligação nova, "futura" na alteração) e
    // a ATUAL. Quais aparecem sai de _paresPotenciaGD() — ver renderTrafosGD.
    demanda: "",
    demandaAtual: "",
  };
}
/* <option>s do tipo de ligação, com o valor do trafo já marcado. */
function _opcoesTipoLigGD(valor) {
  return (
    '<option value=""></option>' +
    GD_TIPO_LIG_TRAFO.map(
      (v) =>
        `<option value="${v}"${v === valor ? " selected" : ""}>${v}</option>`,
    ).join("")
  );
}
/* A troca de transformador só existe quando há instalação anterior: em Conexão
   Nova todo trafo é, por definição, novo. */
function _permiteTrocaTrafoGD() {
  return _finalidadeGD() !== "Conexão Nova";
}
function _potenciaFuturaTrafoGD(t) {
  return t.substituir ? t.novaPotencia : t.potencia;
}
/* Mesma projeção para a impedância: quem dimensiona é o equipamento que FICA,
   e numa troca esse é o novo. */
function _impedanciaFuturaTrafoGD(t) {
  return t.substituir ? t.novaImpedancia : t.impedancia;
}
/* Projeta a lista no que ela será DEPOIS da obra — é ela que dimensiona a
   instalação (o equipamento substituído sai). */
function _trafosFuturosGD(lista) {
  return (lista || []).map((t) => ({
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
/* Aplica a situação a UM transformador — vale tanto para o trafo individual
   quanto para o de cubículo, daí viver separado dos dois handlers. */
function _aplicarSituacaoTrafoGD(t, valor) {
  t.situacao = valor;
  t.substituir = valor === "troca";
  // Ao marcar a troca pela primeira vez, semeia a nova potência com a atual —
  // o usuário costuma alterar só esse número.
  if (t.substituir && t.novaPotencia === "") t.novaPotencia = t.potencia;
  if (t.substituir && t.novaImpedancia === "")
    t.novaImpedancia = t.impedancia;
}
function setTrafoSituacaoGD(i, valor) {
  const t = trafosGD[i];
  if (!t) return;
  _aplicarSituacaoTrafoGD(t, valor);
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
/* Corpo comum aos dois lugares em que um transformador é editado: o card
   individual e o bloco dentro de um cubículo. `ref` é a expressão JS que
   alcança o objeto (trafosGD[i] ou cubiculosGD[i].trafos[j]) e `apos` é o que
   roda depois de cada digitação. */
function _camposTrafoGD(t, id, ref, apos, subst) {
  const linhaNova = !subst
    ? ""
    : `<div class="trafo-card-grid">
        <div class="field">
          <label for="${id}NovaPot">Nova potência (kVA)</label>
          <input id="${id}NovaPot" type="number" step="any" data-req value="${_escAttrGD(t.novaPotencia)}" placeholder=" "
                 oninput="${ref}.novaPotencia=this.value;${apos}">
        </div>
        <div class="field">
          <label for="${id}NovaLig">Tipo de ligação</label>
          <select id="${id}NovaLig"
                  onchange="${ref}.novaTipoLigacao=this.value">${_opcoesTipoLigGD(t.novaTipoLigacao)}</select>
        </div>
        <div class="field">
          <label for="${id}NovaImp">Nova impedância (%)</label>
          <input id="${id}NovaImp" type="number" step="any" data-req value="${_escAttrGD(t.novaImpedancia)}" placeholder=" "
                 oninput="${ref}.novaImpedancia=this.value;${apos}">
        </div>
      </div>`;
  return `<div class="trafo-card-grid">
      <div class="field">
        <label for="${id}Pot">Potência (kVA)</label>
        <input id="${id}Pot" type="number" step="any" data-req value="${_escAttrGD(t.potencia)}" placeholder=" "
               oninput="${ref}.potencia=this.value;${apos}">
      </div>
      <div class="field">
        <label for="${id}Lig">Tipo de ligação</label>
        <select id="${id}Lig"
                onchange="${ref}.tipoLigacao=this.value">${_opcoesTipoLigGD(t.tipoLigacao)}</select>
      </div>
      <div class="field">
        <label for="${id}Imp">Impedância (%)</label>
        <input id="${id}Imp" type="number" step="any" data-req value="${_escAttrGD(t.impedancia)}" placeholder=" "
               oninput="${ref}.impedancia=this.value;${apos}">
      </div>
    </div>
    ${linhaNova}`;
}
/* Par de demanda de um card — o mesmo markup no transformador individual e no
   cubículo. `pares` vem de _paresPotenciaGD() (js/app.js) e diz quais dos dois
   campos a solicitação escolhida coloca em tela; sem solicitação escolhida não
   há nenhum, e aí nem o .cub-trafo-bloco (que é o filete separador) é escrito
   — um bloco vazio abriria um filete sobre nada. */
function _camposDemandaGD(obj, id, ref, apos, pares) {
  if (!pares.verAtual && !pares.verNovaOuFutura) return "";
  const rotuloContratar = pares.nova
    ? GD_ROTULOS_DEMANDA.nova
    : GD_ROTULOS_DEMANDA.futura;
  return `<div class="cub-trafo-bloco">
      <div class="grid grid-2 cub-demanda-grid">
      ${
        pares.verAtual
          ? `<div class="field"><label for="${id}DemAtual">${GD_ROTULOS_DEMANDA.atual}</label>
        <input id="${id}DemAtual" type="number" step="any" data-req value="${_escAttrGD(obj.demandaAtual)}" placeholder=" "
               oninput="${ref}.demandaAtual=this.value;${apos}"></div>`
          : ""
      }
      ${
        pares.verNovaOuFutura
          ? `<div class="field"><label for="${id}Dem">${rotuloContratar}</label>
        <input id="${id}Dem" type="number" step="any" data-req value="${_escAttrGD(obj.demanda)}" placeholder=" "
               oninput="${ref}.demanda=this.value;${apos}"></div>`
          : ""
      }
      </div>
    </div>`;
}
/* Campo oculto não guarda valor: um kW digitado antes de trocar de solicitação
   continuaria no objeto, sairia no PDF e ainda dimensionaria a subestação. */
function _limparDemandaOcultaGD(lista, pares) {
  lista.forEach((o) => {
    if (!pares.verNovaOuFutura) o.demanda = "";
    if (!pares.verAtual) o.demandaAtual = "";
  });
}
/* Radios de situação — idem: mesmos três estados no card e no cubículo.
   `onclick` recebe a chamada já pronta, com o valor interpolado. */
function _radiosSituacaoTrafoGD(situacao, rotulo, chamada) {
  return `<div class="toggle-group trafo-troca" role="radiogroup" aria-label="${rotulo}">
      ${TRAFO_SITUACOES_GD.map(
        (o) =>
          `<button type="button" role="radio" class="toggle-btn${situacao === o.v ? " on" : ""}"
                   aria-checked="${situacao === o.v}"
                   onclick="${chamada(o.v)}">${o.label}</button>`,
      ).join("")}
    </div>`;
}
/* Badge de estado do cabeçalho. "Mantido" é neutro: o equipamento já existe e
   permanece — não é novo nem uma substituição. */
function _badgeTrafoGD(situacao, troca) {
  if (!troca) return ""; // em Conexão Nova todo trafo é novo
  const subst = situacao === "troca";
  const semAlt = situacao === "sem";
  const cls = subst ? " is-substituido" : semAlt ? " is-existente" : " is-novo";
  const txt = subst ? "Substituído" : semAlt ? "Mantido" : "Novo";
  return `<span class="trafo-status${cls}">${txt}</span>`;
}
function renderTrafosGD() {
  const box = $("#trafoCards");
  if (!box) return;
  const total = trafosGD.length;
  const troca = _permiteTrocaTrafoGD();
  const pares = _paresPotenciaGD();
  _limparDemandaOcultaGD(trafosGD, pares);
  box.innerHTML = trafosGD
    .map((t, i) => {
      const aberto = trafosGDAbertos.has(i);
      const situacao = _situacaoTrafoGD(t);
      const subst = troca && situacao === "troca";
      const radios = !troca
        ? ""
        : _radiosSituacaoTrafoGD(
            situacao,
            `Situação do transformador ${i + 1}`,
            (v) => `setTrafoSituacaoGD(${i},'${v}')`,
          );
      return `<div class="trafo-card${aberto ? " is-open" : ""}">
      <button type="button" class="trafo-card-head" onclick="toggleTrafoGD(${i})"
              aria-expanded="${aberto}" aria-controls="trafoGdCardBody${i}">
        <span class="trafo-titulo">Transformador</span>
        <span class="trafo-badge">${i + 1} de ${total}</span>
        ${_badgeTrafoGD(situacao, troca)}
        <span class="trafo-chevron" aria-hidden="true"></span>
      </button>
      <div class="trafo-card-body" id="trafoGdCardBody${i}"${aberto ? "" : " hidden"}>
        ${radios}
        ${_camposTrafoGD(t, `trafoGd${i}`, `trafosGD[${i}]`, "recalcTrafoGD(" + i + ")", subst)}
        ${_camposDemandaGD(t, `trafoGd${i}`, `trafosGD[${i}]`, "recalcTrafoGD(" + i + ")", pares)}
        <div id="trafoDemandaAlert${i}"></div>
      </div>
    </div>`;
    })
    .join("");
  // Aviso que fica DEPOIS de todos os cards, fora deles.
  _avisoTrafosDUBGD();
  trafosGD.forEach((t, i) => validarDemandaTrafoGD(i));
  if (window.CemigMarcadores) window.CemigMarcadores.aplicar();
}
/* Em conexão nova o parque inteiro é declarado do zero: todos os
   transformadores que existirão precisam constar aqui E no DUB. */
function _avisoTrafosDUBGD() {
  _setHTMLGD(
    "avisoTrafosDUB",
    _finalidadeGD() === "Conexão Nova"
      ? _avisoGD(
          "",
          "Informe <strong>todos</strong> os transformadores que existirão na instalação — inclusive os que já estiverem no local — e represente-os no <strong>DUB</strong> e no <strong>Memorial Descritivo</strong>.",
        )
      : "",
  );
}

/* ============================================================
   DEMANDA QUE DIMENSIONA A SUBESTAÇÃO
   ------------------------------------------------------------
   A minigeração NÃO tem modalidade tarifária horária (Verde/Azul)
   nem demanda escalonada — os dois blocos do MT não vieram: a
   tarifa é padronizada pela CEMIG e não é declarada pelo cliente.

   A demanda é declarada CARD A CARD nos dois ramos: no individual
   dentro do card de cada transformador, no compartilhado dentro do
   card de cada cubículo. O que dimensiona a instalação é a soma.
   Em cada card vale a A CONTRATAR ("a ser contratada" na conexão
   nova, "futura" na alteração) e, quando ela não se aplica, a ATUAL
   — o campo que não se aplica fica fora de tela e é zerado por
   _limparDemandaOcultaGD().
   ============================================================ */
function demandaRepresentativaObjGD(o) {
  const aContratar = parseFloat(o.demanda);
  if (Number.isFinite(aContratar)) return aContratar;
  const atual = parseFloat(o.demandaAtual);
  return Number.isFinite(atual) ? atual : 0;
}
function demandaTotalTrafosGD() {
  return trafosGD.reduce((s, t) => s + demandaRepresentativaObjGD(t), 0);
}
function demandaRepresentativaGD() {
  return _ehCompartilhadaGD()
    ? totaisCubiculosGD().demandaTotal
    : demandaTotalTrafosGD();
}
/* Potência do próprio card, para confrontar com a demanda dele. */
function _potenciaCardTrafoGD(t) {
  return CalculoMT.calcularTrafos(_trafosFuturosGD([t])).potenciaTotal;
}
/* A demanda de um transformador não pode superar a potência dele — mesmo
   confronto que validarDemandaCubiculo() faz no ramo compartilhado. */
function validarDemandaTrafoGD(i) {
  const t = trafosGD[i];
  if (!t) return;
  const el = $("#trafoDemandaAlert" + i);
  if (!el) return;
  const pot = _potenciaCardTrafoGD(t);
  const dem = demandaRepresentativaObjGD(t);
  el.innerHTML =
    dem > 0 && pot > 0 && dem > pot
      ? _avisoGD(
          "error",
          `A demanda deste transformador (${_fmtGD(dem)} kW) não pode ser superior à potência dele (${_fmtGD(pot)} kVA).`,
        )
      : "";
}
function recalcTrafoGD(i) {
  validarDemandaTrafoGD(i);
  recalcTecnicoGD();
}

/* ============================================================
   MOTORES E CARGAS ESPECIAIS
   ------------------------------------------------------------
   Mesma regra do MT (mt/js/app.js): o card pergunta só fases, CV e
   dispositivo de partida. O conjunto completo de dados de partida é
   exigido apenas do MOTOR PESADO — critério Cemig: trifásico acima
   de 50 CV OU monofásico acima de 15 CV.

   Os dados de partida gravam em motoresGD[i].analisePartida, no mesmo
   formato do MT. A minigeração não tem a página "Análise de
   Partida" nem o PDF dela: aqui os dados são coletados na mesma
   estrutura, sem a segunda tela que o MT oferece.
   ============================================================ */
function novoMotorGD() {
  return {
    tipo: "Motor",
    fases: "Trifásico",
    cv: "",
    // Potência em kVA, pedida SÓ quando cv === GD_CV_ACIMA (motor acima do
    // teto da tabela da fase). Ver _opcoesCVGD() e _cvEfetivoGD().
    kva: "",
    fp: "",
    rend: "",
    volts: "",
    ipIn: "",
    tempo: "",
    dispositivo: "",
    tap: "",
  };
}
/* Critério Cemig do motor pesado, idêntico a motorPesado() do MT:
   trifásico acima de 50 CV ou monofásico acima de 15 CV. Trifásico é o
   padrão, então qualquer valor diferente de "Monofásico" cai no teto de 50. */
function motorPesadoGD(m) {
  // A sentinela vem ANTES do parseFloat: parseFloat(GD_CV_ACIMA) é NaN e
  // cairia em "não pesado", escondendo justamente os campos (FP, rendimento,
  // tensão, IP/IN) de que o cálculo do motor acima do teto depende.
  if (m.cv === GD_CV_ACIMA) return true;
  const cv = parseFloat(m.cv) || 0;
  if (!cv) return false;
  return m.fases === "Monofásico" ? cv > 15 : cv > 50;
}
/* Tabela de CVs da fase do motor (T14 monofásica / T15 trifásica, de
   shared/js/load-form-data.js). Aceita as DUAS formas em que um motor
   circula: o card do bloco técnico (`fases`: "Monofásico"/"Trifásico") e a
   linha projetada em state.cargas.mots (`fase`: "mono"/"tri"). */
function _tabelaCVGD(m) {
  const mono = m.fases === "Monofásico" || m.fase === "mono";
  return mono ? MOTOR_MONO : MOTOR_TRI;
}
/* Rótulo do último CV da tabela — o teto que a sentinela anuncia. */
function _tetoCVGD(m) {
  const tab = _tabelaCVGD(m);
  return tab[tab.length - 1].l;
}
/* Opções do <select> de CV: os CVs tabelados da fase (valor = r.cv, rótulo =
   r.l, mesmo par que a ilha de cargas usa) e, no fim, a sentinela "Acima de
   {teto} CV", onde a potência passa a ser informada em kVA. */
function _opcoesCVGD(m) {
  const opts = _tabelaCVGD(m).map(
    (r) =>
      `<option value="${r.cv}"${String(m.cv) === String(r.cv) ? " selected" : ""}>${r.l}</option>`,
  );
  return (
    '<option value=""></option>' +
    opts.join("") +
    `<option value="${GD_CV_ACIMA}"${m.cv === GD_CV_ACIMA ? " selected" : ""}>Acima de ${_tetoCVGD(m)} CV</option>`
  );
}
/* Potência do motor como texto — tela e PDF. Fora da sentinela devolve o
   RÓTULO da tabela ("1/6", "12,5"), não o valor cru do <option>. */
function gdRotuloPotenciaMotor(m) {
  if (!m || (!m.cv && m.cv !== 0)) return "—";
  if (m.cv === GD_CV_ACIMA) {
    const kva = m.kva || m.kvaDeclarado;
    return `> ${_tetoCVGD(m)} CV` + (kva ? ` · ${kva} kVA` : "");
  }
  const row = _tabelaCVGD(m).find((r) => String(r.cv) === String(m.cv));
  return `${row ? row.l : m.cv} CV`;
}
/* CV que vai ao CalculoMT. Na sentinela não há CV tabelado: inverte-se a
   fórmula da planilha — potkVA = cv·736 / (fp·rend·1000) — para obter o CV
   equivalente ao kVA declarado, de modo que calcularMotor() rode sem
   alteração e devolva potkVA exatamente igual ao informado. Sem fp/rend o
   cálculo fica em branco, como já acontece com motor incompleto. */
function _cvEfetivoGD(m) {
  if (m.cv !== GD_CV_ACIMA) return m.cv;
  const kva = parseFloat(m.kva);
  const fp = parseFloat(m.fp);
  const rend = parseFloat(m.rend);
  if (!kva || !fp || !rend) return "";
  return (kva * fp * rend * 1000) / 736;
}
/* Ficha de partida do motor pesado — mesmo formato do MT, inclusive as três
   chaves (fpPartida, dispositivo, tap) que lá só a página "Análise de Partida"
   preenche: manter a estrutura idêntica evita divergir se ela for portada. */
function ensureAnalisePartidaGD(m) {
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
function sincronizarMotores() {
  const el = $('[data-k="qtdMotores"]');
  const bruto = parseInt(el?.value, 10);
  if (el && el.value !== "" && (isNaN(bruto) || bruto < 0)) return; // aguarda valor válido
  const n = Math.min(Math.max(bruto || 0, 0), 99); // teto igual ao max do input
  while (motoresGD.length < n) motoresGD.push(novoMotorGD());
  motoresGD.length = n;
  state.qtdMotores = n;
  // Espelho para a prévia e o PDF. Antes só recalcTecnicoGD() o gravava, mas
  // ele não roda enquanto o "Tipo de edificação" estiver em branco — e os
  // motores deixaram de depender dessa resposta ao mudar para a etapa de
  // Carga. Gravar aqui cobre o caso de a etapa 4 nem ter sido visitada.
  state.motores = motoresGD;
  if (!motoresGDAbertos.size && n) motoresGDAbertos.add(0);
  renderMotoresGD();
  // state.cargas.mots é DERIVADO destes cards — ver gdProjetarMotoresNaCarga()
  // (js/app.js): a ilha de cargas do mini não tem mais acordeão de motores.
  gdProjetarMotoresNaCarga();
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
      potenciaCV: _cvEfetivoGD(m),
      fp: m.fp,
      rendimento: m.rend,
      tensaoV: m.volts,
      relacaoIpIn: m.ipIn,
    },
    _tensaoMTkVGD(),
  );
}
/* Campos exigidos só de motor pesado (acima de 50 CV trifásico / 15 CV
   monofásico) — porte de _motorCamposPesadoHTML() do MT. Os oito primeiros
   gravam na ficha de partida; os cinco últimos são as grandezas elétricas que
   alimentam o cálculo do card. */
function _motorCamposPesadoHTMLGD(i, m, ap) {
  const ref = `motoresGD[${i}].analisePartida`;
  return `<div class="motor-card-grid" style="margin-top:12px">
    <div class="field"><label>Número de partidas</label><input type="number" value="${ap.numPartidas}" placeholder=" " oninput="${ref}.numPartidas=this.value"></div>
    <div class="field"><label>Ordem de partida</label><input type="number" value="${ap.ordemPartida}" placeholder=" " oninput="${ref}.ordemPartida=this.value"></div>
    <div class="field"><label>Carga operando (kVA)</label><input type="number" step="any" value="${ap.cargaOperanteKVA}" placeholder=" " oninput="${ref}.cargaOperanteKVA=this.value"></div>
    <div class="field"><label>Carga operando (FP)</label><input type="number" step="any" value="${ap.cargaOperanteFP}" placeholder=" " oninput="${ref}.cargaOperanteFP=this.value"></div>
    <div class="field"><label>Tipo de carga sensível</label><input type="text" value="${ap.cargaSensivelTipo}" placeholder=" " oninput="${ref}.cargaSensivelTipo=this.value"></div>
    <div class="field"><label>% admissível da carga sensível</label><input type="number" step="any" value="${ap.cargaSensivelPercentual}" placeholder=" " oninput="${ref}.cargaSensivelPercentual=this.value"></div>
    <div class="field"><label>Simultaneidade</label><select onchange="${ref}.simultaneidade=this.value"><option value=""></option><option ${ap.simultaneidade === "Sim" ? "selected" : ""}>Sim</option><option ${ap.simultaneidade === "Não" ? "selected" : ""}>Não</option></select></div>
    <div class="field"><label>Impedância do transformador (%Z)</label><input type="number" step="any" value="${ap.impedanciaZ}" placeholder=" " oninput="${ref}.impedanciaZ=this.value"></div>
    <div class="field"><label>Rendimento</label><input type="number" step="any" value="${m.rend}" placeholder=" " oninput="motoresGD[${i}].rend=this.value" onchange="atualizarCalculosMotorGD(this)"></div>
    <div class="field"><label>FP</label><input type="number" step="any" value="${m.fp}" placeholder=" " oninput="motoresGD[${i}].fp=this.value" onchange="atualizarCalculosMotorGD(this)"></div>
    <div class="field"><label>Tensão (V)</label><input type="number" step="any" value="${m.volts}" placeholder=" " oninput="motoresGD[${i}].volts=this.value" onchange="atualizarCalculosMotorGD(this)"></div>
    <div class="field"><label>IP/IN</label><input type="number" step="any" value="${m.ipIn}" placeholder=" " oninput="motoresGD[${i}].ipIn=this.value" onchange="atualizarCalculosMotorGD(this)"></div>
    <div class="field"><label>Tempo IP (s)</label><input type="number" step="any" value="${m.tempo}" placeholder=" " oninput="motoresGD[${i}].tempo=this.value"></div>
  </div>`;
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
    const sentinela = m.cv === GD_CV_ACIMA;
    // Motor pesado (trifásico acima de 50 CV / monofásico acima de 15 CV) exige
    // o conjunto completo de dados de partida, exibido no próprio card.
    const pesado = motorPesadoGD(m);
    const ap = pesado ? ensureAnalisePartidaGD(m) : null;
    const aberto = motoresGDAbertos.has(i);
    const card = document.createElement("div");
    card.className = "motor-card" + (aberto ? " is-open" : "");
    card.dataset.motorRow = i;
    card.dataset.pesado = pesado ? "1" : "0";
    card.innerHTML = `
      <button type="button" class="motor-card-head" onclick="toggleMotorGD(${i})"
              aria-expanded="${aberto}" aria-controls="motorGdCardBody${i}">
        <span class="motor-titulo">Motor</span>
        <span class="motor-badge">${i + 1} de ${total}</span>
        <span class="motor-chevron" aria-hidden="true"></span>
      </button>
      <div class="motor-card-body" id="motorGdCardBody${i}"${aberto ? "" : " hidden"}>
        <div class="motor-card-grid">
          <div class="field"><label>Fases</label><select onchange="onFasesMotorGD(this,${i})"><option ${m.fases === "Monofásico" ? "selected" : ""}>Monofásico</option><option ${m.fases !== "Monofásico" ? "selected" : ""}>Trifásico</option></select></div>
          <div class="field"><label>CV</label><select onchange="onCvMotorGD(this,${i})">${_opcoesCVGD(m)}</select></div>
          <div class="field motor-kva-field" style="display:${sentinela ? "" : "none"}"><label>Potência do motor (kVA)</label><input type="number" step="any" data-req value="${_escAttrGD(m.kva)}" placeholder=" " oninput="motoresGD[${i}].kva=this.value;atualizarCalculosMotorGD(this);gdProjetarMotoresNaCarga()"></div>
          <div class="field"><label>Disp. Partida</label><select onchange="onDispositivoMotorGD(this,${i})"><option value=""></option>${dispOpts}</select></div>
          <div class="field motor-tap-field" style="display:${compensadora ? "" : "none"}"><label>Tap (%)</label><input type="number" step="any" value="${m.tap || ""}" placeholder=" " oninput="motoresGD[${i}].tap=this.value"></div>
        </div>
        ${pesado ? _motorCamposPesadoHTMLGD(i, m, ap) : ""}
        ${_motorCalcHTMLGD(c)}
      </div>`;
    box.appendChild(card);
  });
  if (window.CemigMarcadores) window.CemigMarcadores.aplicar();
}
/* Recalcula só os valores elétricos de UM motor e atualiza pontualmente os
   itens .val do card — isolado via this.closest('.motor-card'), sem reconstruir
   o contêiner geral, o que manteria o foco instável e travaria a digitação a
   cada caractere. */
function atualizarCalculosMotorGD(inputEl) {
  const card = inputEl.closest(".motor-card");
  if (!card) return;
  const i = parseInt(card.dataset.motorRow, 10);
  // Se o motor cruzou o limite de "pesado" (acima de 50 CV trifásico / 15 CV
  // monofásico), o card ganha/perde os campos de partida: aí sim vale
  // reconstruir. Fora isso, só os valores calculados são atualizados.
  const eraPesado = card.dataset.pesado === "1";
  if (motoresGD[i] && motorPesadoGD(motoresGD[i]) !== eraPesado) {
    renderMotoresGD();
    return;
  }
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
/* Troca de fase: a tabela de CVs muda junto (60 CV existe na T15 trifásica e
   não na T14 monofásica). Um CV numérico que não sobrevive à tabela nova é
   limpo — a sentinela sobrevive, só o teto do rótulo muda. */
function onFasesMotorGD(selectEl, i) {
  const m = motoresGD[i];
  if (!m) return;
  m.fases = selectEl.value;
  if (
    m.cv &&
    m.cv !== GD_CV_ACIMA &&
    !_tabelaCVGD(m).some((r) => String(r.cv) === String(m.cv))
  )
    m.cv = "";
  renderMotoresGD();
  gdProjetarMotoresNaCarga();
}
/* Troca de CV: reconstrói o card (a sentinela revela o campo kVA e sempre
   marca o motor como pesado) e reprojeta os motores no formulário de carga. */
function onCvMotorGD(selectEl, i) {
  const m = motoresGD[i];
  if (!m) return;
  m.cv = selectEl.value;
  renderMotoresGD();
  gdProjetarMotoresNaCarga();
}
/* Mostra/oculta o sub-campo Tap (%) isolado no card alterado, sem reconstruir o
   contêiner geral. */
function onDispositivoMotorGD(selectEl, i) {
  if (motoresGD[i]) motoresGD[i].dispositivo = selectEl.value;
  const card = selectEl.closest(".motor-card");
  const tap = card && card.querySelector(".motor-tap-field");
  if (tap)
    tap.style.display = selectEl.value === "Chave Compensadora" ? "" : "none";
}

/* ============================================================
   CUBÍCULOS — SUBESTAÇÃO COMPARTILHADA (multimedição)
   ------------------------------------------------------------
   Porte de mt/js/app.js (Anexo I), sem a modalidade tarifária
   horária nem a demanda escalonada: o cliente da minigeração não
   declara tarifa. O cubículo declara os seus transformadores e o seu
   par de demanda; a GERAÇÃO não é declarada aqui — ela é uma só, da
   usina, e vive na etapa 6 (potência ativa instalada + fontes).
   ============================================================ */
function novoCubiculoGD() {
  return {
    instalacao: "",
    trafos: [novoTrafoGD()],
    // Par de demanda do cubículo, espelho do da UC: a CONTRATAR ("a ser
    // contratada" na ligação nova, "futura" na alteração) e a ATUAL. Quais
    // aparecem sai de _paresPotenciaGD() — ver o card em renderCubiculos().
    demanda: "",
    demandaAtual: "",
    // Cubículo já existente (será alterado) x novo (será acrescentado).
    // Só relevante em finalidade ≠ Conexão Nova — ver _permiteTrocaTrafoGD().
    existente: false,
  };
}
/* Uma subestação nova ainda não tem unidade consumidora: o número só existe (e
   só é pedido) quando a subestação já existe. */
function temInstalacaoCubiculoGD() {
  return state.subestacaoExistente === "Subestação já existente";
}
function _subestacaoExistenteCardsHTML() {
  const atual = state.subestacaoExistente || "Nova subestação";
  return (
    '<div class="toggle-group" role="radiogroup" aria-label="Sobre a subestação">' +
    GD_SUBESTACAO_EXISTENTE.map(
      (v) =>
        `<button type="button" role="radio" class="toggle-btn${atual === v ? " on" : ""}"
             aria-checked="${atual === v}"
             onclick="setSubestacaoExistenteGD('${v}')">${v}</button>`,
    ).join("") +
    "</div>"
  );
}
function renderSubestacaoExistenteGD() {
  _setHTMLGD("cardsSubestacaoExistente", _subestacaoExistenteCardsHTML());
}
function setSubestacaoExistenteGD(valor) {
  state.subestacaoExistente = valor;
  // Numa subestação nova o número de instalação deixa de ser exibido: descarta
  // o que já tiver sido digitado para não vazar na prévia/PDF nem na validação.
  if (!temInstalacaoCubiculoGD())
    cubiculosGD.forEach((c) => (c.instalacao = ""));
  renderSubestacaoExistenteGD();
  renderCubiculos();
  recalcTecnicoGD();
}
/* Cria/remove cubículos conforme o campo de quantidade. Fora da compartilhada a
   lista é esvaziada: dados de um ramo abandonado não podem sobreviver
   escondidos e sair no PDF. */
function sincronizarCubiculos() {
  const qtd = parseInt($('[data-k="qtdCubiculos"]')?.value, 10) || 0;
  const n = _ehCompartilhadaGD() ? Math.max(1, qtd) : 0;
  while (cubiculosGD.length < n) cubiculosGD.push(novoCubiculoGD());
  cubiculosGD.length = n;
  if (!cubiculosGDAbertos.size && n) cubiculosGDAbertos.add(0);
  renderSubestacaoExistenteGD();
  renderCubiculos();
  // Os totais consolidados e a lista de modelos dependem de quantos cubículos
  // existem — recalcTecnicoGD não redesenha nada, então é seguro aqui.
  recalcTecnicoGD();
}
function toggleCubiculoGD(i) {
  cubiculosGDAbertos.has(i)
    ? cubiculosGDAbertos.delete(i)
    : cubiculosGDAbertos.add(i);
  renderCubiculos();
}
/* Cria/remove transformadores do cubículo conforme o campo de quantidade. */
function sincronizarTrafosCub(i) {
  const el = $(`#qtdTrafoCub${i}`);
  const bruto = parseInt(el?.value, 10);
  if (el && el.value !== "" && (isNaN(bruto) || bruto < 1)) return;
  const n = Math.min(Math.max(bruto || 0, 0), 99);
  const c = cubiculosGD[i];
  if (!c) return;
  while (c.trafos.length < n) c.trafos.push(novoTrafoGD());
  c.trafos.length = n;
  renderCubiculos();
  recalcCubiculo(i);
}
function setTrafoCubSituacaoGD(i, j, valor) {
  const t = cubiculosGD[i]?.trafos[j];
  if (!t) return;
  _aplicarSituacaoTrafoGD(t, valor);
  renderCubiculos();
  recalcCubiculo(i);
}
/* Radio "Cubículo já existente / novo" — um cubículo existente é alterado; um
   novo é acrescentado à subestação compartilhada. */
function _cubiculoExistenteCardsHTML(i, existente) {
  return (
    `<div class="toggle-group trafo-troca" role="radiogroup" aria-label="Situação do cubículo ${i + 1}">` +
    [
      { v: true, label: "Cubículo já existente" },
      { v: false, label: "Cubículo novo" },
    ]
      .map(
        (o) =>
          `<button type="button" role="radio" class="toggle-btn${existente === o.v ? " on" : ""}"
             aria-checked="${existente === o.v}"
             onclick="setCubiculoExistenteGD(${i},${o.v})">${o.label}</button>`,
      )
      .join("") +
    "</div>"
  );
}
function setCubiculoExistenteGD(i, valor) {
  const c = cubiculosGD[i];
  if (!c) return;
  c.existente = valor;
  // Cubículo novo não tem trafo a substituir nem a manter: limpa a marcação dos
  // seus trafos (todos passam a ser "novo").
  if (!valor)
    c.trafos.forEach((t) => {
      t.situacao = "novo";
      t.substituir = false;
      t.novaPotencia = "";
      t.novaTipoLigacao = "";
    });
  renderCubiculos();
  recalcCubiculo(i);
}
/* O nº de instalação do cubículo é um input SEM data-k (o estado dele vive no
   array): o onInstalacaoUC() genérico do app.js gravaria em state[undefined].
   Daí o handler próprio, com a mesma máscara. */
function onInstalacaoUCCub(el, i) {
  el.value = mascararInstalacaoUC(el.value);
  if (cubiculosGD[i]) cubiculosGD[i].instalacao = el.value;
}
/* Sem modalidade horária, a demanda do cubículo é um número só — mesma escolha
   dos cards de transformador (ver demandaRepresentativaObjGD). */
function demandaRepresentativaCubiculoGD(c) {
  return demandaRepresentativaObjGD(c);
}
function validarDemandaCubiculo(i) {
  const c = cubiculosGD[i];
  if (!c) return;
  const el = $("#cubDemandaAlert" + i);
  if (!el) return;
  const potCub = CalculoMT.calcularTrafos(
    _trafosFuturosGD(c.trafos),
  ).potenciaTotal;
  const demCub = demandaRepresentativaCubiculoGD(c);
  el.innerHTML =
    demCub > 0 && potCub > 0 && demCub > potCub
      ? _avisoGD(
          "error",
          `A demanda deste cubículo (${_fmtGD(demCub)} kW) não pode ser superior à potência total dos seus transformadores (${_fmtGD(potCub)} kVA).`,
        )
      : "";
}
function totaisCubiculosGD() {
  let potenciaTotal = 0,
    quantidadeTotal = 0,
    demandaTotal = 0;
  cubiculosGD.forEach((c) => {
    const rt = CalculoMT.calcularTrafos(_trafosFuturosGD(c.trafos));
    potenciaTotal += rt.potenciaTotal;
    quantidadeTotal += rt.quantidadeTotal;
    demandaTotal += demandaRepresentativaCubiculoGD(c);
  });
  return { potenciaTotal, quantidadeTotal, demandaTotal };
}
function recalcCubiculo(i) {
  validarDemandaCubiculo(i);
  recalcTecnicoGD();
}
function renderCubiculos() {
  const box = $("#cubiculosCards");
  if (!box) return;
  const total = cubiculosGD.length;
  const trocaCub = _permiteTrocaTrafoGD();
  // O par de demanda do cubículo segue a MESMA regra do par da UC
  // (_paresPotenciaGD, js/app.js): a alteração de demanda contratada é a única
  // solicitação que mostra os dois campos.
  const paresCub = _paresPotenciaGD();
  _limparDemandaOcultaGD(cubiculosGD, paresCub);
  box.innerHTML = cubiculosGD
    .map((c, i) => {
      const aberto = cubiculosGDAbertos.has(i);
      // Um bloco de campos por transformador do cubículo (mesmo trio dos cards
      // de transformador individual).
      const trafoBlocos = c.trafos
        .map((t, j) => {
          const situacao = _situacaoTrafoGD(t);
          const subst = trocaCub && situacao === "troca";
          const radios = !trocaCub
            ? ""
            : _radiosSituacaoTrafoGD(
                situacao,
                `Situação do transformador ${j + 1} do cubículo ${i + 1}`,
                (v) => `setTrafoCubSituacaoGD(${i},${j},'${v}')`,
              );
          return `<div class="cub-trafo-bloco">
        <div class="cub-trafo-titulo">Transformador ${j + 1}${_badgeTrafoGD(situacao, trocaCub)}</div>
        ${radios}
        ${_camposTrafoGD(t, `cubTrafo${i}_${j}`, `cubiculosGD[${i}].trafos[${j}]`, `recalcCubiculo(${i})`, subst)}
      </div>`;
        })
        .join("");
      const campoInstal = temInstalacaoCubiculoGD()
        ? `<div class="field"><label for="cubInstal${i}">Número da unidade consumidora / instalação</label>
             <input id="cubInstal${i}" type="text" data-req data-fmt="fmtInstalacaoUC" value="${_escAttrGD(c.instalacao)}" placeholder=" "
                    oninput="onInstalacaoUCCub(this,${i})"></div>`
        : "";
      return `<div class="trafo-card cub-card${aberto ? " is-open" : ""}">
      <button type="button" class="trafo-card-head" onclick="toggleCubiculoGD(${i})"
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
        ${trocaCub ? _cubiculoExistenteCardsHTML(i, c.existente) : ""}
        <div class="grid grid-2">
          ${campoInstal}
          <div class="field"><label for="qtdTrafoCub${i}">Quantidade de transformadores</label>
            <input id="qtdTrafoCub${i}" type="number" min="1" max="99" step="1" data-req value="${c.trafos.length || ""}" placeholder=" "
                   oninput="sincronizarTrafosCub(${i})"></div>
        </div>
        ${trafoBlocos}
        ${_camposDemandaGD(c, `cub${i}`, `cubiculosGD[${i}]`, "recalcCubiculo(" + i + ")", paresCub)}
        <div id="cubDemandaAlert${i}"></div>
      </div>
    </div>`;
    })
    .join("");
  cubiculosGD.forEach((c, i) => validarDemandaCubiculo(i));
  if (window.CemigMarcadores) window.CemigMarcadores.aplicar();
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
  if (!state.tensaoAtendimento || !state.entradaEnergia) return false;
  // Sem potência declarada não há como dimensionar: os cards de transformador
  // (ou de cubículo) ainda não foram preenchidos. A demanda NÃO entra como
  // condição — em ligação nova ela pode não existir ainda, e exigi-la
  // esconderia o resumo (e a escolha da subestação) justamente aí.
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
  const compart = _ehCompartilhadaGD();
  const dem = demandaRepresentativaGD();
  const kpis = [
    // "Cubículos" só existe na compartilhada. A geração não entra: ela é
    // declarada uma única vez na etapa 6 (potência ativa instalada + fontes).
    ...(compart ? [["Cubículos", String(cubiculosGD.length)]] : []),
    // Sem demanda declarada o KPI mostra só o travessão — o dimensionamento
    // recai sobre a potência instalada, mas isso não precisa estar no card.
    [
      compart ? "Demanda total dos cubículos" : "Demanda contratada",
      dem > 0 ? `${_fmtGD(dem)} kW` : "—",
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
/* REGRA 12 — "Haverá mudança de local da subestação?" pressupõe uma subestação
   JÁ EXISTENTE: em Conexão Nova (inclusive a migração BT→MT, que estreia um
   padrão de média tensão) ela ainda será construída, e na compartilhada quem
   responde é o "Sobre a subestação" dos cubículos. */
function _temSubestacaoExistenteGD() {
  // Sem solicitação escolhida ainda não se sabe se existe instalação anterior —
  // a pergunta fica fora de tela, como #instalacaoUCBox em onSolicitacao().
  if (!state.solicitacao) return false;
  if (_finalidadeGD() === "Conexão Nova") return false;
  return _ehCompartilhadaGD() ? temInstalacaoCubiculoGD() : true;
}
function atualizarMudancaSEGD() {
  const ver = _temSubestacaoExistenteGD();
  _mostrarGD("#mudancaSEBox", ver);
  // Campo oculto não pode guardar "Sim": a resposta sobreviveria escondida e
  // sairia na prévia/PDF. O <select> é a fonte da verdade dos cards, e
  // _cardsMontar (js/app.js) redesenha o toggle ao ouvir "change".
  if (!ver && state.mudancaSE !== "Não") {
    state.mudancaSE = "Não";
    const sel = $('[data-k="mudancaSE"]');
    if (sel) {
      sel.value = "Não";
      sel.dispatchEvent(new Event("change", { bubbles: true }));
    }
  }
}
/* Exibe a escolha do tipo de subestação (nova ou alteração) só quando os totais
   já existem — os mesmos totais dos KPIs, que são o que filtra os modelos
   permitidos. Conexão Nova e alteração são caminhos EXCLUSIVOS. */
function atualizarVisibilidadeSEGD() {
  const ehNova = _finalidadeGD() === "Conexão Nova";
  const pronto = renderResumoSEGD();
  _mostrarGD("#blocoSubestacaoNova", ehNova && pronto);
  _mostrarGD("#blocoSubestacaoAlteracao", !ehNova && pronto);
  // Aqui e não só em atualizarSE(): o "Sobre a subestação" da compartilhada
  // chega por setSubestacaoExistenteGD() → recalcTecnicoGD().
  atualizarMudancaSEGD();
}
/* Teto de cada modelo em kW, tal como declarado no catálogo do MT. */
function _tetoSEkW(tipo) {
  const c = (CalculoMT.SE_CRITERIOS || []).find((x) => x.tipo === tipo);
  return c && c.maxKW ? c.maxKW : 0;
}
/* REGRA 9 (minigeração) — os modelos com teto de 300 kVA não servem quando a
   POTÊNCIA ATIVA INSTALADA DE GERAÇÃO (etapa 6) passa desse limite. É corte
   DIFERENTE do `maxKW` do CalculoMT, que compara o teto com a DEMANDA
   contratada; por isso vem como pós-filtro e não como parâmetro — passar a
   geração no lugar da demanda contaminaria o dimensionamento.
   O teto sai de CalculoMT.SE_CRITERIOS, nunca de uma lista literal: os rótulos
   das duas divergiam ("Nº 1" × "Subestação Nº 1"). */
function _tiposSEminiGD(lista) {
  const pot = parseFloat(state.potAtivaInstalada) || 0;
  if (pot <= 0) return { lista, removidos: [] };
  const removidos = lista.filter((t) => {
    const teto = _tetoSEkW(t);
    return teto && pot > teto;
  });
  return { lista: lista.filter((t) => !removidos.includes(t)), removidos };
}
function _renderAvisoExcede300GD(removidos) {
  const box = $("#avisoExcede300");
  if (!box) return;
  const txt = $("#avisoExcede300Texto");
  const mostrar = removidos.length > 0;
  box.style.display = mostrar ? "" : "none";
  if (txt && mostrar)
    txt.innerHTML = `<strong>Limite de ${GD_SE_LIMITE_KW} kVA. </strong>A potência ativa instalada de geração (${_fmtGD(state.potAtivaInstalada)} kW) excede o limite desses modelos, que por isso não estão disponíveis: ${removidos.join(", ")}.`;
}
function preencherTiposSEGD() {
  const base = {
    tensaoMTkV: _tensaoMTkVGD(),
    compartilhada: _compartilhadaGD(),
    potencia: state.potTotalTrafos,
    demanda: demandaRepresentativaGD(),
  };
  // Lista da finalidade corrente — vale para a conexão nova e como referência.
  const corrente = _tiposSEminiGD(
    CalculoMT.tiposSubestacaoPermitidos({
      ...base,
      finalidade: _finalidadeGD(),
    }),
  );
  // DIVERGÊNCIA DELIBERADA (só na minigeração): o modelo que será ERGUIDO agora
  // segue o critério de CONEXÃO NOVA, mesmo numa alteração de carga. Um modelo
  // legado pode ser MANTIDO onde já existe, não construído — daí a lista do
  // "novo modelo" excluir Nº 1, Nº 3 e Nº 6 (novaOk: false). Em 13,8 kV isso
  // devolve exatamente Nº 4, Nº 5 e Nº 8. O MT e a microgeração usam aqui a
  // lista da finalidade corrente; a diferença fica contida neste formulário.
  const paraNovo = _tiposSEminiGD(
    CalculoMT.tiposSubestacaoPermitidos({
      ...base,
      finalidade: "Conexão Nova",
    }),
  );
  _renderAvisoExcede300GD(corrente.removidos);

  // Conexão nova: só os modelos permitidos.
  const selNova = $("#cn_tipoSE");
  if (selNova) {
    const atual = selNova.value;
    selNova.innerHTML =
      '<option value=""></option>' +
      corrente.lista
        .map((s) => `<option ${atual === s ? "selected" : ""}>${s}</option>`)
        .join("");
    // Modelo único: não há escolha a fazer, então já vem marcado.
    if (corrente.lista.length === 1) {
      selNova.value = corrente.lista[0];
      state.cn_tipoSE = corrente.lista[0];
    } else if (!corrente.lista.includes(atual)) {
      selNova.value = "";
      state.cn_tipoSE = "";
    }
  }
  // Alteração: o modelo ATUAL parte da lista completa (o que já existe no local
  // pode ser um modelo que hoje não seria mais permitido).
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
      paraNovo.lista
        .map((s) => `<option ${atual === s ? "selected" : ""}>${s}</option>`)
        .join("");
    if (!paraNovo.lista.includes(atual)) {
      selPara.value = "";
      state.alt_tipoPara = "";
    }
  }
  renderGaleriaSEGD("seGallery_nova", "cn_tipoSE");
  renderGaleriaSEGD("seGallery_atual", "alt_tipoAtual");
  renderGaleriaSEGD("seGallery_para", "alt_tipoPara");
}
/* Galeria visual dos modelos: os <select> ficam como fonte de estado e são
   espelhados pelos cards. Usa as imagens em base64 que a página já carrega
   (SUBESTACAO_IMGS_B64, de ../mt/js/subestacoes-b64.js) — o MT usa arquivos
   soltos, cujo caminho relativo não valeria a partir de minigeracao/.
   Os modelos Nº 3 e Nº 6 não têm imagem no catálogo b64 e saem só com o
   rótulo, como no MT. */
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
   Diferente do MT, aqui NÃO existe galeria de ramal: o ramal de conexão é da
   CEMIG (aéreo) e o de entrada não é perguntado no formulário da minigeração.
   A função só consolida o estado derivado das galerias. */
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
/* NÃO chama renderTrafosGD/renderCubiculos/renderMotoresGD: é o oninput dos
   cards que a invoca a cada tecla, e reconstruir o innerHTML ali faria o campo
   perder o foco no meio da digitação. Quem redesenha os cards é atualizarSE()
   e os handlers de estrutura (quantidade, situação, existente). */
function recalcTecnicoGD() {
  // Na compartilhada o que dimensiona a instalação é a soma dos cubículos; na
  // individual, os transformadores da própria UC. Num trafo marcado para troca
  // vale a potência NOVA — a atual sai junto com o equipamento antigo.
  const compart = _ehCompartilhadaGD();
  const rt = compart
    ? totaisCubiculosGD()
    : CalculoMT.calcularTrafos(_trafosFuturosGD(trafosGD));
  state.potTotalTrafos = rt.potenciaTotal;
  state.qtdTotalTrafos = rt.quantidadeTotal;
  state.demandaTotalCubiculos = compart ? rt.demandaTotal : 0;
  // Demanda da instalação no ramo individual: a soma dos cards, como a dos
  // cubículos é no compartilhado. É o que a prévia e o PDF imprimem.
  state.demandaTotalTrafos = compart ? 0 : demandaTotalTrafosGD();
  const escrever = (id, v) => {
    const el = $("#" + id);
    if (el) el.value = compart ? _fmtGD(v) : "";
  };
  escrever("totConsolidadoTrafos", rt.potenciaTotal);
  escrever("totConsolidadoDemanda", state.demandaTotalCubiculos);
  // Espelhos para o PDF/prévia. `trafos` já era lido no formato {qte, potencia}
  // e ganhou a ligação e a situação; na compartilhada ele fica vazio — lá os
  // transformadores pertencem a cada cubículo.
  state.trafos = compart
    ? []
    : trafosGD.map((t) => ({
        qte: t.quantidade,
        potencia: _potenciaFuturaTrafoGD(t),
        tipoLigacao: t.substituir ? t.novaTipoLigacao : t.tipoLigacao,
        impedancia: _impedanciaFuturaTrafoGD(t),
        situacao: _situacaoTrafoGD(t),
        demanda: t.demanda,
        demandaAtual: t.demandaAtual,
      }));
  state.motores = motoresGD;
  state.cubiculos = compart ? cubiculosGD : [];
  atualizarVisibilidadeSEGD();
  preencherTiposSEGD();
  recalcRamal();
}
/* Ponto de entrada único do bloco — chamado pela tensão de conexão, pela
   entrada de energia, pela solicitação, pela instalação BT/MT e pela potência
   da usina (recalcFontes). Nome mantido: já era o que o resto do app.js
   chamava quando a subestação era a galeria antiga. */
function atualizarSE() {
  _sync("tensaoAtendimento");
  const respondida = _mostrarBlocoTecnicoGD();
  const compart = _ehCompartilhadaGD();
  // Enquanto a entrada de energia não for respondida não há o que mostrar:
  // "Individual" e "Compartilhada" levam a blocos técnicos diferentes.
  _mostrarGD("#blocoTecnicoIndividual", respondida);
  _mostrarGD("#blocoCubiculos", respondida && compart);
  _mostrarGD("#blocoTotaisConsolidados", respondida && compart);
  _mostrarGD("#blocoTrafosIndividual", respondida && !compart);
  // O aviso de "uma NS por cubículo" (e o #compartilhadaAlert que o exibia)
  // saiu: o processo passa a entrar com uma nota única, então instruir o
  // solicitante a abrir um formulário por cubículo estaria errado.
  // Repetido aqui porque o !respondida abaixo desvia antes de
  // recalcTecnicoGD(): sem entrada de energia respondida a pergunta ainda
  // precisa sumir/reaparecer conforme a solicitação.
  atualizarMudancaSEGD();
  if (!respondida) {
    // Nada respondido: o que porventura tenha sido declarado AQUI não pode
    // sobreviver escondido e sair no PDF. Os motores ficaram de fora desta
    // limpeza: eles saíram do bloco técnico para o Formulário de Carga, onde
    // são seção fixa — apagá-los daqui destruiria dado de outra etapa, que o
    // usuário vê preenchido.
    trafosGD = [];
    cubiculosGD = [];
    Object.assign(state, {
      tipoSE: "",
      cn_tipoSE: "",
      alt_tipoAtual: "",
      alt_tipoPara: "",
      alt_troca: "",
      potTotalTrafos: 0,
      qtdTotalTrafos: 0,
      demandaTotalCubiculos: 0,
      demandaTotalTrafos: 0,
      trafos: [],
      cubiculos: [],
    });
    // Os cards ficam ocultos, mas o `oninput` deles aponta para trafosGD[i] /
    // cubiculosGD[i], que acabaram de sumir — esvaziar o DOM evita que um card
    // órfão volte à tela (ou receba uma tecla) apontando para o nada.
    renderTrafosGD();
    renderCubiculos();
    return;
  }
  // Em Conexão Nova não há trafo "existente" a trocar: uma situação escolhida
  // antes de mudar a solicitação ficaria presa no estado.
  if (!_permiteTrocaTrafoGD()) {
    const zerar = (t) => {
      t.situacao = "novo";
      t.substituir = false;
    };
    trafosGD.forEach(zerar);
    cubiculosGD.forEach((c) => {
      c.existente = false;
      c.trafos.forEach(zerar);
    });
  }
  sincronizarCubiculos();
  renderTrafosGD();
  recalcTecnicoGD();
}
/* Faltas do bloco técnico para o gate de exportação (etapa Prévia). Os cards
   são construídos por JS e a maioria dos seus campos não tem `data-k`, então
   CemigMarcadores só os alcança pelo `data-req` que o template escreve — esta
   função é a rede de segurança que fecha o resto. */
function gdValidarSubestacao() {
  const faltas = [];
  if (!_mostrarBlocoTecnicoGD()) {
    faltas.push("Tipo de edificação (subestação individual ou compartilhada)");
    return faltas;
  }
  const potFutura = (t) => parseFloat(_potenciaFuturaTrafoGD(t)) || 0;
  const impedFutura = (t) => parseFloat(_impedanciaFuturaTrafoGD(t)) || 0;
  if (_ehCompartilhadaGD()) {
    if (!cubiculosGD.length) {
      faltas.push("Quantidade de cubículos");
    } else {
      cubiculosGD.forEach((c, i) => {
        const rot = `Cubículo ${i + 1}`;
        if (temInstalacaoCubiculoGD() && !c.instalacao)
          faltas.push(`${rot}: número da unidade consumidora / instalação`);
        if (!c.trafos.length) faltas.push(`${rot}: transformadores`);
        c.trafos.forEach((t, j) => {
          if (!(potFutura(t) > 0))
            faltas.push(`${rot}: potência do transformador ${j + 1}`);
          if (!(impedFutura(t) > 0))
            faltas.push(`${rot}: impedância do transformador ${j + 1}`);
        });
        const dem = demandaRepresentativaCubiculoGD(c);
        // Os mesmos campos que o card põe em tela (ver renderCubiculos).
        const paresCub = _paresPotenciaGD();
        if (paresCub.verNovaOuFutura && !(parseFloat(c.demanda) > 0))
          faltas.push(
            `${rot}: ${paresCub.nova ? GD_ROTULOS_DEMANDA.nova : GD_ROTULOS_DEMANDA.futura}`,
          );
        if (paresCub.verAtual && !(parseFloat(c.demandaAtual) > 0))
          faltas.push(`${rot}: ${GD_ROTULOS_DEMANDA.atual}`);
        const pot = CalculoMT.calcularTrafos(
          _trafosFuturosGD(c.trafos),
        ).potenciaTotal;
        if (dem > 0 && pot > 0 && dem > pot)
          faltas.push(
            `${rot}: demanda (${_fmtGD(dem)} kW) acima da potência dos seus transformadores (${_fmtGD(pot)} kVA)`,
          );
      });
    }
  } else {
    if (!trafosGD.length) faltas.push("Dados dos transformadores");
    const paresTrafo = _paresPotenciaGD();
    // Só a potência é validada: a quantidade não é campo do card (1 card = 1
    // transformador), então não há como o usuário deixá-la inválida.
    trafosGD.forEach((t, i) => {
      const rot = `Transformador ${i + 1}`;
      if (!(potFutura(t) > 0)) faltas.push(`Potência do transformador ${i + 1}`);
      if (!(impedFutura(t) > 0))
        faltas.push(`Impedância do transformador ${i + 1}`);
      // Demanda: os mesmos campos que o card põe em tela (ver renderTrafosGD).
      if (paresTrafo.verNovaOuFutura && !(parseFloat(t.demanda) > 0))
        faltas.push(
          `${rot}: ${paresTrafo.nova ? GD_ROTULOS_DEMANDA.nova : GD_ROTULOS_DEMANDA.futura}`,
        );
      if (paresTrafo.verAtual && !(parseFloat(t.demandaAtual) > 0))
        faltas.push(`${rot}: ${GD_ROTULOS_DEMANDA.atual}`);
      const dem = demandaRepresentativaObjGD(t);
      const pot = _potenciaCardTrafoGD(t);
      if (dem > 0 && pot > 0 && dem > pot)
        faltas.push(
          `${rot}: demanda (${_fmtGD(dem)} kW) acima da potência dele (${_fmtGD(pot)} kVA)`,
        );
    });
  }
  if (!tipoSEefetivoGD()) faltas.push("Tipo de subestação");
  return faltas;
}
