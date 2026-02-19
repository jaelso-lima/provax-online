

# Fase 2 -- Edge Functions de IA (generate-questions + correct-essay)

## O que sera implementado

As paginas de Simulado e Redacao ja chamam `supabase.functions.invoke("generate-questions")` e `supabase.functions.invoke("correct-essay")` mas essas funcoes ainda nao existem. Vamos cria-las usando o Lovable AI Gateway (modelo `google/gemini-3-flash-preview`).

---

## 1. Edge Function: `generate-questions`

**Arquivo:** `supabase/functions/generate-questions/index.ts`

- Recebe: `{ quantidade, nivel, modo, materia?, banca?, carreira?, area?, ano? }`
- Valida JWT do usuario via `getClaims()`
- Monta prompt especifico para modo "concurso" ou "enem"
- Chama Lovable AI Gateway com tool calling para extrair JSON estruturado (array de questoes)
- Cada questao retornada tera: `enunciado`, `alternativas` (A-E), `resposta_correta`, `explicacao`
- Retorna `{ questoes: [...] }`
- Trata erros 429 (rate limit) e 402 (creditos)

## 2. Edge Function: `correct-essay`

**Arquivo:** `supabase/functions/correct-essay/index.ts`

- Recebe: `{ tema, texto }`
- Valida JWT do usuario
- Monta prompt de correcao no padrao ENEM/banca federal (5 competencias, 0-200 cada)
- Chama Lovable AI Gateway com tool calling para extrair:
  - `nota_total` (0-1000)
  - `competencia_1` a `competencia_5` (0-200)
  - `pontos_fortes` (array de strings)
  - `pontos_fracos` (array de strings)
  - `sugestoes` (array de strings)
  - `feedback` (string geral)
- Retorna o objeto completo

## 3. Configuracao

- Atualizar `supabase/config.toml` para registrar ambas funcoes com `verify_jwt = false` (validacao em codigo)
- Usa `LOVABLE_API_KEY` (ja configurado como secret)
- Modelo padrao: `google/gemini-3-flash-preview`

## Detalhes tecnicos

- Ambas funcoes usam CORS headers padrao
- Autenticacao via `getClaims()` no codigo
- Tool calling para garantir output JSON estruturado (sem pedir JSON no prompt)
- Tratamento de erros 429/402 do gateway com mensagens claras para o usuario

