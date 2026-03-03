/**
 * Repository layer — data access abstraction for Simulado module.
 * All Supabase queries are isolated here to facilitate future migration
 * to an external API/database.
 */
import { supabase } from "@/integrations/supabase/client";

// ─── Types ──────────────────────────────────────────────────────
export interface FilterOption {
  id: string;
  nome: string;
  [key: string]: any;
}

export interface SemestreMateria {
  semestre: number;
  materia_id: string;
  materia_nome: string;
}

export interface BancaDistribuicaoItem {
  materia_id: string;
  materia_nome: string;
  quantidade: number;
}

// ─── Reference Data ─────────────────────────────────────────────
export async function fetchAreas(modo: string): Promise<FilterOption[]> {
  const { data } = await supabase.from("areas").select("*").eq("modo", modo).order("nome");
  return data || [];
}

export async function fetchCursos(onlyLiberados = true): Promise<FilterOption[]> {
  let query = supabase.from("cursos").select("*");
  if (onlyLiberados) query = query.eq("liberado", true);
  const { data } = await query.order("nome");
  return data || [];
}

export async function fetchCarreiras(): Promise<FilterOption[]> {
  const { data } = await supabase.from("carreiras").select("*").order("nome");
  return data || [];
}

export async function fetchBancas(): Promise<FilterOption[]> {
  const { data } = await supabase.from("bancas").select("*").order("nome");
  return data || [];
}

export async function fetchStates(): Promise<FilterOption[]> {
  const { data } = await supabase.from("states").select("*").order("nome");
  return data || [];
}

export async function fetchEsferas(): Promise<FilterOption[]> {
  const { data } = await supabase.from("esferas").select("*").order("nome");
  return data || [];
}

export async function fetchTopics(materiaId: string): Promise<FilterOption[]> {
  const { data } = await supabase.from("topics").select("*").eq("materia_id", materiaId).order("nome");
  return data || [];
}

// ─── Cascading Relations ────────────────────────────────────────
export async function fetchMateriasByArea(areaId: string): Promise<FilterOption[]> {
  const { data } = await supabase
    .from("area_materias")
    .select("materia_id, materias(id, nome)")
    .eq("area_id", areaId);
  return (data || [])
    .map((d: any) => d.materias)
    .filter(Boolean)
    .sort((a: any, b: any) => a.nome.localeCompare(b.nome));
}

export async function fetchMateriasByCurso(cursoId: string): Promise<FilterOption[]> {
  const { data } = await supabase
    .from("curso_materias")
    .select("materia_id, materias(id, nome)")
    .eq("curso_id", cursoId);
  return (data || [])
    .map((d: any) => d.materias)
    .filter(Boolean)
    .sort((a: any, b: any) => a.nome.localeCompare(b.nome));
}

// ─── Semester Curriculum (Superior) ─────────────────────────────
export async function fetchSemestresByCurso(cursoId: string): Promise<number[]> {
  const { data } = await supabase
    .from("curso_semestres")
    .select("semestre")
    .eq("curso_id", cursoId)
    .order("semestre");
  if (!data) return [];
  const unique = [...new Set(data.map((d: any) => d.semestre))];
  return unique.sort((a, b) => a - b);
}

export async function fetchMateriasBySemestre(cursoId: string, semestre: number): Promise<FilterOption[]> {
  const { data } = await supabase
    .from("curso_semestres")
    .select("materia_id, materias:materia_id(id, nome)")
    .eq("curso_id", cursoId)
    .eq("semestre", semestre);
  return (data || [])
    .map((d: any) => d.materias)
    .filter(Boolean)
    .sort((a: any, b: any) => a.nome.localeCompare(b.nome));
}

// ─── Banca Distribution (Concurso - Prova Completa) ─────────────
export async function fetchBancaDistribuicao(
  bancaId: string,
  areaId: string,
  carreiraId?: string
): Promise<BancaDistribuicaoItem[]> {
  let query = supabase
    .from("banca_distribuicao")
    .select("materia_id, quantidade, materias:materia_id(id, nome)")
    .eq("banca_id", bancaId)
    .eq("area_id", areaId);

  if (carreiraId) {
    query = query.eq("carreira_id", carreiraId);
  } else {
    query = query.is("carreira_id", null);
  }

  const { data } = await query.order("quantidade", { ascending: false });
  return (data || []).map((d: any) => ({
    materia_id: d.materia_id,
    materia_nome: d.materias?.nome || "",
    quantidade: d.quantidade,
  }));
}

export async function hasBancaDistribuicao(
  bancaId: string,
  areaId: string
): Promise<boolean> {
  const { count } = await supabase
    .from("banca_distribuicao")
    .select("id", { count: "exact", head: true })
    .eq("banca_id", bancaId)
    .eq("area_id", areaId);
  return (count || 0) > 0;
}
