// ============================================================
// MICROGERAÇÃO DISTRIBUÍDA — Modelo de estado
// ============================================================
function gdTrafoPadrao() {
  return { se: "", qte: "", potencia: "" };
}
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
    corrAlternativa: "E-mail informado",
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
