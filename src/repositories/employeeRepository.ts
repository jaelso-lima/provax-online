import { supabase } from "@/integrations/supabase/client";

export const employeeRepository = {
  async listEmployees() {
    const { data, error } = await supabase
      .from("temp_employees")
      .select("*, profiles!temp_employees_user_id_fkey(nome, email)")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as any[];
  },

  async getEmployeeByUserId(userId: string) {
    const { data, error } = await supabase
      .from("temp_employees")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "ativo")
      .maybeSingle();
    if (error) throw error;
    return data;
  },

  async createEmployee(record: {
    user_id: string;
    tipo_trabalho?: string;
    valor_por_tarefa?: number;
  }) {
    const { data, error } = await supabase
      .from("temp_employees")
      .insert(record)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateEmployee(id: string, updates: Record<string, any>) {
    const { error } = await supabase
      .from("temp_employees")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
  },

  async listTasks(employeeId: string) {
    const { data, error } = await supabase
      .from("employee_tasks")
      .select("*")
      .eq("employee_id", employeeId)
      .order("data_tarefa", { ascending: false });
    if (error) throw error;
    return data;
  },

  async createTask(record: {
    employee_id: string;
    tipo_tarefa: string;
    descricao?: string;
    valor: number;
  }) {
    const { data, error } = await supabase
      .from("employee_tasks")
      .insert(record)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async listPayments(employeeId: string) {
    const { data, error } = await supabase
      .from("employee_payments")
      .select("*")
      .eq("employee_id", employeeId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  },

  async listAllPayments() {
    const { data, error } = await supabase
      .from("employee_payments")
      .select("*, temp_employees(user_id, profiles!temp_employees_user_id_fkey(nome, email))")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return data as any[];
  },

  async createPayment(record: {
    employee_id: string;
    mes_referencia: string;
    valor_total: number;
    status_pagamento?: string;
  }) {
    const { data, error } = await supabase
      .from("employee_payments")
      .insert(record)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async markPaymentPaid(paymentId: string) {
    const { error } = await supabase
      .from("employee_payments")
      .update({
        status_pagamento: "pago",
        data_pagamento: new Date().toISOString(),
      })
      .eq("id", paymentId);
    if (error) throw error;
  },

  async getTasksCountAndValue(employeeId: string) {
    const { data, error } = await supabase
      .from("employee_tasks")
      .select("valor")
      .eq("employee_id", employeeId);
    if (error) throw error;
    const total = (data || []).reduce((sum, t) => sum + Number(t.valor), 0);
    return { count: data?.length || 0, totalValue: total };
  },
};
