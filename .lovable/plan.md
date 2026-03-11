

# Plano: Integração Stripe + Valor Diário nos Planos

## Resumo

Duas mudanças principais:
1. **Exibir valor diário** nos cards de plano (ex: "R$ 0,80/dia") para agregar valor percebido
2. **Integrar Stripe** para processar pagamentos reais dos planos

## Regra de negócio
Clientes no plano **free** têm acesso apenas às funcionalidades básicas. Funcionalidades avançadas (estatísticas avançadas, filtros completos, ranking, etc.) são liberadas **somente após assinar um plano pago** via Stripe.

## O que precisa ser feito

### 1. Habilitar Stripe no projeto
- Usar a ferramenta nativa de integração Stripe do Lovable
- Será solicitada a **Secret Key do Stripe** (encontrada em https://dashboard.stripe.com/apikeys)
- Isso vai configurar automaticamente webhook e ferramentas de checkout

### 2. Valor diário nos cards de plano
- Calcular `preço / dias` (30, 180 ou 365) para cada período
- Exibir em destaque: **"Apenas R$ X,XX por dia"**
- Arquivo: `src/pages/Planos.tsx`

### 3. Checkout Stripe
- Após habilitar Stripe, conectar os botões "Assinar agora" ao checkout do Stripe
- O webhook `stripe-webhook` já existe e processa `checkout.session.completed`
- O email do usuário será preenchido automaticamente no checkout

## O que você precisa ter em mãos
- **Chave secreta do Stripe** (Secret Key) — encontrada no painel do Stripe em Developers → API Keys
- Os produtos/preços já configurados no Stripe, OU eu posso criá-los via API após habilitar

## Próximo passo
Vou habilitar o Stripe e pedir sua chave secreta. Depois, implemento o valor diário e conecto o checkout. Posso prosseguir?

