import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function pdfToBase64(supabase: any, storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage.from("editais").download(storagePath);
  if (error || !data) throw new Error("Erro ao baixar arquivo: " + (error?.message || "não encontrado"));
  const arrayBuffer = await data.arrayBuffer();
  const uint8 = new Uint8Array(arrayBuffer);
  let binary = "";
  const chunkSize = 8192;
  for (let i = 0; i < uint8.length; i += chunkSize) {
    const chunk = uint8.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
}

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY não configurada");

    // Auth check - pass token explicitly for Lovable Cloud compatibility
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check paid plan
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { data: profileData } = await supabaseAdmin
      .from("profiles").select("plano").eq("id", user.id).single();
    
    if (!profileData || profileData.plano === "free") {
      return new Response(JSON.stringify({ error: "Funcionalidade exclusiva para planos pagos" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { analysis_id } = await req.json();
    if (!analysis_id) throw new Error("analysis_id é obrigatório");

    // Get analysis record
    const { data: analysis, error: analysisError } = await supabaseAdmin
      .from("edital_analyses").select("*").eq("id", analysis_id).single();
    if (analysisError || !analysis) throw new Error("Análise não encontrada");

    // Update status to processing
    await supabaseAdmin.from("edital_analyses").update({
      status: "processando", updated_at: new Date().toISOString(),
    }).eq("id", analysis_id);

    // Download and convert PDF
    const pdfBase64 = await pdfToBase64(supabaseAdmin, analysis.storage_path);

    const systemPrompt = `Você é um especialista em concursos públicos e editais. Analise o edital enviado e extraia TODOS os cargos disponíveis e TODAS as matérias/disciplinas cobradas.

IMPORTANTE: Muitos editais possuem múltiplos cargos com matérias diferentes. Você DEVE identificar cada cargo separadamente e associar as matérias corretas a cada um.

Retorne um objeto JSON com a seguinte estrutura:

{
  "cargos": ["Cargo 1", "Cargo 2", "Cargo 3"],
  "materias": [
    {
      "nome": "Nome da Matéria/Disciplina",
      "cargos_aplicaveis": ["Cargo 1", "Cargo 2"],
      "explicacao": "Explicação simples e direta sobre o que é essa matéria e sua importância no concurso",
      "conteudos_principais": ["tópico 1", "tópico 2", "tópico 3"],
      "exemplos": [
        {
          "topico": "Nome do tópico",
          "exemplo": "Exemplo prático no estilo de prova"
        }
      ],
      "dicas_prova": [
        "O que mais cai nessa matéria",
        "Pegadinhas comuns",
        "Estratégias para resolver questões"
      ],
      "estrategia_estudo": "Como estudar essa matéria com foco em aprovação, incluindo ordem de prioridade e tempo sugerido"
    }
  ],
  "info_concurso": {
    "nome": "Nome do concurso/órgão",
    "banca": "Nome da banca examinadora se identificada",
    "cargo": "Todos os cargos separados por vírgula",
    "total_materias": 0
  }
}

REGRAS:
- O campo "cargos" deve listar TODOS os cargos/funções encontrados no edital
- Cada matéria deve ter "cargos_aplicaveis" indicando para quais cargos ela é cobrada
- Se uma matéria é comum a todos os cargos (ex: Língua Portuguesa), liste todos os cargos em "cargos_aplicaveis"
- Seja objetivo e prático
- Use linguagem acessível
- Foque no que realmente importa para aprovação
- Dê 2 a 3 exemplos por tópico principal
- As dicas devem ser específicas da matéria, não genéricas
- Retorne APENAS o JSON válido, sem markdown`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120000);

    try {
      const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            {
              role: "user",
              content: [
                { type: "text", text: "Analise este edital e extraia todas as matérias com resumos completos:" },
                {
                  type: "image_url",
                  image_url: { url: `data:application/pdf;base64,${pdfBase64}` },
                },
              ],
            },
          ],
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!aiResponse.ok) {
        const errText = await aiResponse.text();
        console.error("AI error:", aiResponse.status, errText);
        
        if (aiResponse.status === 429) {
          await supabaseAdmin.from("edital_analyses").update({
            status: "erro", erro_detalhes: "Limite de requisições atingido. Tente novamente em alguns minutos.",
            updated_at: new Date().toISOString(),
          }).eq("id", analysis_id);
          return new Response(JSON.stringify({ error: "Rate limit exceeded" }), {
            status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        throw new Error(`AI error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const content = aiData.choices?.[0]?.message?.content;
      if (!content) throw new Error("Resposta vazia da IA");

      let resultado;
      try {
        resultado = JSON.parse(content);
      } catch {
        // Try extracting JSON from markdown
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) resultado = JSON.parse(jsonMatch[1]);
        else resultado = JSON.parse(content.replace(/^[^{]*/, "").replace(/[^}]*$/, ""));
      }

      await supabaseAdmin.from("edital_analyses").update({
        status: "concluido",
        resultado,
        erro_detalhes: null,
        updated_at: new Date().toISOString(),
      }).eq("id", analysis_id);

      // === Feed edital into question extraction pipeline ===
      try {
        // Copy file from editais to pdf-imports bucket
        const { data: fileData, error: dlErr } = await supabaseAdmin.storage
          .from("editais").download(analysis.storage_path);
        
        if (fileData && !dlErr) {
          const importPath = `edital_${analysis_id}_${Date.now()}.pdf`;
          await supabaseAdmin.storage.from("pdf-imports").upload(importPath, fileData, {
            contentType: "application/pdf",
          });

          // Compute simple hash
          const hashBuffer = await fileData.arrayBuffer();
          const hashArray = new Uint8Array(hashBuffer);
          let hash = 0;
          for (let i = 0; i < Math.min(hashArray.length, 1024); i++) {
            hash = ((hash << 5) - hash + hashArray[i]) | 0;
          }
          const hashStr = Math.abs(hash).toString(16);

          // Determine banca from AI result
          const bancaNome = resultado?.info_concurso?.banca || null;
          let bancaId = null;
          if (bancaNome) {
            const { data: banca } = await supabaseAdmin
              .from("bancas").select("id").ilike("nome", bancaNome).maybeSingle();
            bancaId = banca?.id || null;
          }

          // Create pdf_imports record
          const { data: pdfImport } = await supabaseAdmin.from("pdf_imports").insert({
            nome_arquivo: analysis.file_name || `edital_${analysis_id}.pdf`,
            hash_arquivo: hashStr,
            storage_path: importPath,
            uploaded_by: user.id,
            tipo: "concurso",
            banca_id: bancaId,
            cargo: resultado?.info_concurso?.cargo || null,
            status_processamento: "pendente",
          }).select("id").single();

          // Trigger process-pdf in background
          if (pdfImport) {
            fetch(`${supabaseUrl}/functions/v1/process-pdf`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}`,
              },
              body: JSON.stringify({ import_id: pdfImport.id }),
            }).catch(e => console.error("Trigger process-pdf error:", e));
          }
        }
      } catch (pipelineErr: any) {
        console.error("Pipeline feed error (non-blocking):", pipelineErr.message);
        // Non-blocking: don't fail the analysis if pipeline feed fails
      }

      return new Response(JSON.stringify({ success: true, resultado }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });

    } catch (e: any) {
      clearTimeout(timeout);
      const isAbort = e.name === "AbortError";
      const errMsg = isAbort ? "Tempo limite excedido. Tente novamente." : (e.message || "Erro desconhecido");
      
      await supabaseAdmin.from("edital_analyses").update({
        status: "erro", erro_detalhes: errMsg, updated_at: new Date().toISOString(),
      }).eq("id", analysis_id);

      throw e;
    }

  } catch (e: any) {
    console.error("analyze-edital error:", e);
    return new Response(JSON.stringify({ error: e.message || "Erro interno" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
