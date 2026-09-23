/* ============================================================
   CEMIG MT — Conteúdo do PDF (quais seções, quais campos)
   ------------------------------------------------------------
   A MECÂNICA do documento (moldes, construtor de blocos,
   paginador, exportação) mora em shared/js/pdf-doc.js e é a mesma
   em todos os formulários. Aqui fica só o que é do MT: a lista de
   blocos do formulário de Ligação Nova e Alteração de Carga.

   Os SVGs de referência exportados do Figma são quatro documentos
   completos, um por combinação de tipo de solicitação e de
   subestação (creditados no cabeçalho de css/pdf/variables-pdf.css):

     · docs/mocks/pdf-mt-nova/                     svg_1 … svg_3
     · docs/mocks/pdf-mt-nova-compartilhada/       svg_1 … svg_3
     · docs/mocks/pdf-mt-alteracao/                svg_1 … svg_4
     · docs/mocks/pdf-mt-alteracao-compartilhada/  svg_1 … svg_4

   O documento NÃO tem a mesma divisão de seções da tela: o mock
   funde "Dados do empreendimento", "Tipo de atendimento" e o topo
   de "Dados técnicos" numa seção só. Por isso este arquivo lê o
   `state` direto, como mt/js/previa.js, em vez de passar pelo
   modelo neutro de mt/js/conteudo.js — que hoje descreve apenas os
   documentos complementares (Análise de Partida e Irrigante).
   Ao acrescentar um campo ao formulário, acrescente-o aqui E na
   prévia.

   Onde o desenho e o formulário divergem, vale o formulário:
     · o mock desenha um cartão "Demanda" por transformador, mas a
       demanda é da instalação (ou do cubículo), nunca do
       equipamento — saem só potência e corrente de inrush;
     · as unidades são as dos campos (kVA na potência dos trafos e
       na demanda da instalação, kW na demanda dos cubículos e nas
       etapas escalonadas), e não as trocadas no desenho;
     · "Nível de tesão", "CNPF/CNPJ" e "Subestação modelo nº4" saem
       com o texto correto do formulário.

   Usa os globais do módulo MT: state, trafos, cubiculos, motores,
   escalonadaInstalacao, syncState, fmt, dataBR, ramoParaPdf,
   cmgMesAnoRotulo, CalculoMT, situacaoTrafo, permiteTrocaTrafo,
   temInstalacaoCubiculo, demandaRepresentativaInstalacao,
   RAMAL_IMGS e SUBESTACAO_IMGS.

   Carregue depois de shared/js/pdf-render.js e shared/js/pdf-doc.js.
   ============================================================ */

/* ============================================================
   1. Peças repetidas
   ============================================================ */

/* "600" + "kVA" → "600 kVA"; vazio continua vazio (o construtor
   descarta o campo). O símbolo de porcentagem cola no número,
   como no resto do formulário. */
const _pdfUnMT = (v, un) =>
  _pdfVazio(v) ? "" : un === "%" ? `${v}%` : `${v} ${un}`;

/* Grau decimal com 6 casas, como no mock ("-19.863788, -43.955397"). */
function _pdfCoordMT(lat, lng) {
  const f = (v) => {
    const n = parseFloat(String(v).replace(",", "."));
    return isNaN(n) ? null : n.toFixed(6);
  };
  return [f(lat), f(lng)].filter((x) => x !== null).join(", ");
}

/* "2026-09" → "Setembro de 2026". O rótulo do seletor de mês/ano
   sai com barra ("Setembro/2026"); no papel o mock escreve por
   extenso. */
const _pdfMesAnoMT = (v) =>
  String(cmgMesAnoRotulo(v) || "").replace("/", " de ");

/* Campos de pessoa física só existem para CPF válido (mesma regra
   de mostrarCamposPF): num CNPJ eles estão limpos. */
const _pdfEhPFMT = () => CalculoMT.soDigitos(state.cpfCnpj || "").length === 11;

/* Há conteúdo nesta lista de campos? O construtor descarta os
   vazios, então perguntar antes evita abrir um filete que não
   separaria nada. */
const _pdfTemCampoMT = (lista) =>
  (lista || []).some((c) => c && !_pdfVazio(c[1]));

/* Foto do modelo de subestação escolhido — a mesma da galeria. */
function _pdfFotoSEMT(tipo) {
  const n = String(tipo || "").match(/(\d+)/);
  return (n && SUBESTACAO_IMGS[n[1]]) || "";
}

/* Demanda de um cubículo ou da instalação. Demanda simples e
   escalonada são exclusivas na tela; o documento segue a mesma
   regra para não imprimir campo que não foi preenchido.
   `unidade` é a dos campos de ponta/fora-ponta: kVA na instalação,
   kW no cubículo. */
function _pdfDemandaMT(o, azul, unidade) {
  if (o.escalonada === "Sim") return [["Demanda escalonada", o.escalonada]];
  return azul
    ? [
        ["Demanda ponta contratada", _pdfUnMT(o.ponta, unidade)],
        ["Demanda fora ponta contratada", _pdfUnMT(o.foraponta, unidade)],
        ["Demanda escalonada", o.escalonada],
      ]
    : [
        ["Demanda contratada", _pdfUnMT(o.demanda, "kVA")],
        ["Demanda escalonada", o.escalonada],
      ];
}

/* Tabela das etapas da demanda escalonada. As colunas mudam com a
   modalidade — a Azul declara ponta e fora ponta, a Verde uma só. */
function _pdfEscalonadaMT(B, azul, etapas) {
  if (!etapas || !etapas.length) return;
  B.tabela(
    azul
      ? ["Demanda ponta (kW)", "Demanda fora ponta (kW)", "Início de uso"]
      : ["Demanda (kW)", "Início de uso"],
    etapas.map((e) =>
      azul
        ? [e.ponta, e.foraponta, _pdfMesAnoMT(e.inicio)]
        : [e.demanda, _pdfMesAnoMT(e.inicio)],
    ),
    "pdf-tabela--escalonada",
  );
}

/* Um transformador: subtítulo com o chip da situação e a linha de
   cartões. No substituído saem duas linhas, atual → substituto,
   separadas pela fileira de setas (pdf-mt-alteracao/svg_2).

   Vale tanto para o trafo da instalação quanto para o do cubículo:
   os dois têm o mesmo modelo de dados e a mesma situação. */
function _pdfTrafoMT(B, t, i) {
  const troca = permiteTrocaTrafo();
  const situacao = situacaoTrafo(t);
  const subst = troca && situacao === "troca";
  /* "Mantido" é neutro: o equipamento já existe e permanece — não
     é novo nem uma substituição. Em Conexão Nova não há chip: todo
     trafo é, por definição, novo. */
  const semAlt = troca && situacao === "sem";
  const chip = !troca ? "" : subst ? "Substituído" : semAlt ? "Mantido" : "Novo";
  const tom = subst ? "substituido" : semAlt ? "mantido" : "novo";
  const cartoes = (pot, inrush) => [
    ["Potência", _pdfUnMT(pot, "kVA")],
    ["Corrente de Inrush", _pdfUnMT(inrush, "%")],
  ];
  const novos = cartoes(t.novaPotencia, t.novaRelacao);
  B.subsecaoChip(`Transformador ${i + 1}`, chip, tom);
  if (subst && _pdfTemCampoMT(novos)) {
    /* As três peças são um bloco só: os cartões e as setas prendem
       o que vem a seguir, senão a folha poderia cortar entre o
       equipamento atual e o substituto. */
    B.cartoes(cartoes(t.potencia, t.relacao), null, 1);
    B.setas(2);
    B.cartoes(novos);
  } else {
    B.cartoes(cartoes(t.potencia, t.relacao));
  }
}

/* ============================================================
   2. Seções
   ============================================================ */

function _pdfContatoMT(B) {
  B.secao("Dados para contato", { repete: false });
  B.subsecao("Dados do proprietário");
  B.campos([["Nome completo ou Razão Social", state.nome, 3]]);
  B.campos([
    ["E-mail", state.emailCliente],
    ["Celular", state.telCliente],
    ["CPF/CNPJ", state.cpfCnpj],
  ]);
  /* Os campos de pessoa física não aparecem no mock, que desenha um
     CNPJ — mas o que a pessoa preencheu não pode sumir do papel. */
  if (_pdfEhPFMT()) {
    B.campos([
      ["Filiação (Mãe ou Pai)", state.filiacao],
      ["RG / RNE / RANI", state.rg],
      ["Data de Nascimento", dataBR(state.nasc)],
    ]);
    B.campos([
      ["Possui equipamentos essenciais?", state.laudoMedico],
      ["Possui NIS para Tarifa Social?", state.nis],
      ["Número do NIS", state.nis === "Sim" ? state.numNis : ""],
    ]);
  }
  B.subsecao("Dados do responsável técnico");
  B.campos([["Nome completo", state.rtNome, 3]]);
  B.campos([
    ["E-mail", state.rtEmail],
    ["Celular", state.rtCelular],
  ]);
}

/* "Dados do empreendimento" reúne o que a tela separa em três
   etapas: os totais, o tipo de atendimento, a atividade e o
   endereço da unidade consumidora (svg_1 dos quatro mocks).

   Aqui a grade inteira é UMA chamada de B.campos(), ao contrário do
   BT: é o próprio mock que reflui as linhas conforme os campos
   presentes — com "Nº da unidade/instalação" (só em alteração de
   carga) tudo anda uma coluna à frente. */
function _pdfEmpreendimentoMT(B) {
  const ehNova = state.finalidade === "Conexão Nova";
  const compart = state.compartilhada === "Sim";
  const rural = state.localizacao === "Rural";
  const demanda = compart
    ? state.demandaTotalCubiculos
    : demandaRepresentativaInstalacao();

  B.filete();
  B.secao("Dados do empreendimento", { repete: false });
  B.cartoes([
    ["Demanda total", _pdfUnMT(fmt(demanda), "kVA")],
    ["Potência total", _pdfUnMT(fmt(state.potTotalTrafos), "kVA")],
    compart
      ? ["Total de cubículos", String(cubiculos.length || "")]
      : ["Total de transformadores", String(state.qtdTotalTrafos || "")],
  ]);

  const campos = [
    ["Opção de atendimento", state.opcaoAtend],
    ["Tipo de solicitação", state.finalidade],
    ehNova ? null : ["Nº da unidade / instalação", state.numInstalacao],
    [
      "Nível de tensão na rede",
      state.tensaoMT ? state.tensaoMT.replace(".", ",") + " kV" : "",
    ],
    ["Subestação compartilhada", state.compartilhada],
    /* "Sobre a subestação" só é perguntado na compartilhada, e é ele
       que decide se cada cubículo tem número de instalação. O mock
       não o desenha, mas é uma resposta do formulário — entra aqui,
       ao lado da pergunta que o abre, em vez de empurrar um filete
       para dentro dos "Dados técnicos". */
    compart ? ["Sobre a subestação", state.subestacaoExistente] : null,
    ["Subestação pronta para ser ligada", state.subPronta],
    ["Atividade principal", state.atividade],
    ["Ramo da atividade", ramoParaPdf(state.ramoAtividade)],
    ["Área do empreendimento", state.localizacao],
    ["CEP", state.uc_cep],
  ];
  if (rural)
    campos.push(
      ["Distrito / Comunidade / Região", state.rur_distrito],
      ["Nome da propriedade", state.rur_propriedade],
      ["Cidade / Município", state.uc_municipio],
      ["Estado", state.uc_estado],
      ["Ponto de referência", state.pontoReferencia],
      ["Nº Instalação / UC / Medidor do vizinho", state.instalVizinho],
    );
  else
    campos.push(
      ["Endereço", state.urb_endereco, 2],
      ["Número", state.urb_num],
      ["Complemento", state.urb_compl],
      ["Bairro", state.urb_bairro],
      ["Cidade", state.uc_municipio],
      ["Estado", state.uc_estado],
    );
  B.campos(campos);

  B.cartoes([
    ["Coordenadas", _pdfCoordMT(state.latitude, state.longitude)],
    ["Coordenada UTM", state.utm],
  ]);
  /* Só aparece quando HÁ restrição — igual ao formulário. */
  if (state.restricaoAmbiental === "Sim")
    B.campos([["Área de restrição ambiental", state.restricoesTexto, 3]]);
}

/* "Dados técnicos da subestação e cargas especiais": o novo local
   da subestação (em alteração de carga), a tarifação e a demanda,
   os transformadores — soltos ou dentro de cada cubículo —, os
   motores e o modelo de subestação escolhido. */
function _pdfTecnicoMT(B) {
  const ehNova = state.finalidade === "Conexão Nova";
  const compart = state.compartilhada === "Sim";
  const azul = state.modalidade === "Azul";

  B.secao("Dados técnicos da subestação e cargas especiais", {
    repete: false,
  });

  /* Cabeçalho da seção: mudança de local (só em alteração) e, na
     subestação própria, a tarifação da instalação. Na compartilhada
     essas duas coisas são declaradas por cubículo. */
  const campos = [];
  if (!ehNova) {
    campos.push(["Haverá mudança no local da subestação", state.mudancaLocal]);
    /* O endereço do novo local só existe quando houve mudança
       declarada; a zona é a mesma da unidade consumidora. */
    if (state.mudancaLocal === "Sim") {
      campos.push(["Área do empreendimento", state.localizacao]);
      if (state.localizacao === "Rural")
        campos.push(
          ["Distrito / Comunidade / Região", state.nv_distrito],
          ["Nome da propriedade", state.nv_propriedade],
          ["Cidade / Município", state.nv_municipio_rur],
          ["Estado", state.nv_estado_rur],
          ["Ponto de referência", state.nv_pontoReferencia],
          ["Nº Instalação / UC / Medidor do vizinho", state.nv_instalVizinho],
        );
      else
        campos.push(
          ["CEP", state.nv_cep],
          ["Endereço", state.nv_endereco, 2],
          ["Número", state.nv_num],
          ["Complemento", state.nv_compl],
          ["Bairro", state.nv_bairro],
          ["Cidade", state.nv_municipio],
          ["Estado", state.nv_estado],
        );
      campos.push(
        [
          "Coordenadas do novo local",
          _pdfCoordMT(state.latitudeNova, state.longitudeNova),
        ],
        ["Coordenada UTM (novo local)", state.utmNova],
      );
    }
  }
  if (!compart)
    campos.push(
      ["Modalidade tarifária", state.modalidade],
      ..._pdfDemandaMT(
        {
          escalonada: state.escalonada,
          ponta: state.demandaPontaContratada,
          foraponta: state.demandaForaPontaContratada,
          demanda: state.demandaContratada,
        },
        azul,
        "kVA",
      ),
    );

  const temCabecalho = _pdfTemCampoMT(campos);
  B.campos(campos);
  if (!compart && state.escalonada === "Sim")
    _pdfEscalonadaMT(B, azul, escalonadaInstalacao);

  /* O filete separa o cabeçalho da seção dos blocos de equipamento
     (pdf-mt-nova/svg_2 y=246, pdf-mt-alteracao-compartilhada/svg_2
     y=246). Sem cabeçalho não há o que separar — e um filete logo
     abaixo do título faria a poda de seções vazias derrubar o
     título. */
  if (temCabecalho) B.filete();

  if (compart)
    cubiculos.forEach((c, i) => {
      /* Filete entre cubículos (pdf-mt-nova-compartilhada/svg_2
         y=336). */
      if (i) B.filete();
      /* O cubículo é o cabeçalho que a folha de continuação repete
         quando ele atravessa a página — é o que o mock faz com o
         "Cubículo 2 ● Novo"
         (pdf-mt-alteracao-compartilhada/svg_2 → svg_3). */
      B.subsecaoChip(
        `Cubículo ${i + 1}`,
        permiteTrocaTrafo() ? (c.existente ? "Já existente" : "Novo") : "",
        c.existente ? "mantido" : "novo",
        { repete: true },
      );
      const cub = [];
      /* Subestação nova ainda não tem unidade consumidora: o número
         nem aparece no formulário. */
      if (temInstalacaoCubiculo())
        cub.push(["Número da instalação", c.instalacao]);
      cub.push(
        ["Modalidade tarifária", c.modalidade],
        ..._pdfDemandaMT(
          {
            escalonada: c.escalonada,
            ponta: c.demandaPonta,
            foraponta: c.demandaForaPonta,
            demanda: c.demanda,
          },
          c.modalidade === "Azul",
          "kW",
        ),
      );
      B.campos(cub);
      if (c.escalonada === "Sim")
        _pdfEscalonadaMT(B, c.modalidade === "Azul", c.etapasEscalonada);
      c.trafos.forEach((t, j) => _pdfTrafoMT(B, t, j));
    });
  else trafos.forEach((t, i) => _pdfTrafoMT(B, t, i));

  if (motores.length) {
    B.filete();
    /* A partir daqui a folha de continuação não repete mais o
       cubículo: a tabela de motores é da instalação inteira. */
    B.subsecao("Motores", { repete: false });
    const tensaoMT = parseFloat(state.tensaoMT);
    B.tabela(
      ["Motor", "CV", "FP", "Rend.", "V", "IP/IN", "I nom (A)", "I part (A)"],
      motores.map((m, i) => {
        const c = CalculoMT.calcularMotor(
          {
            potenciaCV: m.cv,
            fp: m.fp,
            rendimento: m.rend,
            tensaoV: m.volts,
            relacaoIpIn: m.ipIn,
          },
          tensaoMT,
        );
        return [
          String(i + 1),
          m.cv,
          m.fp,
          m.rend,
          m.volts,
          m.ipIn,
          fmt(c.iNominal),
          fmt(c.iPartida),
        ];
      }),
      "pdf-tabela--motores-mt",
    );
  }

  /* Conexão Nova escolhe UM modelo; a alteração declara o modelo
     atual e o novo, lado a lado (pdf-mt-alteracao/svg_3). */
  B.filete();
  if (ehNova)
    B.midias([
      ["Subestação escolhida", _pdfFotoSEMT(state.cn_tipoSE), state.cn_tipoSE],
    ]);
  else
    B.midias([
      [
        "Subestação atual",
        _pdfFotoSEMT(state.alt_tipoAtual),
        state.alt_tipoAtual,
      ],
      ["Nova subestação", _pdfFotoSEMT(state.alt_tipoPara), state.alt_tipoPara],
    ]);
}

/* "Ramal de entrada": o desenho escolhido e a legenda dele, uma
   linha por item, com o valor em negrito (pdf-mt-nova/svg_3). */
function _pdfRamalMT(B) {
  B.filete();
  B.secao("Ramal de entrada", { repete: false });
  if (state.ramalIndice == null) {
    B.campos([["Ramal de entrada", "(não selecionado)", 3]]);
    return;
  }
  const partes = CalculoMT.textoRamal(state.ramalIndice)
    .split("·")
    .map((p) => {
      const [rotulo, ...resto] = p.split(":");
      return [rotulo.trim(), resto.join(":").trim()];
    })
    .filter((p) => p[1]);
  B.ramal(RAMAL_IMGS[state.ramalIndice], partes);
}

function _pdfGeracaoMT(B) {
  B.filete();
  B.secao("Geração", { repete: false });
  /* Uma chamada por pergunta: cada uma ocupa duas colunas e leva a
     sua potência na terceira, e a linha não deve se recompor
     quando a potência não existe (svg_3 de pdf-mt-nova). */
  B.campos([
    [
      "Possui geração em paralelismo momentâneo (gerador a diesel)?",
      state.gerMomentaneo,
      2,
    ],
    [
      "Potência da geração",
      state.gerMomentaneo === "Sim"
        ? _pdfUnMT(state.gerMomentaneoPot, "kVA")
        : "",
    ],
  ]);
  B.campos([
    [
      "Possui geração em paralelismo permanente sem injeção (GRID ZERO)?",
      state.gridZero,
      2,
    ],
    [
      "Potência da geração",
      state.gridZero === "Sim" ? _pdfUnMT(state.gridZeroPot, "kVA") : "",
    ],
  ]);
  B.campos([
    [
      "Possui unidades consumidoras de Baixa Tensão (BT) na mesma propriedade?",
      state.btMesmaProp,
      2,
    ],
  ]);
}

/* O rótulo do destino da fatura muda com a forma escolhida, e por
   isso não é uma lista fixa de campos. */
function _pdfCorrespondenciaMT(B) {
  B.filete();
  B.secao("Correspondência", { repete: false });
  const campos = [];
  if (state.formaCorresp === "E-mail informado")
    campos.push(["E-mail para receber a fatura", state.emailCliente]);
  else if (state.formaCorresp === "Outro e-mail")
    campos.push(["E-mail para receber a fatura", state.emailCorresp]);
  else if (state.formaCorresp === "Endereço da obra")
    campos.push([
      "Endereço para receber a fatura",
      "Mesmo da unidade consumidora",
      2,
    ]);
  else if (state.formaCorresp === "Conta globalizada")
    campos.push(["Conta globalizada", state.contaGlobalizada]);
  else if (
    state.formaCorresp === "Novo endereço" ||
    state.formaCorresp === "Agência Correios(Caixa Postal)"
  )
    campos.push(
      ["CEP", state.ec_cep],
      ["Endereço", state.ec_rua, 2],
      ["Número", state.ec_num],
      ["Complemento", state.ec_compl],
      ["Bairro", state.ec_bairro],
      ["Cidade", state.ec_municipio],
      ["Estado", state.ec_estado],
    );
  else campos.push(["Como você deseja receber a fatura", state.formaCorresp]);
  /* Campo opcional: sem dia escolhido não sai linha nenhuma — o
     usuário não recusou nada, apenas não informou. */
  campos.push([
    "Data de vencimento da fatura",
    state.desejaVenc === "Sim" && state.diaVenc
      ? "Todo dia " + state.diaVenc
      : "",
  ]);
  B.campos(campos);
}

/* ============================================================
   3. Montagem e exportação
   ============================================================ */

function _pdfBlocosMT() {
  const B = _pdfConstrutor();
  _pdfContatoMT(B);
  _pdfEmpreendimentoMT(B);
  B.filete();
  _pdfTecnicoMT(B);
  _pdfRamalMT(B);
  _pdfGeracaoMT(B);
  _pdfCorrespondenciaMT(B);
  /* "Observações" fecha o documento quando há texto. É o único
     bloco que o mock não desenha e que mesmo assim é impresso: o
     campo existe no formulário e o que a pessoa escreveu não pode
     sumir do papel — mesmo critério do BT. */
  if (!_pdfVazio(state.observacoes)) {
    B.filete();
    B.secao("Observações", { repete: false });
    B.paragrafos(state.observacoes);
  }
  return B.podar();
}

async function gerarPdfFormularioMT() {
  syncState();
  await _pdfMontarEBaixar(_pdfBlocosMT, {
    arquivo: _pdfNomeArquivo("MT", state.nome),
    titulo: "Formulário de Ligação Nova e Alteração de Carga",
  });
}
