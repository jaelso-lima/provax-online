import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Users, BookOpen, FileText, TrendingUp } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";

const COLORS = [
  "hsl(245, 58%, 51%)",
  "hsl(168, 72%, 40%)",
  "hsl(32, 95%, 55%)",
  "hsl(340, 75%, 55%)",
  "hsl(200, 70%, 50%)",
];

export default function AdminDashboard() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_stats");
      if (error) throw error;
      return data as any;
    },
  });

  const usersByPlan = stats?.users_by_plan
    ? Object.entries(stats.users_by_plan).map(([name, value]) => ({ name, value: value as number }))
    : [];

  const usageByMode = stats?.usage_by_mode
    ? Object.entries(stats.usage_by_mode).map(([name, value]) => ({
        name: name === "concurso" ? "Concurso" : name === "enem" ? "ENEM" : "Universidade",
        total: value as number,
      }))
    : [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-['Space_Grotesk']">Dashboard Administrativo</h1>
          <p className="text-muted-foreground text-sm">Visão geral da plataforma</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "..." : stats?.total_users ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Total Usuários</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <TrendingUp className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "..." : stats?.active_users ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Ativos</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-chart-3/10">
                  <BookOpen className="h-5 w-5" style={{ color: "hsl(32, 95%, 55%)" }} />
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
                <div className="p-2 rounded-lg bg-chart-4/10">
                  <FileText className="h-5 w-5" style={{ color: "hsl(340, 75%, 55%)" }} />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "..." : stats?.total_redacoes ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Redações</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Users by Plan */}
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
      </div>
    </AdminLayout>
  );
}
