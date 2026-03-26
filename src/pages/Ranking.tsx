import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Award, Loader2, ArrowLeft, Lock, Sparkles } from "lucide-react";

export default function Ranking() {
  const navigate = useNavigate();
  const { config } = usePlanConfig();
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!config.acesso_ranking) { setLoading(false); return; }
    supabase.rpc("get_ranking")
      .then(({ data }) => { if (data) setRanking(data); setLoading(false); });
  }, [config.acesso_ranking]);

  const getIcon = (pos: number) => {
    if (pos === 0) return <Trophy className="h-5 w-5 text-coin" />;
    if (pos === 1) return <Medal className="h-5 w-5 text-muted-foreground" />;
    if (pos === 2) return <Award className="h-5 w-5 text-warning" />;
    return <span className="text-sm font-bold text-muted-foreground">{pos + 1}º</span>;
  };

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="container max-w-2xl flex-1 py-6 px-4">
        <Button variant="ghost" size="sm" className="mb-4 gap-1.5 text-muted-foreground" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <h1 className="mb-6 font-display text-2xl font-bold flex items-center gap-2">
          <Trophy className="h-6 w-6 text-coin" /> Ranking
        </h1>

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : ranking.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhum estudante ainda.</p>
        ) : (
          <div className="space-y-2">
            {ranking.map((r, i) => (
              <Card key={i} className={i < 3 ? "border-l-4 border-l-coin" : ""}>
                <CardContent className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-3">
                    <div className="w-8 text-center">{getIcon(i)}</div>
                    <div>
                      <p className="text-sm font-medium">{r.nome || "Estudante"}</p>
                      <p className="text-xs text-muted-foreground">Nível {r.nivel}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-primary">{r.xp} XP</span>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
