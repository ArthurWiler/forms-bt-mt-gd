// ============================================================
// MINIGERAÇÃO DISTRIBUÍDA — Geração de PDF
// Usa o motor visual compartilhado (shared/js/gd-pdf-base.js), idêntico ao
// módulo de Baixa Tensão: barra superior, seções, pares em 2 colunas,
// linhas com quebra automática, tabelas com zebra e linha de total.
// ============================================================
function gerarPdfMiniGD(d) {
  const P = criarPdfGD(
    "Formulário CEMIG — Minigeração Distribuída",
    "Solicitação de Acesso — REN 1.000/2021",
  );
  const { sec, subSec, kvPairs, fullLine, totRow, tabela } = P;
  const sn = (b) => (b ? "Sim" : "Não");
  const ehLigacaoNova = d.solicitacao === GD_SOLICITACAO_LIG_NOVA;
  const ehAlteracaoDemanda = GD_SOLICITACOES_ALTERACAO_DEMANDA.includes(
    d.solicitacao,
  );
  const ehAlteracaoGeracao = (d.solicitacao || "").indexOf("GD Existente") >= 0;
  const ehCompartilhada = d.entradaEnergia === GD_ENTRADA_COMPARTILHADA;
  // Situação declarada de um transformador, no vocabulário do formulário.
  const situacaoTrafo = (t) =>
    ({ troca: "Substituído", sem: "Mantido", novo: "Novo" })[t.situacao] ||
    "Novo";
  // Linhas da tabela de transformadores — a coluna "Situação" só existe fora da
  // conexão nova, onde todo trafo é novo por definição.
  const linhasTrafo = (lista, comSituacao) =>
    (lista || [])
      .filter((t) => t.potencia || t.qte)
      .map((t, i) => [
        "Trafo " + (i + 1),
        (t.potencia || "—") + " kVA",
        t.tipoLigacao || "—",
        ...(comSituacao ? [situacaoTrafo(t)] : []),
      ]);

  const ehRural = d.localizacao === "Rural";

  // ---- 1. Dados do proprietário ----
  sec("1.  DADOS DO PROPRIETÁRIO");
  kvPairs([
    ["Titular", d.titular],
    ["E-mail", d.email],
    ["Celular", d.celular],
    ["CPF/CNPJ", d.cpfCnpj],
    // Campos de Pessoa Física (só saem se preenchidos — CPF válido).
    ...(d.filiacao ? [["Filiação", d.filiacao]] : []),
    ...(d.rg ? [["RG / RNE / RANI", d.rg]] : []),
    ...(d.nasc ? [["Data de Nascimento", d.nasc]] : []),
    ...(d.filiacao ? [["Equipamentos essenciais?", d.laudoMedico]] : []),
    ...(d.filiacao ? [["NIS (Tarifa Social)?", d.nis]] : []),
    ...(d.nis === "Sim" && d.numNis ? [["Número do NIS", d.numNis]] : []),
    // Responsável técnico pelo empreendimento.
    ["Responsável Técnico", d.rtNome],
    ["E-mail do RT", d.rtEmail],
    ["Celular do RT", d.rtCelular],
  ]);
  P.gap(2);

  // ---- 2. Dados da unidade ----
  // O endereço urbano e o descritivo rural são mutuamente exclusivos: a zona
  // de localização (etapa 3) limpa os campos da zona oposta.
  sec("2.  DADOS DA UNIDADE CONSUMIDORA");
  kvPairs([
    ["Zona de localização", d.localizacao],
    ...(ehRural
      ? [
          ["Município", [d.municipio, d.estado].filter(Boolean).join("/")],
          ["Distrito / Comunidade / Região", d.distritoComunidade],
          ["Nome da propriedade", d.nomePropriedade],
          ["Ponto de referência", d.pontoRef],
          ["Instalação / UC / medidor mais próxima", d.instProxima],
        ]
      : [["CEP", d.cep]]),
  ]);
  if (!ehRural)
    fullLine(
      "Endereço",
      [
        [d.logradouro, d.numero].filter(Boolean).join(", "),
        d.complemento,
        d.bairro,
        [d.municipio, d.estado].filter(Boolean).join("/"),
        d.cep ? "CEP " + d.cep : "",
      ]
        .filter(Boolean)
        .join(" - "),
    );
  kvPairs([
    ["Coordenadas", `Lat ${d.latitude || "—"} · Lon ${d.longitude || "—"}`],
    [
      "Coordenadas UTM (calculada)",
      `Fuso ${d.fuso || "—"} · E ${d.utmE || "—"} · N ${d.utmN || "—"}`,
    ],
  ]);
  if (d.restricaoAmbiental)
    fullLine(
      "Restrição ambiental",
      d.restricaoAmbiental === "Sim"
        ? (d.restricoesTexto || "Sim").replace(/\n/g, " · ")
        : "Não",
    );
  P.gap(2);

  // ---- 3. Tipo de atendimento ----
  sec("3.  TIPO DE ATENDIMENTO");
  const ucPairs = [
    ["Instalação / UC / Medidor", d.instalacao],
    ["Grupo", d.grupo],
    ["Classe", d.classe],
    ["Tipo de Solicitação", d.solicitacao],
    // O valor guardado é o volt "cru" (chave da regra de subestação); sai
    // formatado em kV, como no rótulo do <select>.
    [
      "Tensão de Atendimento",
      d.tensaoAtendimento
        ? (Number(d.tensaoAtendimento) / 1000).toFixed(1).replace(".", ",") +
          " kV"
        : "",
    ],
    ["Entrada de Energia", d.entradaEnergia],
    ["Mudança de local da subestação", d.mudancaSE],
    ["Gerador de Emergência (kVA)", d.geradorPotencia],
  ];
  // Escolha da subestação: conexão nova e alteração são caminhos exclusivos.
  if (ehLigacaoNova) {
    ucPairs.push(["Subestação para conexão nova", d.cn_tipoSE]);
  } else {
    ucPairs.push(
      ["Subestação atual", d.alt_tipoAtual],
      ["Troca de subestação", d.alt_troca],
    );
    if (d.alt_troca === "Sim")
      ucPairs.push(["Nova subestação", d.alt_tipoPara]);
  }
  ucPairs.push(["Tipo de Subestação efetivo (ND 5.3)", d.tipoSE]);
  // Demandas (respeitando as regras de visibilidade do formulário —
  // _paresPotenciaGD em js/app.js).
  ucPairs.push([
    "Demanda a contratar de geração (kW)",
    d.gridZero === "Sim" ? "0 (Grid Zero)" : d.demandaGeracao,
  ]);
  if (!ehLigacaoNova)
    ucPairs.push([GD_ROTULOS_DEMANDA.atual, d.demandaConsumoAtual]);
  if (ehLigacaoNova || ehAlteracaoDemanda)
    ucPairs.push([
      ehLigacaoNova ? GD_ROTULOS_DEMANDA.nova : GD_ROTULOS_DEMANDA.futura,
      d.demandaConsumo,
    ]);
  ucPairs.push(["Grid Zero", d.gridZero], ["Telhado arrendado", d.telhadoArrendado]);
  // Unidade arrendada: dados próprios do arrendamento (spec Figma).
  if (d.telhadoArrendado === "Sim")
    ucPairs.push(
      ["Nº da unidade/instalação arrendada", d.arrendUC],
      ["Nível de tensão da unidade arrendada", d.arrendTensao],
    );
  if (!ehLigacaoNova)
    ucPairs.push(
      ["Número da Unidade Consumidora", d.numUC],
      ["Instalação / UC / Medidor existente no local", d.instExistente],
      ["Instalação existente BT/MT", d.instExistenteBTMT],
    );
  kvPairs(ucPairs);

  // ---- Bloco técnico da subestação ----
  // Individual e compartilhada são ramos exclusivos: no primeiro os
  // transformadores são da própria UC; no segundo pertencem a cada cubículo,
  // e cada cubículo é uma NS distinta.
  const comSituacao = !ehLigacaoNova;
  const cabTrafo = ["Transformador", "Potência", "Ligação"].concat(
    comSituacao ? ["Situação"] : [],
  );
  const largTrafo = comSituacao ? [52, 40, 44, 46] : [70, 56, 56];
  if (ehCompartilhada) {
    subSec("SUBESTAÇÃO COMPARTILHADA — CUBÍCULOS");
    kvPairs([
      ["Sobre a subestação", d.subestacaoExistente],
      ["Quantidade de cubículos", String((d.cubiculos || []).length || "")],
    ]);
    fullLine(
      "Observação",
      "Cada cubículo corresponde a uma NS distinta, vinculada a uma instalação própria. Apresente um formulário por cubículo alterado, para que o montante de geração de cada NS do bloco fique explícito.",
    );
    (d.cubiculos || []).forEach((c, i) => {
      const marca = !comSituacao
        ? ""
        : c.existente
          ? " — já existente"
          : " — novo";
      subSec("Cubículo " + (i + 1) + marca);
      // kvPairs descarta o par vazio, então o nº de UC some sozinho numa
      // subestação nova (onde ele não é perguntado).
      kvPairs([
        ["Nº da unidade consumidora / instalação", c.instalacao],
        ["Demanda contratada de consumo (kW)", c.demanda],
        ["Potência de geração deste cubículo (kW)", c.potGD],
      ]);
      const linhas = linhasTrafo(c.trafos, comSituacao);
      if (linhas.length) tabela(cabTrafo, largTrafo, linhas);
    });
    totRow(
      "Totais consolidados",
      (d.qtdTotalTrafos || 0) +
        " trafos · " +
        (d.potTotalTrafos || 0) +
        " kVA · demanda " +
        (d.demandaTotalCubiculos || 0) +
        " kW · geração " +
        (d.gdTotalCubiculos || 0) +
        " kW",
    );
  } else {
    kvPairs([["Impedância do Transformador (%)", d.impedanciaTrafo]]);
    const linhas = linhasTrafo(d.trafos, comSituacao);
    if (linhas.length) {
      tabela(cabTrafo, largTrafo, linhas);
      totRow(
        "Potência total instalada",
        (d.qtdTotalTrafos || 0) + " un · " + (d.potTotalTrafos || 0) + " kVA",
      );
    }
  }
  // Motores e cargas especiais — valem nos dois ramos.
  const motoRows = (d.motores || [])
    .filter((m) => m.cv || m.volts)
    .map((m, i) => [
      "Motor " + (i + 1),
      m.fases || "—",
      (m.cv || "—") + " CV",
      m.dispositivo || "—",
    ]);
  if (motoRows.length) {
    tabela(
      ["Motor", "Fases", "Potência", "Disp. partida"],
      [46, 40, 40, 56],
      motoRows,
    );
    // Carga operante só é perguntada havendo motores.
    kvPairs(
      [
        ["Carga operante na partida (kVA)", d.cargaOperante],
        ["Corrente de partida prevista (A)", d.ipPrevista],
        ["Tempo da corrente de partida (s)", d.tempoPartida],
      ].filter(([, v]) => v != null && v !== ""),
    );
  }
  P.gap(2);

  // A seção "Documentação da UC a anexar" saiu junto com a etapa
  // correspondente do formulário. A documentação TÉCNICA segue mais abaixo.

  // ---- Formulário de Carga (Item 11) ----
  const c = d.cargas || {};
  const temCarga =
    (c.qtds || []).some((q) => (q || 0) > 0) ||
    (c.mots || []).some((m) => (parseInt(m.q) || 0) > 0) ||
    (c.extras || []).some((m) => (parseInt(m.q) || 0) > 0);
  if (GD_SOLICITACOES_FORM_CARGA.includes(d.solicitacao) || temCarga) {
    sec("ITEM 11 — FORMULÁRIO DE CARGA");
    if (GD_SOLICITACOES_FORM_CARGA.includes(d.solicitacao))
      fullLine("Preenchimento", "Obrigatório (Ligação Nova / Aumento de Demanda)");
    fullLine(
      "Tipo de carga",
      c.tipoA === "res"
        ? "Residencial"
        : c.tipoA === "nr"
          ? "Não-Residencial" +
            (TABELA_11[c.catA] ? ` (${TABELA_11[c.catA].d})` : "")
          : "—",
    );
    const cargaRows = [];
    (CAT || []).forEach((cat, i) => {
      const q = (c.qtds || [])[i] || 0;
      if (q > 0) cargaRows.push([cat.n, String(q), `${fmtW(cat.w)} W`]);
    });
    (c.mots || []).forEach((m, i) => {
      if ((parseInt(m.q) || 0) > 0)
        cargaRows.push([
          `Motor ${i + 1} (${m.fase === "mono" ? "Mono" : "Tri"})`,
          String(m.q),
          `${m.cv} CV`,
        ]);
    });
    (c.extras || []).forEach((m, i) => {
      if ((parseInt(m.q) || 0) > 0)
        cargaRows.push([
          `Carga Adicional ${i + 1} (${m.fase === "mono" ? "Mono" : "Tri"})`,
          String(m.q),
          `${m.cv} CV`,
        ]);
    });
    if (cargaRows.length)
      tabela(["Carga", "Qtd", "Potência"], [110, 30, 42], cargaRows);
    totRow(
      `Carga ${fmt2(c._cargaKw || 0)} kW  |  Demanda`,
      `${fmt2(c._demanda || 0)} kVA`,
    );
    fullLine(
      "Disjuntor sugerido / escolhido",
      `${(c._disjuntores || []).join(" · ") || "—"}${d.cargaDisjEscolhido ? " → " + d.cargaDisjEscolhido : ""}`,
    );
    P.gap(2);
  }

  // ---- 4. Geração ----
  sec("4.  DADOS DA GERAÇÃO");
  const gerPairs = [
    ["Quantidade de fontes", d.qtdFontes],
    ["Potência Ativa Instalada Total (kW)", d.potAtivaInstalada],
  ];
  if (ehAlteracaoGeracao)
    gerPairs.push(["Potência de Geração Atual (kW)", d.potGeracaoAtual]);
  gerPairs.push(
    ["Modalidade de compensação", d.modalidade],
    ["Qtde. instalações a receber crédito", d.qtdInstalacoesCredito],
    ["Anexou contrato de constituição", d.anexouContrato],
  );
  if (d.modalidade === "Geração Compartilhada")
    gerPairs.push(["Documentação do consórcio verificada", d.consorcioVerificado]);
  kvPairs(gerPairs);
  (d.fontes || []).forEach((f, i) => {
    subSec(`4.${i + 1}  Fonte de Geração ${i + 1}`);
    kvPairs([
      ["Tipo de Fonte Primária", f.fontePrimaria],
      ["Potência da Fonte (kW)", f.potencia],
      [
        "Tipo de geração",
        f.tipoGeracao === "Outra (especificar):"
          ? `Outra: ${f.tipoGeracaoOutro}`
          : f.tipoGeracao,
      ],
    ]);
    if (f.fontePrimaria === "Solar") {
      kvPairs([
        ["Pot. total módulos (kW)", f.potTotalModulos],
        ["Pot. total inversores (kW)", f.potTotalInversores],
        ["Área dos Arranjos (m²)", f.areaArranjos],
        ["Quantidade de Módulos", f.qtdModulos],
        ["Modelo dos Módulos", f.modeloModulos],
        ["Fabricante dos Módulos", f.fabricanteModulos],
        ["Quantidade de Inversores", f.qtdInversores],
        ["Modelo dos Inversores", f.modeloInversores],
        ["Fabricante dos Inversores", f.fabricanteInversores],
      ]);
    }
    kvPairs([
      ["CEG do empreendimento", f.ceg],
      ["Nº Ato de Outorga/Registro", f.numAtoOutorga],
      ["Nome da Usina", f.nomeUsina],
      ["Ano do Ato", f.anoAtoOutorga],
      ["Tipo do Ato", f.tipoAtoOutorga],
    ]);
  });
  P.gap(2);

  // ---- 5. Armazenamento ----
  sec("5.  SISTEMA DE ARMAZENAMENTO DE ENERGIA");
  const armPairs = [["Possui armazenamento", d.possuiArmazenamento]];
  if (d.possuiArmazenamento === "Sim") {
    armPairs.push(["Operação ilhada", d.armOperacaoIlhada]);
    if (d.armOperacaoIlhada === "Sim")
      armPairs.push(
        ["Chave de desconexão física", d.armChaveDesconexao],
        ["Reconexão automática", d.armReconexaoAuto],
      );
    armPairs.push(
      ["Capacidade do banco (kWh)", d.armCapacidadeKwh],
      ["Potência total do banco (kW)", d.armPotenciaKw],
      ["Capacidade nominal (Ah)", d.armCapacidadeAh],
      ["Tensão CC (V)", d.armTensaoCC],
      ["Profundidade de descarga (%)", d.armProfundidadeDescarga],
      ["Produção mensal (kWh)", d.armProducaoMensal],
    );
  }
  kvPairs(armPairs);
  P.gap(2);

  // ---- 6. Garantia de Fiel Cumprimento ----
  sec("6.  GARANTIA DE FIEL CUMPRIMENTO");
  if (!gdExigeGFC(d)) {
    const motivo =
      (parseFloat(d.potAtivaInstalada) || 0) <= GD_GFC_LIMITE_KW
        ? "Não aplicável (potência instalada ≤ 500 kW)"
        : d.modalidade === GD_GFC_MODALIDADE_EMUC
          ? "Dispensada — não se aplica a EMUC"
          : "Dispensada — Geração Compartilhada com consórcio verificado";
    fullLine("Garantia (> 500 kW)", motivo);
  } else {
    kvPairs([
      ["Forma de apresentação", d.garantiaForma],
      ["Valor da GFC (R$)", fmt2(gdCalcularGFC(d))],
    ]);
  }
  P.gap(2);

  // ---- 7. Documentação Técnica ----
  sec("7.  DOCUMENTAÇÃO TÉCNICA");
  GD_DOCS_TEC.forEach((dc) =>
    fullLine(`${dc.id} ${d.docsTec && d.docsTec[dc.id] ? "[X]" : "[ ]"}`, dc.txt),
  );
  P.gap(2);

  // ---- 8. Contato na Distribuidora ----
  sec("8.  CONTATO NA DISTRIBUIDORA");
  fullLine("Responsável/Área", GD_CONTATO_CEMIG.responsavel);
  fullLine("Endereço", GD_CONTATO_CEMIG.endereco);
  kvPairs([
    ["Telefone", GD_CONTATO_CEMIG.telefone],
    ["E-mail", GD_CONTATO_CEMIG.email],
  ]);
  P.gap(2);

  // ---- 9. Solicitações e Declarações ----
  sec("9.  SOLICITAÇÕES E DECLARAÇÕES");
  kvPairs([["9.1 Padrão pronto e usina instalada", d.decl81]]);
  fullLine("9.2 Renúncia ao direito de desistir", sn(d.decl82));
  fullLine("9.3 Autorizo entrega de contratos/pagamento", sn(d.decl83));
  fullLine("9.4 Declaração de conformidade (obrigatória)", sn(d.decl84));
  if (d.gridZero === "Sim")
    fullLine(
      "9.5 Dispensa de análise de inversão de fluxo (Grid Zero)",
      sn(d.decl95),
    );
  fullLine("9.6 Informações verdadeiras (obrigatória)", sn(d.decl86));
  P.gap(2);

  // ---- 10. Correspondência ----
  sec("10.  CORRESPONDÊNCIA E FATURA");
  {
    const corrPairs = [
      ["Forma de recebimento da fatura", d.corrAlternativa],
      ["Data de vencimento", d.vencimento],
    ];
    if (d.corrAlternativa === "Conta globalizada") {
      corrPairs.push(["Conta globalizada", d.contaGlobal]);
    }
    kvPairs(corrPairs);
  }
  // E-mail/endereço da fatura conforme a forma de recebimento escolhida.
  if (d.corrAlternativa === "E-mail informado") {
    fullLine("E-mail para envio da fatura", d.email);
  } else if (d.corrAlternativa === "Outro e-mail") {
    fullLine("E-mail alternativo para a fatura", d.corrOutroEmail);
  } else if (d.corrAlternativa === "Mesmo da obra") {
    const endU = [
      [d.logradouro, d.numero].filter(Boolean).join(", "),
      d.complemento,
      d.bairro,
      [d.municipio, d.estado].filter(Boolean).join("/"),
      d.cep ? "CEP " + d.cep : "",
    ]
      .filter(Boolean)
      .join(" - ");
    fullLine(
      "Endereço de correspondência",
      "Mesmo da unidade consumidora — " + endU,
    );
  } else if (d.corrAlternativa === "Endereço novo") {
    const endC = [
      [d.corrRua, d.corrNum].filter(Boolean).join(", "),
      d.corrCompl,
      d.corrBairro,
      d.corrMunicipio,
      d.corrEstado,
      d.corrCep ? "CEP " + d.corrCep : "",
    ]
      .filter(Boolean)
      .join(" - ");
    fullLine("Endereço de correspondência", endC);
  }
  P.gap(4);

  P.assinatura();
  const nomeArq = (d.titular || "MiniGD")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .slice(0, 30);
  P.save(`CEMIG_MiniGD_${nomeArq}.pdf`);
}
