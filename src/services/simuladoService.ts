/**
 * Business logic layer for Simulado module.
 * Handles prova completa distribution and semester filtering logic.
 * Separated from UI and repository for future migration.
 */
import {
  fetchBancaDistribuicao,
  fetchMateriasByArea,
  type BancaDistribuicaoItem,
} from "./simuladoRepository";

// ─── Types ──────────────────────────────────────────────────────
export interface ProvaCompletaConfig {
  distribuicao: BancaDistribuicaoItem[];
  totalQuestoes: number;
  isFallback: boolean;
}

export type SimuladoTipoMode = "livre" | "disciplina" | "prova_completa";

// ─── Default question count for fallback distribution ───────────
const DEFAULT_PROVA_TOTAL = 40;

// ─── Prova Completa Logic ───────────────────────────────────────

/**
 * Load the prova completa configuration for a banca/area combination.
 * If no specific config exists in banca_distribuicao, falls back to
 * a balanced distribution using the area's materias.
 */
export async function getProvaCompletaConfig(
  bancaId: string,
  areaId: string,
  carreiraId?: string
): Promise<ProvaCompletaConfig> {
  const distribuicao = await fetchBancaDistribuicao(bancaId, areaId, carreiraId);

  if (distribuicao.length > 0) {
    const totalQuestoes = distribuicao.reduce((sum, d) => sum + d.quantidade, 0);
    return { distribuicao, totalQuestoes, isFallback: false };
  }

  // Fallback: build balanced distribution from area_materias
  const materias = await fetchMateriasByArea(areaId);
  if (materias.length === 0) {
    return { distribuicao: [], totalQuestoes: 0, isFallback: true };
  }

  const basePerSubject = Math.floor(DEFAULT_PROVA_TOTAL / materias.length);
  let remainder = DEFAULT_PROVA_TOTAL - basePerSubject * materias.length;

  const fallbackDistribuicao: BancaDistribuicaoItem[] = materias.map((m) => {
    const extra = remainder > 0 ? 1 : 0;
    if (extra) remainder--;
    return {
      materia_id: m.id,
      materia_nome: m.nome,
      quantidade: basePerSubject + extra,
    };
  });

  return {
    distribuicao: fallbackDistribuicao,
    totalQuestoes: DEFAULT_PROVA_TOTAL,
    isFallback: true,
  };
}

/**
 * Build the AI prompt context for a prova completa,
 * specifying how many questions per subject.
 */
export function buildProvaCompletaPromptContext(
  distribuicao: BancaDistribuicaoItem[]
): string {
  if (distribuicao.length === 0) return "";
  const lines = distribuicao.map(
    (d) => `${d.quantidade} questões de ${d.materia_nome}`
  );
  return `Distribuição da prova completa:\n${lines.join("\n")}`;
}

/**
 * Semester label helper.
 */
export function getSemestreLabel(semestre: number): string {
  return `${semestre}º Semestre`;
}
