// ============================================================
// CEMIG GD — Chassi comum de geração de PDF (jsPDF)
// Porta o MESMO motor visual do módulo de Baixa Tensão (bt/js/pdf.js):
// mesma barra superior, seções, pares chave/valor em 2 colunas, linhas
// completas com quebra automática, tabelas com zebra/quebra de página e
// linha de total. Assim MICRO/MINI ficam visualmente idênticos ao BT e
// reutilizam exatamente a mesma lógica de renderização.
//
// Uso:
//   const P = criarPdfGD("Título do cabeçalho", "Subtítulo");
//   P.sec("1 — Identificação...");
//   P.kvPairs([["Número da instalação", d.instalacao], ["Titular", d.titular]]);
//   P.fullLine("Endereço", endereco);          // valor longo, quebra de linha
//   P.tabela(headers, widths, rows);           // tabela com zebra
//   P.totRow("DEMANDA TOTAL", "123,45 kVA");    // faixa de total
//   P.assinatura();                            // bloco de assinatura
//   P.save("arquivo.pdf");
// ============================================================
function criarPdfGD(tituloCabecalho, subtitulo) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW = 210,
    PH = 297,
    MG = 14,
    CW = PW - 2 * MG;
  const st = { cy: MG };

  const drawTopBar = () => {
    doc.setFillColor(10, 47, 39);
    doc.rect(0, 0, PW, 18, "F");
    // Linha de gradiente da marca (verde digital -> verde on) sob a barra
    {
      const gy = 18,
        gh = 1.3,
        steps = 60;
      for (let i = 0; i < steps; i++) {
        const t = i / (steps - 1);
        const r = Math.round(30 + (196 - 30) * t);
        const b = Math.round(140 + (63 - 140) * t);
        doc.setFillColor(r, 255, b);
        doc.rect((PW / steps) * i, gy, PW / steps + 0.3, gh, "F");
      }
    }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(255, 255, 255);
    doc.text(tituloCabecalho, MG, 8);
    if (subtitulo) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(11);
      doc.setTextColor(169, 230, 191);
      doc.text(subtitulo, MG, 13.5);
    }
    st.cy = 24;
  };
  const footer = () => {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(6.5);
    doc.setTextColor(150, 150, 150);
    doc.text("", MG, PH - 7);
  };
  const checkSpace = (h) => {
    if (st.cy + h > PH - 14) {
      footer();
      doc.addPage();
      st.cy = MG;
      drawTopBar();
    }
  };
  const sec = (t) => {
    checkSpace(11);
    doc.setFillColor(230, 242, 238);
    doc.rect(MG, st.cy, CW, 7, "F");
    doc.setFillColor(16, 119, 98);
    doc.rect(MG, st.cy, 2.5, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(16, 119, 98);
    doc.text(t, MG + 5, st.cy + 4.8);
    st.cy += 9;
  };
  // Subseção (ex.: "4.1  Fonte 1") — cabeçalho leve sob uma seção principal
  const subSec = (t) => {
    checkSpace(8);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9.5);
    doc.setTextColor(16, 119, 98);
    doc.text(t, MG + 1, st.cy + 4);
    doc.setDrawColor(200, 224, 216);
    doc.line(MG + 1, st.cy + 5.6, MG + CW - 1, st.cy + 5.6);
    st.cy += 8;
  };
  const _vazio = (v) =>
    v === undefined ||
    v === null ||
    String(v).trim() === "" ||
    String(v).trim() === "—";
  // Pares chave/valor em duas colunas. Valores vazios/"—" são omitidos
  // automaticamente (Regra 3: campos não aplicáveis não aparecem).
  const kvPairs = (pairs) => {
    const colW = CW / 2;
    const kept = (pairs || []).filter((p) => p && !_vazio(p[1]));
    for (let i = 0; i < kept.length; i += 2) {
      checkSpace(6);
      [kept[i], kept[i + 1]].forEach((p, ci) => {
        if (!p) return;
        const x = MG + ci * colW;
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 32, 42);
        const lbl = p[0] + ": ";
        doc.text(lbl, x + 1, st.cy + 4.5);
        const lw = doc.getTextWidth(lbl);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        // Altura de linha fixa: o valor que não cabe na meia-coluna é cortado
        // com reticências (ex.: ramo de atividade com código CNAE + descrição).
        const larg = Math.max(10, colW - 4 - lw);
        const ls = doc.splitTextToSize(String(p[1]), larg);
        let val = ls[0] || "";
        if (ls.length > 1) {
          while (val && doc.getTextWidth(val + "…") > larg)
            val = val.slice(0, -1);
          val += "…";
        }
        doc.text(val, x + 1 + lw, st.cy + 4.5);
      });
      st.cy += 7;
    }
  };
  // Linha de largura total com rótulo em negrito e valor com quebra automática
  // (Regra 4/6: o rótulo nunca sobrepõe o valor; a altura acompanha o conteúdo).
  const fullLine = (label, val) => {
    if (_vazio(val)) return;
    const lbl = label + ": ";
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const lw = doc.getTextWidth(lbl);
    const lines = doc.splitTextToSize(String(val), Math.max(20, CW - 4 - lw));
    checkSpace(4 + lines.length * 4.2);
    // re-aplica estilo após possível quebra de página (drawTopBar altera fonte/cor)
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(30, 32, 42);
    doc.text(lbl, MG + 1, st.cy + 4.5);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(lines, MG + 1 + lw, st.cy + 4.5);
    st.cy += 2 + lines.length * 4.2;
  };
  const totRow = (label, val) => {
    checkSpace(8);
    doc.setFillColor(16, 119, 98);
    doc.rect(MG, st.cy, CW, 7.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(label, MG + 5, st.cy + 5.2);
    doc.text(String(val), MG + CW - 2, st.cy + 5.2, { align: "right" });
    st.cy += 9;
  };
  const tabela = (headers, widths, rows) => {
    checkSpace(6);
    doc.setFillColor(230, 242, 238);
    doc.rect(MG, st.cy, CW, 5.5, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(16, 119, 98);
    let x = MG + 2;
    headers.forEach((h, i) => {
      doc.text(String(h), x, st.cy + 3.8);
      x += widths[i];
    });
    st.cy += 5.5;
    let ri = 0;
    rows.forEach((row) => {
      checkSpace(5);
      doc.setFillColor(
        ri % 2 ? 240 : 255,
        ri % 2 ? 246 : 255,
        ri % 2 ? 244 : 255,
      );
      doc.rect(MG, st.cy, CW, 5, "F");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(30, 32, 42);
      let xx = MG + 2;
      row.forEach((cell, i) => {
        // Idem kvPairs: corta com reticências em vez de sumir no meio da palavra.
        const linhas = doc.splitTextToSize(String(cell ?? "—"), widths[i] - 2);
        let txt = linhas[0] || "—";
        if (linhas.length > 1) {
          while (txt && doc.getTextWidth(txt + "…") > widths[i] - 2)
            txt = txt.slice(0, -1);
          txt += "…";
        }
        doc.text(txt, xx, st.cy + 3.5);
        xx += widths[i];
      });
      ri++;
      st.cy += 5;
    });
  };
  // Variante de `tabela` que omite colunas inteiramente vazias (preserva a 1ª).
  const tabelaAuto = (headers, widths, rows) => {
    const manter = headers.map(
      (_, ci) => ci === 0 || rows.some((r) => !_vazio(r[ci])),
    );
    tabela(
      headers.filter((_, i) => manter[i]),
      widths.filter((_, i) => manter[i]),
      rows.map((r) => r.filter((_, i) => manter[i])),
    );
  };
  const gap = (n) => {
    st.cy += n;
  };
  // Bloco de assinatura (local/data + linha)
  const assinatura = (
    texto = "Local e data / Assinatura do solicitante ou representante legal",
  ) => {
    checkSpace(20);
    doc.setDrawColor(180, 180, 180);
    doc.line(MG + 30, st.cy + 8, MG + CW - 30, st.cy + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(90, 90, 90);
    doc.text(texto, PW / 2, st.cy + 12, { align: "center" });
    st.cy += 16;
  };
  const save = (filename) => {
    footer();
    doc.save(filename);
    if (typeof mostrarModalPdfExportado === "function")
      mostrarModalPdfExportado();
  };
  // Compatibilidade: kv(label, val) antigo == fullLine.
  const kv = (label, val) => fullLine(label, val);

  drawTopBar();
  return {
    doc,
    MG,
    W: PW,
    PW,
    PH,
    CW,
    state: st,
    header: drawTopBar,
    footer,
    checkSpace,
    sec,
    subSec,
    kv,
    kvPairs,
    fullLine,
    totRow,
    tabela,
    tabelaAuto,
    gap,
    assinatura,
    save,
  };
}
