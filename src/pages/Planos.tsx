import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { CheckCircle } from "lucide-react";

const PLANOS = [
  { name: "Gratuito", price: "R$ 0", features: ["20 moedas iniciais", "Simulados básicos", "1 redação/mês"], current: true },
  { name: "Pro", price: "R$ 29,90/mês", features: ["500 moedas/mês", "Simulados ilimitados", "5 redações/mês", "Estatísticas avançadas"], popular: true },
  { name: "Premium", price: "R$ 49,90/mês", features: ["1000 moedas/mês", "Tudo do Pro", "Redações ilimitadas", "Prova completa 60 questões", "Suporte prioritário"] },
];

export default function Planos() {
  return (<div className="min-h-screen bg-background"><AppHeader /><main className="container max-w-4xl py-8">
    <h1 className="mb-8 text-center font-display text-3xl font-bold">Planos</h1>
    <div className="grid gap-6 md:grid-cols-3">{PLANOS.map(p => (
      <Card key={p.name} className={p.popular ? "border-2 border-primary" : ""}>
        <CardHeader>{p.popular && <span className="mb-2 inline-block w-fit rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground">Popular</span>}<CardTitle className="font-display">{p.name}</CardTitle><p className="text-2xl font-bold">{p.price}</p></CardHeader>
        <CardContent className="space-y-4"><ul className="space-y-2">{p.features.map(f => <li key={f} className="flex items-center gap-2 text-sm"><CheckCircle className="h-4 w-4 text-accent" />{f}</li>)}</ul>
        <Button className="w-full" variant={p.current ? "outline" : "default"} disabled={p.current} onClick={() => !p.current && toast({ title: "Em breve!" })}>{p.current ? "Plano Atual" : "Assinar"}</Button></CardContent>
      </Card>
    ))}</div>
  </main></div>);
}
