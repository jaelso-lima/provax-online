import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Shield, UserPlus, FileText, Percent, Ban, CheckCircle, History, Clock, XCircle, PenTool, Eye, Pencil, Trash2 } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { generateContractPDF, getContractClauses } from "@/lib/contractPdf";
import { parseSignatureData, getSignatureStatus, isFullySigned } from "@/lib/contractSignature";

export default function AdminPartners() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [showContracts, setShowContracts] = useState<string | null>(null);
  const [viewContractPartner, setViewContractPartner] = useState<any | null>(null);
  const [newPartner, setNewPartner] = useState({ email: "", percentual: "", valor: "" });

  // Fetch partners with profile info
  const { data: partners, isLoading } = useQuery({
    queryKey: ["admin-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("*, profiles!partners_user_id_fkey(nome, email)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  // Fetch contracts for a partner
  const { data: contracts } = useQuery({
    queryKey: ["admin-partner-contracts", showContracts],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_contracts")
        .select("*")
        .eq("partner_id", showContracts!)
        .order("versao_contrato", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!showContracts,
  });

  // Fetch active contracts for all partners (for signature status)
  const { data: allActiveContracts } = useQuery({
    queryKey: ["admin-all-active-contracts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_contracts")
        .select("*")
        .in("status", ["ativo", "pendente_assinatura", "assinado_socio", "assinado_fundador", "assinado_ambos"])
        .order("versao_contrato", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Add partner
  const addMutation = useMutation({
    mutationFn: async () => {
      const { data: profile, error: pErr } = await supabase
        .from("profiles")
        .select("id, nome, email")
        .eq("email", newPartner.email.trim())
        .single();
      if (pErr || !profile) throw new Error("Usuário não encontrado com este e-mail");

      const percentual = parseFloat(newPartner.percentual);
      const valor = parseFloat(newPartner.valor) || 0;
      if (isNaN(percentual) || percentual <= 0 || percentual > 49) {
        throw new Error("Percentual deve ser entre 0.01 e 49");
      }

      const { data: partner, error } = await supabase.from("partners").insert({
        user_id: profile.id,
        percentual_participacao: percentual,
        valor_investido: valor,
        tipo_participacao: "investidor_passivo",
        criado_por: user!.id,
      }).select().single();
      if (error) throw error;

      const hash = await generateHash(profile.id, percentual, new Date().toISOString());
      const { error: cErr } = await supabase.from("partner_contracts").insert({
        partner_id: partner.id,
        versao_contrato: 1,
        percentual_acordado: percentual,
        valor_investido: valor,
        hash_verificacao: hash,
        criado_por: user!.id,
        status: "pendente_assinatura",
      });
      if (cErr) throw cErr;

      await supabase.rpc("admin_update_role", {
        _target_user_id: profile.id,
        _new_role: "partner" as any,
      });

      return { partner, profile };
    },
    onSuccess: () => {
      toast.success("Sócio adicionado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-active-contracts"] });
      setShowAdd(false);
      setNewPartner({ email: "", percentual: "", valor: "" });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao adicionar sócio"),
  });

  // Sign as admin/founder
  const signAsFounderMutation = useMutation({
    mutationFn: async (contractId: string) => {
      const { data: contract } = await supabase
        .from("partner_contracts")
        .select("*")
        .eq("id", contractId)
        .single();
      if (!contract) throw new Error("Contrato não encontrado");

      const sigData = parseSignatureData(contract.arquivo_pdf);
      sigData.fundador_assinado_em = new Date().toISOString();
      sigData.fundador_ip = "admin-panel";

      let newStatus = "assinado_fundador";
      if (contract.status === "assinado_socio" || sigData.socio_assinado_em) {
        newStatus = "assinado_ambos";
      }

      const { error } = await supabase
        .from("partner_contracts")
        .update({
          status: newStatus,
          arquivo_pdf: JSON.stringify(sigData),
        })
        .eq("id", contractId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contrato assinado como Fundador!");
      queryClient.invalidateQueries({ queryKey: ["admin-all-active-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-partner-contracts"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao assinar"),
  });

  // Change status
  const statusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("partners").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });

  // Delete partner completely
  const deletePartnerMutation = useMutation({
    mutationFn: async ({ id, userId }: { id: string; userId: string }) => {
      // Delete related data first
      await supabase.from("partner_permissions").delete().eq("partner_id", id);
      await supabase.from("partner_payments").delete().eq("partner_id", id);
      await supabase.from("partner_profit_simulation").delete().eq("partner_id", id);
      await supabase.from("partner_contracts").delete().eq("partner_id", id);
      
      const { error } = await supabase.from("partners").delete().eq("id", id);
      if (error) throw error;

      // Revert role back to user
      await supabase.rpc("admin_update_role", {
        _target_user_id: userId,
        _new_role: "user" as any,
      });
    },
    onSuccess: () => {
      toast.success("Sócio excluído com sucesso. Agora pode recadastrá-lo.");
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-active-contracts"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao excluir sócio"),
  });

  // Edit partner fields
  const editPartnerMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Record<string, any> }) => {
      const { error } = await supabase.from("partners").update({ ...updates, updated_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Sócio atualizado com sucesso");
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar sócio"),
  });

  // Update percentual (creates new contract)
  const updatePercentualMutation = useMutation({
    mutationFn: async ({ partnerId, newPercentual }: { partnerId: string; newPercentual: number }) => {
      await supabase.from("partner_contracts").update({ status: "substituido" }).eq("partner_id", partnerId).in("status", ["ativo", "pendente_assinatura", "assinado_socio", "assinado_fundador", "assinado_ambos"]);

      const { data: existing } = await supabase
        .from("partner_contracts")
        .select("versao_contrato")
        .eq("partner_id", partnerId)
        .order("versao_contrato", { ascending: false })
        .limit(1);
      const nextVersion = (existing?.[0]?.versao_contrato ?? 0) + 1;

      const { error } = await supabase.from("partners").update({
        percentual_participacao: newPercentual,
        updated_at: new Date().toISOString(),
      }).eq("id", partnerId);
      if (error) throw error;

      const { data: p } = await supabase.from("partners").select("user_id, valor_investido").eq("id", partnerId).single();
      const hash = await generateHash(p!.user_id, newPercentual, new Date().toISOString());

      const { error: cErr } = await supabase.from("partner_contracts").insert({
        partner_id: partnerId,
        versao_contrato: nextVersion,
        percentual_acordado: newPercentual,
        valor_investido: p!.valor_investido,
        hash_verificacao: hash,
        criado_por: user!.id,
        status: "pendente_assinatura",
      });
      if (cErr) throw cErr;
    },
    onSuccess: () => {
      toast.success("Percentual atualizado e novo contrato gerado");
      queryClient.invalidateQueries({ queryKey: ["admin-partners"] });
      queryClient.invalidateQueries({ queryKey: ["admin-partner-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["admin-all-active-contracts"] });
    },
    onError: (e: any) => toast.error(e.message || "Erro ao atualizar"),
  });

  const totalPercentual = partners
    ?.filter((p: any) => p.status === "ativo")
    .reduce((acc: number, p: any) => acc + Number(p.percentual_participacao), 0) ?? 0;

  // Helper to get active contract for a partner
  const getActiveContract = (partnerId: string) => {
    return allActiveContracts?.find(c => c.partner_id === partnerId);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk'] flex items-center gap-2">
              <Shield className="h-6 w-6 text-primary" />
              Módulo Societário
            </h1>
            <p className="text-muted-foreground text-sm">Governança e controle de participações</p>
          </div>
          <Button onClick={() => setShowAdd(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Adicionar Sócio
          </Button>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{partners?.filter((p: any) => p.status === "ativo").length ?? 0}</p>
              <p className="text-xs text-muted-foreground">Sócios Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{totalPercentual.toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground">Total Distribuído</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">{(100 - totalPercentual).toFixed(2)}%</p>
              <p className="text-xs text-muted-foreground">Fundador Retém</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold">49%</p>
              <p className="text-xs text-muted-foreground">Limite Máximo</p>
            </CardContent>
          </Card>
        </div>

        {/* Partners list */}
        <div className="space-y-3">
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : partners?.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">Nenhum sócio cadastrado</p>
              </CardContent>
            </Card>
          ) : (
            partners?.map((p: any) => {
              const activeContract = getActiveContract(p.id);
              const sigData = activeContract ? parseSignatureData(activeContract.arquivo_pdf) : {};
              const sigStatus = activeContract ? getSignatureStatus(activeContract.status, sigData) : null;
              const fullyS = activeContract ? isFullySigned(activeContract.status, sigData) : false;
              const founderSigned = sigData.fundador_assinado_em || activeContract?.status === "assinado_fundador" || activeContract?.status === "assinado_ambos";

              return (
                <PartnerCard
                  key={p.id}
                  partner={p}
                  sigStatus={sigStatus}
                  fullySigned={fullyS}
                  founderSigned={!!founderSigned}
                  activeContractId={activeContract?.id}
                  onStatusChange={(status) => statusMutation.mutate({ id: p.id, status })}
                  onViewContracts={() => setShowContracts(p.id)}
                  onUpdatePercentual={(val) => updatePercentualMutation.mutate({ partnerId: p.id, newPercentual: val })}
                  onEditPartner={(updates) => editPartnerMutation.mutate({ id: p.id, updates })}
                  onDeletePartner={() => deletePartnerMutation.mutate({ id: p.id, userId: p.user_id })}
                  deletePending={deletePartnerMutation.isPending}
                  onDownloadContract={() => downloadContract(p)}
                  onViewContractInline={() => setViewContractPartner(p)}
                  onSignAsFounder={(contractId) => signAsFounderMutation.mutate(contractId)}
                  signingPending={signAsFounderMutation.isPending}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Add Partner Dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Adicionar Sócio Investidor</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>E-mail do Usuário</Label>
              <Input
                placeholder="email@exemplo.com"
                value={newPartner.email}
                onChange={(e) => setNewPartner({ ...newPartner, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Percentual de Participação (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                max="49"
                placeholder="Ex: 10"
                value={newPartner.percentual}
                onChange={(e) => setNewPartner({ ...newPartner, percentual: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">Máximo: {(49 - totalPercentual).toFixed(2)}% disponível</p>
            </div>
            <div className="space-y-2">
              <Label>Valor Investido (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="Ex: 5000.00"
                value={newPartner.valor}
                onChange={(e) => setNewPartner({ ...newPartner, valor: e.target.value })}
              />
            </div>
            <Button
              className="w-full"
              onClick={() => addMutation.mutate()}
              disabled={addMutation.isPending || !newPartner.email || !newPartner.percentual}
            >
              {addMutation.isPending ? "Adicionando..." : "Confirmar e Gerar Contrato"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Contracts History Dialog */}
      <Dialog open={!!showContracts} onOpenChange={(open) => !open && setShowContracts(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Contratos
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-auto">
            {contracts?.map((c) => {
              const cSigData = parseSignatureData(c.arquivo_pdf);
              const cSigStatus = getSignatureStatus(c.status, cSigData);
              return (
                <div key={c.id} className="p-3 rounded-lg border border-border space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">Versão {c.versao_contrato}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(c.data_assinatura).toLocaleDateString("pt-BR")} • {c.percentual_acordado}%
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {cSigStatus.icon === "both" && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                      {(cSigStatus.icon === "pending_socio" || cSigStatus.icon === "pending_fundador") && <Clock className="h-3.5 w-3.5 text-yellow-500" />}
                      {cSigStatus.icon === "none" && c.status !== "substituido" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                      <Badge variant={
                        c.status === "assinado_ambos" ? "default" :
                        c.status === "substituido" ? "secondary" :
                        c.status === "ativo" ? "default" :
                        "outline"
                      }>
                        {cSigStatus.label}
                      </Badge>
                    </div>
                  </div>
                  {cSigData.socio_assinado_em && (
                    <p className="text-xs text-muted-foreground">Sócio assinou: {new Date(cSigData.socio_assinado_em).toLocaleString("pt-BR")}</p>
                  )}
                  {cSigData.fundador_assinado_em && (
                    <p className="text-xs text-muted-foreground">Fundador assinou: {new Date(cSigData.fundador_assinado_em).toLocaleString("pt-BR")}</p>
                  )}
                  {c.hash_verificacao && (
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      Hash: {c.hash_verificacao}
                    </p>
                  )}
                </div>
              );
            })}
            {(!contracts || contracts.length === 0) && (
              <p className="text-sm text-muted-foreground text-center py-4">Nenhum contrato</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* View Contract Inline Dialog */}
      <Dialog open={!!viewContractPartner} onOpenChange={(open) => !open && setViewContractPartner(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Contrato de Participação Societária
            </DialogTitle>
          </DialogHeader>
          {viewContractPartner && (
            <ContractInlineView partner={viewContractPartner} />
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}

// Partner Card Component
function PartnerCard({
  partner,
  sigStatus,
  fullySigned,
  founderSigned,
  activeContractId,
  onStatusChange,
  onViewContracts,
  onUpdatePercentual,
  onEditPartner,
  onDeletePartner,
  deletePending,
  onDownloadContract,
  onViewContractInline,
  onSignAsFounder,
  signingPending,
}: {
  partner: any;
  sigStatus: ReturnType<typeof getSignatureStatus> | null;
  fullySigned: boolean;
  founderSigned: boolean;
  activeContractId?: string;
  onStatusChange: (status: string) => void;
  onViewContracts: () => void;
  onUpdatePercentual: (val: number) => void;
  onEditPartner: (updates: Record<string, any>) => void;
  onDeletePartner: () => void;
  deletePending: boolean;
  onDownloadContract: () => void;
  onViewContractInline: () => void;
  onSignAsFounder: (contractId: string) => void;
  signingPending: boolean;
}) {
  const [editPercentual, setEditPercentual] = useState(false);
  const [newPct, setNewPct] = useState(String(partner.percentual_participacao));
  const [showEdit, setShowEdit] = useState(false);
  const [editData, setEditData] = useState({
    valor_investido: String(partner.valor_investido),
    tipo_participacao: partner.tipo_participacao,
    pix_chave: partner.pix_chave || "",
    pix_tipo: partner.pix_tipo || "",
    banco: partner.banco || "",
    agencia: partner.agencia || "",
    conta: partner.conta || "",
    titular: partner.titular || "",
  });

  const profile = partner.profiles;

  return (
    <Card>
      <CardContent className="py-4 space-y-3">
        {/* Mobile: contract buttons row at top */}
        <div className="flex items-center gap-2 flex-wrap lg:hidden">
          <Button variant="outline" size="sm" onClick={onViewContractInline} className="gap-1">
            <Eye className="h-3.5 w-3.5" />
            Visualizar
          </Button>
          <Button variant="outline" size="sm" onClick={onDownloadContract} className="gap-1">
            <FileText className="h-3.5 w-3.5" />
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={onViewContracts} className="gap-1">
            <History className="h-3.5 w-3.5" />
            Histórico
          </Button>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold">{profile?.nome || "—"}</p>
              <Badge variant={partner.status === "ativo" ? "default" : partner.status === "suspenso" ? "secondary" : "destructive"}>
                {partner.status === "ativo" ? "Ativo" : partner.status === "suspenso" ? "Suspenso" : "Rescindido"}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{profile?.email}</p>
            <div className="flex gap-4 mt-1 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1">
                <Percent className="h-3 w-3" />
                {partner.percentual_participacao}%
              </span>
              <span>R$ {Number(partner.valor_investido).toFixed(2)} investido</span>
              <span>Entrada: {new Date(partner.data_entrada).toLocaleDateString("pt-BR")}</span>
              <span className="capitalize">{partner.tipo_participacao.replace("_", " ")}</span>
            </div>

            {/* Signature status badge */}
            {sigStatus && (
              <div className="flex items-center gap-1.5 mt-2">
                {sigStatus.icon === "both" && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                {(sigStatus.icon === "pending_socio" || sigStatus.icon === "pending_fundador") && <Clock className="h-3.5 w-3.5 text-yellow-500" />}
                {sigStatus.icon === "none" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                <span className="text-xs font-medium">{sigStatus.label}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Edit partner */}
            {partner.status === "ativo" && (
              <Dialog open={showEdit} onOpenChange={setShowEdit}>
                <Button variant="outline" size="sm" onClick={() => setShowEdit(true)} className="gap-1">
                  <Pencil className="h-3.5 w-3.5" />
                  Editar
                </Button>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>Editar Sócio — {profile?.nome}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-[60vh] overflow-auto pr-1">
                    <div className="space-y-2">
                      <Label>Valor Investido (R$)</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editData.valor_investido}
                        onChange={(e) => setEditData({ ...editData, valor_investido: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tipo de Participação</Label>
                      <Select value={editData.tipo_participacao} onValueChange={(v) => setEditData({ ...editData, tipo_participacao: v })}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="investidor_passivo">Investidor Passivo</SelectItem>
                          <SelectItem value="investidor_ativo">Investidor Ativo</SelectItem>
                          <SelectItem value="co_fundador">Co-Fundador</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="border-t border-border pt-3">
                      <p className="text-sm font-medium mb-3">Dados Bancários / PIX</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label>Tipo PIX</Label>
                          <Select value={editData.pix_tipo} onValueChange={(v) => setEditData({ ...editData, pix_tipo: v })}>
                            <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="cpf">CPF</SelectItem>
                              <SelectItem value="cnpj">CNPJ</SelectItem>
                              <SelectItem value="email">E-mail</SelectItem>
                              <SelectItem value="telefone">Telefone</SelectItem>
                              <SelectItem value="aleatoria">Chave Aleatória</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Chave PIX</Label>
                          <Input value={editData.pix_chave} onChange={(e) => setEditData({ ...editData, pix_chave: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Banco</Label>
                          <Input value={editData.banco} onChange={(e) => setEditData({ ...editData, banco: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Agência</Label>
                          <Input value={editData.agencia} onChange={(e) => setEditData({ ...editData, agencia: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Conta</Label>
                          <Input value={editData.conta} onChange={(e) => setEditData({ ...editData, conta: e.target.value })} />
                        </div>
                        <div className="space-y-2">
                          <Label>Titular</Label>
                          <Input value={editData.titular} onChange={(e) => setEditData({ ...editData, titular: e.target.value })} />
                        </div>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => {
                        onEditPartner({
                          valor_investido: parseFloat(editData.valor_investido) || 0,
                          tipo_participacao: editData.tipo_participacao,
                          pix_chave: editData.pix_chave || null,
                          pix_tipo: editData.pix_tipo || null,
                          banco: editData.banco || null,
                          agencia: editData.agencia || null,
                          conta: editData.conta || null,
                          titular: editData.titular || null,
                        });
                        setShowEdit(false);
                      }}
                    >
                      Salvar Alterações
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Sign as founder */}
            {activeContractId && !founderSigned && !fullySigned && (
              <Button
                variant="default"
                size="sm"
                className="gap-1"
                disabled={signingPending}
                onClick={() => onSignAsFounder(activeContractId)}
              >
                <PenTool className="h-3.5 w-3.5" />
                {signingPending ? "Assinando..." : "Assinar como Fundador"}
              </Button>
            )}

            {/* View contract inline - desktop only */}
            <Button variant="outline" size="sm" onClick={onViewContractInline} className="gap-1 hidden lg:flex">
              <Eye className="h-3.5 w-3.5" />
              Visualizar
            </Button>

            {/* Download contract - desktop only */}
            <Button variant="outline" size="sm" onClick={onDownloadContract} className="gap-1 hidden lg:flex">
              <FileText className="h-3.5 w-3.5" />
              PDF
            </Button>

            {/* View contracts - desktop only */}
            <Button variant="outline" size="sm" onClick={onViewContracts} className="gap-1 hidden lg:flex">
              <History className="h-3.5 w-3.5" />
              Histórico
            </Button>

            {/* Edit percentual */}
            {partner.status === "ativo" && !partner.bloqueado_para_edicao && (
              <Dialog open={editPercentual} onOpenChange={setEditPercentual}>
                <Button variant="outline" size="sm" onClick={() => setEditPercentual(true)} className="gap-1">
                  <Percent className="h-3.5 w-3.5" />
                  Alterar %
                </Button>
                <DialogContent className="max-w-xs">
                  <DialogHeader>
                    <DialogTitle>Alterar Percentual</DialogTitle>
                  </DialogHeader>
                  <p className="text-xs text-muted-foreground">
                    Um novo contrato será gerado automaticamente.
                  </p>
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    max="49"
                    value={newPct}
                    onChange={(e) => setNewPct(e.target.value)}
                  />
                  <Button
                    className="w-full"
                    onClick={() => {
                      onUpdatePercentual(parseFloat(newPct));
                      setEditPercentual(false);
                    }}
                  >
                    Confirmar Alteração
                  </Button>
                </DialogContent>
              </Dialog>
            )}

            {/* Status actions */}
            {partner.status === "ativo" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 gap-1">
                    <Ban className="h-3.5 w-3.5" />
                    Suspender
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Suspender participação?</AlertDialogTitle>
                    <AlertDialogDescription>
                      O sócio {profile?.nome} será suspenso e perderá acesso ao painel.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction onClick={() => onStatusChange("suspenso")}>Confirmar</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {partner.status === "suspenso" && (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => onStatusChange("ativo")}>
                <CheckCircle className="h-3.5 w-3.5" />
                Reativar
              </Button>
            )}

            {partner.status !== "rescindido" && (
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="text-destructive border-destructive/30 gap-1">
                    Rescindir
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Rescindir contrato?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Esta ação é irreversível. O contrato será marcado como rescindido e o sócio perderá toda participação.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => onStatusChange("rescindido")}
                    >
                      Rescindir Permanentemente
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}

            {/* Delete partner (for rescinded or to re-register) */}
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-destructive border-destructive/30 gap-1" disabled={deletePending}>
                  <Trash2 className="h-3.5 w-3.5" />
                  Excluir
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Excluir sócio permanentemente?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Todos os dados deste sócio serão removidos (contratos, pagamentos, permissões). 
                    O usuário voltará a ser um usuário comum e poderá ser recadastrado como sócio novamente.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={onDeletePartner}
                  >
                    {deletePending ? "Excluindo..." : "Excluir Permanentemente"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}

async function generateHash(userId: string, percentual: number, timestamp: string): Promise<string> {
  const data = `${userId}:${percentual}:${timestamp}`;
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function downloadContract(partner: any) {
  const profile = partner.profiles;
  generateContractPDF({
    partnerName: profile?.nome || "—",
    partnerEmail: profile?.email || "",
    percentual: partner.percentual_participacao,
    valorInvestido: partner.valor_investido,
    dataEntrada: partner.data_entrada,
    tipo: partner.tipo_participacao,
  });
}

function ContractInlineView({ partner }: { partner: any }) {
  const profile = partner.profiles;
  const clauses = getContractClauses(partner.percentual_participacao);

  return (
    <div className="space-y-6 text-sm">
      {/* Header */}
      <div className="text-center space-y-1 border-b border-border pb-4">
        <h2 className="text-lg font-bold">CONTRATO DE PARTICIPAÇÃO SOCIETÁRIA PRIVADA</h2>
        <p className="text-muted-foreground">Provax — Plataforma Educacional Digital</p>
      </div>

      {/* Partner info */}
      <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-muted/50">
        <div>
          <p className="text-xs text-muted-foreground">Sócio Investidor</p>
          <p className="font-semibold">{profile?.nome || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">E-mail</p>
          <p>{profile?.email || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Percentual</p>
          <p className="font-semibold">{partner.percentual_participacao}%</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Valor Investido</p>
          <p>R$ {Number(partner.valor_investido).toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Data de Entrada</p>
          <p>{new Date(partner.data_entrada).toLocaleDateString("pt-BR")}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Tipo</p>
          <p className="capitalize">{partner.tipo_participacao.replace("_", " ")}</p>
        </div>
      </div>

      {/* Clauses */}
      <div className="space-y-4">
        {clauses.map((clause, i) => (
          <div key={i} className="space-y-1">
            <h3 className="font-bold text-sm">{clause.title}</h3>
            <p className="text-muted-foreground whitespace-pre-line leading-relaxed">{clause.body}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="border-t border-border pt-4 text-center space-y-4 text-xs text-muted-foreground">
        <div className="flex justify-around">
          <div>
            <p className="border-t border-foreground/30 pt-1 px-8">Fundador — Provax</p>
          </div>
          <div>
            <p className="border-t border-foreground/30 pt-1 px-8">Sócio — {profile?.nome || "—"}</p>
          </div>
        </div>
        <p>Contrato digital gerado em {new Date().toLocaleDateString("pt-BR")}</p>
      </div>
    </div>
  );
}
