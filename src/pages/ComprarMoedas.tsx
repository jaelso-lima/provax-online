import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Coins, Sparkles } from "lucide-react";

const pacotes = [
  { moedas: 50, preco: "R$ 9,90", destaque: false },
  { moedas: 120, preco: "R$ 19,90", destaque: true },
  { moedas: 300, preco: "R$ 39,90", destaque: false },
];

export default function ComprarMoedas() {
  const { profile } = useAuth();

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Comprar Moedas</h1>
          <p className="mt-1 text-muted-foreground">
            Saldo atual: <span className="font-semibold text-coin">{profile?.saldo_moedas ?? 0} moedas</span>
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {pacotes.map((p) => (
            <Card key={p.moedas} className={`glass-card relative ${p.destaque ? "ring-2 ring-primary" : ""}`}>
              {p.destaque && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-medium text-primary-foreground">
                  <Sparkles className="mr-1 inline h-3 w-3" /> Mais popular
                </div>
              )}
              <CardHeader className="text-center">
                <CardTitle className="font-display">
                  <Coins className="mx-auto mb-2 h-8 w-8 text-coin" />
                  {p.moedas} moedas
                </CardTitle>
              </CardHeader>
              <CardContent className="text-center space-y-4">
                <div className="text-2xl font-bold font-display">{p.preco}</div>
                <Button className="w-full" disabled>
                  Em breve — Stripe
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
