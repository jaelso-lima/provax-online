import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, DollarSign, TrendingDown } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const CATEGORIAS = ["marketing", "servidor", "ferramenta", "pessoal", "impostos", "outros"];

interface ExpenseForm {
  id?: string;
  descricao: string;
  valor: number;
  categoria: string;
  data: string;
  observacao: string;
}

const emptyExpense: ExpenseForm = {
  descricao: "",
  valor: 0,
  categoria: "outros",
  data: new Date().toISOString().split("T")[0],
  observacao: "",
};

export default function AdminExpenses() {
  const { user } = useAuth();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<ExpenseForm>({ ...emptyExpense });
  const queryClient = useQueryClient();

  const { data: expenses, isLoading } = useQuery({
    queryKey: ["admin-expenses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expenses")
        .select("*")
        .order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (exp: ExpenseForm) => {
      if (exp.id) {
        const { error } = await supabase.from("expenses").update({
          descricao: exp.descricao,
          valor: exp.valor,
          categoria: exp.categoria,
          data: exp.data,
          observacao: exp.observacao || null,
          updated_at: new Date().toISOString(),
        }).eq("id", exp.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("expenses").insert({
          descricao: exp.descricao,
          valor: exp.valor,
          categoria: exp.categoria,
          data: exp.data,
          observacao: exp.observacao || null,
          created_by: user!.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Despesa salva");
      queryClient.invalidateQueries({ queryKey: ["admin-expenses"] });
      setDialogOpen(false);
    },
    onError: () => toast.error("Erro ao salvar despesa"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("expenses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Despesa excluída");
      queryClient.invalidateQueries({ queryKey: ["admin-expenses"] });
    },
    onError: () => toast.error("Erro ao excluir"),
  });

  const totalExpenses = expenses?.reduce((acc, e) => acc + Number(e.valor), 0) ?? 0;
  const monthlyExpenses = expenses
    ?.filter((e) => new Date(e.data) >= new Date(new Date().getFullYear(), new Date().getMonth(), 1))
    .reduce((acc, e) => acc + Number(e.valor), 0) ?? 0;

  const openNew = () => {
    setForm({ ...emptyExpense });
    setDialogOpen(true);
  };

  const openEdit = (e: any) => {
    setForm({
      id: e.id,
      descricao: e.descricao,
      valor: Number(e.valor),
      categoria: e.categoria,
      data: e.data,
      observacao: e.observacao || "",
    });
    setDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk']">Despesas</h1>
            <p className="text-muted-foreground text-sm">Controle financeiro interno</p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Despesa
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-destructive/10">
                  <TrendingDown className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-xl font-bold">R$ {monthlyExpenses.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Despesas do Mês</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-muted">
                  <DollarSign className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xl font-bold">R$ {totalExpenses.toFixed(2)}</p>
                  <p className="text-xs text-muted-foreground">Total Geral</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expenses list */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : expenses?.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhuma despesa registrada</div>
          ) : (
            expenses?.map((e) => (
              <Card key={e.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-sm">{e.descricao}</p>
                        <Badge variant="outline" className="text-xs capitalize">{e.categoria}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {new Date(e.data + "T12:00:00").toLocaleDateString("pt-BR")}
                        {e.observacao && ` • ${e.observacao}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-bold text-destructive">-R$ {Number(e.valor).toFixed(2)}</p>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(e)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive">
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir despesa?</AlertDialogTitle>
                            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteMutation.mutate(e.id)}>Excluir</AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar Despesa" : "Nova Despesa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Valor (R$)</Label>
                <Input type="number" step="0.01" value={form.valor} onChange={(e) => setForm({ ...form, valor: Number(e.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label>Data</Label>
                <Input type="date" value={form.data} onChange={(e) => setForm({ ...form, data: e.target.value })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Categoria</Label>
              <Select value={form.categoria} onValueChange={(v) => setForm({ ...form, categoria: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIAS.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Observação (opcional)</Label>
              <Textarea value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} rows={2} />
            </div>
            <Button className="w-full" onClick={() => saveMutation.mutate(form)} disabled={saveMutation.isPending || !form.descricao || form.valor <= 0}>
              {saveMutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
