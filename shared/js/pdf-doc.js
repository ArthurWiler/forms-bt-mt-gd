/* ============================================================
   CEMIG — Motor do documento do PDF (montagem e paginação)
   ------------------------------------------------------------
   Assim como css/pdf/shared-pdf.css é a fonte única dos
   COMPONENTES do PDF, este arquivo é a fonte única da MECÂNICA:
   os moldes, o construtor de blocos, o paginador e a exportação.
   O que cada formulário tem de próprio é só o CONTEÚDO — a lista
   de blocos —, que vive em <modulo>/js/pdf-doc.js.

   O documento é HTML de verdade, estilizado por css/pdf/*.css e
   paginado aqui; quem desenha o arquivo final é
   shared/js/pdf-render.js, lendo estas mesmas páginas. Ganhos: o
   estilo passa a ser CSS versionado (e não constantes espalhadas
   no JS), o texto sai selecionável e a fonte é a Open Sans do
   projeto, não a Helvetica embutida na biblioteca.

   O documento NUNCA é impresso pelo navegador: o clique baixa o
   .pdf direto, sem passar pelo diálogo de impressão.

   Contrato para quem monta conteúdo:
     await _pdfMontarEBaixar(() => {
       const B = _pdfConstrutor();
       B.secao("..."); B.campos([...]); ...
       return B.podar();
     }, { arquivo, titulo });
   Os blocos vêm de uma FUNÇÃO, e não prontos: montá-los já usa os
   moldes, que só chegam depois do fetch feito aqui dentro — e
   assim a montagem também fica sob o try/catch e o estado
   "Gerando PDF…" do botão.

   Carregue SEMPRE depois de shared/js/pdf-render.js, que define o
   renderizarPdfDoc chamado no fim.
   ============================================================ */

/* ============================================================
   1. Moldes
   ------------------------------------------------------------
   A marcação dos moldes mora num fragmento próprio
   (shared/pdf-moldes.html), e não repetida na página de cada
   formulário: são os mesmos componentes em todos eles. O
   fragmento é buscado UMA vez, na primeira exportação, e injetado
   no <body> — nada muda no carregamento da página.
   ============================================================ */

/* Resolvido a partir deste próprio script: as páginas de
   formulário estão um nível abaixo da raiz, mas quem sabe onde
   fica o fragmento é shared/js/, não o chamador. */
const _PDF_MOLDES_URL = new URL(
  "../pdf-moldes.html",
  (document.currentScript && document.currentScript.src) || location.href,
).href;

let _pdfMoldesEmCache = null;

function _pdfCarregarMoldes() {
  if (_pdfMoldesEmCache) return _pdfMoldesEmCache;
  /* Já injetado por uma exportação anterior desta mesma página. */
  if (document.getElementById("tplPdfDoc"))
    return (_pdfMoldesEmCache = Promise.resolve());
  _pdfMoldesEmCache = fetch(_PDF_MOLDES_URL)
    .then((r) => {
      if (!r.ok) throw new Error(`${_PDF_MOLDES_URL}: HTTP ${r.status}`);
      return r.text();
    })
    .then((html) => {
      const caixa = document.createElement("div");
      caixa.hidden = true;
      caixa.innerHTML = html;
      document.body.appendChild(caixa);
    })
    .catch((e) => {
      _pdfMoldesEmCache = null; // permite nova tentativa num clique posterior
      throw e;
    });
  return _pdfMoldesEmCache;
}

function _pdfMolde(id) {
  const t = document.getElementById(id);
  if (!t || !t.content) throw new Error("Molde do PDF ausente: " + id);
  return t.content.firstElementChild.cloneNode(true);
}

/* Campo sem valor (ou com o travessão de "não se aplica") não vai
   para o papel. */
const _pdfVazio = (v) =>
  v === undefined ||
  v === null ||
  String(v).trim() === "" ||
  String(v).trim() === "—";

/* ============================================================
   2. Construtor de blocos
   ------------------------------------------------------------
   O documento é montado como uma LISTA PLANA de blocos, não como
   uma árvore de seções: é o que permite ao paginador decidir onde
   cortar. Cada bloco carrega sua política de quebra em `prende`
   (quantos blocos seguintes têm de ficar na mesma página).
   ============================================================ */

function _pdfConstrutor() {
  const blocos = [];
  let quebraPendente = false;

  const push = (el, prende) => {
    const bloco = { el, prende: prende || 0 };
    if (quebraPendente) {
      bloco.quebraAntes = true;
      quebraPendente = false;
    }
    blocos.push(bloco);
    return el;
  };

  /* Abre folha nova antes do PRÓXIMO bloco. Os mocks quebram a
     página mesmo com a folha anterior quase inteira livre (o
     individual antes de "Cargas da unidade", o múltiplas torres
     antes de cada torre): é decisão do documento, não consequência
     de transbordo, e o paginador sozinho nunca a produziria. */
  const quebrarPagina = () => {
    quebraPendente = true;
  };

  /* Título de seção prende o bloco seguinte: sozinho no pé da
     página ele viraria uma órfã. */
  const secao = (texto) => {
    const el = _pdfMolde("tplPdfSecao");
    el.textContent = texto;
    push(el, 1);
  };

  /* Título de seção com um trecho em negrito ("Unidades com pedidos
     para **alteração de carga**", svg_4 do coletivo). Molde próprio
     porque o textContent do `secao` apagaria o <strong>. A raiz
     mantém a classe .pdf-secao-titulo, então a poda de seções
     vazias e a repetição do título na folha de continuação seguem
     valendo sem tratamento especial. */
  const secaoDestaque = (texto, forte) => {
    const el = _pdfMolde("tplPdfSecaoDestaque");
    el.querySelector(".pdf-secao-texto").textContent = texto;
    el.querySelector(".pdf-secao-forte").textContent = forte;
    push(el, 1);
  };

  const subsecao = (texto) => {
    const el = _pdfMolde("tplPdfSubsecao");
    el.textContent = texto;
    push(el, 1);
  };

  /* Prende o que vem depois: o filete só existe para anunciar a
     seção seguinte, e sozinho no pé da folha não anuncia nada. */
  const filete = () => push(_pdfMolde("tplPdfFilete"), 1);

  /* Campos na grade de 3 colunas. `lista` = [[rótulo, valor, cols?]].
     Cada LINHA da grade vira um bloco próprio — uma seção inteira
     num só elemento seria um átomo maior que a página. */
  const campos = (lista) => {
    let linha = null;
    let usadas = 0;
    (lista || [])
      .filter((c) => c && !_pdfVazio(c[1]))
      .forEach((c) => {
        const largura = Math.min(3, c[2] || 1);
        if (!linha || usadas + largura > 3) {
          linha = push(_pdfMolde("tplPdfGrade"));
          usadas = 0;
        }
        const campo = _pdfMolde("tplPdfCampo");
        /* Nomes literais, não "pdf-campo--" + n + "col": classe
           montada por concatenação some de uma busca textual, e é
           ela que sustenta a poda de CSS morto do projeto. */
        if (largura === 2) campo.classList.add("pdf-campo--2col");
        if (largura === 3) campo.classList.add("pdf-campo--3col");
        campo.querySelector(".pdf-rotulo").textContent = c[0];
        campo.querySelector(".pdf-valor").textContent = String(c[1]);
        linha.appendChild(campo);
        usadas += largura;
      });
  };

  /* Cartões de destaque. O valor pode ser um array: cada item vira
     uma linha dentro do cartão (é o "Bipolar 63A / Individual
     abaixo de 75 kW" do mock do individual). `modificador` troca a
     grade — "pdf-cartoes--4col" nos quatro cartões por torre. */
  const cartoes = (lista, modificador) => {
    const uteis = (lista || []).filter(
      (c) => c && [].concat(c[1]).some((v) => !_pdfVazio(v)),
    );
    if (!uteis.length) return;
    const linha = push(_pdfMolde("tplPdfCartoes"));
    if (modificador) linha.classList.add(modificador);
    uteis.forEach((c) => {
      const cartao = _pdfMolde("tplPdfCartao");
      cartao.querySelector(".pdf-rotulo").textContent = c[0];
      const primeiro = cartao.querySelector(".pdf-valor");
      const valores = [].concat(c[1]).filter((v) => !_pdfVazio(v));
      primeiro.textContent = String(valores[0]);
      valores.slice(1).forEach((v) => {
        const extra = primeiro.cloneNode(false);
        extra.textContent = String(v);
        cartao.appendChild(extra);
      });
      linha.appendChild(cartao);
    });
  };

  /* `colunas` = [rótulo] ou [{ rotulo, num: true }] para as
     numéricas, que saem alinhadas à direita.

     Duas formas de fechar a tabela, e os mocks usam as duas:
     `total` é uma célula única de largura inteira, à direita
     ("CARGA TOTAL: 25,36 kW", svg_3 do individual); `totalCelulas`
     é uma LINHA comum em negrito, com as células nas colunas
     normais ("TOTAL | 11" do loteamento). */
  const tabela = (colunas, linhas, modificador, total, totalCelulas) => {
    if (!linhas || !linhas.length) return;
    const el = _pdfMolde("tplPdfTabela");
    if (modificador) el.classList.add(modificador);
    const cab = el.tHead.rows[0];
    colunas.forEach((col) => {
      const th = document.createElement("th");
      th.textContent = col && col.rotulo !== undefined ? col.rotulo : col;
      if (col && col.num) th.className = "pdf-col-num";
      cab.appendChild(th);
    });
    const preencher = (tr, celulas) => {
      celulas.forEach((celula, i) => {
        const td = document.createElement("td");
        td.textContent = _pdfVazio(celula) ? "—" : String(celula);
        if (colunas[i] && colunas[i].num) td.className = "pdf-col-num";
        tr.appendChild(td);
      });
      el.tBodies[0].appendChild(tr);
    };
    linhas.forEach((linha) => preencher(document.createElement("tr"), linha));
    if (totalCelulas && totalCelulas.length)
      preencher(_pdfMolde("tplPdfTabelaTotalLinha"), totalCelulas);
    if (!_pdfVazio(total)) {
      const tr = _pdfMolde("tplPdfTabelaTotal");
      const td = tr.querySelector("td");
      td.colSpan = colunas.length;
      td.textContent = String(total);
      el.tBodies[0].appendChild(tr);
    }
    push(el);
  };

  /* Coluna inteiramente vazia não é impressa (ex.: "Inst. / UC /
     Medidor" quando todas as UCs são Conexão Nova). A 1ª coluna,
     que identifica a linha, fica sempre. */
  const tabelaAuto = (colunas, linhas, modificador, total) => {
    if (!linhas || !linhas.length) return;
    const manter = colunas.map(
      (_, i) => i === 0 || linhas.some((l) => !_pdfVazio(l[i])),
    );
    tabela(
      colunas.filter((_, i) => manter[i]),
      linhas.map((l) => l.filter((_, i) => manter[i])),
      modificador,
      total,
    );
  };

  const total = (rotulo, valor) => {
    const el = _pdfMolde("tplPdfTotal");
    el.querySelector(".pdf-total-rotulo").textContent = rotulo;
    el.querySelector(".pdf-total-valor").textContent = valor;
    push(el);
  };

  /* Um bloco por parágrafo: assim o corte entre páginas cai entre
     parágrafos, e só um parágrafo isolado maior que a folha
     precisa ser fatiado no meio. */
  const paragrafos = (texto) => {
    String(texto == null ? "" : texto)
      .split(/\n+/)
      .map((t) => t.trim())
      .filter(Boolean)
      .forEach((t) => {
        const el = _pdfMolde("tplPdfObservacoes");
        el.textContent = t;
        push(el);
      });
  };

  const assinatura = () => push(_pdfMolde("tplPdfAssinatura"));

  /* Toda seção pode esvaziar: os campos são filtrados por _pdfVazio,
     e há combinações (correspondência por e-mail sem dia de
     vencimento, projeto sem nenhum nível de proteção, agrupamento
     sem nenhuma UC em alteração de carga) em que nada sobra. Sem
     esta limpeza sobrariam um título e um filete soltos,
     anunciando uma seção que não existe. Roda no fim, uma vez, em
     vez de obrigar cada chamador a conferir antes de abrir a seção. */
  const podar = () => {
    const eh = (el, classe) => !!el && el.classList.contains(classe);
    for (let i = blocos.length - 1; i >= 0; i -= 1) {
      const el = blocos[i].el;
      const proximo = blocos[i + 1] && blocos[i + 1].el;
      /* Título de seção seguido de outro título (ou de filete, ou de
         nada) não abre conteúdo nenhum. Uma subseção também morre
         quando esbarra numa irmã — é o caso de "Cargas especiais"
         sem motores nem gerador. Varrendo de trás para a frente, a
         subseção órfã sai antes de o título da seção ser avaliado,
         então a limpeza cascateia numa passada só. */
      const vazia =
        (eh(el, "pdf-secao-titulo") &&
          (!proximo ||
            eh(proximo, "pdf-secao-titulo") ||
            eh(proximo, "pdf-filete"))) ||
        (eh(el, "pdf-subsecao") &&
          (!proximo ||
            eh(proximo, "pdf-secao-titulo") ||
            eh(proximo, "pdf-subsecao") ||
            eh(proximo, "pdf-filete")));
      /* Filete que ficou encostado noutro filete, ou que sobrou no
         fim do documento, também sai. */
      const filDuplo =
        eh(el, "pdf-filete") && (!proximo || eh(proximo, "pdf-filete"));
      if (vazia || filDuplo) {
        /* A quebra de página pedida antes deste bloco continua
           valendo para o que sobrou no lugar dele. */
        if (blocos[i].quebraAntes && blocos[i + 1])
          blocos[i + 1].quebraAntes = true;
        blocos.splice(i, 1);
      }
    }
    /* Um filete só faz sentido ENTRE seções. */
    while (blocos.length && blocos[0].el.classList.contains("pdf-filete"))
      blocos.shift();
    return blocos;
  };

  return {
    blocos,
    podar,
    quebrarPagina,
    secao,
    secaoDestaque,
    subsecao,
    filete,
    campos,
    cartoes,
    tabela,
    tabelaAuto,
    total,
    paragrafos,
    assinatura,
  };
}

/* ============================================================
   3. Paginação
   ------------------------------------------------------------
   O Chrome não suporta margin boxes de @page nem counter(pages),
   então não há como paginar em CSS puro e ainda carimbar "n/N".
   Medimos dentro de uma .pdf-pagina de verdade (mesma largura,
   mesma tipografia) e decidimos as quebras aqui.
   ============================================================ */

function _pdfPaginador(doc) {
  /* `secao` é o título da seção em curso e `repetido`, a cópia dele
     no topo da folha atual. */
  const P = {
    doc,
    paginas: [],
    corpo: null,
    util: 0,
    secao: null,
    repetido: null,
  };

  /* Seção partida entre folhas repete o título na continuação — é o
     que o mock faz quando a UC 3 atravessa a página (svg_6 → svg_7).
     `repetir: false` para a folha que já começa pelo próprio título:
     repetir ali seria imprimi-lo duas vezes.

     A cópia entra ANTES de qualquer medição, senão P.cabe() decide
     pela altura errada e o conteúdo transborda ao receber o título. */
  P.novaPagina = (repetir) => {
    /* Guarda a folha anterior para um eventual desfazerPagina: só
       ao TENTAR encaixar o grupo na folha nova se descobre que ela
       não resolvia nada. Um nível de desfazer basta — nunca se abre
       duas folhas antes de medir. */
    P.anterior = P.corpo
      ? { corpo: P.corpo, util: P.util, repetido: P.repetido }
      : null;
    const pagina = _pdfMolde("tplPdfPagina");
    doc.appendChild(pagina);
    P.paginas.push(pagina);
    P.corpo = pagina.querySelector(".pdf-corpo");
    /* Altura útil lida do próprio layout, em vez de repetir os
       770pt como constante: .pdf-corpo é o que sobra da folha
       depois da margem e do rodapé. */
    P.util = P.corpo.clientHeight;
    P.repetido =
      repetir !== false && P.secao
        ? P.corpo.appendChild(P.secao.cloneNode(true))
        : null;
    return pagina;
  };
  /* Devolve a folha recém-aberta: usada quando nem ela comportou o
     grupo, caso em que abri-la só deixaria um vão no pé da
     anterior. A folha volta vazia, então nada se perde. */
  P.desfazerPagina = () => {
    if (!P.anterior) return false;
    P.paginas.pop().remove();
    P.corpo = P.anterior.corpo;
    P.util = P.anterior.util;
    P.repetido = P.anterior.repetido;
    P.anterior = null;
    return true;
  };
  P.por = (el) => P.corpo.appendChild(el);
  P.cabe = () => P.corpo.scrollHeight <= P.util;
  /* O título repetido não conta como conteúdo: quem pergunta se a
     folha está vazia quer saber se abrir outra adiantaria alguma
     coisa, e uma folha só com o título continua limpa. */
  P.vazia = () => {
    const filhos = P.corpo.children;
    return !filhos.length || (filhos.length === 1 && filhos[0] === P.repetido);
  };

  return P;
}

/* Fatia uma tabela entre páginas repetindo o cabeçalho. */
function _pdfDividirTabela(P, tabela) {
  const linhas = Array.from(tabela.tBodies[0].rows);
  if (linhas.length < 2) return false;
  linhas.forEach((tr) => tr.remove());

  const fatias = [];
  const novaFatia = () => {
    const fatia = tabela.cloneNode(true);
    Array.from(fatia.tBodies[0].rows).forEach((tr) => tr.remove());
    P.por(fatia);
    fatias.push(fatia);
    return fatia;
  };

  let fatia = novaFatia();
  linhas.forEach((tr) => {
    fatia.tBodies[0].appendChild(tr);
    if (P.cabe()) return;
    tr.remove();
    P.novaPagina();
    fatia = novaFatia();
    fatia.tBodies[0].appendChild(tr);
  });

  /* A divisão pode começar numa folha quase cheia, onde nem a
     primeira linha coube: sobra uma fatia só com o cabeçalho, que
     lê como tabela vazia. */
  for (let i = fatias.length - 1; i >= 0; i -= 1)
    if (!fatias[i].tBodies[0].rows.length) {
      fatias[i].remove();
      fatias.splice(i, 1);
    }
  if (!fatias.length) return false;

  /* Viúva: uma única linha numa folha nova, sob um cabeçalho
     repetido, lê como erro. Puxa uma da fatia anterior — que tem
     folga, já que acabou de recusar esta. */
  const ultima = fatias[fatias.length - 1];
  const anterior = fatias[fatias.length - 2];
  if (
    anterior &&
    ultima.tBodies[0].rows.length === 1 &&
    anterior.tBodies[0].rows.length > 2
  ) {
    const corpoAnt = anterior.tBodies[0];
    ultima.tBodies[0].insertBefore(
      corpoAnt.rows[corpoAnt.rows.length - 1],
      ultima.tBodies[0].rows[0],
    );
  }
  return true;
}

/* Fatia um parágrafo entre páginas, por busca binária do maior
   prefixo que ainda cabe. */
function _pdfDividirTexto(P, el) {
  const palavras = String(el.textContent).split(/\s+/).filter(Boolean);
  if (palavras.length < 2) return false;
  let restantes = palavras;
  while (restantes.length) {
    const fatia = el.cloneNode(false);
    P.por(fatia);
    let baixo = 1;
    let alto = restantes.length;
    let melhor = 0;
    while (baixo <= alto) {
      const meio = Math.floor((baixo + alto) / 2);
      fatia.textContent = restantes.slice(0, meio).join(" ");
      if (P.cabe()) {
        melhor = meio;
        baixo = meio + 1;
      } else {
        alto = meio - 1;
      }
    }
    if (!melhor) {
      fatia.remove();
      /* Numa folha já limpa nem a primeira palavra coube: não há o
         que fatiar, devolve para o chamador tratar. */
      if (P.vazia()) return false;
      P.novaPagina();
      continue;
    }
    fatia.textContent = restantes.slice(0, melhor).join(" ");
    restantes = restantes.slice(melhor);
    if (restantes.length) P.novaPagina();
  }
  return true;
}

function _pdfDividir(P, el) {
  if (el.matches("table.pdf-tabela")) return _pdfDividirTabela(P, el);
  if (el.matches(".pdf-observacoes")) return _pdfDividirTexto(P, el);
  return false;
}

/* Grupo mais alto que uma folha limpa. Sem este tratamento o laço
   principal abriria página após página sem nunca encaixar, ou o
   `overflow: hidden` da .pdf-pagina comeria o conteúdo em silêncio. */
function _pdfEstourar(P, els) {
  els.forEach((el) => {
    P.por(el);
    if (P.cabe()) return;
    el.remove();
    /* Divisível (tabela longa, texto corrido): começa NESTA folha e
       transborda para as seguintes. Mandá-lo inteiro para a folha
       seguinte não adiantaria — ele também não cabe lá — e ainda
       deixaria um vão no pé desta. */
    if (_pdfDividir(P, el)) return;
    /* Indivisível: ao menos começa numa folha limpa. */
    if (!P.vazia()) {
      P.novaPagina();
      P.por(el);
      if (P.cabe()) return;
      el.remove();
    }
    /* Último recurso: entra inteiro e transborda. Falha visível é
       melhor que corte silencioso — o aviso abaixo e a checagem
       final apontam a página. */
    P.por(el);
    console.warn("[PDF] bloco maior que a página e indivisível:", el);
  });
}

/* Uma tabela longa deve COMEÇAR na folha atual em vez de pular
   inteira para a próxima: é o que os mocks fazem logo abaixo dos
   cartões da torre (svg_3 do coletivo e do múltiplas torres), e
   sem isso a folha anterior fica com um vão de meia página.

   Mas só quando ainda cabem o cabeçalho do grupo e ao menos duas
   linhas — um título de seção sozinho no pé da folha, ou uma linha
   órfã sob o cabeçalho da tabela, leem como erro. A medição é feita
   com uma cópia de duas linhas, e não por conta: altura de linha
   depende do que está escrito nela. */
function _pdfComecaAqui(P, els) {
  const ultimo = els[els.length - 1];
  if (!ultimo.matches("table.pdf-tabela")) return false;
  if (ultimo.tBodies[0].rows.length < 3) return false;

  const cabeca = els.slice(0, -1);
  const prova = ultimo.cloneNode(true);
  Array.from(prova.tBodies[0].rows)
    .slice(2)
    .forEach((tr) => tr.remove());
  cabeca.forEach(P.por);
  P.por(prova);
  const cabe = P.cabe();
  prova.remove();
  cabeca.forEach((el) => el.remove());
  return cabe;
}

function _pdfPaginar(doc, blocos) {
  const P = _pdfPaginador(doc);
  P.novaPagina();
  /* Cabeçalho só na 1ª folha: nas seguintes o mock começa direto
     no título da seção, a 36pt do topo. */
  P.por(_pdfMolde("tplPdfCabecalho"));

  for (let i = 0; i < blocos.length; ) {
    /* keep-with-next transitivo: o título prende o 1º bloco, que
       pode prender o seguinte. */
    const grupo = [blocos[i]];
    let j = i;
    while (grupo[grupo.length - 1].prende && j + 1 < blocos.length) {
      j += 1;
      grupo.push(blocos[j]);
    }
    const els = grupo.map((b) => b.el);
    /* Grupo que traz o próprio título de seção não repete o título
       anterior na folha nova — e passa a ser a seção corrente. */
    const titulo =
      els.find((el) => el.classList.contains("pdf-secao-titulo")) || null;
    if (grupo[0].quebraAntes && !P.vazia()) P.novaPagina(!titulo);
    if (titulo) P.secao = titulo;

    /* Põe o grupo inteiro e diz se coube; quando não cabe, desfaz e
       deixa a folha como estava. */
    const encaixar = () => {
      els.forEach(P.por);
      if (P.cabe()) return true;
      els.forEach((el) => el.remove());
      return false;
    };

    if (!encaixar()) {
      if (_pdfComecaAqui(P, els)) {
        /* Rabo divisível com espaço útil aqui: entra e transborda. */
        _pdfEstourar(P, els);
      } else {
        /* Uma folha nova só ajuda se o grupo couber nela INTEIRO. Se
           nem lá cabe (a tabela de 36 unidades de uma torre não cabe
           em folha nenhuma), abri-la deixaria a anterior com um vão e
           esta ainda teria de ser dividida — então desfaz e divide a
           partir de onde estávamos. */
        let coube = false;
        if (!P.vazia()) {
          P.novaPagina(!titulo);
          coube = encaixar();
          if (!coube) P.desfazerPagina();
        }
        if (!coube) _pdfEstourar(P, els);
      }
    }
    i = j + 1;
  }

  /* Filete que caiu no topo de uma folha não separa nada do que veio
     antes: o mock abre a página de continuação direto no título
     (svg_2). Sai depois de paginado — remover só libera altura, então
     nenhuma folha passa a transbordar por causa disto. */
  P.paginas.forEach((pagina) => {
    const primeiro = pagina.querySelector(".pdf-corpo").firstElementChild;
    if (primeiro && primeiro.classList.contains("pdf-filete"))
      primeiro.remove();
  });

  const total = P.paginas.length;
  P.paginas.forEach((pagina, i) => {
    pagina.querySelector(".pdf-rodape").textContent = `${i + 1}/${total}`;
    /* A .pdf-pagina corta o excesso, então um erro de paginação
       apareceria como texto faltando, sem pista nenhuma. */
    const corpo = pagina.querySelector(".pdf-corpo");
    if (corpo.scrollHeight > corpo.clientHeight)
      console.warn(`[PDF] conteúdo transbordou na página ${i + 1}`, corpo);
  });
  return total;
}

/* ============================================================
   4. Pré-requisitos da medição
   ============================================================ */

/* A paginação é feita medindo altura, e css/variables.css declara
   Open Sans com font-display: swap. Medir antes de a fonte chegar
   pagina em Segoe UI — quebras no lugar errado e "n/N" incoerente.
   `document.fonts.ready` sozinha não basta: ela só resolve as
   faces JÁ solicitadas, e o peso 700 pode nunca ter sido pedido
   pela tela. Passar o texto real ainda faz o navegador escolher o
   unicode-range certo (latin × latin-ext). */
async function _pdfAguardarFontes(texto) {
  if (!document.fonts) return;
  try {
    await Promise.all([
      document.fonts.load('400 10pt "Open Sans"', texto),
      document.fonts.load('700 10pt "Open Sans"', texto),
    ]);
    await document.fonts.ready;
  } catch (e) {
    /* Cache frio sem rede: sai com a fonte de fallback, que é
       melhor que um botão que não responde. */
    console.warn("[PDF] fontes não confirmadas; paginando assim mesmo", e);
  }
}

/* O logo é um <img> externo: se ainda não decodificou quando a
   impressão começa, a folha sai sem a marca. */
async function _pdfAguardarImagens(raiz) {
  await Promise.all(
    Array.from(raiz.querySelectorAll("img")).map((img) =>
      img.decode ? img.decode().catch(() => {}) : Promise.resolve(),
    ),
  );
}

/* ============================================================
   5. Exportação
   ============================================================ */

/* Mesmo padrão de nome em todos os PDFs do projeto (_nomeArqMT em
   mt/js/pdf.js): prefixo do formulário + nome do cliente. A
   normalização derruba o acento ANTES do filtro, senão "José"
   viraria "Jos_". */
function _pdfNomeArquivo(prefixo, nome) {
  const limpo = String(nome || "Cliente")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 30);
  return `CEMIG_${prefixo}_${limpo || "Cliente"}.pdf`;
}

/* Monta o documento fora da viewport, pagina, desenha e baixa.
   `montarBlocos` é a função de quem sabe o CONTEÚDO — este módulo
   não conhece formulário nenhum. Ela roda só depois de os moldes
   estarem carregados, e por isso não pode receber os blocos já
   prontos. */
async function _pdfMontarEBaixar(montarBlocos, opcoes) {
  const o = opcoes || {};
  const anterior = document.getElementById("documentoPdf");
  if (anterior) anterior.remove();

  const foco = document.activeElement;
  /* A fonte do PDF é buscada na primeira exportação: sem este
     estado o botão fica mudo por um instante. */
  const botao = document.getElementById("btnExportarPDF");
  const rotulo = botao && botao.textContent;
  if (botao) {
    botao.disabled = true;
    botao.textContent = "Gerando PDF…";
  }

  let doc = null;
  try {
    await _pdfCarregarMoldes();
    doc = _pdfMolde("tplPdfDoc");
    doc.classList.add("pdf-doc--montando");
    document.body.appendChild(doc);

    const blocos = montarBlocos();
    await _pdfAguardarFontes(blocos.map((b) => b.el.textContent).join(" "));
    _pdfPaginar(doc, blocos);
    await _pdfAguardarImagens(doc);

    /* O documento segue montado (fora da viewport) durante o
       desenho: é dele que o renderizador tira as coordenadas. */
    await renderizarPdfDoc(doc, {
      arquivo: o.arquivo || "documento.pdf",
      titulo: o.titulo || "",
    });
  } catch (e) {
    console.error("[PDF] falha ao gerar o documento", e);
    alert("Não foi possível gerar o PDF. Recarregue a página e tente de novo.");
    return;
  } finally {
    if (doc) doc.remove();
    if (botao) {
      botao.disabled = false;
      botao.textContent = rotulo;
    }
    if (foco && foco.focus) foco.focus();
  }

  /* Ao contrário do window.print(), aqui o arquivo já saiu quando
     se chega nesta linha: o diálogo de sucesso deixou de aparecer
     também quando o usuário cancelava a exportação. */
  if (typeof mostrarModalPdfExportado === "function")
    mostrarModalPdfExportado();
}
