/* ============================================================
   CEMIG — Localização da obra (Leaflet + OpenStreetMap)
   Toda busca é feita pela COORDENADA (campos lat/long).
   - Endereço (urbano) -> Nominatim -> preenche lat/long automaticamente
   - "Mostrar no mapa" e auto-preenchimento disparam mapa + restrição juntos
   - Consulta TODAS as restrições (js/geo.js: config SISEMA_*) e autopreenche
     o campo "restrição ambiental" da obra; sem indicadores visuais no mapa.
   Usa hooks globais, Btn, window.L (Leaflet) e window.turf (Turf.js)
   ============================================================ */

// Extrai um nome legível das propriedades de uma feição (qual UC/área)
function _nomeFeicaoObra(props) {
  if (!props) return null;
  const k = Object.keys(props).find(
    (key) =>
      /nome|^nm_|name|denom|titulo|t_tulo|unidade|categoria/i.test(key) &&
      props[key] != null &&
      String(props[key]).trim() !== "",
  );
  return k ? String(props[k]).trim() : null;
}

// Consulta TODAS as camadas e devolve, por camada, todas as feições que contêm o ponto
async function _consultarTodasRestricoes(lat, lng) {
  if (!window.turf) throw new Error("Turf.js não carregado.");
  if (typeof SISEMA_CAMADAS === "undefined")
    throw new Error("Configuração do Sisema (geo.js) não carregada.");
  const ponto = window.turf.point([lng, lat]);
  const d = 0.0008; // ~80 m de meia-aresta
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
      out.push({
        ...cam,
        dentro: dentro.length > 0,
        nomes: dentro.map((f) => _nomeFeicaoObra(f.properties)).filter(Boolean),
      });
    } catch (e) {
      out.push({ ...cam, erro: "Falha de rede/CORS" });
    }
  }
  return out;
}

function LocalizacaoObra({ obra, setObra }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const lastRef = useRef(""); // "lat,lng" da última execução (evita repetir)
  const [status, setStatus] = useState(""); // "", "geo", "restr" ou mensagem
  const [coords, setCoords] = useState(null);

  const rural = obra.localizacao === "Rural";
  const toNum = (s) => {
    const v = parseFloat(
      String(s == null ? "" : s)
        .replace(",", ".")
        .trim(),
    );
    return isNaN(v) ? null : v;
  };
  const nDig = (s) => (String(s || "").match(/\d/g) || []).length;

  // Inicializa o mapa uma única vez
  useEffect(() => {
    if (!window.L || !divRef.current || mapRef.current) return;
    const map = window.L.map(divRef.current).setView([-19.9167, -43.9345], 12);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "© OpenStreetMap",
    }).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
  }, []);

  // Marcador no mapa + consulta de TODAS as restrições; autopreenche a obra
  const executar = async (lat, lng, label) => {
    const map = mapRef.current;
    if (map) {
      map.setView([lat, lng], 17);
      if (markerRef.current) markerRef.current.setLatLng([lat, lng]);
      else markerRef.current = window.L.marker([lat, lng]).addTo(map);
      if (label) markerRef.current.bindPopup(label);
      setTimeout(() => map.invalidateSize(), 100);
    }
    setCoords({ lat, lng, label });
    setStatus("restr");
    try {
      const res = await _consultarTodasRestricoes(lat, lng);
      const dentros = res.filter((r) => r.dentro);
      const errosTodos = res.length > 0 && res.every((r) => r.erro);
      if (errosTodos) {
        setObra((p) => ({ ...p, restricaoAmbiental: "", restricoesTexto: "" }));
        setStatus(
          "Não foi possível consultar a restrição ambiental (verifique conexão/camadas).",
        );
        return;
      }
      const texto = dentros
        .map(
          (r) =>
            r.rotulo + (r.nomes.length ? " (" + r.nomes.join(", ") + ")" : ""),
        )
        .join("; ");
      setObra((p) => ({
        ...p,
        restricaoAmbiental: dentros.length ? "Sim" : "Não",
        restricoesTexto: texto,
      }));
      setStatus("");
    } catch (e) {
      setStatus((e && e.message) || "Falha na consulta de restrições.");
    }
  };

  // Geocodifica o endereço (urbano) e preenche lat/long. Sem complemento na busca.
  const buscarPorEndereco = async () => {
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
    if (!endereco.replace(/Brasil|,/g, "").trim()) return;
    setStatus("geo");
    try {
      const resp = await fetch(
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" +
          encodeURIComponent(endereco),
        { headers: { "Accept-Language": "pt-BR" } },
      );
      const data = await resp.json();
      if (!data || !data.length) {
        setStatus("Endereço não encontrado. Informe a coordenada manualmente.");
        return;
      }
      setStatus("");
      setObra((p) => ({
        ...p,
        lat: String(parseFloat(data[0].lat)),
        lng: String(parseFloat(data[0].lon)),
      }));
    } catch (e) {
      setStatus("Falha ao geocodificar o endereço.");
    }
  };

  // Auto-geocodifica (urbano) assim que houver endereço + nº + cidade.
  // Só dispara se o usuário ainda não tem coordenadas próprias.
  const lastGeoRef = useRef("");
  useEffect(() => {
    if (rural) return;
    const pronto =
      String(obra.endereco || "").trim() &&
      String(obra.num || "").trim() &&
      String(obra.cidade || "").trim();
    if (!pronto) return;
    // não sobrescreve coordenadas já preenchidas manualmente
    if (nDig(obra.lat) >= 5 && nDig(obra.lng) >= 5) return;
    const key = [obra.endereco, obra.num, obra.bairro, obra.cidade, obra.cep]
      .join("|")
      .toLowerCase();
    if (lastGeoRef.current === key) return;
    const t = setTimeout(() => {
      lastGeoRef.current = key;
      buscarPorEndereco();
    }, 900);
    return () => clearTimeout(t);
  }, [obra.endereco, obra.num, obra.bairro, obra.cidade, obra.cep, rural]);

  // Auto-dispara quando lat e long estão completos (>=5 dígitos cada)
  useEffect(() => {
    const lat = toNum(obra.lat);
    const lng = toNum(obra.lng);
    if (lat == null || lng == null) return;
    if (nDig(obra.lat) < 5 || nDig(obra.lng) < 5) return;
    const key = lat + "," + lng;
    if (lastRef.current === key) return;
    const t = setTimeout(() => {
      lastRef.current = key;
      executar(lat, lng, "Coordenada informada");
    }, 600);
    return () => clearTimeout(t);
  }, [obra.lat, obra.lng]);

  return (
    <div className="mapa-obra">
      <div className="mapa-actions">
        {status === "geo" && (
          <span className="field-hint">Buscando coordenada…</span>
        )}
        {status === "restr" && (
          <span className="field-hint">Consultando restrições…</span>
        )}
        {status && status !== "geo" && status !== "restr" && (
          <span className="field-hint" style={{ color: "var(--vermelho)" }}>
            {status}
          </span>
        )}
      </div>
      <div ref={divRef} className="mapa-canvas" />
    </div>
  );
}
