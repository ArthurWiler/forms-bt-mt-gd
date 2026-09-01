/* ============================================================
   CEMIG Loteamento — Conteúdo do PDF
   ------------------------------------------------------------
   Antes esta etapa chamava window.print() e entregava a PRÓPRIA
   tela ao diálogo de impressão, maquiada por um @media print. Agora
   o documento é HTML montado à parte, estilizado por css/pdf/*.css
   e baixado como .pdf — o mesmo caminho do BT.

   A MECÂNICA (moldes, construtor de blocos, paginador, exportação)
   vem de shared/js/pdf-doc.js; aqui fica só o CONTEÚDO, que segue o
   SVG de referência docs/mocks/pdf-loteamento/svg_1.

   Lê o mesmo `state` plano do formulário (loteamento/js/app.js) e
   reaproveita o fmtData de lá, que já devolve o mês/ano por extenso
   ("Agosto de 2027") da "Data de entrada de carga ou inauguração".

   Carregue depois de shared/js/pdf-render.js e shared/js/pdf-doc.js.
   ============================================================ */

function _pdfBlocosLoteamento(S) {
  const B = _pdfConstrutor();

  /* Grau decimal com 6 casas, como no mock
     ("-19.863788, -43.955397"). */
  const coordenadas = () => {
    const f = (v) => {
      const n = parseFloat(String(v).replace(",", "."));
      return isNaN(n) ? null : n.toFixed(6);
    };
    return [f(S.latitude), f(S.longitude)].filter((x) => x !== null).join(", ");
  };

  const lotes = [
    ["Até 400m²", parseInt(S.lote_400, 10) || 0],
    ["De 401 a 600m²", parseInt(S.lote_400_600, 10) || 0],
    ["Acima de 600m²", parseInt(S.lote_600, 10) || 0],
  ];
  const totalLotes = lotes.reduce((s, l) => s + l[1], 0);

  /* ---- Dados para contato ---- */
  B.secao("Dados para contato");
  B.campos([["Nome", S.nome, 3]]);
  B.campos([
    ["E-mail", S.email],
    ["Celular", S.celular],
  ]);

  /* ---- Dados do empreendimento ----
     Cada LINHA do mock é uma chamada de B.campos() própria, e não
     uma lista só: como campo vazio é descartado, numa lista única o
     campo seguinte subiria para o buraco e a linha sairia com outra
     composição de colunas. */
  B.filete();
  B.secao("Dados do empreendimento");
  B.campos([["Cliente / Razão Social do empreendimento", S.cliente, 3]]);
  B.campos([
    ["Área do empreendimento", S.area],
    ["Município", S.municipio],
    ["Estado", S.estado],
  ]);
  B.campos([
    ["Tipo de solicitante", S.tipoSolicitante],
    ["Tipo de empreendimento", S.tipo],
    ["Data de entrada de carga ou inauguração", fmtData(S.dataEntrada)],
  ]);
  B.cartoes([
    ["Coordenadas", coordenadas()],
    ["Coordenada UTM", S.utm],
  ]);

  /* ---- Quantidade de lotes por área ----
     Tabela estreita (215pt no mock, não a coluna inteira) fechada
     por uma linha TOTAL em negrito nas colunas normais — e não pela
     célula única à direita que o BT usa nas cargas. */
  B.filete();
  B.secao("Quantidade de lotes por área");
  B.tabela(
    ["Faixa da área", "Quantidade de lotes"],
    lotes,
    "pdf-tabela--auto",
    "",
    ["TOTAL", totalLotes],
  );

  /* ---- Observações ----
     O mock não desenha esta seção, mas o campo existe no
     formulário: o que a pessoa escreveu não pode sumir do papel. */
  if (!_pdfVazio(S.observacoes)) {
    B.filete();
    B.secao("Observações");
    B.paragrafos(S.observacoes);
  }

  return B.podar();
}

async function gerarPdfLoteamento(S) {
  await _pdfMontarEBaixar(() => _pdfBlocosLoteamento(S || {}), {
    arquivo: _pdfNomeArquivo("Loteamento", S && S.nome),
    titulo: "Formulário de Ligação Nova e Alteração de Carga",
  });
}
