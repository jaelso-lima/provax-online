# PROVAX – Guia de Migração para Banco Externo

## 📋 Visão Geral

Este guia documenta todos os passos necessários para migrar o PROVAX do Lovable Cloud para uma instância PostgreSQL/Supabase externa.

---

## 1️⃣ Exportar o Schema Completo

Execute no terminal com acesso ao banco atual:

```bash
# Exportar schema (sem dados)
pg_dump --schema-only --no-owner --no-privileges \
  -h db.shloysxkntqvwwjmhggn.supabase.co \
  -U postgres \
  -d postgres \
  --schema=public \
  > schema_provax.sql

# Exportar dados completos
pg_dump --data-only --no-owner \
  -h db.shloysxkntqvwwjmhggn.supabase.co \
  -U postgres \
  -d postgres \
  --schema=public \
  > data_provax.sql

# Exportar tudo (schema + dados)
pg_dump --no-owner --no-privileges \
  -h db.shloysxkntqvwwjmhggn.supabase.co \
  -U postgres \
  -d postgres \
  --schema=public \
  > full_provax.sql
```

Ou via SQL no painel do Lovable Cloud (Run SQL):

```sql
-- Listar todas as tabelas
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' ORDER BY table_name;
```

---

## 2️⃣ Tabelas do Sistema (ordem de criação)

As tabelas devem ser criadas nesta ordem para respeitar foreign keys:

### Independentes (sem FK externa)
1. `states` – 28 registros (27 UF + DF)
2. `esferas` – 3 registros
3. `bancas` – bancas de concurso
4. `carreiras` – carreiras de concurso
5. `areas` – áreas de conhecimento (modos: concurso, enem, universidade, ambos)
6. `materias` – disciplinas/matérias
7. `cursos` – cursos universitários
8. `plans` – planos de assinatura
9. `site_content` – CMS do site

### Com FK simples
10. `topics` → materias
11. `area_materias` → areas, materias
12. `curso_materias` → cursos, materias
13. `curso_semestres` → cursos, materias
14. `course_curriculum` → cursos
15. `concursos` → bancas, carreiras
16. `carreira_materias` → carreiras, materias
17. `banca_distribuicao` → bancas, areas, materias, carreiras
18. `bank_patterns` (independente)
19. `course_patterns` → cursos

### Auth-dependentes (precisam de profiles primeiro)
20. `profiles` – perfis de usuário (id = auth.users.id)
21. `user_roles` – roles (admin, owner, partner, user)
22. `questoes` → areas, bancas, concursos, cursos, esferas, materias, states, topics
23. `simulados` → areas, bancas, carreiras, cursos, esferas, materias, states, topics
24. `respostas` → simulados, questoes
25. `favorites` → questoes
26. `redacoes`
27. `referrals`
28. `xp_transactions` → referrals
29. `moeda_transacoes`
30. `daily_usage`
31. `rate_limits`
32. `audit_logs`
33. `subscriptions` → plans
34. `registration_logs`

### Módulos de negócio
35. `partners` → profiles
36. `partner_contracts` → partners
37. `partner_payments` → partners
38. `partner_permissions` → partners
39. `partner_profit_simulation` → partners
40. `temp_employees` → profiles
41. `employee_tasks` → temp_employees
42. `employee_payments` → temp_employees
43. `expenses`
44. `exam_radar`

### Documentos e IA
45. `pdf_imports` → areas, bancas, cursos
46. `documents` → pdf_imports
47. `document_chunks` → documents
48. `document_embeddings` → documents, document_chunks
49. `question_embeddings` → questoes
50. `plan_features` → plans

---

## 3️⃣ Funções RPC Necessárias

As seguintes funções devem ser recriadas no banco externo:

| Função | Propósito |
|--------|-----------|
| `handle_new_user()` | Trigger: cria profile + role no cadastro |
| `protect_profile_fields()` | Trigger: protege campos sensíveis |
| `is_admin()` | Verifica se é admin/owner |
| `is_owner()` | Verifica se é owner |
| `is_partner()` | Verifica se é partner |
| `is_employee()` | Verifica se é employee ativo |
| `is_admin_or_partner()` | Verifica admin ou partner |
| `has_role(uuid, app_role)` | Verifica role específica |
| `check_daily_limit(uuid)` | Verifica limite diário de questões |
| `incrementar_uso_diario(uuid, int)` | Incrementa uso diário |
| `descontar_moedas(uuid, int, text)` | Desconta moedas do saldo |
| `adicionar_moedas(uuid, int, text)` | Adiciona moedas |
| `adicionar_xp(uuid, int)` | Adiciona XP com level up |
| `atualizar_plano(uuid, text)` | Atualiza plano do perfil |
| `reset_daily_credits(uuid)` | Reset diário de créditos |
| `check_rate_limit(uuid, text, int, int)` | Rate limiting |
| `get_ranking()` | Ranking público de XP |
| `get_admin_stats()` | Estatísticas admin |
| `get_partner_stats()` | Estatísticas partner |
| `get_partner_dashboard(uuid)` | Dashboard do partner |
| `get_admin_financial_stats()` | Stats financeiras |
| `admin_list_users(text, int, int)` | Listar usuários |
| `admin_grant_plan(uuid, text, text, int, text)` | Liberar plano manual |
| `admin_cancel_subscription(uuid)` | Cancelar assinatura |
| `admin_delete_user(uuid)` | Excluir usuário |
| `admin_update_role(uuid, app_role)` | Alterar role |
| `suspend_account(uuid, text)` | Suspender conta |
| `reactivate_account(uuid)` | Reativar conta |
| `activate_plan_from_stripe(uuid, text)` | Ativar plano via Stripe |
| `conceder_xp_indicacao(uuid, uuid)` | XP por indicação |
| `conceder_xp_assinatura(uuid)` | XP por assinatura |
| `cancelar_referral(uuid, text)` | Cancelar indicação |
| `check_registration_rate(text, text)` | Rate limit de registro |
| `validate_partner_percentual()` | Trigger: valida % partner |
| `log_partner_changes()` | Trigger: auditoria partners |
| `block_contract_delete()` | Trigger: impede exclusão contrato |
| `auto_create_expense_on_employee_payment()` | Trigger: gera despesa |
| `auto_inactivate_expired_exams()` | Inativa concursos expirados |

---

## 4️⃣ Enum Personalizado

```sql
CREATE TYPE public.app_role AS ENUM ('admin', 'owner', 'partner', 'user');
```

---

## 5️⃣ Storage Buckets

| Bucket | Público | Uso |
|--------|---------|-----|
| `pdf-imports` | Não | PDFs de provas importadas |

---

## 6️⃣ Edge Functions

As seguintes edge functions precisam ser reimplantadas:

| Função | Propósito |
|--------|-----------|
| `generate-questions` | Geração de questões via IA |
| `correct-essay` | Correção de redações via IA |
| `chat-professor` | Chat com professor IA |
| `process-pdf` | Processamento de PDFs importados |
| `check-registration` | Validação de registro |
| `stripe-webhook` | Webhook do Stripe |
| `auth-email-hook` | Templates de email |

---

## 7️⃣ Secrets Necessários

| Secret | Uso |
|--------|-----|
| `SUPABASE_SERVICE_ROLE_KEY` | Operações admin nas edge functions |
| `LOVABLE_API_KEY` | Integração com IA |
| `SUPABASE_URL` | URL do banco |
| `SUPABASE_ANON_KEY` | Chave pública |

---

## 8️⃣ Alterações no Código (após migração)

### Arquivo único a alterar: `src/lib/dbConfig.ts`

```typescript
// Altere APENAS estas variáveis para apontar ao novo banco
export const DB_URL = 'https://SEU_NOVO_PROJETO.supabase.co';
export const DB_ANON_KEY = 'sua_nova_anon_key';
```

### Arquivos com imports diretos do Supabase (40 arquivos)

Todos importam de `@/integrations/supabase/client`. Com o `dbConfig.ts`, basta alterar as variáveis de ambiente:

```env
VITE_SUPABASE_URL=https://SEU_NOVO_PROJETO.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_nova_anon_key
```

### Repositórios já isolados ✅
- `src/repositories/partnerRepository.ts`
- `src/repositories/documentRepository.ts`
- `src/repositories/employeeRepository.ts`
- `src/repositories/examRadarRepository.ts`
- `src/repositories/pdfImportRepository.ts`
- `src/services/simuladoRepository.ts`

### Páginas com chamadas diretas (precisam de refatoração futura)
- `src/pages/Simulado.tsx` – queries e mutations diretas
- `src/pages/SimuladoResultado.tsx` – queries diretas
- `src/pages/Dashboard.tsx` – queries diretas
- `src/pages/Redacao.tsx` – queries diretas
- `src/pages/Perfil.tsx` – queries diretas
- `src/pages/Ranking.tsx` – RPC direta
- `src/pages/Planos.tsx` – queries diretas
- `src/pages/ComprarMoedas.tsx` – RPC direta
- `src/pages/ConcursosAbertos.tsx` – queries diretas
- `src/pages/admin/*` – todas as páginas admin
- `src/components/CascadingFilters.tsx` – queries diretas
- `src/components/CarreirasList.tsx` – queries diretas
- `src/components/ChatProfessor.tsx` – edge function call
- `src/contexts/AuthContext.tsx` – auth + profile queries

---

## 9️⃣ Checklist de Migração

- [ ] Exportar schema via pg_dump
- [ ] Exportar dados via pg_dump
- [ ] Criar banco no novo Supabase/PostgreSQL
- [ ] Importar schema
- [ ] Importar dados
- [ ] Recriar enum `app_role`
- [ ] Recriar todas as funções RPC
- [ ] Recriar triggers
- [ ] Configurar RLS policies
- [ ] Criar storage bucket `pdf-imports`
- [ ] Deploy edge functions no novo projeto
- [ ] Configurar secrets no novo projeto
- [ ] Atualizar variáveis de ambiente (.env)
- [ ] Testar autenticação
- [ ] Testar simulado (3 modos)
- [ ] Testar redação
- [ ] Testar painel admin
- [ ] Testar painel partner
- [ ] Testar painel employee
- [ ] Verificar rate limiting
- [ ] Verificar sistema de moedas/XP
