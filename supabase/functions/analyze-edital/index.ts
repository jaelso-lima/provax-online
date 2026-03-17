import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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

    const { data: analysis, error: analysisError } = await supabaseAdmin
      .from("edital_analyses").select("*").eq("id", analysis_id).single();
    if (analysisError || !analysis) throw new Error("Análise não encontrada");

    await supabaseAdmin.from("edital_analyses").update({
      status: "processando", updated_at: new Date().toISOString(),
    }).eq("id", analysis_id);

    const { data: pdfBlob, error: dlError } = await supabaseAdmin.storage.from("editais").download(analysis.storage_path);
    if (dlError || !pdfBlob) throw new Error("Erro ao baixar arquivo: " + (dlError?.message || "não encontrado"));
    const pdfArrayBuffer = await pdfBlob.arrayBuffer();
    const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);

    const systemPrompt = `Você é um professor e especialista sênior em concursos públicos brasileiros. Sua tarefa é analisar o edital enviado e criar um GUIA DE ESTUDO COMPLETO E DETALHADO que o aluno possa usar para estudar APENAS pelo seu resumo.

## FLUXO OBRIGATÓRIO:

### PASSO 1 - IDENTIFICAR TODOS OS CARGOS
Leia o edital INTEGRALMENTE. Identifique TODOS os cargos/funções disponíveis.

### PASSO 2 - MAPEAR CONTEÚDO POR CARGO
Para cada cargo, identifique TODAS as disciplinas/matérias do conteúdo programático. Separe claramente:
- Conhecimentos Básicos (comuns a todos os cargos)
- Conhecimentos Específicos (por cargo)

### PASSO 3 - RESUMIR CADA MATÉRIA EM PROFUNDIDADE
Para CADA matéria, crie um resumo COMPLETO e DETALHADO que funcione como material de estudo. O aluno precisa conseguir estudar APENAS lendo seu resumo.

## FORMATO DE RESPOSTA (JSON):

{
  "cargos": ["Cargo 1", "Cargo 2", ...],
  "materias": [
    {
      "nome": "Nome da Matéria (ex: Língua Portuguesa, Informática, Direito Administrativo)",
      "cargos_aplicaveis": ["Cargo 1", "Cargo 2"],
      "explicacao": "Explicação detalhada do que essa matéria aborda e sua importância neste concurso",
      "conteudos_principais": [
        "Item 1 EXATAMENTE como listado no edital",
        "Item 2 EXATAMENTE como listado no edital"
      ],
      "resumo_detalhado": "RESUMO COMPLETO E DIDÁTICO de toda a matéria. Aqui você deve ENSINAR o conteúdo ao aluno de forma clara e objetiva. Explique cada tópico do conteúdo programático com definições, conceitos-chave, regras importantes. Mínimo 500 palavras por matéria. Use linguagem simples e direta. Organize por subtópicos. Este é o coração do guia - o aluno vai estudar por aqui.",
      "macetes": [
        "Mnemônico ou macete de memorização com explicação (ex: LIMPE = Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiência - princípios da administração pública)",
        "Outro macete prático para decorar conteúdo",
        "Dica de memorização usando analogias ou associações"
      ],
      "exemplos": [
        {
          "topico": "Tópico cobrado",
          "exemplo": "Exemplo realista de questão no estilo desta banca com a resposta explicada"
        }
      ],
      "dicas_prova": [
        "Dica específica de como a banca cobra esse assunto",
        "Pegadinhas comuns nessa matéria",
        "O que mais cai segundo o perfil da banca"
      ],
      "estrategia_estudo": "Plano prático: quanto tempo dedicar, o que priorizar, ordem de estudo sugerida, materiais complementares"
    }
  ],
  "info_concurso": {
    "nome": "Nome completo do concurso/órgão",
    "banca": "Banca examinadora",
    "cargo": "Lista resumida dos cargos",
    "total_materias": 0
  }
}

## REGRAS INEGOCIÁVEIS:

1. CADA matéria DEVE ter um "resumo_detalhado" extenso (mínimo 500 palavras) que ENSINE o conteúdo - não apenas liste tópicos
2. "conteudos_principais" deve conter 100% dos itens do edital para aquela matéria
3. "macetes" deve conter pelo menos 3 mnemônicos/truques de memorização PRÁTICOS por matéria
4. Matérias como Informática, Direito, Português etc devem vir DESTRINCHADAS - cada subárea detalhada
5. Se o edital tem Conhecimentos Básicos e Específicos, trate como matérias separadas com cargos corretos
6. Legislação específica deve aparecer como tópico individual
7. O resumo deve ser TÃO COMPLETO que o aluno consiga estudar APENAS por ele
8. Retorne APENAS JSON válido, sem markdown`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 240000); // 4 min for detailed analysis

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
                { type: "text", text: "Analise este edital de forma EXAUSTIVA. Para cada matéria, crie um RESUMO DETALHADO que funcione como guia de estudo completo. Inclua macetes de memorização, dicas práticas e exemplos de questões. O aluno precisa conseguir estudar APENAS pelo seu resumo. DESTRINCHE cada matéria (Informática, Direito, Português, etc) com todos os subtópicos explicados em profundidade:" },
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

      const resultado = extractJsonFromResponse(content);

      await supabaseAdmin.from("edital_analyses").update({
        status: "concluido",
        resultado,
        erro_detalhes: null,
        updated_at: new Date().toISOString(),
      }).eq("id", analysis_id);

      // === Feed edital into question extraction pipeline (with dedup) ===
      try {
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
