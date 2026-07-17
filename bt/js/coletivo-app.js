/* ============================================================
   CEMIG BT — Fluxos COLETIVO e CONDOMÍNIO (múltiplas torres)
   em HTML/JS puro (padrão MT). Substitui o app React
   (bt/js/app.js + views) para os cards formType "coletivo" e
   "condominio" — um único app serve os dois (flag MULTI).
   ------------------------------------------------------------
   O núcleo comum (binding, navegação, toggles, PF/CNPJ, CEP,
   correspondência, mapa/restrição, helpers de prévia) vive em
   bt/js/bt-core.js. O estado mantém o MESMO shape que
   gerarPdfDoc(S) espera (atend/prop/corr/obra + ucBlocos[] +
   blocos[]) — pdf.js, calc.js, data.js e model.js reutilizados
   sem alteração. Os derivados (demanda ND-5.2, disjuntores,
   validações) são portes VERBATIM dos useMemo de app.js; os
   useEffect viram chamadas explícitas pós-mutação.
   ============================================================ */

/* ===== Card da modalidade (?mod=<id>) + fluxo ===== */
const CARD = btResolverCard(["coletivo", "condominio"]) || {};
const MULTI = CARD.formType === "condominio";

// Pruning do superset [data-flow]: feito por script inline no index.html,
// antes do primeiro paint e dos CDNs — aqui já chegaria tarde (a lista
// aparecia sendo podada/renumerada na tela).

/* ===== Estado (mesmo shape do App React / gerarPdfDoc) ===== */
const _prefAtividade = (CARD.prefill && CARD.prefill.atividade) || "";
function novaUcBloco(i) {
  const u = ucBlocoPadrao(i);
  if (_prefAtividade) u.atividade = _prefAtividade;
  return u;
}
function novaTorre(i) {
  const b = blocoPadrao(i);
  if (_prefAtividade)
    b.ucs = (b.ucs || []).map((u) =>
      Object.assign(u, { atividade: _prefAtividade }),
    );
  return b;
}
const state = {
  atend: Object.assign(
    atendPadrao(),
    (CARD.prefill && CARD.prefill.atend) || {},
  ),
  prop: propPadrao(),
  corr: corrPadrao(),
  // Paridade com o app React: distMenor30 "Sim" e prontoLigar "Não" são os
  // valores iniciais do coletivo; a zona é SEMPRE "Urbano" neste fluxo
  // (grafia do React em views/empreendimento.js — não "Urbana").
  obra: Object.assign(
    obraPadrao(),
    { distMenor30: "Sim", prontoLigar: "Não" },
    (CARD.prefill && CARD.prefill.obra) || {},
    { localizacao: "Urbano" },
  ),
  obs: "",
  ucsDet: [],
  ucBlocos: [novaUcBloco(0)],
  blocos: [novaTorre(0)],
  logoPDF: null,
};
window.state = state;
// Abertura dos acordeões (fora do estado do formulário, como no React)
const _ucAberta = {};
const _torreAberta = {};
const _uniAberta = {}; // unidades da etapa Dados das unidades ("bi:ui")
// Paginação e torre selecionada das etapas do condomínio (UI apenas)
const ITENS_POR_PAGINA = 10;
let _torrePagina = 0; // página da lista de torres (etapa Dados das torres)
let _uniTorre = 0; // torre selecionada na etapa Dados das unidades
const _uniPagina = {}; // página da lista de unidades, por torre

/* ===== flags de fluxo (paridade com app.js:67-68) ===== */
const coletivoF = () => state.atend.disjGeral === "Sim";
const hibridoF = () =>
  coletivoF() && !MULTI && state.atend.solicitacao === SOLICITACOES[3];
const trocaDisjGeralF = () =>
  coletivoF() &&
  !MULTI &&
  state.atend.escopo === "Alteração de Carga com alteração do disjuntor geral";
// Concordância dos rótulos: "Torre" é feminino, "Bloco" masculino.

/* ===== derivados (portes verbatim dos useMemo de app.js) ===== */
// Modo de previsão do coletivo, decidido SÓ pela quantidade de apartamentos
// residenciais (a área não participa da escolha do método — ela só define o
// valor A dentro do ND-5.2):
//  • 4+ apartamentos residenciais → método 5.2 (Carga prevista por UC +
//    demanda geral não residencial informada pelo RT);
//  • menos de 4 (ou nenhuma UC residencial) → TODAS as UCs detalham as
//    cargas como no BT individual (montarCargasBT / ND-5.1).
const modoCalculadoraF = () => nd52InfoF().quantidadeApartamentos < 4;
// Carga instalada total (kW): campo Carga prevista no método 5.2; soma das
// cargas detalhadas (calculadora) quando o ND-5.2 não calcula.
const prevTotalKwF = () => {
  const calc = modoCalculadoraF();
  return state.ucBlocos.reduce((s, u) => {
    if (ucSemAlteracao(u)) return s;
    return s + (calc ? num((u.cargas || {})._cargaKw) : prevKwUC(u));
  }, 0);
};
// app.js:246-268
function nd52InfoF() {
  const residenciais = state.ucBlocos.filter(
    (u) => u.atividade === "Residencial" && !ucSemAlteracao(u),
  );
  const quantidadeApartamentos = residenciais.length;
  const areaMediaPonderada = !quantidadeApartamentos
    ? 0
    : residenciais.reduce((s, u) => s + num(u.area), 0) /
      quantidadeApartamentos;
  return {
    quantidadeApartamentos,
    areaMediaPonderada,
    nd52: nd52CalcularDemandaApartamentos(
      areaMediaPonderada,
      quantidadeApartamentos,
    ),
  };
}
// app.js:269-276
const temUCNaoResidencialF = () =>
  state.ucBlocos.some(
    (u) => u.atividade && u.atividade !== "Residencial" && !ucSemAlteracao(u),
  );
// Demanda total das UCs do agrupamento, conforme o modo (ver modoCalculadoraF)
function demandaPrevTotalF() {
  if (modoCalculadoraF())
    // Modo calculadora: soma das demandas calculadas pelas cargas de cada UC
    return state.ucBlocos.reduce(
      (s, u) => s + (ucSemAlteracao(u) ? 0 : num((u.cargas || {})._demanda)),
      0,
    );
  // Método 5.2: residencial pelo ND-5.2 (0 enquanto a área média estiver
  // fora da tabela — a validação aponta a pendência) + não residencial do RT.
  const nd52 = nd52InfoF().nd52;
  const demandaNaoResidencial = temUCNaoResidencialF()
    ? num(state.atend.demandaNaoResidencial)
    : 0;
  return (nd52 ? nd52.demandaKVA : 0) + demandaNaoResidencial;
}
// app.js:315-343
function validacaoHibridoF() {
  if (!hibridoF()) return { ok: true, erros: [] };
  const erros = [];
  const u51 = state.ucBlocos.filter((u) => u.nd === "5.1");
  const u52 = state.ucBlocos.filter((u) => u.nd === "5.2");
  const pred51 = u51.map((u) => (u.nPredial || "").trim());
  if (pred51.some((p) => !p))
    erros.push("ND 5.1: informe o nº predial de todas as UCs 5.1.");
  const dup51 = pred51.filter(
    (p) => p && pred51.indexOf(p) !== pred51.lastIndexOf(p),
  );
  if (dup51.length)
    erros.push(
      "ND 5.1: os números prediais devem ser distintos entre as UCs 5.1.",
    );
  const comp52 = u52.map((u) => (u.complemento || "").trim());
  if (u52.length > 1 && comp52.some((c) => !c))
    erros.push(
      "ND 5.2: informe o complemento de todas as UCs 5.2 (elas compartilham o mesmo nº predial).",
    );
  const dup52 = comp52.filter(
    (c) => c && comp52.indexOf(c) !== comp52.lastIndexOf(c),
  );
  if (dup52.length)
    erros.push(
      "ND 5.2: os complementos devem ser distintos (mesmo predial, diferindo só pelo complemento).",
    );
  return { ok: erros.length === 0, erros };
}
// app.js:622-634 (ramo coletivo; multiTorres → 0)
const maiorCorrenteUCF = () =>
  MULTI
    ? 0
    : state.ucBlocos.reduce(
        (mx, u) =>
          Math.max(mx, correnteDisj(u.disjPara), correnteDisj(u.disjDe)),
        0,
      );
// app.js:635-638
// Mesmo critério de dimensionamento mínimo do disjuntor da torre e dos demais
// campos: só o MENOR disjuntor geral adequado (seletividade + capacidade).
const opcoesDisjGeralF = () =>
  disjuntoresGeraisAcima(maiorCorrenteUCF(), demandaPrevTotalF()).slice(0, 1);
// app.js:698-701
const totalUcsEmpreendimentoF = () =>
  state.blocos.reduce((s, b) => s + (parseInt(b.qtdUCs) || 0), 0);
// app.js:702-714 (ramos multi/coletivo)
const demandaTotalGeralF = () =>
  MULTI
    ? state.blocos.reduce(
        (s, b) =>
          s + calcBlocoMultiTorres(b).demandaUcs + num(b.demandaIncendio),
        0,
      )
    : demandaPrevTotalF();

/* ===== efeitos React → chamadas explícitas pós-mutação ===== */
// app.js:474-502 (ramo coletivo): ucBlocos acompanha atend.nUCs
function sincronizarUcBlocos() {
  const n = Math.max(1, Number(state.atend.nUCs) || 1);
  const arr = state.ucBlocos;
  while (arr.length < n) arr.push(novaUcBloco(arr.length));
  while (arr.length > n) arr.pop();
}
// Preset de carga prevista da UC Residencial pelo disjPara: preenche quando
// o campo está vazio ou ainda com o valor de outro preset (não sobrescreve
// valor digitado pelo usuário).
function aplicarPresetResidencial() {
  const presets = Object.values(PRESET_PREV_RESIDENCIAL_COLETIVO);
  state.ucBlocos.forEach((u) => {
    if (u.atividade !== "Residencial") return;
    const preset = PRESET_PREV_RESIDENCIAL_COLETIVO[u.disjPara];
    if (!preset) return;
    const atual = String(u.cargaPrevista == null ? "" : u.cargaPrevista);
    if (atual === "" || (presets.includes(atual) && atual !== preset))
      u.cargaPrevista = preset;
  });
}
// app.js:522-535: blocos acompanha atend.nBlocos (aceita valor bruto —
// só redimensiona com número válido, sem apagar torres preenchidas)
function sincronizarBlocos() {
  if (!MULTI) return;
  if (
    String(state.atend.nBlocos == null ? "" : state.atend.nBlocos).trim() === ""
  )
    return;
  const n = Math.max(1, Number(state.atend.nBlocos) || 1);
  const arr = state.blocos;
  while (arr.length < n) arr.push(novaTorre(arr.length));
  while (arr.length > n) arr.pop();
}
// app.js:639-645: auto-seleção do disjuntor geral do agrupamento
function autoSelecionarDisjGeral() {
  if (!coletivoF() || MULTI) return;
  const ops = opcoesDisjGeralF();
  if (!ops.length) return;
  if (state.atend.disjuntorGeral && ops.includes(state.atend.disjuntorGeral))
    return;
  state.atend.disjuntorGeral = ops[0];
}
// app.js:651-669: auto-seleção dos disjuntores geral/incêndio por torre
function autoSelecionarDisjTorres() {
  if (!MULTI) return;
  state.blocos.forEach((b) => {
    const ops = opcoesDisjGeralTorre(b);
    if (ops.length && !(b.disjGeral && ops.includes(b.disjGeral)))
      b.disjGeral = ops[0];
    const opsI = opcoesDisjIncendioTorre(b);
    if (opsI.length && !(b.disjIncendio && opsI.includes(b.disjIncendio)))
      b.disjIncendio = opsI[0];
  });
}

/* ===== replicações (portes de app.js) ===== */
// app.js:344-361
function replicarUC1Coletivo() {
  const base = state.ucBlocos[0];
  if (!base) return;
  state.ucBlocos = state.ucBlocos.map((u, k) =>
    k === 0
      ? u
      : Object.assign({}, base, {
          cargas: JSON.parse(JSON.stringify(base.cargas || {})),
          _acc: {},
          identificacao: u.identificacao || `UC ${k + 1}`,
          nPredial: u.nPredial,
          complemento: u.complemento,
          caixa: u.caixa,
          instalacao: u.instalacao,
          unidadeConsumidora: u.unidadeConsumidora,
        }),
  );
  renderUcsColetivo();
}
// app.js:365-376
function replicarPrimeiro() {
  const base = state.blocos[0];
  if (!base) return;
  state.blocos = state.blocos.map((b, i) =>
    i === 0
      ? b
      : Object.assign({}, base, {
          nome: `${i + 1}`,
          ucs: (base.ucs || []).map((u) =>
            Object.assign({}, u, {
              cargas: JSON.parse(JSON.stringify(u.cargas || {})),
              _acc: {},
            }),
          ),
        }),
  );
  // Replicar a torre 1 copia o primeiro complemento/aptos por andar; reaplica a
  // geração de complementos em cada torre para que as UCs fiquem numeradas.
  state.blocos.forEach((_, i) => autoGerarComplementosTorre(i));
  autoSelecionarDisjTorres();
  renderBlocos();
}
// app.js:377-391 (aceita valor bruto durante a digitação)
function sincronizarUCsTorre(bi, qtd) {
  const b = state.blocos[bi];
  if (!b) return;
  const n = parseInt(qtd);
  b.qtdUCs = qtd;
  if (!Number.isFinite(n) || n < 1) return;
  const arr = b.ucs || (b.ucs = []);
  while (arr.length < n) {
    const nova = ucTorrePadrao(arr.length);
    if (_prefAtividade) nova.atividade = _prefAtividade;
    arr.push(nova);
  }
  while (arr.length > n) arr.pop();
}
// Preenche os complementos das UCs da torre a partir do primeiro complemento
// (+ aptos por andar). Não re-renderiza — os campos que disparam ficam na etapa
// "Dados das torres" e não devem perder o foco enquanto o usuário digita.
function autoGerarComplementosTorre(bi) {
  const b = state.blocos[bi];
  if (!b) return;
  const lista = gerarComplementos(
    b.complInicial,
    (b.ucs || []).length,
    b.aptosPorAndar,
  );
  if (!lista) return;
  (b.ucs || []).forEach((u, k) => (u.complemento = lista[k]));
}
// app.js:450-473 (preserva complemento/instalação/nº UC de cada unidade)
function replicarUC1Torre(bi) {
  const b = state.blocos[bi];
  if (!b || !(b.ucs || []).length) return;
  const base = b.ucs[0];
  b.ucs = b.ucs.map((u, k) =>
    k === 0
      ? u
      : Object.assign({}, base, {
          cargas: JSON.parse(JSON.stringify(base.cargas || {})),
          _acc: {},
          identificacao: `UC ${k + 1}`,
          complemento: u.complemento,
          instalacao: u.instalacao,
          unidadeConsumidora: u.unidadeConsumidora,
        }),
  );
  autoSelecionarDisjTorres();
  renderUnidadesTorreAtual();
}

/* ===== Gate da etapa Empreendimento ===== */
// Campos próprios (nome + doc válido + ART) liberam os detalhes; o avanço
// exige também o endereço urbano completo (_reqEnderecoObra do React com
// s.coletivo: art, cep, endereco, num, bairro, cidade, estado).
function _emprCompleto() {
  return (
    !!String(state.prop.nome || "").trim() &&
    docInfo().valido === true &&
    !!String(state.obra.art || "").trim()
  );
}
window.btEmprOk = () => {
  const o = state.obra;
  const ok = (v) => String(v == null ? "" : v).trim() !== "";
  return (
    _emprCompleto() &&
    ok(o.cep) &&
    ok(o.endereco) &&
    ok(o.num) &&
    ok(o.bairro) &&
    ok(o.cidade) &&
    ok(o.estado)
  );
};
let _emprRevelado = false;
function onEmprGate() {
  const det = $("#emprDetalhes");
  if (!det) return;
  const mostrar = _emprCompleto();
  det.style.display = mostrar ? "" : "none";
  if (mostrar && !_emprRevelado) {
    _emprRevelado = true;
    CemigMarcadores.aplicar(det);
    initMapaObra();
    if (mapaObra) setTimeout(() => mapaObra.invalidateSize(), 150);
    onCoordBT(true);
  }
  CemigMarcadores.atualizarAvancar();
}

/* ============================================================
   Etapa UCs do coletivo (renderUcsColetivo — porte de
   views/ucs-coletivo.js)
   ============================================================ */
function _inp(valor, oninput, props) {
  const i = document.createElement("input");
  i.type = (props && props.type) || "text";
  i.placeholder = (props && props.placeholder) || " ";
  i.value = valor == null ? "" : valor;
  i.addEventListener("input", () => oninput(i.value));
  return i;
}
function renderHibridoAlertas() {
  const box = $("#hibridoAlertas");
  if (!box) return;
  if (!hibridoF()) {
    box.innerHTML = "";
    return;
  }
  const v = validacaoHibridoF();
  box.innerHTML = v.ok
    ? '<div class="alert alert-ok" style="margin-bottom:14px">Classificação ND 5.1 / ND 5.2 das UCs está consistente.</div>'
    : `<div class="alert alert-warn" style="margin-bottom:14px"><strong>Atendimento híbrido — pendências:</strong><ul style="margin:6px 0 0;padding-left:18px">${v.erros.map((e) => `<li>${e}</li>`).join("")}</ul></div>`;
}
function renderUcsColetivo() {
  const box = $("#ucsColetivoBox");
  if (!box) return;
  sincronizarUcBlocos();
  renderHibridoAlertas();
  const titulo = $("#ucsColetivoTitulo");
  if (titulo)
    titulo.textContent = `Unidades Consumidoras (${state.ucBlocos.length})`;
  const toolbar = $("#ucsColetivoToolbar");
  if (toolbar) {
    toolbar.style.display = state.ucBlocos.length > 1 ? "flex" : "none";
  }
  const hibrido = hibridoF();
  const modoCalc = modoCalculadoraF();
  box.innerHTML = "";
  state.ucBlocos.forEach((u, ui) => {
    const aberta = _ucAberta[ui] === true;
    const bloco = document.createElement("div");
    bloco.className = "uc-colapsavel" + (aberta ? " is-open" : "");
    const head = document.createElement("button");
    head.type = "button";
    head.className = "uc-colapsavel-head";
    head.setAttribute("aria-expanded", aberta ? "true" : "false");
    const headHtml = () =>
      `<span class="uc-head-info"><span class="uc-colapsavel-titulo">${u.identificacao || `UC ${ui + 1}`}</span>` +
      (u.complemento
        ? `<span class="uc-head-endereco-label">Complemento</span><span class="uc-head-endereco">${u.complemento}</span>`
        : "") +
      `</span><span class="carga-acc-chevron uc-colapsavel-chevron" aria-hidden="true"></span>`;
    head.innerHTML = headHtml();
    head.addEventListener("click", () => {
      btToggleExclusivo(_ucAberta, ui, !aberta);
      renderUcsColetivo();
    });
    bloco.appendChild(head);
    if (aberta) {
      const corpo = document.createElement("div");
      corpo.className = "uc-colapsavel-corpo";
      const grid = document.createElement("div");
      grid.className = "grid grid-3";
      // Norma de atendimento (só híbrido)
      if (hibrido) {
        grid.appendChild(
          _campo(
            "Norma de atendimento",
            _selectDe(["ND 5.1", "ND 5.2"], "ND " + u.nd, (v) => {
              u.nd = v.replace("ND ", "");
              renderUcsColetivo();
            }),
            "field--float",
          ),
        );
      }
      // Identificação (opcional)
      grid.appendChild(
        _campo(
          "Identificação",
          _inp(u.identificacao, (v) => {
            u.identificacao = v;
            head.innerHTML = headHtml();
          }),
        ),
      );
      // Nº Predial: editável só no híbrido ND 5.1; senão readonly (obra.num)
      if (hibrido && u.nd === "5.1") {
        const f = _campo(
          "Nº Predial",
          _inp(u.nPredial, (v) => (u.nPredial = v)),
        );
        f.setAttribute("data-noopt", "");
        const hint = document.createElement("span");
        hint.className = "field-hint";
        hint.textContent = "Distinto entre as UCs";
        f.appendChild(hint);
        grid.appendChild(f);
      } else {
        const ro = document.createElement("div");
        ro.className = "readonly-val";
        ro.textContent = state.obra.num || "—";
        const f = _campo("Nº Predial", ro);
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      }
      // Complemento (obrigatório com 2+ UCs — visual; não trava o avanço)
      {
        const f = _campo(
          "Complemento do endereço",
          _inp(
            u.complemento,
            (v) => {
              u.complemento = v;
              head.innerHTML = headHtml();
            },
            { placeholder: "999" },
          ),
        );
        if (state.ucBlocos.length > 1) f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      }
      // Caixa (opcional)
      grid.appendChild(
        _campo(
          "Caixa",
          _inp(u.caixa, (v) => (u.caixa = v), { placeholder: "Apartamento" }),
        ),
      );
      // Solicitação (estrutural: campos aparecem/somem)
      {
        const f = _campo(
          "Solicitação",
          _selectDe(
            [
              "Conexão Nova",
              "Alteração de Carga",
              "Caixa Existente sem Alteração",
            ],
            u.solicitacao,
            (v) => {
              u.solicitacao = v;
              renderUcsColetivo();
            },
          ),
          "field--float",
        );
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      }
      // Mudança de local (Alteração / Caixa Existente)
      if (
        u.solicitacao === "Alteração de Carga" ||
        u.solicitacao === "Caixa Existente sem Alteração"
      ) {
        const f = document.createElement("div");
        f.className = "field field--plain";
        f.setAttribute("data-noopt", "");
        const l = document.createElement("label");
        l.textContent = "Mudança de local";
        const tg = document.createElement("div");
        tg.className = "toggle-group";
        ["Sim", "Não"].forEach((v) => {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "toggle-btn" + (u.mudancaLocal === v ? " on" : "");
          b.textContent = v;
          b.addEventListener("click", () => {
            u.mudancaLocal = v;
            tg.querySelectorAll(".toggle-btn").forEach((x) =>
              x.classList.toggle("on", x === b),
            );
          });
          tg.appendChild(b);
        });
        f.append(l, tg);
        grid.appendChild(f);
      }
      // Atividade principal (estrutural: Ramo × Área)
      {
        const f = _campo(
          "Atividade principal",
          _selectDe(
            ["Residencial", "Comercial", "Industrial", "Rural"],
            u.atividade,
            (v) => {
              u.atividade = v;
              aplicarPresetResidencial();
              renderUcsColetivo();
            },
            true,
          ),
          "field--float",
        );
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      }
      if (u.atividade !== "Residencial") {
        const f = _campo(
          "Ramo de atividade",
          _inp(u.ramo, (v) => (u.ramo = v), { placeholder: "Obrigatório" }),
        );
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      } else {
        const f = _campo(
          "Área (m²)",
          _inp(
            u.area,
            (v) => {
              u.area = v;
              // A área não muda o método (só o valor A do ND-5.2) —
              // atualiza apenas os calculados, sem re-render (mantém o foco).
              atualizarCargasColetivo();
            },
            {
              type: "number",
              placeholder: "Ex: 65",
            },
          ),
        );
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      }
      if (u.solicitacao !== "Conexão Nova") {
        const f = _campo(
          "Instalação",
          _inp(u.instalacao, (v) => (u.instalacao = v), {
            placeholder: "Nº instalação existente",
          }),
        );
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
        grid.appendChild(
          _campo(
            "Unidade Consumidora",
            _inp(u.unidadeConsumidora, (v) => (u.unidadeConsumidora = v)),
          ),
        );
        grid.appendChild(
          _campo(
            "Disjuntor atual",
            _selectDe(
              DISJ.map((d) => d.fx),
              u.disjDe,
              (v) => {
                u.disjDe = v;
              },
              true,
            ),
            "field--float",
          ),
        );
      }
      grid.appendChild(
        _campo(
          "Disjuntor solicitado",
          _selectDe(
            DISJ_CN.map((d) => d.fx),
            u.disjPara,
            (v) => {
              u.disjPara = v;
              aplicarPresetResidencial();
              autoSelecionarDisjGeral();
              // Re-render para o campo Carga prevista refletir o preset
              renderUcsColetivo();
            },
            true,
          ),
          "field--float",
        ),
      );
      // Carga prevista (kW) — substitui a antiga tabela de previsão de carga;
      // aparece no método 5.2 quando o agrupamento tem mais de 3 UCs.
      if (!modoCalc && state.ucBlocos.length > 3 && !ucSemAlteracao(u)) {
        const f = _campo(
          "Carga prevista (kW)",
          _inp(
            u.cargaPrevista,
            (v) => {
              u.cargaPrevista = v;
              atualizarCargasColetivo();
            },
            { type: "number", placeholder: "0,0" },
          ),
        );
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      }
      corpo.appendChild(grid);
      // ND-5.2 não calcula → a UC detalha as cargas como no BT individual
      // (mesma ilha montarCargasBT; demanda/carga da UC saem do cálculo).
      if (modoCalc && !ucSemAlteracao(u)) {
        const divisor = document.createElement("div");
        divisor.className = "divider";
        const titulo = document.createElement("span");
        titulo.className = "subbox-title";
        titulo.textContent = "Cargas da unidade";
        divisor.appendChild(titulo);
        corpo.appendChild(divisor);
        const cargasBox = document.createElement("div");
        corpo.appendChild(cargasBox);
        montarCargasBT(cargasBox, u, ui, () => atualizarCargasColetivo());
      }
      bloco.appendChild(corpo);
    }
    box.appendChild(bloco);
  });
  if (window.CemigMarcadores) {
    CemigMarcadores.aplicar(box);
    CemigMarcadores.atualizarAvancar();
  }
}

/* ============================================================
   Etapa Demanda do coletivo (a antiga tabela de previsão de
   carga foi substituída pelo campo Carga prevista por UC na
   etapa de Identificação das UCs).
   ============================================================ */
function renderCargasColetivo() {
  sincronizarUcBlocos();
  aplicarPresetResidencial();
  atualizarCargasColetivo();
}
// Atualiza SÓ o que é calculado (KPIs, alertas, disjuntor geral).
function atualizarCargasColetivo() {
  const info = nd52InfoF();
  const kKw = $("#kpiPrevKw");
  if (kKw) kKw.textContent = fmt2(prevTotalKwF());
  const kDem = $("#kpiDemandaAtendimento");
  if (kDem) kDem.textContent = fmt2(demandaTotalGeralF());
  // Alertas ND-5.2 / modo calculadora
  const alertas = $("#nd52Alertas");
  if (alertas) {
    let html = "";
    if (!modoCalculadoraF()) {
      html = info.nd52
        ? `<div class="alert alert-ok" style="margin-bottom:14px"><b>Demanda dos apartamentos residenciais (ND-5.2):</b> ${info.quantidadeApartamentos} apartamento(s) · área média ponderada ${fmt2(info.areaMediaPonderada)} m² · Fator F ${fmt2(info.nd52.fatorF)} · A ${fmt2(info.nd52.demandaAreaA)} → D = ${fmt2(info.nd52.demandaKVA)} kVA (incluída automaticamente na demanda total abaixo).</div>`
        : `<div class="alert alert-warn" style="margin-bottom:14px"><b>Método ND-5.2 (${info.quantidadeApartamentos} apartamentos):</b> informe a área de cada apartamento residencial — a área média ponderada precisa ficar entre 1 e 1000 m² (atual: ${fmt2(info.areaMediaPonderada)} m²). A demanda residencial permanece zerada até lá.</div>`;
    } else {
      const motivo =
        info.quantidadeApartamentos === 0
          ? "Não há UCs residenciais para o cálculo automático pelo ND-5.2"
          : `ND-5.2 exige no mínimo 4 apartamentos para o cálculo automático (atualmente ${info.quantidadeApartamentos})`;
      html = `<div class="alert alert-info" style="margin-bottom:14px">${motivo}: a demanda do agrupamento é a soma das demandas calculadas pelas cargas detalhadas em cada UC (método ND-5.1), na etapa de Unidades Consumidoras.</div>`;
    }
    alertas.innerHTML = html;
  }
  // Demanda geral não residencial: só no método 5.2 (quando o ND-5.2 calcula
  // a parte residencial); no modo calculadora as UCs não residenciais também
  // detalham as próprias cargas.
  const naoResBox = $("#demandaNaoResBox");
  if (naoResBox)
    naoResBox.style.display =
      !modoCalculadoraF() && temUCNaoResidencialF() ? "" : "none";
  const aviso = $("#aviso304Cargas");
  if (aviso) aviso.style.display = demandaTotalGeralF() > 304 ? "" : "none";
  autoSelecionarDisjGeral();
  renderDisjGeralColetivo();
}
// Cards "Troca do Disjuntor Geral" e "Disjuntor Geral do Agrupamento"
function renderDisjGeralColetivo() {
  const troca = trocaDisjGeralF();
  const dem = demandaPrevTotalF();
  const maior = maiorCorrenteUCF();
  const opcoes = opcoesDisjGeralF();
  const trocaBox = $("#trocaDisjBox");
  if (trocaBox) {
    trocaBox.style.display = troca ? "" : "none";
    if (troca) {
      const campos = $("#trocaDisjCampos");
      campos.innerHTML = "";
      const selAtual = _selectDe(
        DISJ.map((d) => d.fx),
        state.atend.disjGeralAtual,
        (v) => (state.atend.disjGeralAtual = v),
        true,
      );
      const fAtual = _campo(
        "Disjuntor geral existente",
        selAtual,
        "field--float",
      );
      fAtual.setAttribute("data-noopt", "");
      campos.appendChild(fAtual);
      const selNovo = _selectDe(
        opcoes,
        state.atend.disjuntorGeral,
        (v) => (state.atend.disjuntorGeral = v),
        true,
      );
      const fNovo = _campo("Disjuntor geral novo", selNovo, "field--float");
      fNovo.setAttribute("data-noopt", "");
      campos.appendChild(fNovo);
      const fDem = _campo(
        "Demanda atual (kVA)",
        _inp(state.atend.demandaAtual, (v) => (state.atend.demandaAtual = v), {
          type: "number",
          placeholder: "0,0",
        }),
      );
      fDem.setAttribute("data-noopt", "");
      campos.appendChild(fDem);
      const ro = document.createElement("div");
      ro.className = "readonly-val";
      ro.textContent = fmt2(dem) + " kVA";
      const fFut = _campo("Demanda futura (kVA)", ro);
      fFut.setAttribute("data-noopt", "");
      campos.appendChild(fFut);
    }
  }
  const geralBox = $("#disjGeralBox");
  if (!geralBox) return;
  const mostrar = coletivoF() && !troca;
  geralBox.style.display = mostrar ? "" : "none";
  if (!mostrar) return;
  const sub = $("#disjGeralSub");
  if (sub)
    sub.textContent = `Sugestão automática conforme seletividade (faixa superior ao maior disjuntor das UCs, acima de ${maior || "—"} A) e capacidade para a demanda total (${fmt2(dem)} kVA).`;
  const campos = $("#disjGeralCampos");
  const invalido =
    state.atend.disjuntorGeral && !opcoes.includes(state.atend.disjuntorGeral);
  campos.parentElement.classList.toggle("geral-box--error", !!invalido);
  campos.innerHTML = "";
  const sel = _selectDe(
    opcoes,
    state.atend.disjuntorGeral,
    (v) => {
      state.atend.disjuntorGeral = v;
      renderDisjGeralColetivo();
    },
    true,
  );
  const f = _campo("Disjuntor geral", sel, "field--float");
  f.setAttribute("data-noopt", "");
  campos.appendChild(f);
  if (!opcoes.length) {
    const hint = document.createElement("div");
    hint.className = "alert alert-info";
    hint.style.marginTop = "10px";
    hint.textContent =
      "Preencha os disjuntores das UCs acima para liberar as opções.";
    campos.appendChild(hint);
  }
  if (invalido) {
    const aviso = document.createElement("div");
    aviso.className = "cmg-aviso cmg-aviso--error";
    aviso.style.cssText = "margin-top:10px;margin-bottom:0";
    aviso.innerHTML = `<div class="cmg-aviso-icon" aria-hidden="true"></div><p class="cmg-aviso-texto"><span>Esse disjuntor não atende à seletividade (faixa superior ao maior disjuntor das UCs, ${maior} A) e/ou à capacidade para a demanda total (${fmt2(dem)} kVA).</span></p></div>`;
    campos.appendChild(aviso);
  }
}

/* ============================================================
   Etapa "Dados das torres" (condomínio) — torres em acordeões
   paginados com os dados gerais de cada torre (identificação,
   qtd. de unidades, demanda/disjuntor do condomínio); as
   unidades são preenchidas na etapa seguinte, "Dados das
   unidades" (renderUnidadesTorres abaixo).
   ============================================================ */
function onNBlocos(el) {
  state.atend.nBlocos = el.value;
  sincronizarBlocos();
  autoSelecionarDisjTorres();
  renderBlocos();
}
function atualizarBlocosKpis() {
  const dem = demandaTotalGeralF();
  const kTot = $("#kpiTotalUcs");
  if (kTot) kTot.textContent = String(totalUcsEmpreendimentoF());
  const kDem = $("#kpiDemandaTotal");
  if (kDem) kDem.textContent = fmt2(dem);
  const aviso = $("#aviso304Blocos");
  if (aviso) aviso.style.display = dem > 304 ? "" : "none";
  const avisoUni = $("#aviso304Unidades");
  if (avisoUni) avisoUni.style.display = dem > 304 ? "" : "none";
}
// Carga total da torre (kW): soma da Carga prevista por UC (método 5.2) ou
// das cargas detalhadas na calculadora — só das UCs ativas.
function cargaTotalTorre(b) {
  const modoCalc = calcBlocoMultiTorres(b).modoCalculadora;
  return (b.ucs || []).reduce((s, u) => {
    if (ucSemAlteracao(u)) return s;
    return s + num(modoCalc ? (u.cargas || {})._cargaKw : u.cargaPrevista);
  }, 0);
}
// Endereço da obra (readonly nos cards de torre/unidade)
function enderecoObraTxt(complemento) {
  const o = state.obra;
  const base = [o.endereco, o.num].filter(Boolean).join(", ");
  return (base || "—") + (complemento ? `, ${complemento}` : "");
}
function _blocoEndereco(complemento) {
  const box = document.createElement("div");
  box.className = "endereco-bloco";
  const lbl = document.createElement("span");
  lbl.className = "uc-head-endereco-label";
  lbl.textContent = "Endereço";
  const val = document.createElement("span");
  val.className = "uc-head-endereco";
  val.textContent = enderecoObraTxt(complemento);
  box.append(lbl, val);
  return box;
}
// Paginação (torres e unidades): « ‹ [n] de N › »
function _mkPaginacao(totalPaginas, atual, aoIr) {
  const nav = document.createElement("div");
  nav.className = "paginacao";
  if (totalPaginas <= 1) return nav;
  const btn = (rotulo, alvo, aria) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "paginacao-btn";
    b.textContent = rotulo;
    b.setAttribute("aria-label", aria);
    b.disabled = alvo < 0 || alvo >= totalPaginas || alvo === atual;
    b.addEventListener("click", () => aoIr(alvo));
    return b;
  };
  nav.append(
    btn("«", 0, "Primeira página"),
    btn("‹", atual - 1, "Página anterior"),
  );
  const inp = document.createElement("input");
  inp.type = "number";
  inp.className = "paginacao-input";
  inp.min = "1";
  inp.max = String(totalPaginas);
  inp.value = String(atual + 1);
  inp.addEventListener("change", () => {
    const n = Math.min(totalPaginas, Math.max(1, parseInt(inp.value) || 1));
    aoIr(n - 1);
  });
  const de = document.createElement("span");
  de.className = "paginacao-total";
  de.textContent = `de ${totalPaginas}`;
  nav.append(
    inp,
    de,
    btn("›", atual + 1, "Próxima página"),
    btn("»", totalPaginas - 1, "Última página"),
  );
  return nav;
}
function renderBlocos() {
  const box = $("#blocosBox");
  if (!box) return;
  sincronizarBlocos();
  autoSelecionarDisjTorres();
  const total = state.blocos.length;
  const totalPag = Math.max(1, Math.ceil(total / ITENS_POR_PAGINA));
  if (_torrePagina >= totalPag) _torrePagina = totalPag - 1;
  box.innerHTML = "";
  const ini = _torrePagina * ITENS_POR_PAGINA;
  state.blocos.slice(ini, ini + ITENS_POR_PAGINA).forEach((b, k) => {
    box.appendChild(_mkTorreCard(ini + k, total));
  });
  const pag = $("#blocosPag");
  if (pag) {
    pag.innerHTML = "";
    pag.appendChild(
      _mkPaginacao(totalPag, _torrePagina, (p) => {
        _torrePagina = p;
        renderBlocos();
      }),
    );
  }
  atualizarBlocosKpis();
  if (window.CemigMarcadores) {
    CemigMarcadores.aplicar(box);
    CemigMarcadores.atualizarAvancar();
  }
}
function _mkTorreCard(bi, total) {
  const b = state.blocos[bi];
  const aberta = _torreAberta[bi] === true;
  const bloco = document.createElement("div");
  bloco.className = "uc-colapsavel" + (aberta ? " is-open" : "");
  const head = document.createElement("button");
  head.type = "button";
  head.className = "uc-colapsavel-head";
  head.setAttribute("aria-expanded", aberta ? "true" : "false");
  head.innerHTML =
    `<span class="uc-colapsavel-titulo">Torre <span class="carga-acc-badge">${bi + 1} de ${total}</span></span>` +
    `<span class="carga-acc-chevron uc-colapsavel-chevron" aria-hidden="true"></span>`;
  head.addEventListener("click", () => {
    btToggleExclusivo(_torreAberta, bi, !aberta);
    renderBlocos();
  });
  bloco.appendChild(head);
  if (!aberta) return bloco;
  const corpo = document.createElement("div");
  corpo.className = "uc-colapsavel-corpo";
  corpo.appendChild(_blocoEndereco(""));
  const grid = document.createElement("div");
  grid.className = "grid grid-2";
  grid.appendChild(
    _campo(
      "Identificação da torre",
      _inp(b.nome, (v) => (b.nome = v), { placeholder: `${bi + 1}` }),
    ),
  );
  {
    const f = _campo(
      `Quantidade de unidades na torre ${bi + 1}`,
      _inp(
        b.qtdUCs,
        (v) => {
          const antes = (b.ucs || []).length > 1;
          sincronizarUCsTorre(bi, v);
          // Aptos por andar / primeiro complemento só existem com 2+ UCs;
          // re-renderiza apenas quando a visibilidade muda (não a cada tecla,
          // para não perder o foco do campo de quantidade).
          if ((b.ucs || []).length > 1 !== antes) renderBlocos();
        },
        {
          type: "number",
          placeholder: "0",
        },
      ),
    );
    f.setAttribute("data-noopt", "");
    grid.appendChild(f);
  }
  grid.appendChild(
    _campo(
      "Demanda do condomínio (kVA)",
      _inp(
        b.demandaIncendio,
        (v) => {
          b.demandaIncendio = v;
          autoSelecionarDisjTorres();
          _refreshDisjCondominio(bi);
          atualizarBlocosKpis();
        },
        { type: "number", placeholder: "0" },
      ),
    ),
  );
  {
    const sel = _selectDe(
      opcoesDisjIncendioTorre(b),
      b.disjIncendio,
      (v) => (b.disjIncendio = v),
      true,
    );
    sel.id = `disjCondominio-${bi}`;
    grid.appendChild(_campo("Disjuntor do condomínio", sel, "field--float"));
  }
  // Geração de complementos das unidades desta torre: ao preencher o primeiro
  // complemento (e, opcionalmente, aptos por andar) os complementos das UCs são
  // preenchidos automaticamente, sem botão de disparo (ver autoGerarComplementosTorre).
  if ((b.ucs || []).length > 1) {
    const maxAptos = (b.ucs || []).length;
    const inpAndar = _inp(
      b.aptosPorAndar,
      (v) => {
        // Não faz sentido mais aptos por andar do que UCs na torre; limita ao total.
        const n = parseInt(v);
        if (Number.isFinite(n) && n > maxAptos) {
          v = String(maxAptos);
          inpAndar.value = v;
        }
        b.aptosPorAndar = v;
        autoGerarComplementosTorre(bi);
      },
      { type: "number", placeholder: "Ex: 4" },
    );
    inpAndar.max = String(maxAptos);
    const fAndar = _campo("Aptos por andar", inpAndar);
    fAndar.setAttribute("data-noopt", "");
    grid.appendChild(fAndar);
    const fCompl = _campo(
      "Primeiro complemento",
      _inp(
        b.complInicial,
        (v) => {
          b.complInicial = v;
          autoGerarComplementosTorre(bi);
        },
        { placeholder: "Ex: 101 ou Apto 01" },
      ),
    );
    fCompl.setAttribute("data-noopt", "");
    grid.appendChild(fCompl);
  }
  corpo.appendChild(grid);
  if (bi === 0 && total > 1) {
    const row = document.createElement("div");
    row.className = "acao-central";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-ghost btn-outlined-acao";
    btn.textContent = "Replicar torre 1 para todas as torres";
    btn.addEventListener("click", replicarPrimeiro);
    row.appendChild(btn);
    corpo.appendChild(row);
  }
  bloco.appendChild(corpo);
  return bloco;
}
// Reapresenta as opções do Disjuntor do condomínio quando a demanda muda
// (sem re-render do card — mantém o foco no campo de demanda).
function _refreshDisjCondominio(bi) {
  const sel = $(`#disjCondominio-${bi}`);
  const b = state.blocos[bi];
  if (!sel || !b) return;
  const ops = opcoesDisjIncendioTorre(b);
  sel.innerHTML =
    '<option value=""></option>' +
    ops.map((o) => `<option value="${o}">${o}</option>`).join("");
  sel.value =
    b.disjIncendio && ops.includes(b.disjIncendio) ? b.disjIncendio : "";
}

/* ============================================================
   Etapa "Dados das unidades" (condomínio) — chips por torre +
   unidades da torre selecionada em acordeões paginados; no
   rodapé os totais da torre e o disjuntor geral (radio).
   ============================================================ */
function renderUnidadesTorres() {
  const chips = $("#unidadesChips");
  if (!chips) return;
  sincronizarBlocos();
  autoSelecionarDisjTorres();
  if (_uniTorre >= state.blocos.length) _uniTorre = 0;
  chips.innerHTML = "";
  state.blocos.forEach((b, bi) => {
    const c = document.createElement("button");
    c.type = "button";
    c.className = "torre-chip" + (bi === _uniTorre ? " on" : "");
    c.textContent = `Torre ${b.nome || bi + 1}`;
    c.addEventListener("click", () => {
      _uniTorre = bi;
      renderUnidadesTorres();
    });
    chips.appendChild(c);
  });
  renderUnidadesTorreAtual();
}
// Re-render estrutural da torre selecionada (topo, acordeões, rodapé).
function renderUnidadesTorreAtual() {
  const box = $("#unidadesBox");
  const bi = _uniTorre;
  const b = state.blocos[bi];
  if (!box || !b) return;
  const ucs = b.ucs || [];
  const modoCalc = calcBlocoMultiTorres(b).modoCalculadora;
  renderUnidadesTopo(bi);
  const totalPag = Math.max(1, Math.ceil(ucs.length / ITENS_POR_PAGINA));
  let pagAtual = _uniPagina[bi] || 0;
  if (pagAtual >= totalPag) pagAtual = _uniPagina[bi] = totalPag - 1;
  box.innerHTML = "";
  const ini = pagAtual * ITENS_POR_PAGINA;
  ucs.slice(ini, ini + ITENS_POR_PAGINA).forEach((u, k) => {
    box.appendChild(_mkUnidadeCard(bi, ini + k, modoCalc));
  });
  const pag = $("#unidadesPag");
  if (pag) {
    pag.innerHTML = "";
    pag.appendChild(
      _mkPaginacao(totalPag, pagAtual, (p) => {
        _uniPagina[bi] = p;
        renderUnidadesTorreAtual();
      }),
    );
  }
  renderUnidadesResultado();
  if (window.CemigMarcadores) {
    CemigMarcadores.aplicar(box.closest(".card") || box);
    CemigMarcadores.atualizarAvancar();
  }
}
// Ferramentas da torre acima da lista: Demanda geral não residencial (só no
// método 5.2 com UCs não residenciais). Aptos por andar / primeiro complemento
// e a geração de complementos vivem agora na etapa "Dados das torres"; a
// replicação da UC 1 fica dentro da própria primeira unidade (ver _mkUnidadeCard).
function renderUnidadesTopo(bi) {
  const topo = $("#unidadesTopo");
  const b = state.blocos[bi];
  if (!topo || !b) return;
  // A demanda não residencial agora é preenchida por UC (ver _mkUnidadeCard);
  // não há mais ferramenta de topo nesta etapa.
  topo.innerHTML = "";
}
function _mkUnidadeCard(bi, ui, modoCalc) {
  const b = state.blocos[bi];
  const u = b.ucs[ui];
  const chave = `${bi}:${ui}`;
  const aberta = _uniAberta[chave] === true;
  const bloco = document.createElement("div");
  bloco.className = "uc-colapsavel" + (aberta ? " is-open" : "");
  const head = document.createElement("button");
  head.type = "button";
  head.className = "uc-colapsavel-head";
  head.setAttribute("aria-expanded", aberta ? "true" : "false");
  head.innerHTML =
    `<span class="uc-head-info"><span class="uc-head-eyebrow">Torre ${b.nome || bi + 1}</span>` +
    `<span class="uc-colapsavel-titulo">Unidade consumidora <span class="carga-acc-badge">${ui + 1} de ${b.ucs.length}</span></span></span>` +
    `<span class="carga-acc-chevron uc-colapsavel-chevron" aria-hidden="true"></span>`;
  head.addEventListener("click", () => {
    btToggleExclusivo(_uniAberta, chave, !aberta);
    renderUnidadesTorreAtual();
  });
  bloco.appendChild(head);
  if (!aberta) return bloco;
  const corpo = document.createElement("div");
  corpo.className = "uc-colapsavel-corpo";
  const endereco = _blocoEndereco(u.complemento);
  corpo.appendChild(endereco);
  const grid = document.createElement("div");
  grid.className = "grid grid-2";
  if (modoCalc && !ucSemAlteracao(u)) grid.style.marginBottom = "24px";
  {
    const f = _campo(
      "Complemento da unidade",
      _inp(
        u.complemento,
        (v) => {
          u.complemento = v;
          endereco.querySelector(".uc-head-endereco").textContent =
            enderecoObraTxt(v);
        },
        { placeholder: "Ex: 101" },
      ),
    );
    if (b.ucs.length > 1) f.setAttribute("data-noopt", "");
    grid.appendChild(f);
  }
  {
    // Múltiplas torres: o tipo de solicitação é sempre Conexão Nova (travado).
    u.solicitacao = "Conexão Nova";
    const sel = _selectDe(["Conexão Nova"], u.solicitacao, () => {});
    sel.disabled = true;
    const f = _campo("Tipo de solicitação", sel, "field--float");
    f.setAttribute("data-noopt", "");
    grid.appendChild(f);
  }
  {
    const f = _campo(
      "Atividade principal",
      _selectDe(
        ["Residencial", "Comercial", "Industrial", "Rural"],
        u.atividade,
        (v) => {
          u.atividade = v;
          renderUnidadesTorreAtual();
        },
        true,
      ),
      "field--float",
    );
    f.setAttribute("data-noopt", "");
    grid.appendChild(f);
  }
  if (u.atividade === "Residencial") {
    const f = _campo(
      "Área privativa (m²)",
      _inp(
        u.area,
        (v) => {
          u.area = v;
          // A área não muda o método (só o valor A do ND-5.2) — atualiza
          // apenas os calculados, sem re-render (mantém o foco).
          atualizarUnidadesCalc();
        },
        { type: "number", placeholder: "Ex: 65" },
      ),
    );
    f.setAttribute("data-noopt", "");
    grid.appendChild(f);
  } else {
    const f = _campo(
      "Ramo de atividade",
      _inp(u.ramo, (v) => (u.ramo = v), { placeholder: "Obrigatório" }),
    );
    f.setAttribute("data-noopt", "");
    grid.appendChild(f);
    // Método ND-5.2 (torre com 4+ apartamentos residenciais): a demanda de cada
    // UC não residencial é informada individualmente pelo RT e somada na torre.
    if (!modoCalc && !ucSemAlteracao(u)) {
      const fd = _campo(
        "Demanda não residencial (kVA)",
        _inp(
          u.demandaNaoResidencial,
          (v) => {
            u.demandaNaoResidencial = v;
            atualizarUnidadesCalc();
          },
          { type: "number", placeholder: "0,0" },
        ),
      );
      fd.setAttribute("data-noopt", "");
      grid.appendChild(fd);
    }
  }
  if (u.solicitacao !== "Conexão Nova") {
    const f = _campo(
      "Instalação",
      _inp(u.instalacao, (v) => (u.instalacao = v), {
        placeholder: "Nº instalação existente",
      }),
    );
    f.setAttribute("data-noopt", "");
    grid.appendChild(f);
    grid.appendChild(
      _campo(
        "Unidade Consumidora",
        _inp(u.unidadeConsumidora, (v) => (u.unidadeConsumidora = v)),
      ),
    );
  }
  const semAlt = ucSemAlteracao(u);
  // Carga prevista (kW) — substitui a antiga tabela de previsão de carga;
  // aparece no método 5.2 quando a torre tem mais de 3 UCs.
  if (!modoCalc && b.ucs.length > 3 && !semAlt) {
    const f = _campo(
      "Carga prevista da unidade (kW)",
      _inp(
        u.cargaPrevista,
        (v) => {
          u.cargaPrevista = v;
          atualizarUnidadesCalc();
        },
        { type: "number", placeholder: "0,0" },
      ),
    );
    f.setAttribute("data-noopt", "");
    grid.appendChild(f);
  }
  grid.appendChild(
    _campo(
      "Disjuntor da unidade",
      _selectDe(
        DISJ_CN.map((d) => d.fx),
        u.disjPara,
        (v) => {
          u.disjPara = v;
          atualizarUnidadesCalc();
        },
        true,
      ),
      "field--float",
    ),
  );
  corpo.appendChild(grid);
  // ND-5.2 não calcula → a UC detalha as cargas como no BT individual
  // (mesma ilha montarCargasBT; demanda/carga da UC saem do cálculo).
  if (modoCalc && !semAlt) {
    const cargasBox = document.createElement("div");
    corpo.appendChild(cargasBox);
    montarCargasBT(cargasBox, u, ui, () => atualizarUnidadesCalc());
  }
  // Replicar UC 1 para as demais unidades da torre — dentro da própria UC 1.
  if (ui === 0 && b.ucs.length > 1) {
    const row = document.createElement("div");
    row.className = "acao-central";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-ghost btn-outlined-acao";
    btn.textContent = "Replicar UC 1 para todas";
    btn.addEventListener("click", () => replicarUC1Torre(bi));
    row.appendChild(btn);
    corpo.appendChild(row);
  }
  bloco.appendChild(corpo);
  return bloco;
}
// Atualiza SÓ os derivados da torre selecionada (rodapé, KPIs, avisos) —
// mudanças estruturais (solicitação/atividade/qtd) re-renderizam a torre.
function atualizarUnidadesCalc() {
  autoSelecionarDisjTorres();
  renderUnidadesResultado();
  atualizarBlocosKpis();
}
// Rodapé da torre: Carga total + Demanda total + Disjuntor da torre (radio).
function renderUnidadesResultado() {
  const box = $("#unidadesResultado");
  const b = state.blocos[_uniTorre];
  if (!box || !b) return;
  const calcTorre = calcBlocoMultiTorres(b);
  const demandaTorre = calcTorre.demandaUcs + num(b.demandaIncendio);
  box.innerHTML = "";
  // Método 5.2 com área média fora da tabela: avisa e mantém residencial 0.
  if (!calcTorre.modoCalculadora && !calcTorre.nd52) {
    const aviso = document.createElement("div");
    aviso.className = "alert alert-warn";
    aviso.style.marginTop = "14px";
    aviso.textContent = `Método ND-5.2 (${calcTorre.qtdApart} apartamentos): informe a área de cada apartamento residencial da torre — a área média ponderada precisa ficar entre 1 e 1000 m² (atual: ${fmt2(calcTorre.areaMedia)} m²). A demanda residencial permanece zerada até lá.`;
    box.appendChild(aviso);
  }
  const wrap = document.createElement("div");
  wrap.className = "resultado-cargas divider";
  const kpis = document.createElement("div");
  kpis.className = "resultado-kpis";
  const mkKpi = (label, valor, titulo) => {
    const card = document.createElement("div");
    card.className = "resultado-card";
    card.innerHTML =
      `<span class="resultado-card-info" title="${titulo}" aria-hidden="true">i</span>` +
      `<div class="resultado-card-label">${label}</div>` +
      `<div class="resultado-card-valor">${valor}</div>`;
    return card;
  };
  kpis.append(
    mkKpi(
      "Carga total da Torre",
      `${fmt2(cargaTotalTorre(b))} kW`,
      "Soma das cargas previstas (ou calculadas) das unidades ativas da torre.",
    ),
    mkKpi(
      "Demanda total da torre",
      `${fmt2(demandaTorre)} kVA`,
      "Demanda das UCs pelo método aplicável (ND-5.2 ou calculadora) mais a demanda do condomínio.",
    ),
  );
  wrap.appendChild(kpis);
  const card = document.createElement("div");
  card.className = "resultado-card resultado-disjuntor";
  card.innerHTML = `<div class="resultado-card-label">Disjuntor da torre adequado de acordo com a seleção</div>`;
  const ops = opcoesDisjGeralTorre(b);
  if (ops.length) {
    const tg = document.createElement("div");
    tg.className = "toggle-group";
    ops.forEach((dj) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "toggle-btn" + ((b.disjGeral || ops[0]) === dj ? " on" : "");
      btn.textContent = dj;
      btn.addEventListener("click", () => {
        b.disjGeral = dj;
        renderUnidadesResultado();
      });
      tg.appendChild(btn);
    });
    card.appendChild(tg);
  } else {
    const hint = document.createElement("div");
    hint.className = "field-hint";
    hint.textContent =
      "Informe os disjuntores e a previsão de carga das unidades para ver o disjuntor adequado.";
    card.appendChild(hint);
  }
  wrap.appendChild(card);
  box.appendChild(wrap);
}

/* ============================================================
   Prévia & PDF (porte dos ramos coletivo/multi de
   views/revisar.js + validacaoObrigatorios de app.js:750-823)
   ============================================================ */
// Índices das etapas para os lápis (após o pruning): coletivo e condomínio
// têm 8 páginas — tipo=1, empr=2 e o miolo varia; corr fica antes de
// Observações (penúltima antes de obs/prévia).
const PG = MULTI
  ? { tipo: 1, empr: 2, blocos: 3, unidades: 4, corr: 5 }
  : { tipo: 1, empr: 2, ucs: 3, cargas: 4, corr: 5 };
function validacaoObrigatoriosColetivo() {
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
  req(p.cpfCnpj, "CPF/CNPJ");
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
  req(o.endereco, "Endereço da obra");
  req(o.num, "Nº da obra");
  req(o.bairro, "Bairro da obra");
  req(o.cidade, "Cidade da obra");
  req(o.cep, "CEP da obra");
  req(o.art, "Nº ART/TRT de Projeto");
  if (!(demandaTotalGeralF() > 0)) faltando.push("Demanda das UCs");
  // Demanda geral não residencial: exigida apenas no método 5.2 (no modo
  // calculadora as UCs não residenciais detalham as próprias cargas).
  if (!MULTI && !modoCalculadoraF() && temUCNaoResidencialF())
    req(
      state.atend.demandaNaoResidencial,
      "Demanda geral não residencial (kVA)",
    );
  // Método 5.2 sem ND-5.2 calculando = área média fora da tabela (vazia ou
  // acima de 1000 m²) — a demanda residencial está zerada até corrigir.
  if (!MULTI && !modoCalculadoraF() && !nd52InfoF().nd52)
    faltando.push(
      "Área dos apartamentos residenciais (média ponderada entre 1 e 1000 m²)",
    );
  if (!MULTI && modoCalculadoraF())
    state.ucBlocos.forEach((u, ui) => {
      if (!ucSemAlteracao(u) && !(num((u.cargas || {})._demanda) > 0))
        faltando.push(
          `Cargas da ${u.identificacao || `UC ${ui + 1}`} (demanda calculada)`,
        );
    });
  if (MULTI)
    state.blocos.forEach((b, bi) => {
      const cb = calcBlocoMultiTorres(b);
      if (!cb.modoCalculadora)
        (b.ucs || []).forEach((u, ui) => {
          if (
            !ucSemAlteracao(u) &&
            u.atividade &&
            u.atividade !== "Residencial" &&
            !String(u.demandaNaoResidencial || "").trim()
          )
            faltando.push(
              `Demanda não residencial da ${u.identificacao || `UC ${ui + 1}`} — Torre ${b.nome || bi + 1} (kVA)`,
            );
        });
      if (!cb.modoCalculadora && !cb.nd52)
        faltando.push(
          `Área dos apartamentos residenciais — Torre ${b.nome || bi + 1} (média ponderada entre 1 e 1000 m²)`,
        );
      if (cb.modoCalculadora)
        (b.ucs || []).forEach((u, ui) => {
          if (!ucSemAlteracao(u) && !(num((u.cargas || {})._demanda) > 0))
            faltando.push(
              `Cargas da ${u.identificacao || `UC ${ui + 1}`} — Torre ${b.nome || bi + 1}`,
            );
        });
    });
  if (hibridoF() && !validacaoHibridoF().ok)
    faltando.push("Pendências do atendimento híbrido");
  if (o.restricaoAmbiental === "Sim" && !o.restricaoAceite)
    faltando.push("Declaração de ciência da restrição ambiental");
  return { ok: faltando.length === 0, faltando };
}
function renderPreviaColetivo() {
  const box = $("#previaConteudo");
  if (!box) return;
  const p = state.prop,
    c = state.corr,
    o = state.obra;
  const pf = pessoaFisica();
  const emailFatura =
    c.alternativa === "E-mail informado"
      ? p.email
      : c.alternativa === "Outro e-mail"
        ? c.outroEmail
        : c.alternativa;
  const modalidadeTexto = MULTI
    ? `Múltiplas Torres · ${state.blocos.length} torre(s)`
    : "Coletivo — Agrupamento com Proteção Geral (APR Web)";
  let html = `<div class="previa-secao"><h4 class="previa-secao-titulo">Dados do proprietário</h4><div class="previa-grid">`;
  html += pvCampoBT("Nome", p.nome, PG.tipo, true);
  html += pvCampoBT("E-mail", p.email, PG.tipo);
  html += pvCampoBT("Celular", p.celular, PG.tipo);
  html += pvCampoBT(pf ? "CPF" : "CNPJ", p.cpfCnpj, PG.empr);
  if (pf) {
    html += pvCampoBT("Filiação", p.filiacao);
    html += pvCampoBT("RG", p.rg);
    html += pvCampoBT("Data de nascimento", p.nasc);
  }
  html += `</div></div><hr class="previa-divider" />`;
  html += `<div class="previa-secao"><h4 class="previa-secao-titulo">Correspondência</h4><div class="previa-grid">`;
  html += pvCampoBT("E-mail para receber a fatura", emailFatura, PG.corr);
  html += pvCampoBT(
    "Data de vencimento da fatura",
    c.vencimento ? "Todo dia " + c.vencimento : "",
    PG.corr,
  );
  html += `</div></div><hr class="previa-divider" />`;
  // Resumo do atendimento
  const modalidadeCard =
    modalidadeTexto +
    (!MULTI
      ? ` · ${state.atend.solicitacao || "—"} · ${state.atend.escopo || "—"}`
      : "") +
    (!MULTI && state.atend.disjuntorGeral
      ? ` · Disjuntor geral: ${state.atend.disjuntorGeral}`
      : "");
  html += `<div class="previa-secao"><h4 class="previa-secao-titulo">Resumo do atendimento</h4><div class="previa-cards">`;
  html += pvCardBT("Modalidade", modalidadeCard);
  html += pvCardBT(
    "Unidades consumidoras",
    String(MULTI ? totalUcsEmpreendimentoF() : state.ucBlocos.length),
  );
  html += pvCardBT("Demanda total", fmt2(demandaTotalGeralF()) + " kVA");
  html += `</div><div class="previa-grid">`;
  html += pvCampoBT(
    "Endereço",
    `${o.endereco || "—"}, ${o.num || "s/n"}`,
    PG.empr,
  );
  html += pvCampoBT(
    "Cidade / UF",
    `${o.cidade || "—"} / ${o.estado || "—"}`,
    PG.empr,
  );
  html += pvCampoBT("Localização", o.localizacao, PG.empr);
  html += pvCampoBT(
    "Coordenada",
    [o.lat, o.lng].filter(Boolean).join(", "),
    PG.empr,
  );
  html += `</div></div>`;
  if (MULTI) {
    html += `<hr class="previa-divider" /><div class="previa-secao"><h4 class="previa-secao-titulo">Torres / Blocos</h4>`;
    state.blocos.forEach((b, bi) => {
      const demanda =
        calcBlocoMultiTorres(b).demandaUcs + num(b.demandaIncendio);
      html += `<div class="preview-item" style="display:flex;justify-content:space-between"><span class="v">Torre ${b.nome || bi + 1} · ${b.qtdUCs || 0} UCs · Geral: ${b.disjGeral || "—"} · Incêndio: ${b.disjIncendio || "—"}</span><span style="color:var(--verde);font-weight:700">${fmt2(demanda)} kVA</span></div>`;
    });
    html += `</div>`;
  } else {
    html += `<hr class="previa-divider" /><div class="previa-secao"><h4 class="previa-secao-titulo">Previsão de carga e UCs</h4>`;
    html += `<div class="preview-item"><span class="v">Total ${fmt2(prevTotalKwF())} kW · Demanda ${fmt2(demandaTotalGeralF())} kVA</span></div>`;
    state.ucBlocos.forEach((u, ui) => {
      html += `<div class="preview-item" style="display:flex;justify-content:space-between"><span class="v">${u.identificacao || `UC ${ui + 1}`} · ${u.atividade || "—"} · ${u.solicitacao} ${u.complemento ? "· " + u.complemento : ""}</span><span style="color:var(--verde);font-weight:700">${u.disjPara || "—"}</span></div>`;
    });
    html += `</div>`;
  }
  box.innerHTML = html;
  // Documentos necessários
  const docsBox = $("#docsNecessarios");
  if (docsBox) {
    const docs = listaDocumentosBT({
      pessoaFisica: pf,
      pessoaJuridica: pessoaJuridica(),
      coletivo: coletivoF(),
      multiTorres: MULTI,
      hibrido: hibridoF(),
      obra: o,
      atend: state.atend,
      ucsDet: [],
      ucBlocos: state.ucBlocos,
      blocos: state.blocos,
      exibeTermoGrupoB: false,
      demandaTotalGeral: demandaTotalGeralF(),
      temMotoresPesados: false,
    });
    docsBox.innerHTML = docs
      .map(
        (dd) => `<div class="preview-item"><span class="v">${dd}</span></div>`,
      )
      .join("");
  }
  // Pendências + botão exportar
  const v = validacaoObrigatoriosColetivo();
  const faltasBox = $("#previaFaltas");
  if (faltasBox) {
    let html2 = "";
    if (hibridoF() && !validacaoHibridoF().ok)
      html2 +=
        '<div class="alert alert-warn" style="margin-bottom:12px">Corrija as pendências do atendimento híbrido (aba Unidades Consumidoras) para liberar a exportação do PDF.</div>';
    if (!v.ok)
      html2 += `<div class="alert alert-warn" style="margin-bottom:12px"><strong>Preencha os campos obrigatórios para liberar o PDF:</strong><ul style="margin:6px 0 0 18px">${v.faltando.map((f) => `<li>${f}</li>`).join("")}</ul></div>`;
    faltasBox.innerHTML = html2;
  }
  const btn = $("#btnExportarPDF");
  if (btn) btn.disabled = !v.ok;
}
function exportarPdfBT() {
  const v = validacaoObrigatoriosColetivo();
  if (!v.ok) {
    renderPreviaColetivo();
    return;
  }
  // Paridade com o React (app.js:853-872): `coletivo` é a flag runtime
  // disjGeral==="Sim" — verdadeira TAMBÉM no multiTorres (pdf.js imprime a
  // ART por ela).
  gerarPdfDoc({
    multiTorres: MULTI,
    coletivo: coletivoF(),
    // ND-5.2 não calculou: as UCs detalharam as cargas (ND-5.1) e o PDF
    // imprime carga/demanda calculadas por UC.
    modoCalculadora: !MULTI && modoCalculadoraF(),
    atend: state.atend,
    prop: state.prop,
    corr: state.corr,
    obra: state.obra,
    prevTotalKw: prevTotalKwF(),
    demandaPrevTotal: demandaPrevTotalF(),
    trocaDisjGeral: trocaDisjGeralF(),
    hibrido: hibridoF(),
    ucsDet: [],
    ucBlocos: state.ucBlocos,
    blocos: state.blocos,
    totalUcsEmpreendimento: totalUcsEmpreendimentoF(),
    obs: state.obs,
    demandaTotalGeral: demandaTotalGeralF(),
    logoPDF: state.logoPDF,
    pessoaFisica: pessoaFisica(),
  });
}

/* ===== hooks por página (chamados pelo goTo do core) ===== */
window.onPaginaAtiva = function (sec) {
  if (sec.querySelector("#ucsColetivoBox")) renderUcsColetivo();
  if (sec.querySelector("#kpiDemandaAtendimento")) renderCargasColetivo();
  if (sec.querySelector("#blocosBox")) renderBlocos();
  if (sec.querySelector("#unidadesChips")) renderUnidadesTorres();
  if (sec.querySelector("#previaConteudo")) renderPreviaColetivo();
};

/* ===== boot (chamado pelo etapas-loader com o DOM completo) ===== */
window.initFormulario = function () {
  // Título do form-header a partir do card ("Baixa Tensão - <nome do card>";
  // no coletivo/condomínio o subtipo é o NOME do card — a atividade do
  // prefill é só valor inicial das UCs; paridade com app.js:837-842).
  const h1 = $("#formTitulo");
  if (h1)
    h1.textContent = "Baixa Tensão" + (CARD.nome ? " - " + CARD.nome : "");
  btRenumerarEtapas();
  bindInputs();
  montarToggles();
  sincronizarUcBlocos();
  sincronizarBlocos();
  autoSelecionarDisjTorres();
  onReceberEmailBT();
  onProntoLigarBT();
  onEmprGate();
  renderRestricaoAmbiental();
  // Sidebar: navegação livre
  $$(".vstep").forEach((s, i) =>
    s.addEventListener("click", () => goTo(i, true)),
  );
};
