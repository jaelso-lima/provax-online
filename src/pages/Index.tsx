import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BarChart3,
  BookOpenCheck,
  Brain,
  Check,
  CheckCircle2,
  FileSearch,
  Instagram,
  Mail,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingUp,
  Trophy,
  WandSparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useOptionalAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import ThemeSelector from "@/components/ThemeSelector";

const reveal = {
  initial: { opacity: 0, y: 24 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: "-80px" },
  transition: { duration: 0.45 },
};

const benefits = [
  {
    icon: Brain,
    title: "Estudo reverso",
    description: "Resolva primeiro, descubra suas lacunas e concentre seu tempo no que realmente precisa melhorar.",
  },
  {
    icon: FileSearch,
    title: "Edital transformado em plano",
    description: "Organize conteúdos, cronograma e simulados com base no concurso que você escolheu.",
  },
  {
    icon: BarChart3,
    title: "Desempenho por matéria",
    description: "Veja sua porcentagem de acertos e identifique rapidamente qual conteúdo merece prioridade.",
  },
  {
    icon: WandSparkles,
    title: "Treino do seu jeito",
    description: "Monte provas por banca, matéria, tópico ou bloco do cronograma, na quantidade que desejar.",
  },
];

const journey = [
  { number: "01", title: "Crie sua conta", text: "Cadastro rápido e acesso direto ao seu painel." },
  { number: "02", title: "Escolha seu objetivo", text: "Concurso, ENEM, edital ou uma matéria específica." },
  { number: "03", title: "Treine e ajuste", text: "Use seus resultados para decidir o próximo conteúdo." },
];

function ProductPreview() {
  return (
    <div className="relative mx-auto w-full max-w-2xl" aria-label="Prévia do painel de desempenho ProvaX">
      <div className="absolute -inset-4 rounded-lg bg-primary/10 blur-3xl" />
      <div className="relative overflow-hidden rounded-lg border border-border bg-card shadow-2xl shadow-primary/10">
        <div className="flex h-12 items-center justify-between border-b border-border px-4 sm:px-5">
          <div className="flex items-center gap-2 font-display text-sm font-bold">
            <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs text-primary-foreground">PX</span>
            ProvaX
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-accent" />
            <span className="text-[11px] font-medium text-muted-foreground">Seu progresso hoje</span>
          </div>
        </div>

        <div className="grid min-h-[360px] grid-cols-[76px_1fr] sm:grid-cols-[150px_1fr]">
          <aside className="border-r border-border bg-secondary/40 p-3 sm:p-4">
            <div className="space-y-2">
              {[BarChart3, Target, BookOpenCheck, Trophy].map((Icon, index) => (
                <div
                  key={index}
                  className={`flex h-10 items-center gap-2 rounded-md px-2.5 ${index === 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"}`}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="hidden text-xs font-medium sm:inline">{["Visão geral", "Simulados", "Editais", "Ranking"][index]}</span>
                </div>
              ))}
            </div>
          </aside>

          <div className="min-w-0 p-4 sm:p-6">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase text-accent">Rota de aprovação</p>
                <h3 className="mt-1 font-display text-lg font-bold sm:text-xl">Bom ritmo, continue assim</h3>
              </div>
              <span className="rounded-md bg-accent/10 px-2.5 py-1 text-xs font-bold text-accent">+12% esta semana</span>
            </div>

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
              {[
                ["72%", "Taxa de acerto"],
                ["148", "Questões resolvidas"],
                ["6", "Dias de sequência"],
              ].map(([value, label], index) => (
                <div key={label} className={`rounded-md border border-border bg-background p-3 ${index === 2 ? "col-span-2 lg:col-span-1" : ""}`}>
                  <p className="font-display text-xl font-bold text-foreground sm:text-2xl">{value}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground sm:text-xs">{label}</p>
                </div>
              ))}
            </div>

            <div className="mt-4 rounded-md border border-border bg-background p-4">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-semibold sm:text-sm">Acertos por matéria</p>
                <TrendingUp className="h-4 w-4 text-accent" />
              </div>
              <div className="space-y-3">
                {[
                  ["Português", "82%", "w-[82%]"],
                  ["Direito Constitucional", "68%", "w-[68%]"],
                  ["Matemática", "54%", "w-[54%]"],
                ].map(([subject, value, width]) => (
                  <div key={subject}>
                    <div className="mb-1.5 flex justify-between gap-3 text-[10px] sm:text-xs">
                      <span className="truncate text-muted-foreground">{subject}</span>
                      <span className="font-bold text-foreground">{value}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div className={`h-full rounded-full bg-primary ${width}`} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Index() {
  const { user } = useOptionalAuth();
  const navigate = useNavigate();
  const [showSticky, setShowSticky] = useState(false);

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 520);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen overflow-x-hidden bg-background">
      <nav className="sticky top-0 z-50 border-b border-border bg-background/95 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold" aria-label="ProvaX - página inicial">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs text-primary-foreground">PX</span>
            <span>ProvaX</span>
          </Link>
          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden sm:flex"><ThemeSelector /></div>
            <ThemeToggle />
            <Button variant="ghost" size="sm" asChild><Link to="/login">Entrar</Link></Button>
            <Button size="sm" asChild><Link to="/register">Criar conta</Link></Button>
          </div>
        </div>
      </nav>

      <main>
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--accent)/0.10),transparent_32%),radial-gradient(circle_at_15%_10%,hsl(var(--primary)/0.10),transparent_28%)]" />
          <div className="container relative grid min-h-[calc(100svh-4rem)] items-center gap-12 py-12 lg:grid-cols-[0.9fr_1.1fr] lg:gap-16 lg:py-16">
            <motion.div initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <div className="mb-5 inline-flex items-center gap-2 rounded-md border border-accent/25 bg-accent/10 px-3 py-1.5 text-xs font-bold text-accent">
                <Sparkles className="h-3.5 w-3.5" />
                Estude com direção, não por tentativa
              </div>
              <h1 className="max-w-2xl font-display text-4xl font-bold leading-[1.08] sm:text-5xl lg:text-6xl">
                Descubra o que estudar para <span className="text-gradient">avançar mais rápido.</span>
              </h1>
              <p className="mt-5 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
                O ProvaX transforma seus erros, seu edital e seus resultados em uma rota clara de estudos para concursos, ENEM e redação.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" className="h-12 px-6 text-base shadow-lg shadow-primary/20" asChild>
                  <Link to="/register">Começar gratuitamente <ArrowRight className="ml-2 h-5 w-5" /></Link>
                </Button>
                <Button size="lg" variant="outline" className="h-12 px-6 text-base" asChild>
                  <Link to="/login">Já tenho conta</Link>
                </Button>
              </div>
              <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground">
                {["Sem cartão", "Acesso direto ao painel", "Comece no plano gratuito"].map((item) => (
                  <span key={item} className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-accent" />{item}</span>
                ))}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 28 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, delay: 0.12 }}>
              <ProductPreview />
            </motion.div>
          </div>
        </section>

        <section className="border-b border-border bg-card py-14">
          <div className="container">
            <div className="grid gap-8 sm:grid-cols-3">
              {[
                [Target, "Treino direcionado", "Questões alinhadas à banca e aos assuntos escolhidos."],
                [ShieldCheck, "Decisão com dados", "Seu histórico mostra onde insistir e onde você já evoluiu."],
                [CheckCircle2, "Tudo em um só lugar", "Edital, cronograma, simulados e redação conectados."],
              ].map(([Icon, title, text]) => {
                const FeatureIcon = Icon as typeof Target;
                return (
                  <div key={title as string} className="flex gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary"><FeatureIcon className="h-5 w-5" /></div>
                    <div><h2 className="font-display text-base font-bold">{title as string}</h2><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{text as string}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container">
            <motion.div {...reveal} className="max-w-2xl">
              <p className="text-sm font-bold uppercase text-primary">Uma plataforma que se adapta a você</p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Menos conteúdo aleatório. Mais prática com propósito.</h2>
              <p className="mt-4 text-muted-foreground">Cada ferramenta ajuda você a transformar tempo de estudo em uma decisão mais inteligente.</p>
            </motion.div>
            <div className="mt-10 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2">
              {benefits.map((item, index) => (
                <motion.article key={item.title} {...reveal} transition={{ duration: 0.4, delay: index * 0.06 }} className="bg-card p-6 sm:p-8">
                  <item.icon className="h-7 w-7 text-primary" />
                  <h3 className="mt-5 font-display text-xl font-bold">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                </motion.article>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y border-border bg-foreground py-20 text-background">
          <div className="container grid items-start gap-12 lg:grid-cols-[0.8fr_1.2fr]">
            <motion.div {...reveal}>
              <p className="text-sm font-bold uppercase text-accent">Simples desde o primeiro acesso</p>
              <h2 className="mt-3 font-display text-3xl font-bold sm:text-4xl">Do cadastro ao primeiro treino, sem vídeo obrigatório.</h2>
              <p className="mt-4 max-w-lg text-sm leading-relaxed text-background/70">Você entra no painel imediatamente e escolhe o melhor caminho para começar.</p>
              <Button size="lg" className="mt-7" asChild><Link to="/register">Acessar meu painel <ArrowRight className="ml-2 h-5 w-5" /></Link></Button>
            </motion.div>
            <div className="space-y-3">
              {journey.map((item) => (
                <motion.div key={item.number} {...reveal} className="grid grid-cols-[48px_1fr] gap-4 border-b border-background/15 py-5 first:pt-0">
                  <span className="font-display text-lg font-bold text-accent">{item.number}</span>
                  <div><h3 className="font-display text-lg font-bold">{item.title}</h3><p className="mt-1 text-sm text-background/65">{item.text}</p></div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="container text-center">
            <motion.div {...reveal} className="mx-auto max-w-2xl">
              <Trophy className="mx-auto h-9 w-9 text-accent" />
              <h2 className="mt-5 font-display text-3xl font-bold sm:text-4xl">Seu próximo estudo já pode ter direção.</h2>
              <p className="mx-auto mt-4 max-w-xl text-muted-foreground">Crie sua conta gratuita, entre no painel e comece pelo simulado, edital ou matéria que mais importa para você.</p>
              <Button size="lg" className="mt-7 h-12 px-8 text-base" asChild><Link to="/register">Criar conta grátis <ArrowRight className="ml-2 h-5 w-5" /></Link></Button>
            </motion.div>
          </div>
        </section>

        <section className="border-t border-border bg-card py-10">
          <div className="container flex flex-col items-center justify-between gap-5 sm:flex-row">
            <div><h2 className="font-display text-lg font-bold">Precisa falar com a equipe?</h2><p className="mt-1 text-sm text-muted-foreground">Escolha o canal que preferir.</p></div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button variant="outline" size="sm" asChild><a href="mailto:provax.online@gmail.com"><Mail className="mr-2 h-4 w-4" />Email</a></Button>
              <Button variant="outline" size="sm" asChild><a href="https://www.instagram.com/provax_online/" target="_blank" rel="noopener noreferrer"><Instagram className="mr-2 h-4 w-4" />Instagram</a></Button>
              <Button variant="outline" size="sm" asChild><a href="https://chat.whatsapp.com/CaQMyka3CMU4QBUcl6WQxr" target="_blank" rel="noopener noreferrer"><MessageCircle className="mr-2 h-4 w-4" />WhatsApp</a></Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-7 text-center text-xs text-muted-foreground">
        <p>© 2026 ProvaX. Todos os direitos reservados.</p>
        <Link to="/termos" className="mt-1 inline-block text-primary hover:underline">Termos de Uso e Política de Privacidade</Link>
      </footer>

      {showSticky && !user && (
        <motion.div initial={{ y: 100 }} animate={{ y: 0 }} className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-background/95 p-3 backdrop-blur-xl md:hidden">
          <Button className="h-12 w-full text-base" asChild><Link to="/register">Começar gratuitamente <ArrowRight className="ml-2 h-5 w-5" /></Link></Button>
        </motion.div>
      )}
    </div>
  );
}