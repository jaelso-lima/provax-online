/**
 * Business logic layer for Simulado module.
 * Handles prova completa distribution and semester filtering logic.
 * Separated from UI and repository for future migration.
 */
import {
  fetchBancaDistribuicao,
  type BancaDistribuicaoItem,
} from "./simuladoRepository";

// ─── Types ──────────────────────────────────────────────────────
export interface ProvaCompletaConfig {
  distribuicao: BancaDistribuicaoItem[];
  totalQuestoes: number;
}

export type SimuladoTipoMode = "livre" | "disciplina" | "prova_completa";

// ─── Prova Completa Logic ───────────────────────────────────────

/**
 * Load the prova completa configuration for a banca/area combination.
 * Falls back to a default balanced distribution if no specific config exists.
 */
export async function getProvaCompletaConfig(
  bancaId: string,
  areaId: string,
  carreiraId?: string
): Promise<ProvaCompletaConfig> {
  const distribuicao = await fetchBancaDistribuicao(bancaId, areaId, carreiraId);

  if (distribuicao.length === 0) {
    return { distribuicao: [], totalQuestoes: 0 };
  }

  const totalQuestoes = distribuicao.reduce((sum, d) => sum + d.quantidade, 0);
  return { distribuicao, totalQuestoes };
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
