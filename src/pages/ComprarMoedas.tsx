import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Coins } from "lucide-react";

const PACOTES = [
  { moedas: 50, preco: "R$ 9,90" },
  { moedas: 120, preco: "R$ 19,90" },
  { moedas: 300, preco: "R$ 39,90" },
  { moedas: 700, preco: "R$ 79,90" },
];

export default function ComprarMoedas() {
  return (<div className="flex min-h-screen flex-col bg-background"><AppHeader /><main className="container max-w-2xl flex-1 py-8">
    <h1 className="mb-6 font-display text-2xl font-bold">Comprar Moedas</h1>
    <div className="grid gap-4 sm:grid-cols-2">{PACOTES.map(p => (
      <Card key={p.moedas}><CardHeader className="text-center"><Coins className="mx-auto mb-2 h-8 w-8 text-coin" /><CardTitle className="font-display text-2xl">{p.moedas} moedas</CardTitle><CardDescription className="text-lg font-semibold">{p.preco}</CardDescription></CardHeader>
      <CardContent><Button className="w-full" onClick={() => toast({ title: "Em breve!", description: "Pagamentos serão integrados." })}>Comprar</Button></CardContent></Card>
    ))}</div>
  </main><AppFooter /></div>);
}
