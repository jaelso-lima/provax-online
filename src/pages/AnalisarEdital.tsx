import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Upload, FileText, Lock, Crown, Loader2, BookOpen, Target,
  Lightbulb, GraduationCap, AlertTriangle, Play, RefreshCw,
  Trash2, Clock, Download, Briefcase, Brain, Sparkles, ScrollText,
  CalendarDays, Info, MapPin, DollarSign, Users, ClipboardList,
  CheckCircle2, CheckSquare, StopCircle, Calendar, PenLine, StickyNote, Save
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { generateEditalPdf, type AnalysisResult } from "@/lib/editalPdf";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

function tryParseDate(raw: string): string | null {
  if (!raw) return null;
  // Already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  // DD/MM/YYYY
  const brMatch = raw.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (brMatch) {
    const [, d, m, y] = brMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  // Try native parse
  const d = new Date(raw);
  if (!isNaN(d.getTime()) && d.getFullYear() > 2020) {
    return d.toISOString().split("T")[0];
  }
  return null;
}

function calcDiasEstudo(dataProva: string): number {
  const prova = new Date(dataProva);
  const hoje = new Date();
  hoje.setHours(0,0,0,0);
  prova.setHours(0,0,0,0);
  return Math.max(1, Math.floor((prova.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24)) - 1);
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

interface CarreiraOption {
  nome: string;
  escolaridade?: string;
  vagas?: string;
  salario?: string;
}

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
  carreiras_identificadas?: { carreiras?: CarreiraOption[]; raio_x_resumido?: any } | null;
}

type Step = "upload" | "selecting_career" | "generating" | "result";

export default function AnalisarEdital() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isFreePlan = !profile?.plano || profile.plano === "free";

  const [uploading, setUploading] = useState(false);
  const [analyses, setAnalyses] = useState<EditalAnalysis[]>([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);
  const [currentStep, setCurrentStep] = useState<Step>("upload");
  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  const [carreiras, setCarreiras] = useState<CarreiraOption[]>([]);
  const [raioXResumido, setRaioXResumido] = useState<any>(null);
  const [dataProva, setDataProva] = useState<string>("");

  const activeAnalysis = analyses.find(a => a.id === activeAnalysisId) || null;

  const fetchAnalyses = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("edital_analyses")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    if (data) setAnalyses(data as unknown as EditalAnalysis[]);
    setLoadingAnalyses(false);
  }, [user]);

  useEffect(() => { fetchAnalyses(); }, [fetchAnalyses]);

  // Poll for status changes
  useEffect(() => {
    const processing = analyses.some(a =>
      ["pendente", "extraindo_carreiras", "processando"].includes(a.status)
    );
    if (!processing) return;
    const interval = setInterval(async () => {
      await fetchAnalyses();
    }, 4000);
    return () => clearInterval(interval);
  }, [analyses, fetchAnalyses]);

  // Sync step with active analysis status
  useEffect(() => {
    if (!activeAnalysis) return;
    const s = activeAnalysis.status;
    if (s === "carreiras_identificadas") {
      const ci = activeAnalysis.carreiras_identificadas;
      if (ci?.carreiras?.length) {
        setCarreiras(ci.carreiras);
        setRaioXResumido(ci.raio_x_resumido || null);
        // Try to pre-fill exam date from edital
        if (ci.raio_x_resumido?.data_prova) {
          const raw = ci.raio_x_resumido.data_prova;
          // Try to parse various date formats to YYYY-MM-DD
          const parsed = tryParseDate(raw);
          if (parsed) setDataProva(parsed);
        }
        setCurrentStep("selecting_career");
      }
    } else if (s === "processando") {
      setCurrentStep("generating");
    } else if (s === "concluido") {
      setCurrentStep("result");
    } else if (s === "erro") {
      setCurrentStep("result");
    }
  }, [activeAnalysis?.status]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.type !== "application/pdf") {
      toast({ title: "Formato invalido", description: "Envie apenas arquivos PDF.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Arquivo muito grande", description: "O tamanho maximo e 10MB.", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const storagePath = `${user!.id}/${fileName}`;

      const { error: uploadErr } = await supabase.storage
        .from("editais")
        .upload(storagePath, file, { contentType: "application/pdf" });
      if (uploadErr) throw uploadErr;

      const { data: analysisRow, error: insertErr } = await supabase
        .from("edital_analyses")
        .insert({
          user_id: user!.id,
          file_name: file.name,
          storage_path: storagePath,
          status: "pendente",
        } as any)
        .select()
        .single();
      if (insertErr) throw insertErr;

      const newId = (analysisRow as any).id;
      setActiveAnalysisId(newId);
      setCurrentStep("generating");

      toast({ title: "Edital enviado!", description: "Identificando carreiras do edital..." });
      fetchAnalyses();

      // Step 1: Extract careers
      supabase.functions.invoke("analyze-edital", {
        body: { analysis_id: newId, mode: "extract_careers" },
      }).catch(err => console.error("Error invoking extract_careers:", err));

    } catch (err: any) {
      console.error("Upload error:", err);
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleSelectCarreira = async (carreira: CarreiraOption) => {
    if (!activeAnalysisId) return;

    setCurrentStep("generating");
    const diasEstudo = dataProva ? calcDiasEstudo(dataProva) : 30;
    const descDias = dataProva ? `Cronograma de ${diasEstudo} dias ate a prova.` : "Cronograma de 30 dias de estudo.";
    toast({ title: `Gerando guia para: ${carreira.nome}`, description: `${descDias} Pode levar ate 3 minutos...` });

    supabase.functions.invoke("analyze-edital", {
      body: {
        analysis_id: activeAnalysisId,
        mode: "generate_guide",
        cargo_selecionado: carreira.nome,
        data_prova_usuario: dataProva,
      },
    }).catch(err => console.error("Error invoking generate_guide:", err));
  };

  const handleDelete = async (id: string) => {
    const analysis = analyses.find(a => a.id === id);
    if (!analysis) return;
    if (activeAnalysisId === id) {
      setActiveAnalysisId(null);
      setCurrentStep("upload");
      setCarreiras([]);
    }
    setAnalyses(prev => prev.filter(a => a.id !== id));
    await supabase.storage.from("editais").remove([analysis.storage_path]);
    await supabase.from("edital_analyses").delete().eq("id", id);
    toast({ title: "Analise removida" });
  };

  const handleRetry = async (id: string) => {
    await supabase.from("edital_analyses").update({ status: "pendente", erro_detalhes: null } as any).eq("id", id);
    setActiveAnalysisId(id);
    setCurrentStep("generating");
    supabase.functions.invoke("analyze-edital", {
      body: { analysis_id: id, mode: "extract_careers" },
    });
    fetchAnalyses();
    toast({ title: "Reprocessando edital..." });
  };

  const navigateToSimulado = (materiaNome: string) => {
    navigate(`/simulado?materia_nome=${encodeURIComponent(materiaNome)}`);
  };

  if (isFreePlan) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AppHeader />
        <main className="flex-1 container max-w-2xl py-10 px-4">
          <Card className="border-primary/20 shadow-lg">
            <CardContent className="flex flex-col items-center gap-6 py-12 text-center">
              <div className="rounded-full bg-primary/10 p-5">
                <Lock className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Edital Master: O Guia do Concurseiro</h2>
                <p className="text-muted-foreground max-w-md">
                  Envie seu edital e receba um guia de estudo completo com raio-x, conteudo destrinchado, macetes e cronograma de estudo reverso.
                </p>
              </div>
              <Button size="lg" className="gap-2" onClick={() => navigate("/planos")}>
                <Crown className="h-5 w-5" />
                Desbloquear agora
              </Button>
            </CardContent>
          </Card>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 container max-w-4xl py-6 px-4 space-y-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <FileText className="h-7 w-7 text-primary" />
            Edital Master
          </h1>
          <p className="text-muted-foreground mt-1">
            Envie o PDF do edital, escolha sua carreira e receba um guia focado com cronograma de estudo reverso.
          </p>
        </div>

        {/* Steps indicator */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Upload, label: "1. Upload", desc: "Envie o PDF" },
            { icon: Briefcase, label: "2. Carreira", desc: "Escolha o cargo" },
            { icon: Brain, label: "3. Analise", desc: "IA gera o guia" },
            { icon: CalendarDays, label: "4. Resultado", desc: "Guia + Cronograma" },
          ].map((step, i) => {
            const stepMap: Step[] = ["upload", "selecting_career", "generating", "result"];
            const isActive = stepMap[i] === currentStep;
            const isPast = stepMap.indexOf(currentStep) > i;
            return (
              <div key={i} className={`flex items-center gap-2 rounded-lg border px-3 py-2 transition-colors ${
                isActive ? "border-primary bg-primary/10" : isPast ? "border-primary/30 bg-primary/5" : "border-border/50 bg-muted/30"
              }`}>
                <step.icon className={`h-4 w-4 shrink-0 ${isActive ? "text-primary" : isPast ? "text-primary/60" : "text-muted-foreground"}`} />
                <div>
                  <p className={`text-xs font-semibold ${isActive ? "text-primary" : "text-foreground"}`}>{step.label}</p>
                  <p className="text-[10px] text-muted-foreground">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>

        {/* STEP: Upload */}
        {currentStep === "upload" && (
          <Card>
            <CardContent className="py-8">
              <label className="flex flex-col items-center gap-4 cursor-pointer group">
                <div className="rounded-xl border-2 border-dashed border-muted-foreground/30 group-hover:border-primary/50 transition-colors p-8 w-full text-center">
                  {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <Loader2 className="h-10 w-10 animate-spin text-primary" />
                      <p className="text-muted-foreground font-medium">Enviando edital...</p>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Upload className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                      <div>
                        <p className="font-semibold text-foreground">Arraste ou clique para enviar o edital (PDF)</p>
                        <p className="text-sm text-muted-foreground">Tamanho maximo: 10MB</p>
                      </div>
                    </div>
                  )}
                </div>
                <input type="file" accept=".pdf" className="hidden" onChange={handleUpload} disabled={uploading} />
              </label>
            </CardContent>
          </Card>
        )}

        {/* STEP: Selecting Career */}
        {currentStep === "selecting_career" && (
          <Card>
            <CardContent className="py-6 space-y-4">
              <div className="text-center space-y-2">
                <Briefcase className="h-8 w-8 text-primary mx-auto" />
                <h2 className="text-lg font-bold">Escolha sua carreira</h2>
                <p className="text-sm text-muted-foreground">
                  Identificamos {carreiras.length} {carreiras.length === 1 ? "cargo" : "cargos"} no edital. Selecione para gerar o guia focado.
                </p>
              </div>

              {raioXResumido && (
                <div className="rounded-lg bg-muted/50 border p-3 text-sm space-y-1">
                  {raioXResumido.orgao && <p><span className="font-semibold">Orgao:</span> {raioXResumido.orgao}</p>}
                  {raioXResumido.banca && <p><span className="font-semibold">Banca:</span> {raioXResumido.banca}</p>}
                  {raioXResumido.data_prova && <p><span className="font-semibold">Prova:</span> {raioXResumido.data_prova}</p>}
                </div>
              )}

              {/* Exam date info (auto-extracted) */}
              {dataProva && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">Data da Prova: {new Date(dataProva + "T12:00:00").toLocaleDateString("pt-BR")}</p>
                    <p className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 inline mr-1" />
                      {calcDiasEstudo(dataProva)} dias de estudo ate a prova
                    </p>
                  </div>
                </div>
              )}
              {!dataProva && (
                <div className="rounded-lg border border-muted bg-muted/30 p-3 flex items-center gap-2">
                  <Info className="h-4 w-4 text-muted-foreground shrink-0" />
                  <p className="text-xs text-muted-foreground">
                    Data da prova nao identificada no edital. Sera gerado um cronograma padrao de 30 dias.
                  </p>
                </div>
              )}

              <div className="grid gap-3">
                {carreiras.map((carreira, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectCarreira(carreira)}
                    className="w-full text-left rounded-lg border border-border hover:border-primary/50 hover:bg-primary/5 p-4 transition-colors group"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="space-y-1">
                        <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                          {carreira.nome}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {carreira.escolaridade && (
                            <Badge variant="secondary" className="text-[10px]">{carreira.escolaridade}</Badge>
                          )}
                          {carreira.vagas && (
                            <Badge variant="outline" className="text-[10px]">{carreira.vagas} vagas</Badge>
                          )}
                          {carreira.salario && (
                            <Badge variant="outline" className="text-[10px]">{carreira.salario}</Badge>
                          )}
                        </div>
                      </div>
                      <Play className="h-5 w-5 text-muted-foreground group-hover:text-primary shrink-0" />
                    </div>
                  </button>
                ))}
              </div>

              <div className="flex justify-center pt-2">
                <Button variant="ghost" size="sm" onClick={() => { setActiveAnalysisId(null); setCurrentStep("upload"); setCarreiras([]); }}>
                  <Upload className="h-3.5 w-3.5 mr-1.5" /> Enviar outro edital
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP: Generating */}
        {currentStep === "generating" && activeAnalysis && (
          <Card>
            <CardContent className="py-8">
              <ProcessingProgress
                startedAt={activeAnalysis.created_at}
                status={activeAnalysis.status}
              />
              <div className="flex justify-center gap-2 pt-4">
                <Button size="sm" variant="outline" onClick={() => handleDelete(activeAnalysis.id)}
                  className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                  <StopCircle className="h-3.5 w-3.5" /> Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* STEP: Result */}
        {currentStep === "result" && activeAnalysis && (
          <>
            {activeAnalysis.status === "erro" ? (
              <Card>
                <CardContent className="py-6 space-y-3">
                  <div className="flex items-start gap-2 text-destructive">
                    <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                    <p className="text-sm">{activeAnalysis.erro_detalhes || "Erro desconhecido ao processar o edital."}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => handleRetry(activeAnalysis.id)} className="gap-1.5">
                      <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => handleDelete(activeAnalysis.id)} className="gap-1.5 text-destructive">
                      <Trash2 className="h-3.5 w-3.5" /> Remover
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : activeAnalysis.resultado ? (
              <ResultView
                analysis={activeAnalysis}
                onDelete={() => handleDelete(activeAnalysis.id)}
                onNavigateSimulado={navigateToSimulado}
                onNewAnalysis={() => { setActiveAnalysisId(null); setCurrentStep("upload"); setCarreiras([]); }}
              />
            ) : null}
          </>
        )}

        {/* Previous analyses list */}
        {currentStep === "upload" && !loadingAnalyses && analyses.filter(a => a.status === "concluido").length > 0 && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <Clock className="h-5 w-5 text-muted-foreground" /> Analises anteriores
            </h2>
            {analyses.filter(a => a.status === "concluido").map((analysis) => (
              <Card key={analysis.id} className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => { setActiveAnalysisId(analysis.id); setCurrentStep("result"); }}>
                <CardContent className="py-3 px-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{analysis.file_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(analysis.created_at).toLocaleDateString("pt-BR")}
                        {analysis.cargo_selecionado && ` - ${analysis.cargo_selecionado}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Concluido
                    </Badge>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDelete(analysis.id); }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {currentStep === "upload" && loadingAnalyses && (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}

/* ─── Processing Progress ─── */
function ProcessingProgress({ startedAt, status }: { startedAt: string; status: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const isExtracting = status === "extraindo_carreiras" || status === "pendente";
  const steps = isExtracting
    ? [
        { label: "Enviando edital", threshold: 0 },
        { label: "Lendo conteudo do PDF", threshold: 5 },
        { label: "Identificando cargos e carreiras", threshold: 15 },
        { label: "Finalizando extracao", threshold: 40 },
      ]
    : [
        { label: "Preparando analise focada", threshold: 0 },
        { label: "Extraindo raio-x do concurso", threshold: 10 },
        { label: "Destrinchando conteudo programatico", threshold: 25 },
        { label: "Gerando resumos detalhados", threshold: 50 },
        { label: "Criando macetes de memorizacao", threshold: 80 },
        { label: "Montando cronograma de estudo reverso", threshold: 120 },
        { label: "Finalizando guia master", threshold: 160 },
      ];

  const currentStep = [...steps].reverse().find(s => elapsed >= s.threshold) || steps[0];
  const maxTime = isExtracting ? 80 : 200;
  const progressPct = Math.min(95, Math.round((elapsed / maxTime) * 100));

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="space-y-4 text-center">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-foreground font-medium">{currentStep.label}...</p>
        <p className="text-xs text-muted-foreground">Tempo decorrido: {formatTime(elapsed)}</p>
      </div>
      <Progress value={progressPct} className="max-w-xs mx-auto" />
      <div className="flex justify-center gap-1">
        {steps.map((step, i) => (
          <div key={i} className={`h-1.5 w-1.5 rounded-full transition-colors ${elapsed >= step.threshold ? "bg-primary" : "bg-muted"}`} />
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        {isExtracting ? "Identificando carreiras do edital..." : "Analises detalhadas podem levar ate 3 minutos"}
      </p>
    </div>
  );
}

/* ─── Result View ─── */
function ResultView({
  analysis, onDelete, onNavigateSimulado, onNewAnalysis,
}: {
  analysis: EditalAnalysis;
  onDelete: () => void;
  onNavigateSimulado: (nome: string) => void;
  onNewAnalysis: () => void;
}) {
  const resultado = analysis.resultado as AnalysisResult;
  if (!resultado) return null;

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardContent className="py-4 px-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <FileText className="h-5 w-5 text-primary shrink-0" />
            <div className="min-w-0">
              <p className="font-medium truncate">{analysis.file_name}</p>
              <p className="text-xs text-muted-foreground">
                {analysis.cargo_selecionado && <><Briefcase className="h-3 w-3 inline mr-1" />{analysis.cargo_selecionado} - </>}
                {new Date(analysis.created_at).toLocaleDateString("pt-BR")}
              </p>
            </div>
          </div>
          <Badge variant="secondary" className="bg-green-500/10 text-green-600 text-xs gap-1">
            <CheckCircle2 className="h-3 w-3" /> Concluido
          </Badge>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="raio-x" className="w-full">
        <TabsList className="w-full grid grid-cols-5 h-auto">
          <TabsTrigger value="raio-x" className="text-xs py-2 gap-1">
            <Info className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Raio-X</span>
          </TabsTrigger>
          <TabsTrigger value="conteudo" className="text-xs py-2 gap-1">
            <ClipboardList className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Conteudo</span>
          </TabsTrigger>
          <TabsTrigger value="macetes" className="text-xs py-2 gap-1">
            <Brain className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Macetes</span>
          </TabsTrigger>
          <TabsTrigger value="cronograma" className="text-xs py-2 gap-1">
            <CalendarDays className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Cronograma</span>
          </TabsTrigger>
          <TabsTrigger value="estudo" className="text-xs py-2 gap-1">
            <PenLine className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Estudo</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="raio-x" className="mt-4">
          <RaioXSection raioX={resultado.raio_x} infoConcurso={resultado.info_concurso} />
        </TabsContent>

        <TabsContent value="conteudo" className="mt-4">
          <ConteudoSection materias={resultado.materias || []} onNavigateSimulado={onNavigateSimulado} />
        </TabsContent>

        <TabsContent value="macetes" className="mt-4">
          <MacetesSection materias={resultado.materias || []} />
        </TabsContent>

        <TabsContent value="cronograma" className="mt-4">
          <CronogramaSection cronograma={resultado.cronograma_reverso} />
        </TabsContent>

        <TabsContent value="estudo" className="mt-4">
          <EstudoSection analysisId={analysis.id} resultado={resultado} />
        </TabsContent>
      </Tabs>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" className="gap-1.5" onClick={async () => {
          await generateEditalPdf(resultado, analysis.file_name);
          toast({ title: "PDF gerado!", description: "O download comecara automaticamente." });
        }}>
          <Download className="h-3.5 w-3.5" /> Exportar PDF
        </Button>
        <Button size="sm" variant="outline" className="gap-1.5" onClick={onNewAnalysis}>
          <Upload className="h-3.5 w-3.5" /> Novo edital
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} className="gap-1.5 text-destructive">
          <Trash2 className="h-3.5 w-3.5" /> Remover
        </Button>
      </div>
    </div>
  );
}

/* ─── Raio-X Section ─── */
function RaioXSection({ raioX, infoConcurso }: { raioX?: any; infoConcurso?: any }) {
  if (!raioX && !infoConcurso) {
    return <p className="text-sm text-muted-foreground py-4">Informacoes do raio-x nao disponiveis.</p>;
  }

  const cards: { icon: React.ReactNode; label: string; value: string | undefined }[] = [
    { icon: <Briefcase className="h-4 w-4" />, label: "Orgao", value: raioX?.orgao || infoConcurso?.nome },
    { icon: <GraduationCap className="h-4 w-4" />, label: "Banca", value: raioX?.banca || infoConcurso?.banca },
    { icon: <Users className="h-4 w-4" />, label: "Vagas", value: raioX?.vagas },
    { icon: <DollarSign className="h-4 w-4" />, label: "Salario", value: raioX?.salario_de ? (raioX.salario_ate ? `R$ ${raioX.salario_de} a R$ ${raioX.salario_ate}` : `R$ ${raioX.salario_de}`) : undefined },
    { icon: <BookOpen className="h-4 w-4" />, label: "Escolaridade", value: raioX?.escolaridade },
    { icon: <DollarSign className="h-4 w-4" />, label: "Taxa", value: raioX?.taxa_inscricao },
    { icon: <CalendarDays className="h-4 w-4" />, label: "Data da Prova", value: raioX?.data_prova },
    { icon: <CalendarDays className="h-4 w-4" />, label: "Inscricoes", value: raioX?.inscricao_inicio ? `${raioX.inscricao_inicio} a ${raioX.inscricao_fim || "?"}` : undefined },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {cards.filter(c => c.value).map((card, i) => (
          <div key={i} className="rounded-lg border bg-muted/30 p-3 flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2 text-primary shrink-0">{card.icon}</div>
            <div>
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <p className="text-sm font-semibold text-foreground">{card.value}</p>
            </div>
          </div>
        ))}
      </div>
      {raioX?.etapas?.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-semibold flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5 text-primary" /> Etapas</h4>
          <div className="flex flex-wrap gap-2">
            {raioX.etapas.map((e: string, i: number) => (
              <Badge key={i} variant="secondary" className="text-xs">{e}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Conteudo Section ─── */
function ConteudoSection({ materias, onNavigateSimulado }: { materias: any[]; onNavigateSimulado: (nome: string) => void }) {
  if (!materias.length) return <p className="text-sm text-muted-foreground py-4">Nenhuma materia encontrada.</p>;

  return (
    <Accordion type="multiple" className="space-y-2">
      {materias.map((materia, idx) => (
        <AccordionItem key={idx} value={`mat-${idx}`} className="border rounded-lg px-4">
          <AccordionTrigger className="py-3 hover:no-underline">
            <div className="flex items-center gap-2 text-left">
              <BookOpen className="h-4 w-4 text-primary shrink-0" />
              <span className="font-semibold">{materia.nome}</span>
              {materia.tipo && (
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                  {materia.tipo === "basico" ? "Basico" : "Especifico"}
                </Badge>
              )}
            </div>
          </AccordionTrigger>
          <AccordionContent className="pb-4 space-y-4">
            <div className="space-y-1">
              <h4 className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                <BookOpen className="h-3.5 w-3.5" /> Sobre a materia
              </h4>
              <p className="text-sm text-muted-foreground leading-relaxed">{materia.explicacao}</p>
            </div>

            {materia.conteudos_principais?.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                  <CheckSquare className="h-3.5 w-3.5" /> Checklist ({materia.conteudos_principais.length})
                </h4>
                <ul className="grid gap-1 text-sm">
                  {materia.conteudos_principais.map((c: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground">
                      <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" /> {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {materia.resumo_detalhado && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                  <ScrollText className="h-3.5 w-3.5" /> Resumo Completo
                </h4>
                <div className="rounded-lg bg-primary/5 border border-primary/10 p-4 text-sm text-foreground leading-relaxed whitespace-pre-line">
                  {materia.resumo_detalhado}
                </div>
              </div>
            )}

            {materia.exemplos?.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                  <GraduationCap className="h-3.5 w-3.5" /> Exemplos
                </h4>
                {materia.exemplos.map((ex: any, i: number) => (
                  <div key={i} className="rounded-md bg-muted/50 p-3 text-sm">
                    <p className="font-medium text-foreground text-xs mb-1">{ex.topico}</p>
                    <p className="text-muted-foreground">{ex.exemplo}</p>
                  </div>
                ))}
              </div>
            )}

            {materia.dicas_prova?.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-sm font-semibold flex items-center gap-1.5 text-amber-500">
                  <Lightbulb className="h-3.5 w-3.5" /> Dicas de Prova
                </h4>
                <ul className="space-y-1 text-sm">
                  {materia.dicas_prova.map((d: string, i: number) => (
                    <li key={i} className="flex items-start gap-2 text-muted-foreground">
                      <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" /> {d}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {materia.estrategia_estudo && (
              <div className="space-y-1">
                <h4 className="text-sm font-semibold flex items-center gap-1.5 text-green-600">
                  <Target className="h-3.5 w-3.5" /> Estrategia de Estudo
                </h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{materia.estrategia_estudo}</p>
              </div>
            )}

            <Button size="sm" className="gap-1.5 w-full sm:w-auto" onClick={() => onNavigateSimulado(materia.nome)}>
              <Play className="h-3.5 w-3.5" /> Treinar essa materia
            </Button>
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
}

/* ─── Macetes Section ─── */
function MacetesSection({ materias }: { materias: any[] }) {
  const materiasComMacetes = materias.filter(m => m.macetes?.length > 0);
  if (!materiasComMacetes.length) return <p className="text-sm text-muted-foreground py-4">Nenhum macete disponivel.</p>;

  return (
    <div className="space-y-4">
      {materiasComMacetes.map((materia, idx) => (
        <div key={idx} className="space-y-2">
          <h3 className="text-sm font-semibold flex items-center gap-2 text-foreground">
            <Brain className="h-4 w-4 text-purple-500" />
            {materia.nome}
          </h3>
          <div className="space-y-2">
            {materia.macetes.map((macete: string, i: number) => (
              <div key={i} className="rounded-md bg-purple-500/5 border border-purple-500/10 p-3 text-sm flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                <span className="text-foreground">{macete}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Cronograma Section (Estudo Reverso) ─── */
function CronogramaSection({ cronograma }: { cronograma?: any }) {
  if (!cronograma?.dias?.length) {
    return <p className="text-sm text-muted-foreground py-4">Cronograma nao disponivel.</p>;
  }

  const { regras, dias, como_executar, regras_importantes } = cronograma;
  const totalDiasEstudo = regras?.total_dias_estudo || 30;
  const cicloDias = regras?.ciclo_dias || 10;
  const ciclosCompletos = regras?.ciclos_completos || Math.floor(totalDiasEstudo / cicloDias);
  const diasRestantes = regras?.dias_restantes || totalDiasEstudo % cicloDias;
  const dataInicio = regras?.data_inicio ? new Date(regras.data_inicio) : new Date();
  const dataProvaStr = regras?.data_prova;

  // Expand cycle into full schedule with real dates
  const fullDias: { dia: number; realDate: Date; titulo: string; tipo: string; blocos: any[] }[] = [];
  let dayCounter = 0;
  for (let ciclo = 0; ciclo < ciclosCompletos; ciclo++) {
    for (const diaBase of dias) {
      if (dayCounter >= totalDiasEstudo) break;
      fullDias.push({
        dia: dayCounter + 1,
        realDate: addDays(dataInicio, dayCounter),
        titulo: diaBase.titulo,
        tipo: diaBase.tipo,
        blocos: diaBase.blocos || [],
      });
      dayCounter++;
    }
  }
  // Remaining days
  for (let r = 0; r < diasRestantes && dayCounter < totalDiasEstudo; r++) {
    const diaBase = dias[r % dias.length];
    fullDias.push({
      dia: dayCounter + 1,
      realDate: addDays(dataInicio, dayCounter),
      titulo: diaBase.titulo,
      tipo: diaBase.tipo,
      blocos: diaBase.blocos || [],
    });
    dayCounter++;
  }

  const formatDateBR = (d: Date) => d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

  return (
    <div className="space-y-4">
      {/* Summary */}
      {regras && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-2">
          <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
            <Target className="h-4 w-4" /> Cronograma Personalizado - Estudo Reverso
          </h3>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <p>Total de dias: <span className="font-semibold text-foreground">{totalDiasEstudo} dias</span></p>
            <p>Blocos/dia: <span className="font-semibold text-foreground">{regras.blocos_por_dia || 4} x {regras.bloco_minutos || 40}min</span></p>
            <p>Total/dia: <span className="font-semibold text-foreground">{regras.total_dia || "2h40"}</span></p>
            <p>Ciclos: <span className="font-semibold text-foreground">{ciclosCompletos}x {cicloDias} dias{diasRestantes > 0 ? ` + ${diasRestantes}d` : ""}</span></p>
            <p>Meta/bloco: <span className="font-semibold text-foreground">{regras.meta_questoes_bloco || "20-30"} questoes</span></p>
            <p>Meta/dia: <span className="font-semibold text-foreground">{regras.meta_questoes_dia || "80-120"} questoes</span></p>
          </div>
          {dataProvaStr && (
            <p className="text-xs font-semibold text-primary flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              Inicio: {dataInicio.toLocaleDateString("pt-BR")} | Prova: {new Date(dataProvaStr).toLocaleDateString("pt-BR")}
            </p>
          )}
        </div>
      )}

      {/* Days */}
      <div className="space-y-3">
        {fullDias.map((dia) => {
          const isRevisao = dia.tipo === "revisao";
          const isSimulado = dia.tipo === "simulado";
          const borderColor = isSimulado ? "border-destructive/30" : isRevisao ? "border-amber-500/30" : "border-border";
          const bgColor = isSimulado ? "bg-destructive/5" : isRevisao ? "bg-amber-500/5" : "";

          return (
            <div key={dia.dia} className={`rounded-lg border ${borderColor} ${bgColor} p-3 space-y-2`}>
              <h4 className={`text-sm font-bold flex items-center gap-1.5 ${
                isSimulado ? "text-destructive" : isRevisao ? "text-amber-600" : "text-primary"
              }`}>
                <CalendarDays className="h-4 w-4" />
                DIA {dia.dia} - {formatDateBR(dia.realDate)}
                {dia.titulo && ` | ${dia.titulo}`}
              </h4>
              <div className="space-y-1.5">
                {dia.blocos?.map((bloco: any, i: number) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <Badge variant="outline" className="text-[10px] shrink-0 w-14 justify-center">40 min</Badge>
                    <span className="font-medium text-foreground">{bloco.materia}</span>
                    <span className="text-muted-foreground text-xs">({bloco.topico})</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* Execution tips */}
      {como_executar?.length > 0 && (
        <div className="rounded-lg bg-green-500/5 border border-green-500/20 p-3 space-y-1.5">
          <h4 className="text-sm font-semibold text-green-700 dark:text-green-400">Como executar cada bloco (40 min):</h4>
          {como_executar.map((r: string, i: number) => (
            <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
              <CheckCircle2 className="h-3 w-3 text-green-500 shrink-0" /> {r}
            </p>
          ))}
        </div>
      )}

      {regras_importantes?.length > 0 && (
        <div className="rounded-lg bg-destructive/5 border border-destructive/20 p-3 space-y-1.5">
          <h4 className="text-sm font-semibold text-destructive">Regras importantes:</h4>
          {regras_importantes.map((r: string, i: number) => (
            <p key={i} className="text-xs text-muted-foreground flex items-center gap-1.5">
              <AlertTriangle className="h-3 w-3 text-destructive shrink-0" /> {r}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Estudo Section (Espelho do Conteúdo com Progresso) ─── */
interface StudyProgress {
  checkedContent: Record<string, boolean>;
  checkedDays: Record<number, boolean>;
  notes: Record<string, string>;
  generalNote: string;
}

function getStorageKey(analysisId: string) {
  return `edital_estudo_${analysisId}`;
}

function loadProgress(analysisId: string): StudyProgress {
  try {
    const raw = localStorage.getItem(getStorageKey(analysisId));
    if (raw) return JSON.parse(raw);
  } catch {}
  return { checkedContent: {}, checkedDays: {}, notes: {}, generalNote: "" };
}

function saveProgress(analysisId: string, progress: StudyProgress) {
  localStorage.setItem(getStorageKey(analysisId), JSON.stringify(progress));
}

function EstudoSection({ analysisId, resultado }: { analysisId: string; resultado: AnalysisResult }) {
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
  const cronograma = resultado.cronograma_reverso;

  // Expand cycle into full schedule (same logic as CronogramaSection)
  const regras = cronograma?.regras;
  const baseDias = cronograma?.dias || [];
  const totalDiasEstudo = regras?.total_dias_estudo || baseDias.length;
  const cicloDias = regras?.ciclo_dias || baseDias.length;
  const ciclosCompletos = regras?.ciclos_completos || (cicloDias > 0 ? Math.floor(totalDiasEstudo / cicloDias) : 1);
  const diasRestantes = regras?.dias_restantes || (cicloDias > 0 ? totalDiasEstudo % cicloDias : 0);
  const dataInicio = regras?.data_inicio ? new Date(regras.data_inicio) : new Date();

  const fullDias: { dia: number; realDate: Date; titulo: string; tipo: string; blocos: any[] }[] = [];
  let dayCounter = 0;
  for (let ciclo = 0; ciclo < ciclosCompletos; ciclo++) {
    for (const diaBase of baseDias) {
      if (dayCounter >= totalDiasEstudo) break;
      fullDias.push({ dia: dayCounter + 1, realDate: addDays(dataInicio, dayCounter), titulo: diaBase.titulo, tipo: diaBase.tipo, blocos: diaBase.blocos || [] });
      dayCounter++;
    }
  }
  for (let r = 0; r < diasRestantes && dayCounter < totalDiasEstudo; r++) {
    const diaBase = baseDias[r % baseDias.length];
    fullDias.push({ dia: dayCounter + 1, realDate: addDays(dataInicio, dayCounter), titulo: diaBase.titulo, tipo: diaBase.tipo, blocos: diaBase.blocos || [] });
    dayCounter++;
  }

  const formatDateBR = (d: Date) => d.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });

  const totalContent = materias.reduce((acc, m) => acc + (m.conteudos_principais?.length || 0), 0);
  const checkedCount = Object.values(progress.checkedContent).filter(Boolean).length;
  const contentPct = totalContent > 0 ? Math.round((checkedCount / totalContent) * 100) : 0;

  const totalDays = fullDias.length;
  const checkedDaysCount = Object.values(progress.checkedDays).filter(Boolean).length;
  const daysPct = totalDays > 0 ? Math.round((checkedDaysCount / totalDays) * 100) : 0;

  const navigateToSimulado = (materiaNome: string) => {
    navigate(`/simulado?materia_nome=${encodeURIComponent(materiaNome)}`);
  };

  return (
    <div className="space-y-4">
      {/* Progress overview */}
      <div className="rounded-lg bg-primary/5 border border-primary/20 p-4 space-y-3">
        <h3 className="text-sm font-bold text-primary flex items-center gap-1.5">
          <PenLine className="h-4 w-4" /> Progresso de Estudo
        </h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Topicos estudados</p>
            <Progress value={contentPct} className="h-2" />
            <p className="text-xs font-semibold text-foreground">{checkedCount}/{totalContent} ({contentPct}%)</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Dias concluidos</p>
            <Progress value={daysPct} className="h-2" />
            <p className="text-xs font-semibold text-foreground">{checkedDaysCount}/{totalDays} ({daysPct}%)</p>
          </div>
        </div>
      </div>

      {/* Materias - mirror of Conteudo with checkboxes */}
      <Accordion type="multiple" className="space-y-2">
        {materias.map((materia, mIdx) => {
          const topicKeys = materia.conteudos_principais?.map((_: string, cIdx: number) => `${mIdx}-${cIdx}`) || [];
          const checkedTopics = topicKeys.filter((k: string) => progress.checkedContent[k]);
          const materiaPct = topicKeys.length > 0 ? Math.round((checkedTopics.length / topicKeys.length) * 100) : 0;
          const allChecked = topicKeys.length > 0 && checkedTopics.length === topicKeys.length;

          return (
            <AccordionItem key={mIdx} value={`estudo-${mIdx}`} className="border rounded-lg px-4">
              <AccordionTrigger className="py-3 hover:no-underline">
                <div className="flex items-center gap-2 text-left flex-1">
                  <BookOpen className="h-4 w-4 text-primary shrink-0" />
                  <span className="font-semibold">{materia.nome}</span>
                  {materia.tipo && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                      {materia.tipo === "basico" ? "Basico" : "Especifico"}
                    </Badge>
                  )}
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
              <AccordionContent className="pb-4 space-y-4">
                {/* Progress bar per matéria */}
                {topicKeys.length > 0 && (
                  <div className="space-y-1">
                    <Progress value={materiaPct} className="h-1.5" />
                    <p className="text-[10px] text-muted-foreground">{materiaPct}% concluido</p>
                  </div>
                )}

                {/* Sobre a matéria */}
                {materia.explicacao && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                      <BookOpen className="h-3.5 w-3.5" /> Sobre a materia
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{materia.explicacao}</p>
                  </div>
                )}

                {/* Topics checklist with notes */}
                {materia.conteudos_principais?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                      <CheckSquare className="h-3.5 w-3.5" /> Topicos para estudar ({materia.conteudos_principais.length})
                    </h4>
                    {materia.conteudos_principais.map((conteudo: string, cIdx: number) => {
                      const key = `${mIdx}-${cIdx}`;
                      const checked = !!progress.checkedContent[key];
                      return (
                        <div key={cIdx} className={`rounded-md border p-3 transition-colors ${
                          checked ? "bg-primary/5 border-primary/20" : "border-border"
                        }`}>
                          <div className="flex items-start gap-3">
                            <Checkbox
                              checked={checked}
                              onCheckedChange={() => toggleContent(key)}
                              className="mt-0.5"
                            />
                            <div className="flex-1 min-w-0">
                              <p className={`text-sm ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                                {conteudo}
                              </p>
                            </div>
                            {checked && (
                              <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Resumo detalhado */}
                {materia.resumo_detalhado && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                      <ScrollText className="h-3.5 w-3.5" /> Resumo Completo
                    </h4>
                    <div className="rounded-lg bg-primary/5 border border-primary/10 p-4 text-sm text-foreground leading-relaxed whitespace-pre-line">
                      {materia.resumo_detalhado}
                    </div>
                  </div>
                )}

                {/* Exemplos */}
                {materia.exemplos?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                      <GraduationCap className="h-3.5 w-3.5" /> Exemplos
                    </h4>
                    {materia.exemplos.map((ex: any, i: number) => (
                      <div key={i} className="rounded-md bg-muted/50 p-3 text-sm">
                        <p className="font-medium text-foreground text-xs mb-1">{ex.topico}</p>
                        <p className="text-muted-foreground">{ex.exemplo}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Dicas */}
                {materia.dicas_prova?.length > 0 && (
                  <div className="space-y-1.5">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5 text-amber-500">
                      <Lightbulb className="h-3.5 w-3.5" /> Dicas de Prova
                    </h4>
                    <ul className="space-y-1 text-sm">
                      {materia.dicas_prova.map((d: string, i: number) => (
                        <li key={i} className="flex items-start gap-2 text-muted-foreground">
                          <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" /> {d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Macetes da matéria */}
                {materia.macetes?.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5 text-purple-500">
                      <Sparkles className="h-3.5 w-3.5" /> Macetes
                    </h4>
                    {materia.macetes.map((macete: string, i: number) => (
                      <div key={i} className="rounded-md bg-purple-500/5 border border-purple-500/10 p-3 text-sm flex items-start gap-2">
                        <Sparkles className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                        <span className="text-foreground">{macete}</span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Estratégia */}
                {materia.estrategia_estudo && (
                  <div className="space-y-1">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5 text-green-600">
                      <Target className="h-3.5 w-3.5" /> Estrategia de Estudo
                    </h4>
                    <p className="text-sm text-muted-foreground leading-relaxed">{materia.estrategia_estudo}</p>
                  </div>
                )}


                {/* Treinar button */}
                <Button size="sm" className="gap-1.5 w-full sm:w-auto" onClick={() => navigateToSimulado(materia.nome)}>
                  <Play className="h-3.5 w-3.5" /> Treinar essa materia
                </Button>
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Cronograma days checklist */}
      {fullDias.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            Dias do Cronograma
            <span className="text-xs text-muted-foreground font-normal">({checkedDaysCount}/{totalDays} concluidos)</span>
          </h3>
          <div className="space-y-2">
            {fullDias.map((dia) => {
              const checked = !!progress.checkedDays[dia.dia];
              return (
                <div key={dia.dia} className={`flex items-start gap-3 rounded-md border p-3 transition-colors ${
                  checked ? "bg-primary/5 border-primary/20" : "border-border"
                }`}>
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(val) => {
                      update(p => ({ ...p, checkedDays: { ...p.checkedDays, [dia.dia]: !!val } }));
                    }}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${checked ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      DIA {dia.dia} - {formatDateBR(dia.realDate)} {dia.titulo && `| ${dia.titulo}`}
                    </p>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {dia.blocos?.map((bloco: any, bIdx: number) => (
                        <Badge key={bIdx} variant={checked ? "secondary" : "outline"} className="text-[10px]">
                          {bloco.materia} ({bloco.topico})
                        </Badge>
                      ))}
                    </div>
                  </div>
                  {checked && (
                    <Badge className="bg-primary/10 text-primary text-[10px] shrink-0">
                      <CheckCircle2 className="h-3 w-3 mr-0.5" /> Concluido
                    </Badge>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}