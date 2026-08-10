/* ============================================================
   CEMIG — Construtores de campo das ilhas dinâmicas
   ------------------------------------------------------------
   Helpers genéricos de DOM usados pelas listas montadas em JS
   (UCs do coletivo, torres do condomínio, unidades da
   microgeração). Não leem `state` nem conhecem o formulário:
   recebem valor + callback e devolvem o elemento.

   Viviam em bt/js/bt-core.js e bt/js/coletivo-app.js com nomes
   prefixados por "_". Foram movidos para cá quando a
   Microgeração passou a montar as mesmas listas no fluxo
   Coletivo/Agrupamento. O BT mantém os nomes antigos por meio
   dos apelidos declarados no fim de bt/js/bt-core.js.

   Dependência externa: `mascararInstalacaoUC`
   (shared/js/valida-instalacao.js), usada por cmgInpInstalacao.
   ============================================================ */

// Campo completo: <div class="field"><label>…</label> + controle.
function cmgCampo(labelHtml, controle, cls) {
  const f = document.createElement("div");
  f.className = "field" + (cls ? " " + cls : "");
  const l = document.createElement("label");
  l.innerHTML = labelHtml;
  f.append(l, controle);
  // Ícone de ajuda (i): quando presente no rótulo, é movido para fora do
  // <label> e vira filho direto do .field. Assim ele fica ancorado ao campo
  // (centralizado na vertical, via .field > .field-hint-icon no CSS) e NÃO
  // acompanha o rótulo flutuante quando este sobe ao ser preenchido.
  const hint = l.querySelector(".cmg-hint, .field-info");
  if (hint) {
    hint.classList.add("field-hint-icon");
    f.appendChild(hint);
  }
  return f;
}

function cmgSelectDe(opcoes, valor, onchange, comVazio) {
  const s = document.createElement("select");
  s.innerHTML =
    (comVazio ? '<option value=""></option>' : "") +
    opcoes.map((o) => `<option value="${o}">${o}</option>`).join("");
  s.value = valor || (comVazio ? "" : opcoes[0]);
  s.addEventListener("change", () => onchange(s.value));
  return s;
}

function cmgInp(valor, oninput, props) {
  const i = document.createElement("input");
  i.type = (props && props.type) || "text";
  i.placeholder = (props && props.placeholder) || " ";
  i.value = valor == null ? "" : valor;
  i.addEventListener("input", () => oninput(i.value));
  return i;
}

// Campo "Instalação / UC / Medidor": máscara + validação de formato
// (10 dígitos iniciando por 3, ou 15 dígitos com "018" antes do verificador).
function cmgInpInstalacao(valor, onChange) {
  const i = document.createElement("input");
  i.type = "text";
  i.placeholder = "Nº instalação, UC ou medidor";
  i.value = valor == null ? "" : valor;
  i.setAttribute("data-fmt", "fmtInstalacaoUC");
  i.addEventListener("input", () => {
    i.value = mascararInstalacaoUC(i.value);
    onChange(i.value);
  });
  return i;
}

// Acordeões exclusivos (torres/unidades/UCs/grupos de carga): abrir um item
// fecha o que estava aberto no mesmo mapa. As chaves fechadas ficam
// registradas como false — quem tem "aberto por padrão" testa a PRESENÇA da
// chave e assim não ressuscita um item fechado pelo usuário.
function cmgToggleExclusivo(mapa, chave, abrir) {
  Object.keys(mapa).forEach((k) => (mapa[k] = false));
  mapa[chave] = abrir;
}

// Card de KPI dos rodapés de resultado (carga/demanda da unidade, da torre e
// do agrupamento) — rótulo, valor e o ícone de ajuda com o texto explicativo.
function cmgKpiCard(label, valor, titulo) {
  const card = document.createElement("div");
  card.className = "resultado-card";
  card.innerHTML =
    `<span class="resultado-card-info cmg-hint" tabindex="0" role="img" aria-label="${label}: ajuda" data-hint="${titulo}"><img class="field-info" src="../imgs/info.svg" alt="" aria-hidden="true" /></span>` +
    `<div class="resultado-card-label">${label}</div>` +
    `<div class="resultado-card-valor">${valor}</div>`;
  return card;
}

// Executa um re-render que reconstrói o campo em foco (innerHTML = "") sem
// tirar o cursor de onde o usuário está digitando: guarda o input ativo pelo
// data-foco + posição do cursor e devolve o foco ao equivalente recriado.
// Usado pelos campos cujo valor muda a ESTRUTURA do card (ex.: "Quantidade de
// unidades", que monta/desmonta "por andar" e "Primeiro complemento").
function cmgPreservandoFoco(rerender) {
  const ativo = document.activeElement;
  const chave =
    ativo && ativo.tagName === "INPUT" ? ativo.getAttribute("data-foco") : null;
  if (!chave) return rerender();
  // selectionStart/End não são acessíveis em input type="number" (lança em
  // alguns navegadores): sem cursor, só o foco é restaurado.
  let ini = null;
  let fim = null;
  try {
    ini = ativo.selectionStart;
    fim = ativo.selectionEnd;
  } catch (e) {}
  rerender();
  const novo = document.querySelector(`input[data-foco="${chave}"]`);
  if (!novo || novo === ativo) return;
  novo.focus();
  try {
    if (ini != null) novo.setSelectionRange(ini, fim);
  } catch (e) {}
}
