const SISEMA_WFS = "https://geoserver.meioambiente.mg.gov.br/ows";
const SISEMA_VERSION = "1.1.0";
const SISEMA_FLIP_BBOX = false;
// Texto de documentos/exigências exibido em cada área. VARIA POR TIPO.
// Cada tipo expõe { bullets:[...], notas:[...] }; a introdução (DOC_INTRO) é
// ÚNICA e compartilhada. Quando o ponto intersecta várias áreas, os textos são
// MESCLADOS (intro 1×, bullets unidos e deduplicados, notas ao final) por
// restricaoDocsMesclado(). Áreas do mesmo tipo (ex.: UC Estadual + Federal)
// compartilham o mesmo objeto e, portanto, não duplicam.
// TODO(textos): APE ainda sem texto oficial — `null` mostra só a frase de
// localização. Os demais vieram da referência do cliente.
const DOC_INTRO =
  "Para que o cliente obtenha ligação de energia elétrica, é necessário anexar os seguintes documentos no Cemig Atende:";
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

const SISEMA_CAMADAS = [
  // { id, rotulo, typeName, tipoNome, documentos }
  //   rotulo    — título do dropdown (categoria da camada)
  //   tipoNome  — como o TIPO aparece na frase de localização
  //   documentos— texto de exigências (varia por tipo; null = só a frase)
  //   typeName DEVE ser confirmado no GetCapabilities
  {
    id: "ape",
    rotulo: "Área de Proteção Especial",
    typeName: "IDE:ide_2010_mg_areas_protecao_especial_pol",
    tipoNome: "Área de Proteção Especial",
    documentos: null, // TODO(textos): texto oficial de APE
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
];
async function geocodObra(obra) {
  if (obra.localizacao === "Rural") {
    const m = String(obra.coordenada || "")
      .trim()
      .match(/(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)/);
    if (!m) return null;
    const lat = parseFloat(m[1].replace(",", "."));
    const lng = parseFloat(m[2].replace(",", "."));
    if (isNaN(lat) || isNaN(lng)) return null;
    return { lat, lng, label: "Coordenada informada" };
  }
  const endereco = [
    [obra.endereco, obra.num].filter(Boolean).join(", "),
    obra.bairro,
    obra.cidade,
    obra.estado,
    obra.cep,
    "Brasil",
  ]
    .filter(Boolean)
    .join(", ");
  if (!endereco.replace(/Brasil|,/g, "").trim()) return null;
  const resp = await fetch(
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
      encodeURIComponent(endereco),
    { headers: { "Accept-Language": "pt-BR" } },
  );
  const data = await resp.json();
  if (!data || !data.length) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    label: data[0].display_name,
  };
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
function _urlWfs(typeName, lat, lng) {
  const d = 8e-4;
  const box = SISEMA_FLIP_BBOX
    ? `${lat - d},${lng - d},${lat + d},${lng + d}`
    : `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const q = new URLSearchParams({
    service: "WFS",
    version: SISEMA_VERSION,
    request: "GetFeature",
    typeName,
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    maxFeatures: "50",
    bbox: `${box},EPSG:4326`,
  });
  return `${SISEMA_WFS}?${q.toString()}`;
}
async function consultarRestricoes(lat, lng) {
  if (!window.turf) throw new Error("Turf.js não carregado.");
  const ponto = window.turf.point([lng, lat]);
  const out = [];
  for (const cam of SISEMA_CAMADAS) {
    try {
      const resp = await fetch(_urlWfs(cam.typeName, lat, lng));
      if (!resp.ok) {
        out.push({ ...cam, erro: `HTTP ${resp.status}` });
        continue;
      }
      const gj = await resp.json();
      const feats = (gj && gj.features) || [];
      let dentro = false;
      let propsDentro = null;
      for (const f of feats) {
        const g = f.geometry;
        if (!g) continue;
        if (
          (g.type === "Polygon" || g.type === "MultiPolygon") &&
          window.turf.booleanPointInPolygon(ponto, f)
        ) {
          dentro = true;
          propsDentro = f.properties || {};
          break;
        }
      }
      out.push({ ...cam, dentro, feicoes: feats.length, props: propsDentro });
    } catch (e) {
      out.push({ ...cam, erro: "Falha de rede/CORS" });
    }
  }
  return out;
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
async function geometriaCompletaFeicao(typeName, featureId) {
  if (!featureId) return null;
  try {
    const q = new URLSearchParams({
      service: "WFS",
      version: SISEMA_VERSION,
      request: "GetFeature",
      typeName,
      outputFormat: "application/json",
      srsName: "EPSG:4326",
      maxFeatures: "1",
      featureID: featureId,
    });
    const resp = await fetch(`${SISEMA_WFS}?${q.toString()}`);
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
  const d = 8e-4;
  const out = [];
  for (const cam of SISEMA_CAMADAS) {
    try {
      const box =
        typeof SISEMA_FLIP_BBOX !== "undefined" && SISEMA_FLIP_BBOX
          ? `${lat - d},${lng - d},${lat + d},${lng + d}`
          : `${lng - d},${lat - d},${lng + d},${lat + d}`;
      const q = new URLSearchParams({
        service: "WFS",
        version: SISEMA_VERSION,
        request: "GetFeature",
        typeName: cam.typeName,
        outputFormat: "application/json",
        srsName: "EPSG:4326",
        maxFeatures: "50",
        bbox: `${box},EPSG:4326`,
      });
      const resp = await fetch(`${SISEMA_WFS}?${q.toString()}`);
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
        const completa = await geometriaCompletaFeicao(cam.typeName, f.id);
        geometrias.push(completa || f);
      }
      out.push({
        ...cam,
        dentro: dentro.length > 0,
        nomes: dentro
          .map((f) => nomeFeicaoRestricao(f.properties))
          .filter(Boolean),
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
// Legenda ABAIXO do mapa: um item por CAMADA intersectada, na MESMA cor do
// contorno desenhado (CORES_RESTRICAO por índice, como desenharRestricoesNoMapa
// e detalhesRestricoes). O elemento .mapa-legenda (shared.css) é inserido logo
// após o container do mapa e SÓ existe quando o ponto cai em restrição —
// atualizar com `res` vazio/null remove a legenda (usado também ao limpar a
// camada nos fluxos de erro do BT/MT).
function atualizarLegendaRestricoes(map, res) {
  if (!map || typeof map.getContainer !== "function") return;
  const cont = map.getContainer();
  const pai = cont.parentNode;
  if (!pai) return;
  const antiga = pai.querySelector(".mapa-legenda");
  if (antiga) antiga.remove();
  const dentros = (res || []).filter((r) => r && r.dentro);
  if (!dentros.length) return;
  const div = document.createElement("div");
  div.className = "mapa-legenda";
  div.innerHTML = dentros
    .map((r, li) => {
      const cor = CORES_RESTRICAO[li % CORES_RESTRICAO.length];
      return (
        `<span class="mapa-legenda-item">` +
        `<span class="mapa-legenda-cor" style="background:${cor}"></span>` +
        `<span class="mapa-legenda-rotulo">${_escHtml(r.rotulo)}</span>` +
        `</span>`
      );
    })
    .join("");
  cont.insertAdjacentElement("afterend", div);
}
function desenharRestricoesNoMapa(L, map, res) {
  if (!L || !map || !res) return null;
  // Cor por CAMADA intersectada (índice em `dentros`) — mesma ordem/critério
  // de detalhesRestricoes, para o mapa e os dropdowns baterem de cor.
  const dentros = (res || []).filter((r) => r && r.dentro);
  // Legenda abaixo do mapa acompanha o desenho: aparece com as camadas
  // intersectadas e some quando o ponto sai de todas as restrições.
  atualizarLegendaRestricoes(map, res);
  const feicoes = [];
  dentros.forEach((r, li) => {
    if (!Array.isArray(r.geometrias)) return;
    const cor = CORES_RESTRICAO[li % CORES_RESTRICAO.length];
    for (const f of r.geometrias) {
      if (f && f.geometry) {
        const nome = (r.nomes && r.nomes[0]) || r.rotulo;
        feicoes.push({
          ...f,
          properties: {
            ...(f.properties || {}),
            _rotulo: r.rotulo,
            _nome: nome,
            _cor: cor,
          },
        });
      }
    }
  });
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
  const dentros = (res || []).filter((r) => r.dentro);
  const out = [];
  dentros.forEach((r, li) => {
    const tipoNome = r.tipoNome || r.rotulo;
    // Cor por CAMADA (mesma da desenharRestricoesNoMapa) — todas as áreas de
    // uma mesma camada compartilham a cor do seu contorno no mapa.
    const cor = CORES_RESTRICAO[li % CORES_RESTRICAO.length];
    const nomes = r.nomes && r.nomes.length ? r.nomes : [null];
    for (const nome of nomes) {
      out.push({
        id: r.id,
        rotulo: r.rotulo,
        tipoNome,
        nome: nome || null,
        cor,
        documentos: r.documentos || null,
      });
    }
  });
  return out;
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
function RestricaoAmbiental({ obra }) {
  const [status, setStatus] = useState("");
  const [coords, setCoords] = useState(null);
  const [resultados, setResultados] = useState(null);
  const consultar = async () => {
    setStatus("loading");
    setResultados(null);
    try {
      const c = await geocodObra(obra);
      if (!c) {
        setStatus(
          "Não foi possível obter as coordenadas (preencha o endereço ou a coordenada).",
        );
        return;
      }
      setCoords(c);
      const res = await consultarRestricoes(c.lat, c.lng);
      setResultados(res);
      setStatus("");
    } catch (e) {
      setStatus(e && e.message ? e.message : "Falha na consulta.");
    }
  };
  const algumaErro = resultados && resultados.some((r) => r.erro);
  const algumaDentro = resultados && resultados.some((r) => r.dentro);
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: "restricao-amb" },
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "mapa-actions" },
      /* @__PURE__ */ React.createElement(
        Btn,
        { variant: "ghost", onClick: consultar },
        "🌿 Consultar restrição ambiental (IDE-Sisema)",
      ),
      status === "loading" &&
        /* @__PURE__ */ React.createElement(
          "span",
          { className: "field-hint" },
          "Consultando camadas…",
        ),
      status &&
        status !== "loading" &&
        /* @__PURE__ */ React.createElement(
          "span",
          { className: "field-hint", style: { color: "var(--vermelho)" } },
          status,
        ),
    ),
    resultados &&
      /* @__PURE__ */ React.createElement(
        "div",
        { className: "restricao-result" },
        coords &&
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "field-hint", style: { marginBottom: 8 } },
            "Ponto consultado: ",
            coords.lat.toFixed(6),
            ", ",
            coords.lng.toFixed(6),
          ),
        /* @__PURE__ */ React.createElement(
          "div",
          {
            className: "alert " + (algumaDentro ? "alert-warn" : "alert-ok"),
            style: { marginBottom: 10 },
          },
          algumaDentro
            ? "⚠ O ponto intersecta ao menos uma restrição ambiental. Verifique as camadas abaixo."
            : "Nenhuma restrição ambiental encontrada nas camadas consultadas para o ponto.",
        ),
        /* @__PURE__ */ React.createElement(
          "div",
          { className: "restricao-chips" },
          resultados.map((r) =>
            /* @__PURE__ */ React.createElement(
              "span",
              {
                key: r.id,
                className:
                  "chip " +
                  (r.erro ? "chip-err" : r.dentro ? "chip-on" : "chip-off"),
                title: r.typeName,
              },
              r.rotulo,
              ": ",
              r.erro ? r.erro : r.dentro ? "DENTRO" : "fora",
            ),
          ),
        ),
        algumaErro &&
          /* @__PURE__ */ React.createElement(
            "div",
            { className: "field-hint", style: { marginTop: 8 } },
            "Erro no servidor, tente novamente mais tarde.",
          ),
      ),
  );
}
