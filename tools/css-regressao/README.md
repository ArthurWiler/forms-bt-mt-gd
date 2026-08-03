# Regressão visual do CSS (opcional, roda à mão)

Este repositório não tem build step nem CI, e a conferência de CSS é manual.
Este harness não substitui olhar no navegador — ele responde uma pergunta mais
estreita e objetiva: **"o estilo computado mudou em algum lugar que eu não
esperava?"**

Para cada elemento de cada página, em 7 viewports e em `screen` + `print`,
guarda um hash do estilo computado completo (elemento + `::before` + `::after`).
Qualquer mudança de cascata vira um hash diferente, e o `diff.py` aponta o
elemento exato.

## Instalação

```
pip install playwright
playwright install chromium
```

## Uso

```
python tools/css-regressao/snap.py antes
# ... mexa no CSS ...
python tools/css-regressao/snap.py depois
python tools/css-regressao/diff.py antes depois
```

Sai com código 0 quando está idêntico, 1 quando achou diferença. Os diretórios
de retrato são descartáveis (~4 MB para a varredura completa) — gere em `/tmp`
ou fora do repo.

Rodada completa: 13 páginas × 7 viewports × 2 mídias = 182 arquivos, alguns
minutos. Para iterar rápido, filtre:

```
python tools/css-regressao/snap.py antes --pages home,mt --only-vp w1440
```

## Duas armadilhas que o harness já trata

**1. Tem de ser servido por HTTP.** Em `file://` o `fetch()` dos fragmentos das
etapas morre no CORS, o formulário redireciona para o portal e o retrato mede a
home várias vezes sem reclamar. O `snap.py` sobe um servidor próprio numa porta
livre; e há um guarda-corpo que aborta se uma página cair no portal.

**2. As páginas BT exigem `?mod=` válido.** Sem isso o `btResolverCard()`
(`bt/js/bt-core.js`) manda para `../index.html`. Os ids vivem em
`MODALIDADES_SECOES` (`bt/js/model.js`) e já estão na lista `PAGES`.

Detalhe de implementação: o servidor sobe numa porta diferente a cada rodada e
o navegador resolve `url(...)` para absoluto, então o `snap.py` normaliza a
origem antes de hashear — sem isso todo elemento com `background-image` (os
ícones do `.cmg-aviso`) apareceria como alterado entre dois retratos iguais.

## Cobertura

Viewports escolhidos para cair dos dois lados de cada breakpoint do projeto
(1024, 900, 720, 640, 600): `w1440 w1024 w900 w720 w640 w600 w480`.

`print` está incluído porque os formulários geram PDF/impressão — e os
`@media print` do projeto dependem de `!important` e de vizinhança, que é
exatamente o tipo de coisa que quebra em silêncio.
