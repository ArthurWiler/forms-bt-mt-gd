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
        (t.impedancia || "—") + "%",
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
    ["Atividade principal", d.classe],
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
    ["Tipo de edificação", d.entradaEnergia],
    [
      "Gerador de emergência",
      d.geradorEmergencia +
        (d.geradorEmergencia === "Sim"
          ? ` (${d.geradorPotencia || "—"} kVA)`
          : ""),
    ],
  ];
  // A mudança de local só é perguntada havendo subestação a mudar de lugar
  // (atualizarMudancaSEGD, js/subestacao.js). Fora disso o campo fica oculto e
  // travado em "Não" — imprimir a linha só acrescentaria ruído.
  if (_temSubestacaoExistenteGD())
    ucPairs.push(["Mudança de local da subestação", d.mudancaSE]);
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
  // A demanda de GERAÇÃO é uma só, da usina (etapa 6), e sai aqui; a de
  // consumo é campo de card e sai no bloco técnico.
  ucPairs.push([
    "Demanda a contratar de geração (kW)",
    d.gridZero === "Sim" ? "0 (Grid Zero)" : d.demandaGeracao,
  ]);
  // A demanda de consumo não sai aqui: é declarada card a card (transformador
  // ou cubículo) e impressa no bloco técnico, junto do equipamento a que
  // pertence.
  ucPairs.push(["Grid Zero", d.gridZero], ["Telhado arrendado", d.telhadoArrendado]);
  // Unidade arrendada: dados próprios do arrendamento (spec Figma).
  if (d.telhadoArrendado === "Sim")
    ucPairs.push(
      ["Nº da unidade/instalação arrendada", d.arrendUC],
      ["Nível de tensão da unidade arrendada", d.arrendTensao],
    );
  kvPairs(ucPairs);

  // ---- Bloco técnico da subestação ----
  // Individual e compartilhada são ramos exclusivos: no primeiro os
  // transformadores são da própria UC; no segundo pertencem a cada cubículo,
  // e cada cubículo é uma NS distinta.
  const comSituacao = !ehLigacaoNova;
  const cabTrafo = ["Transformador", "Potência", "Ligação", "Imped."].concat(
    comSituacao ? ["Situação"] : [],
  );
  // Somam sempre 182 (a largura útil da tabela).
  const largTrafo = comSituacao ? [46, 34, 38, 26, 38] : [56, 44, 46, 36];
  if (ehCompartilhada) {
    subSec("SUBESTAÇÃO COMPARTILHADA — CUBÍCULOS");
    kvPairs([
      ["Sobre a subestação", d.subestacaoExistente],
      ["Quantidade de cubículos", String((d.cubiculos || []).length || "")],
    ]);
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
        [
          ehLigacaoNova ? GD_ROTULOS_DEMANDA.nova : GD_ROTULOS_DEMANDA.futura,
          c.demanda,
        ],
        [GD_ROTULOS_DEMANDA.atual, c.demandaAtual],
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
        " kW",
    );
  } else {
    const linhas = linhasTrafo(d.trafos, comSituacao);
    if (linhas.length) {
      tabela(cabTrafo, largTrafo, linhas);
      // Demanda contratada por transformador — as mesmas colunas que o card
      // mostra, conforme a solicitação (ver _camposDemandaGD, subestacao.js).
      const cabDem = ["Transformador"]
        .concat(!ehLigacaoNova ? [GD_ROTULOS_DEMANDA.atual] : [])
        .concat(
          ehLigacaoNova || ehAlteracaoDemanda
            ? [ehLigacaoNova ? GD_ROTULOS_DEMANDA.nova : GD_ROTULOS_DEMANDA.futura]
            : [],
        );
      // Somam sempre 182 (a largura útil da tabela).
      const largDem = cabDem.length === 3 ? [50, 66, 66] : [72, 110];
      const linhasDem = (d.trafos || [])
        .filter((t) => t.potencia || t.qte)
        .map((t, i) =>
          ["Trafo " + (i + 1)]
            .concat(!ehLigacaoNova ? [t.demandaAtual || "—"] : [])
            .concat(
              ehLigacaoNova || ehAlteracaoDemanda ? [t.demanda || "—"] : [],
            ),
        );
      if (linhasDem.length) tabela(cabDem, largDem, linhasDem);
      totRow(
        "Potência total instalada",
        (d.qtdTotalTrafos || 0) +
          " un · " +
          (d.potTotalTrafos || 0) +
          " kVA · demanda " +
          (d.demandaTotalTrafos || 0) +
          " kW",
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

  // ---- Padrão de entrada e usina ----
  // Fecha a etapa 5 no formulário; aqui vem em seção própria porque o bloco de
  // carga acima é condicional (só sai quando há cargas a declarar) e a
  // pergunta vale para qualquer solicitação.
  sec("PADRÃO DE ENTRADA E USINA");
  kvPairs([["Padrão pronto para ser ligado e usina instalada", d.decl81]]);
  P.gap(2);

  // ---- 4. Geração ----
  // Cada FONTE imprime o conjunto que declarou na etapa (ver renderFontes,
  // js/app.js): fotovoltaico (uma linha por MODELO de módulo e de inversor),
  // hidráulico (central + classificação de barragens), central térmica
  // (Biomassa / Cogeração Qualificada, o mesmo bloco nas duas) ou eólico.
  sec("4.  DADOS DA GERAÇÃO");
  const gerPairs = [
    ["Quantidade de fontes", d.qtdFontes],
    ["Modalidade de operação", d.modoOperacao],
    // Regra 22: acompanha a modalidade de operação, que é o que a origina.
    ...(d.gridZero === "Sim"
      ? [["Dispensa de análise de inversão de fluxo (art. 73-A)", sn(d.decl95)]]
      : []),
    ["Potência Ativa Instalada Total (kW)", d.potAtivaInstalada],
  ];
  if (ehAlteracaoGeracao)
    gerPairs.push(["Potência de Geração Atual (kW)", d.potGeracaoAtual]);
  gerPairs.push(
    [
      "Modalidade de compensação",
      // A trava vem do Grid Zero (ver onModalidade) — o PDF diz isso, para o
      // valor não parecer escolha livre do solicitante.
      d.modalidade + (d.gridZero === "Sim" ? " (travada — Grid Zero)" : ""),
    ],
    ["Qtde. instalações a receber crédito", d.qtdInstalacoesCredito],
    // A demanda a contratar de geração sai na seção 2 (Dados da unidade),
    // junto do restante do que é contratado — imprimi-la aqui a repetiria.
    ["Anexou contrato de constituição", d.anexouContrato],
  );
  if (d.modalidade === "Geração Compartilhada")
    gerPairs.push([
      "Documentação do consórcio verificada",
      d.consorcioVerificado,
    ]);
  kvPairs(gerPairs);
  // Um MODELO por linha: a usina costuma misturar modelos, e os totais não
  // dizem de quê são feitos. Mesmas larguras da tabela de transformadores
  // (somam a caixa útil de 182 mm).
  const linhasEquipFV = (lista) =>
    (lista || [])
      .filter((e) => e.modelo || e.potNominal || e.quantidade)
      .map((e) => [
        e.modelo || "—",
        e.fabricante || "—",
        e.potNominal || "—",
        e.quantidade || "—",
        fmt2((parseFloat(e.potNominal) || 0) * (parseFloat(e.quantidade) || 0)),
      ]);
  const largEquipFV = [50, 46, 30, 18, 38];
  const cabEquipFV = (o) => [o, "Fabricante", "Pot. nom.", "Qte", "Total (kW)"];
  (d.fontes || []).forEach((f, i) => {
    subSec(`4.${i + 1}  Fonte de Geração ${i + 1}`);
    kvPairs([
      ["Tipo de Fonte Primária", f.fontePrimaria],
      ["Potência da Fonte (kW)", f.potencia],
      ["Tecnologia de geração", f.tipoGeracao],
    ]);
    if (f.fontePrimaria === "Solar") {
      kvPairs([
        ["Módulos — Quantidade total", f.qtdModulos],
        ["Módulos — Pot. total (kW)", f.potTotalModulos],
        ["Área dos Arranjos (m²)", f.areaArranjos],
        ["Inversores — Quantidade total", f.qtdInversores],
        ["Inversores — Pot. total (kW)", f.potTotalInversores],
        ["Tensão de Conexão do Inversor (V)", f.tensaoConexaoInversor],
      ]);
      const modRows = linhasEquipFV(f.modulos);
      if (modRows.length) tabela(cabEquipFV("Módulo"), largEquipFV, modRows);
      const invRows = linhasEquipFV(f.inversores);
      if (invRows.length) tabela(cabEquipFV("Inversor"), largEquipFV, invRows);
    } else if (f.fontePrimaria === "Hidráulica") {
      kvPairs([
        ["Potência Aparente (kVA)", f.hidroPotAparente],
        ["Tensão (kV)", f.hidroTensao],
        ["Nome do rio", f.hidroRio],
        ["Sub-bacia", f.hidroSubBacia],
        ["Fator de Potência", f.hidroFatorPotencia],
        ["Potência Instalada (kW)", f.hidroPotInstalada],
        ["Nív. Oper. Normal Montante (m)", f.hidroNivelMontante],
        ["Nív. Oper. Normal Jusante (m)", f.hidroNivelJusante],
      ]);
      // Classificação da barragem em linhas de largura total: em duas colunas
      // os rótulos longos comem a meia-coluna e o valor sairia cortado. Sem
      // "≥": as fontes padrão do jsPDF escrevem em cp1252, que não o tem.
      fullLine("Altura da barragem maior ou igual a 15 m", f.hidroBarragemAltura);
      GD_BARRAGEM_PERGUNTAS.forEach((q) => fullLine(q.rotulo, f[q.chave]));
    } else if (GD_FONTES_CENTRAL_TERMICA.includes(f.fontePrimaria)) {
      // O despacho de qualificação só aparece quando informado — é "caso
      // aplicável" nas duas fontes e kvPairs descarta o par vazio.
      kvPairs([
        ["Potência Aparente (kVA)", f.bioPotAparente],
        ["Potência Instalada (kW)", f.bioPotInstalada],
        ["Combustível", f.bioCombustivel],
        ["Fator de Potência", f.bioFatorPotencia],
        ["Máquina motriz", f.bioMaqMotriz],
        ["Ciclo termodinâmico", f.bioCicloTermodinamico],
        ["Nº do Despacho de qualificação", f.bioDespachoQualificacao],
      ]);
    } else if (f.fontePrimaria === "Eólica") {
      kvPairs([
        ["Quantidade de Aerogeradores", f.eolQtdAerogeradores],
        ["Potência Instalada (kW)", f.eolPotInstalada],
        ["Fabricante dos Aerogeradores", f.eolFabricante],
        ["Modelo dos Aerogeradores", f.eolModelo],
        ["Altura da pá (m)", f.eolAlturaPa],
        ["Eixo do rotor", f.eolEixoRotor],
        ["Fator de Potência", f.eolFatorPotencia],
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
  // Contato da área responsável: na tela ele vive dentro do próprio card da
  // Garantia (etapa 7), unificado com as instruções de apresentação — aqui
  // acompanha a mesma seção, em vez de uma seção só para ele.
  fullLine("Responsável/Área", GD_CONTATO_CEMIG.responsavel);
  fullLine("Endereço", GD_CONTATO_CEMIG.endereco);
  kvPairs([
    ["Telefone", GD_CONTATO_CEMIG.telefone],
    ["E-mail", GD_CONTATO_CEMIG.email],
  ]);
  P.gap(2);

  // O checklist de Documentação Técnica e as declarações genéricas saíram do
  // formulário junto com a etapa que os hospedava. As duas perguntas que
  // sobreviveram foram impressas acima, cada uma na seção que a origina.

  // ---- 7. Correspondência ----
  sec("7.  CORRESPONDÊNCIA E FATURA");
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
  P.gap(2);

  // ---- 8. Observações ----
  // Só sai quando há texto, como no BT (bt/js/pdf-doc.js): um cabeçalho sobre
  // espaço em branco não acrescenta nada ao documento.
  if ((d.obs || "").trim()) {
    sec("8.  OBSERVAÇÕES");
    _paragrafoMotorGD(P, d.obs);
    P.gap(2);
  }
  P.gap(2);

  P.assinatura();
  const nomeArq = (d.titular || "MiniGD")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .slice(0, 30);
  P.save(`CEMIG_MiniGD_${nomeArq}.pdf`);
}

/* ============================================================
   ANÁLISE DE PARTIDA DE MOTORES — uma folha por motor pesado
   ------------------------------------------------------------
   Porte de gerarPdfAnalisePartidaMT() (mt/js/pdf.js) com o modelo de
   conteúdo de conteudoAnalisePartida() (mt/js/conteudo.js): mesmas
   seções, mesmos rótulos, mesma ordem e o mesmo chassi visual
   (criarPdfGD), então o documento sai igual ao do MT.

   O MT monta essas seções pela camada neutra de conteúdo, que serve
   também à prévia da tela dele; aqui só existe o PDF, então as seções
   são emitidas direto nas primitivas do chassi — o agrupamento em
   duas colunas (kvPairs) e a linha inteira (fullLine) reproduzem o
   que _renderCamposPdfMT() faz com aquele modelo.

   Os dados vêm do card do motor pesado (js/subestacao.js), que já os
   coleta em motores[i].analisePartida. As três chaves que no MT só a
   página "Análise de Partida" preenche (fpPartida, dispositivo, tap)
   ficam vazias — e campo vazio não é impresso, o chassi o descarta.
   ============================================================ */
const GD_NOTAS_MOTORES = [
  "1 - Em caso de partida sequencial de motores, preencher uma folha para cada motor, indicando a ordem de partida.",
  "2 - Anexar, sempre que possível, a(s) folha(s) das características elétricas, fornecida(s) pelo fabricante do motor.",
];

/* Formatação idêntica à do fmt() do MT (mt/js/app.js): duas casas e "—"
   quando não é número. O chassi trata "—" como vazio, então o campo
   simplesmente não sai — mesmo efeito que no MT. */
function _fmtMotorGD(n, d = 2) {
  return n == null || isNaN(n)
    ? "—"
    : Number(n).toLocaleString("pt-BR", {
        minimumFractionDigits: d,
        maximumFractionDigits: d,
      });
}
/* Texto corrido sem rótulo (as notas do rodapé). fullLine("", …) sairia com
   um ":" solto, daí desenhar direto com quebra automática — é o
   _paragrafoPdfMT() do MT. */
function _paragrafoMotorGD(P, texto) {
  const linhas = P.doc.splitTextToSize(String(texto), P.CW - 2);
  P.checkSpace(2 + linhas.length * 4.2);
  P.doc.setFont("helvetica", "normal");
  P.doc.setFontSize(9);
  P.doc.setTextColor(30, 32, 42);
  P.doc.text(linhas, P.MG + 1, P.state.cy + 4.5);
  P.state.cy += 2 + linhas.length * 4.2;
}
function _dataExtensoMotorGD() {
  const h = new Date();
  return `${String(h.getDate()).padStart(2, "0")} de ${h.toLocaleDateString("pt-BR", { month: "long" })} de ${h.getFullYear()}`;
}
/* Motores pesados da solicitação, na ordem em que foram declarados —
   equivale a motoresPesadosIdx() do MT. */
function motoresPesadosGD(d) {
  return (d.motores || []).filter((m) => motorPesadoGD(m));
}

function gerarPdfAnalisePartidaGD(d) {
  const P = criarPdfGD(
    "FORMULÁRIO PARA A ANÁLISE DE PARTIDA DE MOTORES",
    "Minigeração Distribuída",
  );
  const { sec, kvPairs, fullLine } = P;
  // O estado guarda a tensão em volts; CalculoMT raciocina em kV.
  const tMTkV = (parseFloat(d.tensaoAtendimento) || 0) / 1000 || "";
  const un = (v, u) => (String(v ?? "").trim() ? `${v} ${u}` : "");
  const pesados = motoresPesadosGD(d);

  // Uma folha por motor pesado. Sem nenhum, sai a folha única que o MT
  // também emite, dizendo que não há motor no critério.
  const folhas = pesados.length
    ? pesados.map((m) => () => {
        const ap = ensureAnalisePartidaGD(m);
        const c = CalculoMT.calcularMotor(
          {
            potenciaCV: m.cv,
            fp: m.fp,
            rendimento: m.rend,
            tensaoV: m.volts,
            relacaoIpIn: m.ipIn,
          },
          tMTkV,
        );
        // ÚNICO desvio do MT, e por falta de origem do dado: lá o dispositivo
        // impresso vem de ap.dispositivo, preenchido na página "Análise de
        // Partida" — que aqui não existe, o que deixaria esta seção sempre em
        // branco. O card do motor já pergunta a mesma coisa (m.dispositivo, com
        // m.tap sob "Chave Compensadora"), então ela é a origem quando a ficha
        // não tiver a sua. Se a página do MT for portada, ap volta a mandar.
        const disp = ap.dispositivo || m.dispositivo || "";
        const dispTap = ap.dispositivo ? ap.tap : m.tap;
        const dispositivo = disp
          ? disp +
            (disp === "Chave Compensadora" && dispTap
              ? ` — Tap: ${dispTap} %`
              : "")
          : "";
        sec("IDENTIFICAÇÃO");
        kvPairs([["Cliente", d.titular]]);
        P.gap(1);
        sec("TIPO DO MOTOR / NÚMERO DE FASES");
        kvPairs([
          ["Tipo do motor", m.tipo],
          ["Número de fases", m.fases || "Trifásico"],
        ]);
        P.gap(1);
        sec("DADOS ELÉTRICOS");
        kvPairs([
          ["Potência do motor", un(m.cv, "CV")],
          ["Tensão no motor", un(m.volts, "V")],
          [
            "Corrente de partida (sem dispositivo de partida)",
            c.iPartida == null ? "" : _fmtMotorGD(c.iPartida) + " A",
          ],
          [
            "Corrente nominal",
            c.iNominal == null ? "" : _fmtMotorGD(c.iNominal) + " A",
          ],
          ["Relação Ip/In", m.ipIn],
          ["Fator de potência em regime", m.fp],
          ["Fator de potência na partida", ap.fpPartida],
        ]);
        P.gap(1);
        sec("NÚMERO DE PARTIDAS");
        kvPairs([["Número de partidas", ap.numPartidas]]);
        P.gap(1);
        sec("DISPOSITIVO AUXILIAR DE PARTIDA (QUANDO HOUVER)");
        kvPairs([["Dispositivo", dispositivo]]);
        P.gap(1);
        sec("ORDEM DE PARTIDA DO MOTOR (CASOS DE DOIS OU MAIS MOTORES)");
        kvPairs([["Ordem de partida", ap.ordemPartida]]);
        P.gap(1);
        sec("CARGAS OPERANDO ENQUANTO O MOTOR PARTE (QUANDO HOUVER)");
        kvPairs([
          ["Potência", un(ap.cargaOperanteKVA, "kVA")],
          ["Fator de potência", ap.cargaOperanteFP],
        ]);
        P.gap(1);
        sec("CARGAS SENSÍVEIS A FLUTUAÇÕES DE TENSÃO");
        kvPairs([
          ["Tipo", ap.cargaSensivelTipo],
          ["Flutuação admissível", un(ap.cargaSensivelPercentual, "%")],
        ]);
        P.gap(1);
        sec("SIMULTANEIDADE DE PARTIDA");
        fullLine(
          "Em caso de simultaneidade, relacionar os motores e suas características elétricas",
          ap.simultaneidade,
        );
        P.gap(1);
        sec("TRANSFORMADOR DO CONSUMIDOR");
        kvPairs([
          [
            "Potência do transformador",
            un(_fmtMotorGD(d.potTotalTrafos), "kVA"),
          ],
          ["Impedância percentual do transformador", un(ap.impedanciaZ, "%")],
        ]);
        P.gap(1);
      })
    : [
        () => {
          sec("IDENTIFICAÇÃO");
          kvPairs([["Cliente", d.titular]]);
          _paragrafoMotorGD(
            P,
            "Nenhum motor pesado identificado (trifásico acima de 50 CV ou monofásico acima de 15 CV).",
          );
          P.gap(1);
        },
      ];

  folhas.forEach((folha, i) => {
    if (i > 0) {
      P.doc.addPage();
      P.state.cy = P.MG;
      P.header();
    }
    folha();
    P.gap(2);
    sec("NOTAS");
    GD_NOTAS_MOTORES.forEach((n) => _paragrafoMotorGD(P, n));
    P.gap(2);
    fullLine("Data", _dataExtensoMotorGD());
    P.assinatura("Responsável pelas informações");
  });

  const nomeArq = (d.titular || "MiniGD")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .slice(0, 30);
  P.save(`Analise_Partida_Motores_${nomeArq}.pdf`);
}
