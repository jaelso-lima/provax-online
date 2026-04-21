import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, validateOrigin, errorResponse, getResponseHeaders, corsHeaders } from "../_shared/security-headers.ts";

// ── Prompt Universal ──────────────────────────────────────────────
function buildPrompt(params: {
  modo: string;
  quantidade: number;
  nivel: string;
  filterContext: string;
  ano?: number;
  tipoResposta?: string;
}): string {
  const { modo, quantidade, nivel, filterContext, ano, tipoResposta } = params;

  const nivelInstruction = nivel === "misto"
    ? "mistura de dificuldades (30% fácil, 40% médio, 30% difícil)"
    : `nível ${nivel}`;

  const isCertoErrado = tipoResposta === "certo_errado";
  const isAmbos = tipoResposta === "ambos";

  const questionType = isCertoErrado
    ? "questões do tipo CERTO ou ERRADO (julgamento de afirmativa)"
    : isAmbos
      ? "questões misturadas (metade múltipla escolha A-E, metade certo/errado)"
      : "questões de múltipla escolha (A-E)";

  const base = `Você é um professor especialista brasileiro. Gere exatamente ${quantidade} ${questionType} de ${nivelInstruction}.`;

  const modoInstructions: Record<string, string> = {
    concurso: `Padrão: concursos públicos brasileiros. As questões DEVEM ser realistas e IDÊNTICAS ao estilo de provas anteriores da banca indicada. Use o mesmo formato de enunciado, linguagem técnica, pegadinhas típicas e nível de dificuldade das provas oficiais. Quando uma banca for informada, SIMULE fielmente o estilo dessa banca específica (ex: CESPE/CEBRASPE usa assertivas para julgar, FCC prioriza gramática e literalidade, VUNESP explora interpretação). As alternativas devem ser plausíveis com distratores inteligentes.${ano ? ` Ano de referência: ${ano}.` : ""}`,
    enem: `Padrão: ENEM (Exame Nacional do Ensino Médio). Use textos motivadores curtos, gráficos descritos textualmente quando aplicável, alternativas plausíveis e distratores inteligentes. Priorize competências e habilidades da matriz do ENEM.${ano ? ` Baseadas no estilo do ENEM ${ano}.` : ""}`,
    universidade: `Padrão: provas universitárias de graduação e pós-graduação. Exija raciocínio analítico, aplicação de conceitos teóricos e resolução de problemas com profundidade acadêmica. Inclua fundamentação teórica nas explicações.`,
  };

  // CRITICAL: Math/calculation validation rules
  const mathValidation = `

⚠️ REGRAS CRÍTICAS DE VALIDAÇÃO (OBRIGATÓRIO):
1. ANTES de finalizar cada questão, REFAÇA o cálculo passo a passo e CONFIRA que a resposta está correta.
2. Se o enunciado pede "regra de três SIMPLES", gere APENAS regra de três simples (2 grandezas, proporção direta ou inversa). NÃO gere regra de três composta.
3. Se o enunciado pede "regra de três COMPOSTA", gere APENAS regra de três composta (3+ grandezas).
4. Para QUALQUER questão de matemática/raciocínio lógico: resolva o cálculo manualmente, verifique o resultado, e SÓ ENTÃO atribua a resposta correta.
5. A explicação DEVE conter o cálculo completo passo a passo que comprove a resposta.
6. Se a questão envolve porcentagem, juros, proporção ou qualquer cálculo numérico, a alternativa correta DEVE conter o valor exato do cálculo.
7. NUNCA gere uma questão cujo subtópico/assunto seja diferente do solicitado nos filtros.
8. Se o filtro pede "regra de três simples", NÃO gere questões de "regra de três composta", "equação do 1º grau", ou qualquer outro assunto.
9. VERIFIQUE: a resposta marcada como correta é realmente a resposta certa? Refaça o cálculo antes de confirmar.`;

  let rules: string;
  if (isCertoErrado) {
    rules = `
REGRAS OBRIGATÓRIAS PARA QUESTÕES CERTO/ERRADO:
1. Cada questão DEVE ter exatamente 2 alternativas: [{"letra":"C","texto":"Certo"},{"letra":"E","texto":"Errado"}]
2. O enunciado deve ser uma AFIRMATIVA para ser julgada como Certa ou Errada
3. A resposta_correta deve ser "C" (Certo) ou "E" (Errado)
4. Distribuir ~50% certas e ~50% erradas
5. Explicação detalhada obrigatória justificando por que é certo ou errado
6. Não repetir padrões entre questões
7. Linguagem formal e técnica adequada ao contexto
8. Enunciados claros, sem ambiguidade
9. OBRIGATÓRIO: Cada questão deve incluir o campo "materia_nome" com o nome da matéria/disciplina
10. OBRIGATÓRIO: Cada questão deve incluir o campo "dificuldade" com valor "facil", "medio" ou "dificil"
11. OBRIGATÓRIO: Cada questão deve incluir o campo "tipo_resposta" com valor "certo_errado"`;
  } else if (isAmbos) {
    rules = `
REGRAS OBRIGATÓRIAS PARA QUESTÕES MISTAS:
1. Metade das questões devem ser de múltipla escolha (5 alternativas A-E) e metade do tipo certo/errado (2 alternativas: C=Certo, E=Errado)
2. Para múltipla escolha: exatamente 5 alternativas (A, B, C, D, E), apenas UMA correta
3. Para certo/errado: exatamente 2 alternativas [{"letra":"C","texto":"Certo"},{"letra":"E","texto":"Errado"}], enunciado como afirmativa
4. Explicação detalhada obrigatória para cada questão
5. Não repetir padrões entre questões
6. Linguagem formal e técnica adequada ao contexto
7. OBRIGATÓRIO: Cada questão deve incluir "materia_nome", "dificuldade" e "tipo_resposta" ("multipla_escolha" ou "certo_errado")
8. Para provas completas, siga EXATAMENTE a ordem de matérias da distribuição informada`;
  } else {
    rules = `
REGRAS OBRIGATÓRIAS:
1. Cada questão DEVE ter exatamente 5 alternativas (A, B, C, D, E)
2. Apenas UMA alternativa correta por questão
3. Todas as alternativas devem ser plausíveis e não óbvias
4. Explicação detalhada obrigatória para cada questão, justificando a correta e refutando as incorretas
5. Não repetir padrões entre questões
6. Variar a posição da resposta correta (distribuir entre A-E)
7. Linguagem formal e técnica adequada ao contexto
8. Enunciados claros, sem ambiguidade
9. OBRIGATÓRIO: Cada questão deve incluir o campo "materia_nome" com o nome da matéria/disciplina da questão
10. Para provas completas, siga EXATAMENTE a ordem de matérias da distribuição informada (agrupe questões por matéria na mesma sequência)
11. OBRIGATÓRIO: Cada questão deve incluir o campo "dificuldade" com valor "facil", "medio" ou "dificil"${nivel === "misto" ? "\n12. Para modo MISTO, distribua as dificuldades: ~30% fácil, ~40% médio, ~30% difícil" : ""}`;
  }

  return `${base}\n\n${modoInstructions[modo] || modoInstructions.concurso}\n\n${filterContext ? `Contexto dos filtros: ${filterContext}` : ""}\n\n${rules}${mathValidation}`;
}

// ── Validação de output ───────────────────────────────────────────
function normalizeQuestion(q: any, tipoResposta?: string): any | null {
  if (!q.enunciado || typeof q.enunciado !== "string") return null;
  if (!Array.isArray(q.alternativas) || q.alternativas.length < 2) return null;

  const isCertoErrado = q.tipo_resposta === "certo_errado" || tipoResposta === "certo_errado" ||
    (q.alternativas.length === 2 && q.alternativas.some((a: any) => ["C", "E"].includes(String(a.letra).toUpperCase())));

  if (isCertoErrado) {
    const normalized = [
      { letra: "C", texto: "Certo" },
      { letra: "E", texto: "Errado" },
    ];
    let resposta = String(q.resposta_correta || "").trim().toUpperCase();
    if (!["C", "E"].includes(resposta)) {
      // Try to infer from text
      if (resposta === "CERTO" || resposta === "TRUE" || resposta === "V") resposta = "C";
      else if (resposta === "ERRADO" || resposta === "FALSE" || resposta === "F") resposta = "E";
      else return null;
    }
    return { ...q, alternativas: normalized, resposta_correta: resposta, tipo_resposta: "certo_errado" };
  }

  // Multiple choice
  const validLetters = ["A", "B", "C", "D", "E"];
  const normalized = q.alternativas.slice(0, 5).map((a: any, i: number) => ({
    letra: validLetters[i],
    texto: a.texto || a.text || a.content || String(a.letra === undefined ? a : ""),
  }));
  while (normalized.length < 5) {
    normalized.push({ letra: validLetters[normalized.length], texto: "Nenhuma das anteriores" });
  }

  let resposta = String(q.resposta_correta || "").trim().toUpperCase();
  if (!validLetters.includes(resposta)) {
    if (resposta.length > 1) resposta = resposta.charAt(0);
    if (!validLetters.includes(resposta)) return null;
  }

  return { ...q, alternativas: normalized, resposta_correta: resposta, tipo_resposta: "multipla_escolha" };
}

function validateQuestions(questoes: any[], expectedCount: number, tipoResposta?: string): { valid: boolean; cleaned: any[] } {
  if (!Array.isArray(questoes) || questoes.length === 0) return { valid: false, cleaned: [] };

  const cleaned = questoes.map(q => normalizeQuestion(q, tipoResposta)).filter(Boolean);
  return { valid: cleaned.length >= Math.ceil(expectedCount * 0.5), cleaned };
}

// ── Handler principal ─────────────────────────────────────────────
serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const headers = getResponseHeaders();

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Não autorizado", 401);
    }

    // CSRF check (warning-only for authenticated requests to avoid false negatives in preview/custom domains)
    const originError = validateOrigin(req);
    if (originError) {
      console.warn("Origin validation warning:", originError);
    }

    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Não autorizado", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !authUser) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: corsHeaders });
    }
    const userId = authUser.id;

    // --- Body & Sanitização ---
    const body = await req.json();
    const allowedNiveis = ["facil", "medio", "media", "dificil", "misto"];
    const allowedModos = ["concurso", "enem"];

    const rawQuantidade = typeof body.quantidade === "number" ? body.quantidade : 10;
    const quantidade = body.provaCompleta === true
      ? Math.min(Math.max(rawQuantidade, 5), 100)
      : Math.min(Math.max(rawQuantidade, 5), 50);
    const nivel = allowedNiveis.includes(body.nivel) ? body.nivel : "medio";
    const modo = allowedModos.includes(body.modo) ? body.modo : "concurso";
    const materia = typeof body.materia === "string" ? body.materia.slice(0, 100) : undefined;
    const banca = typeof body.banca === "string" ? body.banca.slice(0, 100) : undefined;
    const carreira = typeof body.carreira === "string" ? body.carreira.slice(0, 100) : undefined;
    const area = typeof body.area === "string" ? body.area.slice(0, 100) : undefined;
    const ano = typeof body.ano === "number" && body.ano >= 1990 && body.ano <= 2030 ? body.ano : undefined;
    const state = typeof body.state === "string" ? body.state.slice(0, 100) : undefined;
    const esfera = typeof body.esfera === "string" ? body.esfera.slice(0, 100) : undefined;
    const topic = typeof body.topic === "string" ? body.topic.slice(0, 100) : undefined;
    const subtopic = typeof body.subtopic === "string" ? body.subtopic.slice(0, 100) : undefined;
    const curso = typeof body.curso === "string" ? body.curso.slice(0, 100) : undefined;
    const provaCompleta = body.provaCompleta === true;
    const distribuicao = typeof body.distribuicao === "string" ? body.distribuicao.slice(0, 2000) : undefined;
    const cadernoContext = typeof body.caderno_context === "string" ? body.caderno_context.slice(0, 3000) : undefined;
    const excludeEnunciados: string[] = Array.isArray(body.exclude_enunciados)
      ? body.exclude_enunciados.slice(0, 200).map((e: any) => String(e).slice(0, 100))
      : [];
    const allowedTipoResposta = ["multipla_escolha", "certo_errado", "ambos"];
    const tipoResposta = allowedTipoResposta.includes(body.tipo_resposta) ? body.tipo_resposta : "multipla_escolha";

    // --- Rate Limiting ---
    const { data: allowed, error: rlError } = await supabase.rpc("check_rate_limit", {
      _user_id: userId,
      _action: "generate_questions",
      _max_count: 10,
      _window_minutes: 60,
    });

    if (rlError || !allowed) {
      return new Response(JSON.stringify({ error: "Limite de requisições atingido. Aguarde alguns minutos." }), { status: 429, headers: corsHeaders });
    }

    // Coin check removed — daily limits and coin deduction handled client-side
    // Edge function just generates questions for authenticated users

    // --- Resolver nomes dos filtros para contexto ---
    const filterParts: string[] = [];

    const resolveFilter = async (table: string, id: string | undefined, label: string) => {
      if (!id) return;
      const { data } = await supabase.from(table).select("nome").eq("id", id).single();
      if (data?.nome) filterParts.push(`${label}: ${data.nome}`);
    };

    await Promise.all([
      resolveFilter("materias", materia, "Matéria"),
      resolveFilter("bancas", banca, "Banca"),
      resolveFilter("carreiras", carreira, "Carreira"),
      resolveFilter("areas", area, "Área"),
      resolveFilter("states", state, "Estado"),
      resolveFilter("esferas", esfera, "Esfera"),
      resolveFilter("topics", topic, "Tópico"),
      resolveFilter("subtopics", subtopic, "Subtópico"),
      resolveFilter("cursos", curso, "Curso"),
    ]);

    // Add prova completa distribution context if provided
    if (provaCompleta && distribuicao) {
      filterParts.push(distribuicao);
    }

    // Add caderno context for personalized notebook-based generation
    if (cadernoContext) {
      filterParts.push(cadernoContext);
    }

    // Add exclusion context to avoid repeating questions
    let excludeContext = "";
    if (excludeEnunciados.length > 0) {
      excludeContext = `\n\nIMPORTANTE: NÃO repita questões similares a estas já respondidas pelo aluno (primeiros 100 caracteres de cada):\n${excludeEnunciados.map((e, i) => `${i + 1}. "${e}"`).join("\n")}\n\nGere questões DIFERENTES e ORIGINAIS sobre o mesmo tema.`;
    }

    // --- Buscar questões reais do banco (PDFs importados e questões oficiais) como referência ---
    let referenceContext = "";
    try {
      let refQuery = supabase
        .from("questoes")
        .select("enunciado, alternativas, resposta_correta, explicacao, source")
        .in("source", ["pdf_imported", "manual", "pdf_extraction"])
        .eq("status_questao", "ativa")
        .limit(8);

      if (materia) refQuery = refQuery.eq("materia_id", materia);
      else if (area) refQuery = refQuery.eq("area_id", area);
      if (banca) refQuery = refQuery.eq("banca_id", banca);
      if (topic) refQuery = refQuery.eq("topic_id", topic);

      const { data: refQuestoes } = await refQuery;

      if (refQuestoes && refQuestoes.length > 0) {
        const examples = refQuestoes.slice(0, 5).map((q: any, i: number) => {
          const alts = Array.isArray(q.alternativas)
            ? q.alternativas.map((a: any) => `${a.letra}) ${a.texto}`).join(" | ")
            : "";
          return `Exemplo ${i + 1}: "${q.enunciado?.slice(0, 200)}" [Alternativas: ${alts.slice(0, 300)}] [Resposta: ${q.resposta_correta}]`;
        });
        referenceContext = `\n\nREFERÊNCIA DE PROVAS ANTERIORES REAIS (use como base de estilo, dificuldade e formato — NÃO copie, mas SIGA O PADRÃO da banca):\n${examples.join("\n")}\n\nGere questões NO MESMO ESTILO e PADRÃO dessas provas anteriores, mas com conteúdo ORIGINAL e INÉDITO.`;
        filterParts.push("Baseado em questões reais de provas anteriores da banca");
      }
    } catch (e) {
      console.warn("Erro ao buscar questões de referência:", e);
    }

    // --- Build prompt universal ---
    const systemPrompt = buildPrompt({
      modo,
      quantidade,
      nivel,
      filterContext: filterParts.join(". "),
      ano,
      tipoResposta,
    }) + excludeContext + referenceContext;

    // --- AI Gateway com tool calling ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const BATCH_SIZE = 15;
    const MODELS = ["google/gemini-2.5-flash", "openai/gpt-5-mini"];

    const callAIWithModel = async (model: string, batchQtd: number, batchContext: string): Promise<any[]> => {
      const batchPrompt = buildPrompt({ modo, quantidade: batchQtd, nivel, filterContext: batchContext || filterParts.join(". "), ano, tipoResposta });

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: batchPrompt },
            { role: "user", content: `Crie ${batchQtd} questões originais e inéditas sobre o tema solicitado. Cada questão deve ser única e criativa.` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_questions",
                description: `Retorna um array de ${batchQtd} questões.`,
                parameters: {
                  type: "object",
                  properties: {
                    questoes: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          enunciado: { type: "string", description: "Texto completo do enunciado" },
                          materia_nome: { type: "string", description: "Nome da matéria/disciplina desta questão" },
                          alternativas: {
                            type: "array",
                            items: {
                              type: "object",
                              properties: {
                                letra: { type: "string" },
                                texto: { type: "string" },
                              },
                              required: ["letra", "texto"],
                              additionalProperties: false,
                            },
                          },
                          resposta_correta: { type: "string", description: tipoResposta === "certo_errado" ? "C ou E" : "A, B, C, D ou E" },
                          explicacao: { type: "string", description: "Explicação detalhada da resposta correta" },
                          dificuldade: { type: "string", enum: ["facil", "medio", "dificil"] },
                          tipo_resposta: { type: "string", enum: ["multipla_escolha", "certo_errado"], description: "Tipo da questão" },
                        },
                        required: ["enunciado", "materia_nome", "alternativas", "resposta_correta", "explicacao", "dificuldade"],
                        additionalProperties: false,
                      },
                    },
                  },
                  required: ["questoes"],
                  additionalProperties: false,
                },
              },
            },
          ],
          tool_choice: { type: "function", function: { name: "return_questions" } },
        }),
      });

      if (!aiResponse.ok) {
        const status = aiResponse.status;
        const errBody = await aiResponse.text();
        console.error(`AI gateway error (${model}):`, status, errBody);
        if (status === 429) throw { userMessage: "Muitas requisições. Aguarde um momento e tente novamente.", status: 429 };
        if (status === 402) throw { userMessage: "Créditos de IA esgotados. Entre em contato com o suporte.", status: 402 };
        throw { userMessage: "Erro ao gerar questões", status: 500 };
      }

      const aiData = await aiResponse.json();
      const finishReason = aiData.choices?.[0]?.finish_reason;
      const nativeReason = aiData.choices?.[0]?.native_finish_reason;

      // Detect RECITATION or error finish reasons
      if (finishReason === "error" || nativeReason === "RECITATION") {
        console.warn(`Model ${model} returned ${nativeReason || finishReason}, will try fallback`);
        throw { recitation: true, userMessage: "Modelo recusou gerar conteúdo", status: 500 };
      }

      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        console.error(`No tool call in response (${model}):`, JSON.stringify(aiData).slice(0, 500));
        throw { recitation: true, userMessage: "Resposta inesperada da IA", status: 500 };
      }

      return JSON.parse(toolCall.function.arguments).questoes;
    };

    const callAIBatch = async (batchQtd: number, batchContext: string): Promise<any[]> => {
      // Try each model in order; fallback on RECITATION errors
      for (const model of MODELS) {
        try {
          return await callAIWithModel(model, batchQtd, batchContext);
        } catch (e: any) {
          if (e.recitation) {
            console.log(`Falling back from ${model} due to RECITATION`);
            continue;
          }
          throw e; // Rate limit or other hard errors
        }
      }
      throw { userMessage: "Nenhum modelo conseguiu gerar as questões. Tente novamente.", status: 500 };
    };

    // --- Build batches for parallel execution ---
    interface BatchJob { qtd: number; context: string; }
    const batches: BatchJob[] = [];

    if (provaCompleta && distribuicao) {
      // For prova completa: split by subject groups from distribution
      // Parse distribution lines like "5 questões de Português"
      const distLines = distribuicao.split("\n").filter((l: string) => l.match(/^\d+ questões de /));
      for (const line of distLines) {
        const match = line.match(/^(\d+) questões de (.+)$/);
        if (!match) continue;
        const subjQtd = parseInt(match[1]);
        const subjName = match[2];
        // Split large subjects into sub-batches
        let remaining = subjQtd;
        while (remaining > 0) {
          const batchQtd = Math.min(remaining, BATCH_SIZE);
          remaining -= batchQtd;
          batches.push({
            qtd: batchQtd,
            context: `${filterParts.join(". ")}. Gere ${batchQtd} questões de ${subjName}. Todas devem ter materia_nome = "${subjName}".`,
          });
        }
      }
    }

    // Fallback: no distribution parsed or non-prova-completa
    if (batches.length === 0) {
      let remaining = quantidade;
      while (remaining > 0) {
        const batchQtd = Math.min(remaining, BATCH_SIZE);
        remaining -= batchQtd;
        batches.push({ qtd: batchQtd, context: filterParts.join(". ") });
      }
    }

    const startedAt = Date.now();
    console.log(`Splitting ${quantidade} questions into ${batches.length} parallel batches`);

    // --- Execute ALL batches in parallel to fit within edge timeout ---
    // Each AI call ~20-40s; running sequentially would exceed 150s easily.
    let questoes: any[] = [];
    let lastError: any = null;

    // Track per-batch shortfall so we can retry just the missing slices
    interface BatchResult { batch: BatchJob; produced: any[]; missing: number; }
    const runBatches = async (jobs: BatchJob[]): Promise<BatchResult[]> => {
      const settled = await Promise.allSettled(
        jobs.map(async (batch) => {
          try {
            const raw = await callAIBatch(batch.qtd, batch.context);
            const { cleaned } = validateQuestions(raw, batch.qtd, tipoResposta);
            return cleaned;
          } catch (e) {
            if ((e as any).status === 429 || (e as any).status === 402) throw e;
            lastError = e;
            return [] as any[];
          }
        })
      );
      return settled.map((r, i) => {
        if (r.status === "fulfilled") {
          const produced = r.value.slice(0, jobs[i].qtd);
          return { batch: jobs[i], produced, missing: Math.max(0, jobs[i].qtd - produced.length) };
        }
        lastError = r.reason;
        if (lastError?.status === 429 || lastError?.status === 402) throw lastError;
        return { batch: jobs[i], produced: [], missing: jobs[i].qtd };
      });
    };

    // Round 1: original batches
    const round1 = await runBatches(batches);
    for (const r of round1) questoes.push(...r.produced);

    // Round 2: retry only the missing portions (if we still have time budget)
    const RETRY_BUDGET_MS = 110_000;
    const shortfalls = round1.filter(r => r.missing > 0);
    if (shortfalls.length > 0 && Date.now() - startedAt < RETRY_BUDGET_MS) {
      const retryJobs: BatchJob[] = shortfalls.map(r => ({
        qtd: r.missing,
        context: r.batch.context,
      }));
      console.log(`Retrying ${retryJobs.length} batches to recover ${retryJobs.reduce((a, b) => a + b.qtd, 0)} missing questions`);
      const round2 = await runBatches(retryJobs);
      for (const r of round2) questoes.push(...r.produced);
    }

    console.log(`Generated ${questoes.length}/${quantidade} questions in ${Date.now() - startedAt}ms`);

    if (questoes.length === 0) {
      return errorResponse(lastError?.userMessage || "Erro ao gerar questões", lastError?.status || 500);
    }

    // --- Post-generation validation for math/calculation questions ---
    const mathKeywords = ["regra de três", "porcentagem", "juros", "proporção", "equação", "cálculo", "razão", "fração", "probabilidade", "progressão", "logaritmo", "raiz", "potência", "média", "mediana"];
    const mathQuestionIndices: number[] = [];
    for (let i = 0; i < questoes.length; i++) {
      const enunciado = (questoes[i].enunciado || "").toLowerCase();
      const materiaNome = (questoes[i].materia_nome || "").toLowerCase();
      if (mathKeywords.some(kw => enunciado.includes(kw) || materiaNome.includes("matemát") || materiaNome.includes("raciocínio"))) {
        mathQuestionIndices.push(i);
      }
    }

    // Skip math validation if we're already close to the timeout (safety margin: 30s)
    const elapsedMs = Date.now() - startedAt;
    const TIMEOUT_BUDGET_MS = 120_000; // leave ~30s headroom before 150s edge timeout
    if (mathQuestionIndices.length > 0 && elapsedMs < TIMEOUT_BUDGET_MS) {
      try {
        const questionsToValidate = mathQuestionIndices.slice(0, 10).map(i => ({
          index: i,
          enunciado: questoes[i].enunciado,
          alternativas: questoes[i].alternativas,
          resposta_correta: questoes[i].resposta_correta,
          explicacao: questoes[i].explicacao,
        }));

        const validationResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              {
                role: "system",
                content: `Você é um verificador matemático rigoroso. Analise cada questão abaixo e verifique:
1. O cálculo está correto? Refaça o cálculo passo a passo.
2. A resposta marcada como correta é realmente a correta?
3. O assunto da questão corresponde ao que foi pedido no enunciado? (ex: se pede regra de três simples, não pode ser composta)

Retorne APENAS as questões que têm ERRO, com a correção.`,
              },
              {
                role: "user",
                content: JSON.stringify(questionsToValidate),
              },
            ],
            tools: [
              {
                type: "function",
                function: {
                  name: "report_errors",
                  description: "Reporta questões com erros de cálculo ou resposta incorreta",
                  parameters: {
                    type: "object",
                    properties: {
                      erros: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            index: { type: "number", description: "Index da questão com erro" },
                            tipo_erro: { type: "string", enum: ["calculo_errado", "resposta_errada", "assunto_errado"] },
                            resposta_corrigida: { type: "string", description: "Letra da resposta correta" },
                            explicacao_corrigida: { type: "string", description: "Explicação com cálculo correto" },
                          },
                          required: ["index", "tipo_erro"],
                        },
                      },
                    },
                    required: ["erros"],
                  },
                },
              },
            ],
            tool_choice: { type: "function", function: { name: "report_errors" } },
          }),
        });

        if (validationResponse.ok) {
          const valData = await validationResponse.json();
          const toolCall = valData.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            const { erros } = JSON.parse(toolCall.function.arguments);
            if (Array.isArray(erros) && erros.length > 0) {
              console.log(`Validation found ${erros.length} errors in math questions`);
              for (const erro of erros) {
                const qi = erro.index;
                if (typeof qi !== "number" || qi < 0 || qi >= questoes.length) continue;
                if (erro.tipo_erro === "assunto_errado") {
                  // Remove question entirely — wrong topic
                  questoes[qi] = null;
                } else if (erro.resposta_corrigida) {
                  // Fix the answer
                  questoes[qi].resposta_correta = erro.resposta_corrigida;
                  if (erro.explicacao_corrigida) {
                    questoes[qi].explicacao = erro.explicacao_corrigida;
                  }
                  console.log(`Corrected question ${qi}: ${erro.tipo_erro} → ${erro.resposta_corrigida}`);
                }
              }
              questoes = questoes.filter(Boolean);
            }
          }
        }
      } catch (valError) {
        console.warn("Math validation failed (non-blocking):", valError);
      }
    }

    return new Response(JSON.stringify({ questoes }), { headers });
  } catch (e: any) {
    console.error("generate-questions error:", e);
    const message = e?.userMessage || (e instanceof Error ? e.message : "Erro interno");
    const status = e?.status || 500;
    return errorResponse(message, status);
  }
});
