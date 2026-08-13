/* ============================================================
   CEMIG BT — Lista de documentos para a solicitação
   ------------------------------------------------------------
   O motor de desenho jsPDF que vivia aqui (gerarPdfDoc, com a
   barra superior, as seções em caixa alta e as tabelas zebradas)
   foi removido: o PDF agora é HTML impresso pelo navegador, e o
   estilo mora em css/pdf/. A montagem está em bt/js/pdf-doc.js.

   O que sobrou é lógica de CONTEÚDO, não de renderização — os
   itens são gerados a partir do preenchimento (tipo de pessoa,
   tipo de conexão, localização, carga/demanda e modalidade) e
   alimentam a etapa "Prévia & PDF".
   ============================================================ */
function listaDocumentosBT(S) {
  const {
    pessoaJuridica,
    coletivo,
    multiTorres,
    hibrido,
    obra = {},
    atend = {},
    ucsDet = [],
    ucBlocos = [],
    blocos = [],
    exibeTermoGrupoB,
    demandaTotalGeral,
    temMotoresPesados,
  } = S || {};
  const docs = [];
  // Titular
  docs.push(
    pessoaJuridica
      ? "Documentos de constituição e registro da pessoa jurídica e documento oficial com foto do(s) representante(s) legal(is)"
      : "Documento oficial com foto e CPF do titular",
  );
  // Conexão nova → comprovação de propriedade/posse (+ regularidade urbana)
  const ucs = multiTorres
    ? blocos.flatMap((b) => b.ucs || [])
    : coletivo
      ? ucBlocos
      : ucsDet;
  const temConexaoNova =
    atend.escopo === "Ligação Nova" ||
    ucs.some((u) => (u.solicitacao || "") === "Conexão Nova");
  if (temConexaoNova) {
    docs.push("Comprovante de propriedade ou posse do local a ser atendido");
    if (obra.localizacao !== "Rural")
      docs.push(
        "Documento que comprove a regularidade do imóvel (unidade em área urbana)",
      );
  }
  // Individual com carga instalada/demanda acima de 75 kW
  if (!coletivo && exibeTermoGrupoB) {
    docs.push("ART de projeto paga (carga instalada acima de 75 kW)");
    docs.push("Planta de situação");
    docs.push("Formulário preenchido no APR Web");
    docs.push("Termo de Opção pelo Atendimento em Baixa Tensão — Grupo B");
  }
  // Coletivo / múltiplas torres
  if (coletivo) {
    docs.push(
      "Planta de situação da edificação com indicação do padrão de entrada e distância do ramal de entrada (ND-5.2) — enviar junto ao pedido e no APR Web",
    );
    if ((demandaTotalGeral || 0) > 304)
      docs.push(
        "Projeto elétrico com ART/TRT de projeto (demanda total acima de 304 kVA)",
      );
  }
  if (hibrido)
    docs.push(
      "Planta de situação com o número predial de cada unidade consumidora (atendimento híbrido)",
    );
  if (temMotoresPesados)
    docs.push(
      "Formulário de Análise de Partida de Motores (motores monofásicos acima de 15 CV e/ou trifásicos acima de 50 CV)",
    );
  if (obra.restricaoAmbiental === "Sim")
    docs.push(
      "Documento de regularização ambiental emitido por órgão competente (propriedade em área protegida)",
    );
  docs.push(
    "Procuração do titular (apenas para solicitações feitas por terceiros/responsável técnico)",
  );
  return docs;
}

/* gerarListaDocumentosDoc removido: o botão "Gerar lista de documentos" foi
   descontinuado — a lista (listaDocumentosBT acima) é exibida na Prévia & PDF. */
