// ============================================================
// CEMIG GD — Chassi comum de geração de PDF (jsPDF)
// Extraído de micro/mini pdf.js — comportamento idêntico.
// A sequência de campos (kv(...)) permanece específica de cada formulário;
// aqui fica apenas o boilerplate compartilhado (setup, header, sec, kv).
//
// Uso:
//   const pdf = criarPdfGD("CEMIG — Solicitação de Acesso — Microgeração Distribuída");
//   pdf.sec("1 — Identificação...");
//   pdf.kv("Número da instalação", d.instalacao);
//   ...
//   pdf.doc.save("arquivo.pdf");   // ou pdf.doc para manipular
// ============================================================
function criarPdfGD(tituloCabecalho) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF("p", "mm", "a4");
  const MG = 14;
  const W = 210;
  const VERDE = [16, 119, 98];
  const estado = { cy: 18 };

  function header() {
    doc.setFillColor(10, 47, 39);
    doc.rect(0, 0, W, 12, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(tituloCabecalho, MG, 8);
    estado.cy = 20;
  }
  function checkSpace(h) {
    if (estado.cy + h > 285) {
      doc.addPage();
      header();
    }
  }
  function sec(t) {
    checkSpace(12);
    estado.cy += 2;
    doc.setFillColor(VERDE[0], VERDE[1], VERDE[2]);
    doc.rect(MG, estado.cy, W - 2 * MG, 6, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text(t, MG + 2, estado.cy + 4.2);
    estado.cy += 9;
    doc.setTextColor(40, 40, 50);
  }
  function kv(label, val) {
    checkSpace(7);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text(label + ":", MG + 1, estado.cy + 4);
    doc.setFont("helvetica", "normal");
    const txt = doc.splitTextToSize(String(val || "—"), W - MG - 56);
    doc.text(txt, MG + 55, estado.cy + 4);
    estado.cy += Math.max(6, txt.length * 4.5);
  }

  header();
  // expõe doc, helpers e medidas (caso a sequência específica precise)
  return { doc, header, checkSpace, sec, kv, MG, W, VERDE, estado };
}
