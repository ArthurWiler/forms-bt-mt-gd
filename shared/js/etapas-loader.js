/* ============================================================
   CEMIG — Carregador de etapas em fragmentos HTML
   ------------------------------------------------------------
   Os formulários vanilla dividem cada etapa num fragmento próprio
   (ex.: etapas/03-dados-uc.html) para manter o index.html enxuto.
   No boot, este módulo varre as seções `<section class="page"
   data-src="...">`, busca todos os fragmentos em paralelo, injeta o
   HTML e só então chama `window.initFormulario()` — o init do app
   (bindInputs, marcadores, cards, ilhas dinâmicas) depende do DOM
   completo.

   Fragmentos exigem servidor HTTP (fetch não funciona em file://):
   em caso de falha, exibe o mesmo aviso "sirva por um servidor
   HTTP" que micro/mini já usavam na era React.
   ============================================================ */
(function () {
  function avisoServidorHTTP(erro) {
    const div = document.createElement("div");
    div.setAttribute(
      "style",
      "max-width:640px;margin:60px auto;padding:24px;font-family:Open Sans,system-ui,sans-serif;background:#fff8e6;border:1px solid #f0d48a;border-radius:12px;color:#8a6d1a;line-height:1.6",
    );
    div.innerHTML =
      "<strong>Para executar este formulário, sirva-o por um servidor HTTP.</strong><br>" +
      "Na pasta do projeto, rode:<br>" +
      '<code style="display:block;background:#fff;padding:8px;border-radius:6px;margin-top:6px">python3 -m http.server 8000</code>' +
      "e acesse <code>http://localhost:8000</code>." +
      (erro && location.protocol !== "file:"
        ? `<br><br><small>Detalhe: ${erro}</small>`
        : "");
    document.body.prepend(div);
  }

  async function carregarEtapas() {
    const secoes = Array.from(
      document.querySelectorAll("section.page[data-src]"),
    );
    try {
      await Promise.all(
        secoes.map(async (sec) => {
          const res = await fetch(sec.dataset.src);
          if (!res.ok)
            throw new Error(`${sec.dataset.src}: HTTP ${res.status}`);
          sec.innerHTML = await res.text();
        }),
      );
    } catch (e) {
      avisoServidorHTTP(e && e.message);
      return;
    }
    // DOM completo: inicializa o app e reaplica a convenção de marcadores
    // (o DOMContentLoaded do form-marcadores.js já passou nesta altura).
    if (typeof window.initFormulario === "function") window.initFormulario();
    if (window.CemigMarcadores) {
      window.CemigMarcadores.aplicar();
      window.CemigMarcadores.montarNavReativa();
      window.CemigMarcadores.atualizarAvancar();
    }
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", carregarEtapas);
  else carregarEtapas();
})();
