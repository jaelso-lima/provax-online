import { pdfImportRepository } from "@/repositories/pdfImportRepository";
import type { PdfImport } from "@/types/modules";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = ["application/pdf"];

async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const pdfImportService = {
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

  async listImports() {
    return pdfImportRepository.list();
  },

  async uploadPdf(file: File, metadata: Partial<PdfImport>, userId: string) {
    // Validate file first
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    const hash = await computeFileHash(file);

    const isDuplicate = await pdfImportRepository.checkDuplicate(hash);
    if (isDuplicate) {
      throw new Error("Este PDF já foi importado anteriormente (arquivo duplicado).");
    }

    const ext = file.name.split(".").pop() || "pdf";
    const storagePath = `${Date.now()}_${hash.slice(0, 8)}.${ext}`;

    try {
      await pdfImportRepository.uploadFile(file, storagePath);
    } catch (e: any) {
      throw new Error(`Erro no upload do arquivo: ${e.message}`);
    }

    return pdfImportRepository.create({
      ...metadata,
      nome_arquivo: file.name,
      hash_arquivo: hash,
      storage_path: storagePath,
      uploaded_by: userId,
      status_processamento: "pendente",
    });
  },

  async updateStatus(id: string, status: string, details?: string) {
    return pdfImportRepository.updateStatus(id, status, details);
  },
};
