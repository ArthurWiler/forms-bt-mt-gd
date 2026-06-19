function _nomeFeicaoObra(props) {
  if (!props) return null;
  const k = Object.keys(props).find(
    (key) => /nome|^nm_|name|denom|titulo|t_tulo|unidade|categoria/i.test(key) && props[key] != null && String(props[key]).trim() !== ""
  );
  return k ? String(props[k]).trim() : null;
}
async function _consultarTodasRestricoes(lat, lng) {
  if (!window.turf) throw new Error("Turf.js n\xE3o carregado.");
  if (typeof SISEMA_CAMADAS === "undefined")
    throw new Error("Configura\xE7\xE3o do Sisema (geo.js) n\xE3o carregada.");
  const ponto = window.turf.point([lng, lat]);
  const d = 8e-4;
  const out = [];
  for (const cam of SISEMA_CAMADAS) {
    try {
      const box = typeof SISEMA_FLIP_BBOX !== "undefined" && SISEMA_FLIP_BBOX ? `${lat - d},${lng - d},${lat + d},${lng + d}` : `${lng - d},${lat - d},${lng + d},${lat + d}`;
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
      const feats = gj && gj.features || [];
      const dentro = feats.filter(
        (f) => f.geometry && (f.geometry.type === "Polygon" || f.geometry.type === "MultiPolygon") && window.turf.booleanPointInPolygon(ponto, f)
      );
      out.push({
        ...cam,
        dentro: dentro.length > 0,
        nomes: dentro.map((f) => _nomeFeicaoObra(f.properties)).filter(Boolean)
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
  const lastRef = useRef("");
  const [status, setStatus] = useState("");
  const [coords, setCoords] = useState(null);
  const rural = obra.localizacao === "Rural";
  const toNum = (s) => {
    const v = parseFloat(
      String(s == null ? "" : s).replace(",", ".").trim()
    );
    return isNaN(v) ? null : v;
  };
  const nDig = (s) => (String(s || "").match(/\d/g) || []).length;
  useEffect(() => {
    if (!window.L || !divRef.current || mapRef.current) return;
    const map = window.L.map(divRef.current).setView([-19.9167, -43.9345], 12);
    window.L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "\xA9 OpenStreetMap"
    }).addTo(map);
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
  }, []);
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
          "N\xE3o foi poss\xEDvel consultar a restri\xE7\xE3o ambiental (verifique conex\xE3o/camadas)."
        );
        return;
      }
      const texto = dentros.map(
        (r) => r.rotulo + (r.nomes.length ? " (" + r.nomes.join(", ") + ")" : "")
      ).join("; ");
      setObra((p) => ({
        ...p,
        restricaoAmbiental: dentros.length ? "Sim" : "N\xE3o",
        restricoesTexto: texto
      }));
      setStatus("");
    } catch (e) {
      setStatus(e && e.message || "Falha na consulta de restri\xE7\xF5es.");
    }
  };
  const buscarPorEndereco = async () => {
    const endereco = [
      [obra.endereco, obra.num].filter(Boolean).join(", "),
      obra.bairro,
      obra.cidade,
      obra.estado,
      obra.cep,
      "Brasil"
    ].filter(Boolean).join(", ");
    if (!endereco.replace(/Brasil|,/g, "").trim()) return;
    setStatus("geo");
    try {
      const resp = await fetch(
        "https://nominatim.openstreetmap.org/search?format=json&limit=1&q=" + encodeURIComponent(endereco),
        { headers: { "Accept-Language": "pt-BR" } }
      );
      const data = await resp.json();
      if (!data || !data.length) {
        setStatus("Endere\xE7o n\xE3o encontrado. Informe a coordenada manualmente.");
        return;
      }
      setStatus("");
      setObra((p) => ({
        ...p,
        lat: String(parseFloat(data[0].lat)),
        lng: String(parseFloat(data[0].lon))
      }));
    } catch (e) {
      setStatus("Falha ao geocodificar o endere\xE7o.");
    }
  };
  const lastGeoRef = useRef("");
  useEffect(() => {
    if (rural) return;
    const pronto = String(obra.endereco || "").trim() && String(obra.num || "").trim() && String(obra.cidade || "").trim();
    if (!pronto) return;
    if (nDig(obra.lat) >= 5 && nDig(obra.lng) >= 5) return;
    const key = [obra.endereco, obra.num, obra.bairro, obra.cidade, obra.cep].join("|").toLowerCase();
    if (lastGeoRef.current === key) return;
    const t = setTimeout(() => {
      lastGeoRef.current = key;
      buscarPorEndereco();
    }, 900);
    return () => clearTimeout(t);
  }, [obra.endereco, obra.num, obra.bairro, obra.cidade, obra.cep, rural]);
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
  return /* @__PURE__ */ React.createElement("div", { className: "mapa-obra" }, /* @__PURE__ */ React.createElement("div", { className: "mapa-actions" }, status === "geo" && /* @__PURE__ */ React.createElement("span", { className: "field-hint" }, "Buscando coordenada\u2026"), status === "restr" && /* @__PURE__ */ React.createElement("span", { className: "field-hint" }, "Consultando restri\xE7\xF5es\u2026"), status && status !== "geo" && status !== "restr" && /* @__PURE__ */ React.createElement("span", { className: "field-hint", style: { color: "var(--vermelho)" } }, status)), /* @__PURE__ */ React.createElement("div", { ref: divRef, className: "mapa-canvas" }));
}
