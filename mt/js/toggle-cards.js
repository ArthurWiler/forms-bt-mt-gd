/* ============================================================
   CEMIG MT — Cards de seleção (padrão visual importado do BT)
   Substitui visualmente os <select> de resposta binária (Sim/Não)
   e o seletor "Opção de Atendimento" por dois cards lado a lado,
   reaproveitando as classes .toggle-group/.toggle-btn do BT.
   O <select> original é mantido oculto como única fonte da
   verdade (data-k, onchange, validação, prévia continuam intactos).
   ============================================================ */

// ---- CONFIGURAÇÃO CENTRALIZADA (editar aqui, sem tocar no código abaixo) ----
// classes: nomes das classes CSS usadas para montar os cards (definidas em
//          shared/css/mt-loteamento.css). Trocar nome de classe = editar aqui.
// labelsSimNao: textos exibidos nos dois cards das perguntas Sim/Não.
// labelsOpcaoAtendimento: textos exibidos nos dois cards de "Opção de Atendimento".
// camposSimNao: data-k de cada <select> Sim/Não a converter em cards.
const TOGGLE_CARDS_CONFIG = {
  classes: {
    group: "toggle-group",
    btn: "toggle-btn",
    active: "on",
  },
  labelsSimNao: {
    sim: "Sim",
    nao: "Não",
  },
  labelsOpcaoAtendimento: {
    cativo: "Cativo",
    livre: "Livre",
  },
  // "desejaVenc" não entra aqui: esse campo é controlado pelos cards de
  // "Dia do vencimento" (CAMPOS_CARDS_CONFIG.diaVencimento em app.js).
  camposSimNao: [
    "mudancaLocal",
    "subPronta",
    "compartilhada",
    "alt_troca",
    "monomia",
    "escalonada",
    "gerMomentaneo",
    "gridZero",
    "btMesmaProp",
  ],
};

/* ===== Renderização (lê apenas a configuração acima) ===== */
function _toggleCardsBotao(label, ativo, classes, onSelecionar) {
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = classes.btn + (ativo ? " " + classes.active : "");
  btn.textContent = label;
  btn.addEventListener("click", onSelecionar);
  return btn;
}

function _toggleCardsMontar(select, opcoes) {
  if (!select || select.dataset.toggleCardMontado) return;
  select.dataset.toggleCardMontado = "1";
  const classes = TOGGLE_CARDS_CONFIG.classes;
  const grupo = document.createElement("div");
  grupo.className = classes.group;

  const render = () => {
    grupo.innerHTML = "";
    opcoes.forEach((op) => {
      const ativo = select.value === op.value;
      grupo.appendChild(
        _toggleCardsBotao(op.label, ativo, classes, () => {
          if (select.disabled) return;
          select.value = op.value;
          select.dispatchEvent(new Event("input", { bubbles: true }));
          select.dispatchEvent(new Event("change", { bubbles: true }));
          render();
        }),
      );
    });
  };
  render();

  select.style.display = "none";
  select.setAttribute("aria-hidden", "true");
  select.insertAdjacentElement("afterend", grupo);
}

function inicializarToggleCards() {
  const L = TOGGLE_CARDS_CONFIG.labelsSimNao;
  TOGGLE_CARDS_CONFIG.camposSimNao.forEach((k) => {
    const select = document.querySelector(`select[data-k="${k}"]`);
    _toggleCardsMontar(select, [
      { value: "Sim", label: L.sim },
      { value: "Não", label: L.nao },
    ]);
  });

  const Lop = TOGGLE_CARDS_CONFIG.labelsOpcaoAtendimento;
  const selOpcao = document.querySelector('select[data-k="opcaoAtend"]');
  _toggleCardsMontar(selOpcao, [
    { value: "Cativo", label: Lop.cativo },
    { value: "Livre", label: Lop.livre },
  ]);
}

document.addEventListener("DOMContentLoaded", inicializarToggleCards);
