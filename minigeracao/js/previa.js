/* ============================================================
   MINIGERAÇÃO — Prévia do formulário (etapa 10, "Prévia & PDF")

   Desenho do Figma (previa.svg = subestação individual, previa2.svg =
   compartilhada, 17/11/2026): seções verdes, subtítulos por bloco,
   cartões-resumo (KPIs), transformador com chip de situação e setas
   atual → novo, painel cinza por cubículo e por fonte de geração e o
   cartão com a foto do modelo de subestação. Os componentes são os
   `previa-*` do shared.css — os mesmos do MT (mt/js/previa.js) e do BT.

   A prévia lê o `state` e os arrays do bloco técnico (trafosGD,
   cubiculosGD — js/subestacao.js) direto: é a forma do FORMULÁRIO, não a
   do PDF. Só entra o que a tela pergunta (sem "fantasmas"): cada campo
   abaixo tem um controle na etapa indicada pelo lápis. Ao acrescentar um
   campo ao formulário, acrescente-o aqui E no js/pdf.js.
   ============================================================ */

/* Etapa (índice de goTo) para onde o lápis de cada bloco leva. */
const PV_ETAPA_GD = {
  contato: 1,
  unidade: 2,
  atendimento: 3,
  geracao: 4,
  carga: 5,
  garantia: 6,
  conta: 7,
  observacoes: 8,
};

/* ===== Blocos de montagem (padrão previa-* do shared.css) ===== */
const _pvVazio = (v) =>
  v === undefined || v === null || String(v).trim() === "";
const _pvEsc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
/* "112.5" → "112,5"; texto que não é número passa como veio. */
function _pvNum(v) {
  const n = parseFloat(String(v).replace(",", "."));
  return isFinite(n) && /^\s*-?[\d.,]+\s*$/.test(String(v))
    ? n.toLocaleString("pt-BR", { maximumFractionDigits: 2 })
    : String(v);
}
const _pvFp = (v) => (_pvVazio(v) ? "" : _pvNum(v));
/* Valor + unidade ("600 kW"); vazio continua vazio (vira "—" no campo). */
const _pvUn = (v, un) =>
  _pvVazio(v) ? "" : un === "%" ? `${_pvNum(v)}%` : `${_pvNum(v)} ${un}`;
/* Rótulo do formulário sem a unidade entre parênteses: a unidade vai no
   valor ("Demanda de consumo atual (kW)" → "Demanda de consumo atual"). */
const _pvSemUn = (rot) => String(rot).replace(/\s*\([^)]*\)\s*$/, "");

function _pvLapis(step, rotulo) {
  return step != null
    ? `<button type="button" class="previa-edit" title="Editar" aria-label="Editar ${_pvEsc(rotulo)}" onclick="goTo(${step}, true)"></button>`
    : "";
}
/* Campo rótulo + valor. O valor é ESCAPADO (é texto digitado); `html: true`
   o deixa passar quando quem chama já montou a marcação. Sem `step` não há
   lápis — é o caso dos valores calculados. */
function pvCampo(label, valor, opts) {
  opts = opts || {};
  // Marcação própria vai num <span>: o .previa-campo-valor é flex, e cada nó
  // solto (texto + nota em itálico) viraria uma coluna.
  const v = _pvVazio(valor)
    ? "—"
    : opts.html
      ? `<span>${valor}</span>`
      : _pvEsc(valor);
  return (
    `<div class="previa-campo${opts.full ? " previa-campo--full" : ""}">` +
    `<div class="previa-campo-label">${label}</div>` +
    `<div class="previa-campo-valor">${v}${_pvLapis(opts.step, label)}</div></div>`
  );
}
const pvSecao = (titulo, corpo) =>
  `<div class="previa-secao"><h4 class="previa-secao-titulo">${titulo}</h4>${corpo}</div>`;
const PV_DIVISOR = '<hr class="previa-divider"/>';
const pvSub = (titulo) => `<h5 class="previa-subtitulo">${titulo}</h5>`;
/* Subtítulo de um item da lista (Modelo de módulo 1, Modelo de inversor 2). */
const pvSubItem = (titulo) =>
  `<h6 class="previa-subtitulo previa-subtitulo--item">${titulo}</h6>`;
const pvGrid = (campos) =>
  campos ? `<div class="previa-grid">${campos}</div>` : "";
/* Texto livre das Observações: em negrito e sem rótulo. */
const pvTextoLivre = (txt) =>
  `<p class="previa-texto">${_pvEsc(String(txt).trim()).replace(/\n/g, "<br>")}</p>`;
/* Chip de situação — o mesmo .trafo-status do card do formulário. */
const pvStatus = (texto, tom) =>
  texto ? `<span class="trafo-status is-${tom}">${texto}</span>` : "";
/* Cartões-resumo: uma linha com tantas colunas quantos forem os cartões. */
function pvCards(itens) {
  const lista = itens.filter(Boolean);
  if (!lista.length) return "";
  return (
    `<div class="previa-cards" style="--pv-cols:${lista.length}">` +
    lista
      .map(
        (i) =>
          `<div class="previa-card"><div class="previa-card-label">${i.label}</div>` +
          `<div class="previa-card-valor">${_pvVazio(i.valor) ? "—" : _pvEsc(i.valor)}</div></div>`,
      )
      .join("") +
    `</div>`
  );
}
/* Setas entre os cartões do equipamento atual e os do substituto. */
const pvSetas = (n) =>
  `<div class="previa-setas" style="--pv-cols:${n}" aria-hidden="true">` +
  // Seta em SVG (não o glifo "↓", que algumas fontes desenham colorido).
  '<span><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12l7 7 7-7"/></svg></span>'.repeat(
    n,
  ) +
  `</div>`;
/* Painel cinza de um item repetido: título + chip (+ situação). */
const pvPainel = (titulo, chip, status, corpo) =>
  `<div class="previa-painel"><div class="previa-painel-head">` +
  `<span class="previa-painel-titulo">${titulo}</span>` +
  (chip ? `<span class="previa-painel-chip">${_pvEsc(chip)}</span>` : "") +
  status +
  `</div>${corpo}</div>`;
/* Item SEM painel próprio (o transformador): título + chip + lápis. */
const pvBloco = (titulo, status, step, corpo) =>
  `<div class="previa-bloco"><div class="previa-bloco-titulo">${titulo}${status}${_pvLapis(step, titulo)}</div>` +
  corpo +
  `</div>`;

/* ===== Seções ===== */

function _pvContatoGD(d) {
  const E = PV_ETAPA_GD.contato;
  let prop =
    pvCampo("Nome completo ou Razão Social", d.titular, { full: true, step: E }) +
    pvCampo("E-mail", d.email, { step: E }) +
    pvCampo("Celular", d.celular, { step: E }) +
    (d.estrangeiro
      ? pvCampo("Nº do RNE/RNM", d.rne, { step: E })
      : pvCampo("CPF/CNPJ", d.cpfCnpj, { step: E }));
  // Campos de pessoa física: só existem com CPF válido (mostrarCamposPF).
  if (!d.estrangeiro && gdEhCpfValido()) {
    prop +=
      pvCampo("Filiação (Mãe ou Pai)", d.filiacao, { step: E }) +
      pvCampo("RG / RANI", d.rg, { step: E }) +
      pvCampo("Data de nascimento", d.nasc ? dataBR(d.nasc) : "", { step: E }) +
      pvCampo("Possui NIS para Tarifa Social?", d.nis, { step: E });
    if (d.nis === "Sim")
      prop += pvCampo("Número do NIS", d.numNis, { step: E });
    prop += pvCampo("Possui equipamento essencial à vida?", d.laudoMedico, {
      step: E,
    });
  }
  const rt =
    pvCampo("Nome completo ou Razão Social", d.rtNome, { full: true, step: E }) +
    pvCampo("E-mail", d.rtEmail, { step: E }) +
    pvCampo("Celular", d.rtCelular, { step: E });
  return pvSecao(
    "Dados para contato",
    pvSub("Dados do proprietário") +
      pvGrid(prop) +
      pvSub("Dados do responsável técnico") +
      pvGrid(rt),
  );
}

function _pvUnidadeGD(d) {
  const E = PV_ETAPA_GD.unidade;
  const rural = d.localizacao === "Rural";
  let c = pvCampo("Tipo de propriedade", d.tipoPropriedade, { step: E });
  if (_ramoAplicaGD())
    c += pvCampo("Ramo da atividade", d.ramoAtividade, { step: E });
  c += pvCampo("Zona de localização", d.localizacao, { step: E });
  c += rural
    ? pvCampo("Distrito / Comunidade / Região", d.distritoComunidade, {
        step: E,
      }) +
      pvCampo("Nome da propriedade", d.nomePropriedade, { step: E }) +
      pvCampo("Ponto de referência", d.pontoRef, { step: E }) +
      pvCampo("Cidade", d.municipio, { step: E }) +
      pvCampo("Estado", d.estado, { step: E }) +
      pvCampo("Nº instalação / UC / medidor mais próxima", d.instProxima, {
        step: E,
      })
    : pvCampo("CEP", d.cep, { step: E }) +
      pvCampo("Endereço", d.logradouro, { step: E }) +
      pvCampo("Número", d.numero, { step: E }) +
      pvCampo("Bairro", d.bairro, { step: E }) +
      pvCampo("Cidade", d.municipio, { step: E }) +
      pvCampo("Estado", d.estado, { step: E });
  c +=
    pvCampo(
      "Coordenadas",
      [d.latitude, d.longitude].filter(Boolean).join(" , "),
      { step: E },
    ) +
    pvCampo(
      "Coordenada UTM",
      d.utmE ? `Fuso ${d.fuso} · E ${d.utmE} · N ${d.utmN}` : "",
    );
  if (d.restricaoAmbiental === "Sim")
    c += pvCampo(
      "Área de restrição ambiental",
      `<span class="restricao-destaque">${_pvEsc(d.restricoesTexto || "Sim").replace(/\n/g, "<br>")}</span>`,
      { full: true, step: E, html: true },
    );
  return pvSecao("Dados da unidade consumidora", pvGrid(c));
}

/* Par de demanda (atual / a contratar) de um transformador ou cubículo — os
   mesmos que o card mostra (_paresPotenciaGD). */
function _pvDemandaGD(o, step) {
  const p = _paresPotenciaGD();
  let c = "";
  if (p.verAtual)
    c += pvCampo(_pvSemUn(GD_ROTULOS_DEMANDA.atual), _pvUn(o.demandaAtual, "kW"), {
      step,
    });
  if (p.verNovaOuFutura)
    c += pvCampo(
      _pvSemUn(p.nova ? GD_ROTULOS_DEMANDA.nova : GD_ROTULOS_DEMANDA.futura),
      _pvUn(o.demanda, "kW"),
      { step },
    );
  return c;
}
/* Tarifação da conexão nova (Verde/Azul, escalonada) — instalação ou
   cubículo. */
const _pvTarifaGD = (obj, step) =>
  gdTarifaLinhas(obj)
    .map(([r, v]) => pvCampo(r, v, { step, full: /^Etapa/.test(r) }))
    .join("");

/* Transformador: chip de situação, par de demanda e os cartões de potência,
   ligação e impedância. Num trafo substituído, dois andares: atual → novo. */
function _pvTrafoGD(t, i, step, comDemanda) {
  const troca = _permiteTrocaTrafoGD();
  const sit = _situacaoTrafoGD(t);
  const subst = troca && sit === "troca";
  const semAlt = troca && sit === "sem";
  const status = troca
    ? pvStatus(
        subst ? "Substituído" : semAlt ? "Mantido" : "Novo",
        subst ? "substituido" : semAlt ? "existente" : "novo",
      )
    : "";
  const cartoes = (pot, lig, imp, novo) =>
    pvCards([
      { label: novo ? "Nova potência" : "Potência", valor: _pvUn(pot, "kVA") },
      { label: novo ? "Novo tipo de ligação" : "Tipo de ligação", valor: lig },
      { label: novo ? "Nova impedância" : "Impedância", valor: _pvUn(imp, "%") },
    ]);
  const corpo =
    (comDemanda ? pvGrid(_pvDemandaGD(t, step)) : "") +
    cartoes(t.potencia, t.tipoLigacao, t.impedancia) +
    (subst
      ? pvSetas(3) +
        cartoes(t.novaPotencia, t.novaTipoLigacao, t.novaImpedancia, true)
      : "");
  return pvBloco(`Transformador ${i + 1}`, status, step, corpo);
}

function _pvCubiculoGD(c, i, total, step) {
  const status = _permiteTrocaTrafoGD()
    ? pvStatus(
        c.existente ? "Já existente" : "Novo",
        c.existente ? "existente" : "novo",
      )
    : "";
  let campos = "";
  if (temInstalacaoCubiculoGD())
    campos += pvCampo("Nº da instalação", c.instalacao, { step });
  campos +=
    pvCampo("Quantidade de transformadores", String(c.trafos.length || ""), {
      step,
    }) + _pvDemandaGD(c, step);
  if (gdTarifaAplica()) campos += _pvTarifaGD(c, step);
  return pvPainel(
    "Cubículo",
    `${i + 1} de ${total}`,
    status,
    pvGrid(campos) +
      c.trafos.map((t, j) => _pvTrafoGD(t, j, step, false)).join(""),
  );
}

/* Cartão com a foto do modelo de subestação escolhido: rótulo, lápis e o
   (i) que amplia a foto — o mesmo da galeria. */
function _pvSubestacaoGD(titulo, valor, step) {
  if (_pvVazio(valor)) return "";
  const n = (String(valor).match(/(\d+)/) || [])[1];
  const imgs =
    typeof SUBESTACAO_IMGS_B64 !== "undefined" ? SUBESTACAO_IMGS_B64 : {};
  const img = n && imgs[n];
  const nome = gdRotuloModeloSE(valor);
  return (
    pvSub(titulo) +
    `<div class="previa-midia previa-midia--linha">` +
    (img ? `<img src="${img}" alt="" />` : "") +
    `<div class="previa-midia-legenda"><div>${_pvEsc(nome)}</div>${_pvLapis(step, nome)}` +
    (img
      ? `<button type="button" class="previa-info" aria-label="Ampliar a foto da ${_pvEsc(nome)}" onclick="gdAmpliarFiguraSE('${_pvEsc(valor)}')"><img src="../imgs/info.svg" alt="" aria-hidden="true"></button>`
      : "") +
    `</div></div>`
  );
}
function _pvRamalGD(step) {
  const idx = state.ramalIndice;
  if (idx == null || typeof CalculoMT === "undefined") return "";
  return (
    pvSub("Ramal de entrada") +
    `<div class="previa-midia previa-midia--ramal">` +
    `<img src="${GD_RAMAL_IMG(idx)}" alt="Figura do ramal de entrada ${idx}" />` +
    `<div class="previa-midia-legenda"><div>${_pvEsc(CalculoMT.textoRamal(idx))}</div>${_pvLapis(step, "Ramal de entrada")}</div></div>`
  );
}

function _pvAtendimentoGD(d) {
  const E = PV_ETAPA_GD.atendimento;
  const compart = d.entradaEnergia === GD_ENTRADA_COMPARTILHADA;
  const nova = _ehLigacaoNova();
  // Cartões-resumo: os mesmos totais do resumo da etapa (renderResumoSEGD).
  let kpis = "";
  if (d.potTotalTrafos > 0) {
    const dem = demandaRepresentativaGD();
    const disj =
      d.cargaDisjEscolhido ||
      ((d.cargas && d.cargas._disjuntores) || [])[0] ||
      "";
    kpis = pvCards([
      {
        label: "Demanda de consumo a contratar",
        valor: dem > 0 ? _pvUn(dem, "kW") : "",
      },
      {
        label: "Potência total dos transformadores",
        valor: _pvUn(d.potTotalTrafos, "kVA"),
      },
      {
        label: "Quantidade total de transformadores",
        valor: String(d.qtdTotalTrafos ?? ""),
      },
      // Só quando o Formulário de Carga calculou um disjuntor.
      disj ? { label: "Disjuntor adequado", valor: disj } : null,
    ]);
  }
  const sol = GD_SOLICITACOES.find((s) => s.valor === d.solicitacao);
  let campos = pvCampo("Tipo de solicitação", sol ? sol.texto : d.solicitacao, {
    full: true,
    step: E,
  });
  if (d.solicitacao && !nova)
    campos += pvCampo("Nº da unidade/instalação", d.instalacao, { step: E });
  campos +=
    pvCampo(
      "Tensão da conexão",
      d.tensaoAtendimento ? _rotuloTensaoGD(d.tensaoAtendimento) : "",
      { step: E },
    ) + pvCampo("Tipo de edificação", d.entradaEnergia, { step: E });
  if (compart)
    campos += pvCampo("Sobre a subestação", d.subestacaoExistente, { step: E });
  else if (gdTarifaAplica()) campos += _pvTarifaGD(d, E);

  const equipamentos = compart
    ? cubiculosGD
        .map((c, i) => _pvCubiculoGD(c, i, cubiculosGD.length, E))
        .join("")
    : trafosGD.map((t, i) => _pvTrafoGD(t, i, E, true)).join("");

  // Subestação: na conexão nova, o modelo escolhido; na alteração, a atual e,
  // havendo troca, a nova.
  const se = nova
    ? _pvSubestacaoGD("Subestação", d.cn_tipoSE, E)
    : _pvSubestacaoGD("Subestação atual", d.alt_tipoAtual, E) +
      (d.alt_troca === "Sim"
        ? _pvSubestacaoGD("Nova subestação", d.alt_tipoPara, E)
        : "");
  const ramal = gdTarifaAplica() ? _pvRamalGD(E) : "";

  let fim = pvCampo(
    "O telhado será arrendado para pessoa/empresa diferente do proprietário?",
    d.telhadoArrendado,
    { step: E },
  );
  if (_temSubestacaoExistenteGD())
    fim += pvCampo("A subestação precisa ser mudada de local?", d.mudancaSE, {
      step: E,
    });
  if (d.telhadoArrendado === "Sim")
    fim +=
      pvCampo("Nº da unidade arrendada", d.arrendUC, { step: E }) +
      pvCampo("Nível de tensão da unidade arrendada", d.arrendTensao, {
        step: E,
      });
  if (d.mudancaSE === "Sim")
    fim += pvCampo(
      "Coordenadas do novo local da subestação",
      [d.mudLatitude, d.mudLongitude].filter(Boolean).join(" , "),
      { full: true, step: E },
    );

  return pvSecao(
    "Tipo de atendimento",
    kpis +
      pvGrid(campos) +
      equipamentos +
      se +
      ramal +
      `<div class="previa-secao-bloco">${pvGrid(fim)}</div>`,
  );
}

/* ----- Geração ----- */
const _PV_MODO_OPERACAO = {
  Padrão: "Padrão com injeção de créditos (sem restrições de uso)",
  "Grid Zero": "Grid Zero (sem injeção na rede)",
};

/* Lista de modelos (módulos ou inversores): um subtítulo por modelo. */
function _pvModelosGD(lista, nomeItem, rotuloQtd, step) {
  return (lista || [])
    .map((m, k) => {
      const tot =
        (parseFloat(m.potNominal) || 0) * (parseFloat(m.quantidade) || 0);
      return (
        pvSubItem(`Modelo de ${nomeItem} ${k + 1}`) +
        pvGrid(
          pvCampo("Modelo", m.modelo, { step }) +
            pvCampo("Fabricante", m.fabricante, { step }) +
            pvCampo("Potência nominal", _pvUn(m.potNominal, "kW"), { step }) +
            pvCampo(rotuloQtd, m.quantidade, { step }) +
            pvCampo("Potência total calculada", tot ? _pvUn(tot, "kW") : ""),
        )
      );
    })
    .join("");
}
function _pvFonteGD(f, i) {
  const E = PV_ETAPA_GD.geracao;
  const titulo = ["Fonte primária", "Fonte secundária"][i] || `Fonte ${i + 1}`;
  const base =
    pvCampo("Fonte de geração", f.fontePrimaria, { step: E }) +
    pvCampo("Tecnologia da geração", f.tipoGeracao, { step: E });
  let corpo = "";
  if (f.fontePrimaria === "Solar") {
    corpo =
      pvCards([
        { label: "Potência de geração solar", valor: _pvUn(f.potencia, "kW") },
        { label: "Potência dos módulos", valor: _pvUn(f.potTotalModulos, "kW") },
        {
          label: "Potência dos inversores",
          valor: _pvUn(f.potTotalInversores, "kW"),
        },
      ]) +
      pvGrid(base) +
      pvSub("Módulos da central geradora fotovoltaica") +
      pvGrid(
        pvCampo("Quantidade de modelos", String((f.modulos || []).length || ""), {
          step: E,
        }) + pvCampo("Área ocupada", _pvUn(f.areaArranjos, "m²"), { step: E }),
      ) +
      _pvModelosGD(f.modulos, "módulo", "Quantidade de módulos deste modelo", E) +
      PV_DIVISOR +
      pvSub("Inversores da central geradora fotovoltaica") +
      pvGrid(
        pvCampo(
          "Quantidade de modelos",
          String((f.inversores || []).length || ""),
          { step: E },
        ) +
          pvCampo("Tensão da conexão", _pvUn(f.tensaoConexaoInversor, "V"), {
            step: E,
          }),
      ) +
      _pvModelosGD(
        f.inversores,
        "inversor",
        "Quantidade de inversores deste modelo",
        E,
      );
  } else if (f.fontePrimaria === "Hidráulica") {
    const barragem = GD_BARRAGEM_PERGUNTAS.map((p) => {
      const op = (p.opcoes || []).find((o) => o.valor === f[p.chave]);
      const v = _pvVazio(f[p.chave])
        ? ""
        : _pvEsc(f[p.chave]) +
          (op && op.sub
            ? ` <span class="previa-campo-nota">(${_pvEsc(op.sub)})</span>`
            : "");
      return pvCampo(p.rotulo, v, { step: E, html: true });
    }).join("");
    corpo =
      pvGrid(
        base +
          pvCampo("Potência aparente", _pvUn(f.hidroPotAparente, "kVA"), {
            step: E,
          }) +
          pvCampo("Potência instalada", _pvUn(f.hidroPotInstalada, "kW"), {
            step: E,
          }) +
          pvCampo("Fator de potência", _pvFp(f.hidroFatorPotencia), { step: E }) +
          pvCampo("Tensão", _pvUn(f.hidroTensao, "kV"), { step: E }) +
          pvCampo("Nív. Oper. Normal Jusante", _pvUn(f.hidroNivelJusante, "m"), {
            step: E,
          }) +
          pvCampo(
            "Nív. Oper. Normal Montante",
            _pvUn(f.hidroNivelMontante, "m"),
            { step: E },
          ) +
          pvCampo("Nome do rio", f.hidroRio, { step: E }) +
          pvCampo("Sub-bacia", f.hidroSubBacia, { step: E }),
      ) +
      PV_DIVISOR +
      pvSub("Segurança de barragens") +
      pvGrid(
        pvCampo(
          "A altura da barragem, contada do ponto mais baixo da fundação à crista, é maior ou igual a 15m (quinze metros)?",
          f.hidroBarragemAltura,
          { full: true, step: E },
        ) + barragem,
      );
  } else if (GD_FONTES_CENTRAL_TERMICA.includes(f.fontePrimaria)) {
    corpo =
      pvGrid(base) +
      pvSub(GD_TITULO_CENTRAL_TERMICA[f.fontePrimaria] || "Dados da central geradora") +
      pvGrid(
        pvCampo("Potência aparente", _pvUn(f.bioPotAparente, "kVA"), { step: E }) +
          pvCampo("Potência instalada", _pvUn(f.bioPotInstalada, "kW"), {
            step: E,
          }) +
          pvCampo("Combustível", f.bioCombustivel, { step: E }) +
          pvCampo("Nº do Despacho de qualificação", f.bioDespachoQualificacao, {
            step: E,
          }) +
          pvCampo("Máq. Motriz", f.bioMaqMotriz, { step: E }) +
          pvCampo("Ciclo Termodin.", f.bioCicloTermodinamico, { step: E }) +
          pvCampo("Fator de potência", _pvFp(f.bioFatorPotencia), { step: E }),
      );
  } else if (f.fontePrimaria === "Eólica") {
    corpo =
      pvGrid(base) +
      pvSub("Dados da central geradora eólica") +
      pvGrid(
        pvCampo("Quantidade de aerogeradores", f.eolQtdAerogeradores, {
          step: E,
        }) +
          pvCampo("Potência instalada", _pvUn(f.eolPotInstalada, "kW"), {
            step: E,
          }) +
          pvCampo("Fabricante dos aerogeradores", f.eolFabricante, { step: E }) +
          pvCampo("Modelo dos aerogeradores", f.eolModelo, { step: E }) +
          pvCampo("Altura da pá", _pvUn(f.eolAlturaPa, "m"), { step: E }) +
          pvCampo("Eixo do rotor", f.eolEixoRotor, { step: E }) +
          pvCampo("Fator de potência", _pvFp(f.eolFatorPotencia), { step: E }),
      );
  } else corpo = pvGrid(base);
  // Outorga: campos opcionais — o bloco só entra havendo algo preenchido.
  const outorga = [
    ["CEG do empreendimento", f.ceg],
    ["Nº do Ato de Outorga/Registro", f.numAtoOutorga],
    ["Ano do Ato", f.anoAtoOutorga],
    ["Tipo do Ato de Outorga/Registro", f.tipoAtoOutorga],
    ["Nome da Usina", f.nomeUsina],
  ];
  if (outorga.some(([, v]) => !_pvVazio(v)))
    corpo +=
      PV_DIVISOR +
      pvSub("Outorga do empreendimento") +
      pvGrid(outorga.map(([r, v]) => pvCampo(r, v, { step: E })).join(""));
  return pvPainel(titulo, f.fontePrimaria, "", corpo);
}

function _pvGeracaoGD(d) {
  const E = PV_ETAPA_GD.geracao;
  const fontes = d.fontes || [];
  const gz = d.gridZero === "Sim";
  const kpis = pvCards([
    { label: "Fonte primária", valor: (fontes[0] || {}).fontePrimaria },
    fontes.length > 1
      ? { label: "Fonte secundária", valor: fontes[1].fontePrimaria }
      : null,
    {
      label: "Potência ativa instalada total de geração",
      valor: _pvUn(d.potAtivaInstalada, "kW"),
    },
  ]);
  let c = pvCampo(
    "Qual a modalidade de operação do sistema?",
    _PV_MODO_OPERACAO[d.modoOperacao] || d.modoOperacao,
    { full: true, step: E },
  );
  if (gz)
    c += pvCampo(
      "Dispensa da análise de inversão de fluxo (art. 73-A)",
      d.decl95 ? "Solicitada" : "Não solicitada",
      { full: true, step: E },
    );
  c +=
    pvCampo("Modalidade de compensação", d.modalidade, { step: E }) +
    pvCampo("Demanda de geração a contratar", _pvUn(d.demandaGeracao, "kW"), {
      step: E,
    });
  if (!gz)
    c += pvCampo("Qtde. de UCs beneficiadas", d.qtdInstalacoesCredito, {
      step: E,
    });
  c += pvCampo("Quantidade de fontes de geração", String(fontes.length || ""), {
    step: E,
  });
  if (d.solicitacao === GD_SOLICITACAO_ALTERA_GERACAO)
    c += pvCampo("Potência de geração (GD) atual", _pvUn(d.potGeracaoAtual, "kW"), {
      step: E,
    });
  if (d.modalidade === "Geração Compartilhada")
    c +=
      pvCampo("Anexou contrato de constituição?", d.anexouContrato, {
        step: E,
      }) +
      pvCampo("Documentação do consórcio verificada?", d.consorcioVerificado, {
        step: E,
      });
  c += pvCampo(
    "Possui Grupo Motor Gerador de Emergência em Paralelo com a Cemig?",
    d.geradorEmergencia,
    { full: true, step: E },
  );
  if (d.geradorEmergencia === "Sim")
    c += pvCampo("Potência do gerador", _pvUn(d.geradorPotencia, "kVA"), {
      step: E,
    });
  return pvSecao(
    "Dados da geração",
    kpis +
      pvGrid(c) +
      `<div class="previa-secao-bloco">${fontes.map(_pvFonteGD).join("")}</div>` +
      pvSub("Armazenamento de energia") +
      pvGrid(
        armazLinhasGD(d)
          .map(([r, v]) => pvCampo(r, v, { step: E }))
          .join(""),
      ),
  );
}

function _pvGarantiaGD(d) {
  const E = PV_ETAPA_GD.garantia;
  const c = gdExigeGFC(d)
    ? pvCampo("Forma de apresentação da garantia", d.garantiaForma, {
        step: E,
      }) +
      pvCampo("Valor da garantia do Fiel Cumprimento", "R$ " + fmt2(gdCalcularGFC(d)))
    : pvCampo(
        "Garantia de fiel cumprimento",
        "Não é necessária para esta solicitação",
        { full: true, step: E },
      );
  return pvSecao("Fiel Cumprimento", pvGrid(c));
}

function _pvContaGD(d) {
  const E = PV_ETAPA_GD.conta;
  const v = d.corrAlternativa;
  let c = "";
  if (v === "E-mail informado")
    c += pvCampo("E-mail para receber a fatura", d.email, { step: E });
  else if (v === "Outro e-mail")
    c += pvCampo("E-mail para receber a fatura", d.corrOutroEmail, { step: E });
  else if (v === "Mesmo da obra")
    c += pvCampo("Endereço para receber a fatura", "Endereço da unidade", {
      step: E,
    });
  else if (v === "Endereço novo")
    c += pvCampo(
      "Endereço para receber a fatura",
      [
        [d.corrRua, d.corrNum].filter(Boolean).join(", "),
        d.corrCompl,
        d.corrBairro,
        [d.corrMunicipio, d.corrEstado].filter(Boolean).join("/"),
        d.corrCep,
      ]
        .filter(Boolean)
        .join(" · "),
      { full: true, step: E },
    );
  else if (v === "Conta globalizada")
    c += pvCampo("Conta globalizada", d.contaGlobal, { step: E });
  else c += pvCampo("Como deseja receber a fatura?", "", { step: E });
  c += pvCampo(
    "Data de vencimento da fatura",
    d.vencimento ? `Todo dia ${d.vencimento}` : "",
    { step: E },
  );
  return pvSecao("Conta de luz", pvGrid(c));
}

/* ===== Render ===== */
function renderPreviewGD() {
  // Aquecimento do jsPDF (carga sob demanda): chegar nesta etapa é o melhor
  // sinal de que o PDF vem a seguir. Sem await — não bloqueia a renderização.
  window.CemigLibs.jspdf().catch(() => {});
  syncState();
  const d = state;
  const v = validarExportacao();
  const faltasBox = $("#revFaltas");
  if (faltasBox)
    faltasBox.innerHTML = v.ok
      ? '<div class="rev-ok">Todos os campos obrigatórios preenchidos. Pronto para exportar.</div>'
      : '<div class="rev-faltas"><strong>Preencha os campos obrigatórios antes de exportar:</strong><ul>' +
        v.faltas.map((f) => `<li>${f}</li>`).join("") +
        "</ul></div>";
  const secoes = [
    _pvContatoGD(d),
    _pvUnidadeGD(d),
    _pvAtendimentoGD(d),
    _pvGeracaoGD(d),
    _pvGarantiaGD(d),
    _pvContaGD(d),
  ];
  // Observações: só entra quando há texto.
  if ((d.obs || "").trim())
    secoes.push(pvSecao("Observações", pvTextoLivre(d.obs)));
  const content = $("#previewContent");
  if (content) content.innerHTML = secoes.join(PV_DIVISOR);
  const btn = $("#btnExportarPDF");
  if (btn) btn.disabled = !v.ok;
  // O PDF de Análise de Partida só existe havendo motor pesado — mesma
  // condição com que o MT oferece o documento na prévia dele.
  const btnPartida = $("#btnExportarPartida");
  if (btnPartida)
    btnPartida.style.display = motoresPesadosGD(d).length ? "" : "none";
}
