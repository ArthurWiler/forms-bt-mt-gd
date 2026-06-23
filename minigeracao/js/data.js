// ============================================================
// MINIGERAÇÃO DISTRIBUÍDA — Dados normativos (CEMIG / REN 1.000/2021)
// Potência > 75 kW até 5000 kW. Base Rev. P2 (01/11/2024).
// ============================================================
const GD_GRUPOS = ["A"];
const GD_CLASSES = ["Residencial","Industrial","Comercial","Rural","Poder Público","Iluminação Pública","Serviço Público"];
const GD_SOLICITACOES = [
  "Conexão de GD em Unidade Consumidora Existente COM Alteração de Demanda Contratada",
  "Conexão de GD em Unidade Consumidora Existente SEM Alteração de Demanda Contratada",
  "GD Existente COM Alteração de Potência Ativa Instalada Total de Geração",
  "Ligação de Nova Unidade Consumidora COM Geração Distribuída",
];
const GD_TENSAO_A = ["13800","22000","34500"];
const GD_TENSAO_B = ["127/220","120/240"];
const GD_RAMAL = ["Aéreo","Subterrâneo"];
const GD_TIPOS_SE = ["Nº 1","Nº 2","Nº 3","Nº 4","Nº 5","Nº 6","Nº 8"];
// Transformadores: campo livre (qualquer potência, inclusive > RT, ex.: 1500/2000 kVA). Sem lista fixa.
const GD_TIPO_LIG_TRAFO = ["∆-Y","∆-∆","Y-∆","Y-Y"];
const GD_ENTRADA_ENERGIA = ["Subestação Individual","Subestação Compartilhada"];
const GD_FONTES = ["Solar","Hidráulica","Biomassa","Cogeração Qualificada","Eólica"];
const GD_TIPO_GERACAO = [
  "Empregando máquina síncrona sem conversor","Empregando conversor eletrônico/inversor","Mista","Outra (especificar):",
];
const GD_MODALIDADES = ["Autoconsumo Local","Autoconsumo Remoto","Geração Compartilhada","Empreendimento de Múltiplas Unidades Consumidoras"];
const GD_MODALIDADE_AUTOCONSUMO_LOCAL = "Autoconsumo Local";
const GD_QTD_FONTES = [1,2];
const GD_UTM_LIMITES = {
  22:{eMin:487307,eMax:833012,nMin:7733378,nMax:7981566},
  23:{eMin:161564,eMax:840139,nMin:7460145,nMax:8435094},
  24:{eMin:164869,eMax:417150,nMin:7673180,nMax:8336360},
};
const GD_FUSOS = [22,23,24];
const GD_BT_MT = ["BT - Baixa Tensão","MT - Média Tensão"];
const GD_SN = ["Não","Sim"];
const GD_GFC_LIMITE_KW = 500; // garantia de fiel cumprimento acima de 500 kW
const GD_GFC_MODALIDADE_EMUC = "Empreendimento de Múltiplas Unidades Consumidoras";

// Formas de apresentação da Garantia de Fiel Cumprimento (art. 655-C)
const GD_GARANTIA_FORMAS = ["Caução em dinheiro","Fiança bancária","Títulos da dívida pública"];
// Regra 20: o link de dúvidas frequentes da GFC deve apontar para a seção de Geração Distribuída.
const GD_GARANTIA_FAQ_URL = "https://www.cemig.com.br/geracao-distribuida/duvidas-frequentes/";
// Custo de investimento (R$/kW) por fonte primária — base de cálculo da GFC.
const GD_GFC_CUSTO_INVESTIMENTO = {
  "Solar": 4000,
  "Hidráulica": 5000,
  "Biomassa": 4000,
  "Cogeração Qualificada": 4000,
  "Eólica": 4500,
};

// Regra 19: a GFC é calculada automaticamente pelo sistema (não é preenchida pelo cliente).
// GFC = Percentual × Potência líquida × Custo de investimento.
//   Potência líquida = Potência instalada − Geração já existente.
//   Percentual = 0% (≤500 kW) · 2,5% (500<x<1000) · 5% (≥1000 kW).
// Regra 21: GFC não se aplica a Geração Compartilhada nem a EMUC (retorna 0).
function gdCalcularGFC(d) {
  const mod = d.modalidade;
  if (mod === "Geração Compartilhada" || mod === GD_GFC_MODALIDADE_EMUC) return 0;
  const instalada = parseFloat(d.potAtivaInstalada) || 0;
  const existente = parseFloat(d.potGeracaoAtual) || 0;
  const liquida = Math.max(0, instalada - existente);
  let perc = 0;
  if (liquida >= 1000) perc = 0.05;
  else if (liquida > GD_GFC_LIMITE_KW) perc = 0.025;
  const fonte = (d.fontes && d.fontes[0] && d.fontes[0].fontePrimaria) || "Solar";
  const custo = GD_GFC_CUSTO_INVESTIMENTO[fonte] || 4000;
  return perc * liquida * custo;
}

// Tipo de subestação indisponível em Ligação Nova atendida em 13,8 kV
const GD_TIPO_SE_BLOQ_LIGNOVA_138 = "Nº 2";
const GD_TENSAO_LIGNOVA_138 = "13800";
const GD_SOLICITACAO_LIG_NOVA = "Ligação de Nova Unidade Consumidora COM Geração Distribuída";
const GD_BT_BAIXA = "BT - Baixa Tensão";

// Regra 9: somente as subestações Nº 1, 5, 6 e 8 possuem limite de 300 kVA.
const GD_SE_LIMITE_300 = ["Nº 1", "Nº 5", "Nº 6", "Nº 8"];
const GD_SE_LIMITE_KW = 300;
// Acima deste valor, o planejamento deve sugerir atendimento em alta tensão.
const GD_SE_SUGESTAO_AT_KW = 2500;

// Regras de aceitação das subestações por tipo × tensão × tipo de solicitação (Regras 7,8,14).
//  - "Ligação nova" inclui também a migração de BT para MT (tratada como ligação nova).
//  - "Mudança de local" = campo "Haverá mudança de local da subestação?" (Regra 12).
function gdSEDisponivel(tipo, ctx) {
  const t = ctx.tensao;
  const e138 = t === GD_TENSAO_LIGNOVA_138;
  const ehBTtoMT = ctx.instExistenteBTMT === GD_BT_BAIXA;
  const novaConexao = ctx.solicitacao === GD_SOLICITACAO_LIG_NOVA || ehBTtoMT;
  const mudancaLocal = ctx.mudancaSE === "Sim";
  switch (tipo) {
    case "Nº 1":
      if (novaConexao) return { ok: false, msg: "Subestação Nº 1 não aceita ligação nova." };
      if (mudancaLocal) return { ok: false, msg: "Subestação Nº 1 não aceita mudança de local." };
      return { ok: true, msg: "" };
    case "Nº 2":
      if (novaConexao && e138) return { ok: false, msg: "Subestação Nº 2 não aceita ligação nova em 13,8 kV (disponível em 22 kV e 34,5 kV)." };
      if (mudancaLocal && e138) return { ok: false, msg: "Subestação Nº 2 não aceita mudança de local em 13,8 kV (disponível em 22 kV e 34,5 kV)." };
      return { ok: true, msg: "" };
    case "Nº 3":
      if (novaConexao) return { ok: false, msg: "Subestação Nº 3 não aceita ligação nova." };
      if (mudancaLocal) return { ok: false, msg: "Subestação Nº 3 não aceita mudança de local em nenhum nível de tensão." };
      return { ok: true, msg: "" };
    case "Nº 6":
      if (novaConexao) return { ok: false, msg: "Subestação Nº 6 (adaptação da Nº 1 para o mercado livre) aceita apenas mudança para ACL." };
      if (mudancaLocal) return { ok: false, msg: "Subestação Nº 6 aceita apenas mudança para ACL, não mudança de local." };
      return { ok: true, msg: "" };
    // Nº 4, Nº 5 e Nº 8 aceitam ligação nova e mudança de local em qualquer tensão.
    default:
      return { ok: true, msg: "" };
  }
}
// Solicitações que exigem o preenchimento do Formulário de Carga (aumento de demanda / ligação nova)
const GD_SOLICITACOES_FORM_CARGA = [
  "Conexão de GD em Unidade Consumidora Existente COM Alteração de Demanda Contratada",
  "Ligação de Nova Unidade Consumidora COM Geração Distribuída",
];
const GD_ENTRADA_COMPARTILHADA = "Subestação Compartilhada";

// Documentação da UC (Seção 3) — MiniGD
const GD_DOCUMENTOS = [
  { id: "3.1", req: true, txt: "Documentos de identificação do consumidor, conforme incisos I e II do art. 67 da REN nº 1.000/2021." },
  { id: "3.2", req: true, txt: "Declaração descritiva da carga instalada — preencher Formulário de Carga (Item 11)." },
  { id: "3.3", req: true, txt: "Informação das cargas que possam provocar perturbações no sistema de distribuição." },
  { id: "3.4", req: true, txt: "Informação e documentação das atividades desenvolvidas nas instalações." },
  { id: "3.5", req: false, txt: "Licença/declaração do órgão competente caso instalações ou extensão de rede ocupem áreas protegidas." },
  { id: "3.6.1", req: true, txt: "Documento com data que comprove propriedade ou posse do imóvel onde será implantada a UC com minigeração distribuída." },
  { id: "3.6.2", req: false, txt: "Para imóveis rurais, apresentar Cadastro Ambiental Rural – CAR (Lei nº 12.651/2012)." },
  { id: "3.6.3", req: false, txt: "Documento que comprove posse pelo proprietário da central geradora (aluguel, cessão ou arrendamento). (Caso aplicável)" },
  { id: "3.6.4", req: false, txt: "Documento do condomínio que autorize uso de área comum para central geradora particular. (Caso aplicável)" },
  { id: "3.6.5", req: false, txt: "Subestação compartilhada com mais de um CPF/CNPJ: procuração elegendo um membro responsável pelo empreendimento. (Caso aplicável)" },
];

// Documentação Técnica (Seção 7) — MiniGD
const GD_DOCS_TEC = [
  { id: "7.1", req: true, txt: "Documento de responsabilidade técnica (projeto e execução) do conselho profissional competente." },
  { id: "7.2", req: true, txt: "Projeto elétrico das instalações de conexão e memorial descritivo com planta de situação." },
  { id: "7.3", req: true, txt: "Diagrama unifilar e de blocos do sistema de geração, carga e proteção." },
  { id: "7.4", req: true, txt: "Relatório de ensaio (português) atestando conformidade dos conversores de potência para a tensão de conexão." },
  { id: "7.5", req: true, txt: "Dados necessários ao registro da central geradora distribuída conforme site da ANEEL." },
  { id: "7.6", req: false, txt: "Lista de UCs participantes do sistema de compensação com percentual/ordem de utilização dos excedentes." },
  { id: "7.7", req: false, txt: "Instrumento jurídico que comprove participação dos integrantes (múltiplas UCs e geração compartilhada). (Caso aplicável)" },
  { id: "7.8", req: false, txt: "Documento que comprove reconhecimento pela ANEEL da cogeração qualificada. (Caso aplicável)" },
  { id: "7.9", req: false, txt: "Dados de segurança das barragens para fontes hídricas (REN 696/2015). (Caso aplicável)" },
  { id: "7.10", req: false, txt: "Para centrais FV despacháveis, comprovação de atendimento ao art. 655-B (armazenamento). (Caso aplicável)" },
  { id: "7.11", req: false, txt: "Documento que comprove o aporte da Garantia de Fiel Cumprimento (art. 655-C). (Caso aplicável > 500 kW)" },
];

const GD_CONTATO_CEMIG = {
  responsavel: "Gerência de Processos Especiais da Expansão de Média e Baixa Tensão - EM/PE",
  endereco: "Av. Barbacena, 1200, Santo Agostinho, CEP 30190-131, BH - MG",
  telefone: "0800 721 0167",
  email: "geracaodistribuida@cemig.com.br",
};
const GD_DECL_85 = [
  "não injeção na rede (“Grid Zero”)",
];

// GFC exigida acima de 500 kW, EXCETO:
//  - Geração Compartilhada com consórcio verificado;
//  - Geração Compartilhada / EMUC (Regra 21: GFC não se aplica a EMUC).
function gdExigeGFC(d){
  if((parseFloat(d.potAtivaInstalada)||0) <= GD_GFC_LIMITE_KW) return false;
  if(d.modalidade==="Geração Compartilhada" && d.consorcioVerificado==="Sim") return false;
  if(d.modalidade===GD_GFC_MODALIDADE_EMUC) return false;
  return true;
}

function gdValidarUTM(fuso,e,n){
  const lim=GD_UTM_LIMITES[parseInt(fuso)];
  if(!lim) return {ok:false,msg:"Selecione o fuso."};
  const E=parseFloat(e),N=parseFloat(n);
  if(isNaN(E)||isNaN(N)) return {ok:false,msg:""};
  if(E<lim.eMin||E>lim.eMax) return {ok:false,msg:`E fora da faixa (${lim.eMin}–${lim.eMax}).`};
  if(N<lim.nMin||N>lim.nMax) return {ok:false,msg:`N fora da faixa (${lim.nMin}–${lim.nMax}).`};
  return {ok:true,msg:""};
}
