import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText } from "lucide-react";

export default function Redacao() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Redação</h1>
          <p className="mt-1 text-muted-foreground">Pratique sua escrita e receba feedback da IA.</p>
        </div>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <FileText className="h-5 w-5 text-accent" />
              Nova Redação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Escreva sua redação e envie para correção automática com IA.
            </p>
            <Button disabled>Em breve — Fase 2</Button>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
