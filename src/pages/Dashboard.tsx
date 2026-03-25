import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { BookOpen, PenTool, Coins, Trophy, Share2, Copy, CheckCircle, Clock, XCircle, Link as LinkIcon, Gift, PlayCircle, Eye, Radar, Crown, Flame, Target, FileSearch, BookMarked } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Modo = "concurso" | "enem" | null;

export default function Dashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const isFreePlan = !profile?.plano || profile.plano === "free";
  const [stats, setStats] = useState({ totalSimulados: 0, notaMedia: 0, totalRedacoes: 0 });
  const [recentSimulados, setRecentSimulados] = useState<any[]>([]);
  const [redacoes, setRedacoes] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [historicoTab, setHistoricoTab] = useState<"concurso" | "enem" | "redacao">("concurso");
  const [modo, setModo] = useState<Modo>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("provax_modo") as string | null;
      if (saved === "universidade") return null;
      return (saved as Modo) || null;
    }
    return null;
  });

  const [dailyLimit, setDailyLimit] = useState<{ limite: number; usado: number; restante: number; pode_gerar: boolean } | null>(null);
  const [radarVisivel, setRadarVisivel] = useState(false);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: sims }, { data: reds }, { data: refs }] = await Promise.all([
        supabase.from("simulados").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("redacoes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("referrals").select("*").eq("referrer_id", user.id).order("created_at", { ascending: false }),
      ]);
      if (sims) {
        setRecentSimulados(sims);
        const finalizados = sims.filter((s: any) => s.status === "finalizado" && s.pontuacao != null);
        setStats({
          totalSimulados: sims.length,
          notaMedia: finalizados.length > 0 ? Math.round(finalizados.reduce((a: number, b: any) => a + Number(b.pontuacao), 0) / finalizados.length) : 0,
          totalRedacoes: reds?.length ?? 0,
        });
      }
      if (reds) setRedacoes(reds);
      if (refs) setReferrals(refs);

      try {
        const { data: limitData } = await supabase.rpc("check_daily_limit", { _user_id: user.id });
        if (limitData) setDailyLimit(limitData as any);
      } catch (e) { console.error("Daily limit check error:", e); }

      try {
        const { data: radarData } = await supabase
          .from("site_content").select("valor").eq("chave", "radar_visivel").maybeSingle();
        setRadarVisivel(radarData?.valor === "true");
      } catch (e) { console.error("Radar visibility check error:", e); }
    };
    load();
  }, [user]);

  const xp = profile?.xp ?? 0;
  const nivel = profile?.nivel ?? 1;
  const xpParaProximo = nivel * 100;
  const xpProgresso = Math.min((xp / xpParaProximo) * 100, 100);

  const copiarCodigo = () => {
    if (profile?.codigo_indicacao) {
      navigator.clipboard.writeText(profile.codigo_indicacao);
      toast({ title: "Código copiado!" });
    }
  };

  const copiarLink = () => {
    if (profile?.codigo_indicacao) {
      const baseUrl = window.location.hostname.includes("lovable") 
        ? "https://provax-teste.lovable.app" 
        : window.location.origin;
      const link = `${baseUrl}/register?ref=${profile.codigo_indicacao}`;
      navigator.clipboard.writeText(link);
      toast({ title: "Link de indicação copiado!" });
    }
  };

  const referralsValidados = referrals.filter(r => r.status === 'validado').length;

  const selecionarModo = (m: Modo) => {
    setModo(m);
    if (m) localStorage.setItem("provax_modo", m);
    else localStorage.removeItem("provax_modo");
  };

  const [freeHistoryViews, setFreeHistoryViews] = useState<Set<string>>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("provax_free_history_views") || "[]");
      return new Set(saved);
    } catch { return new Set(); }
  });

  const FREE_HISTORY_LIMIT = 2;

  const handleFreeHistoryClick = (simuladoId: string) => {
    if (!isFreePlan) { navigate(`/simulado/resultado/${simuladoId}`); return; }
    if (freeHistoryViews.has(simuladoId)) { navigate(`/simulado/resultado/${simuladoId}`); return; }
    if (freeHistoryViews.size >= FREE_HISTORY_LIMIT) {
      toast({ title: "Limite atingido", description: "Assine o Plano Pro para ver mais históricos." });
      return;
    }
    const updated = new Set(freeHistoryViews);
    updated.add(simuladoId);
    setFreeHistoryViews(updated);
    localStorage.setItem("provax_free_history_views", JSON.stringify([...updated]));
    navigate(`/simulado/resultado/${simuladoId}`);
  };

  const renderSimuladoHistory = (modoFilter: string) => {
    const filtered = recentSimulados.filter((s: any) => s.modo === modoFilter);
    const emAndamento = filtered.filter((s: any) => s.status === "em_andamento");
    const concluidos = filtered.filter((s: any) => s.status === "finalizado");

    if (filtered.length === 0) {
      return (
        <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
          Nenhum simulado encontrado. Comece agora!
        </CardContent></Card>
      );
    }

    const freeViewsUsed = freeHistoryViews.size;
    const freeViewsLeft = Math.max(0, FREE_HISTORY_LIMIT - freeViewsUsed);

    return (
      <Tabs defaultValue={emAndamento.length > 0 ? "em_andamento" : "concluidos"} className="w-full">
        <TabsList className="mb-3 w-full">
          <TabsTrigger value="em_andamento" className="flex-1 gap-1.5">
            Em andamento
            {emAndamento.length > 0 && <Badge variant="secondary" className="text-xs">{emAndamento.length}</Badge>}
          </TabsTrigger>
          <TabsTrigger value="concluidos" className="flex-1 gap-1.5">
            Concluídos
            {concluidos.length > 0 && <Badge variant="secondary" className="text-xs">{concluidos.length}</Badge>}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="em_andamento">
          {emAndamento.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum simulado em andamento.</p>
          ) : (
            <div className="space-y-2">
              {emAndamento.map((s: any) => (
                <Card key={s.id} className="border-l-4 border-l-warning transition-all hover:shadow-sm">
                  <CardContent className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">
                        {s.tipo === "prova_completa" ? "Prova Completa" : "Simulado"} — {s.quantidade}q
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString("pt-BR")}
                        {s.ultima_questao_respondida > 0 && ` • ${s.ultima_questao_respondida}/${s.total_questoes}`}
                      </p>
                    </div>
                    <Button size="sm" className="gap-1.5 shrink-0" onClick={() => navigate(`/simulado?continuar=${s.id}`)}>
                      <PlayCircle className="h-3.5 w-3.5" /> Continuar
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="concluidos">
          {concluidos.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">Nenhum simulado concluído ainda.</p>
          ) : (
            <div className="space-y-2">
              {isFreePlan && (
                <p className="text-xs text-muted-foreground px-1 mb-1">
                  {freeViewsLeft > 0 ? `${freeViewsLeft} visualização(ões) restante(s)` : "Limite atingido — "}
                  {freeViewsLeft === 0 && <button className="text-primary font-medium hover:underline" onClick={() => navigate("/planos")}>Assine o Pro</button>}
                </p>
              )}
              {concluidos.map((s: any) => {
                const isLocked = isFreePlan && !freeHistoryViews.has(s.id) && freeViewsUsed >= FREE_HISTORY_LIMIT;
                return (
                  <Card
                    key={s.id}
                    className={`transition-all ${isLocked ? "opacity-50" : "cursor-pointer hover:shadow-sm"}`}
                    onClick={() => handleFreeHistoryClick(s.id)}
                  >
                    <CardContent className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {s.tipo === "prova_completa" ? "Prova Completa" : "Simulado"} — {s.quantidade}q
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(s.created_at).toLocaleDateString("pt-BR")} •{" "}
                          <span className="font-medium text-primary">{s.pontuacao}%</span> • {s.acertos}/{s.total_questoes} acertos
                        </p>
                      </div>
                      {isLocked ? (
                        <Badge variant="secondary" className="shrink-0 text-xs">🔒</Badge>
                      ) : (
                        <Button variant="ghost" size="sm" className="shrink-0 gap-1 text-xs" onClick={(e) => { e.stopPropagation(); handleFreeHistoryClick(s.id); }}>
                          <Eye className="h-3.5 w-3.5" /> Ver
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    );
  };

  // Mode selection screen
  if (!modo) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="container flex-1 py-16">
          <div className="mb-10 text-center">
            <h1 className="font-display text-3xl font-bold">Olá, {profile?.nome || "Estudante"}!</h1>
            <p className="mt-2 text-muted-foreground">Escolha seu objetivo de estudo</p>
          </div>
          <div className="mx-auto grid max-w-2xl gap-4 sm:grid-cols-2">
            <Card className="cursor-pointer border-2 border-transparent transition-all hover:border-primary hover:shadow-md" onClick={() => selecionarModo("concurso")}>
              <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
                  <BookOpen className="h-7 w-7 text-primary" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold">Concurso Público</p>
                  <p className="mt-1 text-sm text-muted-foreground">Simulados por banca, cargo, matéria e região</p>
                </div>
              </CardContent>
            </Card>
            <Card className="cursor-pointer border-2 border-transparent transition-all hover:border-accent hover:shadow-md" onClick={() => selecionarModo("enem")}>
              <CardContent className="flex flex-col items-center gap-3 py-8 text-center">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10">
                  <PenTool className="h-7 w-7 text-accent" />
                </div>
                <div>
                  <p className="font-display text-lg font-bold">ENEM</p>
                  <p className="mt-1 text-sm text-muted-foreground">Linguagens, Matemática, Humanas e Natureza</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  const pendingSimulado = recentSimulados.find(s => s.status === "em_andamento" && s.modo === modo);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="container flex-1 px-4 py-6 max-w-3xl lg:max-w-5xl">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-2xl font-bold">Olá, {profile?.nome?.split(" ")[0] || "Estudante"}!</h1>
            <button onClick={() => selecionarModo(null)} className="text-xs text-muted-foreground hover:text-primary transition-colors">
              {modo === "concurso" ? "🎯 Concurso" : "🎓 ENEM"} ›
            </button>
          </div>
          {/* Compact XP bar */}
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs font-medium text-muted-foreground">Nv {nivel}</span>
            <Progress value={xpProgresso} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground">{xp}/{xpParaProximo} XP</span>
          </div>
        </div>

        {/* Pending simulado alert */}
        {pendingSimulado && (
          <Card className="mb-4 border-warning/30 bg-warning/5">
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-warning" />
                <p className="text-sm font-medium">Simulado em aberto</p>
              </div>
              <Button size="sm" className="gap-1.5" onClick={() => navigate(`/simulado?continuar=${pendingSimulado.id}`)}>
                <PlayCircle className="h-3.5 w-3.5" /> Continuar
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Daily mission — compact */}
        <Card className="mb-4">
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Target className="h-4 w-4 text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium">
                    {dailyLimit ? `${dailyLimit.usado}/${dailyLimit.limite} questões hoje` : "Meta diária"}
                  </p>
                </div>
              </div>
              <Button size="sm" onClick={() => navigate(`/simulado?modo=${modo}`)}>
                Praticar
              </Button>
            </div>
            {dailyLimit && (
              <Progress value={(dailyLimit.usado / dailyLimit.limite) * 100} className="mt-2 h-1.5" />
            )}
          </CardContent>
        </Card>

        {/* Paywall — daily limit reached */}
        {dailyLimit && !dailyLimit.pode_gerar && isFreePlan && (
          <Card className="mb-4 border-destructive/20">
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2">
                <Flame className="h-4 w-4 text-destructive" />
                <p className="text-sm font-medium">Limite diário atingido</p>
              </div>
              <Button size="sm" variant="default" onClick={() => navigate("/planos")}>
                Desbloquear
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Quick actions — 2x2 grid */}
        <div className="mb-6 grid grid-cols-2 gap-2.5">
          <Card
            className="cursor-pointer border border-primary/20 transition-all hover:shadow-sm active:scale-[0.98]"
            onClick={() => navigate(`/simulado?modo=${modo}`)}
          >
            <CardContent className="flex items-center gap-3 py-3.5 px-4">
              <BookOpen className="h-5 w-5 text-primary shrink-0" />
              <p className="text-sm font-medium">Simulado</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-all hover:shadow-sm active:scale-[0.98]"
            onClick={() => navigate("/redacao")}
          >
            <CardContent className="flex items-center gap-3 py-3.5 px-4">
              <PenTool className="h-5 w-5 text-accent shrink-0" />
              <p className="text-sm font-medium">Redação IA</p>
            </CardContent>
          </Card>
          <Card
            className="cursor-pointer transition-all hover:shadow-sm active:scale-[0.98]"
            onClick={() => navigate("/comprar-moedas")}
          >
            <CardContent className="flex items-center gap-3 py-3.5 px-4">
              <Coins className="h-5 w-5 text-coin shrink-0" />
              <p className="text-sm font-medium">Moedas</p>
            </CardContent>
          </Card>
          {radarVisivel ? (
            <Card
              className="cursor-pointer transition-all hover:shadow-sm active:scale-[0.98]"
              onClick={() => navigate("/concursos")}
            >
              <CardContent className="flex items-center gap-3 py-3.5 px-4">
                <Radar className="h-5 w-5 text-primary shrink-0" />
                <p className="text-sm font-medium">Concursos</p>
              </CardContent>
            </Card>
          ) : (
            <Card
              className="cursor-pointer transition-all hover:shadow-sm active:scale-[0.98]"
              onClick={() => navigate("/planos")}
            >
              <CardContent className="flex items-center gap-3 py-3.5 px-4">
                <Trophy className="h-5 w-5 text-warning shrink-0" />
                <p className="text-sm font-medium">Planos</p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Analisar Edital CTA */}
        <Card
          className="mb-6 cursor-pointer border-primary/20 bg-primary/5 transition-all hover:shadow-md active:scale-[0.99]"
          onClick={() => navigate("/analisar-edital")}
        >
          <CardContent className="flex items-center gap-4 py-4 px-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <FileSearch className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">Analisar Edital com IA</p>
              <p className="text-xs text-muted-foreground">Envie o PDF e receba resumos, dicas e estratégias</p>
            </div>
            {isFreePlan && <Badge variant="secondary" className="shrink-0 text-xs gap-1"><Crown className="h-3 w-3" /> PRO</Badge>}
          </CardContent>
        </Card>

        {/* Cadernos CTA */}
        <Card
          className="mb-6 cursor-pointer border-accent/20 bg-accent/5 transition-all hover:shadow-md active:scale-[0.99]"
          onClick={() => navigate("/cadernos")}
        >
          <CardContent className="flex items-center gap-4 py-4 px-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 shrink-0">
              <BookMarked className="h-5 w-5 text-accent-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-sm">Meus Cadernos</p>
              <p className="text-xs text-muted-foreground">Organize matérias e gere simulados personalizados</p>
            </div>
          </CardContent>
        </Card>

        {/* Stats — compact row */}
        <div className="mb-6 grid grid-cols-3 gap-2.5">
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold">{stats.totalSimulados}</p>
              <p className="text-[11px] text-muted-foreground">Simulados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold">{stats.notaMedia}%</p>
              <p className="text-[11px] text-muted-foreground">Nota Média</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="py-3 text-center">
              <p className="text-2xl font-bold">{stats.totalRedacoes}</p>
              <p className="text-[11px] text-muted-foreground">Redações</p>
            </CardContent>
          </Card>
        </div>

        {/* Upgrade banner — subtle, only for free */}
        {isFreePlan && (
          <Card className="mb-6 border-accent/20">
            <CardContent className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2.5">
                <Crown className="h-4 w-4 text-accent" />
                <p className="text-sm">Estude sem limites com o <span className="font-semibold">Plano Pro</span></p>
              </div>
              <Button size="sm" variant="outline" onClick={() => navigate("/planos")}>Ver planos</Button>
            </CardContent>
          </Card>
        )}

        {/* Referral — collapsed into a single row */}
        <Card className="mb-6">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Gift className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Indique e ganhe</p>
                  <p className="text-xs text-muted-foreground">{referralsValidados} validado(s) • 20 moedas por amigo</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={copiarLink} className="gap-1.5 text-xs">
                <LinkIcon className="h-3 w-3" /> Copiar link
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Study history */}
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Histórico</h2>
        </div>
        <div className="mb-3 flex gap-2">
          {([
            { key: "concurso" as const, label: "Concurso" },
            { key: "enem" as const, label: "ENEM" },
            { key: "redacao" as const, label: "Redação" },
          ]).map(tab => (
            <Button
              key={tab.key}
              variant={historicoTab === tab.key ? "default" : "ghost"}
              size="sm"
              className="text-xs"
              onClick={() => setHistoricoTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {historicoTab !== "redacao" ? (
          renderSimuladoHistory(historicoTab)
        ) : (
          (() => {
            if (isFreePlan) {
              return (
                <Card>
                  <CardContent className="py-6 text-center space-y-2">
                    <p className="text-sm font-medium">Histórico de redações disponível no Plano Pro</p>
                    <Button size="sm" onClick={() => navigate("/planos")}>Ver Planos</Button>
                  </CardContent>
                </Card>
              );
            }
            if (redacoes.length === 0) return (
              <Card><CardContent className="py-6 text-center text-sm text-muted-foreground">
                Nenhuma redação encontrada.
              </CardContent></Card>
            );
            return (
              <div className="space-y-2">
                {redacoes.map((r: any) => (
                  <Card key={r.id} className="transition-all hover:shadow-sm">
                    <CardContent className="flex items-center justify-between gap-3 py-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{r.tema}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.created_at).toLocaleDateString("pt-BR")} •{" "}
                          {r.status === "corrigida" && r.nota != null ? (
                            <span className="font-medium text-primary">{r.nota}/1000</span>
                          ) : (
                            <span className="text-warning">{r.status === "pendente" ? "Aguardando" : r.status}</span>
                          )}
                        </p>
                      </div>
                      <Badge variant={r.status === "corrigida" ? "default" : "secondary"} className="shrink-0 text-xs">
                        {r.status === "corrigida" ? "Corrigida" : "Pendente"}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            );
          })()
        )}

      </main>
      <AppFooter />
    </div>
  );
}
