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
import { Loader2, Copy, Share2, ArrowLeft, TrendingUp, CheckCircle, XCircle, BarChart3, BookOpen, MessageCircle, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  const [respostas, setRespostas] = useState<any[]>([]);
  const [respostasPorMateria, setRespostasPorMateria] = useState<any[]>([]);
  const [simulados, setSimulados] = useState<any[]>([]);
  const [resetting, setResetting] = useState(false);

  useEffect(() => { if (profile) setNome(profile.nome); }, [profile]);

  useEffect(() => {
    if (!user) return;
    // Simulados finalizados
    supabase.from("simulados").select("id, acertos, total_questoes, pontuacao, created_at, modo").eq("user_id", user.id).eq("status", "finalizado").order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setSimulados(data); });
    // Buscar respostas reais com matéria via simulados do usuário
    supabase.from("simulados").select("id").eq("user_id", user.id).eq("status", "finalizado")
      .then(({ data: sims }) => {
        if (!sims?.length) return;
        const simIds = sims.map(s => s.id);
        // Respostas simples para stats gerais
        supabase.from("respostas").select("acertou").in("simulado_id", simIds).not("resposta_usuario", "is", null)
          .then(({ data }) => { if (data) setRespostas(data); });
        // Respostas com matéria para breakdown
        supabase.from("respostas").select("acertou, questoes!inner(materia_id, materias!inner(nome), topic_id, topics(nome))").in("simulado_id", simIds).not("resposta_usuario", "is", null)
          .then(({ data }) => { if (data) setRespostasPorMateria(data); });
      });
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
    // Usar respostas reais para acertos/erros precisos
    const respondidas = respostas.filter(r => r.acertou !== null);
    const totalRespondidas = respondidas.length;
    const totalAcertos = respondidas.filter(r => r.acertou === true).length;
    const totalErros = respondidas.filter(r => r.acertou === false).length;
    const media = totalRespondidas > 0 ? Math.round((totalAcertos / totalRespondidas) * 100) : 0;

    if (totalRespondidas === 0 && !simulados.length) return null;

    // últimos 5 simulados para gráfico de barras (usando acertos reais do simulado)
    const ultimos = simulados.slice(0, 5).reverse().map((s, i) => ({
      name: `#${i + 1}`,
      acertos: s.acertos || 0,
      erros: Math.max(0, (s.total_questoes || 0) - (s.acertos || 0)),
    }));

    return { totalAcertos, totalErros, totalQuestoes: totalRespondidas, media, ultimos, total: simulados.length };
  }, [respostas, simulados]);

  const materiaStats = useMemo(() => {
    if (!respostasPorMateria.length) return [];
    const map: Record<string, { nome: string; acertos: number; erros: number; total: number; topics: Record<string, { nome: string; acertos: number; erros: number; total: number }> }> = {};
    for (const r of respostasPorMateria) {
      const q = (r as any).questoes;
      const matNome = q?.materias?.nome;
      if (!matNome) continue;
      if (!map[matNome]) map[matNome] = { nome: matNome, acertos: 0, erros: 0, total: 0, topics: {} };
      map[matNome].total++;
      if (r.acertou === true) map[matNome].acertos++;
      else if (r.acertou === false) map[matNome].erros++;

      const topicNome = q?.topics?.nome;
      if (topicNome) {
        if (!map[matNome].topics[topicNome]) map[matNome].topics[topicNome] = { nome: topicNome, acertos: 0, erros: 0, total: 0 };
        map[matNome].topics[topicNome].total++;
        if (r.acertou === true) map[matNome].topics[topicNome].acertos++;
        else if (r.acertou === false) map[matNome].topics[topicNome].erros++;
      }
    }
    return Object.values(map).map(m => ({
      ...m,
      topicsList: Object.values(m.topics).sort((a, b) => b.total - a.total),
    })).sort((a, b) => b.total - a.total);
  }, [respostasPorMateria]);

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

        {/* Comunidade WhatsApp */}
        <Card className="mb-4">
          <CardContent className="py-3">
            <a
              href="https://chat.whatsapp.com/CaQMyka3CMU4QBUcl6WQxr"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between group"
            >
              <div className="flex items-center gap-2">
                <MessageCircle className="h-4 w-4 text-green-600 dark:text-green-500" />
                <div>
                  <p className="text-sm font-medium group-hover:text-foreground transition-colors">Grupo WhatsApp</p>
                  <p className="text-xs text-muted-foreground">Entre na comunidade de concurseiros</p>
                </div>
              </div>
              <Button variant="outline" size="sm" className="gap-1.5 text-xs text-green-600 dark:text-green-500 border-green-600/30">
                Entrar
              </Button>
            </a>
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

        {/* Desempenho por Matéria */}
        {materiaStats.length > 0 && (
          <Card className="mb-4">
            <CardHeader className="pb-2 pt-4 px-4">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <BookOpen className="h-4 w-4 text-primary" />
                Desempenho por Matéria
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <div className="space-y-2">
                {materiaStats.map(m => {
                  const pct = m.total > 0 ? Math.round((m.acertos / m.total) * 100) : 0;
                  return (
                    <Collapsible key={m.nome}>
                      <div>
                        <CollapsibleTrigger className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors group">
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0 transition-transform group-data-[state=open]:rotate-90" />
                            <span className="text-xs font-medium truncate">{m.nome}</span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            <span className="text-[10px] text-primary font-medium">{pct}%</span>
                            <span className="text-[10px] text-muted-foreground">{m.total}q</span>
                          </div>
                        </CollapsibleTrigger>
                        <div className="px-2">
                          <Progress value={pct} className="h-1 mb-1" />
                          <div className="flex gap-3 text-[10px] text-muted-foreground mb-1">
                            <span className="text-primary font-medium">{m.acertos} acertos</span>
                            <span className="text-destructive font-medium">{m.erros} erros</span>
                          </div>
                        </div>
                      </div>
                      <CollapsibleContent>
                        {m.topicsList.length > 0 ? (
                          <div className="ml-5 border-l border-border pl-3 py-1 space-y-1.5">
                            {m.topicsList.map(t => {
                              const tPct = t.total > 0 ? Math.round((t.acertos / t.total) * 100) : 0;
                              return (
                                <div key={t.nome}>
                                  <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-muted-foreground truncate flex-1">{t.nome}</span>
                                    <span className="text-[10px] text-muted-foreground ml-2 shrink-0">{tPct}% · {t.total}q</span>
                                  </div>
                                  <Progress value={tPct} className="h-1" />
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="ml-5 pl-3 text-[10px] text-muted-foreground py-1">Sem detalhamento por assunto</p>
                        )}
                      </CollapsibleContent>
                    </Collapsible>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Zerar Histórico */}
        <Card className="mb-4 border-destructive/30">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4 text-destructive" />
                <div>
                  <p className="text-sm font-medium">Zerar Histórico</p>
                  <p className="text-xs text-muted-foreground">Apaga simulados, respostas, redações e favoritos</p>
                </div>
              </div>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="destructive" size="sm" disabled={resetting}>
                    {resetting ? <Loader2 className="mr-1 h-3 w-3 animate-spin" /> : null}
                    Zerar
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação é <strong>irreversível</strong>. Todo o seu histórico de simulados, respostas, redações e favoritos será apagado permanentemente. Seu perfil, moedas e XP serão mantidos.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={async () => {
                        if (!user) return;
                        setResetting(true);
                        const { error } = await supabase.rpc("reset_user_history", { _user_id: user.id });
                        setResetting(false);
                        if (error) {
                          toast({ title: "Erro ao zerar", description: error.message, variant: "destructive" });
                        } else {
                          toast({ title: "Histórico zerado com sucesso!" });
                          setSimulados([]);
                          setRespostas([]);
                          setRespostasPorMateria([]);
                        }
                      }}
                    >
                      Sim, zerar tudo
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardContent>
        </Card>
      </main>
      <AppFooter />
    </div>
  );
}
