import { supabase } from "@/integrations/supabase/client";
import type { Document, DocumentChunk } from "@/types/modules";

export const documentRepository = {
  async list(): Promise<Document[]> {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data || []) as unknown as Document[];
  },

  async getById(id: string): Promise<Document | null> {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("id", id)
      .single();
    if (error) return null;
    return data as unknown as Document;
  },

  async create(record: Partial<Document>): Promise<Document> {
    const { data, error } = await supabase
      .from("documents")
      .insert(record as any)
      .select()
      .single();
    if (error) throw error;
    return data as unknown as Document;
  },

  async updateStatus(id: string, status: string, extraFields?: Record<string, any>): Promise<void> {
    const update: any = { status, updated_at: new Date().toISOString(), ...extraFields };
    const { error } = await supabase.from("documents").update(update).eq("id", id);
    if (error) throw error;
  },

  async getChunks(documentId: string): Promise<DocumentChunk[]> {
    const { data, error } = await supabase
      .from("document_chunks")
      .select("*")
      .eq("document_id", documentId)
      .order("ordem", { ascending: true });
    if (error) throw error;
    return (data || []) as unknown as DocumentChunk[];
  },

  async getStats(): Promise<{ totalDocs: number; totalChunks: number; totalQuestoes: number; byStatus: Record<string, number> }> {
    const { data: docs } = await supabase
      .from("documents")
      .select("status, total_questoes, total_chunks");
    
    const allDocs = (docs || []) as any[];
    const byStatus: Record<string, number> = {};
    let totalChunks = 0;
    let totalQuestoes = 0;

    for (const d of allDocs) {
      byStatus[d.status] = (byStatus[d.status] || 0) + 1;
      totalChunks += d.total_chunks || 0;
      totalQuestoes += d.total_questoes || 0;
    }

    return {
      totalDocs: allDocs.length,
      totalChunks,
      totalQuestoes,
      byStatus,
    };
  },

  async deleteDocument(id: string): Promise<void> {
    const { error } = await supabase.from("documents").delete().eq("id", id);
    if (error) throw error;
  },
};
