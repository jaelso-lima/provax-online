import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOptionalAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import {
  ArrowRight, CheckCircle, X, Zap, Shield, Brain, Target, BarChart3,
  Users, Star, Clock, TrendingUp, BookOpen, Award, Lock, ChevronDown,
  Flame, Trophy, MessageCircle, GraduationCap, Mail, Instagram, Crown,
  AlertTriangle, Percent, Play, Eye, HelpCircle, Heart, FileText, Radar
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { trackFBEvent } from "@/lib/fbPixel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };
const stagger = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

export default function Index() {
  const { user } = useOptionalAuth();
  const navigate = useNavigate();
  const [showSticky, setShowSticky] = useState(false);

  const { data: dbPlans } = useQuery({
    queryKey: ["landing-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("slug, nome, stripe_link_mensal, stripe_link_semestral, stripe_link_anual, preco_mensal, preco_semestral, preco_anual")
        .eq("ativo", true)
        .order("preco_mensal");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const getLink = (slug: string, periodo: "mensal" | "trimestral" | "anual" = "mensal") => {
    const plan = dbPlans?.find(p => p.slug === slug);
    if (!plan) return null;
    if (periodo === "trimestral") return plan.stripe_link_semestral;
    if (periodo === "anual") return plan.stripe_link_anual;
    return plan.stripe_link_mensal;
  };

  const handleCTA = (email?: string) => {
    const link = getLink("provax-x");
    if (!link) return;
    trackFBEvent("InitiateCheckout", { content_name: "Provax X", value: 14.90, currency: "BRL" });
    const url = new URL(link);
    if (email) url.searchParams.set("email", email);
    window.open(url.toString(), "_blank");
  };

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 500);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Nav — CTA fixo */}
      <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          <span className="font-display text-xl font-bold"><span className="text-primary">P</span><span className="text-accent">X</span> <span className="hidden sm:inline text-foreground">ProvaX</span></span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button asChild size="sm"><Link to="/dashboard">Dashboard</Link></Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild><Link to="/login">Entrar</Link></Button>
                <Button size="sm" className="shadow-sm shadow-primary/20" asChild>
                  <Link to="/register">Começar grátis</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════
          1. HERO — Curiosidade + Desafio mental
      ═══════════════════════════════════════════════════════════════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-5" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.12),transparent)]" />
        <div className="container relative py-20 md:py-32 text-center">
          <motion.div {...fadeUp}>
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-1.5 text-sm font-medium text-accent">
              <Flame className="h-4 w-4" />
              🔥 Mais de 1.200 usuários já testaram o ProvaX
            </div>
            <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold leading-[1.1] md:text-6xl lg:text-7xl">
              Você passaria em um{" "}
              <span className="text-gradient">concurso público</span>{" "}
              hoje?
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Descubra seu nível em minutos com simulados baseados em <strong className="text-foreground">provas reais</strong>. Sem enrolação. Sem teoria infinita. Direto na prática.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="text-base px-10 h-14 text-lg shadow-lg shadow-primary/25 group" asChild>
                <Link to="/register">
                  Fazer simulado grátis
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              Resultado em menos de 1 minuto • Sem cartão de crédito • 100% gratuito
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          2. IMPACTO RÁPIDO — Reduzir fricção imediata
      ═══════════════════════════════════════════════════════════════ */}
      <section className="border-t bg-accent/5 py-10">
        <div className="container max-w-2xl text-center">
          <motion.div {...fadeUp} className="flex flex-col items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent/10">
                <Zap className="h-5 w-5 text-accent" />
              </div>
              <h2 className="font-display text-xl font-bold md:text-2xl">
                Teste grátis em menos de <span className="text-accent">1 minuto</span>
              </h2>
            </div>
            <p className="text-muted-foreground text-sm">
              Crie sua conta, gere um simulado e descubra seu nível. Rápido, fácil e sem compromisso.
            </p>
            <Button size="lg" className="h-12 px-8 group" asChild>
              <Link to="/register">
                Descobrir meu nível agora
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <p className="text-xs text-muted-foreground">Resultado em menos de 1 minuto</p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          3. DOR — Identificação com o problema
      ═══════════════════════════════════════════════════════════════ */}
      <section className="bg-card py-20">
        <div className="container max-w-3xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Se você se reconhece, o ProvaX é pra você.
            </h2>
            <p className="mt-3 text-muted-foreground">A maioria dos concurseiros sofre com pelo menos 3 desses problemas</p>
          </motion.div>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              { icon: Clock, text: "Estuda há meses e sente que não avança" },
              { icon: AlertTriangle, text: "Não sabe se está estudando o que cai na prova" },
              { icon: Brain, text: "Esquece o que estudou na semana passada" },
              { icon: BookOpen, text: "Comprou curso caro e não terminou nem metade" },
              { icon: Eye, text: "Tem medo de chegar no dia da prova e dar branco" },
              { icon: TrendingUp, text: "Quer passar logo mas não sabe por onde começar" },
            ].map((item, i) => (
              <motion.div key={i} {...stagger} transition={{ delay: i * 0.06 }}
                className="flex items-center gap-3 rounded-xl border border-destructive/10 bg-destructive/5 p-4"
              >
                <item.icon className="h-5 w-5 shrink-0 text-destructive" />
                <span className="text-sm">{item.text}</span>
              </motion.div>
            ))}
          </div>
          <motion.div {...fadeUp} className="mt-10 text-center">
            <p className="text-lg font-semibold text-foreground">
              Se marcou pelo menos 2… você está estudando do <span className="text-destructive">jeito errado.</span>
            </p>
            <p className="text-muted-foreground mt-2 mb-6">
              Mas tem solução. E ela é mais simples do que você imagina.
            </p>
            <Button size="lg" className="h-12 px-8" asChild>
              <Link to="/register">Descobrir meu nível agora <ArrowRight className="ml-2 h-5 w-5" /></Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          4. SOLUÇÃO — O Método Estudo Reverso
      ═══════════════════════════════════════════════════════════════ */}
      <section id="metodo" className="py-20">
        <div className="container max-w-4xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <Badge variant="outline" className="mb-4 text-primary border-primary/30">Método exclusivo</Badge>
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              O <span className="text-gradient">Estudo Reverso</span> que ninguém te ensinou
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Enquanto os outros leem 500 páginas sem saber o que vai cair, você
              <strong className="text-foreground"> pratica simulados e descobre exatamente onde precisa melhorar.</strong>
            </p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-8">
            <motion.div {...stagger}>
              <Card className="border-destructive/20 bg-destructive/5 h-full">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <X className="h-5 w-5 text-destructive" /> Estudo Tradicional
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {[
                    "Lê teoria por meses sem praticar",
                    "Não sabe em que nível está",
                    "Estuda tudo igual sem foco",
                    "Falsa sensação de progresso",
                    "Chega na prova sem confiança",
                  ].map(t => (
                    <div key={t} className="flex items-start gap-2">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <span className="text-sm">{t}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
            <motion.div {...stagger} transition={{ delay: 0.15 }}>
              <Card className="border-accent/30 bg-accent/5 h-full ring-2 ring-accent/20">
                <CardHeader className="pb-3">
                  <CardTitle className="font-display text-lg flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-accent" /> Estudo Reverso (ProvaX)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2.5">
                  {[
                    "Pratica simulados desde o dia 1",
                    "Descobre falhas reais com dados",
                    "Estuda só o que vai aumentar sua nota",
                    "Progresso mensurável com XP",
                    "Confiança baseada em resultados",
                  ].map(t => (
                    <div key={t} className="flex items-start gap-2">
                      <CheckCircle className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span className="text-sm">{t}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          </div>
          <motion.div {...fadeUp} className="text-center mt-10">
            <Button size="lg" className="h-12 px-8 group" asChild>
              <Link to="/register">
                Testar o Estudo Reverso grátis
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">Resultado em menos de 1 minuto</p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          5. COMO FUNCIONA — 3 passos
      ═══════════════════════════════════════════════════════════════ */}
      <section className="border-t bg-card py-20">
        <div className="container max-w-4xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Comece em 3 passos simples
            </h2>
            <p className="mt-3 text-muted-foreground">Em menos de 1 minuto você já estará praticando</p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: GraduationCap, step: "1", title: "Crie sua conta gratuita", desc: "Cadastro rápido e sem cartão de crédito. Seu acesso é liberado na hora.", color: "bg-primary" },
              { icon: Target, step: "2", title: "Gere um simulado real", desc: "Escolha banca, matéria ou carreira. As questões seguem o padrão exato da prova.", color: "bg-accent" },
              { icon: BarChart3, step: "3", title: "Descubra seu nível", desc: "Veja onde errou, o que precisa estudar e evolua com métricas reais.", color: "bg-primary" },
            ].map((item, i) => (
              <motion.div key={item.step} {...stagger} transition={{ delay: i * 0.15 }}>
                <Card className="relative border-0 bg-secondary/50 h-full text-center">
                  <div className={`absolute -top-4 left-1/2 -translate-x-1/2 flex h-8 w-8 items-center justify-center rounded-full ${item.color} text-sm font-bold text-primary-foreground shadow-md`}>
                    {item.step}
                  </div>
                  <CardHeader className="pt-10">
                    <item.icon className="mx-auto mb-2 h-10 w-10 text-primary" />
                    <CardTitle className="font-display text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{item.desc}</p></CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <motion.div {...fadeUp} className="text-center mt-10">
            <Button size="lg" className="h-14 text-lg px-10 group" asChild>
              <Link to="/register">
                Descobrir meu nível agora
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">Cadastro gratuito • Sem cartão de crédito</p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          6. PROVA SOCIAL — Números + Depoimentos
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-6">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Quem usa, aprova</h2>
            <p className="mt-3 text-muted-foreground">Resultados reais de quem mudou o método de estudo</p>
          </motion.div>

          {/* Números */}
          <motion.div {...fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-12">
            {[
              { number: "+5.000", label: "Simulados realizados" },
              { number: "+1.200", label: "Usuários ativos" },
              { number: "24h", label: "Professor IA disponível" },
              { number: "2 modos", label: "Concurso + ENEM" },
            ].map((item, i) => (
              <motion.div key={i} {...stagger} transition={{ delay: i * 0.08 }} className="text-center rounded-xl border bg-card p-4">
                <p className="text-2xl md:text-3xl font-bold text-primary">{item.number}</p>
                <p className="text-xs md:text-sm text-muted-foreground mt-1">{item.label}</p>
              </motion.div>
            ))}
          </motion.div>

          {/* Depoimentos */}
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              { name: "Ana Clara", role: "Aprovada PRF — CESPE", text: "Em 3 meses de Estudo Reverso aprendi mais do que em 1 ano de cursinho. O simulado por banca foi decisivo.", stars: 5 },
              { name: "Ricardo Santos", role: "Nota 820 no ENEM", text: "Usei o ProvaX para treinar redação e simulados. Minha nota subiu 200 pontos em 2 meses.", stars: 5 },
              { name: "Mariana Costa", role: "Aprovada Banco do Brasil", text: "O XP e os níveis me motivam todo dia. Nunca fui tão consistente nos estudos.", stars: 5 },
            ].map(d => (
              <motion.div key={d.name} {...stagger}>
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <div className="flex gap-0.5 mb-3">
                      {Array.from({ length: d.stars }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-coin text-coin" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3 italic">"{d.text}"</p>
                    <p className="text-sm font-semibold">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.role}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>

          <motion.div {...fadeUp} className="text-center mt-10">
            <Button size="lg" className="h-12 px-8 group" asChild>
              <Link to="/register">
                Fazer como eles — começar grátis
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          7. BENEFÍCIOS — Blocos visuais
      ═══════════════════════════════════════════════════════════════ */}
      <section className="border-t bg-card py-20">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Por que o ProvaX funciona</h2>
            <p className="mt-3 text-muted-foreground">Tudo que você precisa para ser aprovado, em uma única plataforma</p>
          </motion.div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
            {[
              { icon: Brain, title: "Questões de provas reais", desc: "IA treinada no padrão CESPE, FGV, VUNESP, FCC e ENEM." },
              { icon: BarChart3, title: "Diagnóstico inteligente", desc: "Descubra exatamente qual matéria e assunto você mais erra." },
              { icon: Target, title: "Estudo focado", desc: "Pare de perder tempo com o que já sabe. Treine só o necessário." },
              { icon: TrendingUp, title: "Evolução visível", desc: "XP, níveis e estatísticas que mostram seu progresso real." },
              { icon: Award, title: "Simulado adaptativo", desc: "Quanto mais pratica, mais inteligentes ficam as questões." },
              { icon: BookOpen, title: "Redação corrigida por IA", desc: "Correção nas 5 competências do ENEM com nota estimada." },
              { icon: MessageCircle, title: "Professor IA 24h", desc: "Tire dúvidas de qualquer matéria a qualquer hora com o Professor PX." },
              { icon: Shield, title: "Gabarito comentado", desc: "Explicação detalhada de cada questão para aprender com os erros." },
              { icon: FileText, title: "Análise de edital por IA", desc: "Envie o edital e receba matérias, estratégias e conteúdo programático." },
              { icon: Eye, title: "Radar de concursos", desc: "Acompanhe concursos abertos com datas, vagas e salários." },
            ].map((f, i) => (
              <motion.div key={f.title} {...stagger} transition={{ delay: i * 0.05 }}>
                <Card className="border-0 bg-secondary/50 h-full transition-all hover:shadow-md hover:-translate-y-0.5">
                  <CardHeader className="pb-2">
                    <f.icon className="mb-1 h-7 w-7 text-primary" />
                    <CardTitle className="font-display text-base">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{f.desc}</p></CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <motion.div {...fadeUp} className="text-center mt-10">
            <Button size="lg" className="h-12 px-8 group" asChild>
              <Link to="/register">
                Descobrir meu nível agora
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          8. GATILHO EMOCIONAL — Antes dos planos
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16">
        <div className="container max-w-2xl text-center">
          <motion.div {...fadeUp}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Heart className="h-8 w-8 text-primary" />
            </div>
            <h2 className="font-display text-2xl font-bold md:text-3xl mb-4">
              Imagine ter estabilidade, salário fixo e segurança financeira através de um concurso público.
            </h2>
            <p className="text-lg text-muted-foreground mb-2">
              Agora imagine chegar na prova <strong className="text-destructive">sem saber se está preparado.</strong>
            </p>
            <p className="text-xl font-semibold text-foreground mb-8">
              É isso que o ProvaX resolve.
            </p>
            <Button size="lg" className="h-14 text-lg px-10 group" asChild>
              <Link to="/register">
                Descobrir meu nível agora
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">Resultado em menos de 1 minuto • Grátis</p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          8b. PROVOCAÇÃO — Seção de curiosidade
      ═══════════════════════════════════════════════════════════════ */}
      <section className="border-t bg-card py-16">
        <div className="container max-w-2xl text-center">
          <motion.div {...fadeUp}>
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="font-display text-2xl font-bold md:text-3xl mb-3">
              Se a prova fosse hoje, você estaria preparado?
            </h2>
            <p className="text-muted-foreground mb-6 text-lg">
              87% dos candidatos são reprovados por falta de método, não por falta de estudo. Descubra se você está no caminho certo.
            </p>
            <Button size="lg" className="h-14 text-lg px-10 group" asChild>
              <Link to="/register">
                Testar meu nível agora
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">Resultado imediato • Grátis</p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          TESTE RÁPIDO — Reduzir fricção
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20">
        <div className="container max-w-3xl">
          <motion.div {...fadeUp} className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
              <Play className="h-8 w-8 text-accent" />
            </div>
            <h2 className="font-display text-3xl font-bold md:text-4xl mb-4">
              Teste grátis em <span className="text-gradient">1 minuto</span>
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto mb-8">
              Faça um simulado agora e descubra seu nível para concursos em poucos minutos. Sem cadastro longo. Sem enrolação.
            </p>
            <div className="mx-auto grid max-w-md gap-3 text-left mb-8">
              {[
                "Crie sua conta em segundos",
                "Escolha o concurso ou matéria",
                "Resolva questões reais",
                "Receba seu diagnóstico completo",
              ].map((item, i) => (
                <div key={item} className="flex items-center gap-3 rounded-lg border bg-background/50 p-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/10 text-xs font-bold text-accent">{i + 1}</div>
                  <span className="text-sm font-medium">{item}</span>
                </div>
              ))}
            </div>
            <Button size="lg" className="h-14 text-lg px-10 group" asChild>
              <Link to="/register">
                Descobrir meu nível agora
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">Cadastro gratuito • Sem cartão de crédito</p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          PLANOS
      ═══════════════════════════════════════════════════════════════ */}
      <section id="planos" className="border-t bg-card py-20">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-4">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Quanto custa <span className="text-destructive">não</span> passar?
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Inscrição perdida + meses sem direção + materiais caros = milhares de reais jogados fora. O ProvaX custa menos que um cafezinho por dia.
            </p>
          </motion.div>

          {/* Plano gratuito highlight */}
          <motion.div {...fadeUp} className="mx-auto max-w-md mt-10 mb-6">
            <Card className="border-2 border-primary/30 bg-primary/5 text-center">
              <CardContent className="pt-6 pb-6">
                <Badge variant="outline" className="mb-3 border-primary/30 text-primary">Comece sem pagar nada</Badge>
                <h3 className="font-display text-xl font-bold mb-1">Plano Gratuito</h3>
                <p className="text-3xl font-bold text-primary mb-1">R$ 0</p>
                <p className="text-sm text-muted-foreground mb-4">Para sempre • Sem cartão</p>
                <ul className="space-y-2 text-left max-w-xs mx-auto mb-6">
                  {["10 questões por dia", "Simulados básicos", "Radar de concursos abertos", "Histórico de desempenho", "Acesso ao método Estudo Reverso"].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-primary shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full h-12 text-base group" asChild>
                  <Link to="/register">
                    Descobrir meu nível agora
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div {...fadeUp} className="text-center mb-6">
            <p className="text-sm text-muted-foreground">Quer acesso completo? Escolha um plano:</p>
          </motion.div>

          {/* Provax X */}
          <motion.div {...fadeUp} className="mx-auto max-w-lg mb-10">
            <Card className="border-2 border-accent relative ring-4 ring-accent/20 shadow-2xl shadow-accent/10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-accent text-accent-foreground gap-1 px-4 py-1.5 text-sm font-bold shadow-lg">
                  <Zap className="h-4 w-4" /> Mais popular
                </Badge>
              </div>
              <CardHeader className="text-center pt-10">
                <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-accent/10">
                  <Zap className="h-8 w-8 text-accent" />
                </div>
                <CardTitle className="font-display text-2xl">Provax X</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">Acesso completo ao ProvaX</p>
                <div className="mt-4">
                  <span className="text-5xl font-bold text-accent">R$ 14,90</span>
                  <span className="text-lg text-muted-foreground"> /mês</span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Apenas <strong className="text-foreground">R$ 0,49/dia</strong> — menos que um cafezinho
                </p>
              </CardHeader>
              <CardContent className="space-y-5 pb-8">
                <ul className="space-y-2.5">
                  {[
                    "20 questões por dia",
                    "Simulados para Concurso + ENEM",
                    "Professor IA 24h (Professor PX)",
                    "Redação corrigida por IA",
                    "Radar de concursos abertos",
                    "Estatísticas de desempenho",
                    "Histórico completo de erros",
                    "Sistema de XP e gamificação",
                    "Acesso imediato após pagamento",
                  ].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-accent shrink-0" />{f}
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full h-14 text-lg bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/25"
                  onClick={() => handleCTA()}
                >
                  Assinar agora por R$ 14,90/mês <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
                <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Garantia 7 dias</span>
                  <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Pagamento seguro</span>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Start + Pro */}
          <motion.div {...fadeUp} className="text-center mb-6">
            <p className="text-sm text-muted-foreground">Quer ainda mais recursos?</p>
          </motion.div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            <motion.div {...stagger} transition={{ delay: 0.1 }}>
              <Card className="h-full border-2 border-primary/30">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-display text-xl">Start</CardTitle>
                  <p className="text-3xl font-bold mt-2">R$ 29,90<span className="text-sm font-normal text-muted-foreground"> /mês</span></p>
                  <p className="text-xs text-muted-foreground">ou trimestral • anual</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {["Tudo do Provax X", "30 questões por dia", "Análise de edital por IA", "Simulado personalizado", "Estatísticas básicas", "Histórico de erros"].map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-accent shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <Button className="w-full" onClick={() => {
                    const link = getLink("start");
                    if (!link) return;
                    trackFBEvent("InitiateCheckout", { content_name: "Start", value: 29.90, currency: "BRL" });
                    window.open(link, "_blank");
                  }}>Assinar Start</Button>
                </CardContent>
              </Card>
            </motion.div>
            <motion.div {...stagger} transition={{ delay: 0.2 }}>
              <Card className="h-full border-2 border-accent/30 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-accent text-accent-foreground gap-1"><Crown className="h-3 w-3" /> Aprovação máxima</Badge>
                </div>
                <CardHeader className="text-center pt-8">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                    <Crown className="h-6 w-6 text-accent" />
                  </div>
                  <CardTitle className="font-display text-xl">Pro</CardTitle>
                  <p className="text-3xl font-bold mt-2">R$ 49,90<span className="text-sm font-normal text-muted-foreground"> /mês</span></p>
                  <p className="text-xs text-muted-foreground">ou trimestral • anual</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {["60 questões por dia", "Filtro por banca e estado", "Concursos anteriores reais", "Análise de edital por IA", "Ranking completo", "Estatísticas avançadas", "Simulado reverso inteligente", "Tudo do Start incluso"].map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-accent shrink-0" />{f}</li>
                    ))}
                  </ul>
                  <Button className="w-full" variant="outline" onClick={() => {
                    const link = getLink("pro");
                    if (!link) return;
                    trackFBEvent("InitiateCheckout", { content_name: "Pro", value: 49.90, currency: "BRL" });
                    window.open(link, "_blank");
                  }}>Assinar Pro</Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div {...fadeUp} className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-2 text-sm text-accent">
              <Shield className="h-4 w-4" /> Garantia de 7 dias — não gostou, devolvemos seu dinheiro.
            </div>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FAQ
      ═══════════════════════════════════════════════════════════════ */}
      <section className="py-20">
        <div className="container max-w-3xl">
          <motion.div {...fadeUp} className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Perguntas Frequentes</h2>
            <p className="mt-3 text-muted-foreground">Tire suas dúvidas antes de começar</p>
          </motion.div>
          <Accordion type="single" collapsible className="space-y-2">
            {[
              { q: "O ProvaX é gratuito?", a: "Sim! Você pode criar uma conta gratuita com 10 questões por dia e fazer simulados sem pagar nada. Para acesso completo, temos planos a partir de R$ 14,90/mês." },
              { q: "Quanto tempo leva para fazer um simulado?", a: "Depende da quantidade de questões, mas a maioria dos simulados leva de 10 a 30 minutos. Você também pode pausar e continuar depois." },
              { q: "As questões são de concursos reais?", a: "Sim! As questões são geradas por IA treinada no padrão exato de cada banca: CESPE, FGV, VUNESP, FCC e vestibulares. É o treino mais próximo da prova real." },
              { q: "O que é o Professor PX?", a: "É o nosso tutor inteligente disponível 24h. Ele analisa seus erros e te ajuda a entender cada questão, tirando dúvidas de qualquer matéria em tempo real." },
              { q: "Como funciona a análise de edital?", a: "Envie o PDF do edital e nossa IA extrai todas as matérias, conteúdos programáticos e gera estratégias de estudo personalizadas para cada cargo." },
              { q: "Preciso pagar para usar?", a: "Não! O plano gratuito permite que você teste a plataforma sem pagar nada. Sem cartão de crédito. Faça upgrade apenas quando quiser." },
              { q: "Posso cancelar quando quiser?", a: "Sim! Cancele a qualquer momento. E ainda tem garantia de 7 dias — não gostou, devolvemos seu dinheiro." },
              { q: "Serve para ENEM também?", a: "Sim! O ProvaX tem modo ENEM com questões por área do conhecimento e correção de redação por IA nas 5 competências." },
              { q: "Como funciona a ativação do plano?", a: "Após o pagamento, seu plano é ativado automaticamente em segundos. Você já pode usar todos os recursos imediatamente." },
            ].map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border bg-background/50 px-5">
                <AccordionTrigger className="text-left font-medium hover:no-underline">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          9. CTA FINAL — Aversão à perda
      ═══════════════════════════════════════════════════════════════ */}
      <section className="border-t bg-card py-20">
        <div className="container text-center max-w-2xl">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-3xl font-bold md:text-4xl mb-4">
              Seu futuro no serviço público{" "}
              <span className="text-gradient">pode começar hoje.</span>
            </h2>
            <p className="text-muted-foreground mb-3 text-lg">
              Cada dia sem prática é um dia a mais longe da sua aprovação. Quem começa hoje, já sai na frente amanhã.
            </p>
            <p className="text-sm font-medium text-foreground mb-8">
              🔥 Enquanto você pensa, outros já estão praticando e saindo na frente.
            </p>
            <Button size="lg" className="text-lg px-10 h-14 shadow-lg shadow-primary/25 group" asChild>
              <Link to="/register">
                Começar agora grátis
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Pagamento seguro</span>
              <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Garantia 7 dias</span>
              <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Acesso imediato</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STICKY CTA — mobile */}
      {showSticky && !user && (
        <motion.div
          initial={{ y: 100 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md p-3 md:hidden"
        >
          <Button className="w-full h-12 text-base shadow-lg shadow-primary/20 group" asChild>
            <Link to="/register">
              Fazer simulado grátis
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>
      )}

      {/* CONTATO */}
      <section className="border-t py-16">
        <div className="container max-w-2xl text-center">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-2xl font-bold md:text-3xl mb-4">Dúvidas? Fale conosco</h2>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button variant="outline" className="h-12 text-base gap-2" asChild>
                <a href="mailto:provax.online@gmail.com"><Mail className="h-5 w-5" /> Email</a>
              </Button>
              <Button variant="outline" className="h-12 text-base gap-2" asChild>
                <a href="https://www.instagram.com/provax_online/" target="_blank" rel="noopener noreferrer"><Instagram className="h-5 w-5" /> Instagram</a>
              </Button>
              <Button variant="outline" className="h-12 text-base gap-2 text-green-600 dark:text-green-500 border-green-600/30" asChild>
                <a href="https://chat.whatsapp.com/CaQMyka3CMU4QBUcl6WQxr" target="_blank" rel="noopener noreferrer"><MessageCircle className="h-5 w-5" /> WhatsApp</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground space-y-2">
        <p>© 2026 ProvaX. Todos os direitos reservados.</p>
        <p><Link to="/termos" className="text-primary hover:underline">Termos de Uso e Política de Privacidade</Link></p>
      </footer>
    </div>
  );
}
