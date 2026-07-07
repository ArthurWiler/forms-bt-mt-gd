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
const GD_SOLICITACOES = [
  "Ligação de Nova Unidade Consumidora COM Geração Distribuída",
  "Conexão de GD em Unidade Consumidora Existente SEM Alteração de Potência Disponibilizada",
  "Conexão de GD em Unidade Consumidora Existente COM Alteração de Potência Disponibilizada",
  "GD Existente COM Alteração de Potência Ativa Instalada Total",
];
const GD_EDIFICACOES = [
  "Edificação Individual",
  "Edificação de Uso Coletivo (telhado coletivo ou em área comum do condomínio)",
  "Edificação de Uso Coletivo (telhado independente e privativo)",
  "Agrupamento",
];
const GD_EDIF_TIPO = [
  "Edificação Individual",
  "Edificação Coletiva ou Agrupamento",
];
const GD_TENSAO_A = ["13800", "22000", "34500"];
const GD_TENSAO_B = ["127/220", "120/240"];
const GD_RAMAL = ["Aéreo", "Subterrâneo"];
const GD_TIPOS_SE = ["Nº 1", "Nº 2", "Nº 4", "Nº 5", "Nº 8"];
const GD_TRAFO_POR_SE = {
  "Nº 1": [75, 112.5, 150, 225, 300],
  "Nº 2": [75, 112.5, 150, 225, 300],
  "Nº 4": [75, 112.5, 150, 225, 300],
  "Nº 5": [75, 112.5, 150, 225, 300],
  "Nº 8": [75, 112.5, 150, 225, 300],
};
const GD_TRAFOS_PARTICULARES = [100, 200, 300, 500, 700];
const GD_FONTES = [
  "Solar",
  "Hidráulica",
  "Biomassa",
  "Cogeração Qualificada",
  "Eólica",
];
const GD_TIPO_GERACAO = [
  "Empregando máquina síncrona sem conversor",
  "Empregando conversor eletrônico/inversor",
  "Mista",
  "Outra (especificar):",
];
const GD_MODALIDADES = [
  "Autoconsumo local",
  "Autoconsumo remoto",
  "Geração compartilhada",
  "Múltiplas Unidades Consumidoras",
];
const GD_MODALIDADE_AUTOCONSUMO_LOCAL = "Autoconsumo local";
// Fast Track: potência máxima da usina (REN 1.000/2021) — 7,5 kW = 7500 kW.
const GD_FAST_LIMITE_kW = 7.5;
const GD_FAST_LIMITE_USINA_KW = 7500;
// Solicitações que correspondem a Aumento de Potência (exigem nova proteção).
const GD_SOLICITACOES_AUMENTO_POTENCIA = [
  "Conexão de GD em Unidade Consumidora Existente COM Alteração de Potência Disponibilizada",
  "GD Existente COM Alteração de Potência Ativa Instalada Total",
];
// Tipos de subestação indisponíveis em Baixa Tensão (BT/Grupo B).
const GD_TIPOS_SE_BLOQ_BT = ["Nº 1", "Nº 2"];

// ===== Disponibilidade da subestação (Regras de MT/GD) — espelha minigeração =====
const GD_SOLICITACAO_LIG_NOVA =
  "Ligação de Nova Unidade Consumidora COM Geração Distribuída";
const GD_BT_BAIXA = "BT - Baixa Tensão"; // valor de instExistenteBTMT que caracteriza migração BT→MT
const GD_TENSAO_LIGNOVA_138 = "13800"; // 13,8 kV
// Somente as subestações Nº 1, 5 e 8 possuem limite de 300 kVA (filtragem por potência).
const GD_SE_LIMITE_300 = ["Nº 1", "Nº 5", "Nº 8"];
const GD_SE_LIMITE_KW = 300;
// Acima deste valor, sugere-se atendimento em alta tensão.
const GD_SE_SUGESTAO_AT_KW = 2500;

// Regra 4: aceitação das subestações por tipo × tensão × tipo de solicitação.
//  - "Ligação nova" inclui a migração de BT→MT (instalação existente em BT).
//  ctx = { solicitacao, tensao, instExistenteBTMT }
function gdSEDisponivel(tipo, ctx) {
  const e138 = ctx.tensao === GD_TENSAO_LIGNOVA_138;
  const ehBTtoMT = ctx.instExistenteBTMT === GD_BT_BAIXA;
  const novaConexao = ctx.solicitacao === GD_SOLICITACAO_LIG_NOVA || ehBTtoMT;
  switch (tipo) {
    case "Nº 1":
      if (novaConexao)
        return {
          ok: false,
          msg: "Subestação Nº 1 não aceita ligação nova / migração BT→MT.",
        };
      return { ok: true, msg: "" };
    case "Nº 2":
      if (novaConexao && e138)
        return {
          ok: false,
          msg: "Subestação Nº 2 não aceita ligação nova em 13,8 kV (disponível em 22 kV e 34,5 kV).",
        };
      return { ok: true, msg: "" };
    // Nº 4, Nº 5 e Nº 8 aceitam ligação nova em qualquer tensão.
    default:
      return { ok: true, msg: "" };
  }
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
const GD_FAST_LIMITE_KW = 7.5;
const GD_FAST_REGRAS = [
  "8.5.1 - não injeção na rede de distribuição (“Grid Zero”)",
  "8.5.2 - enquadramento nos critérios de gratuidade da REN 1.000/2021 e potência compatível com o consumo no horário de geração",
  "8.5.3 - modalidade autoconsumo local, com potência instalada de geração igual ou inferior a 7,5 kW",
];
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
  return { fuso: String(u.zona), utmE: String(u.easting), utmN: String(u.northing), banda: u.banda };
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
    "Ao final, revise os dados na etapa Prévia & PDF, exporte o formulário preenchido e anexe-o ao seu pedido no Cemig Atende. Dúvidas: " +
    GD_CONTATO_CEMIG.responsavel +
    " — " +
    GD_CONTATO_CEMIG.telefone +
    " · " +
    GD_CONTATO_CEMIG.email +
    ".",
};
