// ============================================================
// MICROGERAÇÃO DISTRIBUÍDA — Dados normativos (CEMIG / REN 1.000/2021)
// Extraído do Formulário Oficial MicroGD Rev. N4 (03/12/2024)
// ============================================================
const GD_GRUPOS = ["B", "A"];
const GD_CLASSES = ["Residencial","Industrial","Comercial","Rural","Poder Público","Iluminação Pública","Serviço Público"];
const GD_SOLICITACOES = [
  "Ligação de Nova Unidade Consumidora COM Geração Distribuída",
  "Conexão de GD em Unidade Consumidora Existente SEM Alteração de Potência Disponibilizada",
  "Conexão de GD em Unidade Consumidora Existente COM Alteração de Potência Disponibilizada",
  "GD Existente COM Alteração de Potência Ativa Instalada Total",
];
const GD_EDIFICACOES = [
  "Edificação Individual",
  "Edificação de Uso Coletivo (telhado coletivo ou em área comum do condomínio)",
  "Edificação de Uso Coletivo (telhado independente e privativo)",
  "Agrupamento",
];
const GD_EDIF_TIPO = ["Edificação Individual","Edificação Coletiva ou Agrupamento"];
const GD_TENSAO_A = ["13800","22000","34500"];
const GD_TENSAO_B = ["127/220","120/240"];
const GD_RAMAL = ["Aéreo","Subterrâneo"];
const GD_TIPOS_SE = ["Nº 1","Nº 2","Nº 4","Nº 5","Nº 8"];
const GD_TRAFO_POR_SE = {
  "Nº 1":[75,112.5,150,225,300],"Nº 2":[75,112.5,150,225,300],"Nº 4":[75,112.5,150,225,300],
  "Nº 5":[75,112.5,150,225,300],"Nº 8":[75,112.5,150,225,300],
};
const GD_TRAFOS_PARTICULARES = [100,200,300,500,700];
const GD_FONTES = ["Solar","Hidráulica","Biomassa","Cogeração Qualificada","Eólica"];
const GD_TIPO_GERACAO = [
  "Empregando máquina síncrona sem conversor","Empregando conversor eletrônico/inversor","Mista","Outra (especificar):",
];
const GD_MODALIDADES = ["Autoconsumo local","Autoconsumo remoto","Geração compartilhada","Múltiplas Unidades Consumidoras"];
const GD_DISJ_FASES = ["Monopolar","Bipolar","Tripolar","Sem Disj. Geral"];
const GD_DISJ_FASES_ALT = ["Monopolar","Bipolar","Tripolar","Sem Alter. Carga"];
const GD_DISJ_REVISADA = [
  {tipo:"Monopolar",a:40,kw:5},{tipo:"Monopolar",a:50,kw:6.5},{tipo:"Monopolar",a:63,kw:8},{tipo:"Monopolar",a:70,kw:10},
  {tipo:"Bipolar",a:40,kw:10},{tipo:"Bipolar",a:50,kw:12},{tipo:"Bipolar",a:60,kw:15},{tipo:"Bipolar",a:63,kw:15.1},
  {tipo:"Bipolar",a:70,kw:16.8},{tipo:"Bipolar",a:80,kw:20},{tipo:"Bipolar",a:90,kw:20},{tipo:"Bipolar",a:100,kw:24},
  {tipo:"Bipolar",a:120,kw:30},{tipo:"Bipolar",a:125,kw:30},{tipo:"Bipolar",a:150,kw:36},{tipo:"Bipolar",a:200,kw:50},
  {tipo:"Tripolar",a:40,kw:15},{tipo:"Tripolar",a:60,kw:23},{tipo:"Tripolar",a:63,kw:24},{tipo:"Tripolar",a:70,kw:27},
  {tipo:"Tripolar",a:80,kw:30.5},{tipo:"Tripolar",a:100,kw:38.1},{tipo:"Tripolar",a:120,kw:47},{tipo:"Tripolar",a:125,kw:47.6},
  {tipo:"Tripolar",a:150,kw:57.1},{tipo:"Tripolar",a:175,kw:66},{tipo:"Tripolar",a:200,kw:75},{tipo:"Tripolar",a:225,kw:86},
  {tipo:"Tripolar",a:250,kw:95},{tipo:"Tripolar",a:300,kw:114},{tipo:"Tripolar",a:315,kw:114},{tipo:"Tripolar",a:320,kw:114},
  {tipo:"Tripolar",a:400,kw:152},{tipo:"Tripolar",a:450,kw:171},{tipo:"Tripolar",a:500,kw:188},{tipo:"Tripolar",a:600,kw:228},
  {tipo:"Tripolar",a:630,kw:228},{tipo:"Tripolar",a:700,kw:266},{tipo:"Tripolar",a:800,kw:304},
];
const GD_DISJ_ND51 = [
  {tipo:"Monopolar",a:63,kw:8},{tipo:"Bipolar",a:63,kw:15.1},{tipo:"Bipolar",a:100,kw:24},{tipo:"Bipolar",a:125,kw:30},
  {tipo:"Bipolar",a:150,kw:36},{tipo:"Bipolar",a:200,kw:50},{tipo:"Tripolar",a:63,kw:24},{tipo:"Tripolar",a:80,kw:30.5},
  {tipo:"Tripolar",a:100,kw:38.1},{tipo:"Tripolar",a:125,kw:47.6},{tipo:"Tripolar",a:150,kw:57.1},{tipo:"Tripolar",a:200,kw:75},
  {tipo:"Tripolar",a:225,kw:86},{tipo:"Tripolar",a:250,kw:95},{tipo:"Tripolar",a:300,kw:114},{tipo:"Tripolar",a:315,kw:114},
  {tipo:"Tripolar",a:320,kw:114},{tipo:"Tripolar",a:400,kw:152},{tipo:"Tripolar",a:450,kw:171},{tipo:"Tripolar",a:500,kw:188},
  {tipo:"Tripolar",a:600,kw:228},{tipo:"Tripolar",a:630,kw:228},{tipo:"Tripolar",a:700,kw:266},{tipo:"Tripolar",a:800,kw:304},
];
const GD_UTM_LIMITES = {
  22:{eMin:487307,eMax:833012,nMin:7733378,nMax:7981566},
  23:{eMin:161564,eMax:840139,nMin:7460145,nMax:8435094},
  24:{eMin:164869,eMax:417150,nMin:7673180,nMax:8336360},
};
const GD_FUSOS = [22,23,24];
const GD_BT_MT = ["BT - Baixa Tensão","MT - Média Tensão"];
const GD_FAST_LIMITE_KW = 7.5;
const GD_FAST_REGRAS = [
  "8.5.1 - não injeção na rede de distribuição (“Grid Zero”)",
  "8.5.2 - enquadramento nos critérios de gratuidade da REN 1.000/2021 e potência compatível com o consumo no horário de geração",
  "8.5.3 - modalidade autoconsumo local, com potência instalada de geração igual ou inferior a 7,5 kW",
];
const GD_SN = ["Não","Sim"];
function gdValidarUTM(fuso,e,n){
  const lim=GD_UTM_LIMITES[parseInt(fuso)];
  if(!lim) return {ok:false,msg:"Selecione o fuso."};
  const E=parseFloat(e),N=parseFloat(n);
  if(isNaN(E)||isNaN(N)) return {ok:false,msg:""};
  if(E<lim.eMin||E>lim.eMax) return {ok:false,msg:`E fora da faixa (${lim.eMin}–${lim.eMax}).`};
  if(N<lim.nMin||N>lim.nMax) return {ok:false,msg:`N fora da faixa (${lim.nMin}–${lim.nMax}).`};
  return {ok:true,msg:""};
}
function gdLimiteInjecao(tipo,corrente,usarND51){
  const tab=usarND51?GD_DISJ_ND51:GD_DISJ_REVISADA;
  const r=tab.find((x)=>x.tipo===tipo&&x.a===parseInt(corrente));
  return r?r.kw:null;
}

// Documentação a anexar (Seção 3) — textos oficiais MicroGD Rev N4
const GD_DOCUMENTOS = [
  { id: "3.1", req: true, txt: "Documentos de identificação do consumidor, conforme incisos I e II do art. 67 da Resolução Normativa nº 1.000/2021." },
  { id: "3.2", req: true, txt: "Formulário de Análise de Carga, com os respectivos anexos necessários (para Ligação Nova de UC com GD ou conexão de GD com aumento/redução de potência disponibilizada)." },
  { id: "3.3", req: true, txt: "Informação das cargas que possam provocar perturbações no sistema de distribuição." },
  { id: "3.4", req: true, txt: "Informação e documentação das atividades desenvolvidas nas instalações." },
  { id: "3.5", req: false, txt: "Licença ou declaração do órgão competente caso as instalações ocupem áreas protegidas (unidades de conservação, reservas legais, APP, territórios indígenas e quilombolas)." },
  { id: "3.6.1", req: true, txt: "Documento com data que comprove a propriedade ou posse do imóvel onde será implantada a UC com microgeração distribuída (no caso de unidade flutuante, complementado por autorização/licença, observada possibilidade de dispensa da REN 1.000/2021)." },
  { id: "3.6.2", req: false, txt: "Para imóveis rurais, apresentar o Cadastro Ambiental Rural – CAR (Lei nº 12.651/2012)." },
  { id: "3.6.3", req: false, txt: "Documento que comprove direito de posse pelo proprietário da central geradora em casos de aluguel, cessão ou arrendamento de áreas, telhados ou estruturas. (Caso aplicável)" },
  { id: "3.6.4", req: false, txt: "Documento do condomínio que comprove autorização de uso de área comum da edificação coletiva para instalação de central geradora de uso particular da unidade. (Caso aplicável)" },
];

// Documentação Técnica (Seção 6) — textos oficiais
const GD_DOCS_TEC = [
  { id: "6.1", req: true, txt: "Documento de responsabilidade técnica (projeto e execução) do conselho profissional competente, identificando registro válido, responsável técnico, local da obra e atividades desenvolvidas." },
  { id: "6.2", req: true, txt: "Memorial descritivo da instalação com planta de situação e indicação do local do padrão de entrada (ND 5.1/5.2) ou da subestação de entrada (ND 5.3)." },
  { id: "6.3", req: true, txt: "Diagrama unifilar e de blocos do sistema de geração, carga e proteção." },
  { id: "6.4", req: true, txt: "Relatório de ensaio (português) atestando conformidade de todos os conversores de potência para a tensão nominal de conexão (incl. conversores de geração e armazenamento)." },
  { id: "6.5", req: true, txt: "Dados necessários ao registro da central geradora distribuída conforme site da ANEEL." },
  { id: "6.6", req: false, txt: "Lista de UCs participantes do sistema de compensação, indicando percentual/ordem de utilização dos excedentes. (Opcional)" },
  { id: "6.7", req: false, txt: "Instrumento jurídico que comprove a participação dos integrantes (múltiplas UCs e geração compartilhada). (Caso aplicável)" },
  { id: "6.8", req: false, txt: "Documento que comprove o reconhecimento pela ANEEL da cogeração qualificada. (Caso aplicável)" },
  { id: "6.9", req: false, txt: "Dados de segurança de barragens para fontes hídricas (REN 696/2015). (Caso aplicável)" },
  { id: "6.10", req: false, txt: "Para centrais FV despacháveis, comprovação de atendimento ao art. 655-B da REN 1.000/2021. (Caso aplicável)" },
];

// Contato na distribuidora (Seção 7 — fixo)
const GD_CONTATO_CEMIG = {
  responsavel: "Gerência de Processos Especiais da Expansão de Média e Baixa Tensão - EM/PE",
  endereco: "Av. Barbacena, 1200, Santo Agostinho, CEP 30190-131, BH - MG",
  telefone: "0800 721 0167",
  email: "geracaodistribuida@cemig.com.br",
};

// Declarações 8.5 (dispensa art. 73-A)
const GD_DECL_85 = [
  "8.5.1 - não injeção na rede (“Grid Zero”)",
  "8.5.2 - enquadramento nos critérios de gratuidade da REN 1.000/2021",
  "8.5.3 - autoconsumo local, geração ≤ 7,5 kW",
];
