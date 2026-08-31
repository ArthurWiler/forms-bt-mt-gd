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
    _c("CPF/CNPJ", state.cpfCnpj, { step: 1 }),
    _c("Filiação", state.filiacao, { step: 1 }),
    _c("RG / RNE / RANI", state.rg, { step: 1 }),
    _c("Data de Nascimento", dataBR(state.nasc), { step: 1 }),
    _c("Laudo médico?", state.laudoMedico, { step: 1 }),
    _c("NIS (Tarifa Social)?", state.nis, { step: 1 }),
  ];
  if (state.nis === "Sim")
    prop.push(_c("Número do NIS", state.numNis, { step: 1 }));
  secoes.push({ titulo: "Dados do Proprietário", campos: prop });

  /* --- Responsável Técnico (etapa 1) --- */
  secoes.push({
    titulo: "Dados do Responsável Técnico",
    campos: [
      _c("Nome", state.rtNome, { full: true, step: 1 }),
      _c("E-mail", state.rtEmail, { full: true, step: 1 }),
      _c("Celular", state.rtCelular, { step: 1 }),
    ],
  });

  /* --- Correspondência (etapa 7) --- */
  const cor = [
    _c("Como deseja receber a fatura?", state.formaCorresp, { step: 6 }),
    // Campo opcional: sem dia escolhido, a prévia mostra o vazio padrão em
    // vez de um "Não" — o usuário não recusou nada, apenas não informou.
    _c(
      "Vencimento escolhido",
      state.desejaVenc === "Sim" && state.diaVenc ? "Dia " + state.diaVenc : "",
      { step: 6 },
    ),
  ];
  if (state.formaCorresp === "E-mail informado")
    cor.push(
      _c("E-mail para envio da fatura", state.emailCliente, {
        full: true,
        step: 6,
      }),
    );
  else if (state.formaCorresp === "Outro e-mail")
    cor.push(
      _c("E-mail para envio da fatura", state.emailCorresp, {
        full: true,
        step: 6,
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
        { full: true, step: 6 },
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
        { full: true, step: 6 },
      ),
    );
  else if (state.formaCorresp === "Conta globalizada")
    cor.push(_c("Conta globalizada", state.contaGlobalizada, { step: 6 }));
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
  // Só há "coordenadas novas" quando o usuário declarou mudança do local da
  // subestação — fora disso os campos nem aparecem no formulário.
  if (
    state.finalidade &&
    state.finalidade !== "Conexão Nova" &&
    state.mudancaLocal === "Sim"
  )
    uc.push(
      _c("Mudança do local da subestação", state.mudancaLocal, { step: 3 }),
      // Endereço do novo local: a zona é a mesma da UC (herdada da etapa 3).
      _c(
        "Endereço do novo local",
        state.localizacao === "Rural"
          ? _junta([
              state.nv_distrito,
              state.nv_propriedade,
              state.nv_municipio_rur,
              state.nv_estado_rur,
            ])
          : _junta([
              state.nv_endereco,
              state.nv_num,
              state.nv_bairro,
              state.nv_compl,
              state.nv_municipio,
              state.nv_estado,
              state.nv_cep,
            ]),
        { full: true, step: 3 },
      ),
      _c(
        "Coordenadas do novo local",
        _junta([state.latitudeNova, state.longitudeNova], " , "),
        { step: 3 },
      ),
      _c("Coordenada UTM (novo local)", state.utmNova, { step: 3 }),
    );
  if (
    state.finalidade &&
    state.finalidade !== "Conexão Nova" &&
    state.mudancaLocal === "Sim" &&
    state.localizacao === "Rural"
  )
    uc.push(
      _c("Ponto de referência (novo local)", state.nv_pontoReferencia, {
        step: 3,
      }),
      _c("Instalação do vizinho (novo local)", state.nv_instalVizinho, {
        step: 3,
      }),
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
  uc.push(_c("Subestação pronta?", state.subPronta, { step: 3 }));
  secoes.push({ titulo: "Unidade Consumidora", campos: uc });

  /* --- Subestação (etapa 5): trafos, motores, tarifação e demanda --- */
  const tec = [
    _c("Opção de Atendimento", state.opcaoAtend, { step: 3 }),
    _c("Finalidade", state.finalidade, { step: 3 }),
  ];
  if (state.finalidade && state.finalidade !== "Conexão Nova")
    tec.push(_c("Instalação / UC / Medidor", state.numInstalacao, { step: 4 }));
  tec.push(
    _c(
      "Nível de tensão MT",
      state.tensaoMT ? state.tensaoMT.replace(".", ",") + " kV" : "",
      { step: 4 },
    ),
    _c("Compartilhada?", state.compartilhada, { step: 4 }),
  );
  if (state.compartilhada === "Sim") {
    tec.push(
      _c("Soma dos transformadores (kVA)", fmt(state.potTotalTrafos), {
        step: 4,
      }),
      _c("Soma das demandas (kW)", fmt(state.demandaTotalCubiculos), {
        step: 4,
      }),
      _c("Tipo de Subestação", tipoSE, { step: 4 }),
    );
  } else {
    if (trafos.length)
      tec.push(
        _tab(
          "Transformadores",
          ["Trafo", "Situação", "Pot (kVA)", "Inrush (%)"],
          // Somam 182 = largura útil da página (A4 210mm − 2×14 de margem).
          [42, 56, 42, 42],
          // Um trafo substituído ocupa duas linhas: a do equipamento atual e
          // a do que entra no lugar. O total do rodapé conta só as novas.
          trafos.flatMap((t, i) => {
            const id = "TRF" + String(i + 1).padStart(2, "0");
            const troca = state.finalidade && state.finalidade !== "Conexão Nova";
            if (!troca) return [[id, "", t.potencia, t.relacao]];
            if (!t.substituir) {
              // Declara-se todo o parque existente, alterado ou não: um trafo
              // marcado como "sem" permanece: não pode sair como "Novo".
              const sit = t.situacao === "sem" ? "Mantido" : "Novo";
              return [[id, sit, t.potencia, t.relacao]];
            }
            return [
              [id, "Atual", t.potencia, t.relacao],
              [id, "Substituto", t.novaPotencia, t.novaRelacao],
            ];
          }),
          {
            step: 4,
            rodape: ["Total", "", fmt(state.potTotalTrafos), ""],
          },
        ),
      );
    if (motores.length)
      tec.push(
        _tab(
          "Motores",
          // "Rend." em vez de "η": a Helvetica padrão do jsPDF não tem o
          // glifo grego e imprimia um caractere trocado.
          [
            "Tipo",
            "CV",
            "FP",
            "Rend.",
            "V",
            "Ip/In",
            "I nom (A)",
            "I part (A)",
          ],
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
          { step: 4 },
        ),
      );
    tec.push(_c("Tipo de Subestação", tipoSE, { step: 4 }));
    if (state.finalidade !== "Conexão Nova")
      tec.push(_c("Troca de Subestação?", state.alt_troca, { step: 4 }));
    // Tarifação e demanda valem para a INSTALAÇÃO inteira (uma única seção,
    // fora dos cards). Na compartilhada o equivalente é declarado por cubículo.
    const azul = state.modalidade === "Azul";
    tec.push(
      _c("Modalidade tarifária", state.modalidade, { step: 4 }),
      _c("Demanda escalonada?", state.escalonada, { step: 4 }),
    );
    // Demanda simples e escalonada são exclusivas na tela; a prévia/PDF segue
    // a mesma regra para não imprimir campo que não foi preenchido.
    if (state.escalonada !== "Sim") {
      if (azul)
        tec.push(
          _c("Demanda ponta contratada (kVA)", state.demandaPontaContratada, {
            step: 4,
          }),
          _c(
            "Demanda fora ponta contratada (kVA)",
            state.demandaForaPontaContratada,
            { step: 4 },
          ),
        );
      else
        tec.push(
          _c("Demanda contratada (kVA)", state.demandaContratada, { step: 4 }),
        );
    } else if (escalonadaInstalacao.length)
      tec.push(
        azul
          ? _tab(
              "Demanda Escalonada",
              ["Ponta (kW)", "Fora-ponta (kW)", "Início de uso"],
              [60, 60, 62],
              escalonadaInstalacao.map((e) => [e.ponta, e.foraponta, e.inicio]),
              { step: 4 },
            )
          : _tab(
              "Demanda Escalonada",
              ["Demanda (kW)", "Início de uso"],
              [91, 91],
              escalonadaInstalacao.map((e) => [e.demanda, e.inicio]),
              { step: 4 },
            ),
      );
  }
  secoes.push({ titulo: "Subestação", campos: tec });

  /* --- Cubículos da subestação compartilhada --- */
  if (cubiculos.length) {
    const cub = [];
    cubiculos.forEach((c, i) => {
      const rt = CalculoMT.calcularTrafos(c.trafos);
      const n = `Cubículo ${i + 1} — `;
      cub.push(
        // Subestação nova não tem instalação: o campo não é exibido no
        // formulário e também não vai para a prévia/PDF.
        ...(temInstalacaoCubiculo()
          ? [_c(n + "Nº Instalação", c.instalacao, { step: 4 })]
          : []),
        _c(
          n + "Transformadores",
          `${fmt(rt.potenciaTotal)} kVA / ${rt.quantidadeTotal} un.`,
          { step: 4 },
        ),
        _c(n + "Modalidade tarifária", c.modalidade, { step: 4 }),
      );
      cub.push(_c(n + "Demanda escalonada?", c.escalonada, { step: 4 }));
      // Demanda simples e escalonada são exclusivas na tela; a prévia/PDF
      // segue a mesma regra para não imprimir campo que não foi preenchido.
      const etapas = c.etapasEscalonada || [];
      if (c.escalonada !== "Sim") {
        if (c.modalidade === "Azul")
          cub.push(
            _c(n + "Demanda Ponta (kW)", c.demandaPonta, { step: 4 }),
            _c(n + "Demanda Fora de Ponta (kW)", c.demandaForaPonta, {
              step: 4,
            }),
          );
        else cub.push(_c(n + "Demanda (kW)", c.demanda, { step: 4 }));
      }
      if (c.escalonada === "Sim" && etapas.length)
        cub.push(
          c.modalidade === "Azul"
            ? _tab(
                n + "Demanda Escalonada",
                ["Ponta (kW)", "Fora-ponta (kW)", "Início de Uso"],
                [60, 60, 62],
                etapas.map((e) => [e.ponta, e.foraponta, e.inicio]),
                { step: 4 },
              )
            : _tab(
                n + "Demanda Escalonada",
                ["Demanda (kW)", "Início de Uso"],
                [91, 91],
                etapas.map((e) => [e.demanda, e.inicio]),
                { step: 4 },
              ),
        );
    });
    secoes.push({
      titulo: "Cubículos da Subestação Compartilhada",
      campos: cub,
    });
  }

  /* --- Ramal de entrada (com o desenho do ramal escolhido) ---
     Vem ANTES da geração, na mesma ordem da etapa 6. */
  secoes.push({
    titulo: "Ramal de entrada",
    campos: [
      state.ramalIndice != null
        ? {
            tipo: "imagem",
            label: "Ramal de entrada selecionado",
            src: RAMAL_IMGS[state.ramalIndice],
            valor: CalculoMT.textoRamal(state.ramalIndice),
            full: true,
            step: 5,
          }
        : _c("Ramal de entrada", "(não selecionado)", { full: true, step: 5 }),
    ],
  });

  /* --- Geração e baixa tensão ---
     A ordem espelha a da tela (etapa 6): cada pergunta é seguida
     imediatamente pela sua potência condicional, e "BT na mesma
     propriedade" fecha o bloco. */
  const ger = [
    _c("Geração paralelismo momentâneo", state.gerMomentaneo, { step: 5 }),
  ];
  if (state.gerMomentaneo === "Sim")
    ger.push(
      _c("Potência ger. momentânea (kVA)", state.gerMomentaneoPot, { step: 5 }),
    );
  ger.push(_c("GRID ZERO", state.gridZero, { step: 5 }));
  if (state.gridZero === "Sim")
    ger.push(_c("Potência GRID ZERO (kVA)", state.gridZeroPot, { step: 5 }));
  ger.push(_c("BT na mesma propriedade", state.btMesmaProp, { step: 5 }));
  secoes.push({ titulo: "Geração e baixa tensão", campos: ger });

  /* --- Observações --- */
  if (state.observacoes)
    secoes.push({
      titulo: "Observações",
      campos: [_c("Observações", state.observacoes, { full: true, step: 7 })],
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
