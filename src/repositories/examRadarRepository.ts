import { supabase } from "@/integrations/supabase/client";
import type { ExamRadar, ExamRadarFilters } from "@/types/modules";

const TABLE = "exam_radar";
const PAGE_SIZE = 12;

export const examRadarRepository = {
  async list(filters: ExamRadarFilters = {}, page = 1): Promise<{ data: ExamRadar[]; total: number }> {
    let query = supabase
      .from(TABLE)
      .select("*", { count: "exact" });

    if (filters.estado) query = query.eq("estado", filters.estado);
    if (filters.nivel) query = query.eq("nivel", filters.nivel);
    if (filters.area) query = query.eq("area", filters.area);
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.search) query = query.ilike("nome", `%${filters.search}%`);

    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error, count } = await query
      .order("inscricao_ate", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) throw error;
    return { data: (data || []) as unknown as ExamRadar[], total: count || 0 };
  },

  async getById(id: string): Promise<ExamRadar | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data as unknown as ExamRadar;
  },

  async create(exam: Partial<ExamRadar>): Promise<ExamRadar> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(exam as any)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as ExamRadar;
  },

  async update(id: string, updates: Partial<ExamRadar>): Promise<ExamRadar> {
    const { data, error } = await supabase
      .from(TABLE)
      .update({ ...updates, updated_at: new Date().toISOString() } as any)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as ExamRadar;
  },

  async softDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .update({ status: "encerrado", updated_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) throw error;
  },

  async hardDelete(id: string): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq("id", id);
    if (error) throw error;
  },

  async getDistinctEstados(): Promise<string[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("estado")
      .not("estado", "is", null)
      .order("estado");
    if (error) return [];
    const unique = [...new Set((data || []).map((d: any) => d.estado).filter(Boolean))];
    return unique as string[];
  },

  async getDistinctAreas(): Promise<string[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("area")
      .not("area", "is", null)
      .order("area");
    if (error) return [];
    const unique = [...new Set((data || []).map((d: any) => d.area).filter(Boolean))];
    return unique as string[];
  },
};
