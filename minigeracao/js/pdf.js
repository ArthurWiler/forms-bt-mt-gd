// ============================================================
// MINIGERAÇÃO DISTRIBUÍDA — Geração de PDF (padrão visual CEMIG)
// Chassi (header/sec/kv) em shared/js/gd-pdf-base.js; sequência específica abaixo.
// ============================================================
function gerarPdfMiniGD(d) {
  const { doc, sec, kv } = criarPdfGD(
    "CEMIG — Solicitação de Acesso — Minigeração Distribuída"
  );

  sec("1 — Identificação da Unidade Consumidora");
  kv("Número da instalação", d.instalacao);
  kv("Titular", d.titular);
  kv("Grupo / Classe", `${d.grupo} / ${d.classe}`);
  kv("CPF/CNPJ", d.cpfCnpj);
  kv("Endereço", `${d.logradouro}, ${d.numero} ${d.complemento}`);
  kv("Bairro", d.bairro);
  kv("Município/UF", `${d.municipio} / ${d.estado}`);
  kv("CEP", d.cep);
  kv("Telefone / Celular", `${d.telefone || "—"} / ${d.celular || "—"}`);
  kv("E-mail", d.email);

  sec("2 — Dados da Unidade Consumidora");
  kv("Coordenadas UTM", `Fuso ${d.fuso || "—"} · E ${d.utmE || "—"} · N ${d.utmN || "—"}`);
  kv("Tipo de Subestação (ND 5.3)", d.tipoSE);
  (d.trafos || []).forEach((t, i) => { if (t.qte || t.potencia) kv(`Trafo ${i + 1}`, `${t.qte || "—"} × ${t.potencia || "—"} kVA`); });
  kv("Ligação do Transformador", d.tipoLigTrafo);
  kv("Impedância do Transformador (%)", d.impedanciaTrafo);
  kv("Gerador de Emergência (kVA)", d.geradorPotencia);
  kv("Tensão de Atendimento (V)", d.tensaoAtendimento);
  kv("Entrada de Energia", d.entradaEnergia);
  kv("Tipo de Solicitação", d.solicitacao);
  kv("Demanda geração / consumo (kW)", `${d.demandaGeracao || "—"} / ${d.demandaConsumo || "—"}`);
  kv("Grid Zero", d.gridZero);
  kv("Telhado arrendado", d.telhadoArrendado);
  if (d.telhadoArrendado === "Sim") kv("2 instalações no DUB/memorial", d.duasInstalacoesDUB);
  kv("Instalação existente no local", d.instExistente);
  kv("Instalação existente BT/MT", d.instExistenteBTMT);

  sec("3 — Documentação da UC a anexar");
  GD_DOCUMENTOS.forEach((dc) => kv(`${dc.id} ${d.docs && d.docs[dc.id] ? "[X]" : "[ ]"}`, dc.txt));

  sec("4 — Dados da Geração");
  kv("Quantidade de fontes", d.qtdFontes);
  kv("Potência Ativa Instalada Total (kW)", d.potAtivaInstalada);
  kv("Modalidade de compensação", d.modalidade);
  kv("Qtde. instalações a receber crédito", d.qtdInstalacoesCredito);
  kv("Anexou contrato de constituição", d.anexouContrato);
  (d.fontes || []).forEach((f, i) => {
    sec(`4.${i + 1} — Fonte de Geração ${i + 1}`);
    kv("Tipo de Fonte Primária", f.fontePrimaria);
    kv("Potência (kW)", f.potencia);
    kv("Tipo de geração", f.tipoGeracao === "Outra (especificar):" ? `Outra: ${f.tipoGeracaoOutro}` : f.tipoGeracao);
    if (f.fontePrimaria === "Solar") {
      kv("Pot. total módulos/inversores (kW)", `${f.potTotalModulos || "—"} / ${f.potTotalInversores || "—"}`);
      kv("Área dos Arranjos (m²)", f.areaArranjos);
      kv("Módulos (qtd/modelo/fab.)", `${f.qtdModulos || "—"} / ${f.modeloModulos || "—"} / ${f.fabricanteModulos || "—"}`);
      kv("Inversores (qtd/modelo/fab.)", `${f.qtdInversores || "—"} / ${f.modeloInversores || "—"} / ${f.fabricanteInversores || "—"}`);
    }
    if (f.ceg || f.numAtoOutorga || f.nomeUsina) {
      kv("CEG / Nº Ato", `${f.ceg || "—"} / ${f.numAtoOutorga || "—"}`);
      kv("Usina / Ano / Tipo", `${f.nomeUsina || "—"} / ${f.anoAtoOutorga || "—"} / ${f.tipoAtoOutorga || "—"}`);
    }
  });

  sec("5 — Sistema de Armazenamento de Energia");
  kv("Possui armazenamento", d.possuiArmazenamento);
  if (d.possuiArmazenamento === "Sim") {
    kv("Operação ilhada", d.armOperacaoIlhada);
    if (d.armOperacaoIlhada === "Sim") { kv("Chave de desconexão", d.armChaveDesconexao); kv("Reconexão automática", d.armReconexaoAuto); }
    kv("Capacidade (kWh)", d.armCapacidadeKwh);
    kv("Potência (kW)", d.armPotenciaKw);
    kv("Capacidade (Ah)", d.armCapacidadeAh);
    kv("Tensão CC (V)", d.armTensaoCC);
    kv("Profundidade descarga (%)", d.armProfundidadeDescarga);
    kv("Produção mensal (kWh)", d.armProducaoMensal);
  }

  sec("6 — Garantia de Fiel Cumprimento");
  kv("Garantia (> 500 kW)", d.gfcValor);

  sec("7 — Documentação Técnica");
  GD_DOCS_TEC.forEach((dc) => kv(`${dc.id} ${d.docsTec && d.docsTec[dc.id] ? "[X]" : "[ ]"}`, dc.txt));

  sec("8 — Contato na Distribuidora");
  kv("Responsável/Área", GD_CONTATO_CEMIG.responsavel);
  kv("Endereço", GD_CONTATO_CEMIG.endereco);
  kv("Telefone / E-mail", `${GD_CONTATO_CEMIG.telefone} · ${GD_CONTATO_CEMIG.email}`);

  sec("9 — Solicitações e Declarações");
  kv("9.1 Padrão pronto e usina instalada", d.decl81);
  kv("9.2 Renúncia ao direito de desistir", d.decl82 ? "Sim" : "Não");
  kv("9.3 Autorizo entrega contratos/pagamento", d.decl83 ? "Sim" : "Não");
  kv("9.4 Declaração de conformidade (obrig.)", d.decl84 ? "Sim" : "Não");
  kv("9.6 Informações verdadeiras (obrig.)", d.decl86 ? "Sim" : "Não");

  sec("10 — Solicitante");
  kv("Nome do Consumidor/Procurador", d.solicitanteNome);
  kv("Endereço de Correspondência", d.solicitanteEndereco);
  kv("Telefone / Celular", `${d.solicitanteTelefone || "—"} / ${d.solicitanteCelular || "—"}`);
  kv("E-mail", d.solicitanteEmail);
  if (d.obs) kv("Observações", d.obs);

  doc.save("MiniGD-CEMIG.pdf");
}
