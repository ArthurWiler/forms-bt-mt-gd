// ============================================================
// MINIGERAÇÃO DISTRIBUÍDA — Modelo de estado
// ============================================================
/* gdTrafoPadrao() saiu: os transformadores passaram a ser cards com situação
   (trocar/novo/manter) e tipo de ligação próprios — quem os cria é
   novoTrafoGD() em js/subestacao.js. `trafos` aqui é só o ESPELHO que a
   prévia e o PDF leem, escrito por recalcTecnicoGD(). */
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
    // Campos de Pessoa Física (só aparecem com CPF válido)
    // Selects com opção vazia "—" na etapa 2 (padrão do microGD): começam sem
    // escolha, para que o obrigatório não passe sem o usuário ter respondido.
    filiacao: "", rg: "", nasc: "", laudoMedico: "", nis: "", numNis: "",
    logradouro: "", numero: "", complemento: "",
    bairro: "", municipio: "", estado: "MG", cep: "",
    celular: "", email: "",
    // Responsável técnico (bloco da etapa "Dados do proprietário" do microGD)
    rtNome: "", rtEmail: "", rtCelular: "",
    // 2 - Dados da unidade (cópia da etapa 3 do microGD)
    // A zona alterna o endereço entre urbano (CEP/logradouro) e rural
    // (distrito/propriedade/ponto de referência).
    // Sem padrão: com "Urbana" pré-marcada o endereço urbano aparecia antes de
    // qualquer escolha e o data-req passava na validação sem o usuário ter
    // decidido a zona. O endereço só é revelado por onZonaGD().
    localizacao: "",
    distritoComunidade: "",
    nomePropriedade: "",
    pontoRef: "",
    instProxima: "",
    // Restrição ambiental: derivada da consulta do mapa (shared/js/geo.js).
    restricaoAmbiental: "",
    restricaoAceite: false,
    restricoesTexto: "",
    restricoesDetalhe: [],
    // Coordenadas: usuário informa Latitude/Longitude; fuso/E/N derivados
    // automaticamente (latLonParaUTM), mantidos p/ validação e PDF.
    latitude: "", longitude: "",
    fuso: "", utmE: "", utmN: "",
    // Tipo de subestação EFETIVO — o modelo que a instalação terá depois da
    // obra. Derivado (ver tipoSEefetivoGD, js/subestacao.js): é a chave que a
    // prévia e o PDF leem.
    tipoSE: "",
    // Regra 12: haverá mudança de local da subestação? Segue sendo perguntada e
    // impressa; deixou de filtrar a galeria quando gdSEDisponivel() saiu.
    mudancaSE: "Não",
    impedanciaTrafo: "",
    geradorPotencia: "",
    tensaoAtendimento: "",
    entradaEnergia: "",
    qtdCubiculos: "",
    // ----- Bloco técnico da subestação (js/subestacao.js) -----
    // Os cards vivem nos arrays modulares trafosGD/motoresGD/cubiculosGD; estas
    // chaves são os espelhos gravados por recalcTecnicoGD() para prévia e PDF.
    // `trafos` nasce VAZIO: uma linha em branco viraria um trafo fantasma no PDF.
    qtdTransformador: "",
    qtdMotores: "",
    trafos: [],
    motores: [],
    cubiculos: [],
    potTotalTrafos: 0,
    qtdTotalTrafos: 0,
    // Totais consolidados do bloco de cubículos (subestação compartilhada).
    demandaTotalCubiculos: 0,
    gdTotalCubiculos: 0,
    // Numa subestação NOVA não há UC por cubículo a informar; numa já existente,
    // sim (ver temInstalacaoCubiculoGD).
    subestacaoExistente: "Nova subestação",
    // Carga operante na partida do maior motor — só perguntada havendo motores.
    cargaOperante: "",
    ipPrevista: "",
    tempoPartida: "",
    // Escolha do tipo de subestação: conexão nova tem um campo; a alteração tem
    // o modelo ATUAL e o NOVO, de onde `alt_troca` é deduzida.
    cn_tipoSE: "",
    alt_tipoAtual: "",
    alt_tipoPara: "",
    alt_troca: "",
    solicitacao: "",
    demandaGeracao: "",
    demandaConsumo: "",
    demandaConsumoAtual: "",
    numUC: "",
    gridZero: "Não",
    telhadoArrendado: "Não",
    // Unidade arrendada (spec Figma): só se aplica com telhadoArrendado="Sim".
    // O requisito do DUB virou aviso na etapa, então não há mais campo para ele.
    arrendUC: "",
    arrendTensao: "",
    instExistente: "",
    instExistenteBTMT: "",
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
    // Correspondência (etapa própria — replica o bloco do BT) + Solicitante.
    vencimento: "",
    // Forma de recebimento da fatura (dropdown único, igual ao BT): e-mail
    // informado, novo endereço, endereço da unidade, outro e-mail ou conta
    // globalizada.
    // Sem pré-seleção: o dropdown abre em "Selecione" e o usuário escolhe.
    corrAlternativa: "", corrOutroEmail: "",
    corrCep: "", corrRua: "", corrNum: "", corrCompl: "",
    corrBairro: "", corrMunicipio: "", corrEstado: "MG",
    contaGlobal: "",
  };
}
