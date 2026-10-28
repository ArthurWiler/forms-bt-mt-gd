const SISEMA_WFS = "https://geoserver.meioambiente.mg.gov.br/ows";
const SISEMA_VERSION = "1.1.0";
const SISEMA_FLIP_BBOX = false;
/* ------------------------------------------------------------------
   SICAR (CAR federal) — GeoServer público, serviços virtuais POR CAMADA
   (padrão .../geoserver/sicar/<camada>/wfs).
   CONFIRMADO no GetCapabilities de sicar_imoveis_mg (17/07/2026):
   - typeName sicar:sicar_imoveis_mg (perímetro do IMÓVEL/CAR de MG)
   - outputFormat application/json habilitado
   - WFS 1.0.0/1.1.0; DefaultSRS EPSG:4674 (SIRGAS 2000) — pedimos
     srsName=EPSG:4326 e o GeoServer reprojeta (diferença desprezível)
   - BBOX com "EPSG:4326" (código simples) => ordem long,lat (flip=false)
   - CORS OK: o servidor ECOA o Origin no Access-Control-Allow-Origin
     (o header só aparece quando a requisição envia Origin — testar
     sem ele dá falso negativo).
   - NÃO existe camada de Reserva Legal: o GetCapabilities do workspace
     (https://geoserver.car.gov.br/geoserver/sicar/wfs) lista 27 camadas,
     todas sicar_imoveis_<uf>. A RL vem do AgroTag/Embrapa (abaixo).
   ------------------------------------------------------------------ */
const SICAR_WFS_IMOVEIS =
  "https://geoserver.car.gov.br/geoserver/sicar/sicar_imoveis_mg/wfs";
const SICAR_VERSION = "1.1.0";
const SICAR_FLIP_BBOX = false;
/* ------------------------------------------------------------------
   AgroTag/Embrapa — GeoServer público com a RESERVA LEGAL do CAR de MG
   (base derivada do SICAR). CONFIRMADO em GetFeature real (17/07/2026):
   - typeName bases:mg_reserva_legal (workspace "bases")
   - outputFormat application/json habilitado; resposta ~1 s
   - DefaultSRS EPSG:4674; srsName=EPSG:4326 reprojeta; coords long,lat
     (flip=false)
   - CORS liberado: Access-Control-Allow-Origin: *
   - atributos: idf, nom_tema ("Reserva Legal Proposta"…), num_area (ha),
     geocodigo (município IBGE) — não há nº do CAR
   ------------------------------------------------------------------ */
const AGROTAG_WFS = "https://www.agrotag.cnpma.embrapa.br/geoserver/ows";
const AGROTAG_VERSION = "1.1.0";
const AGROTAG_FLIP_BBOX = false;
// Extrator de rótulo p/ feições do SICAR (não têm "nome" próprio): nº do
// CAR + situação/condição do cadastro. Atributos confirmados em GetFeature
// real de sicar_imoveis_mg: cod_imovel e condicao ("Aguardando análise").
function _nomeFeicaoSicar(p) {
  if (!p) return null;
  const pega = (...ks) => {
    for (const k of ks) {
      const v = p[k] != null ? p[k] : p[String(k).toUpperCase()];
      if (v != null && String(v).trim() !== "") return String(v).trim();
    }
    return null;
  };
  const cod = pega("cod_imovel", "codigo_car", "cod_car");
  const sit = pega("situacao", "ind_status", "des_condic", "condicao");
  const partes = [cod, sit ? `(${sit})` : null].filter(Boolean);
  return partes.length ? partes.join(" ") : null;
}

const URFBIO_APP_HIDRICA = [
  ["ne", "da URFBio Nordeste"],
  ["amsf", "na URFBio Alto Médio São Francisco"],
  ["ap", "na URFBio Alto Paranaíba"],
  ["cnor", "na URFBio Centro-Norte"],
  ["co", "na URFBio Centro-Oeste"],
  ["cs", "na URFBio Centro-Sul"],
  ["jeq", "na URFBio Jequitinhonha"],
  ["mata", "na URFBio Mata"],
  ["cm", "na URFBio Metropolitana"],
  ["nor", "na URFBio Noroeste"],
  ["no", "na URFBio Norte"],
  ["riodoce", "na URFBio Rio Doce"],
  ["sul", "na URFBio Sul"],
  ["tm", "na URFBio Triângulo"],
];

// APPs (FBDS) por circunscrição hidrográfica — camadas
// ide_240905_<suf>_apps_fbds_pol (43 circunscrições, partição do território:
// cada ponto cai em no máximo uma). typeNames confirmados no GetCapabilities.
// Cada par [sufixo, complemento do rótulo]; o rótulo final é
// "APPs da Circunscrição hidrográfica <complemento>".
const APP_FBDS_CIRCUNSCRICAO = [
  ["bu1", "do rio Buranhém"],
  ["do1", "do rio Piranga"],
  ["do2", "do rio Piracicaba"],
  ["do3", "do rio Santo Antônio"],
  ["do4", "do rio Suaçuí Grande"],
  ["do5", "do rio Caratinga"],
  ["do6", "do rio Manhuaçu"],
  ["gd1", "dos Afluentes Mineiros do Alto rio Grande"],
  ["gd2", "Vertentes do rio Grande"],
  ["gd3", "do Entorno do Reservatório de Furnas"],
  ["gd4", "do rio Verde"],
  ["gd5", "do rio Sapucaí"],
  ["gd6", "dos rios Mogi-Guaçu e Pardo"],
  ["gd7", "do Médio rio Grande"],
  ["gd8", "do Baixo rio Grande"],
  ["ib1", "do rio Itabapoana"],
  ["in1", "do rio Itanhém"],
  ["ip1", "do rio Itapemirim"],
  ["iu1", "do rio Itaúnas"],
  ["jq1", "do Alto rio Jequitinhonha"],
  ["jq2", "do rio Araçuaí"],
  ["jq3", "do Médio e Baixo rio Jequitinhonha"],
  ["ju1", "do rio Jucuruçu"],
  ["mu1", "do rio Mucuri"],
  ["pa1", "do rio Pardo"],
  ["pe1", "do rio Peruípe"],
  ["pj1", "dos rios Piracicaba e Jaguari"],
  ["pn1", "do rio Dourados e Alto rio Paranaíba"],
  ["pn2", "do rio Araguari"],
  ["pn3", "do Baixo rio Paranaíba"],
  ["ps1", "dos rios Preto e Paraibuna"],
  ["ps2", "dos rios Pompa e Muriaé"],
  ["sf1", "do Alto rio São Francisco"],
  ["sf2", "do rio Pará"],
  ["sf3", "do rio Paraopeba"],
  ["sf4", "do Entorno da Represa de Três Marias"],
  ["sf5", "do rio das Velhas"],
  ["sf6", "dos rios Jequitaí e Pacuí"],
  ["sf7", "do rio Paracatu"],
  ["sf8", "do rio Urucuia"],
  ["sf9", "do rio Pandeiros"],
  ["sf10", "do rio Verde Grande"],
  ["sm1", "do rio São Mateus"],
];

const DOC_INTRO =
  "Para que o cliente obtenha ligação de energia elétrica, é necessário anexar os seguintes documentos:";
/* ---- Área de Preservação Permanente (APP) ----
   O texto cita a COORDENADA consultada: o placeholder {coord} é substituído
   por "(lat, lng)" em restricaoDocsBlocos (_interpTexto). Introdução própria
   (`introPropria`): a padrão (DOC_INTRO, "anexar…") não cabe nesta redação. */
const DOC_APP = {
  chave: "app",
  introPropria:
    "Além disso, considerando que a residência ou benfeitoria localizada nas coordenadas {coord} encontra-se inserida em Área de Preservação Permanente, é necessária a comprovação da regularidade da ocupação para subsidiar a análise junto ao órgão ambiental competente. Para continuidade do atendimento, deverá ser apresentada pelo menos uma das seguintes comprovações:",
  bullets: [
    "Termo de Ajustamento de Conduta (TAC);",
    "Comprovação de Uso Antrópico Consolidado;",
    "Declaração de Interesse Social ou Utilidade Pública, quando se tratar de propriedade rural;",
    "Declaração emitida pelo órgão ambiental competente atestando a regularidade da ocupação.",
  ],
  notas: [],
};
/* ---- Unidade de Conservação — texto VARIÁVEL por dois eixos ----
   Mesma regra da aba Análise Ambiental do atendente (switches zona/rede):
   - zona: "urbana" | "rural"    → muda a LISTA de documentos
   - rede: "porta" | "extensao"  → muda a INTRODUÇÃO (+ complemento na frase)
   Nos formulários do cliente a rede é SEMPRE "porta" (cenarioRestricao):
   o cenário de extensão fica para o atendente. A nota do órgão vale nos
   quatro cenários. Resolvido em docsUnidadeConservacao(cenario). */
const UC_NOTA_ORGAO =
  "A critério do órgão ambiental responsável pela administração da Unidade de Conservação, outros documentos e informações complementares poderão ser solicitadas posteriormente.";
const UC_BULLETS_ZONA = {
  urbana: [
    "Documentos que comprovem posse e regularidade do imóvel simultaneamente (IPTU, Registro de Imóvel, Escritura Pública, etc) ou;",
    "Documentos que comprovem posse (Contrato de Compra e Venda, Contrato de Locação, Termo de Doação, Termo de Permissão de Uso, etc) e regularidade (Certidão de número/Habite-se/Declaração da Prefeitura, Planta de Arquitetura Aprovada) separadamente.",
  ],
  rural: [
    "Escritura do Imóvel e/ou Certidão de Inteiro Teor da matrícula do imóvel, e o CAR – Cadastro Ambiental Rural.",
  ],
};
const UC_INTRO_REDE = {
  porta:
    "Para que o cliente obtenha a ligação de energia elétrica, é necessário apresentar:",
  extensao:
    "Visando subsidiar a análise do órgão ambiental, o requerente deve apresentar os seguintes documentos:",
};
// Complemento da FRASE de localização — só no cenário de extensão de rede.
const UC_COMPLEMENTO_EXTENSAO =
  "Nessas condições, a execução de obras ou projetos de extensão de rede de distribuição de energia elétrica depende de autorização prévia do órgão responsável pela administração da respectiva Unidade de Conservação, não sendo possível o prosseguimento da solicitação sem a devida regularização e análise ambiental.";
function normalizarCenario(cenario) {
  const c = cenario || {};
  return {
    zona: c.zona === "rural" ? "rural" : "urbana",
    rede: c.rede === "extensao" ? "extensao" : "porta",
  };
}
// Cenário dos formulários: zona pela localização do form, rede sempre porta.
function cenarioRestricao(localizacao) {
  return { zona: localizacao === "Rural" ? "rural" : "urbana", rede: "porta" };
}
function docsUnidadeConservacao(cenario) {
  const c = normalizarCenario(cenario);
  return {
    chave: "uc",
    introPropria: UC_INTRO_REDE[c.rede],
    bullets: UC_BULLETS_ZONA[c.zona].slice(),
    notas: [UC_NOTA_ORGAO],
  };
}
// Marcador da UC: o texto real só é resolvido no render (restricaoDocsBlocos),
// então trocar a zona depois da consulta muda o texto sem reconsultar. É um
// objeto simples para sobreviver ao JSON do state.
const DOC_UNIDADE_CONSERVACAO = { chave: "uc", unidadeConservacao: true };
const DOC_TERRA_QUILOMBOLA = {
  bullets: [
    "Certidão/Registro de Autodefinição emitido pela Fundação Cultural Palmares, comprovando o vínculo do(s) interessado(s) com a comunidade quilombola;",
    "Documento do INCRA que comprove o domínio da terra em nome da comunidade, juntamente com a demarcação da área;",
    "Mapa georreferenciado contendo a delimitação do imóvel e a identificação das áreas de preservação ambiental;",
    "Lista de beneficiários emitida pela liderança comunitária;",
    "Formulário de Solicitação de Atendimento Rural devidamente preenchido (um para cada beneficiário);",
    "Documento oficial de identificação com CPF de cada beneficiário.",
  ],
  notas: [
    "Observação: Caso o processo de demarcação das terras ainda não tenha sido concluído, a solicitação poderá ser protocolada pelo procedimento padrão, como atendimento rural comum, sem enquadramento como comunidade quilombola.",
  ],
};
const DOC_TERRA_INDIGENA = {
  bullets: [
    "Autorização formal da FUNAI para execução do serviço;",
    "Documento emitido pela comunidade indígena ou liderança reconhecida, indicando os beneficiários;",
    "Mapa ou croqui da área, com delimitação do imóvel e identificação da aldeia;",
    "Documento oficial de identificação com CPF dos beneficiários ou representantes legais.",
  ],
  notas: [
    "Observação: Caso o processo de demarcação das terras ainda não tenha sido concluído, a solicitação poderá ser protocolada pelo procedimento padrão, como atendimento rural comum, sem enquadramento como comunidade indígena.",
  ],
};
// Reserva Legal (CAR) — as exigências VARIAM pelo status do cadastro
// (campo nom_tema da camada bases:mg_reserva_legal): Averbada é impeditiva;
// Proposta e Aprovada e não Averbada pedem a realocação no registro/CAR.
const DOC_RL_AVERBADA = {
  bullets: [],
  notas: [
    "Em atendimento à sua solicitação, identificamos que o ponto para a ligação de energia elétrica encontra-se em uma área de reserva legal averbada de interesse de preservação ambiental, definidas pela lei federal 12.651/2012. Sendo assim não podemos realizar o fornecimento de energia elétrica a essa unidade consumidora.",
  ],
};
const DOC_RL_PROPOSTA = {
  bullets: [
    "Constar realocação da reserva no registro do imóvel ou CAR, em processo de ou concluída.",
  ],
  notas: [],
};
// Seleciona o bloco de documentos da RL pelo status (nom_tema) da feição.
// Retorna null quando o status é desconhecido (só a frase de localização).
function _docsReservaLegal(props) {
  const t =
    props && props.nom_tema != null ? String(props.nom_tema).trim() : "";
  if (/averbada/i.test(t) && !/n[ãa]o\s+averbada/i.test(t))
    return DOC_RL_AVERBADA;
  if (/aprovada\s+e\s+n[ãa]o\s+averbada/i.test(t) || /proposta/i.test(t))
    return DOC_RL_PROPOSTA;
  return null;
}

const SISEMA_CAMADAS = [
  // { id, rotulo, typeName, tipoNome, documentos }
  //   rotulo    — título do dropdown (categoria da camada)
  //   tipoNome  — como o TIPO aparece na frase de localização
  //   documentos— texto de exigências (varia por tipo; null = só a frase)
  //   typeName DEVE ser confirmado no GetCapabilities
  // OPCIONAIS por camada (default = servidor do Sisema):
  //   wfs, version, flipBBox — endpoint/versão/ordem do BBOX próprios,
  //     permitindo camadas de OUTROS GeoServers (ex.: SICAR) no mesmo fluxo
  //   nomeFeicao(props) — extrator de rótulo específico da camada (tem
  //     prioridade sobre a heurística genérica nomeFeicaoRestricao)
  {
    id: "ape",
    rotulo: "Área de Proteção Especial",
    typeName: "IDE:ide_2010_mg_areas_protecao_especial_pol",
    tipoNome: "Área de Proteção Especial",
    documentos: DOC_UNIDADE_CONSERVACAO,
  },
  {
    id: "uce",
    rotulo: "Unidade de Conservação Estadual",
    typeName: "IDE:ide_2010_mg_unidades_conservacao_estaduais_pol",
    tipoNome: "Unidade de Conservação",
    documentos: DOC_UNIDADE_CONSERVACAO,
  },
  {
    id: "ucf",
    rotulo: "Unidade de Conservação Federal",
    typeName: "IDE:ide_2010_mg_unidades_conservacao_federais_pol",
    tipoNome: "Unidade de Conservação",
    documentos: DOC_UNIDADE_CONSERVACAO,
  },
  {
    id: "ucm",
    rotulo: "Unidade de Conservação Municipal",
    typeName: "IDE:ide_2010_mg_unidades_conservacao_municipais_pol",
    tipoNome: "Unidade de Conservação",
    documentos: DOC_UNIDADE_CONSERVACAO,
  },
  {
    id: "tq",
    rotulo: "Terra Quilombola",
    typeName: "IDE:ide_2005_mg_terras_quilombolas_pol",
    tipoNome: "Terra Quilombola",
    documentos: DOC_TERRA_QUILOMBOLA,
  },
  {
    id: "ti",
    rotulo: "Terra Indígena",
    typeName: "IDE:ide_2003_mg_terras_indigenas_pol",
    tipoNome: "Terra Indígena",
    documentos: DOC_TERRA_INDIGENA,
  },
  {
    id: "rl",
    rotulo: "Reserva Legal (CAR)",
    typeName: "bases:mg_reserva_legal",
    tipoNome: "Reserva Legal",
    // Varia por status (nom_tema): Proposta / Aprovada e não Averbada /
    // Averbada. Resolvido por feição em _areasRestricao.
    documentos: _docsReservaLegal,
    wfs: AGROTAG_WFS,
    version: AGROTAG_VERSION,
    flipBBox: AGROTAG_FLIP_BBOX,
    nomeFeicao: (p) => {
      const t = p && p.nom_tema != null ? String(p.nom_tema).trim() : "";
      return t || null;
    },
  },

  ...URFBIO_APP_HIDRICA.map(([suf, regiao]) => ({
    id: "apph_" + suf,
    rotulo: "APPs hídricas " + regiao,
    typeName: `IDE:ide_210603_mg_hid_app_hidrica_mapcar_${suf}_pol`,
    tipoNome: "APP hídrica",
    documentos: DOC_APP,
    nomeFeicao: (p) => {
      const c = p && p.categoria != null ? String(p.categoria).trim() : "";
      return c ? "faixa " + c.replace(/\bAte\b/g, "até") : null;
    },
  })),

  ...APP_FBDS_CIRCUNSCRICAO.map(([suf, circ]) => ({
    id: "appfbds_" + suf,
    rotulo: "APPs da Circunscrição hidrográfica " + circ,
    typeName: `IDE:ide_240905_${suf}_apps_fbds_pol`,
    tipoNome: "Área de Preservação Permanente",
    documentos: DOC_APP,
    // Feição sem nome próprio: tipo hidrográfico + faixa da APP (m).
    // Ex.: props {hidro:"nascente", app_m:50} → "nascente — faixa de 50 m".
    nomeFeicao: (p) => {
      if (!p) return null;
      const h = p.hidro != null ? String(p.hidro).trim() : "";
      const m = p.app_m != null ? String(p.app_m).trim() : "";
      const faixa = m ? "faixa de " + m + " m" : "";
      return [h, faixa].filter(Boolean).join(" — ") || null;
    },
  })),

  {
    id: "rppn",
    rotulo: "Reserva Particular do Patrimônio Natural (RPPN)",
    typeName: "IDE:ide_2010_mg_reservas_particulares_patrimonio_natural_pol",
    tipoNome: "Reserva Particular do Patrimônio Natural",
    documentos: DOC_UNIDADE_CONSERVACAO,
    nomeFeicao: (p) => {
      const n = p && p.nome_uc != null ? String(p.nome_uc).trim() : "";
      return n || null;
    },
  },
];

/* ------------------------------------------------------------------
   Timeout e repetição das consultas WFS.

   O GeoServer do Sisema (62 das 64 camadas) deixa conexões PENDURADAS
   com frequência: medido fora do navegador, ~1 em 8 GetFeature fica sem
   resposta e só estoura no timeout do sistema, 20-40 s. O fetch nu não
   tem prazo próprio — quem manda é o SO. Como consultarRestricoesObra
   percorre 64 camadas, um punhado de penduradas transforma uma consulta
   de 8 s em vários minutos (medido: 858 s), a aba fica presa em
   "Consultando restrições…" e o atendente conclui que a análise
   ambiental parou de funcionar.

   Prazo curto por tentativa + repetição resolve porque a falha é
   transitória: quando a conexão pendura, a tentativa seguinte costuma
   responder em ~0,3 s. Resposta HTTP de erro (o 502 do AgroTag, por
   exemplo) não é repetida — chega como resposta e é definitiva.
   ------------------------------------------------------------------ */
const WFS_TIMEOUT_MS = 12000;
// Duas tentativas: quando a conexão pendura, quem resolve é a tentativa
// SEGUINTE (medido: ~0,3 s). Uma terceira quase nunca muda o resultado e
// custa mais 12 s de espera justamente na camada que interessa.
//
// As duas constantes existem separadas porque o fetch do navegador é
// OPACO: conexão pendurada, host bloqueado pelo proxy e 502 sem cabeçalho
// CORS chegam todos como o mesmo TypeError. Só o estouro do nosso próprio
// prazo se identifica (TimeoutError). Hoje as duas valem 2; separadas,
// mexer no comportamento de uma falha não arrasta a outra junto.
const WFS_TENTATIVAS_TIMEOUT = 2;
const WFS_TENTATIVAS_REDE = 2;
// Disjuntor por servidor. Repetir é certo quando UMA camada pendura, e
// desastroso quando o servidor inteiro está fora: 62 camadas x 2 tentativas
// x 12 s, mesmo 6 a 6, dá minutos de espera para no fim não responder nada
// (medido: 5 min). Após WFS_DISJUNTOR_FALHAS timeouts SEGUIDOS no host, as
// consultas restantes àquele host falham na hora, sem ir à rede. Qualquer
// resposta zera a contagem — um servidor instável (~1 em 8 penduradas, que
// é o comportamento real do Sisema) nunca chega a abrir o disjuntor.
const WFS_DISJUNTOR_FALHAS = 3;
const WFS_DISJUNTOR_MS = 20000;
// Camadas consultadas ao mesmo tempo. Sequencial (o que era feito antes)
// paga a latência de 64 idas e voltas em série; paralelismo alto derruba
// mais conexões no Sisema, que já é o elo fraco. 6 mantém a consulta na
// casa dos segundos sem virar carga para o servidor.
const WFS_PARALELO = 6;

// Rótulo do erro mostrado no chip da camada. Separar "sem resposta" de
// "falha de rede" importa no atendimento: a primeira é o Sisema pendurando
// (vale reconsultar), a segunda costuma ser proxy/bloqueio da rede.
function _erroWfs(e) {
  if (e && e.name === "ServidorIndisponivel") return "Servidor sem resposta";
  if (e && e.name === "TimeoutError") return "Sem resposta (timeout)";
  return "Falha de rede/CORS";
}

// host -> { seguidas, abertoAte }. Vive entre consultas de propósito: se o
// servidor acabou de se mostrar fora do ar, a consulta seguinte não precisa
// redescobrir isso do zero. A janela curta (WFS_DISJUNTOR_MS) faz o estado
// se desfazer sozinho, sem ninguém precisar reiniciar nada.
const _wfsDisjuntor = new Map();

function _hostDe(url) {
  try {
    return new URL(url).host;
  } catch (e) {
    return url;
  }
}

class ServidorIndisponivel extends Error {
  constructor(host) {
    super("servidor " + host + " sem resposta");
    this.name = "ServidorIndisponivel";
  }
}

// Vagas por host. O Sisema e o AgroTag respondem em HTTP/1.1, e o navegador
// abre no máximo 6 conexões por host: o pedido que passa disso espera numa
// fila INTERNA do navegador, e o prazo de WFS_TIMEOUT_MS corria durante essa
// espera. Com consultas sobrepostas (digitação, cliques seguidos) e algumas
// conexões penduradas, pedidos estouravam o prazo sem nem sair da máquina,
// abriam o disjuntor e o resto das camadas voltava "Servidor sem resposta".
// A fila aqui é NOSSA: o prazo só começa quando o pedido ganha conexão.
const WFS_VAGAS_POR_HOST = 6;
const _wfsVagas = new Map(); // host -> { livres, fila: [fn] }

function _pegarVaga(host, signal) {
  let v = _wfsVagas.get(host);
  if (!v) _wfsVagas.set(host, (v = { livres: WFS_VAGAS_POR_HOST, fila: [] }));
  if (v.livres > 0) {
    v.livres--;
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const entrar = () => {
      if (signal) signal.removeEventListener("abort", desistir);
      resolve();
    };
    const desistir = () => {
      const i = v.fila.indexOf(entrar);
      if (i >= 0) v.fila.splice(i, 1);
      reject(signal.reason);
    };
    if (signal) signal.addEventListener("abort", desistir, { once: true });
    v.fila.push(entrar);
  });
}

function _soltarVaga(host) {
  const v = _wfsVagas.get(host);
  const proximo = v.fila.shift();
  if (proximo) proximo();
  else v.livres++;
}

// `cancelar`: sinal da consulta (consultarRestricoesObra) — quando ela é
// substituída por outra, os pedidos em voo e na fila caem na hora, sem
// contar como falha do servidor.
async function _fetchWfs(url, cancelar) {
  const host = _hostDe(url);
  for (let i = 0; ; i++) {
    await _pegarVaga(host, cancelar);
    // Conferido DEPOIS da fila: o disjuntor pode ter aberto enquanto o
    // pedido esperava a vaga.
    const d = _wfsDisjuntor.get(host);
    if (d && d.abertoAte > Date.now()) {
      _soltarVaga(host);
      throw new ServidorIndisponivel(host);
    }
    const ctrl = new AbortController();
    const prazo = setTimeout(
      () => ctrl.abort(new DOMException("prazo esgotado", "TimeoutError")),
      WFS_TIMEOUT_MS,
    );
    const repassar = () => ctrl.abort(cancelar.reason);
    if (cancelar) cancelar.addEventListener("abort", repassar, { once: true });
    try {
      const resp = await fetch(url, { signal: ctrl.signal });
      // O corpo é lido aqui, ainda dentro do prazo e da vaga: a conexão só
      // fica livre depois dele, e um corpo que trava no meio é a mesma
      // conexão pendurada de sempre.
      const corpo = await resp.arrayBuffer();
      // Respondeu — inclusive 4xx/5xx: o servidor está de pé, o disjuntor
      // não tem nada a ver com o conteúdo da resposta.
      _wfsDisjuntor.delete(host);
      // (204/304 não aceitam corpo no construtor do Response.)
      const semCorpo = [204, 205, 304].includes(resp.status);
      return new Response(semCorpo ? null : corpo, {
        status: resp.status,
        statusText: resp.statusText,
        headers: resp.headers,
      });
    } catch (e) {
      if (e && e.name === "ServidorIndisponivel") throw e;
      if (cancelar && cancelar.aborted) throw e;

      if (e && e.name === "TimeoutError") {
        const atual = _wfsDisjuntor.get(host) || { seguidas: 0, abertoAte: 0 };
        atual.seguidas++;
        if (atual.seguidas >= WFS_DISJUNTOR_FALHAS)
          atual.abertoAte = Date.now() + WFS_DISJUNTOR_MS;
        _wfsDisjuntor.set(host, atual);
        if (atual.abertoAte > Date.now()) throw new ServidorIndisponivel(host);
      }

      const limite =
        e && e.name === "TimeoutError"
          ? WFS_TENTATIVAS_TIMEOUT
          : WFS_TENTATIVAS_REDE;
      if (i + 1 >= limite) throw e;
    } finally {
      clearTimeout(prazo);
      if (cancelar) cancelar.removeEventListener("abort", repassar);
      _soltarVaga(host);
    }
    // Espera curta e crescente antes de repetir (200 ms, 600 ms, …).
    await new Promise((r) => setTimeout(r, 200 * Math.pow(3, i)));
    if (cancelar && cancelar.aborted) throw cancelar.reason;
  }
}

// Executa fn sobre itens com no máximo `limite` em voo, PRESERVANDO a
// ordem de `itens` no resultado (a UI lista as camadas nessa ordem).
async function _emParalelo(itens, limite, fn) {
  const out = new Array(itens.length);
  let proximo = 0;
  const trabalhador = async () => {
    for (let i = proximo++; i < itens.length; i = proximo++)
      out[i] = await fn(itens[i]);
  };
  await Promise.all(
    Array.from({ length: Math.min(limite, itens.length) }, trabalhador),
  );
  return out;
}

const SICAR_CAM_IMOVEL = {
  typeName: "sicar:sicar_imoveis_mg",
  wfs: SICAR_WFS_IMOVEIS,
  version: SICAR_VERSION,
  flipBBox: SICAR_FLIP_BBOX,
};
async function consultarImovelCAR(lat, lng) {
  // Turf sob demanda: esta função já é async e de rede, então esperar a lib
  // aqui não custa nada — e tira ~500 KB do carregamento inicial da página.
  await window.CemigLibs.turf();
  const ponto = window.turf.point([lng, lat]);
  try {
    const resp = await _fetchWfs(_urlWfs(SICAR_CAM_IMOVEL, lat, lng));
    if (!resp.ok) return { erro: `HTTP ${resp.status}` };
    const gj = await resp.json();
    const feats = (gj && gj.features) || [];
    const f = feats.find(
      (x) =>
        x.geometry &&
        (x.geometry.type === "Polygon" || x.geometry.type === "MultiPolygon") &&
        window.turf.booleanPointInPolygon(ponto, x),
    );
    if (!f) return { dentro: false };
    const completa = await geometriaCompletaFeicao(SICAR_CAM_IMOVEL, f.id);
    return {
      dentro: true,
      nome: _nomeFeicaoSicar(f.properties),
      props: f.properties || {},
      feicao: completa || f,
    };
  } catch (e) {
    return { erro: _erroWfs(e) };
  }
}
/* ============================================================
   Geocodificação de endereço → coordenada (Nominatim) — COMPARTILHADA
   Fonte única usada pelo BT (bt/js/map.js) e pelo MT (mt/js/app.js).

   Estratégia (validada com endereços reais de BH):
   1) NÚMERO EXATO — busca estruturada (street="123 Rua X") retorna o prédio
      quando o número existe no OSM (ex.: Av. Afonso Pena 1212 = Prefeitura).
   2) MÉDIA DOS SEGMENTOS NO BAIRRO — quando o número NÃO existe no OSM, uma
      busca limitada ao bbox do bairro (viewbox+bounded) traz os segmentos da
      rua DENTRO do bairro; o ponto médio deles aproxima a altura do número
      (no Brasil o trecho de uma rua num bairro corresponde à faixa de
      numeração — ex.: Rua Platina no Calafate = nºs 1001–1729; média a ~70 m
      do nº 1425 real). Um único segmento solto pode cair a centenas de
      metros; a rua inteira sem bairro pode cair em OUTRO bairro.
   3) TEXTO LIVRE COM BAIRRO — se o bbox do bairro falhar, a busca livre com
      o bairro como token ainda ancora o trecho aproximado.
   4) ESTRUTURADA SIMPLES → TEXTO LIVRE — fallbacks finais.

   NÃO usar como âncora: postalcode do Nominatim (CEPs de logradouro quase
   nunca existem no OSM — o parâmetro é ignorado silenciosamente) e
   coordenadas de CEP do BrasilAPI/open-cep (são geocodificação do NOME da
   rua, não centroide real do CEP — mesmo erro de trecho).

   Respeita o rate-limit do Nominatim (1 req/s) espaçando as chamadas.
   Retorna { lat, lon } ou null.
   ============================================================ */
const _nmBBoxCache = {};
let _nmUltimaReq = 0;
async function _nmBuscar(params) {
  // Espaçamento ≥1s entre chamadas (política de uso do Nominatim).
  const espera = _nmUltimaReq + 1000 - Date.now();
  if (espera > 0) await new Promise((r) => setTimeout(r, espera));
  _nmUltimaReq = Date.now();
  const q = new URLSearchParams({
    format: "json",
    addressdetails: "1",
    ...params,
  });
  const resp = await fetch(
    "https://nominatim.openstreetmap.org/search?" + q.toString(),
    { headers: { "Accept-Language": "pt-BR" } },
  );
  if (!resp.ok) return [];
  const data = await resp.json();
  return Array.isArray(data) ? data : [];
}
// bbox do bairro ({s,n,w,e}) via featureType=settlement (polígono do bairro,
// não um prédio homônimo). Cacheado por bairro|cidade|uf. null se não achar.
async function _nmBBoxBairro(bairro, cidade, uf) {
  const key = [bairro, cidade, uf].join("|").toLowerCase();
  if (key in _nmBBoxCache) return _nmBBoxCache[key];
  const data = await _nmBuscar({
    q: [bairro, cidade, uf, "Brasil"].filter(Boolean).join(", "),
    featureType: "settlement",
    limit: "1",
  });
  const bb = data[0] && data[0].boundingbox;
  const out =
    bb && bb.length === 4
      ? { s: +bb[0], n: +bb[1], w: +bb[2], e: +bb[3] }
      : null;
  _nmBBoxCache[key] = out;
  return out;
}
async function geocodificarEnderecoBR({
  logradouro,
  numero,
  bairro,
  cidade,
  uf,
  cep,
} = {}) {
  const limpo = (s) => String(s == null ? "" : s).trim();
  const numDig = limpo(numero).replace(/\D/g, "");
  const aPonto = (r) => {
    const lat = parseFloat(r && r.lat);
    const lon = parseFloat(r && r.lon);
    return isNaN(lat) || isNaN(lon) ? null : { lat, lon };
  };
  // Nº exato: prioriza a feição cujo house_number bate com o digitado;
  // aceita qualquer house_number como segunda opção (POI no endereço).
  const acharExato = (data) => {
    const comNum = data.filter(
      (r) => r.address && limpo(r.address.house_number),
    );
    const igual = comNum.find(
      (r) => r.address.house_number.replace(/\D/g, "") === numDig,
    );
    return aPonto(igual || comNum[0]);
  };
  // Ponto médio dos segmentos de rua retornados (class=highway).
  const mediaRuas = (data) => {
    const ruas = data.filter((r) => r.class === "highway").map(aPonto);
    const pts = ruas.filter(Boolean);
    if (!pts.length) return null;
    return {
      lat: pts.reduce((s, p) => s + p.lat, 0) / pts.length,
      lon: pts.reduce((s, p) => s + p.lon, 0) / pts.length,
    };
  };
  const street = [limpo(numero), limpo(logradouro)].filter(Boolean).join(" ");
  const base = { country: "Brasil", limit: "10" };
  if (street) base.street = street;
  if (limpo(cidade)) base.city = limpo(cidade);
  if (limpo(uf)) base.state = limpo(uf);
  const enderecoLivre = [
    [limpo(logradouro), limpo(numero)].filter(Boolean).join(", "),
    limpo(bairro),
    limpo(cidade),
    limpo(uf),
    limpo(cep),
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");
  try {
    if (street && limpo(cidade)) {
      // 1) limitada ao bairro: nº exato ou média dos segmentos no bairro.
      if (limpo(bairro)) {
        const bbox = await _nmBBoxBairro(bairro, cidade, uf);
        if (bbox) {
          const data = await _nmBuscar({
            ...base,
            viewbox: `${bbox.w},${bbox.s},${bbox.e},${bbox.n}`,
            bounded: "1",
          });
          const r = acharExato(data) || mediaRuas(data);
          if (r) return r;
        }
        // 2) bbox indisponível/rua fora do bbox: texto livre com o bairro
        //    como âncora do trecho.
        const dataLivre = await _nmBuscar({ q: enderecoLivre, limit: "1" });
        const rl = acharExato(dataLivre) || aPonto(dataLivre[0]);
        if (rl) return rl;
      }
      // 3) estruturada simples (sem bairro): nº exato ou 1º segmento.
      const data = await _nmBuscar(base);
      const r = acharExato(data) || aPonto(data[0]);
      if (r) return r;
    }
    // 4) texto livre — última tentativa.
    if (!enderecoLivre.replace(/Brasil|,/g, "").trim()) return null;
    const data = await _nmBuscar({ q: enderecoLivre, limit: "1" });
    return aPonto(data[0]);
  } catch (e) {
    return null;
  }
}
/* bbox ({s,n,w,e}) do município — zona rural (BT/MT): sem logradouro não
   há pino a propor, então o mapa só é levado até o município para o
   usuário marcar a propriedade. Estruturada (city/state) e, se nada vier,
   texto livre. Cacheado por cidade|uf. null se não achar. */
const _nmBBoxMunicipioCache = {};
async function bboxMunicipioBR(cidade, uf) {
  const c = String(cidade == null ? "" : cidade).trim();
  const u = String(uf == null ? "" : uf).trim();
  if (!c) return null;
  const key = [c, u].join("|").toLowerCase();
  if (key in _nmBBoxMunicipioCache) return _nmBBoxMunicipioCache[key];
  try {
    let data = await _nmBuscar({
      city: c,
      ...(u ? { state: u } : {}),
      country: "Brasil",
      limit: "1",
    });
    if (!data.length)
      data = await _nmBuscar({
        q: [c, u, "Brasil"].filter(Boolean).join(", "),
        limit: "1",
      });
    const bb = data[0] && data[0].boundingbox;
    const out =
      bb && bb.length === 4
        ? { s: +bb[0], n: +bb[1], w: +bb[2], e: +bb[3] }
        : null;
    _nmBBoxMunicipioCache[key] = out;
    return out;
  } catch (e) {
    return null; // falha de rede: não cacheia, permite nova tentativa
  }
}
// Monta a URL de GetFeature por bbox usando o endpoint/versão/ordem de BBOX
// DA CAMADA (cam.wfs/version/flipBBox), com fallback nos defaults do Sisema —
// assim camadas de outros GeoServers (SICAR) usam o MESMO fluxo de consulta.
function _urlWfs(cam, lat, lng) {
  const d = 8e-4;
  const flip = cam.flipBBox != null ? cam.flipBBox : SISEMA_FLIP_BBOX;
  const box = flip
    ? `${lat - d},${lng - d},${lat + d},${lng + d}`
    : `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const q = new URLSearchParams({
    service: "WFS",
    version: cam.version || SISEMA_VERSION,
    request: "GetFeature",
    typeName: cam.typeName,
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    maxFeatures: "50",
    bbox: `${box},EPSG:4326`,
  });
  return `${cam.wfs || SISEMA_WFS}?${q.toString()}`;
}
/* ============================================================
   Restrição ambiental (IDE-Sisema) — consulta COMPARTILHADA
   Fonte única de verdade usada de forma idêntica pelo BT
   (bt/js/map.js) e pelo MT (mt/js/app.js), garantindo o MESMO
   critério, as MESMAS camadas e a MESMA formatação de resultado
   nos dois fluxos (Regras 2 e 3). Alterar a lógica aqui reflete
   automaticamente em ambas as tensões.
   ============================================================ */
// Extrai um nome legível da feição (varre props por chaves de rótulo comuns).
function nomeFeicaoRestricao(props) {
  if (!props) return null;
  const k = Object.keys(props).find(
    (key) =>
      /nome|^nm_|name|denom|titulo|t_tulo|unidade|categoria/i.test(key) &&
      props[key] != null &&
      String(props[key]).trim() !== "",
  );
  return k ? String(props[k]).trim() : null;
}
// Busca a GEOMETRIA COMPLETA de uma feição pelo seu ID (WFS featureID).
// A consulta principal usa uma bbox minúscula (~80 m) só para o teste
// ponto-em-polígono, o que RECORTA polígonos grandes. Para desenhar o
// contorno inteiro da reserva no mapa, refazemos o GetFeature filtrando
// pelo id da feição (sem bbox). Retorna a Feature GeoJSON completa ou null.
async function geometriaCompletaFeicao(cam, featureId, cancelar) {
  if (!featureId) return null;
  try {
    const q = new URLSearchParams({
      service: "WFS",
      version: cam.version || SISEMA_VERSION,
      request: "GetFeature",
      typeName: cam.typeName,
      outputFormat: "application/json",
      srsName: "EPSG:4326",
      maxFeatures: "1",
      featureID: featureId,
    });
    const resp = await _fetchWfs(
      `${cam.wfs || SISEMA_WFS}?${q.toString()}`,
      cancelar,
    );
    if (!resp.ok) return null;
    const gj = await resp.json();
    const f = gj && gj.features && gj.features[0];
    return f && f.geometry ? f : null;
  } catch (e) {
    return null;
  }
}
// Consulta todas as camadas do Sisema e retorna, por camada,
// { ...cam, dentro:Boolean, nomes:[...], geometrias:[Feature,...] } ou
// { ...cam, erro:"..." }. `geometrias` traz o contorno COMPLETO de cada
// reserva intersectada (busca ampla por id, com fallback p/ a recortada).
//
// Só a consulta MAIS RECENTE vale: uma nova cancela a anterior (pedidos em
// voo e na fila), e a substituída devolve `null` — o chamador ignora. Sem
// isso, a resposta de um ponto antigo (digitação, cliques seguidos) podia
// chegar depois e gravar por cima a restrição do ponto atual.
let _consultaRestricoes = null;
async function consultarRestricoesObra(lat, lng) {
  if (_consultaRestricoes) _consultaRestricoes.abort();
  const ctrl = (_consultaRestricoes = new AbortController());
  const cancelar = ctrl.signal;
  await window.CemigLibs.turf(); // idem consultarImovelCAR: carga sob demanda
  if (cancelar.aborted) return null;
  if (typeof SISEMA_CAMADAS === "undefined")
    throw new Error("Configuração do Sisema (geo.js) não carregada.");
  const ponto = window.turf.point([lng, lat]);
  // Uma camada por vez levava a consulta a minutos quando o Sisema
  // pendurava (ver _fetchWfs); em paralelo limitado o pior caso volta a
  // ser a camada mais lenta, não a soma das 64. A ordem é preservada.
  const res = await _emParalelo(SISEMA_CAMADAS, WFS_PARALELO, async (cam) => {
    if (cancelar.aborted) return null;
    try {
      // URL única de GetFeature (fonte: _urlWfs) — respeita endpoint/versão/
      // flip de BBOX POR CAMADA (Sisema ou SICAR).
      const resp = await _fetchWfs(_urlWfs(cam, lat, lng), cancelar);
      if (!resp.ok) return { ...cam, erro: `HTTP ${resp.status}` };
      const gj = await resp.json();
      const feats = (gj && gj.features) || [];
      const dentro = feats.filter(
        (f) =>
          f.geometry &&
          (f.geometry.type === "Polygon" ||
            f.geometry.type === "MultiPolygon") &&
          window.turf.booleanPointInPolygon(ponto, f),
      );
      // Para cada reserva intersectada, tenta o contorno COMPLETO (por id);
      // se a busca ampla falhar, usa a própria feição (recortada pela bbox).
      const geometrias = [];
      for (const f of dentro) {
        const completa = await geometriaCompletaFeicao(cam, f.id, cancelar);
        geometrias.push(completa || f);
      }
      // Uma entrada por FEIÇÃO intersectada, preservando o alinhamento entre
      // nome/props/geometria (o extrator de nome pode retornar null sem
      // desalinhar as demais). Extrator específico da camada (cam.nomeFeicao)
      // tem prioridade — ex.: RL/SICAR exibe nº do CAR + situação.
      const feicoes = dentro.map((f, i) => ({
        nome:
          (cam.nomeFeicao && cam.nomeFeicao(f.properties)) ||
          nomeFeicaoRestricao(f.properties),
        props: f.properties || {},
        geometria: geometrias[i],
      }));
      return {
        ...cam,
        dentro: dentro.length > 0,
        // Ponto consultado: alimenta o {coord} do texto da APP.
        lat,
        lng,
        feicoes,
        // Compat: listas paralelas mantidas p/ consumidores que ainda as usam
        // (resumirRestricoes). `nomes` é filtrado; `geometrias` completo.
        nomes: feicoes.map((x) => x.nome).filter(Boolean),
        geometrias,
      };
    } catch (e) {
      if (cancelar.aborted) return null;
      return { ...cam, erro: _erroWfs(e) };
    }
  });
  if (_consultaRestricoes === ctrl) _consultaRestricoes = null;
  return cancelar.aborted ? null : res;
}
// Desenha, num mapa Leaflet, o contorno das reservas intersectadas e devolve
// a camada criada (L.geoJSON) — ou null se não houver geometria. Uso idêntico
// em BT (bt/js/map.js) e MT (mt/js/app.js) p/ manter o mesmo estilo/UX. O
// chamador é responsável por remover a camada anterior antes de chamar.
// `res` é o retorno de consultarRestricoesObra; `L` é window.L.
// Paleta para diferenciar VÁRIAS restrições no mapa (contorno + legenda).
// Ordem definida pelo design: erro/600, amarelo aviso, neutra/300,
// neutra/600 e verde on. Cicla se houver mais áreas que cores.
const CORES_RESTRICAO = [
  "#C8303F", // erro/600 (vermelho)
  "#FFC107", // amarelo (warning/500)
  "#B1B9B7", // neutra/300
  "#364B46", // neutra/600
  "#C4FF3F", // verde on
];
// Achata `res` numa lista PLANA de ÁREAS (uma por FEIÇÃO intersectada, não por
// camada), com a cor definida pelo ÍNDICE GLOBAL da área. Fonte única de cor/
// ordem p/ legenda, desenho no mapa e detalhesRestricoes — assim duas feições
// da MESMA camada (ex.: 2 UCs Estaduais) viram DUAS áreas, com cores e itens de
// legenda distintos. Cada área: { camada, id, rotulo, tipoNome, nome, props,
// documentos, geometria, cor }. `documentos` de camada pode ser função dos
// props da feição (ex.: RL varia por status) — resolvido aqui.
function _areasRestricao(res) {
  const dentros = (res || []).filter((r) => r && r.dentro);
  const out = [];
  for (const r of dentros) {
    // Compat: se a camada não trouxer `feicoes` (formato novo), reconstrói a
    // partir de nomes/geometrias paralelos.
    const feicoes =
      r.feicoes ||
      (r.geometrias || []).map((g, i) => ({
        nome: (r.nomes && r.nomes[i]) || null,
        props: {},
        geometria: g,
      }));
    for (const f of feicoes) {
      const doc =
        typeof r.documentos === "function"
          ? r.documentos(f.props)
          : r.documentos || null;
      out.push({
        camada: r.id,
        id: r.id,
        rotulo: r.rotulo,
        tipoNome: r.tipoNome || r.rotulo,
        nome: f.nome || null,
        props: f.props || {},
        documentos: doc,
        geometria: f.geometria || null,
        cor: CORES_RESTRICAO[out.length % CORES_RESTRICAO.length],
        lat: r.lat != null ? r.lat : null,
        lng: r.lng != null ? r.lng : null,
      });
    }
  }
  return out;
}
// Camadas base de TODOS os mapas dos formulários: Ruas (OSM) abre por padrão
// e Satélite (Esri World Imagery, mesma fonte usada pelo Sisema) fica no
// seletor. A Esri não usa subdomínio {s} e a ordem dos eixos é {z}/{y}/{x}.
function camadasBaseMapa(map) {
  const L = window.L;
  const ruas = L.tileLayer(
    "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    },
  );
  const satelite = L.tileLayer(
    "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    { maxZoom: 19, attribution: "" },
  );
  ruas.addTo(map);
  L.control.layers({ Ruas: ruas, Satélite: satelite }).addTo(map);
  return { ruas, satelite };
}
// Legenda ABAIXO do mapa: um item por ÁREA intersectada, na MESMA cor do
// contorno desenhado (cor por índice global de área, via _areasRestricao, como
// desenharRestricoesNoMapa e detalhesRestricoes). O elemento .mapa-legenda
// (shared.css) é inserido logo após o container do mapa e SÓ existe quando o
// ponto cai em restrição — atualizar com `res` vazio/null remove a legenda
// (usado também ao limpar a camada nos fluxos de erro do BT/MT).
function atualizarLegendaRestricoes(map, res) {
  if (!map || typeof map.getContainer !== "function") return;
  const cont = map.getContainer();
  const pai = cont.parentNode;
  if (!pai) return;
  const antiga = pai.querySelector(".mapa-legenda");
  if (antiga) antiga.remove();
  const areas = _areasRestricao(res);
  if (!areas.length) return;
  const div = document.createElement("div");
  div.className = "mapa-legenda";
  div.innerHTML = areas
    .map((a) => {
      // Nome da área quando houver; senão, cai no rótulo da camada.
      const texto = a.nome || a.rotulo;
      return (
        `<span class="mapa-legenda-item">` +
        `<span class="mapa-legenda-cor" style="background:${a.cor}"></span>` +
        `<span class="mapa-legenda-rotulo">${_escHtml(texto)}</span>` +
        `</span>`
      );
    })
    .join("");
  cont.insertAdjacentElement("afterend", div);
}
function desenharRestricoesNoMapa(L, map, res) {
  if (!L || !map || !res) return null;
  // Cor por ÁREA intersectada (índice global em _areasRestricao) — mesma ordem/
  // critério da legenda e de detalhesRestricoes, p/ mapa e dropdowns baterem.
  const areas = _areasRestricao(res);
  // Legenda abaixo do mapa acompanha o desenho: aparece com as áreas
  // intersectadas e some quando o ponto sai de todas as restrições.
  atualizarLegendaRestricoes(map, res);
  const feicoes = [];
  for (const a of areas) {
    const f = a.geometria;
    if (f && f.geometry) {
      feicoes.push({
        ...f,
        properties: {
          ...(f.properties || {}),
          _rotulo: a.rotulo,
          _nome: a.nome || a.rotulo,
          _cor: a.cor,
        },
      });
    }
  }
  if (!feicoes.length) return null;
  const layer = L.geoJSON(
    { type: "FeatureCollection", features: feicoes },
    {
      // Cor por feição (alterna quando há mais de uma restrição).
      style: (feat) => {
        const cor =
          (feat && feat.properties && feat.properties._cor) || "#C8303F";
        return {
          color: cor,
          weight: 2,
          opacity: 0.9,
          fillColor: cor,
          fillOpacity: 0.12,
        };
      },
      onEachFeature: (feat, lyr) => {
        const p = (feat && feat.properties) || {};
        const txt = p._nome || p._rotulo;
        if (txt) lyr.bindPopup(String(txt));
      },
    },
  ).addTo(map);
  // NÃO reenquadrar o mapa: o contorno da reserva é desenhado mantendo o zoom
  // e o centro atuais (o pino da UC continua visível no mesmo enquadramento).
  // Antes havia um map.fitBounds(...) aqui, que dava zoom out para caber a área
  // inteira da restrição (reservas são enormes) — comportamento indesejado.
  return layer;
}
// Resume a lista de camadas no formato consumido pela UI (idêntico ao BT):
// restricaoAmbiental "Sim"/"Não" (ou "" se todas as camadas falharam) e
// restricoesTexto "Rótulo (nome1, nome2); Rótulo2 …".
function resumirRestricoes(res) {
  const lista = res || [];
  const dentros = lista.filter((r) => r.dentro);
  const errosTodos = lista.length > 0 && lista.every((r) => r.erro);
  // Uma reserva/camada por linha ("\n") para leitura mais clara. Os displays
  // (BT/MT) usam white-space: pre-line e o PDF respeita "\n" via splitTextToSize.
  const restricoesTexto = dentros
    .map(
      (r) =>
        r.rotulo +
        (r.nomes && r.nomes.length ? " (" + r.nomes.join(", ") + ")" : ""),
    )
    .join("\n");
  return {
    errosTodos,
    algumaDentro: dentros.length > 0,
    restricaoAmbiental: errosTodos ? "" : dentros.length ? "Sim" : "Não",
    restricoesTexto,
  };
}
// Detalha as áreas intersectadas para a UI (BT e MT). Uma entrada por ÁREA:
//   { id, rotulo, tipoNome, nome, cor, documentos }
//   tipoNome  — como o TIPO aparece na frase ("Unidade de Conservação").
//   nome      — nome legível da feição, ou null quando a camada não o traz.
//   documentos— objeto { bullets, notas } do tipo (ou null).
// A frase de localização e o bloco de documentos são montados a partir desta
// lista por restricaoSentencaSegmentos() e restricaoDocsMesclado().
function detalhesRestricoes(res) {
  // Cor por ÁREA (índice global em _areasRestricao) — mesma da legenda e do
  // contorno no mapa. Duas feições da mesma camada viram duas entradas com
  // cores distintas; `documentos` já resolvido por feição (RL varia por status).
  return _areasRestricao(res).map((a) => ({
    id: a.id,
    rotulo: a.rotulo,
    tipoNome: a.tipoNome,
    nome: a.nome || null,
    cor: a.cor,
    // A UC fica como marcador ({ unidadeConservacao }) e só é resolvida no
    // render, conforme a zona do formulário (restricaoDocsBlocos).
    documentos: a.documentos || null,
    lat: a.lat,
    lng: a.lng,
  }));
}
// Escapa texto p/ inserção segura em HTML (usado no builder do MT/innerHTML).
function _escHtml(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
// Título fixo do banner e rótulo do aceite — fonte única p/ BT e MT.
const RESTRICAO_AVISO_TITULO = "Unidade em área de restrição ambiental";
const RESTRICAO_ACEITE_LABEL =
  "Declaro que li e estou de acordo com as informações acima.";
// Segmentos da frase de localização (após o título). Cada segmento é
// { t:texto, b:true? } p/ o consumidor destacar em negrito. Cada área vira
// "Tipo (Nome)", com o nome em negrito; sem nome, só o tipo em negrito.
// `cenario` ({ zona, rede }) é opcional: com rede "extensao" e alguma UC entre
// as áreas, entra o complemento da autorização do órgão gestor (só o
// atendente usa; nos formulários a rede é sempre "porta").
function restricaoSentencaSegmentos(detalhe, cenario) {
  const areas = detalhe || [];
  if (!areas.length) return [];
  const segs = [
    {
      t:
        "O ponto de ligação solicitado está localizado em área sujeita a " +
        "restrições ambientais, abrangida por ",
    },
  ];
  areas.forEach((a, i) => {
    if (i > 0) segs.push({ t: i === areas.length - 1 ? " e " : ", " });
    if (a.nome) {
      segs.push({ t: a.tipoNome + " (" });
      segs.push({ t: a.nome, b: true });
      segs.push({ t: ")" });
    } else {
      segs.push({ t: a.tipoNome, b: true });
    }
  });
  segs.push({ t: "." });
  const temUC = areas.some(
    (a) => a.documentos && a.documentos.unidadeConservacao,
  );
  if (temUC && normalizarCenario(cenario).rede === "extensao")
    segs.push({ t: " " + UC_COMPLEMENTO_EXTENSAO });
  return segs;
}
// Versão em HTML da frase (título em negrito + segmentos).
function restricaoSentencaHTML(detalhe, cenario) {
  const corpo = restricaoSentencaSegmentos(detalhe, cenario)
    .map((s) => (s.b ? `<strong>${_escHtml(s.t)}</strong>` : _escHtml(s.t)))
    .join("");
  return `<strong>${_escHtml(RESTRICAO_AVISO_TITULO)}</strong>. ${corpo}`;
}
// Placeholders dinâmicos do texto — hoje só {coord} (texto da APP). Sem
// coordenada, "nas coordenadas {coord}" vira "no ponto informado".
function _interpTexto(txt, ctx) {
  if (txt == null) return txt;
  const s = String(txt);
  if (ctx && ctx.lat != null && ctx.lng != null) {
    const coord = `(${(+ctx.lat).toFixed(6)}, ${(+ctx.lng).toFixed(6)})`;
    return s.replace(/\{coord\}/g, coord);
  }
  return s
    .replace(/nas coordenadas \{coord\}/g, "no ponto informado")
    .replace(/\{coord\}/g, "");
}
// Mescla os documentos das áreas em BLOCOS. Os tipos sem introdução própria
// compartilham DOC_INTRO num bloco único (bullets/notas unidos); os com
// `introPropria` (UC, APP) viram um bloco cada, para a redação e a lista
// ficarem coerentes — a lista da UC é obrigatória e a da APP é alternativa
// ("pelo menos uma"), então não podem se misturar. Dedup por `chave` do tipo
// (ou pelo próprio texto) e por texto idêntico — por chave, e não por
// referência, porque o detalhe pode voltar do JSON do state.
// ctx = { zona, rede, lat?, lng? }; sem lat/lng, usa o ponto consultado.
// Retorna [ { intro, bullets:[...], notas:[...] }, … ].
function restricaoDocsBlocos(detalhe, ctx) {
  const areas = detalhe || [];
  const comCoord = areas.find((a) => a && a.lat != null && a.lng != null);
  const c = Object.assign(
    {},
    comCoord ? { lat: comCoord.lat, lng: comCoord.lng } : {},
    ctx || {},
  );
  const compart = { intro: "", bullets: [], notas: [] };
  const proprios = [];
  const vistos = new Set();
  for (const a of areas) {
    let doc = a.documentos;
    if (!doc) continue;
    const chave =
      doc.chave ||
      JSON.stringify([doc.introPropria, doc.bullets, doc.notas]);
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    // A UC não tem texto fixo: resolve agora pela zona/rede do cenário.
    if (doc.unidadeConservacao) doc = docsUnidadeConservacao(c);
    const bullets = (doc.bullets || []).map((b) => _interpTexto(b, c));
    const notas = (doc.notas || []).map((n) => _interpTexto(n, c));
    if (doc.introPropria) {
      proprios.push({ intro: _interpTexto(doc.introPropria, c), bullets, notas });
    } else {
      bullets.forEach((b) => {
        if (!compart.bullets.includes(b)) compart.bullets.push(b);
      });
      notas.forEach((n) => {
        if (!compart.notas.includes(n)) compart.notas.push(n);
      });
    }
  }
  const blocos = [];
  if (compart.bullets.length || compart.notas.length) {
    compart.intro = compart.bullets.length ? DOC_INTRO : "";
    blocos.push(compart);
  }
  return blocos.concat(proprios);
}
// Retrocompat.: primeiro bloco no formato antigo { intro, bullets, notas }.
function restricaoDocsMesclado(detalhe, ctx) {
  const b = restricaoDocsBlocos(detalhe, ctx);
  return b[0] || { intro: "", bullets: [], notas: [] };
}
// Versão em HTML dos documentos: um .restricao-docs com uma
// .restricao-docs-secao por bloco (intro + <ul> + notas). A frase de
// localização NÃO entra aqui — nos formulários ela fica no banner de aviso.
function restricaoDocsHTML(detalhe, ctx) {
  const secoes = restricaoDocsBlocos(detalhe, ctx)
    .map((d) => {
      if (!d.bullets.length && !d.notas.length) return "";
      let html = '<div class="restricao-docs-secao">';
      if (d.intro)
        html += `<p class="restricao-docs-intro">${_escHtml(d.intro)}</p>`;
      if (d.bullets.length)
        html +=
          '<ul class="restricao-docs-lista">' +
          d.bullets.map((b) => `<li>${_escHtml(b)}</li>`).join("") +
          "</ul>";
      html += d.notas
        .map((n) => `<p class="restricao-docs-nota">${_escHtml(n)}</p>`)
        .join("");
      return html + "</div>";
    })
    .filter(Boolean);
  if (!secoes.length) return "";
  return `<div class="restricao-docs">${secoes.join("")}</div>`;
}
