import { employeeRepository } from "@/repositories/employeeRepository";

export const employeeService = {
  async listEmployees() {
    return employeeRepository.listEmployees();
  },

  async getEmployeeByUserId(userId: string) {
    return employeeRepository.getEmployeeByUserId(userId);
  },

  async createEmployee(userId: string, tipoTrabalho = "upload_pdf", valorPorTarefa = 2) {
    return employeeRepository.createEmployee({
      user_id: userId,
      tipo_trabalho: tipoTrabalho,
      valor_por_tarefa: valorPorTarefa,
    });
  },

  async updateEmployee(id: string, updates: Record<string, any>) {
    return employeeRepository.updateEmployee(id, updates);
  },

  async registerTask(employeeId: string, tipoTarefa: string, descricao: string, valor: number) {
    return employeeRepository.createTask({
      employee_id: employeeId,
      tipo_tarefa: tipoTarefa,
      descricao,
      valor,
    });
  },

  async listTasks(employeeId: string) {
    return employeeRepository.listTasks(employeeId);
  },

  async getTasksSummary(employeeId: string) {
    return employeeRepository.getTasksCountAndValue(employeeId);
  },

  async listPayments(employeeId: string) {
    return employeeRepository.listPayments(employeeId);
  },

  async listAllPayments() {
    return employeeRepository.listAllPayments();
  },

  async createPayment(employeeId: string, mesReferencia: string, valorTotal: number) {
    return employeeRepository.createPayment({
      employee_id: employeeId,
      mes_referencia: mesReferencia,
      valor_total: valorTotal,
    });
  },

  async markPaymentPaid(paymentId: string) {
    return employeeRepository.markPaymentPaid(paymentId);
  },
};
