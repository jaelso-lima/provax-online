
# PROVAX – Plano de Arquitetura Nacional

## Status Atual

### ✅ Fase 1 – Estrutura do Banco (CONCLUÍDA)
- Tabelas criadas: `states` (27 UF + DF), `esferas` (3), `areas` (24 – concurso + enem), `topics`, `area_materias`, `favorites`, `rate_limits`
- Questões expandidas com: `state_id`, `esfera_id`, `area_id`, `topic_id`, `ano`, `modo`
- Simulados expandidos com: `state_id`, `esfera_id`, `area_id`, `modo`
- 43 matérias cadastradas, vinculadas a 24 áreas via `area_materias`
- Índices otimizados em todas as colunas de filtro
- RLS em todas as tabelas
- Função `check_rate_limit()` para controle de abuso
- Dados populados: 27 estados, 3 esferas, 24 áreas, 43 matérias, vínculos área-matéria

### 🔄 Fase 2 – Filtros no Frontend
- Atualizar página de Simulado com filtros: Estado, Esfera, Área, Matéria, Banca, Ano
- Filtros em cascata (área filtra matérias, etc.)
- Modo ENEM com áreas separadas logicamente

### 🔄 Fase 3 – Edge Functions Atualizadas
- Atualizar `generate-questions` para usar novos filtros (state, esfera, area, topic)
- Implementar rate limiting via `check_rate_limit()`
- Validação de filtros no backend (nunca retornar questão fora do filtro)

### 🔄 Fase 4 – Importador de Questões
- Criar edge function para importação em lote via CSV
- Validação automática de campos obrigatórios
- Mapeamento automático de matéria/área/banca por nome

### 🔄 Fase 5 – Segurança Avançada
- Rate limiting implementado (banco pronto)
- Sanitização de payload nas edge functions
- Logs de abuso e tentativas de fraude (audit_logs existente)

## Arquitetura do Banco

```
states ←── questoes ──→ esferas
              ↓
areas ←── area_materias ──→ materias ←── topics
              ↓
         simulados ──→ respostas
              ↓
         profiles ──→ favorites
              ↓
         rate_limits, audit_logs
```

## Escalabilidade
- Banco preparado para 100k+ questões com índices otimizados
- Paginação nativa via Supabase
- Rate limiting por ação/janela de tempo
- Schema 100% portável para Supabase externo
