import { examRadarRepository } from "@/repositories/examRadarRepository";
import type { ExamRadar, ExamRadarFilters } from "@/types/modules";

export const examRadarService = {
  async listExams(filters: ExamRadarFilters = {}, page = 1) {
    return examRadarRepository.list(filters, page);
  },

  async getExam(id: string) {
    return examRadarRepository.getById(id);
  },

  async createExam(exam: Partial<ExamRadar>) {
    return examRadarRepository.create(exam);
  },

  async updateExam(id: string, updates: Partial<ExamRadar>) {
    return examRadarRepository.update(id, updates);
  },

  async archiveExam(id: string) {
    return examRadarRepository.softDelete(id);
  },

  async deleteExam(id: string) {
    return examRadarRepository.hardDelete(id);
  },

  async getFilterOptions() {
    const [estados, areas] = await Promise.all([
      examRadarRepository.getDistinctEstados(),
      examRadarRepository.getDistinctAreas(),
    ]);
    return { estados, areas };
  },
};
