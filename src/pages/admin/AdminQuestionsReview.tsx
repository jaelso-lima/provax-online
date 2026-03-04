import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { CheckCircle, Edit, Trash2, Eye, Search, Filter } from "lucide-react";

interface Questao {
  id: string;
  enunciado: string;
  alternativas: any;
  resposta_correta: string;
  status_questao: string;
  source: string | null;
  ano: number | null;
  dificuldade: string;
  modo: string;
  banca?: { nome: string } | null;
  materia?: { nome: string } | null;
  concurso?: { nome: string } | null;
  area?: { nome: string } | null;
}

export default function AdminQuestionsReview() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("pdf_import");
  const [editingQuestion, setEditingQuestion] = useState<Questao | null>(null);
  const [viewingQuestion, setViewingQuestion] = useState<Questao | null>(null);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 20;

  const { data, isLoading } = useQuery({
    queryKey: ["admin-questions", statusFilter, sourceFilter, search, page],
    queryFn: async () => {
      let query = supabase
        .from("questoes")
        .select("*, banca:bancas(nome), materia:materias(nome), concurso:concursos(nome), area:areas(nome)", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (statusFilter !== "all") query = query.eq("status_questao", statusFilter);
      if (sourceFilter !== "all") query = query.eq("source", sourceFilter);
      if (search) query = query.ilike("enunciado", `%${search}%`);

      const { data, error, count } = await query;
      if (error) throw error;
      return { questions: (data || []) as Questao[], total: count || 0 };
    },
  });

  const updateMut = useMutation({
    mutationFn: async (q: { id: string; enunciado: string; resposta_correta: string; alternativas: any; status_questao: string; dificuldade: string }) => {
      const { error } = await supabase.from("questoes").update({
        enunciado: q.enunciado,
        resposta_correta: q.resposta_correta,
        alternativas: q.alternativas,
        status_questao: q.status_questao,
        dificuldade: q.dificuldade,
      }).eq("id", q.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-questions"] });
      setEditingQuestion(null);
      toast({ title: "Questão atualizada com sucesso!" });
    },
    onError: (e: any) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-questions"] });
      toast({ title: "Questão excluída" });
    },
    onError: (e: any) => toast({ title: "Erro ao excluir", description: e.message, variant: "destructive" }),
  });

  const statusColor = (s: string) => {
    if (s === "valida") return "default";
    if (s === "pendente_revisao") return "secondary";
    if (s === "anulada") return "destructive";
    return "outline";
  };

  const questions = data?.questions || [];
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-['Space_Grotesk'] flex items-center gap-2">
            <Edit className="h-6 w-6 text-primary" /> Revisão de Questões
          </h1>
          <p className="text-muted-foreground text-sm">
            Revise, edite e aprove questões extraídas de PDFs antes de publicá-las
          </p>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <Label>Buscar</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar no enunciado..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(0); }}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="valida">Válida</SelectItem>
                    <SelectItem value="pendente_revisao">Pendente Revisão</SelectItem>
                    <SelectItem value="anulada">Anulada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Origem</Label>
                <Select value={sourceFilter} onValueChange={(v) => { setSourceFilter(v); setPage(0); }}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="pdf_import">PDF Import</SelectItem>
                    <SelectItem value="ai_generated">IA Gerada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Badge variant="outline" className="h-10 flex items-center px-4">
                  <Filter className="h-3 w-3 mr-2" /> {total} questões
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Questions list */}
        {isLoading ? (
          <div className="space-y-2">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-muted rounded animate-pulse" />)}</div>
        ) : !questions.length ? (
          <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma questão encontrada com os filtros aplicados.</CardContent></Card>
        ) : (
          <div className="space-y-3">
            {questions.map((q) => {
              const alts = typeof q.alternativas === "string" ? JSON.parse(q.alternativas) : q.alternativas;
              return (
                <Card key={q.id}>
                  <CardContent className="p-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-2">{q.enunciado}</p>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            <Badge variant={statusColor(q.status_questao)} className="text-xs">{q.status_questao}</Badge>
                            {q.banca && <Badge variant="outline" className="text-xs">{q.banca.nome}</Badge>}
                            {q.materia && <Badge variant="outline" className="text-xs">{q.materia.nome}</Badge>}
                            {q.concurso && <Badge variant="outline" className="text-xs">{q.concurso.nome}</Badge>}
                            {q.ano && <Badge variant="outline" className="text-xs">{q.ano}</Badge>}
                            <Badge variant="outline" className="text-xs">Resp: {q.resposta_correta}</Badge>
                            <Badge variant="outline" className="text-xs">{q.source || "ai"}</Badge>
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button size="sm" variant="ghost" onClick={() => setViewingQuestion(q)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingQuestion(q)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-destructive"
                            onClick={() => {
                              if (confirm("Excluir esta questão permanentemente?")) deleteMut.mutate(q.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2 pt-4">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Anterior</Button>
                <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Próxima</Button>
              </div>
            )}
          </div>
        )}

        {/* View Dialog */}
        <Dialog open={!!viewingQuestion} onOpenChange={() => setViewingQuestion(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Visualizar Questão</DialogTitle></DialogHeader>
            {viewingQuestion && (
              <div className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Enunciado</Label>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{viewingQuestion.enunciado}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Alternativas</Label>
                  <div className="space-y-1 mt-1">
                    {(typeof viewingQuestion.alternativas === "string"
                      ? JSON.parse(viewingQuestion.alternativas)
                      : viewingQuestion.alternativas
                    ).map((a: any, i: number) => (
                      <p key={i} className={`text-sm p-2 rounded ${a.letra === viewingQuestion.resposta_correta ? "bg-green-100 dark:bg-green-900/30 font-medium" : "bg-muted/50"}`}>
                        <span className="font-bold">{a.letra})</span> {a.texto}
                      </p>
                    ))}
                  </div>
                </div>
                <div className="flex gap-4 text-xs text-muted-foreground">
                  <span>Resposta: <strong>{viewingQuestion.resposta_correta}</strong></span>
                  <span>Status: <strong>{viewingQuestion.status_questao}</strong></span>
                  <span>Dificuldade: <strong>{viewingQuestion.dificuldade}</strong></span>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <EditDialog
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSave={(q) => updateMut.mutate(q)}
          isPending={updateMut.isPending}
        />
      </div>
    </AdminLayout>
  );
}

function EditDialog({ question, onClose, onSave, isPending }: {
  question: Questao | null;
  onClose: () => void;
  onSave: (q: any) => void;
  isPending: boolean;
}) {
  const [enunciado, setEnunciado] = useState("");
  const [resposta, setResposta] = useState("");
  const [status, setStatus] = useState("");
  const [dificuldade, setDificuldade] = useState("");
  const [alternativas, setAlternativas] = useState<{ letra: string; texto: string }[]>([]);

  // Sync state when question changes
  const [lastId, setLastId] = useState<string | null>(null);
  if (question && question.id !== lastId) {
    setLastId(question.id);
    setEnunciado(question.enunciado);
    setResposta(question.resposta_correta);
    setStatus(question.status_questao);
    setDificuldade(question.dificuldade);
    const alts = typeof question.alternativas === "string"
      ? JSON.parse(question.alternativas)
      : question.alternativas;
    setAlternativas(alts);
  }

  if (!question) return null;

  return (
    <Dialog open={!!question} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Editar Questão</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Enunciado</Label>
            <Textarea value={enunciado} onChange={(e) => setEnunciado(e.target.value)} rows={4} />
          </div>
          <div>
            <Label>Alternativas</Label>
            <div className="space-y-2 mt-1">
              {alternativas.map((a, i) => (
                <div key={i} className="flex gap-2 items-center">
                  <span className="font-bold text-sm w-6">{a.letra})</span>
                  <Input
                    value={a.texto}
                    onChange={(e) => {
                      const updated = [...alternativas];
                      updated[i] = { ...updated[i], texto: e.target.value };
                      setAlternativas(updated);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Resposta Correta</Label>
              <Select value={resposta} onValueChange={setResposta}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {alternativas.map((a) => (
                    <SelectItem key={a.letra} value={a.letra}>{a.letra}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="valida">Válida</SelectItem>
                  <SelectItem value="pendente_revisao">Pendente Revisão</SelectItem>
                  <SelectItem value="anulada">Anulada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Dificuldade</Label>
              <Select value={dificuldade} onValueChange={setDificuldade}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="facil">Fácil</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="dificil">Difícil</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              onClick={() => onSave({
                id: question.id,
                enunciado,
                resposta_correta: resposta,
                alternativas: JSON.stringify(alternativas),
                status_questao: status,
                dificuldade,
              })}
              disabled={isPending}
            >
              <CheckCircle className="h-4 w-4 mr-1" /> {isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
