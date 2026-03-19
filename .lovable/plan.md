

# Plano: Novo Modelo do Edital Master com Fluxo de Seleção de Carreira e Cronograma por Estudo Reverso

## Resumo

Reescrever completamente a funcionalidade "Edital Master" com um novo fluxo em etapas: (1) upload do PDF, (2) IA identifica carreiras/áreas, (3) usuário escolhe a carreira, (4) IA gera guia focado naquela carreira com cronograma baseado em Estudo Reverso (ciclo de 10 dias). O código atual será substituído (página + edge function + PDF generator).

## O que muda para o usuário

1. **Upload do PDF** -- igual ao atual
2. **Tela de seleção de carreira** -- após processamento inicial rápido, o sistema lista todas as áreas/carreiras encontradas no edital (mesmo que seja só uma, sempre pergunta). O usuário seleciona uma.
3. **Geração do guia focado** -- a IA gera o material apenas para a carreira escolhida, com:
   - Cabeçalho com dados do concurso (banca, datas, remuneração, nível)
   - Matérias e tópicos com sub-tópicos, resumo, macetes, dicas e exemplos
   - Cronograma de Estudo Reverso em ciclo de 10 dias (blocos de 40min, 4 blocos/dia, 2h40/dia, repete 3x = 30 dias)
4. **PDF gerado** -- exportação do guia completo

## Plano Técnico

### Etapa 1: Re