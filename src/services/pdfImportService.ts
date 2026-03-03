import { pdfImportRepository } from "@/repositories/pdfImportRepository";
import type { PdfImport } from "@/types/modules";

async function computeFileHash(file: File): Promise<string> {
  const buffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const pdfImportService = {
  async listImports() {
    return pdfImportRepository.list();
  },

  async uploadPdf(file: File, metadata: Partial<PdfImport>, userId: string) {
    const hash = await computeFileHash(file);

    const isDuplicate = await pdfImportRepository.checkDuplicate(hash);
    if (isDuplicate) {
      throw new Error("Este PDF já foi importado anteriormente (arquivo duplicado).");
    }

    const ext = file.name.split(".").pop() || "pdf";
    const storagePath = `${Date.now()}_${hash.slice(0, 8)}.${ext}`;

    await pdfImportRepository.uploadFile(file, storagePath);

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
