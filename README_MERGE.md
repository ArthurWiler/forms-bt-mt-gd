# Projeto mesclado — Portal CEMIG (BT + MT + Loteamento)

## Estrutura
- `/` (raiz)  → app React do formulário BT; a tela inicial é o seletor de modalidades (com as imagens do portal MT).
- `/mt/`      → formulário de Média Tensão (preservado, intacto).
- `/loteamento/` → formulário de loteamento (preservado, intacto).
- `/assets/portal/` → imagens reais das modalidades (usadas pelo seletor BT).

## Comportamento do seletor (raiz)
- Cards BT (casas, comércio, indústria, rural, condomínio, coletivo) → entram no fluxo BT interno com pré-preenchimento.
- Cards MT (Indústria/Outros/Irrigante) → "Disponível"; abrem `mt/` (com `?atividade=` quando aplicável).
- Card Loteamento → "Disponível"; abre `loteamento/`.
- Geração Distribuída (Micro/Mini) → "Em breve", sem imagem (placeholder cinza).

## Rodar
Sirva a raiz por HTTP (Babel não carrega os JS via file://):
    python3 -m http.server 8000
Acesse http://localhost:8000
