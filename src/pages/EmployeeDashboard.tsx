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

  // Get employee record
  const { data: employee, isLoading: empLoading } = useQuery({
    queryKey: ["my-employee", user?.id],
    queryFn: () => employeeService.getEmployeeByUserId(user!.id),
    enabled: !!user,
  });

  // Task summary
  const { data: summary } = useQuery({
    queryKey: ["my-tasks-summary", employee?.id],
    queryFn: () => employeeService.getTasksSummary(employee!.id),
    enabled: !!employee,
  });

  // Payments
  const { data: payments } = useQuery({
    queryKey: ["my-payments", employee?.id],
    queryFn: () => employeeService.listPayments(employee!.id),
    enabled: !!employee,
  });

  // My PDFs
  const { data: myPdfs } = useQuery({
    queryKey: ["my-pdfs", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pdf_imports")
        .select("id, nome_arquivo, status_processamento, created_at")
        .eq("uploaded_by", user!.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
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

        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{summary?.count || 0}</p>
              <p className="text-xs text-muted-foreground">PDFs Enviados</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">R$ {Number(employee.valor_por_tarefa).toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">Valor por PDF</p>
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
            <ExamRadarSection />
          </TabsContent>

          <TabsContent value="historico">
            <Card>
              <CardHeader><CardTitle className="text-base">Meus PDFs Enviados</CardTitle></CardHeader>
              <CardContent>
                {!myPdfs?.length ? (
                  <p className="text-muted-foreground text-center py-4">Nenhum PDF enviado ainda</p>
                ) : (
                  <div className="space-y-2">
                    {myPdfs.map((pdf: any) => (
                      <div key={pdf.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="text-sm font-medium">{pdf.nome_arquivo}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(pdf.created_at).toLocaleDateString("pt-BR")}
                            </p>
                          </div>
                        </div>
                        <Badge variant={
                          pdf.status_processamento === "processado" ? "default" :
                          pdf.status_processamento === "erro" ? "destructive" : "secondary"
                        }>
                          {pdf.status_processamento}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
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

      // Register task for payment
      await employeeService.registerTask(employeeId, "upload_pdf", file.name, valorPorTarefa);

      // Upload gabarito if provided
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
// EXAM RADAR SECTION
// =============================================
function ExamRadarSection() {
  const queryClient = useQueryClient();
  const emptyForm: Partial<ExamRadar> = {
    nome: "", orgao: "", estado: "", nivel: "medio", area: "",
    vagas: undefined, salario_de: undefined, salario_ate: undefined,
    banca_nome: "", link: "", edital_link: "", descricao: "", status: "ativo",
  };
  const [form, setForm] = useState<Partial<ExamRadar>>(emptyForm);

  const createMut = useMutation({
    mutationFn: (data: Partial<ExamRadar>) => examRadarService.createExam(data),
    onSuccess: () => {
      toast.success("Concurso cadastrado!");
      setForm(emptyForm);
      queryClient.invalidateQueries({ queryKey: ["admin-exam-radar"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const set = (field: string, value: any) => setForm((p) => ({ ...p, [field]: value }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Radar className="h-4 w-4" /> Cadastrar Concurso no Radar
        </CardTitle>
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
        </div>
        <div className="space-y-2">
          <Label>Descrição</Label>
          <Textarea value={form.descricao || ""} onChange={(e) => set("descricao", e.target.value)} rows={3} />
        </div>
        <Button onClick={() => createMut.mutate(form)} disabled={createMut.isPending || !form.nome} className="gap-2">
          {createMut.isPending ? "Salvando..." : <><Radar className="h-4 w-4" /> Cadastrar Concurso</>}
        </Button>
      </CardContent>
    </Card>
  );
}
