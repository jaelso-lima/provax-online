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

    // --- Body ---
    const { tema, texto } = await req.json();
    if (!tema || !texto || texto.trim().length < 100) {
      return new Response(JSON.stringify({ error: "Tema e texto (mín. 100 caracteres) são obrigatórios" }), { status: 400, headers: corsHeaders });
    }

    // --- AI Gateway with tool calling ---
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const systemPrompt = `Você é um corretor experiente de redações no padrão ENEM e concursos federais brasileiros. Avalie a redação com rigor, atribuindo notas de 0 a 200 para cada uma das 5 competências:

Competência 1 - Domínio da norma culta da língua portuguesa escrita
Competência 2 - Compreensão da proposta de redação e aplicação de conceitos das várias áreas do conhecimento
Competência 3 - Seleção, organização e interpretação de informações, fatos, opiniões e argumentos em defesa de um ponto de vista
Competência 4 - Conhecimento dos mecanismos linguísticos necessários para a construção da argumentação (coesão)
Competência 5 - Elaboração de proposta de intervenção para o problema abordado, respeitando os direitos humanos

Seja justo mas criterioso. Identifique pontos fortes, pontos fracos e dê sugestões práticas de melhoria.`;

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
          { role: "user", content: `Tema: "${tema}"\n\nRedação:\n${texto}` },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "return_correction",
              description: "Retorna a correção completa da redação com notas por competência e feedback.",
              parameters: {
                type: "object",
                properties: {
                  nota_total: { type: "number", description: "Soma das 5 competências (0-1000)" },
                  competencia_1: { type: "number", description: "Nota 0-200 para Norma Culta" },
                  competencia_2: { type: "number", description: "Nota 0-200 para Compreensão do Tema" },
                  competencia_3: { type: "number", description: "Nota 0-200 para Argumentação" },
                  competencia_4: { type: "number", description: "Nota 0-200 para Coesão" },
                  competencia_5: { type: "number", description: "Nota 0-200 para Proposta de Intervenção" },
                  pontos_fortes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de pontos fortes identificados na redação",
                  },
                  pontos_fracos: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de pontos fracos identificados na redação",
                  },
                  sugestoes: {
                    type: "array",
                    items: { type: "string" },
                    description: "Lista de sugestões práticas de melhoria",
                  },
                  feedback: { type: "string", description: "Feedback geral detalhado sobre a redação" },
                },
                required: [
                  "nota_total",
                  "competencia_1",
                  "competencia_2",
                  "competencia_3",
                  "competencia_4",
                  "competencia_5",
                  "pontos_fortes",
                  "pontos_fracos",
                  "sugestoes",
                  "feedback",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "return_correction" } },
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
      return new Response(JSON.stringify({ error: "Erro ao corrigir redação" }), { status: 500, headers: corsHeaders });
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      console.error("No tool call in response:", JSON.stringify(aiData));
      return new Response(JSON.stringify({ error: "Resposta inesperada da IA" }), { status: 500, headers: corsHeaders });
    }

    const correction = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(correction), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("correct-essay error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
