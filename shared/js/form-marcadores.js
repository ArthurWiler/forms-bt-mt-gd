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

  // Campos de data (input[type=date]) mostram um placeholder nativo
  // "dd/mm/aaaa" que não pode ser removido via atributo `placeholder`.
  // Convenção do projeto: enquanto vazio/sem foco, mostrar SÓ o rótulo
  // (nenhum placeholder). O seletor de data (com o formato dd/mm/aaaa) só
  // aparece quando o usuário interage. Truque: manter o controle como
  // `type="text"` (rótulo isolado) e trocar para `type="date"` no foco;
  // reverter no blur se continuar vazio. O valor persiste em ISO
  // (yyyy-mm-dd), idêntico ao input date nativo, então o bind por data-k
  // (listeners input/change no mesmo elemento) não é afetado.
  function _prepararDatas(root) {
    // Pega os que ainda são type=date (estáticos ou recém-injetados). Os já
    // convertidos numa passada anterior carregam a flag data-cmg-date e são
    // ignorados pelo guard de idempotência abaixo.
    root.querySelectorAll('input[type="date"]').forEach(_ativarData);
  }
  function _ativarData(el) {
    if (el.hasAttribute("data-cmg-date")) return; // handlers já ligados
    el.setAttribute("data-cmg-date", ""); // marca/idempotência
    if (!el.value) _paraTextoVazio(el); // vazio → esconde o dd/mm/aaaa nativo
    el.addEventListener("focus", function () {
      if (el.type !== "date") {
        el.type = "date";
        el.removeAttribute("placeholder"); // date ignora placeholder
      }
      if (typeof el.showPicker === "function") {
        try {
          el.showPicker();
        } catch (e) {
          /* showPicker exige gesto do usuário em alguns browsers */
        }
      }
    });
    el.addEventListener("blur", function () {
      if (!el.value) _paraTextoVazio(el); // vazio → volta a mostrar só o rótulo
    });
  }
  // Campo vazio como texto: um placeholder " " (espaço) mantém o estado
  // :placeholder-shown ativo, que é o gatilho do rótulo flutuante (Padrão B,
  // shared.css) para OCUPAR a célula (16px, centralizado) — igual aos demais
  // campos vazios. Sem esse placeholder o :placeholder-shown não vale e o
  // rótulo iria pro topo. O espaço não é visível (mesma convenção do Inp React).
  function _paraTextoVazio(el) {
    el.type = "text";
    if (!el.getAttribute("placeholder")) el.setAttribute("placeholder", " ");
  }

  // Aplica a convenção. Idempotente: pode rodar de novo após render dinâmico.
  function aplicar(root) {
    root = root || document;
    _prepararDatas(root);
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

  // Validação de FORMATO declarada no campo via `data-fmt="nomeDaFuncao"`.
  // A função global recebe o valor e retorna { valido, msg } — ver
  // shared/js/valida-instalacao.js. Campo vazio nunca é reprovado aqui
  // (isso é papel do data-req), então os dois atributos se combinam.
  function _fmtErro(el) {
    const nome = el.getAttribute && el.getAttribute("data-fmt");
    if (!nome || typeof window[nome] !== "function") return "";
    const v = String(el.value || "").trim();
    if (v === "") return "";
    try {
      const r = window[nome](v);
      return r && r.valido === false ? r.msg || "Formato inválido." : "";
    } catch (e) {
      return "";
    }
  }

  // Mostra/limpa a mensagem de erro de formato abaixo do campo. Reutiliza a
  // supporting-text de erro já usada pelos formulários (.field-hint.field-err).
  function _mostrarErroFmt(el, msg) {
    const campo = el.closest && el.closest(".field");
    if (!campo) return;
    let sp = campo.querySelector(":scope > .field-err-fmt");
    if (!msg) {
      if (sp) sp.remove();
      return;
    }
    if (!sp) {
      sp = document.createElement("span");
      sp.className = "field-hint field-err field-err-fmt";
      campo.appendChild(sp);
    }
    sp.textContent = msg;
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
    // Formato inválido também reprova (mesmo em campo não obrigatório: se foi
    // preenchido, precisa estar certo).
    scope.querySelectorAll("[data-fmt]").forEach(function (el) {
      if (el.offsetParent === null) return;
      const msg = _fmtErro(el);
      _mostrarErroFmt(el, msg);
      if (msg) {
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

  // Campos com validação de formato: o aviso aparece ao SAIR do campo (não a
  // cada tecla, que acusaria erro no meio da digitação) e some ao voltar a
  // editar.
  document.addEventListener(
    "blur",
    function (e) {
      const el = e.target;
      if (!el || !el.hasAttribute || !el.hasAttribute("data-fmt")) return;
      const msg = _fmtErro(el);
      _mostrarErroFmt(el, msg);
      el.classList.toggle("is-invalid", !!msg);
    },
    true,
  );
  document.addEventListener("input", function (e) {
    const el = e.target;
    if (!el || !el.hasAttribute || !el.hasAttribute("data-fmt")) return;
    _mostrarErroFmt(el, "");
    el.classList.remove("is-invalid");
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
    // Formato inválido trava o "Avançar" do mesmo jeito que um obrigatório
    // em branco (sem marcar .is-invalid — isso só ao tentar avançar).
    scope.querySelectorAll("[data-fmt]").forEach(function (el) {
      if (el.offsetParent !== null && _fmtErro(el)) ok = false;
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
