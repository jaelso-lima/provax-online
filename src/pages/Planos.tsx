import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Star, Zap, Crown, Percent, Shield, AlertTriangle, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Periodo = "mensal" | "semestral" | "anual";

const FEATURE_LABELS: Record<string, string> = {
  simulado_basico: "Simulado básico",
  simulado_reverso: "Simulado reverso",
  estatisticas_basicas: "Estatísticas básicas",
  estatisticas_avancadas: "Estatísticas avançadas",
  historico_erros: "Histórico de erros",
  filtro_banca: "Filtro por banca",
  filtro_estado: "Filtro por estado",
  filtro_concurso_real: "Filtro por concurso real",
  ranking: "Ranking completo",
};

const SLUG_ICONS: Record<string, any> = {
  free: Zap,
  start: Star,
  pro: Crown,
};

function calcDesconto(mensal: number, total: number, meses: number) {
  if (mensal === 0) return 0;
  const semDesconto = mensal * meses;
  return Math.round(((semDesconto - total) / semDesconto) * 100);
}

function formatPreco(valor: number) {
  if (valor === 0) return "R$ 0";
  return `R$ ${valor.toFixed(2).replace(".", ",")}`;
}

export default function Planos() {
  const [periodo, setPeriodo] = useState<Periodo>("anual");
  const { user, profile } = useAuth();

  const { data: dbPlans } = useQuery({
    queryKey: ["plans-with-links"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plans")
        .select("*, plan_features(*)")
        .eq("ativo", true)
        .order("preco_mensal");
      if (error) throw error;
      return data;
    },
  });

  const handleAssinar = (stripeLink: string | null) => {
    if (!stripeLink) {
      toast({ title: "Em breve!", description: "Link de pagamento ainda não configurado." });
      return;
    }
    const url = new URL(stripeLink);
    if (user?.email) {
      url.searchParams.set("prefilled_email", user.email);
    }
    window.open(url.toString(), "_blank");
  };

  const planos = (dbPlans || []).map((p) => {
    const features = (p.plan_features || []).map((f: any) => ({
      text: FEATURE_LABELS[f.feature] || f.feature,
      enabled: f.enabled,
    }));

    return {
      ...p,
      icon: SLUG_ICONS[p.slug] || Star,
      features,
      prices: {
        mensal: Number(p.preco_mensal) || 0,
        semestral: Number(p.preco_semestral) || 0,
        anual: Number(p.preco_anual) || 0,
      },
      stripeLinks: {
        mensal: p.stripe_link_mensal || null,
        semestral: p.stripe_link_semestral || null,
        anual: p.stripe_link_anual || null,
      },
      isCurrent: profile?.plano === p.slug,
    };
  });

  const gridCols = planos.length <= 2 ? "md:grid-cols-2" : planos.length === 3 ? "md:grid-cols-3" : "md:grid-cols-4";

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="mx-auto mb-4 inline-flex items-center gap-2 rounded-full border border-destructive/30 bg-destructive/5 px-4 py-1.5 text-sm font-medium text-destructive">
              <AlertTriangle className="h-4 w-4" />
              Cada mês sem método certo = mais uma prova perdida
            </div>
            <h1 className="mb-2 font-display text-3xl font-bold">
              Invista na sua aprovação, não na sua reprovação
            </h1>
            <p className="text-muted-foreground max-w-lg mx-auto">
              O custo de uma reprovação é muito maior: inscrição perdida, meses de estudo sem rumo, materiais parados.
              O ProvaX custa menos que um cafezinho por dia.
            </p>
          </motion.div>
        </div>

        <div className="mb-8 flex justify-center">
          <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <TabsList>
              <TabsTrigger value="mensal">Mensal</TabsTrigger>
              <TabsTrigger value="semestral">Semestral</TabsTrigger>
              <TabsTrigger value="anual" className="relative gap-1">
                Anual
                <Badge variant="secondary" className="ml-1 bg-accent text-accent-foreground text-[10px] px-1.5 py-0">
                  🔥 Melhor valor
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className={`grid gap-6 ${gridCols}`}>
          {planos.map((p, i) => {
            const preco = p.prices[periodo];
            const desconto = periodo !== "mensal"
              ? calcDesconto(p.prices.mensal, preco, periodo === "semestral" ? 6 : 12)
              : 0;
            const Icon = p.icon;
            const isDestaque = p.slug === "pro";
            const stripeLink = p.stripeLinks[periodo];

            return (
              <motion.div
                key={p.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
              >
                <Card
                  className={`relative transition-shadow hover:shadow-lg h-full ${
                    isDestaque
                      ? "border-2 border-accent ring-2 ring-accent/20"
                      : ""
                  }`}
                >
                  {isDestaque && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-accent text-accent-foreground gap-1">
                        <Crown className="h-3 w-3" /> Aprovação máxima
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pt-8">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="font-display text-xl">{p.nome}</CardTitle>
                    {p.descricao && (
                      <p className="text-xs text-muted-foreground">{p.descricao}</p>
                    )}
                    <div className="mt-3">
                      <span className="text-3xl font-bold">{formatPreco(preco)}</span>
                      {preco > 0 && (
                        <span className="text-sm text-muted-foreground">
                          /{periodo === "mensal" ? "mês" : periodo === "semestral" ? "semestre" : "ano"}
                        </span>
                      )}
                    </div>
                    {desconto > 0 && (
                      <div className="mt-1 inline-flex items-center gap-1 text-sm font-medium text-accent">
                        <Percent className="h-3 w-3" /> Economia de {desconto}% vs mensal
                      </div>
                    )}
                    {periodo !== "mensal" && preco > 0 && (
                      <p className="text-xs text-muted-foreground">
                        ≈ {formatPreco(preco / (periodo === "semestral" ? 6 : 12))}/mês
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {p.features.length > 0 && (
                      <ul className="space-y-2">
                        {p.features.map((f: any) => (
                          <li key={f.text} className="flex items-center gap-2 text-sm">
                            {f.enabled ? (
                              <CheckCircle className="h-4 w-4 shrink-0 text-accent" />
                            ) : (
                              <XCircle className="h-4 w-4 shrink-0 text-muted-foreground/40" />
                            )}
                            <span className={f.enabled ? "" : "text-muted-foreground/60"}>
                              {f.text}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    <Button
                      className={`w-full ${isDestaque ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
                      variant={p.isCurrent ? "outline" : "default"}
                      disabled={p.isCurrent}
                      onClick={() => !p.isCurrent && handleAssinar(stripeLink)}
                    >
                      {p.isCurrent ? "Seu plano atual" : "Assinar agora"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        <div className="mt-10 text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-2 text-sm text-accent">
            <Shield className="h-4 w-4" /> Garantia de 7 dias — não gostou, devolvemos seu dinheiro.
          </div>
          <p className="text-xs text-muted-foreground">
            Planos semestral e anual com validade fixa a partir da data de contratação.
          </p>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5 }}
          className="mt-8 rounded-xl border-2 border-primary/20 bg-primary/5 p-6 text-center"
        >
          <div className="flex items-center justify-center gap-2 text-primary mb-2">
            <Clock className="h-5 w-5" />
            <span className="font-display text-lg font-bold">Não deixe para amanhã</span>
          </div>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            A cada dia sem prática direcionada, você perde tempo precioso que seus concorrentes estão usando.
            Comece agora e saia na frente.
          </p>
        </motion.div>
      </div>
    </AppLayout>
  );
}
