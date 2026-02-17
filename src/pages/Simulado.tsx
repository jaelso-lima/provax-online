import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";

export default function Simulado() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Simulados</h1>
          <p className="mt-1 text-muted-foreground">Gere simulados personalizados com IA.</p>
        </div>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Target className="h-5 w-5 text-primary" />
              Novo Simulado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Selecione a carreira, matéria e banca para gerar seu simulado personalizado.
            </p>
            <Button disabled>Em breve — Fase 2</Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
