import type { AnalysisResult } from "@/lib/editalPdf";

/**
 * Normaliza nomes para comparação fuzzy: remove acentos, pontuação, minúsculo.
 */
function normalize(s: string): string {
  return String(s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Similaridade simples por tokens (Jaccard) — rápido, sem dependências. */
function similarity(a: string, b: string): number {
  const ta = new Set(normalize(a).split(" ").filter(Boolean));
  const tb = new Set(normalize(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  ta.forEach((t) => { if (tb.has(t)) inter++; });
  return inter / (ta.size + tb.size - inter);
}

export type MateriaOrigem = "comum" | "exclusiva_a" | "exclusiva_b";

export interface MateriaCombinada {
  nome: string;
  origem: MateriaOrigem;
  conteudos_principais: string[];
  resumo_detalhado?: string;
  macetes?: string[];
  pegadinhas_frequentes?: string[];
  palavras_chave?: string[];
  dicas_prova?: string[];
  estrategia_estudo?: string;
  quantidade_questoes?: number;
  // Editais de origem para etiqueta
  editais: string[];
}

export interface CombinedResult {
  materias: MateriaCombinada[];
  data_prova_referencia: string | null; // YYYY-MM-DD da mais próxima
  total_dias_estudo: number;
  ciclo_dias: number;
  ciclos_completos: number;
  dias_restantes: number;
  data_inicio: string; // YYYY-MM-DD hoje
  edital_a: { id: string; label: string; data_prova: string | null };
  edital_b: { id: string; label: string; data_prova: string | null };
  cronograma_dias: { titulo: string; tipo: "estudo" | "revisao" | "simulado"; blocos: { ordem: number; materia: string; topico: string; tipo_atividade: string }[] }[];
  similaridade_global: number; // 0..1
}

function uniqStrings(arr?: string[] | null): string[] {
  if (!Array.isArray(arr)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of arr) {
    const k = normalize(x);
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(x);
  }
  return out;
}

function parseDate(s?: string | null): Date | null {
  if (!s) return null;
  // Aceita YYYY-MM-DD ou DD/MM/YYYY
  const iso = /^\d{4}-\d{2}-\d{2}/.exec(s);
  if (iso) {
    const [y, m, d] = s.slice(0, 10).split("-").map(Number);
    if (y && m && d) return new Date(y, m - 1, d);
  }
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  if (br) {
    return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
  }
  return null;
}

function fmtISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Combina dois resultados de análise de edital.
 * - Matérias com nome similar (>=0.6 Jaccard, ~85% de palavras comuns) são fundidas como "comum".
 * - Cronograma: matérias comuns primeiro (peso maior), exclusivas depois.
 * - Data de prova usada: a MAIS PRÓXIMA das duas.
 */
export function combinarEditais(
  a: { id: string; label: string; resultado: AnalysisResult },
  b: { id: string; label: string; resultado: AnalysisResult },
  hoje: Date = new Date(),
): CombinedResult {
  const matsA = (a.resultado.materias || []) as any[];
  const matsB = (b.resultado.materias || []) as any[];

  const usadosB = new Set<number>();
  const combinadas: MateriaCombinada[] = [];

  const SIM_THRESHOLD = 0.6; // Jaccard ~ 60% de tokens em comum

  // Passada 1: comuns (A ∩ B)
  matsA.forEach((mA) => {
    let bestIdx = -1;
    let bestScore = 0;
    matsB.forEach((mB, j) => {
      if (usadosB.has(j)) return;
      const sc = similarity(mA.nome, mB.nome);
      if (sc > bestScore) { bestScore = sc; bestIdx = j; }
    });
    if (bestIdx >= 0 && bestScore >= SIM_THRESHOLD) {
      const mB = matsB[bestIdx];
      usadosB.add(bestIdx);
      combinadas.push({
        nome: mA.nome.length >= mB.nome.length ? mA.nome : mB.nome,
        origem: "comum",
        conteudos_principais: uniqStrings([...(mA.conteudos_principais || []), ...(mB.conteudos_principais || [])]),
        resumo_detalhado: mA.resumo_detalhado || mB.resumo_detalhado,
        macetes: uniqStrings([...(mA.macetes || []), ...(mB.macetes || [])]),
        pegadinhas_frequentes: uniqStrings([...(mA.pegadinhas_frequentes || []), ...(mB.pegadinhas_frequentes || [])]),
        palavras_chave: uniqStrings([...(mA.palavras_chave || []), ...(mB.palavras_chave || [])]),
        dicas_prova: uniqStrings([...(mA.dicas_prova || []), ...(mB.dicas_prova || [])]),
        estrategia_estudo: mA.estrategia_estudo || mB.estrategia_estudo,
        quantidade_questoes: Math.max(
          Number(mA.quantidade_questoes) || 0,
          Number(mB.quantidade_questoes) || 0,
        ) || undefined,
        editais: [a.label, b.label],
      });
    } else {
      combinadas.push({
        nome: mA.nome,
        origem: "exclusiva_a",
        conteudos_principais: uniqStrings(mA.conteudos_principais),
        resumo_detalhado: mA.resumo_detalhado,
        macetes: uniqStrings(mA.macetes),
        pegadinhas_frequentes: uniqStrings(mA.pegadinhas_frequentes),
        palavras_chave: uniqStrings(mA.palavras_chave),
        dicas_prova: uniqStrings(mA.dicas_prova),
        estrategia_estudo: mA.estrategia_estudo,
        quantidade_questoes: Number(mA.quantidade_questoes) || undefined,
        editais: [a.label],
      });
    }
  });

  // Passada 2: exclusivas de B
  matsB.forEach((mB, j) => {
    if (usadosB.has(j)) return;
    combinadas.push({
      nome: mB.nome,
      origem: "exclusiva_b",
      conteudos_principais: uniqStrings(mB.conteudos_principais),
      resumo_detalhado: mB.resumo_detalhado,
      macetes: uniqStrings(mB.macetes),
      pegadinhas_frequentes: uniqStrings(mB.pegadinhas_frequentes),
      palavras_chave: uniqStrings(mB.palavras_chave),
      dicas_prova: uniqStrings(mB.dicas_prova),
      estrategia_estudo: mB.estrategia_estudo,
      quantidade_questoes: Number(mB.quantidade_questoes) || undefined,
      editais: [b.label],
    });
  });

  // Ordena: comuns primeiro, depois exclusivas de A, depois de B
  combinadas.sort((x, y) => {
    const w = (o: MateriaOrigem) => (o === "comum" ? 0 : o === "exclusiva_a" ? 1 : 2);
    return w(x.origem) - w(y.origem);
  });

  // Datas
  const dpA = parseDate((a.resultado as any)?.raio_x?.data_prova);
  const dpB = parseDate((b.resultado as any)?.raio_x?.data_prova);
  let provaReferencia: Date | null = null;
  if (dpA && dpB) provaReferencia = dpA.getTime() <= dpB.getTime() ? dpA : dpB;
  else provaReferencia = dpA || dpB;

  const hoje0 = new Date(hoje); hoje0.setHours(0, 0, 0, 0);
  let totalDiasEstudo = 30;
  if (provaReferencia) {
    const pr = new Date(provaReferencia); pr.setHours(0, 0, 0, 0);
    const diff = Math.floor((pr.getTime() - hoje0.getTime()) / 86400000);
    if (diff > 1) totalDiasEstudo = diff - 1;
  }

  const cicloDias = 10;
  const ciclosCompletos = Math.floor(totalDiasEstudo / cicloDias);
  const diasRestantes = totalDiasEstudo % cicloDias;

  // Cronograma base de 10 dias — comum primeiro, depois exclusivas
  const comuns = combinadas.filter((m) => m.origem === "comum");
  const exclusivas = combinadas.filter((m) => m.origem !== "comum");
  const pesoComum = comuns.length > 0 ? 3 : 0;
  const pesoExcl = exclusivas.length > 0 ? 1 : 0;

  const cronogramaBase = Array.from({ length: cicloDias }, (_, i) => {
    const dia = i + 1;
    const tipo: "estudo" | "revisao" | "simulado" =
      dia === cicloDias ? "simulado" : dia === 7 ? "revisao" : "estudo";
    // Para cada bloco, escolhe matéria: prioriza comuns (peso 3) vs exclusivas (peso 1)
    const blocos = Array.from({ length: 4 }, (_, k) => {
      const totalPeso = pesoComum + pesoExcl;
      const usarComum = totalPeso > 0 && (((i * 4 + k) % totalPeso) < pesoComum);
      const pool = usarComum && comuns.length > 0 ? comuns : exclusivas.length > 0 ? exclusivas : comuns;
      const mat = pool[(i * 4 + k) % Math.max(1, pool.length)];
      const topico = mat?.conteudos_principais?.[((i * 4 + k) % Math.max(1, (mat?.conteudos_principais?.length || 1)))] || "Revisão geral";
      return {
        ordem: k + 1,
        materia: mat?.nome || "Revisão",
        topico,
        tipo_atividade: tipo === "simulado" ? "simulado_misto" : "questoes",
      };
    });
    return {
      titulo: tipo === "simulado" ? "Simulado real (misto)" : tipo === "revisao" ? "Revisão inteligente" : `Dia ${dia} — foco em conteúdo comum`,
      tipo,
      blocos,
    };
  });

  // Similaridade global (proporção de matérias comuns)
  const totalMats = combinadas.length || 1;
  const similaridade_global = comuns.length / totalMats;

  return {
    materias: combinadas,
    data_prova_referencia: provaReferencia ? fmtISO(provaReferencia) : null,
    total_dias_estudo: totalDiasEstudo,
    ciclo_dias: cicloDias,
    ciclos_completos: ciclosCompletos,
    dias_restantes: diasRestantes,
    data_inicio: fmtISO(hoje0),
    edital_a: { id: a.id, label: a.label, data_prova: dpA ? fmtISO(dpA) : null },
    edital_b: { id: b.id, label: b.label, data_prova: dpB ? fmtISO(dpB) : null },
    cronograma_dias: cronogramaBase,
    similaridade_global,
  };
}