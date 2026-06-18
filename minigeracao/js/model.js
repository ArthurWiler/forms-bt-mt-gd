// ============================================================
// MINIGERAÇÃO DISTRIBUÍDA — Modelo de estado
// ============================================================
function gdTrafoPadrao() { return { se: "", qte: "", potencia: "" }; }
function gdFontePadrao() {
  return {
    fontePrimaria: "Solar",
    tipoGeracao: "Empregando conversor eletrônico/inversor",
    tipoGeracaoOutro: "",
    potencia: "",
    // fotovoltaica
    potTotalModulos: "",
    potTotalInversores: "",
    areaArranjos: "",
    qtdModulos: "",
    modeloModulos: "",
    fabricanteModulos: "",
    qtdInversores: "",
    modeloInversores: "",
    fabricanteInversores: "",
    // outorga
    ceg: "",
    numAtoOutorga: "",
    nomeUsina: "",
    anoAtoOutorga: "",
    tipoAtoOutorga: "",
  };
}
function gdEstadoInicial() {
  return {
    // 1 - Identificação
    instalacao: "",
    titular: "",
    grupo: "A",
    classe: "",
    cpfCnpj: "",
    logradouro: "", numero: "", complemento: "",
    bairro: "", municipio: "", estado: "MG", cep: "",
    telefone: "", celular: "", email: "",
    // 2 - Dados da UC
    fuso: "", utmE: "", utmN: "",
    tipoSE: "",
    trafos: [gdTrafoPadrao()],
    tipoLigTrafo: "",
    impedanciaTrafo: "",
    geradorPotencia: "",
    tensaoAtendimento: "",
    entradaEnergia: "",
    solicitacao: "",
    demandaGeracao: "",
    demandaConsumo: "",
    gridZero: "Não",
    telhadoArrendado: "Não",
    duasInstalacoesDUB: "Não",
    instExistente: "",
    instExistenteBTMT: "",
    // 3 - Documentação
    docs: {},
    // 4 - Geração (múltiplas fontes)
    qtdFontes: 1,
    potAtivaInstalada: "",
    modalidade: "",
    qtdInstalacoesCredito: "",
    anexouContrato: "Não",
    fontes: [gdFontePadrao()],
    // 5 - Armazenamento
    possuiArmazenamento: "Não",
    armOperacaoIlhada: "Não",
    armChaveDesconexao: "Não",
    armReconexaoAuto: "Não",
    armCapacidadeKwh: "", armPotenciaKw: "", armCapacidadeAh: "",
    armTensaoCC: "", armProfundidadeDescarga: "", armProducaoMensal: "",
    // 6 - Garantia de Fiel Cumprimento
    gfcValor: "",
    // 7 - Documentação técnica
    docsTec: {},
    // 8 - Declarações
    decl81: "Não",
    decl82: false, decl83: false, decl84: true, decl85Regra: "", decl86: true,
    // 9 - Solicitante
    solicitanteNome: "", solicitanteEndereco: "",
    solicitanteTelefone: "", solicitanteCelular: "", solicitanteEmail: "",
    obs: "",
  };
}
