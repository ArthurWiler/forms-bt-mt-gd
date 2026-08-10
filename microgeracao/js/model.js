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
    fastRegra: "",
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
    localizacao: "Urbana",
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
    tipoSE: "",
    trafos: [gdTrafoPadrao()],
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
    mudCep: "",
    mudLogradouro: "",
    mudNumero: "",
    mudComplemento: "",
    mudBairro: "",
    mudMunicipio: "",
    mudEstado: "MG",
    mudLatitude: "",
    mudLongitude: "",
    mudFuso: "",
    mudUtmE: "",
    mudUtmN: "",
    telhadoArrendado: "",
    // duasInstalacoesDUB segue com "Não": o campo é condicional
    // (telhadoArrendado="Sim") e não entra no req() da validação.
    duasInstalacoesDUB: "Não",
    instExistente: "",
    instExistenteBTMT: "",
    novaProtecao: "",
    demandaConsumo: "",
    demandaGeracao: "",
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
    // "Dados da torre": equivale a blocos[0] do BT coletivo.
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
    // Modalidade de operação do sistema solar: card único que substitui os
    // campos separados fastTrack/gridZero (mantidos derivados por
    // onModoOperacaoGD para não quebrar PDF, prévia e regras do art. 73-A).
    modoOperacao: "",
    producaoMensal: "",
    // Sem padrão: a fonte é escolha explícita do solicitante (o select abre
    // vazio). Os blocos FV/modalidade de operação só aparecem após "Solar".
    fontePrimaria: "",
    // Sem padrão: tecnologia é escolha explícita (o select abre vazio).
    tipoGeracao: "",
    tipoGeracaoOutro: "",
    modalidade: "",
    qtdInstalacoesCredito: "",
    potAtivaInstalada: "",
    // Potência de geração já existente/conectada (somente para "GD Existente COM Alteração").
    potGeracaoExistente: "",
    // Fotovoltaica - módulos
    modeloModulos: "",
    fabricanteModulos: "",
    potNominalModulo: "",
    qtdModulos: "",
    potTotalModulos: "",
    areaArranjos: "",
    // Fotovoltaica - inversores
    modeloInversores: "",
    fabricanteInversores: "",
    potNominalInversor: "",
    qtdInversores: "",
    potTotalInversores: "",
    tensaoConexaoInversor: "",
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
