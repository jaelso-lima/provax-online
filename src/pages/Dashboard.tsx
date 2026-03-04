import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { BookOpen, PenTool, Coins, History, Trophy, FileText, Share2, Copy, GraduationCap, BookMarked, Users, CheckCircle, Clock, XCircle, Link as LinkIcon, Sparkles, Gift, PlayCircle, Eye, Radar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Modo = "concurso" | "enem" | null;

export default function Dashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalSimulados: 0, notaMedia: 0, totalRedacoes: 0 });
  const [recentSimulados, setRecentSimulados] = useState<any[]>([]);
  const [redacoes, setRedacoes] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [xpTransactions, setXpTransactions] = useState<any[]>([]);
  const [historicoTab, setHistoricoTab] = useState<"concurso" | "enem" | "redacao">("concurso");
  const [modo, setModo] = useState<Modo>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("provax_modo") as string | null;
      // Migrate old universidade selection
      if (saved === "universidade") return null;
      return (saved as Modo) || null;
    }
    return null;
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: sims }, { data: reds }, { data: refs }, { data: xpTx }] = await Promise.all([
        supabase.from("simulados").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("redacoes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(50),
        supabase.from("referrals").select("*").eq("referrer_id", user.id).order("created_at", { ascending: false }),
        supabase.from("xp_transactions").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
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
      if (xpTx) setXpTransactions(xpTx);
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
  const referralsPendentes = referrals.filter(r => r.status === 'pendente').length;
  const xpTotalIndicacoes = referrals.reduce((acc: number, r: any) => acc + (r.xp_total || 0), 0);

  const statusIcon = (status: string) => {
    switch (status) {
      case 'validado': return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'pendente': return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'cancelado': return <XCircle className="h-4 w-4 text-destructive" />;
      default: return null;
    }
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'validado': return 'Validado';
      case 'pendente': return 'Pendente';
      case 'cancelado': return 'Cancelado';
      default: return status;
    }
  };

  const selecionarModo = (m: Modo) => {
    setModo(m);
    if (m) localStorage.setItem("provax_modo", m);
    else localStorage.removeItem("provax_modo");
  };

   const renderSimuladoHistory = (modoFilter: string) => {
    const filtered = recentSimulados.filter((s: any) => s.modo === modoFilter);
    const emAndamento = filtered.filter((s: any) => s.status === "em_andamento");
    const concluidos = filtered.filter((s: any) => s.status === "finalizado");

    if (filtered.length === 0) {
      return (
        <Card><CardContent className="py-8 text-center text-muted-foreground">
          Nenhum simulado encontrado nesta categoria. Comece agora!
        </CardContent></Card>
      );
    }

    // Free users: can see in-progress but concluidos are gated
    if (isFreePlan) {
      return (
        <div className="space-y-4">
          {emAndamento.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-muted-foreground">📌 Em andamento</h3>
              {emAndamento.map((s: any) => (
                <Card key={s.id} className="border-l-4 border-l-warning transition-all hover:shadow-md">
                  <CardHeader className="flex-row items-center justify-between py-3">
                    <div>
                      <CardTitle className="text-sm">
                        {s.tipo === "prova_completa" ? "Prova Completa" : "Simulado"} — {s.quantidade} questões
                      </CardTitle>
                      <CardDescription>
                        {new Date(s.created_at).toLocaleDateString("pt-BR")} •{" "}
                        <span className="text-warning font-medium">Em andamento</span>
                      </CardDescription>
                    </div>
                    <Button size="sm" className="gap-2" onClick={(e) => { e.stopPropagation(); navigate(`/simulado?continuar=${s.id}`); }}>
                      <PlayCircle className="h-4 w-4" /> Continuar
                    </Button>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
          <Card className="border-primary/30">
            <CardContent className="py-8 text-center space-y-3">
              <div className="text-3xl">🔒</div>
              <h3 className="font-display text-lg font-semibold">Histórico completo disponível no Plano Pro</h3>
              <p className="text-sm text-muted-foreground">
                Assine um plano pago para acessar o histórico de simulados concluídos, revisar questões e acompanhar sua evolução.
              </p>
              <Button onClick={() => navigate("/planos")}>Ver Planos</Button>
            </CardContent>
          </Card>
        </div>
      );
    }

    return (
      <Tabs defaultValue={emAndamento.length > 0 ? "em_andamento" : "concluidos"} className="w-full">
        <TabsList className="mb-4 w-full">
          <TabsTrigger value="em_andamento" className="flex-1 gap-2">
            📌 Em andamento
            {emAndamento.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{emAndamento.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="concluidos" className="flex-1 gap-2">
            📊 Concluídos
            {concluidos.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{concluidos.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="em_andamento">
          {emAndamento.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-muted-foreground text-sm">
              Nenhum simulado em andamento. Bom sinal — você finaliza tudo! 💪
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {emAndamento.map((s: any) => (
                <Card key={s.id} className="border-l-4 border-l-warning transition-all hover:shadow-md">
                  <CardHeader className="flex-row items-center justify-between py-3">
                    <div>
                      <CardTitle className="text-sm">
                        {s.tipo === "prova_completa" ? "Prova Completa" : "Simulado"} — {s.quantidade} questões
                      </CardTitle>
                      <CardDescription>
                        {new Date(s.created_at).toLocaleDateString("pt-BR")} •{" "}
                        <span className="text-warning font-medium">Em andamento</span>
                        {s.ultima_questao_respondida != null && s.ultima_questao_respondida > 0 && (
                          <span className="text-muted-foreground"> • {s.ultima_questao_respondida}/{s.total_questoes} respondidas</span>
                        )}
                      </CardDescription>
                    </div>
                    <Button
                      size="sm"
                      className="gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/simulado?continuar=${s.id}`);
                      }}
                    >
                      <PlayCircle className="h-4 w-4" />
                      Continuar
                    </Button>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="concluidos">
          {concluidos.length === 0 ? (
            <Card><CardContent className="py-6 text-center text-muted-foreground text-sm">
              Nenhum simulado concluído ainda. Finalize seu primeiro! 🚀
            </CardContent></Card>
          ) : (
            <div className="space-y-3">
              {concluidos.map((s: any) => (
                <Card
                  key={s.id}
                  className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
                  onClick={() => navigate(`/simulado/resultado/${s.id}`)}
                >
                  <CardHeader className="flex-row items-center justify-between py-3">
                    <div>
                      <CardTitle className="text-sm">
                        {s.tipo === "prova_completa" ? "Prova Completa" : "Simulado"} — {s.quantidade} questões
                      </CardTitle>
                      <CardDescription>
                        {new Date(s.created_at).toLocaleDateString("pt-BR")} •{" "}
                        <span className="font-medium text-primary">Nota: {s.pontuacao}% — Acertos: {s.acertos}/{s.total_questoes}</span>
                        {s.tempo_gasto != null && (
                          <span className="text-muted-foreground"> • {Math.floor(s.tempo_gasto / 60)}min</span>
                        )}
                      </CardDescription>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/simulado/resultado/${s.id}`);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                      Revisar
                    </Button>
                  </CardHeader>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    );
  };

  if (!modo) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="container flex-1 py-16">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-bold">Olá, {profile?.nome || "Estudante"}! 👋</h1>
            <p className="mt-2 text-muted-foreground">Escolha seu objetivo de estudo:</p>
          </div>
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-2">
            <Card className="cursor-pointer border-2 transition-all hover:border-primary hover:shadow-lg" onClick={() => selecionarModo("concurso")}>
              <CardHeader className="text-center">
                <GraduationCap className="mx-auto mb-2 h-12 w-12 text-primary" />
                <CardTitle className="font-display text-xl">Concurso Público</CardTitle>
                <CardDescription>Simulados por banca, cargo, matéria, assunto, nível, ano, região e órgão</CardDescription>
              </CardHeader>
              <CardContent className="text-center"><Button className="w-full">Selecionar</Button></CardContent>
            </Card>
            <Card className="cursor-pointer border-2 transition-all hover:border-accent hover:shadow-lg" onClick={() => selecionarModo("enem")}>
              <CardHeader className="text-center">
                <BookMarked className="mx-auto mb-2 h-12 w-12 text-accent" />
                <CardTitle className="font-display text-xl">ENEM</CardTitle>
                <CardDescription>Linguagens, Matemática, Ciências Humanas, Ciências da Natureza e Redação</CardDescription>
              </CardHeader>
              <CardContent className="text-center"><Button variant="outline" className="w-full border-accent text-accent hover:bg-accent hover:text-accent-foreground">Selecionar</Button></CardContent>
            </Card>
          </div>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="container flex-1 py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Olá, {profile?.nome || "Estudante"}! 👋</h1>
          <p className="text-muted-foreground">
            Plano: {profile?.plano ?? "free"} • Nível {nivel} •{" "}
            <button onClick={() => selecionarModo(null)} className="text-primary hover:underline">
              {modo === "concurso" ? "🎯 Concurso Público" : "🎓 ENEM"} (trocar)
            </button>
          </p>
        </div>

        {/* Viés de consistência — streak diário */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="mb-6 border-primary/20 bg-primary/5">
            <CardContent className="py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">1 acerto = 1 XP 🎯</p>
                    <p className="text-xs text-muted-foreground">
                      {xpParaProximo - xp} XP para o nível {nivel + 1} — ganhe 20 moedas ao subir!
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="default" onClick={() => navigate(`/simulado?modo=${modo}`)}>
                  Praticar agora
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* AÇÕES RÁPIDAS — Mobile First */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="mb-6 lg:hidden">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold flex items-center gap-2">
              🚀 Comece Agora
            </h2>
            <Badge variant="secondary" className="text-xs animate-pulse">
              {stats.totalSimulados === 0 ? "Primeira vez? É grátis!" : `${stats.totalSimulados} simulados feitos`}
            </Badge>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Card 
              className="cursor-pointer border-2 border-primary/30 bg-primary/5 transition-all hover:shadow-lg hover:border-primary active:scale-[0.98]" 
              onClick={() => navigate(`/simulado?modo=${modo}`)}
            >
              <CardContent className="flex flex-col items-center gap-2 py-4 px-3 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <p className="text-sm font-bold">Gerar Simulado</p>
                <p className="text-[10px] text-muted-foreground leading-tight">
                  {stats.totalSimulados === 0 ? "Comece sua jornada agora" : "Continue evoluindo"}
                </p>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer border-2 border-accent/30 bg-accent/5 transition-all hover:shadow-lg hover:border-accent active:scale-[0.98]" 
              onClick={() => navigate("/redacao")}
            >
              <CardContent className="flex flex-col items-center gap-2 py-4 px-3 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                  <PenTool className="h-5 w-5 text-accent" />
                </div>
                <p className="text-sm font-bold">Redação IA</p>
                <p className="text-[10px] text-muted-foreground leading-tight">Correção detalhada</p>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]" 
              onClick={() => navigate("/comprar-moedas")}
            >
              <CardContent className="flex flex-col items-center gap-2 py-3 px-3 text-center">
                <Coins className="h-5 w-5 text-coin" />
                <p className="text-xs font-medium">Moedas</p>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]" 
              onClick={() => navigate("/concursos")}
            >
              <CardContent className="flex flex-col items-center gap-2 py-3 px-3 text-center">
                <Radar className="h-5 w-5 text-primary" />
                <p className="text-xs font-medium">Concursos</p>
              </CardContent>
            </Card>
            <Card 
              className="cursor-pointer transition-all hover:shadow-md active:scale-[0.98]" 
              onClick={() => navigate("/planos")}
            >
              <CardContent className="flex flex-col items-center gap-2 py-3 px-3 text-center">
                <Trophy className="h-5 w-5 text-warning" />
                <p className="text-xs font-medium">Planos</p>
              </CardContent>
            </Card>
          </div>
          {recentSimulados.filter(s => s.status === "em_andamento" && s.modo === modo).length > 0 && (
            <Card className="mt-3 border-warning/40 bg-warning/5">
              <CardContent className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-warning" />
                  <p className="text-xs font-medium">Você tem simulado em aberto!</p>
                </div>
                <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => {
                  const pending = recentSimulados.find(s => s.status === "em_andamento" && s.modo === modo);
                  if (pending) navigate(`/simulado?continuar=${pending.id}`);
                }}>
                  <PlayCircle className="h-3 w-3" /> Continuar
                </Button>
              </CardContent>
            </Card>
          )}
        </motion.div>

        <div className="mb-8 grid gap-4 grid-cols-2 md:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardDescription>Saldo de Moedas</CardDescription></CardHeader><CardContent><p className="text-3xl font-bold text-coin">{profile?.saldo_moedas ?? 0}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Simulados Feitos</CardDescription></CardHeader><CardContent><p className="text-3xl font-bold">{stats.totalSimulados}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Nota Média</CardDescription></CardHeader><CardContent><p className="text-3xl font-bold">{stats.notaMedia}%</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Redações</CardDescription></CardHeader><CardContent><p className="text-3xl font-bold">{stats.totalRedacoes}</p></CardContent></Card>
        </div>

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
          <Card className="mb-8 overflow-hidden">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ repeat: Infinity, duration: 2, repeatDelay: 3 }}>
                    <Sparkles className="h-5 w-5 text-primary" />
                  </motion.div>
                  <span className="text-sm font-semibold">Nível {nivel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">{xp} / {xpParaProximo} XP</span>
                  <div className="flex items-center gap-1 rounded-full bg-coin/10 px-2 py-0.5">
                    <Gift className="h-3 w-3 text-coin" />
                    <span className="text-xs font-medium text-coin">+20 🪙 ao subir</span>
                  </div>
                </div>
              </div>
              <div className="relative">
                <Progress value={xpProgresso} className="h-4" />
                <motion.div 
                  className="absolute top-0 left-0 h-full rounded-full bg-gradient-to-r from-primary/0 via-primary-foreground/20 to-primary/0"
                  style={{ width: `${xpProgresso}%` }}
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                />
              </div>
              <p className="mt-2 text-xs text-muted-foreground text-center">
                Faltam {xpParaProximo - xp} XP para o nível {nivel + 1} — cada acerto vale 1 XP! 🎉
              </p>
            </CardContent>
          </Card>
        </motion.div>

        <Card className="mb-8">
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium flex items-center gap-2"><Share2 className="h-4 w-4 text-primary" /> Programa de Indicação</p>
                <p className="text-xs text-muted-foreground mt-1">Convide amigos e ganhe 20 moedas + XP por cada indicação válida</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button variant="outline" size="sm" onClick={copiarCodigo} className="gap-2">
                <Copy className="h-4 w-4" />Código: {profile?.codigo_indicacao || "..."}
              </Button>
              <Button variant="default" size="sm" onClick={copiarLink} className="gap-2">
                <LinkIcon className="h-4 w-4" />Copiar Link de Indicação
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold">{referrals.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">{referralsValidados}</p>
                <p className="text-xs text-muted-foreground">Validados</p>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <p className="text-2xl font-bold text-primary">{xpTotalIndicacoes}</p>
                <p className="text-xs text-muted-foreground">XP Ganho</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {referrals.length > 0 && (
          <Card className="mb-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Users className="h-5 w-5 text-primary" /> Histórico de Indicações</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {referrals.slice(0, 10).map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div className="flex items-center gap-2">
                      {statusIcon(r.status)}
                      <div>
                        <p className="text-sm font-medium">Indicação #{r.id.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleDateString("pt-BR")}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={r.status === 'validado' ? 'default' : r.status === 'cancelado' ? 'destructive' : 'secondary'}>
                        {statusLabel(r.status)}
                      </Badge>
                      <span className="text-sm font-bold text-primary">+{r.xp_total} XP</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {xpTransactions.length > 0 && (
          <Card className="mb-8">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">📊 Histórico de XP</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {xpTransactions.map((tx: any) => (
                  <div key={tx.id} className="flex items-center justify-between rounded-lg border p-2 px-3">
                    <div>
                      <p className="text-sm">{tx.descricao}</p>
                      <p className="text-xs text-muted-foreground">{new Date(tx.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <span className="text-sm font-bold text-primary">+{tx.valor} XP</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Ações — Desktop only */}
        <h2 className="mb-4 font-display text-xl font-semibold hidden lg:block">Ações</h2>
        <div className="mb-8 hidden gap-4 lg:grid lg:grid-cols-3">
          {[
            { icon: BookOpen, title: "Gerar Simulado", desc: modo === "enem" ? "Questões no modelo ENEM" : "Questões por IA no padrão da banca", path: `/simulado?modo=${modo}`, color: "text-primary" },
            { icon: Radar, title: "Concursos Abertos", desc: "Radar de concursos em todo o Brasil", path: "/concursos", color: "text-accent" },
            { icon: PenTool, title: "Redação com IA", desc: "Escreva e receba feedback", path: "/redacao", color: "text-accent" },
            { icon: Coins, title: "Comprar Moedas", desc: "Adquira mais créditos", path: "/comprar-moedas", color: "text-coin" },
            { icon: Trophy, title: "Ver Planos", desc: "Upgrade para mais recursos", path: "/planos", color: "text-warning" },
            { icon: FileText, title: "Meu Perfil", desc: "Editar dados e ver histórico", path: "/perfil", color: "text-primary" },
          ].map(a => (
            <Card key={a.title} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate(a.path)}>
              <CardHeader><a.icon className={`mb-2 h-6 w-6 ${a.color}`} /><CardTitle className="text-base">{a.title}</CardTitle><CardDescription>{a.desc}</CardDescription></CardHeader>
            </Card>
          ))}
        </div>

        <h2 className="mb-4 font-display text-xl font-semibold">📚 Histórico de Estudos</h2>
        <div className="mb-4 flex flex-wrap gap-2">
          {([
            { key: "concurso" as const, label: "🎯 Concurso" },
            { key: "enem" as const, label: "🎓 ENEM" },
            { key: "redacao" as const, label: "✍️ Redação" },
          ]).map(tab => (
            <Button
              key={tab.key}
              variant={historicoTab === tab.key ? "default" : "outline"}
              size="sm"
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
            if (redacoes.length === 0) return (
              <Card><CardContent className="py-8 text-center text-muted-foreground">
                Nenhuma redação encontrada. Escreva sua primeira!
              </CardContent></Card>
            );
            return (
              <div className="space-y-3">
                {redacoes.map((r: any) => (
                  <Card key={r.id} className="transition-all hover:shadow-md">
                    <CardHeader className="flex-row items-center justify-between py-3">
                      <div>
                        <CardTitle className="text-sm">{r.tema}</CardTitle>
                        <CardDescription>
                          {new Date(r.created_at).toLocaleDateString("pt-BR")} •{" "}
                          {r.status === "corrigida" && r.nota != null ? (
                            <span className="font-medium text-primary">Nota: {r.nota}/1000</span>
                          ) : (
                            <span className="text-warning">{r.status === "pendente" ? "Aguardando correção" : r.status}</span>
                          )}
                        </CardDescription>
                      </div>
                      <Badge variant={r.status === "corrigida" ? "default" : "secondary"}>
                        {r.status === "corrigida" ? "Corrigida" : "Pendente"}
                      </Badge>
                    </CardHeader>
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
