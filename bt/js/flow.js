/* ============================================================
   CEMIG BT — Fluxo por tipo de formulário (etapas + dispatch de views)
   ------------------------------------------------------------
   Separa o BT em formulários roteados por `card.formType`
   (individual | coletivo | condominio). Cada fluxo tem sua própria
   lista de etapas (`abas*`) e seu dispatch de views (`renderEtapa*`),
   para que o Individual possa divergir nas próximas fases SEM afetar
   Coletivo/Condomínio.

   FASE 2: o Individual ainda compartilha exatamente a lógica atual
   (ramificada em runtime por coletivo/multiTorres) — as funções
   `*Individual` apenas delegam para as `*Coletivo`. A divergência real
   (gerador→cargas, tipo+obra fundidos, múltiplas UCs) entra nas fases
   seguintes, editando só as funções do Individual.

   Estado, chrome (topbar/sidebar/header/nav/footer) e roteamento de
   modalidade continuam em app.js (fonte única, sem duplicação).
   ============================================================ */

// ---- Etapas (sidebar/stepper) -------------------------------------------
// s = { coletivo, multiTorres } — preserva a montagem condicional atual.
function abasBTColetivo(s) {
  const abas = [
    { k: "orient", l: "Orientações" },
    { k: "tipo", l: "Dados para contato" },
    { k: "corr", l: "Correspondência" },
    { k: "empr", l: "Empreendimento" },
  ];
  if (s.multiTorres) {
    abas.push({ k: "blocos", l: "Torres / Blocos" });
  } else {
    abas.push({ k: "ucs", l: "Unidades Consumidoras" });
    abas.push({
      k: "cargas",
      l: s.coletivo ? "Previsão de Carga" : "Atendimento",
    });
  }
  abas.push(
    { k: "obs", l: "Observações" },
    { k: "revisar", l: "Prévia & PDF" },
  );
  return abas;
}

function abasBTIndividual() {
  return [
    { k: "orient", l: "Orientações" },
    { k: "prop", l: "Dados do proprietário" },
    { k: "corr", l: "Correspondência" },
    { k: "dados", l: "Dados da unidade" },
    { k: "cargas", l: "Atendimento" },
    { k: "obs", l: "Observações" },
    { k: "revisar", l: "Prévia & PDF" },
  ];
}

// ---- Dispatch de views por etapa ----------------------------------------
function renderEtapaBTColetivo(ctx) {
  const { aba, coletivo, multiTorres } = ctx;
  return /* @__PURE__ */ React.createElement(
    React.Fragment,
    null,
    aba === "orient" && /* @__PURE__ */ React.createElement(TabOrient, { ctx }),
    aba === "tipo" && /* @__PURE__ */ React.createElement(TabTipo, { ctx }),
    aba === "empr" &&
      /* @__PURE__ */ React.createElement(TabEmpreendimento, { ctx }),
    aba === "corr" &&
      /* @__PURE__ */ React.createElement(TabCorrespondencia, { ctx }),
    aba === "blocos" &&
      multiTorres &&
      /* @__PURE__ */ React.createElement(TabBlocos, { ctx }),
    aba === "ucs" &&
      coletivo &&
      !multiTorres &&
      /* @__PURE__ */ React.createElement(TabUcsColetivo, { ctx }),
    aba === "ucs" &&
      !coletivo &&
      /* @__PURE__ */ React.createElement(TabUcsIndividual, { ctx }),
    aba === "cargas" &&
      coletivo &&
      !multiTorres &&
      /* @__PURE__ */ React.createElement(TabCargasColetivo, { ctx }),
    aba === "cargas" &&
      !coletivo &&
      /* @__PURE__ */ React.createElement(TabCargasIndividual, { ctx }),
    aba === "obs" && /* @__PURE__ */ React.createElement(TabObs, { ctx }),
    aba === "revisar" &&
      /* @__PURE__ */ React.createElement(TabRevisar, { ctx }),
  );
}
// Individual (Fase 4): dispatch exclusivo do individual — sem nenhum caso de
// coletivo/multiTorres (lógica órfã removida). "dados" rende a etapa fundida
// "Dados da unidade" (TabDadosUnidade = Tipo individual + Obra); "cargas"
// rende as cargas + o Gerador (Fase 3).
function renderEtapaBTIndividual(ctx) {
  const { aba } = ctx;
  return /* @__PURE__ */ React.createElement(
    React.Fragment,
    null,
    aba === "orient" && /* @__PURE__ */ React.createElement(TabOrient, { ctx }),
    aba === "prop" &&
      /* @__PURE__ */ React.createElement(TabProprietario, { ctx }),
    aba === "corr" &&
      /* @__PURE__ */ React.createElement(TabCorrespondencia, { ctx }),
    aba === "dados" &&
      /* @__PURE__ */ React.createElement(TabDadosUnidade, { ctx }),
    /* "cargas" inclui o Gerador como subseção do mesmo card (ver
       views/cargas-individual.js) — não há mais TabGerador no Individual. */
    aba === "cargas" &&
      /* @__PURE__ */ React.createElement(TabCargasIndividual, { ctx }),
    aba === "obs" && /* @__PURE__ */ React.createElement(TabObs, { ctx }),
    aba === "revisar" &&
      /* @__PURE__ */ React.createElement(TabRevisar, { ctx }),
  );
}

// ---- Seleção do fluxo pelo card -----------------------------------------
function abasBT(formType, s) {
  return formType === "individual" ? abasBTIndividual(s) : abasBTColetivo(s);
}
function renderEtapaBT(formType, ctx) {
  return formType === "individual"
    ? renderEtapaBTIndividual(ctx)
    : renderEtapaBTColetivo(ctx);
}
