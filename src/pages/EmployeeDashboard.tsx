import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { employeeService } from "@/services/employeeService";
import { pdfImportService } from "@/services/pdfImportService";
import { examRadarService } from "@/services/examRadarService";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Upload, FileText, Radar, DollarSign, CheckCircle, Clock, Briefcase,
  XCircle, AlertCircle, File, BookOpen, Brain, Send,
} from "lucide-react";
import type { ExamRadar } from "@/types/modules";

const NIVEIS = ["medio", "superior", "tecnico", "fundamental"];
const ESTADOS_BR = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA",
  "PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO","Nacional"
];

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: employee, isLoading: empLoading } = useQuery({
    queryKey: ["my-employee", user?.id],
    queryFn: () => employeeService.getEmployeeByUserId(user!.id),
    enabled: !!user,
  });

  const { data: summary } = useQuery({
    queryKey: ["my-tasks-summary", employee?.id],
    queryFn: () => employeeService.getTasksSummary(employee!.id),
    enabled: !!employee,
  });

  const { data: payments } = useQuery({
    queryKey: ["my-payments", employee?.id],
    queryFn: () => employeeService.listPayments(employee!.id),
    enabled: !!employee,
  });

  const { data: myPdfs } = useQuery({
    queryKey: ["my-pdfs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdf_imports")
        .select("id, nome_arquivo, status_processamento, created_at, tipo, ano, cargo, total_questoes_extraidas, erro_detalhes, gabarito_storage_path, storage_path")
        .eq("uploaded_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
    refetchInterval: 10000,
  });

  // Auto-inactivate expired exams on load
  useQuery({
    queryKey: ["auto-inactivate-exams"],
    queryFn: async () => {
      const { data } = await supabase.rpc("auto_inactivate_expired_exams");
      return data;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  if (empLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <main className="container mx-auto px-4 py-12 text-center">
          <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acesso Restrito</h1>
          <p className="text-muted-foreground">Você não está cadastrado como funcionário.</p>
        </main>
        <AppFooter />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container mx-auto px-4 py-6 space-y-6 max-w-5xl">
        <div>
          <h1 className="text-2xl font-bold font-['Space_Grotesk'] flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            Painel do Funcionário
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie seus envios e acompanhe seus pagamentos</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{summary?.count || 0}</p>
              <p className="text-xs text-muted-foreground">Tarefas Realizadas</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">R$ {Number(employee.valor_por_tarefa).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Valor por Tarefa</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-primary">R$ {(summary?.totalValue || 0).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Total Acumulado</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">
                {payments?.filter((p: any) => p.status_pagamento === "pendente").length || 0}
              </p>
              <p className="text-xs text-muted-foreground">Pagamentos Pendentes</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="upload" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="upload">Upload PDF</TabsTrigger>
            <TabsTrigger value="radar">Radar Concursos</TabsTrigger>
            <TabsTrigger value="historico">Meus Envios</TabsTrigger>
            <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="upload">
            <PdfUploadSection userId={user!.id} employeeId={employee.id} valorPorTarefa={Number(employee.valor_por_tarefa)} onSuccess={() => {
              queryClient.invalidateQueries({ queryKey: ["my-pdfs"] });
              queryClient.invalidateQueries({ queryKey: ["my-tasks-summary"] });
            }} />
          </TabsContent>

          <TabsContent value="radar">
            <ExamRadarSection employeeId={employee.id} valorPorTarefa={Number(employee.valor_por_tarefa)} onTaskCreated={() => {
              queryClient.invalidateQueries({ queryKey: ["my-tasks-summary"] });
            }} />
          </TabsContent>

          <TabsContent value="historico">
            <PdfHistorySection myPdfs={myPdfs} userId={user!.id} employeeId={employee.id} valorPorTarefa={Number(employee.valor_por_tarefa)} onConfirm={() => {
              queryClient.invalidateQueries({ queryKey: ["my-pdfs"] });
              queryClient.invalidateQueries({ queryKey: ["my-tasks-summary"] });
            }} />
          </TabsContent>

          <TabsContent value="pagamentos">
            <Card>
              <CardHeader><CardTitle className="text-base">Histórico de Pagamentos</CardTitle></CardHeader>
              <CardContent>
                {!payments?.length ? (
                  <p className="text-muted-foreground text-center py-4">Nenhum pagamento registrado</p>
                ) : (
                  <div className="space-y-2">
                    {payments.map((pay: any) => (
                      <div key={pay.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div>
                          <p className="text-sm font-semibold">{pay.mes_referencia}</p>
                          <p className="text-xs text-muted-foreground">R$ {Number(pay.valor_total).toFixed(2)}</p>
                        </div>
                        {pay.status_pagamento === "pago" ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle className="h-3 w-3" /> Pago
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="gap-1">
                            <Clock className="h-3 w-3" /> Pendente
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
      <AppFooter />
    </div>
  );
}

// =============================================
// PDF HISTORY SECTION WITH CONFIRM BUTTON
// =============================================
function PdfHistorySection({ myPdfs, userId, employeeId, valorPorTarefa, onConfirm }: {
  myPdfs: any[] | undefined; userId: string; employeeId: string; valorPorTarefa: number; onConfirm: () => void;
}) {
  const confirmMut = useMutation({
    mutationFn: async (pdfId: string) => {
      const { error } = await supabase
        .from("pdf_imports")
        .update({ status_processamento: "processando" } as any)
        .eq("id", pdfId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("PDF confirmado e enviado para processamento!");
      onConfirm();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      {myPdfs && myPdfs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <Card>
            <CardContent className="p-4 text-center">
              <FileText className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{myPdfs.length}</p>
              <p className="text-xs text-muted-foreground">Total Enviados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
              <p className="text-2xl font-bold">{myPdfs.filter((p: any) => p.status_processamento === "processado").length}</p>
              <p className="text-xs text-muted-foreground">Processados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
              <p className="text-2xl font-bold">{myPdfs.filter((p: any) => p.status_processamento === "pendente" || p.status_processamento === "processando").length}</p>
              <p className="text-xs text-muted-foreground">Pendentes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Brain className="h-5 w-5 mx-auto mb-1 text-primary" />
              <p className="text-2xl font-bold">{myPdfs.reduce((acc: number, p: any) => acc + (p.total_questoes_extraidas || 0), 0)}</p>
              <p className="text-xs text-muted-foreground">Questões Extraídas</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="space-y-3">
        {!myPdfs?.length ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
              Nenhum PDF enviado ainda. Use a aba "Upload PDF" para começar.
            </CardContent>
          </Card>
        ) : (
          myPdfs.map((pdf: any) => {
            const statusIcon = (s: string) => {
              if (s === "processado") return <CheckCircle className="h-4 w-4 text-green-500" />;
              if (s === "erro") return <XCircle className="h-4 w-4 text-destructive" />;
              if (s === "processando") return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
              return <Clock className="h-4 w-4 text-yellow-500" />;
            };

            return (
              <Card key={pdf.id}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <File className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{pdf.nome_arquivo}</p>
                        <p className="text-xs text-muted-foreground">
                          {pdf.tipo} · {pdf.ano || "—"} · {pdf.total_questoes_extraidas || 0} questões
                          {pdf.cargo && ` · ${pdf.cargo}`}
                          {pdf.gabarito_storage_path && " · 📋 Gabarito anexado"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Enviado em {new Date(pdf.created_at).toLocaleDateString("pt-BR")} às {new Date(pdf.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                        {pdf.erro_detalhes && pdf.status_processamento === "erro" && (
                          <p className="text-xs text-destructive mt-1 truncate max-w-[400px]" title={pdf.erro_detalhes}>
                            <AlertCircle className="h-3 w-3 inline mr-1" />
                            {pdf.erro_detalhes}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {pdf.status_processamento === "pendente" && (
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-1"
                          disabled={confirmMut.isPending}
                          onClick={() => confirmMut.mutate(pdf.id)}
                        >
                          <Send className="h-3 w-3" />
                          Confirmar Envio
                        </Button>
                      )}
                      {statusIcon(pdf.status_processamento)}
                      <Badge variant={
                        pdf.status_processamento === "processado" ? "default" :
                        pdf.status_processamento === "erro" ? "destructive" :
                        pdf.status_processamento === "processando" ? "secondary" :
                        "secondary"
                      }>
                        {pdf.status_processamento === "processado" ? "✅ Processado" :
                         pdf.status_processamento === "erro" ? "❌ Erro" :
                         pdf.status_processamento === "processando" ? "⏳ Processando..." :
                         "⏱️ Pendente"}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </>
  );
}

// =============================================
// PDF UPLOAD SECTION
// =============================================
function PdfUploadSection({ userId, employeeId, valorPorTarefa, onSuccess }: {
  userId: string; employeeId: string; valorPorTarefa: number; onSuccess: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [gabaritoFile, setGabaritoFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState("concurso");
  const [ano, setAno] = useState("");
  const [cargo, setCargo] = useState("");
  const [bancaId, setBancaId] = useState("");

  const { data: bancas } = useQuery({
    queryKey: ["bancas"],
    queryFn: async () => {
      const { data } = await supabase.from("bancas").select("id, nome").order("nome");
      return data || [];
    },
  });

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecione um arquivo PDF");
      const validation = pdfImportService.validateFile(file);
      if (!validation.valid) throw new Error(validation.error);

      const result = await pdfImportService.uploadPdf(
        file,
        {
          tipo: tipo as any,
          ano: ano ? parseInt(ano) : undefined,
          cargo: cargo || undefined,
          banca_id: bancaId || undefined,
        },
        userId
      );

      await employeeService.registerTask(employeeId, "upload_pdf", file.name, valorPorTarefa);

      if (gabaritoFile) {
        const gabValidation = pdfImportService.validateFile(gabaritoFile);
        if (gabValidation.valid) {
          const gabPath = `gabarito_${Date.now()}_${result.id}.pdf`;
          await supabase.storage.from("pdf-imports").upload(gabPath, gabaritoFile, { upsert: false });
          await supabase.from("pdf_imports").update({ gabarito_storage_path: gabPath }).eq("id", result.id);
          await employeeService.registerTask(employeeId, "upload_gabarito", gabaritoFile.name, valorPorTarefa);
        }
      }

      return result;
    },
    onSuccess: () => {
      toast.success("PDF enviado com sucesso!");
      setFile(null);
      setGabaritoFile(null);
      setAno("");
      setCargo("");
      setBancaId("");
      onSuccess();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Upload className="h-4 w-4" /> Enviar PDF de Prova
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Arquivo PDF da Prova *</Label>
            <Input type="file" accept=".pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <div className="space-y-2">
            <Label>Gabarito (opcional)</Label>
            <Input type="file" accept=".pdf" onChange={(e) => setGabaritoFile(e.target.files?.[0] || null)} />
          </div>
          <div className="space-y-2">
            <Label>Banca</Label>
            <Select value={bancaId} onValueChange={setBancaId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {bancas?.map((b: any) => (
                  <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Ano</Label>
            <Input type="number" placeholder="2024" value={ano} onChange={(e) => setAno(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cargo</Label>
            <Input placeholder="Ex: Soldado" value={cargo} onChange={(e) => setCargo(e.target.value)} />
          </div>
        </div>
        <Button onClick={() => uploadMut.mutate()} disabled={uploadMut.isPending || !file} className="gap-2">
          {uploadMut.isPending ? "Enviando..." : <><Upload className="h-4 w-4" /> Enviar PDF</>}
        </Button>
      </CardContent>
    </Card>
  );
}

// =============================================
// EXAM RADAR SECTION - with dates & remuneration
// =============================================
function ExamRadarSection({ employeeId, valorPorTarefa, onTaskCreated }: {
  employeeId: string; valorPorTarefa: number; onTaskCreated: () => void;
}) {
  const queryClient = useQueryClient();
  const emptyForm: Partial<ExamRadar> = {
    nome: "", orgao: "", estado: "", nivel: "medio", area: "",
    vagas: undefined, salario_de: undefined, salario_ate: undefined,
    banca_nome: "", link: "", edital_link: "", descricao: "", status: "ativo",
    inscricao_inicio: undefined, inscricao_ate: undefined, data_prova: undefined,
  };
  const [form, setForm] = useState<Partial<ExamRadar>>(emptyForm);
  const [showPreview, setShowPreview] = useState(false);

  const createMut = useMutation({
    mutationFn: async (data: Partial<ExamRadar>) => {
      const exam = await examRadarService.createExam(data);
      await employeeService.registerTask(employeeId, "cadastro_concurso", data.nome || "Concurso", valorPorTarefa);
      return exam;
    },
    onSuccess: () => {
      toast.success("Concurso cadastrado! Tarefa registrada para pagamento.");
      setForm(emptyForm);
      setShowPreview(false);
      queryClient.invalidateQueries({ queryKey: ["admin-exam-radar"] });
      onTaskCreated();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

  const handleReview = () => {
    if (!form.nome) return toast.error("Nome do concurso é obrigatório");
    if (!form.inscricao_ate) return toast.error("Data de fim das inscrições é obrigatória");
    setShowPreview(true);
  };

  const previewFields = [
    { label: "Nome", value: form.nome },
    { label: "Órgão", value: form.orgao },
    { label: "Estado", value: form.estado },
    { label: "Nível", value: form.nivel },
    { label: "Área", value: form.area },
    { label: "Banca", value: form.banca_nome },
    { label: "Vagas", value: form.vagas },
    { label: "Salário (de)", value: form.salario_de ? `R$ ${Number(form.salario_de).toFixed(2)}` : undefined },
    { label: "Início Inscrições", value: form.inscricao_inicio },
    { label: "Fim Inscrições", value: form.inscricao_ate },
    { label: "Data da Prova", value: form.data_prova },
    { label: "Link do Edital", value: form.edital_link },
    { label: "Descrição", value: form.descricao },
  ];

  if (showPreview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-primary" /> Confirme as informações antes de enviar
          </CardTitle>
          <p className="text-xs text-destructive font-medium">
            ⚠️ Verifique todos os dados cuidadosamente. Informações incorretas não serão remuneradas.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-lg border border-border bg-muted/50">
            {previewFields.map(({ label, value }) => (
              value ? (
                <div key={label}>
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="text-sm font-medium break-words">{String(value)}</p>
                </div>
              ) : null
            ))}
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => setShowPreview(false)} className="gap-1">
              ← Voltar e Editar
            </Button>
            <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending} className="gap-2">
              {createMut.isPending ? "Enviando..." : <><Send className="h-4 w-4" /> Confirmar e Cadastrar</>}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Radar className="h-4 w-4" /> Cadastrar Concurso no Radar
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Você recebe R$ {valorPorTarefa.toFixed(2)} por cada concurso cadastrado.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Nome do Concurso *</Label>
            <Input value={form.nome || ""} onChange={(e) => set("nome", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Órgão</Label>
            <Input value={form.orgao || ""} onChange={(e) => set("orgao", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Estado</Label>
            <Select value={form.estado || ""} onValueChange={(v) => set("estado", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {ESTADOS_BR.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Nível</Label>
            <Select value={form.nivel || "medio"} onValueChange={(v) => set("nivel", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {NIVEIS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Área</Label>
            <Input value={form.area || ""} onChange={(e) => set("area", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Banca</Label>
            <Input value={form.banca_nome || ""} onChange={(e) => set("banca_nome", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Vagas</Label>
            <Input type="number" value={form.vagas || ""} onChange={(e) => set("vagas", parseInt(e.target.value) || undefined)} />
          </div>
          <div className="space-y-2">
            <Label>Link do Edital</Label>
            <Input value={form.edital_link || ""} onChange={(e) => set("edital_link", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Início das Inscrições</Label>
            <Input type="date" value={form.inscricao_inicio || ""} onChange={(e) => set("inscricao_inicio", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Fim das Inscrições *</Label>
            <Input type="date" value={form.inscricao_ate || ""} onChange={(e) => set("inscricao_ate", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Data da Prova</Label>
            <Input type="date" value={form.data_prova || ""} onChange={(e) => set("data_prova", e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Salário (de)</Label>
            <Input type="number" placeholder="Ex: 3000" value={form.salario_de || ""} onChange={(e) => set("salario_de", parseFloat(e.target.value) || undefined)} />
          </div>
        </div>
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea value={form.descricao || ""} onChange={(e) => set("descricao", e.target.value)} rows={3} />
        </div>
        <Button onClick={handleReview} disabled={!form.nome} className="gap-2">
          <CheckCircle className="h-4 w-4" /> Revisar antes de Enviar
        </Button>
      </CardContent>
    </Card>
  );
}
