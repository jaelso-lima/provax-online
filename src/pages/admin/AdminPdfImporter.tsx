import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { pdfImportService } from "@/services/pdfImportService";
import { documentService } from "@/services/documentService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Upload, CheckCircle, XCircle, Clock, File, Play, BookOpen, Trash2, BarChart3, FileText, Brain, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";

// =============================================
// UPLOAD FORM COMPONENT
// =============================================
function PdfUploadForm({ onSuccess }: { onSuccess: () => void }) {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState<string>("concurso");
  const [ano, setAno] = useState<string>("");
  const [cargo, setCargo] = useState<string>("");
  const [gabaritoFile, setGabaritoFile] = useState<File | null>(null);
  const [bancaId, setBancaId] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const { data: bancas } = useQuery({
    queryKey: ["bancas"],
    queryFn: async () => {
      const { data } = await supabase.from("bancas").select("id, nome").order("nome");
      return data || [];
    },
  });

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!file || !user) throw new Error("Arquivo e autenticação necessários");

      // Validate main file
      const mainValidation = pdfImportService.validateFile(file);
      if (!mainValidation.valid) throw new Error(mainValidation.error);

      // Validate gabarito if provided
      if (gabaritoFile) {
        const gabValidation = pdfImportService.validateFile(gabaritoFile);
        if (!gabValidation.valid) throw new Error(`Gabarito: ${gabValidation.error}`);
      }

      setUploadProgress("Enviando PDF da prova...");

      // Upload gabarito alongside prova if provided
      let gabaritoPath: string | null = null;
      if (gabaritoFile) {
        setUploadProgress("Enviando gabarito...");
        const ext = gabaritoFile.name.split(".").pop() || "pdf";
        gabaritoPath = `gabaritos/${Date.now()}_gabarito.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("pdf-imports")
          .upload(gabaritoPath, gabaritoFile, { upsert: false });
        if (uploadError) throw new Error("Erro ao enviar gabarito: " + uploadError.message);
      }

      setUploadProgress("Registrando no banco de dados...");

      const effectiveBancaId = bancaId && bancaId !== "auto" ? bancaId : null;

      const result = await pdfImportService.uploadPdf(file, {
        tipo: tipo as any,
        banca_id: effectiveBancaId,
        curso_id: null,
        semestre: null,
        ano: ano ? Number(ano) : null,
        cargo: cargo || null,
      }, user.id);

      // Store gabarito path in the import record
      if (gabaritoPath && result?.id) {
        await supabase.from("pdf_imports").update({
          gabarito_storage_path: gabaritoPath,
        } as any).eq("id", result.id);
      }

      setUploadProgress(null);
      return { ...result, gabaritoPath };
    },
    onSuccess: () => {
      onSuccess();
      toast({ title: "✅ PDF enviado!", description: gabaritoFile
        ? "Prova e gabarito enviados! Clique em 'Processar' para extrair questões."
        : "Clique em 'Processar' para extrair questões automaticamente." });
      setFile(null);
      setGabaritoFile(null);
      setAno("");
      setCargo("");
      setBancaId("");
      setUploadProgress(null);
    },
    onError: (e: any) => {
      setUploadProgress(null);
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="sm:col-span-2 lg:col-span-3">
            <Label>Arquivo PDF da Prova *</Label>
            <Input
              type="file"
              accept=".pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
            {file && (
              <p className="text-xs text-muted-foreground mt-1">
                📄 {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>
          <div>
            <Label>Tipo *</Label>
            <Select value={tipo} onValueChange={setTipo}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="concurso">Concurso</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Ano (opcional)</Label>
            <Input type="number" value={ano} onChange={(e) => setAno(e.target.value)} placeholder="2024" />
          </div>
          <div>
            <Label>Banca (opcional — detectada automaticamente)</Label>
            <Select value={bancaId} onValueChange={setBancaId}>
              <SelectTrigger><SelectValue placeholder="Detectar automaticamente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Detectar automaticamente</SelectItem>
                {bancas?.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Cargo (opcional)</Label>
            <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: Analista Judiciário" />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" /> Gabarito em PDF (opcional)
            </Label>
            <Input
              type="file"
              accept=".pdf"
              onChange={(e) => setGabaritoFile(e.target.files?.[0] || null)}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground mt-1">
              {gabaritoFile
                ? `✅ Gabarito: ${gabaritoFile.name} (${(gabaritoFile.size / 1024 / 1024).toFixed(2)} MB)`
                : "Envie o PDF do gabarito — a IA associa as respostas corretas às questões"
              }
            </p>
          </div>
        </div>

        {uploadProgress && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 text-primary text-sm">
            <Clock className="h-4 w-4 animate-spin" />
            {uploadProgress}
          </div>
        )}

        <Button onClick={() => uploadMut.mutate()} disabled={!file || uploadMut.isPending}>
          <Upload className="h-4 w-4 mr-1" />
          {uploadMut.isPending ? "Enviando..." : gabaritoFile ? "Enviar Prova + Gabarito" : "Enviar PDF"}
        </Button>
      </CardContent>
    </Card>
  );
}

// =============================================
// STATS CARDS
// =============================================
function PdfStats({ imports }: { imports: any[] }) {
  const total = imports.length;
  const processados = imports.filter((i) => i.status_processamento === "processado").length;
  const pendentes = imports.filter((i) => i.status_processamento === "pendente").length;
  const erros = imports.filter((i) => i.status_processamento === "erro").length;
  const totalQuestoes = imports.reduce((acc, i) => acc + (i.total_questoes_extraidas || 0), 0);

  return (
    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
      <Card>
        <CardContent className="p-4 text-center">
          <FileText className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{total}</p>
          <p className="text-xs text-muted-foreground">Documentos</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <CheckCircle className="h-5 w-5 mx-auto mb-1 text-green-500" />
          <p className="text-2xl font-bold">{processados}</p>
          <p className="text-xs text-muted-foreground">Processados</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <Clock className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
          <p className="text-2xl font-bold">{pendentes}</p>
          <p className="text-xs text-muted-foreground">Pendentes</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <XCircle className="h-5 w-5 mx-auto mb-1 text-destructive" />
          <p className="text-2xl font-bold">{erros}</p>
          <p className="text-xs text-muted-foreground">Erros</p>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-4 text-center">
          <Brain className="h-5 w-5 mx-auto mb-1 text-primary" />
          <p className="text-2xl font-bold">{totalQuestoes}</p>
          <p className="text-xs text-muted-foreground">Questões Extraídas</p>
        </CardContent>
      </Card>
    </div>
  );
}

// =============================================
// IMPORT ITEM COMPONENT
// =============================================
function ImportItem({
  imp,
  onProcess,
  onDelete,
  isProcessing,
  isDeleting,
}: {
  imp: any;
  onProcess: (imp: any, gabaritoFile?: File | null) => void;
  onDelete: (imp: any) => void;
  isProcessing: boolean;
  isDeleting: boolean;
}) {
  const [gabaritoFile, setGabaritoFile] = useState<File | null>(null);

  const statusIcon = (s: string) => {
    if (s === "processado") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (s === "erro") return <XCircle className="h-4 w-4 text-destructive" />;
    if (s === "processando") return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const hasGabarito = !!imp.gabarito_storage_path || !!gabaritoFile;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <File className="h-5 w-5 text-muted-foreground shrink-0" />
            <div className="min-w-0">
              <p className="font-medium text-sm truncate">{imp.nome_arquivo}</p>
              <p className="text-xs text-muted-foreground">
                {imp.tipo} · {imp.ano || "—"} · {imp.total_questoes_extraidas} questões
                {hasGabarito && " · 📋 Gabarito anexado"}
              </p>
              {imp.erro_detalhes && imp.status_processamento === "erro" && (
                <p className="text-xs text-destructive mt-1 truncate max-w-[400px]" title={imp.erro_detalhes}>
                  <AlertCircle className="h-3 w-3 inline mr-1" />
                  {imp.erro_detalhes}
                </p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {statusIcon(imp.status_processamento)}
            <Badge variant={
              imp.status_processamento === "processado" ? "default" :
              imp.status_processamento === "erro" ? "destructive" :
              imp.status_processamento === "processando" ? "secondary" :
              "secondary"
            }>
              {imp.status_processamento}
            </Badge>
            {(imp.status_processamento === "pendente" || imp.status_processamento === "erro") && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => onProcess(imp, gabaritoFile)}
                disabled={isProcessing}
              >
                <Play className="h-3 w-3 mr-1" />
                {isProcessing ? "Processando..." : "Processar"}
              </Button>
            )}
            <Button
              size="sm"
              variant="destructive"
              onClick={() => {
                if (confirm("Tem certeza que deseja excluir este PDF?")) {
                  onDelete(imp);
                }
              }}
              disabled={isDeleting}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Per-import gabarito upload for pending items without gabarito */}
        {(imp.status_processamento === "pendente" || imp.status_processamento === "erro") && !imp.gabarito_storage_path && (
          <div className="pl-8 border-l-2 border-muted ml-2">
            <Label className="text-xs flex items-center gap-1 text-muted-foreground">
              <BookOpen className="h-3 w-3" /> Anexar gabarito PDF para esta prova
            </Label>
            <Input
              type="file"
              accept=".pdf"
              className="cursor-pointer h-8 text-xs mt-1"
              onChange={(e) => setGabaritoFile(e.target.files?.[0] || null)}
            />
            {gabaritoFile && (
              <p className="text-xs text-green-600 mt-1">✅ {gabaritoFile.name}</p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// =============================================
// MAIN PAGE
// =============================================
export default function AdminPdfImporter() {
  const qc = useQueryClient();

  const { data: imports, isLoading } = useQuery({
    queryKey: ["pdf-imports"],
    queryFn: () => pdfImportService.listImports(),
  });

  const processMut = useMutation({
    mutationFn: async ({ imp, gabaritoFile }: { imp: any; gabaritoFile?: File | null }) => {
      let gabaritoPath: string | null = imp.gabarito_storage_path || null;

      // Upload per-import gabarito if provided
      if (gabaritoFile) {
        const ext = gabaritoFile.name.split(".").pop() || "pdf";
        gabaritoPath = `gabaritos/${Date.now()}_gabarito.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("pdf-imports")
          .upload(gabaritoPath, gabaritoFile, { upsert: false });
        if (uploadError) throw new Error("Erro ao enviar gabarito: " + uploadError.message);
      }

      const { data, error } = await supabase.functions.invoke("process-pdf", {
        body: { import_id: imp.id, gabarito_storage_path: gabaritoPath },
      });
      if (error) throw new Error(error.message || "Erro ao processar PDF");
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pdf-imports"] });
      const meta = data?.metadata;
      toast({
        title: "✅ PDF processado com sucesso!",
        description: `${data?.questoes_extraidas || 0} questões extraídas.${meta?.banca_organizadora ? ` Banca: ${meta.banca_organizadora}` : ""}${meta?.concurso_nome ? ` | ${meta.concurso_nome}` : ""}`,
      });
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ["pdf-imports"] });
      toast({ title: "Erro ao processar", description: e.message, variant: "destructive" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (imp: { id: string; storage_path: string }) => {
      await supabase.storage.from("pdf-imports").remove([imp.storage_path]);
      const { error } = await supabase.from("pdf_imports").delete().eq("id", imp.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pdf-imports"] });
      toast({ title: "PDF excluído com sucesso" });
    },
    onError: (e: any) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
  });

  const resetStuckMut = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("reset_stuck_pdf_imports");
      if (error) throw error;
      return data as number;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["pdf-imports"] });
      toast({ title: `${count} PDF(s) resetados`, description: "Agora você pode reprocessá-los." });
    },
    onError: (e: any) => toast({ title: "Erro ao resetar", description: e.message, variant: "destructive" }),
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] flex items-center gap-2">
              <Upload className="h-6 w-6 text-primary" /> PDF Importer
            </h1>
            <p className="text-muted-foreground text-sm">
              Importe provas em PDF — a IA detecta banca, estado e concurso automaticamente
            </p>
          </div>
          <div className="flex gap-2">
            {imports && imports.some(i => i.status_processamento === 'processando') && (
              <Button variant="outline" size="sm" onClick={() => resetStuckMut.mutate()} disabled={resetStuckMut.isPending}>
                <AlertCircle className="h-4 w-4 mr-1" />
                {resetStuckMut.isPending ? "Resetando..." : "Resetar Presos"}
              </Button>
            )}
            <Link to="/admin/questions-review">
              <Button variant="outline" size="sm">
                Revisar Questões
              </Button>
            </Link>
          </div>
        </div>

        {/* Stats */}
        {imports && imports.length > 0 && <PdfStats imports={imports} />}

        {/* Upload form */}
        <PdfUploadForm onSuccess={() => qc.invalidateQueries({ queryKey: ["pdf-imports"] })} />

        {/* Imports list */}
        <div>
          <h2 className="text-lg font-semibold mb-3 flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> PDFs Importados
          </h2>
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
          ) : !imports?.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum PDF importado ainda.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {imports.map((imp) => (
                <ImportItem
                  key={imp.id}
                  imp={imp}
                  onProcess={(imp, gabaritoFile) => processMut.mutate({ imp, gabaritoFile })}
                  onDelete={(imp) => deleteMut.mutate({ id: imp.id, storage_path: imp.storage_path })}
                  isProcessing={processMut.isPending}
                  isDeleting={deleteMut.isPending}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
