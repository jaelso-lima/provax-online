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
import { toast } from "sonner";
import { UserPlus, Users, DollarSign, FileText, CheckCircle, Clock, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminEmployees() {
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
      const summary = await employeeService.getTasksSummary(employeeId);
      return employeeService.createPayment(employeeId, paymentMes, summary.totalValue);
    },
    onSuccess: () => {
      toast.success("Pagamento registrado");
      queryClient.invalidateQueries({ queryKey: ["admin-employee-payments"] });
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] flex items-center gap-2">
              <Users className="h-6 w-6 text-primary" />
              Funcionários Temporários
            </h1>
            <p className="text-muted-foreground text-sm">Gestão de colaboradores para importação de PDFs</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <UserPlus className="h-4 w-4" /> Adicionar Funcionário
          </Button>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
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
              <p className="text-2xl font-bold">{allPayments?.filter((p: any) => p.status_pagamento === "pendente").length || 0}</p>
              <p className="text-xs text-muted-foreground">Pagamentos Pendentes</p>
            </CardContent>
          </Card>
        </div>

        {/* Employee list */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Lista de Funcionários</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-4">Carregando...</p>
            ) : !employees?.length ? (
              <p className="text-muted-foreground text-center py-4">Nenhum funcionário cadastrado</p>
            ) : (
              <div className="space-y-2">
                {employees.map((emp: any) => (
                  <div key={emp.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-semibold">{emp.profiles?.nome || emp.profiles?.email || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {emp.tipo_trabalho} • R$ {Number(emp.valor_por_tarefa).toFixed(2)}/tarefa
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={emp.status === "ativo" ? "default" : "secondary"}>
                        {emp.status}
                      </Badge>
                      <Button size="sm" variant="outline" onClick={() => setShowPayment(emp.id)}>
                        <DollarSign className="h-3 w-3 mr-1" /> Pagar
                      </Button>
                      {emp.status === "ativo" && (
                        <Button size="sm" variant="ghost" onClick={() => deactivateMutation.mutate(emp.id)}>
                          Desativar
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
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
              <Label>Valor por PDF (R$)</Label>
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
            <Button className="w-full" onClick={() => showPayment && createPaymentMutation.mutate(showPayment)} disabled={createPaymentMutation.isPending}>
              {createPaymentMutation.isPending ? "Registrando..." : "Registrar Pagamento"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
