/* ============================================================
   tarifacao-gd.js — Tarifação, demanda e ramal de entrada da GD
   (Microgeração Grupo A e Minigeração), na CONEXÃO NOVA.
   ------------------------------------------------------------
   Pedido de 13/11/2026: "solicitar em mini e microgeração a demanda
   escalonada, ponta e fora ponta, tarifa azul ou verde e ramal quando
   for conexão nova de grupo A — mesmas regras de MT". Porte
   parametrizado de mt/js/app.js (renderTarifacaoInstalacao,
   demandaRepresentativaInstalacao/Cubiculo, recalcRamal):

   • A tarifação vive num OBJETO-ALVO — o próprio `state` (instalação,
     subestação individual) ou um cubículo (subestação compartilhada,
     como no MT). Chaves no alvo:
       modalidadeTarifaria  "Verde" | "Azul"   (o `modalidade` da GD já
                                                é a modalidade de compensação)
       escalonada           "Sim" | "Não"
       demandaContratada    Verde, sem escalonamento
       demandaPonta / demandaForaPonta          Azul, sem escalonamento
       etapasEscalonada     [{demanda, ponta, foraponta, inicio}]
   • Regra da demanda (MT): com escalonamento vale a MAIOR etapa; no Azul
     ponta e fora ponta não se somam — vale a maior das duas.
   • Unidade: kW, a convenção da GD (o MT rotula a contratada em kVA).
   • Ramal: CalculoMT.grupoRamal com finalidade "Conexão Nova" (RAMAL1/2
     urbano, RAMAL3 rural), escolhido numa galeria igual à do MT logo
     abaixo de "Subestação para conexão nova". Grava state.ramalIndice.

   O HTML é gerado com handlers inline que referenciam o alvo por uma
   expressão (`ref`, ex.: "state" ou "cubiculosGD[1]") e chamam o código
   do app: `aoValor` (recalcula sem redesenhar — preserva o foco) e
   `aoEstrutura` (redesenha o bloco: modalidade, escalonada, etapas).

   Depende de: CalculoMT (mt/js/calculo.js), cmgMesAnoHTML/cmgMesAnoRotulo
   (shared/js/mesano.js) e dos globais `state` e `$` do app. O app define
   `gdTarifaRecalc()` (chamado quando um mês é escolhido no "Início de uso").
   ============================================================ */

const GD_TARIFA_MODALIDADES = ["Verde", "Azul"];

function gdNovaEtapaEscalonada() {
  return { demanda: "", ponta: "", foraponta: "", inicio: "" };
}
// Garante as chaves no alvo (cubículos antigos / estado restaurado).
function gdGarantirTarifa(obj) {
  if (!obj) return obj;
  ["modalidadeTarifaria", "escalonada", "demandaContratada", "demandaPonta", "demandaForaPonta"].forEach(
    (k) => {
      if (obj[k] == null) obj[k] = "";
    },
  );
  if (!Array.isArray(obj.etapasEscalonada)) obj.etapasEscalonada = [];
  return obj;
}
function gdLimparTarifa(obj) {
  if (!obj) return;
  obj.modalidadeTarifaria = "";
  obj.escalonada = "";
  obj.demandaContratada = "";
  obj.demandaPonta = "";
  obj.demandaForaPonta = "";
  obj.etapasEscalonada = [];
}
function gdSetTarifa(obj, campo, valor) {
  gdGarantirTarifa(obj);
  obj[campo] = valor;
  // A primeira etapa nasce junto, para o usuário já ter onde digitar (MT).
  if (campo === "escalonada" && valor === "Sim" && !obj.etapasEscalonada.length)
    obj.etapasEscalonada.push(gdNovaEtapaEscalonada());
}
function gdAddEtapaTarifa(obj) {
  gdGarantirTarifa(obj).etapasEscalonada.push(gdNovaEtapaEscalonada());
}
function gdDelEtapaTarifa(obj, k) {
  gdGarantirTarifa(obj).etapasEscalonada.splice(k, 1);
}

const _gdNum = (v) => parseFloat(String(v ?? "").replace(",", ".")) || 0;
/* Demanda representativa (regra do MT): maior etapa com escalonamento; no
   Azul vale a maior entre ponta e fora ponta. */
function gdDemandaTarifa(obj) {
  if (!obj) return 0;
  const azul = obj.modalidadeTarifaria === "Azul";
  if (obj.escalonada === "Sim")
    return (obj.etapasEscalonada || []).reduce((maior, e) => {
      const v = azul
        ? Math.max(_gdNum(e.ponta), _gdNum(e.foraponta))
        : _gdNum(e.demanda);
      return Math.max(maior, v);
    }, 0);
  return azul
    ? Math.max(_gdNum(obj.demandaPonta), _gdNum(obj.demandaForaPonta))
    : _gdNum(obj.demandaContratada);
}

const _gdEscAttr = (v) =>
  String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");

function _gdCardsTarifaHTML(rotulo, opcoes, atual, chamada) {
  return (
    `<div class="toggle-group" role="radiogroup" aria-label="${rotulo}">` +
    opcoes
      .map(
        (v) =>
          `<button type="button" role="radio" aria-checked="${atual === v}" class="toggle-btn${atual === v ? " on" : ""}" onclick="${chamada(v)}">${v}</button>`,
      )
      .join("") +
    `</div>`
  );
}
/* Bloco completo de um alvo: as duas perguntas lado a lado, os campos de
   demanda (sem escalonamento) ou a tabela de etapas (com). `o` =
   {ref, id, aoValor, aoEstrutura}. */
function gdTarifaHTML(obj, o) {
  gdGarantirTarifa(obj);
  const { ref, id, aoValor, aoEstrutura } = o;
  const set = (campo) => (v) =>
    `gdSetTarifa(${ref},'${campo}','${v}');${aoEstrutura}`;
  const perguntas = `<div class="grid grid-2">
      <div class="field field--plain" data-noopt><label>Modalidade tarifária horária</label>${_gdCardsTarifaHTML("Modalidade tarifária horária", GD_TARIFA_MODALIDADES, obj.modalidadeTarifaria, set("modalidadeTarifaria"))}</div>
      <div class="field field--plain" data-noopt><label>Haverá demanda escalonada?</label>${_gdCardsTarifaHTML("Haverá demanda escalonada?", ["Sim", "Não"], obj.escalonada, set("escalonada"))}</div>
    </div>`;
  const azul = obj.modalidadeTarifaria === "Azul";
  const campo = (chave, rotulo) =>
    `<div class="field"><label for="${id}${chave}">${rotulo}</label><input id="${id}${chave}" type="number" step="any" data-req value="${_gdEscAttr(obj[chave])}" placeholder=" " oninput="${ref}.${chave}=this.value;${aoValor}"></div>`;
  let demanda = "";
  if (obj.modalidadeTarifaria && obj.escalonada === "Não")
    demanda = `<div class="grid grid-2 cub-demanda-grid">${
      azul
        ? campo("demandaPonta", "Demanda ponta contratada (kW)") +
          campo("demandaForaPonta", "Demanda fora ponta contratada (kW)")
        : campo("demandaContratada", "Demanda contratada (kW)")
    }</div>`;
  let tabela = "";
  if (obj.modalidadeTarifaria && obj.escalonada === "Sim") {
    const head = azul
      ? `<tr><th>Demanda ponta (kW)</th><th>Demanda fora ponta (kW)</th><th>Início de uso</th><th></th></tr>`
      : `<tr><th>Demanda (kW)</th><th>Início de uso</th><th></th></tr>`;
    const inp = (k, campoE, e) =>
      `<td><input type="number" step="any" data-req value="${_gdEscAttr(e[campoE])}" placeholder="kW" oninput="${ref}.etapasEscalonada[${k}].${campoE}=this.value;${aoValor}"></td>`;
    const linhas = obj.etapasEscalonada
      .map(
        (e, k) =>
          `<tr>${azul ? inp(k, "ponta", e) + inp(k, "foraponta", e) : inp(k, "demanda", e)}
             <td>${cmgMesAnoHTML(`${ref}.etapasEscalonada[${k}].inicio`, e.inicio)}</td>
             <td><button type="button" class="btn-del" aria-label="Remover etapa ${k + 1}" onclick="gdDelEtapaTarifa(${ref},${k});${aoEstrutura}">×</button></td></tr>`,
      )
      .join("");
    tabela = `<div class="cub-escalonada-box">
      <p class="card-sub">Preencha a evolução da sua necessidade de carga ao longo do tempo. Para cada etapa, informe os valores de demanda${azul ? " de Ponta e Fora Ponta" : ""} (em kW) e a data (mês/ano) prevista para o início do consumo de cada fase.</p>
      <div class="tbl-scroll"><table class="tbl"><thead>${head}</thead><tbody>${linhas}</tbody></table></div>
      <div class="motores-add"><button type="button" class="btn btn-ghost motores-add-btn" onclick="gdAddEtapaTarifa(${ref});${aoEstrutura}">+ Adicionar etapa de demanda</button></div>
    </div>`;
  }
  return perguntas + demanda + tabela;
}
// "Início de uso" escolhido no painel de mês/ano (shared/js/mesano.js).
window.cmgMesAnoAoEscolher = function (alvo, iso) {
  // eslint-disable-next-line no-eval -- mesmo contrato do MT: o alvo é uma
  // expressão de caminho gerada aqui, não entrada do usuário.
  eval(`${alvo}=iso`);
  if (typeof gdTarifaRecalc === "function") gdTarifaRecalc();
};

/* Pendências de um alvo (prefixo = "Cubículo 2: " etc.). */
function gdTarifaFaltas(obj, prefixo) {
  const p = prefixo || "";
  const f = [];
  if (!obj) return f;
  if (!obj.modalidadeTarifaria) f.push(`${p}Modalidade tarifária horária`);
  if (!obj.escalonada) f.push(`${p}Demanda escalonada (Sim/Não)`);
  if (!obj.modalidadeTarifaria || !obj.escalonada) return f;
  const azul = obj.modalidadeTarifaria === "Azul";
  if (obj.escalonada === "Sim") {
    const etapas = obj.etapasEscalonada || [];
    if (!etapas.length) f.push(`${p}Etapas da demanda escalonada`);
    etapas.forEach((e, k) => {
      const r = `${p}Etapa ${k + 1} da demanda escalonada`;
      if (azul) {
        if (!(_gdNum(e.ponta) > 0)) f.push(`${r} — demanda ponta`);
        if (!(_gdNum(e.foraponta) > 0)) f.push(`${r} — demanda fora ponta`);
      } else if (!(_gdNum(e.demanda) > 0)) f.push(`${r} — demanda`);
      if (!e.inicio) f.push(`${r} — início de uso`);
    });
  } else if (azul) {
    if (!(_gdNum(obj.demandaPonta) > 0)) f.push(`${p}Demanda ponta contratada`);
    if (!(_gdNum(obj.demandaForaPonta) > 0))
      f.push(`${p}Demanda fora ponta contratada`);
  } else if (!(_gdNum(obj.demandaContratada) > 0))
    f.push(`${p}Demanda contratada`);
  return f;
}
/* Linhas [rótulo, valor] para prévia e PDF. */
function gdTarifaLinhas(obj) {
  if (!obj || !obj.modalidadeTarifaria) return [];
  const azul = obj.modalidadeTarifaria === "Azul";
  const kw = (v) => (String(v ?? "").trim() ? `${v} kW` : "—");
  const out = [
    ["Modalidade tarifária horária", obj.modalidadeTarifaria],
    ["Demanda escalonada", obj.escalonada || "—"],
  ];
  if (obj.escalonada === "Sim")
    (obj.etapasEscalonada || []).forEach((e, k) => {
      const ini =
        typeof cmgMesAnoRotulo === "function"
          ? cmgMesAnoRotulo(e.inicio)
          : e.inicio;
      out.push([
        `Etapa ${k + 1}`,
        (azul
          ? `Ponta ${kw(e.ponta)} · Fora ponta ${kw(e.foraponta)}`
          : `Demanda ${kw(e.demanda)}`) + ` · Início ${ini || "—"}`,
      ]);
    });
  else if (azul)
    out.push(
      ["Demanda ponta contratada", kw(obj.demandaPonta)],
      ["Demanda fora ponta contratada", kw(obj.demandaForaPonta)],
    );
  else out.push(["Demanda contratada", kw(obj.demandaContratada)]);
  return out;
}

/* ===== RAMAL DE ENTRADA — galeria (porte de mt/js/app.js) ===== */
const GD_RAMAL_IMG = (i) =>
  `../mt/assets/ramais/ramal_${String(i).padStart(2, "0")}.png`;
function gdRamaisPermitidos(tipoSE) {
  if (typeof CalculoMT === "undefined") return [];
  return CalculoMT.grupoRamal({
    finalidade: "Conexão Nova",
    localizacao: state.localizacao,
    trocaSE: "",
    tipoSE,
  }).indices;
}
function _gdRamalLinhasHTML(texto) {
  const esc = (t) =>
    String(t).replace(
      /[&<>"]/g,
      (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
    );
  return String(texto || "")
    .split(" · ")
    .map((item) => {
      const i = item.indexOf(":");
      if (i < 0) return `<div><dd>${esc(item)}</dd></div>`;
      let valor = item.slice(i + 1).trim();
      valor = (valor.charAt(0).toUpperCase() + valor.slice(1)).replace(
        /N[°º]\s*0?(\d+)/g,
        "nº$1",
      );
      return `<div><dt>${esc(item.slice(0, i + 1))}</dt> <dd>${esc(valor)}</dd></div>`;
    })
    .join("");
}
/* Desenha a galeria em #blocoRamalGD. `aplica` diz se o ramal é perguntado
   (Grupo A + conexão nova); fora disso o bloco some e a escolha é zerada.
   Sem tipo de SE escolhido ainda não há opções: mostra o aviso vazio. */
function gdRenderRamal(aplica, tipoSE) {
  const bloco = $("#blocoRamalGD");
  if (!bloco) return;
  bloco.style.display = aplica ? "" : "none";
  const indices = aplica ? gdRamaisPermitidos(tipoSE) : [];
  if (state.ramalIndice != null && !indices.includes(state.ramalIndice))
    state.ramalIndice = null;
  if (state.ramalIndice != null) gdCarregarImagemRamal(state.ramalIndice);
  const gallery = $("#ramalGallery"),
    empty = $("#ramalEmpty");
  if (!gallery || !empty) return;
  if (!indices.length) {
    gallery.innerHTML = "";
    empty.style.display = aplica ? "" : "none";
    return;
  }
  empty.style.display = "none";
  gallery.innerHTML = indices
    .map((idx) => {
      const sel = state.ramalIndice === idx;
      return `<div class="ramal-card${sel ? " selected" : ""}" onclick="gdSelecionarRamal(${idx})">
      <div class="imgwrap"><img src="${GD_RAMAL_IMG(idx)}" alt="Figura do ramal de entrada ${idx}"></div>
      <div class="ramal-rodape">
        <input type="radio" name="ramalEntradaGD" value="${idx}"${sel ? " checked" : ""}
               aria-label="Selecionar ramal de entrada ${idx}"
               onclick="event.stopPropagation();gdSelecionarRamal(${idx})">
        <dl class="ramal-desc">${_gdRamalLinhasHTML(CalculoMT.textoRamal(idx))}</dl>
        <button type="button" class="ramal-info" aria-label="Ampliar a figura do ramal ${idx}"
                onclick="event.stopPropagation();gdAmpliarFiguraRamal(${idx})">
          <img src="../imgs/info.svg" alt="" aria-hidden="true">
        </button>
      </div></div>`;
    })
    .join("");
}
function gdSelecionarRamal(idx) {
  state.ramalIndice = idx;
  gdCarregarImagemRamal(idx); // para o PDF
  if (typeof recalcRamal === "function") recalcRamal();
}
// Ramal obrigatório quando há opções a escolher.
function gdRamalFaltas(aplica, tipoSE) {
  if (!aplica || !tipoSE) return [];
  const indices = gdRamaisPermitidos(tipoSE);
  return indices.length && !indices.includes(state.ramalIndice)
    ? ["Ramal de entrada"]
    : [];
}
function gdRamalLinhas(idx) {
  if (idx == null || typeof CalculoMT === "undefined") return [];
  return [[`Ramal de entrada (figura ${idx})`, CalculoMT.textoRamal(idx)]];
}

/* Figura ampliada: modal criado sob demanda (micro e mini não têm o
   #modalFigura do MT). */
function gdAmpliarFiguraRamal(idx) {
  let ov = document.getElementById("modalFiguraGD");
  if (!ov) {
    ov = document.createElement("div");
    ov.id = "modalFiguraGD";
    ov.className = "modal-overlay";
    ov.innerHTML = `<div class="modal modal--figura" role="dialog" aria-modal="true" aria-label="Ramal de entrada">
        <button type="button" class="modal-close" aria-label="Fechar" onclick="gdFecharFiguraRamal()">×</button>
        <h3 class="card-title">Ramal de entrada</h3>
        <img id="modalFiguraGDImg" alt="" style="display:block;width:100%;height:auto" />
      </div>`;
    ov.addEventListener("click", (e) => {
      if (e.target === ov) gdFecharFiguraRamal();
    });
    document.body.appendChild(ov);
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") gdFecharFiguraRamal();
    });
  }
  const img = document.getElementById("modalFiguraGDImg");
  img.src = GD_RAMAL_IMG(idx);
  img.alt = `Figura do ramal de entrada ${idx}`;
  ov.style.display = "flex";
}
function gdFecharFiguraRamal() {
  const ov = document.getElementById("modalFiguraGD");
  if (ov) ov.style.display = "none";
}

/* Imagem do ramal para o PDF (jsPDF precisa de dataURL): carregada ao
   escolher e guardada aqui, com as dimensões para manter a proporção. */
const _gdRamalImgCache = {};
function gdCarregarImagemRamal(idx) {
  if (idx == null || _gdRamalImgCache[idx]) return;
  const img = new Image();
  img.onload = () => {
    try {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      c.getContext("2d").drawImage(img, 0, 0);
      _gdRamalImgCache[idx] = {
        url: c.toDataURL("image/png"),
        w: img.naturalWidth,
        h: img.naturalHeight,
      };
    } catch (e) {
      /* sem imagem: o PDF sai só com o texto */
    }
  };
  img.src = GD_RAMAL_IMG(idx);
}
/* Seção do ramal no PDF (motor criarPdfGD): texto + figura, se carregada. */
function gdPdfRamal(P, idx) {
  if (idx == null) return;
  gdRamalLinhas(idx).forEach(([r, v]) => P.fullLine(r + ": ", v));
  const im = _gdRamalImgCache[idx];
  if (!im) return;
  const w = Math.min(120, P.CW);
  const h = (w * im.h) / im.w;
  P.checkSpace(h + 4);
  P.doc.addImage(im.url, "PNG", P.MG, P.state.cy + 2, w, h);
  P.state.cy += h + 4;
}
