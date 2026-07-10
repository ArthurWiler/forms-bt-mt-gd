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
    laudoMedico: "Não",
    nis: "Não",
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
    // 2 - Dados da UC
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
    mudancaLocal: "Não",
    distMenor30: "",
    telhadoArrendado: "Não",
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
    fontePrimaria: "Solar",
    tipoGeracao: "Empregando conversor eletrônico/inversor",
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
  };
}
