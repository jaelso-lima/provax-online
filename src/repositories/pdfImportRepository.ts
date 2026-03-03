import { supabase } from "@/integrations/supabase/client";
import type { PdfImport } from "@/types/modules";

const TABLE = "pdf_imports";

export const pdfImportRepository = {
  async list(): Promise<PdfImport[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as PdfImport[];
  },

  async create(record: Partial<PdfImport>): Promise<PdfImport> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(record as any)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as PdfImport;
  },

  async updateStatus(id: string, status: string, details?: string): Promise<void> {
    const update: any = { status_processamento: status, updated_at: new Date().toISOString() };
    if (details) update.erro_detalhes = details;
    const { error } = await supabase.from(TABLE).update(update).eq("id", id);
    if (error) throw error;
  },

  async uploadFile(file: File, path: string): Promise<string> {
    const { error } = await supabase.storage
      .from("pdf-imports")
      .upload(path, file, { upsert: false });
    if (error) throw error;
    return path;
  },

  async checkDuplicate(hash: string): Promise<boolean> {
    const { data } = await supabase
      .from(TABLE)
      .select("id")
      .eq("hash_arquivo", hash)
      .limit(1);
    return (data && data.length > 0) || false;
  },
};
