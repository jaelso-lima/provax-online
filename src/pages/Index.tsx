import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useOptionalAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import {
  ArrowRight, CheckCircle, Zap, Brain, Target, BarChart3,
  Shield, Lock, Star, Crown, Mail, Instagram, MessageCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { trackFBEvent } from "@/lib/fbPixel";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const getYouTubeEmbedUrl = (url: string) => {
  if (!url) return "";
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0&modestbranding=1` : "";
};

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
        .select("slug, nome, stripe_link_mensal, preco_mensal")
        .eq("ativo", true)
        .order("preco_mensal");
      if (error) throw error;
      return data;
    },
    staleTime: 5 * 60 * 1000,
  });

  const { data: landingVideoUrl } = useQuery({
    queryKey: ["site-setting-landing-video"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("valor")
        .eq("chave", "video_landing_url")
        .maybeSingle();
      return data?.valor || "";
    },
    staleTime: 10 * 60 * 1000,
  });

  const handlePremiumCTA = () => {
    const plan = dbPlans?.find(p => p.slug === "start" || p.slug === "premium");
    const link = plan?.stripe_link_mensal;
    if (!link) {
      navigate("/register");
      return;
    }
    trackFBEvent("InitiateCheckout", { content_name: "Premium", value: 29.90, currency: "BRL" });
    window.open(link, "_blank");
  };

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  useEffect(() => {
    const onScroll = () => setShowSticky(window.scrollY > 400);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur-md">
        <div className="container flex h-14 items-center justify-between">
          <span className="font-display text-xl font-bold">
            <span className="text-primary">P</span>
            <span className="text-accent">X</span>{" "}
            <span className="hidden sm:inline text-foreground">ProvaX</span>
          </span>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {user ? (
              <Button asChild size="sm"><Link to="/dashboard">Dashboard</Link></Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" asChild><Link to="/login">Entrar</Link></Button>
                <Button size="sm" asChild><Link to="/register">Começar grátis</Link></Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* ══════ HERO ══════ */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,hsl(var(--primary)/0.15),transparent)]" />
        <div className="container relative py-16 md:py-28 text-center">
          <motion.div {...fadeUp}>
            <h1 className="mx-auto max-w-3xl font-display text-3xl font-bold leading-[1.15] md:text-5xl lg:text-6xl">
              Treine com simulados e descubra{" "}
              <span className="text-gradient">exatamente onde você erra</span>
            </h1>
            <p className="mx-auto mt-5 max-w-xl text-base text-muted-foreground md:text-lg">
              Um sistema inteligente que analisa seu desempenho e acelera sua aprovação em concursos públicos.
            </p>
            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Button size="lg" className="h-13 text-base px-8 shadow-lg shadow-primary/25 group" asChild>
                <Link to="/register">
                  Começar grátis
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Sem cartão de crédito • 100% gratuito
            </p>

            {/* Video */}
            {landingVideoUrl && getYouTubeEmbedUrl(landingVideoUrl) && (
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="mt-10 mx-auto max-w-2xl"
              >
                <div className="relative w-full rounded-2xl overflow-hidden shadow-2xl shadow-primary/10 ring-1 ring-border" style={{ paddingBottom: "56.25%" }}>
                  <iframe
                    className="absolute inset-0 w-full h-full"
                    src={getYouTubeEmbedUrl(landingVideoUrl)}
                    title="ProvaX"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    loading="lazy"
                  />
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>
      </section>

      {/* ══════ COMO FUNCIONA ══════ */}
      <section className="border-t bg-card/50 py-16 md:py-20">
        <div className="container max-w-3xl">
          <motion.div {...fadeUp} className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold md:text-3xl">Como funciona</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { icon: Target, step: "1", title: "Resolva questões", desc: "Simulados com questões no padrão real das bancas." },
              { icon: BarChart3, step: "2", title: "Veja onde erra", desc: "Diagnóstico automático dos seus pontos fracos." },
              { icon: Zap, step: "3", title: "Melhore mais rápido", desc: "Estude só o que precisa e evolua com dados." },
            ].map((item, i) => (
              <motion.div key={item.step} {...stagger} transition={{ delay: i * 0.12 }}>
                <Card className="border-0 bg-secondary/50 h-full text-center">
                  <div className={`mx-auto -mt-4 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-md`}>
                    {item.step}
                  </div>
                  <CardHeader className="pt-4 pb-2">
                    <item.icon className="mx-auto mb-1 h-8 w-8 text-primary" />
                    <CardTitle className="font-display text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{item.desc}</p></CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ DIFERENCIAL ══════ */}
      <section className="py-16 md:py-20">
        <div className="container max-w-3xl">
          <motion.div {...fadeUp} className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold md:text-3xl">Por que o ProvaX funciona</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              { icon: Brain, title: "Simulados inteligentes", desc: "Questões geradas no padrão CESPE, FGV, FCC e ENEM." },
              { icon: Target, title: "Foco nos seus erros", desc: "O sistema identifica suas fraquezas e prioriza o que importa." },
              { icon: BarChart3, title: "Evolução acompanhada", desc: "Métricas reais de progresso para você saber onde está." },
            ].map((item, i) => (
              <motion.div key={item.title} {...stagger} transition={{ delay: i * 0.1 }}>
                <Card className="border-0 bg-secondary/50 h-full">
                  <CardHeader className="pb-2">
                    <item.icon className="mb-1 h-7 w-7 text-primary" />
                    <CardTitle className="font-display text-base">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent><p className="text-sm text-muted-foreground">{item.desc}</p></CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ CARROSSEL DE AUTORIDADE ══════ */}
      <section className="border-t bg-card/50 py-10 overflow-hidden">
        <div className="container text-center mb-5">
          <p className="text-sm text-muted-foreground font-medium">Usado por estudantes que querem resultado</p>
        </div>
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-16 bg-gradient-to-r from-card/50 to-transparent z-10" />
          <div className="absolute right-0 top-0 bottom-0 w-16 bg-gradient-to-l from-card/50 to-transparent z-10" />
          <div className="flex animate-[scroll_20s_linear_infinite] gap-12 items-center w-max">
            {[...Array(2)].map((_, loop) => (
              <div key={loop} className="flex gap-12 items-center">
                {["Google", "Microsoft", "Meta", "Amazon", "Apple", "IBM", "Oracle", "Cisco"].map((brand) => (
                  <div
                    key={`${loop}-${brand}`}
                    className="px-5 py-2 opacity-30 hover:opacity-100 transition-opacity duration-300 grayscale hover:grayscale-0"
                  >
                    <span className="text-lg md:text-xl font-bold text-foreground tracking-tight whitespace-nowrap">{brand}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════ PLANOS ══════ */}
      <section id="planos" className="py-16 md:py-20">
        <div className="container max-w-3xl">
          <motion.div {...fadeUp} className="text-center mb-10">
            <h2 className="font-display text-2xl font-bold md:text-3xl">Escolha seu plano</h2>
            <p className="mt-2 text-muted-foreground text-sm">Comece grátis e faça upgrade quando quiser</p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* FREE */}
            <motion.div {...stagger}>
              <Card className="h-full border bg-card">
                <CardHeader className="text-center pb-4">
                  <CardTitle className="font-display text-lg">Free</CardTitle>
                  <p className="text-3xl font-bold mt-2">R$ 0</p>
                  <p className="text-xs text-muted-foreground">Para sempre</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {[
                      "10 questões por dia",
                      "Simulados básicos",
                      "Histórico de desempenho",
                      "Radar de concursos",
                    ].map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-muted-foreground shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Button className="w-full" variant="outline" asChild>
                    <Link to="/register">Começar grátis</Link>
                  </Button>
                </CardContent>
              </Card>
            </motion.div>

            {/* PREMIUM */}
            <motion.div {...stagger} transition={{ delay: 0.1 }}>
              <Card className="h-full border-2 border-accent relative ring-2 ring-accent/20 shadow-xl shadow-accent/10">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-accent text-accent-foreground gap-1 px-3 py-1 text-xs font-bold shadow-md">
                    <Crown className="h-3 w-3" /> Mais popular
                  </Badge>
                </div>
                <CardHeader className="text-center pt-8 pb-4">
                  <CardTitle className="font-display text-lg">Premium</CardTitle>
                  <p className="text-3xl font-bold mt-2 text-accent">R$ 29,90<span className="text-sm font-normal text-muted-foreground"> /mês</span></p>
                  <p className="text-xs text-muted-foreground">Cancele quando quiser</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2">
                    {[
                      "Simulados ilimitados",
                      "Sistema adaptativo",
                      "Análise completa de desempenho",
                      "Professor IA 24h",
                      "Redação corrigida por IA",
                      "Análise de edital por IA",
                      "Filtro por banca e estado",
                      "Ranking e estatísticas",
                    ].map(f => (
                      <li key={f} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-accent shrink-0" />{f}
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full h-12 text-base bg-accent text-accent-foreground hover:bg-accent/90 shadow-md shadow-accent/20"
                    onClick={handlePremiumCTA}
                  >
                    Assinar Premium <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <div className="flex items-center justify-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><Shield className="h-3 w-3" /> Garantia 7 dias</span>
                    <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Pagamento seguro</span>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════ CTA FINAL ══════ */}
      <section className="border-t bg-card py-16 md:py-20">
        <div className="container text-center max-w-xl">
          <motion.div {...fadeUp}>
            <h2 className="font-display text-2xl font-bold md:text-3xl mb-3">
              Sua aprovação{" "}
              <span className="text-gradient">começa agora.</span>
            </h2>
            <p className="text-muted-foreground mb-6">
              Cada dia sem prática é um dia a mais longe do seu objetivo.
            </p>
            <Button size="lg" className="h-13 text-base px-8 shadow-lg shadow-primary/25 group" asChild>
              <Link to="/register">
                Começar grátis
                <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
              </Link>
            </Button>
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
              Começar grátis
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>
        </motion.div>
      )}

      {/* CONTATO */}
      <section className="border-t py-12">
        <div className="container max-w-xl text-center">
          <motion.div {...fadeUp}>
            <h3 className="font-display text-lg font-bold mb-4">Dúvidas? Fale conosco</h3>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href="mailto:provax.online@gmail.com"><Mail className="h-4 w-4" /> Email</a>
              </Button>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href="https://www.instagram.com/provax_online/" target="_blank" rel="noopener noreferrer"><Instagram className="h-4 w-4" /> Instagram</a>
              </Button>
              <Button variant="outline" size="sm" className="gap-2" asChild>
                <a href="https://chat.whatsapp.com/CaQMyka3CMU4QBUcl6WQxr" target="_blank" rel="noopener noreferrer"><MessageCircle className="h-4 w-4" /> WhatsApp</a>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      <footer className="border-t py-6 text-center text-xs text-muted-foreground space-y-1">
        <p>© 2026 ProvaX. Todos os direitos reservados.</p>
        <p><Link to="/termos" className="text-primary hover:underline">Termos de Uso e Política de Privacidade</Link></p>
      </footer>
    </div>
  );
}
