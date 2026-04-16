import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Crown, Shield, Lock, Zap, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { trackFBEvent } from "@/lib/fbPixel";

const FREE_FEATURES = [
  { text: "15 questões por dia", enabled: true },
  { text: "Simulados básicos", enabled: true },
  { text: "Filtro por matéria e assunto", enabled: true },
  { text: "Comentário do professor", enabled: true },
  { text: "Estatísticas básicas", enabled: true },
  { text: "Histórico de erros", enabled: true },
  { text: "2 cadernos personalizados", enabled: true },
  { text: "Radar de concursos abertos", enabled: true },
  // Locked features
  { text: "Simulados ilimitados", enabled: false },
  { text: "Sistema adaptativo inteligente", enabled: false },
  { text: "Professor IA 24h", enabled: false },
  { text: "Correção de redação por IA", enabled: false },
  { text: "Análise de edital por IA", enabled: false },
  { text: "Filtro por banca e cargo", enabled: false },
  { text: "Ranking completo", enabled: false },
  { text: "Estatísticas avançadas", enabled: false },
];

const PREMIUM_FEATURES = [
  { text: "Simulados ilimitados", enabled: true },
  { text: "Sistema adaptativo inteligente", enabled: true },
  { text: "Professor IA 24h (Professor PX)", enabled: true },
  { text: "Correção de redação por IA", enabled: true },
  { text: "Análise de edital por IA", enabled: true },
  { text: "Filtro completo (banca, cargo, estado)", enabled: true },
  { text: "Ranking completo", enabled: true },
  { text: "Estatísticas avançadas", enabled: true },
  { text: "Cadernos ilimitados", enabled: true },
  { text: "Radar de concursos abertos", enabled: true },
  { text: "Histórico completo de erros", enabled: true },
  { text: "Simulado reverso inteligente", enabled: true },
  { text: "Comentários e discussões", enabled: true },
];

function formatPreco(valor: number) {
  if (valor === 0) return "R$ 0";
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

export default function Planos() {
  const { user, profile } = useAuth();

  const { data: dbPlans } = useQuery({
    queryKey: ["plans-with-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*")
        .eq("ativo", true)
        .order("preco_mensal");
      if (error) throw error;
      return data;
    },
  });

  const handleAssinar = (stripeLink: string | null, planName?: string) => {
    if (!stripeLink) {
      toast({ title: "Em breve!", description: "Link de pagamento ainda não configurado." });
      return;
    }
    trackFBEvent("InitiateCheckout", { content_name: planName || "Premium", currency: "BRL", value: 29.90 });
    const url = new URL(stripeLink);
    if (user?.email) {
      url.searchParams.set("email", user.email);
    }
    window.open(url.toString(), "_blank");
  };

  // Find the premium plan from DB
  const premiumPlan = dbPlans?.find(p => 
    p.slug === "start" || p.slug === "premium" || p.slug === "pro" || p.slug === "provax-x"
  );
  const freePlan = dbPlans?.find(p => p.slug === "free");

  const isCurrentFree = profile?.plano === "free" || !profile?.plano;
  const isCurrentPremium = premiumPlan && profile?.plano === premiumPlan.slug;

  const premiumPrice = premiumPlan ? Number(premiumPlan.preco_mensal) || 29.90 : 29.90;
  const premiumLink = premiumPlan?.stripe_link_mensal || null;

  return (
    <AppLayout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="mb-2 font-display text-3xl font-bold">
              Escolha seu plano
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Comece grátis e faça upgrade quando quiser. O ProvaX custa menos que um cafezinho por dia.
            </p>
          </motion.div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* FREE PLAN */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0 }}
          >
            <Card className="relative transition-shadow hover:shadow-lg h-full">
              <CardHeader className="text-center pt-8">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle className="font-display text-xl">Free</CardTitle>
                <p className="text-xs text-muted-foreground">Para sempre gratuito</p>
                <div className="mt-3">
                  <span className="text-3xl font-bold text-foreground">R$ 0</span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {FREE_FEATURES.map((f) => (
                    <li key={f.text} className="flex items-center gap-2 text-sm">
                      {f.enabled ? (
                        <CheckCircle className="h-4 w-4 shrink-0 text-accent" />
                      ) : (
                        <Lock className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                      )}
                      <span className={f.enabled ? "" : "text-muted-foreground/60"}>
                        {!f.enabled && "🔒 "}{f.text}
                      </span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full"
                  variant="outline"
                  disabled={isCurrentFree}
                >
                  {isCurrentFree ? "Seu plano atual" : "Plano gratuito"}
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* PREMIUM PLAN */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="relative transition-shadow hover:shadow-xl h-full border-2 border-accent ring-2 ring-accent/20 shadow-xl shadow-accent/10">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-accent text-accent-foreground gap-1 px-3 py-1 text-xs font-bold shadow-md">
                  <Crown className="h-3 w-3" /> Mais popular
                </Badge>
              </div>
              <CardHeader className="text-center pt-8">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10">
                  <Crown className="h-6 w-6 text-accent" />
                </div>
                <CardTitle className="font-display text-xl">Premium</CardTitle>
                <p className="text-xs text-muted-foreground">Acesso completo a todas as ferramentas</p>
                <div className="mt-3">
                  <span className="text-3xl font-bold text-accent">{formatPreco(premiumPrice)}</span>
                  <span className="text-sm text-muted-foreground">/mês</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  ≈ {formatPreco(premiumPrice / 30)}/dia • Cancele quando quiser
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {PREMIUM_FEATURES.map((f) => (
                    <li key={f.text} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 shrink-0 text-accent" />
                      <span>{f.text}</span>
                    </li>
                  ))}
                </ul>
                <Button
                  className="w-full h-12 text-base bg-accent text-accent-foreground hover:bg-accent/90 shadow-md shadow-accent/20 group"
                  disabled={!!isCurrentPremium}
                  onClick={() => !isCurrentPremium && handleAssinar(premiumLink, "Premium")}
                >
                  {isCurrentPremium ? "Seu plano atual" : (
                    <>
                      Assinar Premium
                      <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        <div className="mt-8 text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-2 text-sm text-accent">
            <Shield className="h-4 w-4" /> Garantia de 7 dias — não gostou, devolvemos seu dinheiro.
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
