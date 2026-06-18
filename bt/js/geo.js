/* ============================================================
   CEMIG — Consulta de restrição ambiental (IDE-Sisema / WFS)
   Fluxo: Endereço -> Nominatim -> coordenadas -> WFS IDE-Sisema
          -> Turf.js (ponto-em-polígono) -> resultado
   Usa hooks globais (useState) e Btn (components.js); window.turf (Turf.js)
   ============================================================ */

/* ------------------------------------------------------------------
   CONFIGURAÇÃO — CONFIRMAR no GetCapabilities do IDE-Sisema:
   <WFS_BASE>?service=WFS&version=2.0.0&request=GetCapabilities
   - WFS_BASE: endpoint do GeoServer do Sisema
   - typeName: workspace:camada de cada restrição
   - Ajuste SISEMA_FLIP_BBOX se o servidor usar ordem lat,long no BBOX
   ------------------------------------------------------------------ */
const SISEMA_WFS = "https://geoserver.meioambiente.mg.gov.br/ows"; // EXEMPLO — confirmar
const SISEMA_VERSION = "1.1.0";
const SISEMA_FLIP_BBOX = false; // true => BBOX em lat,long
const SISEMA_CAMADAS = [
  // { id, rotulo, typeName }  — typeName DEVE ser confirmado no GetCapabilities
  {
    id: "ape",
    rotulo: "Áreas de Proteção Especial",
    typeName: "IDE:ide_2010_mg_areas_protecao_especial_pol",
  },
  {
    id: "uce",
    rotulo: "Unidades de Conservação Estaduais",
    typeName: "IDE:ide_2010_mg_unidades_conservacao_estaduais_pol",
  },
  {
    id: "ucf",
    rotulo: "Unidades de Conservação Federais",
    typeName: "IDE:ide_2010_mg_unidades_conservacao_federais_pol",
  },
  {
    id: "tq",
    rotulo: "Terras quilombolas",
    typeName: "IDE:ide_2005_mg_terras_quilombolas_pol",
  },
  {
    id: "ti",
    rotulo: "Terras Indígenas",
    typeName: "IDE:ide_2003_mg_terras_indigenas_pol",
  },
];

// Geocodificação compartilhada: urbano = Nominatim; rural = coordenada informada
async function geocodObra(obra) {
  // Rural -> coordenada direta
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
  // Urbano -> Nominatim
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

// Monta a URL WFS GetFeature por BBOX (pequeno quadrado em torno do ponto)
function _urlWfs(typeName, lat, lng) {
  const d = 0.0008; // ~80 m de meia-aresta
  const box = SISEMA_FLIP_BBOX
    ? `${lat - d},${lng - d},${lat + d},${lng + d}`
    : `${lng - d},${lat - d},${lng + d},${lat + d}`;
  const q = new URLSearchParams({
    service: "WFS",
    version: SISEMA_VERSION,
    request: "GetFeature",
    typeName: typeName,
    outputFormat: "application/json",
    srsName: "EPSG:4326",
    maxFeatures: "50",
    bbox: `${box},EPSG:4326`,
  });
  return `${SISEMA_WFS}?${q.toString()}`;
}

// Consulta cada camada e confirma com Turf se o ponto está dentro de algum polígono
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
      // Tipicamente CORS / rede
      out.push({ ...cam, erro: "Falha de rede/CORS" });
    }
  }
  return out;
}

// Componente de UI da consulta
function RestricaoAmbiental({ obra }) {
  const [status, setStatus] = useState(""); // "", "loading" ou mensagem
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

  return (
    <div className="restricao-amb">
      <div className="mapa-actions">
        <Btn variant="ghost" onClick={consultar}>
          🌿 Consultar restrição ambiental (IDE-Sisema)
        </Btn>
        {status === "loading" && (
          <span className="field-hint">Consultando camadas…</span>
        )}
        {status && status !== "loading" && (
          <span className="field-hint" style={{ color: "var(--vermelho)" }}>
            {status}
          </span>
        )}
      </div>

      {resultados && (
        <div className="restricao-result">
          {coords && (
            <div className="field-hint" style={{ marginBottom: 8 }}>
              Ponto consultado: {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
            </div>
          )}
          <div
            className={"alert " + (algumaDentro ? "alert-warn" : "alert-ok")}
            style={{ marginBottom: 10 }}
          >
            {algumaDentro
              ? "⚠ O ponto intersecta ao menos uma restrição ambiental. Verifique as camadas abaixo."
              : "Nenhuma restrição ambiental encontrada nas camadas consultadas para o ponto."}
          </div>
          <div className="restricao-chips">
            {resultados.map((r) => (
              <span
                key={r.id}
                className={
                  "chip " +
                  (r.erro ? "chip-err" : r.dentro ? "chip-on" : "chip-off")
                }
                title={r.typeName}
              >
                {r.rotulo}: {r.erro ? r.erro : r.dentro ? "DENTRO" : "fora"}
              </span>
            ))}
          </div>
          {algumaErro && (
            <div className="field-hint" style={{ marginTop: 8 }}>
              Erro no servidor, tente novamente mais tarde.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
