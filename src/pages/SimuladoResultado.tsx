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
        .from("simulados")
        .select("*")
        .eq("id", id)
        .eq("user_id", user.id)
        .single();

      if (!sim) {
        navigate("/dashboard");
        return;
      }
      setSimulado(sim);

      // Load respostas with questoes
      const { data: resps } = await supabase
        .from("respostas")
        .select("*, questoes(id, enunciado, alternativas, resposta_correta, explicacao)")
        .eq("simulado_id", id)
        .order("created_at");

      if (resps) {
        setRespostas(resps);
        setQuestoes(resps.map((r: any) => r.questoes).filter(Boolean));
      }

      // Load metadata names
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
      <main className="container max-w-3xl flex-1 py-8">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-display text-2xl">
                {simulado.tipo === "prova_completa" ? "📋 Prova Completa" : "📊 Resultado do Simulado"}
              </CardTitle>
              <Badge variant={isFinished ? "default" : "secondary"}>
                {isFinished ? "Finalizado" : "Em andamento"}
              </Badge>
            </div>
            <CardDescription>
              {new Date(simulado.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}
              {metaNames.curso && ` • ${metaNames.curso}`}
              {metaNames.materia && ` • ${metaNames.materia}`}
              {metaNames.area && ` • ${metaNames.area}`}
            </CardDescription>
          </CardHeader>

          {isFinished && (
            <CardContent>
              <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                <div className="rounded-lg bg-primary/10 p-4 text-center">
                  <Target className="mx-auto mb-1 h-5 w-5 text-primary" />
                  <p className="text-sm text-muted-foreground">Nota</p>
                  <p className="text-3xl font-bold text-primary">{simulado.pontuacao}%</p>
                </div>
                <div className="rounded-lg bg-accent/10 p-4 text-center">
                  <CheckCircle className="mx-auto mb-1 h-5 w-5 text-accent" />
                  <p className="text-sm text-muted-foreground">Acertos</p>
                  <p className="text-3xl font-bold text-accent">{simulado.acertos}/{simulado.total_questoes}</p>
                </div>
                <div className="rounded-lg bg-destructive/10 p-4 text-center">
                  <XCircle className="mx-auto mb-1 h-5 w-5 text-destructive" />
                  <p className="text-sm text-muted-foreground">Erros</p>
                  <p className="text-3xl font-bold text-destructive">{(simulado.total_questoes || 0) - (simulado.acertos || 0)}</p>
                </div>
                <div className="rounded-lg bg-warning/10 p-4 text-center">
                  <Clock className="mx-auto mb-1 h-5 w-5 text-warning" />
                  <p className="text-sm text-muted-foreground">Tempo</p>
                  <p className="text-3xl font-bold text-warning">{tempoMin}:{String(tempoSeg).padStart(2, "0")}</p>
                </div>
              </div>
            </CardContent>
          )}
        </Card>

        {/* Share Card */}
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
        </Card>

        {/* Detalhamento das questões */}
        {respostas.length > 0 && questoes.length > 0 && (
          <>
            <h3 className="mb-4 font-display text-lg font-semibold">Correção Detalhada</h3>
            <div className="space-y-3">
              {respostas.map((r: any, i: number) => {
                const q = r.questoes;
                if (!q) return null;
                const acertou = r.acertou === true;
                const naoRespondeu = !r.resposta_usuario;
                const alternativas = Array.isArray(q.alternativas) ? q.alternativas : [];

                return (
                  <Card key={r.id} className={`border-l-4 ${naoRespondeu ? "border-l-muted-foreground" : acertou ? "border-l-accent" : "border-l-destructive"}`}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <p className="text-sm font-medium leading-relaxed">
                          <span className="text-muted-foreground mr-2">{i + 1}.</span>
                          {q.enunciado}
                        </p>
                        <Badge variant={naoRespondeu ? "secondary" : acertou ? "default" : "destructive"} className="shrink-0">
                          {naoRespondeu ? "Não respondeu" : acertou ? "Acertou" : "Errou"}
                        </Badge>
                      </div>

                      <div className="space-y-1.5">
                        {alternativas.map((alt: any) => {
                          const isCorreta = alt.letra === q.resposta_correta;
                          const isEscolhida = alt.letra === r.resposta_usuario;
                          let className = "rounded-lg border p-2.5 text-sm";
                          if (isCorreta) className += " border-accent bg-accent/10 font-medium";
                          else if (isEscolhida && !acertou) className += " border-destructive bg-destructive/10";
                          else className += " border-border";

                          return (
                            <div key={alt.letra} className={className}>
                              <span className="mr-2 font-semibold">{alt.letra})</span>
                              {alt.texto}
                              {isCorreta && <span className="ml-2 text-xs text-accent">✓ Correta</span>}
                              {isEscolhida && !acertou && <span className="ml-2 text-xs text-destructive">✗ Sua resposta</span>}
                            </div>
                          );
                        })}
                      </div>

                      {q.explicacao && (
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-xs text-muted-foreground italic">💡 {q.explicacao}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}

        {respostas.length === 0 && isFinished && (
          <Card>
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">As questões deste simulado não estão mais disponíveis para revisão detalhada.</p>
              <p className="mt-2 text-sm text-muted-foreground">Apenas simulados mais recentes mantêm a correção detalhada.</p>
            </CardContent>
          </Card>
        )}

        <div className="mt-6 flex justify-center gap-3">
          <Button onClick={() => navigate("/dashboard")}>Voltar ao Dashboard</Button>
          <Button variant="outline" onClick={() => navigate(`/simulado?modo=${simulado.modo}`)}>
            Novo Simulado
          </Button>
        </div>
      </main>
      <AppFooter />
    </div>
  );
}
