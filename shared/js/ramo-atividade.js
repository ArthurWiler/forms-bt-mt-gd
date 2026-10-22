/* ============================================================
   CEMIG - Ramo de atividade - helpers compartilhados
   O ramo é TEXTO LIVRE ("Salão de beleza", "Padaria"…) em todos os
   formulários: a lista CNAE com autocomplete saiu porque não achava
   atividades comerciais comuns. A categoria do cálculo de demanda vem do
   Tipo de propriedade (shared/js/carga-bt.js), não do ramo.
   Rascunhos antigos guardam a string "código - descrição"; os helpers
   abaixo continuam lendo esse formato.
   Carregue este arquivo antes dos apps (BT individual/coletivo, MT).
   ============================================================ */

// Descrição a exibir no formulário (sem o código de um valor antigo).
function ramoDescricao(valor) {
  const v = String(valor == null ? "" : valor).trim();
  const m = v.match(/^(\d{5,7})\s*-\s*(.+)$/);
  return m ? m[2] : v;
}

// Código CNAE de um valor antigo ("código - descrição"); "" no texto livre.
function ramoCodigo(valor) {
  const m = String(valor == null ? "" : valor)
    .trim()
    .match(/^(\d{5,7})\s*-\s*/);
  return m ? m[1] : "";
}

// Rótulo do PDF/prévia: o texto como foi digitado (um valor antigo sai
// com o código, como antes).
function ramoParaPdf(valor) {
  return String(valor == null ? "" : valor).trim();
}
