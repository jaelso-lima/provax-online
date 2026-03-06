import { documentRepository } from "@/repositories/documentRepository";
import type { Document } from "@/types/modules";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ["application/pdf"];

export const documentService = {
  validateFile(file: File): { valid: boolean; error?: string } {
    if (!file) return { valid: false, error: "Nenhum arquivo selecionado" };
    if (!ALLOWED_TYPES.includes(file.type) && !file.name.toLowerCase().endsWith(".pdf")) {
      return { valid: false, error: "Apenas arquivos PDF são aceitos" };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: `Arquivo muito grande (máx ${MAX_FILE_SIZE / 1024 / 1024}MB). Tamanho: ${(file.size / 1024 / 1024).toFixed(1)}MB` };
    }
    if (file.size === 0) {
      return { valid: false, error: "Arquivo está vazio" };
    }
    return { valid: true };
  },

  async listDocuments() {
    return documentRepository.list();
  },

  async getDocument(id: string) {
    return documentRepository.getById(id);
  },

  async getStats() {
    return documentRepository.getStats();
  },

  async getChunks(documentId: string) {
    return documentRepository.getChunks(documentId);
  },

  async deleteDocument(id: string) {
    return documentRepository.deleteDocument(id);
  },
};
