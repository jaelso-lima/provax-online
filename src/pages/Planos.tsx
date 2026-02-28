import { useState } from "react";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Star, Zap, Crown, Percent } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

type Periodo = "mensal" | "semestral" | "anual";

const PLANOS = [
  {
    slug: "free",
    name: "Gratuito",
    icon: Zap,
    prices: { mensal: 0, semestral: 0, anual: 0 },
    features: [
      { text: "10 questões por dia", enabled: true },
      { text: "Simulados básicos", enabled: true },
      { text: "Acesso limitado", enabled: true },
      { text: "Estatísticas básicas", enabled: false },
      { text: "Histórico de erros", enabled: false },
      { text: "Ranking", enabled: false },
      { text: "Filtro por banca/estado", enabled: false },
    ],
    current: true,
  },
  {
    slug: "start",
    name: "Start",
    icon: Star,
    prices: { mensal: 29.9, semestral: 149, anual: 297 },
    features: [
      { text: "25 questões por dia", enabled: true },
      { text: "Todas as disciplinas", enabled: true },
      { text: "Simulado personalizado", enabled: true },
      { text: "Estatísticas básicas", enabled: true },
      { text: "Histórico de erros", enabled: true },
      { text: "Ranking", enabled: false },
      { text: "Filtro por banca/estado", enabled: false },
    ],
    popular: true,
  },
  {
    slug: "pro",
    name: "Pro",
    icon: Crown,
    prices: { mensal: 49.9, semestral: 249, anual: 497 },
    features: [
      { text: "60 questões por dia", enabled: true },
      { text: "Filtro por banca", enabled: true },
      { text: "Filtro por estado", enabled: true },
      { text: "Concursos anteriores reais", enabled: true },
      { text: "Ranking completo", enabled: true },
      { text: "Estatísticas avançadas", enabled: true },
      { text: "Simulado reverso inteligente", enabled: true },
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
  const [periodo, setPeriodo] = useState<Periodo>("mensal");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="container max-w-5xl flex-1 py-8">
        <div className="mb-8 text-center">
          <h1 className="mb-2 font-display text-3xl font-bold">
            Escolha seu plano de aprovação
          </h1>
          <p className="text-muted-foreground">
            Estude com organização, performance e simulados inteligentes.
          </p>
        </div>

        <div className="mb-8 flex justify-center">
          <Tabs value={periodo} onValueChange={(v) => setPeriodo(v as Periodo)}>
            <TabsList>
              <TabsTrigger value="mensal">Mensal</TabsTrigger>
              <TabsTrigger value="semestral" className="gap-1">
                Semestral
              </TabsTrigger>
              <TabsTrigger value="anual" className="relative gap-1">
                Anual
                <Badge variant="secondary" className="ml-1 bg-accent text-accent-foreground text-[10px] px-1.5 py-0">
                  Melhor valor
                </Badge>
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {PLANOS.map((p) => {
            const preco = p.prices[periodo];
            const desconto = periodo !== "mensal"
              ? calcDesconto(p.prices.mensal, preco, periodo === "semestral" ? 6 : 12)
              : 0;
            const Icon = p.icon;
            const isDestaque = periodo === "anual" && p.slug === "pro";

            return (
              <Card
                key={p.slug}
                className={`relative transition-shadow hover:shadow-lg ${
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
                      <Percent className="h-3 w-3" /> Melhor custo-benefício
                    </Badge>
                  </div>
                )}
                {p.popular && !isDestaque && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground">
                      Popular
                    </Badge>
                  </div>
                )}
                <CardHeader className="text-center pt-8">
                  <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="font-display text-xl">{p.name}</CardTitle>
                  <div className="mt-2">
                    <span className="text-3xl font-bold">{formatPreco(preco)}</span>
                    {preco > 0 && (
                      <span className="text-sm text-muted-foreground">
                        /{periodo === "mensal" ? "mês" : periodo === "semestral" ? "semestre" : "ano"}
                      </span>
                    )}
                  </div>
                  {desconto > 0 && (
                    <p className="mt-1 text-sm font-medium text-accent">
                      Economia de {desconto}% vs mensal
                    </p>
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
                    className="w-full"
                    variant={p.current ? "outline" : isDestaque ? "default" : "default"}
                    disabled={p.current}
                    onClick={() =>
                      !p.current &&
                      toast({
                        title: "Em breve!",
                        description: "Integração de pagamento será ativada em breve.",
                      })
                    }
                  >
                    {p.current ? "Plano Atual" : "Assinar agora"}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="mt-10 text-center text-sm text-muted-foreground space-y-1">
          <p>Garantia de 7 dias. Cancele quando quiser.</p>
          <p>Planos semestral e anual com validade fixa a partir da data de contratação.</p>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
