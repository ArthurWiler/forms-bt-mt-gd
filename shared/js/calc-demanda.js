/* ============================================================
   CEMIG — Formulário de Carga (ND-5.1) — ilha vanilla reutilizável
   ------------------------------------------------------------
   Porte 1:1 do componente React `CalcDemanda` (shared/js/load-form.js)
   para os formulários em HTML/JS puro (micro, mini e BT individual).
   Calcula carga instalada, demanda (D = a + b + c + d + e + f) e a
   sugestão de disjuntores, gravando `_demanda`/`_cargaKw`/`_disjuntores`
   no objeto de estado a cada alteração — exatamente como a versão React.

   Uso (estilo das ilhas do MT — renderTrafos/renderGaleriaSE):
     const ilha = montarCalcDemanda(container, {
       data: estado.cargas,            // {qtds,tipoA,catA,mots,extras,...}
       aoMudar: (c) => { estado.cargas = c; ... },
       redeMono: () => estado.grupo === "B",
       atividade: () => "Residencial" | "Comercial" | "Industrial" | "",
       minimizarPorPadrao: false,
       mostrarCargasAdicionais: true,
     });
     ilha.atualizar();  // re-sincroniza quando atividade/redeMono mudam fora

   Requer: shared/js/load-form-data.js (CAT, GL, GO, TABELA_11, MOTOR_*,
   motorColPorQtd, motorKvaUnit) e shared/js/calc.js (calcA_res, calcA_nr,
   calcBsg, selecionarDisjuntores, fmt2, fmtW).
   ============================================================ */

// Núcleo de cálculo — réplica literal dos useMemo do CalcDemanda React.
// Puro: recebe {qtds,tipoA,catA,mots,extras} + redeMono e devolve os
// resultados agregados e o detalhamento por linha de motor/carga adicional.
function calcDemandaResultados(d, redeMono) {
  const qtds = d.qtds || CAT.map(() => 0);
  const tipoA = d.tipoA || "";
  const catA = d.catA || 0;
  const mots = d.mots || [];
  const extras = d.extras || [];
  const itensPorGrupo = (g) =>
    CAT.map((c, i) => ({ ...c, q: qtds[i] || 0 })).filter(
      (x) => x.g === g && x.q > 0,
    );
  // Parcela a) iluminação/tomadas
  let rA = { kw: 0, d: 0 };
  if (tipoA) {
    const kwIl = itensPorGrupo("il").reduce((s, x) => s + x.q * x.w, 0) / 1e3;
    rA =
      tipoA === "res"
        ? { kw: kwIl, ...calcA_res(kwIl) }
        : { kw: kwIl, ...calcA_nr(kwIl, catA) };
  }
  // Parcela b) subgrupos b1..b5
  const rB = {};
  ["b1", "b2", "b3", "b4", "b5"].forEach((sg) => {
    rB[sg] = calcBsg(itensPorGrupo(sg), sg);
  });
  // Parcela c) condicionadores de ar
  const kwC = itensPorGrupo("c").reduce((s, x) => s + x.q * x.w, 0) / 1e3;
  const rC = { kw: kwC, d: kwC };
  // Parcela d) motores + cargas adicionais (contagem total define a coluna)
  const todos = [...mots, ...extras];
  const qtdTotal = todos.reduce((s, m) => s + (parseInt(m.q) || 0), 0);
  const col = motorColPorQtd(qtdTotal);
  const calcLinha = (m) => {
    const kvaUnit = motorKvaUnit(m.fase, m.cv, col);
    return { ...m, col, kvaUnit, kva: (parseInt(m.q) || 0) * kvaUnit };
  };
  const det = mots.map(calcLinha);
  const detExtras = extras.map(calcLinha);
  const rD = {
    det,
    detExtras,
    col,
    qtdTotal,
    d:
      det.reduce((s, x) => s + x.kva, 0) +
      detExtras.reduce((s, x) => s + x.kva, 0),
  };
  // Parcela f) raios-X
  const kwF = itensPorGrupo("f").reduce((s, x) => s + x.q * x.w, 0) / 1e3;
  const rF = { kw: kwF, d: kwF * 0.5 };
  const b = Object.values(rB).reduce((s, x) => s + (x.d || 0), 0);
  const demandaTotal = rA.d + b + rC.d + rD.d + rF.d;
  const cargaInstalada =
    CAT.reduce((s, c, i) => s + (qtds[i] || 0) * c.w, 0) / 1e3;
  // Um motor trifásico exige alimentação trifásica — oculta mono/bifásicos.
  const lista = selecionarDisjuntores(demandaTotal, redeMono);
  const temMotorTri = todos.some(
    (m) => m.fase === "tri" && (parseInt(m.q) || 0) > 0,
  );
  const disjuntores = temMotorTri
    ? lista.filter((x) => x.tipo === "tri")
    : lista;
  return { rA, rB, rC, rD, rF, demandaTotal, cargaInstalada, disjuntores };
}

function montarCalcDemanda(container, cfg) {
  const opt = (v) => (typeof v === "function" ? v() : v);
  // Estado interno do formulário de carga (normalizado como no React).
  const d = Object.assign(
    { qtds: [], tipoA: "", catA: 0, mots: [], extras: [] },
    cfg.data || {},
  );
  d.qtds = CAT.map((_, i) => d.qtds[i] || 0);
  let busca = "";
  let minimizado = !!cfg.minimizarPorPadrao;

  // Recalcula, grava os resultados no objeto e notifica o dono do estado —
  // equivalente ao efeito resKey do React (resultados sempre sincronizados).
  function notificar() {
    const r = calcDemandaResultados(d, opt(cfg.redeMono));
    d._demanda = r.demandaTotal;
    d._cargaKw = r.cargaInstalada;
    d._disjuntores = r.disjuntores.map((x) => x.fx);
    if (cfg.aoMudar) cfg.aoMudar(Object.assign({}, d));
    return r;
  }

  // Trava do tipo de carga pela atividade (Residencial → res; Comercial/
  // Industrial → nr), como o useEffect do React.
  function aplicarAtividade() {
    const atividade = opt(cfg.atividade) || "";
    if (atividade === "Residencial") {
      if (d.tipoA !== "res") d.tipoA = "res";
      return true;
    }
    if (atividade === "Comercial" || atividade === "Industrial") {
      if (d.tipoA !== "nr") d.tipoA = "nr";
      return true;
    }
    return false;
  }

  /* ---------- blocos de renderização ---------- */
  function render() {
    const bloqueado = aplicarAtividade();
    const r = notificar();
    container.innerHTML = "";
    container.appendChild(_fieldTipoCarga(bloqueado));
    if (!d.tipoA) {
      const hint = document.createElement("div");
      hint.className = "field-hint";
      hint.style.marginTop = "10px";
      hint.textContent =
        "Selecione o tipo de carga para detalhar os equipamentos.";
      container.appendChild(hint);
      return;
    }
    container.appendChild(_headEquipamentos());
    container.appendChild(minimizado ? _resumoChips() : _catalogo());
    container.appendChild(
      _boxMotores("mots", "Motores / Cargas Especiais", "+ Motor",
        "Nenhum motor adicionado.", null),
    );
    if (cfg.mostrarCargasAdicionais) {
      container.appendChild(
        _boxMotores(
          "extras",
          "Cargas Adicionais",
          "+ Carga Adicional",
          "Nenhuma carga adicional informada.",
          "Para cargas que não constam na lista predefinida. Cada item usa a mesma estrutura dos motores e é somado à demanda.",
        ),
      );
    }
    _renderTotalMotores(r);
    // A ilha renderiza depois do aplicar() global — reaplica a convenção de
    // marcadores no próprio container ("*" → data-req, sem asterisco cru).
    if (window.CemigMarcadores) window.CemigMarcadores.aplicar(container);
  }

  function _fieldTipoCarga(bloqueado) {
    const field = document.createElement("div");
    field.className = "field field--plain";
    const label = document.createElement("label");
    label.innerHTML = 'Tipo de carga <span class="req">*</span>';
    field.appendChild(label);
    const group = document.createElement("div");
    group.className = "toggle-group";
    group.style.alignItems = "center";
    const sel = document.createElement("select");
    sel.disabled = bloqueado;
    sel.innerHTML =
      '<option value=""></option><option value="res">Residencial</option><option value="nr">Não-Residencial</option>';
    sel.value = d.tipoA;
    sel.addEventListener("change", () => {
      d.tipoA = sel.value;
      render();
    });
    group.appendChild(sel);
    if (d.tipoA === "nr") {
      const selCat = document.createElement("select");
      selCat.style.width = "auto";
      selCat.innerHTML = TABELA_11.map(
        (c, i) => `<option value="${i}">${c.d}</option>`,
      ).join("");
      selCat.value = String(d.catA);
      selCat.addEventListener("change", () => {
        d.catA = +selCat.value;
        notificar();
      });
      group.appendChild(selCat);
    }
    field.appendChild(group);
    return field;
  }

  function _headEquipamentos() {
    const head = document.createElement("div");
    head.className = "carga-min-head";
    head.style.marginTop = "12px";
    const titulo = document.createElement("span");
    titulo.className = "subbox-title";
    titulo.textContent = "Equipamentos selecionados";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn btn-ghost";
    btn.style.cssText = "padding:5px 12px;font-size:12px";
    btn.textContent = minimizado
      ? "Editar lista de equipamentos"
      : "Minimizar lista";
    btn.addEventListener("click", () => {
      minimizado = !minimizado;
      render();
    });
    head.append(titulo, btn);
    return head;
  }

  function _resumoChips() {
    const box = document.createElement("div");
    box.className = "carga-resumo";
    const selecionados = CAT.map((c, i) => ({ ...c, i, q: d.qtds[i] || 0 }))
      .filter((c) => c.q > 0);
    if (!selecionados.length) {
      box.innerHTML =
        '<div class="field-hint">Nenhum equipamento selecionado.</div>';
      return box;
    }
    selecionados.forEach((c) => {
      const chip = document.createElement("span");
      chip.className = "carga-resumo-chip";
      chip.textContent = `${c.q}x ${c.n}`;
      box.appendChild(chip);
    });
    return box;
  }

  function _catalogo() {
    const wrap = document.createElement("div");
    // Busca (fica fora da lista para o input não ser reconstruído ao digitar)
    const buscaField = document.createElement("div");
    buscaField.className = "field";
    buscaField.style.marginTop = "12px";
    buscaField.innerHTML = "<label>Buscar equipamento</label>";
    const buscaInp = document.createElement("input");
    buscaInp.type = "text";
    buscaInp.placeholder = "Ex: chuveiro, geladeira, ar...";
    buscaInp.value = busca;
    buscaField.appendChild(buscaInp);
    const lista = document.createElement("div");
    lista.className = "carga-box";
    lista.style.marginTop = "8px";
    buscaInp.addEventListener("input", () => {
      busca = buscaInp.value;
      _renderListaCargas(lista);
    });
    _renderListaCargas(lista);
    wrap.append(buscaField, lista);
    return wrap;
  }

  function _renderListaCargas(lista) {
    lista.innerHTML = "";
    const filtrado = CAT.map((c, i) => ({ ...c, i })).filter(
      (c) => !busca || c.n.toLowerCase().includes(busca.toLowerCase()),
    );
    GO.forEach((sg) => {
      const items = filtrado.filter((c) => c.g === sg);
      if (!items.length) return;
      const grupo = document.createElement("div");
      const titulo = document.createElement("div");
      titulo.className = "carga-group-title";
      titulo.textContent = GL[sg];
      grupo.appendChild(titulo);
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
          _renderTotalMotores();
        };
        menos.addEventListener("click", () => setQ((d.qtds[c.i] || 0) - 1));
        mais.addEventListener("click", () => setQ((d.qtds[c.i] || 0) + 1));
        inp.addEventListener("input", () =>
          setQ(parseInt(inp.value) || 0),
        );
        ctrl.append(menos, inp, mais);
        row.append(nome, ctrl);
        grupo.appendChild(row);
      });
      lista.appendChild(grupo);
    });
  }

  // Tabela editável de motores/cargas adicionais (mesma estrutura das duas).
  function _boxMotores(chave, titulo, rotuloBtn, rotuloVazio, hint) {
    const box = document.createElement("div");
    box.className = "subbox motores-box";
    box.dataset.calcChave = chave;
    if (chave === "extras") box.style.marginTop = "12px";
    const head = document.createElement("div");
    head.className = "motores-head";
    const tituloEl = document.createElement("span");
    tituloEl.className = "subbox-title";
    tituloEl.textContent = titulo;
    const add = document.createElement("button");
    add.type = "button";
    add.className = "btn btn-primary";
    add.style.cssText = "padding:5px 12px;font-size:12px";
    add.textContent = rotuloBtn;
    add.addEventListener("click", () => {
      d[chave].push({ fase: "mono", cv: "1", q: 1 });
      render();
    });
    head.append(tituloEl, add);
    box.appendChild(head);
    if (hint) {
      const h = document.createElement("div");
      h.className = "field-hint";
      h.style.marginBottom = "8px";
      h.textContent = hint;
      box.appendChild(h);
    }
    const linhas = d[chave];
    if (!linhas.length) {
      const vazio = document.createElement("div");
      vazio.style.cssText = "font-size:12px;color:var(--texto-suave)";
      vazio.textContent = rotuloVazio;
      box.appendChild(vazio);
      return box;
    }
    const table = document.createElement("table");
    table.className = "motores-table";
    table.innerHTML =
      "<thead><tr><th>Tipo</th><th>Potência (CV)</th><th>Qtd</th><th>Dem. unit. (kVA)</th><th>Dem. total (kVA)</th><th></th></tr></thead>";
    const tbody = document.createElement("tbody");
    linhas.forEach((m, mi) => {
      const tr = document.createElement("tr");
      // Tipo (fase)
      const tdFase = document.createElement("td");
      const selFase = document.createElement("select");
      selFase.innerHTML =
        '<option value="mono">Monofásico</option><option value="tri">Trifásico</option>';
      selFase.value = m.fase;
      selFase.addEventListener("change", () => {
        m.fase = selFase.value;
        render(); // troca a tabela de CVs disponíveis
      });
      tdFase.appendChild(selFase);
      // Potência (CV)
      const tdCv = document.createElement("td");
      const selCv = document.createElement("select");
      selCv.innerHTML = (m.fase === "mono" ? MOTOR_MONO : MOTOR_TRI)
        .map((r) => `<option value="${r.cv}">${r.l}</option>`)
        .join("");
      selCv.value = m.cv;
      selCv.addEventListener("change", () => {
        m.cv = selCv.value;
        _recalcularLinhas();
      });
      tdCv.appendChild(selCv);
      // Qtd
      const tdQ = document.createElement("td");
      const inpQ = document.createElement("input");
      inpQ.type = "number";
      inpQ.min = "0";
      inpQ.value = m.q;
      inpQ.style.width = "60px";
      inpQ.addEventListener("input", () => {
        m.q = parseInt(inpQ.value) || 0;
        _recalcularLinhas();
      });
      tdQ.appendChild(inpQ);
      // Demandas calculadas (preenchidas por _recalcularLinhas)
      const tdUnit = document.createElement("td");
      tdUnit.className = "num";
      tdUnit.dataset.calcCel = "kvaUnit";
      const tdTot = document.createElement("td");
      tdTot.className = "num";
      tdTot.dataset.calcCel = "kva";
      // Remover
      const tdDel = document.createElement("td");
      const del = document.createElement("button");
      del.type = "button";
      del.className = "motor-del";
      del.textContent = "✕";
      del.addEventListener("click", () => {
        d[chave].splice(mi, 1);
        render();
      });
      tdDel.appendChild(del);
      tr.append(tdFase, tdCv, tdQ, tdUnit, tdTot, tdDel);
      tbody.appendChild(tr);
    });
    table.appendChild(tbody);
    box.appendChild(table);
    return box;
  }

  // Recalcula e atualiza in-place as células de demanda das DUAS tabelas —
  // a contagem total (mots+extras) define a coluna c1..c4, então uma mudança
  // em qualquer linha afeta todas.
  function _recalcularLinhas() {
    _renderTotalMotores(notificar());
  }

  // Faixa "Demanda dos motores e cargas adicionais: X kVA" (só quando > 0).
  function _renderTotalMotores(r) {
    if (!r) r = calcDemandaResultados(d, opt(cfg.redeMono));
    let total = container.querySelector(".motores-total");
    if (r.rD.d > 0) {
      if (!total) {
        total = document.createElement("div");
        total.className = "motores-total";
        container.appendChild(total);
      }
      total.textContent = `Demanda dos motores e cargas adicionais: ${fmt2(r.rD.d)} kVA`;
    } else if (total) {
      total.remove();
    }
    // As células das tabelas também dependem do total (coluna c1..c4);
    // garante que estejam preenchidas após um render() completo.
    [
      ["mots", r.rD.det],
      ["extras", r.rD.detExtras],
    ].forEach(([chave, det]) => {
      const box = container.querySelector(`[data-calc-chave="${chave}"]`);
      if (!box) return;
      box.querySelectorAll("tbody tr").forEach((tr, mi) => {
        const linha = det[mi] || {};
        const unit = tr.querySelector('[data-calc-cel="kvaUnit"]');
        const tot = tr.querySelector('[data-calc-cel="kva"]');
        if (unit) unit.textContent = fmt2(linha.kvaUnit || 0);
        if (tot) tot.textContent = fmt2(linha.kva || 0);
      });
    });
  }

  render();
  return {
    // Re-sincroniza com o contexto externo (atividade/redeMono mudaram).
    atualizar: render,
    // Acesso ao objeto de estado atual (com _demanda/_cargaKw/_disjuntores).
    dados: () => Object.assign({}, d),
  };
}
