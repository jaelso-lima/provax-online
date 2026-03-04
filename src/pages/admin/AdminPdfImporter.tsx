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
import { Upload, FileText, CheckCircle, XCircle, Clock, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export default function AdminPdfImporter() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [tipo, setTipo] = useState<string>("concurso");
  const [ano, setAno] = useState<string>("");
  const [cargo, setCargo] = useState<string>("");

  const { data: bancas } = useQuery({
    queryKey: ["bancas"],
    queryFn: async () => {
      const { data } = await supabase.from("bancas").select("id, nome").order("nome");
      return data || [];
    },
  });

  const { data: cursos } = useQuery({
    queryKey: ["cursos"],
    queryFn: async () => {
      const { data } = await supabase.from("cursos").select("id, nome").order("nome");
      return data || [];
    },
  });

  const [bancaId, setBancaId] = useState<string>("");
  const [cursoId, setCursoId] = useState<string>("");
  const [semestre, setSemestre] = useState<string>("");

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
        curso_id: cursoId || null,
        semestre: semestre ? Number(semestre) : null,
        ano: ano ? Number(ano) : null,
        cargo: cargo || null,
      }, user.id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pdf-imports"] });
      toast({ title: "PDF enviado!", description: "O arquivo será processado em breve." });
      setFile(null);
      setAno("");
      setCargo("");
      setBancaId("");
      setCursoId("");
      setSemestre("");
    },
    onError: (e: any) => toast({ title: "Erro no upload", description: e.message, variant: "destructive" }),
  });

  const statusIcon = (s: string) => {
    if (s === "processado") return <CheckCircle className="h-4 w-4 text-green-500" />;
    if (s === "erro") return <XCircle className="h-4 w-4 text-red-500" />;
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-['Space_Grotesk'] flex items-center gap-2">
            <Upload className="h-6 w-6 text-primary" /> PDF Importer
          </h1>
          <p className="text-muted-foreground text-sm">Importe provas em PDF para extração automática de questões</p>
        </div>

        {/* Upload form */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="sm:col-span-2 lg:col-span-3">
                <Label>Arquivo PDF *</Label>
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
                <Label>Ano</Label>
                <Input type="number" value={ano} onChange={(e) => setAno(e.target.value)} placeholder="2024" />
              </div>
              {tipo === "concurso" && (
                <>
                  <div>
                    <Label>Banca</Label>
                    <Select value={bancaId} onValueChange={setBancaId}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>
                        {bancas?.map((b) => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Cargo</Label>
                    <Input value={cargo} onChange={(e) => setCargo(e.target.value)} placeholder="Ex: Analista" />
                  </div>
                </>
              )}
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
                  <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <File className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div>
                        <p className="font-medium text-sm truncate max-w-[300px]">{imp.nome_arquivo}</p>
                        <p className="text-xs text-muted-foreground">
                          {imp.tipo} · {imp.ano || "—"} · {imp.total_questoes_extraidas} questões
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {statusIcon(imp.status_processamento)}
                      <Badge variant={imp.status_processamento === "processado" ? "default" : imp.status_processamento === "erro" ? "destructive" : "secondary"}>
                        {imp.status_processamento}
                      </Badge>
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
