# Coluna SAÍDAS com dívidas flexíveis

## O que muda na tela
Ao clicar em um dia e escolher a coluna **saídas**, o formulário ganha campos extras:

1. **Nome da dívida** (ex.: "Gasolina — abastecimento do carro") + etiqueta/categoria como já existe.
2. **Valor por parcela** (o valor informado é o de cada parcela, não o total).
3. **Tipo de lançamento**:
   - Único (só naquele dia, como hoje)
   - Mensal
   - Semanal
4. **Duração**: número de parcelas (12, 48, 360...) **ou** "sem fim (infinita)".
5. **Dias do mês** (quando mensal): permite marcar vários dias, ex.: 3 e 20 — gera um lançamento em cada dia escolhido, todo mês.
6. **Dias da semana** (quando semanal): permite marcar vários dias, ex.: terça e sexta.

## Regras de calendário (Brasil)
- Meses curtos: se o dia escolhido não existe (ex.: 31 em fevereiro), o lançamento cai no **último dia do mês**.
- Datas locais, sem fuso UTC, formato pt-BR, meses/anos infinitos como já funciona.
- Contagem de parcelas: cada ocorrência gerada conta como 1 parcela (ex.: dias 3 e 20 em 12 parcelas = 6 meses).

## Comportamento na tabela
- As ocorrências futuras aparecem normalmente na coluna saídas de cada dia e entram no saldo acumulado.
- No detalhe do dia, cada linha mostra "Nome da dívida · 3/12" para parcelas e "recorrente" para infinitas.
- Excluir: opção de apagar **somente aquela ocorrência** ou **a dívida inteira** (todas as ocorrências).
- Recorrências infinitas são calculadas apenas para o mês visível (performance), então nunca travam ao navegar anos à frente.

## Técnico
- Novo modelo `Recurrence` salvo no localStorage ao lado das entradas avulsas: `{ id, kind: 'saidas', name, label, amount, freq: 'monthly'|'weekly', daysOfMonth[], daysOfWeek[], startDate, installments: number | null }`.
- Ao montar o mês, as ocorrências são expandidas sob demanda e somadas às entradas manuais; o saldo anterior soma todas as ocorrências passadas.
- Exclusões pontuais guardadas como lista de datas ignoradas por recorrência.
- Nada muda nas outras colunas nesta etapa.
