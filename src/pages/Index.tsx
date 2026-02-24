import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOptionalAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import {
  ArrowRight, CheckCircle, X, Zap, Shield, Brain, Target, BarChart3,
  Users, Star, Clock, TrendingUp, BookOpen, Award, Lock, ChevronDown,
  Flame, Trophy, MessageCircle, GraduationCap
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

const fadeUp = { initial: { opacity: 0, y: 30 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true }, transition: { duration: 0.5 } };
const stagger = { initial: { opacity: 0, y: 20 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true } };

export default function Index() {
  const { user } = useOptionalAuth();
  const navigate = useNavigate();
  const [showSticky, setShowSticky] = useState(false);

  // Redirect logged-in users to dashboard
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

      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-primary opacity-5" />
        <div className="container relative py-20 md:py-32 text-center">
          <motion.div {...fadeUp}>
            <div className="mx-auto mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Zap className="h-4 w-4" />
              Método Estudo Reverso — Treine com estratégia e foco no padrão da banca
            </div>
            <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold leading-tight md:text-6xl lg:text-7xl">
              Aprovação não é questão de horas de estudo.{" "}
              <span className="text-gradient">É questão de método.</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground md:text-xl">
              Descubra o método do <strong className="text-foreground">Estudo Reverso</strong> que acelera
              sua aprovação fazendo simulados no padrão exato da sua banca.
            </p>
            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Button size="lg" asChild className="text-base px-10 h-14 text-lg shadow-lg shadow-primary/25">
                <Link to="/register">Iniciar minha preparação estratégica <ArrowRight className="ml-2 h-5 w-5" /></Link>
              </Button>
              <Button size="lg" variant="outline" className="h-14 text-lg" onClick={() => document.getElementById("metodo")?.scrollIntoView({ behavior: "smooth" })}>
                Entender o método <ChevronDown className="ml-2 h-5 w-5" />
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">30 créditos gratuitos por dia. Sem necessidade de cartão.</p>
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
              { icon: Target, step: "1", title: "Realize o simulado", desc: "Questões geradas por IA no padrão exato da sua banca. Pratique desde o primeiro dia." },
              { icon: BarChart3, step: "2", title: "Identifique seus pontos fracos", desc: "Relatório detalhado indica exatamente onde você precisa melhorar e por quê." },
              { icon: TrendingUp, step: "3", title: "Estude com foco no que importa", desc: "Direcionamento preciso. Estude apenas o que realmente fará diferença na sua aprovação." },
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
            <p className="mt-3 text-muted-foreground">Entenda por que a prática direcionada é mais eficiente</p>
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
                    "Meses estudando teoria sem aplicação prática",
                    "Volume extenso de conteúdo sem direcionamento",
                    "Desconhecimento do nível de exigência da banca",
                    "Falsa sensação de progresso",
                    "Baixa retenção do conteúdo estudado",
                    "Desgaste e desmotivação progressivos",
                    "Resultado: insegurança no dia da prova",
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
                    "Simulados no padrão da banca desde o primeiro dia",
                    "Treino direcionado e estratégico",
                    "Identificação precisa dos pontos fracos",
                    "Estudo focado nas lacunas reais de conhecimento",
                    "Alta retenção por meio de prática ativa",
                    "Evolução mensurável com indicadores e relatórios",
                    "Resultado: preparação sólida e confiança fundamentada",
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
              { icon: Clock, text: "Tem pouco tempo disponível para estudar" },
              { icon: BookOpen, text: "Investiu em cursos, mas não conseguiu manter a constância" },
              { icon: Target, text: "Tem dúvidas se está no caminho certo para a prova" },
              { icon: Shield, text: "Preocupa-se com a possibilidade de não ser aprovado" },
              { icon: Brain, text: "Sente que o esforço não se reflete nos resultados" },
              { icon: TrendingUp, text: "Busca um método eficiente, mesmo com tempo limitado" },
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
              { icon: Award, title: "Gamificação", desc: "XP, níveis e recompensas em moedas. Suba de nível e ganhe bônus!" },
              { icon: BookOpen, title: "Redação com IA", desc: "Correção rigorosa com feedback por competência do ENEM" },
              { icon: GraduationCap, title: "Professor PX", desc: "Chat com tutor IA especialista que te chama pelo nome e tira dúvidas 24h" },
              { icon: Users, title: "Indicação", desc: "Convide amigos e ganhe créditos + XP automaticamente" },
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
              { name: "Gratuito", price: "R$ 0", sub: "para sempre", features: ["30 créditos/dia", "Simulados de 5 e 10 questões", "Relatório básico", "Sistema de XP e níveis", "Professor PX (chat IA)"] },
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

      {/* NÚMEROS */}
      <section className="py-16">
        <div className="container">
          <motion.div {...fadeUp} className="grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto">
            {[
              { number: "30", label: "Créditos grátis/dia", icon: Flame },
              { number: "24h", label: "Professor IA disponível", icon: MessageCircle },
              { number: "+20🪙", label: "Por nível conquistado", icon: Trophy },
              { number: "100%", label: "Focado na sua banca", icon: Target },
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

      {/* FAQ */}
      <section className="border-t bg-card py-20">
        <div className="container max-w-3xl">
          <motion.div {...fadeUp} className="text-center mb-12">
            <h2 className="font-display text-3xl font-bold md:text-4xl">Perguntas Frequentes</h2>
          </motion.div>
          <div className="space-y-4">
            {[
              { q: "Preciso pagar para começar?", a: "Não! Você recebe 30 créditos gratuitos por dia, suficientes para fazer vários simulados. Sem cartão de crédito." },
              { q: "O Professor PX pode me ajudar com qualquer matéria?", a: "Sim! Ele é especialista em todas as matérias de concursos públicos e ENEM. Disponível 24 horas, 7 dias por semana." },
              { q: "Como funciona o sistema de recompensas?", a: "A cada nível que você sobe, ganha 20 moedas de bônus. Quanto mais você pratica, mais XP ganha e mais rápido sobe de nível!" },
              { q: "As questões são iguais às da prova real?", a: "Nossas questões são geradas por IA treinada no padrão exato de cada banca (CESPE, FGV, VUNESP, FCC). É o treino mais próximo da prova real." },
              { q: "Posso cancelar a qualquer momento?", a: "Sim! Você pode cancelar seu plano pago a qualquer momento. E ainda tem garantia de 7 dias para devolução." },
            ].map((item, i) => (
              <motion.div key={i} {...stagger} transition={{ delay: i * 0.05 }} className="rounded-xl border bg-background/50 p-5">
                <p className="font-medium text-foreground mb-2">{item.q}</p>
                <p className="text-sm text-muted-foreground">{item.a}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="border-t bg-card py-20">
        <div className="container text-center max-w-2xl">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-3xl font-bold md:text-4xl mb-4">
              Pare de apenas ler. Comece a <span className="text-gradient">praticar.</span>
            </h2>
            <p className="text-muted-foreground mb-8 text-lg">
              Cada dia sem prática é um dia a mais até a sua aprovação.
              Inicie agora com o Método Estudo Reverso.
            </p>
            <Button size="lg" asChild className="text-lg px-10 h-14 shadow-lg shadow-primary/25">
              <Link to="/register">Iniciar meu Estudo Reverso agora <ArrowRight className="ml-2 h-5 w-5" /></Link>
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
            <Link to="/register">Iniciar meu Estudo Reverso <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
        </motion.div>
      )}

      <footer className="border-t py-8 text-center text-sm text-muted-foreground space-y-2">
        <p>© 2026 ProvaX. Todos os direitos reservados.</p>
        <p><Link to="/termos" className="text-primary hover:underline">Termos de Uso e Política de Privacidade</Link></p>
      </footer>
    </div>
  );
}
