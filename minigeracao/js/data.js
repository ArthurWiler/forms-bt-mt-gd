// ============================================================
// MINIGERAÇÃO DISTRIBUÍDA — Dados normativos (CEMIG / REN 1.000/2021)
// Potência > 75 kW até 5000 kW. Base Rev. P2 (01/11/2024).
// ============================================================
const GD_GRUPOS = ["A"];
const GD_CLASSES = [
  "Residencial",
  "Industrial",
  "Comercial",
  "Rural",
  "Poder Público",
  "Iluminação Pública",
  "Serviço Público",
];
// Tipos de solicitação. O `valor` é o texto NORMATIVO: é ele que as regras leem
// (_ehLigacaoNova, _ehAlteracaoDemanda, GD_SOLICITACOES_FORM_CARGA) e o que sai
// impresso no PDF; o `texto` é o rótulo curto que aparece na tela, como no
// microGD. A ordem é a lógica do microGD — ligação nova, existente SEM
// alteração, existente COM alteração, geração já existente — e não a alfabética
// de antes: o usuário lê a lista do caso mais simples para o mais específico.
const GD_SOLICITACOES = [
  {
    valor: "Ligação de Nova Unidade Consumidora COM Geração Distribuída",
    texto: "Ligar nova unidade com Geração Distribuída",
  },
  {
    valor:
      "Conexão de GD em Unidade Consumidora Existente SEM Alteração de Demanda Contratada",
    texto:
      "Instalar geração distribuída em unidade existente (sem alteração de demanda)",
  },
  {
    valor:
      "Conexão de GD em Unidade Consumidora Existente COM Alteração de Demanda Contratada",
    texto:
      "Instalar geração distribuída em unidade existente (com alteração de demanda)",
  },
  {
    valor:
      "GD Existente COM Alteração de Potência Ativa Instalada Total de Geração",
    texto: "Alterar potência de geração já existente",
  },
];
const GD_TENSAO_A = ["13800", "22000", "34500"];
const GD_TENSAO_B = ["127/220", "120/240"];
const GD_RAMAL = ["Aéreo", "Subterrâneo"];
/* GD_TIPOS_SE saiu: o catálogo de subestações passou a vir de
   CalculoMT.tiposSubestacao() / tiposSubestacaoPermitidos() (mt/js/calculo.js),
   junto com o bloco técnico portado do MT — ver js/subestacao.js. Fonte única
   com o formulário de MT e com a microgeração, para as três telas não
   divergirem. Os rótulos de lá são completos ("Subestação Nº 1"), não os
   abreviados ("Nº 1") que esta lista trazia. */
// Transformadores: campo livre (qualquer potência, inclusive > RT, ex.: 1500/2000 kVA). Sem lista fixa.
const GD_TIPO_LIG_TRAFO = ["∆-Y", "∆-∆", "Y-∆", "Y-Y"];
// Dispositivos de partida de motor — mesma lista do MT (mt/js/dados.js) e da
// microgeração, usada pelos cards de "Motores e cargas especiais" da etapa 4.
const GD_DISPOSITIVOS_MOTOR = [
  "Chave Série-Paralelo",
  "Partida Estrela-Triângulo",
  "Chave Compensadora",
  "Resistência/Reatância Primária",
  "Resistência Rotórica",
  "Soft-Starter",
  "Outro",
];
// Opções do toggle "Tipo de edificação" da etapa 4 (data-k entradaEnergia):
// é ele que separa o ramo individual do compartilhado no bloco técnico.
const GD_ENTRADA_ENERGIA = [
  "Subestação Individual",
  "Subestação Compartilhada",
];
const GD_FONTES = [
  "Solar",
  "Hidráulica",
  "Biomassa",
  "Cogeração Qualificada",
  "Eólica",
];
// Fontes que declaram a MESMA central térmica (combustível, máquina motriz,
// ciclo termodinâmico): compartilham o bloco da central e as chaves bio* —
// perguntar os mesmos dados duas vezes, em blocos separados, só duplicaria
// estado, validação, prévia e PDF. Porte do microGD.
const GD_FONTES_CENTRAL_TERMICA = ["Biomassa", "Cogeração Qualificada"];
// Título do bloco por fonte: só a biomassa nomeia o combustível no cabeçalho.
// Escrito por JS (ver renderFontes), como no microGD.
const GD_TITULO_CENTRAL_TERMICA = {
  Biomassa: "Dados da central geradora a biomassa",
  "Cogeração Qualificada": "Dados da central geradora",
};
// Sistema solar é sempre inversor: renderFontes() marca esta opção sozinho ao
// escolher "Solar", por isso a constante (o texto é gravado no estado e sai
// assim no PDF — não pode divergir do item da lista).
const GD_TIPO_GERACAO_INVERSOR = "Conversor eletrônico/inversor";
// Lista fechada nas duas tecnologias reais, como no microGD: "Mista" e
// "Outra (especificar):" saíram, e com elas o campo de texto livre
// (tipoGeracaoOutro) que só a segunda revelava.
const GD_TIPO_GERACAO = [
  "Máquina síncrona sem conversor",
  GD_TIPO_GERACAO_INVERSOR,
];
// Tensão de conexão do inversor (V) — as duas tensões de BT em que os
// inversores se conectam. Valor gravado = rótulo (entra assim no PDF).
const GD_TENSOES_INVERSOR = ["120/240", "127/220"];
const GD_MODALIDADES = [
  "Autoconsumo Local",
  "Autoconsumo Remoto",
  "Geração Compartilhada",
  "Empreendimento de Múltiplas Unidades Consumidoras",
];
const GD_MODALIDADE_AUTOCONSUMO_LOCAL = "Autoconsumo Local";
const GD_QTD_FONTES = [1, 2];
/* ===== Fonte primária Hidráulica =====
   Classificação de segurança de barragens (REN ANEEL 696/2015, itens de
   categoria de risco e dano potencial associado), perguntada quando a fonte
   primária é Hidráulica — a 1ª pergunta (altura ≥ 15 m) é Sim/Não e sai como
   toggle; estas quatro têm opções longas demais para os cards e são exibidas
   como lista de rádios. Aqui as duas formas são escritas por JS, porque o
   bloco vive DENTRO do card da fonte (ver renderFontes, js/app.js).
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
/* GD_FAST_LIMITE_USINA_KW não existe aqui: o Fast Track é a conexão
   simplificada de até 7,5 kW (art. 73-A, III da REN 1.000/2021) e vale só para
   a MICROgeração — a minigeração começa em 75 kW, então nem a opção nem o
   limite fazem sentido nesta tela. Ver GD_FAST_LIMITE_USINA_KW em
   microgeracao/js/data.js. */
const GD_UTM_LIMITES = {
  22: { eMin: 487307, eMax: 833012, nMin: 7733378, nMax: 7981566 },
  23: { eMin: 161564, eMax: 840139, nMin: 7460145, nMax: 8435094 },
  24: { eMin: 164869, eMax: 417150, nMin: 7673180, nMax: 8336360 },
};
const GD_FUSOS = [22, 23, 24];
const GD_BT_MT = ["BT - Baixa Tensão", "MT - Média Tensão"];
const GD_SN = ["Não", "Sim"];
const GD_GFC_LIMITE_KW = 500; // garantia de fiel cumprimento acima de 500 kW
const GD_GFC_MODALIDADE_EMUC =
  "Empreendimento de Múltiplas Unidades Consumidoras";

// Formas de apresentação da Garantia de Fiel Cumprimento (art. 655-C)
const GD_GARANTIA_FORMAS = [
  "Caução em dinheiro",
  "Fiança bancária",
  "Títulos da dívida pública",
];
// Regra 20: o link de dúvidas frequentes da GFC deve apontar para a seção de Geração Distribuída.
const GD_GARANTIA_FAQ_URL =
  "https://www.cemig.com.br/geracao-distribuida/duvidas-frequentes/";
// Custo de investimento (R$/kW) por fonte primária — base de cálculo da GFC.
const GD_GFC_CUSTO_INVESTIMENTO = {
  Solar: 4000,
  Hidráulica: 5000,
  Biomassa: 4000,
  "Cogeração Qualificada": 4000,
  Eólica: 4500,
};

// Regra 19: a GFC é calculada automaticamente pelo sistema (não é preenchida pelo cliente).
// GFC = Percentual × Potência líquida × Custo de investimento.
//   Potência líquida = Potência instalada − Geração já existente.
//   Percentual = 0% (≤500 kW) · 2,5% (500<x<1000) · 5% (≥1000 kW).
// Regra 21: GFC não se aplica a Geração Compartilhada nem a EMUC (retorna 0).
function gdCalcularGFC(d) {
  const mod = d.modalidade;
  if (mod === "Geração Compartilhada" || mod === GD_GFC_MODALIDADE_EMUC)
    return 0;
  const instalada = parseFloat(d.potAtivaInstalada) || 0;
  const existente = parseFloat(d.potGeracaoAtual) || 0;
  const liquida = Math.max(0, instalada - existente);
  let perc = 0;
  if (liquida >= 1000) perc = 0.05;
  else if (liquida > GD_GFC_LIMITE_KW) perc = 0.025;
  const fonte =
    (d.fontes && d.fontes[0] && d.fontes[0].fontePrimaria) || "Solar";
  const custo = GD_GFC_CUSTO_INVESTIMENTO[fonte] || 4000;
  return perc * liquida * custo;
}

/* GD_TIPO_SE_BLOQ_LIGNOVA_138 e gdSEDisponivel() saíram: a aceitação das
   subestações passou a vir de CalculoMT.tiposSubestacaoPermitidos
   (mt/js/calculo.js), junto com o bloco técnico portado do MT — fonte única com
   o formulário de MT. Os critérios de lá são um superconjunto dos que existiam
   aqui e ainda cobrem a subestação COMPARTILHADA, que esta função não tratava:
     • Nº 1, Nº 3 e Nº 6 não aceitam conexão nova   → novaOk: false
     • Nº 2 só existe em 22 e 34,5 kV               → tensoes: [22, 34.5]
       (mais estrito: aqui a Nº 2 só era bloqueada em 13,8 kV na LIGAÇÃO NOVA)
     • teto de 300 kW de DEMANDA em Nº 1/3/5/6/8    → maxKW: 300
     • na compartilhada só valem Nº 2 e Nº 4        → compartilhada: true
   GD_TENSAO_LIGNOVA_138 saiu junto: era chave só desse `switch`.
   A pergunta "Haverá mudança de local da subestação?" CONTINUA no formulário —
   é campo de negócio e sai no PDF —, mas deixou de filtrar a galeria. */
const GD_SOLICITACAO_LIG_NOVA =
  "Ligação de Nova Unidade Consumidora COM Geração Distribuída";
// Regra 9: teto de 300 kVA das subestações Nº 1, 3, 5, 6 e 8 — aqui medido
// contra a POTÊNCIA ATIVA INSTALADA DE GERAÇÃO (etapa 5), que é conceito
// distinto do `maxKW` do CalculoMT (teto de DEMANDA contratada). Por isso o
// limite sobrevive à migração para o catálogo do MT; QUAIS modelos o têm sai de
// CalculoMT.SE_CRITERIOS (ver _tiposSEminiGD em js/subestacao.js), não de uma
// lista literal — os rótulos das duas divergiam ("Nº 1" × "Subestação Nº 1").
const GD_SE_LIMITE_KW = 300;
// Rótulos dos três papéis do par de demanda contratada. O par é campo do CARD
// (de transformador ou de cubículo); os rótulos ficam aqui porque os MESMOS
// textos valem para o card, para a validação e para o PDF — ver
// _paresPotenciaGD (js/app.js) e _camposDemandaGD (js/subestacao.js).
const GD_ROTULOS_DEMANDA = {
  nova: "Demanda a ser contratada de consumo (kW)",
  atual: "Demanda de consumo atual (kW)",
  futura: "Demanda de consumo futura (kW)",
};
// Sobre a subestação, no bloco de cubículos: numa subestação nova não há UC por
// cubículo a informar; numa já existente, sim.
const GD_SUBESTACAO_EXISTENTE = ["Nova subestação", "Subestação já existente"];
// Solicitações que alteram a demanda CONTRATADA — as únicas, fora a ligação
// nova, com uma demanda FUTURA a declarar (ver _paresPotenciaGD em js/app.js).
const GD_SOLICITACOES_ALTERACAO_DEMANDA = [
  "Conexão de GD em Unidade Consumidora Existente COM Alteração de Demanda Contratada",
];
// Solicitações que exigem o preenchimento do Formulário de Carga (aumento de demanda / ligação nova)
const GD_SOLICITACOES_FORM_CARGA = [
  "Conexão de GD em Unidade Consumidora Existente COM Alteração de Demanda Contratada",
  "Ligação de Nova Unidade Consumidora COM Geração Distribuída",
];
const GD_ENTRADA_COMPARTILHADA = "Subestação Compartilhada";

// Documentação Técnica (Seção 7) — MiniGD
const GD_DOCS_TEC = [
  {
    id: "7.1",
    req: true,
    txt: "Documento de responsabilidade técnica (projeto e execução) do conselho profissional competente.",
  },
  {
    id: "7.2",
    req: true,
    txt: "Projeto elétrico das instalações de conexão e memorial descritivo com planta de situação.",
  },
  {
    id: "7.3",
    req: true,
    txt: "Diagrama unifilar e de blocos do sistema de geração, carga e proteção.",
  },
  {
    id: "7.4",
    req: true,
    txt: "Relatório de ensaio (português) atestando conformidade dos conversores de potência para a tensão de conexão.",
  },
  {
    id: "7.5",
    req: true,
    txt: "Dados necessários ao registro da central geradora distribuída conforme site da ANEEL.",
  },
  {
    id: "7.6",
    req: false,
    txt: "Lista de UCs participantes do sistema de compensação com percentual/ordem de utilização dos excedentes.",
  },
  {
    id: "7.7",
    req: false,
    txt: "Instrumento jurídico que comprove participação dos integrantes (múltiplas UCs e geração compartilhada). (Caso aplicável)",
  },
  {
    id: "7.8",
    req: false,
    txt: "Documento que comprove reconhecimento pela ANEEL da cogeração qualificada. (Caso aplicável)",
  },
  {
    id: "7.9",
    req: false,
    txt: "Dados de segurança das barragens para fontes hídricas (REN 696/2015). (Caso aplicável)",
  },
  {
    id: "7.10",
    req: false,
    txt: "Para centrais FV despacháveis, comprovação de atendimento ao art. 655-B (armazenamento). (Caso aplicável)",
  },
  {
    id: "7.11",
    req: false,
    txt: "Documento que comprove o aporte da Garantia de Fiel Cumprimento (art. 655-C). (Caso aplicável > 500 kW)",
  },
];

const GD_CONTATO_CEMIG = {
  responsavel:
    "Gerência de Processos Especiais da Expansão de Média e Baixa Tensão - EM/PE",
  endereco: "Av. Barbacena, 1200, Santo Agostinho, CEP 30190-131, BH - MG",
  telefone: "0800 721 0167",
  email: "geracaodistribuida@cemig.com.br",
};
const GD_DECL_85 = ["não injeção na rede (“Grid Zero”)"];


// GFC exigida acima de 500 kW, EXCETO:
//  - Geração Compartilhada com consórcio verificado;
//  - Geração Compartilhada / EMUC (Regra 21: GFC não se aplica a EMUC).
function gdExigeGFC(d) {
  if ((parseFloat(d.potAtivaInstalada) || 0) <= GD_GFC_LIMITE_KW) return false;
  if (
    d.modalidade === "Geração Compartilhada" &&
    d.consorcioVerificado === "Sim"
  )
    return false;
  if (d.modalidade === GD_GFC_MODALIDADE_EMUC) return false;
  return true;
}

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
