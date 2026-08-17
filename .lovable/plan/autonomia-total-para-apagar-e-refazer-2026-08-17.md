# Autonomia total para apagar e refazer

## Seleção múltipla
- Botão **selecionar** no topo da tabela liga o modo seleção.
- Cada lançamento (manual ou parcela de dívida) ganha uma caixinha.
- Atalhos: **marcar todos do mês**, **marcar todos de uma coluna** (entradas, saídas, diários, economias, cartão), **limpar seleção**.
- Botão **apagar selecionados** remove tudo o que estiver marcado de uma vez.

## Apagar por partes
- No dia aberto: **apagar lançamentos deste dia**.
- Por coluna: **apagar todos os lançamentos de [coluna] neste mês**.
- Em parcelas/recorrências: as opções atuais continuam — "só esta", "dívida inteira" — e ganham "**desta data em diante**" (encerra a dívida a partir daquele dia, mantendo o histórico anterior).

## Apagar tudo
- Botão **apagar tudo** limpa lançamentos e dívidas de todos os meses, com confirmação em duas etapas (clique e "confirmar").

## Refazer / desfazer
- Toda exclusão vai para um histórico: botão **desfazer** restaura o último estado (até 20 passos), inclusive o "apagar tudo".
- Assim é possível apagar sem medo e refazer do zero ou por partes.

## Técnico
- Histórico como pilha de snapshots `{ entries, recurrences }` em memória, aplicada por um único `commit()` que embrulha qualquer alteração.
- "Desta data em diante" grava `endDate` na recorrência; a expansão passa a respeitar esse limite.
- Persistência no localStorage segue igual; nada muda no cálculo de saldo.
