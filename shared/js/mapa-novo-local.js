/* ============================================================
   mapa-novo-local.js — mapa do NOVO local (mudança de local do
   padrão de entrada / da subestação). BT individual, Micro, Mini, MT.
   ------------------------------------------------------------
   Pedido de 13/11/2026: com "O padrão precisa ser mudado de local? =
   Sim" o formulário NÃO pede o endereço de novo — mostra só o mapa, com
   um marcador FIXO no local atual (a coordenada da etapa de endereço) e
   o cliente indica o novo local clicando no mapa / arrastando o pin.

   Cada formulário continua dono do próprio mapa e do pin arrastável
   (padrão de criação Leaflet de cada app); daqui vêm só as peças comuns:
     • cmgMarcarLocalAtual(mapa, ref, lat, lng) — marcador fixo, cinza,
       não interativo (o clique passa para o mapa), com o rótulo
       permanente "Localização atual". `ref` é uma caixa { pino }.
     • cmgEnquadrarLocalAtual(mapa, lat, lng) — centra no local atual
       enquanto ainda não há pin novo.
     • cmgNovoLocalOk(atLat, atLng, nvLat, nvLng) — gate do Avançar:
       novo local informado, válido e diferente do atual.
     • cmgCoord(v) — número de uma coordenada digitada ("," ou ".").
   Depende de Leaflet (window.L) já carregado pelo chamador.
   ============================================================ */

function cmgCoord(v) {
  const n = parseFloat(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : NaN;
}

function _cmgCoordValida(lat, lng) {
  return (
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    Math.abs(lat) <= 90 &&
    Math.abs(lng) <= 180
  );
}

function cmgMarcarLocalAtual(mapa, ref, lat, lng) {
  if (!mapa || !window.L || !ref) return;
  const la = cmgCoord(lat),
    lo = cmgCoord(lng);
  if (!_cmgCoordValida(la, lo)) {
    if (ref.pino) {
      mapa.removeLayer(ref.pino);
      ref.pino = null;
    }
    return;
  }
  if (ref.pino) {
    ref.pino.setLatLng([la, lo]);
    return;
  }
  ref.pino = window.L.marker([la, lo], {
    icon: window.L.divIcon({
      className: "mapa-pin-atual",
      html: "<span></span>",
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    }),
    // Não interativo: o clique sobre ele cai no mapa (posiciona o pin novo).
    interactive: false,
    keyboard: false,
    zIndexOffset: -100,
  }).addTo(mapa);
  ref.pino.bindTooltip("Localização atual", {
    permanent: true,
    direction: "top",
    offset: [0, -10],
    className: "mapa-tooltip-atual",
  });
}

function cmgEnquadrarLocalAtual(mapa, lat, lng) {
  const la = cmgCoord(lat),
    lo = cmgCoord(lng);
  if (mapa && _cmgCoordValida(la, lo)) mapa.setView([la, lo], 17);
}

// Diferença mínima (~1 m) para o novo local não ser o próprio local atual.
const CMG_NOVO_LOCAL_TOL = 0.00001;
function cmgNovoLocalOk(atLat, atLng, nvLat, nvLng) {
  const nla = cmgCoord(nvLat),
    nlo = cmgCoord(nvLng);
  if (!_cmgCoordValida(nla, nlo)) return false;
  const ala = cmgCoord(atLat),
    alo = cmgCoord(atLng);
  if (!_cmgCoordValida(ala, alo)) return true; // sem referência: só o novo
  return (
    Math.abs(nla - ala) > CMG_NOVO_LOCAL_TOL ||
    Math.abs(nlo - alo) > CMG_NOVO_LOCAL_TOL
  );
}

// Mensagem de status sob o mapa (mesma regra do gate).
function cmgStatusNovoLocal(atLat, atLng, nvLat, nvLng) {
  if (!_cmgCoordValida(cmgCoord(nvLat), cmgCoord(nvLng)))
    return "Clique no mapa para marcar o novo local.";
  return cmgNovoLocalOk(atLat, atLng, nvLat, nvLng)
    ? ""
    : "O novo local precisa ser diferente da localização atual.";
}
