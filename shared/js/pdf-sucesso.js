/* ============================================================
   CEMIG — Modal "PDF exportado com sucesso!"
   Exibido logo após o download do PDF do formulário. Orienta o
   usuário a levar o documento impresso ao posto de atendimento e
   oferece os dois links de apoio do portal (lista de documentos
   necessários e locais de atendimento).

   Reutiliza o componente .cmg-modal de css/shared.css (escopado em
   .cemig-form), montado no <body> e fechado por X/Esc/clique no
   overlay. Chamado por bt/js/pdf.js, shared/js/gd-pdf-base.js e
   pelos PDFs auxiliares após doc.save().
   ============================================================ */
const PDF_SUCESSO_LINKS = {
  documentos:
    "https://www.cemig.com.br/duvida-frequente/quais-sao-as-informacoes-complementares-e-outros-documentos-necessarios-que-preciso-ter-para-solicitar-ligacao-nova-ou-alteracao-de-carga/",
  atendimento: "https://www.cemig.com.br/atendimento/locais-de-atendimento/",
};

function mostrarModalPdfExportado() {
  // Evita empilhar diálogos quando o usuário exporta mais de uma vez.
  const anterior = document.querySelector(".cmg-modal-overlay[data-pdf-ok]");
  if (anterior) anterior.remove();

  const overlay = document.createElement("div");
  overlay.className = "cmg-modal-overlay";
  overlay.dataset.pdfOk = "1";

  const dialog = document.createElement("div");
  dialog.className = "cmg-modal cmg-modal-sucesso";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "cmg-modal-pdf-titulo");

  // Devolve o foco a quem abriu o modal (o botão "Exportar PDF").
  const anteriorFoco = document.activeElement;
  const fechar = () => {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
    if (anteriorFoco && anteriorFoco.focus) anteriorFoco.focus();
  };
  const onKey = (e) => {
    if (e.key === "Escape") fechar();
  };

  const btnX = document.createElement("button");
  btnX.type = "button";
  btnX.className = "cmg-modal-fechar";
  btnX.setAttribute("aria-label", "Fechar");
  btnX.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  btnX.addEventListener("click", fechar);

  const check = document.createElement("div");
  check.className = "cmg-modal-check";
  check.innerHTML =
    '<svg width="56" height="56" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12.5l5.5 5.5L20 7" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  const titulo = document.createElement("h2");
  titulo.className = "cmg-modal-titulo";
  titulo.id = "cmg-modal-pdf-titulo";
  titulo.textContent = "PDF exportado com sucesso!";

  const desc = document.createElement("p");
  desc.className = "cmg-modal-desc";
  desc.textContent =
    "O download do seu documento foi concluído. Agora, basta levar esse PDF impresso junto com o restante dos seus documentos até o posto de atendimento mais próximo para finalizar o processo.";

  const corpo = document.createElement("div");
  corpo.className = "cmg-modal-conteudo";
  corpo.append(check, titulo, desc);

  // Ações: dois links do portal, abertos em nova aba.
  const rodape = document.createElement("div");
  rodape.className = "cmg-modal-rodape";
  const link = (texto, href, classe) => {
    const a = document.createElement("a");
    a.className = "btn " + classe;
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.textContent = texto;
    return a;
  };
  rodape.append(
    link("Lista de documentos", PDF_SUCESSO_LINKS.documentos, "btn-ghost"),
    link("Locais de atendimento", PDF_SUCESSO_LINKS.atendimento, "btn-primary"),
  );

  dialog.append(btnX, corpo, rodape);
  overlay.appendChild(dialog);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fechar();
  });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(overlay);
  btnX.focus();
}
