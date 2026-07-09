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

// Pruning do superset: remove as seções/vsteps do fluxo alheio ANTES do
// etapas-loader (este script roda em top-level, antes do DOMContentLoaded) —
// o loader nem busca os fragmentos removidos e o goTo indexa certo.
(function () {
  const fluxo = MULTI ? "condominio" : "coletivo";
  document.querySelectorAll("[data-flow]").forEach((el) => {
    if (el.dataset.flow !== fluxo) el.remove();
  });
})();

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
const _secAberta = {};

/* ===== flags de fluxo (paridade com app.js:67-68) ===== */
const coletivoF = () => state.atend.disjGeral === "Sim";
const hibridoF = () =>
  coletivoF() && !MULTI && state.atend.solicitacao === SOLICITACOES[3];
const trocaDisjGeralF = () =>
  coletivoF() &&
  !MULTI &&
  state.atend.escopo === "Alteração de Carga com alteração do disjuntor geral";
// Concordância dos rótulos: "Torre" é feminino, "Bloco" masculino.
const _fem = () => state.atend.atendA !== "Bloco";
const _unidLower = () => (state.atend.atendA || "Torre").toLowerCase();

/* ===== derivados (portes verbatim dos useMemo de app.js) ===== */
// app.js:241-245
const prevTotalKwF = () =>
  state.ucBlocos.reduce((s, u) => s + (ucSemAlteracao(u) ? 0 : prevKwUC(u)), 0);
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
// app.js:277-280
const demandaResidencialManualInvalidaF = () => {
  const nd52 = nd52InfoF().nd52;
  return (
    !!nd52 &&
    String(state.atend.demandaResidencialManual).trim() !== "" &&
    num(state.atend.demandaResidencialManual) < nd52.demandaKVA
  );
};
// app.js:281-306
function demandaPrevTotalF() {
  const nd52 = nd52InfoF().nd52;
  let demandaResidencial;
  if (nd52) {
    const manual = num(state.atend.demandaResidencialManual);
    const manualValida =
      String(state.atend.demandaResidencialManual).trim() !== "" &&
      manual >= nd52.demandaKVA;
    demandaResidencial = manualValida ? manual : nd52.demandaKVA;
  } else {
    demandaResidencial = state.ucBlocos
      .filter((u) => u.atividade === "Residencial" && !ucSemAlteracao(u))
      .reduce((s, u) => s + num((u.prev || {}).demanda), 0);
  }
  const demandaNaoResidencial = temUCNaoResidencialF()
    ? num(state.atend.demandaNaoResidencial)
    : 0;
  return demandaResidencial + demandaNaoResidencial;
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
const opcoesDisjGeralF = () =>
  disjuntoresGeraisAcima(maiorCorrenteUCF(), demandaPrevTotalF());
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
// app.js:503-521: preset de previsão da UC Residencial pelo disjPara
function aplicarPresetResidencial() {
  state.ucBlocos.forEach((u) => {
    if (u.atividade !== "Residencial") return;
    const preset = PRESET_PREV_RESIDENCIAL_COLETIVO[u.disjPara];
    if (!preset) return;
    const atual = u.prev || {};
    const jaAplicado = Object.keys(preset).every(
      (k) => String(atual[k] == null ? "" : atual[k]) === String(preset[k]),
    );
    if (jaAplicado) return;
    u.prev = Object.assign({}, atual, preset);
  });
}
// app.js:522-535: blocos acompanha atend.nBlocos (aceita valor bruto —
// só redimensiona com número válido, sem apagar torres preenchidas)
function sincronizarBlocos() {
  if (!MULTI) return;
  if (String(state.atend.nBlocos == null ? "" : state.atend.nBlocos).trim() === "")
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
          prev: Object.assign({}, base.prev || {}),
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
// app.js:235-240
function replicarPrevTodas() {
  const base = (state.ucBlocos[0] || {}).prev || {};
  state.ucBlocos.forEach((u, k) => {
    if (k > 0) u.prev = Object.assign({}, base);
  });
  aplicarPresetResidencial();
  renderCargasColetivo();
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
            Object.assign({}, u, { prev: Object.assign({}, u.prev || {}) }),
          ),
        }),
  );
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
// app.js:395-410
function gerarComplementosTorre(bi) {
  const b = state.blocos[bi];
  if (!b) return;
  const lista = gerarComplementos(
    b.complInicial,
    (b.ucs || []).length,
    b.aptosPorAndar,
  );
  if (!lista) return;
  (b.ucs || []).forEach((u, k) => (u.complemento = lista[k]));
  renderTorreAccs(bi);
}
// app.js:437-449
function replicarPrevTorre(bi) {
  const b = state.blocos[bi];
  if (!b) return;
  const base = ((b.ucs || [])[0] || {}).prev || {};
  (b.ucs || []).forEach((u, k) => {
    if (k > 0) u.prev = Object.assign({}, base);
  });
  autoSelecionarDisjTorres();
  renderTorreAccs(bi);
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
          prev: Object.assign({}, base.prev || {}),
          identificacao: `UC ${k + 1}`,
          complemento: u.complemento,
          instalacao: u.instalacao,
          unidadeConsumidora: u.unidadeConsumidora,
        }),
  );
  autoSelecionarDisjTorres();
  renderTorreAccs(bi);
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
      _ucAberta[ui] = !aberta;
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
          _inp(u.area, (v) => (u.area = v), {
            type: "number",
            placeholder: "Ex: 65",
          }),
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
            },
            true,
          ),
          "field--float",
        ),
      );
      corpo.appendChild(grid);
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
   Etapa Previsão de Carga do coletivo (renderCargasColetivo —
   porte de views/cargas-coletivo.js). Tabela com update
   IN-PLACE das células calculadas (não perde o foco).
   ============================================================ */
function onPrev(ui, k, v) {
  const u = state.ucBlocos[ui];
  if (!u) return;
  u.prev = u.prev || {};
  u.prev[k] = v;
  atualizarCargasColetivo();
}
function renderCargasColetivo() {
  const box = $("#prevTableBox");
  if (!box) return;
  sincronizarUcBlocos();
  aplicarPresetResidencial();
  const toolbar = $("#prevToolbar");
  if (toolbar)
    toolbar.style.display = state.ucBlocos.length > 1 ? "" : "none";
  const table = document.createElement("table");
  table.className = "prev-table";
  table.innerHTML =
    '<thead><tr><th>Unidade</th><th>Ilum. (kW)</th><th>Tomada (kW)</th><th>Chuveiro (kW)</th><th>Ar Cond. (kW)</th><th>Outros (kW)</th><th>Carga (kW)</th><th class="col-demanda">Demanda (kVA) *</th></tr></thead>';
  const tbody = document.createElement("tbody");
  state.ucBlocos.forEach((u, ui) => {
    const tr = document.createElement("tr");
    const tdNome = document.createElement("td");
    tdNome.className = "uc-name";
    tdNome.textContent = u.identificacao || `UC ${ui + 1}`;
    tr.appendChild(tdNome);
    if (ucSemAlteracao(u)) {
      const td = document.createElement("td");
      td.colSpan = 7;
      td.className = "field-hint";
      td.textContent =
        "Caixa existente sem alteração — não entra na previsão de carga.";
      tr.appendChild(td);
    } else {
      ["ilum", "tomada", "chuveiro", "ar", "outros"].forEach((k) => {
        const td = document.createElement("td");
        const inp = document.createElement("input");
        inp.type = "number";
        inp.placeholder = "0,0";
        inp.value = (u.prev || {})[k] || "";
        inp.addEventListener("input", () => onPrev(ui, k, inp.value));
        td.appendChild(inp);
        tr.appendChild(td);
      });
      const tdCarga = document.createElement("td");
      tdCarga.className = "carga-cell";
      tdCarga.dataset.prevCarga = String(ui);
      tr.appendChild(tdCarga);
      const tdDem = document.createElement("td");
      tdDem.className = "col-demanda";
      const inpDem = document.createElement("input");
      inpDem.className = "demanda-prev";
      inpDem.type = "number";
      inpDem.placeholder = "0,0";
      inpDem.value = (u.prev || {}).demanda || "";
      inpDem.addEventListener("input", () =>
        onPrev(ui, "demanda", inpDem.value),
      );
      tdDem.appendChild(inpDem);
      tr.appendChild(tdDem);
    }
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  const tfoot = document.createElement("tfoot");
  tfoot.innerHTML =
    '<tr><td class="uc-name">Total</td><td colspan="5"></td><td class="carga-cell" id="prevTotKw"></td><td class="col-demanda total-dem" id="prevTotDem"></td></tr>';
  table.appendChild(tfoot);
  box.innerHTML = "";
  box.appendChild(table);
  atualizarCargasColetivo();
}
// Atualiza SÓ o que é calculado (células, KPIs, alertas, disjuntor geral).
function atualizarCargasColetivo() {
  const info = nd52InfoF();
  const dem = demandaPrevTotalF();
  $$("[data-prev-carga]").forEach((td) => {
    const u = state.ucBlocos[+td.dataset.prevCarga];
    if (u) td.textContent = fmt2(prevKwUC(u));
  });
  const totKw = $("#prevTotKw");
  if (totKw) totKw.textContent = fmt2(prevTotalKwF());
  const totDem = $("#prevTotDem");
  if (totDem) totDem.textContent = fmt2(dem);
  const kKw = $("#kpiPrevKw");
  if (kKw) kKw.textContent = fmt2(prevTotalKwF());
  const kDem = $("#kpiDemandaAtendimento");
  if (kDem) kDem.textContent = fmt2(demandaTotalGeralF());
  // Alertas ND-5.2
  const alertas = $("#nd52Alertas");
  if (alertas) {
    let html = "";
    if (info.quantidadeApartamentos > 0 && info.nd52) {
      html = `<div class="alert alert-ok" style="margin-bottom:14px"><b>Demanda dos apartamentos residenciais (ND-5.2):</b> ${info.quantidadeApartamentos} apartamento(s) · área média ponderada ${fmt2(info.areaMediaPonderada)} m² · Fator F ${fmt2(info.nd52.fatorF)} · A ${fmt2(info.nd52.demandaAreaA)} → D = ${fmt2(info.nd52.demandaKVA)} kVA (incluída automaticamente na demanda total abaixo).</div>`;
    } else if (info.quantidadeApartamentos > 0 && !info.nd52) {
      html =
        info.quantidadeApartamentos < 4
          ? `<div class="alert alert-info" style="margin-bottom:14px">ND-5.2 exige no mínimo 4 apartamentos para o cálculo automático (atualmente ${info.quantidadeApartamentos}). Informe a demanda manualmente para as UCs residenciais abaixo.</div>`
          : `<div class="alert alert-warn" style="margin-bottom:14px">Área média ponderada inválida ou superior a 1000 m² (${fmt2(info.areaMediaPonderada)} m²). Confira a área de cada apartamento ou informe a demanda manualmente.</div>`;
    }
    alertas.innerHTML = html;
  }
  // Demanda residencial manual (só quando o ND-5.2 calcula)
  const manualBox = $("#demandaManualBox");
  if (manualBox) {
    manualBox.style.display = info.nd52 ? "" : "none";
    const hint = $("#demandaManualHint");
    if (hint && info.nd52)
      hint.textContent = `Substitui o valor calculado pelo ND-5.2 acima, se informado. Não pode ser menor que ${fmt2(info.nd52.demandaKVA)} kVA.`;
    const inp = manualBox.querySelector("input");
    if (inp && info.nd52) inp.placeholder = fmt2(info.nd52.demandaKVA);
  }
  const inval = $("#demandaManualInvalida");
  if (inval)
    inval.innerHTML = demandaResidencialManualInvalidaF()
      ? `<div class="alert alert-warn" style="margin-bottom:14px">⚠ A demanda residencial manual (${fmt2(num(state.atend.demandaResidencialManual))} kVA) é menor que a calculada pelo ND-5.2 (${fmt2(info.nd52.demandaKVA)} kVA) e não pode ser usada — corrija ou deixe em branco para usar o valor calculado.</div>`
      : "";
  const naoResBox = $("#demandaNaoResBox");
  if (naoResBox)
    naoResBox.style.display = temUCNaoResidencialF() ? "" : "none";
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
      const fAtual = _campo("Disjuntor geral existente", selAtual, "field--float");
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
   Etapa Torres/Blocos do condomínio (renderBlocos — porte de
   views/blocos.js decomposto por torre)
   ============================================================ */
function onNBlocos(el) {
  state.atend.nBlocos = el.value;
  sincronizarBlocos();
  autoSelecionarDisjTorres();
  renderBlocos();
}
function onPrevTorre(bi, ui, k, v) {
  const u = ((state.blocos[bi] || {}).ucs || [])[ui];
  if (!u) return;
  u.prev = u.prev || {};
  u.prev[k] = v;
  atualizarTorreCalc(bi);
}
function atualizarBlocosKpis() {
  const kTot = $("#kpiTotalUcs");
  if (kTot) kTot.textContent = String(totalUcsEmpreendimentoF());
  const kDem = $("#kpiDemandaTotal");
  if (kDem) kDem.textContent = fmt2(demandaTotalGeralF());
  const aviso = $("#aviso304Blocos");
  if (aviso) aviso.style.display = demandaTotalGeralF() > 304 ? "" : "none";
}
// Recalcula os pedaços derivados de UMA torre sem re-renderizar os inputs.
function atualizarTorreCalc(bi) {
  const b = state.blocos[bi];
  if (!b) return;
  autoSelecionarDisjTorres();
  const calcTorre = calcBlocoMultiTorres(b);
  const demandaTorre = calcTorre.demandaUcs + num(b.demandaIncendio);
  const head = $(`[data-torre-head="${bi}"]`);
  if (head)
    head.textContent = `${fmt2(demandaTorre)} kVA · ${(b.ucs || []).length} UC(s)`;
  const nd52Box = $(`#torreNd52-${bi}`);
  if (nd52Box)
    nd52Box.innerHTML = calcTorre.nd52
      ? `<div class="alert alert-ok" style="margin-top:6px"><b>Demanda residencial (ND-5.2) dest${_fem() ? "a" : "e"} ${_unidLower()}:</b> ${calcTorre.qtdApart} apartamento(s) · área média ${fmt2(calcTorre.areaMedia)} m² → ${fmt2(calcTorre.nd52.demandaKVA)} kVA.</div>`
      : "";
  $$(`[data-tprev-carga^="${bi}-"]`).forEach((td) => {
    const ui = +td.dataset.tprevCarga.split("-")[1];
    const u = (b.ucs || [])[ui];
    if (u) td.textContent = fmt2(prevKwUC(u));
  });
  const totKw = $(`#torreTotKw-${bi}`);
  if (totKw)
    totKw.textContent = fmt2((b.ucs || []).reduce((s, u) => s + prevKwUC(u), 0));
  const totDem = $(`#torreTotDem-${bi}`);
  if (totDem) totDem.textContent = fmt2(calcTorre.demandaUcs);
  renderTorreResultado(bi);
  atualizarBlocosKpis();
}
function renderTorreResultado(bi) {
  const box = $(`#torreResultado-${bi}`);
  const b = state.blocos[bi];
  if (!box || !b) return;
  const calcTorre = calcBlocoMultiTorres(b);
  const demandaTorre = calcTorre.demandaUcs + num(b.demandaIncendio);
  const opcoesDG = opcoesDisjGeralTorre(b);
  const opcoesDI = opcoesDisjIncendioTorre(b);
  const dArt = _fem() ? "da" : "do";
  box.innerHTML = "";
  const kpis = document.createElement("div");
  kpis.className = "resultado-kpis";
  kpis.innerHTML =
    `<div class="resultado-card"><div class="resultado-card-label">Demanda das UCs</div><div class="resultado-card-valor">${fmt2(calcTorre.demandaUcs)} kVA</div></div>` +
    `<div class="resultado-card"><div class="resultado-card-label">Demanda total ${dArt} ${_unidLower()} (com condomínio/incêndio)</div><div class="resultado-card-valor">${fmt2(demandaTorre)} kVA</div></div>`;
  box.appendChild(kpis);
  const mkDisj = (label, opcoes, valor, aoEscolher, hintVazio) => {
    const card = document.createElement("div");
    card.className = "resultado-card resultado-disjuntor";
    card.innerHTML = `<div class="resultado-card-label">${label}</div>`;
    if (opcoes.length) {
      const tg = document.createElement("div");
      tg.className = "toggle-group";
      opcoes.forEach((dj) => {
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className =
          "toggle-btn" + ((valor || opcoes[0]) === dj ? " on" : "");
        btn.textContent = dj;
        btn.addEventListener("click", () => {
          aoEscolher(dj);
          renderTorreResultado(bi);
        });
        tg.appendChild(btn);
      });
      card.appendChild(tg);
    } else {
      const hint = document.createElement("div");
      hint.className = "field-hint";
      hint.textContent = hintVazio;
      card.appendChild(hint);
    }
    return card;
  };
  box.appendChild(
    mkDisj(
      "Disjuntor Geral adequado de acordo com a Demanda das UCs",
      opcoesDG,
      b.disjGeral,
      (v) => (b.disjGeral = v),
      "Informe os disjuntores e a previsão de carga das UCs para ver o disjuntor geral adequado.",
    ),
  );
  box.appendChild(
    mkDisj(
      "Disjuntor do Condomínio / Combate a Incêndio adequado à demanda",
      opcoesDI,
      b.disjIncendio,
      (v) => (b.disjIncendio = v),
      "Informe a Demanda Condomínio / Incêndio (kVA) para ver o disjuntor adequado.",
    ),
  );
}
// Acordeões de Identificação e Previsão de carga da torre (re-renderizados
// juntos quando a estrutura muda: qtd de UCs, solicitação, atividade).
function renderTorreAccs(bi) {
  const box = $(`#torreAccs-${bi}`);
  const b = state.blocos[bi];
  if (!box || !b) return;
  const ucs = b.ucs || [];
  box.innerHTML = "";
  const genRow = $(`#torreGen-${bi}`);
  if (genRow) genRow.style.display = ucs.length > 1 ? "flex" : "none";
  const mkAcc = (chave, label, corpoFn, rodapeBtn) => {
    const aberta = !!_secAberta[`${bi}-${chave}`];
    const acc = document.createElement("div");
    acc.className = "carga-acc" + (aberta ? " is-open" : "");
    acc.style.marginTop = "14px";
    const head = document.createElement("button");
    head.type = "button";
    head.className = "carga-acc-head";
    head.setAttribute("aria-expanded", aberta ? "true" : "false");
    head.innerHTML =
      `<span class="carga-acc-label">${label}</span>` +
      `<span class="carga-acc-meta"><span class="carga-acc-badge">${ucs.length}</span><span class="carga-acc-chevron" aria-hidden="true"></span></span>`;
    head.addEventListener("click", () => {
      _secAberta[`${bi}-${chave}`] = !aberta;
      renderTorreAccs(bi);
    });
    acc.appendChild(head);
    if (aberta) {
      const body = document.createElement("div");
      body.className = "carga-acc-body";
      corpoFn(body);
      if (ucs.length > 1 && rodapeBtn) {
        const add = document.createElement("div");
        add.className = "motores-add";
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "btn btn-ghost";
        btn.textContent = rodapeBtn.label;
        btn.addEventListener("click", rodapeBtn.onClick);
        add.appendChild(btn);
        body.appendChild(add);
      }
      acc.appendChild(body);
    }
    return acc;
  };
  // ── Identificação das UCs (tabela em 2 linhas por UC) ──
  if (ucs.length > 0)
    box.appendChild(
      mkAcc(
        "ident",
        "Identificação das UCs",
        (body) => {
          const table = document.createElement("table");
          table.className = "motores-table uc-ident-table";
          const tbody = document.createElement("tbody");
          ucs.forEach((u, ui) => {
            const residencial = u.atividade === "Residencial";
            const conexaoNova = u.solicitacao === "Conexão Nova";
            const cel = (rotulo, controle, colSpan) => {
              const td = document.createElement("td");
              if (colSpan) td.colSpan = colSpan;
              const lbl = document.createElement("span");
              lbl.className = "cell-label";
              lbl.textContent = rotulo;
              td.append(lbl, controle);
              return td;
            };
            const tr1 = document.createElement("tr");
            tr1.className = "uc-linha-1";
            tr1.appendChild(
              cel(
                "Unidade",
                _inp(u.identificacao, (v) => (u.identificacao = v), {
                  placeholder: `UC ${ui + 1}`,
                }),
              ),
            );
            tr1.appendChild(
              cel(
                "Complemento",
                _inp(u.complemento, (v) => (u.complemento = v), {
                  placeholder: "101",
                }),
              ),
            );
            tr1.appendChild(
              cel(
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
                    renderTorreAccs(bi);
                    atualizarTorreCalc(bi);
                  },
                ),
              ),
            );
            tr1.appendChild(
              cel(
                "Atividade",
                _selectDe(
                  ["Residencial", "Comercial", "Industrial", "Rural"],
                  u.atividade,
                  (v) => {
                    u.atividade = v;
                    renderTorreAccs(bi);
                    renderTorreCampos(bi);
                    atualizarTorreCalc(bi);
                  },
                  true,
                ),
              ),
            );
            tbody.appendChild(tr1);
            const tr2 = document.createElement("tr");
            tr2.className = "uc-linha-2";
            const defs2 = [
              [
                "Disjuntor da UC",
                _selectDe(
                  DISJ.map((d) => d.fx),
                  u.disjPara,
                  (v) => {
                    u.disjPara = v;
                    atualizarTorreCalc(bi);
                  },
                  true,
                ),
              ],
              residencial
                ? [
                    "Área (m²)",
                    _inp(u.area, (v) => {
                      u.area = v;
                      atualizarTorreCalc(bi);
                    }, { type: "number", placeholder: "Ex: 65" }),
                  ]
                : [
                    "Ramo de atividade",
                    _inp(u.ramo, (v) => (u.ramo = v), {
                      placeholder: "Obrigatório",
                    }),
                  ],
            ];
            if (!conexaoNova) {
              defs2.push(
                [
                  "Instalação",
                  _inp(u.instalacao, (v) => (u.instalacao = v), {
                    placeholder: "Nº instalação",
                  }),
                ],
                ["Nº UC", _inp(u.unidadeConsumidora, (v) => (u.unidadeConsumidora = v))],
              );
            }
            defs2.forEach(([rotulo, controle], i) => {
              tr2.appendChild(
                cel(
                  rotulo,
                  controle,
                  i === defs2.length - 1 ? 4 - defs2.length + 1 : 0,
                ),
              );
            });
            tbody.appendChild(tr2);
          });
          table.appendChild(tbody);
          body.appendChild(table);
        },
        {
          label: "⧉ Replicar UC 1 para todas",
          onClick: () => replicarUC1Torre(bi),
        },
      ),
    );
  // ── Previsão de carga das UCs (tabela por torre) ──
  if (ucs.length > 0)
    box.appendChild(
      mkAcc(
        "prev",
        "Previsão de carga das UCs",
        (body) => {
          const wrap = document.createElement("div");
          wrap.className = "prev-table-wrap";
          const table = document.createElement("table");
          table.className = "prev-table";
          table.innerHTML =
            '<thead><tr><th>Unidade</th><th>Ilum. (kW)</th><th>Tomada (kW)</th><th>Chuveiro (kW)</th><th>Ar Cond. (kW)</th><th>Outros (kW)</th><th>Carga (kW)</th><th class="col-demanda">Demanda (kVA)</th></tr></thead>';
          const tbody = document.createElement("tbody");
          ucs.forEach((u, ui) => {
            const tr = document.createElement("tr");
            const tdNome = document.createElement("td");
            tdNome.className = "uc-name";
            tdNome.textContent = u.identificacao || `UC ${ui + 1}`;
            tr.appendChild(tdNome);
            if (ucSemAlteracao(u)) {
              const td = document.createElement("td");
              td.colSpan = 7;
              td.className = "field-hint";
              td.textContent =
                "Caixa existente sem alteração — não entra na previsão de carga.";
              tr.appendChild(td);
            } else {
              ["ilum", "tomada", "chuveiro", "ar", "outros"].forEach((k) => {
                const td = document.createElement("td");
                const inp = document.createElement("input");
                inp.type = "number";
                inp.placeholder = "0,0";
                inp.value = (u.prev || {})[k] || "";
                inp.addEventListener("input", () =>
                  onPrevTorre(bi, ui, k, inp.value),
                );
                td.appendChild(inp);
                tr.appendChild(td);
              });
              const tdCarga = document.createElement("td");
              tdCarga.className = "carga-cell";
              tdCarga.dataset.tprevCarga = `${bi}-${ui}`;
              tr.appendChild(tdCarga);
              const tdDem = document.createElement("td");
              tdDem.className = "col-demanda";
              const inpDem = document.createElement("input");
              inpDem.className = "demanda-prev";
              inpDem.type = "number";
              inpDem.placeholder = "0,0";
              inpDem.value = (u.prev || {}).demanda || "";
              inpDem.addEventListener("input", () =>
                onPrevTorre(bi, ui, "demanda", inpDem.value),
              );
              tdDem.appendChild(inpDem);
              tr.appendChild(tdDem);
            }
            tbody.appendChild(tr);
          });
          table.appendChild(tbody);
          const dArt = _fem() ? "da" : "do";
          const tfoot = document.createElement("tfoot");
          tfoot.innerHTML = `<tr><td class="uc-name">Total ${dArt} ${_unidLower()}</td><td colspan="5"></td><td class="carga-cell" id="torreTotKw-${bi}"></td><td class="col-demanda total-dem" id="torreTotDem-${bi}"></td></tr>`;
          table.appendChild(tfoot);
          wrap.appendChild(table);
          body.appendChild(wrap);
        },
        {
          label: "Replicar previsão da UC 1 para todas",
          onClick: () => replicarPrevTorre(bi),
        },
      ),
    );
  atualizarTorreCalc(bi);
}
// Campos do topo da torre (re-render quando temNaoResidencial muda)
function renderTorreCampos(bi) {
  const box = $(`#torreCampos-${bi}`);
  const b = state.blocos[bi];
  if (!box || !b) return;
  const calcTorre = calcBlocoMultiTorres(b);
  const dArt = _fem() ? "da" : "do";
  box.innerHTML = "";
  {
    const f = _campo(
      `Identificação ${dArt} ${_unidLower()}`,
      _inp(b.nome, (v) => {
        b.nome = v;
        const tit = $(`[data-torre-titulo="${bi}"]`);
        if (tit) tit.textContent = `${state.atend.atendA} ${b.nome || bi + 1}`;
      }, { placeholder: `${bi + 1}` }),
    );
    box.appendChild(f);
  }
  {
    const f = _campo(
      `Qtd. de UCs ${dArt} ${_unidLower()}`,
      _inp(b.qtdUCs, (v) => {
        sincronizarUCsTorre(bi, v);
        renderTorreAccs(bi);
      }, { type: "number", placeholder: "0" }),
    );
    f.setAttribute("data-noopt", "");
    box.appendChild(f);
  }
  {
    const f = _campo(
      "Demanda Condomínio / Incêndio (kVA)",
      _inp(b.demandaIncendio, (v) => {
        b.demandaIncendio = v;
        atualizarTorreCalc(bi);
      }, { type: "number", placeholder: "0" }),
    );
    box.appendChild(f);
  }
  if (calcTorre.temNaoResidencial) {
    const f = _campo(
      "Demanda geral não residencial (kVA)",
      _inp(b.demandaNaoResidencial, (v) => {
        b.demandaNaoResidencial = v;
        atualizarTorreCalc(bi);
      }, { type: "number", placeholder: "0,0" }),
    );
    f.setAttribute("data-noopt", "");
    box.appendChild(f);
  }
}
function renderBlocos() {
  const box = $("#blocosBox");
  if (!box) return;
  sincronizarBlocos();
  autoSelecionarDisjTorres();
  const fem = _fem();
  const dArt = fem ? "da" : "do";
  const sub = $("#blocosSub");
  if (sub)
    sub.textContent = `Cada ${_unidLower()} tem seu disjuntor geral — sugerido a partir da demanda calculada — e seu disjuntor de combate a incêndio. Preencha ${fem ? "a primeira" : "o primeiro"} e use "Replicar" para preenchimento em massa.`;
  const kAtendA = $("#kpiAtendA");
  if (kAtendA) kAtendA.textContent = state.atend.atendA;
  const lblN = $("#nBlocosLabel");
  if (lblN)
    lblN.textContent = `Nº de ${state.atend.atendA === "Bloco" ? "Blocos" : "Torres"}`;
  const btnRep = $("#btnReplicarTorre1");
  if (btnRep)
    btnRep.textContent = `⧉ Replicar ${state.atend.atendA} 1 para ${fem ? "todas" : "todos"}`;
  box.innerHTML = "";
  state.blocos.forEach((b, bi) => {
    const aberta = _torreAberta[bi] === true;
    const bloco = document.createElement("div");
    bloco.className = "uc-colapsavel" + (aberta ? " is-open" : "");
    const head = document.createElement("button");
    head.type = "button";
    head.className = "uc-colapsavel-head";
    head.setAttribute("aria-expanded", aberta ? "true" : "false");
    head.innerHTML =
      `<span class="uc-head-info"><span class="uc-colapsavel-titulo" data-torre-titulo="${bi}">${state.atend.atendA} ${b.nome || bi + 1}</span>` +
      `<span class="uc-head-endereco-label">Demanda</span><span class="uc-head-endereco" data-torre-head="${bi}"></span>` +
      `</span><span class="carga-acc-chevron uc-colapsavel-chevron" aria-hidden="true"></span>`;
    head.addEventListener("click", () => {
      _torreAberta[bi] = !aberta;
      renderBlocos();
    });
    bloco.appendChild(head);
    if (aberta) {
      const corpo = document.createElement("div");
      corpo.className = "uc-colapsavel-corpo";
      const grid = document.createElement("div");
      grid.className = "grid grid-2";
      grid.id = `torreCampos-${bi}`;
      corpo.appendChild(grid);
      // Geração automática de complementos (2+ UCs)
      const gen = document.createElement("div");
      gen.id = `torreGen-${bi}`;
      gen.style.cssText =
        "display:flex;gap:10px;align-items:flex-end;flex-wrap:wrap;margin-top:10px";
      {
        const fAndar = _campo(
          "Aptos por andar",
          _inp(b.aptosPorAndar, (v) => (b.aptosPorAndar = v), {
            type: "number",
            placeholder: "Ex: 4",
          }),
        );
        fAndar.querySelector("input").parentElement.style.maxWidth = "";
        gen.appendChild(fAndar);
        let btnGerar;
        const fCompl = _campo(
          "Primeiro complemento",
          _inp(b.complInicial, (v) => {
            b.complInicial = v;
            if (btnGerar) btnGerar.disabled = !/\d/.test(String(v || ""));
          }, { placeholder: "Ex: 101 ou Apto 01" }),
        );
        gen.appendChild(fCompl);
        btnGerar = document.createElement("button");
        btnGerar.type = "button";
        btnGerar.className = "btn btn-ghost";
        btnGerar.disabled = !/\d/.test(String(b.complInicial || ""));
        btnGerar.textContent = `⧉ Gerar complementos das ${(b.ucs || []).length} UCs`;
        btnGerar.addEventListener("click", () => gerarComplementosTorre(bi));
        gen.appendChild(btnGerar);
      }
      corpo.appendChild(gen);
      const nd52Box = document.createElement("div");
      nd52Box.id = `torreNd52-${bi}`;
      corpo.appendChild(nd52Box);
      const accs = document.createElement("div");
      accs.id = `torreAccs-${bi}`;
      corpo.appendChild(accs);
      const resultado = document.createElement("div");
      resultado.className = "resultado-cargas divider";
      resultado.id = `torreResultado-${bi}`;
      corpo.appendChild(resultado);
      bloco.appendChild(corpo);
    }
    box.appendChild(bloco);
  });
  // Preenche campos/accs/resultados das torres abertas + heads/KPIs
  state.blocos.forEach((b, bi) => {
    if (_torreAberta[bi] === true) {
      renderTorreCampos(bi);
      renderTorreAccs(bi);
    } else {
      atualizarTorreCalc(bi);
    }
  });
  atualizarBlocosKpis();
  if (window.CemigMarcadores) {
    CemigMarcadores.aplicar(box);
    CemigMarcadores.atualizarAvancar();
  }
}

/* ============================================================
   Prévia & PDF (porte dos ramos coletivo/multi de
   views/revisar.js + validacaoObrigatorios de app.js:750-823)
   ============================================================ */
// Índices das etapas para os lápis (após o pruning): coletivo tem 8 páginas,
// condomínio 7 — tipo=1, corr=2, empr=3 e o miolo varia.
const PG = MULTI
  ? { tipo: 1, corr: 2, empr: 3, blocos: 4 }
  : { tipo: 1, corr: 2, empr: 3, ucs: 4, cargas: 5 };
function validacaoObrigatoriosColetivo() {
  const faltando = [];
  const req = (v, label) => {
    if (!String(v == null ? "" : v).trim()) faltando.push(label);
  };
  const p = state.prop,
    c = state.corr,
    o = state.obra;
  req(p.nome, pessoaFisica() ? "Nome completo do proprietário" : "Razão social");
  req(p.cpfCnpj, "CPF/CNPJ");
  req(p.email, "E-mail");
  req(p.celular, "Celular");
  if (c.receberEmail === "Não") {
    if (c.alternativa === "Outro e-mail")
      req(c.outroEmail, "E-mail alternativo da fatura");
    else if (c.alternativa === "Endereço novo") {
      req(c.cep, "CEP de correspondência");
      req(c.rua, "Rua/Av. de correspondência");
      req(c.num, "Nº de correspondência");
      req(c.bairro, "Bairro de correspondência");
      req(c.municipio, "Município de correspondência");
    }
  }
  req(o.endereco, "Endereço da obra");
  req(o.num, "Nº da obra");
  req(o.bairro, "Bairro da obra");
  req(o.cidade, "Cidade da obra");
  req(o.cep, "CEP da obra");
  req(o.art, "Nº ART/TRT de Projeto");
  if (!(demandaTotalGeralF() > 0))
    faltando.push("Previsão de carga / demanda das UCs");
  if (!MULTI && temUCNaoResidencialF())
    req(state.atend.demandaNaoResidencial, "Demanda geral não residencial (kVA)");
  if (MULTI)
    state.blocos.forEach((b, bi) => {
      if (
        calcBlocoMultiTorres(b).temNaoResidencial &&
        !String(b.demandaNaoResidencial || "").trim()
      )
        faltando.push(
          `Demanda geral não residencial — ${state.atend.atendA} ${b.nome || bi + 1} (kVA)`,
        );
    });
  if (demandaResidencialManualInvalidaF())
    faltando.push(
      "Demanda residencial manual não pode ser menor que a calculada (ND-5.2)",
    );
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
    c.receberEmail === "Não"
      ? c.alternativa === "Outro e-mail"
        ? c.outroEmail
        : c.alternativa
      : p.email;
  const modalidadeTexto = MULTI
    ? `Múltiplas Torres/Blocos · ${state.blocos.length} ${(state.atend.atendA || "").toLowerCase()}(s)`
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
      html += `<div class="preview-item" style="display:flex;justify-content:space-between"><span class="v">${state.atend.atendA} ${b.nome || bi + 1} · ${b.qtdUCs || 0} UCs · Geral: ${b.disjGeral || "—"} · Incêndio: ${b.disjIncendio || "—"}</span><span style="color:var(--verde);font-weight:700">${fmt2(demanda)} kVA</span></div>`;
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
  if (sec.querySelector("#prevTableBox")) renderCargasColetivo();
  if (sec.querySelector("#blocosBox")) renderBlocos();
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
  onContaGlobalBT();
  onProntoLigarBT();
  onEmprGate();
  renderRestricaoAmbiental();
  // Sidebar: navegação livre
  $$(".vstep").forEach((s, i) =>
    s.addEventListener("click", () => goTo(i, true)),
  );
};
