/* ============================================================
   CEMIG MT — Geração dos PDFs COMPLEMENTARES (jsPDF)
   Análise de Partida de Motores e Solicitação de Desconto para
   Irrigante. Saída determinística, independente do navegador e das
   margens escolhidas pelo usuário, e visualmente igual aos
   formulários Micro/Mini (mesmo chassi shared/js/gd-pdf-base.js).

   O FORMULÁRIO principal não sai mais daqui: ele é HTML de verdade,
   montado em mt/js/pdf-doc.js e desenhado por
   shared/js/pdf-render.js, seguindo os mocks docs/mocks/pdf-mt-*.

   Este módulo é só RENDERIZAÇÃO. O que cada documento contém vem de
   mt/js/conteudo.js.
   ============================================================ */

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

/* Desenha uma lista de campos do modelo de conteúdo. */
function _renderCamposPdfMT(P, campos) {
  const vazio = (v) =>
    v === undefined || v === null || String(v).trim() === "";
  // Campos curtos consecutivos vão em 2 colunas (kvPairs); os `full`
  // e as tabelas ocupam a linha inteira. Acumula os curtos e
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
   1. Análise de Partida de Motores — uma página por motor
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
      _renderCamposPdfMT(P, s.campos);
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
   2. Solicitação de Desconto para Irrigante / Aquicultor
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
    _renderCamposPdfMT(P, s.campos);
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
