import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Copy, Share2, ArrowLeft, TrendingUp, CheckCircle, XCircle, BarChart3 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";

const chartConfig: ChartConfig = {
  acertos: { label: "Acertos", color: "hsl(var(--primary))" },
  erros: { label: "Erros", color: "hsl(var(--destructive))" },
};

export default function Perfil() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState(profile?.nome || "");
  const [saving, setSaving] = useState(false);
  const [transacoes, setTransacoes] = useState<any[]>([]);
  const [respostas, setRespostas] = useState<any[]>([]);
  const [simulados, setSimulados] = useState<any[]>([]);

  useEffect(() => { if (profile) setNome(profile.nome); }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase.from("moeda_transacoes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setTransacoes(data); });
    supabase.from("simulados").select("acertos, total_questoes, pontuacao, created_at, modo").eq("user_id", user.id).eq("status", "finalizado").order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setSimulados(data); });
  }, [user]);

  const handleSave = async () => {
    if (!nome.trim()) { toast({ title: "Nome vazio", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ nome: nome.trim() }).eq("id", user!.id);
    setSaving(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Perfil atualizado!" }); await refreshProfile(); }
  };

  const copiarCodigo = () => {
    if (profile?.codigo_indicacao) {
      navigator.clipboard.writeText(profile.codigo_indicacao);
      toast({ title: "Código copiado!" });
    }
  };

  const stats = useMemo(() => {
    if (!simulados.length) return null;
    const totalAcertos = simulados.reduce((s, r) => s + (r.acertos || 0), 0);
    const totalQuestoes = simulados.reduce((s, r) => s + (r.total_questoes || 0), 0);
    const totalErros = totalQuestoes - totalAcertos;
    const media = totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0;

    // últimos 5 simulados para gráfico de barras (mais recente à direita)
    const ultimos = simulados.slice(0, 5).reverse().map((s, i) => ({
      name: `#${i + 1}`,
      acertos: s.acertos || 0,
      erros: (s.total_questoes || 0) - (s.acertos || 0),
    }));

    return { totalAcertos, totalErros, totalQuestoes, media, ultimos, total: simulados.length };
  }, [simulados]);

  const xp = profile?.xp ?? 0;
  const nivel = profile?.nivel ?? 1;

  const pieData = stats ? [
    { name: "Acertos", value: stats.totalAcertos, fill: "hsl(var(--primary))" },
    { name: "Erros", value: stats.totalErros, fill: "hsl(var(--destructive))" },
  ] : [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="container max-w-lg flex-1 py-6 px-4">
        <Button variant="ghost" size="sm" className="mb-4 gap-1.5 text-muted-foreground" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <h1 className="mb-6 font-display text-2xl font-bold">Meu Perfil</h1>

        {/* Dados pessoais */}
        <Card className="mb-4">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input value={user?.email || ""} disabled className="opacity-60" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Plano</Label>
                <Input value={profile?.plano || "free"} disabled className="opacity-60" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Moedas</Label>
                <Input value={`${profile?.saldo_moedas ?? 0}`} disabled className="opacity-60" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Nível {nivel}</Label>
                <span className="text-xs text-muted-foreground">{xp} XP</span>
              </div>
              <Progress value={Math.min((xp / (nivel * 100)) * 100, 100)} className="h-1.5" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
            </Button>
          </CardContent>
        </Card>

        {/* Indicação */}
        <Card className="mb-4">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Código de Indicação</p>
                  <p className="text-xs text-muted-foreground">20 moedas por amigo</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={copiarCodigo} className="gap-1.5 text-xs">
                <Copy className="h-3 w-3" />{profile?.codigo_indicacao || "..."}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Gráfico de Desempenho */}
        {stats && (
          <Card className="mb-4">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <BarChart3 className="h-4 w-4 text-primary" />
                Desempenho
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              {/* Resumo rápido */}
              <div className="grid grid-cols-4 gap-2 mb-4">
                <div className="rounded-lg bg-muted p-2.5 text-center">
                  <p className="text-lg font-bold text-foreground">{stats.totalQuestoes}</p>
                  <p className="text-[10px] text-muted-foreground">Questões</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2.5 text-center">
                  <p className="text-lg font-bold text-primary">{stats.media}%</p>
                  <p className="text-[10px] text-muted-foreground">Média</p>
                </div>
                <div className="rounded-lg bg-primary/10 p-2.5 text-center">
                  <p className="text-lg font-bold text-primary">{stats.totalAcertos}</p>
                  <p className="text-[10px] text-muted-foreground">Acertos</p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-2.5 text-center">
                  <p className="text-lg font-bold text-destructive">{stats.totalErros}</p>
                  <p className="text-[10px] text-muted-foreground">Erros</p>
                </div>
              </div>

              {/* Gráfico de Pizza */}
              <div className="flex items-center gap-4 mb-4">
                <ChartContainer config={chartConfig} className="h-[100px] w-[100px] shrink-0">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" cx="50%" cy="50%" innerRadius={25} outerRadius={45} strokeWidth={2}>
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.fill} />
                      ))}
                    </Pie>
                  </PieChart>
                </ChartContainer>
                <div className="flex-1 space-y-1.5">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-3.5 w-3.5 text-primary" />
                    <span className="text-xs">{stats.totalAcertos} acertos ({stats.totalQuestoes > 0 ? Math.round((stats.totalAcertos / stats.totalQuestoes) * 100) : 0}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <XCircle className="h-3.5 w-3.5 text-destructive" />
                    <span className="text-xs">{stats.totalErros} erros ({stats.totalQuestoes > 0 ? Math.round((stats.totalErros / stats.totalQuestoes) * 100) : 0}%)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">{stats.total} simulados</span>
                  </div>
                </div>
              </div>

              {/* Gráfico de Barras - Últimos 5 */}
              <p className="text-[10px] text-muted-foreground mb-1">Últimos 5 simulados</p>
              <ChartContainer config={chartConfig} className="h-[120px] w-full">
                <BarChart data={stats.ultimos} barGap={2}>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis hide />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="acertos" stackId="a" fill="hsl(var(--primary))" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="erros" stackId="a" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        )}

        {/* Histórico de Transações */}
        {transacoes.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="text-sm font-semibold">Histórico de Transações</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="ml-3 space-y-0 divide-y divide-border">
                {transacoes.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2.5 pl-3 border-l-2 border-muted">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm truncate">{t.descricao}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <span className={`ml-3 shrink-0 text-sm font-bold ${t.tipo === "credito" ? "text-primary" : "text-destructive"}`}>
                      {t.tipo === "credito" ? "+" : "-"}{t.valor}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
