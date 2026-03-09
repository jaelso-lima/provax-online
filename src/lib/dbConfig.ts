/**
 * Database Configuration - Migration Helper
 * 
 * Para migrar para um banco externo, altere APENAS as variáveis de ambiente:
 * 
 * VITE_SUPABASE_URL=https://SEU_NOVO_PROJETO.supabase.co
 * VITE_SUPABASE_PUBLISHABLE_KEY=sua_nova_anon_key
 * 
 * O client em src/integrations/supabase/client.ts já lê dessas variáveis automaticamente.
 * Nenhuma alteração de código é necessária se o novo banco tiver o mesmo schema.
 * 
 * ────────────────────────────────────────────────────
 * MAPEAMENTO DE DEPENDÊNCIAS
 * ────────────────────────────────────────────────────
 * 
 * Repositories (isolados - padrão correto):
 *   - src/repositories/partnerRepository.ts
 *   - src/repositories/documentRepository.ts
 *   - src/repositories/employeeRepository.ts
 *   - src/repositories/examRadarRepository.ts
 *   - src/repositories/pdfImportRepository.ts
 *   - src/services/simuladoRepository.ts
 * 
 * Contextos:
 *   - src/contexts/AuthContext.tsx (auth + profile)
 * 
 * Hooks:
 *   - src/hooks/useAdminRole.ts (user_roles query)
 * 
 * Páginas com queries diretas (refatorar para repositories):
 *   - Dashboard, Simulado, SimuladoResultado, Redacao
 *   - Perfil, Ranking, Planos, ComprarMoedas, ConcursosAbertos
 *   - Admin: todas as páginas em src/pages/admin/
 * 
 * Componentes com queries diretas:
 *   - CascadingFilters, CarreirasList, ChatProfessor, AppHeader
 * 
 * Edge Functions (deploy separado):
 *   - generate-questions, correct-essay, chat-professor
 *   - process-pdf, check-registration, stripe-webhook
 *   - auth-email-hook
 * 
 * ────────────────────────────────────────────────────
 * PASSOS PARA MIGRAÇÃO
 * ────────────────────────────────────────────────────
 * 
 * 1. Exporte o banco atual via pg_dump (ver docs/MIGRATION_GUIDE.md)
 * 2. Importe no novo banco
 * 3. Atualize VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY
 * 4. Redeploy das edge functions no novo projeto
 * 5. Configure os secrets no novo projeto
 * 6. Teste todos os fluxos
 */

// Re-export para uso centralizado (opcional)
export const DATABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL as string,
  anonKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
  projectId: import.meta.env.VITE_SUPABASE_PROJECT_ID as string,
} as const;

// Lista de tabelas do sistema para referência
export const SYSTEM_TABLES = [
  'states', 'esferas', 'bancas', 'carreiras', 'areas', 'materias',
  'cursos', 'plans', 'site_content', 'topics', 'area_materias',
  'curso_materias', 'curso_semestres', 'course_curriculum', 'concursos',
  'carreira_materias', 'banca_distribuicao', 'bank_patterns', 'course_patterns',
  'profiles', 'user_roles', 'questoes', 'simulados', 'respostas',
  'favorites', 'redacoes', 'referrals', 'xp_transactions', 'moeda_transacoes',
  'daily_usage', 'rate_limits', 'audit_logs', 'subscriptions', 'registration_logs',
  'partners', 'partner_contracts', 'partner_payments', 'partner_permissions',
  'partner_profit_simulation', 'temp_employees', 'employee_tasks', 'employee_payments',
  'expenses', 'exam_radar', 'pdf_imports', 'documents', 'document_chunks',
  'document_embeddings', 'question_embeddings', 'plan_features',
] as const;

// Funções RPC necessárias no banco
export const REQUIRED_RPC_FUNCTIONS = [
  'handle_new_user', 'protect_profile_fields', 'is_admin', 'is_owner',
  'is_partner', 'is_employee', 'is_admin_or_partner', 'has_role',
  'check_daily_limit', 'incrementar_uso_diario', 'descontar_moedas',
  'adicionar_moedas', 'adicionar_xp', 'atualizar_plano', 'reset_daily_credits',
  'check_rate_limit', 'get_ranking', 'get_admin_stats', 'get_partner_stats',
  'get_partner_dashboard', 'get_admin_financial_stats', 'admin_list_users',
  'admin_grant_plan', 'admin_cancel_subscription', 'admin_delete_user',
  'admin_update_role', 'suspend_account', 'reactivate_account',
  'activate_plan_from_stripe', 'conceder_xp_indicacao', 'conceder_xp_assinatura',
  'cancelar_referral', 'check_registration_rate', 'validate_partner_percentual',
  'log_partner_changes', 'block_contract_delete', 'auto_create_expense_on_employee_payment',
  'auto_inactivate_expired_exams',
] as const;
