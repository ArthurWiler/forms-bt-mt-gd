/* Cenários dos quatro mocks, para conferir o documento contra
   docs/mocks/pdf-mt-*. Arquivo de conferência — não faz parte do
   formulário. */

const BASE = {
  nome: "Severino e Lucca Eletrônica ME",
  emailCliente: "helena.isa@gmail.com",
  telCliente: "(31) 98907-8950",
  cpfCnpj: "12.345.567/0001-89",
  rtNome: "Helena Isadora Isabel Souza",
  rtEmail: "helena.isa@gmail.com",
  rtCelular: "(31) 98907-8950",
  opcaoAtend: "Livre",
  tensaoMT: "34.5",
  subPronta: "Sim",
  atividade: "Industrial",
  ramoAtividade: "1031700 - Fabricação de conserva de frutas",
  localizacao: "Urbano",
  uc_cep: "30510-420",
  urb_endereco: "Rua Henrique Marques Lisboa",
  urb_num: "530",
  urb_compl: "Apartamento 202, bloco 4",
  urb_bairro: "Nova Gameleira",
  uc_municipio: "Belo Horizonte",
  uc_estado: "MG",
  latitude: "-19.863788",
  longitude: "-43.955397",
  utm: "23K E:609369 N:7803253",
  ramalIndice: 1,
  gerMomentaneo: "Sim",
  gerMomentaneoPot: "250",
  gridZero: "Sim",
  gridZeroPot: "250",
  btMesmaProp: "Sim",
  formaCorresp: "E-mail informado",
  desejaVenc: "Sim",
  diaVenc: "06",
};

const ETAPAS = [
  { ponta: "300", foraponta: "150", inicio: "2026-09" },
  { ponta: "500", foraponta: "300", inicio: "2028-08" },
];

const MOTORES = [
  { cv: "50", fp: "", rend: "", volts: "", ipIn: "" },
  { cv: "150", fp: "0.95", rend: "0.92", volts: "380", ipIn: "6" },
];

const trafo = (potencia, relacao, extra) =>
  Object.assign({ potencia, relacao, situacao: "novo", substituir: false }, extra);

const CENARIOS = {
  nova: () => {
    Object.assign(state, BASE, {
      finalidade: "Conexão Nova",
      compartilhada: "Não",
      modalidade: "Azul",
      demandaPontaContratada: "600",
      demandaForaPontaContratada: "300",
      escalonada: "Sim",
      potTotalTrafos: 600,
      qtdTotalTrafos: 3,
      cn_tipoSE: "Subestação Nº 4",
    });
    trafos = [trafo("150", "8"), trafo("150", "8"), trafo("300", "12")];
    escalonadaInstalacao = ETAPAS;
    motores = MOTORES;
  },

  "nova-compartilhada": () => {
    Object.assign(state, BASE, {
      finalidade: "Conexão Nova",
      compartilhada: "Sim",
      subestacaoExistente: "Subestação já existente",
      potTotalTrafos: 750,
      demandaTotalCubiculos: 750,
      cn_tipoSE: "Subestação Nº 4",
    });
    cubiculos = [
      {
        instalacao: "3009017817",
        modalidade: "Verde",
        demanda: "800",
        escalonada: "Não",
        trafos: [trafo("150", "8"), trafo("300", "12")],
      },
      {
        instalacao: "3009017817",
        modalidade: "Azul",
        demandaPonta: "500",
        demandaForaPonta: "300",
        escalonada: "Sim",
        etapasEscalonada: ETAPAS,
        trafos: [trafo("300", "12")],
      },
    ];
    motores = MOTORES;
  },

  alteracao: () => {
    Object.assign(state, BASE, {
      finalidade: "Aumento de Demanda",
      numInstalacao: "3009017817",
      compartilhada: "Não",
      mudancaLocal: "Sim",
      nv_cep: "30510-420",
      nv_endereco: "Rua Henrique Marques Lisboa",
      nv_num: "530",
      nv_compl: "Apartamento 202, bloco 4",
      nv_bairro: "Nova Gameleira",
      nv_municipio: "Belo Horizonte",
      nv_estado: "MG",
      modalidade: "Azul",
      demandaPontaContratada: "600",
      demandaForaPontaContratada: "300",
      escalonada: "Sim",
      potTotalTrafos: 600,
      qtdTotalTrafos: 3,
      alt_tipoAtual: "Subestação Nº 2",
      alt_tipoPara: "Subestação Nº 4",
    });
    trafos = [
      trafo("150", "8"),
      trafo("112,50", "5", {
        situacao: "troca",
        substituir: true,
        novaPotencia: "150",
        novaRelacao: "8",
      }),
      trafo("300", "12", { situacao: "sem" }),
    ];
    escalonadaInstalacao = ETAPAS;
    motores = MOTORES;
  },

  "alteracao-compartilhada": () => {
    Object.assign(state, BASE, {
      finalidade: "Aumento de Demanda",
      numInstalacao: "3009017817",
      compartilhada: "Sim",
      subestacaoExistente: "Subestação já existente",
      mudancaLocal: "Sim",
      nv_cep: "30510-420",
      nv_endereco: "Rua Henrique Marques Lisboa",
      nv_num: "530",
      nv_compl: "Apartamento 202, bloco 4",
      nv_bairro: "Nova Gameleira",
      nv_municipio: "Belo Horizonte",
      nv_estado: "MG",
      potTotalTrafos: 600,
      demandaTotalCubiculos: 600,
      alt_tipoAtual: "Subestação Nº 2",
      alt_tipoPara: "Subestação Nº 4",
    });
    cubiculos = [
      {
        existente: true,
        instalacao: "3009017817",
        modalidade: "Verde",
        demanda: "800",
        escalonada: "Não",
        trafos: [
          trafo("112,50", "5", {
            situacao: "troca",
            substituir: true,
            novaPotencia: "150",
            novaRelacao: "8",
          }),
          trafo("150", "8"),
        ],
      },
      {
        existente: false,
        instalacao: "3009017817",
        modalidade: "Azul",
        demandaPonta: "500",
        demandaForaPonta: "300",
        escalonada: "Sim",
        etapasEscalonada: ETAPAS,
        trafos: [trafo("150", "8")],
      },
    ];
    motores = MOTORES;
  },
};

(async function () {
  const qual = new URLSearchParams(location.search).get("c") || "nova";
  state = {};
  trafos = [];
  cubiculos = [];
  motores = [];
  escalonadaInstalacao = [];
  CENARIOS[qual]();

  await _pdfCarregarMoldes();
  const doc = _pdfMolde("tplPdfDoc");
  document.body.appendChild(doc);
  const blocos = _pdfBlocosMT();
  await _pdfAguardarFontes(blocos.map((b) => b.el.textContent).join(" "));
  const total = _pdfPaginar(doc, blocos);
  await _pdfAguardarImagens(doc);
  document.title = `${qual} — ${total} página(s)`;
})();
