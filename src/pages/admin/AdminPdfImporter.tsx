import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { pdfImportService } from "@/services/pdfImportService";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { Upload, CheckCircle, XCircle, Clock, File, Play, BookOpen, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminPdfImporter() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState<string>("concurso");
  const [ano, setAno] = useState<string>("");
  const [cargo, setCargo] = useState<string>("");
  const [gabaritoFile, setGabaritoFile] = useState<File | null>(null);

  const { data: bancas } = useQuery({
    queryKey: ["bancas"],
    queryFn: async () => {
      const { data } = await supabase.from("bancas").select("id, nome").order("nome");
      return data || [];
    },
  });

  const [bancaId, setBancaId] = useState<string>("");

  const { data: imports, isLoading } = useQuery({
    queryKey: ["pdf-imports"],
    queryFn: () => pdfImportService.listImports(),
  });

  const uploadMut = useMutation({
    mutationFn: async () => {
      if (!file || !user) throw new Error("Arquivo e autenticação necessários");
      return pdfImportService.uploadPdf(file, {
        tipo: tipo as any,
        banca_id: bancaId || null,
        curso_id: null,
        semestre: null,
        ano: ano ? Number(ano) : null,
        cargo: cargo || null,
      }, user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pdf-imports"] });
      toast({ title: "PDF enviado!", description: "Clique em 'Processar' para extrair questões automaticamente." });
      setFile(null);
      setAno("");
      setCargo("");
      setBancaId("");
    },
    onError: (e: any) => toast({ title: "Erro no upload", description: e.message, variant: "destructive" }),
  });

  const processMut = useMutation({
    mutationFn: async (importId: string) => {
      // If gabarito PDF is provided, upload it to storage first
      let gabaritoPath: string | null = null;
      if (gabaritoFile) {
        const ext = gabaritoFile.name.split(".").pop() || "pdf";
        gabaritoPath = `gabaritos/${Date.now()}_gabarito.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("pdf-imports")
          .upload(gabaritoPath, gabaritoFile, { upsert: false });
        if (uploadError) throw new Error("Erro ao enviar gabarito: " + uploadError.message);
      }

      const { data, error } = await supabase.functions.invoke("process-pdf", {
        body: { import_id: importId, gabarito_storage_path: gabaritoPath },
      });
      if (error) throw new Error(error.message || "Erro ao processar PDF");
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pdf-imports"] });
      const meta = data?.metadata;
      toast({
        title: "PDF processado com sucesso!",
        description: `${data?.questoes_extraidas || 0} questões extraídas.${meta?.banca_organizadora ? ` Banca: ${meta.banca_organizadora}` : ""}${meta?.concurso_nome ? ` | ${meta.concurso_nome}` : ""}`,
      });
      setGabaritoFile(null);
    },
    onError: (e: any) => {
      qc.invalidateQueries({ queryKey: ["pdf-imports"] });
      toast({ title: "Erro ao processar", description: e.message, variant: "destructive" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: async (imp: { id: string; storage_path: string }) => {
      // Delete from storage
      await supabase.storage.from("pdf-imports").remove([imp.storage_path]);
      // Delete from database
      const { error } = await supabase.from("pdf_imports").delete().eq("id", imp.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pdf-imports"] });
      toast({ title: "PDF excluído com sucesso" });
    },
    onError: (e: any) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
  });

  const statusIcon = (s: string) => {
    if (s === "processado") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (s === "erro") return <XCircle className="h-4 w-4 text-red-500" />;
    if (s === "processando") return <Clock className="h-4 w-4 text-blue-500 animate-spin" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-['Space_Grotesk'] flex items-center gap-2">
            <Upload className="h-6 w-6 text-primary" /> PDF Importer
          </h1>
          <p className="text-muted-foreground text-sm">
            Importe provas em PDF — a IA detecta banca, estado e concurso automaticamente
          </p>
        </div>

        {/* Upload form */}
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
                  Envie o PDF do gabarito — a IA associa automaticamente as respostas às questões
                </p>
              </div>
            </div>
            <Button onClick={() => uploadMut.mutate()} disabled={!file || uploadMut.isPending}>
              <Upload className="h-4 w-4 mr-1" /> {uploadMut.isPending ? "Enviando..." : "Enviar PDF"}
            </Button>
          </CardContent>
        </Card>

        {/* Imports list */}
        <div>
          <h2 className="text-lg font-semibold mb-3">PDFs Importados</h2>
          {isLoading ? (
            <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-muted rounded animate-pulse" />)}</div>
          ) : !imports?.length ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground">Nenhum PDF importado ainda.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {imports.map((imp) => (
                <Card key={imp.id}>
                  <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <File className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{imp.nome_arquivo}</p>
                        <p className="text-xs text-muted-foreground">
                          {imp.tipo} · {imp.ano || "—"} · {imp.total_questoes_extraidas} questões
                        </p>
                        {imp.erro_detalhes && imp.status_processamento === "erro" && (
                          <p className="text-xs text-destructive mt-1 truncate max-w-[400px]" title={imp.erro_detalhes}>
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
                        "secondary"
                      }>
                        {imp.status_processamento}
                      </Badge>
                      {(imp.status_processamento === "pendente" || imp.status_processamento === "erro") && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => processMut.mutate(imp.id)}
                          disabled={processMut.isPending}
                        >
                          <Play className="h-3 w-3 mr-1" />
                          {processMut.isPending ? "Processando..." : "Processar"}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          if (confirm("Tem certeza que deseja excluir este PDF?")) {
                            deleteMut.mutate({ id: imp.id, storage_path: imp.storage_path });
                          }
                        }}
                        disabled={deleteMut.isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
