import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOptionalAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import {
  ArrowRight, CheckCircle, X, Zap, Shield, Brain, Target, BarChart3,
  Users, Star, Clock, TrendingUp, BookOpen, Award, Lock, ChevronDown
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };
const stagger = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

export default function Index() {
  const { user } = useOptionalAuth();
  const [showSticky, setShowSticky] = useState(false);

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
          <span className="font-display text-xl font-bold text-primary">ProvaX</span>
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

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-5" />
        <div className="container relative py-20 md:py-32 text-center">
          <motion.div {...fadeUp}>
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Zap className="h-4 w-4" />
              Método Estudo Reverso — Treine como quem passa
            </div>
            <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold leading-tight md:text-6xl lg:text-7xl">
              Quem passa em concurso não estuda mais…{" "}
              <span className="text-gradient">ele treina.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Descubra o método do <strong className="text-foreground">Estudo Reverso</strong> que acelera
              sua aprovação fazendo simulados no padrão exato da sua banca.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="text-base px-10 h-14 text-lg shadow-lg shadow-primary/25">
                <Link to="/register">Quero treinar como quem passa <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-14 text-lg">
                <Link to="#metodo">Entender o método <ChevronDown className="ml-2 h-5 w-5" /></Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">20 créditos grátis por dia. Sem cartão.</p>
          </motion.div>
        </div>
      </section>

      {/* O QUE É ESTUDO REVERSO */}
      <section id="metodo" className="border-t bg-card py-20">
        <div className="container max-w-4xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              O que é o <span className="text-gradient">Estudo Reverso</span>?
            </h2>
            <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
              É o método onde você <strong className="text-foreground">aprende fazendo simulados primeiro</strong>,
              identifica suas falhas e estuda apenas o que realmente cai na prova.
            </p>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Target, step: "1", title: "Faça o simulado", desc: "Questões geradas por IA no padrão exato da sua banca. Sem teoria antes." },
              { icon: BarChart3, step: "2", title: "Veja suas falhas", desc: "Relatório detalhado mostra exatamente onde você errou e por quê." },
              { icon: TrendingUp, step: "3", title: "Estude o que erra", desc: "Foco cirúrgico. Estude só o que você realmente precisa. Evolução mensurável." },
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

      {/* COMPARATIVO */}
      <section className="py-20">
        <div className="container max-w-5xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Estudo Tradicional <span className="text-destructive">vs</span> Estudo Reverso
            </h2>
            <p className="mt-3 text-muted-foreground">Veja por que quem treina passa mais rápido</p>
          </motion.div>
          <div className="grid md:grid-cols-2 gap-6">
            {/* Tradicional */}
            <motion.div {...stagger}>
              <Card className="border-destructive/20 bg-destructive/5 h-full">
                <CardHeader>
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <BookOpen className="h-6 w-6 text-destructive" /> 📚 Estudo Tradicional
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    "Meses lendo PDF sem praticar",
                    "Conteúdo infinito sem direção",
                    "Não sabe o nível real da banca",
                    "Sensação de estar estudando muito",
                    "Baixa retenção do conteúdo",
                    "Cansaço mental e desmotivação",
                    "Resultado: insegurança na prova",
                  ].map(t => (
                    <div key={t} className="flex items-start gap-2">
                      <X className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                      <span className="text-sm">{t}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
            {/* Reverso */}
            <motion.div {...stagger} transition={{ delay: 0.15 }}>
              <Card className="border-accent/20 bg-accent/5 h-full ring-2 ring-accent/20">
                <CardHeader>
                  <CardTitle className="font-display text-xl flex items-center gap-2">
                    <Target className="h-6 w-6 text-accent" /> 🎯 Estudo Reverso (ProvaX)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {[
                    "Simulados idênticos à banca desde o dia 1",
                    "Treino direcionado e estratégico",
                    "Identifica fraquezas reais em minutos",
                    "Estuda apenas o que erra",
                    "Alta retenção com prática ativa",
                    "Evolução mensurável com XP e relatórios",
                    "Resultado: preparação estratégica e confiança",
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

      {/* DOR DO PÚBLICO */}
      <section className="border-t bg-card py-20">
        <div className="container max-w-3xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold md:text-4xl">
              Se você se identifica com isso…
            </h2>
          </motion.div>
          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { icon: Clock, text: "Trabalha o dia todo e tem pouco tempo pra estudar" },
              { icon: BookOpen, text: "Já comprou curso caro e não terminou" },
              { icon: Target, text: "Não sabe se está no caminho certo pra prova" },
              { icon: Shield, text: "Tem medo de reprovar mais uma vez" },
              { icon: Brain, text: "Sente que estuda muito mas não evolui" },
              { icon: TrendingUp, text: "Quer um método que funcione com pouco tempo" },
            ].map((item, i) => (
              <motion.div key={i} {...stagger} transition={{ delay: i * 0.08 }}
                className="flex items-center gap-3 rounded-xl border bg-background/50 p-4"
              >
                <item.icon className="h-5 w-5 shrink-0 text-primary" />
                <span className="text-sm">{item.text}</span>
              </motion.div>
            ))}
          </div>
          <motion.p {...fadeUp} className="mt-8 text-center text-lg font-medium text-foreground">
            O <span className="text-gradient font-bold">Estudo Reverso</span> foi criado pra você.
          </motion.p>
        </div>
      </section>

      {/* FUNCIONALIDADES */}
      <section className="py-20">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Ferramentas de aprovação</h2>
            <p className="mt-3 text-muted-foreground">Tudo que você precisa numa plataforma só</p>
          </motion.div>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Brain, title: "IA Adaptativa", desc: "Questões no estilo exato da sua banca: FGV, CESPE, VUNESP, FCC" },
              { icon: Target, title: "Filtro por Edital", desc: "Área → Matéria → Estado → Banca → Ano. Estudo cirúrgico." },
              { icon: BarChart3, title: "Relatório Inteligente", desc: "Saiba onde erra, quanto tempo gasta e o que precisa focar" },
              { icon: Award, title: "Gamificação", desc: "XP, níveis e moedas bônus. Motivação que funciona." },
              { icon: BookOpen, title: "Redação com IA", desc: "Correção rigorosa com feedback por competência do ENEM" },
              { icon: Users, title: "Indicação", desc: "Convide amigos e ganhe créditos automaticamente" },
              { icon: Zap, title: "ENEM Completo", desc: "Todas as disciplinas com assuntos do Fundamental ao Médio" },
              { icon: Shield, title: "Seguro", desc: "Dados protegidos. Sistema anti-fraude integrado." },
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

      {/* PROVA SOCIAL */}
      <section className="border-t bg-card py-20">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold md:text-4xl">O que dizem nossos usuários</h2>
          </motion.div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              { name: "Ana Clara", role: "Aprovada na PRF", text: "Os simulados imitam perfeitamente o estilo do CESPE. O Estudo Reverso foi o diferencial.", stars: 5 },
              { name: "Ricardo Santos", role: "Estudante AFRFB", text: "Melhorei minha nota de redação de 500 para 780 com a correção por IA.", stars: 5 },
              { name: "Mariana Costa", role: "Aprovada no BB", text: "O sistema de moedas e XP me motiva todo dia. Nunca estudei tão focada.", stars: 5 },
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

      {/* OFERTA / PLANOS */}
      <section id="planos" className="py-20">
        <div className="container">
          <motion.div {...fadeUp} className="text-center mb-4">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Invista na sua aprovação</h2>
            <p className="mt-3 text-muted-foreground max-w-xl mx-auto">
              Quanto custa uma reprovação? Meses perdidos + inscrição + material. O ProvaX custa menos que um cafezinho por dia.
            </p>
          </motion.div>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3 mt-12">
            {[
              { name: "Gratuito", price: "R$ 0", sub: "para sempre", features: ["20 créditos/dia", "Simulados de 5 e 10 questões", "Relatório básico", "Sistema de XP e níveis"] },
              { name: "Pro", price: "R$ 29,90", sub: "/mês", features: ["500 créditos/mês acumulativos", "Simulados ilimitados", "5 redações/mês", "Relatório avançado", "Suporte prioritário"], popular: true },
              { name: "Premium", price: "R$ 49,90", sub: "/mês", features: ["1000 créditos/mês acumulativos", "Tudo do Pro", "Provas completas de 60 questões", "Redações ilimitadas", "Probabilidade de aprovação"] },
            ].map(p => (
              <motion.div key={p.name} {...stagger}>
                <Card className={`h-full ${p.popular ? "border-2 border-primary relative shadow-lg shadow-primary/10" : ""}`}>
                  {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-bold text-primary-foreground">Mais Popular</div>}
                  <CardHeader>
                    <CardTitle className="font-display">{p.name}</CardTitle>
                    <p className="text-3xl font-bold">{p.price}<span className="text-sm font-normal text-muted-foreground">{p.sub}</span></p>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {p.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="h-4 w-4 text-accent shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    <Button className="w-full" variant={p.popular ? "default" : "outline"} asChild>
                      <Link to="/register">{p.popular ? "Começar Agora" : "Criar Conta"}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
          <motion.div {...fadeUp} className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-2 text-sm text-accent">
              <Shield className="h-4 w-4" /> Garantia de 7 dias — não gostou, devolvemos seu dinheiro.
            </div>
          </motion.div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="border-t bg-card py-20">
        <div className="container text-center max-w-2xl">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-3xl font-bold md:text-4xl mb-4">
              Pare de ler. Comece a <span className="text-gradient">treinar.</span>
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Cada dia sem praticar é um dia a mais até a sua aprovação.
              Comece agora com o Estudo Reverso.
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
            <Link to="/register">Começar meu Estudo Reverso <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </motion.div>
      )}

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 ProvaX. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
