/* ============================================================
   CEMIG BT — Termo de Opção pelo Atendimento em Baixa Tensão
   (Grupo B). Gera um PDF fiel ao modelo oficial, atualizado para a
   Resolução Normativa ANEEL nº 1.000 de 07/12/2021, preenchido com
   os dados já informados no formulário (ctx do App de bt/js/app.js).
   ============================================================ */
function gerarTermoGrupoB(ctx) {
  if (!window.jspdf) {
    alert("Biblioteca jsPDF não carregada.");
    return;
  }
  const prop = (ctx && ctx.prop) || {};
  const obra = (ctx && ctx.obra) || {};
  const ucsDet = (ctx && ctx.ucsDet) || [];
  const ucPrincipal = ucsDet[0] || {};

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });

  // Configurações de página — margens de 25mm
  const PW = 210,
    PH = 297,
    MG = 25,
    CW = PW - 2 * MG;

  const nome = prop.nome || "";
  const cpfCnpj = prop.cpfCnpj || "";
  const numInstalacao = ucPrincipal.instalacao || obra.instalacaoUC || "";
  const cidade = obra.cidade || "Belo Horizonte";

  // Identificação dinâmica de CPF ou CNPJ pelo tamanho da string limpa
  const apenasDigitos = cpfCnpj.replace(/\D/g, "");
  const labelDocumento = apenasDigitos.length > 11 ? "CNPJ n°" : "CPF n°";

  const hoje = new Date();
  const dia = String(hoje.getDate()).padStart(2, "0");
  const mes = hoje.toLocaleDateString("pt-BR", { month: "long" });
  const ano = hoje.getFullYear();

  let cy = 35;

  // Linha decorativa superior
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.2);
  doc.line(MG, 20, PW - MG, 20);

  const p = (texto, opts = {}) => {
    doc.setFont("helvetica", opts.bold ? "bold" : "normal");
    doc.setFontSize(opts.size || 11);
    doc.setTextColor(40, 40, 40);

    const lineHeight = opts.lineHeight || 6;
    const linhas = doc.splitTextToSize(texto, CW);

    if (opts.justify) {
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

  // Título
  p("TERMO DE OPÇÃO PELO ATENDIMENTO EM BAIXA TENSÃO", {
    bold: true,
    size: 14,
    align: "center",
    gap: 15,
  });

  // Destinatário
  p("À", { bold: true, gap: 1 });
  p("CEMIG Distribuição S/A", { bold: true, gap: 12 });

  p("Prezados Senhores:", { gap: 6 });

  // Parágrafo 1
  p(
    "Na qualidade de consumidor de Energia Elétrica com características de atendimento em " +
      "Média Tensão (MT), subgrupo A4, e atendendo ao definido no Item 12 do Capítulo 2 da " +
      "ND-5.1, formalizamos a opção pelo atendimento e faturamento na tarifa do Grupo B " +
      "(baixa tensão), por considerá-la mais adequada às nossas necessidades.",
    { justify: true, gap: 5 },
  );

  // Parágrafo 2
  p(
    "Conhecedores das condições legais prescritas na legislação vigente, na Resolução " +
      "Normativa ANEEL nº 1.000 de 07 de Dezembro de 2021 e na ND-5.1 da Cemig, declaramos " +
      "que nos foram apresentadas todas as informações sobre as opções de atendimento e " +
      "faturamento para nossa unidade consumidora.",
    { justify: true, gap: 5 },
  );

  // Parágrafo 3
  p(
    "Solicitamos, portanto, dessa concessionária, as providências que se fizerem necessárias " +
      "para o atendimento à nossa opção, comprometendo-nos a providenciar, se necessário, a " +
      "adequação e/ou adaptação das instalações da entrada de serviço, para possibilitar esse " +
      "tipo de atendimento e faturamento.",
    { justify: true, gap: 5 },
  );

  // Parágrafo 4
  p(
    "Declaramos cumprir fielmente a obrigação de comunicar à CEMIG DISTRIBUIÇÃO S.A todo e " +
      "qualquer aumento de nossa potência de transformação, sob pena de desclassificação do " +
      "faturamento do Grupo B.",
    { justify: true, gap: 15 },
  );

  // Local e data
  p(`${cidade}, ${dia} de ${mes} de ${ano}.`, {
    align: "center",
    gap: 25,
  });

  // Linha de assinatura
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.3);
  const xAss = MG,
    larguraAss = CW * 0.6;
  doc.line(xAss, cy, xAss + larguraAss, cy);

  cy += 5;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(40, 40, 40);
  doc.text("Assinatura do Titular ou Representante Legal", xAss, cy);

  cy += 6;
  doc.setFont("helvetica", "normal");
  doc.text(`Nome: ${nome}`, xAss, cy);

  cy += 6;
  doc.text(`Documento: ${labelDocumento} ${cpfCnpj}`, xAss, cy);

  cy += 6;
  doc.text(`Nº da Instalação: ${numInstalacao}`, xAss, cy);

  // Rodapé institucional — centralizado na base da folha
  doc.setDrawColor(220, 220, 220);
  doc.line(MG, PH - 25, PW - MG, PH - 25);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  doc.text(
    "Avenida Barbacena, 1200 - 17º Andar - Ala A1 - Santo Agostinho",
    PW / 2,
    PH - 18,
    { align: "center" },
  );
  doc.text(
    "Caixa Postal: 992 - CEP 30190-131 - Belo Horizonte - MG - Brasil",
    PW / 2,
    PH - 14,
    { align: "center" },
  );

  const nomeArq = `Termo_Opcao_Atend_Baixa_Tensao_${(nome || "consumidor").replace(/\s+/g, "_")}.pdf`;
  doc.save(nomeArq);
}
