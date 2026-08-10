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
  // O método da torre depende SÓ da quantidade de apartamentos residenciais
  // (ND-5.2 exige 4+); a área média define apenas o valor A dentro do 5.2.
  const modoCalculadora = qtdApart < 4;
  let areaMedia = 0,
    nd52 = null;
  if (qtdApart > 0) {
    areaMedia = residenciais.reduce((s, u) => s + num(u.area), 0) / qtdApart;
    nd52 = nd52CalcularDemandaApartamentos(areaMedia, qtdApart);
  }
  const temNaoResidencial = ativos.some(
    (u) => u.atividade && u.atividade !== "Residencial",
  );
  let demResidencial = 0,
    demNaoResidencial = 0,
    demandaUcs;
  if (!modoCalculadora) {
    // Método ND-5.2: residencial pela tabela (por m²) + não residencial
    // informada pelo responsável técnico UC a UC (cada UC comercial/industrial/
    // rural carrega a sua própria demanda em kVA; a torre soma). Com a área
    // média fora da tabela (não informada ou > 1000 m²) a parte residencial
    // fica 0 até as áreas serem corrigidas (a validação aponta a pendência).
    demResidencial = nd52 ? nd52.demandaKVA : 0;
    demNaoResidencial = ativos
      .filter((u) => u.atividade && u.atividade !== "Residencial")
      .reduce((s, u) => s + num(u.demandaNaoResidencial), 0);
    demandaUcs = demResidencial + demNaoResidencial;
  } else {
    // Menos de 4 apartamentos residenciais (ou nenhum): todas as UCs
    // detalham as cargas (ND-5.1) e a demanda da torre é a soma das
    // demandas calculadas por UC.
    demandaUcs = ativos.reduce((s, u) => s + num((u.cargas || {})._demanda), 0);
  }
  return {
    qtdApart,
    areaMedia,
    nd52,
    modoCalculadora,
    demResidencial,
    temNaoResidencial,
    demNaoResidencial,
    demandaUcs,
  };
}

// Disjuntor efetivo escolhido para uma UC de torre no modo calculadora: o
// valor selecionado (disjPara) ou, na ausência, o menor adequado calculado
// pelas cargas declaradas (cargas._disjuntores[0]) — espelha o disjEscolhido
// do fluxo individual.
function disjUCTorre(u) {
  return (
    (u && u.disjPara) ||
    (u && u.cargas && (u.cargas._disjuntores || [])[0]) ||
    ""
  );
}
// Regra de disjuntor da torre (modo calculadora, até 3 UCs): o disjuntor geral
// (proteção coletiva da torre) só é OBRIGATÓRIO quando a combinação dos
// disjuntores das UCs a exige — mesma regra do BT individual
// (validacaoDisjuntoresBT):
//   • alguma UC com bipolar acima de 63 A; ou
//   • duas ou mais UCs tripolares.
// Fora do modo calculadora (método ND-5.2, 4+ apartamentos) o geral é sempre
// obrigatório. Retorna { obrigatorio, motivo }.
function disjGeralTorreRegra(b) {
  const calc = calcBlocoMultiTorres(b);
  if (!calc.modoCalculadora) return { obrigatorio: true, motivo: "nd52" };
  const ativos = ((b && b.ucs) || []).filter((u) => !ucSemAlteracao(u));
  let tri = 0;
  let acima63 = false;
  ativos.forEach((u) => {
    const esc = disjUCTorre(u);
    if (/Tripolar/i.test(esc)) tri++;
    if (/Bipolar/i.test(esc) && correnteDisj(esc) > 63) acima63 = true;
  });
  if (acima63) return { obrigatorio: true, motivo: "bipolar63" };
  if (tri > 1) return { obrigatorio: true, motivo: "multitri" };
  return { obrigatorio: false, motivo: "" };
}
function disjGeralTorreObrigatorio(b) {
  return disjGeralTorreRegra(b).obrigatorio;
}

// Disjuntor Geral de uma torre/bloco (múltiplas torres): derivado da Demanda
// das UCs da torre (sem o combate a incêndio, que tem disjuntor próprio — ver
// opcoesDisjIncendioTorre). O MENOR tripolar que atende dois critérios:
//  1) Capacidade: (d) suporta a demanda das UCs da torre;
//  2) Seletividade: corrente ESTRITAMENTE maior que o maior disjuntor das UCs
//     da torre (a hierarquia UC → Torre exige o superior sempre maior, nunca
//     igual). Sem esse piso o geral poderia empatar com uma UC.
function maiorCorrenteUCTorre(b) {
  // No modo calculadora o disjuntor da UC pode vir do cálculo pelas cargas
  // (disjUCTorre resolve disjPara → cargas._disjuntores[0]); no método 5.2 é
  // sempre o disjPara escolhido — disjUCTorre cobre os dois casos.
  return ((b && b.ucs) || []).reduce(
    (mx, u) => Math.max(mx, correnteDisj(disjUCTorre(u))),
    0,
  );
}
function opcoesDisjGeralTorre(b) {
  const demanda = calcBlocoMultiTorres(b).demandaUcs;
  if (demanda <= 0) return [];
  const pisoUC = maiorCorrenteUCTorre(b);
  const cand = DISJ_GER.filter(
    (d) => d.tipo === "tri" && d.d >= demanda && correnteDisj(d.fx) > pisoUC,
  ).sort((a, b) => d_corr(a, b));
  return cand.length ? [cand[0].fx] : [];
}

// Opções de disjuntor do Condomínio / Combate a Incêndio da torre: menores
// disjuntores que suportam a demanda informada (um por tipo de rede) —
// mesma seleção por demanda usada no disjuntor adequado do fluxo individual.
function opcoesDisjIncendioTorre(b) {
  return selecionarDisjuntores(num(b && b.demandaIncendio), false).map(
    (d) => d.fx,
  );
}

/* ============================================================
   HIERARQUIA DE PROTEÇÃO DO EMPREENDIMENTO (etapa "Dados do projeto")
   UC → Torre → Prumada → Disjuntor geral do empreendimento.
   Cada nível superior deve ter corrente nominal ESTRITAMENTE MAIOR
   que o maior disjuntor do nível imediatamente inferior — os níveis
   Prumada e Disjuntor geral são opcionais, então cada função recebe o
   "piso" (maior corrente do nível de baixo) e sugere/valida a partir dele.
   Todos usam DISJ_GER (catálogo estendido, até 3000 A).
   ============================================================ */
// Maior corrente (A) entre os disjuntores das torres cujo índice (0-based) está
// em `indices`. Se `indices` for nulo, considera todas as torres.
function maiorCorrenteTorres(blocos, indices) {
  return (blocos || []).reduce((mx, b, i) => {
    if (indices && indices.indexOf(i) === -1) return mx;
    return Math.max(mx, correnteDisj(b && b.disjGeral));
  }, 0);
}
// Disjuntores do empreendimento (prumada/geral) com corrente ESTRITAMENTE maior
// que `pisoCorrente` e — quando informada — capacidade (d, kVA) para `demanda`.
// Ordenado do menor para o maior; o primeiro é a sugestão automática.
function disjEmpreendimentoAcima(pisoCorrente, demanda) {
  return DISJ_GER.filter(
    (d) =>
      d.tipo === "tri" &&
      correnteDisj(d.fx) > (pisoCorrente || 0) &&
      (demanda == null || d.d >= demanda),
  )
    .sort((a, b) => correnteDisj(a.fx) - correnteDisj(b.fx))
    .map((d) => d.fx);
}
// Índices (0-based) das torres cobertas por uma prumada (faixa torreIni→torreFim,
// ambos 1-based e inclusivos). Retorna [] quando a faixa está incompleta/inválida.
function torresDaPrumada(p, nBlocos) {
  const ini = parseInt(p && p.torreIni, 10);
  const fim = parseInt(p && p.torreFim, 10);
  if (!Number.isFinite(ini) || !Number.isFinite(fim) || ini < 1 || fim < ini)
    return [];
  const ate = Math.min(fim, nBlocos);
  const arr = [];
  for (let t = ini; t <= ate; t++) arr.push(t - 1);
  return arr;
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
