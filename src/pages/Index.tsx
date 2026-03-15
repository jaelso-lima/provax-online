import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOptionalAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import {
  ArrowRight, CheckCircle, X, Zap, Shield, Brain, Target, BarChart3,
  Users, Star, Clock, TrendingUp, BookOpen, Award, Lock, ChevronDown,
  Flame, Trophy, MessageCircle, GraduationCap, Mail, Instagram, Crown,
  AlertTriangle, Percent
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { trackFBEvent } from "@/lib/fbPixel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

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
    const onScroll = () => setShowSticky(window.scrollY > 600);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-card/90 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          <span className="font-display text-xl font-bold"><span className="text-primary">P</span><span className="text-accent">X</span></span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button asChild size="sm"><Link to="/dashboard">Dashboard</Link></Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild><Link to="/login">Entrar</Link></Button>
                <Button size="sm" className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => handleCTA()}>
                  Assinar R$ 14,90/mês
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO — Atenção (AIDA) + Viés de urgência */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-5" />
        <div className="container relative py-20 md:py-32 text-center">
          <motion.div {...fadeUp}>
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/5 px-4 py-1.5 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              87% dos candidatos são reprovados por falta de método — não seja um deles
            </div>
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Zap className="h-4 w-4" />
              Concursos • ENEM • Redação — Uma plataforma, dois caminhos de aprovação
            </div>
            <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold leading-tight md:text-6xl lg:text-7xl">
              Você não precisa estudar mais.{" "}
              <span className="text-gradient">Precisa estudar certo.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              O <strong className="text-foreground">Método Estudo Reverso</strong> identifica suas falhas
              e te faz praticar exatamente o que cai na prova — seja concurso público ou ENEM.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" className="text-base px-10 h-14 text-lg shadow-lg shadow-accent/25 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => handleCTA()}>
                Assinar por R$ 14,90/mês <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button size="lg" variant="outline" className="h-14 text-lg" onClick={() => document.getElementById("metodo")?.scrollIntoView({ behavior: "smooth" })}>
                Entender o método <ChevronDown className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              ✅ Acesso imediato • Menos de R$ 0,50/dia • Cancele quando quiser
            </p>
          </motion.div>
        </div>
      </section>

      {/* 3 MODOS — Viés de escolha (Hobson's +1) */}
      <section className="border-t bg-card py-16">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Para qual objetivo você estuda?
            </h2>
            <p className="mt-3 text-muted-foreground">O ProvaX se adapta ao seu caminho de aprovação</p>
          </motion.div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2">
            {[
              { icon: GraduationCap, title: "Concurso Público", desc: "Simulados por banca, estado, cargo, matéria e ano. Questões no padrão FGV, CESPE, VUNESP, FCC.", color: "text-primary", border: "hover:border-primary" },
              { icon: Target, title: "ENEM + Redação", desc: "Questões por área do conhecimento + Redação com correção por IA nas 5 competências do ENEM.", color: "text-accent", border: "hover:border-accent" },
            ].map((item, i) => (
              <motion.div key={item.title} {...stagger} transition={{ delay: i * 0.1 }}>
                <Card className={`h-full border-2 transition-all ${item.border} hover:shadow-lg cursor-pointer`} onClick={() => handleCTA()}>
                  <CardHeader className="text-center">
                    <item.icon className={`mx-auto mb-2 h-12 w-12 ${item.color}`} />
                    <CardTitle className="font-display text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground text-center">{item.desc}</p></CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* O QUE É ESTUDO REVERSO — Interesse (AIDA) */}
      <section id="metodo" className="py-20">
        <div className="container max-w-4xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              O que é o <span className="text-gradient">Estudo Reverso</span>?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              Enquanto os outros leem centenas de páginas sem saber se vão cair na prova, você
              <strong className="text-foreground"> pratica simulados e descobre exatamente onde precisa melhorar.</strong>
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Target, step: "1", title: "Faça o simulado", desc: "Questões geradas por IA no padrão da sua banca. Não importa se erra — o erro é seu maior professor." },
              { icon: BarChart3, step: "2", title: "Descubra suas falhas", desc: "Relatório mostra exatamente qual matéria, assunto e tipo de questão você mais erra." },
              { icon: TrendingUp, step: "3", title: "Estude só o necessário", desc: "Pare de perder tempo com o que já sabe. Foque 100% no que vai aumentar sua nota." },
            ].map((item, i) => (
              <motion.div key={item.step} {...stagger} transition={{ delay: i * 0.15 }}>
                <Card className="relative border-0 bg-secondary/50 h-full">
                  <div className="absolute -top-3 left-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                    {item.step}
                  </div>
                  <CardHeader className="pt-8">
                    <item.icon className="mb-2 h-8 w-8 text-primary" />
                    <CardTitle className="font-display text-lg">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{item.desc}</p></CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* COMPARATIVO — Viés de contraste */}
      <section className="border-t bg-card py-20">
        <div className="container max-w-5xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Estudo Tradicional <span className="text-destructive">vs</span> Estudo Reverso
            </h2>
            <p className="mt-3 text-muted-foreground">A diferença entre quem passa e quem fica pelo caminho</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            <motion.div {...stagger}>
              <Card className="border-destructive/20 bg-destructive/5 h-full">
                <CardHeader>
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-destructive" /> 📚 Estudo Tradicional
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    "Meses lendo teoria sem saber se vai cair na prova",
                    "Estuda tudo por igual — o certo e o errado",
                    "Não sabe em que nível está até o dia da prova",
                    "Falsa sensação de progresso (leu ≠ aprendeu)",
                    "Desgaste, ansiedade e desistência",
                    "Resultado: chega na prova sem confiança",
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
              <Card className="border-accent/20 bg-accent/5 h-full ring-2 ring-accent/20">
                <CardHeader>
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <Target className="h-6 w-6 text-accent" /> 🎯 Estudo Reverso (ProvaX)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    "Pratica simulados desde o primeiro dia",
                    "Descobre suas falhas reais automaticamente",
                    "Estuda apenas o que vai aumentar sua nota",
                    "Progresso mensurável com XP e estatísticas",
                    "Motivação por gamificação e resultados visíveis",
                    "Resultado: confiança fundamentada em dados",
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
        </div>
      </section>

      {/* DOR — Desejo (AIDA) + Viés de identificação */}
      <section className="py-20">
        <div className="container max-w-3xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Você se reconhece em alguma dessas situações?
            </h2>
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Clock, text: "Estuda há meses mas sente que não evolui" },
              { icon: BookOpen, text: "Já comprou curso caro mas não terminou nem a metade" },
              { icon: Target, text: "Não sabe se está estudando o que realmente cai na prova" },
              { icon: Shield, text: "Tem medo de chegar no dia da prova e dar branco" },
              { icon: Brain, text: "Sente que esquece o que estudou na semana passada" },
              { icon: TrendingUp, text: "Quer passar logo mas não sabe por onde começar" },
            ].map((item, i) => (
              <motion.div key={i} {...stagger} transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 rounded-xl border bg-background/50 p-4"
              >
                <item.icon className="h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">{item.text}</span>
              </motion.div>
            ))}
          </div>
          <motion.div {...fadeUp} className="mt-8 text-center">
            <p className="text-lg font-medium text-foreground">
              Se marcou pelo menos 2, o <span className="text-gradient font-bold">Estudo Reverso</span> foi feito pra você.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Milhares de estudantes já mudaram de método. Falta só você.
            </p>
          </motion.div>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section className="border-t bg-card py-20">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Tudo que você precisa para ser aprovado</h2>
            <p className="mt-3 text-muted-foreground">Uma plataforma completa para concurso, ENEM e redação</p>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Brain, title: "IA que aprende com bancas reais", desc: "Questões geradas no padrão exato: CESPE, FGV, VUNESP, FCC. A IA aprende continuamente com provas importadas." },
              { icon: Target, title: "Prova completa automática", desc: "Gere um simulado inteiro no formato real do edital: 60 questões distribuídas por matéria, como na prova." },
              { icon: BarChart3, title: "Análise de desempenho", desc: "Estatísticas por matéria e assunto. Saiba exatamente onde erra e onde focar seus estudos." },
              { icon: Award, title: "Simulado adaptativo", desc: "Quanto mais você pratica, mais inteligente ficam as questões. Foco nos seus pontos fracos." },
              { icon: BookOpen, title: "Redação corrigida por IA", desc: "Correção estruturada nas 5 competências do ENEM com feedback detalhado e nota estimada." },
              { icon: GraduationCap, title: "Professor PX 24h", desc: "Tutor IA que te chama pelo nome e tira qualquer dúvida de qualquer matéria, a qualquer hora." },
              { icon: Users, title: "Preparação por concurso", desc: "Filtre por banca, estado, área e carreira. Estude exatamente o que cai na SUA prova." },
              { icon: Shield, title: "Gabarito comentado", desc: "Cada questão tem explicação detalhada. Aprenda com seus erros e acertos." },
            ].map((f, i) => (
              <motion.div key={f.title} {...stagger} transition={{ delay: i * 0.06 }}>
                <Card className="border-0 bg-secondary/50 h-full transition-shadow hover:shadow-md">
                  <CardHeader>
                    <f.icon className="mb-2 h-8 w-8 text-primary" />
                    <CardTitle className="font-display text-lg">{f.title}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{f.desc}</p></CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PROVA SOCIAL — Viés de conformidade */}
      <section className="py-20">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Quem usa, aprova</h2>
            <p className="mt-3 text-muted-foreground">Resultados reais de quem mudou de método</p>
          </motion.div>
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
                    <p className="text-sm text-muted-foreground mb-3">"{d.text}"</p>
                    <p className="text-sm font-medium">{d.name}</p>
                    <p className="text-xs text-muted-foreground">{d.role}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* PLANO PROVAX X — Destaque principal */}
      <section id="planos" className="border-t bg-card py-20">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-4">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Quanto custa <span className="text-destructive">não</span> passar?
            </h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Inscrição perdida + meses de estudo sem direção + materiais caros = <strong className="text-foreground">milhares de reais jogados fora.</strong>{" "}
              O ProvaX custa menos que um cafezinho por dia.
            </p>
          </motion.div>

          {/* Provax X — Hero Card */}
          <motion.div {...fadeUp} className="mx-auto max-w-lg mt-12 mb-10">
            <Card className="border-2 border-accent relative ring-4 ring-accent/20 shadow-2xl shadow-accent/10">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <Badge className="bg-accent text-accent-foreground gap-1 px-4 py-1.5 text-sm font-bold shadow-lg">
                  <Zap className="h-4 w-4" /> Oferta Principal
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
                    "25 questões por dia",
                    "Simulados para Concurso + ENEM",
                    "Professor IA 24h (Professor PX)",
                    "Redação corrigida por IA",
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

          {/* Outros planos — secundários */}
          <motion.div {...fadeUp} className="text-center mb-6">
            <p className="text-sm text-muted-foreground">Quer mais recursos? Conheça nossos outros planos</p>
          </motion.div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-2 mt-4">
            {/* Start */}
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
                    {[
                      "Tudo do Provax X",
                      "25 questões por dia",
                      "Simulado personalizado",
                      "Estatísticas básicas",
                      "Histórico de erros",
                    ].map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-accent shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" onClick={() => {
                    const link = getLink("start");
                    if (!link) return;
                    trackFBEvent("InitiateCheckout", { content_name: "Start", value: 29.90, currency: "BRL" });
                    window.open(link, "_blank");
                  }}>
                    Assinar Start
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pro */}
            <motion.div {...stagger} transition={{ delay: 0.2 }}>
              <Card className="h-full border-2 border-accent/30 relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-accent text-accent-foreground gap-1">
                    <Crown className="h-3 w-3" /> Aprovação máxima
                  </Badge>
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
                    {[
                      "60 questões por dia",
                      "Filtro por banca e estado",
                      "Concursos anteriores reais",
                      "Ranking completo",
                      "Estatísticas avançadas",
                      "Simulado reverso inteligente",
                      "Tudo do Start incluso",
                    ].map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-accent shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant="outline" onClick={() => {
                    const link = getLink("pro");
                    if (!link) return;
                    trackFBEvent("InitiateCheckout", { content_name: "Pro", value: 49.90, currency: "BRL" });
                    window.open(link, "_blank");
                  }}>
                    Assinar Pro
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          <motion.div {...fadeUp} className="mt-8 text-center space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-2 text-sm text-accent">
              <Shield className="h-4 w-4" /> Garantia de 7 dias — não gostou, devolvemos seu dinheiro.
            </div>
          </motion.div>
        </div>
      </section>

      {/* NÚMEROS — Viés de prova social numérica */}
      <section className="py-16">
        <div className="container">
          <motion.div {...fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { number: "25", label: "Questões por dia", icon: Flame },
              { number: "24h", label: "Professor IA disponível", icon: MessageCircle },
              { number: "R$ 0,49", label: "Por dia", icon: Trophy },
              { number: "2 modos", label: "Concurso + ENEM", icon: Target },
            ].map((item, i) => (
              <motion.div key={i} {...stagger} transition={{ delay: i * 0.1 }} className="text-center">
                <item.icon className="mx-auto mb-2 h-6 w-6 text-primary" />
                <p className="text-3xl font-bold text-foreground">{item.number}</p>
                <p className="text-sm text-muted-foreground">{item.label}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* FAQ — Viés de redução de risco */}
      <section className="border-t bg-card py-20">
        <div className="container max-w-3xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Perguntas Frequentes</h2>
          </motion.div>
          <div className="space-y-4">
            {[
              { q: "Como funciona o pagamento?", a: "Você assina por R$ 14,90/mês na Kiwify com pagamento recorrente seguro. Após a confirmação, seu acesso é liberado automaticamente." },
              { q: "Serve para ENEM também?", a: "Sim! O ProvaX tem 2 modos: Concurso Público e ENEM. Em cada um, as questões são adaptadas ao formato real da prova. E a redação tem correção por IA nas 5 competências!" },
              { q: "Como funciona o XP?", a: "Cada questão que você acerta vale 1 XP. Ao subir de nível, ganha 20 moedas de recompensa. Quanto mais pratica, mais rápido evolui!" },
              { q: "As questões são iguais às da prova?", a: "As questões são geradas por IA treinada no padrão exato de cada banca e vestibular. É o treino mais próximo da prova real que existe." },
              { q: "Posso cancelar quando quiser?", a: "Sim! Cancele a qualquer momento. E ainda tem garantia de 7 dias — não gostou, devolvemos seu dinheiro." },
              { q: "Qual a diferença entre os planos?", a: "O Provax X dá 25 questões/dia + estatísticas + histórico de erros por R$ 14,90/mês. O Start é o mesmo acesso por R$ 29,90 com opção semestral/anual. O Pro dá 60/dia + filtro por banca/estado + ranking + simulado reverso." },
            ].map((item, i) => (
              <motion.div key={i} {...stagger} transition={{ delay: i * 0.05 }} className="rounded-xl border bg-background/50 p-5">
                <p className="font-medium text-foreground mb-2">{item.q}</p>
                <p className="text-sm text-muted-foreground">{item.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL — Viés de aversão à perda */}
      <section className="border-t bg-card py-20">
        <div className="container text-center max-w-2xl">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-3xl font-bold md:text-4xl mb-4">
              Cada dia sem prática é um dia a mais <span className="text-destructive">longe da sua aprovação.</span>
            </h2>
            <p className="text-muted-foreground mb-4 text-lg">
              Quem começa hoje, já sai na frente amanhã. O Método Estudo Reverso funciona
              porque te faz praticar o que realmente importa.
            </p>
            <p className="text-sm font-medium text-foreground mb-8">
              🕐 Enquanto você pensa, outros já estão praticando.
            </p>
            <Button size="lg" className="text-lg px-10 h-14 shadow-lg shadow-accent/25 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => handleCTA()}>
              Assinar por R$ 14,90/mês <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Pagamento seguro</span>
              <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Garantia 7 dias</span>
              <span className="flex items-center gap-1"><Zap className="h-3 w-3" /> Acesso imediato</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* STICKY CTA - mobile */}
      {showSticky && !user && (
        <motion.div
          initial={{ y: 100 }} animate={{ y: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="fixed bottom-0 left-0 right-0 z-50 border-t bg-card/95 backdrop-blur-md p-3 md:hidden"
        >
          <Button className="w-full h-12 text-base shadow-lg shadow-accent/25 bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => handleCTA()}>
            Assinar R$ 14,90/mês <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      )}

      {/* CONTATO */}
      <section className="border-t py-20">
        <div className="container max-w-2xl text-center">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-3xl font-bold md:text-4xl mb-4">Dúvidas? Fale conosco</h2>
            <p className="text-muted-foreground mb-8">
              Entre em contato com a administração do ProvaX para tirar dúvidas ou enviar sugestões.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" variant="outline" className="h-12 text-base gap-2" asChild>
                <a href="mailto:provax.online@gmail.com">
                  <Mail className="h-5 w-5" /> Enviar Email
                </a>
              </Button>
              <Button size="lg" variant="outline" className="h-12 text-base gap-2" asChild>
                <a href="https://www.instagram.com/provax_online/" target="_blank" rel="noopener noreferrer">
                  <Instagram className="h-5 w-5" /> Instagram
                </a>
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
