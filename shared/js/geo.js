const SISEMA_WFS = "https://geoserver.meioambiente.mg.gov.br/ows";
const SISEMA_VERSION = "1.1.0";
const SISEMA_FLIP_BBOX = false;
// Texto de documentos/exigências exibido em cada área. VARIA POR TIPO.
// TODO(textos): substituir os placeholders (APE, Quilombola, Indígena) pelos
// textos oficiais quando fornecidos — o de Unidade de Conservação veio da
// referência do cliente. `null` faz a UI mostrar só a frase de localização.
const DOC_UNIDADE_CONSERVACAO =
  "Para que o cliente obtenha a ligação de energia elétrica, é necessário apresentar:\n" +
  "• Documentos que comprovem posse e regularidade do imóvel simultâneamente (IPTU, Registro de Imóvel, Escritura Pública, etc) ou;\n" +
  "• Documentos que comprovem posse (Contrato de Compra e Venda, Contrato de Locação, Termo de Doação, Termo de Permissão de Uso, etc) e regularidade (Certidão de número/Habite-se/Declaração da Prefeitura, Planta de Arquitetura Aprovada) separadamente\n" +
  "A critério do órgão ambiental responsável pela administração da Unidade de Conservação, outros documentos e informações complementares poderão ser solicitadas posteriormente.";

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
    documentos: null // TODO(textos): texto oficial de APE
  },
  {
    id: "uce",
    rotulo: "Unidade de Conservação Estadual",
    typeName: "IDE:ide_2010_mg_unidades_conservacao_estaduais_pol",
    tipoNome: "Unidade de Conservação",
    documentos: DOC_UNIDADE_CONSERVACAO
  },
  {
    id: "ucf",
    rotulo: "Unidade de Conservação Federal",
    typeName: "IDE:ide_2010_mg_unidades_conservacao_federais_pol",
    tipoNome: "Unidade de Conservação",
    documentos: DOC_UNIDADE_CONSERVACAO
  },
  {
    id: "tq",
    rotulo: "Terra Quilombola",
    typeName: "IDE:ide_2005_mg_terras_quilombolas_pol",
    tipoNome: "Terra Quilombola",
    documentos: null // TODO(textos): texto oficial de Terra Quilombola
  },
  {
    id: "ti",
    rotulo: "Terra Indígena",
    typeName: "IDE:ide_2003_mg_terras_indigenas_pol",
    tipoNome: "Terra Indígena",
    documentos: null // TODO(textos): texto oficial de Terra Indígena
  }
];
async function geocodObra(obra) {
  if (obra.localizacao === "Rural") {
    const m = String(obra.coordenada || "").trim().match(/(-?\d+(?:[.,]\d+)?)\s*[,; ]\s*(-?\d+(?:[.,]\d+)?)/);
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
    "Brasil"
  ].filter(Boolean).join(", ");
  if (!endereco.replace(/Brasil|,/g, "").trim()) return null;
  const resp = await fetch(
    "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(endereco),
    { headers: { "Accept-Language": "pt-BR" } }
  );
  const data = await resp.json();
  if (!data || !data.length) return null;
  return {
    lat: parseFloat(data[0].lat),
    lng: parseFloat(data[0].lon),
    label: data[0].display_name
  };
}
function _urlWfs(typeName, lat, lng) {
  const d = 8e-4;
  const box = SISEMA_FLIP_BBOX ? `${lat - d},${lng - d},${lat + d},${lng + d}` : `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const q = new URLSearchParams({
    service: "WFS",
    version: SISEMA_VERSION,
    request: "GetFeature",
    typeName,
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    maxFeatures: "50",
    bbox: `${box},EPSG:4326`
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
      const feats = gj && gj.features || [];
      let dentro = false;
      let propsDentro = null;
      for (const f of feats) {
        const g = f.geometry;
        if (!g) continue;
        if ((g.type === "Polygon" || g.type === "MultiPolygon") && window.turf.booleanPointInPolygon(ponto, f)) {
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
      String(props[key]).trim() !== ""
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
      featureID: featureId
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
        bbox: `${box},EPSG:4326`
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
          (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon") &&
          window.turf.booleanPointInPolygon(ponto, f)
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
        nomes: dentro.map((f) => nomeFeicaoRestricao(f.properties)).filter(Boolean),
        geometrias
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
// Paleta para diferenciar VÁRIAS restrições no mapa. A 1ª é o vermelho de
// erro (coerente com o banner de restrição); as demais alternam em cores
// distintas e de bom contraste. Cicla se houver mais áreas que cores.
const CORES_RESTRICAO = [
  "#C8303F", // erro/500 (vermelho)
  "#1F6FEB", // azul
  "#E8830C", // laranja
  "#2E7D32", // verde
  "#7B1FA2", // roxo
  "#00838F" // teal
];
function desenharRestricoesNoMapa(L, map, res) {
  if (!L || !map || !res) return null;
  // Cor por CAMADA intersectada (índice em `dentros`) — mesma ordem/critério
  // de detalhesRestricoes, para o mapa e os dropdowns baterem de cor.
  const dentros = (res || []).filter((r) => r && r.dentro);
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
            _cor: cor
          }
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
        const cor = (feat && feat.properties && feat.properties._cor) || "#C8303F";
        return {
          color: cor,
          weight: 2,
          opacity: 0.9,
          fillColor: cor,
          fillOpacity: 0.12
        };
      },
      onEachFeature: (feat, lyr) => {
        const p = (feat && feat.properties) || {};
        const txt = p._nome || p._rotulo;
        if (txt) lyr.bindPopup(String(txt));
      }
    }
  ).addTo(map);
  try {
    const b = layer.getBounds();
    if (b && b.isValid()) map.fitBounds(b, { padding: [24, 24], maxZoom: 16 });
  } catch (e) {
    /* getBounds pode falhar em geometrias degeneradas — ignora */
  }
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
    .map((r) => r.rotulo + (r.nomes && r.nomes.length ? " (" + r.nomes.join(", ") + ")" : ""))
    .join("\n");
  return {
    errosTodos,
    algumaDentro: dentros.length > 0,
    restricaoAmbiental: errosTodos ? "" : dentros.length ? "Sim" : "Não",
    restricoesTexto
  };
}
// Detalha as áreas intersectadas para a UI de dropdowns (BT e MT). Uma entrada
// por ÁREA (cada nome vira um dropdown):
//   { id, rotulo, nome, fraseAntes, frase, documentos }
//   fraseAntes— prefixo da frase até o nome ("...de abrangência de <tipo>: ")
//               p/ a UI destacar o <nome> em negrito e fechar com ".".
//   frase     — a frase completa em texto plano (usada em PDF/preview).
//   documentos— texto de exigências do tipo (ou null → só a frase).
// Quando a camada não traz um nome legível, cai para o próprio rótulo.
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
      const alvo = nome || r.rotulo;
      const fraseAntes =
        "O ponto de ligação está localizado na área de abrangência de " +
        tipoNome +
        ": ";
      out.push({
        id: r.id,
        rotulo: r.rotulo,
        nome: alvo,
        cor,
        fraseAntes,
        frase: fraseAntes + alvo + ".",
        documentos: r.documentos || null
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
// Monta o HTML dos dropdowns por área (um <details> por área). Fonte única
// consumida pelo MT (innerHTML); o BT replica a mesma estrutura em React.
// `detalhe` é o retorno de detalhesRestricoes(res).
function restricoesDropdownsHTML(detalhe) {
  return (detalhe || [])
    .map((a) => {
      const docs = a.documentos
        ? `<p class="restricao-area-docs">${_escHtml(a.documentos)}</p>`
        : "";
      const swatch = a.cor
        ? `<span class="restricao-area-cor" style="background:${_escHtml(a.cor)}" aria-hidden="true"></span>`
        : "";
      return (
        `<details class="restricao-area">` +
        `<summary class="restricao-area-head">${swatch}<span class="restricao-area-titulo">${_escHtml(a.rotulo)}</span></summary>` +
        `<div class="restricao-area-body">` +
        `<p class="restricao-area-frase">${_escHtml(a.fraseAntes)}<strong>${_escHtml(a.nome)}</strong>.</p>` +
        docs +
        `</div></details>`
      );
    })
    .join("");
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
          "Não foi possível obter as coordenadas (preencha o endereço ou a coordenada)."
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
  return /* @__PURE__ */ React.createElement("div", { className: "restricao-amb" }, /* @__PURE__ */ React.createElement("div", { className: "mapa-actions" }, /* @__PURE__ */ React.createElement(Btn, { variant: "ghost", onClick: consultar }, "🌿 Consultar restrição ambiental (IDE-Sisema)"), status === "loading" && /* @__PURE__ */ React.createElement("span", { className: "field-hint" }, "Consultando camadas…"), status && status !== "loading" && /* @__PURE__ */ React.createElement("span", { className: "field-hint", style: { color: "var(--vermelho)" } }, status)), resultados && /* @__PURE__ */ React.createElement("div", { className: "restricao-result" }, coords && /* @__PURE__ */ React.createElement("div", { className: "field-hint", style: { marginBottom: 8 } }, "Ponto consultado: ", coords.lat.toFixed(6), ", ", coords.lng.toFixed(6)), /* @__PURE__ */ React.createElement(
    "div",
    {
      className: "alert " + (algumaDentro ? "alert-warn" : "alert-ok"),
      style: { marginBottom: 10 }
    },
    algumaDentro ? "⚠ O ponto intersecta ao menos uma restrição ambiental. Verifique as camadas abaixo." : "Nenhuma restrição ambiental encontrada nas camadas consultadas para o ponto."
  ), /* @__PURE__ */ React.createElement("div", { className: "restricao-chips" }, resultados.map((r) => /* @__PURE__ */ React.createElement(
    "span",
    {
      key: r.id,
      className: "chip " + (r.erro ? "chip-err" : r.dentro ? "chip-on" : "chip-off"),
      title: r.typeName
    },
    r.rotulo,
    ": ",
    r.erro ? r.erro : r.dentro ? "DENTRO" : "fora"
  ))), algumaErro && /* @__PURE__ */ React.createElement("div", { className: "field-hint", style: { marginTop: 8 } }, "Erro no servidor, tente novamente mais tarde.")));
}
