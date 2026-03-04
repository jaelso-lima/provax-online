import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    // Check admin
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .single();

    if (!roleData || !["admin", "owner"].includes(roleData.role)) {
      throw new Error("Apenas administradores podem processar PDFs");
    }

    const { import_id, gabarito_text } = await req.json();
    if (!import_id) throw new Error("import_id é obrigatório");

    // Get the import record
    const { data: importRecord, error: importError } = await supabase
      .from("pdf_imports")
      .select("*")
      .eq("id", import_id)
      .single();

    if (importError || !importRecord) throw new Error("Registro de importação não encontrado");

    // Update status to processing
    await supabase
      .from("pdf_imports")
      .update({ status_processamento: "processando" })
      .eq("id", import_id);

    // Download the PDF from storage
    const { data: fileData, error: fileError } = await supabase.storage
      .from("pdf-imports")
      .download(importRecord.storage_path);

    if (fileError || !fileData) {
      await supabase.from("pdf_imports").update({
        status_processamento: "erro",
        erro_detalhes: "Erro ao baixar arquivo do storage: " + (fileError?.message || "arquivo não encontrado"),
      }).eq("id", import_id);
      throw new Error("Erro ao baixar PDF");
    }

    // Convert to base64
    const arrayBuffer = await fileData.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    let binary = "";
    const chunkSize = 8192;
    for (let i = 0; i < uint8.length; i += chunkSize) {
      const chunk = uint8.subarray(i, i + chunkSize);
      binary += String.fromCharCode(...chunk);
    }
    const base64 = btoa(binary);

    // Use AI to extract metadata and questions
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

${gabarito_text ? `
3. GABARITO FORNECIDO:
Use este gabarito para associar as respostas corretas:
${gabarito_text}
` : ""}

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

    if (!lovableApiKey) {
      await supabase.from("pdf_imports").update({
        status_processamento: "erro",
        erro_detalhes: "LOVABLE_API_KEY não configurada",
      }).eq("id", import_id);
      throw new Error("API key não configurada");
    }

    const aiResponse = await fetch("https://api.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: extractionPrompt },
              {
                type: "image_url",
                image_url: { url: `data:application/pdf;base64,${base64}` },
              },
            ],
          },
        ],
        temperature: 0.1,
        max_tokens: 16000,
      }),
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      await supabase.from("pdf_imports").update({
        status_processamento: "erro",
        erro_detalhes: `Erro na IA: ${aiResponse.status} - ${errorText.slice(0, 500)}`,
      }).eq("id", import_id);
      throw new Error("Erro ao processar com IA");
    }

    const aiResult = await aiResponse.json();
    const content = aiResult.choices?.[0]?.message?.content || "";

    // Parse JSON from AI response
    let parsed;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Nenhum JSON encontrado na resposta");
      parsed = JSON.parse(jsonMatch[0]);
    } catch (e) {
      await supabase.from("pdf_imports").update({
        status_processamento: "erro",
        erro_detalhes: `Erro ao parsear resposta da IA: ${(e as Error).message}. Resposta: ${content.slice(0, 500)}`,
      }).eq("id", import_id);
      throw new Error("Erro ao parsear resposta da IA");
    }

    const meta = parsed.metadata || {};
    const questoes = parsed.questoes || [];

    // Auto-create or find banca
    let bancaId = importRecord.banca_id;
    if (!bancaId && meta.banca_organizadora) {
      const bancaNome = meta.banca_organizadora.toUpperCase().trim();
      const { data: existingBanca } = await supabase
        .from("bancas")
        .select("id")
        .ilike("nome", bancaNome)
        .limit(1)
        .single();

      if (existingBanca) {
        bancaId = existingBanca.id;
      } else {
        const { data: newBanca } = await supabase
          .from("bancas")
          .insert({ nome: bancaNome })
          .select("id")
          .single();
        if (newBanca) bancaId = newBanca.id;
      }
    }

    // Auto-create or find state
    let stateId = null;
    if (meta.estado) {
      const sigla = meta.estado.toUpperCase().trim();
      const { data: existingState } = await supabase
        .from("states")
        .select("id")
        .eq("sigla", sigla)
        .limit(1)
        .single();
      if (existingState) stateId = existingState.id;
    }

    // Auto-find or create area
    let areaId = importRecord.area_id;
    if (!areaId && meta.area) {
      const areaNome = meta.area.trim();
      const { data: existingArea } = await supabase
        .from("areas")
        .select("id")
        .ilike("nome", areaNome)
        .eq("modo", "concurso")
        .limit(1)
        .single();

      if (existingArea) {
        areaId = existingArea.id;
      } else {
        const { data: newArea } = await supabase
          .from("areas")
          .insert({ nome: areaNome, modo: "concurso" })
          .select("id")
          .single();
        if (newArea) areaId = newArea.id;
      }
    }

    // Auto-create concurso if identified
    let concursoId = null;
    if (meta.concurso_nome) {
      const { data: existingConcurso } = await supabase
        .from("concursos")
        .select("id")
        .ilike("nome", meta.concurso_nome)
        .limit(1)
        .single();

      if (existingConcurso) {
        concursoId = existingConcurso.id;
      } else {
        const { data: newConcurso } = await supabase
          .from("concursos")
          .insert({
            nome: meta.concurso_nome,
            banca_id: bancaId,
            ano: meta.ano || (importRecord.ano ? importRecord.ano : null),
          })
          .select("id")
          .single();
        if (newConcurso) concursoId = newConcurso.id;
      }
    }

    // Insert extracted questions
    let insertedCount = 0;
    for (const q of questoes) {
      if (!q.enunciado || !q.alternativas?.length) continue;

      // Find or create materia
      let materiaId = null;
      if (q.materia) {
        const { data: existingMateria } = await supabase
          .from("materias")
          .select("id")
          .ilike("nome", q.materia.trim())
          .limit(1)
          .single();

        if (existingMateria) {
          materiaId = existingMateria.id;
        } else {
          const { data: newMateria } = await supabase
            .from("materias")
            .insert({ nome: q.materia.trim() })
            .select("id")
            .single();
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
    }

    // Update import record with results
    await supabase.from("pdf_imports").update({
      status_processamento: "processado",
      total_questoes_extraidas: insertedCount,
      banca_id: bancaId,
      area_id: areaId,
      ano: meta.ano || importRecord.ano,
      cargo: meta.cargo || importRecord.cargo,
      erro_detalhes: null,
    }).eq("id", import_id);

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: user.id,
      acao: "PDF_PROCESSADO",
      tabela: "pdf_imports",
      detalhes: {
        import_id,
        questoes_extraidas: insertedCount,
        banca_detectada: meta.banca_organizadora,
        concurso: meta.concurso_nome,
        estado: meta.estado,
        area: meta.area,
        had_gabarito: !!gabarito_text,
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
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
