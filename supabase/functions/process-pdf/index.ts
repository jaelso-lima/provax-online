import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { handleCors, validateOrigin, errorResponse, getResponseHeaders, corsHeaders } from "../_shared/security-headers.ts";

async function pdfToBase64(supabase: any, storagePath: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from("pdf-imports")
    .download(storagePath);
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

async function updateImportStatus(supabase: any, importId: string, status: string, details?: string) {
  const update: any = { status_processamento: status, updated_at: new Date().toISOString() };
  if (details) update.erro_detalhes = details;
  else if (status !== "processando") update.erro_detalhes = null;
  await supabase.from("pdf_imports").update(update).eq("id", importId);
}

function splitIntoChunks(text: string, maxChunkSize = 1000): string[] {
  if (!text || text.trim().length === 0) return [];
  const paragraphs = text.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    if ((current + "\n\n" + p).length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = p;
    } else {
      current = current ? current + "\n\n" + p : p;
    }
  }
  if (current.trim().length > 0) chunks.push(current.trim());
  return chunks;
}

// Normalize alternativas from various AI response formats
function normalizeAlternativas(alts: any): { letra: string; texto: string }[] | null {
  if (!alts) return null;
  
  // Already an array
  if (Array.isArray(alts)) {
    return alts
      .filter((a: any) => a && (a.letra || a.letter) && (a.texto || a.text || a.conteudo))
      .map((a: any) => ({
        letra: (a.letra || a.letter || "").toString().toUpperCase(),
        texto: (a.texto || a.text || a.conteudo || "").toString(),
      }));
  }
  
  // Object format like { "A": "text", "B": "text" }
  if (typeof alts === "object") {
    const result: { letra: string; texto: string }[] = [];
    for (const [key, value] of Object.entries(alts)) {
      if (key.match(/^[A-Ea-e]$/) && typeof value === "string") {
        result.push({ letra: key.toUpperCase(), texto: value });
      }
    }
    if (result.length >= 2) return result;
  }
  
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let supabase: any = null;
  let importId: string | null = null;

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Não autorizado");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");

    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { persistSession: false },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) throw new Error("Não autorizado");

    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["admin", "owner"].includes(roleData.role)) {
      throw new Error("Apenas administradores podem processar PDFs");
    }

    const body = await req.json();
    importId = body.import_id;
    const gabaritoStoragePath = body.gabarito_storage_path;
    if (!importId) throw new Error("import_id é obrigatório");

    const { data: importRecord, error: importError } = await supabase
      .from("pdf_imports")
      .select("*")
      .eq("id", importId)
      .single();

    if (importError || !importRecord) throw new Error("Registro de importação não encontrado");

    await updateImportStatus(supabase, importId, "processando");

    if (!lovableApiKey) {
      await updateImportStatus(supabase, importId, "erro", "LOVABLE_API_KEY não configurada");
      throw new Error("API key não configurada");
    }

    // Download main PDF
    console.log("Baixando PDF:", importRecord.storage_path);
    let provaBase64: string;
    try {
      provaBase64 = await pdfToBase64(supabase, importRecord.storage_path);
      console.log("PDF baixado, tamanho base64:", provaBase64.length);
    } catch (e) {
      await updateImportStatus(supabase, importId, "erro", "Erro ao baixar PDF: " + (e as Error).message);
      throw e;
    }

    // Download gabarito PDF
    const effectiveGabaritoPath = gabaritoStoragePath || importRecord.gabarito_storage_path;
    let gabaritoBase64: string | null = null;
    if (effectiveGabaritoPath) {
      try {
        gabaritoBase64 = await pdfToBase64(supabase, effectiveGabaritoPath);
        console.log("Gabarito carregado:", effectiveGabaritoPath);
      } catch (e) {
        console.log("Aviso: gabarito não encontrado:", (e as Error).message);
      }
    }

    // Build AI prompt
    const extractionPrompt = `Analise este PDF de prova/edital de concurso público brasileiro e extraia as seguintes informações.

IMPORTANTE: Retorne APENAS um JSON válido. NÃO inclua o texto completo do documento no JSON.

1. METADADOS:
- banca_organizadora: nome da banca (ex: CESPE, FCC, VUNESP, FGV, IBFC, etc.)
- estado: sigla do estado (ex: SP, RJ, MG, DF)
- concurso_nome: nome completo do concurso
- orgao: órgão que está realizando o concurso
- ano: ano da prova (número)
- cargo: cargo(s) da prova
- area: área de atuação (ex: Administrativa, Tribunais, Fiscal, Policial)

2. RESUMO DO TEXTO:
- texto_resumo: resumo do conteúdo do documento em até 500 palavras

3. QUESTÕES (se for uma prova com questões):
Para cada questão encontrada, extraia:
- numero: número da questão
- enunciado: texto completo do enunciado
- alternativas: array com as alternativas [{"letra": "A", "texto": "..."}, ...]
- materia: matéria/disciplina da questão
- assunto: assunto específico dentro da matéria
- dificuldade: "facil", "media" ou "dificil"
- resposta_correta: letra da resposta correta (A, B, C, D ou E)

${gabaritoBase64 ? "4. O SEGUNDO PDF ANEXADO É O GABARITO OFICIAL. Use-o para associar as respostas corretas a cada questão pelo número." : ""}

IMPORTANTE sobre alternativas: SEMPRE retorne como ARRAY de objetos com "letra" e "texto".

Retorne APENAS este JSON:
{
  "metadata": {
    "banca_organizadora": "...",
    "estado": "...",
    "concurso_nome": "...",
    "orgao": "...",
    "ano": 2024,
    "cargo": "...",
    "area": "..."
  },
  "texto_resumo": "resumo breve do conteúdo...",
  "questoes": [
    {
      "numero": 1,
      "enunciado": "...",
      "alternativas": [
        {"letra": "A", "texto": "..."},
        {"letra": "B", "texto": "..."},
        {"letra": "C", "texto": "..."},
        {"letra": "D", "texto": "..."},
        {"letra": "E", "texto": "..."}
      ],
      "materia": "...",
      "assunto": "...",
      "dificuldade": "media",
      "resposta_correta": "A"
    }
  ]
}

Se não conseguir extrair questões (ex: é um edital), retorne questoes como array vazio.
Se não conseguir identificar algum metadado, use null.`;

    const contentParts: any[] = [
      { type: "text", text: extractionPrompt },
      { type: "image_url", image_url: { url: `data:application/pdf;base64,${provaBase64}` } },
    ];

    if (gabaritoBase64) {
      contentParts.push({
        type: "image_url",
        image_url: { url: `data:application/pdf;base64,${gabaritoBase64}` },
      });
    }

    // Call AI — 120s timeout to stay within Supabase edge function limits
    console.log("Chamando IA...");
    let aiResponse: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000);
      
      aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${lovableApiKey}`,
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [{ role: "user", content: contentParts }],
          temperature: 0.1,
          max_tokens: 64000,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
    } catch (e) {
      const msg = (e as Error).name === "AbortError" 
        ? "Timeout: IA demorou mais de 2 minutos. Tente novamente." 
        : `Erro de conexão com IA: ${(e as Error).message}`;
      await updateImportStatus(supabase, importId, "erro", msg);
      throw new Error(msg);
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      const msg = aiResponse.status === 429
        ? "Rate limit da IA. Tente novamente em alguns minutos."
        : aiResponse.status === 402
        ? "Créditos de IA insuficientes."
        : `Erro na IA (${aiResponse.status}): ${errorText.slice(0, 500)}`;
      await updateImportStatus(supabase, importId, "erro", msg);
      throw new Error(msg);
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || "";
    console.log("Resposta IA recebida, tamanho:", content.length);

    let parsed;
    try {
      let cleanContent = content
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      
      const startIdx = cleanContent.indexOf("{");
      if (startIdx === -1) throw new Error("Nenhum JSON encontrado");
      
      let braceCount = 0;
      let endIdx = -1;
      for (let i = startIdx; i < cleanContent.length; i++) {
        if (cleanContent[i] === "{") braceCount++;
        else if (cleanContent[i] === "}") {
          braceCount--;
          if (braceCount === 0) { endIdx = i; break; }
        }
      }
      
      if (endIdx === -1) throw new Error("JSON incompleto na resposta");
      
      let jsonStr = cleanContent.slice(startIdx, endIdx + 1);
      
      // Fix common JSON issues
      jsonStr = jsonStr
        .replace(/,\s*}/g, "}")
        .replace(/,\s*]/g, "]")
        .replace(/[\x00-\x1F\x7F]/g, (ch) => ch === "\n" || ch === "\r" || ch === "\t" ? ch : " ");
      
      parsed = JSON.parse(jsonStr);
    } catch (e) {
      console.error("Parse JSON falhou:", (e as Error).message);
      console.log("Primeiros 500 chars:", content.slice(0, 500));
      
      // Try a more aggressive cleanup
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const aggressive = jsonMatch[0]
            .replace(/,\s*}/g, "}")
            .replace(/,\s*]/g, "]")
            .replace(/[\x00-\x1F\x7F]/g, " ")
            .replace(/\n/g, " ")
            .replace(/\t/g, " ");
          parsed = JSON.parse(aggressive);
          console.log("Parse agressivo funcionou");
        } else {
          throw e;
        }
      } catch (_) {
        await updateImportStatus(supabase, importId, "erro",
          `Erro ao parsear JSON: ${(e as Error).message}. Tente reprocessar.`);
        throw new Error("Erro ao parsear resposta da IA");
      }
    }

    const meta = parsed.metadata || {};
    const questoes = parsed.questoes || [];
    const textoExtraido = parsed.texto_resumo || parsed.texto_extraido || "";

    console.log(`Metadados: banca=${meta.banca_organizadora}, questões encontradas: ${questoes.length}`);

    // Auto-create or find banca
    let bancaId = importRecord.banca_id;
    if (!bancaId && meta.banca_organizadora) {
      const bancaNome = meta.banca_organizadora.toUpperCase().trim();
      const { data: existingBanca } = await supabase
        .from("bancas").select("id").ilike("nome", bancaNome).limit(1).single();
      if (existingBanca) {
        bancaId = existingBanca.id;
      } else {
        const { data: newBanca } = await supabase
          .from("bancas").insert({ nome: bancaNome }).select("id").single();
        if (newBanca) bancaId = newBanca.id;
      }
    }

    // Auto-find state
    let stateId = null;
    if (meta.estado) {
      const sigla = meta.estado.toUpperCase().trim();
      const { data: existingState } = await supabase
        .from("states").select("id").eq("sigla", sigla).limit(1).single();
      if (existingState) stateId = existingState.id;
    }

    // Auto-find or create area
    let areaId = importRecord.area_id;
    if (!areaId && meta.area) {
      const areaNome = meta.area.trim();
      const { data: existingArea } = await supabase
        .from("areas").select("id").ilike("nome", areaNome).eq("modo", "concurso").limit(1).single();
      if (existingArea) {
        areaId = existingArea.id;
      } else {
        const { data: newArea } = await supabase
          .from("areas").insert({ nome: areaNome, modo: "concurso" }).select("id").single();
        if (newArea) areaId = newArea.id;
      }
    }

    // Auto-create concurso
    let concursoId = null;
    if (meta.concurso_nome) {
      const { data: existingConcurso } = await supabase
        .from("concursos").select("id").ilike("nome", meta.concurso_nome).limit(1).single();
      if (existingConcurso) {
        concursoId = existingConcurso.id;
      } else {
        const { data: newConcurso } = await supabase
          .from("concursos").insert({
            nome: meta.concurso_nome,
            banca_id: bancaId,
            ano: meta.ano || importRecord.ano || null,
          }).select("id").single();
        if (newConcurso) concursoId = newConcurso.id;
      }
    }

    // Knowledge Base: Create document and chunks
    let documentId: string | null = null;
    try {
      const { data: docRecord } = await supabase.from("documents").insert({
        title: importRecord.nome_arquivo,
        tipo_documento: "prova",
        banca: meta.banca_organizadora || null,
        cargo: meta.cargo || importRecord.cargo || null,
        ano: meta.ano || importRecord.ano || null,
        area: meta.area || null,
        estado: meta.estado || null,
        arquivo_pdf: importRecord.storage_path,
        texto_extraido: textoExtraido.slice(0, 65000),
        status: "processado",
        pdf_import_id: importId,
        uploaded_by: user.id,
      }).select("id").single();

      if (docRecord) {
        documentId = docRecord.id;
        const chunks = splitIntoChunks(textoExtraido);
        if (chunks.length > 0) {
          const chunkRecords = chunks.map((text, i) => ({
            document_id: documentId,
            chunk_text: text,
            ordem: i,
            tokens_count: Math.ceil(text.length / 4),
          }));
          await supabase.from("document_chunks").insert(chunkRecords);
          await supabase.from("documents").update({ total_chunks: chunks.length }).eq("id", documentId);
        }
        console.log(`Knowledge base: ${chunks.length} chunks criados`);
      }
    } catch (e) {
      console.log("Aviso: erro knowledge base:", (e as Error).message);
    }

    // Insert extracted questions one by one with better error handling
    let insertedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const q of questoes) {
      if (!q.enunciado) { skippedCount++; continue; }

      // Normalize alternativas from various formats
      const alternativas = normalizeAlternativas(q.alternativas);
      if (!alternativas || alternativas.length < 2) {
        console.log(`Questão ${q.numero || '?'}: alternativas inválidas, pulando`);
        skippedCount++;
        continue;
      }

      let materiaId = null;
      if (q.materia) {
        const { data: existingMateria } = await supabase
          .from("materias").select("id").ilike("nome", q.materia.trim()).limit(1).single();
        if (existingMateria) {
          materiaId = existingMateria.id;
        } else {
          const { data: newMateria } = await supabase
            .from("materias").insert({ nome: q.materia.trim() }).select("id").single();
          if (newMateria) materiaId = newMateria.id;
        }
      }

      let topicId = null;
      if (q.assunto && materiaId) {
        const { data: existingTopic } = await supabase
          .from("topics").select("id").ilike("nome", q.assunto.trim()).eq("materia_id", materiaId).limit(1).single();
        if (existingTopic) {
          topicId = existingTopic.id;
        } else {
          const { data: newTopic } = await supabase
            .from("topics").insert({ nome: q.assunto.trim(), materia_id: materiaId }).select("id").single();
          if (newTopic) topicId = newTopic.id;
        }
      }

      const respostaCorreta = (q.resposta_correta || q.gabarito || "A").toString().toUpperCase().trim();

      const { error: qError } = await supabase.from("questoes").insert({
        enunciado: q.enunciado,
        alternativas: JSON.stringify(alternativas),
        resposta_correta: respostaCorreta,
        modo: "concurso",
        source: "pdf_import",
        banca_id: bancaId,
        area_id: areaId,
        materia_id: materiaId,
        topic_id: topicId,
        concurso_id: concursoId,
        state_id: stateId,
        ano: meta.ano || importRecord.ano,
        dificuldade: q.dificuldade || "media",
        status_questao: respostaCorreta ? "valida" : "pendente_revisao",
      });

      if (!qError) {
        insertedCount++;
      } else {
        errorCount++;
        console.log(`Erro questão ${q.numero || '?'}:`, qError.message);
      }
    }

    // Update document with question count
    if (documentId) {
      await supabase.from("documents").update({ total_questoes: insertedCount }).eq("id", documentId);
    }

    // Update import record
    await supabase.from("pdf_imports").update({
      status_processamento: "processado",
      total_questoes_extraidas: insertedCount,
      banca_id: bancaId,
      area_id: areaId,
      ano: meta.ano || importRecord.ano,
      cargo: meta.cargo || importRecord.cargo,
      erro_detalhes: (errorCount > 0 || skippedCount > 0)
        ? `${insertedCount} inseridas, ${errorCount} erros, ${skippedCount} puladas`
        : null,
    }).eq("id", importId);

    await supabase.from("audit_logs").insert({
      user_id: user.id,
      acao: "PDF_PROCESSADO",
      tabela: "pdf_imports",
      detalhes: {
        import_id: importId,
        document_id: documentId,
        questoes_extraidas: insertedCount,
        questoes_com_erro: errorCount,
        questoes_puladas: skippedCount,
        total_na_resposta: questoes.length,
        banca_detectada: meta.banca_organizadora,
        concurso: meta.concurso_nome,
        estado: meta.estado,
        area: meta.area,
        had_gabarito: !!effectiveGabaritoPath,
      },
    });

    console.log(`Concluído: ${insertedCount} questões inseridas, ${errorCount} erros, ${skippedCount} puladas de ${questoes.length} total`);

    return new Response(
      JSON.stringify({
        success: true,
        questoes_extraidas: insertedCount,
        questoes_total: questoes.length,
        questoes_puladas: skippedCount,
        metadata: meta,
        banca_id: bancaId,
        area_id: areaId,
        concurso_id: concursoId,
        document_id: documentId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Erro:", (error as Error).message);
    
    if (supabase && importId) {
      try {
        const { data: check } = await supabase.from("pdf_imports")
          .select("status_processamento").eq("id", importId).single();
        if (check?.status_processamento === "processando") {
          await updateImportStatus(supabase, importId, "erro", (error as Error).message);
        }
      } catch (_) { /* ignore */ }
    }

    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
