/* ============================================================
   CEMIG — Trilha de etapas no mobile (rail horizontal)
   ------------------------------------------------------------
   No mobile a `<aside class="sidebar">` deixa de ser coluna e vira uma fita
   de chips que rola na horizontal (spec do Figma). Este módulo monta, em
   volta dela, o que a rolagem exige e o HTML dos 7 formulários não traz:

     <div class="trilha">            ← invólucro (grade de 1 coluna)
       <button class="trilha-seta trilha-seta--ini">
       <aside class="sidebar">…      ← o rail, intacto
       <button class="trilha-seta trilha-seta--fim">
       <div class="trilha-barra"><span></span></div>

   Estado (classes no invólucro, o CSS faz o resto):
     .tem-ini / .tem-fim — ainda há etapa escondida daquele lado; liga a seta
                           e o fade da borda correspondente.
     .rolavel            — a trilha não cabe inteira; mostra a barra.

   Tudo isto é enfeite de rolagem: no desktop o invólucro some
   (`display: contents`) e as medidas dão "não rola", então nada aparece.
   ============================================================ */
(function () {
  function montar(rail) {
    const trilha = document.createElement("div");
    trilha.className = "trilha";
    rail.parentNode.insertBefore(trilha, rail);

    const seta = (lado, rotulo) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "trilha-seta trilha-seta--" + lado;
      b.setAttribute("aria-label", rotulo);
      return b;
    };
    const ini = seta("ini", "Ver etapas anteriores");
    const fim = seta("fim", "Ver próximas etapas");

    const barra = document.createElement("div");
    barra.className = "trilha-barra";
    // Só indica posição: quem rola é o rail (a barra não é arrastável).
    barra.setAttribute("aria-hidden", "true");
    const polegar = document.createElement("span");
    barra.appendChild(polegar);

    trilha.append(ini, rail, fim, barra);
    return { trilha, ini, fim, barra, polegar };
  }

  function iniciar() {
    const rail = document.querySelector(".cemig-form .sidebar");
    if (!rail || rail.closest(".trilha")) return;
    const { trilha, ini, fim, barra, polegar } = montar(rail);

    // Sobra de rolagem em cada ponta. O -1 absorve o arredondamento
    // subpixel do zoom/DPI, que senão deixa a seta final acesa para sempre.
    function medir() {
      const sobra = rail.scrollWidth - rail.clientWidth;
      const rolavel = sobra > 1;
      trilha.classList.toggle("rolavel", rolavel);
      trilha.classList.toggle("tem-ini", rolavel && rail.scrollLeft > 1);
      trilha.classList.toggle("tem-fim", rolavel && rail.scrollLeft < sobra - 1);
      if (!rolavel) return;
      const visivel = rail.clientWidth / rail.scrollWidth;
      polegar.style.width = (visivel * 100).toFixed(2) + "%";
      polegar.style.transform =
        "translateX(" +
        ((rail.scrollLeft / rail.scrollWidth) * barra.clientWidth).toFixed(1) +
        "px)";
    }

    // Um passo de seta = quase uma tela, guardando um chip de contexto.
    const rolar = (dir) =>
      rail.scrollBy({ left: dir * rail.clientWidth * 0.75, behavior: "smooth" });
    ini.addEventListener("click", () => rolar(-1));
    fim.addEventListener("click", () => rolar(1));

    rail.addEventListener("scroll", medir, { passive: true });
    // Reflui quando a tela gira, quando o teclado virtual muda a viewport e
    // quando um fluxo esconde/mostra etapas (BT condomínio × coletivo).
    if (window.ResizeObserver) new ResizeObserver(medir).observe(rail);
    else window.addEventListener("resize", medir);

    // Traz a etapa atual para o centro do rail. Mexe só no scroll do próprio
    // rail — `scrollIntoView` arrastaria a página junto. A conta sai de
    // retângulos, e não de offsetLeft: o offsetParent do chip muda com o
    // breakpoint (a .sidebar é `sticky` no desktop e estática aqui).
    function centralizarAtiva() {
      const ativa = rail.querySelector(".vstep.active");
      if (!ativa || rail.scrollWidth <= rail.clientWidth) return;
      const chip = ativa.getBoundingClientRect();
      const fita = rail.getBoundingClientRect();
      rail.scrollBy({
        left: chip.left - fita.left - (fita.width - chip.width) / 2,
        behavior: "smooth",
      });
    }

    // Os apps trocam de etapa mexendo em `class` (.active/.done) e, nos
    // formulários com fluxos alternativos, em `hidden`. Observar o rail cobre
    // os 7 sem que nenhum precise avisar este módulo.
    //
    // Uma troca de etapa é uma rajada de mutações (o app remarca .done/.active
    // chip a chip, e micro/mini ainda renumeram). Sem juntar tudo num quadro
    // só, cada mutação dispararia a sua rolagem suave por cima da anterior.
    let agendado = false;
    new MutationObserver(() => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => {
        agendado = false;
        medir();
        centralizarAtiva();
      });
    }).observe(rail, {
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "hidden"],
    });

    medir();
    centralizarAtiva();
  }

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", iniciar);
  else iniciar();
})();
