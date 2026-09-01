/* ============================================================
   CEMIG MT — Prévia do formulário (etapa "Prévia & PDF")

   Desenha a etapa 9 no padrão do Figma (svg_MT1…svg_MT4): seções
   verdes, subtítulos por bloco, painéis cinza para os itens
   repetidos (cubículo, motor), cartões-resumo dos transformadores,
   tabelas de demanda escalonada e cartões de mídia (modelo de
   subestação e desenho do ramal). Os componentes são os `previa-*`
   do shared.css — os MESMOS que o BT usa.

   Por que a prévia lê o `state` direto, e não o modelo neutro de
   mt/js/conteudo.js: aquele modelo descreve o DOCUMENTO (PDF), onde
   transformadores e motores saem em tabelas compactas. A tela pede a
   forma do formulário — um painel por item, com chip de situação e
   cartões —, que o renderizador do jsPDF não sabe desenhar. Cada
   mídia tem a sua forma; o dado é o mesmo `state`. Ao acrescentar um
   campo ao formulário, acrescente-o aqui E em conteudo.js.
   ============================================================ */

/* Etapa (índice 0-based de goTo) para onde o lápis de cada campo leva. */
const PV_ETAPA = {
  contato: 1,
  empreendimento: 2,
  atendimento: 3,
  subestacao: 4,
  ramal: 5,
  correspondencia: 6,
  observacoes: 7,
};

/* ===== Blocos de montagem (padrão previa-* do shared.css) ===== */
const _pvVazio = (v) =>
  v === undefined || v === null || String(v).trim() === "";
/* "600" + "kVA" → "600 kVA"; valor vazio continua vazio (vira "—" no campo).
   O símbolo de porcentagem cola no número ("8%"), como no resto do form. */
const _pvUn = (v, un) =>
  _pvVazio(v) ? "" : un === "%" ? `${v}%` : `${v} ${un}`;

function pvCampo(label, valor, opts) {
  opts = opts || {};
  const lapis =
    opts.step != null
      ? `<button type="button" class="previa-edit" title="Editar" aria-label="Editar ${label}" onclick="goTo(${opts.step}, true)"></button>`
      : "";
  return (
    `<div class="previa-campo${opts.full ? " previa-campo--full" : ""}">` +
    `<div class="previa-campo-label">${label}</div>` +
    `<div class="previa-campo-valor">${_pvVazio(valor) ? "—" : valor}${lapis}</div></div>`
  );
}
function pvSecao(titulo, corpo) {
  return (
    `<div class="previa-secao"><h4 class="previa-secao-titulo">${titulo}</h4>` +
    corpo +
    `</div>`
  );
}
const PV_DIVISOR = '<hr class="previa-divider"/>';
const pvSub = (titulo) => `<h5 class="previa-subtitulo">${titulo}</h5>`;
const pvGrid = (campos) => `<div class="previa-grid">${campos}</div>`;

/* Chip de situação do transformador/cubículo — mesmo componente do card do
   formulário (.trafo-status, shared.css). */
function pvStatus(texto, tom) {
  return texto ? `<span class="trafo-status is-${tom}">${texto}</span>` : "";
}
/* Painel cinza de um item repetido: "Motor" + chip "1 de 2" (+ situação). */
function pvPainel(titulo, chip, status, corpo) {
  return (
    `<div class="previa-painel"><div class="previa-painel-head">` +
    `<span class="previa-painel-titulo">${titulo}</span>` +
    (chip ? `<span class="previa-painel-chip">${chip}</span>` : "") +
    status +
    `</div>${corpo}</div>`
  );
}
/* Item repetido SEM painel próprio (o transformador): título + chip + lápis. */
function pvBloco(titulo, status, step, corpo) {
  const lapis =
    step != null
      ? `<button type="button" class="previa-edit" title="Editar" aria-label="Editar ${titulo}" onclick="goTo(${step}, true)"></button>`
      : "";
  return (
    `<div class="previa-bloco"><div class="previa-bloco-titulo">${titulo}${status}${lapis}</div>` +
    corpo +
    `</div>`
  );
}
/* Linha de cartões rótulo/valor (potência, inrush…). */
function pvCards(itens) {
  return (
    `<div class="previa-cards previa-cards--auto">` +
    itens
      .map(
        (i) =>
          `<div class="previa-card"><div class="previa-card-label">${i.label}</div>` +
          `<div class="previa-card-valor">${_pvVazio(i.valor) ? "—" : i.valor}</div></div>`,
      )
      .join("") +
    `</div>`
  );
}
/* Setas entre os cartões do equipamento atual e os do substituto. */
function pvSetas(n) {
  return (
    `<div class="previa-setas" aria-hidden="true">` +
    "<span>↓</span>".repeat(n) +
    `</div>`
  );
}
/* Faixa de valores calculados (resultado elétrico do motor) — mesma tira
   cinza do card do formulário. */
function pvFaixa(itens) {
  return (
    `<div class="motor-card-calc">` +
    itens
      .map(
        (i) =>
          `<div class="item"><span class="lbl">${i.label}</span><span class="val">${_pvVazio(i.valor) ? "—" : i.valor}</span></div>`,
      )
      .join("") +
    `</div>`
  );
}
/* Tabela da prévia (demanda escalonada). A última coluna leva o lápis. */
function pvTabela(headers, rows, step) {
  if (!rows.length) return "";
  const acao = step != null;
  const th =
    headers.map((h) => `<th>${h}</th>`).join("") + (acao ? "<th></th>" : "");
  const tb = rows
    .map(
      (r) =>
        "<tr>" +
        r.map((v) => `<td>${_pvVazio(v) ? "—" : v}</td>`).join("") +
        (acao
          ? `<td class="previa-tabela-acao"><button type="button" class="previa-edit" title="Editar" aria-label="Editar etapa de demanda" onclick="goTo(${step}, true)"></button></td>`
          : "") +
        "</tr>",
    )
    .join("");
  return (
    `<div class="previa-tabela-wrap previa-secao-bloco"><table class="previa-tabela">` +
    `<thead><tr>${th}</tr></thead><tbody>${tb}</tbody></table></div>`
  );
}
/* Cartão de mídia: imagem escolhida pelo usuário + legenda.
   `linha` põe a miniatura à esquerda do rótulo (modelo de subestação);
   sem ela a imagem ocupa a largura toda e a legenda vem abaixo (ramal). */
function pvMidia(src, legenda, step, linha) {
  const lapis =
    step != null
      ? `<button type="button" class="previa-edit" title="Editar" aria-label="Editar seleção" onclick="goTo(${step}, true)"></button>`
      : "";
  return (
    `<div class="previa-midia${linha ? " previa-midia--linha" : ""}">` +
    (src ? `<img src="${src}" alt="" />` : "") +
    `<div class="previa-midia-legenda"><div>${legenda}</div>${lapis}</div></div>`
  );
}

/* ===== Seções ===== */

/* Campos de pessoa física só existem para CPF válido (mesma regra de
   mostrarCamposPF): num CNPJ eles são limpos e não devem virar "—" na tela. */
const _pvEhPF = () => CalculoMT.soDigitos(state.cpfCnpj || "").length === 11;

function _pvContato() {
  const E = PV_ETAPA.contato;
  let prop =
    pvCampo("Nome completo ou Razão Social", state.nome, {
      full: true,
      step: E,
    }) +
    pvCampo("E-mail", state.emailCliente, { step: E }) +
    pvCampo("Celular", state.telCliente, { step: E }) +
    pvCampo("CPF/CNPJ", state.cpfCnpj, { step: E });
  if (_pvEhPF()) {
    prop +=
      pvCampo("Filiação (Mãe ou Pai)", state.filiacao, { step: E }) +
      pvCampo("RG / RNE / RANI", state.rg, { step: E }) +
      pvCampo("Data de Nascimento", dataBR(state.nasc), { step: E }) +
      pvCampo("Possui equipamentos essenciais?", state.laudoMedico, {
        step: E,
      }) +
      pvCampo("Possui NIS para Tarifa Social?", state.nis, { step: E });
    if (state.nis === "Sim")
      prop += pvCampo("Número do NIS", state.numNis, { step: E });
  }
  const rt =
    pvCampo("Nome completo ou Razão Social", state.rtNome, {
      full: true,
      step: E,
    }) +
    pvCampo("E-mail", state.rtEmail, { step: E }) +
    pvCampo("Celular", state.rtCelular, { step: E });
  return pvSecao(
    "Dados para contato",
    pvSub("Dados do proprietário") +
      pvGrid(prop) +
      pvSub("Dados do responsável técnico") +
      pvGrid(rt),
  );
}

function _pvEmpreendimento() {
  const E = PV_ETAPA.empreendimento;
  const rural = state.localizacao === "Rural";
  let campos =
    pvCampo("Atividade principal", state.atividade, { step: E }) +
    pvCampo("Ramo da atividade", ramoParaPdf(state.ramoAtividade), {
      step: E,
    }) +
    pvCampo("Área do empreendimento", state.localizacao, { step: E }) +
    pvCampo("CEP", state.uc_cep, { step: E });
  campos += rural
    ? pvCampo("Distrito / Comunidade / Região", state.rur_distrito, {
        step: E,
      }) +
      pvCampo("Nome da propriedade", state.rur_propriedade, { step: E }) +
      pvCampo("Cidade / Município", state.uc_municipio, { step: E }) +
      pvCampo("Estado", state.uc_estado, { step: E }) +
      pvCampo("Ponto de referência", state.pontoReferencia, { step: E }) +
      pvCampo("Nº Instalação / UC / Medidor do vizinho", state.instalVizinho, {
        step: E,
      })
    : pvCampo("Endereço", state.urb_endereco, { step: E }) +
      pvCampo("Número", state.urb_num, { step: E }) +
      pvCampo("Complemento", state.urb_compl, { step: E }) +
      pvCampo("Bairro", state.urb_bairro, { step: E }) +
      pvCampo("Cidade / Município", state.uc_municipio, { step: E }) +
      pvCampo("Estado", state.uc_estado, { step: E });
  campos +=
    pvCampo(
      "Coordenadas",
      [state.latitude, state.longitude].filter(Boolean).join(" , "),
      { step: E },
    ) + pvCampo("Coordenada UTM", state.utm, { step: E });
  // Só aparece quando HÁ restrição — igual ao formulário.
  if (state.restricaoAmbiental === "Sim" && state.restricoesTexto)
    campos += pvCampo(
      "Área de restrição ambiental",
      `<span class="restricao-destaque">${state.restricoesTexto}</span>`,
      { full: true, step: E },
    );
  return pvSecao("Dados do empreendimento", pvGrid(campos));
}

function _pvAtendimento() {
  const E = PV_ETAPA.atendimento;
  const ehNova = state.finalidade === "Conexão Nova";
  let campos = pvCampo("Tipo de solicitação", state.finalidade, { step: E });
  if (state.finalidade && !ehNova)
    campos += pvCampo("Número da unidade / instalação", state.numInstalacao, {
      step: E,
    });
  campos +=
    pvCampo("Opção de atendimento", state.opcaoAtend, { step: E }) +
    pvCampo("A subestação está pronta para ser ligada?", state.subPronta, {
      step: E,
    });
  if (state.finalidade && !ehNova)
    campos += pvCampo(
      "Haverá mudança no local da subestação",
      state.mudancaLocal,
      { step: E },
    );
  // O endereço do novo local só existe quando houve mudança declarada; a zona
  // é a mesma da unidade consumidora (herdada da etapa anterior).
  if (state.finalidade && !ehNova && state.mudancaLocal === "Sim") {
    const rural = state.localizacao === "Rural";
    campos += pvCampo("Área do novo local da subestação", state.localizacao, {
      step: E,
    });
    campos += rural
      ? pvCampo("Distrito / Comunidade / Região", state.nv_distrito, {
          step: E,
        }) +
        pvCampo("Nome da propriedade", state.nv_propriedade, { step: E }) +
        pvCampo("Cidade / Município", state.nv_municipio_rur, { step: E }) +
        pvCampo("Estado", state.nv_estado_rur, { step: E }) +
        pvCampo("Ponto de referência", state.nv_pontoReferencia, { step: E }) +
        pvCampo(
          "Nº Instalação / UC / Medidor do vizinho",
          state.nv_instalVizinho,
          { step: E },
        )
      : pvCampo("CEP", state.nv_cep, { step: E }) +
        pvCampo("Endereço", state.nv_endereco, { step: E }) +
        pvCampo("Número", state.nv_num, { step: E }) +
        pvCampo("Complemento", state.nv_compl, { step: E }) +
        pvCampo("Bairro", state.nv_bairro, { step: E }) +
        pvCampo("Cidade / Município", state.nv_municipio, { step: E }) +
        pvCampo("Estado", state.nv_estado, { step: E });
    campos +=
      pvCampo(
        "Coordenadas do novo local",
        [state.latitudeNova, state.longitudeNova].filter(Boolean).join(" , "),
        { step: E },
      ) + pvCampo("Coordenada UTM (novo local)", state.utmNova, { step: E });
  }
  return pvSecao("Tipo de atendimento", pvGrid(campos));
}

/* --- Transformador: cartões de potência e inrush ---
   O formulário declara potência e corrente de inrush por transformador (a
   demanda é da instalação ou do cubículo, não do equipamento). Num trafo
   substituído os cartões saem em dois andares, atual → substituto. */
function _pvTrafo(t, i, step) {
  const troca = permiteTrocaTrafo();
  const situacao = situacaoTrafo(t);
  const subst = troca && situacao === "troca";
  const semAlt = troca && situacao === "sem";
  const status = !troca
    ? ""
    : pvStatus(
        subst ? "Substituído" : semAlt ? "Mantido" : "Novo",
        subst ? "substituido" : semAlt ? "existente" : "novo",
      );
  const corpo = subst
    ? pvCards([
        { label: "Potência atual", valor: _pvUn(t.potencia, "kVA") },
        { label: "Corrente de Inrush atual", valor: _pvUn(t.relacao, "%") },
      ]) +
      pvSetas(2) +
      pvCards([
        { label: "Nova potência", valor: _pvUn(t.novaPotencia, "kVA") },
        {
          label: "Nova corrente de Inrush",
          valor: _pvUn(t.novaRelacao, "%"),
        },
      ])
    : pvCards([
        { label: "Potência", valor: _pvUn(t.potencia, "kVA") },
        { label: "Corrente de Inrush", valor: _pvUn(t.relacao, "%") },
      ]);
  return pvBloco(`Transformador ${i + 1}`, status, step, corpo);
}

/* --- Demanda de um cubículo ou da instalação ---
   Demanda simples e escalonada são exclusivas na tela; a prévia segue a mesma
   regra para não mostrar campo que não foi preenchido. */
function _pvDemanda(o, azul, etapas, unidade, step) {
  let campos = "";
  if (o.escalonada !== "Sim")
    campos += azul
      ? pvCampo("Demanda ponta contratada", _pvUn(o.ponta, unidade), { step }) +
        pvCampo("Demanda fora ponta contratada", _pvUn(o.foraponta, unidade), {
          step,
        })
      : pvCampo("Demanda contratada", _pvUn(o.demanda, "kVA"), { step });
  campos += pvCampo("Demanda escalonada", o.escalonada, { step });
  const tabela =
    o.escalonada === "Sim" && etapas.length
      ? azul
        ? pvTabela(
            ["Demanda ponta (kW)", "Demanda fora ponta (kW)", "Início de uso"],
            etapas.map((e) => [
              e.ponta,
              e.foraponta,
              cmgMesAnoRotulo(e.inicio),
            ]),
            step,
          )
        : pvTabela(
            ["Demanda (kW)", "Início de uso"],
            etapas.map((e) => [e.demanda, cmgMesAnoRotulo(e.inicio)]),
            step,
          )
      : "";
  return { campos, tabela };
}

function _pvCubiculo(c, i, step) {
  const troca = permiteTrocaTrafo();
  const status = !troca
    ? ""
    : pvStatus(
        c.existente ? "Já existente" : "Novo",
        c.existente ? "existente" : "novo",
      );
  let campos = "";
  // Subestação nova ainda não tem unidade consumidora: o número nem aparece
  // no formulário.
  if (temInstalacaoCubiculo())
    campos += pvCampo("Número da instalação", c.instalacao, { step });
  campos +=
    pvCampo("Quantidade de transformadores", String(c.trafos.length || ""), {
      step,
    }) + pvCampo("Modalidade tarifária horária", c.modalidade, { step });
  const dem = _pvDemanda(
    {
      escalonada: c.escalonada,
      ponta: c.demandaPonta,
      foraponta: c.demandaForaPonta,
      demanda: c.demanda,
    },
    c.modalidade === "Azul",
    c.etapasEscalonada || [],
    "kW",
    step,
  );
  campos += dem.campos;
  const trafosHTML = c.trafos.map((t, j) => _pvTrafo(t, j, step)).join("");
  return pvPainel(
    "Cubículo",
    `${i + 1} de ${cubiculos.length}`,
    status,
    pvGrid(campos) + dem.tabela + trafosHTML,
  );
}

function _pvMotor(m, i) {
  const step = PV_ETAPA.subestacao;
  const c = CalculoMT.calcularMotor(
    {
      potenciaCV: m.cv,
      fp: m.fp,
      rendimento: m.rend,
      tensaoV: m.volts,
      relacaoIpIn: m.ipIn,
    },
    parseFloat(state.tensaoMT),
  );
  let campos =
    pvCampo("Fases", m.fases, { step }) +
    pvCampo("CV", m.cv, { step }) +
    pvCampo("Disp. Partida", m.dispositivo, { step });
  if (m.dispositivo === "Chave Compensadora")
    campos += pvCampo("Tap (%)", m.tap, { step });
  // Motor pesado (trifásico > 50 CV / monofásico > 15 CV) declara, no próprio
  // card, os dados de partida — os mesmos que a Análise de Partida usa. São
  // opcionais (não travam a exportação): enquanto nenhum deles foi informado,
  // o bloco fica fora da prévia em vez de virar uma parede de traços — quem
  // cobra o preenchimento é o aviso de motores pesados, acima dos botões.
  const ap = motorPesado(m) ? ensureAnalisePartida(m) : null;
  const temPartida =
    ap &&
    [
      ap.numPartidas,
      ap.ordemPartida,
      ap.cargaOperanteKVA,
      ap.cargaOperanteFP,
      ap.cargaSensivelTipo,
      ap.cargaSensivelPercentual,
      ap.simultaneidade,
      ap.impedanciaZ,
      m.rend,
      m.fp,
      m.volts,
      m.ipIn,
      m.tempo,
    ].some((v) => !_pvVazio(v));
  if (temPartida) {
    campos +=
      pvCampo("Número de partidas", ap.numPartidas, { step }) +
      pvCampo("Ordem de partida", ap.ordemPartida, { step }) +
      pvCampo("Carga operando (kVA)", ap.cargaOperanteKVA, { step }) +
      pvCampo("Carga operando (FP)", ap.cargaOperanteFP, { step }) +
      pvCampo("Tipo de carga sensível", ap.cargaSensivelTipo, { step }) +
      pvCampo("% admissível da carga sensível", ap.cargaSensivelPercentual, {
        step,
      }) +
      pvCampo("Simultaneidade", ap.simultaneidade, { step }) +
      pvCampo("Impedância do transformador (%Z)", ap.impedanciaZ, { step }) +
      pvCampo("Rendimento", m.rend, { step }) +
      pvCampo("FP", m.fp, { step }) +
      pvCampo("Tensão (V)", m.volts, { step }) +
      pvCampo("IP/IN", m.ipIn, { step }) +
      pvCampo("Tempo IP (s)", m.tempo, { step });
  }
  if (ehAtividadeIrrigacao())
    campos += pvCampo(
      "Destinado à irrigação",
      m.destinadoIrrigacao ? "Sim" : "Não",
      { step },
    );
  const faixa = pvFaixa([
    { label: "Pot (kVA)", valor: c.potkVA == null ? "" : fmt(c.potkVA) },
    { label: "Pot (kW)", valor: c.potkW == null ? "" : fmt(c.potkW) },
    { label: "I nom (A)", valor: c.iNominal == null ? "" : fmt(c.iNominal) },
    { label: "I part (A)", valor: c.iPartida == null ? "" : fmt(c.iPartida) },
    {
      label: "Ip prim (A)",
      valor: c.ipPrimario == null ? "" : fmt(c.ipPrimario),
    },
  ]);
  return pvPainel(
    "Motor",
    `${i + 1} de ${motores.length}`,
    "",
    pvGrid(campos) + faixa,
  );
}

/* Cartão do modelo de subestação escolhido — a foto é a mesma da galeria. */
function _pvSubestacao(titulo, tipo) {
  if (_pvVazio(tipo)) return "";
  const n = String(tipo).match(/(\d+)/);
  const img = n && SUBESTACAO_IMGS[n[1]];
  return pvSub(titulo) + pvMidia(img, tipo, PV_ETAPA.subestacao, true);
}

function _pvTecnico() {
  const E = PV_ETAPA.subestacao;
  const compartilhada = state.compartilhada === "Sim";
  let corpo = pvGrid(
    pvCampo(
      "Nível de tensão da rede Média Tensão?",
      state.tensaoMT ? state.tensaoMT.replace(".", ",") + " kV" : "",
      { step: E },
    ) + pvCampo("Subestação compartilhada", state.compartilhada, { step: E }),
  );

  if (compartilhada) {
    corpo +=
      pvSub("Dados da subestação compartilhada") +
      pvGrid(
        pvCampo("Quantidade de cubículos", String(cubiculos.length || ""), {
          step: E,
        }) +
          pvCampo("Sobre a subestação", state.subestacaoExistente, {
            step: E,
          }) +
          pvCampo("Soma dos transformadores (kVA)", fmt(state.potTotalTrafos), {
            step: E,
          }) +
          pvCampo("Soma das demandas (kW)", fmt(state.demandaTotalCubiculos), {
            step: E,
          }),
      ) +
      cubiculos.map((c, i) => _pvCubiculo(c, i, E)).join("");
  } else {
    const dem = _pvDemanda(
      {
        escalonada: state.escalonada,
        ponta: state.demandaPontaContratada,
        foraponta: state.demandaForaPontaContratada,
        demanda: state.demandaContratada,
      },
      state.modalidade === "Azul",
      escalonadaInstalacao,
      "kVA",
      E,
    );
    corpo +=
      pvSub("Dados dos transformadores") +
      pvGrid(
        pvCampo("Quantidade de transformadores", String(trafos.length || ""), {
          step: E,
        }) +
          pvCampo("Modalidade tarifária", state.modalidade, { step: E }) +
          dem.campos,
      ) +
      dem.tabela +
      trafos.map((t, i) => _pvTrafo(t, i, E)).join("");
  }

  if (motores.length)
    corpo +=
      pvSub("Motores e cargas especiais") +
      motores.map((m, i) => _pvMotor(m, i)).join("");

  // Conexão Nova escolhe UM modelo; a alteração declara o modelo atual e o
  // novo (quando houver troca — ver _trocaSEDeduzida).
  if (state.finalidade === "Conexão Nova")
    corpo += _pvSubestacao("Subestação escolhida", state.cn_tipoSE);
  else
    corpo +=
      _pvSubestacao("Subestação atual", state.alt_tipoAtual) +
      _pvSubestacao("Nova subestação", state.alt_tipoPara);

  return pvSecao("Dados técnicos da subestação e cargas especiais", corpo);
}

function _pvRamalGeracao() {
  const E = PV_ETAPA.ramal;
  let corpo = pvSub("Ramal de entrada");
  if (state.ramalIndice != null) {
    // "Área de atendimento: Urbano · Ramal de conexão: Aéreo · …" vira uma
    // linha por item, com o valor em negrito (legenda do Figma).
    const legenda = CalculoMT.textoRamal(state.ramalIndice)
      .split("·")
      .map((p) => {
        const [rot, ...resto] = p.split(":");
        return resto.length
          ? `${rot.trim()}: <b>${resto.join(":").trim()}</b>`
          : rot.trim();
      })
      .join("<br>");
    corpo += pvMidia(RAMAL_IMGS[state.ramalIndice], legenda, E, false);
  } else {
    corpo += pvGrid(
      pvCampo("Ramal de entrada", "(não selecionado)", { full: true, step: E }),
    );
  }

  let ger = pvCampo(
    "Possui geração em paralelismo momentâneo (gerador a diesel)?",
    state.gerMomentaneo,
    { step: E },
  );
  if (state.gerMomentaneo === "Sim")
    ger += pvCampo(
      "Potência da geração",
      _pvUn(state.gerMomentaneoPot, "kVA"),
      {
        step: E,
      },
    );
  ger += pvCampo(
    "Possui geração em paralelismo permanente sem injeção (GRID ZERO)?",
    state.gridZero,
    { step: E },
  );
  if (state.gridZero === "Sim")
    ger += pvCampo("Potência da geração", _pvUn(state.gridZeroPot, "kVA"), {
      step: E,
    });
  ger += pvCampo(
    "Possui unidades consumidoras de Baixa Tensão (BT) na mesma propriedade?",
    state.btMesmaProp,
    { step: E },
  );
  corpo += pvSub("Geração e baixa tensão") + pvGrid(ger);
  return pvSecao("Ramal e Geração", corpo);
}

function _pvCorrespondencia() {
  const E = PV_ETAPA.correspondencia;
  let campos = pvCampo(
    "Como você deseja receber a fatura",
    state.formaCorresp,
    { step: E },
  );
  if (state.formaCorresp === "E-mail informado")
    campos += pvCampo("E-mail para envio da fatura", state.emailCliente, {
      step: E,
    });
  else if (state.formaCorresp === "Outro e-mail")
    campos += pvCampo("E-mail para envio da fatura", state.emailCorresp, {
      step: E,
    });
  else if (state.formaCorresp === "Endereço da obra")
    campos += pvCampo("Endereço da fatura", "Mesmo da unidade consumidora", {
      step: E,
    });
  else if (
    state.formaCorresp === "Novo endereço" ||
    state.formaCorresp === "Agência Correios(Caixa Postal)"
  )
    campos +=
      pvCampo("CEP", state.ec_cep, { step: E }) +
      pvCampo("Endereço", state.ec_rua, { step: E }) +
      pvCampo("Número", state.ec_num, { step: E }) +
      pvCampo("Complemento", state.ec_compl, { step: E }) +
      pvCampo("Bairro", state.ec_bairro, { step: E }) +
      pvCampo("Cidade / Município", state.ec_municipio, { step: E }) +
      pvCampo("Estado", state.ec_estado, { step: E });
  else if (state.formaCorresp === "Conta globalizada")
    campos += pvCampo("Conta globalizada", state.contaGlobalizada, { step: E });
  // Campo opcional: sem dia escolhido mostra o vazio padrão — o usuário não
  // recusou nada, apenas não informou.
  campos += pvCampo(
    "Data de vencimento da fatura",
    state.desejaVenc === "Sim" && state.diaVenc
      ? "Todo dia " + state.diaVenc
      : "",
    { step: E },
  );
  return pvSecao("Correspondência", pvGrid(campos));
}

/* ===== Montagem da etapa ===== */
function renderPreview() {
  // Aquecimento do jsPDF (carga sob demanda): chegar nesta etapa é o melhor
  // sinal de que o PDF vem a seguir. Sem await — não bloqueia a renderização.
  window.CemigLibs.jspdf().catch(() => {});
  syncState();

  const secoes = [
    _pvContato(),
    _pvEmpreendimento(),
    _pvAtendimento(),
    _pvTecnico(),
    _pvRamalGeracao(),
    _pvCorrespondencia(),
  ];
  if (state.observacoes)
    secoes.push(
      pvSecao(
        "Observações",
        pvGrid(
          pvCampo("Observações", state.observacoes, {
            full: true,
            step: PV_ETAPA.observacoes,
          }),
        ),
      ),
    );
  $("#previewContent").innerHTML = secoes.join(PV_DIVISOR);

  // A pergunta "Tarifa monômia?" saiu do formulário junto com a seção global
  // de tarifação. A carta passa a ser oferecida por ELEGIBILIDADE: REN
  // 1.000/2021, Art. 292, I — soma das potências ≤ 112,5 kVA (MONOMIA_MAX).
  const btnMonomia = $("#btnCartaMonomia");
  if (btnMonomia) {
    const pot = parseFloat(state.potTotalTrafos) || 0;
    const elegivel = pot > 0 && pot <= CalculoMT.limites.MONOMIA_MAX;
    btnMonomia.style.display = elegivel ? "" : "none";
  }
  renderIrrigacaoOpcionalCard();
  const alertaMotores = $("#alertaMotoresPesados");
  if (alertaMotores) {
    const idxs = motoresPesadosIdx();
    alertaMotores.innerHTML = idxs.length
      ? alertHTML(
          "warn",
          `A solicitação possui ${idxs.length} motor(es) pesado(s) que exige(m) mais informações, favor preencher o formulário: <button type="button" class="btn btn-primary no-print" style="margin-left:8px" onclick="abrirAnaliseMotores()">Preencher Análise de Partida</button>`,
        )
      : "";
  }
  atualizarGateExportacao();
}
