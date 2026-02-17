import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { motion } from "framer-motion";
import {
  Target, Brain, FileText, Coins, Trophy, Shield, Zap, ArrowRight, CheckCircle2,
} from "lucide-react";

const features = [
  { icon: Brain, title: "IA Avançada", desc: "Questões geradas por inteligência artificial adaptadas ao seu nível." },
  { icon: Target, title: "Simulados Reais", desc: "Provas completas no estilo das bancas mais importantes do país." },
  { icon: FileText, title: "Correção de Redação", desc: "Feedback detalhado com nota por competência, como no ENEM." },
  { icon: Coins, title: "Sistema de Moedas", desc: "Ganhe moedas ao estudar e use para gerar novos simulados." },
  { icon: Trophy, title: "Ranking Global", desc: "Compete com outros estudantes e evolua seu nível." },
  { icon: Shield, title: "Segurança Total", desc: "Seus dados protegidos com criptografia e segurança avançada." },
];

const benefits = [
  "Questões personalizadas por carreira e banca",
  "Provas completas de 60 questões (Premium)",
  "Cronômetro real e salvamento automático",
  "Estatísticas detalhadas de desempenho",
  "Sistema de gamificação com XP e níveis",
  "Indicação premiada: ganhe 20 moedas",
];

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="container flex h-16 items-center justify-between">
          <span className="font-display text-xl font-bold text-gradient">PROVAX</span>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/login">
              <Button variant="ghost" size="sm">Entrar</Button>
            </Link>
            <Link to="/register">
              <Button size="sm">
                Começar grátis <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden pt-32 pb-20">
        <div className="absolute inset-0 gradient-primary opacity-5" />
        <div className="container relative text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <Zap className="h-4 w-4" /> Plataforma #1 em preparação para concursos
            </div>
            <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold leading-tight sm:text-5xl lg:text-6xl">
              Sua aprovação começa{" "}
              <span className="text-gradient">aqui</span>
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
              Simulados com IA, correção de redações, gamificação e ranking.
              Tudo que você precisa para conquistar sua vaga no serviço público.
            </p>
            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link to="/register">
                <Button size="lg" className="gap-2 text-base">
                  Criar conta grátis <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link to="/login">
                <Button variant="outline" size="lg" className="text-base">
                  Já tenho conta
                </Button>
              </Link>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              ✨ 20 moedas grátis ao se cadastrar • Sem cartão de crédito
            </p>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-secondary/30">
        <div className="container">
          <div className="text-center mb-14">
            <h2 className="font-display text-3xl font-bold">Recursos Poderosos</h2>
            <p className="mt-3 text-muted-foreground">Tudo integrado em uma única plataforma.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                viewport={{ once: true }}
                className="glass-card rounded-xl p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg gradient-primary">
                  <f.icon className="h-6 w-6 text-primary-foreground" />
                </div>
                <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-20">
        <div className="container">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <h2 className="font-display text-3xl font-bold">Por que escolher a PROVAX?</h2>
              <p className="mt-3 text-muted-foreground">
                Uma plataforma construída por quem entende o desafio dos concursos públicos.
              </p>
              <ul className="mt-8 space-y-4">
                {benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
                    <span className="text-sm">{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: "Questões geradas", value: "∞" },
                { label: "Bancas disponíveis", value: "20+" },
                { label: "Moedas de bônus", value: "20" },
                { label: "Uptime", value: "99.9%" },
              ].map((s) => (
                <div key={s.label} className="glass-card rounded-xl p-6 text-center">
                  <div className="font-display text-3xl font-bold text-primary">{s.value}</div>
                  <div className="mt-1 text-sm text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container">
          <div className="glass-card gradient-primary rounded-2xl p-12 text-center text-primary-foreground">
            <h2 className="font-display text-3xl font-bold">Pronto para ser aprovado?</h2>
            <p className="mx-auto mt-3 max-w-lg opacity-90">
              Comece agora com 20 moedas grátis e descubra como a IA pode acelerar sua preparação.
            </p>
            <Link to="/register">
              <Button size="lg" variant="secondary" className="mt-8 text-base font-semibold">
                Começar agora — é grátis
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8">
        <div className="container flex flex-col items-center justify-between gap-4 sm:flex-row">
          <span className="font-display text-sm font-bold text-gradient">PROVAX</span>
          <p className="text-sm text-muted-foreground">© 2026 PROVAX. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
}
