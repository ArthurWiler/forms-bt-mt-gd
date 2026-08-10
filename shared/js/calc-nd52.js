/* ============================================================
   CEMIG — ND-5.2: demanda de apartamentos residenciais
   ------------------------------------------------------------
   Método normativo do AGRUPAMENTO (edificação coletiva):
   a demanda da parte residencial sai da quantidade de
   apartamentos e da área média ponderada, não das cargas
   declaradas unidade a unidade (isso é o ND-5.1).

       D = 1,4 × F × A

   Bloco puro: só depende das duas tabelas abaixo — nenhuma
   referência a `state` ou ao DOM. Por isso é compartilhado
   entre o formulário BT (coletivo/condomínio de torres) e a
   Microgeração (edificação Coletiva/Agrupamento), que precisam
   chegar exatamente ao mesmo número para a mesma entrada.
   ============================================================ */

// Tabela 12 (ND-5.2) — Fator F por quantidade de apartamentos.
// Tabela parcialmente lacunosa (faixas 206-249 e 253-274 não informadas
// pela norma fornecida): nd52ObterF() interpola linearmente esses pontos.
const ND52_FATOR_F = {
  4: 3.88,
  5: 4.84,
  6: 5.8,
  7: 6.76,
  8: 7.72,
  9: 8.68,
  10: 9.64,
  11: 10.42,
  12: 11.2,
  13: 11.98,
  14: 12.76,
  15: 13.54,
  16: 14.32,
  17: 15.1,
  18: 15.88,
  19: 16.66,
  20: 17.44,
  21: 18.04,
  22: 18.65,
  23: 19.25,
  24: 19.86,
  25: 20.46,
  26: 21.06,
  27: 21.67,
  28: 22.27,
  29: 22.88,
  30: 23.48,
  31: 24.08,
  32: 24.69,
  33: 25.29,
  34: 25.9,
  35: 26.5,
  36: 27.1,
  37: 27.71,
  38: 28.31,
  39: 28.92,
  40: 29.52,
  41: 30.12,
  42: 30.73,
  43: 31.33,
  44: 31.94,
  45: 32.54,
  46: 33.1,
  47: 33.66,
  48: 34.22,
  49: 34.78,
  50: 35.34,
  // 51 corrigido de 31,90 (incoerente com a sequência) para 35,90, mantendo o
  // incremento de ~0,56 observado entre 50 e 52 — confirmar com a norma oficial.
  51: 35.9,
  52: 36.46,
  53: 37.02,
  54: 37.58,
  55: 38.14,
  56: 38.7,
  57: 39.26,
  58: 39.82,
  59: 40.38,
  60: 40.94,
  61: 41.5,
  62: 42.06,
  63: 42.62,
  64: 43.18,
  65: 43.74,
  66: 44.3,
  67: 44.86,
  68: 45.42,
  69: 45.98,
  70: 46.54,
  71: 47.1,
  72: 47.66,
  73: 48.22,
  74: 48.78,
  75: 49.34,
  76: 49.9,
  77: 50.46,
  78: 51.02,
  79: 51.58,
  80: 52.14,
  81: 52.7,
  82: 53.26,
  83: 53.82,
  84: 54.38,
  85: 54.94,
  86: 55.5,
  87: 56.06,
  88: 56.62,
  89: 57.18,
  90: 57.74,
  91: 58.3,
  92: 58.86,
  93: 59.42,
  94: 59.98,
  95: 60.54,
  96: 61.1,
  97: 61.66,
  98: 62.22,
  99: 62.78,
  100: 63.34,
  101: 63.59,
  102: 63.84,
  103: 64.09,
  104: 64.34,
  105: 64.59,
  106: 64.84,
  107: 65.09,
  108: 65.34,
  109: 65.59,
  110: 65.84,
  111: 66.09,
  112: 66.34,
  113: 66.59,
  114: 66.84,
  115: 67.09,
  116: 67.34,
  117: 67.59,
  118: 67.84,
  119: 68.09,
  120: 68.34,
  121: 68.59,
  122: 68.84,
  123: 69.09,
  124: 69.34,
  125: 69.59,
  126: 69.79,
  127: 69.99,
  128: 70.19,
  129: 70.39,
  130: 70.59,
  131: 70.79,
  132: 70.99,
  133: 71.19,
  134: 71.39,
  135: 71.59,
  136: 71.79,
  137: 71.99,
  138: 72.19,
  139: 72.39,
  140: 72.59,
  141: 72.79,
  142: 72.99,
  143: 73.19,
  144: 73.39,
  145: 73.59,
  146: 73.79,
  147: 73.99,
  148: 74.19,
  149: 74.39,
  150: 74.59,
  151: 74.74,
  152: 74.89,
  153: 75.04,
  154: 75.19,
  155: 75.34,
  156: 75.49,
  157: 75.64,
  158: 75.79,
  159: 75.94,
  160: 76.09,
  161: 76.24,
  162: 76.39,
  163: 76.54,
  164: 76.69,
  165: 76.84,
  166: 76.99,
  167: 77.14,
  168: 77.29,
  169: 77.44,
  170: 77.59,
  171: 77.74,
  172: 77.89,
  173: 78.04,
  174: 78.19,
  175: 78.34,
  176: 78.44,
  177: 78.54,
  178: 78.64,
  179: 78.74,
  180: 78.84,
  181: 78.94,
  182: 79.04,
  183: 79.14,
  184: 79.24,
  185: 79.34,
  186: 79.44,
  187: 79.54,
  188: 79.64,
  189: 79.74,
  190: 79.84,
  191: 79.94,
  192: 80.04,
  193: 80.14,
  194: 80.24,
  195: 80.34,
  196: 80.44,
  197: 80.54,
  198: 80.64,
  199: 80.74,
  200: 80.84,
  201: 80.89,
  202: 80.94,
  203: 80.99,
  204: 81.04,
  205: 81.09,
  250: 82.72,
  251: 82.73,
  252: 82.74,
  275: 82.97,
  276: 83.0,
};

// Tabela 13 (ND-5.2) — Demanda por apartamento (A) conforme área média
// ponderada das unidades (m²). Faixas em [limiteSuperior, valorDeA].
const ND52_TABELA_A = [
  [15, 0.39],
  [20, 0.51],
  [25, 0.62],
  [30, 0.73],
  [35, 0.84],
  [40, 0.95],
  [45, 1.05],
  [50, 1.16],
  [55, 1.26],
  [60, 1.36],
  [65, 1.47],
  [70, 1.57],
  [75, 1.67],
  [80, 1.76],
  [85, 1.86],
  [90, 1.96],
  [95, 2.06],
  [100, 2.16],
  [110, 2.35],
  [120, 2.54],
  [130, 2.73],
  [140, 2.91],
  [150, 3.1],
  [160, 3.28],
  [170, 3.47],
  [180, 3.65],
  [190, 3.83],
  [200, 4.01],
  [220, 4.36],
  [240, 4.72],
  [260, 5.07],
  [280, 5.42],
  [300, 5.76],
  [350, 6.61],
  [400, 7.45],
  [450, 8.28],
  [500, 9.1],
  [550, 9.91],
  [600, 10.71],
  [650, 11.51],
  [700, 12.3],
  [800, 13.86],
  [900, 15.4],
  [1000, 16.93],
];

// Tabela 13 (ND-5.2): demanda por apartamento (A) pela área média ponderada.
// Retorna null se a área for inválida ou exceder 1000 m² (fora da tabela).
function nd52ObterA(area) {
  if (!(area > 0) || area > 1000) return null;
  const faixa = ND52_TABELA_A.find((r) => area <= r[0]);
  return faixa ? faixa[1] : null;
}

// Tabela 12 (ND-5.2): fator F pela quantidade de apartamentos.
// Válida a partir de 4 apartamentos; estabiliza em 83,00 a partir de 276.
// Interpola linearmente os pontos não cadastrados em ND52_FATOR_F.
function nd52ObterF(qtd) {
  if (!(qtd >= 4)) return null;
  if (qtd >= 276) return 83.0;
  if (ND52_FATOR_F[qtd] != null) return ND52_FATOR_F[qtd];
  const chaves = Object.keys(ND52_FATOR_F)
    .map(Number)
    .sort((a, b) => a - b);
  let inf = null,
    sup = null;
  for (const k of chaves) {
    if (k < qtd) inf = k;
    if (k > qtd && sup == null) sup = k;
  }
  if (inf == null || sup == null) return null;
  const fInf = ND52_FATOR_F[inf],
    fSup = ND52_FATOR_F[sup];
  return fInf + ((fSup - fInf) * (qtd - inf)) / (sup - inf);
}

// Calcula a demanda do agrupamento de apartamentos residenciais (ND-5.2).
// Retorna null quando os parâmetros estão fora da faixa válida da norma
// (qtd < 4 apartamentos ou área média ponderada > 1000 m²).
function nd52CalcularDemandaApartamentos(
  areaMediaPonderada,
  quantidadeApartamentos,
) {
  const A = nd52ObterA(areaMediaPonderada);
  const F = nd52ObterF(quantidadeApartamentos);
  if (A == null || F == null) return null;
  return {
    quantidadeApartamentos,
    areaMediaPonderada,
    fatorF: F,
    demandaAreaA: A,
    demandaKVA: 1.4 * F * A,
  };
}
