import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { partnerService } from "@/services/partnerService";
import { toast } from "sonner";
import { DollarSign, CheckCircle, Clock, Plus, TrendingUp, Percent, Wallet } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function useMonthlyFinancials() {
  const currentMonthStart = new Date().toISOString().slice(0, 7) + "-01";

  const { data: subs } = useQuery({
    queryKey: ["partner-pay-subs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("periodo, plans(preco_mensal, preco_semestral, preco_anual)")
        .eq("status", "active");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: expenses } = useQuery({
    queryKey: ["partner-pay-expenses", currentMonthStart],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("valor")
        .gte("data", currentMonthStart);
      if (error) throw error;
      return data;
    },
  });

  const faturamento = (subs || []).reduce((sum: number, s: any) => {
    const p = s.plans;
    if (!p) return sum;
    if (s.periodo === "mensal") return sum + (p.preco_mensal || 0);
    if (s.periodo === "semestral") return sum + ((p.preco_semestral || 0) / 6);
    if (s.periodo === "anual") return sum + ((p.preco_anual || 0) / 12);
    return sum;
  }, 0);

  const despesas = (expenses || []).reduce((sum: number, e: any) => sum + Number(e.valor), 0);
  const lucroLiquido = Math.max(0, faturamento - despesas);

  return { faturamento, despesas, lucroLiquido };
}

export default function AdminPartnerPayments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newPayment, setNewPayment] = useState({ partner_id: "", mes: "", observacao: "" });

  const { faturamento, despesas, lucroLiquido } = useMonthlyFinancials();

  const { data: partners } = useQuery({
    queryKey: ["admin-partners-list"],
    queryFn: () => partnerService.listPartnersWithProfiles(),
  });

  const { data: payments, isLoading } = useQuery({
    queryKey: ["admin-partner-payments"],
    queryFn: () => partnerService.listAllPayments(),
  });

  const activePartners = partners?.filter((p: any) => p.status === "ativo") || [];

  const currentMonth = new Date().toISOString().slice(0, 7);

  // Check which partners already have a PAID payment this month
  const paidThisMonth = (payments || []).filter(
    (pay: any) => pay.mes_referencia === currentMonth && pay.status_pagamento === "pago"
  );
  const paidPartnerIds = new Set(paidThisMonth.map((p: any) => p.partner_id));

  // Calculate estimates: partners already paid this month show R$0
  const partnerEstimates = activePartners.map((p: any) => {
    const perc = Number(p.percentual_participacao);
    const alreadyPaid = paidPartnerIds.has(p.id);
    const valor = alreadyPaid ? 0 : lucroLiquido * (perc / 100);
    return { ...p, valorReceber: valor, percentual: perc, alreadyPaid };
  });
  const totalRepasses = partnerEstimates.reduce((s, p) => s + p.valorReceber, 0);
  const fluxoCaixa = lucroLiquido - totalRepasses;

  const createMutation = useMutation({
    mutationFn: async () => {
      const est = partnerEstimates.find((p) => p.id === newPayment.partner_id);
      if (!est) throw new Error("Selecione um sócio");
      if (est.alreadyPaid) throw new Error("Este sócio já foi pago neste mês");
      // Check for existing pending payment for this partner+month
      const existing = (payments || []).find(
        (pay: any) => pay.partner_id === newPayment.partner_id && pay.mes_referencia === newPayment.mes
      );
      if (existing) throw new Error(`Já existe um pagamento para este sócio em ${newPayment.mes}`);
      return partnerService.createPayment(
        newPayment.partner_id,
        newPayment.mes,
        est.valorReceber,
        newPayment.observacao || undefined
      );
    },
    onSuccess: () => {
      toast.success("Pagamento registrado");
      queryClient.invalidateQueries({ queryKey: ["admin-partner-payments"] });
      setShowCreate(false);
      setNewPayment({ partner_id: "", mes: "", observacao: "" });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const markPaidMutation = useMutation({
    mutationFn: async (pay: any) => {
      await partnerService.markPaymentPaid(pay.id);
      const partnerName = pay.partners?.profiles?.nome || "Sócio";
      await supabase.from("expenses").insert({
        descricao: `Repasse sócio: ${partnerName} (${pay.mes_referencia})`,
        valor: Number(pay.valor),
        categoria: "pessoal",
        data: new Date().toISOString().split("T")[0],
        created_by: user!.id,
        observacao: `Gerado automaticamente - Ref: ${pay.mes_referencia}`,
      });
    },
    onSuccess: () => {
      toast.success("Pagamento marcado como pago e registrado como despesa");
      queryClient.invalidateQueries({ queryKey: ["admin-partner-payments"] });
      queryClient.invalidateQueries({ queryKey: ["admin-expenses"] });
      queryClient.invalidateQueries({ queryKey: ["partner-pay-expenses"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // currentMonth already declared above

  const selectedEst = partnerEstimates.find((p) => p.id === newPayment.partner_id);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-primary" />
              Pagamentos de Sócios
            </h1>
            <p className="text-muted-foreground text-sm">Controle de repasses mensais</p>
          </div>
          <Button onClick={() => { setNewPayment({ ...newPayment, mes: currentMonth }); setShowCreate(true); }} className="gap-2">
            <Plus className="h-4 w-4" /> Registrar Pagamento
          </Button>
        </div>

        {/* Financial summary */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-lg font-bold">R$ {faturamento.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Faturamento Bruto</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-lg font-bold">R$ {despesas.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Despesas Mensais</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-lg font-bold text-primary">R$ {lucroLiquido.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Lucro Líquido</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-lg font-bold text-destructive">R$ {totalRepasses.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total Repasses</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <Wallet className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-lg font-bold text-primary">R$ {fluxoCaixa.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Fluxo de Caixa</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Per-partner estimate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Percent className="h-4 w-4" /> Estimativas do Mês
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {partnerEstimates.map((p) => (
                <div key={p.id} className={`flex items-center justify-between p-3 rounded-lg border ${p.alreadyPaid ? 'border-primary/30 bg-primary/5 opacity-60' : 'border-border'}`}>
                  <div>
                    <p className="text-sm font-semibold">{p.profiles?.nome || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {p.percentual}% do lucro líquido (R$ {lucroLiquido.toFixed(2)})
                    </p>
                  </div>
                  {p.alreadyPaid ? (
                    <Badge variant="default" className="gap-1">
                      <CheckCircle className="h-3 w-3" /> Já pago este mês
                    </Badge>
                  ) : (
                    <p className="text-sm font-bold text-primary">R$ {p.valorReceber.toFixed(2)}</p>
                  )}
                </div>
              ))}
              <div className="flex items-center justify-between p-3 rounded-lg border-2 border-primary/30 bg-primary/5">
                <div>
                  <p className="text-sm font-semibold">Fluxo de Caixa Restante</p>
                  <p className="text-xs text-muted-foreground">Lucro após todos os repasses</p>
                </div>
                <p className="text-sm font-bold text-primary">R$ {fluxoCaixa.toFixed(2)}</p>
              </div>
              {activePartners.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum sócio ativo</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Payments history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de Pagamentos</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-4">Carregando...</p>
            ) : !payments?.length ? (
              <p className="text-muted-foreground text-center py-4">Nenhum pagamento registrado</p>
            ) : (
              <div className="space-y-2">
                {payments.map((pay: any) => (
                  <div key={pay.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-semibold">{pay.partners?.profiles?.nome || "—"}</p>
                      <p className="text-xs text-muted-foreground">
                        {pay.mes_referencia} • R$ {Number(pay.valor).toFixed(2)}
                        {pay.observacao && ` • ${pay.observacao}`}
                      </p>
                      {pay.data_pagamento && (
                        <p className="text-xs text-muted-foreground">
                          Pago em: {new Date(pay.data_pagamento).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                      {pay.partners?.pix_chave && (
                        <p className="text-xs text-accent-foreground">
                          PIX ({pay.partners.pix_tipo || "—"}): {pay.partners.pix_chave}
                          {pay.partners.banco && ` • ${pay.partners.banco}`}
                          {pay.partners.titular && ` • ${pay.partners.titular}`}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {pay.status_pagamento === "pago" ? (
                        <Badge variant="default" className="gap-1">
                          <CheckCircle className="h-3 w-3" /> Pago
                        </Badge>
                      ) : (
                        <>
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" /> Pendente
                          </Badge>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => markPaidMutation.mutate(pay)}
                            disabled={markPaidMutation.isPending}
                          >
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

      {/* Create payment dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Registrar Pagamento</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Sócio</Label>
              <Select value={newPayment.partner_id} onValueChange={(v) => setNewPayment({ ...newPayment, partner_id: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                <SelectContent>
                  {activePartners.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>{p.profiles?.nome} ({p.percentual_participacao}%)</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Mês Referência</Label>
              <Input type="month" value={newPayment.mes} onChange={(e) => setNewPayment({ ...newPayment, mes: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Observação</Label>
              <Input placeholder="Opcional" value={newPayment.observacao} onChange={(e) => setNewPayment({ ...newPayment, observacao: e.target.value })} />
            </div>
            {selectedEst && (
              <div className="p-3 rounded-lg bg-muted text-sm space-y-1">
                <p>Lucro Líquido: <span className="font-semibold">R$ {lucroLiquido.toFixed(2)}</span></p>
                <p>{selectedEst.percentual}% = <span className="font-bold text-primary">R$ {selectedEst.valorReceber.toFixed(2)}</span></p>
              </div>
            )}
            <Button className="w-full" onClick={() => createMutation.mutate()} disabled={createMutation.isPending || !newPayment.partner_id || !newPayment.mes}>
              {createMutation.isPending ? "Registrando..." : "Registrar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
