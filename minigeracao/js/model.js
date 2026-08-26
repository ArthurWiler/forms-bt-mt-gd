// ============================================================
// MINIGERAÇÃO DISTRIBUÍDA — Modelo de estado
// ============================================================
/* gdTrafoPadrao() saiu: os transformadores passaram a ser cards com situação
   (trocar/novo/manter) e tipo de ligação próprios — quem os cria é
   novoTrafoGD() em js/subestacao.js. `trafos` aqui é só o ESPELHO que a
   prévia e o PDF leem, escrito por recalcTecnicoGD(). */
/* Uma FONTE de geração. Cada fonte declara o conjunto completo da etapa 5 do
   microGD (microgeracao/etapas/04-geracao.html): a fonte primária, a
   tecnologia e o bloco da própria fonte — fotovoltaico (módulos e inversores,
   um card por MODELO), hidráulico (central + segurança de barragens),
   central térmica (Biomassa / Cogeração Qualificada) ou eólico. O mini
   admite 1 ou 2 fontes (qtdFontes), então o que lá é estado plano aqui vive
   dentro de cada item de `fontes`.
   `potencia` é a potência da usina DESTA fonte: no Solar sai dos inversores,
   nas demais é espelhada do "Potência Instalada (kW)" do bloco da fonte (ver
   recalcFontes, js/app.js). A soma das fontes é state.potAtivaInstalada. */
function gdFontePadrao() {
  return {
    // Sem padrão: a fonte é escolha explícita do solicitante (o select abre
    // vazio), como no microGD. Os demais blocos só aparecem depois dela.
    fontePrimaria: "",
    // Sem padrão: tecnologia é escolha explícita. tipoGeracaoOutro saiu com a
    // opção "Outra (especificar):" da lista GD_TIPO_GERACAO — sem ela não há
    // texto livre a guardar.
    tipoGeracao: "",
    // Potência da usina desta fonte — sempre DERIVADA (ver recalcFontes).
    potencia: "",
    // ----- Fotovoltaica: módulos e inversores, um card por MODELO -----
    // `modulos`/`inversores` guardam {modelo, fabricante, potNominal,
    // quantidade}; `qtd*` e `potTotal*` são as somas de todos os modelos,
    // mantidas porque o PDF e a prévia já as imprimiam.
    // A contagem de modelos abre em 1: em FV sempre há ao menos um.
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
    // ----- Hidráulica: central e aproveitamento -----
    // `hidroPotInstalada` é a potência da usina nesta fonte.
    hidroPotAparente: "",
    hidroTensao: "",
    hidroRio: "",
    hidroNivelJusante: "",
    hidroFatorPotencia: "",
    hidroPotInstalada: "",
    hidroNivelMontante: "",
    hidroSubBacia: "",
    // Segurança de barragens (REN 696/2015) — sem padrão: são respostas
    // explícitas. A 1ª é Sim/Não (toggle); as demais são os rádios de
    // GD_BARRAGEM_PERGUNTAS (js/data.js).
    hidroBarragemAltura: "",
    hidroVolumeReservatorio: "",
    hidroPerdaVidas: "",
    hidroImpactoAmbiental: "",
    hidroImpactoSocio: "",
    // ----- Central térmica: Biomassa e Cogeração Qualificada -----
    // As duas declaram os mesmos dados (GD_FONTES_CENTRAL_TERMICA,
    // js/data.js), então as chaves são um conjunto só. `bioPotInstalada` é a
    // potência da usina nestas fontes. O despacho de qualificação é o único
    // opcional: o reconhecimento pela ANEEL é "caso aplicável".
    bioPotAparente: "",
    bioPotInstalada: "",
    bioCombustivel: "",
    bioDespachoQualificacao: "",
    bioMaqMotriz: "",
    bioCicloTermodinamico: "",
    bioFatorPotencia: "",
    // ----- Eólica -----
    // `eolPotInstalada` é a potência da usina nesta fonte.
    eolQtdAerogeradores: "",
    eolPotInstalada: "",
    eolFabricante: "",
    eolModelo: "",
    eolAlturaPa: "",
    eolEixoRotor: "",
    eolFatorPotencia: "",
    // ----- Outorga (campos próprios do mini) -----
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
    // impedanciaTrafo saiu do estado plano: a impedância virou campo de cada
    // transformador (trafos[].impedancia / cubiculos[].trafos[].impedancia).
    geradorEmergencia: "Não",
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
    // Numa subestação NOVA não há UC por cubículo a informar; numa já existente,
    // sim (ver temInstalacaoCubiculoGD).
    subestacaoExistente: "Nova subestação",
    // Escolha do tipo de subestação: conexão nova tem um campo; a alteração tem
    // o modelo ATUAL e o NOVO, de onde `alt_troca` é deduzida.
    cn_tipoSE: "",
    alt_tipoAtual: "",
    alt_tipoPara: "",
    alt_troca: "",
    solicitacao: "",
    demandaGeracao: "",
    // Demanda contratada declarada card a card: a soma dos transformadores no
    // ramo individual e a dos cubículos no compartilhado (ver recalcTecnicoGD).
    demandaTotalTrafos: 0,
    // Modalidade de operação do sistema — card único portado do microGD, que
    // vale para qualquer fonte primária. `gridZero` continua no estado,
    // DERIVADO desta escolha (ver onModoOperacaoGD), porque PDF, prévia e as
    // regras 17/18/22 dependem dele.
    // Sem `fastTrack`: o enquadramento de até 7,5 kW é da microgeração, então
    // o card aqui tem só duas opções (Padrão e Grid Zero).
    modoOperacao: "",
    gridZero: "Não",
    telhadoArrendado: "Não",
    // Unidade arrendada (spec Figma): só se aplica com telhadoArrendado="Sim".
    // O requisito do DUB virou aviso na etapa, então não há mais campo para ele.
    arrendUC: "",
    arrendTensao: "",
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
    // A etapa de Declarações deixou de existir: o checklist de documentação
    // técnica e as declarações genéricas saíram do formulário, e as duas
    // perguntas que restaram migraram para a etapa que as origina — o estado
    // do padrão/usina fecha o Formulário de Carga (etapa 6) e a dispensa do
    // art. 73-A acompanha a modalidade de operação (etapa 5).
    decl81: "Não",
    // Regra 22: dispensa de análise de inversão de fluxo (obrigatória quando Grid Zero = Sim).
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
    // Observações (etapa própria, como no BT e no microGD).
    obs: "",
  };
}
