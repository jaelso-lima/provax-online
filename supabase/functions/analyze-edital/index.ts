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

function fixBadEscapes(str: string): string {
  return str.replace(/\\([^"\\/bfnrtu])/g, (_match, ch) => {
    if (ch === 'u') return _match;
    return ch;
  });
}

function extractJsonFromResponse(response: string): unknown {
  let cleaned = response
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();

  cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  const jsonStart = cleaned.indexOf('{');
  if (jsonStart === -1) throw new Error("No JSON object found in response");
  cleaned = cleaned.substring(jsonStart);
  cleaned = fixBadEscapes(cleaned);

  try { return JSON.parse(cleaned); } catch (_e) { /* continue */ }

  cleaned = cleaned.replace(/,\s*}/g, "}").replace(/,\s*]/g, "]");

  let braces = 0, brackets = 0;
  for (const char of cleaned) {
    if (char === '{') braces++;
    if (char === '}') braces--;
    if (char === '[') brackets++;
    if (char === ']') brackets--;
  }

  if (braces > 0 || brackets > 0) {
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

  try { return JSON.parse(cleaned); } catch (_e2) {
    cleaned = cleaned.replace(/(?<=:\s*")([\s\S]*?)(?=")/g, (match) => {
      return match.replace(/\n/g, '\\n').replace(/\r/g, '\\r').replace(/\t/g, '\\t');
    });
    try { return JSON.parse(cleaned); } catch (err) {
      throw new Error(`Failed to parse AI response: ${(err as Error).message}`);
    }
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY nao configurada");

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Nao autorizado" }), {
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

    const body = await req.json();
    const { analysis_id, mode, cargo_selecionado, data_prova_usuario } = body;
    if (!analysis_id) throw new Error("analysis_id e obrigatorio");

    const { data: analysis, error: analysisError } = await supabaseAdmin
      .from("edital_analyses").select("*").eq("id", analysis_id).single();
    if (analysisError || !analysis) throw new Error("Analise nao encontrada");

    // ===== MODE: extract_careers =====
    if (mode === "extract_careers") {
      await supabaseAdmin.from("edital_analyses").update({
        status: "extraindo_carreiras", updated_at: new Date().toISOString(),
      }).eq("id", analysis_id);

      const { data: pdfBlob, error: dlError } = await supabaseAdmin.storage.from("editais").download(analysis.storage_path);
      if (dlError || !pdfBlob) throw new Error("Erro ao baixar arquivo");
      const pdfArrayBuffer = await pdfBlob.arrayBuffer();
      const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);

      const extractPrompt = `Voce e um especialista em concursos publicos brasileiros. Analise rapidamente este edital e extraia:

1. TODAS as carreiras/cargos/funcoes disponiveis no edital
2. Informacoes basicas do concurso (raio-x rapido)

Retorne JSON no formato:
{
  "carreiras": [
    {
      "nome": "Nome do cargo/carreira",
      "escolaridade": "Nivel exigido",
      "vagas": "Quantidade ou CR",
      "salario": "Remuneracao"
    }
  ],
  "raio_x_resumido": {
    "orgao": "Nome do orgao",
    "banca": "Banca examinadora",
    "data_prova": "Data se informada",
    "inscricao_inicio": "Inicio inscricoes",
    "inscricao_fim": "Fim inscricoes",
    "taxa_inscricao": "Valor da taxa"
  }
}

REGRAS:
- Liste TODAS as carreiras/cargos mesmo que sejam parecidos
- Se so existir um cargo, liste esse unico cargo
- NAO use acentos ou caracteres especiais (use "a" em vez de "a", "c" em vez de "c")
- Retorne APENAS JSON valido`;

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
              { role: "system", content: extractPrompt },
              {
                role: "user",
                content: [
                  { type: "text", text: "Identifique todos os cargos/carreiras disponiveis neste edital e as informacoes basicas do concurso:" },
                  { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } },
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
          throw new Error(`AI error: ${aiResponse.status}`);
        }

        const aiData = await aiResponse.json();
        const content = aiData.choices?.[0]?.message?.content;
        if (!content) throw new Error("Resposta vazia da IA");

        const resultado = extractJsonFromResponse(content) as any;

        await supabaseAdmin.from("edital_analyses").update({
          status: "carreiras_identificadas",
          carreiras_identificadas: resultado,
          updated_at: new Date().toISOString(),
        }).eq("id", analysis_id);

        return new Response(JSON.stringify({ success: true, carreiras: resultado }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (e: any) {
        clearTimeout(timeout);
        const errMsg = e.name === "AbortError" ? "Tempo limite excedido." : (e.message || "Erro desconhecido");
        await supabaseAdmin.from("edital_analyses").update({
          status: "erro", erro_detalhes: errMsg, updated_at: new Date().toISOString(),
        }).eq("id", analysis_id);
        throw e;
      }
    }

    // ===== MODE: generate_guide (default) =====
    await supabaseAdmin.from("edital_analyses").update({
      status: "processando",
      cargo_selecionado: cargo_selecionado || null,
      updated_at: new Date().toISOString(),
    }).eq("id", analysis_id);

    const { data: pdfBlob, error: dlError } = await supabaseAdmin.storage.from("editais").download(analysis.storage_path);
    if (dlError || !pdfBlob) throw new Error("Erro ao baixar arquivo");
    const pdfArrayBuffer = await pdfBlob.arrayBuffer();
    const pdfBase64 = arrayBufferToBase64(pdfArrayBuffer);

    const cargoFilter = cargo_selecionado
      ? `\n\nIMPORTANTE: O usuario escolheu o cargo "${cargo_selecionado}". Gere o guia APENAS com as materias e topicos relevantes para este cargo especifico. Inclua Conhecimentos Basicos (comuns) + Conhecimentos Especificos deste cargo.`
      : "";

    const systemPrompt = `Voce e um professor e especialista senior em concursos publicos brasileiros com 20 anos de experiencia. Sua tarefa e analisar o edital enviado e criar um GUIA DE ESTUDO MASTER COMPLETO.${cargoFilter}

## FORMATO DE RESPOSTA (JSON):

{
  "raio_x": {
    "orgao": "Nome do orgao",
    "banca": "Banca examinadora",
    "escolaridade": "Nivel de escolaridade",
    "salario_de": "Valor minimo",
    "salario_ate": "Valor maximo",
    "vagas": "Numero de vagas",
    "taxa_inscricao": "Valor da taxa",
    "data_prova": "Data da prova",
    "inscricao_inicio": "Inicio inscricoes",
    "inscricao_fim": "Fim inscricoes",
    "etapas": ["Prova objetiva", "etc"],
    "requisitos": ["Req 1"],
    "observacoes": "Outras informacoes"
  },
  "cargos": ["Cargo selecionado"],
  "materias": [
    {
      "nome": "Nome da Materia",
      "tipo": "basico ou especifico",
      "explicacao": "O que essa materia aborda",
      "conteudos_principais": ["Item 1 do edital", "Item 2"],
      "resumo_detalhado": "RESUMO COMPLETO com definicoes, conceitos, regras. Minimo 500 palavras. Organize por subtopicos.",
      "macetes": ["LIMPE = Legalidade, Impessoalidade, Moralidade, Publicidade, Eficiencia"],
      "exemplos": [{"topico": "Topico", "exemplo": "Exemplo de questao"}],
      "dicas_prova": ["Como a banca cobra", "Pegadinhas comuns"],
      "estrategia_estudo": "Plano pratico"
    }
  ],
  "cronograma_reverso": {
    "regras": {
      "bloco_minutos": 40,
      "blocos_por_dia": 4,
      "total_dia": "2h40",
      "meta_questoes_bloco": "20 a 30",
      "meta_questoes_dia": "80 a 120",
      "meta_30_dias": "+2.500 questoes",
      "ciclo_dias": 10,
      "repeticoes": 3
    },
    "dias": [
      {
        "dia": 1,
        "titulo": "Titulo descritivo do dia",
        "tipo": "estudo",
        "blocos": [
          {"ordem": 1, "materia": "Portugues", "topico": "Interpretacao de Texto", "tipo_atividade": "questoes"},
          {"ordem": 2, "materia": "Administracao", "topico": "PODC", "tipo_atividade": "questoes"},
          {"ordem": 3, "materia": "Lei 8.112", "topico": "Deveres", "tipo_atividade": "questoes"},
          {"ordem": 4, "materia": "Arquivologia", "topico": "Tipos de arquivo", "tipo_atividade": "questoes"}
        ]
      },
      {
        "dia": 7,
        "titulo": "REVISAO INTELIGENTE",
        "tipo": "revisao",
        "blocos": [
          {"ordem": 1, "materia": "Portugues", "topico": "Revisao geral", "tipo_atividade": "revisao"},
          {"ordem": 2, "materia": "Administracao", "topico": "Revisao geral", "tipo_atividade": "revisao"},
          {"ordem": 3, "materia": "Legislacao", "topico": "Revisao geral", "tipo_atividade": "revisao"},
          {"ordem": 4, "materia": "Arquivologia", "topico": "Revisao geral", "tipo_atividade": "revisao"}
        ]
      },
      {
        "dia": 10,
        "titulo": "SIMULADO REAL",
        "tipo": "simulado",
        "blocos": [
          {"ordem": 1, "materia": "Misto", "topico": "Bloco misto - todas materias", "tipo_atividade": "simulado"},
          {"ordem": 2, "materia": "Misto", "topico": "Bloco misto", "tipo_atividade": "simulado"},
          {"ordem": 3, "materia": "Misto", "topico": "Bloco misto", "tipo_atividade": "simulado"},
          {"ordem": 4, "materia": "Correcao", "topico": "Correcao completa", "tipo_atividade": "correcao"}
        ]
      }
    ],
    "como_executar": [
      "Resolver o maximo de questoes no bloco de 40min",
      "Corrigir rapido",
      "Estudar so o erro"
    ],
    "regras_importantes": [
      "Nao travar em questao dificil",
      "Nao voltar teoria antes",
      "Foco total em pratica",
      "Aprender errando"
    ]
  },
  "info_concurso": {
    "nome": "Nome do concurso",
    "banca": "Banca",
    "cargo": "Cargo selecionado",
    "total_materias": 0
  }
}

## REGRAS DO CRONOGRAMA (ESTUDO REVERSO):
1. EXATAMENTE 10 dias no ciclo
2. Cada dia tem EXATAMENTE 4 blocos de 40 minutos
3. Dia 7 = REVISAO INTELIGENTE (revisar materias principais)
4. Dia 10 = SIMULADO REAL (blocos mistos + correcao)
5. Os outros dias distribuem as materias de forma inteligente, priorizando pratica com questoes
6. O ciclo se repete 3x para completar 30 dias
7. Distribua TODAS as materias do edital ao longo dos 10 dias

## REGRAS GERAIS:
1. CADA materia DEVE ter "resumo_detalhado" extenso (minimo 300 palavras)
2. "conteudos_principais" = 100% dos itens do edital
3. "macetes" = minimo 3 mnemonicos por materia
4. Retorne APENAS JSON valido
5. NAO use acentos, cedilhas ou caracteres especiais
6. NAO use barras invertidas exceto para sequencias JSON validas`;

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
                { type: "text", text: `Analise este edital de forma EXAUSTIVA.${cargo_selecionado ? ` Foque APENAS no cargo: ${cargo_selecionado}.` : ""} Extraia raio-x, todas as materias com resumos e macetes, e gere o CRONOGRAMA DE ESTUDO REVERSO em ciclo de 10 dias:` },
                { type: "image_url", image_url: { url: `data:application/pdf;base64,${pdfBase64}` } },
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

      // === Feed into pipeline (non-blocking) ===
      try {
        const hashBytes = new Uint8Array(await crypto.subtle.digest("SHA-256", pdfArrayBuffer));
        const hashStr = Array.from(hashBytes).map(b => b.toString(16).padStart(2, "0")).join("");
        const { data: existingImport } = await supabaseAdmin
          .from("pdf_imports").select("id").eq("hash_arquivo", hashStr).maybeSingle();
        if (!existingImport) {
          const importPath = `edital_${analysis_id}_${Date.now()}.pdf`;
          await supabaseAdmin.storage.from("pdf-imports").upload(importPath, new Blob([pdfArrayBuffer], { type: "application/pdf" }), { contentType: "application/pdf" });
          const bancaNome = (resultado as any)?.info_concurso?.banca || (resultado as any)?.raio_x?.banca || null;
          let bancaId = null;
          if (bancaNome) {
            const { data: banca } = await supabaseAdmin.from("bancas").select("id").ilike("nome", bancaNome).maybeSingle();
            bancaId = banca?.id || null;
          }
          const { data: pdfImport } = await supabaseAdmin.from("pdf_imports").insert({
            nome_arquivo: analysis.file_name || `edital_${analysis_id}.pdf`,
            hash_arquivo: hashStr, storage_path: importPath, uploaded_by: user.id,
            tipo: "concurso", banca_id: bancaId,
            cargo: (resultado as any)?.info_concurso?.cargo || null,
            status_processamento: "pendente",
          }).select("id").single();
          if (pdfImport) {
            fetch(`${supabaseUrl}/functions/v1/process-pdf`, {
              method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${Deno.env.get("SUPABASE_ANON_KEY")}` },
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
      const errMsg = e.name === "AbortError" ? "Tempo limite excedido. Tente novamente." : (e.message || "Erro desconhecido");
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
