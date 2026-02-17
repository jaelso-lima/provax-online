import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { CheckCircle2, Crown, Star } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "Grátis",
    icon: Star,
    features: [
      "Simulados de 5, 10 e 20 questões",
      "Correção de redação",
      "20 moedas iniciais",
      "Ranking global",
      "Sistema de XP e níveis",
    ],
    cta: "Plano atual",
    disabled: true,
  },
  {
    name: "Premium",
    price: "R$ 29,90/mês",
    icon: Crown,
    features: [
      "Tudo do plano Free",
      "Prova Completa de 60 questões",
      "Moedas mensais bônus",
      "Prioridade no suporte",
      "Badges exclusivos",
    ],
    cta: "Em breve",
    disabled: true,
  },
];

export default function Planos() {
  const { profile } = useAuth();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold">Planos</h1>
          <p className="mt-1 text-muted-foreground">Escolha o melhor plano para sua preparação.</p>
        </div>

        <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-2">
          {plans.map((plan) => (
            <Card
              key={plan.name}
              className={`glass-card ${
                plan.name === "Premium" ? "ring-2 ring-primary" : ""
              }`}
            >
              <CardHeader className="text-center">
                <plan.icon className={`mx-auto h-8 w-8 ${plan.name === "Premium" ? "text-primary" : "text-muted-foreground"}`} />
                <CardTitle className="font-display text-xl">{plan.name}</CardTitle>
                <div className="text-2xl font-bold font-display">{plan.price}</div>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full" disabled={plan.disabled} variant={plan.name === "Premium" ? "default" : "outline"}>
                  {profile?.plano === plan.name.toLowerCase() ? "Plano atual" : plan.cta}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
