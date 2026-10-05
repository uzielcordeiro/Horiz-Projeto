# Rolagem horizontal do Horizonte

## Alteração
- Conter o gesto horizontal dentro da grade do Horizonte para impedir que o navegador volte de página ao chegar na borda esquerda.
- Preservar a rolagem suave nativa para esquerda e direita, sem alterar os botões ou a barra lateral.

## Validação
- Conferir o Horizonte após recarregar a página e verificar a navegação lateral protegida com pelo menos 100 ativações alternadas.

## Detalhes técnicos
- Aplicar contenção de overscroll apenas ao contêiner rolável do Horizonte, sem listeners globais.
