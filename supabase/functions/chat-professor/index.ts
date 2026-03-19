import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, validateOrigin, errorResponse, getResponseHeaders } from "../_shared/security-headers.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const headers = getResponseHeaders();

  try {
    // CSRF check
    const originError = validateOrigin(req);
    if (originError) return errorResponse(originError, 403);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return errorResponse("Não autorizado", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return errorResponse("Não autorizado", 401);
    }

    // Get user profile
    const { data: profile } = await supabase
      .from("profiles")
      .select("nome, plano, saldo_moedas")
      .eq("id", user.id)
      .single();

    const userName = profile?.nome || "Estudante";

    // Get user performance data for personalization
    let performanceContext = "";
    try {
      const { data: simulados } = await supabase
        .from("simulados")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "finalizado");

      if (simulados && simulados.length > 0) {
        const simIds = simulados.map((s: any) => s.id);
        
        const { data: respostas } = await supabase
          .from("respostas")
          .select("acertou, questoes(materia_id, materias:materia_id(nome))")
          .in("simulado_id", simIds);

        if (respostas && respostas.length > 0) {
          const materiaMap = new Map<string, { nome: string; total: number; acertos: number }>();
          let totalAcertos = 0;
          let totalErros = 0;

          for (const r of respostas as any[]) {
            const q = r.questoes;
            if (!q?.materia_id) continue;
            const mid = q.materia_id;
            const mname = q.materias?.nome || "?";
            if (!materiaMap.has(mid)) materiaMap.set(mid, { nome: mname, total: 0, acertos: 0 });
            const e = materiaMap.get(mid)!;
            e.total++;
            if (r.acertou) { e.acertos++; totalAcertos++; } else { totalErros++; }
          }

          const stats = Array.from(materiaMap.values())
            .filter(s => s.total >= 2)
            .map(s => ({ ...s, taxa: Math.round((s.acertos / s.total) * 100) }));

          const fracos = [...stats].sort((a, b) => a.taxa - b.taxa).slice(0, 3);
          const fortes = [...stats].sort((a, b) => b.taxa - a.taxa).slice(0, 3);

          performanceContext = `\n\nDADOS REAIS DO ALUNO (use para personalizar):
- Questões respondidas: ${respostas.length}
- Acertos: ${totalAcertos} (${Math.round((totalAcertos / respostas.length) * 100)}%)
- Erros: ${totalErros}`;

          if (fracos.length > 0) {
            performanceContext += `\nPONTOS FRACOS:`;
            for (const f of fracos) performanceContext += `\n- ${f.nome}: ${f.taxa}% (${f.acertos}/${f.total})`;
          }
          if (fortes.length > 0) {
            performanceContext += `\nPONTOS FORTES:`;
            for (const f of fortes) performanceContext += `\n- ${f.nome}: ${f.taxa}% (${f.acertos}/${f.total})`;
          }

          performanceContext += `\n\nUse esses dados para dar recomendações personalizadas. Se o aluno erra muito em alguma matéria, sugira revisão específica, exercícios focados e explicações simplificadas. Elogie os pontos fortes.`;
        }
      }
    } catch (e) {
      console.error("Error loading performance:", e);
    }

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
- IMPORTANTE: Use os dados reais de desempenho do aluno para personalizar suas respostas e recomendações

Você domina: Direito Constitucional, Administrativo, Penal, Civil, Processual, Tributário, Português, Matemática, Raciocínio Lógico, Informática, Atualidades, Administração Pública, Contabilidade, Economia, Legislação do SUS, Saúde Pública, Ciências Humanas, Ciências da Natureza, Linguagens e Redação.
${performanceContext}

Comece sempre sendo acolhedor e pergunte como pode ajudar ${userName} hoje. Se tiver dados de desempenho, mencione brevemente os pontos fortes e sugira focar nos pontos fracos.`;

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
        return errorResponse("Muitas requisições. Aguarde um momento e tente novamente.", 429);
      }
      if (response.status === 402) {
        return errorResponse("Créditos de IA esgotados.", 402);
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return errorResponse("Erro no serviço de IA", 500);
    }

    return new Response(response.body, {
      headers: { ...headers, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat-professor error:", e);
    return errorResponse(e instanceof Error ? e.message : "Erro desconhecido", 500);
  }
});
