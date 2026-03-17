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
import {
  Upload, FileText, Lock, Crown, Loader2, BookOpen, Target,
  Lightbulb, GraduationCap, AlertTriangle, ChevronDown, ChevronUp,
  Play, RefreshCw, Trash2, Clock, Download, Briefcase, Filter,
  Database, CheckCircle2, StopCircle, Brain, Sparkles, ScrollText
} from "lucide-react";
import { generateEditalPdf } from "@/lib/editalPdf";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

interface MateriaResult {
  nome: string;
  explicacao: string;
  conteudos_principais: string[];
  resumo_detalhado?: string;
  macetes?: string[];
  exemplos: { topico: string; exemplo: string }[];
  dicas_prova: string[];
  estrategia_estudo: string;
  cargos_aplicaveis?: string[];
}

interface AnalysisResult {
  cargos?: string[];
  materias: MateriaResult[];
  info_concurso?: {
    nome?: string;
    banca?: string;
    cargo?: string;
    total_materias?: number;
  };
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
}

export default function AnalisarEdital() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isFreePlan = !profile?.plano || profile.plano === "free";

  const [uploading, setUploading] = useState(false);
  const [analyses, setAnalyses] = useState<EditalAnalysis[]>([]);
  const [loadingAnalyses, setLoadingAnalyses] = useState(true);
  const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);

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

  useEffect(() => {
    fetchAnalyses();
  }, [fetchAnalyses]);

  useEffect(() => {
    const processing = analyses.some(a => a.status === "processando" || a.status === "pendente");
    if (!processing) return;
    const interval = setInterval(fetchAnalyses, 5000);
    return () => clearInterval(interval);
  }, [analyses, fetchAnalyses]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";

    if (file.type !== "application/pdf") {
      toast({ title: "Formato inválido", description: "Envie apenas arquivos PDF.", variant: "destructive" });
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast({ title: "Arquivo muito grande", description: "O tamanho máximo é 10MB.", variant: "destructive" });
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

      toast({ title: "Edital enviado!", description: "A análise detalhada será iniciada em instantes." });
      fetchAnalyses();

      supabase.functions.invoke("analyze-edital", {
        body: { analysis_id: (analysisRow as any).id },
      }).catch(err => {
        console.error("Error invoking analyze-edital:", err);
      });

    } catch (err: any) {
      console.error("Upload error:", err);
      toast({ title: "Erro no upload", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const analysis = analyses.find(a => a.id === id);
    if (!analysis) return;
    setAnalyses(prev => prev.filter(a => a.id !== id));
    await supabase.storage.from("editais").remove([analysis.storage_path]);
    await supabase.from("edital_analyses").delete().eq("id", id);
    toast({ title: "Análise cancelada e removida" });
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
                <h2 className="text-2xl font-bold mb-2">Analisar Edital com IA</h2>
                <p className="text-muted-foreground max-w-md">
                  Essa função está disponível apenas para planos pagos. Envie seu edital e receba um guia de estudo completo com resumos detalhados, macetes e estratégias.
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
            Analisar Edital com IA
          </h1>
          <p className="text-muted-foreground mt-1">
            Envie o PDF do edital e receba um guia de estudo completo com resumos detalhados, macetes de memorização e estratégias por cargo.
          </p>
        </div>

        {/* How it works */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          {[
            { icon: Upload, label: "1. Envie o PDF", desc: "Upload do edital" },
            { icon: Briefcase, label: "2. Cargos", desc: "IA identifica os cargos" },
            { icon: ScrollText, label: "3. Resumo", desc: "Conteúdo destrinchado" },
            { icon: Brain, label: "4. Macetes", desc: "Dicas de memorização" },
          ].map((step, i) => (
            <div key={i} className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 px-3 py-2">
              <step.icon className="h-4 w-4 text-primary shrink-0" />
              <div>
                <p className="text-xs font-semibold text-foreground">{step.label}</p>
                <p className="text-[10px] text-muted-foreground">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>

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
                      <p className="font-semibold text-foreground">Enviar edital (PDF)</p>
                      <p className="text-sm text-muted-foreground">Tamanho máximo: 10MB</p>
                    </div>
                  </div>
                )}
              </div>
              <input
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={handleUpload}
                disabled={uploading}
              />
            </label>
          </CardContent>
        </Card>

        {loadingAnalyses ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : analyses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhum edital analisado ainda. Envie seu primeiro edital acima!</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {analyses.map((analysis) => (
              <AnalysisCard
                key={analysis.id}
                analysis={analysis}
                isActive={activeAnalysis === analysis.id}
                onToggle={() => setActiveAnalysis(activeAnalysis === analysis.id ? null : analysis.id)}
                onDelete={() => handleDelete(analysis.id)}
                onRetry={async () => {
                  await supabase.from("edital_analyses").update({ status: "pendente", erro_detalhes: null } as any).eq("id", analysis.id);
                  supabase.functions.invoke("analyze-edital", { body: { analysis_id: analysis.id } });
                  fetchAnalyses();
                  toast({ title: "Reprocessando edital..." });
                }}
                onNavigateSimulado={navigateToSimulado}
                onDownloadPdf={async (filteredResult: AnalysisResult) => {
                  await generateEditalPdf(filteredResult, analysis.file_name);
                  toast({ title: "PDF gerado!", description: "O download começará automaticamente." });
                }}
              />
            ))}
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}

function ProcessingProgress({ startedAt }: { startedAt: string }) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt]);

  const steps = [
    { label: "Baixando edital", threshold: 0 },
    { label: "Lendo conteúdo do PDF", threshold: 5 },
    { label: "Identificando cargos e matérias", threshold: 15 },
    { label: "Extraindo conteúdo programático", threshold: 30 },
    { label: "Resumindo cada matéria em detalhes", threshold: 50 },
    { label: "Gerando macetes e dicas de memorização", threshold: 80 },
    { label: "Criando estratégias de estudo", threshold: 110 },
    { label: "Finalizando guia de estudo", threshold: 140 },
  ];

  const currentStep = [...steps].reverse().find(s => elapsed >= s.threshold) || steps[0];
  const progressPct = Math.min(95, Math.round((elapsed / 180) * 100));

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
  };

  return (
    <div className="px-5 py-8 space-y-4">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-foreground font-medium">{currentStep.label}...</p>
        <p className="text-xs text-muted-foreground">Tempo decorrido: {formatTime(elapsed)}</p>
      </div>
      <Progress value={progressPct} className="max-w-xs mx-auto" />
      <div className="flex justify-center gap-1">
        {steps.map((step, i) => (
          <div
            key={i}
            className={`h-1.5 w-1.5 rounded-full transition-colors ${
              elapsed >= step.threshold ? "bg-primary" : "bg-muted"
            }`}
          />
        ))}
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Análises detalhadas podem levar até 3 minutos — estamos resumindo cada matéria em profundidade
      </p>
    </div>
  );
}

function AnalysisCard({
  analysis, isActive, onToggle, onDelete, onRetry, onNavigateSimulado, onDownloadPdf,
}: {
  analysis: EditalAnalysis;
  isActive: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onRetry: () => void;
  onNavigateSimulado: (nome: string) => void;
  onDownloadPdf: (filteredResult: AnalysisResult) => void;
}) {
  const [selectedCargo, setSelectedCargo] = useState<string | null>(null);
  const [pipelineStatus, setPipelineStatus] = useState<"checking" | "processing" | "done" | "none">("checking");

  useEffect(() => {
    if (analysis.status !== "concluido") {
      setPipelineStatus("none");
      return;
    }
    let cancelled = false;
    const checkPipeline = async () => {
      const { data } = await supabase
        .from("pdf_imports")
        .select("id, status_processamento")
        .eq("uploaded_by", analysis.user_id || "")
        .ilike("nome_arquivo", `%edital%${analysis.id.slice(0, 8)}%`)
        .limit(1);
      
      const { data: data2 } = await supabase
        .from("pdf_imports")
        .select("id, status_processamento")
        .ilike("storage_path", `%edital_${analysis.id}%`)
        .limit(1);
      
      const record = data?.[0] || data2?.[0];
      if (cancelled) return;
      
      if (!record) {
        setPipelineStatus("none");
      } else if (record.status_processamento === "concluido") {
        setPipelineStatus("done");
      } else {
        setPipelineStatus("processing");
      }
    };
    checkPipeline();
    const interval = setInterval(checkPipeline, 8000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [analysis.id, analysis.status]);

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pendente: { label: "Aguardando", color: "bg-muted text-muted-foreground", icon: <Clock className="h-3.5 w-3.5" /> },
    processando: { label: "Analisando...", color: "bg-primary/10 text-primary", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
    concluido: { label: "Concluído", color: "bg-green-500/10 text-green-600", icon: <BookOpen className="h-3.5 w-3.5" /> },
    erro: { label: "Erro", color: "bg-destructive/10 text-destructive", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  };

  const status = statusConfig[analysis.status] || statusConfig.pendente;
  const resultado = analysis.resultado as AnalysisResult | null;

  const cargos = resultado?.cargos || [];
  const hasCargos = cargos.length > 1;

  const filteredMaterias = resultado?.materias?.filter(mat => {
    if (!selectedCargo) return true;
    if (!mat.cargos_aplicaveis || mat.cargos_aplicaveis.length === 0) return true;
    return mat.cargos_aplicaveis.includes(selectedCargo);
  }) || [];

  const filteredResult: AnalysisResult = {
    ...resultado!,
    materias: filteredMaterias,
  };

  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full text-left px-5 py-4 flex items-center justify-between gap-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-3 min-w-0">
          <FileText className="h-5 w-5 text-primary shrink-0" />
          <div className="min-w-0">
            <p className="font-medium truncate">{analysis.file_name}</p>
            <p className="text-xs text-muted-foreground">
              {new Date(analysis.created_at).toLocaleDateString("pt-BR")}
              {resultado?.info_concurso?.nome && ` • ${resultado.info_concurso.nome}`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className={`${status.color} gap-1 text-xs`}>
            {status.icon}
            {status.label}
          </Badge>
          {isActive ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {isActive && (
        <div className="border-t">
          {(analysis.status === "processando" || analysis.status === "pendente") && (
            <div className="space-y-0">
              <ProcessingProgress startedAt={analysis.created_at} />
              <div className="flex justify-center gap-2 px-5 pb-5">
                <Button size="sm" variant="outline" onClick={onDelete} className="gap-1.5 text-destructive border-destructive/30 hover:bg-destructive/10">
                  <StopCircle className="h-3.5 w-3.5" /> Cancelar e excluir
                </Button>
              </div>
            </div>
          )}

          {analysis.status === "erro" && (
            <div className="px-5 py-6 space-y-3">
              <div className="flex items-start gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                <p className="text-sm">{analysis.erro_detalhes || "Erro desconhecido ao processar o edital."}</p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={onRetry} className="gap-1.5">
                  <RefreshCw className="h-3.5 w-3.5" /> Tentar novamente
                </Button>
                <Button size="sm" variant="ghost" onClick={onDelete} className="gap-1.5 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" /> Remover
                </Button>
              </div>
            </div>
          )}

          {analysis.status === "concluido" && resultado && (
            <div className="px-5 py-5 space-y-4">
              {/* Concurso Info */}
              {resultado.info_concurso && (
                <div className="rounded-lg bg-primary/5 p-4 space-y-1">
                  {resultado.info_concurso.nome && (
                    <p className="font-semibold text-foreground">{resultado.info_concurso.nome}</p>
                  )}
                  <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                    {resultado.info_concurso.banca && <span>Banca: <strong className="text-foreground">{resultado.info_concurso.banca}</strong></span>}
                    {hasCargos && <span>• {cargos.length} cargos identificados</span>}
                    {filteredMaterias.length > 0 && <span>• {filteredMaterias.length} matérias{selectedCargo ? ` para ${selectedCargo}` : ""}</span>}
                  </div>
                </div>
              )}

              {/* Cargo Selector */}
              {hasCargos && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <Briefcase className="h-4 w-4 text-primary" />
                    <h3 className="font-semibold text-sm text-foreground">Selecione o cargo desejado</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Filtre as matérias pelo cargo que você vai prestar. O PDF gerado conterá apenas as matérias do cargo selecionado.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedCargo(null)}
                      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${
                        !selectedCargo
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                      }`}
                    >
                      <Filter className="h-3 w-3" />
                      Todos os cargos
                    </button>
                    {cargos.map((cargo) => {
                      const materiaCount = resultado.materias?.filter(m =>
                        !m.cargos_aplicaveis || m.cargos_aplicaveis.length === 0 || m.cargos_aplicaveis.includes(cargo)
                      ).length || 0;

                      return (
                        <button
                          key={cargo}
                          onClick={() => setSelectedCargo(selectedCargo === cargo ? null : cargo)}
                          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors border ${
                            selectedCargo === cargo
                              ? "bg-primary text-primary-foreground border-primary"
                              : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground"
                          }`}
                        >
                          <Briefcase className="h-3 w-3" />
                          {cargo}
                          <span className="opacity-70">({materiaCount})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Materias */}
              {filteredMaterias.length === 0 ? (
                <div className="py-6 text-center text-muted-foreground text-sm">
                  Nenhuma matéria encontrada para o cargo selecionado.
                </div>
              ) : (
                <Accordion type="multiple" className="space-y-2">
                  {filteredMaterias.map((materia, idx) => (
                    <AccordionItem key={idx} value={`mat-${idx}`} className="border rounded-lg px-4">
                      <AccordionTrigger className="py-3 hover:no-underline">
                        <div className="flex items-center gap-2 text-left">
                          <BookOpen className="h-4 w-4 text-primary shrink-0" />
                          <span className="font-semibold">{materia.nome}</span>
                          {materia.cargos_aplicaveis && materia.cargos_aplicaveis.length > 0 && materia.cargos_aplicaveis.length < cargos.length && (
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                              {materia.cargos_aplicaveis.length === 1 ? "específica" : `${materia.cargos_aplicaveis.length} cargos`}
                            </Badge>
                          )}
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="pb-4 space-y-4">
                        {/* Cargos aplicáveis */}
                        {!selectedCargo && materia.cargos_aplicaveis && materia.cargos_aplicaveis.length > 0 && materia.cargos_aplicaveis.length < cargos.length && (
                          <div className="flex flex-wrap gap-1">
                            {materia.cargos_aplicaveis.map((c) => (
                              <Badge key={c} variant="secondary" className="text-[10px]">
                                {c}
                              </Badge>
                            ))}
                          </div>
                        )}

                        {/* Explicação */}
                        <div className="space-y-1">
                          <h4 className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                            <BookOpen className="h-3.5 w-3.5" /> Sobre a matéria
                          </h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">{materia.explicacao}</p>
                        </div>

                        {/* Conteúdos Principais */}
                        {materia.conteudos_principais?.length > 0 && (
                          <div className="space-y-1.5">
                            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                              <Target className="h-3.5 w-3.5" /> Conteúdos do Edital ({materia.conteudos_principais.length} itens)
                            </h4>
                            <ul className="grid gap-1 text-sm">
                              {materia.conteudos_principais.map((c, i) => (
                                <li key={i} className="flex items-start gap-2 text-muted-foreground">
                                  <span className="text-primary mt-1">•</span> {c}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Resumo Detalhado */}
                        {materia.resumo_detalhado && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                              <ScrollText className="h-3.5 w-3.5" /> Resumo Completo para Estudo
                            </h4>
                            <div className="rounded-lg bg-primary/5 border border-primary/10 p-4 text-sm text-foreground leading-relaxed whitespace-pre-line">
                              {materia.resumo_detalhado}
                            </div>
                          </div>
                        )}

                        {/* Macetes */}
                        {materia.macetes && materia.macetes.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-purple-500">
                              <Brain className="h-3.5 w-3.5" /> Macetes de Memorização
                            </h4>
                            <div className="space-y-2">
                              {materia.macetes.map((macete, i) => (
                                <div key={i} className="rounded-md bg-purple-500/5 border border-purple-500/10 p-3 text-sm flex items-start gap-2">
                                  <Sparkles className="h-4 w-4 text-purple-500 shrink-0 mt-0.5" />
                                  <span className="text-foreground">{macete}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Exemplos */}
                        {materia.exemplos?.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                              <GraduationCap className="h-3.5 w-3.5" /> Exemplos de Questões
                            </h4>
                            <div className="space-y-2">
                              {materia.exemplos.map((ex, i) => (
                                <div key={i} className="rounded-md bg-muted/50 p-3 text-sm">
                                  <p className="font-medium text-foreground text-xs mb-1">{ex.topico}</p>
                                  <p className="text-muted-foreground">{ex.exemplo}</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Dicas */}
                        {materia.dicas_prova?.length > 0 && (
                          <div className="space-y-1.5">
                            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-amber-500">
                              <Lightbulb className="h-3.5 w-3.5" /> Dicas de Prova
                            </h4>
                            <ul className="space-y-1 text-sm">
                              {materia.dicas_prova.map((d, i) => (
                                <li key={i} className="flex items-start gap-2 text-muted-foreground">
                                  <Lightbulb className="h-3.5 w-3.5 text-amber-500 shrink-0 mt-0.5" /> {d}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Estratégia */}
                        {materia.estrategia_estudo && (
                          <div className="space-y-1">
                            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-green-600">
                              <GraduationCap className="h-3.5 w-3.5" /> Estratégia de Estudo
                            </h4>
                            <p className="text-sm text-muted-foreground leading-relaxed">{materia.estrategia_estudo}</p>
                          </div>
                        )}

                        {/* CTA Simulado */}
                        <Button
                          size="sm"
                          className="gap-1.5 w-full sm:w-auto"
                          onClick={() => onNavigateSimulado(materia.nome)}
                        >
                          <Play className="h-3.5 w-3.5" />
                          Treinar essa matéria agora
                        </Button>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              )}

              {/* Pipeline indicator */}
              {pipelineStatus !== "none" && pipelineStatus !== "checking" && (
                <div className={`rounded-lg p-3 flex items-center gap-3 text-sm ${
                  pipelineStatus === "done" 
                    ? "bg-green-500/10 text-green-700 dark:text-green-400" 
                    : "bg-blue-500/10 text-blue-700 dark:text-blue-400"
                }`}>
                  {pipelineStatus === "processing" ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                      <div>
                        <p className="font-medium">Extraindo questões do edital...</p>
                        <p className="text-xs opacity-80">O edital está sendo processado para alimentar o banco de questões automaticamente.</p>
                      </div>
                      <Database className="h-5 w-5 shrink-0 opacity-60" />
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <div>
                        <p className="font-medium">Questões extraídas com sucesso!</p>
                        <p className="text-xs opacity-80">As questões deste edital já foram adicionadas ao banco de questões.</p>
                      </div>
                      <Database className="h-5 w-5 shrink-0 opacity-60" />
                    </>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => onDownloadPdf(filteredResult)} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Baixar guia de estudo em PDF{selectedCargo ? ` (${selectedCargo})` : ""}
                </Button>
                <Button size="sm" variant="ghost" onClick={onDelete} className="gap-1.5 text-destructive">
                  <Trash2 className="h-3.5 w-3.5" /> Remover análise
                </Button>
              </div>
            </div>
          )}

          {analysis.status === "pendente" && (
            <div className="px-5 py-8 text-center space-y-2">
              <Clock className="h-8 w-8 text-muted-foreground mx-auto" />
              <p className="text-muted-foreground">Aguardando processamento...</p>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}
