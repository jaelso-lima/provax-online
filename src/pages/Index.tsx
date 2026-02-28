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

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };
const stagger = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

export default function Index() {
  const { user } = useOptionalAuth();
  const navigate = useNavigate();
  const [showSticky, setShowSticky] = useState(false);

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
                <Button size="sm" asChild><Link to="/register">Começar Grátis</Link></Button>
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
              Concursos • ENEM • Universidade — Uma plataforma, três caminhos de aprovação
            </div>
            <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold leading-tight md:text-6xl lg:text-7xl">
              Você não precisa estudar mais.{" "}
              <span className="text-gradient">Precisa estudar certo.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              O <strong className="text-foreground">Método Estudo Reverso</strong> identifica suas falhas
              e te faz praticar exatamente o que cai na prova — seja concurso público, ENEM ou faculdade.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="text-base px-10 h-14 text-lg shadow-lg shadow-primary/25">
                <Link to="/register">Começar agora — é grátis <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 text-lg" onClick={() => document.getElementById("metodo")?.scrollIntoView({ behavior: "smooth" })}>
                Entender o método <ChevronDown className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              ✅ 10 questões grátis por dia • Sem cartão de crédito • Cancele quando quiser
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
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              { icon: GraduationCap, title: "Concurso Público", desc: "Simulados por banca, estado, cargo, matéria e ano. Questões no padrão FGV, CESPE, VUNESP, FCC.", color: "text-primary", border: "hover:border-primary" },
              { icon: Target, title: "ENEM", desc: "Questões por área do conhecimento + Redação com correção por IA nas 5 competências.", color: "text-accent", border: "hover:border-accent" },
              { icon: BookOpen, title: "Universidade", desc: "Provas de faculdade por curso: Direito, Medicina, Engenharia, Administração e mais.", color: "text-primary", border: "hover:border-primary" },
            ].map((item, i) => (
              <motion.div key={item.title} {...stagger} transition={{ delay: i * 0.1 }}>
                <Card className={`h-full border-2 transition-all ${item.border} hover:shadow-lg cursor-pointer`} onClick={() => navigate("/register")}>
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
            <p className="mt-3 text-muted-foreground">Uma plataforma completa para concurso, ENEM e universidade</p>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Brain, title: "IA que imita sua banca", desc: "Questões geradas no padrão exato: CESPE, FGV, VUNESP, FCC e vestibulares" },
              { icon: Target, title: "Filtros cirúrgicos", desc: "Banca → Estado → Matéria → Assunto → Ano. Estude só o que importa." },
              { icon: BarChart3, title: "Relatório de falhas", desc: "Saiba exatamente onde erra e quanto tempo gasta em cada tipo de questão" },
              { icon: Award, title: "XP por acerto", desc: "Cada questão certa = 1 XP. Suba de nível e desbloqueie recompensas." },
              { icon: BookOpen, title: "Redação com IA", desc: "Correção nas 5 competências do ENEM com feedback detalhado" },
              { icon: GraduationCap, title: "Professor PX 24h", desc: "Tutor IA que te chama pelo nome e tira qualquer dúvida, a qualquer hora" },
              { icon: Users, title: "Indique e ganhe", desc: "Convide amigos e ganhe moedas + XP automaticamente" },
              { icon: Shield, title: "Anti-fraude", desc: "Seus dados protegidos. Sistema seguro e monitorado." },
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

      {/* PLANOS — Ação (AIDA) + Ancoragem + Efeito Chamariz */}
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
          <div className="mx-auto grid max-w-5xl gap-6 md:grid-cols-3 mt-12">
            {/* Free — Âncora */}
            <motion.div {...stagger}>
              <Card className="h-full">
                <CardHeader className="text-center">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-display text-xl">Gratuito</CardTitle>
                  <p className="text-3xl font-bold mt-2">R$ 0<span className="text-sm font-normal text-muted-foreground"> /sempre</span></p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {[
                      "10 questões por dia",
                      "Simulados básicos",
                      "Professor PX (chat IA)",
                      "Sistema de XP e níveis",
                    ].map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-accent shrink-0" />{f}
                      </li>
                    ))}
                    {[
                      "Estatísticas avançadas",
                      "Filtro por banca/estado",
                      "Ranking",
                    ].map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground/60">
                        <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />{f}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant="outline" asChild>
                    <Link to="/register">Criar conta grátis</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Start — Chamariz */}
            <motion.div {...stagger} transition={{ delay: 0.1 }}>
              <Card className="h-full border-2 border-primary relative shadow-lg shadow-primary/10">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">Mais Popular</div>
                <CardHeader className="text-center pt-8">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Star className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-display text-xl">Start</CardTitle>
                  <p className="text-3xl font-bold mt-2">R$ 29,90<span className="text-sm font-normal text-muted-foreground"> /mês</span></p>
                  <p className="text-xs text-muted-foreground">ou R$ 149/semestre • R$ 297/ano</p>
                  <Badge className="mt-2 bg-accent/10 text-accent border-accent/20">
                    <Percent className="h-3 w-3 mr-1" /> Até 17% de economia no anual
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {[
                      "25 questões por dia",
                      "Todas as disciplinas",
                      "Simulado personalizado",
                      "Estatísticas básicas",
                      "Histórico de erros",
                    ].map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-accent shrink-0" />{f}
                      </li>
                    ))}
                    {[
                      "Filtro por banca/estado",
                      "Ranking",
                    ].map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm text-muted-foreground/60">
                        <X className="h-4 w-4 shrink-0 text-muted-foreground/40" />{f}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" asChild>
                    <Link to="/register">Começar agora</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pro — Melhor valor */}
            <motion.div {...stagger} transition={{ delay: 0.2 }}>
              <Card className="h-full border-2 border-accent relative ring-2 ring-accent/20">
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
                  <p className="text-xs text-muted-foreground">ou R$ 249/semestre • R$ 497/ano</p>
                  <Badge className="mt-2 bg-accent/10 text-accent border-accent/20">
                    <Percent className="h-3 w-3 mr-1" /> Até 17% de economia no anual
                  </Badge>
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
                  <Button className="w-full bg-accent text-accent-foreground hover:bg-accent/90" asChild>
                    <Link to="/register">Garantir minha vaga</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </div>
          <motion.div {...fadeUp} className="mt-8 text-center space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-2 text-sm text-accent">
              <Shield className="h-4 w-4" /> Garantia de 7 dias — não gostou, devolvemos seu dinheiro.
            </div>
            <p className="text-xs text-muted-foreground">Planos semestral e anual com validade fixa. Veja detalhes em /planos.</p>
          </motion.div>
        </div>
      </section>

      {/* NÚMEROS — Viés de prova social numérica */}
      <section className="py-16">
        <div className="container">
          <motion.div {...fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { number: "10", label: "Questões grátis/dia", icon: Flame },
              { number: "24h", label: "Professor IA disponível", icon: MessageCircle },
              { number: "1 XP", label: "Por questão acertada", icon: Trophy },
              { number: "3 modos", label: "Concurso, ENEM, Uni", icon: Target },
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
              { q: "Preciso pagar para começar?", a: "Não! Você ganha 10 questões por dia gratuitamente para sempre. Sem cartão de crédito. Comece a praticar agora." },
              { q: "Serve para ENEM e faculdade também?", a: "Sim! O ProvaX tem 3 modos: Concurso Público, ENEM e Universidade. Em cada um, as questões são adaptadas ao formato real da prova." },
              { q: "Como funciona o XP?", a: "Cada questão que você acerta vale 1 XP. Ao subir de nível, ganha 20 moedas de recompensa. Quanto mais pratica, mais rápido evolui!" },
              { q: "As questões são iguais às da prova?", a: "As questões são geradas por IA treinada no padrão exato de cada banca e vestibular. É o treino mais próximo da prova real que existe." },
              { q: "Posso cancelar quando quiser?", a: "Sim! Cancele a qualquer momento. E ainda tem garantia de 7 dias nos planos pagos — não gostou, devolvemos seu dinheiro." },
              { q: "Qual a diferença entre os planos?", a: "O Gratuito dá 10 questões/dia. O Start libera 25/dia + estatísticas + histórico de erros. O Pro dá 60/dia + filtro por banca/estado + ranking + simulado reverso." },
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
            <Button size="lg" asChild className="text-lg px-10 h-14 shadow-lg shadow-primary/25">
              <Link to="/register">Começar meu Estudo Reverso agora <ArrowRight className="ml-2 h-5 w-5" /></Link>
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
          <Button className="w-full h-12 text-base shadow-lg shadow-primary/25" asChild>
            <Link to="/register">Começar grátis agora <ArrowRight className="ml-2 h-5 w-5" /></Link>
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
