/* ============================================================
   CEMIG MT — Modelo de conteúdo dos documentos
   Fonte ÚNICA do que cada documento contém. Descreve seções e
   campos em estrutura neutra (sem HTML, sem jsPDF); a prévia da
   tela e o PDF apenas RENDERIZAM este modelo.

   Antes desta camada, o conteúdo vivia duplicado: montado em HTML
   por renderPreview() e novamente em jsPDF na exportação — duas
   cópias que divergiam a cada campo novo. Agora um campo criado
   aqui aparece nos dois lugares automaticamente.

   Formato:
     secao  = { titulo, campos: [] }
     campo  = { tipo, label, valor, step, full, destaque }
              tipo: "texto" | "tabela" | "imagem" | "nota"
     tabela = { ..., headers: [], widths: [], rows: [][], rodape: [] }

   `step` é a etapa do formulário para onde o lápis de edição leva
   (usado só na prévia; o PDF ignora). Campos com valor vazio são
   descartados pelos renderizadores, não aqui.
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
const _junta = (arr, sep = ", ") => arr.filter(Boolean).join(sep);

/* ============================================================
   1. Formulário principal MT
   ============================================================ */
function conteudoFormularioMT() {
  const tipoSE = tipoSEefetivo();
  const secoes = [];

  /* --- Dados do Proprietário (etapa 1) --- */
  const prop = [
    _c("Nome / Razão Social", state.nome, { full: true, step: 1 }),
    _c("E-mail do cliente", state.emailCliente, { step: 1 }),
    _c("Telefone do cliente", state.telCliente, { step: 1 }),
    _c("Telefone do solicitante", state.telSolicitante, { step: 1 }),
    _c("CPF/CNPJ", state.cpfCnpj, { step: 1 }),
    _c("Filiação", state.filiacao, { step: 1 }),
    _c("RG / RNE / RANI", state.rg, { step: 1 }),
    _c("Data de Nascimento", state.nasc, { step: 1 }),
    _c("Laudo médico?", state.laudoMedico, { step: 1 }),
    _c("NIS (Tarifa Social)?", state.nis, { step: 1 }),
  ];
  if (state.nis === "Sim")
    prop.push(_c("Número do NIS", state.numNis, { step: 1 }));
  prop.push(
    _c("E-mail do solicitante", state.emailSolicitante, {
      full: true,
      step: 1,
    }),
    _c("Tel. RT (cel/fixo)", _junta([state.rtCelular, state.rtFixo], " / "), {
      step: 1,
    }),
  );
  secoes.push({ titulo: "Dados do Proprietário", campos: prop });

  /* --- Correspondência (etapa 4) --- */
  const cor = [
    _c("Como deseja receber a fatura?", state.formaCorresp, { step: 4 }),
    _c(
      "Vencimento escolhido",
      state.desejaVenc === "Sim"
        ? "Sim — dia " + (state.diaVenc || "—")
        : state.desejaVenc,
      { step: 4 },
    ),
  ];
  if (state.formaCorresp === "E-mail informado")
    cor.push(
      _c("E-mail para envio da fatura", state.emailCliente, {
        full: true,
        step: 4,
      }),
    );
  else if (state.formaCorresp === "Outro e-mail")
    cor.push(
      _c("E-mail para envio da fatura", state.emailCorresp, {
        full: true,
        step: 4,
      }),
    );
  else if (state.formaCorresp === "Endereço da obra")
    cor.push(
      _c(
        "Endereço da fatura",
        "Mesmo da unidade consumidora — " +
          _junta([
            _junta([state.urb_endereco, state.urb_num]),
            state.urb_compl,
            state.urb_bairro,
            state.uc_municipio,
            state.uc_estado,
            state.uc_cep,
          ]),
        { full: true, step: 4 },
      ),
    );
  else if (
    state.formaCorresp === "Novo endereço" ||
    state.formaCorresp === "Agência Correios(Caixa Postal)"
  )
    cor.push(
      _c(
        "Endereço da fatura",
        _junta([
          state.ec_rua,
          state.ec_num,
          state.ec_bairro,
          state.ec_municipio,
          state.ec_estado,
          state.ec_cep,
        ]),
        { full: true, step: 4 },
      ),
    );
  else if (state.formaCorresp === "Conta globalizada")
    cor.push(_c("Conta globalizada", state.contaGlobalizada, { step: 4 }));
  secoes.push({ titulo: "Correspondência", campos: cor });

  /* --- Unidade Consumidora (etapa 2) --- */
  const uc = [
    _c("Atividade", state.atividade, { step: 2 }),
    _c("Ramo", ramoParaPdf(state.ramoAtividade), { step: 2 }),
    _c("Localização", state.localizacao, { step: 2 }),
    _c("CEP", state.uc_cep, { step: 2 }),
    _c(
      "Município / Estado",
      _junta([state.uc_municipio, state.uc_estado], " / "),
      { step: 2 },
    ),
    _c("Coordenadas", _junta([state.latitude, state.longitude], " , "), {
      step: 2,
    }),
    _c("Coordenada UTM", state.utm, { step: 2 }),
  ];
  if (state.finalidade && state.finalidade !== "Conexão Nova")
    uc.push(
      _c(
        "Coordenadas novas",
        _junta([state.latitudeNova, state.longitudeNova], " , "),
        { step: 2 },
      ),
    );
  if (state.localizacao === "Urbana")
    uc.push(
      _c(
        "Endereço",
        _junta([
          state.urb_endereco,
          state.urb_num,
          state.urb_bairro,
          state.urb_compl,
        ]),
        { full: true, step: 2 },
      ),
    );
  if (state.localizacao === "Rural")
    uc.push(
      _c(
        "Distrito / Propriedade",
        _junta([state.rur_distrito, state.rur_propriedade], " / "),
        { full: true, step: 2 },
      ),
    );
  // Restrição ambiental só aparece quando HÁ restrição (igual ao form).
  if (state.restricaoAmbiental === "Sim" && state.restricoesTexto)
    uc.push(
      _c("Área de restrição ambiental", state.restricoesTexto, {
        full: true,
        step: 2,
        destaque: true,
      }),
    );
  uc.push(_c("Subestação pronta?", state.subPronta, { step: 2 }));
  secoes.push({ titulo: "Unidade Consumidora", campos: uc });

  /* --- Dados Técnicos (etapa 3) --- */
  const tec = [
    _c("Opção de Atendimento", state.opcaoAtend, { step: 3 }),
    _c("Finalidade", state.finalidade, { step: 3 }),
  ];
  if (state.finalidade && state.finalidade !== "Conexão Nova")
    tec.push(_c("Nº da Instalação", state.numInstalacao, { step: 3 }));
  tec.push(
    _c(
      "Nível de tensão MT",
      state.tensaoMT ? state.tensaoMT.replace(".", ",") + " kV" : "",
      { step: 3 },
    ),
    _c("Compartilhada?", state.compartilhada, { step: 3 }),
  );
  if (state.compartilhada === "Sim") {
    tec.push(
      _c("Soma dos transformadores (kVA)", fmt(state.potTotalTrafos), {
        step: 3,
      }),
      _c("Soma das demandas (kW)", fmt(state.demandaTotalCubiculos), {
        step: 3,
      }),
      _c("Tipo de Subestação", tipoSE, { step: 3 }),
    );
  } else {
    if (trafos.length)
      tec.push(
        _tab(
          "Transformadores",
          ["Trafo", "Pot (kVA)", "Qtde", "Rel. Imag/In"],
          [42, 45, 40, 55],
          trafos.map((t, i) => [
            "TRF" + String(i + 1).padStart(2, "0"),
            t.potencia,
            t.quantidade,
            t.relacao,
          ]),
          {
            step: 3,
            rodape: [
              "Total",
              fmt(state.potTotalTrafos),
              String(state.qtdTotalTrafos || 0),
              "",
            ],
          },
        ),
      );
    if (motores.length)
      tec.push(
        _tab(
          "Motores",
          // "Rend." em vez de "η": a Helvetica padrão do jsPDF não tem o
          // glifo grego e imprimia um caractere trocado.
          ["Tipo", "CV", "FP", "Rend.", "V", "Ip/In", "I nom (A)", "I part (A)"],
          [38, 16, 16, 20, 18, 18, 27, 29],
          motores.map((m) => {
            const c = CalculoMT.calcularMotor(
              {
                potenciaCV: m.cv,
                fp: m.fp,
                rendimento: m.rend,
                tensaoV: m.volts,
                relacaoIpIn: m.ipIn,
              },
              parseFloat(state.tensaoMT),
            );
            return [
              m.tipo,
              m.cv,
              m.fp,
              m.rend,
              m.volts,
              m.ipIn,
              fmt(c.iNominal),
              fmt(c.iPartida),
            ];
          }),
          { step: 3 },
        ),
      );
    tec.push(_c("Tipo de Subestação", tipoSE, { step: 3 }));
    if (state.finalidade !== "Conexão Nova")
      tec.push(_c("Troca de Subestação?", state.alt_troca, { step: 3 }));
    tec.push(
      _c("Tarifa monômia?", state.monomia, { step: 3 }),
      _c("Modalidade tarifária", state.modalidade, { step: 3 }),
      _c("Demanda escalonada?", state.escalonada, { step: 3 }),
    );
    const azul = state.modalidade === "Azul";
    const ehAlt =
      state.finalidade === "Aumento de Demanda" ||
      state.finalidade === "Redução de Demanda";
    if (azul) {
      tec.push(
        _c("Demanda Ponta Atual (kW)", state.dem_ponta_atual, { step: 3 }),
      );
      if (ehAlt)
        tec.push(
          _c("Ponta Futura (kW)", state.dem_ponta_futura, { step: 3 }),
        );
      tec.push(
        _c("Fora de Ponta Atual (kW)", state.dem_foraponta_atual, { step: 3 }),
      );
      if (ehAlt)
        tec.push(
          _c("Fora de Ponta Futura (kW)", state.dem_foraponta_futura, {
            step: 3,
          }),
        );
    } else {
      tec.push(
        _c(ehAlt ? "Demanda Atual (kW)" : "Demanda (kW)", state.dem_atual, {
          step: 3,
        }),
      );
      if (ehAlt)
        tec.push(_c("Demanda Futura (kW)", state.dem_futura, { step: 3 }));
    }
    if (escalonada.length)
      tec.push(
        azul
          ? _tab(
              "Demanda Escalonada",
              ["Ponta (kW)", "Fora-ponta (kW)", "Início de Uso"],
              [60, 60, 62],
              escalonada.map((e) => [e.ponta, e.foraponta, e.inicio]),
              { step: 3 },
            )
          : _tab(
              "Demanda Escalonada",
              ["Demanda Futura (kW)", "Início de Uso"],
              [91, 91],
              escalonada.map((e) => [e.demanda, e.inicio]),
              { step: 3 },
            ),
      );
  }
  secoes.push({ titulo: "Dados Técnicos", campos: tec });

  /* --- Cubículos da subestação compartilhada --- */
  if (cubiculos.length) {
    const cub = [];
    cubiculos.forEach((c, i) => {
      const rt = CalculoMT.calcularTrafos(c.trafos);
      const n = `Cubículo ${i + 1} — `;
      cub.push(
        _c(n + "Nº Instalação", c.instalacao, { step: 3 }),
        _c(
          n + "Transformadores",
          `${fmt(rt.potenciaTotal)} kVA / ${rt.quantidadeTotal} un.`,
          { step: 3 },
        ),
        _c(n + "Modalidade tarifária", c.modalidade, { step: 3 }),
      );
      if (c.modalidade === "Azul")
        cub.push(
          _c(n + "Demanda Ponta (kW)", c.demandaPonta, { step: 3 }),
          _c(n + "Demanda Fora de Ponta (kW)", c.demandaForaPonta, {
            step: 3,
          }),
        );
      else cub.push(_c(n + "Demanda (kW)", c.demanda, { step: 3 }));
    });
    secoes.push({
      titulo: "Cubículos da Subestação Compartilhada",
      campos: cub,
    });
  }

  /* --- Geração e Baixa Tensão --- */
  const ger = [
    _c("Geração paralelismo momentâneo", state.gerMomentaneo, { step: 3 }),
    _c("GRID ZERO", state.gridZero, { step: 3 }),
    _c("BT na mesma propriedade", state.btMesmaProp, { step: 3 }),
  ];
  if (state.gerMomentaneo === "Sim")
    ger.push(
      _c("Potência ger. momentânea (kVA)", state.gerMomentaneoPot, { step: 3 }),
    );
  if (state.gridZero === "Sim")
    ger.push(_c("Potência GRID ZERO (kVA)", state.gridZeroPot, { step: 3 }));
  secoes.push({ titulo: "Geração e Baixa Tensão", campos: ger });

  /* --- Ramal de Entrada (com o desenho do ramal escolhido) --- */
  secoes.push({
    titulo: "Ramal de Entrada",
    campos: [
      state.ramalIndice != null
        ? {
            tipo: "imagem",
            label: "Ramal de Entrada selecionado",
            src: RAMAL_IMGS[state.ramalIndice],
            valor: CalculoMT.textoRamal(state.ramalIndice),
            full: true,
            step: 3,
          }
        : _c("Ramal de Entrada", "(não selecionado)", { full: true, step: 3 }),
    ],
  });

  /* --- Observações --- */
  if (state.observacoes)
    secoes.push({
      titulo: "Observações",
      campos: [_c("Observações", state.observacoes, { full: true, step: 3 })],
    });

  return secoes;
}

/* ============================================================
   2. Análise de Partida de Motores — uma folha por motor pesado
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
          titulo:
            "ORDEM DE PARTIDA DO MOTOR (CASOS DE DOIS OU MAIS MOTORES)",
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
            _c("Potência do transformador", un(fmt(state.potTotalTrafos), "kVA")),
            _c("Impedância percentual do transformador", un(ap.impedanciaZ, "%")),
          ],
        },
      ],
    };
  });
}

/* ============================================================
   3. Solicitação de Desconto para Irrigante / Aquicultor
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
        _c("Nº da Instalação", state.numInstalacao),
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
      campos: [
        _tab("", ["Tipo", "Fases", "Potência"], [60, 50, 72], rows),
      ],
    },
  ];
}
