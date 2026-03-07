import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { employeeService } from "@/services/employeeService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { UserPlus, Users, DollarSign, FileText, CheckCircle, Clock, Radar, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminEmployees() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showPayment, setShowPayment] = useState<string | null>(null);
  const [newEmployee, setNewEmployee] = useState({ email: "", valor: "2" });
  const [paymentMes, setPaymentMes] = useState(new Date().toISOString().slice(0, 7));

  const { data: employees, isLoading } = useQuery({
    queryKey: ["admin-employees"],
    queryFn: () => employeeService.listEmployees(),
  });

  const { data: allPayments } = useQuery({
    queryKey: ["admin-employee-payments"],
    queryFn: () => employeeService.listAllPayments(),
  });

  // Fetch all tasks grouped by employee with type breakdown
  const { data: allTasks } = useQuery({
    queryKey: ["admin-employee-all-tasks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_tasks")
        .select("employee_id, tipo_tarefa, valor, status_pagamento");
      if (error) throw error;
      return data || [];
    },
  });

  // Build per-employee stats
  const employeeStats = (employeeId: string) => {
    const tasks = (allTasks || []).filter((t: any) => t.employee_id === employeeId);
    const pdfCount = tasks.filter((t: any) => t.tipo_tarefa === "upload_pdf" || t.tipo_tarefa === "upload_gabarito").length;
    const concursoCount = tasks.filter((t: any) => t.tipo_tarefa === "cadastro_concurso").length;
    const totalValue = tasks.reduce((s: number, t: any) => s + Number(t.valor), 0);

    // Calculate paid amount from payments
    const empPayments = (allPayments || []).filter((p: any) => p.employee_id === employeeId && p.status_pagamento === "pago");
    const totalPaid = empPayments.reduce((s: number, p: any) => s + Number(p.valor_total), 0);

    const pendingPayments = (allPayments || []).filter((p: any) => p.employee_id === employeeId && p.status_pagamento === "pendente");
    const totalPending = pendingPayments.reduce((s: number, p: any) => s + Number(p.valor_total), 0);

    // Devedor = total tasks value - total paid - total pending registered
    const devedor = Math.max(0, totalValue - totalPaid - totalPending);

    return { pdfCount, concursoCount, totalValue, totalPaid, totalPending, devedor, taskCount: tasks.length };
  };

  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", newEmployee.email.trim())
        .single();
      if (pErr || !profile) throw new Error("Usuário não encontrado");
      return employeeService.createEmployee(profile.id, "upload_pdf", parseFloat(newEmployee.valor) || 2);
    },
    onSuccess: () => {
      toast.success("Funcionário adicionado");
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
      setShowAdd(false);
      setNewEmployee({ email: "", valor: "2" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => employeeService.updateEmployee(id, { status: "inativo" }),
    onSuccess: () => {
      toast.success("Funcionário desativado");
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (employeeId: string) => {
      const stats = employeeStats(employeeId);
      if (stats.devedor <= 0) throw new Error("Sem saldo devedor para registrar pagamento");
      const emp = employees?.find((e: any) => e.id === employeeId);
      const empName = emp?.profiles?.nome || emp?.profiles?.email || "Funcionário";

      // Create payment already as "pago"
      const payment = await employeeService.createPayment(employeeId, paymentMes, stats.devedor);
      await employeeService.markPaymentPaid(payment.id);

      // Ensure expense is created (fallback if trigger fails)
      const { data: existingExpense } = await supabase
        .from("expenses")
        .select("id")
        .ilike("descricao", `%${payment.id}%`)
        .maybeSingle();

      if (!existingExpense) {
        await supabase.from("expenses").insert({
          descricao: `Pagamento funcionário: ${empName} (${paymentMes})`,
          valor: stats.devedor,
          categoria: "pessoal",
          data: new Date().toISOString().split("T")[0],
          created_by: user!.id,
          observacao: `Gerado automaticamente - Ref: ${paymentMes}`,
        });
      }

      return payment;
    },
    onSuccess: () => {
      toast.success("Pagamento registrado como pago! Despesa lançada automaticamente.");
      queryClient.invalidateQueries({ queryKey: ["admin-employee-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-employee-all-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["admin-expenses-billing"] });
      setShowPayment(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => employeeService.markPaymentPaid(id),
    onSuccess: () => {
      toast.success("Pagamento marcado como pago");
      queryClient.invalidateQueries({ queryKey: ["admin-employee-payments"] });
    },
  });

  const totalEmployees = employees?.filter((e: any) => e.status === "ativo").length || 0;
  const totalDevedor = (employees || []).reduce((s: number, e: any) => s + employeeStats(e.id).devedor, 0);
  const totalPendingPayments = (allPayments || []).filter((p: any) => p.status_pagamento === "pendente").length;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Funcionários Temporários
            </h1>
            <p className="text-muted-foreground text-sm">Gestão de colaboradores e controle financeiro</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <UserPlus className="h-4 w-4" /> Adicionar Funcionário
          </Button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{totalEmployees}</p>
              <p className="text-xs text-muted-foreground">Funcionários Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{employees?.length || 0}</p>
              <p className="text-xs text-muted-foreground">Total Registrados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-destructive">R$ {totalDevedor.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total Devedor</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{totalPendingPayments}</p>
              <p className="text-xs text-muted-foreground">Pagamentos Pendentes</p>
            </CardContent>
          </Card>
        </div>

        {/* Employee list with detailed stats */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Funcionários e Saldos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-4">Carregando...</p>
            ) : !employees?.length ? (
              <p className="text-muted-foreground text-center py-4">Nenhum funcionário cadastrado</p>
            ) : (
              <div className="space-y-3">
                {employees.map((emp: any) => {
                  const stats = employeeStats(emp.id);
                  return (
                    <div key={emp.id} className="p-4 rounded-lg border border-border space-y-3">
                      {/* Header row */}
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{emp.profiles?.nome || emp.profiles?.email || "—"}</p>
                          <p className="text-xs text-muted-foreground">
                            R$ {Number(emp.valor_por_tarefa).toFixed(2)}/tarefa
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={emp.status === "ativo" ? "default" : "secondary"}>
                            {emp.status}
                          </Badge>
                          {emp.status === "ativo" && (
                            <Button size="sm" variant="ghost" onClick={() => deactivateMutation.mutate(emp.id)}>
                              Desativar
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Stats row */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="flex items-center gap-2 text-sm">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span><strong>{stats.pdfCount}</strong> PDFs</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <Radar className="h-4 w-4 text-muted-foreground" />
                          <span><strong>{stats.concursoCount}</strong> Concursos</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span>Total: <strong>R$ {stats.totalValue.toFixed(2)}</strong></span>
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-muted-foreground" />
                          <span>Pago: <strong>R$ {stats.totalPaid.toFixed(2)}</strong></span>
                        </div>
                      </div>

                      {/* Devedor + action */}
                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center gap-2">
                          {stats.devedor > 0 ? (
                            <>
                              <AlertTriangle className="h-4 w-4 text-destructive" />
                              <span className="text-sm font-semibold text-destructive">
                                Devedor: R$ {stats.devedor.toFixed(2)}
                              </span>
                            </>
                          ) : stats.totalPending > 0 ? (
                            <>
                              <Clock className="h-4 w-4 text-yellow-500" />
                              <span className="text-sm font-semibold text-yellow-600">
                                Pagamento pendente: R$ {stats.totalPending.toFixed(2)}
                              </span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="h-4 w-4 text-green-500" />
                              <span className="text-sm text-green-600 font-semibold">Em dia</span>
                            </>
                          )}
                        </div>
                        {stats.devedor > 0 && (
                          <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowPayment(emp.id)}>
                            <DollarSign className="h-3 w-3" /> Registrar Pagamento
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {!allPayments?.length ? (
              <p className="text-muted-foreground text-center py-4">Nenhum pagamento registrado</p>
            ) : (
              <div className="space-y-2">
                {allPayments.map((pay: any) => (
                  <div key={pay.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-semibold">{pay.temp_employees?.profiles?.nome || "—"}</p>
                      <p className="text-xs text-muted-foreground">{pay.mes_referencia} • R$ {Number(pay.valor_total).toFixed(2)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {pay.status_pagamento === "pago" ? (
                        <Badge variant="default" className="gap-1"><CheckCircle className="h-3 w-3" /> Pago</Badge>
                      ) : (
                        <>
                          <Badge variant="outline" className="gap-1"><Clock className="h-3 w-3" /> Pendente</Badge>
                          <Button size="sm" variant="outline" onClick={() => markPaidMutation.mutate(pay.id)}>
                            Marcar Pago
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add employee dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Adicionar Funcionário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>E-mail do Usuário</Label>
              <Input placeholder="email@exemplo.com" value={newEmployee.email} onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Valor por Tarefa (R$)</Label>
              <Input type="number" step="0.5" min="0.5" value={newEmployee.valor} onChange={(e) => setNewEmployee({ ...newEmployee, valor: e.target.value })} />
            </div>
            <Button className="w-full" onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !newEmployee.email}>
              {addMutation.isPending ? "Adicionando..." : "Confirmar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create payment dialog */}
      <Dialog open={!!showPayment} onOpenChange={(open) => !open && setShowPayment(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Registrar Pagamento</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Mês Referência</Label>
              <Input type="month" value={paymentMes} onChange={(e) => setPaymentMes(e.target.value)} />
            </div>
            {showPayment && (
              <div className="p-3 rounded-lg bg-muted text-sm">
                <p>Valor devedor: <strong className="text-destructive">R$ {employeeStats(showPayment).devedor.toFixed(2)}</strong></p>
              </div>
            )}
            <Button className="w-full" onClick={() => showPayment && createPaymentMutation.mutate(showPayment)} disabled={createPaymentMutation.isPending}>
              {createPaymentMutation.isPending ? "Registrando..." : "Registrar Pagamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
