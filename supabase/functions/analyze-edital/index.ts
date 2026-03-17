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

function extractJsonFromResponse(response: string): unknown {
  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  cleaned = cleaned.replace(/[\x00-\x1F\x7F]/g, (ch) => ch === '\n' || ch === '\r' || ch === '\t' ? ch : '');

  const jsonStart = cleaned.indexOf('{');
  if (jsonStart === -1) throw new Error("No JSON object found in response");
  cleaned = cleaned.substring(jsonStart);

  try {
    return JSON.parse(cleaned);
  } catch (_e) {
    console.log("Direct JSON parse failed, attempting repair...");
  }

  cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

  let braces = 0, brackets = 0;
  for (const char of cleaned) {
    if (char === '{') braces++;
    if (char === '}') braces--;
    if (char === '[') brackets++;
    if (char === ']') brackets--;
  }

  if (braces > 0 || brackets > 0) {
    console.log(`JSON truncated: ${braces} unclosed braces, ${brackets} unclosed brackets. Repairing...`);
    cleaned = cleaned.replace(/,?\s*"[^"]*$/g, '');
    cleaned = cleaned.replace(/,?\s*"[^"]*"\s*:\s*$/g, '');
    cleaned = cleaned.replace(/,\s*$/, '');

    braces = 0; brackets = 0;
    for (const char of cleaned) {
      if (char === '{') braces++;
      if (char === '}') braces--;
      if (char === '[') brackets++;
      if (char === ']') brackets--;
    }
    while (brackets > 0) { cleaned += ']'; brackets--; }
    while (braces > 0) { cleaned += '}'; braces--; }
  }

  try {
    return JSON.parse(cleaned);
  } catch (repairErr) {
    console.error("JSON repair failed:", (repairErr as Error).message);
    throw new Error(`Failed to parse AI response: ${(repairErr as Error).message}`);
  }
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

    const systemPrompt = `Voce e um professor e especialista senior em concursos publicos brasileiros com 20 anos de experiencia. Sua tarefa e analisar o edital enviado e criar um GUIA DE ESTUDO MASTER COMPLETO.

## FLUXO OBRIGATORIO:

### PASSO 1 - RAIO-X DO EDITAL
Extraia TODAS as informacoes administrativas do concurso: orgao, banca, cargos disponiveis, requisitos, salarios, datas, vagas, taxa de inscricao, etapas do concurso.

### PASSO 2 - IDENTIFICAR TODOS OS CARGOS
Leia o edital INTEGRALMENTE. Identifique TODOS os cargos/funcoes disponiveis.

### PASSO 3 - MAPEAR CONTEUDO POR CARGO
Para cada cargo, identifique TODAS as disciplinas/materias do conteudo programatico. Separe claramente:
- Conhecimentos Basicos (comuns a todos os cargos)
- Conhecimentos Especificos (por cargo)

### PASSO 4 - RESUMIR CADA MATERIA EM PROFUNDIDADE
Para CADA materia, crie um resumo COMPLETO com macetes de memorizacao.

### PASSO 5 - CRONOGRAMA DE ESTUDOS
Gere um plano de estudos de 4 semanas distribuindo as materias de forma estrategica.

## FORMATO DE RESPOSTA (JSON):

{
  "raio_x": {
    "orgao": "Nome do orgao",
    "banca": "Banca examinadora",
    "escolaridade": "Nivel de escolaridade exigido",
    "salario_de": "Valor minimo ou unico",
    "salario_ate": "Valor maximo (se houver faixa)",
    "vagas": "Numero de vagas",
    "taxa_inscricao": "Valor da taxa",
    "data_prova": "Data da prova (se informada)",
    "inscricao_inicio": "Inicio das inscricoes",
    "inscricao_fim": "Fim das inscricoes",
    "etapas": ["Prova objetiva", "Prova discursiva", "TAF", "etc"],
    "requisitos": ["Requisito 1", "Requisito 2"],
    "observacoes": "Outras informacoes relevantes do edital"
  },
  "cargos": ["Cargo 1", "Cargo 2"],
  "materias": [
    {
      "nome": "Nome da Materia",
      "tipo": "basico ou especifico",
      "cargos_aplicaveis": ["Cargo 1", "Cargo 2"],
      "explicacao": "Explicacao do que essa materia aborda e sua importancia",
      "conteudos_principais": [
        "Item 1 EXATAMENTE como listado no edital",
        "Item 2 EXATAMENTE como listado no edital"
      ],
      "resumo_detalhado": "RESUMO COMPLETO E DIDATICO. Explique cada topico com definicoes, conceitos-chave, regras. Minimo 500 palavras. Organize por subtopicos. O aluno vai estudar por aqui.",
      "macetes": [
        "LIMPE = Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiencia",
        "Outro macete pratico"
      ],
      "exemplos": [
        {
          "topico": "Topico cobrado",
          "exemplo": "Exemplo de questao com resposta explicada"
        }
      ],
      "dicas_prova": [
        "Como a banca cobra esse assunto",
        "Pegadinhas comuns"
      ],
      "estrategia_estudo": "Plano pratico de estudo para essa materia"
    }
  ],
  "cronograma": [
    {
      "semana": 1,
      "titulo": "Titulo da semana",
      "dias": [
        { "dia": "Segunda", "materias": ["Portugues (2h)", "Informatica (1h)"], "foco": "Gramatica basica e hardware" },
        { "dia": "Terca", "materias": ["Raciocinio Logico (2h)", "Legislacao (1h)"], "foco": "Proposicoes e CF/88" },
        { "dia": "Quarta", "materias": ["Portugues (2h)", "Direito Admin (1h)"], "foco": "Interpretacao e principios" },
        { "dia": "Quinta", "materias": ["Informatica (2h)", "Raciocinio Logico (1h)"], "foco": "Redes e conjuntos" },
        { "dia": "Sexta", "materias": ["Legislacao (2h)", "Especificas (1h)"], "foco": "Leis organicas e conteudo tecnico" },
        { "dia": "Sabado", "materias": ["Revisao geral (3h)", "Simulado (2h)"], "foco": "Revisao e pratica" }
      ]
    }
  ],
  "info_concurso": {
    "nome": "Nome completo do concurso",
    "banca": "Banca examinadora",
    "cargo": "Lista resumida dos cargos",
    "total_materias": 0
  }
}

## REGRAS INEGOCIAVEIS:

1. CADA materia DEVE ter "resumo_detalhado" extenso (minimo 500 palavras) que ENSINE o conteudo
2. "conteudos_principais" deve conter 100% dos itens do edital para aquela materia
3. "macetes" deve conter pelo menos 3 mnemonicos/truques de memorizacao PRATICOS por materia
4. Materias como Informatica, Direito, Portugues devem vir DESTRINCHADAS com cada subarea detalhada
5. Separe Conhecimentos Basicos e Especificos com "tipo": "basico" ou "especifico"
6. Legislacao especifica deve aparecer como topico individual
7. O "raio_x" deve conter TODAS as informacoes administrativas encontradas no edital
8. O "cronograma" deve ter EXATAMENTE 4 semanas com distribuicao inteligente das materias
9. Retorne APENAS JSON valido, sem markdown, sem acentos nos valores de texto`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 240000);

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
                { type: "text", text: "Analise este edital de forma EXAUSTIVA. Extraia o raio-x completo, todas as materias com resumos detalhados e macetes, e gere o cronograma de 4 semanas. DESTRINCHE cada materia (Informatica, Direito, Portugues, etc) com todos os subtopicos. NAO PULE NENHUM TOPICO do conteudo especifico:" },
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
            status: "erro", erro_detalhes: "Limite de requisicoes atingido. Tente novamente em alguns minutos.",
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

          const bancaNome = (resultado as any)?.info_concurso?.banca || (resultado as any)?.raio_x?.banca || null;
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
            cargo: (resultado as any)?.info_concurso?.cargo || null,
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
