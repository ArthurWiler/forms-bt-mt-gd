/* ============================================================
   CEMIG MT — Geração dos PDFs (jsPDF)
   Substitui a exportação via window.print(): saída determinística,
   independente do navegador e das margens escolhidas pelo usuário,
   e visualmente igual aos formulários BT/Micro/Mini (mesmo chassi
   shared/js/gd-pdf-base.js).

   Este módulo é só RENDERIZAÇÃO. O que cada documento contém vem de
   mt/js/conteudo.js — a mesma fonte que alimenta a prévia da tela.
   ============================================================ */

/* Carrega uma imagem local e devolve dataURL + dimensões (jsPDF não
   aceita caminho de arquivo). Resolve com null se falhar: o PDF sai
   sem o desenho em vez de não sair. */
function _carregarImagemPdfMT(src) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const cv = document.createElement("canvas");
        cv.width = img.naturalWidth;
        cv.height = img.naturalHeight;
        cv.getContext("2d").drawImage(img, 0, 0);
        resolve({
          url: cv.toDataURL("image/png"),
          w: img.naturalWidth,
          h: img.naturalHeight,
        });
      } catch (e) {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

/* Texto corrido sem rótulo (notas, avisos). Usar P.fullLine("", …) sairia
   com um ":" solto, então desenha direto com quebra automática. */
function _paragrafoPdfMT(P, texto) {
  const linhas = P.doc.splitTextToSize(String(texto), P.CW - 2);
  P.checkSpace(2 + linhas.length * 4.2);
  P.doc.setFont("helvetica", "normal");
  P.doc.setFontSize(9);
  P.doc.setTextColor(30, 32, 42);
  P.doc.text(linhas, P.MG + 1, P.state.cy + 4.5);
  P.state.cy += 2 + linhas.length * 4.2;
}

/* Desenha uma lista de campos do modelo de conteúdo. `imagens` é um
   mapa src->{url,w,h} pré-carregado (jsPDF é síncrono). */
function _renderCamposPdfMT(P, campos, imagens) {
  const vazio = (v) =>
    v === undefined || v === null || String(v).trim() === "";
  // Campos curtos consecutivos vão em 2 colunas (kvPairs); os `full`,
  // tabelas e imagens ocupam a linha inteira. Acumula os curtos e
  // descarrega ao encontrar um campo largo.
  let buffer = [];
  const descarregar = () => {
    if (buffer.length) {
      P.kvPairs(buffer.map((c) => [c.label, c.valor]));
      buffer = [];
    }
  };

  campos.forEach((c) => {
    if (c.tipo === "tabela") {
      if (!c.rows || !c.rows.length) return;
      descarregar();
      if (c.label) {
        P.gap(1);
        P.subSec(c.label);
      }
      const rows = c.rodape ? c.rows.concat([c.rodape]) : c.rows;
      P.tabela(c.headers, c.widths, rows);
      P.gap(3);
      return;
    }
    if (c.tipo === "imagem") {
      descarregar();
      const im = imagens && imagens[c.src];
      if (im) {
        // Escala para caber na coluna preservando a proporção.
        const maxW = Math.min(P.CW, 120);
        const w = maxW;
        const h = (im.h / im.w) * w;
        P.checkSpace(h + 6);
        P.doc.addImage(im.url, "PNG", P.MG + 1, P.state.cy, w, h);
        P.state.cy += h + 3;
      }
      if (!vazio(c.valor)) P.fullLine(c.label, c.valor);
      return;
    }
    // texto
    if (vazio(c.valor)) return;
    if (c.full || !c.label || String(c.valor).length > 60) {
      descarregar();
      // Campos sem rótulo (avisos) saem como texto corrido.
      if (!c.label) _paragrafoPdfMT(P, c.valor);
      else P.fullLine(c.label, c.valor);
    } else {
      buffer.push(c);
    }
  });
  descarregar();
}

/* Nome de arquivo seguro a partir do nome do cliente. */
function _nomeArqMT(prefixo) {
  const nome = (state.nome || "Cliente")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 30);
  return `${prefixo}_${nome}.pdf`;
}

function _dataExtensoMT() {
  const h = new Date();
  return `${String(h.getDate()).padStart(2, "0")} de ${h.toLocaleDateString("pt-BR", { month: "long" })} de ${h.getFullYear()}`;
}

/* ============================================================
   1. Formulário principal
   ============================================================ */
async function gerarPdfFormularioMT() {
  if (!window.jspdf) {
    alert("Biblioteca jsPDF não carregada.");
    return;
  }
  syncState();
  const secoes = conteudoFormularioMT();

  // Pré-carrega as imagens referenciadas (o desenho do ramal).
  const imagens = {};
  for (const s of secoes)
    for (const c of s.campos)
      if (c.tipo === "imagem" && c.src && !imagens[c.src])
        imagens[c.src] = await _carregarImagemPdfMT(c.src);

  const P = criarPdfGD(
    "FORMULÁRIO DE LIGAÇÃO NOVA E ALTERAÇÃO DE CARGA",
    "Média Tensão" + (state.atividade ? " — " + state.atividade : ""),
  );
  secoes.forEach((s) => {
    P.sec(s.titulo.toUpperCase());
    _renderCamposPdfMT(P, s.campos, imagens);
    P.gap(2);
  });
  P.gap(4);
  P.assinatura(
    "Local e data / Assinatura do proprietário ou representante legal",
  );
  P.save(_nomeArqMT("CEMIG_MT"));
}

/* ============================================================
   2. Análise de Partida de Motores — uma página por motor
   ============================================================ */
function gerarPdfAnalisePartidaMT() {
  if (!window.jspdf) {
    alert("Biblioteca jsPDF não carregada.");
    return;
  }
  syncState();
  const folhas = conteudoAnalisePartida();
  const P = criarPdfGD(
    "FORMULÁRIO PARA A ANÁLISE DE PARTIDA DE MOTORES",
    "Média Tensão",
  );

  folhas.forEach((folha, i) => {
    if (i > 0) {
      P.doc.addPage();
      P.state.cy = P.MG;
      P.header();
    }
    folha.secoes.forEach((s) => {
      P.sec(s.titulo);
      _renderCamposPdfMT(P, s.campos, null);
      P.gap(1);
    });
    P.gap(2);
    P.sec("NOTAS");
    NOTAS_MOTORES.forEach((n) => _paragrafoPdfMT(P, n));
    P.gap(2);
    P.fullLine("Data", _dataExtensoMT());
    P.assinatura("Responsável pelas informações");
  });

  P.save(_nomeArqMT("Analise_Partida_Motores"));
}

/* ============================================================
   3. Solicitação de Desconto para Irrigante / Aquicultor
   ============================================================ */
function gerarPdfIrriganteMT() {
  if (!window.jspdf) {
    alert("Biblioteca jsPDF não carregada.");
    return;
  }
  syncState();
  const P = criarPdfGD(
    "SOLICITAÇÃO DE DESCONTO PARA IRRIGANTE / AQUICULTOR",
    "Média Tensão",
  );
  conteudoIrrigante().forEach((s) => {
    P.sec(s.titulo);
    _renderCamposPdfMT(P, s.campos, null);
    P.gap(1);
  });
  P.gap(2);
  P.sec("NOTAS");
  NOTAS_IRRIGANTE.forEach((n) => _paragrafoPdfMT(P, n));
  P.gap(2);
  P.fullLine("Data", _dataExtensoMT());
  P.assinatura("Responsável pelas informações");
  P.save(_nomeArqMT("Solicitacao_Desconto_Irrigante"));
}
