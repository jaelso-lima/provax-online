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
import { DollarSign, CheckCircle, Clock, Wallet, Landmark, Save } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminPartnerFinancial() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get partner data
  const { data: partnerData, isLoading: loadingPartner } = useQuery({
    queryKey: ["partner-by-user", user?.id],
    queryFn: () => partnerService.getPartnerByUserId(user!.id),
    enabled: !!user,
  });

  // Bank details form
  const [bankForm, setBankForm] = useState({
    pix_chave: "",
    pix_tipo: "",
    banco: "",
    agencia: "",
    conta: "",
    titular: "",
  });
  const [bankLoaded, setBankLoaded] = useState(false);

  // Load bank details from partner data
  if (partnerData && !bankLoaded) {
    setBankForm({
      pix_chave: partnerData.pix_chave || "",
      pix_tipo: partnerData.pix_tipo || "",
      banco: partnerData.banco || "",
      agencia: partnerData.agencia || "",
      conta: partnerData.conta || "",
      titular: partnerData.titular || "",
    });
    setBankLoaded(true);
  }

  // Partner payments
  const { data: payments, isLoading: loadingPayments } = useQuery({
    queryKey: ["partner-my-payments", partnerData?.id],
    queryFn: () => partnerService.listPayments(partnerData!.id),
    enabled: !!partnerData?.id,
  });

  // Financial stats for earnings calc
  const { data: finData } = useQuery({
    queryKey: ["partner-financial-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_partner_stats");
      if (error) throw error;
      return data as any;
    },
    enabled: !!partnerData,
  });

  // Get expenses for net profit calc
  const { data: expenses } = useQuery({
    queryKey: ["partner-expenses-total"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("valor")
        .gte("data", new Date().toISOString().slice(0, 7) + "-01");
      if (error) throw error;
      return data;
    },
    enabled: !!partnerData,
  });

  // Get subscriptions for revenue calc
  const { data: subs } = useQuery({
    queryKey: ["partner-subs-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plans(preco_mensal, preco_semestral, preco_anual)")
        .eq("status", "active");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!partnerData,
  });

  const faturamento = (subs || []).reduce((sum: number, s: any) => {
    const plan = s.plans;
    if (!plan) return sum;
    if (s.periodo === "mensal") return sum + (plan.preco_mensal || 0);
    if (s.periodo === "semestral") return sum + ((plan.preco_semestral || 0) / 6);
    if (s.periodo === "anual") return sum + ((plan.preco_anual || 0) / 12);
    return sum;
  }, 0);

  const despesasMensal = (expenses || []).reduce((sum: number, e: any) => sum + Number(e.valor), 0);
  const lucroLiquido = Math.max(0, faturamento - despesasMensal);
  const percentual = Number(partnerData?.percentual_participacao || 0);
  const ganhoEstimado = lucroLiquido * (percentual / 100);

  // Save bank details
  const saveBankMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("partners")
        .update({
          pix_chave: bankForm.pix_chave || null,
          pix_tipo: bankForm.pix_tipo || null,
          banco: bankForm.banco || null,
          agencia: bankForm.agencia || null,
          conta: bankForm.conta || null,
          titular: bankForm.titular || null,
        })
        .eq("id", partnerData!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Dados bancários salvos com sucesso");
      queryClient.invalidateQueries({ queryKey: ["partner-by-user"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (loadingPartner) {
    return (
      <AdminLayout>
        <p className="text-muted-foreground text-center py-8">Carregando...</p>
      </AdminLayout>
    );
  }

  if (!partnerData) {
    return (
      <AdminLayout>
        <p className="text-muted-foreground text-center py-8">Nenhuma participação ativa encontrada.</p>
      </AdminLayout>
    );
  }

  const totalPago = (payments || [])
    .filter((p: any) => p.status_pagamento === "pago")
    .reduce((sum: number, p: any) => sum + Number(p.valor), 0);

  const totalPendente = (payments || [])
    .filter((p: any) => p.status_pagamento === "pendente")
    .reduce((sum: number, p: any) => sum + Number(p.valor), 0);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-['Space_Grotesk'] flex items-center gap-2">
            <Wallet className="h-6 w-6 text-primary" />
            Meus Ganhos
          </h1>
          <p className="text-muted-foreground text-sm">Acompanhe seus rendimentos e pagamentos</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-lg font-bold text-green-600">R$ {ganhoEstimado.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Estimativa Mês Atual</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-lg font-bold">{percentual}%</p>
              <p className="text-xs text-muted-foreground">Sua Participação</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-lg font-bold text-green-600">R$ {totalPago.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total Recebido</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-lg font-bold text-yellow-600">R$ {totalPendente.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Pendente</p>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cálculo do Mês</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Faturamento Mensal</span>
                <span className="font-medium">R$ {faturamento.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">(-) Despesas</span>
                <span className="font-medium text-red-500">R$ {despesasMensal.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="text-muted-foreground">Lucro Líquido</span>
                <span className="font-bold">R$ {lucroLiquido.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Sua parte ({percentual}%)</span>
                <span className="font-bold text-green-600">R$ {ganhoEstimado.toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bank details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Landmark className="h-4 w-4" /> Dados Bancários / PIX
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Chave PIX</Label>
                <Select value={bankForm.pix_tipo} onValueChange={(v) => setBankForm({ ...bankForm, pix_tipo: v })}>
                  <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cpf">CPF</SelectItem>
                    <SelectItem value="cnpj">CNPJ</SelectItem>
                    <SelectItem value="email">E-mail</SelectItem>
                    <SelectItem value="telefone">Telefone</SelectItem>
                    <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Chave PIX</Label>
                <Input value={bankForm.pix_chave} onChange={(e) => setBankForm({ ...bankForm, pix_chave: e.target.value })} placeholder="Sua chave PIX" />
              </div>
              <div className="space-y-2">
                <Label>Banco</Label>
                <Input value={bankForm.banco} onChange={(e) => setBankForm({ ...bankForm, banco: e.target.value })} placeholder="Ex: Nubank, Itaú..." />
              </div>
              <div className="space-y-2">
                <Label>Agência</Label>
                <Input value={bankForm.agencia} onChange={(e) => setBankForm({ ...bankForm, agencia: e.target.value })} placeholder="0001" />
              </div>
              <div className="space-y-2">
                <Label>Conta</Label>
                <Input value={bankForm.conta} onChange={(e) => setBankForm({ ...bankForm, conta: e.target.value })} placeholder="12345-6" />
              </div>
              <div className="space-y-2">
                <Label>Titular</Label>
                <Input value={bankForm.titular} onChange={(e) => setBankForm({ ...bankForm, titular: e.target.value })} placeholder="Nome completo do titular" />
              </div>
            </div>
            <Button className="mt-4 gap-2" onClick={() => saveBankMutation.mutate()} disabled={saveBankMutation.isPending}>
              <Save className="h-4 w-4" />
              {saveBankMutation.isPending ? "Salvando..." : "Salvar Dados Bancários"}
            </Button>
          </CardContent>
        </Card>

        {/* Payment history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4" /> Histórico de Pagamentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingPayments ? (
              <p className="text-muted-foreground text-center py-4">Carregando...</p>
            ) : !payments?.length ? (
              <p className="text-muted-foreground text-center py-4">Nenhum pagamento registrado</p>
            ) : (
              <div className="space-y-2">
                {payments.map((pay: any) => (
                  <div key={pay.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-semibold">Referência: {pay.mes_referencia}</p>
                      <p className="text-xs text-muted-foreground">
                        R$ {Number(pay.valor).toFixed(2)}
                        {pay.observacao && ` • ${pay.observacao}`}
                      </p>
                      {pay.data_pagamento && (
                        <p className="text-xs text-muted-foreground">
                          Pago em: {new Date(pay.data_pagamento).toLocaleDateString("pt-BR")}
                        </p>
                      )}
                    </div>
                    {pay.status_pagamento === "pago" ? (
                      <Badge variant="default" className="gap-1">
                        <CheckCircle className="h-3 w-3" /> Pago
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1">
                        <Clock className="h-3 w-3" /> Pendente
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
