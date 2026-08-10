/* ============================================================
   CEMIG — Complementos das unidades de um agrupamento
   ------------------------------------------------------------
   Geração automática da lista de complementos (101, 102, 201…)
   a partir do PRIMEIRO complemento informado, e a composição
   por pavimento que permite andares com quantidades distintas.

   Bloco puro (sem `state` nem DOM), compartilhado entre o BT
   (coletivo e condomínio de torres) e a Microgeração
   (edificação Coletiva/Agrupamento) — os dois geram a mesma
   sequência para a mesma entrada.
   ============================================================ */


// Tipos de complemento de uma unidade. Os primeiros são moradias/pontos
// comerciais (têm atividade principal própria); os de ÁREA COMUM do condomínio
// (academia, portaria, salão…) não têm — ver TIPOS_COMPLEMENTO_AREA_COMUM, que
// esconde o campo "Atividade principal" da unidade.
const TIPOS_COMPLEMENTO = [
  "Apartamento",
  "Casa",
  "Loja",
  "Sala comercial",
  "Academia",
  "Portaria",
  "Salão de festas",
  "Área comum",
];
// Complementos de área comum do condomínio: a "atividade principal" não se
// aplica (não é moradia nem ponto comercial) — o formulário assume Comercial
// internamente e não pergunta.
const TIPOS_COMPLEMENTO_AREA_COMUM = [
  "Academia",
  "Portaria",
  "Salão de festas",
  "Área comum",
];
// Uma unidade é de área comum quando seu complemento é (ou começa por) um dos
// tipos acima — cobre tanto o "Tipo de complemento" da torre de 1 unidade
// quanto o complemento digitado à mão na etapa das unidades ("Portaria 1").
function ehAreaComum(complemento) {
  const v = String(complemento || "")
    .trim()
    .toLowerCase();
  if (!v) return false;
  return TIPOS_COMPLEMENTO_AREA_COMUM.some((t) => v.startsWith(t.toLowerCase()));
}

// Gera a lista de complementos de uma torre a partir do primeiro complemento.
// Padrão puramente numérico com 3+ dígitos (ex: "101") e aptosPorAndar
// informado → os 2 últimos dígitos são o apto dentro do andar: incrementa o
// apto (102, 103…) e, completado o andar, avança o andar (201, 202…).
// Qualquer outro padrão com número (ex: "Apto 01") → mantém o texto fixo e
// incrementa só o número, preservando zeros à esquerda (Apto 02, Apto 03…).
// Retorna null quando o primeiro complemento não contém número.
//
// `faixas` (opcional): composição por pavimento do popup "Customizar" —
// [{ ini, fim, unidades }]. Quando informada e o padrão for numérico, cada
// andar usa a quantidade de unidades da faixa em que ele se encaixa (o número
// de andar dado por `andar` inicial, não pela posição em `ini/fim`); fora de
// qualquer faixa, cai no `aptosPorAndar` padrão. Faixas têm precedência.
function gerarComplementos(primeiro, total, aptosPorAndar, faixas) {
  const n = Math.max(1, parseInt(total) || 1);
  const m = String(primeiro || "")
    .trim()
    .match(/^(.*?)(\d+)(\D*)$/);
  if (!m) return null;
  const [, pre, num, suf] = m;
  const porAndar = Math.max(0, parseInt(aptosPorAndar) || 0);
  const faixasOk = normalizarFaixasPavimento(faixas);
  const out = [];
  const numerico = !pre && !suf && num.length >= 3;
  if (numerico && (porAndar > 0 || faixasOk.length)) {
    let andar = parseInt(num.slice(0, -2), 10);
    const aptoIni = parseInt(num.slice(-2), 10);
    let apto = aptoIni;
    // Unidades do andar atual: faixa que cobre o andar, senão o padrão.
    const unidadesDoAndar = (a) => {
      const f = faixasOk.find((x) => a >= x.ini && a <= x.fim);
      return f ? f.unidades : porAndar || 1;
    };
    for (let i = 0; i < n; i++) {
      out.push(`${andar}${String(apto).padStart(2, "0")}`);
      apto++;
      if (apto - aptoIni >= unidadesDoAndar(andar)) {
        andar++;
        apto = aptoIni;
      }
    }
  } else {
    const ini = parseInt(num, 10);
    for (let i = 0; i < n; i++)
      out.push(pre + String(ini + i).padStart(num.length, "0") + suf);
  }
  return out;
}

// Sanitiza a composição por pavimento vinda do popup: mantém só faixas com
// ini/fim/unidades numéricos válidos (fim >= ini, unidades >= 1) e as ordena
// por andar inicial. Retorna [] para entrada ausente/vazia/inválida.
function normalizarFaixasPavimento(faixas) {
  if (!Array.isArray(faixas)) return [];
  return faixas
    .map((f) => ({
      ini: parseInt(f && f.ini, 10),
      fim: parseInt(f && f.fim, 10),
      unidades: parseInt(f && f.unidades, 10),
    }))
    .filter(
      (f) =>
        Number.isFinite(f.ini) &&
        Number.isFinite(f.fim) &&
        Number.isFinite(f.unidades) &&
        f.fim >= f.ini &&
        f.unidades >= 1,
    )
    .sort((a, b) => a.ini - b.ini);
}

// Quantas UCs uma linha de pavimento representa: (fim - ini + 1) andares ×
// unidades por andar. Linha incompleta (qualquer campo em branco/inválido) vale
// 0 — ainda está sendo preenchida.
function ucsDaFaixaPavimento(linha) {
  const ini = parseInt(linha && linha.ini, 10);
  const fim = parseInt(linha && linha.fim, 10);
  const un = parseInt(linha && linha.unidades, 10);
  if (!Number.isFinite(ini) || !Number.isFinite(fim) || !Number.isFinite(un))
    return 0;
  if (fim < ini || un < 1) return 0;
  return (fim - ini + 1) * un;
}
// Soma das UCs de todas as linhas, exceto a de índice `ignorar`.
function ucsAlocadasPavimento(linhas, ignorar) {
  if (!Array.isArray(linhas)) return 0;
  return linhas.reduce(
    (s, l, i) => (i === ignorar ? s : s + ucsDaFaixaPavimento(l)),
    0,
  );
}
// Sugestão de "unidades por andar" da ÚLTIMA linha para que a soma bata com o
// total de UCs da torre. Só sugere quando a divisão é exata e positiva; nos
// demais casos devolve null e a linha fica como o usuário deixou (o campo é
// editável de qualquer forma — a sugestão é só uma conveniência).
// Ex.: 25 UCs, andares 1–3 com 4 un. e 4–7 com 3 un. → restam 1 UC para a
// última linha; com andar 8–8, sugere 1 unidade por andar.
function sugerirUnidadesUltimoPavimento(linhas, total) {
  if (!Array.isArray(linhas) || !linhas.length) return null;
  const totalUCs = Math.max(0, parseInt(total) || 0);
  if (!totalUCs) return null;
  const idx = linhas.length - 1;
  const ultima = linhas[idx];
  const ini = parseInt(ultima && ultima.ini, 10);
  const fim = parseInt(ultima && ultima.fim, 10);
  if (!Number.isFinite(ini) || !Number.isFinite(fim) || fim < ini) return null;
  const restante = totalUCs - ucsAlocadasPavimento(linhas, idx);
  const andares = fim - ini + 1;
  if (restante <= 0 || restante % andares !== 0) return null;
  return restante / andares;
}

/* ===== Popup "Composição por pavimento" ===== */
function abrirComposicaoPavimento(faixasAtuais, onSalvar, totalUCs) {
  const total = Math.max(0, parseInt(totalUCs) || 0);
  // Cópia de trabalho: andar inicial, andar final e unidades por andar de cada
  // pavimento. Sem faixas salvas, começa com um pavimento em branco.
  const base = normalizarFaixasPavimento(faixasAtuais);
  const linhas = base.length
    ? base.map((f) => ({ ini: f.ini, fim: f.fim, unidades: f.unidades }))
    : [{ ini: "", fim: "", unidades: "" }];

  const overlay = document.createElement("div");
  overlay.className = "cmg-modal-overlay";

  const dialog = document.createElement("div");
  dialog.className = "cmg-modal";
  dialog.setAttribute("role", "dialog");
  dialog.setAttribute("aria-modal", "true");
  dialog.setAttribute("aria-labelledby", "cmg-modal-titulo");

  const fechar = () => {
    document.removeEventListener("keydown", onKey);
    overlay.remove();
  };
  const onKey = (e) => {
    if (e.key === "Escape") fechar();
  };

  // Cabeçalho: botão X
  const btnX = document.createElement("button");
  btnX.type = "button";
  btnX.className = "cmg-modal-fechar";
  btnX.setAttribute("aria-label", "Fechar");
  btnX.innerHTML =
    '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
  btnX.addEventListener("click", fechar);

  const titulo = document.createElement("h2");
  titulo.className = "cmg-modal-titulo";
  titulo.id = "cmg-modal-titulo";
  titulo.textContent = "Composição por pavimento";

  const desc = document.createElement("p");
  desc.className = "cmg-modal-desc";
  desc.textContent =
    "Informe o andar inicial, o andar final e quantas unidades há por andar em cada pavimento. As unidades por andar do último pavimento são sugeridas para fechar o total de unidades da torre, mas você pode editar qualquer campo.";

  // Tabela de faixas
  const tabela = document.createElement("div");
  tabela.className = "cmg-pav-tabela";

  // Resumo do cálculo, abaixo da tabela (preenchido por renderTabela).
  const resumo = document.createElement("p");
  resumo.className = "cmg-pav-resumo";

  const corpo = document.createElement("div");
  corpo.className = "cmg-modal-conteudo";

  const rodape = document.createElement("div");
  rodape.className = "cmg-modal-rodape";
  const btnCancelar = document.createElement("button");
  btnCancelar.type = "button";
  btnCancelar.className = "btn btn-ghost";
  btnCancelar.textContent = "Cancelar";
  btnCancelar.addEventListener("click", fechar);
  const btnSalvar = document.createElement("button");
  btnSalvar.type = "button";
  btnSalvar.className = "btn btn-primary";
  btnSalvar.textContent = "Salvar";
  btnSalvar.addEventListener("click", () => {
    // Salva o que o usuário efetivamente preencheu (linhas incompletas são
    // descartadas por normalizarFaixasPavimento).
    const validas = normalizarFaixasPavimento(linhas);
    onSalvar(validas.length ? validas : null);
    fechar();
  });
  rodape.append(btnCancelar, btnSalvar);

  // Renderiza as linhas da tabela (cabeçalho + campos por faixa + adicionar).
  const renderTabela = () => {
    tabela.innerHTML = "";
    const head = document.createElement("div");
    head.className = "cmg-pav-linha cmg-pav-head";
    ["Andar inicial", "Andar final", "Unidades por andar"].forEach((t) => {
      const c = document.createElement("div");
      c.className = "cmg-pav-cel";
      c.textContent = t;
      head.appendChild(c);
    });
    // Espaço da coluna de remover (mantém o alinhamento das colunas)
    head.appendChild(
      Object.assign(document.createElement("div"), {
        className: "cmg-pav-cel cmg-pav-cel-acao",
      }),
    );
    tabela.appendChild(head);

    // Um campo numérico editável da linha. `campo` é a chave em `linhas[idx]`
    // ("ini" | "fim" | "unidades"). Nenhum campo é bloqueado: o valor digitado
    // vai direto para o estado, sem re-render (o foco/cursor não se perde).
    // Só o resumo abaixo da tabela é atualizado a cada tecla.
    const celCampo = (ln, idx, campo, placeholder) => {
      const cel = document.createElement("div");
      cel.className = "cmg-pav-cel";
      const inp = document.createElement("input");
      inp.type = "number";
      inp.min = "1";
      inp.placeholder = placeholder;
      inp.value = ln[campo] == null ? "" : String(ln[campo]);
      inp.setAttribute("aria-label", `${placeholder} do pavimento ${idx + 1}`);
      inp.addEventListener("input", () => {
        ln[campo] = inp.value;
        // Editar um pavimento anterior muda quantas UCs sobram para o último:
        // reaplica a sugestão nele (sem tocar na linha que está em edição).
        aplicarSugestaoUltimo(idx);
        atualizarResumo();
      });
      cel.appendChild(inp);
      return cel;
    };
    // Monta uma linha de pavimento com os três campos editáveis + remover.
    const mkLinha = (ln, idx, podeRemover) => {
      const linha = document.createElement("div");
      linha.className = "cmg-pav-linha";
      linha.append(
        celCampo(ln, idx, "ini", "Andar inicial"),
        celCampo(ln, idx, "fim", "Andar final"),
        celCampo(ln, idx, "unidades", "Unidades por andar"),
      );
      const celAcao = document.createElement("div");
      celAcao.className = "cmg-pav-cel cmg-pav-cel-acao";
      if (podeRemover) {
        const btnDel = document.createElement("button");
        btnDel.type = "button";
        btnDel.className = "cmg-pav-remover";
        btnDel.setAttribute("aria-label", `Remover pavimento ${idx + 1}`);
        btnDel.innerHTML =
          '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';
        btnDel.addEventListener("click", () => {
          linhas.splice(idx, 1);
          aplicarSugestaoUltimo();
          renderTabela();
        });
        celAcao.appendChild(btnDel);
      }
      linha.appendChild(celAcao);
      tabela.appendChild(linha);
    };

    linhas.forEach((ln, idx) => mkLinha(ln, idx, linhas.length > 1));

    const rodapeTabela = document.createElement("div");
    rodapeTabela.className = "cmg-pav-adicionar-wrap";
    const btnAdd = document.createElement("button");
    btnAdd.type = "button";
    btnAdd.className = "btn btn-ghost btn-outlined-acao cmg-pav-adicionar";
    btnAdd.innerHTML =
      '<span class="cmg-pav-mais" aria-hidden="true">+</span> Adicionar pavimento';
    btnAdd.addEventListener("click", () => {
      // Novo pavimento já começa no andar seguinte ao último preenchido —
      // sugestão de partida, editável como qualquer outro campo.
      const ultima = linhas[linhas.length - 1];
      const fimAnterior = parseInt(ultima && ultima.fim, 10);
      linhas.push({
        ini: Number.isFinite(fimAnterior) ? String(fimAnterior + 1) : "",
        fim: "",
        unidades: "",
      });
      renderTabela();
    });
    rodapeTabela.appendChild(btnAdd);
    tabela.appendChild(rodapeTabela);
    atualizarResumo();
  };
  // Preenche as "unidades por andar" do ÚLTIMO pavimento com o valor que fecha
  // o total de UCs da torre. Não roda quando a própria última linha é a que
  // está em edição (`editando`) — senão sobrescreveria o que o usuário digita.
  // O campo continua editável: isto é sugestão, não trava.
  function aplicarSugestaoUltimo(editando) {
    const idx = linhas.length - 1;
    if (idx < 0 || editando === idx) return;
    const sug = sugerirUnidadesUltimoPavimento(linhas, total);
    if (sug == null) return;
    linhas[idx].unidades = String(sug);
    const inputs = tabela.querySelectorAll(".cmg-pav-linha input[type=number]");
    // 3 campos por linha: o de "unidades" da última linha é o 3º da última.
    const alvo = inputs[idx * 3 + 2];
    if (alvo && alvo !== document.activeElement) alvo.value = String(sug);
  }
  // Resumo abaixo da tabela: quantas UCs os pavimentos informados somam frente
  // ao total da torre — o usuário enxerga na hora se falta ou sobra unidade.
  function atualizarResumo() {
    if (!total) {
      resumo.textContent = "";
      return;
    }
    const somadas = ucsAlocadasPavimento(linhas);
    const dif = total - somadas;
    resumo.textContent =
      dif === 0
        ? `Os pavimentos somam as ${total} unidades da torre.`
        : dif > 0
          ? `Os pavimentos somam ${somadas} de ${total} unidades — faltam ${dif}.`
          : `Os pavimentos somam ${somadas} unidades — ${-dif} a mais que as ${total} da torre.`;
  }
  renderTabela();

  corpo.append(titulo, desc, tabela, resumo);
  dialog.append(btnX, corpo, rodape);
  overlay.appendChild(dialog);
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) fechar();
  });
  document.addEventListener("keydown", onKey);
  document.body.appendChild(overlay);
  // Foco inicial no primeiro campo para acessibilidade.
  const primeiro = tabela.querySelector("input");
  if (primeiro) primeiro.focus();
}
