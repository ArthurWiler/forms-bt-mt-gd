// ============================================================
// MICROGERAÇÃO DISTRIBUÍDA — Geração de PDF
// Usa o motor visual compartilhado (shared/js/gd-pdf-base.js), idêntico ao
// módulo de Baixa Tensão: barra superior, seções, pares em 2 colunas,
// linhas com quebra automática, tabelas com zebra e linha de total.
// ============================================================
function gerarPdfMicroGD(d) {
  const P = criarPdfGD(
    "Formulário CEMIG — Microgeração Distribuída",
    "Solicitação de Acesso — REN 1.000/2021",
  );
  const { sec, kvPairs, fullLine, totRow, tabela } = P;
  const sn = (b) => (b ? "Sim" : "Não");
  const ehBT = d.grupo === "B";
  const ehLigacaoNova = (d.solicitacao || "").indexOf("Nova Unidade") >= 0;
  // Único caso, fora da ligação nova, com potência FUTURA a declarar.
  const ehAlteracaoPotencia =
    (d.solicitacao || "").indexOf("COM Alteração de Potência Disponibilizada") >=
    0;
  /* Imprime o par de potências (consumo ou geração) com os mesmos campos e
     rótulos que a etapa mostrou — a tabela de nomes é GD_ROTULOS_POTENCIA
     (js/data.js) e a regra de quais campos existem é a mesma de
     _paresPotenciaGD() (js/app.js): conexão nova declara um único valor;
     conexão existente, a potência atual e — só quando há alteração de potência
     — também a futura. Mesmas exceções da etapa: no Grupo B a potência de
     CONSUMO nova/futura não é declarada (ela sai do Formulário de Carga,
     impresso na seção própria) e a linha nem é impressa — o campo está oculto e
     vazio lá, e imprimi-lo daria "—" onde o dado existe em outro lugar; a
     ATUAL continua, é a potência que a UC já tem. O par de GERAÇÃO pertence ao
     conjunto da fonte Solar: fora dela não é perguntado nem impresso — e dele
     só resta a ATUAL, porque a nova/futura é a potência da usina, impressa em
     linha própria acima. */
  const parPotencia = (pares, tipo, novaOuFutura, atual) => {
    if (tipo === "geracao" && d.fontePrimaria !== "Solar") return;
    const rot = (papel) => gdRotuloPotencia(tipo, papel, d.grupo);
    const semNovaOuFutura =
      tipo === "geracao" || (tipo === "consumo" && d.grupo !== "A");
    if (ehLigacaoNova) {
      if (!semNovaOuFutura) pares.push([rot("nova"), novaOuFutura]);
    } else {
      pares.push([rot("atual"), atual]);
      if (ehAlteracaoPotencia && !semNovaOuFutura)
        pares.push([rot("futura"), novaOuFutura]);
    }
  };
  const ehFV = d.fontePrimaria === "Solar";
  const ehHidro = d.fontePrimaria === "Hidráulica";
  // Biomassa e Cogeração Qualificada declaram a MESMA central (bloco e chaves
  // bio* compartilhados — ver GD_FONTES_CENTRAL_TERMICA, js/data.js), então a
  // seção da central é impressa igual nas duas.
  const ehBio = GD_FONTES_CENTRAL_TERMICA.includes(d.fontePrimaria);
  const ehEol = d.fontePrimaria === "Eólica";

  // ---- 1. Identificação ----
  sec("1.  IDENTIFICAÇÃO DA UNIDADE CONSUMIDORA");
  const idPairs = [
    ["Instalação / UC / Medidor", d.instalacao],
    ["Titular", d.titular],
    ["Grupo", d.grupo],
    ["Classe", d.classe],
    ["CPF/CNPJ", d.cpfCnpj],
    ["Fast Track (art. 73-A)", d.fastTrack],
  ];
  idPairs.push(
    ["Grid Zero", d.gridZero],
    ["CEP", d.cep],
    ["Telefone", d.telefone],
    ["Celular", d.celular],
    ["E-mail", d.email],
  );
  kvPairs(idPairs);
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
  P.gap(2);

  // ---- 2. Dados da UC ----
  sec("2.  DADOS DA UNIDADE CONSUMIDORA");
  const ucPairs = [
    [
      "Coordenadas",
      `Lat ${d.latitude || "—"} · Lon ${d.longitude || "—"}`,
    ],
    [
      "Coordenadas UTM (calculada)",
      `Fuso ${d.fuso || "—"} · E ${d.utmE || "—"} · N ${d.utmN || "—"}`,
    ],
    [
      "Gerador de emergência",
      d.geradorEmergencia +
        (d.geradorEmergencia === "Sim" ? ` (${d.geradorPotencia || "—"} kVA)` : ""),
    ],
    [
      "Tipo de Subestação (ND 5.3)",
      ehBT ? "Não se aplica — Baixa Tensão" : d.tipoSE,
    ],
    ["Tipo de Solicitação", d.solicitacao],
    ["Tipo de edificação", d.edificacao],
    ["Padrão de Entrada", d.edifTipo],
    ["Ramal", d.ramal],
    [
      "Disjuntor Geral",
      `${d.disjGeralFase || "—"} ${d.disjGeralA || ""}${d.qteDisjGeral ? " · Qte " + d.qteDisjGeral : ""}`.trim(),
    ],
    // O valor guardado é sempre o volt "cru" (chave da regra de subestação):
    // no Grupo A ele sai formatado em kV, como no rótulo do <select>.
    [
      "Tensão de conexão",
      d.tensaoAtendimento
        ? ehBT
          ? d.tensaoAtendimento + " V"
          : (Number(d.tensaoAtendimento) / 1000).toFixed(1).replace(".", ",") +
            " kV"
        : "",
    ],
    ["Telhado arrendado", d.telhadoArrendado],
  ];
  if (GD_SOLICITACOES_AUMENTO_POTENCIA.includes(d.solicitacao))
    ucPairs.splice(4, 0, ["Nova Proteção", d.novaProtecao]);
  // Campos de unidade JÁ existente: numa ligação nova não há padrão instalado,
  // logo não há disjuntor "atual" nem local a mudar. O disjuntor individual
  // ainda depende do grupo: no Grupo A o atendimento é dimensionado pela
  // demanda contratada e o campo nem aparece no formulário.
  if (!ehLigacaoNova) {
    if (ehBT) ucPairs.push(["Disjuntor Individual Atual (A)", d.disjAtualA]);
    ucPairs.push(["Mudança de Local do Padrão", d.mudancaLocal]);
  }
  // Unidade arrendada: dados próprios do arrendamento (spec Figma).
  if (d.telhadoArrendado === "Sim")
    ucPairs.push(
      ["Nº da unidade/instalação arrendada", d.arrendUC],
      ["Nível de tensão da unidade arrendada", d.arrendTensao],
    );
  // Novo local do padrão de entrada (etapa 5): endereço próprio, informado só
  // quando há mudança de local.
  if (d.mudancaLocal === "Sim" && !ehLigacaoNova) {
    ucPairs.push([
      "Novo local do padrão",
      // Urbano x rural: o novo local segue a zona escolhida na etapa 3.
      (d.localizacao === "Rural"
        ? [
            d.mudDistritoComunidade,
            d.mudNomePropriedade,
            d.mudPontoRef,
            d.mudInstProxima ? "Inst. próxima " + d.mudInstProxima : "",
            [d.mudMunicipio, d.mudEstado].filter(Boolean).join("/"),
          ]
        : [
            [d.mudLogradouro, d.mudNumero].filter(Boolean).join(", "),
            d.mudComplemento,
            d.mudBairro,
            [d.mudMunicipio, d.mudEstado].filter(Boolean).join("/"),
            d.mudCep ? "CEP " + d.mudCep : "",
          ]
      )
        .filter(Boolean)
        .join(" - ") || "—",
    ]);
    ucPairs.push([
      "Coordenadas do novo local",
      `Lat ${d.mudLatitude || "—"} · Lon ${d.mudLongitude || "—"}`,
    ]);
  }
  if (!ehLigacaoNova) {
    ucPairs.push(
      ["Instalação / UC / Medidor existente no local", d.instExistente],
      ["Instalação existente BT/MT", d.instExistenteBTMT],
    );
  }
  // Potência de consumo: os mesmos campos e rótulos da etapa "Tipo de
  // atendimento" (a de GERAÇÃO sai na seção 4, junto do resto da etapa dela).
  parPotencia(ucPairs, "consumo", d.demandaConsumo, d.demandaConsumoAtual);
  kvPairs(ucPairs);
  // Bloco técnico da subestação — só no Grupo A (em BT não há subestação).
  // Espelha a etapa "Tipo de atendimento": transformadores, tarifação/demanda,
  // motores e carga operante na partida.
  if (!ehBT) {
    const trafoRows = (d.trafos || [])
      .filter((t) => t.qte || t.potencia)
      .map((t, i) => [`Trafo ${i + 1}`, t.qte || "—", `${t.potencia || "—"} kVA`]);
    if (trafoRows.length)
      tabela(["Transformador", "Qte", "Potência"], [80, 30, 72], trafoRows);
    // Sem tarifação/demanda próprias: a demanda que dimensiona a subestação é
    // a "Demanda contratada consumo (kW)" já impressa acima.
    const motoRows = (d.motores || [])
      .filter((m) => m.cv || m.volts)
      .map((m, i) => [
        `Motor ${i + 1}`,
        m.fases || "—",
        `${m.cv || "—"} CV`,
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
  }
  P.gap(2);

  // ---- 3. Documentação a anexar ----
  sec("3.  DOCUMENTAÇÃO A ANEXAR");
  GD_DOCUMENTOS.forEach((dc) =>
    fullLine(`${dc.id} ${d.docs && d.docs[dc.id] ? "[X]" : "[ ]"}`, dc.txt),
  );
  P.gap(2);

  // ---- Formulário de Carga ----
  // Coletivo/Agrupamento: a carga não é de uma UC só — a etapa "Dados das
  // unidades" lista todas e a demanda residencial sai do ND-5.2. Ver
  // microgeracao/js/coletivo.js.
  const ehColetivoPdf = d.edifTipo === "Edificação Coletiva ou Agrupamento";
  const c = ehColetivoPdf ? {} : d.cargas || {};
  const temCarga =
    (c.qtds || []).some((q) => (q || 0) > 0) ||
    (c.mots || []).some((m) => (parseInt(m.q) || 0) > 0) ||
    (c.extras || []).some((m) => (parseInt(m.q) || 0) > 0);
  if (ehColetivoPdf) {
    gdPdfSecaoColetivo(d, { sec, kvPairs, fullLine, totRow, tabela, P });
  } else if (GD_SOLICITACOES_FORM_CARGA.includes(d.solicitacao) || temCarga) {
    sec("FORMULÁRIO DE CARGA");
    if (GD_SOLICITACOES_FORM_CARGA.includes(d.solicitacao))
      fullLine("Preenchimento", "Obrigatório (Ligação Nova / Aumento de Carga)");
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
    ["Tipo de Fonte Primária", d.fontePrimaria],
    [
      "Potência de geração (kW)",
      (d.potAtivaInstalada || "—") +
        (d.fastTrack === "Sim"
          ? ` (limite Fast Track: ${GD_FAST_LIMITE_USINA_KW} kW)`
          : ""),
    ],
  ];
  // A geração que a UC já tem é a "atual" deste par — não há campo "Potência
  // já conectada" em separado.
  parPotencia(gerPairs, "geracao", "", d.demandaGeracaoAtual);
  gerPairs.push(
    // Sem o caso "Outra: <texto livre>": a lista de tecnologias (GD_TIPO_GERACAO)
    // ficou fechada em máquina síncrona e conversor/inversor.
    ["Tipo de geração", d.tipoGeracao],
    [
      "Modalidade de compensação",
      // A trava vem do Fast Track ou do Grid Zero (ver recalcGeracao) — o PDF
      // diz qual delas, para o valor não parecer escolha livre do solicitante.
      d.modalidade +
        (d.fastTrack === "Sim"
          ? " (travada — Fast Track)"
          : d.gridZero === "Sim"
            ? " (travada — Grid Zero)"
            : ""),
    ],
    ["Qtde. instalações a receber crédito", d.qtdInstalacoesCredito],
  );
  kvPairs(gerPairs);
  if (ehFV) {
    kvPairs([
      ["Módulos — Quantidade total", d.qtdModulos],
      ["Módulos — Pot. total (kW)", d.potTotalModulos],
      ["Área dos Arranjos (m²)", d.areaArranjos],
      ["Inversores — Quantidade total", d.qtdInversores],
      ["Inversores — Pot. total (kW)", d.potTotalInversores],
      ["Tensão de Conexão do Inversor (V)", d.tensaoConexaoInversor],
    ]);
    // Um MODELO por linha: a usina costuma misturar modelos, e os totais
    // acima não dizem de quê são feitos. Mesmas larguras da tabela de
    // transformadores (somam a caixa útil de 182 mm).
    const linhasEquip = (lista) =>
      (lista || [])
        .filter((e) => e.modelo || e.potNominal || e.quantidade)
        .map((e) => [
          e.modelo || "—",
          e.fabricante || "—",
          e.potNominal || "—",
          e.quantidade || "—",
          fmt2(
            (parseFloat(e.potNominal) || 0) * (parseFloat(e.quantidade) || 0),
          ),
        ]);
    // O cabeçalho já nomeia o conjunto, como na tabela de transformadores —
    // sem linha de legenda antes dela.
    const larg = [50, 46, 30, 18, 38];
    const cab = (o) => [o, "Fabricante", "Pot. nom.", "Qte", "Total (kW)"];
    const modRows = linhasEquip(d.modulos);
    if (modRows.length) tabela(cab("Módulo"), larg, modRows);
    const invRows = linhasEquip(d.inversores);
    if (invRows.length) tabela(cab("Inversor"), larg, invRows);
  }
  // Fonte Hidráulica: dados da central/aproveitamento e a classificação de
  // segurança de barragens (REN 696/2015). As quatro perguntas de
  // classificação saem de GD_BARRAGEM_PERGUNTAS (js/data.js), pelos mesmos
  // rótulos curtos que a validação usa; a 1ª (altura ≥ 15 m) é Sim/Não.
  if (ehHidro) {
    kvPairs([
      ["Potência Aparente (kVA)", d.hidroPotAparente],
      ["Tensão (kV)", d.hidroTensao],
      ["Nome do rio", d.hidroRio],
      ["Sub-bacia", d.hidroSubBacia],
      ["Fator de Potência", d.hidroFatorPotencia],
      ["Potência Instalada (kW)", d.hidroPotInstalada],
      ["Nív. Oper. Normal Montante (m)", d.hidroNivelMontante],
      ["Nív. Oper. Normal Jusante (m)", d.hidroNivelJusante],
    ]);
    // Classificação da barragem em linhas de largura total: em duas colunas os
    // rótulos longos comem a meia-coluna e o valor sairia cortado. Sem "≥": as
    // fontes padrão do jsPDF escrevem em cp1252, que não tem o sinal.
    fullLine(
      "Altura da barragem maior ou igual a 15 m",
      d.hidroBarragemAltura,
    );
    GD_BARRAGEM_PERGUNTAS.forEach((p) => fullLine(p.rotulo, d[p.chave]));
  }
  // Central térmica (Biomassa / Cogeração Qualificada): dados da central. O
  // despacho de qualificação só aparece quando informado — é "caso aplicável"
  // nas duas fontes e kvPairs descarta o par vazio.
  if (ehBio) {
    kvPairs([
      ["Potência Aparente (kVA)", d.bioPotAparente],
      ["Potência Instalada (kW)", d.bioPotInstalada],
      ["Combustível", d.bioCombustivel],
      ["Fator de Potência", d.bioFatorPotencia],
      ["Máquina motriz", d.bioMaqMotriz],
      ["Ciclo termodinâmico", d.bioCicloTermodinamico],
      ["Nº do Despacho de qualificação", d.bioDespachoQualificacao],
    ]);
  }
  // Fonte Eólica: dados da central.
  if (ehEol) {
    kvPairs([
      ["Quantidade de Aerogeradores", d.eolQtdAerogeradores],
      ["Potência Instalada (kW)", d.eolPotInstalada],
      ["Fabricante dos Aerogeradores", d.eolFabricante],
      ["Modelo dos Aerogeradores", d.eolModelo],
      ["Altura da pá (m)", d.eolAlturaPa],
      ["Eixo do rotor", d.eolEixoRotor],
      ["Fator de Potência", d.eolFatorPotencia],
    ]);
  }
  kvPairs([
    ["CEG do empreendimento", d.ceg],
    ["Nº Ato de Outorga/Registro", d.numAtoOutorga],
    ["Nome da Usina", d.nomeUsina],
    ["Ano do Ato", d.anoAtoOutorga],
    ["Tipo do Ato", d.tipoAtoOutorga],
  ]);
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

  // ---- 6. Documentação Técnica ----
  sec("6.  DOCUMENTAÇÃO TÉCNICA");
  GD_DOCS_TEC.forEach((dc) =>
    fullLine(`${dc.id} ${d.docsTec && d.docsTec[dc.id] ? "[X]" : "[ ]"}`, dc.txt),
  );
  P.gap(2);

  // ---- 7. Contato na Distribuidora ----
  sec("7.  CONTATO NA DISTRIBUIDORA");
  fullLine("Responsável/Área", GD_CONTATO_CEMIG.responsavel);
  fullLine("Endereço", GD_CONTATO_CEMIG.endereco);
  kvPairs([
    ["Telefone", GD_CONTATO_CEMIG.telefone],
    ["E-mail", GD_CONTATO_CEMIG.email],
  ]);
  P.gap(2);

  // ---- 8. Solicitações e Declarações ----
  sec("8.  SOLICITAÇÕES E DECLARAÇÕES");
  kvPairs([["8.1 Padrão pronto e usina instalada", d.decl81]]);
  fullLine("8.2 Renúncia ao direito de desistir", sn(d.decl82));
  fullLine("8.3 Autorizo entrega de contratos/pagamento", sn(d.decl83));
  fullLine("8.4 Declaração de conformidade (obrigatória)", sn(d.decl84));
  if (d.decl85Regra) fullLine("8.5 Dispensa art. 73-A", d.decl85Regra);
  fullLine("8.6 Informações verdadeiras (obrigatória)", sn(d.decl86));
  P.gap(2);

  // ---- 9. Correspondência ----
  sec("9.  CORRESPONDÊNCIA E FATURA");
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
  const nomeArq = (d.titular || "MicroGD")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .slice(0, 30);
  P.save(`CEMIG_MicroGD_${nomeArq}.pdf`);
}

/* ============================================================
   Seção "Formulário de Carga" do fluxo Coletivo/Agrupamento
   ------------------------------------------------------------
   Substitui a seção de UC única. Imprime a memória de cálculo do
   ND-5.2 (quando aplicável), a lista das UCs e os totais do
   agrupamento — os mesmos números exibidos na etapa "Dados das
   unidades" (ver microgeracao/js/coletivo.js).
   ============================================================ */
function gdPdfSecaoColetivo(d, H) {
  const { sec, kvPairs, fullLine, totRow, tabela, P } = H;
  const num = (v) => {
    const n = Number(String(v == null ? "" : v).replace(",", "."));
    return isNaN(n) ? 0 : n;
  };
  const ucs = d.ucs || [];
  const semAlt = (u) => (u && u.solicitacao) === "Caixa Existente sem Alteração";
  const residenciais = ucs.filter(
    (u) => u.atividade === "Residencial" && !semAlt(u),
  );
  const qtdApart = residenciais.length;
  const areaMedia = !qtdApart
    ? 0
    : residenciais.reduce((s, u) => s + num(u.area), 0) / qtdApart;
  const nd52 = nd52CalcularDemandaApartamentos(areaMedia, qtdApart);
  const modoCalculadora = qtdApart < 4;
  const temNaoRes = ucs.some(
    (u) => u.atividade && u.atividade !== "Residencial" && !semAlt(u),
  );

  sec("FORMULÁRIO DE CARGA — AGRUPAMENTO");
  const agr = d.agr || {};
  kvPairs([
    ["Tipo de edificação", d.edifTipo],
    ["Quantidade de unidades", String(ucs.length)],
    ["Demanda do condomínio (kVA)", agr.demandaIncendio || "—"],
    ["Disjuntor do condomínio", agr.disjIncendio || "—"],
  ]);

  // Método de cálculo da parte residencial.
  fullLine(
    "Método de cálculo",
    modoCalculadora
      ? "ND-5.1 — menos de 4 apartamentos residenciais: cada unidade detalha as próprias cargas"
      : "ND-5.2 — demanda dos apartamentos residenciais por quantidade e área média ponderada",
  );
  if (!modoCalculadora && nd52) {
    fullLine(
      "Memória de cálculo (ND-5.2)",
      `${qtdApart} apartamento(s) · área média ponderada ${fmt2(areaMedia)} m² · ` +
        `Fator F ${fmt2(nd52.fatorF)} · A ${fmt2(nd52.demandaAreaA)} → ` +
        `D = 1,4 × F × A = ${fmt2(nd52.demandaKVA)} kVA`,
    );
  }
  if (!modoCalculadora && temNaoRes)
    fullLine(
      "Demanda geral não residencial (kVA)",
      d.demandaNaoResidencial || "—",
    );

  // Lista das UCs.
  const linhas = ucs.map((u, i) => [
    String(i + 1) + (u.complemento ? " · " + u.complemento : ""),
    u.atividade || "—",
    u.atividade === "Residencial" ? (u.area ? u.area + " m²" : "—") : u.ramo || "—",
    modoCalculadora
      ? fmt2((u.cargas || {})._demanda || 0) + " kVA"
      : u.cargaPrevista
        ? u.cargaPrevista + " kW"
        : "—",
    u.disjPara || ((u.cargas || {})._disjuntores || [])[0] || "—",
  ]);
  if (linhas.length)
    tabela(
      [
        "Unidade",
        "Atividade",
        "Ramo/Área",
        modoCalculadora ? "Demanda" : "Carga prev.",
        "Disjuntor",
      ],
      [34, 30, 28, 28, 42],
      linhas,
    );

  // Totais do agrupamento.
  const cargaTotal = ucs.reduce((s, u) => {
    if (semAlt(u)) return s;
    return (
      s +
      (modoCalculadora ? num((u.cargas || {})._cargaKw) : num(u.cargaPrevista))
    );
  }, 0);
  const demandaTotal = modoCalculadora
    ? ucs.reduce(
        (s, u) => s + (semAlt(u) ? 0 : num((u.cargas || {})._demanda)),
        0,
      )
    : (nd52 ? nd52.demandaKVA : 0) +
      (temNaoRes ? num(d.demandaNaoResidencial) : 0);
  totRow(
    `Carga instalada ${fmt2(cargaTotal)} kW  |  Demanda total`,
    `${fmt2(demandaTotal)} kVA`,
  );
  fullLine("Disjuntor geral do agrupamento", d.disjGeralAgr || "—");
  P.gap(2);
}
