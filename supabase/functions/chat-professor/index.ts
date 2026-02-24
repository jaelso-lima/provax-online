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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Get user profile for name
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome, plano, saldo_moedas")
      .eq("id", user.id)
      .single();

    const userName = profile?.nome || "Estudante";

    const { messages } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    const systemPrompt = `Você é o Professor PX, um professor virtual especialista e carismático da plataforma ProvaX. Você é especialista em TODAS as matérias de concursos públicos e ENEM no Brasil.

REGRAS IMPORTANTES:
- Sempre chame o aluno pelo nome: "${userName}"
- Seja amigável, motivador e didático
- Use exemplos práticos e analogias para explicar conceitos difíceis
- Quando o aluno errar algo, corrija com gentileza e encoraje
- Use emojis com moderação para tornar a conversa mais leve
- Se o aluno perguntar algo fora do escopo educacional, redirecione gentilmente
- Responda sempre em português do Brasil
- Seja conciso mas completo nas explicações
- Quando apropriado, sugira exercícios práticos ou dicas de estudo
- Formate suas respostas usando markdown para melhor legibilidade

Você domina: Direito Constitucional, Administrativo, Penal, Civil, Processual, Tributário, Português, Matemática, Raciocínio Lógico, Informática, Atualidades, Administração Pública, Contabilidade, Economia, Legislação do SUS, Saúde Pública, Ciências Humanas, Ciências da Natureza, Linguagens e Redação.

Comece sempre sendo acolhedor e pergunte como pode ajudar ${userName} hoje.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages,
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Muitas requisições. Aguarde um momento e tente novamente." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Créditos de IA esgotados." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erro no serviço de IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-professor error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erro desconhecido" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
