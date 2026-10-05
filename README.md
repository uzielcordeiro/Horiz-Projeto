# App Finanças

PROMPT 1 — PRIMEIRA IMPLEMENTAÇÃO DO APLICATIVO FINANCEIRO

Data: 16/08/2026
Versão: 1.0

CONTEXTO DO PROJETO

Estamos desenvolvendo um aplicativo web financeiro cujo conceito central é uma linha do tempo financeira flexível.

O aplicativo não deve ser tratado como um simples gerenciador de receitas e despesas.

A ideia principal é permitir que o usuário registre sua realidade financeira e veja automaticamente como essas informações alteram sua situação ao longo do tempo.

O sistema deverá, futuramente, considerar passado, presente e futuro e recalcular a linha temporal sempre que houver alterações.

IMPORTANTE: neste primeiro passo, NÃO implementar todas essas funcionalidades. Elas apenas servem como contexto para a arquitetura do projeto.

PRIMEIRA ETAPA — ENTRADAS

Neste primeiro momento, quero implementar somente a funcionalidade de ENTRADAS.

Não criar ainda:

Saídas;

Diárias;

Economias;

Gastos com cartão;

Parcelamentos;

Recorrências;

Investimentos;

Relatórios;

Dashboard completo;

Outras funcionalidades.

A prioridade agora é criar uma primeira versão funcional que possamos abrir no navegador e testar.

1. TELA DE ENTRADAS

Criar uma tela simples, limpa e agradável visualmente para registrar uma entrada financeira.

A entrada deverá possuir:

Valor

Campo para informar o valor recebido.

Exemplo:

R$ 2.000,00

Data

Campo para informar a data em que o dinheiro entra na linha temporal.

Identificação / Etiqueta

Campo para identificar a origem da entrada.

Exemplos:

Salário

Freela

Diária

Trabalho extra

Outro

Essa identificação é importante porque, futuramente, o usuário precisará conseguir localizar e organizar suas entradas ao longo dos meses e anos.

A etiqueta não altera o cálculo financeiro.

Ela serve exclusivamente para identificação, organização e futura pesquisa.

2. REGRA DA ENTRADA

A regra é extremamente simples:

Todo valor registrado como entrada é somado ao saldo financeiro.

Exemplo:

Se já existem:

R$ 500,00

e o usuário registra:

R$ 2.000,00

como entrada, o resultado passa a ser:

R$ 2.500,00

Se posteriormente registrar mais:

R$ 1.000,00

o resultado passa a ser:

R$ 3.500,00

Não tentar identificar automaticamente de onde veio o dinheiro.

O usuário informa a identificação.

O sistema apenas registra e calcula.

3. LINHA TEMPORAL

Mesmo nesta primeira etapa, estruturar o funcionamento pensando em uma linha temporal financeira.

Quando uma entrada for registrada em determinada data:

ela deve aparecer naquela data;

deve aumentar o saldo a partir daquele ponto;

os valores futuros afetados devem refletir essa entrada.

Não é necessário implementar ainda todas as categorias financeiras.

Queremos apenas validar o conceito básico:

ENTRADA → SALDO → LINHA TEMPORAL

4. CORES

Implementar somente as três cores definidas para o projeto:

🟢 VERDE

Saldo final igual ou superior a:

R$ 1.000,00

🟡 AMARELO

Saldo final:

maior que R$ 0,00 e menor que R$ 1.000,00

🔴 VERMELHO

Saldo final:

menor que R$ 0,00

Essas cores representam a situação financeira daquele ponto da linha temporal.

5. INTERFACE

A primeira versão deve ser propositalmente simples.

Priorizar:

boa leitura;

espaçamento adequado;

valores fáceis de visualizar;

datas claras;

identificação das entradas;

saldo visível;

indicação visual das três cores.

Não criar uma interface cheia de funcionalidades neste momento.

Queremos primeiro validar o funcionamento.

6. OBJETIVO DESTE PRIMEIRO PASSO

O objetivo é conseguir abrir o aplicativo no navegador e fazer o seguinte:

Escolher uma data.

Informar uma entrada.

Informar o valor.

Informar uma etiqueta.

Salvar.

Ver a entrada registrada.

Ver o saldo atualizado.

Ver a linha temporal refletindo a alteração.

Ver a cor correspondente ao saldo.

7. REGRA IMPORTANTÍSSIMA PARA O DESENVOLVIMENTO

NÃO implementar as próximas etapas ainda.

Não criar funcionalidades que não foram solicitadas neste prompt.

Primeiro quero testar esta primeira implementação funcionando.

Depois que eu testar e aprovar, vou fornecer a próxima instrução.

Faça a implementação desta primeira etapa e deixe o aplicativo funcionando no preview/navegador para que eu possa testar.

Não faça perguntas sobre funcionalidades futuras.

Não avance para a próxima etapa.

Construa somente esta primeira versão funcional de ENTRADAS.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/fdcfee49-29c4-492b-a9bd-a8805d832894).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
