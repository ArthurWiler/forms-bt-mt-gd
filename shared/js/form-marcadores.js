/* ============================================================
   CEMIG — Convenção de marcadores + trava de avanço (forms vanilla)
   ------------------------------------------------------------
   Espelha, para os formulários em HTML/JS puro (MT, Loteamento,
   Desistência), a mesma convenção do componente `Field` dos forms
   React:
     • campo obrigatório → SEM "*";
     • campo opcional     → sufixo "(opcional)".
   E marca os controles obrigatórios com `data-req` para a validação
   por etapa (só avança quando os obrigatórios VISÍVEIS estão
   preenchidos), sinalizando faltas com a classe única `.is-invalid`.
   ============================================================ */
(function () {
  // Um único controle bindado ao estado dentro de um `.field`.
  function _controle(field) {
    return field.querySelector(
      "input[data-k], select[data-k], textarea[data-k]",
    );
  }
  function _editavel(el) {
    return el && !el.disabled && !el.readOnly && el.type !== "hidden";
  }

  // Aplica a convenção. Idempotente: pode rodar de novo após render dinâmico.
  function aplicar(root) {
    root = root || document;
    root.querySelectorAll(".field").forEach(function (field) {
      const label = field.querySelector(":scope > label");
      if (!label) return;
      const control = _controle(field);
      const reqSpan = label.querySelector(".req");
      if (reqSpan) {
        // Obrigatório: remove o "*" e marca o controle p/ validação.
        reqSpan.remove();
        if (_editavel(control)) control.setAttribute("data-req", "");
        return;
      }
      // Idempotência: se já foi marcado como obrigatório numa passada anterior
      // (o "*" já não existe), não o trate como opcional.
      if (control && control.hasAttribute("data-req")) return;
      // Opcional: acrescenta "(opcional)" uma única vez, só em campos
      // realmente preenchíveis (ignora somente-leitura/calculados) e
      // quando não há opt-out `data-noopt`.
      if (
        _editavel(control) &&
        !field.hasAttribute("data-noopt") &&
        !label.querySelector(".opt")
      ) {
        const s = document.createElement("span");
        s.className = "opt";
        s.textContent = "(opcional)";
        label.append(" ", s);
      }
    });
    // Remove qualquer "*" remanescente fora de `.field` (rótulos de seção etc.).
    root.querySelectorAll(".req").forEach(function (s) {
      s.remove();
    });
  }

  // Valida os obrigatórios VISÍVEIS dentro de `scope`. Marca faltas com
  // `.is-invalid`. Retorna { ok, primeiro } (primeiro campo inválido).
  function validar(scope) {
    scope = scope || document;
    let ok = true;
    let primeiro = null;
    scope.querySelectorAll("[data-req]").forEach(function (el) {
      el.classList.remove("is-invalid");
      // offsetParent === null quando algum ancestral está display:none
      // (etapas inativas, blocos condicionais) → não conta.
      const visivel = el.offsetParent !== null;
      if (visivel && String(el.value || "").trim() === "") {
        el.classList.add("is-invalid");
        if (!primeiro) primeiro = el;
        ok = false;
      }
    });
    return { ok: ok, primeiro: primeiro };
  }

  // Limpa a marcação de erro quando o usuário começa a preencher.
  document.addEventListener("input", function (e) {
    const el = e.target;
    if (el && el.hasAttribute && el.hasAttribute("data-req")) {
      el.classList.remove("is-invalid");
    }
  });

  // Botão "Avançar/Iniciar" de uma etapa: o primary do .nav-bottom que
  // navega para FRENTE — via data-nav="next" (fragmentos compartilhados do
  // BT) ou onclick="goTo(...)" (MT/Loteamento/Desistência). Não é o
  // "Voltar", que é ghost. Retorna null se não houver (ex.: última etapa,
  // que exporta em vez de avançar).
  function _botaoAvancar(page) {
    const nb = page.querySelector(".nav-bottom");
    if (!nb) return null;
    const btns = nb.querySelectorAll("button.btn-primary");
    for (let i = 0; i < btns.length; i++) {
      if (btns[i].getAttribute("data-nav") === "next") return btns[i];
      const oc = btns[i].getAttribute("onclick") || "";
      if (/goTo\s*\(/.test(oc)) return btns[i];
    }
    return null;
  }

  // Reavalia TODOS os botões "Avançar" visíveis: habilita quando os
  // obrigatórios da etapa estão preenchidos, desabilita caso contrário.
  // Sem marcar .is-invalid (isso só acontece ao tentar avançar/validar).
  function _reqOk(scope) {
    let ok = true;
    scope.querySelectorAll("[data-req]").forEach(function (el) {
      if (el.offsetParent !== null && String(el.value || "").trim() === "")
        ok = false;
    });
    return ok;
  }
  function atualizarAvancar(root) {
    root = root || document;
    root.querySelectorAll(".page").forEach(function (page) {
      const btn = _botaoAvancar(page);
      if (!btn) return;
      // Um gate extra pode ser declarado no botão via data-gate="funcName":
      // a função (global) deve retornar true quando LIBERADO. Usado, p.ex.,
      // pelo aceite "Declaro que li…" das Orientações.
      const gateNome = btn.getAttribute("data-gate");
      let gateOk = true;
      if (gateNome && typeof window[gateNome] === "function") {
        try {
          gateOk = !!window[gateNome]();
        } catch (e) {
          gateOk = true;
        }
      }
      btn.disabled = !(_reqOk(page) && gateOk);
    });
  }

  // Liga a reatividade: recalcula os botões a cada digitação/alteração e uma
  // vez ao montar. Idempotente.
  function montarNavReativa() {
    atualizarAvancar(document);
    if (montarNavReativa._ligado) return;
    montarNavReativa._ligado = true;
    ["input", "change"].forEach(function (ev) {
      document.addEventListener(ev, function () {
        atualizarAvancar(document);
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    aplicar(document);
    montarNavReativa();
  });

  // Gate do aceite das Orientações: o botão "Iniciar preenchimento" só libera
  // com o checkbox "#aceiteOrient" marcado. Referenciado via
  // data-gate="aceiteOrientacoesOk" no botão.
  window.aceiteOrientacoesOk = function () {
    const c = document.getElementById("aceiteOrient");
    return !c || c.checked;
  };

  window.CemigMarcadores = {
    aplicar: aplicar,
    validar: validar,
    atualizarAvancar: atualizarAvancar,
    montarNavReativa: montarNavReativa,
  };
})();
