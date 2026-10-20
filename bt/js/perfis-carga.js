/* ============================================================
   CEMIG BT individual — Perfis de carga (Etapa 5, spec Figma svg9–14)
   ------------------------------------------------------------
   Em vez de começar a calculadora do zero, cada imóvel oferece dois
   perfis prontos para o seu tipo de propriedade. Escolher um perfil
   apenas PREENCHE u.cargas (qtds/tipoA/catA/mots): a calculadora,
   a validação de disjuntores, a prévia e o PDF continuam lendo
   u.cargas como sempre. "Personalizar perfil" abre a calculadora
   (montarCargasBT) sobre uma cópia — ver individual-app.js.

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
   (calcDemandaResultados), shared/js/ramo-atividade.js (ramoCodigo),
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
  // Comercial com ramo de salão de beleza (CNAE 9602-5).
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

// Salão de beleza: CNAE 9602-5/01 e 9602-5/02 (shared/js/ramo-atividade.js).
const _ehSalaoBT = (u) => /^96025/.test(ramoCodigo(u.ramo || ""));

// Família de perfis do imóvel, pela atividade (Tipo de propriedade) e ramo.
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

// Objeto de cargas (shape de u.cargas) que o perfil representa.
function cargasDoPerfilBT(p, u) {
  return {
    qtds: cargasQtdsPorNome(
      p.itens.map((it) => ({ n: it.n, q: qtdPerfilBT(it) })),
    ),
    tipoA: _tipoAPerfilBT(u),
    catA: p.catA == null ? null : p.catA,
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

/* ===== Modais (padrão .cmg-modal — ver shared/js/pdf-sucesso.js) ===== */
function _modalPerfilBT(classe, tituloTxt, montarCorpo, botoes) {
  const overlay = document.createElement("div");
  overlay.className = "cmg-modal-overlay";
  const dialog = document.createElement("div");
  dialog.className = "cmg-modal cmg-modal-perfil " + classe;
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  const idTitulo = "cmg-modal-perfil-titulo";
  dialog.setAttribute("aria-labelledby", idTitulo);
  const anteriorFoco = document.activeElement;
  const fechar = () => {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
    if (anteriorFoco && anteriorFoco.focus && anteriorFoco.isConnected)
      anteriorFoco.focus();
  };
  const onKey = (e) => {
    if (e.key === "Escape") fechar();
  };
  const btnX = document.createElement("button");
  btnX.type = "button";
  btnX.className = "cmg-modal-fechar";
  btnX.setAttribute("aria-label", "Fechar");
  btnX.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  btnX.addEventListener("click", fechar);
  const corpo = document.createElement("div");
  corpo.className = "cmg-modal-conteudo";
  const titulo = document.createElement("h2");
  titulo.className = "cmg-modal-titulo";
  titulo.id = idTitulo;
  titulo.textContent = tituloTxt;
  corpo.appendChild(titulo);
  montarCorpo(corpo);
  const rodape = document.createElement("div");
  rodape.className = "cmg-modal-rodape";
  botoes.forEach((b) => {
    const el = document.createElement("button");
    el.type = "button";
    el.className = "btn btn-outlined-acao " + b.classe;
    el.innerHTML = b.html;
    el.addEventListener("click", () => {
      fechar();
      if (b.acao) b.acao();
    });
    rodape.appendChild(el);
  });
  dialog.append(btnX, corpo, rodape);
  overlay.appendChild(dialog);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fechar();
  });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(overlay);
  btnX.focus();
  return { dialog, fechar };
}
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
// "Mais opções de disjuntores" (svg14): select com as opções válidas.
function abrirModalDisjuntoresBT(lista, atual, aoConfirmar) {
  let sel = null;
  _modalPerfilBT(
    "cmg-modal-disj",
    "Mais opções de disjuntores",
    (corpo) => {
      sel = document.createElement("select");
      sel.innerHTML = lista
        .map((dj) => `<option value="${dj}">${dj}</option>`)
        .join("");
      sel.value = atual || lista[0] || "";
      corpo.appendChild(cmgCampo("Disjuntor", sel, "field--float"));
    },
    [
      { classe: "btn-ghost", html: "Voltar" },
      {
        classe: "btn-primary",
        html: "Confirmar",
        acao: () => aoConfirmar(sel.value),
      },
    ],
  );
}
