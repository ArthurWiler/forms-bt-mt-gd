/* ============================================================
   CEMIG — BT: conversão geográfica → UTM (WGS-84)
   ------------------------------------------------------------
   O arquivo nasceu na era React com o componente <LocalizacaoObra>
   (mapa Leaflet + geocodificação + consulta de restrição ambiental).
   Na migração para vanilla essas responsabilidades foram para
   bt/js/bt-core.js (initMapaObra, onCoordBT, consultarRestricaoAmbientalBT)
   e shared/js/geo.js (geocodificarEnderecoBR, consultarRestricoesObra),
   mas o componente ficou para trás — código inalcançável que dependia
   de `useRef`/`useState`/`React.createElement`, inexistentes no projeto.
   Foi removido junto do encaminhador `_consultarTodasRestricoes`, que
   só era chamado de dentro dele.

   Resta o que continua vivo: a conversão para UTM consumida por
   bt-core.js, individual-app.js e pdf.js através de utmString().
   A zona/fuso vem da longitude e a letra de banda da latitude
   (Regra 6). Replica a implementação do formulário MT para manter
   consistência — MT e Loteamento mantêm cópias locais próprias.
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
