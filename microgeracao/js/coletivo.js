/* ============================================================
   MICROGERAÇÃO — Fluxo Coletivo/Agrupamento
   ------------------------------------------------------------
   Ativo quando "Tipo de edificação" (etapa 5) = "Edificação
   Coletiva ou Agrupamento". Monta as etapas "Dados da torre" e
   "Dados das unidades", que substituem a etapa "Cargas das UCs"
   do fluxo individual.

   MÉTODO DE CÁLCULO — a regra é a mesma do BT coletivo, decidida
   SÓ pela quantidade de apartamentos residenciais (a área não
   escolhe o método; ela define o fator A dentro do ND-5.2):

     • 4 ou mais apartamentos residenciais → ND-5.2:
         D = 1,4 × F × A   (shared/js/calc-nd52.js)
       somada à demanda geral não residencial informada pelo RT.
     • menos de 4 → "modo calculadora": cada UC detalha as
       próprias cargas pela ND-5.1, na mesma ilha do fluxo
       individual (montarCargaAcordeao), e a demanda do
       agrupamento é a soma das demandas das UCs.

   O estado vive em state.ucs[] e state.agr (js/model.js).
   ============================================================ */

/* ===== helpers locais ===== */
const gdNum = (v) => {
  const n = Number(String(v == null ? "" : v).replace(",", "."));
  return isNaN(n) ? 0 : n;
};
// Acordeão aberto por UC (só um por vez, como no BT).
const _gdUcAberta = {};

// A UC "Caixa Existente sem Alteração" não entra em nenhum cálculo: ela é
// declarada só para compor o agrupamento.
const gdUcSemAlteracao = (u) =>
  (u && u.solicitacao) === "Caixa Existente sem Alteração";

/* ===== derivados do ND-5.2 ===== */
// Quantidade e área média ponderada das UCs residenciais + o resultado do
// ND-5.2 (null enquanto os parâmetros estiverem fora da faixa da norma).
function gdNd52Info() {
  const residenciais = (state.ucs || []).filter(
    (u) => u.atividade === "Residencial" && !gdUcSemAlteracao(u),
  );
  const quantidadeApartamentos = residenciais.length;
  const areaMediaPonderada = !quantidadeApartamentos
    ? 0
    : residenciais.reduce((s, u) => s + gdNum(u.area), 0) /
      quantidadeApartamentos;
  return {
    quantidadeApartamentos,
    areaMediaPonderada,
    nd52: nd52CalcularDemandaApartamentos(
      areaMediaPonderada,
      quantidadeApartamentos,
    ),
  };
}

// Menos de 4 apartamentos residenciais → cada UC detalha as cargas (ND-5.1).
const gdModoCalculadora = () => gdNd52Info().quantidadeApartamentos < 4;

const gdTemUcNaoResidencial = () =>
  (state.ucs || []).some(
    (u) => u.atividade && u.atividade !== "Residencial" && !gdUcSemAlteracao(u),
  );

// Demanda total das UCs do agrupamento, conforme o método vigente.
function gdDemandaPrevTotal() {
  if (gdModoCalculadora())
    return (state.ucs || []).reduce(
      (s, u) => s + (gdUcSemAlteracao(u) ? 0 : gdNum((u.cargas || {})._demanda)),
      0,
    );
  const nd52 = gdNd52Info().nd52;
  const naoRes = gdTemUcNaoResidencial()
    ? gdNum(state.demandaNaoResidencial)
    : 0;
  return (nd52 ? nd52.demandaKVA : 0) + naoRes;
}

// Carga instalada total (kW): no ND-5.2 vem do campo "Carga prevista" de cada
// UC; no modo calculadora, das cargas detalhadas.
function gdCargaPrevTotal() {
  const calc = gdModoCalculadora();
  return (state.ucs || []).reduce((s, u) => {
    if (gdUcSemAlteracao(u)) return s;
    return s + (calc ? gdNum((u.cargas || {})._cargaKw) : gdNum(u.cargaPrevista));
  }, 0);
}

// Maior corrente entre os disjuntores das UCs — piso de seletividade do geral.
const gdMaiorCorrenteUC = () =>
  (state.ucs || []).reduce(
    (mx, u) =>
      Math.max(mx, correnteDisj(gdDisjUC(u)), correnteDisj(u.disjDe || "")),
    0,
  );

// Disjuntor efetivo da UC: o escolhido ou, no modo calculadora, o menor
// adequado calculado pelas cargas declaradas.
const gdDisjUC = (u) =>
  (u && u.disjPara) || (u && u.cargas && (u.cargas._disjuntores || [])[0]) || "";

// Só o MENOR disjuntor geral adequado (seletividade + capacidade).
const gdOpcoesDisjGeral = () =>
  disjuntoresGeraisAcima(gdMaiorCorrenteUC(), gdDemandaPrevTotal()).slice(0, 1);

/* ===== sincronização de estado ===== */
// state.ucs acompanha state.nUCs (aceita valor bruto: campo vazio durante a
// digitação não redimensiona a lista nem apaga UCs já preenchidas).
function gdSincronizarUcs() {
  if (String(state.nUCs == null ? "" : state.nUCs).trim() === "") return;
  const n = Math.max(1, Number(state.nUCs) || 1);
  const arr = state.ucs;
  while (arr.length < n) arr.push(gdUcPadrao(arr.length));
  while (arr.length > n) arr.pop();
}

// Preset de carga prevista da UC residencial pelo disjuntor: preenche quando o
// campo está vazio ou ainda tem o valor de outro preset (não sobrescreve o que
// o usuário digitou).
function gdAplicarPresetResidencial() {
  const presets = Object.values(GD_PRESET_PREV_RESIDENCIAL);
  (state.ucs || []).forEach((u) => {
    if (u.atividade !== "Residencial") return;
    const preset = GD_PRESET_PREV_RESIDENCIAL[u.disjPara];
    if (!preset) return;
    const atual = String(u.cargaPrevista == null ? "" : u.cargaPrevista);
    if (atual === "" || (presets.includes(atual) && atual !== preset))
      u.cargaPrevista = preset;
  });
}

// Auto-seleciona o menor disjuntor geral válido. Lista vazia zera o valor: um
// valor órfão continuaria valendo na validação sem aparecer no campo.
function gdAutoSelecionarDisjGeral() {
  const ops = gdOpcoesDisjGeral();
  if (!ops.length) state.disjGeralAgr = "";
  else if (!(state.disjGeralAgr && ops.includes(state.disjGeralAgr)))
    state.disjGeralAgr = ops[0];
}

/* ===== etapa "Dados da torre" ===== */
function gdRenderTorre() {
  const box = $("#gdTorreBox");
  if (!box) return;
  const endBox = $("#gdTorreEndereco");
  if (endBox) {
    endBox.innerHTML = "";
    endBox.appendChild(gdBlocoEndereco(""));
  }
  box.innerHTML = "";
  const grid = document.createElement("div");
  grid.className = "grid grid-2";

  // Quantidade de unidades: redimensiona state.ucs.
  {
    const inp = cmgInp(
      state.nUCs,
      (v) => {
        const antes = state.ucs.length > 1;
        state.nUCs = v;
        // Campo vazio (apagou para redigitar) não redimensiona a lista: aceita
        // o valor bruto e mantém as UCs preenchidas até vir um número válido.
        if (String(v == null ? "" : v).trim() === "") return;
        gdSincronizarUcs();
        // A lista cresceu/encolheu: reaplica a sequência de complementos para
        // as UCs novas nascerem numeradas (gdRenderUcs abaixo reflete tudo).
        gdAplicarComplementos();
        gdRenderUcs();
        // Este card contém o próprio campo de quantidade, então só é refeito
        // quando a visibilidade de "por andar"/"Primeiro complemento" muda
        // (1 ↔ 2+ unidades) — preservando o cursor de quem está digitando.
        if (state.ucs.length > 1 !== antes) cmgPreservandoFoco(gdRenderTorre);
        if (window.CemigMarcadores) CemigMarcadores.atualizarAvancar();
      },
      { type: "number", placeholder: "Ex: 12" },
    );
    inp.setAttribute("data-foco", "gd-qtd-ucs");
    inp.setAttribute("min", "1");
    const f = cmgCampo("Quantidade de unidades <span class='req'>*</span>", inp);
    f.setAttribute("data-noopt", "");
    // Sem "Identificação da torre" ao lado, a Quantidade fica sozinha na linha
    // — mesma largura de uma coluna, para os pares abaixo ficarem alinhados.
    f.classList.add("row-solo");
    grid.appendChild(f);
  }

  // Agrupamento com UMA unidade: não há sequência a gerar, mas o usuário ainda
  // precisa dizer QUE tipo de complemento é aquela unidade — o valor vira o
  // complemento da UC.
  if (state.ucs.length === 1) {
    const f = cmgCampo(
      "Tipo de complemento",
      cmgSelectDe(
        TIPOS_COMPLEMENTO,
        state.agr.tipoComplemento,
        (v) => {
          state.agr.tipoComplemento = v;
          const uc = state.ucs[0];
          if (uc) uc.complemento = v;
          gdRenderTorre();
          gdRenderUcs();
        },
        true,
      ),
      "field--float",
    );
    f.setAttribute("data-noopt", "");
    grid.appendChild(f);
  }

  // 2+ unidades: "por andar" + "Primeiro complemento" geram automaticamente os
  // complementos das UCs (101, 102… 201, 202…) — ver gdAutoGerarComplementos.
  if (state.ucs.length > 1) {
    const maxUnid = state.ucs.length;
    // Faixas customizadas (popup "Composição por pavimento"): quando existem, o
    // campo "por andar" vira só-leitura "Customizado" e a composição aparece em
    // cards abaixo.
    const faixasCustom = normalizarFaixasPavimento(state.agr.aptosPorAndarFaixas);
    const custom = faixasCustom.length > 0;
    const inpAndar = cmgInp(
      custom ? "Customizado" : state.agr.aptosPorAndar,
      (v) => {
        // Não faz sentido mais unidades por andar do que UCs; limita ao total.
        const n = parseInt(v);
        if (Number.isFinite(n) && n > maxUnid) {
          v = String(maxUnid);
          inpAndar.value = v;
        }
        state.agr.aptosPorAndar = v;
        // Digitar aqui volta ao caso uniforme: as faixas teriam precedência e
        // fariam o valor digitado ser ignorado silenciosamente.
        state.agr.aptosPorAndarFaixas = null;
        gdAutoGerarComplementos();
      },
      custom ? { type: "text" } : { type: "number", placeholder: "Ex: 4" },
    );
    inpAndar.setAttribute("data-foco", "gd-por-andar");
    if (custom) inpAndar.readOnly = true;
    else inpAndar.max = String(maxUnid);

    const btnCustom = document.createElement("button");
    btnCustom.type = "button";
    btnCustom.className = "btn btn-ghost btn-outlined-acao field-acao-btn";
    btnCustom.innerHTML =
      '<img class="field-acao-icon" src="../imgs/edit.svg" alt="" aria-hidden="true" />Customizar';
    btnCustom.title = "Personalizar a quantidade de unidades por andar";
    const abrirCustom = () =>
      abrirComposicaoPavimento(
        state.agr.aptosPorAndarFaixas,
        (faixas) => {
          state.agr.aptosPorAndarFaixas = faixas;
          // As unidades do 1º pavimento viram o padrão do campo "por andar"
          // (o popup é a fonte da verdade).
          if (faixas && faixas.length)
            state.agr.aptosPorAndar = String(faixas[0].unidades);
          gdAutoGerarComplementos();
          gdRenderTorre();
        },
        state.ucs.length,
      );
    btnCustom.addEventListener("click", abrirCustom);
    if (custom) inpAndar.addEventListener("click", abrirCustom);
    grid.appendChild(
      gdCampoComAcao("Quantidade de unidades por andar", inpAndar, btnCustom),
    );

    const fCompl = cmgCampo(
      "Primeiro complemento",
      cmgInp(
        state.agr.complInicial,
        (v) => {
          state.agr.complInicial = v;
          gdAutoGerarComplementos();
        },
        { placeholder: "Ex: 101 ou Apto 01" },
      ),
    );
    fCompl.setAttribute("data-noopt", "");
    const inpCompl = fCompl.querySelector("input");
    if (inpCompl) inpCompl.setAttribute("data-foco", "gd-compl-inicial");
    grid.appendChild(fCompl);

    // Composição por pavimento (só-leitura), quando customizada.
    if (custom) grid.appendChild(gdFaixasComposicao(faixasCustom));
  }

  // Demanda do condomínio (áreas comuns / combate a incêndio).
  {
    const f = cmgCampo(
      "Demanda do condomínio (kVA)",
      cmgInp(
        state.agr.demandaIncendio,
        (v) => {
          state.agr.demandaIncendio = v;
          gdAutoSelecionarDisjCondominio();
          cmgPreservandoFoco(gdRenderTorre);
        },
        { type: "number", placeholder: "0,0" },
      ),
    );
    f.setAttribute("data-noopt", "");
    const inp = f.querySelector("input");
    if (inp) inp.setAttribute("data-foco", "gd-dem-cond");
    grid.appendChild(f);
  }

  // Disjuntor do condomínio: menor que atende a demanda informada.
  {
    const ops = gdOpcoesDisjCondominio();
    const f = cmgCampo(
      "Disjuntor do condomínio",
      cmgSelectDe(
        ops,
        state.agr.disjIncendio,
        (v) => {
          state.agr.disjIncendio = v;
          if (window.CemigMarcadores) CemigMarcadores.atualizarAvancar();
        },
        true,
      ),
      "field--float",
    );
    f.setAttribute("data-noopt", "");
    grid.appendChild(f);
  }

  box.appendChild(grid);
  if (window.CemigMarcadores) {
    CemigMarcadores.aplicar(box);
    CemigMarcadores.atualizarAvancar();
  }
}

// Preenche o complemento de todas as UCs a partir do primeiro complemento e da
// quantidade por andar (ou das faixas do popup). Mesma sequência do BT —
// gerarComplementos vive em shared/js/complementos.js.
// Só escreve no estado; quem chama decide se re-renderiza a lista de UCs.
function gdAplicarComplementos() {
  const lista = gerarComplementos(
    state.agr.complInicial,
    state.ucs.length,
    state.agr.aptosPorAndar,
    state.agr.aptosPorAndarFaixas,
  );
  if (!lista) return false;
  state.ucs.forEach((u, k) => (u.complemento = lista[k]));
  return true;
}
// Aplica e reflete nos cabeçalhos/campos das UCs.
function gdAutoGerarComplementos() {
  if (gdAplicarComplementos()) gdRenderUcs();
}

// Campo com botão de ação ao lado (o "Customizar" do por-andar).
function gdCampoComAcao(labelTxt, controle, botao) {
  const f = document.createElement("div");
  f.className = "field field--plain field--com-acao";
  f.setAttribute("data-noopt", "");
  const corpo = document.createElement("div");
  corpo.className = "field-acao-corpo";
  const lbl = document.createElement("label");
  lbl.className = "field-acao-label";
  lbl.textContent = labelTxt;
  controle.classList.add("field-acao-input");
  corpo.append(lbl, controle);
  f.append(corpo, botao);
  return f;
}

// Card só-leitura (rótulo em cima, valor embaixo) das faixas de pavimento.
function gdCampoLeitura(labelTxt, valor) {
  const f = document.createElement("div");
  f.className = "field field--plain faixa-card";
  f.setAttribute("data-noopt", "");
  const lbl = document.createElement("span");
  lbl.className = "faixa-card-label";
  lbl.textContent = labelTxt;
  const val = document.createElement("span");
  val.className = "faixa-card-valor";
  val.textContent = valor;
  f.append(lbl, val);
  return f;
}

// Composição por pavimento (só-leitura): uma linha por faixa.
function gdFaixasComposicao(faixas) {
  const box = document.createElement("div");
  box.className = "col-span-2 faixas-composicao";
  faixas.forEach((f) => {
    const linha = document.createElement("div");
    linha.className = "grid grid-3";
    linha.append(
      gdCampoLeitura("Andar inicial", String(f.ini)),
      gdCampoLeitura("Andar final", String(f.fim)),
      gdCampoLeitura("Unidades por andar", String(f.unidades)),
    );
    box.appendChild(linha);
  });
  return box;
}

const gdOpcoesDisjCondominio = () =>
  selecionarDisjuntores(gdNum(state.agr.demandaIncendio), false).map(
    (d) => d.fx,
  );

function gdAutoSelecionarDisjCondominio() {
  const ops = gdOpcoesDisjCondominio();
  if (!ops.length) state.agr.disjIncendio = "";
  else if (!(state.agr.disjIncendio && ops.includes(state.agr.disjIncendio)))
    state.agr.disjIncendio = ops[0];
}

// Endereço da obra reapresentado no topo dos cards (somente leitura), como nos
// cards de torre do BT.
function gdEnderecoObraTxt(complemento) {
  const base = [state.logradouro, state.numero].filter(Boolean).join(", ");
  return (base || "—") + (complemento ? `, ${complemento}` : "");
}
function gdBlocoEndereco(complemento) {
  const box = document.createElement("div");
  box.className = "endereco-bloco";
  const lbl = document.createElement("span");
  lbl.className = "uc-head-endereco-label";
  lbl.textContent = "Endereço";
  const val = document.createElement("span");
  val.className = "uc-head-endereco";
  val.textContent = gdEnderecoObraTxt(complemento);
  box.append(lbl, val);
  return box;
}

/* ===== etapa "Dados das unidades" ===== */
function gdRenderUcs() {
  const box = $("#gdUcsBox");
  if (!box) return;
  gdSincronizarUcs();
  gdAplicarPresetResidencial();
  const modoCalc = gdModoCalculadora();
  box.innerHTML = "";

  state.ucs.forEach((u, ui) => {
    const aberta = _gdUcAberta[ui] === true;
    const bloco = document.createElement("div");
    bloco.className = "uc-colapsavel" + (aberta ? " is-open" : "");
    const head = document.createElement("button");
    head.type = "button";
    head.className = "uc-colapsavel-head";
    head.setAttribute("aria-expanded", aberta ? "true" : "false");
    head.innerHTML =
      `<span class="uc-head-info"><span class="uc-colapsavel-titulo">Unidade consumidora ` +
      `<span class="carga-acc-badge">${ui + 1} de ${state.ucs.length}</span></span></span>` +
      `<span class="carga-acc-chevron uc-colapsavel-chevron" aria-hidden="true"></span>`;
    head.addEventListener("click", () => {
      cmgToggleExclusivo(_gdUcAberta, ui, !aberta);
      gdRenderUcs();
    });
    bloco.appendChild(head);

    if (aberta) {
      const corpo = document.createElement("div");
      corpo.className = "uc-colapsavel-corpo";
      const endereco = gdBlocoEndereco(u.complemento);
      corpo.appendChild(endereco);
      const grid = document.createElement("div");
      grid.className = "grid grid-2";
      if (modoCalc && !gdUcSemAlteracao(u)) grid.style.marginBottom = "24px";

      // Complemento
      {
        const f = cmgCampo(
          "Complemento da unidade",
          cmgInp(
            u.complemento,
            (v) => {
              u.complemento = v;
              endereco.querySelector(".uc-head-endereco").textContent =
                gdEnderecoObraTxt(v);
            },
            { placeholder: "Ex: 101" },
          ),
        );
        if (state.ucs.length > 1) f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      }

      // Tipo de solicitação (estrutural: campos aparecem/somem)
      {
        const f = cmgCampo(
          "Tipo de solicitação",
          cmgSelectDe(
            ["Conexão Nova", "Alteração de Carga", "Caixa Existente sem Alteração"],
            u.solicitacao,
            (v) => {
              u.solicitacao = v;
              gdRenderUcs();
              gdAtualizarCargasColetivo();
            },
          ),
          "field--float",
        );
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      }

      // Atividade principal (estrutural: Ramo × Área)
      {
        const f = cmgCampo(
          "Atividade principal",
          cmgSelectDe(
            ["Residencial", "Comercial", "Industrial", "Rural"],
            u.atividade,
            (v) => {
              u.atividade = v;
              gdAplicarPresetResidencial();
              gdRenderUcs();
              gdAtualizarCargasColetivo();
            },
            true,
          ),
          "field--float",
        );
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      }

      // Área privativa (residencial, entra no ND-5.2) ou Ramo de atividade.
      if (u.atividade === "Residencial") {
        const f = cmgCampo(
          "Área privativa (m²)",
          cmgInp(
            u.area,
            (v) => {
              u.area = v;
              // A área não muda o método (só o fator A): atualiza os
              // calculados sem re-render, para não perder o foco.
              gdAtualizarCargasColetivo();
            },
            { type: "number", placeholder: "Ex: 65" },
          ),
        );
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      } else if (u.atividade) {
        const f = cmgCampo(
          "Ramo de atividade",
          cmgInp(u.ramo, (v) => (u.ramo = v), {
            placeholder: "Ex: Padaria",
          }),
        );
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      }

      // UC existente: identificação + disjuntor atual.
      if (u.solicitacao !== "Conexão Nova") {
        const f = cmgCampo(
          "Instalação / Unidade Consumidora / Medidor",
          cmgInpInstalacao(u.instalacao, (v) => (u.instalacao = v)),
        );
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
        grid.appendChild(
          cmgCampo(
            "Disjuntor atual",
            cmgSelectDe(
              DISJ.map((d) => d.fx),
              u.disjDe,
              (v) => {
                u.disjDe = v;
                gdAtualizarCargasColetivo();
              },
              true,
            ),
            "field--float",
          ),
        );
      }

      const semAlt = gdUcSemAlteracao(u);

      // Carga prevista (kW): método ND-5.2 com mais de 3 UCs.
      if (!modoCalc && state.ucs.length > 3 && !semAlt) {
        const f = cmgCampo(
          "Carga prevista da unidade (kW)",
          cmgInp(
            u.cargaPrevista,
            (v) => {
              u.cargaPrevista = v;
              gdAtualizarCargasColetivo();
            },
            { type: "number", placeholder: "0,0" },
          ),
        );
        f.setAttribute("data-noopt", "");
        grid.appendChild(f);
      }

      // Disjuntor da UC: escolha manual no ND-5.2; no modo calculadora vem
      // das cargas declaradas (renderizado abaixo, junto da ilha).
      if (!modoCalc || semAlt) {
        grid.appendChild(
          cmgCampo(
            "Disjuntor da unidade",
            cmgSelectDe(
              DISJ_COL.map((d) => d.fx),
              u.disjPara,
              (v) => {
                u.disjPara = v;
                gdAplicarPresetResidencial();
                gdRenderUcs();
                gdAtualizarCargasColetivo();
              },
              true,
            ),
            "field--float",
          ),
        );
      }
      corpo.appendChild(grid);

      // Modo calculadora: a UC detalha as cargas na MESMA ilha do fluxo
      // individual (shared/js/carga-bt.js), que escreve _demanda/_cargaKw/
      // _disjuntores em u.cargas.
      if (modoCalc && !semAlt) {
        const divisor = document.createElement("div");
        divisor.className = "divider";
        const titulo = document.createElement("span");
        titulo.className = "subbox-title";
        titulo.textContent = "Cargas da unidade";
        divisor.appendChild(titulo);
        corpo.appendChild(divisor);
        const cargasBox = document.createElement("div");
        corpo.appendChild(cargasBox);
        const disjBox = document.createElement("div");
        corpo.appendChild(disjBox);
        u.cargas = u.cargas || {};
        u._acc = u._acc || {};
        montarCargaAcordeao(cargasBox, {
          data: u.cargas,
          abertos: u._acc,
          redeMono: () =>
            state.tipoRede === "Monofásica" || state.tipoRede === "Bifásica",
          atividade: () => u.atividade || "",
          hintAtividade: false,
          aoMudar: () => {
            gdRenderResultadoUC(disjBox, u);
            gdAtualizarCargasColetivo();
          },
        });
        gdRenderResultadoUC(disjBox, u);
      }
      bloco.appendChild(corpo);
    }
    box.appendChild(bloco);
  });

  gdAtualizarCargasColetivo();
  if (window.CemigMarcadores) {
    CemigMarcadores.aplicar(box);
    CemigMarcadores.atualizarAvancar();
  }
}

// KPIs + disjuntor calculado de UMA UC (modo calculadora) — mesma ilha de
// resultado do fluxo individual.
function gdRenderResultadoUC(box, u) {
  renderResultadoCarga(box, {
    cargas: () => u.cargas,
    escolhido: () => u.disjPara,
    aoEscolher: (dj) => {
      u.disjPara = dj;
      gdAtualizarCargasColetivo();
    },
  });
}

// Atualiza SÓ o que é calculado: visibilidade do campo não residencial e o
// rodapé (KPIs + disjuntor geral). Não re-renderiza a lista de UCs, para não
// tirar o foco de quem está digitando.
function gdAtualizarCargasColetivo() {
  const naoResBox = $("#gdDemandaNaoResBox");
  if (naoResBox)
    naoResBox.style.display =
      !gdModoCalculadora() && gdTemUcNaoResidencial() ? "" : "none";
  gdAutoSelecionarDisjGeral();
  gdRenderDisjGeral();
}

// Rodapé da etapa: carga instalada, demanda total e disjuntor geral.
function gdRenderDisjGeral() {
  const box = $("#gdDisjGeralBox");
  if (!box) return;
  box.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "resultado-cargas divider";
  const kpis = document.createElement("div");
  kpis.className = "resultado-kpis";
  kpis.append(
    cmgKpiCard(
      "Carga instalada total",
      `${fmt2(gdCargaPrevTotal())} kW`,
      "Soma das cargas previstas das unidades do agrupamento.",
    ),
    cmgKpiCard(
      "Demanda total",
      `${fmt2(gdDemandaPrevTotal())} kVA`,
      gdModoCalculadora()
        ? "Soma das demandas calculadas pelas cargas de cada unidade (ND-5.1)."
        : "Parte residencial pelo ND-5.2 (D = 1,4 × F × A) somada à demanda não residencial informada.",
    ),
  );
  const cardDisj = document.createElement("div");
  cardDisj.className = "resultado-card resultado-disjuntor";
  cardDisj.innerHTML = `<div class="resultado-card-label">Disjuntor geral do agrupamento</div>`;
  const ops = gdOpcoesDisjGeral();
  if (ops.length) {
    const tg = document.createElement("div");
    tg.className = "toggle-group";
    ops.forEach((dj) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "toggle-btn" + (state.disjGeralAgr === dj ? " on" : "");
      b.textContent = dj;
      b.addEventListener("click", () => {
        state.disjGeralAgr = dj;
        gdRenderDisjGeral();
        if (window.CemigMarcadores) CemigMarcadores.atualizarAvancar();
      });
      tg.appendChild(b);
    });
    cardDisj.appendChild(tg);
  } else {
    const hint = document.createElement("div");
    hint.className = "field-hint";
    hint.textContent =
      "Preencha as unidades para calcularmos o disjuntor geral adequado.";
    cardDisj.appendChild(hint);
  }
  wrap.append(kpis, cardDisj);
  box.appendChild(wrap);
}

/* ===== validação da exportação (chamada por validarExportacao) ===== */
// Pendências específicas do agrupamento. Os campos das etapas coletivas são
// construídos em JS, então não há como cobrá-los pelos marcadores de HTML.
function gdValidarColetivo() {
  const faltas = [];
  const ucs = (state.ucs || []).filter((u) => !gdUcSemAlteracao(u));
  if (!ucs.length) {
    faltas.push("Dados das unidades (nenhuma unidade a considerar)");
    return faltas;
  }
  const info = gdNd52Info();
  if (gdModoCalculadora()) {
    // Menos de 4 apartamentos: cada UC precisa declarar as próprias cargas.
    const semCarga = ucs.filter((u) => {
      const c = u.cargas || {};
      return !(
        (c.qtds || []).some((q) => (q || 0) > 0) ||
        (c.mots || []).some((m) => (parseInt(m.q) || 0) > 0) ||
        (c.extras || []).some((m) => (parseInt(m.q) || 0) > 0)
      );
    });
    if (semCarga.length)
      faltas.push(
        `Cargas elétricas de ${semCarga.length} unidade(s) do agrupamento`,
      );
  } else {
    // ND-5.2: a área privativa de cada apartamento residencial é o insumo do
    // fator A — sem ela (ou fora da tabela) a demanda não é calculável.
    const semArea = ucs.filter(
      (u) => u.atividade === "Residencial" && !(gdNum(u.area) > 0),
    );
    if (semArea.length)
      faltas.push(`Área privativa de ${semArea.length} apartamento(s)`);
    else if (!info.nd52)
      faltas.push(
        "Área média ponderada fora da faixa da ND-5.2 (até 1000 m² por apartamento)",
      );
    if (gdTemUcNaoResidencial() && !(gdNum(state.demandaNaoResidencial) > 0))
      faltas.push("Demanda geral não residencial (kVA)");
  }
  if (!state.disjGeralAgr) faltas.push("Disjuntor geral do agrupamento");
  return faltas;
}

// Ponto de entrada chamado por gdAplicarFluxoEdificacao() (js/app.js).
function gdRenderColetivo() {
  gdSincronizarUcs();
  // Reaplica a sequência de complementos (estado restaurado ou quantidade
  // alterada em outra etapa) antes de desenhar as duas etapas.
  gdAplicarComplementos();
  gdRenderTorre();
  gdRenderUcs();
}
