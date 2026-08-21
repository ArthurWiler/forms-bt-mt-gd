// ============================================================
// MICROGERAÇÃO DISTRIBUÍDA — Modelo de estado
// ============================================================
function gdTrafoPadrao() {
  return { se: "", qte: "", potencia: "" };
}

// ------------------------------------------------------------
// Fluxo Coletivo/Agrupamento (edifTipo = "Edificação Coletiva ou
// Agrupamento"): o empreendimento tem VÁRIAS UCs e a demanda da parte
// residencial sai do ND-5.2, não das cargas de uma única UC.
// Espelha ucBlocos/blocos[0] do BT coletivo, mas com o estado plano da
// microgeração — ver microgeracao/js/coletivo.js.
// ------------------------------------------------------------
function gdUcPadrao(i) {
  return {
    complemento: "",
    solicitacao: "Conexão Nova",
    atividade: "Residencial",
    // Área privativa (m²): entra na área média ponderada do ND-5.2.
    area: "",
    // Ramo de atividade: só para UC não residencial.
    ramo: "",
    // Identificação da UC existente (não se aplica a Conexão Nova).
    instalacao: "",
    disjDe: "",
    disjPara: "",
    // Carga prevista (kW) — método ND-5.2 com mais de 3 UCs.
    cargaPrevista: "",
    // Cargas detalhadas (ND-5.1), usadas no modo calculadora (< 4 aptos).
    // A ilha montarCargaAcordeao escreve _demanda/_cargaKw/_disjuntores aqui.
    cargas: { qtds: [], tipoA: "", catA: 0, mots: [], extras: [] },
    _acc: {},
  };
}

// Preset de carga prevista da UC residencial pelo disjuntor escolhido
// (mesmos valores do BT coletivo — PRESET_PREV_RESIDENCIAL_COLETIVO).
const GD_PRESET_PREV_RESIDENCIAL = {
  "Monopolar 63 A": "6.9",
  "Bipolar 63 A": "15.8",
};
function gdEstadoInicial() {
  return {
    // 1 - Identificação da UC
    instalacao: "",
    fastTrack: "Não",
    gridZero: "Não",
    titular: "",
    grupo: "B",
    classe: "",
    cpfCnpj: "",
    // Campos de Pessoa Física (só aparecem com CPF válido — ver views.js)
    filiacao: "",
    rg: "",
    nasc: "",
    // Selects com opção vazia "—" na etapa 2 (padrão MT): começam sem escolha.
    laudoMedico: "",
    nis: "",
    numNis: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    municipio: "",
    estado: "MG",
    cep: "",
    telefone: "",
    celular: "",
    email: "",
    // Responsável técnico (bloco espelhado da etapa "Dados para contato" do MT)
    rtNome: "",
    rtEmail: "",
    rtCelular: "",
    // 2 - Dados da UC
    // Bloco espelhado da etapa "Dados da unidade consumidora" do BT:
    // a zona alterna o endereço entre urbano (CEP/logradouro) e rural
    // (distrito/propriedade/ponto de referência).
    // Sem padrão (mesma razão de mudancaLocal, abaixo): com "Urbana"
    // pré-marcada o endereço urbano aparecia antes de qualquer escolha e o
    // data-req passava na validação sem o usuário ter decidido a zona. O
    // endereço só é revelado por onZonaGD() — cascata portada do MT.
    localizacao: "",
    distritoComunidade: "",
    nomePropriedade: "",
    pontoRef: "",
    instProxima: "",
    prontoLigar: "",
    tipoRede: "Trifásica",
    transformador: "",
    // Restrição ambiental: derivada da consulta do mapa (shared/js/geo.js).
    restricaoAmbiental: "",
    restricaoAceite: false,
    restricoesTexto: "",
    restricoesDetalhe: [],
    // Coordenadas: o usuário informa Latitude/Longitude; fuso/utmE/utmN são
    // derivados automaticamente (latLonParaUTM) — mantidos p/ validação e PDF.
    latitude: "",
    longitude: "",
    fuso: "",
    utmE: "",
    utmN: "",
    geradorEmergencia: "Não",
    geradorPotencia: "",
    // Subestação (só Grupo A) — ver js/subestacao.js. tipoSE é o modelo
    // EFETIVO (o que vale depois da obra), derivado das galerias abaixo:
    // conexão nova usa cn_tipoSE; alteração usa alt_tipoPara quando há troca
    // deduzida, senão alt_tipoAtual.
    tipoSE: "",
    cn_tipoSE: "",
    alt_tipoAtual: "",
    alt_tipoPara: "",
    alt_troca: "",
    // Espelho dos cards de transformador no formato {qte, potencia} que a
    // prévia e o PDF já liam; a fonte é o array trafosGD.
    trafos: [],
    qtdTransformador: "",
    potTotalTrafos: 0,
    qtdTotalTrafos: 0,
    // Sem modalidade tarifária horária e sem demanda escalonada (existem no MT,
    // não na microgeração): quem dimensiona a subestação é a potência de consumo
    // que a própria etapa já pergunta — `demandaConsumo` quando há potência nova
    // a contratar, senão `demandaConsumoAtual`.
    // Motores e cargas especiais + carga operante na partida do maior motor.
    qtdMotores: "",
    motores: [],
    cargaOperante: "",
    ipPrevista: "",
    tempoPartida: "",
    solicitacao: "",
    edificacao: "",
    edifTipo: "",
    ramal: "Aéreo",
    disjAtualA: "",
    disjGeralFase: "",
    disjGeralA: "",
    qteDisjGeral: "",
    tensaoAtendimento: "",
    // Sem padrão: são perguntas obrigatórias, e um "Não" pré-marcado deixava
    // o req() da validação passar sem o usuário ter escolhido nada.
    mudancaLocal: "",
    // Novo local do padrão de entrada (etapa 5, só com mudancaLocal="Sim").
    // Endereço PRÓPRIO, independente do endereço da unidade da etapa 3: o
    // padrão pode mudar de local sem que a unidade mude de endereço.
    // Os campos acompanham a ZONA escolhida na etapa 3 (localizacao): urbana
    // usa CEP/logradouro; rural usa o descritivo (distrito, propriedade, ponto
    // de referência, instalação mais próxima). Município/Estado valem nas duas.
    mudCep: "",
    mudLogradouro: "",
    mudNumero: "",
    mudComplemento: "",
    mudBairro: "",
    mudMunicipio: "",
    mudEstado: "MG",
    mudDistritoComunidade: "",
    mudNomePropriedade: "",
    mudPontoRef: "",
    mudInstProxima: "",
    mudLatitude: "",
    mudLongitude: "",
    mudFuso: "",
    mudUtmE: "",
    mudUtmN: "",
    telhadoArrendado: "",
    // Unidade arrendada (spec Figma): só se aplica com telhadoArrendado="Sim".
    // O requisito do DUB virou aviso na etapa, então não há mais campo para ele.
    arrendUC: "",
    arrendTensao: "",
    instExistente: "",
    instExistenteBTMT: "",
    novaProtecao: "",
    // Potência de consumo (etapa "Tipo de atendimento") e de geração (etapa
    // "Dados da geração"). Em cada par, a chave sem sufixo guarda a potência
    // NOVA (o único valor da conexão nova) ou a FUTURA (na alteração de
    // potência), e a `*Atual` guarda a que a UC já tem. O rótulo muda com o
    // grupo, e `demandaConsumo` só é perguntada no Grupo A (no B ela sai do
    // Formulário de Carga) — ver GD_ROTULOS_POTENCIA (js/data.js) e
    // _paresPotenciaGD() (js/app.js).
    demandaConsumo: "",
    demandaConsumoAtual: "",
    // Da geração só resta a ATUAL: a nova/futura era a potência da usina, que
    // o formulário calcula em `potAtivaInstalada`.
    demandaGeracaoAtual: "",
    // 3 - Documentação (checklist)
    docs: {},
    // Formulário de Carga — reutiliza a estrutura do formulário BT (CalcDemanda).
    // cargas: { qtds, tipoA, catA, mots, extras, _demanda, _cargaKw, _disjuntores }
    cargas: { qtds: [], tipoA: "", catA: 0, mots: [], extras: [] },
    cargaDisjEscolhido: "",
    // --- Fluxo Coletivo/Agrupamento (ver gdUcPadrao) ---
    // Quantidade de UCs do agrupamento; `ucs` acompanha esse número.
    nUCs: 1,
    ucs: [gdUcPadrao(0)],
    // Bloco da torre (1ª metade de "Dados das unidades"): equivale a blocos[0]
    // do BT coletivo.
    agr: {
      aptosPorAndar: "",
      aptosPorAndarFaixas: [],
      complInicial: "",
      tipoComplemento: "",
      // Demanda/disjuntor do condomínio (combate a incêndio e áreas comuns).
      demandaIncendio: "",
      disjIncendio: "",
    },
    // Demanda do conjunto das UCs NÃO residenciais, informada pelo RT — no
    // ND-5.2 ela não sai das cargas (só a parte residencial é calculada).
    demandaNaoResidencial: "",
    // Disjuntor geral do agrupamento.
    disjGeralAgr: "",
    // 4 - Dados da geração
    // Modalidade de operação do sistema — vale para qualquer fonte primária.
    // Card único que substitui os campos separados fastTrack/gridZero
    // (mantidos derivados por onModoOperacaoGD para não quebrar PDF, prévia e
    // regras do art. 73-A).
    modoOperacao: "",
    // Sem padrão: a fonte é escolha explícita do solicitante (o select abre
    // vazio). A modalidade de operação aparece com qualquer fonte; os demais
    // campos da etapa são hoje o conjunto do "Solar" (ver onFonte).
    fontePrimaria: "",
    // Sem padrão: tecnologia é escolha explícita (o select abre vazio).
    // tipoGeracaoOutro saiu com a opção "Outra (especificar):" da lista
    // GD_TIPO_GERACAO — sem ela não há texto livre a guardar.
    tipoGeracao: "",
    modalidade: "",
    qtdInstalacoesCredito: "",
    potAtivaInstalada: "",
    // potGeracaoExistente ("Potência já conectada") saiu: a geração que a UC já
    // tem é `demandaGeracaoAtual`, acima.
    // Fotovoltaica — módulos e inversores, um card por MODELO (ver
    // modulosGD/inversoresGD em js/app.js). `modulos`/`inversores` são o
    // espelho das listas no formato {modelo, fabricante, potNominal,
    // quantidade}, lido pela prévia e pelo PDF; `qtd*` e `potTotal*` são as
    // somas de todos os modelos, mantidas porque o PDF já as imprimia.
    // A contagem de modelos abre em 1: em FV sempre há ao menos um, e assim o
    // conjunto entra em tela com o primeiro card pronto para preencher.
    qtdModeloModulos: 1,
    modulos: [],
    qtdModulos: "",
    potTotalModulos: "",
    // Área ocupada e tensão de conexão ficam FORA dos cards: a primeira é o
    // total dos arranjos, a segunda vale para a usina inteira.
    areaArranjos: "",
    qtdModeloInversores: 1,
    inversores: [],
    qtdInversores: "",
    potTotalInversores: "",
    tensaoConexaoInversor: "",
    // Hidráulica — dados da central e do aproveitamento. `hidroPotInstalada` é
    // a potência da usina nesta fonte: recalcGeracao() a espelha em
    // potAtivaInstalada, que é o campo lido pelo PDF, pela prévia e pelo limite
    // do Fast Track (o campo genérico fica fora de tela fora do Solar).
    hidroPotAparente: "",
    hidroTensao: "",
    hidroRio: "",
    hidroNivelJusante: "",
    hidroFatorPotencia: "",
    hidroPotInstalada: "",
    hidroNivelMontante: "",
    hidroSubBacia: "",
    // Central térmica — dados da central, compartilhados pelas fontes Biomassa
    // e Cogeração Qualificada (GD_FONTES_CENTRAL_TERMICA, js/data.js): as duas
    // declaram os mesmos dados, então as chaves são um conjunto só.
    // `bioPotInstalada` é a potência da usina nestas fontes, espelhada em
    // potAtivaInstalada como a da hidráulica (ver GD_POT_INSTALADA_POR_FONTE,
    // js/app.js). O despacho de qualificação é o único opcional: o
    // reconhecimento pela ANEEL é "caso aplicável".
    bioPotAparente: "",
    bioPotInstalada: "",
    bioCombustivel: "",
    bioDespachoQualificacao: "",
    bioMaqMotriz: "",
    bioCicloTermodinamico: "",
    bioFatorPotencia: "",
    // Eólica — dados da central. `eolPotInstalada` é a potência da usina nesta
    // fonte, espelhada em potAtivaInstalada como nas demais (ver
    // GD_POT_INSTALADA_POR_FONTE, js/app.js). O eixo do rotor nasce sem padrão:
    // é resposta explícita do solicitante (o toggle ignora a opção sem rótulo).
    eolQtdAerogeradores: "",
    eolPotInstalada: "",
    eolFabricante: "",
    eolModelo: "",
    eolAlturaPa: "",
    eolEixoRotor: "",
    eolFatorPotencia: "",
    // Segurança de barragens (REN 696/2015) — sem padrão: são respostas
    // explícitas do solicitante. A 1ª é Sim/Não (toggle); as demais são os
    // rádios de GD_BARRAGEM_PERGUNTAS (js/data.js).
    hidroBarragemAltura: "",
    hidroVolumeReservatorio: "",
    hidroPerdaVidas: "",
    hidroImpactoAmbiental: "",
    hidroImpactoSocio: "",
    // Outorga
    ceg: "",
    numAtoOutorga: "",
    nomeUsina: "",
    anoAtoOutorga: "",
    tipoAtoOutorga: "",
    // 5 - Armazenamento
    possuiArmazenamento: "Não",
    armOperacaoIlhada: "Não",
    armChaveDesconexao: "Não",
    armReconexaoAuto: "Não",
    armCapacidadeKwh: "",
    armPotenciaKw: "",
    armCapacidadeAh: "",
    armTensaoCC: "",
    armProfundidadeDescarga: "",
    armProducaoMensal: "",
    // 6 - Documentação técnica (checklist)
    docsTec: {},
    // 8 - Solicitações e declarações
    decl81: "Não",
    decl82: false,
    decl83: false,
    decl84: true,
    decl85Regra: "",
    decl86: true,
    // Correspondência (etapa própria — replica o bloco do BT) + Solicitante.
    vencimento: "",
    // Forma de recebimento da fatura (dropdown único, igual ao BT): e-mail
    // informado, novo endereço, endereço da unidade, outro e-mail ou conta
    // globalizada.
    // Sem pré-seleção: o dropdown abre em "Selecione" e o usuário escolhe.
    corrAlternativa: "",
    corrOutroEmail: "",
    corrCep: "",
    corrRua: "",
    corrNum: "",
    corrCompl: "",
    corrBairro: "",
    corrMunicipio: "",
    corrEstado: "MG",
    contaGlobal: "",
    // Observações (etapa própria, espelhando o BT)
    obs: "",
  };
}
