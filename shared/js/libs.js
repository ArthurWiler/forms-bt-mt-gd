/* ============================================================
   CEMIG — Carregador sob demanda de bibliotecas de terceiros
   ------------------------------------------------------------
   Leaflet, Turf e jsPDF vinham como <script> síncronos no <body>
   (mais o leaflet.css render-blocking no <head>): ~1 MB de CDN
   bloqueando o parser e o primeiro paint de TODA página de
   formulário, sendo que o mapa só aparece numa etapa lá adiante e
   o PDF só na geração. Aqui cada uma vira uma Promise memoizada
   que injeta a tag na primeira necessidade real.

   Contrato: `CemigLibs.leaflet() / .turf() / .jspdf()` devolvem uma
   Promise que resolve com a lib já em `window` (L / turf / jspdf).
   Rejeita se a rede falhar — os guards existentes nos módulos
   (`if (!window.jspdf) alert(...)`) seguem valendo como rede de
   segurança.

   NÃO DUPLICAR CARGA é o requisito central: duas chamadas no mesmo
   tick (dois goTo() seguidos, ou o mapa e a consulta ambiental
   disparando juntos) têm de compartilhar a mesma requisição. Ver o
   comentário em `injetar()` — o cache é gravado no mesmo bloco
   síncrono da criação da Promise.
   ============================================================ */
(function () {
  var LEAFLET_CSS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
  var LEAFLET_JS = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
  var TURF_JS = "https://unpkg.com/@turf/turf@6/turf.min.js";
  var JSPDF_JS =
    "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";

  var porUrl = new Map(); // url  -> Promise da tag
  var porNome = new Map(); // nome -> Promise da lib (pode agrupar várias tags)

  function injetar(url, jaCarregado) {
    // Curto-circuito se a lib já veio por outra via (ex.: uma tag
    // remanescente no HTML de alguma página ainda não migrada).
    if (jaCarregado && jaCarregado()) return Promise.resolve();

    var pronta = porUrl.get(url);
    if (pronta) return pronta;

    // Não há await/then entre o `get` acima e o `set` abaixo, e o executor
    // da Promise roda de forma síncrona: qualquer segunda chamada — mesmo
    // no mesmo tick — encontra esta instância no cache e reaproveita a tag,
    // em vez de injetar outra.
    var p = new Promise(function (resolver, rejeitar) {
      var ehCss = url.slice(-4) === ".css";
      var el = document.createElement(ehCss ? "link" : "script");
      if (ehCss) {
        el.rel = "stylesheet";
        el.href = url;
      } else {
        el.src = url;
        el.async = false; // preserva a ordem caso um dia se injete um par dependente
      }
      el.onload = function () {
        resolver();
      };
      el.onerror = function () {
        // Sai do cache para que um clique posterior possa tentar de novo.
        porUrl.delete(url);
        rejeitar(new Error("Falha ao carregar " + url));
      };
      document.head.appendChild(el);
    });
    porUrl.set(url, p);
    return p;
  }

  function umaVez(nome, criar) {
    var p = porNome.get(nome);
    if (!p) {
      p = criar().catch(function (e) {
        porNome.delete(nome); // idem: permite nova tentativa
        throw e;
      });
      porNome.set(nome, p);
    }
    return p;
  }

  window.CemigLibs = {
    // O CSS vai junto do JS para o mapa nunca aparecer sem estilo por um
    // instante: só resolve quando os dois chegaram.
    leaflet: function () {
      return umaVez("leaflet", function () {
        return Promise.all([
          injetar(LEAFLET_CSS, null),
          injetar(LEAFLET_JS, function () {
            return !!window.L;
          }),
        ]);
      });
    },
    turf: function () {
      return umaVez("turf", function () {
        return injetar(TURF_JS, function () {
          return !!window.turf;
        });
      });
    },
    jspdf: function () {
      return umaVez("jspdf", function () {
        return injetar(JSPDF_JS, function () {
          return !!window.jspdf;
        });
      });
    },
  };
})();
