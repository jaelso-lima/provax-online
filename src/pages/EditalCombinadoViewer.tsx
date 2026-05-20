import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, CalendarDays, BookOpen, Layers, Sparkles, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { combinarEditais, type CombinedResult, type MateriaCombinada } from "@/lib/editalCombinar";
import CustomProvaModal from "@/components/CustomProvaModal";
import { toast } from "@/hooks/use-toast";

function addDays(d: Date, n: number): Date {
  const r = new Date(d); r.setDate(r.getDate() + n); return r;
}
function parseISO(s: string): Date {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export default function EditalCombinadoViewer() {
  const [params] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const ids = (params.get("ids") || "").split(",").filter(Boolean);
  const [loading, setLoading] = useState(true);
  const [combined, setCombined] = useState<CombinedResult | null>(null);
  const [provaOpen, setProvaOpen] = useState(false);

  const load = useCallback(async () => {
    if (!user || ids.length !== 2) { setLoading(false); return; }
    const { data, error } = await supabase
      .from("edital_analyses")
      .select("id, file_name, cargo_selecionado, resultado, status")
      .in("id", ids)
      .eq("user_id", user.id);
    if (error || !data || data.length < 2) {
      toast({ title: "Erro ao carregar editais", description: error?.message || "Selecione 2 editais válidos.", variant: "destructive" });
      setLoading(false);
      return;
    }
    // mantém ordem informada na URL
    const ordered = ids.map((id) => data.find((d: any) => d.id === id)).filter(Boolean) as any[];
    if (ordered.length !== 2 || ordered.some((o) => !o.resultado)) {
      setLoading(false);
      return;
    }
    const result = combinarEditais(
      { id: ordered[0].id, label: ordered[0].cargo_selecionado || ordered[0].file_name, resultado: ordered[0].resultado },
      { id: ordered[1].id, label: ordered[1].cargo_selecionado || ordered[1].file_name, resultado: ordered[1].resultado },
    );
    setCombined(result);
    setLoading(false);
  }, [user, ids.join(",")]);

  useEffect(() => { load(); }, [load]);

  // Pré-carrega as matérias combinadas para passar ao modal
  const initialMateriasCombinadas = useMemo(() => {
    if (!combined) return [];
    return combined.materias.map((m) => ({
      nome: m.nome,
      conteudos_principais: m.conteudos_principais,
    }));
  }, [combined]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!combined) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4 px-4 text-center">
        <p className="text-muted-foreground">Não foi possível combinar os editais. Verifique se ambos estão concluídos.</p>
        <Button variant="outline" onClick={() => navigate("/analisar-edital")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  const dataInicio = parseISO(combined.data_inicio);
  const fullDias: { dia: number; realDate: Date; titulo: string; tipo: string; blocos: any[] }[] = [];
  let dc = 0;
  for (let c = 0; c < combined.ciclos_completos; c++) {
    for (const db of combined.cronograma_dias) {
      if (dc >= combined.total_dias_estudo) break;
      fullDias.push({ dia: dc + 1, realDate: addDays(dataInicio, dc), titulo: db.titulo, tipo: db.tipo, blocos: db.blocos });
      dc++;
    }
  }
  for (let r = 0; r < combined.dias_restantes && dc < combined.total_dias_estudo; r++) {
    const db = combined.cronograma_dias[r % combined.cronograma_dias.length];
    fullDias.push({ dia: dc + 1, realDate: addDays(dataInicio, dc), titulo: db.titulo, tipo: db.tipo, blocos: db.blocos });
    dc++;
  }

  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
  const pctComum = Math.round(combined.similaridade_global * 100);

  const renderOrigem = (origem: MateriaCombinada["origem"]) => {
    if (origem === "comum") return <Badge className="text-[10px] bg-primary/15 text-primary border border-primary/30">Comum</Badge>;
    if (origem === "exclusiva_a") return <Badge variant="outline" className="text-[10px]">Só Edital 1</Badge>;
    return <Badge variant="outline" className="text-[10px]">Só Edital 2</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container max-w-5xl flex items-center gap-3 py-3 px-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/analisar-edital")} className="gap-1.5 shrink-0">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <Layers className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">Cronograma Combinado</span>
          </div>
        </div>
      </div>

      <main className="container max-w-5xl py-4 px-4 space-y-4">
        {/* Header summary */}
        <Card className="border-primary/20">
          <CardContent className="py-4 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Edital 1</p>
                <p className="font-semibold truncate">{combined.edital_a.label}</p>
                {combined.edital_a.data_prova && <p className="text-xs">Prova: {parseISO(combined.edital_a.data_prova).toLocaleDateString("pt-BR")}</p>}
              </div>
              <div className="rounded-lg bg-muted/40 p-3">
                <p className="text-xs text-muted-foreground">Edital 2</p>
                <p className="font-semibold truncate">{combined.edital_b.label}</p>
                {combined.edital_b.data_prova && <p className="text-xs">Prova: {parseISO(combined.edital_b.data_prova).toLocaleDateString("pt-BR")}</p>}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Conteúdo em comum entre os editais</span>
                <span className="font-semibold text-primary">{pctComum}%</span>
              </div>
              <Progress value={pctComum} className="h-2" />
            </div>
            <div className="text-xs text-muted-foreground">
              Cronograma com <span className="font-semibold text-foreground">{combined.total_dias_estudo} dias</span>
              {combined.data_prova_referencia && <> até <span className="font-semibold text-foreground">{parseISO(combined.data_prova_referencia).toLocaleDateString("pt-BR")}</span> (data da prova mais próxima)</>}.
              As matérias comuns vêm primeiro; depois as exclusivas de cada edital.
            </div>
            <Button size="sm" className="gap-1.5" onClick={() => setProvaOpen(true)}>
              <Sparkles className="h-3.5 w-3.5" /> Gerar prova personalizada combinada
            </Button>
          </CardContent>
        </Card>

        <Tabs defaultValue="materias" className="w-full">
          <TabsList className="w-full grid grid-cols-2 h-auto">
            <TabsTrigger value="materias" className="text-xs py-2 gap-1">
              <BookOpen className="h-3.5 w-3.5" /> Matérias
            </TabsTrigger>
            <TabsTrigger value="cronograma" className="text-xs py-2 gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> Cronograma
            </TabsTrigger>
          </TabsList>

          <TabsContent value="materias" className="mt-4 space-y-3">
            {combined.materias.map((m, i) => (
              <Card key={i}>
                <CardContent className="py-3 px-4 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <BookOpen className="h-4 w-4 text-primary" />
                    <span className="font-semibold">{m.nome}</span>
                    {renderOrigem(m.origem)}
                    {m.quantidade_questoes ? (
                      <Badge className="text-[10px] bg-primary/10 text-primary border border-primary/20">
                        {m.quantidade_questoes} questões
                      </Badge>
                    ) : null}
                  </div>
                  {m.conteudos_principais.length > 0 && (
                    <ul className="grid gap-1 text-sm">
                      {m.conteudos_principais.slice(0, 20).map((c, j) => (
                        <li key={j} className="flex items-start gap-2 text-muted-foreground">
                          <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> {c}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            ))}
          </TabsContent>

          <TabsContent value="cronograma" className="mt-4 space-y-3">
            {fullDias.map((dia) => {
              const isSim = dia.tipo === "simulado";
              const isRev = dia.tipo === "revisao";
              return (
                <div key={dia.dia} className={`rounded-lg border p-3 space-y-1.5 ${isSim ? "border-destructive/30 bg-destructive/5" : isRev ? "border-amber-500/30 bg-amber-500/5" : ""}`}>
                  <h4 className={`text-sm font-bold flex items-center gap-1.5 ${isSim ? "text-destructive" : isRev ? "text-amber-600" : "text-primary"}`}>
                    <CalendarDays className="h-4 w-4" />
                    DIA {dia.dia} - {fmt(dia.realDate)} {dia.titulo && `| ${dia.titulo}`}
                  </h4>
                  <div className="space-y-1">
                    {dia.blocos.map((b, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Badge variant="outline" className="text-[10px] w-14 justify-center shrink-0">40 min</Badge>
                        <span className="font-medium">{b.materia}</span>
                        <span className="text-muted-foreground text-xs">({b.topico})</span>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </TabsContent>
        </Tabs>
      </main>

      <CustomProvaModal
        open={provaOpen}
        onOpenChange={setProvaOpen}
        initialMaterias={initialMateriasCombinadas}
        initialLabel={`Combinado: ${combined.edital_a.label} + ${combined.edital_b.label}`}
      />
    </div>
  );
}