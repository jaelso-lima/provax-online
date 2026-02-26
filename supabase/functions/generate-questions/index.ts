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
8. Enunciados claros, sem ambiguidade`;

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
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Token inválido" }), { status: 401, headers: corsHeaders });
    }
    const userId = claimsData.claims.sub as string;

    // --- Body & Sanitização ---
    const body = await req.json();
    const allowedQuantidades = [5, 10, 20, 60];
    const allowedNiveis = ["facil", "media", "dificil"];
    const allowedModos = ["concurso", "enem", "universidade"];

    const quantidade = allowedQuantidades.includes(body.quantidade) ? body.quantidade : 10;
    const nivel = allowedNiveis.includes(body.nivel) ? body.nivel : "media";
    const modo = allowedModos.includes(body.modo) ? body.modo : "concurso";
    const materia = typeof body.materia === "string" ? body.materia.slice(0, 100) : undefined;
    const banca = typeof body.banca === "string" ? body.banca.slice(0, 100) : undefined;
    const carreira = typeof body.carreira === "string" ? body.carreira.slice(0, 100) : undefined;
    const area = typeof body.area === "string" ? body.area.slice(0, 100) : undefined;
    const ano = typeof body.ano === "number" && body.ano >= 1990 && body.ano <= 2030 ? body.ano : undefined;
    const state = typeof body.state === "string" ? body.state.slice(0, 100) : undefined;
    const esfera = typeof body.esfera === "string" ? body.esfera.slice(0, 100) : undefined;
    const topic = typeof body.topic === "string" ? body.topic.slice(0, 100) : undefined;

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

    // --- Verificar saldo ---
    const { data: profile } = await supabase.from("profiles").select("saldo_moedas").eq("id", userId).single();
    const custo = quantidade;
    if (!profile || profile.saldo_moedas < custo) {
      return new Response(JSON.stringify({ error: "Saldo insuficiente" }), { status: 402, headers: corsHeaders });
    }

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
    ]);

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

    const callAI = async (): Promise<any[]> => {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: `Gere exatamente ${quantidade} questões agora.` },
          ],
          tools: [
            {
              type: "function",
              function: {
                name: "return_questions",
                description: `Retorna um array de ${quantidade} questões de múltipla escolha.`,
                parameters: {
                  type: "object",
                  properties: {
                    questoes: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          enunciado: { type: "string", description: "Texto completo do enunciado" },
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
                        required: ["enunciado", "alternativas", "resposta_correta", "explicacao"],
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

    // --- Tentativa com retry ---
    let questoes: any[] = [];
    let lastError: any = null;

    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const raw = await callAI();
        const { valid, cleaned } = validateQuestions(raw, quantidade);
        if (valid) {
          questoes = cleaned;
          break;
        }
        console.warn(`Attempt ${attempt + 1}: validation failed, ${cleaned.length}/${quantidade} valid`);
        lastError = { userMessage: "IA retornou questões em formato inválido", status: 500 };
      } catch (e) {
        lastError = e;
        if ((e as any).status === 429 || (e as any).status === 402) throw e;
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
