import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { BookOpen, PenTool, Coins, History, Trophy, FileText, Share2, Copy, GraduationCap, BookMarked, Users, CheckCircle, Clock, XCircle, Link as LinkIcon, Sparkles, Gift } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";

import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

type Modo = "concurso" | "enem" | "universidade" | null;

export default function Dashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalSimulados: 0, notaMedia: 0, totalRedacoes: 0 });
  const [recentSimulados, setRecentSimulados] = useState<any[]>([]);
  const [referrals, setReferrals] = useState<any[]>([]);
  const [xpTransactions, setXpTransactions] = useState<any[]>([]);
  const [modo, setModo] = useState<Modo>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("provax_modo") as Modo) || null;
    }
    return null;
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: sims }, { data: reds }, { data: refs }, { data: xpTx }] = await Promise.all([
        supabase.from("simulados").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("redacoes").select("id").eq("user_id", user.id),
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

  if (!modo) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="container flex-1 py-16">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-bold">Olá, {profile?.nome || "Estudante"}! 👋</h1>
            <p className="mt-2 text-muted-foreground">Escolha seu objetivo de estudo:</p>
          </div>
          <div className="mx-auto grid max-w-3xl gap-6 md:grid-cols-3">
            <Card className="cursor-pointer border-2 transition-all hover:border-primary hover:shadow-lg" onClick={() => selecionarModo("concurso")}>
              <CardHeader className="text-center">
                <GraduationCap className="mx-auto mb-2 h-12 w-12 text-primary" />
                <CardTitle className="font-display text-xl">Concurso Público</CardTitle>
                <CardDescription>Filtros por banca, cargo, matéria, assunto, nível, ano, região e órgão</CardDescription>
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
            <Card className="cursor-pointer border-2 transition-all hover:border-secondary hover:shadow-lg" onClick={() => selecionarModo("universidade")}>
              <CardHeader className="text-center">
                <BookOpen className="mx-auto mb-2 h-12 w-12 text-secondary-foreground" />
                <CardTitle className="font-display text-xl">Universidade</CardTitle>
                <CardDescription>Saúde, Exatas, Tecnologia, Negócios, Humanas, Artes e Agrárias</CardDescription>
              </CardHeader>
              <CardContent className="text-center"><Button variant="secondary" className="w-full">Selecionar</Button></CardContent>
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
          <h1 className="font-display text-3xl font-bold">Olá, {profile?.nome || "Estudante"}!</h1>
          <p className="text-muted-foreground">
            Plano: {profile?.plano ?? "free"} • Nível {nivel} •{" "}
            <button onClick={() => selecionarModo(null)} className="text-primary hover:underline">
              {modo === "concurso" ? "🎯 Concurso Público" : modo === "enem" ? "🎓 ENEM" : "🏛️ Universidade"} (trocar)
            </button>
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
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
                {xpParaProximo - xp} XP para o nível {nivel + 1} — ganhe 20 moedas de recompensa! 🎉
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


        <h2 className="mb-4 font-display text-xl font-semibold">Ações</h2>
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: BookOpen, title: "Gerar Simulado", desc: modo === "enem" ? "Questões no modelo ENEM" : modo === "universidade" ? "Questões universitárias por IA" : "Questões por IA no padrão da banca", path: `/simulado?modo=${modo}`, color: "text-primary" },
            { icon: PenTool, title: "Redação com IA", desc: "Correção rigorosa (15 moedas)", path: "/redacao", color: "text-accent" },
            { icon: Coins, title: "Comprar Moedas", desc: "Adquira mais créditos", path: "/comprar-moedas", color: "text-coin" },
            { icon: Trophy, title: "Ver Planos", desc: "Upgrade para mais recursos", path: "/planos", color: "text-warning" },
            { icon: FileText, title: "Meu Perfil", desc: "Editar dados e ver histórico", path: "/perfil", color: "text-primary" },
          ].map(a => (
            <Card key={a.title} className="cursor-pointer transition-shadow hover:shadow-md" onClick={() => navigate(a.path)}>
              <CardHeader><a.icon className={`mb-2 h-6 w-6 ${a.color}`} /><CardTitle className="text-base">{a.title}</CardTitle><CardDescription>{a.desc}</CardDescription></CardHeader>
            </Card>
          ))}
        </div>

        {recentSimulados.length > 0 && (<><h2 className="mb-4 font-display text-xl font-semibold">Histórico Recente</h2><div className="space-y-3">{recentSimulados.map((s: any) => (<Card key={s.id} className="transition-shadow hover:shadow-md"><CardHeader className="flex-row items-center justify-between py-3"><div><CardTitle className="text-sm">{s.tipo === "prova_completa" ? "Prova Completa" : "Simulado"} — {s.quantidade} questões</CardTitle><CardDescription>{new Date(s.created_at).toLocaleDateString("pt-BR")} • {s.status === "finalizado" ? `Nota: ${s.pontuacao}%` : "Em andamento"}</CardDescription></div><History className="h-4 w-4 text-muted-foreground" /></CardHeader></Card>))}</div></>)}
      </main>
      <AppFooter />
    </div>
  );
}
