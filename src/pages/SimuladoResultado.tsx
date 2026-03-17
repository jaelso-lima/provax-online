import { useState, useEffect, lazy, Suspense } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, CheckCircle, XCircle, Clock, Target } from "lucide-react";

const ShareResultCard = lazy(() => import("@/components/ShareResultCard"));

export default function SimuladoResultado() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [simulado, setSimulado] = useState<any>(null);
  const [respostas, setRespostas] = useState<any[]>([]);
  const [questoes, setQuestoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [metaNames, setMetaNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user || !id) return;
    const load = async () => {
      const { data: sim } = await supabase
        .from("simulados").select("*").eq("id", id).eq("user_id", user.id).single();

      if (!sim) { navigate("/dashboard"); return; }
      setSimulado(sim);

      const { data: resps } = await supabase
        .from("respostas")
        .select("*, questoes(id, enunciado, alternativas, resposta_correta, explicacao)")
        .eq("simulado_id", id).order("created_at");

      if (resps) {
        setRespostas(resps);
        setQuestoes(resps.map((r: any) => r.questoes).filter(Boolean));
      }

      const names: Record<string, string> = {};
      if (sim.curso_id) {
        const { data } = await supabase.from("cursos").select("nome").eq("id", sim.curso_id).single();
        if (data) names.curso = data.nome;
      }
      if (sim.materia_id) {
        const { data } = await supabase.from("materias").select("nome").eq("id", sim.materia_id).single();
        if (data) names.materia = data.nome;
      }
      if (sim.area_id) {
        const { data } = await supabase.from("areas").select("nome").eq("id", sim.area_id).single();
        if (data) names.area = data.nome;
      }
      setMetaNames(names);
      setLoading(false);
    };
    load();
  }, [user, id]);

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="container flex flex-1 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
        <AppFooter />
      </div>
    );
  }

  if (!simulado) return null;

  const isFinished = simulado.status === "finalizado";
  const tempoMin = simulado.tempo_gasto ? Math.floor(simulado.tempo_gasto / 60) : 0;
  const tempoSeg = simulado.tempo_gasto ? simulado.tempo_gasto % 60 : 0;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="container max-w-2xl flex-1 py-6 px-4">
        <Button variant="ghost" size="sm" className="mb-4 gap-1.5 text-muted-foreground" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        {/* Score summary */}
        {isFinished && (
          <div className="mb-6">
            <div className="mb-4 text-center">
              <p className="text-sm text-muted-foreground">Resultado do Simulado</p>
              <p className="font-display text-5xl font-bold text-primary mt-1">{simulado.pontuacao}%</p>
              {metaNames.materia && <p className="text-sm text-muted-foreground mt-1">{metaNames.materia}</p>}
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              <Card>
                <CardContent className="py-3 text-center">
                  <CheckCircle className="mx-auto mb-1 h-4 w-4 text-accent" />
                  <p className="text-lg font-bold text-accent">{simulado.acertos}/{simulado.total_questoes}</p>
                  <p className="text-[11px] text-muted-foreground">Acertos</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3 text-center">
                  <XCircle className="mx-auto mb-1 h-4 w-4 text-destructive" />
                  <p className="text-lg font-bold text-destructive">{(simulado.total_questoes || 0) - (simulado.acertos || 0)}</p>
                  <p className="text-[11px] text-muted-foreground">Erros</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-3 text-center">
                  <Clock className="mx-auto mb-1 h-4 w-4 text-muted-foreground" />
                  <p className="text-lg font-bold">{tempoMin}:{String(tempoSeg).padStart(2, "0")}</p>
                  <p className="text-[11px] text-muted-foreground">Tempo</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {!isFinished && (
          <Card className="mb-6">
            <CardContent className="py-4 text-center">
              <Badge variant="secondary">Em andamento</Badge>
              <p className="mt-2 text-sm text-muted-foreground">
                {new Date(simulado.created_at).toLocaleDateString("pt-BR")}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Share — compact */}
        {isFinished && (
          <Suspense fallback={null}>
            <ShareResultCard
              pontuacao={simulado.pontuacao || 0}
              acertos={simulado.acertos || 0}
              total={simulado.total_questoes || 0}
              materia={metaNames.materia}
              area={metaNames.area}
              userName={user?.user_metadata?.nome || ""}
            />
          </Suspense>
        )}

        {/* Detailed correction */}
        {respostas.length > 0 && questoes.length > 0 && (
          <div className="mt-6">
            <h3 className="mb-3 font-display text-base font-semibold">Correção Detalhada</h3>
            <div className="space-y-2">
              {respostas.map((r: any, i: number) => {
                const q = r.questoes;
                if (!q) return null;
                const acertou = r.acertou === true;
                const naoRespondeu = !r.resposta_usuario;
                const alternativas = Array.isArray(q.alternativas) ? q.alternativas : [];

                return (
                  <Card key={r.id} className={`border-l-4 ${naoRespondeu ? "border-l-muted" : acertou ? "border-l-accent" : "border-l-destructive"}`}>
                    <CardContent className="py-3 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm leading-relaxed">
                          <span className="text-muted-foreground mr-1.5">{i + 1}.</span>
                          {q.enunciado}
                        </p>
                        <Badge
                          variant={naoRespondeu ? "secondary" : acertou ? "default" : "destructive"}
                          className="shrink-0 text-[10px]"
                        >
                          {naoRespondeu ? "—" : acertou ? "✓" : "✗"}
                        </Badge>
                      </div>

                      <div className="space-y-1">
                        {alternativas.map((alt: any) => {
                          const isCorreta = alt.letra === q.resposta_correta;
                          const isEscolhida = alt.letra === r.resposta_usuario;
                          let cn = "rounded-md border p-2 text-sm";
                          if (isCorreta) cn += " border-accent/50 bg-accent/5";
                          else if (isEscolhida && !acertou) cn += " border-destructive/50 bg-destructive/5";
                          else cn += " border-border";

                          return (
                            <div key={alt.letra} className={cn}>
                              <span className="mr-1.5 font-medium text-muted-foreground">{alt.letra})</span>
                              {alt.texto}
                              {isCorreta && <span className="ml-1.5 text-[10px] text-accent font-medium">✓</span>}
                              {isEscolhida && !acertou && <span className="ml-1.5 text-[10px] text-destructive font-medium">sua resposta</span>}
                            </div>
                          );
                        })}
                      </div>

                      {q.explicacao && (
                        <p className="text-xs text-muted-foreground italic pt-1">💡 {q.explicacao}</p>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {respostas.length === 0 && isFinished && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Correção detalhada não disponível para este simulado.
          </p>
        )}

        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={() => navigate("/dashboard")}>Voltar</Button>
          <Button variant="outline" onClick={() => navigate(`/simulado?modo=${simulado.modo}`)}>
            Novo Simulado
          </Button>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
