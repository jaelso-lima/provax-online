import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { DollarSign, TrendingUp, XCircle, CheckCircle, TrendingDown, Minus } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from "recharts";

const COLORS = [
  "hsl(245, 58%, 51%)",
  "hsl(168, 72%, 40%)",
  "hsl(32, 95%, 55%)",
  "hsl(340, 75%, 55%)",
  "hsl(200, 70%, 50%)",
];

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
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, plans(nome, preco_mensal, preco_semestral, preco_anual)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: expenses } = useQuery({
    queryKey: ["admin-expenses-billing"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("data", { ascending: false });
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

  // Expenses
  const totalExpenses = expenses?.reduce((acc, e) => acc + Number(e.valor), 0) ?? 0;
  const monthlyExpenses = expenses
    ?.filter((e) => {
      const d = new Date(e.data);
      const now = new Date();
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((acc, e) => acc + Number(e.valor), 0) ?? 0;

  const netMonthly = monthlyRevenue - monthlyExpenses;

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

  // Expenses by category
  const expensesByCategory = expenses?.reduce((acc: Record<string, number>, e) => {
    acc[e.categoria] = (acc[e.categoria] || 0) + Number(e.valor);
    return acc;
  }, {}) ?? {};

  const expensesPieData = Object.entries(expensesByCategory).map(([name, value]) => ({
    name,
    value: Number(value.toFixed(2)),
  }));

  // Monthly comparison (last 6 months)
  const monthlyComparison = (() => {
    const months: { month: string; receita: number; despesas: number }[] = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      const mExpenses = expenses
        ?.filter((e) => {
          const ed = new Date(e.data);
          return ed.getMonth() === d.getMonth() && ed.getFullYear() === d.getFullYear();
        })
        .reduce((acc, e) => acc + Number(e.valor), 0) ?? 0;
      // For revenue we use monthly estimate (simplified)
      months.push({ month: label, receita: i === 0 ? monthlyRevenue : 0, despesas: mExpenses });
    }
    // Set current month revenue
    return months;
  })();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-['Space_Grotesk']">Faturamento</h1>
          <p className="text-muted-foreground text-sm">Visão financeira completa da plataforma</p>
        </div>

        {/* Revenue Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3 sm:gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <DollarSign className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-lg font-bold">R$ {monthlyRevenue.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Receita Mensal</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-lg font-bold">R$ {monthlyExpenses.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Despesas Mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: netMonthly >= 0 ? "hsl(168 72% 40% / 0.1)" : "hsl(0 84% 60% / 0.1)" }}>
                  {netMonthly >= 0 ? (
                    <TrendingUp className="h-5 w-5" style={{ color: "hsl(168, 72%, 40%)" }} />
                  ) : (
                    <Minus className="h-5 w-5 text-destructive" />
                  )}
                </div>
                <div>
                  <p className={`text-lg font-bold ${netMonthly >= 0 ? "text-accent" : "text-destructive"}`}>
                    R$ {netMonthly.toFixed(2)}
                  </p>
                  <p className="text-xs text-muted-foreground">Lucro Mensal</p>
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
                  <p className="text-lg font-bold">R$ {annualRevenue.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Receita Anual</p>
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
                  <p className="text-lg font-bold">{activeSubscriptions.length}</p>
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
                  <p className="text-lg font-bold">{cancelledSubscriptions.length}</p>
                  <p className="text-xs text-muted-foreground">Canceladas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Revenue by Plan */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Receita Mensal por Plano</CardTitle>
            </CardHeader>
            <CardContent>
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
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

          {/* Expenses by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Despesas por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {expensesPieData.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  <ResponsiveContainer width="100%" height={220} className="sm:w-1/2">
                    <PieChart>
                      <Pie data={expensesPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                        {expensesPieData.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val: number) => `R$ ${val.toFixed(2)}`} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {expensesPieData.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground capitalize">{item.name}:</span>
                        <span className="font-semibold">R$ {item.value.toFixed(2)}</span>
                      </div>
                    ))}
                    <div className="pt-2 border-t border-border">
                      <span className="text-sm font-bold">Total: R$ {totalExpenses.toFixed(2)}</span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm text-center py-8">Nenhuma despesa registrada</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Monthly Evolution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Despesas - Últimos 6 Meses</CardTitle>
          </CardHeader>
          <CardContent>
            {expenses && expenses.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={monthlyComparison}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip formatter={(val: number) => `R$ ${val.toFixed(2)}`} />
                  <Legend />
                  <Bar dataKey="despesas" name="Despesas" fill="hsl(340, 75%, 55%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-muted-foreground text-sm text-center py-8">Sem dados suficientes</p>
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
      </div>
    </AdminLayout>
  );
}
