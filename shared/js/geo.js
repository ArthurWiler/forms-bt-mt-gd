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
const DOC_UNIDADE_CONSERVACAO = {
  bullets: [
    "Comprovação da posse e regularidade do imóvel simultaneamente (IPTU, Registro do Imóvel, Escritura Pública, etc.); ou",
    "Comprovação de posse (Contrato de Compra e Venda, Contrato de Locação, Termo de Doação, Termo de Permissão de Uso, etc.) e regularidade (Certidão de número/Habite-se/Declaração da Prefeitura, Planta de Arquitetura Aprovada) separadamente.",
  ],
  notas: [
    "Outros documentos e informações complementares poderão ser solicitadas posteriormente a critério do órgão ambiental responsável pela administração da Unidade de Conservação.",
  ],
};
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
// (campo nom_tema da camada bases:mg_reserva_legal). Três status possíveis,
// cada um com seu bloco de documentos. PLACEHOLDERS — preencher bullets/notas.
const DOC_RL_APROVADA_NAO_AVERBADA = {
  bullets: [
    // TODO(textos): documentos p/ "Reserva Legal Aprovada e não Averbada".
  ],
  notas: [],
};
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
  if (/aprovada\s+e\s+n[ãa]o\s+averbada/i.test(t))
    return DOC_RL_APROVADA_NAO_AVERBADA;
  if (/proposta/i.test(t)) return DOC_RL_PROPOSTA;
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
    documentos: DOC_UNIDADE_CONSERVACAO,
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
    documentos: DOC_UNIDADE_CONSERVACAO,
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

const SICAR_CAM_IMOVEL = {
  typeName: "sicar:sicar_imoveis_mg",
  wfs: SICAR_WFS_IMOVEIS,
  version: SICAR_VERSION,
  flipBBox: SICAR_FLIP_BBOX,
};
async function consultarImovelCAR(lat, lng) {
  if (!window.turf) throw new Error("Turf.js não carregado.");
  const ponto = window.turf.point([lng, lat]);
  try {
    const resp = await fetch(_urlWfs(SICAR_CAM_IMOVEL, lat, lng));
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
    return { erro: "Falha de rede/CORS" };
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
async function geometriaCompletaFeicao(cam, featureId) {
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
    const resp = await fetch(`${cam.wfs || SISEMA_WFS}?${q.toString()}`);
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
async function consultarRestricoesObra(lat, lng) {
  if (!window.turf) throw new Error("Turf.js não carregado.");
  if (typeof SISEMA_CAMADAS === "undefined")
    throw new Error("Configuração do Sisema (geo.js) não carregada.");
  const ponto = window.turf.point([lng, lat]);
  const out = [];
  for (const cam of SISEMA_CAMADAS) {
    try {
      // URL única de GetFeature (fonte: _urlWfs) — respeita endpoint/versão/
      // flip de BBOX POR CAMADA (Sisema ou SICAR).
      const resp = await fetch(_urlWfs(cam, lat, lng));
      if (!resp.ok) {
        out.push({ ...cam, erro: `HTTP ${resp.status}` });
        continue;
      }
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
        const completa = await geometriaCompletaFeicao(cam, f.id);
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
      out.push({
        ...cam,
        dentro: dentro.length > 0,
        feicoes,
        // Compat: listas paralelas mantidas p/ consumidores que ainda as usam
        // (resumirRestricoes). `nomes` é filtrado; `geometrias` completo.
        nomes: feicoes.map((x) => x.nome).filter(Boolean),
        geometrias,
      });
    } catch (e) {
      out.push({ ...cam, erro: "Falha de rede/CORS" });
    }
  }
  return out;
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
      });
    }
  }
  return out;
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
    documentos: a.documentos || null,
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
// { t:texto, b:true? } p/ o consumidor destacar em negrito. Trata singular/
// plural (1 vs N áreas) e destaca o NOME de cada área (ou o tipo, quando a
// camada não traz nome). Consumido em React (BT) e em HTML (MT).
function restricaoSentencaSegmentos(detalhe) {
  const areas = detalhe || [];
  if (!areas.length) return [];
  const plural = areas.length > 1;
  const segs = [
    {
      t:
        "O ponto de ligação está localizado " +
        (plural ? "nas áreas" : "na área") +
        " de abrangência de ",
    },
  ];
  areas.forEach((a, i) => {
    if (i > 0) segs.push({ t: i === areas.length - 1 ? " e " : ", " });
    if (a.nome) {
      segs.push({ t: a.tipoNome + ": " });
      segs.push({ t: a.nome, b: true });
    } else {
      segs.push({ t: a.tipoNome, b: true });
    }
  });
  segs.push({ t: "." });
  return segs;
}
// Versão em HTML da frase (título em negrito + segmentos) — usada pelo MT.
function restricaoSentencaHTML(detalhe) {
  const corpo = restricaoSentencaSegmentos(detalhe)
    .map((s) => (s.b ? `<strong>${_escHtml(s.t)}</strong>` : _escHtml(s.t)))
    .join("");
  return `<strong>${_escHtml(RESTRICAO_AVISO_TITULO)}</strong>. ${corpo}`;
}
// Mescla os documentos de todas as áreas: introdução ÚNICA + bullets unidos +
// notas ao final, deduplicando por tipo (mesmo objeto `documentos`) e por texto
// idêntico. Retorna { intro, bullets:[...], notas:[...] }.
function restricaoDocsMesclado(detalhe) {
  const areas = detalhe || [];
  const bullets = [];
  const notas = [];
  const vistos = new Set();
  for (const a of areas) {
    const doc = a.documentos;
    if (!doc || vistos.has(doc)) continue; // dedup por tipo (referência do objeto)
    vistos.add(doc);
    (doc.bullets || []).forEach((b) => {
      if (!bullets.includes(b)) bullets.push(b);
    });
    (doc.notas || []).forEach((n) => {
      if (!notas.includes(n)) notas.push(n);
    });
  }
  return { intro: bullets.length ? DOC_INTRO : "", bullets, notas };
}
// Versão em HTML do bloco de documentos (intro + <ul> + notas) — usada pelo MT.
function restricaoDocsHTML(detalhe) {
  const d = restricaoDocsMesclado(detalhe);
  if (!d.bullets.length && !d.notas.length) return "";
  let html = '<div class="restricao-docs">';
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
  html += "</div>";
  return html;
}
