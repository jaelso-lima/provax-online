import { supabase } from "@/integrations/supabase/client";

export const partnerRepository = {
  async listPartnersWithProfiles() {
    const { data, error } = await supabase
      .from("partners")
      .select("*, profiles!partners_user_id_fkey(nome, email)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as any[];
  },

  async getPartnerByUserId(userId: string) {
    const { data, error } = await supabase
      .from("partners")
      .select("*, profiles!partners_user_id_fkey(nome, email)")
      .eq("user_id", userId)
      .eq("status", "ativo")
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async listPartnerPayments(partnerId: string) {
    const { data, error } = await supabase
      .from("partner_payments")
      .select("*")
      .eq("partner_id", partnerId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async listAllPartnerPayments() {
    const { data, error } = await supabase
      .from("partner_payments")
      .select("*, partners(user_id, percentual_participacao, pix_chave, pix_tipo, banco, agencia, conta, titular, profiles!partners_user_id_fkey(nome, email))")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as any[];
  },

  async createPartnerPayment(record: {
    partner_id: string;
    mes_referencia: string;
    valor: number;
    status_pagamento?: string;
    observacao?: string;
  }) {
    const { data, error } = await supabase
      .from("partner_payments")
      .insert(record)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markPaymentPaid(paymentId: string) {
    const { error } = await supabase
      .from("partner_payments")
      .update({
        status_pagamento: "pago",
        data_pagamento: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", paymentId);
    if (error) throw error;
  },

  async listPartnerPermissions(partnerId: string) {
    const { data, error } = await supabase
      .from("partner_permissions")
      .select("*")
      .eq("partner_id", partnerId);
    if (error) throw error;
    return data;
  },

  async upsertPermission(partnerId: string, permission: string, enabled: boolean) {
    const { error } = await supabase
      .from("partner_permissions")
      .upsert(
        { partner_id: partnerId, permission, enabled },
        { onConflict: "partner_id,permission" }
      );
    if (error) throw error;
  },
};
