import { partnerRepository } from "@/repositories/partnerRepository";

const AVAILABLE_PERMISSIONS = [
  { key: "ver_faturamento", label: "Ver Faturamento" },
  { key: "ver_relatorios", label: "Ver Relatórios Financeiros" },
  { key: "ver_usuarios", label: "Ver Usuários Cadastrados" },
  { key: "ver_desempenho", label: "Ver Desempenho do Sistema" },
  { key: "gerenciar_conteudo", label: "Gerenciar Conteúdo" },
  { key: "importar_pdfs", label: "Importar PDFs" },
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
