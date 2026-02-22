import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AppHeader from "@/components/AppHeader";
import { BookOpen, PenTool, Coins, History, Trophy, FileText, Share2, Copy, GraduationCap, BookMarked } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Progress } from "@/components/ui/progress";
import CascadingFilters from "@/components/CascadingFilters";

type Modo = "concurso" | "enem" | null;

export default function Dashboard() {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalSimulados: 0, notaMedia: 0, totalRedacoes: 0 });
  const [recentSimulados, setRecentSimulados] = useState<any[]>([]);
  const [modo, setModo] = useState<Modo>(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("provax_modo") as Modo) || null;
    }
    return null;
  });

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [{ data: sims }, { data: reds }] = await Promise.all([
        supabase.from("simulados").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(5),
        supabase.from("redacoes").select("id").eq("user_id", user.id),
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

  const selecionarModo = (m: Modo) => {
    setModo(m);
    if (m) localStorage.setItem("provax_modo", m);
    else localStorage.removeItem("provax_modo");
  };

  if (!modo) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container py-16">
          <div className="mb-8 text-center">
            <h1 className="font-display text-3xl font-bold">Olá, {profile?.nome || "Estudante"}! 👋</h1>
            <p className="mt-2 text-muted-foreground">Escolha seu objetivo de estudo:</p>
          </div>
          <div className="mx-auto grid max-w-2xl gap-6 md:grid-cols-2">
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
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-8">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold">Olá, {profile?.nome || "Estudante"}!</h1>
          <p className="text-muted-foreground">
            Plano: {profile?.plano ?? "free"} • Nível {nivel} •{" "}
            <button onClick={() => selecionarModo(null)} className="text-primary hover:underline">
              {modo === "concurso" ? "🎯 Concurso Público" : "🎓 ENEM"} (trocar)
            </button>
          </p>
        </div>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card><CardHeader className="pb-2"><CardDescription>Saldo de Moedas</CardDescription></CardHeader><CardContent><p className="text-3xl font-bold text-coin">{profile?.saldo_moedas ?? 0}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Simulados Feitos</CardDescription></CardHeader><CardContent><p className="text-3xl font-bold">{stats.totalSimulados}</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Nota Média</CardDescription></CardHeader><CardContent><p className="text-3xl font-bold">{stats.notaMedia}%</p></CardContent></Card>
          <Card><CardHeader className="pb-2"><CardDescription>Redações</CardDescription></CardHeader><CardContent><p className="text-3xl font-bold">{stats.totalRedacoes}</p></CardContent></Card>
        </div>

        <Card className="mb-8"><CardContent className="pt-6"><div className="flex items-center justify-between mb-2"><span className="text-sm font-medium">Nível {nivel}</span><span className="text-xs text-muted-foreground">{xp} / {xpParaProximo} XP</span></div><Progress value={xpProgresso} className="h-3" /></CardContent></Card>

        <Card className="mb-8"><CardContent className="pt-6 flex items-center justify-between"><div><p className="text-sm font-medium flex items-center gap-2"><Share2 className="h-4 w-4 text-primary" /> Seu código de indicação</p><p className="text-xs text-muted-foreground mt-1">Compartilhe e ganhe 20 moedas por cada amigo</p></div><Button variant="outline" size="sm" onClick={copiarCodigo} className="gap-2"><Copy className="h-4 w-4" />{profile?.codigo_indicacao || "..."}</Button></CardContent></Card>

        {modo === "concurso" && (
          <div className="mb-8">
            <h2 className="mb-4 font-display text-xl font-semibold">🎯 Filtros do Concurso</h2>
            <Card><CardContent className="pt-6"><CascadingFilters modo="concurso" onFiltersChange={() => {}} /></CardContent></Card>
          </div>
        )}

        {modo === "enem" && (
          <div className="mb-8">
            <h2 className="mb-4 font-display text-xl font-semibold">🎓 Filtros do ENEM</h2>
            <Card><CardContent className="pt-6"><CascadingFilters modo="enem" onFiltersChange={() => {}} /></CardContent></Card>
          </div>
        )}

        <h2 className="mb-4 font-display text-xl font-semibold">Ações</h2>
        <div className="mb-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[
            { icon: BookOpen, title: "Gerar Simulado", desc: modo === "enem" ? "Questões no modelo ENEM" : "Questões por IA no padrão da banca", path: `/simulado?modo=${modo}`, color: "text-primary" },
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
    </div>
  );
}
