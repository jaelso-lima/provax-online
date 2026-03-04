/**
 * Service layer for Professor IA personalized recommendations.
 * Analyzes user history to provide targeted feedback.
 */
import { supabase } from "@/integrations/supabase/client";

export interface MateriaStats {
  materia_id: string;
  materia_nome: string;
  total: number;
  acertos: number;
  erros: number;
  taxa_acerto: number;
}

export interface UserPerformanceProfile {
  totalQuestoes: number;
  totalAcertos: number;
  totalErros: number;
  taxaAcertoGeral: number;
  materiaStats: MateriaStats[];
  pontosFracos: MateriaStats[];
  pontosFortes: MateriaStats[];
}

export async function getUserPerformanceProfile(userId: string): Promise<UserPerformanceProfile> {
  // Get all answered questions with materia info
  const { data: respostas } = await supabase
    .from("respostas")
    .select("acertou, questoes(materia_id, materias:materia_id(id, nome))")
    .in("simulado_id", 
      (await supabase.from("simulados").select("id").eq("user_id", userId).eq("status", "finalizado")).data?.map((s: any) => s.id) || []
    );

  if (!respostas || respostas.length === 0) {
    return { totalQuestoes: 0, totalAcertos: 0, totalErros: 0, taxaAcertoGeral: 0, materiaStats: [], pontosFracos: [], pontosFortes: [] };
  }

  // Aggregate by materia
  const materiaMap = new Map<string, { nome: string; total: number; acertos: number }>();
  let totalAcertos = 0;
  let totalErros = 0;

  for (const r of respostas) {
    const q = r.questoes as any;
    if (!q?.materia_id) continue;
    const materiaId = q.materia_id;
    const materiaNome = q.materias?.nome || "Desconhecida";
    
    if (!materiaMap.has(materiaId)) {
      materiaMap.set(materiaId, { nome: materiaNome, total: 0, acertos: 0 });
    }
    const entry = materiaMap.get(materiaId)!;
    entry.total++;
    if (r.acertou) { entry.acertos++; totalAcertos++; }
    else { totalErros++; }
  }

  const materiaStats: MateriaStats[] = Array.from(materiaMap.entries()).map(([id, s]) => ({
    materia_id: id,
    materia_nome: s.nome,
    total: s.total,
    acertos: s.acertos,
    erros: s.total - s.acertos,
    taxa_acerto: s.total > 0 ? Math.round((s.acertos / s.total) * 100) : 0,
  }));

  // Sort by taxa_acerto to find weak/strong points (min 3 questions to be meaningful)
  const meaningful = materiaStats.filter(m => m.total >= 3);
  const pontosFracos = [...meaningful].sort((a, b) => a.taxa_acerto - b.taxa_acerto).slice(0, 3);
  const pontosFortes = [...meaningful].sort((a, b) => b.taxa_acerto - a.taxa_acerto).slice(0, 3);

  return {
    totalQuestoes: respostas.length,
    totalAcertos,
    totalErros,
    taxaAcertoGeral: respostas.length > 0 ? Math.round((totalAcertos / respostas.length) * 100) : 0,
    materiaStats,
    pontosFracos,
    pontosFortes,
  };
}

export function buildPerformanceContext(profile: UserPerformanceProfile): string {
  if (profile.totalQuestoes === 0) return "O aluno ainda não possui histórico de simulados.";

  let context = `DADOS REAIS DO ALUNO (use para personalizar suas respostas):\n`;
  context += `- Total de questões respondidas: ${profile.totalQuestoes}\n`;
  context += `- Taxa de acerto geral: ${profile.taxaAcertoGeral}%\n`;
  context += `- Acertos: ${profile.totalAcertos} | Erros: ${profile.totalErros}\n\n`;

  if (profile.pontosFracos.length > 0) {
    context += `PONTOS FRACOS (matérias com menor taxa de acerto):\n`;
    for (const m of profile.pontosFracos) {
      context += `- ${m.materia_nome}: ${m.taxa_acerto}% de acerto (${m.acertos}/${m.total})\n`;
    }
    context += `\n`;
  }

  if (profile.pontosFortes.length > 0) {
    context += `PONTOS FORTES (matérias com maior taxa de acerto):\n`;
    for (const m of profile.pontosFortes) {
      context += `- ${m.materia_nome}: ${m.taxa_acerto}% de acerto (${m.acertos}/${m.total})\n`;
    }
    context += `\n`;
  }

  context += `Use esses dados para:\n`;
  context += `1. Sugerir revisão das matérias fracas\n`;
  context += `2. Elogiar o desempenho nas matérias fortes\n`;
  context += `3. Recomendar treinos focados nos pontos fracos\n`;
  context += `4. Dar dicas específicas baseadas nos erros\n`;

  return context;
}
