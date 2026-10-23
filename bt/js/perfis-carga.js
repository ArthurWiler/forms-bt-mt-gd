/* ============================================================
   CEMIG BT — Perfis de carga (individual Etapa 5, spec Figma svg9–14;
   coletivo/torres no modo calculadora)
   ------------------------------------------------------------
   Em vez de começar a calculadora do zero, cada imóvel oferece dois
   perfis prontos para o seu tipo de propriedade. Escolher um perfil
   apenas PREENCHE u.cargas (qtds/tipoA/catA/mots): a calculadora,
   a validação de disjuntores, a prévia e o PDF continuam lendo
   u.cargas como sempre. "Personalizar perfil" abre a calculadora
   (montarCargasBT) sobre uma cópia — ver "UI dos perfis" no fim
   deste arquivo.

   Item de perfil: { n: <nome EXATO do CAT>, min, max }. O nome é a
   referência, nunca o índice: cargas.qtds é posicional sobre CAT.
   A quantidade usada nas contas é o ponto médio da faixa ("aprox."),
   arredondado para cima — a faixa é o que a tela mostra.

   Os títulos/descrições dos perfis residenciais e de salão de beleza
   são os do Figma; os demais (comércio, indústria, irrigação) são
   genéricos, até a Cemig fornecer o catálogo de cada ramo. As
   potências vêm do CAT (ND-5.1), não dos números ilustrativos do mock.

   Requer: shared/js/load-form-data.js (CAT, MOTOR_MONO/MOTOR_TRI),
   shared/js/calc.js (fmt2, fmtW), shared/js/calc-demanda.js
   (calcDemandaResultados), shared/js/carga-bt.js (tipoPropriedadeDe,
   infoTipoPropriedade), shared/js/ramo-atividade.js (ramoCodigo),
   bt/js/model.js (cargasQtdsPorNome) e bt/js/bt-core.js (redeMonoBT).
   ============================================================ */

const PERFIS_CARGA = {
  residencial: [
    {
      id: "res-pequena",
      titulo: "Casa pequena",
      desc: "Para casas de cerca de 50 m², com até 2 moradores e uso mais simples de energia.",
      itens: [
        { n: "Lâmpada LED 18W", min: 4, max: 8 },
        { n: "Televisor", min: 1, max: 3 },
        { n: "Ventilador", min: 1, max: 3 },
        { n: "Chuveiro Elétrico 127V", min: 1, max: 4 },
        { n: "Micro forno elétrico", min: 1, max: 1 },
        { n: "Geladeira comum", min: 1, max: 1 },
        { n: "Máq. lavar roupas", min: 1, max: 1 },
      ],
    },
    {
      id: "res-grande",
      titulo: "Casa grande",
      desc: "Para casas de cerca de 150 m², com família de até 4 pessoas e uso mais intenso de energia.",
      itens: [
        { n: "Lâmpada LED 18W", min: 4, max: 8 },
        { n: "Televisor", min: 1, max: 3 },
        { n: "Ventilador", min: 1, max: 3 },
        { n: "Ar condicionado 10000 BTU", min: 1, max: 2 },
        { n: "Chuveiro Elétrico 127V", min: 1, max: 4 },
        { n: "Micro forno elétrico", min: 1, max: 1 },
        { n: "Geladeira duplex", min: 1, max: 1 },
        { n: "Máq. lavar roupas", min: 1, max: 1 },
        { n: "Ferro elétrico automático", min: 1, max: 1 },
      ],
    },
  ],
  // Tipo de propriedade "Barbearia, salões de beleza" (Tabela 11).
  salao: [
    {
      id: "salao-pequeno",
      titulo: "Salão pequeno",
      desc: "Para salões pequenos, com cerca de 2 lugares de atendimento e equipamentos mais simples. Indicado para quem está começando a empreender.",
      catA: 4, // Tabela 11: Barbearia, salões de beleza
      itens: [
        { n: "Chuveiro Elétrico 127V", min: 1, max: 1 },
        { n: "Secador de cabelos", min: 1, max: 2 },
        { n: "Chapinha", min: 1, max: 2 },
        { n: "Lâmpada LED 18W", min: 4, max: 8 },
        { n: "Ventilador", min: 1, max: 2 },
        { n: "Geladeira comum", min: 1, max: 1 },
      ],
    },
    {
      id: "salao-grande",
      titulo: "Salão grande",
      desc: "Para salões maiores, com cerca de 4 lugares de atendimento, lavatórios e equipamentos de maior consumo como ar-condicionado e secadores",
      catA: 4,
      itens: [
        { n: "Secador de cabelo profissional", min: 2, max: 4 },
        { n: "Chuveiro Elétrico 127V", min: 1, max: 2 },
        { n: "Ar condicionado 12000 BTU", min: 2, max: 2 },
        { n: "Micro forno elétrico", min: 1, max: 1 },
        { n: "Cafeteira pequena", min: 1, max: 1 },
        { n: "Chapinha", min: 2, max: 4 },
        { n: "Lâmpada LED 18W", min: 8, max: 12 },
        { n: "Geladeira comum", min: 1, max: 1 },
      ],
    },
  ],
  comercial: [
    {
      id: "com-pequeno",
      titulo: "Comércio pequeno",
      desc: "Para lojas e escritórios pequenos, com até 2 pessoas trabalhando e equipamentos básicos.",
      catA: 7, // Tabela 11: Escritórios, lojas e salas comerciais
      itens: [
        { n: "Lâmpada LED 18W", min: 6, max: 10 },
        { n: "Micro computador", min: 1, max: 2 },
        { n: "Ventilador", min: 1, max: 2 },
        { n: "Impressora comum", min: 1, max: 1 },
        { n: "Geladeira comum", min: 1, max: 1 },
        { n: "Cafeteira pequena", min: 1, max: 1 },
      ],
    },
    {
      id: "com-grande",
      titulo: "Comércio grande",
      desc: "Para lojas e escritórios maiores, com várias pessoas trabalhando, ar-condicionado e equipamentos de maior consumo.",
      catA: 7,
      itens: [
        { n: "Lâmpada LED 18W", min: 12, max: 20 },
        { n: "Ar condicionado 12000 BTU", min: 1, max: 2 },
        { n: "Micro computador", min: 2, max: 4 },
        { n: "Impressora a laser", min: 1, max: 1 },
        { n: "Geladeira duplex", min: 1, max: 1 },
        { n: "Micro forno elétrico", min: 1, max: 1 },
        { n: "Bebedouro elétrico", min: 1, max: 1 },
      ],
    },
  ],
  industrial: [
    {
      id: "ind-pequena",
      titulo: "Pequena indústria",
      desc: "Para oficinas e pequenas indústrias, com máquinas leves e poucos motores.",
      catA: 0, // Tabela 11: Oficina, indústrias e semelhantes
      itens: [
        { n: "Lâmpada LED 18W", min: 8, max: 12 },
        { n: "Exaustor", min: 1, max: 2 },
        { n: "Micro computador", min: 1, max: 1 },
        { n: "Geladeira comum", min: 1, max: 1 },
      ],
      mots: [{ fase: "mono", cv: "2", min: 1, max: 2 }],
    },
    {
      id: "ind-media",
      titulo: "Indústria de médio porte",
      desc: "Para indústrias com várias máquinas, motores trifásicos e maior consumo de energia.",
      catA: 0,
      itens: [
        { n: "Lâmpada LED 18W", min: 15, max: 25 },
        { n: "Exaustor", min: 2, max: 4 },
        { n: "Ar condicionado 12000 BTU", min: 1, max: 1 },
        { n: "Micro computador", min: 2, max: 3 },
      ],
      mots: [{ fase: "tri", cv: "5", min: 2, max: 2 }],
    },
  ],
  // 2ª UC do pedido rural (atividade fixa "Irrigação").
  irrigacao: [
    {
      id: "irr-pequena",
      titulo: "Irrigação pequena",
      desc: "Para irrigação de áreas pequenas, com uma bomba monofásica.",
      catA: 0,
      itens: [{ n: "Lâmpada LED 18W", min: 2, max: 4 }],
      mots: [{ fase: "mono", cv: "3", min: 1, max: 1 }],
    },
    {
      id: "irr-media",
      titulo: "Irrigação de médio porte",
      desc: "Para áreas maiores, com bomba trifásica e uso diário prolongado.",
      catA: 0,
      itens: [{ n: "Lâmpada LED 18W", min: 2, max: 4 }],
      mots: [{ fase: "tri", cv: "7.5", min: 1, max: 1 }],
    },
  ],
};

// Salão de beleza: Tipo de propriedade "Barbearia, salões de beleza"
// (TABELA_11[4]). Rascunhos de antes guardavam o CNAE 9602-5/01|02 no ramo.
const _ehSalaoBT = (u) =>
  infoTipoPropriedade(tipoPropriedadeDe(u)).catA === 4 ||
  (!u.tipoPropriedade && /^96025/.test(ramoCodigo(u.ramo || "")));

// Família de perfis do imóvel, pelo Tipo de propriedade.
function familiaPerfisBT(u) {
  const a = u.atividade || "";
  if (a === "Residencial") return "residencial";
  if (a === ATIVIDADE_IRRIGACAO) return "irrigacao";
  if (a === "Industrial") return "industrial";
  if (a === "Comercial") return _ehSalaoBT(u) ? "salao" : "comercial";
  return "";
}
const perfisDoImovel = (u) => PERFIS_CARGA[familiaPerfisBT(u)] || [];
function perfilPorIdBT(id) {
  for (const k in PERFIS_CARGA) {
    const p = PERFIS_CARGA[k].find((x) => x.id === id);
    if (p) return p;
  }
  return null;
}
// "Perfil N: Título" — N é a posição do perfil entre os oferecidos ao imóvel.
function rotuloPerfilBT(u, id) {
  const lista = perfisDoImovel(u);
  const i = lista.findIndex((p) => p.id === id);
  return i < 0 ? "" : `Perfil ${i + 1}: ${lista[i].titulo}`;
}
const qtdPerfilBT = (it) => Math.ceil(((it.min || 0) + (it.max || 0)) / 2);
const faixaPerfilBT = (it) =>
  it.min === it.max ? String(it.max) : `entre ${it.min} e ${it.max}`;
// Tipo de carga da parcela a) — mesma regra do aplicarAtividade da ilha.
const _tipoAPerfilBT = (u) => (u.atividade === "Residencial" ? "res" : "nr");

// Objeto de cargas (shape de u.cargas) que o perfil representa. A categoria
// da Tabela 11 é a do Tipo de propriedade; o catA do perfil só vale quando
// o tipo não define uma.
function cargasDoPerfilBT(p, u) {
  const catTipo = infoTipoPropriedade(tipoPropriedadeDe(u)).catA;
  return {
    qtds: cargasQtdsPorNome(
      p.itens.map((it) => ({ n: it.n, q: qtdPerfilBT(it) })),
    ),
    tipoA: _tipoAPerfilBT(u),
    catA: catTipo != null ? catTipo : p.catA == null ? null : p.catA,
    mots: (p.mots || []).map((m) => ({
      fase: m.fase,
      cv: m.cv,
      q: String(qtdPerfilBT(m)),
    })),
  };
}
// Contas do perfil para o card: carga, demanda, disjuntor e nº de equipamentos.
function resumoCargasBT(c) {
  const r = calcDemandaResultados(c, redeMonoBT());
  const nItens =
    (c.qtds || []).reduce((s, q) => s + (q || 0), 0) +
    (c.mots || []).reduce((s, m) => s + (parseInt(m.q) || 0), 0);
  return {
    kw: r.cargaInstalada,
    kva: r.demandaTotal,
    disjuntores: r.disjuntores.map((x) => x.fx),
    n: nItens,
  };
}
const _motorRotuloBT = (m) => {
  const tab = m.fase === "mono" ? MOTOR_MONO : MOTOR_TRI;
  const row = tab.find((r) => r.cv === parseFloat(m.cv));
  return `Motor ${m.fase === "mono" ? "monofásico" : "trifásico"} ${(row && row.l) || m.cv} cv`;
};
// Linhas do card/modal: { nome, pot, qtd } — do perfil (faixas) ou de um
// objeto de cargas (quantidades exatas, perfil personalizado).
function linhasPerfilBT(p) {
  const linhas = p.itens.map((it) => {
    const c = CAT.find((x) => x.n === it.n) || { w: 0 };
    return { nome: it.n, pot: fmtW(c.w) + " W", qtd: faixaPerfilBT(it) };
  });
  (p.mots || []).forEach((m) =>
    linhas.push({ nome: _motorRotuloBT(m), pot: "", qtd: faixaPerfilBT(m) }),
  );
  return linhas;
}
function linhasCargasBT(c) {
  const linhas = [];
  CAT.forEach((it, i) => {
    const q = (c.qtds || [])[i] || 0;
    if (q > 0)
      linhas.push({ nome: it.n, pot: fmtW(it.w) + " W", qtd: String(q) });
  });
  (c.mots || []).forEach((m) => {
    if ((parseInt(m.q) || 0) > 0)
      linhas.push({ nome: _motorRotuloBT(m), pot: "", qtd: String(m.q) });
  });
  return linhas;
}

/* Modais: _modalPerfilBT e abrirModalDisjuntoresBT vivem em bt-core.js
   (usados também pelo coletivo/múltiplas torres). */
const ICONE_LAPIS_BT =
  '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M14 6l4 4"/></svg>';

// "Todos os equipamentos" (svg13): tabela com rolagem própria.
function abrirModalEquipamentosBT(linhas, aoPersonalizar) {
  _modalPerfilBT(
    "cmg-modal-equip",
    "Todos os equipamentos",
    (corpo) => {
      const rolagem = document.createElement("div");
      rolagem.className = "perfil-equip-rolagem";
      const tab = document.createElement("table");
      tab.className = "perfil-equip-tabela";
      tab.innerHTML =
        "<thead><tr><th>Equipamento</th><th>Qtde.</th></tr></thead><tbody></tbody>";
      const tb = tab.tBodies[0];
      linhas.forEach((l) => {
        const tr = document.createElement("tr");
        const td1 = document.createElement("td");
        const b = document.createElement("strong");
        b.textContent = l.nome;
        td1.appendChild(b);
        if (l.pot) td1.append(" ", l.pot);
        const td2 = document.createElement("td");
        td2.textContent = l.qtd;
        tr.append(td1, td2);
        tb.appendChild(tr);
      });
      rolagem.appendChild(tab);
      corpo.appendChild(rolagem);
    },
    [
      { classe: "btn-ghost", html: "Voltar" },
      {
        classe: "btn-primary",
        html: ICONE_LAPIS_BT + "Personalizar perfil",
        acao: aoPersonalizar,
      },
    ],
  );
}

/* ============================================================
   UI dos perfis — compartilhada pelo BT individual (Etapa 5) e
   pelo modo calculadora do coletivo/múltiplas torres (menos de 4
   apartamentos residenciais).
   ------------------------------------------------------------
   Cada UC escolhe um perfil pronto ou um "Perfil personalizado".
   Escolher só PREENCHE u.cargas; o editor ("Personalizar perfil")
   é a calculadora de sempre (montarCargasBT) sobre um rascunho —
   Cancelar descarta, Confirmar vira o personalizado.

   Quem monta a grade passa um contexto:
     ctx = {
       chave,          // identifica a UC/grupo (índice do imóvel no
                       // individual; "c<líder>" no coletivo;
                       // "t<torre>:<faixa>" nas torres)
       aoMudar(),      // re-render depois de escolher/fechar o editor
       aoAbrirEditor() // opcional: re-render ao abrir (padrão: aoMudar)
       comGerador,     // editor com "Possui gerador?" (só individual)
       avisoSemTipo,   // texto quando o tipo de propriedade não define
                       // uma família de perfis
     }
   ============================================================ */
// Editores abertos, por ctx.chave: { base, draft } — fora do state (é
// estado de tela; o que vale é u.perfilPers depois de confirmar).
const _editorPerfil = {};
const editorPerfilAbertoBT = () => Object.keys(_editorPerfil).length > 0;
const _geradorPadraoBT = () => ({
  possui: "Não",
  potencia: "",
  fonte: "",
  descricao: "",
});
const _cloneBT = (o) => JSON.parse(JSON.stringify(o));
// Sem os derivados (_demanda/_cargaKw/_disjuntores): são recalculados.
const _cargasLimpasBT = (c) => ({
  qtds: CAT.map((_, i) => (c.qtds || [])[i] || 0),
  tipoA: c.tipoA || "",
  catA: c.catA == null ? null : c.catA,
  mots: _cloneBT(c.mots || []),
});
// Perfil escolhido numa família que não vale mais (tipo/ramo mudou): a
// escolha e o personalizado caem e a carga volta a zero. true = zerou.
function revalidarPerfilBT(u) {
  if (!u.perfil && !u.perfilPers) return false;
  if (u.perfilFamilia === familiaPerfisBT(u)) return false;
  u.perfil = "";
  u.perfilPers = null;
  u.perfilFamilia = "";
  u.disjEscolhido = "";
  u.cargas = { qtds: CAT.map(() => 0), tipoA: "", catA: null, mots: [] };
  return true;
}
// Recalcula os derivados de carga/demanda/disjuntor de UMA UC a partir de
// u.cargas (a escolha de perfil já conta na demanda).
function recalcularCargasBT(u) {
  const d = Object.assign(
    { qtds: [], tipoA: "", catA: null, mots: [] },
    u.cargas || {},
  );
  d.qtds = CAT.map((_, i) => d.qtds[i] || 0);
  // A categoria segue o Tipo de propriedade atual (trocar de "Restaurantes"
  // para "Escritórios" não muda a família de perfis, mas muda a conta).
  const cat = infoTipoPropriedade(tipoPropriedadeDe(u)).catA;
  if (d.tipoA === "nr" && cat != null) d.catA = cat;
  const r = calcDemandaResultados(d, redeMonoBT());
  d._demanda = r.demandaTotal;
  d._cargaKw = r.cargaInstalada;
  d._disjuntores = r.disjuntores.map((x) => x.fx);
  u.cargas = d;
}
function selecionarPerfilBT(u, id, ctx) {
  if (id === "personalizado") {
    const pp = u.perfilPers;
    if (!pp) return;
    u.cargas = _cargasLimpasBT(pp.cargas);
    if (ctx.comGerador) u.gerador = _cloneBT(pp.gerador || _geradorPadraoBT());
    u.disjEscolhido = pp.disjEscolhido || "";
  } else {
    const p = perfilPorIdBT(id);
    if (!p) return;
    u.cargas = cargasDoPerfilBT(p, u);
    if (ctx.comGerador) u.gerador = _geradorPadraoBT();
    u.disjEscolhido = "";
  }
  u.perfil = id;
  u.perfilFamilia = familiaPerfisBT(u);
  recalcularCargasBT(u);
  ctx.aoMudar();
}
function abrirEditorPerfilBT(u, origem, ctx) {
  let base, cargas, gerador, disj;
  if (origem === "personalizado" && u.perfilPers) {
    base = u.perfilPers.base;
    cargas = _cargasLimpasBT(u.perfilPers.cargas);
    gerador = _cloneBT(u.perfilPers.gerador || _geradorPadraoBT());
    disj = u.perfilPers.disjEscolhido || "";
  } else {
    const p = perfilPorIdBT(origem);
    if (!p) return;
    base = origem;
    cargas = cargasDoPerfilBT(p, u);
    gerador = _geradorPadraoBT();
    disj = "";
  }
  // O rascunho imita a UC no que montarCargasBT/_ucGerador leem. `origem` e
  // `inicial` decidem, no Confirmar, se houve personalização de fato.
  _editorPerfil[ctx.chave] = {
    base,
    origem,
    inicial: _assinaturaEditorBT({ cargas, gerador, disjEscolhido: disj }),
    draft: {
      tipoPropriedade: tipoPropriedadeDe(u),
      atividade: u.atividade,
      cargas,
      gerador,
      disjEscolhido: disj,
      _acc: {},
    },
  };
  (ctx.aoAbrirEditor || ctx.aoMudar)();
}
// O que o usuário pode mudar no editor — equipamentos, motores, disjuntor e
// gerador —, normalizado para comparar a abertura com o Confirmar (tipoA/
// catA e os derivados ficam de fora: o editor os recalcula sozinho).
function _assinaturaEditorBT(d) {
  const c = d.cargas || {};
  const g = d.gerador || {};
  return JSON.stringify({
    qtds: CAT.map((_, i) => Number((c.qtds || [])[i]) || 0),
    mots: (c.mots || [])
      .filter((m) => (parseInt(m.q) || 0) > 0)
      .map((m) => [m.fase, parseFloat(m.cv), parseInt(m.q)]),
    disj: d.disjEscolhido || "",
    ger:
      g.possui === "Sim"
        ? [g.potencia || "", g.fonte || "", (g.descricao || "").trim()]
        : null,
  });
}
function fecharEditorPerfilBT(u, ctx, confirmar) {
  const ed = _editorPerfil[ctx.chave];
  delete _editorPerfil[ctx.chave];
  // Confirmar sem nada alterado a partir de um perfil pronto: só escolhe
  // aquele perfil — não nasce (nem é sobrescrito) um "Perfil personalizado".
  if (
    confirmar &&
    ed &&
    u &&
    ed.origem !== "personalizado" &&
    _assinaturaEditorBT(ed.draft) === ed.inicial
  ) {
    selecionarPerfilBT(u, ed.origem, ctx);
    return;
  }
  if (confirmar && ed && u) {
    u.perfilPers = {
      base: ed.base,
      cargas: _cargasLimpasBT(ed.draft.cargas),
      gerador: _cloneBT(ed.draft.gerador),
      disjEscolhido: ed.draft.disjEscolhido || "",
    };
    selecionarPerfilBT(u, "personalizado", ctx);
  } else ctx.aoMudar();
}
const _kwBT = (v) =>
  (Number(v) || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 });
// Linha com pontilhado entre o rótulo e o valor da direita (card de perfil).
function _linhaPerfilBT(htmlEsq, txtDir) {
  const l = document.createElement("div");
  l.className = "perfil-linha";
  l.innerHTML =
    `<span class="perfil-linha-nome">${htmlEsq}</span>` +
    (txtDir == null
      ? ""
      : `<span class="perfil-linha-pontos" aria-hidden="true"></span><span class="perfil-linha-qtd"></span>`);
  if (txtDir != null) l.lastChild.textContent = txtDir;
  return l;
}
const _escBT = (s) =>
  String(s == null ? "" : s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
// Card de perfil (svg9–12): rádio + título, descrição, 5 equipamentos,
// "Todos os equipamentos", resumo (carga/demanda/disjuntor) e "Personalizar".
function _perfilCardBT(o) {
  const card = document.createElement("div");
  card.className = "perfil-card" + (o.selecionado ? " is-selected" : "");
  const radio = document.createElement("button");
  radio.type = "button";
  radio.className =
    "toggle-btn perfil-card-radio" + (o.selecionado ? " on" : "");
  radio.setAttribute("role", "radio");
  radio.setAttribute("aria-checked", o.selecionado ? "true" : "false");
  radio.textContent = o.titulo;
  const desc = document.createElement("p");
  desc.className = "perfil-card-desc";
  desc.textContent = o.desc;
  const tab = document.createElement("div");
  tab.className = "perfil-card-tabela";
  const cab = document.createElement("div");
  cab.className = "perfil-linha perfil-linha--cab";
  cab.innerHTML = "<span>Equipamentos</span><span>Quantidade</span>";
  tab.appendChild(cab);
  o.linhas
    .slice(0, 5)
    .forEach((l) =>
      tab.appendChild(
        _linhaPerfilBT(
          `<strong>${_escBT(l.nome)}</strong>${l.pot ? " " + _escBT(l.pot) : ""}`,
          l.qtd,
        ),
      ),
    );
  const todos = document.createElement("button");
  todos.type = "button";
  todos.className = "btn btn-ghost perfil-card-todos";
  todos.textContent = "Todos os equipamentos";
  todos.addEventListener("click", () =>
    abrirModalEquipamentosBT(o.linhas, o.aoPersonalizar),
  );
  const resumo = document.createElement("div");
  resumo.className = "perfil-card-resumo";
  resumo.append(
    _linhaPerfilBT(
      `<strong>Carga total</strong> aprox. ${_kwBT(o.resumo.kw)} kW`,
      `aprox. ${o.resumo.n}`,
    ),
    _linhaPerfilBT(
      `<strong>Demanda total</strong> aprox. ${_kwBT(o.resumo.kva)} kVA`,
    ),
    _linhaPerfilBT(
      `<strong>Disjuntor adequado</strong> ${_escBT(o.resumo.disj || "—")}`,
    ),
  );
  const pers = document.createElement("button");
  pers.type = "button";
  pers.className = "perfil-card-personalizar";
  pers.innerHTML = ICONE_LAPIS_BT + "Personalizar perfil";
  pers.addEventListener("click", o.aoPersonalizar);
  card.append(radio, desc, tab, todos, resumo, pers);
  // O card inteiro escolhe o perfil (menos os botões de dentro).
  card.addEventListener("click", (e) => {
    if (e.target.closest("button") && e.target.closest("button") !== radio)
      return;
    if (!o.selecionado) o.aoSelecionar();
  });
  return card;
}
function _perfisGradeBT(u, ctx) {
  const grade = document.createElement("div");
  grade.className = "perfil-grid";
  const perfis = perfisDoImovel(u);
  const pp = u.perfilPers;
  if (pp) {
    const nBase = perfis.findIndex((p) => p.id === pp.base);
    const r = resumoCargasBT(pp.cargas);
    grade.appendChild(
      _perfilCardBT({
        titulo: "Perfil personalizado",
        desc:
          nBase >= 0
            ? `Baseado no Perfil ${nBase + 1}, com os equipamentos e o disjuntor que você ajustou.`
            : "Com os equipamentos e o disjuntor que você ajustou.",
        linhas: linhasCargasBT(pp.cargas),
        resumo: Object.assign(r, {
          disj: pp.disjEscolhido || r.disjuntores[0],
        }),
        selecionado: u.perfil === "personalizado",
        aoSelecionar: () => selecionarPerfilBT(u, "personalizado", ctx),
        aoPersonalizar: () => abrirEditorPerfilBT(u, "personalizado", ctx),
      }),
    );
  }
  perfis.forEach((p, i) => {
    const r = resumoCargasBT(cargasDoPerfilBT(p, u));
    grade.appendChild(
      _perfilCardBT({
        titulo: `Perfil ${i + 1}: ${p.titulo}`,
        desc: p.desc,
        linhas: linhasPerfilBT(p),
        resumo: Object.assign(r, { disj: r.disjuntores[0] }),
        selecionado: u.perfil === p.id,
        aoSelecionar: () => selecionarPerfilBT(u, p.id, ctx),
        aoPersonalizar: () => abrirEditorPerfilBT(u, p.id, ctx),
      }),
    );
  });
  return grade;
}
// Editor "Perfil personalizado" (svg11) dentro do card da UC.
function _perfilEditorBT(u, ctx) {
  const ed = _editorPerfil[ctx.chave];
  const d = ed.draft;
  const box = document.createElement("div");
  box.className = "perfil-editor";
  const voltar = document.createElement("button");
  voltar.type = "button";
  voltar.className = "perfil-editor-voltar";
  voltar.innerHTML =
    '<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 8l-4 4 4 4M16 12H8"/></svg>Voltar';
  voltar.addEventListener("click", () => fecharEditorPerfilBT(u, ctx, false));
  const tit = document.createElement("div");
  tit.className = "perfil-editor-titulo";
  tit.textContent = "Perfil personalizado";
  const txt = document.createElement("p");
  txt.className = "perfil-editor-texto";
  txt.textContent =
    "Adicione ou remova equipamentos para personalizar o perfil adequado ao seu imóvel.";
  const cargasBox = document.createElement("div");
  const calcBox = document.createElement("div");
  box.append(voltar, tit, txt, cargasBox);
  // Gerador de emergência: só no individual (_ucGerador mora no app dele).
  if (ctx.comGerador) box.appendChild(_ucGerador(d, ctx.chave));
  box.appendChild(calcBox);
  montarCargasBT(cargasBox, d, ctx.chave, () => _perfilCalcBT(calcBox, d));
  _perfilCalcBT(calcBox, d);
  const acoes = document.createElement("div");
  acoes.className = "perfil-editor-acoes";
  const cancelar = document.createElement("button");
  cancelar.type = "button";
  cancelar.className = "btn btn-ghost";
  cancelar.textContent = "Cancelar";
  cancelar.addEventListener("click", () => fecharEditorPerfilBT(u, ctx, false));
  const confirmar = document.createElement("button");
  confirmar.type = "button";
  confirmar.className = "btn btn-primary";
  confirmar.textContent = "Confirmar";
  confirmar.addEventListener("click", () => fecharEditorPerfilBT(u, ctx, true));
  acoes.append(cancelar, confirmar);
  box.appendChild(acoes);
  return box;
}
// Ícone (i) com dica flutuante (.cmg-hint) nos cards de carga e demanda.
function _infoKpiBT(label, texto) {
  return `<span class="resultado-card-info cmg-hint" tabindex="0" role="img" aria-label="${label}: ajuda" data-hint="${texto}"><img class="field-info" src="../imgs/info.svg" alt="" aria-hidden="true" /></span>`;
}
// "Informações calculadas de acordo com a seleção de equipamentos": carga e
// demanda do rascunho + disjuntor adequado ("Mais opções" abre o modal).
function _perfilCalcBT(box, d) {
  const c = d.cargas || {};
  const cargaKw = c._cargaKw || 0;
  const lista = c._disjuntores || [];
  if (d.disjEscolhido && !lista.includes(d.disjEscolhido)) d.disjEscolhido = "";
  const atual = d.disjEscolhido || lista[0] || "";
  box.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "perfil-calc divider";
  wrap.innerHTML =
    '<div class="perfil-calc-titulo">Informações calculadas de acordo com a seleção de equipamentos</div>';
  const grade = document.createElement("div");
  grade.className = "perfil-calc-grade";
  const kpis = document.createElement("div");
  kpis.className = "perfil-calc-kpis";
  const cardCarga = document.createElement("div");
  cardCarga.className =
    "resultado-card" + (cargaKw > 75 ? " resultado-card--warn" : "");
  cardCarga.innerHTML =
    _infoKpiBT(
      "Carga total calculada",
      "Soma das potências de todos os equipamentos e motores declarados neste imóvel.",
    ) +
    `<div class="resultado-card-label">Carga total calculada</div>` +
    `<div class="resultado-card-valor">${_kwBT(cargaKw)} kW</div>` +
    (cargaKw > 75
      ? `<div class="cmg-aviso cmg-aviso--warn" style="margin-bottom:0"><div class="cmg-aviso-icon" aria-hidden="true"></div><p class="cmg-aviso-texto">Sua carga instalada ultrapassa 75 kW, é obrigatório anexar a ART/TRT de projeto paga, planta situação, e formulário preenchido no APR Web.</p></div>`
      : "");
  const cardDem = document.createElement("div");
  cardDem.className = "resultado-card";
  cardDem.innerHTML =
    _infoKpiBT(
      "Demanda total calculada",
      "Estimativa da potência máxima usada ao mesmo tempo, calculada a partir da carga total com os fatores de demanda da norma Cemig ND-5.1. É ela que define o disjuntor adequado.",
    ) +
    `<div class="resultado-card-label">Demanda total calculada</div>` +
    `<div class="resultado-card-valor">${_kwBT(c._demanda || 0)} kVA</div>`;
  kpis.append(cardCarga, cardDem);
  const cardDisj = document.createElement("div");
  cardDisj.className = "resultado-card perfil-calc-disj";
  cardDisj.innerHTML =
    '<div class="resultado-card-label">Disjuntor adequado calculado para este imóvel</div>' +
    `<div class="resultado-card-valor">${atual ? _escBT(atual) : "—"}</div>`;
  if (lista.length > 1) {
    const mais = document.createElement("button");
    mais.type = "button";
    mais.className = "perfil-calc-mais";
    mais.textContent = "Mais opções";
    mais.addEventListener("click", () =>
      abrirModalDisjuntoresBT(lista, atual, (v) => {
        d.disjEscolhido = v;
        _perfilCalcBT(box, d);
      }),
    );
    cardDisj.appendChild(mais);
  } else if (!lista.length) {
    const hint = document.createElement("div");
    hint.className = "field-hint";
    hint.textContent = "Adicione equipamentos para ver o disjuntor adequado.";
    cardDisj.appendChild(hint);
  }
  grade.append(kpis, cardDisj);
  wrap.appendChild(grade);
  box.appendChild(wrap);
}
// Conteúdo de cargas de uma UC: o editor aberto, o aviso de tipo de
// propriedade sem perfis ou a grade de perfis.
function montarPerfisBT(corpo, u, ctx) {
  if (_editorPerfil[ctx.chave]) {
    corpo.appendChild(_perfilEditorBT(u, ctx));
    return;
  }
  if (!perfisDoImovel(u).length && !u.perfilPers) {
    const hint = document.createElement("div");
    hint.className = "cmg-aviso cmg-aviso--warn";
    hint.innerHTML = `<div class="cmg-aviso-icon" aria-hidden="true"></div><p class="cmg-aviso-texto">${ctx.avisoSemTipo}</p>`;
    corpo.appendChild(hint);
    return;
  }
  corpo.appendChild(_perfisGradeBT(u, ctx));
}
