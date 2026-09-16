# Simplificar a janela compacta e separar detalhes do lançamento

## Comportamento confirmado
- Clicar no espaço da coluna abre o formulário para adicionar naquela categoria.
- Clicar em um valor já lançado abre os lançamentos daquela categoria e daquele dia.
- Quando houver vários lançamentos, mostrar uma lista simples; tocar em um item abre seus detalhes.
- Os detalhes mostram de imediato somente identificação e valor, com o botão vermelho **Apagar** no topo.
- **Editar** libera somente identificação, valor, repetição e número de parcelas.
- Na repetição mensal, usar automaticamente o mesmo dia da data inicial.

## Alterações
- Remover do formulário de adicionar o bloco “lançamentos deste dia”, o seletor de categoria, a descrição opcional, os atalhos de data, os atalhos 12x/48x/360x e o seletor de dias do mês.
- Manter valor, identificação, data escolhida em maior destaque, repetição, número de parcelas/sem fim e tags.
- Fazer a categoria vir automaticamente da coluna clicada para Entradas, Saídas, Diários, Economias e Cartão.
- Separar a visualização de lançamentos existentes do formulário de adicionar.
- Preservar os dados e cálculos atuais; ao editar, alterar somente os campos permitidos e manter tags, datas, exceções e origem já salvas.
- Manter as opções atuais de exclusão para lançamento único e recorrente dentro do botão vermelho **Apagar**.

## Validação
- Conferir adicionar, listar, abrir detalhes, editar e apagar em todas as cinco categorias.
- Confirmar lançamentos únicos e recorrências diária, semanal e mensal, incluindo “sem fim”.
- Confirmar que Saldos, Horizonte, Totais, Tags, Menu e Economias mantêm seus cálculos atuais.
- Após atualizar a página, testar pelo menos 100 alternâncias na barra lateral em ambas as direções.
