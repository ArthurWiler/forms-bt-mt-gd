/* ============================================================
   CEMIG — Homepage (portal de modalidades)
   ------------------------------------------------------------
   Este bloco era um <script> inline no index.html. Foi extraído
   para cá porque executava no parse e dependia de MODALIDADES_SECOES
   (bt/js/model.js): com os externos passando a `defer`, o inline
   rodaria ANTES deles e quebraria. Como arquivo próprio ele também
   ganha `defer` e mantém a ordem data.js → model.js → homepage.js,
   sem bloquear o primeiro paint.
   ============================================================ */
// Navegação a partir do card selecionado:
//  - cards "link" abrem o módulo correspondente (MT/Loteamento/GD);
//  - cards individuais abrem o formulário vanilla (bt/individual.html);
//  - coletivo/condomínio abrem bt/index.html — sempre via `?mod=<id>`.
function selectModalidade(card) {
  if (card.status === "link" && card.href) {
    window.location.href = card.href;
    return;
  }
  if (card.status === "soon") return;
  window.location.href =
    (card.formType === "individual"
      ? "bt/individual.html?mod="
      : "bt/?mod=") + encodeURIComponent(card.id);
}

// Seção colapsável (mesmo markup/comportamento do SecaoModalidade
// React: colapsada por padrão, chevron gira via CSS).
function montarSecao(sec) {
  const box = document.createElement("div");
  box.className = "modalidade-secao is-collapsed";
  const titulo = document.createElement("button");
  titulo.type = "button";
  titulo.className = "modalidade-secao-titulo";
  titulo.setAttribute("aria-expanded", "false");
  titulo.innerHTML =
    '<span class="modalidade-secao-label"></span>' +
    '<span class="modalidade-secao-chevron" aria-hidden="true">' +
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
    '<path d="m6 9 6 6 6-6" /></svg></span>';
  titulo.querySelector(".modalidade-secao-label").textContent =
    sec.titulo;
  titulo.addEventListener("click", () => {
    const aberta = box.classList.toggle("is-collapsed");
    titulo.setAttribute("aria-expanded", aberta ? "false" : "true");
  });
  const corpo = document.createElement("div");
  corpo.className = "modalidade-secao-corpo";
  const grid = document.createElement("div");
  grid.className = "modalidade-grid";
  sec.cards.forEach((card) => {
    const btn = document.createElement("button");
    btn.className =
      "modalidade-card" + (card.status === "soon" ? " soon" : "");
    btn.disabled = card.status === "soon";
    btn.addEventListener("click", () => selectModalidade(card));
    const imgBox = document.createElement("span");
    imgBox.className = "modalidade-img";
    const img = document.createElement("img");
    img.src = card.img;
    img.alt = card.nome;
    img.loading = "lazy";
    img.addEventListener("error", () => {
      img.style.display = "none";
      imgBox.classList.add("ph");
    });
    imgBox.appendChild(img);
    const body = document.createElement("span");
    body.className = "modalidade-card-body";
    const nome = document.createElement("strong");
    nome.textContent = card.nome;
    const sub = document.createElement("span");
    sub.className = "modalidade-sub";
    sub.textContent = card.sub;
    body.append(nome, sub);
    btn.append(imgBox, body);
    grid.appendChild(btn);
  });
  corpo.appendChild(grid);
  box.append(titulo, corpo);
  return box;
}

const secoesBox = document.getElementById("secoes");
MODALIDADES_SECOES.forEach((sec) =>
  secoesBox.appendChild(montarSecao(sec)),
);
document.getElementById("footerCopy").textContent =
  "CEMIG " +
  new Date().getFullYear() +
  "© - Todos os Direitos Reservados";
