import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ── Prompt Universal ──────────────────────────────────────────────
function buildPrompt(params: {
  modo: string;
  quantidade: number;
  nivel: string;
  filterContext: string;
  ano?: number;
}): string {
  const { modo, quantidade, nivel, filterContext, ano } = params;

  const base = `Você é um professor especialista brasileiro. Gere exatamente ${quantidade} questões de múltipla escolha (A-E) de nível ${nivel}.`;

  const modoInstructions: Record<string, string> = {
    concurso: `Padrão: concursos públicos brasileiros. As questões devem ser realistas, no padrão de bancas federais/estaduais/municipais, com alternativas plausíveis e pegadinhas típicas de provas oficiais.${ano ? ` Ano de referência: ${ano}.` : ""}`,
    enem: `Padrão: ENEM (Exame Nacional do Ensino Médio). Use textos motivadores curtos, gráficos descritos textualmente quando aplicável, alternativas plausíveis e distratores inteligentes. Priorize competências e habilidades da matriz do ENEM.${ano ? ` Baseadas no estilo do ENEM ${ano}.` : ""}`,
    universidade: `Padrão: provas universitárias de graduação e pós-graduação. Exija raciocínio analítico, aplicação de conceitos teóricos e resolução de problemas com profundidade acadêmica. Inclua fundamentação teórica nas explicações.`,
  };

  const rules = `
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
10. Para provas completas, siga EXATAMENTE a ordem de matérias da distribuição informada (agrupe questões por matéria na mesma sequência)`;

  return `${base}\n\n${modoInstructions[modo] || modoInstructions.concurso}\n\n${filterContext ? `Contexto dos filtros: ${filterContext}` : ""}\n\n${rules}`;
}

// ── Validação de output ───────────────────────────────────────────
function validateQuestions(questoes: any[], expectedCount: number): { valid: boolean; cleaned: any[] } {
  if (!Array.isArray(questoes) || questoes.length === 0) return { valid: false, cleaned: [] };

  const validLetters = new Set(["A", "B", "C", "D", "E"]);
  const cleaned = questoes.filter((q) => {
    if (!q.enunciado || typeof q.enunciado !== "string") return false;
    if (!Array.isArray(q.alternativas) || q.alternativas.length !== 5) return false;
    if (!q.resposta_correta || !validLetters.has(q.resposta_correta)) return false;
    const letters = q.alternativas.map((a: any) => a.letra);
    if (!["A", "B", "C", "D", "E"].every((l) => letters.includes(l))) return false;
    return true;
  });

  return { valid: cleaned.length >= Math.ceil(expectedCount * 0.8), cleaned };
}

// ── Handler principal ─────────────────────────────────────────────
serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: corsHeaders });
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
    const allowedNiveis = ["facil", "medio", "media", "dificil"];
    const allowedModos = ["concurso", "enem"];

    // For prova_completa, allow any quantity up to 80; otherwise stick to fixed options
    const rawQuantidade = typeof body.quantidade === "number" ? body.quantidade : 10;
    const quantidade = body.provaCompleta === true
      ? Math.min(Math.max(rawQuantidade, 5), 80)
      : ([5, 10, 20, 60].includes(rawQuantidade) ? rawQuantidade : 10);
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
    const curso = typeof body.curso === "string" ? body.curso.slice(0, 100) : undefined;
    const provaCompleta = body.provaCompleta === true;
    const distribuicao = typeof body.distribuicao === "string" ? body.distribuicao.slice(0, 2000) : undefined;

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
      resolveFilter("cursos", curso, "Curso"),
    ]);

    // Add prova completa distribution context if provided
    if (provaCompleta && distribuicao) {
      filterParts.push(distribuicao);
    }

    // --- Build prompt universal ---
    const systemPrompt = buildPrompt({
      modo,
      quantidade,
      nivel,
      filterContext: filterParts.join(". "),
      ano,
    });

    // --- AI Gateway com tool calling ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const BATCH_SIZE = 10; // Max questions per AI call for speed

    const callAIBatch = async (batchQtd: number, batchContext: string): Promise<any[]> => {
      const batchPrompt = buildPrompt({ modo, quantidade: batchQtd, nivel, filterContext: batchContext || filterParts.join(". "), ano });

      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: batchPrompt },
            { role: "user", content: `Gere exatamente ${batchQtd} questões agora.` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_questions",
                description: `Retorna um array de ${batchQtd} questões de múltipla escolha.`,
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
                                letra: { type: "string", enum: ["A", "B", "C", "D", "E"] },
                                texto: { type: "string" },
                              },
                              required: ["letra", "texto"],
                              additionalProperties: false,
                            },
                          },
                          resposta_correta: { type: "string", enum: ["A", "B", "C", "D", "E"] },
                          explicacao: { type: "string", description: "Explicação detalhada da resposta correta" },
                        },
                        required: ["enunciado", "materia_nome", "alternativas", "resposta_correta", "explicacao"],
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
        console.error("AI gateway error:", status, errBody);
        if (status === 429) throw { userMessage: "Muitas requisições. Aguarde um momento e tente novamente.", status: 429 };
        if (status === 402) throw { userMessage: "Créditos de IA esgotados. Entre em contato com o suporte.", status: 402 };
        throw { userMessage: "Erro ao gerar questões", status: 500 };
      }

      const aiData = await aiResponse.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall?.function?.arguments) {
        console.error("No tool call in response:", JSON.stringify(aiData));
        throw { userMessage: "Resposta inesperada da IA", status: 500 };
      }

      return JSON.parse(toolCall.function.arguments).questoes;
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

    console.log(`Splitting ${quantidade} questions into ${batches.length} parallel batches`);

    // --- Execute batches in parallel (max 4 concurrent to avoid rate limits) ---
    const MAX_CONCURRENT = 4;
    let questoes: any[] = [];
    let lastError: any = null;

    for (let i = 0; i < batches.length; i += MAX_CONCURRENT) {
      const chunk = batches.slice(i, i + MAX_CONCURRENT);
      const results = await Promise.allSettled(
        chunk.map(async (batch) => {
          for (let attempt = 0; attempt < 2; attempt++) {
            try {
              const raw = await callAIBatch(batch.qtd, batch.context);
              const { valid, cleaned } = validateQuestions(raw, batch.qtd);
              if (valid) return cleaned;
              console.warn(`Batch validation: ${cleaned.length}/${batch.qtd} valid, retrying...`);
              if (cleaned.length > 0) return cleaned; // Accept partial on retry
            } catch (e) {
              if ((e as any).status === 429 || (e as any).status === 402) throw e;
              lastError = e;
            }
          }
          return [];
        })
      );

      for (const r of results) {
        if (r.status === "fulfilled") {
          questoes.push(...r.value);
        } else {
          lastError = r.reason;
          if (lastError?.status === 429 || lastError?.status === 402) throw lastError;
        }
      }

      // Small delay between chunks to avoid rate limits
      if (i + MAX_CONCURRENT < batches.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    if (questoes.length === 0) {
      return new Response(
        JSON.stringify({ error: lastError?.userMessage || "Erro ao gerar questões" }),
        { status: lastError?.status || 500, headers: corsHeaders }
      );
    }

    return new Response(JSON.stringify({ questoes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("generate-questions error:", e);
    const message = e?.userMessage || (e instanceof Error ? e.message : "Erro interno");
    const status = e?.status || 500;
    return new Response(JSON.stringify({ error: message }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
