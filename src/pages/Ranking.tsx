import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Trophy, Medal, Award, Loader2 } from "lucide-react";

export default function Ranking() {
  const [ranking, setRanking] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.from("profiles").select("id, nome, xp, nivel").order("xp", { ascending: false }).limit(50)
      .then(({ data }) => { if (data) setRanking(data); setLoading(false); });
  }, []);

  const getIcon = (pos: number) => {
    if (pos === 0) return <Trophy className="h-5 w-5 text-coin" />;
    if (pos === 1) return <Medal className="h-5 w-5 text-muted-foreground" />;
    if (pos === 2) return <Award className="h-5 w-5 text-warning" />;
    return <span className="text-sm font-bold text-muted-foreground">{pos+1}º</span>;
  };

  return (<div className="min-h-screen bg-background"><AppHeader /><main className="container max-w-2xl py-8">
    <h1 className="mb-6 font-display text-2xl font-bold flex items-center gap-2"><Trophy className="h-6 w-6 text-coin" />Ranking Global</h1>
    {loading ? <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div> :
    ranking.length === 0 ? <p className="text-sm text-muted-foreground">Nenhum estudante ainda.</p> :
    <div className="space-y-2">{ranking.map((r, i) => (
      <Card key={r.id} className={i < 3 ? "border-l-4 border-l-coin" : ""}><CardContent className="flex items-center justify-between py-3">
        <div className="flex items-center gap-3"><div className="w-8 text-center">{getIcon(i)}</div><div><p className="text-sm font-medium">{r.nome || "Estudante"}</p><p className="text-xs text-muted-foreground">Nível {r.nivel}</p></div></div>
        <span className="text-sm font-bold text-primary">{r.xp} XP</span>
      </CardContent></Card>
    ))}</div>}
  </main></div>);
}
