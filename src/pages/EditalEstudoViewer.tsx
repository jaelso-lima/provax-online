import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Info, ClipboardList, Brain, CalendarDays, PenLine,
  BookOpen, FileText, Briefcase, CheckCircle2
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { AnalysisResult } from "@/lib/editalPdf";

// We import the section components by re-exporting them
// Since they're internal to AnalisarEdital, we'll duplicate a lightweight shell here
// that loads the analysis and renders the same tabs

interface EditalAnalysis {
  id: string;
  user_id: string;
  file_name: string;
  storage_path: string;
  status: string;
  resultado: AnalysisResult | null;
  erro_detalhes: string | null;
  created_at: string;
  cargo_selecionado?: string | null;
}

export default function EditalEstudoViewer() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState<EditalAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<string>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tab") || "estudo";
  });

  const fetchAnalysis = useCallback(async () => {
    if (!user || !id) return;
    const { data } = await supabase
      .from("edital_analyses")
      .select("*")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();
    if (data) setAnalysis(data as unknown as EditalAnalysis);
    setLoading(false);
  }, [user, id]);

  useEffect(() => { fetchAnalysis(); }, [fetchAnalysis]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analysis || !analysis.resultado) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background gap-4">
        <p className="text-muted-foreground">Analise nao encontrada.</p>
        <Button variant="outline" onClick={() => navigate("/analisar-edital")} className="gap-1.5">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>
      </div>
    );
  }

  const resultado = analysis.resultado;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-background/95 backdrop-blur sticky top-0 z-10">
        <div className="container max-w-5xl flex items-center gap-3 py-3 px-4">
          <Button variant="ghost" size="sm" onClick={() => navigate("/analisar-edital")} className="gap-1.5 shrink-0">
            <ArrowLeft className="h-4 w-4" /> Voltar
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm font-medium truncate">{analysis.file_name}</span>
            {analysis.cargo_selecionado && (
              <Badge variant="secondary" className="text-[10px] shrink-0">{analysis.cargo_selecionado}</Badge>
            )}
          </div>
        </div>
      </div>

      <main className="container max-w-5xl py-4 px-4">
        <p className="text-xs text-muted-foreground mb-4">
          Aberto em aba separada — faca simulados na outra aba e anote aqui ao mesmo tempo.
        </p>
        <Tabs value={tab} onValueChange={setTab} className="w-full">
          <TabsList className="w-full grid grid-cols-5 h-auto">
            <TabsTrigger value="raio-x" className="text-xs py-2 gap-1">
              <Info className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Raio-X</span>
            </TabsTrigger>
            <TabsTrigger value="conteudo" className="text-xs py-2 gap-1">
              <ClipboardList className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Conteudo</span>
            </TabsTrigger>
            <TabsTrigger value="macetes" className="text-xs py-2 gap-1">
              <Brain className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Macetes</span>
            </TabsTrigger>
            <TabsTrigger value="cronograma" className="text-xs py-2 gap-1">
              <CalendarDays className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Cronograma</span>
            </TabsTrigger>
            <TabsTrigger value="estudo" className="text-xs py-2 gap-1">
              <PenLine className="h-3.5 w-3.5" /> <span className="hidden sm:inline">Estudo</span>
            </TabsTrigger>
          </TabsList>

          {/* We render a simplified version using the resultado data directly */}
          <TabsContent value="raio-x" className="mt-4">
            <ViewerRaioX resultado={resultado} />
          </TabsContent>
          <TabsContent value="conteudo" className="mt-4">
            <ViewerConteudo resultado={resultado} />
          </TabsContent>
          <TabsContent value="macetes" className="mt-4">
            <ViewerMacetes resultado={resultado} />
          </TabsContent>
          <TabsContent value="cronograma" className="mt-4">
            <ViewerCronograma resultado={resultado} />
          </TabsContent>
          <TabsContent value="estudo" className="mt-4">
            <ViewerEstudo analysisId={analysis.id} resultado={resultado} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

/* ── Viewer sub-components (lightweight, read the same data) ── */

function ViewerRaioX({ resultado }: { resultado: AnalysisResult }) {
  const raioX = resultado.raio_x as any;
  const info = resultado.info_concurso as any;
  if (!raioX && !info) return <p className="text-sm text-muted-foreground py-4">Raio-X nao disponivel.</p>;

  const items = [
    { label: "Orgao", value: raioX?.orgao || info?.nome },
    { label: "Banca", value: raioX?.banca || info?.banca },
    { label: "Vagas", value: raioX?.vagas },
    { label: "Escolaridade", value: raioX?.escolaridade },
    { label: "Data da Prova", value: raioX?.data_prova },
  ].filter(i => i.value);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {items.map((item, i) => (
        <div key={i} className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="text-sm font-semibold text-foreground">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function ViewerConteudo({ resultado }: { resultado: AnalysisResult }) {
  const materias = resultado.materias || [];
  if (!materias.length) return <p className="text-sm text-muted-foreground py-4">Nenhuma materia.</p>;

  return (
    <div className="space-y-4">
      {materias.map((m, i) => (
        <Card key={i}>
          <CardContent className="py-3 px-4 space-y-2">
            <h4 className="font-semibold flex items-center gap-2">
              <BookOpen className="h-4 w-4 text-primary" /> {m.nome}
              {m.tipo && <Badge variant="outline" className="text-[10px]">{m.tipo === "basico" ? "Basico" : "Especifico"}</Badge>}
            </h4>
            {m.explicacao && <p className="text-sm text-muted-foreground">{m.explicacao}</p>}
            {m.conteudos_principais?.length > 0 && (
              <ul className="grid gap-1 text-sm">
                {m.conteudos_principais.map((c: string, j: number) => (
                  <li key={j} className="flex items-start gap-2 text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> {c}
                  </li>
                ))}
              </ul>
            )}
            {m.resumo_detalhado && (
              <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-sm whitespace-pre-line">{m.resumo_detalhado}</div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ViewerMacetes({ resultado }: { resultado: AnalysisResult }) {
  const materias = (resultado.materias || []).filter(m => m.macetes?.length > 0);
  if (!materias.length) return <p className="text-sm text-muted-foreground py-4">Nenhum macete.</p>;

  return (
    <div className="space-y-4">
      {materias.map((m, i) => (
        <div key={i} className="space-y-2">
          <h4 className="text-sm font-semibold">{m.nome}</h4>
          {m.macetes.map((mac: string, j: number) => (
            <div key={j} className="rounded-md bg-purple-500/5 border border-purple-500/10 p-3 text-sm">{mac}</div>
          ))}
        </div>
      ))}
    </div>
  );
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function ViewerCronograma({ resultado }: { resultado: AnalysisResult }) {
  const cronograma = resultado.cronograma_reverso as any;
  if (!cronograma?.dias?.length) return <p className="text-sm text-muted-foreground py-4">Cronograma nao disponivel.</p>;

  const { regras, dias } = cronograma;
  const totalDiasEstudo = regras?.total_dias_estudo || dias.length;
  const cicloDias = regras?.ciclo_dias || dias.length;
  const ciclosCompletos = regras?.ciclos_completos || Math.floor(totalDiasEstudo / cicloDias);
  const diasRestantes = regras?.dias_restantes || totalDiasEstudo % cicloDias;
  const dataInicio = regras?.data_inicio ? (() => {
    const parts = regras.data_inicio.split('-');
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  })() : new Date();

  const fullDias: any[] = [];
  let dc = 0;
  for (let c = 0; c < ciclosCompletos; c++) {
    for (const db of dias) {
      if (dc >= totalDiasEstudo) break;
      fullDias.push({ dia: dc + 1, realDate: addDays(dataInicio, dc), ...db });
      dc++;
    }
  }
  for (let r = 0; r < diasRestantes && dc < totalDiasEstudo; r++) {
    fullDias.push({ dia: dc + 1, realDate: addDays(dataInicio, dc), ...dias[r % dias.length] });
    dc++;
  }

  const fmt = (d: Date) => d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

  return (
    <div className="space-y-3">
      {fullDias.map((dia) => (
        <div key={dia.dia} className="rounded-lg border p-3 space-y-1.5">
          <h4 className="text-sm font-bold text-primary flex items-center gap-1.5">
            <CalendarDays className="h-4 w-4" />
            DIA {dia.dia} - {fmt(dia.realDate)} {dia.titulo && `| ${dia.titulo}`}
          </h4>
          <div className="space-y-1">
            {dia.blocos?.map((b: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <Badge variant="outline" className="text-[10px] w-14 justify-center shrink-0">40 min</Badge>
                <span className="font-medium">{b.materia}</span>
                <span className="text-muted-foreground text-xs">({b.topico})</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ── Estudo with side-by-side notes ── */
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import {
  CheckSquare, Target, Lightbulb, GraduationCap, Sparkles,
  ScrollText, Play, StickyNote
} from "lucide-react";

interface StudyProgress {
  checkedContent: Record<string, boolean>;
  checkedDays: Record<number, boolean>;
  notes: Record<string, string>;
  generalNote: string;
}

function loadProgress(analysisId: string): StudyProgress {
  try {
    const raw = localStorage.getItem(`edital_estudo_${analysisId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { checkedContent: {}, checkedDays: {}, notes: {}, generalNote: "" };
}

function saveProgress(analysisId: string, progress: StudyProgress) {
  localStorage.setItem(`edital_estudo_${analysisId}`, JSON.stringify(progress));
}

function ViewerEstudo({ analysisId, resultado }: { analysisId: string; resultado: AnalysisResult }) {
  const navigate = useNavigate();
  const [progress, setProgress] = useState<StudyProgress>(() => loadProgress(analysisId));

  const update = (fn: (p: StudyProgress) => StudyProgress) => {
    setProgress(prev => {
      const next = fn(prev);
      saveProgress(analysisId, next);
      return next;
    });
  };

  const toggleContent = (key: string) => {
    update(p => ({ ...p, checkedContent: { ...p.checkedContent, [key]: !p.checkedContent[key] } }));
  };

  const setNote = (key: string, value: string) => {
    update(p => ({ ...p, notes: { ...p.notes, [key]: value } }));
  };

  const materias = resultado.materias || [];

  const totalContent = materias.reduce((acc, m) => acc + (m.conteudos_principais?.length || 0), 0);
  const checkedCount = Object.values(progress.checkedContent).filter(Boolean).length;
  const contentPct = totalContent > 0 ? Math.round((checkedCount / totalContent) * 100) : 0;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* Left: Study content (2/3) */}
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-1">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
              <PenLine className="h-4 w-4" /> Progresso
            </h3>
            <span className="text-xs font-semibold text-foreground">{checkedCount}/{totalContent} ({contentPct}%)</span>
          </div>
          <Progress value={contentPct} className="h-2" />
        </div>

        <Accordion type="multiple" className="space-y-2">
          {materias.map((materia, mIdx) => {
            const topicKeys = materia.conteudos_principais?.map((_: string, cIdx: number) => `${mIdx}-${cIdx}`) || [];
            const checkedTopics = topicKeys.filter((k: string) => progress.checkedContent[k]);
            const allChecked = topicKeys.length > 0 && checkedTopics.length === topicKeys.length;

            return (
              <AccordionItem key={mIdx} value={`e-${mIdx}`} className="border rounded-lg px-4">
                <AccordionTrigger className="py-3 hover:no-underline">
                  <div className="flex items-center gap-2 text-left flex-1">
                    <BookOpen className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-semibold">{materia.nome}</span>
                    <div className="ml-auto flex items-center gap-2 shrink-0">
                      {allChecked ? (
                        <Badge className="bg-primary/10 text-primary text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-0.5" /> Concluido
                        </Badge>
                      ) : topicKeys.length > 0 ? (
                        <span className="text-[10px] text-muted-foreground">{checkedTopics.length}/{topicKeys.length}</span>
                      ) : null}
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4 space-y-3">
                  {materia.conteudos_principais?.map((conteudo: string, cIdx: number) => {
                    const key = `${mIdx}-${cIdx}`;
                    const checked = !!progress.checkedContent[key];
                    return (
                      <div key={cIdx} className={`rounded-md border p-3 transition-colors ${checked ? "bg-primary/5 border-primary/20" : "border-border"}`}>
                        <div className="flex items-start gap-3">
                          <Checkbox checked={checked} onCheckedChange={() => toggleContent(key)} className="mt-0.5" />
                          <p className={`text-sm flex-1 ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}>{conteudo}</p>
                          {checked && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                        </div>
                      </div>
                    );
                  })}

                  {materia.resumo_detalhado && (
                    <div className="rounded-lg bg-primary/5 border border-primary/10 p-3 text-sm whitespace-pre-line">{materia.resumo_detalhado}</div>
                  )}

                  <Button size="sm" className="gap-1.5" onClick={() => navigate(`/simulado?materia_nome=${encodeURIComponent(materia.nome)}`)}>
                    <Play className="h-3.5 w-3.5" /> Treinar essa materia
                  </Button>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>

      {/* Right: Notes panel (1/3) - sticky */}
      <div className="space-y-3 lg:sticky lg:top-16 lg:self-start">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <StickyNote className="h-4 w-4 text-primary" /> Anotacoes
        </h3>

        <div className="rounded-lg border p-3 space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground">Anotacoes gerais</Label>
          <Textarea
            placeholder="Suas anotacoes gerais..."
            value={progress.generalNote}
            onChange={(e) => update(p => ({ ...p, generalNote: e.target.value }))}
            className="min-h-[100px] text-sm"
          />
        </div>

        {materias.map((materia, mIdx) => (
          <div key={mIdx} className="rounded-lg border p-3 space-y-2">
            <Label className="text-xs font-semibold text-primary">{materia.nome}</Label>
            <Textarea
              placeholder={`Anotacoes sobre ${materia.nome}...`}
              value={progress.notes[`materia-${mIdx}`] || ""}
              onChange={(e) => setNote(`materia-${mIdx}`, e.target.value)}
              className="text-xs min-h-[50px] resize-none"
              rows={2}
            />
            {materia.conteudos_principais?.map((conteudo: string, cIdx: number) => {
              const key = `${mIdx}-${cIdx}`;
              if (!progress.checkedContent[key] || !progress.notes[key]) return null;
              return (
                <div key={cIdx} className="text-xs space-y-0.5 border-t pt-1.5">
                  <p className="text-muted-foreground truncate">{conteudo}</p>
                  <p className="text-foreground bg-muted/50 rounded p-1">{progress.notes[key]}</p>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
