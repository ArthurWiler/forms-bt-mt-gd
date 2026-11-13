/* ============================================================
   Armazenamento de energia — regra da Geração Distribuída
   (Microgeração e Minigeração; a etapa vem antes da Correspondência).

   Seção 5 da planilha da norma: "Possui sistema de armazenamento?" (padrão
   Não) abre ilhamento, potências de carga/descarga e "Central geradora
   despachável?" (Art. 2º, IV-A, REN 1000/2021). Despachável = Sim exige a
   memória de cálculo no APRWEB e mostra a produção mensal da central,
   calculada pela planilha como:
       Pot. ativa instalada de geração da usina (kW) × 0,16 × 30 × 24

   Usa os globais `state`, `$` e `$$` do app de cada formulário GD e a
   potência da usina já calculada em `state.potAtivaInstalada`.
   ============================================================ */

const ARMAZ_FATOR_CAPACIDADE = 0.16;
const ARMAZ_HORAS_MES = 30 * 24;

// Produção mensal (kWh) da central a partir da potência da usina (kW).
function producaoMensalArmazKWh(potKw) {
  const p = parseFloat(potKw) || 0;
  return p > 0 ? p * ARMAZ_FATOR_CAPACIDADE * ARMAZ_HORAS_MES : 0;
}

const _fmtArmazKWh = (v) =>
  v ? v.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) : "";

// Recalcula o KPI da produção mensal. Chamado ao abrir a etapa, ao responder
// "despachável" e sempre que a potência da usina muda.
function atualizarProducaoArmazGD() {
  const v = producaoMensalArmazKWh(state.potAtivaInstalada);
  state.armazProducaoMensal = v ? String(v) : "";
  const el = $("#armazProducaoMensal");
  if (el) el.textContent = v ? _fmtArmazKWh(v) + " kWh" : "—";
}

// Visibilidade em cascata: Possui = Sim abre os detalhes; Despachável = Sim
// abre o aviso do APRWEB e a produção mensal. Os campos ocultos ficam fora da
// validação (form-marcadores ignora o que não está visível).
function onArmazGD() {
  const sim = state.armazPossui === "Sim";
  const box = $("#armazDetalheBox");
  if (box) box.style.display = sim ? "" : "none";
  const desp = $("#armazDespachavelBox");
  if (desp)
    desp.style.display = sim && state.armazDespachavel === "Sim" ? "" : "none";
  atualizarProducaoArmazGD();
  if (window.CemigMarcadores) window.CemigMarcadores.atualizarAvancar();
}

// Pendências para a lista da prévia (mesmo `req(valor, rótulo)` dos apps).
function armazPendenciasGD(d, req) {
  req(d.armazPossui, "Possui sistema de armazenamento de energia");
  if (d.armazPossui !== "Sim") return;
  req(d.armazIlhada, "Sistema com possibilidade de operação ilhada");
  req(d.armazPotCarga, "Máxima potência de carga do armazenamento");
  req(d.armazPotDescarga, "Máxima potência de descarga do armazenamento");
  req(d.armazDespachavel, "Possui central geradora despachável");
}

// Pares [rótulo, valor] da seção, para a prévia e o PDF dos dois formulários.
// `curto`: rótulos enxutos para o PDF, cujos pares dividem meia coluna entre
// rótulo e valor (o rótulo longo empurraria o valor para as reticências).
function armazLinhasGD(d, curto) {
  const kw = (v) =>
    String(v ?? "").trim() ? Number(v).toLocaleString("pt-BR") + " kW" : "";
  const rot = (longo, enxuto) => (curto ? enxuto : longo);
  const linhas = [
    [
      rot("Possui sistema de armazenamento de energia", "Possui armazenamento"),
      d.armazPossui || "Não",
    ],
  ];
  if (d.armazPossui !== "Sim") return linhas;
  linhas.push(
    [
      rot("Sistema com possibilidade de operação ilhada", "Operação ilhada"),
      d.armazIlhada,
    ],
    [rot("Máxima potência de carga", "Pot. máx. de carga"), kw(d.armazPotCarga)],
    [
      rot("Máxima potência de descarga", "Pot. máx. de descarga"),
      kw(d.armazPotDescarga),
    ],
    [
      rot("Possui central geradora despachável", "Central despachável"),
      d.armazDespachavel,
    ],
  );
  if (d.armazDespachavel === "Sim") {
    const v = producaoMensalArmazKWh(d.potAtivaInstalada);
    linhas.push([
      rot("Produção mensal da central geradora distribuída", "Produção mensal"),
      v ? _fmtArmazKWh(v) + " kWh" : "",
    ]);
  }
  return linhas;
}
