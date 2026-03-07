import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { examRadarService } from "@/services/examRadarService";
import type { ExamRadar } from "@/types/modules";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Archive, Radar, ExternalLink, Trash2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const NIVEIS = ["medio", "superior", "tecnico", "fundamental"];
const ESTADOS_BR = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA",
  "PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO","Nacional"
];

const emptyForm: Partial<ExamRadar> = {
  nome: "", orgao: "", estado: "", nivel: "medio", area: "", vagas: undefined,
  salario_de: undefined, salario_ate: undefined, inscricao_inicio: undefined,
  inscricao_ate: undefined, data_prova: undefined, banca_nome: "", link: "",
  edital_link: "", descricao: "", status: "ativo",
};

export default function AdminExamRadar() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExamRadar | null>(null);
  const [form, setForm] = useState<Partial<ExamRadar>>(emptyForm);

  const { data: examsData, isLoading } = useQuery({
    queryKey: ["admin-exam-radar"],
    queryFn: () => examRadarService.listExams({}, 1),
  });

  const createMut = useMutation({
    mutationFn: (data: Partial<ExamRadar>) => examRadarService.createExam(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-exam-radar"] });
      toast({ title: "Concurso adicionado!" });
      setOpen(false);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateMut = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ExamRadar> }) => examRadarService.updateExam(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-exam-radar"] });
      toast({ title: "Concurso atualizado!" });
      setOpen(false);
      setEditing(null);
      setForm(emptyForm);
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const archiveMut = useMutation({
    mutationFn: (id: string) => examRadarService.archiveExam(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-exam-radar"] });
      toast({ title: "Concurso arquivado" });
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => examRadarService.deleteExam(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-exam-radar"] });
      toast({ title: "Concurso excluído permanentemente" });
    },
    onError: (e: any) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
  });

  const handleSubmit = () => {
    if (!form.nome) return toast({ title: "Nome obrigatório", variant: "destructive" });
    if (editing) {
      updateMut.mutate({ id: editing.id, data: form });
    } else {
      createMut.mutate(form);
    }
  };

  const openEdit = (exam: ExamRadar) => {
    setEditing(exam);
    setForm({ ...exam });
    setOpen(true);
  };

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setOpen(true);
  };

  const exams = examsData?.data || [];

  const set = (key: string, value: any) => setForm((f) => ({ ...f, [key]: value }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] flex items-center gap-2">
              <Radar className="h-6 w-6 text-primary" /> Radar de Concursos
            </h1>
            <p className="text-muted-foreground text-sm">Gerencie os concursos exibidos no radar público</p>
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreate}><Plus className="h-4 w-4 mr-1" /> Novo Concurso</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? "Editar Concurso" : "Novo Concurso"}</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                <div className="sm:col-span-2">
                  <Label>Nome *</Label>
                  <Input value={form.nome || ""} onChange={(e) => set("nome", e.target.value)} placeholder="Ex: Concurso TJ-SP 2025" />
                </div>
                <div>
                  <Label>Órgão</Label>
                  <Input value={form.orgao || ""} onChange={(e) => set("orgao", e.target.value)} placeholder="Ex: Tribunal de Justiça" />
                </div>
                <div>
                  <Label>Estado</Label>
                  <Select value={form.estado || ""} onValueChange={(v) => set("estado", v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {ESTADOS_BR.map((e) => <SelectItem key={e} value={e}>{e}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Nível</Label>
                  <Select value={form.nivel || "medio"} onValueChange={(v) => set("nivel", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {NIVEIS.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Área</Label>
                  <Input value={form.area || ""} onChange={(e) => set("area", e.target.value)} placeholder="Ex: Administrativa" />
                </div>
                <div>
                  <Label>Banca</Label>
                  <Input value={form.banca_nome || ""} onChange={(e) => set("banca_nome", e.target.value)} placeholder="Ex: VUNESP" />
                </div>
                <div>
                  <Label>Vagas</Label>
                  <Input type="number" value={form.vagas || ""} onChange={(e) => set("vagas", e.target.value ? Number(e.target.value) : null)} />
                </div>
                <div>
                  <Label>Salário de</Label>
                  <Input type="number" value={form.salario_de || ""} onChange={(e) => set("salario_de", e.target.value ? Number(e.target.value) : null)} />
                </div>
                <div>
                  <Label>Salário até</Label>
                  <Input type="number" value={form.salario_ate || ""} onChange={(e) => set("salario_ate", e.target.value ? Number(e.target.value) : null)} />
                </div>
                <div>
                  <Label>Inscrição início</Label>
                  <Input type="date" value={form.inscricao_inicio || ""} onChange={(e) => set("inscricao_inicio", e.target.value || null)} />
                </div>
                <div>
                  <Label>Inscrição até</Label>
                  <Input type="date" value={form.inscricao_ate || ""} onChange={(e) => set("inscricao_ate", e.target.value || null)} />
                </div>
                <div>
                  <Label>Data da prova</Label>
                  <Input type="date" value={form.data_prova || ""} onChange={(e) => set("data_prova", e.target.value || null)} />
                </div>
                <div>
                  <Label>Link</Label>
                  <Input value={form.link || ""} onChange={(e) => set("link", e.target.value)} placeholder="https://..." />
                </div>
                <div>
                  <Label>Link do edital</Label>
                  <Input value={form.edital_link || ""} onChange={(e) => set("edital_link", e.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <Label>Descrição</Label>
                  <Textarea value={form.descricao || ""} onChange={(e) => set("descricao", e.target.value)} rows={3} />
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status || "ativo"} onValueChange={(v) => set("status", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ativo">Ativo</SelectItem>
                      <SelectItem value="encerrado">Encerrado</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={createMut.isPending || updateMut.isPending}>
                  {editing ? "Salvar" : "Criar"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => <div key={i} className="h-20 bg-muted rounded animate-pulse" />)}
          </div>
        ) : exams.length === 0 ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhum concurso cadastrado ainda.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {exams.map((exam) => (
              <Card key={exam.id}>
                <CardContent className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold truncate">{exam.nome}</span>
                      <Badge variant={exam.status === "ativo" ? "default" : "secondary"} className="text-xs">
                        {exam.status}
                      </Badge>
                      {exam.estado && <Badge variant="outline" className="text-xs">{exam.estado}</Badge>}
                      {exam.banca_nome && <Badge variant="outline" className="text-xs">{exam.banca_nome}</Badge>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {exam.orgao && `${exam.orgao} · `}
                      {exam.vagas && `${exam.vagas} vagas · `}
                      {exam.inscricao_ate && `Inscrição até ${new Date(exam.inscricao_ate + "T00:00:00").toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {exam.link && (
                      <Button size="sm" variant="ghost" asChild>
                        <a href={exam.link} target="_blank" rel="noopener noreferrer"><ExternalLink className="h-3.5 w-3.5" /></a>
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => openEdit(exam)}>
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {exam.status === "ativo" && (
                      <Button size="sm" variant="ghost" onClick={() => archiveMut.mutate(exam.id)}>
                        <Archive className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
