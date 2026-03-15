import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Search, Ban, CheckCircle, XCircle, ChevronLeft, ChevronRight, Crown, Pencil, Trash2, AlertTriangle } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";

// ─── Duration presets ────────────────────────────────────────────
const DURATION_PRESETS = [
  { label: "30 dias", value: "30" },
  { label: "90 dias", value: "90" },
  { label: "180 dias", value: "180" },
  { label: "365 dias", value: "365" },
  { label: "Personalizado", value: "custom" },
];

const MOTIVO_PRESETS = [
  "Teste interno",
  "Suporte ao cliente",
  "Cortesia estratégica",
  "Influenciador / Parceria",
  "Correção de erro",
];

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(0);
  const [grantPlanUser, setGrantPlanUser] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState("start");
  const [selectedDuration, setSelectedDuration] = useState("30");
  const [customDays, setCustomDays] = useState("");
  const [motivo, setMotivo] = useState("");
  const [editUser, setEditUser] = useState<any>(null);
  const [editNome, setEditNome] = useState("");
  const limit = 20;
  const queryClient = useQueryClient();

  const handleSearch = () => { setDebouncedSearch(search); setPage(0); };

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users", debouncedSearch, page],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("admin_list_users", {
        _search: debouncedSearch, _limit: limit, _offset: page * limit,
      });
      if (error) throw error;
      return data as any;
    },
  });

  const { data: plans } = useQuery({
    queryKey: ["admin-plans-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").eq("ativo", true).order("limite_diario_questoes");
      if (error) throw error;
      return data;
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("suspend_account", { _target_user_id: userId, _reason: "Bloqueado pelo administrador" });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Usuário bloqueado"); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: () => toast.error("Erro ao bloquear"),
  });

  const reactivateMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("reactivate_account", { _target_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Usuário desbloqueado"); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: () => toast.error("Erro ao desbloquear"),
  });

  const cancelSubMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("admin_cancel_subscription", { _target_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Assinatura cancelada"); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: () => toast.error("Erro ao cancelar assinatura"),
  });

  const roleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const { error } = await supabase.rpc("admin_update_role", { _target_user_id: userId, _new_role: role as any });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Permissão atualizada"); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar permissão"),
  });

  const grantPlanMutation = useMutation({
    mutationFn: async ({ userId, planSlug, dias, motivo }: { userId: string; planSlug: string; dias: number; motivo: string }) => {
      const periodo = dias <= 31 ? "mensal" : dias <= 92 ? "semestral" : "anual";
      const { error } = await supabase.rpc("admin_grant_plan", {
        _target_user_id: userId, _plan_slug: planSlug, _periodo: periodo, _dias: dias, _motivo: motivo || null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Plano liberado manualmente com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setGrantPlanUser(null);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao liberar plano"),
  });

  const editNameMutation = useMutation({
    mutationFn: async ({ userId, nome }: { userId: string; nome: string }) => {
      const { error } = await supabase.from("profiles").update({ nome }).eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Nome atualizado"); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); setEditUser(null); },
    onError: () => toast.error("Erro ao atualizar nome"),
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      const { error } = await supabase.rpc("admin_delete_user", { _target_user_id: userId });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Usuário excluído permanentemente"); queryClient.invalidateQueries({ queryKey: ["admin-users"] }); },
    onError: (e: any) => toast.error(e.message || "Erro ao excluir usuário"),
  });

  const users = data?.users ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const getEffectiveDays = () => {
    if (selectedDuration === "custom") return parseInt(customDays) || 0;
    return parseInt(selectedDuration);
  };

  const handleGrantPlan = () => {
    const dias = getEffectiveDays();
    if (dias <= 0) { toast.error("Defina uma duração válida"); return; }
    grantPlanMutation.mutate({ userId: grantPlanUser.id, planSlug: selectedPlan, dias, motivo });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-['Space_Grotesk']">Gestão de Usuários</h1>
          <p className="text-muted-foreground text-sm">{total} usuários cadastrados</p>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou e-mail..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} className="pl-10" />
          </div>
          <Button onClick={handleSearch}>Buscar</Button>
        </div>

        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : users.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Nenhum usuário encontrado</div>
          ) : (
            users.map((u: any) => (
              <Card key={u.id}>
                <CardContent className="py-4">
                  <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold truncate">{u.nome || "Sem nome"}</p>
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { setEditUser(u); setEditNome(u.nome || ""); }}>
                          <Pencil className="h-3 w-3" />
                        </Button>
                        <Badge variant={u.account_status === "active" ? "default" : "destructive"} className="text-xs">
                          {u.account_status === "active" ? "Ativo" : "Bloqueado"}
                        </Badge>
                        <Badge variant="outline" className="text-xs">{u.role || "user"}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                      <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>Nível {u.nivel} • {u.xp} XP</span>
                        <span>{u.saldo_moedas} moedas</span>
                        {u.subscription ? (
                          <span className="text-primary font-medium">
                            {u.subscription.plan_name} ({u.subscription.periodo})
                            {u.subscription.origem === "manual_admin" && (
                              <Badge variant="outline" className="ml-1 text-[10px] px-1 py-0 border-primary/40 text-primary">Manual</Badge>
                            )}
                            {u.subscription.expires_at && (
                              <> • até {new Date(u.subscription.expires_at).toLocaleDateString("pt-BR")}</>
                            )}
                            {u.subscription.motivo_liberacao && (
                              <span className="text-muted-foreground ml-1">({u.subscription.motivo_liberacao})</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">Plano Free</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                      <Select value={u.role || "user"} onValueChange={(val) => roleMutation.mutate({ userId: u.id, role: val })}>
                        <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="user">Aluno</SelectItem>
                          <SelectItem value="partner">Sócio</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>

                      <Button variant="outline" size="sm" className="text-primary border-primary/30" onClick={() => {
                        setGrantPlanUser(u); setSelectedPlan("start"); setSelectedDuration("30"); setCustomDays(""); setMotivo("");
                      }}>
                        <Crown className="h-3.5 w-3.5 mr-1" /> Liberar Plano
                      </Button>

                      {u.account_status === "active" ? (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-destructive border-destructive/30">
                              <Ban className="h-3.5 w-3.5 mr-1" /> Bloquear
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Bloquear usuário?</AlertDialogTitle>
                              <AlertDialogDescription>O usuário {u.nome} será impedido de acessar a plataforma.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => suspendMutation.mutate(u.id)}>Confirmar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      ) : (
                        <Button variant="outline" size="sm" className="text-accent border-accent/30" onClick={() => reactivateMutation.mutate(u.id)}>
                          <CheckCircle className="h-3.5 w-3.5 mr-1" /> Desbloquear
                        </Button>
                      )}

                      {u.subscription && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="outline" size="sm"><XCircle className="h-3.5 w-3.5 mr-1" /> Cancelar Assinatura</Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Cancelar assinatura?</AlertDialogTitle>
                              <AlertDialogDescription>A assinatura de {u.nome} será cancelada e o plano voltará para Free.</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => cancelSubMutation.mutate(u.id)}>Confirmar</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}

                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" className="text-destructive border-destructive/30">
                            <Trash2 className="h-3.5 w-3.5 mr-1" /> Excluir
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Excluir usuário permanentemente?</AlertDialogTitle>
                            <AlertDialogDescription>
                              Todos os dados de <span className="font-semibold">{u.nome || u.email}</span> serão removidos permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteUserMutation.mutate(u.id)}>
                              Excluir Permanentemente
                            </AlertDialogAction>
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

        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4">
            <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(page - 1)}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm text-muted-foreground">Página {page + 1} de {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(page + 1)}><ChevronRight className="h-4 w-4" /></Button>
          </div>
        )}
      </div>

      {/* ─── Enhanced Grant Plan Modal ──────────────────────────── */}
      <Dialog open={!!grantPlanUser} onOpenChange={(open) => !open && setGrantPlanUser(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Crown className="h-5 w-5 text-primary" /> Liberar Plano Manualmente</DialogTitle>
            <DialogDescription>Liberar plano pago sem gerar cobrança. Apenas complementa o sistema existente.</DialogDescription>
          </DialogHeader>
          {grantPlanUser && (
            <div className="space-y-4">
              <div className="rounded-lg border bg-secondary/30 p-3">
                <p className="text-sm font-medium">{grantPlanUser.nome || "Sem nome"}</p>
                <p className="text-xs text-muted-foreground">{grantPlanUser.email}</p>
                {grantPlanUser.subscription && (
                  <div className="mt-2 flex items-center gap-2">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                    <span className="text-xs text-warning">
                      Possui assinatura ativa: {grantPlanUser.subscription.plan_name}
                      {grantPlanUser.subscription.origem === "manual_admin" ? " (Manual)" : " (Stripe)"}
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Plano *</Label>
                <Select value={selectedPlan} onValueChange={setSelectedPlan}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {plans?.filter(p => p.slug !== "free").map((p) => (
                      <SelectItem key={p.slug} value={p.slug}>{p.nome} — {p.limite_diario_questoes} questões/dia</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duração *</Label>
                <Select value={selectedDuration} onValueChange={setSelectedDuration}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DURATION_PRESETS.map(d => (
                      <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedDuration === "custom" && (
                  <Input type="number" placeholder="Número de dias" value={customDays} onChange={e => setCustomDays(e.target.value)} min={1} max={3650} />
                )}
              </div>

              <div className="space-y-2">
                <Label>Motivo (opcional)</Label>
                <Select value={motivo} onValueChange={setMotivo}>
                  <SelectTrigger><SelectValue placeholder="Selecione ou digite abaixo" /></SelectTrigger>
                  <SelectContent>
                    {MOTIVO_PRESETS.map(m => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Textarea placeholder="Ou descreva o motivo..." value={motivo} onChange={e => setMotivo(e.target.value)} rows={2} className="text-sm" />
              </div>

              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground space-y-1">
                <p>📋 <strong>Resumo:</strong></p>
                <p>• Plano: {plans?.find(p => p.slug === selectedPlan)?.nome || selectedPlan}</p>
                <p>• Duração: {getEffectiveDays()} dias</p>
                <p>• Expira em: {new Date(Date.now() + getEffectiveDays() * 86400000).toLocaleDateString("pt-BR")}</p>
                <p>• Origem: Liberação Administrativa</p>
                {motivo && <p>• Motivo: {motivo}</p>}
              </div>

              <Button className="w-full gap-2" onClick={handleGrantPlan} disabled={grantPlanMutation.isPending || getEffectiveDays() <= 0}>
                <Crown className="h-4 w-4" />
                {grantPlanMutation.isPending ? "Liberando..." : "Confirmar Liberação"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Name Dialog */}
      <Dialog open={!!editUser} onOpenChange={(open) => !open && setEditUser(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Editar Usuário</DialogTitle></DialogHeader>
          {editUser && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">{editUser.email}</p>
              <div className="space-y-2">
                <Label>Nome</Label>
                <Input value={editNome} onChange={(e) => setEditNome(e.target.value)} />
              </div>
              <Button className="w-full" onClick={() => editNameMutation.mutate({ userId: editUser.id, nome: editNome })} disabled={editNameMutation.isPending || !editNome.trim()}>
                {editNameMutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
