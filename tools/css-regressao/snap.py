"""Regressao visual do CSS — tira um retrato do estilo computado.

Para cada elemento de cada pagina/viewport/media, guarda um hash do estilo
computado COMPLETO (elemento + ::before + ::after). O hash mantem o artefato
pequeno sem perder cobertura: qualquer mudanca de cascata vira um hash
diferente. Compare dois retratos com `diff.py`.

Este repositorio nao tem build step nem CI; o harness e opcional e roda a mao.

    pip install playwright && playwright install chromium

    python tools/css-regressao/snap.py antes
    ...mexa no CSS...
    python tools/css-regressao/snap.py depois
    python tools/css-regressao/diff.py antes depois

Sobe um servidor HTTP proprio numa porta livre. Isso NAO e detalhe: em
file:// o fetch() dos fragmentos das etapas morre no CORS, o formulario
redireciona para o portal e o retrato mede a home varias vezes sem avisar.

Uso: python snap.py <dir-saida> [--pages home,mt] [--only-vp w1440]
"""
import contextlib, functools, http.server, json, socket, socketserver
import sys, pathlib, threading
from playwright.sync_api import sync_playwright

# raiz do repositorio (dois niveis acima de tools/css-regressao/)
ROOT = pathlib.Path(__file__).resolve().parents[2]

# As paginas BT exigem um ?mod= valido, senao btResolverCard() redireciona para
# ../index.html. Os ids saem de MODALIDADES_SECOES em bt/js/model.js.
PAGES = [
    ("home", "index.html"),
    ("bt-coletivo", "bt/index.html?mod=coletivo"),
    ("bt-condominio", "bt/index.html?mod=condominiotorres"),
    ("bt-individual", "bt/individual.html?mod=casa100"),
    ("bt-industriabt", "bt/individual.html?mod=industriabt"),
    ("mt", "mt/index.html"),
    ("mt-industria", "mt/index.html?atividade=Industrial"),
    ("microgd", "microgeracao/index.html"),
    ("microgd-fast", "microgeracao/index.html?modo=fasttrack"),
    ("microgd-gridzero", "microgeracao/index.html?modo=gridzero"),
    ("minigd", "minigeracao/index.html"),
    ("loteamento", "loteamento/index.html"),
    ("desistencia", "desistencia/index.html"),
]

# Cobre os dois lados de cada breakpoint do projeto: 1024, 900, 720, 640, 600.
VIEWPORTS = [
    ("w1440", 1440, 900),
    ("w1024", 1024, 800),
    ("w900", 900, 800),
    ("w720", 720, 800),
    ("w640", 640, 800),
    ("w600", 600, 800),
    ("w480", 480, 800),
]

MEDIA = ["screen", "print"]

SCRIPT = r"""() => {
  // FNV-1a over the serialised computed style: small artefact, full coverage.
  const hash = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16);
  };
  const pathOf = (el) => {
    const parts = [];
    let cur = el;
    while (cur && cur.nodeType === 1 && parts.length < 12) {
      let seg = cur.tagName.toLowerCase();
      if (cur.id) { seg += '#' + cur.id; parts.unshift(seg); break; }
      const par = cur.parentElement;
      if (par) {
        const sibs = Array.from(par.children).filter(c => c.tagName === cur.tagName);
        if (sibs.length > 1) seg += ':nth(' + sibs.indexOf(cur) + ')';
      }
      parts.unshift(seg);
      cur = cur.parentElement;
    }
    return parts.join('>');
  };
  // O servidor sobe numa porta livre diferente a cada rodada, e o navegador
  // resolve url(...) para absoluto. Sem normalizar isso, todo elemento com
  // background-image apareceria como "mudou" entre dois retratos iguais.
  const origin = location.origin;
  const ser = (cs) => {
    const out = [];
    for (let i = 0; i < cs.length; i++) {
      const p = cs[i];
      out.push(p + ':' + cs.getPropertyValue(p).split(origin).join('<origin>'));
    }
    out.sort();
    return out.join(';');
  };

  const out = [];
  const els = document.querySelectorAll('*');
  let idx = -1;
  for (const el of els) {
    idx++;
    const tag = el.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' ||
        tag === 'META' || tag === 'HEAD' || tag === 'TITLE') continue;
    const body = ser(getComputedStyle(el));
    const bef = ser(getComputedStyle(el, '::before'));
    const aft = ser(getComputedStyle(el, '::after'));
    out.push({
      i: idx,
      p: pathOf(el),
      c: el.getAttribute('class') || '',
      h: hash(body),
      hb: hash(bef),
      ha: hash(aft),
    });
  }
  return out;
}"""


@contextlib.contextmanager
def serve(root):
    """Sobe um HTTP server na raiz do repo, numa porta livre."""
    class Handler(http.server.SimpleHTTPRequestHandler):
        def log_message(self, *a):
            pass  # uma linha por request afogaria a saida util

    handler = functools.partial(Handler, directory=str(root))

    class Quiet(socketserver.TCPServer):
        allow_reuse_address = True

        def handle_error(self, request, client_address):
            pass  # conexao abortada pelo navegador nao e erro nosso

    with socket.socket() as probe:
        probe.bind(("127.0.0.1", 0))
        port = probe.getsockname()[1]

    httpd = Quiet(("127.0.0.1", port), handler)
    t = threading.Thread(target=httpd.serve_forever, daemon=True)
    t.start()
    try:
        yield f"http://127.0.0.1:{port}/"
    finally:
        httpd.shutdown()
        httpd.server_close()


def settle(pg):
    """Espera o DOM parar de crescer (as etapas chegam por fetch)."""
    prev = -1
    for _ in range(40):
        pg.wait_for_timeout(100)
        cur = pg.evaluate("()=>document.querySelectorAll('*').length")
        if cur == prev:
            return
        prev = cur


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        raise SystemExit(2)
    outdir = pathlib.Path(args[0])
    pages = PAGES
    vps = VIEWPORTS
    if "--pages" in args:
        want = args[args.index("--pages") + 1].split(",")
        pages = [p for p in PAGES if p[0] in want]
    if "--only-vp" in args:
        want = args[args.index("--only-vp") + 1].split(",")
        vps = [v for v in VIEWPORTS if v[0] in want]
    outdir.mkdir(parents=True, exist_ok=True)

    with serve(ROOT) as base, sync_playwright() as p:
        browser = p.chromium.launch()
        for name, rel in pages:
            url = base + rel
            for vpname, w, h in vps:
                ctx = browser.new_context(viewport={"width": w, "height": h})
                pg = ctx.new_page()
                pg.goto(url, wait_until="load")
                settle(pg)

                # Guarda-corpo: se a pagina caiu no portal, estamos medindo o
                # documento errado e a comparacao inteira nao vale nada.
                if name != "home" and pg.evaluate(
                    "()=>!!document.querySelector('.modalidade-screen')"
                ):
                    landed = pg.evaluate("()=>location.pathname+location.search")
                    raise SystemExit(
                        f"FATAL: {name} ({url}) redirecionou para o portal "
                        f"(parou em {landed}) — o retrato seria inutil"
                    )

                for media in MEDIA:
                    pg.emulate_media(media=media)
                    pg.wait_for_timeout(80)
                    data = pg.evaluate(SCRIPT)
                    key = f"{name}__{vpname}__{media}.json"
                    (outdir / key).write_text(
                        json.dumps(data, sort_keys=True), encoding="utf-8"
                    )
                    print("ok", key, len(data), "elementos", flush=True)
                ctx.close()
        browser.close()


if __name__ == "__main__":
    main()
