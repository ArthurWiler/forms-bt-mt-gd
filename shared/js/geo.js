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
