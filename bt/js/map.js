// A consulta de restrições agora vive em shared/js/geo.js (consultarRestricoesObra),
// compartilhada com o MT para garantir critério/UX idênticos (Regras 2 e 3).
// Mantém-se o nome local como fino encaminhamento para não tocar no restante.
const _consultarTodasRestricoes = (lat, lng) =>
  consultarRestricoesObra(lat, lng);
/* ============================================================
   Conversão Geográfica → UTM (WGS-84)
   A zona/fuso é determinada automaticamente a partir da longitude
   e a letra de banda a partir da latitude (Regra 6). Replica a
   implementação usada no formulário MT para manter consistência.
   ============================================================ */
function _utmBandLetterBT(lat) {
  const B = "CDEFGHJKLMNPQRSTUVWXX";
  return lat < -80 ? "C" : lat > 84 ? "X" : B[Math.floor((lat + 80) / 8)];
}
function latLonParaUTM(lat, lon) {
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
  if (lat < 0) Nort += 1e7;
  return {
    zona,
    hemisferio: lat < 0 ? "S" : "N",
    easting: Math.round(E),
    northing: Math.round(Nort),
  };
}
// String amigável "23K E:611111 N:7795555" a partir de lat/lng (ou "").
function utmString(lat, lng) {
  const la = parseFloat(String(lat).replace(",", "."));
  const lo = parseFloat(String(lng).replace(",", "."));
  if (isNaN(la) || isNaN(lo)) return "";
  const u = latLonParaUTM(la, lo);
  return `${u.zona}${_utmBandLetterBT(la)} E:${u.easting} N:${u.northing}`;
}
function LocalizacaoObra({ obra, setObra }) {
  const divRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const restricaoLayerRef = useRef(null);
  const lastRef = useRef("");
  const [status, setStatus] = useState("");
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
  const aplicarCoord = (lat, lng) => {
    setObra((p) => ({
      ...p,
      lat: String(lat),
      lng: String(lng),
      utm: utmString(lat, lng),
    }));
  };
  useEffect(() => {
    if (!window.L || !divRef.current || mapRef.current) return;
    const map = window.L.map(divRef.current).setView([-19.9167, -43.9345], 12);
    // Camadas base alternáveis: Ruas (OSM, padrão) e Satélite (Esri World
    // Imagery — mesma fonte usada pelo Sisema). Esri não usa subdomínio {s}
    // e a ordem dos eixos é {z}/{y}/{x}.
    const ruas = window.L.tileLayer(
      "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
      { maxZoom: 19, attribution: "© OpenStreetMap" },
    );
    const satelite = window.L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      {
        maxZoom: 19,
        attribution: "",
      },
    );
    satelite.addTo(map);
    window.L.control.layers({ Satélite: satelite, Ruas: ruas }).addTo(map);
    map.on("click", (e) => {
      aplicarCoord(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = map;
    setTimeout(() => map.invalidateSize(), 200);
  }, []);
  const executar = async (lat, lng, label) => {
    const map = mapRef.current;
    if (map) {
      const ll = window.L.latLng(lat, lng);
      if (markerRef.current) {
        markerRef.current.setLatLng([lat, lng]);
        if (!map.getBounds().contains(ll))
          map.setView(ll, Math.max(map.getZoom(), 17));
      } else {
        markerRef.current = window.L.marker([lat, lng], {
          draggable: true,
        }).addTo(map);
        markerRef.current.on("dragend", (e) => {
          const p = e.target.getLatLng();
          aplicarCoord(p.lat, p.lng);
        });
        // Primeira aparição do pino (geocodificação, clique, coordenada
        // digitada): centraliza no ZOOM MÁXIMO dos tiles. Depois disso o
        // enquadramento só muda se o pino sair da vista (bloco acima).
        const zMax = Number.isFinite(map.getMaxZoom()) ? map.getMaxZoom() : 19;
        map.setView(ll, zMax);
      }
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
        setObra((p) => ({
          ...p,
          restricaoAmbiental: "",
          restricaoAceite: false,
          restricoesTexto: "",
          restricoesDetalhe: [],
        }));
        if (map && restricaoLayerRef.current) {
          map.removeLayer(restricaoLayerRef.current);
          restricaoLayerRef.current = null;
        }
        setStatus(
          "Não foi possível consultar a restrição ambiental (verifique conexão/camadas).",
        );
        return;
      }
      // Uma reserva por linha ("\n"); o display usa white-space: pre-line.
      const texto = dentros
        .map(
          (r) =>
            r.rotulo + (r.nomes.length ? " (" + r.nomes.join(", ") + ")" : ""),
        )
        .join("\n");
      setObra((p) => ({
        ...p,
        restricaoAmbiental: dentros.length ? "Sim" : "Não",
        restricaoAceite: false,
        restricoesTexto: texto,
        restricoesDetalhe: detalhesRestricoes(res),
      }));
      // Desenha o contorno das reservas no mapa (limpa o anterior primeiro).
      if (map) {
        if (restricaoLayerRef.current) {
          map.removeLayer(restricaoLayerRef.current);
          restricaoLayerRef.current = null;
        }
        restricaoLayerRef.current = desenharRestricoesNoMapa(
          window.L,
          map,
          res,
        );
      }
      setStatus("");
    } catch (e) {
      setStatus((e && e.message) || "Falha na consulta de restrições.");
    }
  };
  const buscarPorEndereco = async () => {
    const temAlgo = [
      obra.endereco,
      obra.num,
      obra.bairro,
      obra.cidade,
      obra.cep,
    ].some((v) => String(v || "").trim());
    if (!temAlgo) return;
    setStatus("geo");
    try {
      // Geocodificação ESTRUTURADA compartilhada (shared/js/geo.js): resolve o
      // NÚMERO do endereço — a antiga busca em texto livre ignorava o número e
      // posicionava o pin longe do local real.
      const r = await geocodificarEnderecoBR({
        logradouro: obra.endereco,
        numero: obra.num,
        bairro: obra.bairro,
        cidade: obra.cidade,
        uf: obra.estado,
        cep: obra.cep,
      });
      if (!r) {
        setStatus("Endereço não encontrado. Informe a coordenada manualmente.");
        return;
      }
      setStatus("");
      setObra((p) => ({
        ...p,
        lat: String(r.lat),
        lng: String(r.lon),
        utm: utmString(r.lat, r.lon),
      }));
    } catch (e) {
      setStatus("Falha ao geocodificar o endereço.");
    }
  };
  const lastGeoRef = useRef("");
  useEffect(() => {
    if (rural) return;
    const pronto =
      String(obra.endereco || "").trim() &&
      String(obra.num || "").trim() &&
      String(obra.cidade || "").trim();
    if (!pronto) return;
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
  return /* @__PURE__ */ React.createElement(
    "div",
    { className: "mapa-obra" },
    /* @__PURE__ */ React.createElement(
      "div",
      { className: "mapa-actions" },
      status === "geo" &&
        /* @__PURE__ */ React.createElement(
          "span",
          { className: "field-hint" },
          "Buscando coordenada…",
        ),
      status === "restr" &&
        /* @__PURE__ */ React.createElement(
          "span",
          { className: "field-hint" },
          "Consultando restrições…",
        ),
      status &&
        status !== "geo" &&
        status !== "restr" &&
        /* @__PURE__ */ React.createElement(
          "span",
          { className: "field-hint", style: { color: "var(--vermelho)" } },
          status,
        ),
    ),
    /* @__PURE__ */ React.createElement("div", {
      ref: divRef,
      className: "mapa-canvas",
    }),
  );
}
