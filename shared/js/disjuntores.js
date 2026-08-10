/* ============================================================
   CEMIG — Catálogos de disjuntores e seletividade
   ------------------------------------------------------------
   Fonte única dos catálogos padronizados e das funções que
   escolhem/comparam disjuntores.

   Antes existiam DUAS versões divergentes destas funções
   (bt/js/calc.js e shared/js/calc.js). Esta é a do BT, que é a
   correta pela norma: o limite do bipolar é a CORRENTE de 63 A,
   não a demanda — ver `selecionarDisjuntores`.

   Catálogos:
     • DISJ     — ND-5.1, disjuntor da UC (inclui faixas antigas
                  de 40/50/60 A, usadas como "disjuntor atual").
     • DISJ_CN  — Ligação Nova: faixas admitidas em obra nova.
     • DISJ_COL — lista curta do disjuntor da UC no coletivo.
     • DISJ_GER — proteção GERAL (catálogo estendido), com as
                  duas alternativas da norma para a mesma
                  corrente ("Tripolar 700 A" e "Tripolar 3 x 225 A").

   Carregar ANTES de shared/js/calc.js e de shared/js/calc-demanda.js.
   ============================================================ */

// Disjuntores padronizados CEMIG ND-5.1
const DISJ = [
  { fx: "Monopolar 40 A", d: 5.0, tipo: "mono" },
  { fx: "Monopolar 50 A", d: 6.0, tipo: "mono" },
  { fx: "Monopolar 60 A", d: 7.6, tipo: "mono" },
  { fx: "Monopolar 63 A", d: 7.6, tipo: "mono" },
  { fx: "Bipolar 50 A", d: 12.0, tipo: "bi" },
  { fx: "Bipolar 60 A", d: 15.1, tipo: "bi" },
  { fx: "Bipolar 63 A", d: 15.1, tipo: "bi" },
  { fx: "Bipolar 70 A", d: 16.8, tipo: "bi" },
  { fx: "Bipolar 100 A", d: 24.0, tipo: "bi" },
  { fx: "Bipolar 125 A", d: 30.0, tipo: "bi" },
  { fx: "Bipolar 150 A", d: 36.0, tipo: "bi" },
  { fx: "Bipolar 200 A", d: 50.0, tipo: "bi" },
  { fx: "Tripolar 50 A", d: 19.0, tipo: "tri" },
  { fx: "Tripolar 60 A", d: 24.0, tipo: "tri" },
  { fx: "Tripolar 63 A", d: 24.0, tipo: "tri" },
  { fx: "Tripolar 70 A", d: 26.6, tipo: "tri" },
  { fx: "Tripolar 80 A", d: 30.5, tipo: "tri" },
  { fx: "Tripolar 100 A", d: 38.1, tipo: "tri" },
  { fx: "Tripolar 125 A", d: 47.6, tipo: "tri" },
  { fx: "Tripolar 150 A", d: 57.1, tipo: "tri" },
  { fx: "Tripolar 175 A", d: 66.0, tipo: "tri" },
  { fx: "Tripolar 200 A", d: 75.0, tipo: "tri" },
  { fx: "Tripolar 225 A", d: 86.0, tipo: "tri" },
  { fx: "Tripolar 250 A", d: 95.0, tipo: "tri" },
  { fx: "Tripolar 300/315/320 A", d: 114.0, tipo: "tri" },
  { fx: "Tripolar 400 A", d: 152.0, tipo: "tri" },
  { fx: "Tripolar 450 A", d: 171.0, tipo: "tri" },
  { fx: "Tripolar 500 A", d: 188.0, tipo: "tri" },
  { fx: "Tripolar 600/630 A", d: 228.0, tipo: "tri" },
  { fx: "Tripolar 700 A", d: 266.0, tipo: "tri" },
  { fx: "Tripolar 800 A", d: 304.0, tipo: "tri" },
];

const DISJ_CN = [
  { fx: "Monopolar 63 A", d: 7.6, tipo: "mono" },
  { fx: "Bipolar 63 A", d: 15.1, tipo: "bi" },
  { fx: "Bipolar 100 A", d: 24.0, tipo: "bi" },
  { fx: "Bipolar 125 A", d: 30.0, tipo: "bi" },
  { fx: "Bipolar 150 A", d: 36.0, tipo: "bi" },
  { fx: "Bipolar 200 A", d: 50.0, tipo: "bi" },
  { fx: "Tripolar 63 A", d: 24.0, tipo: "tri" },
  { fx: "Tripolar 80 A", d: 30.5, tipo: "tri" },
  { fx: "Tripolar 100 A", d: 38.1, tipo: "tri" },
  { fx: "Tripolar 125 A", d: 47.6, tipo: "tri" },
  { fx: "Tripolar 150 A", d: 57.1, tipo: "tri" },
  { fx: "Tripolar 200 A", d: 75.0, tipo: "tri" },
  { fx: "Tripolar 225 A", d: 86.0, tipo: "tri" },
  { fx: "Tripolar 250 A", d: 95.0, tipo: "tri" },
  { fx: "Tripolar 300/315/320 A", d: 114.0, tipo: "tri" },
  { fx: "Tripolar 400 A", d: 152.0, a: 400, tipo: "tri" },
  { fx: "Tripolar 2 x 200 A", d: 152.0, a: 400, tipo: "tri" },
  { fx: "Tripolar 450 A", d: 171.0, a: 450, tipo: "tri" },
  { fx: "Tripolar 2 x 225 A", d: 171.0, a: 450, tipo: "tri" },
  { fx: "Tripolar 500 A", d: 188.0, a: 500, tipo: "tri" },
  { fx: "Tripolar 2 x 250 A", d: 188.0, a: 500, tipo: "tri" },
  { fx: "Tripolar 600/630 A", d: 228.0, a: 600, tipo: "tri" },
  { fx: "Tripolar 2 x 300/2x315/2x320 A", d: 228.0, a: 600, tipo: "tri" },
  { fx: "Tripolar 700 A", d: 266.0, a: 700, tipo: "tri" },
  { fx: "Tripolar 3 x 225 A", d: 266.0, a: 700, tipo: "tri" },
  { fx: "Tripolar 800 A", d: 304.0, a: 800, tipo: "tri" },
  { fx: "Tripolar 3 x 250 A", d: 304.0, a: 800, tipo: "tri" },
  { fx: "Tripolar 1000 A", d: 342.0, a: 1000, tipo: "tri" },
  { fx: "Tripolar 3 x 300 A", d: 342.0, a: 1000, tipo: "tri" },
  { fx: "Tripolar 1200 A", d: 456.0, a: 1200, tipo: "tri" },
  { fx: "Tripolar 4 x 300 A", d: 456.0, a: 1200, tipo: "tri" },
  { fx: "Tripolar 1500 A", d: 570.0, a: 1500, tipo: "tri" },
  { fx: "Tripolar 5 x 300 A", d: 570.0, a: 1500, tipo: "tri" },
  { fx: "Tripolar 1800 A", d: 685.0, a: 1800, tipo: "tri" },
  { fx: "Tripolar 6 x 300 A", d: 685.0, a: 1800, tipo: "tri" },
  { fx: "Tripolar 2100 A", d: 800.0, a: 2100, tipo: "tri" },
  { fx: "Tripolar 7 x 300 A", d: 800.0, a: 2100, tipo: "tri" },
];

const DISJ_COL = [
  { fx: "Monopolar 63 A", d: 7.6, tipo: "mono" },
  { fx: "Bipolar 63 A", d: 15.1, tipo: "bi" },
  { fx: "Tripolar 63 A", d: 24.0, tipo: "tri" },
  { fx: "Tripolar 80 A", d: 30.5, tipo: "tri" },
  { fx: "Tripolar 100 A", d: 38.1, tipo: "tri" },
  { fx: "Tripolar 125 A", d: 47.6, tipo: "tri" },
  { fx: "Tripolar 150 A", d: 57.1, tipo: "tri" },
  { fx: "Tripolar 175 A", d: 66.0, tipo: "tri" },
  { fx: "Tripolar 200 A", d: 75.0, tipo: "tri" },
  { fx: "Tripolar 225 A", d: 86.0, tipo: "tri" },
  { fx: "Tripolar 250 A", d: 95.0, tipo: "tri" },
];

const DISJ_GER = [
  { fx: "Bipolar 100 A", d: 24.0, tipo: "bi" },
  { fx: "Bipolar 125 A", d: 30.0, tipo: "bi" },
  { fx: "Bipolar 150 A", d: 36.0, tipo: "bi" },
  { fx: "Bipolar 200 A", d: 50.0, tipo: "bi" },
  { fx: "Tripolar 80 A", d: 30.5, tipo: "tri" },
  { fx: "Tripolar 100 A", d: 38.1, tipo: "tri" },
  { fx: "Tripolar 125 A", d: 47.6, tipo: "tri" },
  { fx: "Tripolar 150 A", d: 57.1, tipo: "tri" },
  { fx: "Tripolar 175 A", d: 66.0, tipo: "tri" },
  { fx: "Tripolar 200 A", d: 75.0, tipo: "tri" },
  { fx: "Tripolar 225 A", d: 86.0, tipo: "tri" },
  { fx: "Tripolar 250 A", d: 95.0, tipo: "tri" },
  { fx: "Tripolar 300/315/320 A", d: 114.0, tipo: "tri" },
  { fx: "Tripolar 400 A", d: 152.0, a: 400, tipo: "tri" },
  { fx: "Tripolar 2 x 200 A", d: 152.0, a: 400, tipo: "tri" },
  { fx: "Tripolar 450 A", d: 171.0, a: 450, tipo: "tri" },
  { fx: "Tripolar 2 x 225 A", d: 171.0, a: 450, tipo: "tri" },
  { fx: "Tripolar 500 A", d: 188.0, a: 500, tipo: "tri" },
  { fx: "Tripolar 2 x 250 A", d: 188.0, a: 500, tipo: "tri" },
  { fx: "Tripolar 600/630 A", d: 228.0, a: 600, tipo: "tri" },
  { fx: "Tripolar 2 x 300/2x315/2x320 A", d: 228.0, a: 600, tipo: "tri" },
  { fx: "Tripolar 700 A", d: 266.0, a: 700, tipo: "tri" },
  { fx: "Tripolar 3 x 225 A", d: 266.0, a: 700, tipo: "tri" },
  { fx: "Tripolar 800 A", d: 304.0, a: 800, tipo: "tri" },
  { fx: "Tripolar 3 x 250 A", d: 304.0, a: 800, tipo: "tri" },
  { fx: "Tripolar 1000 A", d: 342.0, a: 1000, tipo: "tri" },
  { fx: "Tripolar 3 x 300 A", d: 342.0, a: 1000, tipo: "tri" },
  { fx: "Tripolar 1200 A", d: 456.0, a: 1200, tipo: "tri" },
  { fx: "Tripolar 4 x 300 A", d: 456.0, a: 1200, tipo: "tri" },
  { fx: "Tripolar 1500 A", d: 570.0, a: 1500, tipo: "tri" },
  { fx: "Tripolar 5 x 300 A", d: 570.0, a: 1500, tipo: "tri" },
  { fx: "Tripolar 1800 A", d: 685.0, a: 1800, tipo: "tri" },
  { fx: "Tripolar 6 x 300 A", d: 685.0, a: 1800, tipo: "tri" },
  { fx: "Tripolar 2100 A", d: 800.0, a: 2100, tipo: "tri" },
  { fx: "Tripolar 7 x 300 A", d: 800.0, a: 2100, tipo: "tri" },
];

// Seleção de disjuntores conforme demanda e tipo de rede
function selecionarDisjuntores(demanda, redeMono) {
  if (demanda <= 0) return [];
  const tipos = ["mono", "bi", "tri"];
  const result = [];
  for (const tp of tipos) {
    const cand = DISJ_CN.filter(
      (dj) =>
        dj.tipo === tp &&
        dj.d >= demanda &&
        // Em rede trifásica o bipolar é admitido apenas até 63 A; acima disso
        // o atendimento deve ser tripolar.
        (redeMono || tp !== "bi" || correnteDisj(dj.fx) <= 63),
    );
    if (cand.length > 0) {
      cand.sort((a, b) => a.d - b.d);
      result.push(cand[0]);
    }
  }
  return result;
}

// Corrente nominal de FAIXA (A) declarada nos catálogos: mapeia o rótulo (fx)
// para o campo `a` quando existe. É o que emparelha as duas alternativas da
// norma — ex.: "Tripolar 700 A" e "Tripolar 3 x 225 A" têm ambos a = 700,
// mesmo a soma real das parcelas (675) sendo menor. Montado uma vez a partir de
// todos os catálogos de disjuntores disponíveis.
const _CORRENTE_FAIXA = (function () {
  const m = {};
  [
    typeof DISJ !== "undefined" ? DISJ : null,
    typeof DISJ_CN !== "undefined" ? DISJ_CN : null,
    typeof DISJ_GER !== "undefined" ? DISJ_GER : null,
  ].forEach((cat) => {
    (cat || []).forEach((dj) => {
      if (dj && dj.fx && dj.a != null) m[dj.fx] = dj.a;
    });
  });
  return m;
})();

// Corrente EFETIVA (A) do rótulo do disjuntor, usada em toda a seletividade.
// Ordem de resolução:
//   1) corrente de faixa declarada (`a`) — vale para as Alternativas 1 e 2 da
//      proteção geral, que compartilham a corrente da linha da norma;
//   2) "Tripolar 600/630 A"   -> 600  (usa o 1º valor da opção de norma);
//   3) "Tripolar 400 A"       -> 400.
function correnteDisj(fx) {
  if (!fx) return 0;
  if (_CORRENTE_FAIXA[fx] != null) return _CORRENTE_FAIXA[fx];
  const m = String(fx).match(/(\d+)(?:\/\d+)*\s*A/);
  return m ? Number(m[1]) : 0;
}

// Lista de disjuntores GERAIS válidos para o agrupamento, respeitando:
// 1) Seletividade: corrente estritamente MAIOR que a maior UC (evita que o
//    geral atue antes do disjuntor de uma UC individual).
// 2) Capacidade: suporta a demanda total do agrupamento (d em kVA).
// Considera apenas tripolares (proteção geral de agrupamento é trifásica).
// Ordenado do menor para o maior — o primeiro item é a sugestão automática.
function disjuntoresGeraisAcima(maiorCorrenteUC, demandaTotal) {
  return DISJ_GER.filter(
    (d) =>
      d.tipo === "tri" &&
      correnteDisj(d.fx) > maiorCorrenteUC &&
      (demandaTotal == null || d.d >= demandaTotal),
  )
    .sort((a, b) => correnteDisj(a.fx) - correnteDisj(b.fx))
    .map((d) => d.fx);
}

// Ordenação por corrente crescente (empate desfeito pela capacidade d).
function d_corr(a, b) {
  return correnteDisj(a.fx) - correnteDisj(b.fx) || a.d - b.d;
}
