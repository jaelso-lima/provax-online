import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

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
  const update: any = { status_processamento: status };
  if (details) update.erro_detalhes = details;
  else if (status !== "processando") update.erro_detalhes = null;
  await supabase.from("pdf_imports").update(update).eq("id", importId);
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

    // Auth check
    const supabaseAuth = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      auth: { persistSession: false },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(token);
    if (authError || !user) throw new Error("Não autorizado");

    supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Role check
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

    // Get import record
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
    let provaBase64: string;
    try {
      provaBase64 = await pdfToBase64(supabase, importRecord.storage_path);
    } catch (e) {
      await updateImportStatus(supabase, importId, "erro", "Erro ao baixar PDF da prova: " + (e as Error).message);
      throw e;
    }

    // Download gabarito PDF - check body param first, then import record
    const effectiveGabaritoPath = gabaritoStoragePath || importRecord.gabarito_storage_path;
    let gabaritoBase64: string | null = null;
    if (effectiveGabaritoPath) {
      try {
        gabaritoBase64 = await pdfToBase64(supabase, effectiveGabaritoPath);
        console.log("Gabarito carregado com sucesso:", effectiveGabaritoPath);
      } catch (e) {
        console.log("Aviso: não foi possível baixar gabarito PDF:", (e as Error).message);
      }
    }

    // Build AI prompt
    const extractionPrompt = `Analise este PDF de prova/edital de concurso público brasileiro e extraia as seguintes informações:

1. METADADOS:
- banca_organizadora: nome da banca (ex: CESPE, FCC, VUNESP, FGV, IBFC, etc.)
- estado: sigla do estado (ex: SP, RJ, MG, DF)
- concurso_nome: nome completo do concurso
- orgao: órgão que está realizando o concurso
- ano: ano da prova
- cargo: cargo(s) da prova
- area: área de atuação (ex: Administrativa, Tribunais, Fiscal, Policial)

2. QUESTÕES (se for uma prova com questões):
Para cada questão encontrada, extraia:
- numero: número da questão
- enunciado: texto completo do enunciado
- alternativas: array com as alternativas (A, B, C, D, E)
- materia: matéria/disciplina da questão (ex: Direito Constitucional, Português, etc.)

${gabaritoBase64 ? "3. O SEGUNDO PDF ANEXADO É O GABARITO OFICIAL. Use-o para associar as respostas corretas a cada questão pelo número." : ""}

IMPORTANTE: Retorne APENAS um JSON válido no formato:
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

    // Call AI with timeout protection
    let aiResponse: Response;
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout
      
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
          max_tokens: 16000,
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeout);
    } catch (e) {
      const msg = (e as Error).name === "AbortError" 
        ? "Timeout: IA demorou mais de 2 minutos para responder" 
        : `Erro de conexão com IA: ${(e as Error).message}`;
      await updateImportStatus(supabase, importId, "erro", msg);
      throw new Error(msg);
    }

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      const msg = aiResponse.status === 429
        ? "Rate limit da IA excedido. Tente novamente em alguns minutos."
        : aiResponse.status === 402
        ? "Créditos de IA insuficientes."
        : `Erro na IA: ${aiResponse.status} - ${errorText.slice(0, 500)}`;
      await updateImportStatus(supabase, importId, "erro", msg);
      throw new Error(msg);
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Nenhum JSON encontrado na resposta");
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      await updateImportStatus(supabase, importId, "erro",
        `Erro ao parsear resposta da IA: ${(e as Error).message}. Resposta: ${content.slice(0, 500)}`);
      throw new Error("Erro ao parsear resposta da IA");
    }

    const meta = parsed.metadata || {};
    const questoes = parsed.questoes || [];

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

    // Insert extracted questions
    let insertedCount = 0;
    let errorCount = 0;
    for (const q of questoes) {
      if (!q.enunciado || !q.alternativas?.length) continue;

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

      const alternativas = q.alternativas.map((a: any) => ({
        letra: a.letra,
        texto: a.texto,
      }));

      const { error: qError } = await supabase.from("questoes").insert({
        enunciado: q.enunciado,
        alternativas: JSON.stringify(alternativas),
        resposta_correta: q.resposta_correta || "A",
        modo: "concurso",
        source: "pdf_import",
        banca_id: bancaId,
        area_id: areaId,
        materia_id: materiaId,
        concurso_id: concursoId,
        state_id: stateId,
        ano: meta.ano || importRecord.ano,
        dificuldade: "media",
        status_questao: q.resposta_correta ? "valida" : "pendente_revisao",
      });

      if (!qError) insertedCount++;
      else errorCount++;
    }

    // Update import record
    await supabase.from("pdf_imports").update({
      status_processamento: "processado",
      total_questoes_extraidas: insertedCount,
      banca_id: bancaId,
      area_id: areaId,
      ano: meta.ano || importRecord.ano,
      cargo: meta.cargo || importRecord.cargo,
      erro_detalhes: errorCount > 0 ? `${errorCount} questões falharam ao inserir` : null,
    }).eq("id", importId);

    // Clean up gabarito file from storage (only if it was a per-request upload)
    if (gabaritoStoragePath && gabaritoStoragePath !== importRecord.gabarito_storage_path) {
      await supabase.storage.from("pdf-imports").remove([gabaritoStoragePath]);
    }

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      acao: "PDF_PROCESSADO",
      tabela: "pdf_imports",
      detalhes: {
        import_id: importId,
        questoes_extraidas: insertedCount,
        questoes_com_erro: errorCount,
        banca_detectada: meta.banca_organizadora,
        concurso: meta.concurso_nome,
        estado: meta.estado,
        area: meta.area,
        had_gabarito: !!effectiveGabaritoPath,
      },
    });

    return new Response(
      JSON.stringify({
        success: true,
        questoes_extraidas: insertedCount,
        metadata: meta,
        banca_id: bancaId,
        area_id: areaId,
        concurso_id: concursoId,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    // Safety net: if we have supabase client and importId, ensure status is not stuck at "processando"
    if (supabase && importId) {
      try {
        const { data: check } = await supabase.from("pdf_imports")
          .select("status_processamento").eq("id", importId).single();
        if (check?.status_processamento === "processando") {
          await updateImportStatus(supabase, importId, "erro", (error as Error).message);
        }
      } catch (_) { /* ignore cleanup errors */ }
    }

    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
