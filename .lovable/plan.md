

# PROVAX — Plataforma SaaS de Preparação para Concursos

## Visão Geral
Plataforma completa de estudo para concursos públicos com simulados gerados por IA, correção de redações, sistema de moedas, gamificação e ranking. Visual profissional com tema claro/escuro, estilo corporativo moderno.

---

## Fase 1 — Fundação: Auth + Banco de Dados + Segurança

### 1.1 Conectar Supabase Externo
- Vincular o projeto Supabase existente do usuário

### 1.2 Banco de Dados Completo
Criar todas as tabelas relacionais:
- **profiles** (id, nome, email, saldo_moedas, nivel, xp, plano, codigo_indicacao, indicado_por)
- **carreiras**, **materias**, **carreira_materias** (N:N)
- **bancas**, **concursos**
- **questoes** (enunciado, alternativas, resposta correta, matéria, banca, dificuldade)
- **simulados** (usuário, tipo, status, pontuação, tempo)
- **respostas** (simulado, questão, resposta do usuário, acertou)
- **redacoes** (usuário, tema, texto, nota, feedback da IA)
- **moeda_transacoes** (usuário, tipo, valor, descrição, timestamp)
- **ranking** (usuário, xp, nível, posição)
- **user_roles** (tabela separada para papéis)
- **audit_logs** (ação, usuário, detalhes, timestamp)

### 1.3 Segurança (RLS + Triggers + RPCs)
- RLS em todas as tabelas
- Tabelas públicas (carreiras, matérias, bancas, concursos, questões): apenas SELECT
- Tabelas privadas: usuário acessa apenas seus próprios dados
- **Trigger anti-fraude**: bloquear UPDATE direto em saldo_moedas, xp, nivel, plano, codigo_indicacao
- **RPCs seguras**: funções para descontar moedas, adicionar XP, subir nível
- **Trigger de profile**: criar profile automaticamente ao cadastrar com código de indicação único
- **audit_logs**: registrar tentativas suspeitas

### 1.4 Autenticação Profissional
- Páginas: `/register`, `/login`, `/forgot-password`, `/reset-password`
- Supabase Auth com confirmação de email obrigatória
- Validação forte de senha (mínimo 8 caracteres, complexidade)
- Proteção contra brute force (bloqueio após tentativas consecutivas)
- onAuthStateChange para gestão de sessão
- Rotas privadas protegidas com redirecionamento

---

## Fase 2 — Core: Simulados + IA + Moedas

### 2.1 Edge Functions com IA (Lovable AI Gateway)
- **generate-questions**: recebe carreira, matéria, banca, quantidade, tipo_prova; valida JWT e saldo; gera questões via IA; desconta moedas via RPC
- **correct-essay**: recebe texto da redação; retorna nota 0-1000, 5 competências, pontos fortes/fracos, sugestões; valida JWT e saldo

### 2.2 Sistema de Simulados
- Página `/simulado` com filtros: carreira, matéria, banca, quantidade (5/10/20)
- Opção "Prova Completa 60 questões" (premium only)
- Interface de prova: questão por questão, navegação, cronômetro real
- Salvamento automático de progresso
- Resultado final com estatísticas detalhadas
- Bloqueio de envio duplo

### 2.3 Sistema de Moedas
- Tabela de custos: 5 questões = 5 moedas, 10 = 10, 20 = 15, 60 = premium
- Validação de saldo no backend (RPC)
- Registro de todas as transações
- Impossibilidade de saldo negativo
- Página `/comprar-moedas` (preparada para Stripe futuro)

### 2.4 Redações
- Página `/redacao` com editor de texto
- Envio para correção via IA
- Exibição da nota e feedback detalhado
- Histórico de redações

---

## Fase 3 — Gamificação + UX Completa

### 3.1 Gamificação
- Sistema de XP: ganhar XP ao completar simulados e redações
- Evolução automática de nível (fórmula progressiva)
- Ranking global (`/ranking`) ordenado por XP
- Sistema de indicação: código único, 20 moedas para quem indica e quem é indicado

### 3.2 Dashboard
- Página `/dashboard` com visão geral: simulados feitos, acertos, nível, XP, saldo de moedas
- Gráficos de desempenho ao longo do tempo
- Últimos simulados e redações

### 3.3 Perfil e Planos
- Página `/perfil`: editar nome, ver código de indicação, histórico
- Página `/planos`: exibir planos free vs premium (preparado para Stripe)

### 3.4 UX Profissional
- Tema claro/escuro com persistência (localStorage)
- Loading states em todas as ações
- Botões desabilitados durante processamento
- Toasts de sucesso/erro
- Validação forte com react-hook-form + zod
- Landing page atrativa na rota `/`
- Design responsivo mobile-first

### 3.5 Preparação para Escala
- Estrutura modular de código (hooks, services, types, components organizados)
- Preparação para integração Stripe
- Controle de acesso por plano em todas as features premium
- Logs estruturados via audit_logs

