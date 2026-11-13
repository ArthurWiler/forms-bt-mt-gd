/* ============================================================
   ANÁLISE DE PARTIDA DE MOTORES — cargas de baixa tensão
   ------------------------------------------------------------
   Motores declarados nos perfis de carga (bt/js/perfis-carga.js, em
   u.cargas.mots: { fase: "mono"|"tri", cv, q }). Critério Cemig de motor
   pesado, o mesmo do MT e da GD: trifásico acima de 50 CV OU monofásico
   acima de 15 CV.

   Serve ao BT individual, ao BT coletivo/condomínio de torres (modo
   calculadora) e à microgeração Grupo B. Havendo motor pesado, a prévia
   mostra o aviso #motoresPesadosAviso com o botão "Preencher Análise de
   Partida", que troca #previaWrap pela sub-tela #analiseMotoresBox; o
   relatório sai em PDF (jsPDF), uma folha por motor. Tudo opcional: não
   trava a exportação do formulário.

   Cada formulário registra só de onde vêm os motores:
     window.PARTIDA_MOTORES_HOST = {
       motores: () => [{ rotulo: "UC 1", mots: [...] }, ...],
       cliente: () => "Nome do cliente",
     };
   ============================================================ */

function motorPesadoBT(m) {
  const cv = parseFloat(m && m.cv) || 0;
  if (!cv) return false;
  // Linha do perfil personalizado zerada (q = 0) não é motor declarado.
  if (m.q !== undefined && m.q !== "" && !(parseInt(m.q, 10) > 0))
    return false;
  return m.fase === "mono" ? cv > 15 : cv > 50;
}
function motoresPesadosBT() {
  const host = window.PARTIDA_MOTORES_HOST;
  const lista = [];
  if (!host) return lista;
  (host.motores() || []).forEach(({ rotulo, mots }) => {
    (mots || []).forEach((m, mi) => {
      if (motorPesadoBT(m)) lista.push({ rotulo, motorIndex: mi, motor: m });
    });
  });
  return lista;
}
// Mostra/oculta o aviso da prévia. Fora do Grupo B da micro (ou sem motor
// pesado) a lista vem vazia e o aviso some.
function atualizarAvisoMotoresBT() {
  const aviso = document.querySelector("#motoresPesadosAviso");
  if (aviso) aviso.style.display = motoresPesadosBT().length ? "" : "none";
}

/* ===== Sub-tela (opcional) ===== */
const DISPOSITIVOS_PARTIDA_BT = [
  "Chave Estrela-Triângulo",
  "Chave Compensadora",
  "Soft-Starter",
  "Inversor de Frequência",
];
function _motorLabelCV(m) {
  const tab = m.fase === "mono" ? MOTOR_MONO : MOTOR_TRI;
  const row = tab.find((r) => r.cv === parseFloat(m.cv));
  return (row && row.l) || m.cv;
}
function mostrarAnaliseMotoresBT(mostrar) {
  const previa = document.querySelector("#previaWrap"),
    analise = document.querySelector("#analiseMotoresBox");
  if (!previa || !analise) return;
  previa.style.display = mostrar ? "none" : "";
  analise.style.display = mostrar ? "" : "none";
  if (mostrar) renderAnaliseMotoresBT();
  window.scrollTo({ top: 0, behavior: "smooth" });
}
function renderAnaliseMotoresBT() {
  const box = document.querySelector("#analiseMotoresConteudo");
  if (!box) return;
  box.innerHTML = "";
  const lista = motoresPesadosBT();
  if (!lista.length) {
    box.innerHTML =
      '<div class="field-hint">Nenhum motor pesado identificado.</div>';
    return;
  }
  lista.forEach(({ rotulo, motorIndex, motor }) => {
    const ap = (motor.analisePartida = motor.analisePartida || {});
    const sub = document.createElement("div");
    sub.className = "subbox";
    sub.style.marginTop = "14px";
    const titulo = document.createElement("div");
    titulo.className = "subbox-title";
    titulo.style.marginBottom = "8px";
    titulo.textContent = `${rotulo} — Motor ${motorIndex + 1} (${motor.fase === "mono" ? "Monofásico" : "Trifásico"}, ${_motorLabelCV(motor)} CV)`;
    sub.appendChild(titulo);
    const grade = (campos) => {
      const g = document.createElement("div");
      g.className = "grid grid-3";
      g.style.marginTop = "10px";
      campos.forEach((f) => g.appendChild(f));
      return g;
    };
    const inputNum = (chave, placeholder) => {
      const inp = document.createElement("input");
      inp.type = "number";
      inp.placeholder = placeholder || " ";
      inp.value = ap[chave] || "";
      inp.addEventListener("input", () => {
        ap[chave] = inp.value;
        atualizarPartida();
      });
      return inp;
    };
    const inputTxt = (chave, placeholder) => {
      const inp = document.createElement("input");
      inp.type = "text";
      inp.placeholder = placeholder || " ";
      inp.value = ap[chave] || "";
      inp.addEventListener("input", () => (ap[chave] = inp.value));
      return inp;
    };
    const travado = document.createElement("input");
    travado.value = "Cliente ligado a rede CEMIG";
    travado.disabled = true;
    const cPartidaInp = document.createElement("input");
    cPartidaInp.disabled = true;
    const atualizarPartida = () => {
      const cNom = parseFloat(ap.correnteNominal) || 0;
      const ipIn = parseFloat(ap.ipIn) || 0;
      cPartidaInp.value = cNom && ipIn ? fmt2(cNom * ipIn) : "—";
    };
    atualizarPartida();
    sub.appendChild(
      grade([
        cmgCampo("Potência do transformador do consumidor (kVA)", travado),
        cmgCampo(
          "Corrente Nominal (A)",
          inputNum("correnteNominal", "Ex.: 12,5"),
        ),
        cmgCampo("Relação Ip/In", inputNum("ipIn", "Ex.: 6")),
      ]),
    );
    sub.appendChild(
      grade([
        cmgCampo("Corrente de partida (A)", cPartidaInp),
        cmgCampo(
          "Fator de potência na partida",
          inputNum("fpPartida", "Ex.: 0,35"),
        ),
        cmgCampo("Número de partidas", inputNum("numPartidas")),
      ]),
    );
    const selDisp = cmgSelectDe(
      DISPOSITIVOS_PARTIDA_BT,
      ap.dispositivo || "",
      (v) => {
        ap.dispositivo = v;
        if (v !== "Chave Compensadora") ap.tap = "";
        tapBox.style.display = v === "Chave Compensadora" ? "" : "none";
      },
      true,
    );
    sub.appendChild(cmgCampo("Dispositivo auxiliar de partida", selDisp));
    const tapBox = grade([cmgCampo("Tap (%)", inputNum("tap", "Ex.: 65"))]);
    tapBox.style.display =
      ap.dispositivo === "Chave Compensadora" ? "" : "none";
    sub.appendChild(tapBox);
    sub.appendChild(
      grade([
        cmgCampo("Ordem de partida", inputNum("ordemPartida")),
        cmgCampo("Carga operando (kVA)", inputNum("cargaOperanteKVA")),
        cmgCampo("Carga operando (FP)", inputNum("cargaOperanteFP")),
      ]),
    );
    const simult = document.createElement("div");
    simult.className = "toggle-group";
    ["Sim", "Não"].forEach((vv) => {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "toggle-btn" + (ap.simultaneidade === vv ? " on" : "");
      b.textContent = vv;
      b.addEventListener("click", () => {
        ap.simultaneidade = vv;
        simult
          .querySelectorAll(".toggle-btn")
          .forEach((x) => x.classList.toggle("on", x === b));
      });
      simult.appendChild(b);
    });
    sub.appendChild(
      grade([
        cmgCampo(
          "Carga sensível — Tipo",
          inputTxt("cargaSensivelTipo", "Ex.: CLP, iluminação"),
        ),
        cmgCampo(
          "Carga sensível — % admissível",
          inputNum("cargaSensivelPercentual"),
        ),
        cmgCampo("Simultaneidade", simult),
      ]),
    );
    box.appendChild(sub);
  });
}
/* Exportação do relatório de partida (porte de revisar.js — folha A4 por
   motor pesado; impedância do trafo omitida: cliente em rede secundária). */
async function exportarPDFPartidaBT() {
  // jsPDF sob demanda; o guard logo abaixo segue valendo se a carga falhar.
  await window.CemigLibs.jspdf().catch(() => {});
  if (!window.jspdf) {
    alert("Biblioteca jsPDF não carregada.");
    return;
  }
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const PW = 210,
    MG = 14,
    CW = PW - 2 * MG;
  let cy = MG;
  const drawTopBar = () => {
    doc.setFillColor(10, 47, 39);
    doc.rect(0, 0, PW, 16, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text("FORMULÁRIO PARA A ANÁLISE DE PARTIDA DE MOTORES", PW / 2, 10, {
      align: "center",
    });
    cy = 23;
  };
  const sec = (t) => {
    doc.setFillColor(230, 242, 238);
    doc.rect(MG, cy, CW, 6, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(10, 47, 39);
    doc.text(t, MG + 2, cy + 4.2);
    cy += 9;
  };
  const kv = (label, valor) => {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(20, 20, 20);
    doc.text(label, MG, cy);
    doc.setFont("helvetica", "normal");
    doc.text(String(valor), MG + 78, cy);
    cy += 5.5;
  };
  const valTexto = (v, sufixo) => {
    const s = String(v == null ? "" : v).trim();
    if (!s) return "________________";
    return sufixo ? `${s} ${sufixo}` : s;
  };
  const host = window.PARTIDA_MOTORES_HOST;
  const nomeCliente = String((host && host.cliente()) || "Cliente").trim();
  const lista = motoresPesadosBT();
  if (!lista.length) {
    drawTopBar();
    sec("IDENTIFICAÇÃO");
    kv("Cliente:", nomeCliente || "________________");
    cy += 4;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(60, 60, 60);
    doc.text("Nenhum motor pesado identificado.", MG, cy);
  } else {
    lista.forEach(({ motor }, i) => {
      if (i > 0) doc.addPage();
      cy = MG;
      drawTopBar();
      sec("IDENTIFICAÇÃO");
      kv("Cliente:", nomeCliente || "________________");
      sec("TIPO DO MOTOR / NÚMERO DE FASES");
      kv(
        "Número de fases:",
        motor.fase === "mono" ? "Monofásico" : "Trifásico",
      );
      const ap = motor.analisePartida || {};
      const cNom = parseFloat(ap.correnteNominal) || 0;
      const ipIn = parseFloat(ap.ipIn) || 0;
      const cPartida = cNom && ipIn ? (cNom * ipIn).toFixed(2) : "";
      sec("DADOS ELÉTRICOS");
      kv("Potência do motor (CV):", valTexto(_motorLabelCV(motor)));
      kv("Corrente Nominal (A):", valTexto(ap.correnteNominal));
      kv("Relação Ip/In:", valTexto(ap.ipIn));
      kv("Corrente de partida (A):", valTexto(cPartida));
      kv("Fator de potência na partida:", valTexto(ap.fpPartida));
      sec("NÚMERO DE PARTIDAS");
      kv("Número de partidas:", valTexto(ap.numPartidas));
      sec("DISPOSITIVO AUXILIAR DE PARTIDA (QUANDO HOUVER)");
      const dispositivoTexto = ap.dispositivo
        ? ap.dispositivo +
          (ap.dispositivo === "Chave Compensadora"
            ? ` — Tap: ${valTexto(ap.tap, "%")}`
            : "")
        : "________________";
      kv("Dispositivo:", dispositivoTexto);
      sec("ORDEM DE PARTIDA DO MOTOR (DOIS OU MAIS MOTORES)");
      kv("Ordem de partida:", valTexto(ap.ordemPartida));
      sec("CARGAS OPERANDO ENQUANTO O MOTOR PARTE");
      kv("Potência (kVA):", valTexto(ap.cargaOperanteKVA));
      kv("Fator de potência:", valTexto(ap.cargaOperanteFP));
      sec("CARGAS SENSÍVEIS A FLUTUAÇÕES DE TENSÃO");
      kv("Tipo:", valTexto(ap.cargaSensivelTipo));
      kv("Flutuação admissível (%):", valTexto(ap.cargaSensivelPercentual));
      sec("SIMULTANEIDADE DE PARTIDA");
      kv("Simultaneidade:", valTexto(ap.simultaneidade));
      sec("TRANSFORMADOR DO CONSUMIDOR");
      kv("Potência do transformador:", "Cliente ligado a rede CEMIG");
      sec("NOTAS");
      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(60, 60, 60);
      doc.text(
        doc.splitTextToSize(
          "1 - Em caso de partida sequencial de motores, preencher uma folha para cada motor, indicando a ordem de partida.",
          CW,
        ),
        MG,
        cy,
      );
      cy += 8;
      doc.text(
        doc.splitTextToSize(
          "2 - Anexar, sempre que possível, a(s) folha(s) das características elétricas, fornecida(s) pelo fabricante do motor.",
          CW,
        ),
        MG,
        cy,
      );
      cy += 12;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(20, 20, 20);
      doc.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, MG, cy);
      cy += 22;
      doc.setDrawColor(60, 60, 60);
      doc.line(MG, cy, MG + 90, cy);
      cy += 4;
      doc.setFontSize(8);
      doc.text("Responsável pelas informações", MG, cy);
    });
  }
  const nomeArquivo = `Analise_Partida_Motores_${nomeCliente.replace(/\s+/g, "_") || "Cliente"}.pdf`;
  doc.save(nomeArquivo);
  if (typeof mostrarModalPdfExportado === "function")
    mostrarModalPdfExportado();
}
