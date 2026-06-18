// ============================================================
// MICROGERAÇÃO DISTRIBUÍDA — Geração de PDF (padrão visual CEMIG)
// (incremental — Seção 1 implementada; demais seções a seguir)
// ============================================================
function gerarPdfMicroGD(d) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");
  const MG = 14;
  const W = 210;
  let cy = 18;
  const VERDE = [16, 119, 98];

  function header() {
    doc.setFillColor(10, 47, 39);
    doc.rect(0, 0, W, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text("CEMIG — Solicitação de Acesso — Microgeração Distribuída", MG, 8);
    cy = 20;
  }
  function checkSpace(h) {
    if (cy + h > 285) { doc.addPage(); header(); }
  }
  function sec(t) {
    checkSpace(12);
    cy += 2;
    doc.setFillColor(VERDE[0], VERDE[1], VERDE[2]);
    doc.rect(MG, cy, W - 2 * MG, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(t, MG + 2, cy + 4.2);
    cy += 9;
    doc.setTextColor(40, 40, 50);
  }
  function kv(label, val) {
    checkSpace(7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label + ":", MG + 1, cy + 4);
    doc.setFont("helvetica", "normal");
    const txt = doc.splitTextToSize(String(val || "—"), W - MG - 56);
    doc.text(txt, MG + 55, cy + 4);
    cy += Math.max(6, txt.length * 4.5);
  }

  header();
  sec("1 — Identificação da Unidade Consumidora");
  kv("Número da instalação", d.instalacao);
  kv("Fast Track (art. 73-A)", d.fastTrack);
  if (d.fastTrack === "Sim") kv("Regra de enquadramento", d.fastRegra);
  kv("Grid Zero", d.gridZero);
  kv("Titular", d.titular);
  kv("Grupo", d.grupo);
  kv("Classe", d.classe);
  kv("CPF/CNPJ", d.cpfCnpj);
  kv("Endereço", `${d.logradouro}, ${d.numero} ${d.complemento}`);
  kv("Bairro", d.bairro);
  kv("Município/UF", `${d.municipio} / ${d.estado}`);
  kv("CEP", d.cep);
  kv("Telefone", d.telefone);
  kv("Celular", d.celular);
  kv("E-mail", d.email);

  sec("2 — Dados da Unidade Consumidora");
  kv("Coordenadas UTM", `Fuso ${d.fuso || "—"} · E ${d.utmE || "—"} · N ${d.utmN || "—"}`);
  kv("Gerador de emergência", d.geradorEmergencia + (d.geradorEmergencia === "Sim" ? ` (${d.geradorPotencia} kVA)` : ""));
  kv("Tipo de Subestação (ND 5.3)", d.tipoSE);
  (d.trafos || []).forEach((t, i) => {
    if (t.qte || t.potencia) kv(`Trafo ${i + 1}`, `${t.qte || "—"} × ${t.potencia || "—"} kVA`);
  });
  kv("Tipo de Solicitação", d.solicitacao);
  kv("Tipo de edificação", d.edificacao);
  kv("Padrão de Entrada", d.edifTipo);
  kv("Ramal", d.ramal);
  kv("Disjuntor Individual Atual (A)", d.disjAtualA);
  kv("Disjuntor Geral", `${d.disjGeralFase || "—"} ${d.disjGeralA || ""}${d.qteDisjGeral ? " · Qte " + d.qteDisjGeral : ""}`);
  kv("Tensão de Atendimento (V)", d.tensaoAtendimento);
  kv("Mudança de Local do Padrão", d.mudancaLocal);
  kv("Distância < 30 m do poste", d.distMenor30);
  kv("Telhado arrendado", d.telhadoArrendado);
  if (d.telhadoArrendado === "Sim") kv("2 instalações no DUB/memorial", d.duasInstalacoesDUB);
  kv("Instalação existente no local", d.instExistente);
  kv("Instalação existente BT/MT", d.instExistenteBTMT);
  kv("Demanda contratada consumo (kW)", d.demandaConsumo);
  kv("Demanda contratada geração (kW)", d.demandaGeracao);

  sec("3 — Documentação a anexar");
  GD_DOCUMENTOS.forEach((dc) => {
    const marcado = d.docs && d.docs[dc.id];
    kv(`${dc.id} ${marcado ? "[X]" : "[ ]"}`, dc.txt);
  });

  sec("4 — Dados da Geração");
  kv("Tipo de Fonte Primária", d.fontePrimaria);
  kv("Potência Ativa Instalada Total (kW)", d.potAtivaInstalada);
  kv("Tipo de geração", d.tipoGeracao === "Outra (especificar):" ? `Outra: ${d.tipoGeracaoOutro}` : d.tipoGeracao);
  kv("Modalidade de compensação", d.modalidade);
  kv("Qtde. instalações a receber crédito", d.qtdInstalacoesCredito);
  if (d.fontePrimaria === "Solar") {
    kv("Módulos — Modelo/Fabricante", `${d.modeloModulos || "—"} / ${d.fabricanteModulos || "—"}`);
    kv("Módulos — Pot. nominal (W) × Qtd", `${d.potNominalModulo || "—"} × ${d.qtdModulos || "—"}`);
    kv("Módulos — Pot. total (kW)", d.potTotalModulos);
    kv("Área dos Arranjos (m²)", d.areaArranjos);
    kv("Inversores — Modelo/Fabricante", `${d.modeloInversores || "—"} / ${d.fabricanteInversores || "—"}`);
    kv("Inversores — Pot. nominal (kW) × Qtd", `${d.potNominalInversor || "—"} × ${d.qtdInversores || "—"}`);
    kv("Inversores — Pot. total (kW)", d.potTotalInversores);
    kv("Tensão de Conexão do Inversor (V)", d.tensaoConexaoInversor);
  }
  if (d.ceg || d.numAtoOutorga || d.nomeUsina) {
    kv("CEG do empreendimento", d.ceg);
    kv("Nº Ato de Outorga/Registro", d.numAtoOutorga);
    kv("Nome da Usina", d.nomeUsina);
    kv("Ano do Ato", d.anoAtoOutorga);
    kv("Tipo do Ato", d.tipoAtoOutorga);
  }

  sec("5 — Sistema de Armazenamento de Energia");
  kv("Possui armazenamento", d.possuiArmazenamento);
  if (d.possuiArmazenamento === "Sim") {
    kv("Operação ilhada", d.armOperacaoIlhada);
    if (d.armOperacaoIlhada === "Sim") {
      kv("Chave de desconexão física", d.armChaveDesconexao);
      kv("Reconexão automática", d.armReconexaoAuto);
    }
    kv("Capacidade do banco (kWh)", d.armCapacidadeKwh);
    kv("Potência total do banco (kW)", d.armPotenciaKw);
    kv("Capacidade nominal (Ah)", d.armCapacidadeAh);
    kv("Tensão CC (V)", d.armTensaoCC);
    kv("Profundidade de descarga (%)", d.armProfundidadeDescarga);
    kv("Produção mensal (kWh)", d.armProducaoMensal);
  }

  sec("6 — Documentação Técnica (obrigatória)");
  GD_DOCS_TEC.forEach((dc) => {
    const marcado = d.docsTec && d.docsTec[dc.id];
    kv(`${dc.id} ${marcado ? "[X]" : "[ ]"}`, dc.txt);
  });

  sec("7 — Contato na Distribuidora");
  kv("Responsável/Área", GD_CONTATO_CEMIG.responsavel);
  kv("Endereço", GD_CONTATO_CEMIG.endereco);
  kv("Telefone", GD_CONTATO_CEMIG.telefone);
  kv("E-mail", GD_CONTATO_CEMIG.email);

  sec("8 — Solicitações e Declarações");
  kv("8.1 Padrão pronto e usina instalada", d.decl81);
  kv("8.2 Renúncia ao direito de desistir", d.decl82 ? "Sim" : "Não");
  kv("8.3 Autorizo entrega de contratos/pagamento", d.decl83 ? "Sim" : "Não");
  kv("8.4 Declaração de conformidade (obrig.)", d.decl84 ? "Sim" : "Não");
  if (d.decl85Regra) kv("8.5 Dispensa art. 73-A", d.decl85Regra);
  kv("8.6 Informações verdadeiras (obrig.)", d.decl86 ? "Sim" : "Não");

  sec("9 — Solicitante");
  kv("Nome do Consumidor/Procurador", d.solicitanteNome);
  kv("Endereço de Correspondência", d.solicitanteEndereco);
  kv("Telefone", d.solicitanteTelefone);
  kv("Celular", d.solicitanteCelular);
  kv("E-mail", d.solicitanteEmail);
  if (d.obs) kv("Observações", d.obs);

  doc.save("MicroGD-CEMIG.pdf");
}
