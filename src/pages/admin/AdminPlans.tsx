import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Plus, Pencil, X, Save, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface PlanForm {
  nome: string;
  slug: string;
  descricao: string;
  preco_mensal: number;
  preco_semestral: number;
  preco_anual: number;
  limite_diario_questoes: number;
  ativo: boolean;
  stripe_link_mensal: string;
  stripe_link_semestral: string;
  stripe_link_anual: string;
}

const emptyPlan: PlanForm = {
  nome: "",
  slug: "",
  descricao: "",
  preco_mensal: 0,
  preco_semestral: 0,
  preco_anual: 0,
  limite_diario_questoes: 10,
  ativo: true,
  stripe_link_mensal: "",
  stripe_link_semestral: "",
  stripe_link_anual: "",
};

export default function AdminPlans() {
  const [editingPlan, setEditingPlan] = useState<(PlanForm & { id?: string }) | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").order("created_at");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (plan: PlanForm & { id?: string }) => {
      if (plan.id) {
        const { error } = await supabase.from("plans").update({
          nome: plan.nome,
          descricao: plan.descricao,
          preco_mensal: plan.preco_mensal,
          preco_semestral: plan.preco_semestral,
          preco_anual: plan.preco_anual,
          limite_diario_questoes: plan.limite_diario_questoes,
          ativo: plan.ativo,
          stripe_link_mensal: plan.stripe_link_mensal || null,
          stripe_link_semestral: plan.stripe_link_semestral || null,
          stripe_link_anual: plan.stripe_link_anual || null,
        }).eq("id", plan.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("plans").insert({
          nome: plan.nome,
          slug: plan.slug,
          descricao: plan.descricao,
          preco_mensal: plan.preco_mensal,
          preco_semestral: plan.preco_semestral,
          preco_anual: plan.preco_anual,
          limite_diario_questoes: plan.limite_diario_questoes,
          ativo: plan.ativo,
          stripe_link_mensal: plan.stripe_link_mensal || null,
          stripe_link_semestral: plan.stripe_link_semestral || null,
          stripe_link_anual: plan.stripe_link_anual || null,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Plano salvo com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
      setDialogOpen(false);
      setEditingPlan(null);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao salvar plano"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (planId: string) => {
      // Check if plan has active subscriptions
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("id")
        .eq("plan_id", planId)
        .eq("status", "active")
        .limit(1);
      if (subs && subs.length > 0) {
        throw new Error("Não é possível excluir: existem assinaturas ativas neste plano. Desative-o primeiro.");
      }
      // Delete plan_features first
      await supabase.from("plan_features").delete().eq("plan_id", planId);
      const { error } = await supabase.from("plans").delete().eq("id", planId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plano excluído com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin-plans"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao excluir plano"),
  });

  const openNew = () => {
    setEditingPlan({ ...emptyPlan });
    setDialogOpen(true);
  };

  const openEdit = (plan: any) => {
    setEditingPlan({
      id: plan.id,
      nome: plan.nome,
      slug: plan.slug,
      descricao: plan.descricao || "",
      preco_mensal: Number(plan.preco_mensal) || 0,
      preco_semestral: Number(plan.preco_semestral) || 0,
      preco_anual: Number(plan.preco_anual) || 0,
      limite_diario_questoes: plan.limite_diario_questoes,
      ativo: plan.ativo,
      stripe_link_mensal: plan.stripe_link_mensal || "",
      stripe_link_semestral: plan.stripe_link_semestral || "",
      stripe_link_anual: plan.stripe_link_anual || "",
    });
    setDialogOpen(true);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk']">Gestão de Planos</h1>
            <p className="text-muted-foreground text-sm">Gerencie os planos da plataforma</p>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Plano
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {isLoading ? (
            <p className="text-muted-foreground col-span-full text-center py-8">Carregando...</p>
          ) : (
            plans?.map((plan) => (
              <Card key={plan.id} className={!plan.ativo ? "opacity-60" : ""}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{plan.nome}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Badge variant={plan.ativo ? "default" : "secondary"}>
                        {plan.ativo ? "Ativo" : "Inativo"}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(plan)}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => {
                          if (confirm(`Tem certeza que deseja excluir o plano "${plan.nome}"?`)) {
                            deleteMutation.mutate(plan.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <p className="text-muted-foreground">{plan.descricao || "Sem descrição"}</p>
                  <div className="grid grid-cols-3 gap-2 pt-2">
                    <div>
                      <p className="text-xs text-muted-foreground">Mensal</p>
                      <p className="font-semibold">R$ {Number(plan.preco_mensal || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Semestral</p>
                      <p className="font-semibold">R$ {Number(plan.preco_semestral || 0).toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Anual</p>
                      <p className="font-semibold">R$ {Number(plan.preco_anual || 0).toFixed(2)}</p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border">
                    <span className="text-xs text-muted-foreground">Limite diário: </span>
                    <span className="font-semibold">{plan.limite_diario_questoes} questões</span>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        {/* Edit/Create Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingPlan?.id ? "Editar Plano" : "Novo Plano"}</DialogTitle>
            </DialogHeader>
            {editingPlan && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    value={editingPlan.nome}
                    onChange={(e) => setEditingPlan({ ...editingPlan, nome: e.target.value })}
                  />
                </div>
                {!editingPlan.id && (
                  <div className="space-y-2">
                    <Label>Slug (identificador único)</Label>
                    <Input
                      value={editingPlan.slug}
                      onChange={(e) => setEditingPlan({ ...editingPlan, slug: e.target.value })}
                      placeholder="ex: pro-plus"
                    />
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    value={editingPlan.descricao}
                    onChange={(e) => setEditingPlan({ ...editingPlan, descricao: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label className="text-xs">Mensal (R$)</Label>
                    <Input
                      type="number"
                      value={editingPlan.preco_mensal}
                      onChange={(e) => setEditingPlan({ ...editingPlan, preco_mensal: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Semestral (R$)</Label>
                    <Input
                      type="number"
                      value={editingPlan.preco_semestral}
                      onChange={(e) => setEditingPlan({ ...editingPlan, preco_semestral: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Anual (R$)</Label>
                    <Input
                      type="number"
                      value={editingPlan.preco_anual}
                      onChange={(e) => setEditingPlan({ ...editingPlan, preco_anual: Number(e.target.value) })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Limite diário de questões</Label>
                  <Input
                    type="number"
                    value={editingPlan.limite_diario_questoes}
                    onChange={(e) => setEditingPlan({ ...editingPlan, limite_diario_questoes: Number(e.target.value) })}
                  />
                </div>
                <div className="space-y-2 border-t border-border pt-4">
                  <Label className="text-sm font-semibold">Links de Pagamento Stripe</Label>
                  <div className="space-y-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Link Mensal</Label>
                      <Input
                        value={editingPlan.stripe_link_mensal}
                        onChange={(e) => setEditingPlan({ ...editingPlan, stripe_link_mensal: e.target.value })}
                        placeholder="https://buy.stripe.com/..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Link Semestral</Label>
                      <Input
                        value={editingPlan.stripe_link_semestral}
                        onChange={(e) => setEditingPlan({ ...editingPlan, stripe_link_semestral: e.target.value })}
                        placeholder="https://buy.stripe.com/..."
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Link Anual</Label>
                      <Input
                        value={editingPlan.stripe_link_anual}
                        onChange={(e) => setEditingPlan({ ...editingPlan, stripe_link_anual: e.target.value })}
                        placeholder="https://buy.stripe.com/..."
                      />
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={editingPlan.ativo}
                    onCheckedChange={(v) => setEditingPlan({ ...editingPlan, ativo: v })}
                  />
                  <Label>Ativo</Label>
                </div>
                <Button
                  className="w-full gap-2"
                  onClick={() => saveMutation.mutate(editingPlan)}
                  disabled={saveMutation.isPending || !editingPlan.nome}
                >
                  <Save className="h-4 w-4" />
                  {saveMutation.isPending ? "Salvando..." : "Salvar"}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
