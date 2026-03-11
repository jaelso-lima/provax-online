import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Star, Zap, Crown, Percent, Shield, ArrowRight, AlertTriangle, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { motion } from "framer-motion";

type Periodo = "mensal" | "semestral" | "anual";

const PLANOS = [
  {
    slug: "free",
    name: "Gratuito",
    icon: Zap,
    prices: { mensal: 0, semestral: 0, anual: 0 },
    headline: "Para quem está começando",
    features: [
      { text: "10 questões/dia (Concurso + ENEM)", enabled: true },
      { text: "Redação sem avaliação detalhada", enabled: true },
      { text: "Professor PX (chat IA)", enabled: true },
      { text: "XP e níveis", enabled: true },
      { text: "2 históricos completos", enabled: true },
      { text: "Compra de moedas avulsa", enabled: true },
      { text: "Prova Completa ilimitada", enabled: false },
      { text: "Correção detalhada de redação", enabled: false },
      { text: "Histórico ilimitado", enabled: false },
    ],
    current: true,
  },
  {
    slug: "start",
    name: "Start",
    icon: Star,
    prices: { mensal: 29.9, semestral: 149, anual: 297 },
    headline: "Para quem quer levar a sério",
    features: [
      { text: "25 questões por dia", enabled: true },
      { text: "Todas as disciplinas liberadas", enabled: true },
      { text: "Simulado personalizado", enabled: true },
      { text: "Histórico completo de simulados", enabled: true },
      { text: "Correção de redação detalhada", enabled: true },
      { text: "Concurso + ENEM + Redação", enabled: true },
      { text: "Prova Completa ilimitada", enabled: false },
      { text: "Estatísticas avançadas", enabled: false },
    ],
    popular: true,
  },
  {
    slug: "pro",
    name: "Pro",
    icon: Crown,
    prices: { mensal: 49.9, semestral: 249, anual: 497 },
    headline: "Para quem quer aprovação máxima",
    features: [
      { text: "Questões ilimitadas por dia", enabled: true },
      { text: "Prova Completa ilimitada", enabled: true },
      { text: "Histórico e estatísticas ilimitados", enabled: true },
      { text: "Correção completa de redação (5 competências)", enabled: true },
      { text: "Professor IA avançado e personalizado", enabled: true },
      { text: "Filtro por banca, estado e ano", enabled: true },
      { text: "Ranking completo", enabled: true },
      { text: "Tudo do Start incluso", enabled: true },
    ],
  },
];

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

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto">
        {/* Headline persuasiva — Viés de aversão à perda */}
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

        {/* Tabs com destaque no anual — Viés de ancoragem */}
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

        {/* Cards de planos */}
        <div className="grid gap-6 md:grid-cols-3">
          {PLANOS.map((p) => {
            const preco = p.prices[periodo];
            const desconto = periodo !== "mensal"
              ? calcDesconto(p.prices.mensal, preco, periodo === "semestral" ? 6 : 12)
              : 0;
            const Icon = p.icon;
            const isDestaque = periodo === "anual" && p.slug === "pro";

            return (
              <motion.div
                key={p.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: p.slug === "free" ? 0 : p.slug === "start" ? 0.1 : 0.2 }}
              >
                <Card
                  className={`relative transition-shadow hover:shadow-lg h-full ${
                    isDestaque
                      ? "border-2 border-accent ring-2 ring-accent/20"
                      : p.popular
                      ? "border-2 border-primary"
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
                  {p.popular && !isDestaque && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        Mais Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pt-8">
                    <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="font-display text-xl">{p.name}</CardTitle>
                    <p className="text-xs text-muted-foreground">{p.headline}</p>
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
                    <ul className="space-y-2">
                      {p.features.map((f) => (
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
                    <Button
                      className={`w-full ${isDestaque ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
                      variant={p.current ? "outline" : "default"}
                      disabled={p.current}
                      onClick={() =>
                        !p.current &&
                        toast({
                          title: "Em breve!",
                          description: "Integração de pagamento será ativada em breve.",
                        })
                      }
                    >
                      {p.current ? "Seu plano atual" : isDestaque ? "Garantir aprovação máxima" : "Assinar agora"}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Viés de segurança */}
        <div className="mt-10 text-center space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/5 px-4 py-2 text-sm text-accent">
            <Shield className="h-4 w-4" /> Garantia de 7 dias — não gostou, devolvemos seu dinheiro.
          </div>
          <p className="text-xs text-muted-foreground">
            Planos semestral e anual com validade fixa a partir da data de contratação.
          </p>
          <p className="text-xs text-muted-foreground">
            Funciona para Concurso Público, ENEM e Redação — tudo numa plataforma só.
          </p>
        </div>

        {/* Viés de urgência + escassez */}
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
          <Button className="mt-4" size="lg" onClick={() => toast({ title: "Em breve!", description: "Integração de pagamento será ativada em breve." })}>
            Quero começar agora <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </motion.div>
      </div>
    </AppLayout>
  );
}
