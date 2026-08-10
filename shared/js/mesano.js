/* ============================================================
   CEMIG — Campo "mês/ano" com seletor próprio — ilha compartilhada
   ------------------------------------------------------------
   Extraído de mt/js/app.js (campo "Início de Uso") para ser reaproveitado
   fora do MT. Um campo ÚNICO e fechado, com o ícone de calendário: mostra
   "Mês/Ano" enquanto vazio e "Março/2028" depois de escolhido. O clique em
   qualquer ponto abre um painel próprio (12 meses + navegação de ano).

   Por que não input[type=month]: um month VAZIO sempre desenha o placeholder
   nativo do browser ("--------- de ----" em pt-BR), que nenhum atributo ou CSS
   remove, e o seletor nativo só abre pelo indicador, não pelo campo todo.
   Com um widget próprio o texto e o comportamento são 100% nossos.

   O valor continua no MESMO formato ISO "YYYY-MM" do month, então nada muda
   para quem consome (state, PDF, rascunho salvo).

   Duas formas de usar:
     • cmgMesAnoHTML(alvo, valor)  — string de HTML (tabelas do MT). A escolha
       é gravada pelo callback global window.cmgMesAnoAoEscolher(alvo, iso).
     • cmgMesAnoCampo(input)       — liga um <input type="hidden"/"month"> já
       existente: o botão é inserido ao lado e o valor volta pro input (com os
       eventos input/change), então o bind por data-k continua valendo.

   Requer: imgs/calendar.svg e o bloco .mesano-* de css/shared.css.
   ============================================================ */
const MESANO_MESES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];
// Faixa ofertada: ano corrente + 14 (os campos são sempre de previsão).
const MESANO_ANOS = 15;
/* "2028-03" → "Março/2028" (rótulo do campo). Vazio/inválido → "". */
function cmgMesAnoRotulo(valor) {
  const m = /^(\d{4})-(\d{2})$/.exec(valor || "");
  if (!m) return "";
  const mes = MESANO_MESES[Number(m[2]) - 1];
  return mes ? `${mes}/${m[1]}` : "";
}
// Caminho do calendar.svg relativo à página (os formulários vivem todos em
// subpastas de 1º nível: mt/, loteamento/, bt/…).
function _mesanoIcone() {
  return "../imgs/calendar.svg";
}
/* Botão do campo como STRING (uso em innerHTML de tabelas). `alvo` é uma
   etiqueta opaca devolvida ao callback na escolha — quem chama decide o que
   ela significa. */
function cmgMesAnoHTML(alvo, valor) {
  const rot = cmgMesAnoRotulo(valor);
  // Botão, não input: nada de teclado nativo nem placeholder do browser.
  return `<button type="button" class="mesano-campo" data-alvo="${alvo}" data-valor="${valor || ""}" onclick="cmgMesAnoAbrir(this)" aria-haspopup="dialog">
      <span class="mesano-campo-txt${rot ? "" : " is-vazio"}">${rot || "Mês/Ano"}</span>
      <img class="mesano-campo-icone" src="${_mesanoIcone()}" alt="" aria-hidden="true">
    </button>`;
}
/* Liga um input existente (type=month ou hidden): esconde o controle nativo e
   coloca o botão do widget no lugar dele, dentro do mesmo .field. O valor volta
   pro input e dispara input/change, então o bind por data-k não é afetado. */
function cmgMesAnoCampo(input) {
  if (!input || input.dataset.mesanoMontado) return null;
  input.dataset.mesanoMontado = "1";
  // O input vira depósito do valor: sem UI nativa, mas ainda no DOM (data-k,
  // validação por data-req e leitura do rascunho continuam funcionando).
  input.type = "hidden";
  const botao = document.createElement("button");
  botao.type = "button";
  botao.className = "mesano-campo";
  botao.setAttribute("aria-haspopup", "dialog");
  botao.dataset.valor = input.value || "";
  const rot = cmgMesAnoRotulo(input.value);
  const txt = document.createElement("span");
  txt.className = "mesano-campo-txt" + (rot ? "" : " is-vazio");
  txt.textContent = rot || "Mês/Ano";
  const icone = document.createElement("img");
  icone.className = "mesano-campo-icone";
  icone.src = _mesanoIcone();
  icone.alt = "";
  icone.setAttribute("aria-hidden", "true");
  botao.append(txt, icone);
  // Espelha a escolha no input (o handler do painel já atualizou o botão).
  botao._mesanoAoEscolher = (iso) => {
    input.value = iso;
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  };
  botao.addEventListener("click", () => cmgMesAnoAbrir(botao));
  input.parentNode.insertBefore(botao, input.nextSibling);
  return botao;
}
/* Monta todos os campos marcados com data-mesano dentro de `root`.
   Idempotente: pode rodar de novo após render dinâmico. */
function cmgMesAnoAplicar(root) {
  (root || document)
    .querySelectorAll("[data-mesano]")
    .forEach((el) => cmgMesAnoCampo(el));
}

/* ---- Painel do seletor ----
   Painel único reaproveitado por todos os campos (só um fica aberto por vez).
   Vive no <body> porque as tabelas do MT usam overflow-x:auto e recortariam um
   painel posicionado dentro da célula. */
let _mesanoPainel = null;
let _mesanoCampo = null; // botão que abriu o painel
let _mesanoAno = 0; // ano exibido na navegação
function cmgMesAnoAbrir(botao) {
  if (_mesanoCampo === botao) return cmgMesAnoFechar(); // clique no mesmo = alterna
  _mesanoCampo = botao;
  const m = /^(\d{4})-(\d{2})$/.exec(botao.dataset.valor || "");
  _mesanoAno = m ? Number(m[1]) : new Date().getFullYear();
  if (!_mesanoPainel) {
    _mesanoPainel = document.createElement("div");
    _mesanoPainel.className = "mesano-painel";
    _mesanoPainel.setAttribute("role", "dialog");
    _mesanoPainel.setAttribute("aria-label", "Escolha o mês e o ano");
    document.body.appendChild(_mesanoPainel);
    // Fecha ao clicar fora, no ESC, ou quando a página rola/redimensiona (o
    // painel é position:fixed e descolaria do campo).
    document.addEventListener("mousedown", (e) => {
      if (
        _mesanoCampo &&
        !_mesanoPainel.contains(e.target) &&
        !e.target.closest(".mesano-campo")
      )
        cmgMesAnoFechar();
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") cmgMesAnoFechar();
    });
    window.addEventListener("scroll", () => _mesanoCampo && cmgMesAnoFechar(), true);
    window.addEventListener("resize", () => _mesanoCampo && cmgMesAnoFechar());
  }
  _mesanoPintar();
  _mesanoPainel.hidden = false;
  _mesanoPosicionar();
}
function cmgMesAnoFechar() {
  if (_mesanoPainel) _mesanoPainel.hidden = true;
  _mesanoCampo = null;
}
/* Desenha o painel para o ano corrente da navegação. Meses fora da faixa
   permitida (antes do ano atual, além do teto) ficam desabilitados. */
function _mesanoPintar() {
  const anoMin = new Date().getFullYear();
  const anoMax = anoMin + MESANO_ANOS - 1;
  const sel = /^(\d{4})-(\d{2})$/.exec(_mesanoCampo.dataset.valor || "");
  const selAno = sel ? Number(sel[1]) : 0;
  const selMes = sel ? Number(sel[2]) : 0;
  const grade = MESANO_MESES.map((nome, i) => {
    const mm = i + 1;
    const ativo = selAno === _mesanoAno && selMes === mm;
    return `<button type="button" class="mesano-mes${ativo ? " is-sel" : ""}" onclick="cmgMesAnoEscolher(${mm})">${nome.slice(0, 3)}</button>`;
  }).join("");
  _mesanoPainel.innerHTML = `
      <div class="mesano-nav">
        <button type="button" class="mesano-nav-btn" onclick="cmgMesAnoNavegar(-1)" ${_mesanoAno <= anoMin ? "disabled" : ""} aria-label="Ano anterior">‹</button>
        <span class="mesano-nav-ano">${_mesanoAno}</span>
        <button type="button" class="mesano-nav-btn" onclick="cmgMesAnoNavegar(1)" ${_mesanoAno >= anoMax ? "disabled" : ""} aria-label="Próximo ano">›</button>
      </div>
      <div class="mesano-grade">${grade}</div>`;
}
function cmgMesAnoNavegar(d) {
  _mesanoAno += d;
  _mesanoPintar();
  _mesanoPosicionar();
}
/* Grava a escolha: atualiza o rótulo do botão e avisa quem o criou — o
   callback do próprio botão (cmgMesAnoCampo) ou, para os botões vindos de
   HTML, o gancho global cmgMesAnoAoEscolher(alvo, iso). */
function cmgMesAnoEscolher(mes) {
  const iso = `${_mesanoAno}-${String(mes).padStart(2, "0")}`;
  const botao = _mesanoCampo;
  botao.dataset.valor = iso;
  const txt = botao.querySelector(".mesano-campo-txt");
  txt.textContent = cmgMesAnoRotulo(iso);
  txt.classList.remove("is-vazio");
  cmgMesAnoFechar();
  if (typeof botao._mesanoAoEscolher === "function")
    botao._mesanoAoEscolher(iso);
  else if (typeof window.cmgMesAnoAoEscolher === "function")
    window.cmgMesAnoAoEscolher(botao.dataset.alvo, iso);
}
/* position:fixed ancorado ao campo; vira para cima se não couber embaixo. */
function _mesanoPosicionar() {
  const r = _mesanoCampo.getBoundingClientRect();
  const p = _mesanoPainel;
  p.style.visibility = "hidden";
  p.hidden = false;
  const alt = p.offsetHeight;
  const larg = p.offsetWidth;
  const cabeEmbaixo = r.bottom + 4 + alt <= window.innerHeight;
  p.style.top = `${cabeEmbaixo ? r.bottom + 4 : Math.max(4, r.top - 4 - alt)}px`;
  // Alinha pela esquerda do campo, sem vazar da janela.
  p.style.left = `${Math.max(4, Math.min(r.left, window.innerWidth - larg - 4))}px`;
  p.style.visibility = "";
}
