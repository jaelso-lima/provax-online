import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Coins, Trophy, Target, FileText, TrendingUp, Star } from "lucide-react";

export default function Dashboard() {
  const { profile } = useAuth();

  const stats = [
    { label: "Moedas", value: profile?.saldo_moedas ?? 0, icon: Coins, color: "text-coin" },
    { label: "Nível", value: profile?.nivel ?? 1, icon: Star, color: "text-primary" },
    { label: "XP", value: profile?.xp ?? 0, icon: TrendingUp, color: "text-accent" },
    { label: "Plano", value: profile?.plano === "premium" ? "Premium" : "Free", icon: Trophy, color: "text-primary" },
  ];

  return (
    <AppLayout>
      <div className="space-y-8">
        <div>
          <h1 className="font-display text-3xl font-bold">
            Olá, {profile?.nome || "Estudante"}! 👋
          </h1>
          <p className="mt-1 text-muted-foreground">
            Acompanhe seu progresso e continue evoluindo.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat) => (
            <Card key={stat.label} className="glass-card">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold font-display">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <Target className="h-5 w-5 text-primary" />
                Simulados Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Nenhum simulado realizado ainda. Comece agora!
              </p>
            </CardContent>
          </Card>

          <Card className="glass-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display">
                <FileText className="h-5 w-5 text-accent" />
                Redações Recentes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Nenhuma redação enviada ainda. Pratique sua escrita!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </AppLayout>
  );
}
