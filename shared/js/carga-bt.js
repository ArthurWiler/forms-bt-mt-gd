/* ============================================================
   CEMIG — Formulário de Carga (acordeões, Figma) — ilha compartilhada
   ------------------------------------------------------------
   Extraído de bt/js/bt-core.js para ser reaproveitado fora do BT
   (microgeração usa a MESMA seção de cargas). A matemática continua
   vindo de calcDemandaResultados (shared/js/calc-demanda.js).

   Usada hoje por:
     • BT individual (sempre) e coletivo/múltiplas torres (quando o
       ND-5.2 não calcula) — via o wrapper montarCargasBT do bt-core;
     • Microgeração — via montarCargaAcordeao direto.

   Requer: shared/js/load-form-data.js (CAT, TABELA_11, MOTOR_MONO,
   MOTOR_TRI), shared/js/calc.js (fmt2, fmtW) e
   shared/js/calc-demanda.js (calcDemandaResultados).
   ============================================================ */
const _REFRI = new Set([
  "Geladeira comum",
  "Geladeira duplex",
  "Freezer vertical",
  "Freezer horiz. médio",
  "Freezer horiz. grande",
  "Adega climatizada",
]);
const _ehRefri = (c) => c.g === "b5" && _REFRI.has(c.n);
const CARGA_CATS_BT = [
  { id: "il", label: "Iluminação e tomada", match: (c) => c.g === "il" },
  {
    id: "b1",
    label: "Chuveiro, torneira e cafeteira",
    match: (c) => c.g === "b1",
  },
  { id: "b2", label: "Aquecedor de água", match: (c) => c.g === "b2" },
  { id: "b3", label: "Forno, fogão e grill", match: (c) => c.g === "b3" },
  {
    id: "b4",
    label: "Lavadoras, secadores e ferro",
    match: (c) => c.g === "b4",
  },
  { id: "refri", label: "Refrigeração", match: _ehRefri },
  { id: "c", label: "Ar condicionado", match: (c) => c.g === "c" },
  {
    id: "demais",
    label: "Demais aparelhos",
    match: (c) => (c.g === "b5" && !_ehRefri(c)) || c.g === "f",
  },
];
// Grupos de equipamentos prioritários por categoria não-residencial
// (índice da TABELA_11 → ids de CARGA_CATS_BT). Só reordena; nada é ocultado.
const PRIORIDADE_ACC_NR = {
  0: ["demais", "c", "il"], // Oficina, indústrias
  1: ["b2", "b1", "c", "refri", "b4"], // Hotéis
  2: ["c", "il", "demais"], // Auditórios, cinemas
  3: ["c", "il", "demais"], // Bancos
  4: ["demais", "b1", "c"], // Barbearia, salões
  5: ["c", "refri", "b3", "b1"], // Clubes
  6: ["il", "c", "refri", "demais"], // Escolas
  7: ["c", "il", "demais", "refri"], // Escritórios, lojas
  8: ["il", "demais"], // Garagens
  9: ["demais", "c", "b2", "il"], // Clínicas, hospitais (raio X em "demais")
  10: ["c", "il"], // Igrejas, templos
  11: ["b3", "refri", "b1", "c"], // Restaurantes, bares
  12: ["il", "c", "b4"], // Áreas comuns e condomínios
  13: ["b3", "refri", "c", "il"], // Salão de festas
};

// Acordeões exclusivos: abrir um item fecha o que estava aberto no mesmo mapa.
// (Mesma semântica do btToggleExclusivo do bt-core — replicada aqui para a
// ilha não depender do core do BT.)
function _cargaToggleExclusivo(mapa, chave, abrir) {
  Object.keys(mapa).forEach((k) => (mapa[k] = false));
  mapa[chave] = abrir;
}

/* ------------------------------------------------------------
   montarCargaAcordeao(container, cfg)
     cfg.data        objeto de cargas ({qtds,tipoA,catA,mots,...})
     cfg.abertos     mapa de acordeões abertos (persistido pelo dono)
     cfg.redeMono    () => bool (mono/bifásica → lista de disjuntores)
     cfg.atividade   () => "Residencial" | "Comercial" | "Industrial" | ""
     cfg.aoMudar     () => void, chamado a cada alteração
   Retorna { atualizar } — re-renderiza quando a atividade muda por fora.
   ------------------------------------------------------------ */
function montarCargaAcordeao(container, cfg) {
  const opt = (v) => (typeof v === "function" ? v() : v);
  // Trabalha SOBRE o objeto do dono (não uma cópia): quem chama guarda a
  // referência (u.cargas no BT, state.cargas no GD) e espera ver
  // _demanda/_cargaKw/_disjuntores aparecerem nela a cada alteração.
  const d = cfg.data || {};
  if (d.tipoA == null) d.tipoA = "";
  if (d.catA === undefined) d.catA = null;
  d.qtds = CAT.map((_, i) => (d.qtds || [])[i] || 0);
  d.mots = d.mots || [];
  let busca = "";
  const abertos = cfg.abertos || {};
  function notificar() {
    const r = calcDemandaResultados(d, opt(cfg.redeMono));
    d._demanda = r.demandaTotal;
    d._cargaKw = r.cargaInstalada;
    d._disjuntores = r.disjuntores.map((x) => x.fx);
    if (cfg.aoMudar) cfg.aoMudar(d);
    if (window.CemigMarcadores) CemigMarcadores.atualizarAvancar();
    return r;
  }
  // Tipo de carga sempre derivado da atividade (Residencial → res; Com/Ind → nr)
  function aplicarAtividade() {
    const a = opt(cfg.atividade) || "";
    if (a === "Residencial") d.tipoA = "res";
    else if (a === "Comercial" || a === "Industrial") d.tipoA = "nr";
    else d.tipoA = "";
  }
  function _hint(txt) {
    const hint = document.createElement("div");
    hint.className = "field-hint";
    hint.style.marginTop = "10px";
    hint.textContent = txt;
    return hint;
  }
  function render() {
    aplicarAtividade();
    notificar();
    container.innerHTML = "";
    if (!d.tipoA) {
      // O hint só faz sentido quando o campo de atividade está em OUTRA etapa
      // (BT). Onde ele fica logo acima da lista (microGD), seria redundante:
      // cfg.hintAtividade = false suprime.
      if (cfg.hintAtividade !== false)
        container.appendChild(
          _hint(
            "Selecione a atividade principal para detalhar os equipamentos.",
          ),
        );
      return;
    }
    // Não-residencial: o usuário escolhe a categoria (Tabela 11); a lista de
    // equipamentos só aparece (priorizada) depois da escolha.
    if (d.tipoA === "nr") {
      container.appendChild(_fieldCategoria());
      if (d.catA == null) {
        container.appendChild(
          _hint(
            "Selecione a categoria de atividade para detalhar os equipamentos.",
          ),
        );
        return;
      }
    }
    container.appendChild(_busca());
    container.appendChild(_accList());
  }
  // Campo no padrão do design system: .field simples com <label> + <select>
  // como filho DIRETO — é essa estrutura que o rótulo flutuante (shared.css,
  // "Padrão B") exige. Sem .field--plain nem .toggle-group, que faziam o campo
  // sair do padrão e renderizar com rótulo fixo e select de largura própria.
  function _fieldCategoria() {
    const field = document.createElement("div");
    field.className = "field";
    const label = document.createElement("label");
    label.innerHTML = 'Categoria de atividade <span class="req">*</span>';
    const selCat = document.createElement("select");
    // Obrigatório: o aplicar() dos marcadores só marca controles com data-k,
    // então este select (bindado programaticamente) recebe data-req direto.
    selCat.setAttribute("data-req", "");
    // A opção vazia é o que mantém o rótulo em estado "placeholder" até a
    // escolha (o seletor usa option[value=""]:checked).
    selCat.innerHTML =
      '<option value=""></option>' +
      TABELA_11.map((c, i) => `<option value="${i}">${c.d}</option>`).join("");
    selCat.value = d.catA == null ? "" : String(d.catA);
    selCat.addEventListener("change", () => {
      d.catA = selCat.value === "" ? null : +selCat.value;
      selCat.blur(); // sai do campo após escolher (o render() abaixo o recria)
      render();
    });
    field.append(label, selCat);
    if (window.CemigMarcadores)
      CemigMarcadores.aplicar(field.parentElement || field);
    return field;
  }
  function _busca() {
    const box = document.createElement("div");
    box.className = "carga-busca";
    box.innerHTML =
      '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>';
    const inp = document.createElement("input");
    inp.type = "text";
    inp.placeholder = "Buscar equipamento";
    inp.value = busca;
    inp.addEventListener("input", () => {
      busca = inp.value;
      const lista = container.querySelector(".carga-acc-list");
      if (lista) _renderAccList(lista);
    });
    box.appendChild(inp);
    return box;
  }
  function _accList() {
    const lista = document.createElement("div");
    lista.className = "carga-acc-list";
    _renderAccList(lista);
    return lista;
  }
  function _accHead(k, label, count, open, onToggle) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "carga-acc-head";
    btn.setAttribute("aria-expanded", open ? "true" : "false");
    btn.innerHTML =
      `<span class="carga-acc-label">${label}</span>` +
      `<span class="carga-acc-meta">${count > 0 ? `<span class="carga-acc-badge">${count}</span>` : ""}<span class="carga-acc-chevron" aria-hidden="true"></span></span>`;
    btn.addEventListener("click", onToggle);
    return btn;
  }
  function _renderAccList(lista) {
    lista.innerHTML = "";
    const filtrado = CAT.map((c, i) => ({ ...c, i })).filter(
      (c) => !busca || c.n.toLowerCase().includes(busca.toLowerCase()),
    );
    // Não-residencial: grupos relevantes para a categoria vêm primeiro
    const prioridade =
      (d.tipoA === "nr" && d.catA != null && PRIORIDADE_ACC_NR[d.catA]) || [];
    const cats = prioridade.length
      ? prioridade
          .map((id) => CARGA_CATS_BT.find((c) => c.id === id))
          .filter(Boolean)
          .concat(CARGA_CATS_BT.filter((c) => !prioridade.includes(c.id)))
      : CARGA_CATS_BT;
    cats.forEach((cat) => {
      const items = filtrado.filter(cat.match);
      if (busca && !items.length) return;
      const open = busca ? items.length > 0 : !!abertos[cat.id];
      const acc = document.createElement("div");
      acc.className = "carga-acc" + (open ? " is-open" : "");
      const count = CAT.reduce(
        (s, c, i) => s + (cat.match(c) ? d.qtds[i] || 0 : 0),
        0,
      );
      acc.appendChild(
        _accHead(cat.id, cat.label, count, open, () => {
          _cargaToggleExclusivo(abertos, cat.id, !abertos[cat.id]);
          _renderAccList(lista);
        }),
      );
      if (open) {
        const body = document.createElement("div");
        body.className = "carga-acc-body";
        items.forEach((c) => {
          const row = document.createElement("div");
          row.className = "carga-row";
          const nome = document.createElement("div");
          nome.innerHTML = `<div class="nome">${c.n} <span class="pot">(${fmtW(c.w)} W)</span></div>`;
          const ctrl = document.createElement("div");
          ctrl.className = "qtd-ctrl";
          const menos = document.createElement("button");
          menos.type = "button";
          menos.textContent = "−";
          const inp = document.createElement("input");
          inp.type = "number";
          inp.value = d.qtds[c.i] || 0;
          const mais = document.createElement("button");
          mais.type = "button";
          mais.className = "plus";
          mais.textContent = "+";
          const setQ = (v) => {
            d.qtds[c.i] = Math.max(0, v);
            if (inp.value !== String(d.qtds[c.i])) inp.value = d.qtds[c.i];
            notificar();
            // Badge da categoria acompanha a contagem
            const badge = acc.querySelector(".carga-acc-meta");
            const novo = CAT.reduce(
              (s, cc, i) => s + (cat.match(cc) ? d.qtds[i] || 0 : 0),
              0,
            );
            badge.innerHTML =
              (novo > 0 ? `<span class="carga-acc-badge">${novo}</span>` : "") +
              '<span class="carga-acc-chevron" aria-hidden="true"></span>';
          };
          menos.addEventListener("click", () => setQ((d.qtds[c.i] || 0) - 1));
          mais.addEventListener("click", () => setQ((d.qtds[c.i] || 0) + 1));
          inp.addEventListener("input", () => setQ(parseInt(inp.value) || 0));
          ctrl.append(menos, inp, mais);
          row.append(nome, ctrl);
          body.appendChild(row);
        });
        acc.appendChild(body);
      }
      lista.appendChild(acc);
    });
    lista.appendChild(_accMotores(lista));
  }
  function _accMotores(lista) {
    const open = !!abertos._mot;
    const acc = document.createElement("div");
    acc.className = "carga-acc" + (open ? " is-open" : "");
    acc.appendChild(
      _accHead("_mot", "Motores e cargas especiais", d.mots.length, open, () => {
        _cargaToggleExclusivo(abertos, "_mot", !abertos._mot);
        _renderAccList(lista);
      }),
    );
    if (open) {
      const body = document.createElement("div");
      body.className = "carga-acc-body";
      const r = calcDemandaResultados(d, opt(cfg.redeMono));
      if (d.mots.length) {
        const table = document.createElement("table");
        table.className = "motores-table";
        table.innerHTML =
          "<thead><tr><th>Tipo</th><th>Potência (CV)</th><th>Quantidade</th><th>Dem. Unit. (KVA)</th><th>Dem. Total (KVA)</th><th></th></tr></thead>";
        const tbody = document.createElement("tbody");
        d.mots.forEach((m, mi) => {
          const linha = r.rD.det[mi] || {};
          const tr = document.createElement("tr");
          const tdFase = document.createElement("td");
          const selFase = document.createElement("select");
          selFase.innerHTML =
            '<option value="mono">Monofásico</option><option value="tri">Trifásico</option>';
          selFase.value = m.fase;
          selFase.addEventListener("change", () => {
            m.fase = selFase.value;
            _renderAccList(lista); // troca a tabela de CVs
            notificar();
          });
          tdFase.appendChild(selFase);
          const tdCv = document.createElement("td");
          const selCv = document.createElement("select");
          selCv.innerHTML = (m.fase === "mono" ? MOTOR_MONO : MOTOR_TRI)
            .map((rr) => `<option value="${rr.cv}">${rr.l}</option>`)
            .join("");
          selCv.value = String(m.cv);
          selCv.addEventListener("change", () => {
            m.cv = selCv.value;
            notificar();
            _atualizarCelulasMotores(lista);
          });
          tdCv.appendChild(selCv);
          const tdQ = document.createElement("td");
          const inpQ = document.createElement("input");
          inpQ.type = "number";
          inpQ.min = "0";
          inpQ.value = m.q;
          inpQ.style.width = "60px";
          inpQ.addEventListener("input", () => {
            m.q = parseInt(inpQ.value) || 0;
            notificar();
            _atualizarCelulasMotores(lista);
          });
          tdQ.appendChild(inpQ);
          const tdUnit = document.createElement("td");
          tdUnit.className = "num";
          tdUnit.dataset.calcCel = "kvaUnit";
          tdUnit.textContent = fmt2(linha.kvaUnit || 0);
          const tdTot = document.createElement("td");
          tdTot.className = "num";
          tdTot.dataset.calcCel = "kva";
          tdTot.textContent = fmt2(linha.kva || 0);
          const tdDel = document.createElement("td");
          const del = document.createElement("button");
          del.type = "button";
          del.className = "motor-del";
          del.setAttribute("aria-label", "Remover motor");
          del.textContent = "✕";
          del.addEventListener("click", () => {
            d.mots.splice(mi, 1);
            notificar();
            _renderAccList(lista);
          });
          tdDel.appendChild(del);
          tr.append(tdFase, tdCv, tdQ, tdUnit, tdTot, tdDel);
          tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        body.appendChild(table);
        if (r.rD.d > 0) {
          const total = document.createElement("div");
          total.className = "motores-total";
          total.innerHTML = `Demanda total dos motores: <strong>${fmt2(r.rD.d)} kVA</strong>`;
          body.appendChild(total);
        }
      }
      const addBox = document.createElement("div");
      addBox.className = "motores-add";
      const add = document.createElement("button");
      add.type = "button";
      add.className = "btn btn-ghost motores-add-btn";
      add.textContent = "+ Adicionar motor";
      add.addEventListener("click", () => {
        d.mots.push({ fase: "mono", cv: 1, q: 1 });
        notificar();
        _renderAccList(lista);
      });
      addBox.appendChild(add);
      body.appendChild(addBox);
      acc.appendChild(body);
    }
    return acc;
  }
  function _atualizarCelulasMotores(lista) {
    // A coluna c1..c4 depende da contagem total: recalcula todas as células
    const r = calcDemandaResultados(d, opt(cfg.redeMono));
    const trs = lista.querySelectorAll(".motores-table tbody tr");
    trs.forEach((tr, mi) => {
      const linha = r.rD.det[mi] || {};
      const unit = tr.querySelector('[data-calc-cel="kvaUnit"]');
      const tot = tr.querySelector('[data-calc-cel="kva"]');
      if (unit) unit.textContent = fmt2(linha.kvaUnit || 0);
      if (tot) tot.textContent = fmt2(linha.kva || 0);
    });
    const totalEl = lista.querySelector(".motores-total");
    if (totalEl && r.rD.d > 0)
      totalEl.innerHTML = `Demanda total dos motores: <strong>${fmt2(r.rD.d)} kVA</strong>`;
  }
  render();
  return { atualizar: render, dados: () => d };
}

/* ------------------------------------------------------------
   Bloco de resultado da carga (cards carga/demanda + disjuntor em
   toggle) — porte do _renderResultadoUC do BT individual, sem as
   partes específicas de múltiplas UCs (validação de combinação).
     cfg.cargas    () => objeto de cargas com _cargaKw/_demanda/_disjuntores
     cfg.escolhido () => disjuntor escolhido
     cfg.aoEscolher(dj) grava a escolha
   ------------------------------------------------------------ */
function renderResultadoCarga(box, cfg) {
  const opt = (v) => (typeof v === "function" ? v() : v);
  const c = opt(cfg.cargas) || {};
  const cargaKw = c._cargaKw || 0;
  box.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "resultado-cargas divider";
  const kpis = document.createElement("div");
  kpis.className = "resultado-kpis";
  const cardCarga = document.createElement("div");
  cardCarga.className =
    "resultado-card" + (cargaKw > 75 ? " resultado-card--warn" : "");
  cardCarga.innerHTML =
    `<div class="resultado-card-label">Carga instalada</div>` +
    `<div class="resultado-card-valor">${fmt2(cargaKw)} kW</div>` +
    (cargaKw > 75
      ? `<div class="cmg-aviso cmg-aviso--warn" style="margin-bottom:0"><div class="cmg-aviso-icon" aria-hidden="true"></div><p class="cmg-aviso-texto">Sua carga instalada ultrapassa 75 kW, é obrigatório anexar a ART/TRT de projeto paga, planta situação, e formulário preenchido no APR Web.</p></div>`
      : "");
  const cardDem = document.createElement("div");
  cardDem.className = "resultado-card";
  cardDem.innerHTML =
    `<div class="resultado-card-label">Demanda calculada</div>` +
    `<div class="resultado-card-valor">${fmt2(c._demanda || 0)} kVA</div>`;
  kpis.append(cardCarga, cardDem);
  const cardDisj = document.createElement("div");
  cardDisj.className = "resultado-card resultado-disjuntor";
  cardDisj.innerHTML = `<div class="resultado-card-label">Disjuntor adequado de acordo com a seleção</div>`;
  const lista = c._disjuntores || [];
  if (lista.length) {
    const atual = opt(cfg.escolhido) || lista[0];
    const tg = document.createElement("div");
    tg.className = "toggle-group";
    lista.forEach((dj) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "toggle-btn" + (atual === dj ? " on" : "");
      b.textContent = dj;
      b.addEventListener("click", () => {
        if (cfg.aoEscolher) cfg.aoEscolher(dj);
        renderResultadoCarga(box, cfg);
        if (window.CemigMarcadores) CemigMarcadores.atualizarAvancar();
      });
      tg.appendChild(b);
    });
    cardDisj.appendChild(tg);
  } else {
    const hint = document.createElement("div");
    hint.className = "field-hint";
    hint.textContent = "Detalhe as cargas para ver o disjuntor adequado.";
    cardDisj.appendChild(hint);
  }
  wrap.append(kpis, cardDisj);
  box.appendChild(wrap);
}
