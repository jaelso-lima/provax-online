

## Plano de Correções

### Problemas Identificados

1. **Landing page (Index.tsx)**: Os botões dos planos Start e Pro mostram apenas o link mensal hardcoded. Não há opção de período (semestral/anual) na landing page — todos os botões apontam para o checkout mensal.

2. **Página /planos (Planos.tsx)**: O preço já usa `text-foreground` (corrigido anteriormente), mas a página lê os links do banco de dados via `stripe_link_mensal`, `stripe_link_semestral`, `stripe_link_anual`. O banco já tem todos os links corretos configurados.

3. **Provax X no banco**: Só tem o link mensal. Como o Provax X é o plano de entrada (R$ 14,90), ele provavelmente só tem período mensal — está correto.

### O que será feito

**Arquivo: `src/pages/Index.tsx`**
- Os botões dos planos Start e Pro na landing page já apontam para os links mensais corretos (`3hXCsif` para Start, `3qht2r5` para Pro)
- Confirmar que o botão do Provax X aponta para `izSd5mz`

**Arquivo: `src/pages/Planos.tsx`** (painel do usuário)
- A página `/planos` já lê os links corretos do banco para cada período. Os links no banco já estão todos configurados corretamente:
  - Start: mensal `3hXCsif`, semestral `5XRiyM1`, anual `ZQG1qpI`
  - Pro: mensal `3qht2r5`, semestral `Zajikxf`, anual `TvMmz9F`
  - Provax X: mensal `izSd5mz`

**Verificação**: O problema real parece ser que os links da Kiwify estavam retornando "Produto não está mais disponível" quando testados anteriormente. 

### Ação necessária do usuário

Preciso que você confirme: **os links que você enviou agora estão ativos na Kiwify?** Os mesmos links foram testados antes e retornaram "produto indisponível". Se você reativou os produtos, os botões já devem funcionar pois o código e o banco já têm os links corretos.

Se os links estão ativos, posso fazer um teste de acesso para confirmar.

