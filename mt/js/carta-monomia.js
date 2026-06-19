/* ============================================================
   CEMIG MT — Carta de Opção de Faturamento por Tarifa Monômia
   Gera um PDF fiel ao modelo oficial, preenchido com os dados
   já informados no formulário (state global de js/app.js).
   ============================================================ */
function gerarCartaMonomia() {
  if (!window.jspdf) {
    alert("Biblioteca jsPDF não carregada.");
    return;
  }
  syncState();
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW = 210,
    MG = 25,
    CW = PW - 2 * MG;

  const nome = state.nome || "";
  const cnpj = state.cpfCnpj || "";
  const numInstalacao = state.numInstalacao || "";
  const urbano = state.localizacao === "Urbana";
  const endereco = urbano
    ? state.urb_endereco || ""
    : state.rur_propriedade || state.rur_distrito || "";
  const numero = urbano ? state.urb_num || "" : "";
  const bairro = urbano ? state.urb_bairro || "" : state.rur_distrito || "";
  const municipio = state.uc_municipio || "";
  const uf = state.uc_estado || "";

  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, "0");
  const mes = hoje.toLocaleDateString("pt-BR", { month: "long" });
  const ano = hoje.getFullYear();

  let cy = 30;
  const p = (texto, opts = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size || 11);
    const lineHeight = opts.lineHeight || 5.5;
    const linhas = doc.splitTextToSize(texto, CW);
    if (opts.justify) {
      // jsPDF justifica internamente todas as linhas exceto a última
      doc.text(texto, MG, cy, { maxWidth: CW, align: "justify" });
      cy += linhas.length * lineHeight;
    } else {
      linhas.forEach((linha) => {
        if (opts.align === "center") doc.text(linha, PW / 2, cy, { align: "center" });
        else doc.text(linha, MG, cy);
        cy += lineHeight;
      });
    }
    cy += opts.gap || 0;
  };

  p("OPÇÃO DE FATURAMENTO – TARIFA MONÔMIA", {
    bold: true,
    size: 13,
    align: "center",
    gap: 12,
  });

  p("À", { gap: 1 });
  p("CEMIG Distribuição S/A", { gap: 12 });

  p("Prezados Senhores,", { gap: 8 });

  p(
    "Na qualidade de consumidor de Energia Elétrica com atendimento em Média Tensão " +
      "(MT), subgrupo A4, e atendendo ao definido no Artigo 292 da resolução ANEEL n° " +
      "1000 de 07 de Dezembro 2021, estamos formalizando a opção pelo faturamento " +
      "monômio com tarifa do Grupo B (baixa tensão), por considerá-la mais adequada às " +
      "necessidades desta empresa.",
    { justify: true, gap: 6 },
  );

  p(
    "Declaramos que nos foram apresentadas todas as informações sobre as opções de " +
      "faturamento para essa nossa unidade consumidora. Solicitamos, portanto, dessa " +
      "concessionária, as providências que se fizerem necessárias para o atendimento à " +
      "nossa opção, comprometendo-nos a providenciar, se necessário, a adequação e ou " +
      "adaptação das instalações da entrada de serviço, para possibilitar esse tipo de " +
      "faturamento.",
    { justify: true, gap: 6 },
  );

  p(
    `Os administradores abaixo assinados, da unidade consumidora ${nome || "Consumidor"}, ` +
      `inscrição CNPJ n° ${cnpj}, estabelecida à ${endereco}, nº ${numero}, Bairro ${bairro}, ` +
      `Município de ${municipio}, Estado ${uf}, com o n° de identificação na CEMIG D PN ` +
      `${numInstalacao}, conhecedores das condições legais prescritas na legislação vigente e ` +
      "Resolução da ANEEL 1000 de 07 de Dezembro 2021, declaram cumprir fielmente a obrigação de " +
      "comunicar à CEMIG DISTRIBUIÇÃO S.A, com sede em Belo Horizonte – MG, situada a Av. " +
      "Barbacena, 1.200 – 17º Andar – ala A1, Bairro Santo Agostinho, CNPJ 06.981.180/0001-16, " +
      "todo e qualquer aumento de sua potência de transformação, sob pena de infringir a " +
      "Resolução supra mencionada, bem como permanecer na opção por faturamento monômio (kWh) " +
      "Grupo “B”, por um período mínimo de 12 meses.",
    { justify: true, gap: 6 },
  );

  p("Por ser verdade, firmamos a presente opção em 2 (duas) vias de igual teor e forma.", {
    justify: true,
    gap: 14,
  });

  p(`${municipio || "_______________"}, ${dia} de ${mes} de ${ano},`, {
    align: "center",
    gap: 18,
  });

  const colW = CW / 2 - 6;
  const xCol1 = MG,
    xCol2 = MG + CW / 2 + 6;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.line(xCol1, cy, xCol1 + colW, cy);
  doc.line(xCol2, cy, xCol2 + colW, cy);
  cy += 5;
  doc.text("Consumidor", xCol1, cy);
  doc.text("Consumidor", xCol2, cy);
  cy += 6;
  doc.text("Nome:", xCol1, cy);
  doc.text("Nome:", xCol2, cy);
  cy += 6;
  doc.text("Cargo:", xCol1, cy);
  doc.text("Cargo:", xCol2, cy);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.text("Avenida Barbacena, 1200 - 17º Andar - Ala A1 - Santo Agostinho", MG, 280);
  doc.text(
    "Caixa Postal: 992 - CEP 30190-131- Belo Horizonte - MG - Brasil",
    MG,
    284,
  );

  const nomeArq = `Opcao_Faturamento_Monomia_${(nome || "consumidor").replace(/[^\w]+/g, "_")}.pdf`;
  doc.save(nomeArq);
}
