import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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

    // --- Body ---
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

    // --- Resolve filter names for prompt context ---
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
    ]);

    // --- Prompt ---
    const filterContext = filterParts.length > 0 ? ` Contexto dos filtros: ${filterParts.join(". ")}.` : "";

    let systemPrompt: string;
    if (modo === "enem") {
      systemPrompt = `Você é um professor especialista em questões do ENEM. Gere ${quantidade} questões de múltipla escolha (A-E) de nível ${nivel}.${filterContext}${ano ? ` Baseadas no estilo do ENEM ${ano}.` : ""} As questões devem seguir o padrão do ENEM com textos motivadores, gráficos descritos textualmente quando aplicável, e alternativas plausíveis. Cada questão deve ter explicação detalhada da resposta correta.`;
    } else if (modo === "universidade") {
      systemPrompt = `Você é um professor universitário especialista. Gere ${quantidade} questões de múltipla escolha (A-E) de nível ${nivel} para provas universitárias.${filterContext} As questões devem ter nível acadêmico universitário, com profundidade teórica e prática adequada ao ensino superior. Inclua questões que exijam raciocínio analítico, aplicação de conceitos e resolução de problemas típicos de provas de graduação e pós-graduação. Cada questão deve ter explicação detalhada da resposta correta com fundamentação teórica.`;
    } else {
      systemPrompt = `Você é um professor especialista em questões de concursos públicos brasileiros. Gere ${quantidade} questões de múltipla escolha (A-E) de nível ${nivel}.${filterContext}${ano ? ` Ano de referência: ${ano}.` : ""} As questões devem ser realistas, no padrão de bancas federais, com alternativas plausíveis e pegadinhas típicas. Cada questão deve ter explicação detalhada.`;
    }

    // --- AI Gateway with tool calling ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

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
                        enunciado: { type: "string", description: "Texto completo do enunciado da questão" },
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
      const body = await aiResponse.text();
      console.error("AI gateway error:", status, body);
      if (status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde um momento e tente novamente." }), { status: 429, headers: corsHeaders });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados. Entre em contato com o suporte." }), { status: 402, headers: corsHeaders });
      }
      return new Response(JSON.stringify({ error: "Erro ao gerar questões" }), { status: 500, headers: corsHeaders });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "Resposta inesperada da IA" }), { status: 500, headers: corsHeaders });
    }

    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({ questoes: parsed.questoes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-questions error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
