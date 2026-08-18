// ============================================================
// MICROGERAÇÃO DISTRIBUÍDA — Dados normativos (CEMIG / REN 1.000/2021)
// Extraído do Formulário Oficial MicroGD Rev. N4 (03/12/2024)
// ============================================================
const GD_GRUPOS = ["B", "A"];
const GD_CLASSES = [
  "Residencial",
  "Industrial",
  "Comercial",
  "Rural",
  "Poder Público",
  "Iluminação Pública",
  "Serviço Público",
];
// Tipos de solicitação. O `valor` é o texto NORMATIVO (usado pelas regras —
// GD_SOLICITACOES_FORM_CARGA, GD_SOLICITACOES_AUMENTO_POTENCIA e _finalidadeGD
// — e impresso no PDF); o `texto` é o rótulo curto que aparece na tela,
// conforme o Figma da etapa "Tipo de atendimento".
const GD_SOLICITACOES = [
  {
    valor: "Ligação de Nova Unidade Consumidora COM Geração Distribuída",
    texto: "Ligar nova unidade com Geração Distribuída",
  },
  {
    valor:
      "Conexão de GD em Unidade Consumidora Existente SEM Alteração de Potência Disponibilizada",
    texto:
      "Instalar geração distribuída em unidade existente (sem alteração de potência)",
  },
  {
    valor:
      "Conexão de GD em Unidade Consumidora Existente COM Alteração de Potência Disponibilizada",
    texto:
      "Instalar geração distribuída em unidade existente (com alteração de potência)",
  },
  {
    valor: "GD Existente COM Alteração de Potência Ativa Instalada Total",
    texto: "Alterar potência de geração já existente",
  },
];
const GD_EDIFICACOES = [
  "Edificação Individual",
  "Edificação de Uso Coletivo (telhado coletivo ou em área comum do condomínio)",
  "Edificação de Uso Coletivo (telhado independente e privativo)",
  "Agrupamento",
];
// Tipo de edificação da etapa "Tipo de atendimento": rótulo curto do Figma
// (Individual / Coletivo-Agrupamento) sobre o valor normativo já usado no PDF.
const GD_EDIF_TIPO = [
  { valor: "Edificação Individual", texto: "Individual" },
  {
    valor: "Edificação Coletiva ou Agrupamento",
    texto: "Coletivo/Agrupamento",
  },
];
const GD_TENSAO_A = ["13800", "22000", "34500"];
const GD_TENSAO_B = ["127/220", "120/240"];
const GD_RAMAL = ["Aéreo", "Subterrâneo"];
// Tipo de ligação do transformador — mesma lista da minigeração
// (minigeracao/js/data.js). Perguntado por transformador, dentro do card.
const GD_TIPO_LIG_TRAFO = ["∆-Y", "∆-∆", "Y-∆", "Y-Y"];
const GD_TRAFOS_PARTICULARES = [100, 200, 300, 500, 700];
// Dispositivos de partida de motor — mesma lista do MT (mt/js/dados.js), usada
// pelos cards de "Motores e cargas especiais" da etapa de atendimento.
const GD_DISPOSITIVOS_MOTOR = [
  "Chave Série-Paralelo",
  "Partida Estrela-Triângulo",
  "Chave Compensadora",
  "Resistência/Reatância Primária",
  "Resistência Rotórica",
  "Soft-Starter",
  "Outro",
];
const GD_FONTES = [
  "Solar",
  "Hidráulica",
  "Biomassa",
  "Cogeração Qualificada",
  "Eólica",
];
// Fontes que declaram a MESMA central térmica (combustível, máquina motriz,
// ciclo termodinâmico): compartilham o bloco #bioBlocos e as chaves bio* —
// perguntar os mesmos dados duas vezes, em blocos separados, só duplicaria
// estado, validação, prévia e PDF. Lida por onFonte(), validarExportacao() e
// pela prévia (js/app.js) e pela seção 4 do PDF (js/pdf.js).
const GD_FONTES_CENTRAL_TERMICA = ["Biomassa", "Cogeração Qualificada"];
// Título do bloco por fonte: só a biomassa nomeia o combustível no cabeçalho.
// Escrito por JS (ver onFonte), como os rótulos de GD_ROTULOS_POTENCIA.
const GD_TITULO_CENTRAL_TERMICA = {
  Biomassa: "Dados da central geradora a biomassa",
  "Cogeração Qualificada": "Dados da central geradora",
};
// Sistema solar é sempre inversor: onFonte() marca esta opção sozinho ao
// escolher "Solar", por isso a constante (o texto é gravado no estado e sai
// assim no PDF — não pode divergir do item da lista).
const GD_TIPO_GERACAO_INVERSOR = "Conversor eletrônico/inversor";
const GD_TIPO_GERACAO = [
  "Máquina síncrona sem conversor",
  GD_TIPO_GERACAO_INVERSOR,
];
// Tensão de conexão do inversor (V) — as duas tensões de BT em que os
// inversores se conectam. Valor gravado = rótulo (entra assim no PDF).
const GD_TENSOES_INVERSOR = ["120/240", "127/220"];
/* ===== Fonte primária Hidráulica =====
   Classificação de segurança de barragens (REN ANEEL 696/2015, itens de
   categoria de risco e dano potencial associado), perguntada quando a fonte
   primária é Hidráulica — a 1ª pergunta (altura ≥ 15 m) é Sim/Não e vive no
   HTML como toggle; estas quatro têm opções longas demais para os cards e são
   exibidas como lista de rádios (ver gdMontarPerguntasBarragem, js/app.js).
     • chave   — campo do estado (model.js) e do PDF;
     • rotulo  — nome curto da pergunta: é o que cabe no PDF, na prévia e na
                 lista de pendências da exportação;
     • pergunta— texto integral, só na tela;
     • valor   — o que é gravado no estado (rótulo oficial, em caixa alta como
                 no formulário Cemig); `sub` é o critério que o acompanha. */
const GD_BARRAGEM_PERGUNTAS = [
  {
    chave: "hidroVolumeReservatorio",
    num: 2,
    rotulo: "Volume total do reservatório",
    pergunta:
      "Volume Total do Reservatório para barragens de uso múltiplo ou aproveitamento energético:",
    opcoes: [
      {
        valor: "Muito Pequeno",
        sub: "Se o Volume Total do Reservatório for < 3.000.000 m³",
      },
      {
        valor: "Pequeno",
        sub: "Se o Volume Total do Reservatório for ≥ 3.000.000 m³ e ≤ 5.000.000 m³",
      },
      {
        valor: "Médio",
        sub: "Se o Volume Total do Reservatório for > 5.000.000 m³ e ≤ 75.000.000 m³",
      },
      {
        valor: "Grande",
        sub: "Se o Volume Total do Reservatório for > 75.000.000 m³ e ≤ 200.000.000 m³",
      },
      {
        valor: "Muito Grande",
        sub: "Se o Volume Total do Reservatório for > 200.000.000 m³",
      },
    ],
  },
  {
    chave: "hidroPerdaVidas",
    num: 3,
    rotulo: "Potencial de perdas de vidas humanas",
    pergunta: "Potencial de perdas de vidas humanas:",
    opcoes: [
      {
        valor: "Inexistente",
        sub: "não existem pessoas permanentes/residentes ou temporárias/transitando na área afetada a jusante da barragem",
      },
      {
        valor: "Pouco frequente",
        sub: "não existem pessoas ocupando permanentemente a área afetada a jusante da barragem, mas existe estrada vicinal de uso local",
      },
      {
        valor: "Frequente",
        sub: "não existem pessoas ocupando permanentemente a área afetada a jusante da barragem, mas existe rodovia municipal, estadual, federal ou outro local e/ou empreendimento de permanência eventual de pessoas que poderão ser atingidas",
      },
      {
        valor: "Existente",
        sub: "existem pessoas ocupando permanentemente a área afetada a jusante da barragem, portanto, vidas humanas poderão ser atingidas",
      },
    ],
  },
  {
    chave: "hidroImpactoAmbiental",
    num: 4,
    rotulo: "Impacto ambiental",
    pergunta: "Impacto ambiental:",
    opcoes: [
      {
        valor: "Significativo",
        sub: "área afetada da barragem não representa área de interesse ambiental, áreas protegidas em legislação específica ou encontra-se totalmente descaracterizada de suas condições naturais",
      },
      {
        valor: "Muito significativo",
        sub: "área afetada da barragem apresenta interesse ambiental relevante ou protegida em legislação específica",
      },
    ],
  },
  {
    chave: "hidroImpactoSocio",
    num: 5,
    rotulo: "Impacto sócio-econômico",
    pergunta: "Impacto sócio-econômico:",
    opcoes: [
      {
        valor: "Inexistente",
        sub: "não existem quaisquer instalações e serviços de navegação na área afetada por acidente da barragem",
      },
      {
        valor: "Baixo",
        sub: "existe pequena concentração de instalações residenciais e comerciais, agrícolas, industriais ou de infraestrutura na área afetada da barragem ou instalações portuárias ou serviços de navegação",
      },
      {
        valor: "Alto",
        sub: "existe grande concentração de instalações residenciais e comerciais, agrícolas, industriais, de infraestrutura e serviços de lazer e turismo na área afetada da barragem ou instalações portuárias ou serviços de navegação",
      },
    ],
  },
];
const GD_MODALIDADES = [
  "Autoconsumo local",
  "Autoconsumo remoto",
  "Geração compartilhada",
  "Múltiplas Unidades Consumidoras",
];
const GD_MODALIDADE_AUTOCONSUMO_LOCAL = "Autoconsumo local";
// Fast Track: potência máxima da usina (art. 73-A, III da REN 1.000/2021) —
// 7,5 kW, equivalentes a 7500 W. A comparação é feita contra
// potAtivaInstalada, que é informada EM kW — portanto o limite é 7.5.
const GD_FAST_LIMITE_USINA_KW = 7.5;
// Solicitações que correspondem a Aumento de Potência (exigem nova proteção).
const GD_SOLICITACOES_AUMENTO_POTENCIA = [
  "Conexão de GD em Unidade Consumidora Existente COM Alteração de Potência Disponibilizada",
  "GD Existente COM Alteração de Potência Ativa Instalada Total",
];
// ===== Disponibilidade da subestação (Regras de MT/GD) =====
const GD_SOLICITACAO_LIG_NOVA =
  "Ligação de Nova Unidade Consumidora COM Geração Distribuída";
const GD_BT_BAIXA = "BT - Baixa Tensão"; // valor de instExistenteBTMT que caracteriza migração BT→MT
const GD_TENSAO_LIGNOVA_138 = "13800"; // 13,8 kV — mantido: documenta o volt "cru" guardado no estado

/* gdSEDisponivel() e as listas GD_TIPOS_SE / GD_SE_LIMITE_* foram retiradas: a
   aceitação das subestações passou a vir de CalculoMT.tiposSubestacaoPermitidos
   (mt/js/calculo.js), junto com o bloco técnico portado do MT — fonte única
   com o formulário de média tensão. Os critérios de lá são um superconjunto
   dos que existiam aqui:
     • Nº 1 não aceita conexão nova            → novaOk: false   (era a regra 1)
     • Nº 2 só existe em 22 e 34,5 kV          → tensoes: [22, 34.5]
       (mais estrito que antes: aqui a Nº 2 só era bloqueada em 13,8 kV na
        LIGAÇÃO NOVA; agora também na alteração de carga)
     • teto de 300 kW em Nº 1, 3, 5, 6 e 8     → maxKW: 300
     • entram no catálogo os modelos Nº 3 e Nº 6, que esta lista não trazia. */
/* ===== Rótulos dos pares de potência =====
   Consumo (etapa "Tipo de atendimento") e geração (etapa "Dados da geração")
   perguntam o MESMO trio de campos, e quais deles aparecem sai do tipo de
   solicitação:
     nova   → conexão nova: só um campo, não há potência anterior;
     atual  → a potência que a UC já tem (conexão existente);
     futura → a potência depois da obra (só com alteração de potência).
   Só o NOME muda entre os grupos: o Grupo A contrata demanda ("potência
   contratada"), o Grupo B não. Tabela única porque os mesmos rótulos são
   usados pela etapa, pela validação, pela prévia e pelo PDF — ver
   gdRotuloPotencia(). */
const GD_ROTULOS_POTENCIA = {
  consumo: {
    A: {
      nova: "Potência de consumo a ser contratada (kW)",
      atual: "Potência contratada atual (kW)",
      futura: "Potência contratada futura (kW)",
    },
    B: {
      nova: "Potência de consumo (kW)",
      atual: "Potência atual (kW)",
      futura: "Potência futura (kW)",
    },
  },
  geracao: {
    A: {
      nova: "Potência contratada de geração (kW)",
      atual: "Potência contratada de geração atual (kW)",
      futura: "Potência contratada de geração futura (kW)",
    },
    B: {
      nova: "Potência de geração (kW)",
      atual: "Potência de geração atual (kW)",
      futura: "Potência de geração futura (kW)",
    },
  },
};
// `grupo` pode chegar vazio (estado recém-criado): cai no Grupo B, que é o
// padrão do formulário.
function gdRotuloPotencia(tipo, papel, grupo) {
  const porGrupo = GD_ROTULOS_POTENCIA[tipo];
  return (porGrupo[grupo] || porGrupo.B)[papel];
}
// Solicitações que exigem o preenchimento do Formulário de Carga:
// Ligação Nova e Aumento/Alteração de Carga (alteração de potência disponibilizada).
const GD_SOLICITACOES_FORM_CARGA = [
  "Ligação de Nova Unidade Consumidora COM Geração Distribuída",
  "Conexão de GD em Unidade Consumidora Existente COM Alteração de Potência Disponibilizada",
];
const GD_DISJ_FASES = ["Monopolar", "Bipolar", "Tripolar", "Sem Disj. Geral"];
const GD_DISJ_FASES_ALT = [
  "Monopolar",
  "Bipolar",
  "Tripolar",
  "Sem Alter. Carga",
];
const GD_DISJ_REVISADA = [
  { tipo: "Monopolar", a: 40, kw: 5 },
  { tipo: "Monopolar", a: 50, kw: 6.5 },
  { tipo: "Monopolar", a: 63, kw: 8 },
  { tipo: "Monopolar", a: 70, kw: 10 },
  { tipo: "Bipolar", a: 40, kw: 10 },
  { tipo: "Bipolar", a: 50, kw: 12 },
  { tipo: "Bipolar", a: 60, kw: 15 },
  { tipo: "Bipolar", a: 63, kw: 15.1 },
  { tipo: "Bipolar", a: 70, kw: 16.8 },
  { tipo: "Bipolar", a: 80, kw: 20 },
  { tipo: "Bipolar", a: 90, kw: 20 },
  { tipo: "Bipolar", a: 100, kw: 24 },
  { tipo: "Bipolar", a: 120, kw: 30 },
  { tipo: "Bipolar", a: 125, kw: 30 },
  { tipo: "Bipolar", a: 150, kw: 36 },
  { tipo: "Bipolar", a: 200, kw: 50 },
  { tipo: "Tripolar", a: 40, kw: 15 },
  { tipo: "Tripolar", a: 60, kw: 23 },
  { tipo: "Tripolar", a: 63, kw: 24 },
  { tipo: "Tripolar", a: 70, kw: 27 },
  { tipo: "Tripolar", a: 80, kw: 30.5 },
  { tipo: "Tripolar", a: 100, kw: 38.1 },
  { tipo: "Tripolar", a: 120, kw: 47 },
  { tipo: "Tripolar", a: 125, kw: 47.6 },
  { tipo: "Tripolar", a: 150, kw: 57.1 },
  { tipo: "Tripolar", a: 175, kw: 66 },
  { tipo: "Tripolar", a: 200, kw: 75 },
  { tipo: "Tripolar", a: 225, kw: 86 },
  { tipo: "Tripolar", a: 250, kw: 95 },
  { tipo: "Tripolar", a: 300, kw: 114 },
  { tipo: "Tripolar", a: 315, kw: 114 },
  { tipo: "Tripolar", a: 320, kw: 114 },
  { tipo: "Tripolar", a: 400, kw: 152 },
  { tipo: "Tripolar", a: 450, kw: 171 },
  { tipo: "Tripolar", a: 500, kw: 188 },
  { tipo: "Tripolar", a: 600, kw: 228 },
  { tipo: "Tripolar", a: 630, kw: 228 },
  { tipo: "Tripolar", a: 700, kw: 266 },
  { tipo: "Tripolar", a: 800, kw: 304 },
];
const GD_DISJ_ND51 = [
  { tipo: "Monopolar", a: 63, kw: 8 },
  { tipo: "Bipolar", a: 63, kw: 15.1 },
  { tipo: "Bipolar", a: 100, kw: 24 },
  { tipo: "Bipolar", a: 125, kw: 30 },
  { tipo: "Bipolar", a: 150, kw: 36 },
  { tipo: "Bipolar", a: 200, kw: 50 },
  { tipo: "Tripolar", a: 63, kw: 24 },
  { tipo: "Tripolar", a: 80, kw: 30.5 },
  { tipo: "Tripolar", a: 100, kw: 38.1 },
  { tipo: "Tripolar", a: 125, kw: 47.6 },
  { tipo: "Tripolar", a: 150, kw: 57.1 },
  { tipo: "Tripolar", a: 200, kw: 75 },
  { tipo: "Tripolar", a: 225, kw: 86 },
  { tipo: "Tripolar", a: 250, kw: 95 },
  { tipo: "Tripolar", a: 300, kw: 114 },
  { tipo: "Tripolar", a: 315, kw: 114 },
  { tipo: "Tripolar", a: 320, kw: 114 },
  { tipo: "Tripolar", a: 400, kw: 152 },
  { tipo: "Tripolar", a: 450, kw: 171 },
  { tipo: "Tripolar", a: 500, kw: 188 },
  { tipo: "Tripolar", a: 600, kw: 228 },
  { tipo: "Tripolar", a: 630, kw: 228 },
  { tipo: "Tripolar", a: 700, kw: 266 },
  { tipo: "Tripolar", a: 800, kw: 304 },
];
const GD_UTM_LIMITES = {
  22: { eMin: 487307, eMax: 833012, nMin: 7733378, nMax: 7981566 },
  23: { eMin: 161564, eMax: 840139, nMin: 7460145, nMax: 8435094 },
  24: { eMin: 164869, eMax: 417150, nMin: 7673180, nMax: 8336360 },
};
const GD_FUSOS = [22, 23, 24];
const GD_BT_MT = ["BT - Baixa Tensão", "MT - Média Tensão"];
// UFs — usado no select "Estado" do novo local do padrão (etapa 5).
const GD_UFS = [
  "AC",
  "AL",
  "AP",
  "AM",
  "BA",
  "CE",
  "DF",
  "ES",
  "GO",
  "MA",
  "MT",
  "MS",
  "MG",
  "PA",
  "PB",
  "PR",
  "PE",
  "PI",
  "RJ",
  "RN",
  "RS",
  "RO",
  "RR",
  "SC",
  "SP",
  "SE",
  "TO",
];
// GD_FAST_REGRAS (as três regras do item 8.5) foi removida junto com o campo
// `fastRegra`: a declaração não é mais pedida no formulário. As orientações da
// etapa 1 continuam explicando o item 8.5 — lá é texto informativo, não campo.
const GD_SN = ["Não", "Sim"];
// Conversão Latitude/Longitude → UTM (WGS-84), espelhando BT/MT. O usuário
// informa lat/lon e o fuso/E/N são calculados automaticamente.
function _gdUtmBandLetter(lat) {
  const B = "CDEFGHJKLMNPQRSTUVWXX";
  return lat < -80 ? "C" : lat > 84 ? "X" : B[Math.floor((lat + 80) / 8)];
}
function gdLatLonParaUTM(lat, lon) {
  const a = 6378137,
    f = 1 / 298.257223563,
    k0 = 0.9996;
  const b = a * (1 - f),
    e2 = 1 - (b * b) / (a * a);
  const latR = (lat * Math.PI) / 180,
    lonR = (lon * Math.PI) / 180;
  const zona = Math.floor((lon + 180) / 6) + 1;
  const lonC = (((zona - 1) * 6 - 180 + 3) * Math.PI) / 180;
  const sinL = Math.sin(latR),
    cosL = Math.cos(latR),
    tanL = Math.tan(latR);
  const N = a / Math.sqrt(1 - e2 * sinL ** 2);
  const T = tanL ** 2,
    C = (e2 / (1 - e2)) * cosL ** 2,
    A = cosL * (lonR - lonC);
  const e4 = e2 * e2,
    e6 = e4 * e2,
    ep2 = e2 / (1 - e2);
  const M =
    a *
    ((1 - e2 / 4 - (3 * e4) / 64 - (5 * e6) / 256) * latR -
      ((3 * e2) / 8 + (3 * e4) / 32 + (45 * e6) / 1024) * Math.sin(2 * latR) +
      ((15 * e4) / 256 + (45 * e6) / 1024) * Math.sin(4 * latR) -
      ((35 * e6) / 3072) * Math.sin(6 * latR));
  const E =
    k0 *
      N *
      (A +
        ((1 - T + C) * A ** 3) / 6 +
        ((5 - 18 * T + T * T + 72 * C - 58 * ep2) * A ** 5) / 120) +
    500000;
  let Nort =
    k0 *
    (M +
      N *
        tanL *
        ((A * A) / 2 +
          ((5 - T + 9 * C + 4 * C * C) * A ** 4) / 24 +
          ((61 - 58 * T + T * T + 600 * C - 330 * ep2) * A ** 6) / 720));
  if (lat < 0) Nort += 10000000;
  return {
    zona,
    hemisferio: lat < 0 ? "S" : "N",
    easting: Math.round(E),
    northing: Math.round(Nort),
    banda: _gdUtmBandLetter(lat),
  };
}
// Deriva fuso/utmE/utmN a partir de latitude/longitude (strings do estado).
// Retorna null quando as coordenadas ainda não são numéricas.
function gdUtmDeCoordenadas(latitude, longitude) {
  const lat = parseFloat(latitude),
    lon = parseFloat(longitude);
  if (isNaN(lat) || isNaN(lon)) return null;
  const u = gdLatLonParaUTM(lat, lon);
  return {
    fuso: String(u.zona),
    utmE: String(u.easting),
    utmN: String(u.northing),
    banda: u.banda,
  };
}
function gdValidarUTM(fuso, e, n) {
  const lim = GD_UTM_LIMITES[parseInt(fuso)];
  if (!lim) return { ok: false, msg: "Selecione o fuso." };
  const E = parseFloat(e),
    N = parseFloat(n);
  if (isNaN(E) || isNaN(N)) return { ok: false, msg: "" };
  if (E < lim.eMin || E > lim.eMax)
    return { ok: false, msg: `E fora da faixa (${lim.eMin}–${lim.eMax}).` };
  if (N < lim.nMin || N > lim.nMax)
    return { ok: false, msg: `N fora da faixa (${lim.nMin}–${lim.nMax}).` };
  return { ok: true, msg: "" };
}
function gdLimiteInjecao(tipo, corrente, usarND51) {
  const tab = usarND51 ? GD_DISJ_ND51 : GD_DISJ_REVISADA;
  const r = tab.find((x) => x.tipo === tipo && x.a === parseInt(corrente));
  return r ? r.kw : null;
}

// Documentação a anexar (Seção 3) — textos oficiais MicroGD Rev N4
const GD_DOCUMENTOS = [
  {
    id: "3.1",
    req: true,
    txt: "Documentos de identificação do consumidor, conforme incisos I e II do art. 67 da Resolução Normativa nº 1.000/2021.",
  },
  {
    id: "3.2",
    req: true,
    txt: "Formulário de Análise de Carga, com os respectivos anexos necessários (para Ligação Nova de UC com GD ou conexão de GD com aumento/redução de potência disponibilizada).",
  },
  {
    id: "3.3",
    req: true,
    txt: "Informação das cargas que possam provocar perturbações no sistema de distribuição.",
  },
  {
    id: "3.4",
    req: true,
    txt: "Informação e documentação das atividades desenvolvidas nas instalações.",
  },
  {
    id: "3.5",
    req: false,
    txt: "Licença ou declaração do órgão competente caso as instalações ocupem áreas protegidas (unidades de conservação, reservas legais, APP, territórios indígenas e quilombolas).",
  },
  {
    id: "3.6.1",
    req: true,
    txt: "Documento com data que comprove a propriedade ou posse do imóvel onde será implantada a UC com microgeração distribuída (no caso de unidade flutuante, complementado por autorização/licença, observada possibilidade de dispensa da REN 1.000/2021).",
  },
  {
    id: "3.6.2",
    req: false,
    txt: "Para imóveis rurais, apresentar o Cadastro Ambiental Rural – CAR (Lei nº 12.651/2012).",
  },
  {
    id: "3.6.3",
    req: false,
    txt: "Documento que comprove direito de posse pelo proprietário da central geradora em casos de aluguel, cessão ou arrendamento de áreas, telhados ou estruturas. (Caso aplicável)",
  },
  {
    id: "3.6.4",
    req: false,
    txt: "Documento do condomínio que comprove autorização de uso de área comum da edificação coletiva para instalação de central geradora de uso particular da unidade. (Caso aplicável)",
  },
];

// Documentação Técnica (Seção 6) — textos oficiais
const GD_DOCS_TEC = [
  {
    id: "6.1",
    req: true,
    txt: "Documento de responsabilidade técnica (projeto e execução) do conselho profissional competente, identificando registro válido, responsável técnico, local da obra e atividades desenvolvidas.",
  },
  {
    id: "6.2",
    req: true,
    txt: "Memorial descritivo da instalação com planta de situação e indicação do local do padrão de entrada (ND 5.1/5.2) ou da subestação de entrada (ND 5.3).",
  },
  {
    id: "6.3",
    req: true,
    txt: "Diagrama unifilar e de blocos do sistema de geração, carga e proteção.",
  },
  {
    id: "6.4",
    req: true,
    txt: "Relatório de ensaio (português) atestando conformidade de todos os conversores de potência para a tensão nominal de conexão (incl. conversores de geração e armazenamento).",
  },
  {
    id: "6.5",
    req: true,
    txt: "Dados necessários ao registro da central geradora distribuída conforme site da ANEEL.",
  },
  {
    id: "6.6",
    req: false,
    txt: "Lista de UCs participantes do sistema de compensação, indicando percentual/ordem de utilização dos excedentes. (Opcional)",
  },
  {
    id: "6.7",
    req: false,
    txt: "Instrumento jurídico que comprove a participação dos integrantes (múltiplas UCs e geração compartilhada). (Caso aplicável)",
  },
  {
    id: "6.8",
    req: false,
    txt: "Documento que comprove o reconhecimento pela ANEEL da cogeração qualificada. (Caso aplicável)",
  },
  {
    id: "6.9",
    req: false,
    txt: "Dados de segurança de barragens para fontes hídricas (REN 696/2015). (Caso aplicável)",
  },
  {
    id: "6.10",
    req: false,
    txt: "Para centrais FV despacháveis, comprovação de atendimento ao art. 655-B da REN 1.000/2021. (Caso aplicável)",
  },
];

// Contato na distribuidora (Seção 7 — fixo)
const GD_CONTATO_CEMIG = {
  responsavel:
    "Gerência de Processos Especiais da Expansão de Média e Baixa Tensão - EM/PE",
  endereco: "Av. Barbacena, 1200, Santo Agostinho, CEP 30190-131, BH - MG",
  telefone: "0800 721 0167",
  email: "geracaodistribuida@cemig.com.br",
};

// Declarações 8.5 (dispensa art. 73-A)
const GD_DECL_85 = [
  "8.5.1 - não injeção na rede (“Grid Zero”)",
  "8.5.2 - enquadramento nos critérios de gratuidade da REN 1.000/2021",
  "8.5.3 - autoconsumo local, geração ≤ 7,5 kW",
];

// Orientações de preenchimento (Etapa 1) — resumo montado a partir das
// seções oficiais do Formulário MicroGD Rev. N4: Documentação a anexar
// (Seção 3 — GD_DOCUMENTOS), Documentação Técnica (Seção 6 — GD_DOCS_TEC),
// Contato na Distribuidora (Seção 7) e Solicitações/Declarações (Seção 8).
const GD_ORIENTACOES = {
  intro:
    "Leia as orientações antes de iniciar. Este formulário destina-se à solicitação de acesso de MICROGERAÇÃO distribuída (potência instalada de geração de até 75 kW) na área de concessão da CEMIG, conforme a Resolução Normativa ANEEL nº 1.000/2021.",
  blocos: [
    {
      // O Formulário de Carga obrigatório e o limite de 7,5 kW do Fast Track
      // migraram para avisos contextuais (.cmg-aviso) exibidos ao escolher a
      // solicitação e ao exceder a potência (ver microgeracao/js/views.js).
      titulo: "Antes de começar, tenha em mãos",
      itens: [
        "Dados da conta de energia da unidade consumidora: número da instalação, titular, classe e endereço completo (informando o CEP, o endereço é preenchido automaticamente).",
        "Coordenadas do ponto de conexão em Latitude/Longitude — o fuso e as coordenadas UTM são calculados automaticamente e validados contra a faixa do fuso em Minas Gerais.",
        "Dados da usina: quantidade e potência nominal de módulos e inversores. As potências totais e, em sistemas fotovoltaicos, a Potência Ativa Instalada (menor valor entre módulos e inversores) são calculadas automaticamente.",
        "Dados do sistema de armazenamento (baterias), caso o empreendimento possua.",
        "O enquadramento Fast Track (inciso III do art. 73-A) e o Grid Zero são definidos pelo card escolhido na página inicial e ficam bloqueados no formulário.",
      ],
    },
    {
      titulo: "Documentação a anexar (Seção 3)",
      itens: [
        "Documentos de identificação do consumidor, conforme incisos I e II do art. 67 da REN nº 1.000/2021.",
        "Documento com data que comprove a propriedade ou posse do imóvel onde será implantada a UC; para imóveis rurais, também o Cadastro Ambiental Rural – CAR (Lei nº 12.651/2012).",
        "Licença ou declaração do órgão competente, caso as instalações ocupem áreas protegidas (unidades de conservação, reservas legais, APP, territórios indígenas e quilombolas).",
        "Quando aplicável: documento que comprove o direito de posse em áreas, telhados ou estruturas alugados, cedidos ou arrendados, e autorização do condomínio para uso de área comum da edificação coletiva.",
      ],
    },
    {
      titulo: "Documentação técnica (Seção 6)",
      itens: [
        "Documento de responsabilidade técnica de projeto e execução, emitido pelo conselho profissional competente.",
        "Memorial descritivo da instalação com planta de situação, indicando o padrão de entrada (ND-5.1/5.2) ou a subestação de entrada (ND-5.3).",
        "Diagrama unifilar e de blocos do sistema de geração, carga e proteção.",
        "Relatório de ensaio, em português, atestando a conformidade de todos os conversores de potência para a tensão nominal de conexão.",
        "Dados necessários ao registro da central geradora conforme o site da ANEEL e, quando aplicável, os documentos do sistema de compensação: lista de UCs participantes, instrumento jurídico dos integrantes, cogeração qualificada e segurança de barragens.",
      ],
    },
    {
      titulo: "Declarações (Seção 8)",
      itens: [
        "As declarações 8.4 (instalações internas em conformidade com as normas da distribuidora, ABNT e art. 8º da Lei nº 9.074/1995) e 8.6 (veracidade das informações) são obrigatórias — o PDF só é liberado após marcá-las.",
        "Se o padrão de entrada NÃO estiver pronto para ser ligado (item 8.1), o pedido de vistoria/ligação deve ser feito em até 120 dias após a conclusão do orçamento de conexão.",
        "A dispensa da análise de inversão de fluxo (item 8.5, art. 73-A) é opcional e se aplica a: não injeção na rede (Grid Zero), enquadramento nos critérios de gratuidade da REN 1.000/2021 ou autoconsumo local com geração de até 7,5 kW.",
      ],
    },
  ],
  callout:
    "Ao final, revise os dados na etapa Prévia & PDF, exporte o formulário preenchido e anexe-o ao seu pedido. Dúvidas: " +
    GD_CONTATO_CEMIG.responsavel +
    " — " +
    GD_CONTATO_CEMIG.telefone +
    " · " +
    GD_CONTATO_CEMIG.email +
    ".",
};
