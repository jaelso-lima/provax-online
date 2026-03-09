import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from "@/hooks/use-toast";
import { Coins, Zap, MessageSquare, FileText, Gift, HelpCircle } from "lucide-react";

const PACOTES = [
  { moedas: 50, preco: "R$ 9,90" },
  { moedas: 120, preco: "R$ 19,90" },
  { moedas: 300, preco: "R$ 39,90" },
  { moedas: 700, preco: "R$ 79,90" },
];

const COMO_USAR = [
  { icon: Zap, titulo: "Gerar questões extras", desc: "Use moedas para gerar simulados além do seu limite diário gratuito." },
  { icon: MessageSquare, titulo: "Chat com Professor IA", desc: "Cada mensagem no chat consome moedas para explicações personalizadas." },
  { icon: FileText, titulo: "Correção de redação", desc: "Envie redações para correção detalhada com nota por competência." },
  { icon: Gift, titulo: "Ganhe moedas grátis", desc: "Indique amigos e ganhe 20 moedas por cada cadastro confirmado." },
];

const FAQ = [
  { q: "As moedas expiram?", a: "Não! Suas moedas ficam no saldo para sempre até serem usadas." },
  { q: "Posso usar moedas em qualquer plano?", a: "Sim. Todos os planos (Free, Start e Pro) podem comprar e usar moedas." },
  { q: "Como ganho moedas sem pagar?", a: "Você ganha moedas ao indicar amigos (20 por indicação) e em promoções especiais." },
  { q: "Quantas moedas custa cada ação?", a: "Gerar questões extras: 1-2 moedas. Chat com Professor: 1 moeda por mensagem. Correção de redação: 5 moedas." },
];

export default function ComprarMoedas() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="container max-w-2xl flex-1 py-8 space-y-10">
        <div>
          <h1 className="mb-2 font-display text-2xl font-bold">Comprar Moedas</h1>
          <p className="text-muted-foreground text-sm">Moedas desbloqueiam funcionalidades premium como questões extras, chat com IA e correção de redação.</p>
        </div>

        {/* Pacotes */}
        <div className="grid gap-4 sm:grid-cols-2">
          {PACOTES.map(p => (
            <Card key={p.moedas}>
              <CardHeader className="text-center">
                <Coins className="mx-auto mb-2 h-8 w-8 text-coin" />
                <CardTitle className="font-display text-2xl">{p.moedas} moedas</CardTitle>
                <CardDescription className="text-lg font-semibold">{p.preco}</CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" onClick={() => toast({ title: "Em breve!", description: "Pagamentos serão integrados." })}>Comprar</Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Como funciona */}
        <section>
          <h2 className="mb-4 font-display text-xl font-semibold flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-primary" /> Como funcionam as moedas?
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {COMO_USAR.map(item => (
              <Card key={item.titulo} className="border-dashed">
                <CardContent className="flex items-start gap-3 pt-5">
                  <item.icon className="h-5 w-5 mt-0.5 shrink-0 text-primary" />
                  <div>
                    <p className="font-medium text-sm">{item.titulo}</p>
                    <p className="text-xs text-muted-foreground mt-1">{item.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section>
          <h2 className="mb-4 font-display text-xl font-semibold">Perguntas frequentes</h2>
          <Accordion type="single" collapsible className="w-full">
            {FAQ.map((item, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-sm">{item.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{item.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>
      </main>
      <AppFooter />
    </div>
  );
}
