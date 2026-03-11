
# PROVAX – Modelo Universal Definitivo

## 1️⃣ PROMPT UNIVERSAL (Edge Function `generate-questions`)

### Conceito
Um único prompt parametrizado que se adapta ao modo (concurso, enem, universidade) sem duplicação de lógica.

```typescript
// Prompt builder universal
function buildPrompt(params: {
  modo: string;
  quantidade: number;
  nivel: string;
  filterContext: string;
  ano?: number;
}) {
  const { modo, quantidade, nivel, filterContext, ano } = params;

  const base = `Você é um professor especialista brasileiro. Gere exatamente ${quantidade} questões de múltipla escolha (A-E) de nível ${nivel}.`;

  const modoInstructions: Record<string, string> = {
    concurso: `Padrão: concursos públicos brasileiros. As questões devem ser realistas, no padrão de bancas federais/estaduais/municipais, com alternativas plausíveis e pegadinhas típicas.${ano ? ` Ano de referência: ${ano}.` : ""}`,
    enem: `Padrão: ENEM (Exame Nacional do Ensino Médio). Use textos motivadores, gráficos descritos textualmente quando aplicável, alternativas plausíveis e distratores inteligentes.${ano ? ` Baseadas no estilo do ENEM ${ano}.` : ""}`,
    universidade: `Padrão: provas universitárias de graduação e pós-graduação. Exija raciocínio analítico, aplicação de conceitos teóricos e resolução de problemas com profundidade acadêmica. Inclua fundamentação teórica nas explicações.`,
  };

  const rules = `
REGRAS OBRIGATÓRIAS:
1. Cada questão DEVE ter exatamente 5 alternativas (A-E)
2. Apenas UMA alternativa correta por questão
3. Alternativas devem ser plausíveis e não óbvias
4. Explicação detalhada obrigatória para cada questão
5. Não repetir padrões entre questões
6. Variar a posição da resposta correta (não concentrar em uma letra)
7. Linguagem formal e técnica adequada ao contexto`;

  return `${base}\n\n${modoInstructions[modo] || modoInstructions.concurso}\n\n${filterContext ? `Contexto: ${filterContext}` : ""}\n\n${rules}`;
}
```

### Mudanças na Edge Function
- Substituir os 3 blocos `if/else if/else` por chamada ao `buildPrompt()`
- Manter tool calling (structured output) como está
- Adicionar validação de output (verificar 5 alternativas, resposta válida)
- Manter rate limiting e controle de saldo existentes

---

## 2️⃣ MODELO DEFINITIVO DO BANCO (Supabase)

### Schema Atual (já implementado ✅)

```
┌─────────────┐    ┌──────────────┐    ┌──────────────┐
│   states    │    │   esferas    │    │   bancas     │
│ (27 UF+DF) │    │ (3 esferas)  │    │ (bancas)     │
└──────┬──────┘    └──────┬───────┘    └──────┬───────┘
       │                  │                   │
       └──────────┬───────┘                   │
                  ▼                           │
┌─────────────────────────────────────────────┴─────┐
│                    questoes                        │
│  id, enunciado, alternativas, resposta_correta,    │
│  explicacao, materia_id, banca_id, concurso_id,    │
│  state_id, esfera_id, area_id, topic_id,           │
│  ano, modo, dificuldade, status_questao            │
└───┬────────┬────────┬────────┬────────────────────┘
    │        │        │        │
    ▼        ▼        ▼        ▼
┌───────┐┌───────┐┌───────┐┌───────┐
│ areas ││materi-││topics ││concur-│
│       ││  as   ││       ││  sos  │
└───┬───┘└───┬───┘└───────┘└───────┘
    │        │
    ▼        │
┌────────────┴──┐
│ area_materias │  (N:N entre áreas e matérias)
└───────────────┘

┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  simulados   │───▶│  respostas   │───▶│   questoes   │
│              │    │              │    │              │
└──────┬───────┘    └──────────────┘    └──────────────┘
       │
       ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│  profiles    │───▶│  favorites   │    │  redacoes    │
│              │    │              │    │              │
└──────┬───────┘    └──────────────┘    └──────────────┘
       │
       ├──▶ moeda_transacoes
       ├──▶ xp_transactions
       ├──▶ referrals
       ├──▶ rate_limits
       ├──▶ audit_logs
       └──▶ user_roles
```

### Dados Populados ✅
| Tabela | Registros | Modos |
|--------|-----------|-------|
| states | 27 + DF | concurso |
| esferas | 3 (Federal, Estadual, Municipal) | concurso |
| areas | 24 (10 concurso + 4 ENEM + 7 universidade + 3 ambos) | todos |
| materias | 43+ (concurso) + 93 (universidade) | todos |
| area_materias | vínculos N:N | todos |
| topics | ~400 (universidade) | universidade |
| bancas | cadastradas | concurso |
| carreiras | cadastradas | concurso |

### O que NÃO precisa mudar no banco
- **Estrutura está completa** para os 3 modos
- **RLS está correto** em todas as tabelas
- **Índices otimizados** nas colunas de filtro
- **Funções RPC** funcionando (rate limit, moedas, XP, ranking)

### O que pode ser adicionado FUTURAMENTE (sem quebrar nada)
1. `questoes.source` (text) → 'ai_generated' | 'imported' | 'manual' (rastreabilidade)
2. `questoes.verified` (boolean) → moderação de qualidade
3. `simulados.topic_id` (uuid FK → topics) → registro do tópico no simulado
4. `profiles.preferred_modo` (text) → persistir preferência do usuário
5. Tabela `question_reports` → denúncias de questões incorretas

---

## 3️⃣ PLANO DE MIGRAÇÃO EM FASES

### Fase 0 – Estado Atual ✅ (Nenhuma ação)
- Banco completo com todas as tabelas
- 3 modos funcionando (concurso, enem, universidade)
- Filtros em cascata implementados
- Edge function `generate-questions` funcional
- Rate limiting ativo
- RLS em todas as tabelas

### Fase 1 – Prompt Universal (SEM quebrar nada)
**Risco: ZERO** – Apenas refatora lógica interna da edge function

1. Refatorar `generate-questions/index.ts`:
   - Extrair `buildPrompt()` como função pura
   - Substituir os 3 blocos if/else por chamada parametrizada
   - Adicionar validação de output (5 alternativas, letra válida)
   - Adicionar retry automático se a IA retornar formato inválido
2. Deploy e teste com os 3 modos
3. **Rollback**: reverter para versão anterior da edge function

### Fase 2 – Melhorias de Rastreabilidade (OPCIONAL)
**Risco: BAIXO** – Apenas ADD COLUMN, sem alterar existentes

```sql
-- Adicionar coluna de origem (sem quebrar queries existentes)
ALTER TABLE questoes ADD COLUMN IF NOT EXISTS source text DEFAULT 'ai_generated';

-- Adicionar tópico ao simulado (sem quebrar inserts existentes)
ALTER TABLE simulados ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES topics(id);

-- Índice para novas colunas
CREATE INDEX IF NOT EXISTS idx_questoes_source ON questoes(source);
CREATE INDEX IF NOT EXISTS idx_simulados_topic_id ON simulados(topic_id);
```

### Fase 3 – Importador de Questões (FUTURO)
**Risco: BAIXO** – Nova edge function, não altera existentes

1. Criar `import-questions` edge function
2. Aceitar CSV com campos: enunciado, alternativas, resposta, matéria, área, modo
3. Validar e inserir via service_role_key
4. Marcar `source = 'imported'`

### Fase 4 – Moderação e Qualidade (FUTURO)
**Risco: BAIXO** – Novas tabelas e colunas opcionais

1. Adicionar `questoes.verified` boolean
2. Criar tabela `question_reports`
3. UI de moderação para admins

---

## Regras de Segurança para Migração

1. **NUNCA** remover colunas existentes
2. **SEMPRE** usar `ADD COLUMN IF NOT EXISTS` com DEFAULT
3. **SEMPRE** testar edge functions no modo "universidade" + "concurso" + "enem"
4. **NUNCA** alterar RLS policies existentes sem criar novas primeiro
5. **SEMPRE** manter backward compatibility nos payloads da API

## Próximos Passos Recomendados

→ **Implementar Fase 1** (Prompt Universal) – pode ser feito agora
→ Fase 2 quando precisar rastrear origem das questões
→ Fase 3 quando tiver questões reais para importar
→ Fase 4 quando tiver volume de usuários
