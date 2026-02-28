import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { Users, BookOpen, PenTool, Percent, CreditCard, Crown } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";

const COLORS = [
  "hsl(245, 58%, 51%)",
  "hsl(168, 72%, 40%)",
  "hsl(32, 95%, 55%)",
  "hsl(340, 75%, 55%)",
  "hsl(200, 70%, 50%)",
];

export default function AdminDashboard() {
  const { isAdmin, isPartner } = useAdminRole();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats", isPartner],
    queryFn: async () => {
      const rpcName = isPartner ? "get_partner_stats" : "get_admin_stats";
      const { data, error } = await supabase.rpc(rpcName);
      if (error) throw error;
      return data as any;
    },
    enabled: isAdmin || isPartner,
  });

  // Fetch recent signups for growth chart (admin only)
  const { data: recentProfiles } = useQuery({
    queryKey: ["admin-recent-signups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const usersByPlan = stats?.users_by_plan
    ? Object.entries(stats.users_by_plan).map(([name, value]) => ({ name, value: value as number }))
    : [];

  const usageByMode = stats?.usage_by_mode
    ? Object.entries(stats.usage_by_mode).map(([name, value]) => ({
        name: name === "concurso" ? "Concurso" : name === "enem" ? "ENEM" : name === "universidade" ? "Universidade" : name,
        total: value as number,
      }))
    : [];

  // Subs by plan+period from RPC
  const subsByPlanPeriod: { plan_name: string; periodo: string; count: number }[] = stats?.subs_by_plan_period ?? [];
  const subsPlanData = subsByPlanPeriod.map((s) => ({
    name: `${s.plan_name} ${s.periodo === "mensal" ? "Mensal" : s.periodo === "semestral" ? "Semestral" : "Anual"}`,
    value: s.count,
  }));

  // Build monthly signup chart
  const signupChart = (() => {
    if (!recentProfiles) return [];
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      months[key] = 0;
    }
    recentProfiles.forEach((p) => {
      const d = new Date(p.created_at);
      const key = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      if (key in months) months[key]++;
    });
    return Object.entries(months).map(([month, count]) => ({ month, usuarios: count }));
  })();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-['Space_Grotesk']">
            {isPartner ? "Visão Geral" : "Dashboard Administrativo"}
          </h1>
          <p className="text-muted-foreground text-sm">
            {isPartner ? "Métricas de crescimento da plataforma" : "Visão geral da plataforma"}
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "..." : stats?.total_users ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Cadastrados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <CreditCard className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "..." : stats?.paying_users ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Pagantes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          {stats?.growth_pct !== undefined && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-chart-3/10">
                    <Percent className="h-5 w-5" style={{ color: "hsl(32, 95%, 55%)" }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{isLoading ? "..." : `${stats.growth_pct}%`}</p>
                    <p className="text-xs text-muted-foreground">Crescimento</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "..." : stats?.total_simulados ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Simulados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <PenTool className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "..." : stats?.total_redacoes ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Redações</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Paying users breakdown */}
        {subsPlanData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                Assinantes Ativos por Plano
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {subsPlanData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.value} {item.value === 1 ? "usuário" : "usuários"}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Users by Plan Pie */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por Plano</CardTitle>
            </CardHeader>
            <CardContent>
              {usersByPlan.length > 0 ? (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={200}>
                    <PieChart>
                      <Pie data={usersByPlan} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                        {usersByPlan.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {usersByPlan.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{item.name}:</span>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Sem dados</p>
              )}
            </CardContent>
          </Card>

          {/* Usage by Mode */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Uso por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {usageByMode.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={usageByMode}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(245, 58%, 51%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm">Sem dados</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Growth Chart (admin only) */}
        {isAdmin && signupChart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Crescimento de Usuários - Últimos 6 Meses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={signupChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="usuarios"
                    name="Novos Usuários"
                    stroke="hsl(245, 58%, 51%)"
                    fill="hsl(245, 58%, 51%)"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Partner notice */}
        {isPartner && (
          <Card className="border-dashed">
            <CardContent className="py-6 text-center">
              <p className="text-sm text-muted-foreground">
                📊 Você está visualizando o painel de sócio com métricas de crescimento.
                <br />
                Dados financeiros e gestão de usuários são restritos ao administrador.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
