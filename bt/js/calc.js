/* ============================================================
   CEMIG — Funções de cálculo de demanda (ND-5.1 / Anexo B)
   D = a + b + c + d + e + f
   ============================================================ */

// Formatadores
const fmt2 = (v) =>
  v == null || isNaN(v)
    ? "0,00"
    : Number(v).toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
const fmtW = (v) => (Number(v) || 0).toLocaleString("pt-BR");

// Parcela a) iluminação/tomadas — residencial (Tabela 10)
function calcA_res(kw) {
  if (kw <= 0) return { d: 0, f: 0 };
  const x = TABELA_10.find((r) => kw > r.min && kw <= r.max) || TABELA_10[10];
  return { d: kw * x.fator, f: x.fator };
}

// Parcela a) iluminação/tomadas — não-residencial (Tabela 11)
function calcA_nr(kva, ci) {
  if (kva <= 0 || ci < 0) return { d: 0, f: "-" };
  const c = TABELA_11[ci];
  if (!c) return { d: 0, f: "-" };
  if (c.lim === Infinity) return { d: kva * c.fp, f: c.fp };
  return {
    d: Math.min(kva, c.lim) * c.fp + Math.max(0, kva - c.lim) * c.fe,
    f: `${c.fp}/${c.fe}`,
  };
}

// Parcela b) — subgrupos b1..b5
function calcBsg(items, sg) {
  const tot = items.reduce((s, i) => s + i.q, 0);
  const kw = items.reduce((s, i) => s + i.q * i.w, 0) / 1000;
  if (!tot || kw <= 0) return { kw: 0, f: 0, d: 0 };
  if (sg === "b3") {
    const n = Math.min(tot, 12);
    const pm = kw / tot;
    const e = TABELA_12.find((x) => x.n === n) || TABELA_12[11];
    const f = pm <= 3.5 ? e.a : e.b;
    return { kw, f, d: kw * f };
  }
  const f = getFt13(tot);
  return { kw, f, d: kw * f };
}

// ============================================================
// ND-5.2 — Demanda de apartamentos residenciais (agrupamento)
// D = 1,4 × F × A
// ============================================================

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
function nd52CalcularDemandaApartamentos(areaMediaPonderada, quantidadeApartamentos) {
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

// ============================================================
// MÚLTIPLAS TORRES / BLOCOS — demanda por torre (ND-5.2 por torre)
// A parte residencial de cada torre é calculada pelo ND-5.2 (área média
// ponderada + quantidade de apartamentos DA TORRE); a parte não residencial
// vem do campo informado pelo responsável técnico para a torre.
// Não inclui o disjuntor/demanda de combate a incêndio (somado à parte).
// ============================================================
function calcBlocoMultiTorres(b) {
  const ucs = (b && b.ucs) || [];
  const ativos = ucs.filter((u) => !ucSemAlteracao(u));
  const residenciais = ativos.filter((u) => u.atividade === "Residencial");
  const qtdApart = residenciais.length;
  let areaMedia = 0,
    nd52 = null,
    demResidencial = 0;
  if (qtdApart > 0) {
    areaMedia = residenciais.reduce((s, u) => s + num(u.area), 0) / qtdApart;
    nd52 = nd52CalcularDemandaApartamentos(areaMedia, qtdApart);
    // Fallback (qtd < 4 apartamentos ou área fora da tabela): soma das demandas
    // informadas manualmente por UC residencial.
    demResidencial = nd52
      ? nd52.demandaKVA
      : residenciais.reduce((s, u) => s + num((u.prev || {}).demanda), 0);
  }
  const temNaoResidencial = ativos.some(
    (u) => u.atividade && u.atividade !== "Residencial",
  );
  const demNaoResidencial = num(b && b.demandaNaoResidencial);
  return {
    qtdApart,
    areaMedia,
    nd52,
    demResidencial,
    temNaoResidencial,
    demNaoResidencial,
    demandaUcs: demResidencial + demNaoResidencial,
  };
}

// Seleção de disjuntores conforme demanda e tipo de rede
function selecionarDisjuntores(demanda, redeMono) {
  if (demanda <= 0) return [];
  const tipos = ["mono", "bi", "tri"];
  const result = [];
  for (const tp of tipos) {
    if (!redeMono && tp === "bi" && demanda > 16) continue;
    const cand = DISJ_CN.filter((dj) => dj.tipo === tp && dj.d >= demanda);
    if (cand.length > 0) {
      cand.sort((a, b) => a.d - b.d);
      result.push(cand[0]);
    }
  }
  return result;
}

// Extrai a corrente (A) do rótulo do disjuntor (ex.: "Tripolar 63 A" -> 63)
function correnteDisj(fx) {
  if (!fx) return 0;
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

/* ============================================================
   MÁSCARAS E VALIDAÇÃO (documentos / contatos / CEP)
   ============================================================ */

// Remove tudo que não for dígito
const soDigitos = (v) => String(v || "").replace(/\D/g, "");

// Detecta se o conteúdo digitado é CNPJ (mais de 11 dígitos) ou CPF
function ehCNPJ(v) {
  return soDigitos(v).length > 11;
}

// Máscara CPF: 000.000.000-00
function mascararCPF(v) {
  const d = soDigitos(v).slice(0, 11);
  let r = d;
  if (d.length > 9)
    r = `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  else if (d.length > 6) r = `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  else if (d.length > 3) r = `${d.slice(0, 3)}.${d.slice(3)}`;
  return r;
}

// Máscara CNPJ: 00.000.000/0000-00
function mascararCNPJ(v) {
  const d = soDigitos(v).slice(0, 14);
  let r = d;
  if (d.length > 12)
    r = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
  else if (d.length > 8)
    r = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8)}`;
  else if (d.length > 5) r = `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  else if (d.length > 2) r = `${d.slice(0, 2)}.${d.slice(2)}`;
  return r;
}

// Máscara automática CPF/CNPJ — escolhe pelo nº de dígitos
function mascararCpfCnpj(v) {
  return ehCNPJ(v) ? mascararCNPJ(v) : mascararCPF(v);
}

// Máscara CEP: 00000-000
function mascararCEP(v) {
  const d = soDigitos(v).slice(0, 8);
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d;
}

// Máscara celular: (00) 00000-0000
function mascararCelular(v) {
  const d = soDigitos(v).slice(0, 11);
  if (d.length > 7) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length > 0) return `(${d.slice(0)}`;
  return d;
}

// Máscara telefone fixo: (00) 0000-0000
function mascararFixo(v) {
  const d = soDigitos(v).slice(0, 10);
  if (d.length > 6) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  if (d.length > 2) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length > 0) return `(${d.slice(0)}`;
  return d;
}

// Máscara telefone genérica — fixo ou celular conforme nº de dígitos
function mascararTelefone(v) {
  return soDigitos(v).length > 10 ? mascararCelular(v) : mascararFixo(v);
}

// Máscara RG/RNE/RANI: até 9 caracteres alfanuméricos, agrupados 00.000.000-0
function mascararRG(v) {
  const limpo = String(v || "")
    .replace(/[^0-9A-Za-z]/g, "")
    .toUpperCase()
    .slice(0, 9);
  const d = limpo;
  if (d.length > 8)
    return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}-${d.slice(8)}`;
  if (d.length > 5) return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5)}`;
  if (d.length > 2) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return d;
}

// Validação de CPF (dígitos verificadores)
function cpfValido(v) {
  const d = soDigitos(v);
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false;
  let s = 0;
  for (let i = 0; i < 9; i++) s += parseInt(d[i]) * (10 - i);
  let r = (s * 10) % 11;
  if (r === 10) r = 0;
  if (r !== parseInt(d[9])) return false;
  s = 0;
  for (let i = 0; i < 10; i++) s += parseInt(d[i]) * (11 - i);
  r = (s * 10) % 11;
  if (r === 10) r = 0;
  return r === parseInt(d[10]);
}

// Validação de CNPJ (dígitos verificadores)
function cnpjValido(v) {
  const d = soDigitos(v);
  if (d.length !== 14 || /^(\d)\1{13}$/.test(d)) return false;
  const calc = (base) => {
    const pesos =
      base.length === 12
        ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
        : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
    let s = 0;
    for (let i = 0; i < base.length; i++) s += parseInt(base[i]) * pesos[i];
    const r = s % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const dv1 = calc(d.slice(0, 12));
  const dv2 = calc(d.slice(0, 12) + dv1);
  return dv1 === parseInt(d[12]) && dv2 === parseInt(d[13]);
}

// Validação combinada CPF/CNPJ — retorna {tipo, valido}
function validarCpfCnpj(v) {
  if (!v) return { tipo: "", valido: null };
  if (ehCNPJ(v)) {
    const completo = soDigitos(v).length === 14;
    return { tipo: "CNPJ", valido: completo ? cnpjValido(v) : null };
  }
  const completo = soDigitos(v).length === 11;
  return { tipo: "CPF", valido: completo ? cpfValido(v) : null };
}

// Dias permitidos para vencimento da conta (CEMIG)
const DIAS_VENCIMENTO = ["01", "06", "11", "17", "22", "27"];
