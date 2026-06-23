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
    // Regra 12: haverá mudança de local da subestação?
    mudancaSE: "Não",
    trafos: [gdTrafoPadrao()],
    tipoLigTrafo: "",
    impedanciaTrafo: "",
    geradorPotencia: "",
    tensaoAtendimento: "",
    entradaEnergia: "",
    qtdCubiculos: "",
    solicitacao: "",
    demandaGeracao: "",
    demandaConsumo: "",
    demandaConsumoAtual: "",
    numUC: "",
    gridZero: "Não",
    telhadoArrendado: "Não",
    duasInstalacoesDUB: "Não",
    instExistente: "",
    instExistenteBTMT: "",
    // 3 - Documentação
    docs: {},
    // Formulário de Carga (Item 11) — reutiliza a estrutura do formulário BT.
    // cargas: { qtds, tipoA, catA, mots, extras, _demanda, _cargaKw, _disjuntores }
    cargas: { qtds: [], tipoA: "", catA: 0, mots: [], extras: [] },
    cargaDisjEscolhido: "",
    // 4 - Geração (múltiplas fontes)
    qtdFontes: 1,
    potAtivaInstalada: "",
    // Regra 11: potência de geração já existente (GD existente COM alteração de potência ativa).
    potGeracaoAtual: "",
    modalidade: "",
    qtdInstalacoesCredito: "",
    anexouContrato: "Não",
    consorcioVerificado: "Não",
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
    garantiaForma: "",
    // 7 - Documentação técnica
    docsTec: {},
    // 8 - Declarações
    decl81: "Não",
    decl82: false, decl83: false, decl84: true, decl85Regra: "", decl86: true,
    // Regra 22: item 9.5 — dispensa de análise de inversão de fluxo (obrigatório quando Grid Zero = Sim).
    decl95: false,
    // 9 - Solicitante
    solicitanteNome: "", solicitanteEndereco: "",
    solicitanteTelefone: "", solicitanteCelular: "", solicitanteEmail: "",
    obs: "",
  };
}
