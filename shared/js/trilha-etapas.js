/* ============================================================
   CEMIG — Fitas roláveis (trilha de etapas e chips de torre)
   ------------------------------------------------------------
   Duas listas do formulário rolam na horizontal e por isso cortam conteúdo
   nas bordas (spec do Figma):

     • a trilha de etapas (`.sidebar`), que no mobile deixa de ser coluna;
     • os chips de torre (`.torre-chips`), roláveis em qualquer largura.

   Este módulo monta, em volta de cada uma, o que a rolagem exige e o HTML
   não traz:

     <div class="trilha trilha--etapas">   ← invólucro (grade de 1 coluna)
       <button class="trilha-seta trilha-seta--ini">
       <aside class="sidebar trilha-fita">…   ← a fita, intacta por dentro
       <button class="trilha-seta trilha-seta--fim">
       <div class="trilha-barra"><span></span></div>

   Estado (classes no invólucro, o CSS faz o resto):
     .tem-ini / .tem-fim — ainda há item escondido daquele lado; liga a seta
                           e o fade da borda correspondente.
     .rolavel            — a fita não cabe inteira; mostra a barra.

   Tudo isto é enfeite de rolagem: quando a fita cabe na tela nenhuma classe
   entra e nada aparece — é o caso da trilha de etapas no desktop, onde o
   invólucro ainda por cima se dissolve (`display: contents`).
   ============================================================ */
(function () {
  const FITAS = [
    {
      seletor: ".cemig-form .sidebar",
      tipo: "etapas",
      ativo: ".vstep.active",
      rotulos: ["Ver etapas anteriores", "Ver próximas etapas"],
    },
    {
      seletor: ".cemig-form .torre-chips",
      tipo: "torres",
      ativo: ".torre-chip.on",
      rotulos: ["Ver torres anteriores", "Ver próximas torres"],
    },
  ];

  function montar(fita, spec) {
    const trilha = document.createElement("div");
    trilha.className = "trilha trilha--" + spec.tipo;
    fita.parentNode.insertBefore(trilha, fita);
    fita.classList.add("trilha-fita");

    const seta = (lado, rotulo) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "trilha-seta trilha-seta--" + lado;
      b.setAttribute("aria-label", rotulo);
      return b;
    };
    const ini = seta("ini", spec.rotulos[0]);
    const fim = seta("fim", spec.rotulos[1]);

    const barra = document.createElement("div");
    barra.className = "trilha-barra";
    // Só indica posição: quem rola é a fita (a barra não é arrastável).
    barra.setAttribute("aria-hidden", "true");
    const polegar = document.createElement("span");
    barra.appendChild(polegar);

    trilha.append(ini, fita, fim, barra);

    // Sobra de rolagem em cada ponta. O -1 absorve o arredondamento
    // subpixel do zoom/DPI, que senão deixa a seta final acesa para sempre.
    function medir() {
      const sobra = fita.scrollWidth - fita.clientWidth;
      const rolavel = sobra > 1;
      trilha.classList.toggle("rolavel", rolavel);
      trilha.classList.toggle("tem-ini", rolavel && fita.scrollLeft > 1);
      trilha.classList.toggle("tem-fim", rolavel && fita.scrollLeft < sobra - 1);
      if (!rolavel) return;
      polegar.style.width =
        ((fita.clientWidth / fita.scrollWidth) * 100).toFixed(2) + "%";
      polegar.style.transform =
        "translateX(" +
        ((fita.scrollLeft / fita.scrollWidth) * barra.clientWidth).toFixed(1) +
        "px)";
    }

    // Posição de cada item dentro do conteúdo rolável (não do documento):
    // rects em vez de offsetLeft porque o offsetParent muda com o breakpoint.
    function itens() {
      const caixa = fita.getBoundingClientRect();
      return Array.from(fita.children)
        .filter((el) => el.getBoundingClientRect().width > 0)
        .map((el) => {
          const r = el.getBoundingClientRect();
          return {
            ini: r.left - caixa.left + fita.scrollLeft,
            fim: r.right - caixa.left + fita.scrollLeft,
          };
        });
    }
    const recuo = () =>
      parseFloat(getComputedStyle(fita).getPropertyValue("--trilha-recuo")) || 0;

    // Uma seta avança/volta uma "página" e sempre PARA NUM ITEM: o primeiro do
    // conjunto seguinte encosta no recuo (logo depois da seta), inteiro, em vez
    // de aparecer cortado na borda esquerda. As posições válidas são, portanto,
    // `início do item − recuo` — e o zero, onde não há seta nem fade.
    //
    // Parada de um item: o scroll que o encosta no recuo, dentro dos limites.
    const parada = (item, r, max) =>
      Math.max(0, Math.min(max, item.ini - r));

    // Avançar a partir de `de`: abre no primeiro item que dali não caberia
    // inteiro na área legível (a que sobra depois do fade da direita), de modo
    // que nenhum item seja pulado entre uma página e a seguinte.
    function avancarDe(de, r, lista, max) {
      const prox = lista.find((i) => i.fim > de + fita.clientWidth - r + 1);
      const alvo = prox ? parada(prox, r, max) : max;
      return alvo <= de ? max : alvo;
    }

    function rolar(dir) {
      const r = recuo();
      const lista = itens();
      const max = fita.scrollWidth - fita.clientWidth;
      const aqui = fita.scrollLeft;
      let alvo;
      if (dir > 0) {
        alvo = avancarDe(aqui, r, lista, max);
      } else {
        // Voltar é o inverso exato de avançar: a PRIMEIRA parada anterior de
        // onde um "avançar" cairia aqui. Pegar a primeira (e não a última)
        // devolve exatamente a página de onde se veio — o caminho de volta
        // repete o da ida, sem paradas intermediárias que a ida não fez.
        const paradas = [0]
          .concat(lista.map((i) => parada(i, r, max)))
          .filter((p) => p < aqui - 1);
        alvo = 0;
        for (let k = 0; k < paradas.length; k++)
          if (avancarDe(paradas[k], r, lista, max) >= aqui - 1) {
            alvo = paradas[k];
            break;
          }
      }
      fita.scrollTo({ left: alvo, behavior: "smooth" });
    }
    ini.addEventListener("click", () => rolar(-1));
    fim.addEventListener("click", () => rolar(1));

    // ---- Arrastar com o mouse ----
    // O toque já rola nativamente (com inércia), então o gesto só é capturado
    // para mouse/caneta. Enquanto o ponteiro não anda o suficiente nada
    // acontece: o clique no chip continua sendo um clique.
    const LIMIAR = 4;
    let partida = null;
    let arrastou = false;
    fita.addEventListener("pointerdown", (e) => {
      arrastou = false;
      if (e.pointerType === "touch" || e.button !== 0) return;
      if (fita.scrollWidth <= fita.clientWidth) return;
      partida = { x: e.clientX, scroll: fita.scrollLeft, id: e.pointerId };
    });
    fita.addEventListener("pointermove", (e) => {
      if (!partida || e.pointerId !== partida.id) return;
      const dx = e.clientX - partida.x;
      if (!arrastou) {
        if (Math.abs(dx) < LIMIAR) return;
        arrastou = true;
        trilha.classList.add("arrastando");
        // Com a captura, o arrasto sobrevive ao ponteiro sair da fita.
        if (fita.setPointerCapture) fita.setPointerCapture(e.pointerId);
      }
      fita.scrollLeft = partida.scroll - dx;
    });
    const soltar = () => {
      partida = null;
      trilha.classList.remove("arrastando");
    };
    fita.addEventListener("pointerup", soltar);
    fita.addEventListener("pointercancel", soltar);
    // Soltar em cima de um chip dispara o clique dele: o arrasto engole esse
    // clique (e só ele — `arrastou` zera no próximo pointerdown).
    fita.addEventListener(
      "click",
      (e) => {
        if (!arrastou) return;
        e.preventDefault();
        e.stopPropagation();
      },
      true,
    );

    fita.addEventListener("scroll", medir, { passive: true });
    // Reflui quando a tela gira, quando o teclado virtual muda a viewport e
    // quando um fluxo esconde/mostra etapas (BT condomínio × coletivo).
    if (window.ResizeObserver) new ResizeObserver(medir).observe(fita);
    else window.addEventListener("resize", medir);

    // Traz o item atual para o centro da fita. Mexe só no scroll da própria
    // fita — `scrollIntoView` arrastaria a página junto. A conta sai de
    // retângulos, e não de offsetLeft: o offsetParent do item muda com o
    // breakpoint (a .sidebar é `sticky` no desktop e estática no mobile).
    function centralizarAtivo() {
      const ativo = fita.querySelector(spec.ativo);
      if (!ativo || fita.scrollWidth <= fita.clientWidth) return;
      const item = ativo.getBoundingClientRect();
      const caixa = fita.getBoundingClientRect();
      fita.scrollBy({
        left: item.left - caixa.left - (caixa.width - item.width) / 2,
        behavior: "smooth",
      });
    }

    // Os apps trocam de etapa mexendo em `class` (.active/.done) e, nos
    // formulários com fluxos alternativos, em `hidden`; os chips de torre são
    // remontados inteiros (innerHTML), daí o `childList`. Observar a fita
    // cobre todos os casos sem que nenhum app precise avisar este módulo.
    //
    // Uma troca é uma rajada de mutações (o app remarca item a item, e
    // micro/mini ainda renumeram). Sem juntar tudo num quadro só, cada
    // mutação dispararia a sua rolagem suave por cima da anterior.
    let agendado = false;
    new MutationObserver(() => {
      if (agendado) return;
      agendado = true;
      requestAnimationFrame(() => {
        agendado = false;
        medir();
        centralizarAtivo();
      });
    }).observe(fita, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["class", "hidden"],
    });

    medir();
    centralizarAtivo();
  }

  function escanear() {
    FITAS.forEach((spec) =>
      document.querySelectorAll(spec.seletor).forEach((fita) => {
        if (!fita.classList.contains("trilha-fita")) montar(fita, spec);
      }),
    );
  }

  // `.torre-chips` mora num fragmento de etapa (buscado por fetch), então não
  // existe no DOMContentLoaded. Em vez de cronometrar o carregador, varremos
  // de novo a cada rajada de mudança no DOM — a varredura é um seletor
  // simples, e o próprio invólucro que montamos só dispara uma passada extra
  // (na qual nada mais é encontrado).
  let varrer = false;
  new MutationObserver(() => {
    if (varrer) return;
    varrer = true;
    requestAnimationFrame(() => {
      varrer = false;
      escanear();
    });
  }).observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading")
    document.addEventListener("DOMContentLoaded", escanear);
  else escanear();
})();
