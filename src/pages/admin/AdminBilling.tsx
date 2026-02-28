import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, XCircle, CheckCircle } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function AdminBilling() {
  const { data: plans } = useQuery({
    queryKey: ["admin-plans-billing"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").eq("ativo", true);
      if (error) throw error;
      return data;
    },
  });

  const { data: subscriptions } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      // Admin can see all via RLS policy
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plans(nome, preco_mensal, preco_semestral, preco_anual)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const activeSubscriptions = subscriptions?.filter((s) => s.status === "active") ?? [];
  const cancelledSubscriptions = subscriptions?.filter((s) => s.status === "cancelled") ?? [];

  // Revenue estimation
  const monthlyRevenue = activeSubscriptions.reduce((acc, s) => {
    const plan = s.plans as any;
    if (!plan) return acc;
    if (s.periodo === "mensal") return acc + Number(plan.preco_mensal || 0);
    if (s.periodo === "semestral") return acc + Number(plan.preco_semestral || 0) / 6;
    if (s.periodo === "anual") return acc + Number(plan.preco_anual || 0) / 12;
    return acc;
  }, 0);

  const annualRevenue = monthlyRevenue * 12;

  // Revenue by plan
  const revenueByPlan = activeSubscriptions.reduce((acc: Record<string, { count: number; revenue: number }>, s) => {
    const plan = s.plans as any;
    const planName = plan?.nome || "Desconhecido";
    if (!acc[planName]) acc[planName] = { count: 0, revenue: 0 };
    acc[planName].count += 1;
    if (s.periodo === "mensal") acc[planName].revenue += Number(plan?.preco_mensal || 0);
    else if (s.periodo === "semestral") acc[planName].revenue += Number(plan?.preco_semestral || 0) / 6;
    else if (s.periodo === "anual") acc[planName].revenue += Number(plan?.preco_anual || 0) / 12;
    return acc;
  }, {});

  const chartData = Object.entries(revenueByPlan).map(([name, val]) => ({
    name,
    receita: Number(val.revenue.toFixed(2)),
    assinantes: val.count,
  }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-['Space_Grotesk']">Faturamento</h1>
          <p className="text-muted-foreground text-sm">Visão financeira da plataforma</p>
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <DollarSign className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-xl font-bold">R$ {monthlyRevenue.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Receita Mensal (est.)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <TrendingUp className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-xl font-bold">R$ {annualRevenue.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Receita Anual (est.)</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <CheckCircle className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-xl font-bold">{activeSubscriptions.length}</p>
                  <p className="text-xs text-muted-foreground">Assinaturas Ativas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <XCircle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xl font-bold">{cancelledSubscriptions.length}</p>
                  <p className="text-xs text-muted-foreground">Canceladas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Receita Mensal por Plano</CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(val: number) => `R$ ${val.toFixed(2)}`} />
                  <Bar dataKey="receita" fill="hsl(168, 72%, 40%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Nenhuma assinatura ativa</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Subscriptions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Assinaturas Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-96 overflow-auto">
              {subscriptions?.slice(0, 20).map((s) => (
                <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div>
                    <p className="text-sm font-medium">{(s.plans as any)?.nome || "—"}</p>
                    <p className="text-xs text-muted-foreground">
                      {s.periodo} • {new Date(s.started_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant={s.status === "active" ? "default" : "destructive"}>
                    {s.status === "active" ? "Ativa" : "Cancelada"}
                  </Badge>
                </div>
              ))}
              {(!subscriptions || subscriptions.length === 0) && (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhuma assinatura registrada</p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Stripe Notice */}
        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              💳 Integração com Stripe será ativada quando configurada.
              <br />
              Dados de receita atuais são estimativas baseadas nos planos cadastrados.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
