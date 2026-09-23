/* ============================================================
   CEMIG MT — Modelo de conteúdo dos DOCUMENTOS COMPLEMENTARES
   Fonte ÚNICA do que a Análise de Partida de Motores e a
   Solicitação de Desconto para Irrigante contêm. Descreve seções e
   campos em estrutura neutra (sem HTML, sem jsPDF); mt/js/pdf.js
   apenas RENDERIZA este modelo.

   O FORMULÁRIO principal saiu daqui: ele é desenhado a partir dos
   mocks do Figma (docs/mocks/pdf-mt-*), com cartões, chips de
   situação e cartões de mídia que o desenho direto em jsPDF não
   expressa. Passou a ser HTML de verdade, montado em
   mt/js/pdf-doc.js sobre o motor de shared/js/pdf-doc.js. Os dois
   documentos abaixo continuam aqui porque não têm desenho de
   referência: são fichas de tabela, e o renderizador antigo dá
   conta delas.

   Formato:
     secao  = { titulo, campos: [] }
     campo  = { tipo, label, valor, full }
              tipo: "texto" | "tabela"
     tabela = { ..., headers: [], widths: [], rows: [][], rodape: [] }

   Campos com valor vazio são descartados pelo renderizador, não
   aqui.
   ============================================================ */

/* Helpers de construção — mantêm as chamadas curtas e legíveis. */
const _c = (label, valor, opts = {}) => ({
  tipo: "texto",
  label,
  valor,
  ...opts,
});
const _tab = (label, headers, widths, rows, opts = {}) => ({
  tipo: "tabela",
  label,
  headers,
  widths,
  rows,
  full: true,
  ...opts,
});

/* ============================================================
   1. Análise de Partida de Motores — uma folha por motor pesado
   Retorna uma LISTA de folhas; cada folha vira uma página no PDF.
   ============================================================ */
const NOTAS_MOTORES = [
  "1 - Em caso de partida sequencial de motores, preencher uma folha para cada motor, indicando a ordem de partida.",
  "2 - Anexar, sempre que possível, a(s) folha(s) das características elétricas, fornecida(s) pelo fabricante do motor.",
];

function conteudoAnalisePartida() {
  const idxs = motoresPesadosIdx();
  const tMT = parseFloat(state.tensaoMT);

  if (!idxs.length)
    return [
      {
        secoes: [
          {
            titulo: "IDENTIFICAÇÃO",
            campos: [
              _c("Cliente", state.nome),
              _c(
                "",
                "Nenhum motor pesado identificado (trifásico acima de 50 CV ou monofásico acima de 15 CV).",
                { full: true },
              ),
            ],
          },
        ],
      },
    ];

  return idxs.map((i) => {
    const m = motores[i];
    const ap = ensureAnalisePartida(m);
    const c = CalculoMT.calcularMotor(
      {
        potenciaCV: m.cv,
        fp: m.fp,
        rendimento: m.rend,
        tensaoV: m.volts,
        relacaoIpIn: m.ipIn,
      },
      tMT,
    );
    const dispositivo = ap.dispositivo
      ? ap.dispositivo +
        (ap.dispositivo === "Chave Compensadora" && ap.tap
          ? ` — Tap: ${ap.tap} %`
          : "")
      : "";
    const un = (v, u) => (String(v ?? "").trim() ? `${v} ${u}` : "");
    return {
      secoes: [
        {
          titulo: "IDENTIFICAÇÃO",
          campos: [_c("Cliente", state.nome)],
        },
        {
          titulo: "TIPO DO MOTOR / NÚMERO DE FASES",
          campos: [
            _c("Tipo do motor", m.tipo),
            _c("Número de fases", m.fases || "Trifásico"),
          ],
        },
        {
          titulo: "DADOS ELÉTRICOS",
          campos: [
            _c("Potência do motor", un(m.cv, "CV")),
            _c("Tensão no motor", un(m.volts, "V")),
            _c(
              "Corrente de partida (sem dispositivo de partida)",
              c.iPartida == null ? "" : fmt(c.iPartida) + " A",
            ),
            _c(
              "Corrente nominal",
              c.iNominal == null ? "" : fmt(c.iNominal) + " A",
            ),
            _c("Relação Ip/In", m.ipIn),
            _c("Fator de potência em regime", m.fp),
            _c("Fator de potência na partida", ap.fpPartida),
          ],
        },
        {
          titulo: "NÚMERO DE PARTIDAS",
          campos: [_c("Número de partidas", ap.numPartidas)],
        },
        {
          titulo: "DISPOSITIVO AUXILIAR DE PARTIDA (QUANDO HOUVER)",
          campos: [_c("Dispositivo", dispositivo)],
        },
        {
          titulo: "ORDEM DE PARTIDA DO MOTOR (CASOS DE DOIS OU MAIS MOTORES)",
          campos: [_c("Ordem de partida", ap.ordemPartida)],
        },
        {
          titulo: "CARGAS OPERANDO ENQUANTO O MOTOR PARTE (QUANDO HOUVER)",
          campos: [
            _c("Potência", un(ap.cargaOperanteKVA, "kVA")),
            _c("Fator de potência", ap.cargaOperanteFP),
          ],
        },
        {
          titulo: "CARGAS SENSÍVEIS A FLUTUAÇÕES DE TENSÃO",
          campos: [
            _c("Tipo", ap.cargaSensivelTipo),
            _c("Flutuação admissível", un(ap.cargaSensivelPercentual, "%")),
          ],
        },
        {
          titulo: "SIMULTANEIDADE DE PARTIDA",
          campos: [
            _c(
              "Em caso de simultaneidade, relacionar os motores e suas características elétricas",
              ap.simultaneidade,
              { full: true },
            ),
          ],
        },
        {
          titulo: "TRANSFORMADOR DO CONSUMIDOR",
          campos: [
            _c(
              "Potência do transformador",
              un(fmt(state.potTotalTrafos), "kVA"),
            ),
            _c(
              "Impedância percentual do transformador",
              un(ap.impedanciaZ, "%"),
            ),
          ],
        },
      ],
    };
  });
}

/* ============================================================
   2. Solicitação de Desconto para Irrigante / Aquicultor
   ============================================================ */
const NOTAS_IRRIGANTE = [
  "1 - O desconto na tarifa de energia elétrica para irrigantes e aquicultores está condicionado à comprovação de licença ambiental e outorga de uso de recursos hídricos vigentes (REN nº 1.000/2021, §7º; Lei nº 12.787/2013, arts. 22 e 23).",
  "2 - A distribuidora garante a janela contínua de 8h30 (oito horas e trinta minutos) entre 21h30 e 06h00 para o horário reduzido, conforme horário de início informado pelo cliente.",
];

function conteudoIrrigante() {
  const irrig = motores.filter((m) => m.destinadoIrrigacao === true);
  const rows = irrig.length
    ? irrig.map((m) => {
        const cv = parseFloat(m.cv);
        const kw = isNaN(cv) ? null : cv * 0.7355;
        return [
          m.tipo || "Motor",
          m.fases || "Trifásico",
          kw == null ? "" : `${fmt(kw)} kW (${fmt(cv)} CV)`,
        ];
      })
    : [["Nenhum motor destinado à irrigação foi marcado.", "", ""]];

  return [
    {
      titulo: "IDENTIFICAÇÃO DO CLIENTE",
      campos: [
        _c("Cliente", state.nome),
        _c("Município", state.uc_municipio),
        _c("Instalação / UC / Medidor", state.numInstalacao),
        _c("CPF/CNPJ", state.cpfCnpj),
        _c("E-mail", state.emailCliente),
        _c("Telefone", state.telCliente),
      ],
    },
    {
      titulo: "HORÁRIO PARA INÍCIO DO DESCONTO",
      campos: [
        _c("Horário", state.irrigacaoHorarioInicio),
        _c(
          "",
          "A distribuidora garante janela contínua de 8h30 entre 21h30 e 06h00.",
          { full: true },
        ),
      ],
    },
    {
      titulo: "CARGAS DESTINADAS À IRRIGAÇÃO",
      campos: [_tab("", ["Tipo", "Fases", "Potência"], [60, 50, 72], rows)],
    },
  ];
}
