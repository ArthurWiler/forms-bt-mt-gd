const SISEMA_WFS = "https://geoserver.meioambiente.mg.gov.br/ows";
const SISEMA_VERSION = "1.1.0";
const SISEMA_FLIP_BBOX = false;
const SISEMA_CAMADAS = [
  // { id, rotulo, typeName }  — typeName DEVE ser confirmado no GetCapabilities
  {
    id: "ape",
    rotulo: "Áreas de Proteção Especial",
    typeName: "IDE:ide_2010_mg_areas_protecao_especial_pol"
  },
  {
    id: "uce",
    rotulo: "Unidades de Conservação Estaduais",
    typeName: "IDE:ide_2010_mg_unidades_conservacao_estaduais_pol"
  },
  {
    id: "ucf",
    rotulo: "Unidades de Conservação Federais",
    typeName: "IDE:ide_2010_mg_unidades_conservacao_federais_pol"
  },
  {
    id: "tq",
    rotulo: "Terras quilombolas",
    typeName: "IDE:ide_2005_mg_terras_quilombolas_pol"
  },
  {
    id: "ti",
    rotulo: "Terras Indígenas",
    typeName: "IDE:ide_2003_mg_terras_indigenas_pol"
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
function desenharRestricoesNoMapa(L, map, res) {
  if (!L || !map || !res) return null;
  const feicoes = [];
  for (const r of res) {
    if (r && r.dentro && Array.isArray(r.geometrias)) {
      for (const f of r.geometrias) {
        if (f && f.geometry) {
          const nome = (r.nomes && r.nomes[0]) || r.rotulo;
          feicoes.push({ ...f, properties: { ...(f.properties || {}), _rotulo: r.rotulo, _nome: nome } });
        }
      }
    }
  }
  if (!feicoes.length) return null;
  const layer = L.geoJSON(
    { type: "FeatureCollection", features: feicoes },
    {
      style: {
        color: "#C8303F", // erro/500 — borda do contorno de restrição
        weight: 2,
        opacity: 0.9,
        fillColor: "#C8303F",
        fillOpacity: 0.1
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
