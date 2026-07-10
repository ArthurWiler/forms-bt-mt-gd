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
  const ehFV = d.fontePrimaria === "Solar";

  // ---- 1. Identificação ----
  sec("1.  IDENTIFICAÇÃO DA UNIDADE CONSUMIDORA");
  const idPairs = [
    ["Número da instalação", d.instalacao],
    ["Titular", d.titular],
    ["Grupo", d.grupo],
    ["Classe", d.classe],
    ["CPF/CNPJ", d.cpfCnpj],
    ["Fast Track (art. 73-A)", d.fastTrack],
  ];
  if (d.fastTrack === "Sim") idPairs.push(["Regra de enquadramento", d.fastRegra]);
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
    ["Tensão de Atendimento (V)", d.tensaoAtendimento],
    ["Mudança de Local do Padrão", d.mudancaLocal],
    ["Distância < 30 m do poste", d.distMenor30],
    ["Telhado arrendado", d.telhadoArrendado],
  ];
  if (GD_SOLICITACOES_AUMENTO_POTENCIA.includes(d.solicitacao))
    ucPairs.splice(4, 0, ["Nova Proteção", d.novaProtecao]);
  if (!ehLigacaoNova)
    ucPairs.push(["Disjuntor Individual Atual (A)", d.disjAtualA]);
  if (d.telhadoArrendado === "Sim")
    ucPairs.push(["2 instalações no DUB/memorial", d.duasInstalacoesDUB]);
  if (!ehLigacaoNova) {
    ucPairs.push(
      ["Instalação existente no local", d.instExistente],
      ["Instalação existente BT/MT", d.instExistenteBTMT],
    );
  }
  if (ehBT) {
    ucPairs.push([
      "Demanda contratada consumo (kW)",
      d.demandaConsumo || "Não se aplica — Baixa Tensão",
    ]);
  } else {
    ucPairs.push(
      ["Demanda contratada consumo (kW)", d.demandaConsumo],
      ["Demanda contratada geração (kW)", d.demandaGeracao],
    );
  }
  kvPairs(ucPairs);
  // Transformadores (apenas MT, quando houver)
  if (!ehBT) {
    const trafoRows = (d.trafos || [])
      .filter((t) => t.qte || t.potencia)
      .map((t, i) => [`Trafo ${i + 1}`, t.qte || "—", `${t.potencia || "—"} kVA`]);
    if (trafoRows.length)
      tabela(["Transformador", "Qte", "Potência"], [80, 30, 72], trafoRows);
  }
  P.gap(2);

  // ---- 3. Documentação a anexar ----
  sec("3.  DOCUMENTAÇÃO A ANEXAR");
  GD_DOCUMENTOS.forEach((dc) =>
    fullLine(`${dc.id} ${d.docs && d.docs[dc.id] ? "[X]" : "[ ]"}`, dc.txt),
  );
  P.gap(2);

  // ---- Formulário de Carga ----
  const c = d.cargas || {};
  const temCarga =
    (c.qtds || []).some((q) => (q || 0) > 0) ||
    (c.mots || []).some((m) => (parseInt(m.q) || 0) > 0) ||
    (c.extras || []).some((m) => (parseInt(m.q) || 0) > 0);
  if (GD_SOLICITACOES_FORM_CARGA.includes(d.solicitacao) || temCarga) {
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
      "Potência Ativa Instalada Total (kW)",
      (d.potAtivaInstalada || "—") +
        (d.fastTrack === "Sim"
          ? ` (limite Fast Track: ${GD_FAST_LIMITE_USINA_KW} kW)`
          : ""),
    ],
  ];
  if ((d.solicitacao || "").indexOf("GD Existente") >= 0)
    gerPairs.push(["Potência de geração já existente (kW)", d.potGeracaoExistente]);
  gerPairs.push(
    [
      "Tipo de geração",
      d.tipoGeracao === "Outra (especificar):"
        ? `Outra: ${d.tipoGeracaoOutro}`
        : d.tipoGeracao,
    ],
    [
      "Modalidade de compensação",
      d.modalidade + (d.fastTrack === "Sim" ? " (travada — Fast Track)" : ""),
    ],
    ["Qtde. instalações a receber crédito", d.qtdInstalacoesCredito],
  );
  kvPairs(gerPairs);
  if (ehFV) {
    kvPairs([
      ["Módulos — Modelo", d.modeloModulos],
      ["Módulos — Fabricante", d.fabricanteModulos],
      ["Módulos — Pot. nominal (W)", d.potNominalModulo],
      ["Módulos — Quantidade", d.qtdModulos],
      ["Módulos — Pot. total (kW)", d.potTotalModulos],
      ["Área dos Arranjos (m²)", d.areaArranjos],
      ["Inversores — Modelo", d.modeloInversores],
      ["Inversores — Fabricante", d.fabricanteInversores],
      ["Inversores — Pot. nominal (kW)", d.potNominalInversor],
      ["Inversores — Quantidade", d.qtdInversores],
      ["Inversores — Pot. total (kW)", d.potTotalInversores],
      ["Tensão de Conexão do Inversor (V)", d.tensaoConexaoInversor],
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
