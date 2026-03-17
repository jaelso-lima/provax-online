import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const uint8 = new Uint8Array(buffer);
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

    // Download PDF once (reuse for both AI and pipeline)
    const { data: pdfBlob, error: dlError } = await supabaseAdmin.storage.from("editais").download(analysis.storage_path);
    if (dlError || !pdfBlob) throw new Error("Erro ao baixar arquivo: " + (dlError?.message || "não encontrado"));
    const pdfArrayBuffer = await pdfBlob.arrayBuffer();
    const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);

    const systemPrompt = `Você é um especialista sênior em concursos públicos brasileiros com experiência em análise de editais. Sua tarefa é analisar o edital enviado com MÁXIMA PRECISÃO e COMPLETUDE.

## ETAPA 1 - IDENTIFICAÇÃO DE CARGOS
Leia o edital INTEGRALMENTE e identifique TODOS os cargos/funções disponíveis. Muitos editais agrupam cargos por nível (médio, superior) com disciplinas diferentes.

## ETAPA 2 - EXTRAÇÃO EXAUSTIVA DE CONTEÚDO PROGRAMÁTICO
Para CADA cargo, localize a seção de "CONTEÚDO PROGRAMÁTICO" ou "CONHECIMENTOS" no edital. Extraia ABSOLUTAMENTE TODOS os itens listados, sem omitir nenhum. O edital é o documento oficial — cada item listado pode cair na prova.

ATENÇÃO CRÍTICA:
- NÃO resuma nem agrupe tópicos — liste EXATAMENTE como está no edital
- Se o edital lista "1. Compreensão e interpretação de textos. 2. Tipologia textual. 3. Ortografia oficial..." você DEVE listar CADA UM desses itens individualmente
- Editais frequentemente têm seções como "CONHECIMENTOS BÁSICOS" (comuns a todos) e "CONHECIMENTOS ESPECÍFICOS" (por cargo) — capture AMBOS
- Verifique se há legislação específica listada (leis, decretos, instruções normativas) — cada uma deve ser listada

## FORMATO DE RESPOSTA

{
  "cargos": ["Cargo 1", "Cargo 2"],
  "materias": [
    {
      "nome": "Nome exato da Matéria/Disciplina como consta no edital",
      "cargos_aplicaveis": ["Cargo 1", "Cargo 2"],
      "explicacao": "O que essa matéria aborda e por que é importante neste concurso específico",
      "conteudos_principais": [
        "Item 1 EXATAMENTE como listado no edital",
        "Item 2 EXATAMENTE como listado no edital",
        "Item 3 EXATAMENTE como listado no edital"
      ],
      "exemplos": [
        {
          "topico": "Tópico mais cobrado",
          "exemplo": "Exemplo realista de questão no estilo desta banca"
        }
      ],
      "dicas_prova": [
        "Dica específica baseada no perfil desta banca e cargo"
      ],
      "estrategia_estudo": "Plano de estudo prático com prioridades baseadas no peso da matéria"
    }
  ],
  "info_concurso": {
    "nome": "Nome completo do concurso/órgão",
    "banca": "Banca examinadora",
    "cargo": "Lista de todos os cargos",
    "total_materias": 0
  }
}

## REGRAS INEGOCIÁVEIS:
1. "conteudos_principais" deve conter TODOS os itens do conteúdo programático do edital para aquela matéria — 100% de cobertura. Se o edital lista 20 tópicos, retorne os 20. Não corte, não resuma.
2. Cada matéria deve ter "cargos_aplicaveis" corretos — verifique o edital para saber quais cargos cobram aquela disciplina
3. Se houver "Conhecimentos Básicos" e "Conhecimentos Específicos", trate como matérias separadas com os cargos corretos
4. Legislação específica (ex: Lei 8.112/90, Constituição Federal arts. X a Y) deve aparecer como tópico individual em conteudos_principais
5. Exemplos e dicas devem ser específicos da banca identificada, não genéricos
6. Retorne APENAS JSON válido, sem markdown`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 180000); // 3 min for thorough analysis

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
                { type: "text", text: "Analise este edital de forma EXAUSTIVA. Extraia 100% do conteúdo programático listado para cada cargo, sem omitir NENHUM item. Cada tópico do edital é importante para o candidato:" },
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

      // === Feed edital into question extraction pipeline (with dedup) ===
      try {
        // Reuse already-downloaded PDF buffer (no second download)
        const hashBytes = new Uint8Array(await crypto.subtle.digest("SHA-256", pdfArrayBuffer));
        const hashStr = Array.from(hashBytes).map(b => b.toString(16).padStart(2, "0")).join("");

        const { data: existingImport } = await supabaseAdmin
          .from("pdf_imports")
          .select("id")
          .eq("hash_arquivo", hashStr)
          .maybeSingle();

        if (existingImport) {
          console.log(`Duplicate PDF detected (hash: ${hashStr.slice(0, 12)}...), skipping pipeline feed.`);
        } else {
          const importPath = `edital_${analysis_id}_${Date.now()}.pdf`;
          await supabaseAdmin.storage.from("pdf-imports").upload(importPath, new Blob([pdfArrayBuffer], { type: "application/pdf" }), {
            contentType: "application/pdf",
          });

          const bancaNome = resultado?.info_concurso?.banca || null;
          let bancaId = null;
          if (bancaNome) {
            const { data: banca } = await supabaseAdmin
              .from("bancas").select("id").ilike("nome", bancaNome).maybeSingle();
            bancaId = banca?.id || null;
          }

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
