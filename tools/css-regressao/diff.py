"""Compara dois retratos. Sai com 0 quando o estilo computado e identico.

Uso: python diff.py antes depois [--max 40]
"""
import json, pathlib, sys

if len(sys.argv) < 3:
    print(__doc__)
    raise SystemExit(2)

a_dir = pathlib.Path(sys.argv[1])
b_dir = pathlib.Path(sys.argv[2])
maxshow = int(sys.argv[sys.argv.index("--max") + 1]) if "--max" in sys.argv else 40

a_files = {p.name for p in a_dir.glob("*.json")}
b_files = {p.name for p in b_dir.glob("*.json")}

# Rodar so um subconjunto de paginas e normal durante a iteracao; isso e nota,
# nao erro. Ja arquivo que so existe no "depois" e sinal de comparacao torta.
if a_files - b_files:
    print(f"(nota: {len(a_files - b_files)} arquivo(s) do retrato base fora desta rodada)")
if b_files - a_files:
    print("SOBRANDO no depois:", sorted(b_files - a_files))

total_diff = 0
shown = 0
for name in sorted(a_files & b_files):
    a = json.loads((a_dir / name).read_text(encoding="utf-8"))
    b = json.loads((b_dir / name).read_text(encoding="utf-8"))
    ai = {r["i"]: r for r in a}
    bi = {r["i"]: r for r in b}
    if set(ai) != set(bi):
        print(f"[{name}] CONJUNTO DE ELEMENTOS MUDOU: so-antes={sorted(set(ai)-set(bi))[:10]} "
              f"so-depois={sorted(set(bi)-set(ai))[:10]}")
        total_diff += len(set(ai) ^ set(bi))
    for i in sorted(set(ai) & set(bi)):
        ra, rb = ai[i], bi[i]
        parts = []
        if ra["h"] != rb["h"]:
            parts.append("element")
        if ra["hb"] != rb["hb"]:
            parts.append("::before")
        if ra["ha"] != rb["ha"]:
            parts.append("::after")
        if parts:
            total_diff += 1
            if shown < maxshow:
                shown += 1
                print(f"[{name}] #{i} {ra['p']}")
                print(f"        class={ra['c']!r}  mudou: {', '.join(parts)}")

print()
if total_diff == 0:
    print("IDENTICO — estilo computado bate em todas as paginas/viewports/midias.")
    sys.exit(0)
print(f"DIFERENCAS: {total_diff} elemento(s) mudaram"
      + (f" (mostrando os {maxshow} primeiros)" if total_diff > shown else ""))
sys.exit(1)
