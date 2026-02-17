import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trophy } from "lucide-react";

export default function Ranking() {
  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="font-display text-3xl font-bold">Ranking Global</h1>
          <p className="mt-1 text-muted-foreground">Veja quem está no topo!</p>
        </div>
        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <Trophy className="h-5 w-5 text-coin" />
              Top Estudantes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              O ranking será populado conforme os estudantes completam simulados e ganham XP.
            </p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
