/* ============================================================
   CEMIG — Renderizador do PDF (DOM → jsPDF)
   ------------------------------------------------------------
   O documento do PDF é HTML de verdade, estilizado por
   css/pdf/*.css e paginado em JS (bt/js/pdf-doc.js). Este módulo é
   o passo final: lê o documento JÁ PAGINADO e o redesenha em jsPDF,
   para que o clique BAIXE o .pdf em vez de abrir o diálogo de
   impressão do navegador — e para que o modal de sucesso só apareça
   quando o arquivo saiu de fato.

   Por que não jsPDF.html()/html2pdf: os dois passam por html2canvas
   e RASTERIZAM a página. O texto sairia como imagem, sem seleção
   nem busca. Aqui o layout continua sendo do navegador (quebra de
   linha, largura de coluna, altura de cartão, paginação) e só a
   PINTURA muda de dono: cada linha vira texto vetorial de verdade.

   O leitor é genérico: tudo sai de getComputedStyle (fundo, borda,
   raio, fonte, peso, cor) e da geometria real de cada linha
   (Range.getBoundingClientRect). Nenhuma classe de css/pdf/*.css
   aparece aqui — componente novo no CSS sai no PDF sem tocar neste
   arquivo. É o que permite reaproveitar o motor nos demais
   formulários.

   Contrato:
     await renderizarPdfDoc(docEl, { arquivo, titulo });
   com o docEl VISÍVEL AO LAYOUT (a classe .pdf-doc--montando, que o
   põe fora da viewport em vez de display:none) — é dele que saem
   todas as coordenadas.
   ============================================================ */
(function () {
  /* Resolvido a partir deste próprio script: as páginas de
     formulário estão um nível abaixo da raiz, mas quem sabe onde
     ficam as fontes é shared/js/, não o chamador. */
  var BASE = (document.currentScript && document.currentScript.src) || "";

  var FONTE_NOME = "OpenSans";
  var FONTE_ARQUIVOS = {
    normal: "OpenSans-Regular.ttf",
    bold: "OpenSans-Bold.ttf",
  };

  /* Métricas do Open Sans (OS/2 sTypoAscender 2189 e sTypoDescender
     −600 sobre unitsPerEm 2048, com USE_TYPO_METRICS ligado). Só
     entram se o canvas não expuser fontBoundingBox*. */
  var METRICAS_PADRAO = { asc: 2189 / 2048, desc: 600 / 2048 };

  /* ============================================================
     1. Utilidades
     ============================================================ */

  /* "rgb(15, 108, 88)", "rgba(0, 0, 0, 0)", "rgb(15 108 88 / 50%)".
     Devolve null para o que não pinta nada. */
  function cor(valor) {
    var m = String(valor).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    var p = m[1]
      .split(/[,\s/]+/)
      .filter(Boolean)
      .map(parseFloat);
    if (p.length > 3 && !p[3]) return null;
    return { r: p[0], g: p[1], b: p[2] };
  }

  /* btoa não aceita ArrayBuffer, e String.fromCharCode.apply estoura
     a pilha com os ~51 KB de uma fonte inteira: vai em blocos. */
  function base64(buffer) {
    var bytes = new Uint8Array(buffer);
    var partes = [];
    for (var i = 0; i < bytes.length; i += 8192)
      partes.push(String.fromCharCode.apply(null, bytes.subarray(i, i + 8192)));
    return btoa(partes.join(""));
  }

  /* ============================================================
     2. Fonte embutida
     ------------------------------------------------------------
     O jsPDF só traz Helvetica/Times/Courier. Sem embutir a Open
     Sans o PDF sairia com fonte diferente da que o navegador MEDIU,
     e cada linha desenhada teria largura diferente da caixa em que
     foi paginada. Os .ttf são buscados só no clique (nada muda no
     carregamento da página) e ficam em cache entre exportações.
     ============================================================ */

  var fonteEmCache = null;

  function carregarFonte() {
    if (fonteEmCache) return fonteEmCache;
    fonteEmCache = Promise.all(
      Object.keys(FONTE_ARQUIVOS).map(function (estilo) {
        var url = new URL("../../fonts/" + FONTE_ARQUIVOS[estilo], BASE).href;
        return fetch(url)
          .then(function (r) {
            if (!r.ok) throw new Error("HTTP " + r.status + " em " + url);
            return r.arrayBuffer();
          })
          .then(function (buf) {
            return [estilo, base64(buf)];
          });
      }),
    ).catch(function (e) {
      fonteEmCache = null; // permite nova tentativa num clique posterior
      throw e;
    });
    return fonteEmCache;
  }

  async function registrarFonte(doc) {
    try {
      const pares = await carregarFonte();
      pares.forEach(function (par) {
        var arquivo = FONTE_ARQUIVOS[par[0]];
        doc.addFileToVFS(arquivo, par[1]);
        doc.addFont(arquivo, FONTE_NOME, par[0]);
      });
      return FONTE_NOME;
    } catch (e) {
      /* Melhor um PDF em Helvetica que um botão que não responde: o
         casamento de largura abaixo mantém o desenho nas caixas. */
      console.warn("[PDF] Open Sans indisponível; desenhando em Helvetica", e);
      return "helvetica";
    }
  }

  /* Proporções de ascendente/descendente da fonte, para achar a
     baseline dentro da caixa de linha. Medidas a 100px e guardadas
     por família+peso. */
  var metricasEmCache = new Map();

  function metricas(familia, peso) {
    var chave = peso + "|" + familia;
    var m = metricasEmCache.get(chave);
    if (m) return m;
    m = METRICAS_PADRAO;
    try {
      var ctx = document.createElement("canvas").getContext("2d");
      ctx.font = (peso === "bold" ? "700" : "400") + " 100px " + familia;
      var t = ctx.measureText("Ãgy");
      if (t.fontBoundingBoxAscent && t.fontBoundingBoxDescent)
        m = {
          asc: t.fontBoundingBoxAscent / 100,
          desc: t.fontBoundingBoxDescent / 100,
        };
    } catch (e) {
      /* fica com as métricas tabeladas do Open Sans */
    }
    metricasEmCache.set(chave, m);
    return m;
  }

  /* ============================================================
     3. Linhas visuais de um nó de texto
     ------------------------------------------------------------
     Quem quebrou o texto em linhas foi o navegador; aqui só
     perguntamos ONDE cada linha ficou. Varre os caracteres com um
     Range e agrupa os que dividem o mesmo topo. Como a geometria
     vem pronta, o alinhamento (direita nas colunas numéricas,
     centro na assinatura), o recuo e a quebra saem de graça — não
     há uma segunda implementação de layout aqui.
     ============================================================ */

  function linhasVisuais(no) {
    var txt = no.nodeValue;
    var r = document.createRange();
    var grupos = [];
    var atual = null;
    for (var i = 0; i < txt.length; i += 1) {
      r.setStart(no, i);
      r.setEnd(no, i + 1);
      var caixa = r.getBoundingClientRect();
      /* Espaço colapsado numa quebra não gera caixa: fica na linha
         aberta e some no aparo abaixo. */
      if (!caixa.width && !caixa.height) {
        if (atual) atual.fim = i + 1;
        continue;
      }
      if (!atual || Math.abs(caixa.top - atual.topo) > 0.5) {
        atual = { topo: caixa.top, ini: i, fim: i + 1 };
        grupos.push(atual);
      } else {
        atual.fim = i + 1;
      }
    }

    var linhas = [];
    grupos.forEach(function (g) {
      var ini = g.ini;
      var fim = g.fim;
      /* O espaço de uma quebra pertence às duas linhas; sem aparar,
         a largura medida embutiria um branco que o desenho não tem. */
      while (ini < fim && !/\S/.test(txt[ini])) ini += 1;
      while (fim > ini && !/\S/.test(txt[fim - 1])) fim -= 1;
      if (fim <= ini) return;
      r.setStart(no, ini);
      r.setEnd(no, fim);
      linhas.push({
        texto: txt.slice(ini, fim),
        caixa: r.getBoundingClientRect(),
      });
    });
    return linhas;
  }

  /* ============================================================
     4. Pintura
     ============================================================ */

  function pintarTexto(doc, no, cs, ctx) {
    var tinta = cor(cs.color);
    if (!tinta) return;
    var linhas = linhasVisuais(no);
    if (!linhas.length) return;

    var corpo = parseFloat(cs.fontSize) * ctx.escala;
    var peso =
      (parseInt(cs.fontWeight, 10) || (cs.fontWeight === "bold" ? 700 : 400)) >=
      600
        ? "bold"
        : "normal";
    var m = metricas(cs.fontFamily, peso);

    doc.setFont(ctx.fonte, peso);
    doc.setFontSize(corpo);
    doc.setTextColor(tinta.r, tinta.g, tinta.b);

    linhas.forEach(function (linha) {
      var x = (linha.caixa.left - ctx.base.left) * ctx.escala;
      var topo = (linha.caixa.top - ctx.base.top) * ctx.escala;
      var altura = linha.caixa.height * ctx.escala;
      var largura = linha.caixa.width * ctx.escala;
      /* A caixa do Range tem a altura do line-height; a baseline
         fica depois da meia-entrelinha mais o ascendente. */
      var y = topo + (altura - (m.asc + m.desc) * corpo) / 2 + m.asc * corpo;

      /* Rede de segurança: se a fonte do PDF não for exatamente a
         que o navegador mediu (o fallback Helvetica), a linha nasce
         mais estreita ou mais larga que a caixa em que foi
         paginada. O espaçamento entre caracteres devolve a largura
         exata, e com isso a coluna volta a fechar. */
      var natural = doc.getTextWidth(linha.texto);
      var folga = largura - natural;
      var ajustavel =
        linha.texto.length > 1 &&
        Math.abs(folga) > 0.15 &&
        Math.abs(folga) < largura * 0.25;
      if (ajustavel) doc.setCharSpace(folga / (linha.texto.length - 1));
      doc.text(linha.texto, x, y, { baseline: "alphabetic" });
      if (ajustavel) doc.setCharSpace(0);
    });
  }

  function pintarImagem(doc, img, g) {
    /* O logo é SVG: rasteriza a 4x o tamanho final para não sair
       serrilhado no zoom do leitor de PDF. Não é texto, então não
       há perda de seleção. */
    try {
      var tela = document.createElement("canvas");
      tela.width = Math.max(1, Math.round(g.w * 4));
      tela.height = Math.max(1, Math.round(g.h * 4));
      tela.getContext("2d").drawImage(img, 0, 0, tela.width, tela.height);
      doc.addImage(tela.toDataURL("image/png"), "PNG", g.x, g.y, g.w, g.h);
    } catch (e) {
      console.warn("[PDF] imagem não pôde ser desenhada:", img.src, e);
    }
  }

  var LADOS = [
    ["Top", "top"],
    ["Right", "right"],
    ["Bottom", "bottom"],
    ["Left", "left"],
  ];

  /* O Chrome TRUNCA border-width para px inteiro (1pt vira 1px, 2pt
     vira 2px), então nenhuma borda do layout mede o que o CSS pediu:
     sai sempre em múltiplos de 0.75pt. Sem corrigir, dois traços
     escritos com o mesmo token de 2pt sairiam com pesos diferentes —
     o .pdf-filete, que é altura de um bloco, em 2pt; a borda do
     .pdf-total, em 1.5pt.

     A folha do PDF é escrita inteiramente em pt (ver o cabeçalho de
     css/pdf/variables-pdf.css), então devolvemos o pt cheio quando
     ele é o ÚNICO que o navegador teria truncado para essa largura.
     Quando não há candidato único (bordas fracionárias, que a folha
     não usa), fica o que o navegador mediu. */
  function bordaAutoral(usada) {
    var cheio = Math.ceil(usada);
    return cheio >= usada && cheio < usada + 0.75 ? cheio : usada;
  }

  function pintarCaixa(doc, el, cs, g, ctx) {
    var fundo = cor(cs.backgroundColor);
    var raio = parseFloat(cs.borderTopLeftRadius) * ctx.escala || 0;
    if (raio) raio = Math.min(raio, g.w / 2, g.h / 2);

    if (fundo) {
      doc.setFillColor(fundo.r, fundo.g, fundo.b);
      if (raio) doc.roundedRect(g.x, g.y, g.w, g.h, raio, raio, "F");
      else doc.rect(g.x, g.y, g.w, g.h, "F");
    }

    var bordas = LADOS.map(function (lado) {
      var estilo = cs["border" + lado[0] + "Style"];
      var esp = parseFloat(cs["border" + lado[0] + "Width"]) * ctx.escala;
      if (!esp || estilo === "none" || estilo === "hidden") return null;
      return {
        lado: lado[1],
        esp: bordaAutoral(esp),
        tinta: cor(cs["border" + lado[0] + "Color"]),
      };
    }).filter(function (b) {
      return b && b.tinta;
    });
    if (!bordas.length) return;

    /* Borda igual nos quatro lados com raio (o cartão de destaque):
       um retângulo arredondado só. O jsPDF traça CENTRADO no
       caminho e o CSS desenha para DENTRO da caixa, daí a meia
       espessura de recuo. */
    var uniforme =
      bordas.length === 4 &&
      bordas.every(function (b) {
        return (
          b.esp === bordas[0].esp &&
          b.tinta.r === bordas[0].tinta.r &&
          b.tinta.g === bordas[0].tinta.g &&
          b.tinta.b === bordas[0].tinta.b
        );
      });
    if (uniforme && raio) {
      var e = bordas[0].esp;
      doc.setDrawColor(bordas[0].tinta.r, bordas[0].tinta.g, bordas[0].tinta.b);
      doc.setLineWidth(e);
      doc.roundedRect(
        g.x + e / 2,
        g.y + e / 2,
        g.w - e,
        g.h - e,
        Math.max(0, raio - e / 2),
        Math.max(0, raio - e / 2),
        "S",
      );
      return;
    }

    bordas.forEach(function (b) {
      doc.setDrawColor(b.tinta.r, b.tinta.g, b.tinta.b);
      doc.setLineWidth(b.esp);
      var meia = b.esp / 2;
      if (b.lado === "top") doc.line(g.x, g.y + meia, g.x + g.w, g.y + meia);
      else if (b.lado === "bottom")
        doc.line(g.x, g.y + g.h - meia, g.x + g.w, g.y + g.h - meia);
      else if (b.lado === "left")
        doc.line(g.x + meia, g.y, g.x + meia, g.y + g.h);
      else doc.line(g.x + g.w - meia, g.y, g.x + g.w - meia, g.y + g.h);
    });
  }

  /* ============================================================
     5. Percurso
     ------------------------------------------------------------
     Pai antes dos filhos: é o que reproduz a ordem de pintura do
     navegador (fundo da folha, depois a borda do cartão, depois o
     texto por cima).
     ============================================================ */

  function percorrer(doc, el, ctx) {
    var cs = getComputedStyle(el);
    if (cs.display === "none") return;

    var caixa = el.getBoundingClientRect();
    var g = {
      x: (caixa.left - ctx.base.left) * ctx.escala,
      y: (caixa.top - ctx.base.top) * ctx.escala,
      w: caixa.width * ctx.escala,
      h: caixa.height * ctx.escala,
    };
    /* A .pdf-pagina corta o que transborda (o paginador avisa no
       console quando isso acontece); o desenho respeita o mesmo
       limite em vez de vazar para fora da folha. */
    if (g.y > ctx.altura + 1 || g.y + g.h < -1) return;

    if (el.tagName === "IMG") pintarImagem(doc, el, g);
    else pintarCaixa(doc, el, cs, g, ctx);

    for (var no = el.firstChild; no; no = no.nextSibling) {
      if (no.nodeType === 3) {
        if (/\S/.test(no.nodeValue)) pintarTexto(doc, no, cs, ctx);
      } else if (no.nodeType === 1) {
        percorrer(doc, no, ctx);
      }
    }
  }

  /* ============================================================
     6. Exportação
     ============================================================ */

  /* O tamanho da folha vem do MESMO token que o CSS usa para
     desenhá-la, e não do formato "a4" do jsPDF (595.28 x 841.89):
     com os dois iguais, 1pt do CSS é 1pt do PDF. */
  function dimensoes(docEl) {
    var cs = getComputedStyle(docEl);
    return {
      larg: parseFloat(cs.getPropertyValue("--pdf-pagina-largura")) || 595,
      alt: parseFloat(cs.getPropertyValue("--pdf-pagina-altura")) || 842,
    };
  }

  async function renderizarPdfDoc(docEl, opcoes) {
    var o = opcoes || {};
    await window.CemigLibs.jspdf().catch(function () {});
    if (!window.jspdf) {
      alert("Biblioteca jsPDF não carregada.");
      return false;
    }

    var paginas = docEl.querySelectorAll(".pdf-pagina");
    if (!paginas.length) throw new Error("documento do PDF sem páginas");

    var dim = dimensoes(docEl);
    var doc = new window.jspdf.jsPDF({
      unit: "pt",
      format: [dim.larg, dim.alt],
      compress: true,
    });
    var fonte = await registrarFonte(doc);

    paginas.forEach(function (pagina, i) {
      if (i) doc.addPage([dim.larg, dim.alt]);
      var base = pagina.getBoundingClientRect();
      percorrer(doc, pagina, {
        base: base,
        /* Calibrada pela própria folha: converte px em pt e absorve
           qualquer zoom da página. */
        escala: dim.larg / base.width,
        altura: dim.alt,
        fonte: fonte,
      });
    });

    doc.setProperties({
      title: o.titulo || "",
      creator: "CEMIG — Formulários",
    });
    if (doc.setLanguage) doc.setLanguage("pt-BR");
    doc.save(o.arquivo || "documento.pdf");
    return true;
  }

  window.renderizarPdfDoc = renderizarPdfDoc;
})();
