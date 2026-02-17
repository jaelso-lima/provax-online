import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { BookOpen, PenTool, Coins, Trophy, ArrowRight, CheckCircle, Zap, Shield, Brain, Target, BarChart3, Users, Sparkles, Star } from "lucide-react";

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <nav className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm">
        <div className="container flex h-14 items-center justify-between">
          <span className="font-display text-xl font-bold text-primary">ProvaX</span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button asChild><Link to="/dashboard">Dashboard</Link></Button>
            ) : (
              <>
                <Button variant="ghost" asChild><Link to="/login">Entrar</Link></Button>
                <Button asChild><Link to="/register">Criar Conta</Link></Button>
              </>
            )}
          </div>
        </div>
      </nav>

      <section className="container py-20 text-center md:py-32">
        <div className="mx-auto inline-flex items-center gap-2 rounded-full border bg-secondary/50 px-4 py-1.5 text-sm text-muted-foreground mb-6">
          <Sparkles className="h-4 w-4 text-primary" />
          Questões geradas por IA no padrão da sua banca
        </div>
        <h1 className="mx-auto max-w-4xl font-display text-4xl font-bold leading-tight md:text-6xl">
          Passe no concurso com simulados que imitam{" "}
          <span className="text-primary">exatamente a banca</span>{" "}
          do seu edital.
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
          IA adaptativa que gera questões no padrão real de FGV, CESPE, VUNESP, FCC e IBFC.
          Redações corrigidas no padrão de bancas federais. Evolução gamificada com sistema de XP e moedas.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <Button size="lg" asChild className="text-base px-8">
            <Link to="/register">Comece Agora Gratuitamente <ArrowRight className="ml-2 h-5 w-5" /></Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <Link to="#comparativo">Ver Comparativo</Link>
          </Button>
        </div>
        <p className="mt-4 text-sm text-muted-foreground">100 moedas grátis ao criar sua conta. Sem cartão de crédito.</p>
      </section>

      <section className="border-t bg-card py-20">
        <div className="container">
          <h2 className="mb-4 text-center font-display text-3xl font-bold">Tudo que você precisa para aprovação</h2>
          <p className="mb-12 text-center text-muted-foreground max-w-xl mx-auto">Ferramentas inteligentes que simulam a experiência real do dia da prova</p>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: Brain, title: "IA Adaptativa", desc: "Questões geradas por IA no estilo exato da banca do seu edital" },
              { icon: PenTool, title: "Redação com IA", desc: "Correção rigorosa no padrão de bancas federais com feedback detalhado" },
              { icon: Target, title: "Filtro por Edital", desc: "Carreira + banca + matéria + nível. Estudo direcionado ao seu concurso" },
              { icon: BarChart3, title: "Relatório Inteligente", desc: "Análise de desempenho, matérias fracas e recomendações de foco" },
              { icon: Trophy, title: "Gamificação", desc: "Sistema de XP, níveis e moedas bônus por desempenho" },
              { icon: Coins, title: "Sistema de Moedas", desc: "Créditos para acessar simulados. Ganhe mais com bom desempenho" },
              { icon: Users, title: "Indicação", desc: "Convide amigos e ganhe moedas bônus automaticamente" },
              { icon: Shield, title: "Progressão", desc: "Acompanhe evolução, tempo por questão e probabilidade estimada" },
            ].map(f => (
              <Card key={f.title} className="border-0 bg-secondary/50 transition-shadow hover:shadow-md">
                <CardHeader>
                  <f.icon className="mb-2 h-8 w-8 text-primary" />
                  <CardTitle className="font-display text-lg">{f.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{f.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section id="comparativo" className="container py-20">
        <h2 className="mb-4 text-center font-display text-3xl font-bold">Por que ProvaX é diferente?</h2>
        <p className="mb-12 text-center text-muted-foreground">Comparativo honesto com as principais plataformas do mercado</p>
        <div className="mx-auto max-w-4xl overflow-x-auto">
          <table className="w-full text-sm border rounded-lg overflow-hidden">
            <thead>
              <tr className="bg-primary text-primary-foreground">
                <th className="p-3 text-left">Funcionalidade</th>
                <th className="p-3 text-center font-display">ProvaX</th>
                <th className="p-3 text-center">Gran Cursos</th>
                <th className="p-3 text-center">Estratégia</th>
                <th className="p-3 text-center">QConcursos</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {[
                { feat: "Simulado adaptativo com IA", provax: true, gran: false, est: false, qc: false },
                { feat: "Baseado no edital real da banca", provax: true, gran: true, est: true, qc: true },
                { feat: "IA personalizada por perfil", provax: true, gran: false, est: false, qc: false },
                { feat: "Redação com correção IA detalhada", provax: true, gran: false, est: false, qc: false },
                { feat: "Sistema de moedas e gamificação", provax: true, gran: false, est: false, qc: false },
                { feat: "Filtro carreira + banca + matéria", provax: true, gran: true, est: true, qc: true },
                { feat: "Relatório inteligente com foco", provax: true, gran: false, est: false, qc: false },
                { feat: "Evolução gamificada com XP", provax: true, gran: false, est: false, qc: false },
                { feat: "Sistema de indicação com bônus", provax: true, gran: false, est: false, qc: false },
                { feat: "Plano gratuito funcional", provax: true, gran: false, est: false, qc: true },
              ].map(row => (
                <tr key={row.feat} className="hover:bg-secondary/30">
                  <td className="p-3">{row.feat}</td>
                  <td className="p-3 text-center">{row.provax ? <CheckCircle className="inline h-5 w-5 text-accent" /> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-3 text-center">{row.gran ? <CheckCircle className="inline h-5 w-5 text-muted-foreground" /> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-3 text-center">{row.est ? <CheckCircle className="inline h-5 w-5 text-muted-foreground" /> : <span className="text-muted-foreground">—</span>}</td>
                  <td className="p-3 text-center">{row.qc ? <CheckCircle className="inline h-5 w-5 text-muted-foreground" /> : <span className="text-muted-foreground">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="border-t bg-card py-20">
        <div className="container">
          <h2 className="mb-12 text-center font-display text-3xl font-bold">Diferenciais do ProvaX</h2>
          <div className="mx-auto grid max-w-3xl gap-4">
            {[
              "Simulado adaptativo — IA ajusta dificuldade ao seu nível",
              "Baseado em editais reais de FGV, CESPE, VUNESP, FCC e IBFC",
              "IA personalizada que aprende com seu desempenho",
              "Sistema de moedas com economia gamificada",
              "Evolução gamificada com XP e níveis",
              "Redação corrigida no padrão rigoroso de banca federal",
            ].map(text => (
              <div key={text} className="flex items-center gap-3 rounded-lg border p-4">
                <CheckCircle className="h-5 w-5 shrink-0 text-accent" />
                <span className="text-sm">{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-20">
        <h2 className="mb-12 text-center font-display text-3xl font-bold">O que dizem nossos usuários</h2>
        <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
          {[
            { name: "Ana Clara", role: "Aprovada na PRF", text: "Os simulados imitam perfeitamente o estilo do CESPE. Foi fundamental para minha aprovação.", stars: 5 },
            { name: "Ricardo Santos", role: "Estudante para AFRFB", text: "A correção de redação por IA é impressionante. Melhorei minha nota de 500 para 780.", stars: 5 },
            { name: "Mariana Costa", role: "Aprovada no BB", text: "O sistema de moedas me motiva a estudar todo dia. A gamificação faz toda diferença.", stars: 5 },
          ].map(d => (
            <Card key={d.name}>
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
          ))}
        </div>
      </section>

      <section id="planos" className="border-t bg-card py-20">
        <div className="container">
          <h2 className="mb-12 text-center font-display text-3xl font-bold">Planos</h2>
          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            {[
              { name: "Gratuito", price: "R$ 0", features: ["100 moedas iniciais", "Simulados de 5 e 10 questões", "1 redação/mês", "Relatório básico"] },
              { name: "Pro", price: "R$ 29,90/mês", features: ["500 moedas/mês", "Simulados ilimitados", "5 redações/mês", "Relatório avançado", "Suporte prioritário"], popular: true },
              { name: "Premium", price: "R$ 49,90/mês", features: ["1000 moedas/mês", "Tudo do Pro", "Simulados de 60 questões", "Redações ilimitadas", "Probabilidade de aprovação"] },
            ].map(p => (
              <Card key={p.name} className={p.popular ? "border-2 border-primary relative" : ""}>
                {p.popular && <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-medium text-primary-foreground">Mais Popular</div>}
                <CardHeader>
                  <CardTitle className="font-display">{p.name}</CardTitle>
                  <p className="text-2xl font-bold">{p.price}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {p.features.map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-accent shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" asChild>
                    <Link to="/register">Começar Agora</Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="container py-20 text-center">
        <h2 className="font-display text-3xl font-bold mb-4">Pronto para passar no seu concurso?</h2>
        <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
          Junte-se a milhares de concurseiros que já estão usando IA para estudar de forma mais inteligente.
        </p>
        <Button size="lg" asChild className="text-base px-10">
          <Link to="/register">Comece Agora Gratuitamente <ArrowRight className="ml-2 h-5 w-5" /></Link>
        </Button>
      </section>

      <footer className="border-t py-8 text-center text-sm text-muted-foreground">
        <p>© 2026 ProvaX. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}
