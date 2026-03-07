import { partnerRepository } from "@/repositories/partnerRepository";

const AVAILABLE_PERMISSIONS = [
  { key: "ver_usuarios", label: "Usuários" },
  { key: "ver_planos", label: "Planos" },
  { key: "ver_faturamento", label: "Faturamento" },
  { key: "ver_despesas", label: "Despesas" },
  { key: "ver_societario", label: "Societário" },
  { key: "ver_simulador_lucros", label: "Simulador de Lucros" },
  { key: "ver_radar_concursos", label: "Radar Concursos" },
  { key: "importar_pdfs", label: "PDF Importer" },
  { key: "revisar_questoes", label: "Revisão de Questões" },
  { key: "ver_pagamentos_socios", label: "Pagamentos Sócios" },
  { key: "ver_funcionarios", label: "Funcionários" },
  { key: "gerenciar_conteudo", label: "Página de Venda" },
  { key: "ver_relatorios", label: "Relatório PDF" },
  { key: "ver_logs", label: "Logs" },
];

export const partnerService = {
  AVAILABLE_PERMISSIONS,

  async listPartnersWithProfiles() {
    return partnerRepository.listPartnersWithProfiles();
  },

  async getPartnerByUserId(userId: string) {
    return partnerRepository.getPartnerByUserId(userId);
  },

  async listPayments(partnerId: string) {
    return partnerRepository.listPartnerPayments(partnerId);
  },

  async listAllPayments() {
    return partnerRepository.listAllPartnerPayments();
  },

  async createPayment(partnerId: string, mesReferencia: string, valor: number, observacao?: string) {
    return partnerRepository.createPartnerPayment({
      partner_id: partnerId,
      mes_referencia: mesReferencia,
      valor,
      observacao,
    });
  },

  async markPaymentPaid(paymentId: string) {
    return partnerRepository.markPaymentPaid(paymentId);
  },

  async getPermissions(partnerId: string) {
    return partnerRepository.listPartnerPermissions(partnerId);
  },

  async setPermission(partnerId: string, permission: string, enabled: boolean) {
    return partnerRepository.upsertPermission(partnerId, permission, enabled);
  },

  calculatePartnerEarnings(faturamento: number, despesas: number, percentual: number) {
    const lucroLiquido = Math.max(0, faturamento - despesas);
    const valorReceber = lucroLiquido * (percentual / 100);
    return { faturamento, despesas, lucroLiquido, percentual, valorReceber };
  },
};
