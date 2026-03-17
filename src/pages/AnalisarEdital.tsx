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
  Database, CheckCircle2
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

      toast({ title: "Edital enviado!", description: "A análise será iniciada em instantes." });
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
    
    await supabase.storage.from("editais").remove([analysis.file_name]);
    await supabase.from("edital_analyses").delete().eq("id", id);
    setAnalyses(prev => prev.filter(a => a.id !== id));
    toast({ title: "Análise removida" });
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
                  Essa função está disponível apenas para planos pagos. Envie seu edital e receba um resumo completo com matérias, dicas e estratégias de estudo.
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
            Envie o PDF do edital e receba um resumo inteligente com matérias, dicas e estratégias.
          </p>
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

  const statusConfig: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
    pendente: { label: "Aguardando", color: "bg-muted text-muted-foreground", icon: <Clock className="h-3.5 w-3.5" /> },
    processando: { label: "Analisando...", color: "bg-primary/10 text-primary", icon: <Loader2 className="h-3.5 w-3.5 animate-spin" /> },
    concluido: { label: "Concluído", color: "bg-green-500/10 text-green-600", icon: <BookOpen className="h-3.5 w-3.5" /> },
    erro: { label: "Erro", color: "bg-destructive/10 text-destructive", icon: <AlertTriangle className="h-3.5 w-3.5" /> },
  };

  const status = statusConfig[analysis.status] || statusConfig.pendente;
  const resultado = analysis.resultado as AnalysisResult | null;

  // Extract cargos list
  const cargos = resultado?.cargos || [];
  const hasCargos = cargos.length > 1;

  // Filter materias by selected cargo
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
          {analysis.status === "processando" && (
            <div className="px-5 py-8 text-center space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-muted-foreground font-medium">Analisando edital… isso pode levar alguns segundos</p>
              <Progress value={undefined} className="max-w-xs mx-auto" />
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
                    Filtre as matérias pelo cargo que você vai prestar. Se não selecionar, todas as matérias serão exibidas.
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
                              <Target className="h-3.5 w-3.5" /> Conteúdos Principais
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

                        {/* Exemplos */}
                        {materia.exemplos?.length > 0 && (
                          <div className="space-y-2">
                            <h4 className="text-sm font-semibold flex items-center gap-1.5 text-primary">
                              <GraduationCap className="h-3.5 w-3.5" /> Exemplos Práticos
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

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => onDownloadPdf(filteredResult)} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> Baixar resumo em PDF{selectedCargo ? ` (${selectedCargo})` : ""}
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
