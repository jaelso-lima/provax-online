import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useAuth } from "@/contexts/AuthContext";
import { Users, BookOpen, PenTool, Percent, CreditCard, Crown, TrendingUp, Download, FileText, CheckCircle, Clock, XCircle, DollarSign } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";
import { generateContractPDF, getContractClauses } from "@/lib/contractPdf";
import { parseSignatureData, getSignatureStatus, isFullySigned } from "@/lib/contractSignature";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";

const COLORS = [
  "hsl(245, 58%, 51%)",
  "hsl(168, 72%, 40%)",
  "hsl(32, 95%, 55%)",
  "hsl(340, 75%, 55%)",
  "hsl(200, 70%, 50%)",
];

export default function AdminDashboard() {
  const { isAdmin, isPartner } = useAdminRole();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showContract, setShowContract] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);

  // Admin stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ["admin-dashboard-stats", isPartner],
    queryFn: async () => {
      const rpcName = isPartner ? "get_partner_stats" : "get_admin_stats";
      const { data, error } = await supabase.rpc(rpcName);
      if (error) throw error;
      return data as any;
    },
    enabled: isAdmin || isPartner,
  });

  // Partner-specific: get restricted dashboard data
  const { data: partnerDash } = useQuery({
    queryKey: ["partner-dashboard", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_partner_dashboard", { _user_id: user!.id });
      if (error) throw error;
      return data as any;
    },
    enabled: isPartner && !!user,
  });

  // Partner's own contract for download
  const { data: partnerContract } = useQuery({
    queryKey: ["partner-own-contract", user?.id],
    queryFn: async () => {
      const { data: partner } = await supabase
        .from("partners")
        .select("*, profiles!partners_user_id_fkey(nome, email)")
        .eq("user_id", user!.id)
        .eq("status", "ativo")
        .maybeSingle();
      return partner;
    },
    enabled: isPartner && !!user,
  });

  // Partner's active contract record
  const { data: activeContract } = useQuery({
    queryKey: ["partner-active-contract", user?.id],
    queryFn: async () => {
      // Get partner id first
      const { data: partner } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", user!.id)
        .eq("status", "ativo")
        .maybeSingle();
      if (!partner) return null;
      const { data } = await supabase
        .from("partner_contracts")
        .select("*")
        .eq("partner_id", partner.id)
        .in("status", ["ativo", "pendente_assinatura", "assinado_socio", "assinado_fundador", "assinado_ambos"])
        .order("versao_contrato", { ascending: false })
        .limit(1)
        .maybeSingle();
      return data;
    },
    enabled: isPartner && !!user,
  });

  // Sign contract as partner
  const signMutation = useMutation({
    mutationFn: async () => {
      if (!activeContract) throw new Error("Nenhum contrato encontrado");
      const sigData = parseSignatureData(activeContract.arquivo_pdf);
      sigData.socio_assinado_em = new Date().toISOString();

      let newStatus = "assinado_socio";
      if (activeContract.status === "assinado_fundador" || sigData.fundador_assinado_em) {
        newStatus = "assinado_ambos";
      }

      const { error } = await supabase
        .from("partner_contracts")
        .update({
          status: newStatus,
          ip_assinatura: "browser",
          arquivo_pdf: JSON.stringify(sigData),
        })
        .eq("id", activeContract.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Contrato assinado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["partner-active-contract"] });
      setShowContract(false);
      setAcceptTerms(false);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao assinar"),
  });

  // Recent signups for growth chart (admin only)
  const { data: recentProfiles } = useQuery({
    queryKey: ["admin-recent-signups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("created_at")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const usersByPlan = stats?.users_by_plan
    ? Object.entries(stats.users_by_plan).map(([name, value]) => ({ name, value: value as number }))
    : [];

  const usageByMode = stats?.usage_by_mode
    ? Object.entries(stats.usage_by_mode).map(([name, value]) => ({
        name: name === "concurso" ? "Concurso" : name === "enem" ? "ENEM" : name,
        total: value as number,
      }))
    : [];

  const subsByPlanPeriod: { plan_name: string; periodo: string; count: number }[] = stats?.subs_by_plan_period ?? [];
  const subsPlanData = subsByPlanPeriod.map((s) => ({
    name: `${s.plan_name} ${s.periodo === "mensal" ? "Mensal" : s.periodo === "semestral" ? "Semestral" : "Anual"}`,
    value: s.count,
  }));

  const signupChart = (() => {
    if (!recentProfiles) return [];
    const months: Record<string, number> = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      months[key] = 0;
    }
    recentProfiles.forEach((p) => {
      const d = new Date(p.created_at);
      const key = d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
      if (key in months) months[key]++;
    });
    return Object.entries(months).map(([month, count]) => ({ month, usuarios: count }));
  })();

  // ===================== PARTNER VIEW =====================
  if (isPartner) {
    const pd = partnerDash;
    const hasError = pd?.error;
    const profile = partnerContract?.profiles as any;
    const sigData = activeContract ? parseSignatureData(activeContract.arquivo_pdf) : {};
    const sigStatus = activeContract ? getSignatureStatus(activeContract.status, sigData) : null;
    const fullySignedContract = activeContract ? isFullySigned(activeContract.status, sigData) : false;
    const partnerAlreadySigned = sigData.socio_assinado_em || activeContract?.status === "assinado_socio" || activeContract?.status === "assinado_ambos";

    const clauses = getContractClauses(partnerContract?.percentual_participacao ?? 0);

    return (
      <AdminLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold font-['Space_Grotesk']">Painel do Sócio</h1>
            <p className="text-muted-foreground text-sm">Sua participação na Provax</p>
          </div>

          {hasError ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">{pd.error}</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Partner metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Percent className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{pd?.percentual ?? "—"}%</p>
                        <p className="text-xs text-muted-foreground">Sua Participação</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-accent/10">
                        <Users className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{pd?.total_users ?? "—"}</p>
                        <p className="text-xs text-muted-foreground">Total Usuários</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <CreditCard className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{stats?.paying_users ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Pagantes Ativos</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-chart-3/10">
                        <TrendingUp className="h-5 w-5" style={{ color: "hsl(32, 95%, 55%)" }} />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{pd?.growth_pct ?? 0}%</p>
                        <p className="text-xs text-muted-foreground">Crescimento Mensal</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Users className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{pd?.current_month_users ?? 0}</p>
                        <p className="text-xs text-muted-foreground">Novos Este Mês</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Assinantes por plano/período */}
              {subsPlanData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Crown className="h-4 w-4 text-primary" />
                      Assinantes Ativos por Plano
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {subsPlanData.map((item, i) => (
                        <div key={item.name} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                          <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold">{item.value} {item.value === 1 ? "usuário" : "usuários"}</p>
                            <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contract Section — Button only, not exposed */}
              {partnerContract && (
                <Card>
                  <CardContent className="py-5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm font-semibold">Contrato de Participação Societária</p>
                          {sigStatus && (
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {sigStatus.icon === "both" && <CheckCircle className="h-3.5 w-3.5 text-green-500" />}
                              {sigStatus.icon === "pending_socio" && <Clock className="h-3.5 w-3.5 text-yellow-500" />}
                              {sigStatus.icon === "pending_fundador" && <Clock className="h-3.5 w-3.5 text-yellow-500" />}
                              {sigStatus.icon === "none" && <XCircle className="h-3.5 w-3.5 text-destructive" />}
                              <span className="text-xs text-muted-foreground">{sigStatus.label}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Button variant="outline" size="sm" className="gap-2" onClick={() => setShowContract(true)}>
                          <FileText className="h-4 w-4" />
                          Visualizar Contrato
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-2"
                          onClick={() => {
                            generateContractPDF({
                              partnerName: profile?.nome || "",
                              partnerEmail: profile?.email || "",
                              percentual: partnerContract.percentual_participacao,
                              valorInvestido: partnerContract.valor_investido,
                              dataEntrada: partnerContract.data_entrada,
                              tipo: partnerContract.tipo_participacao,
                            });
                          }}
                        >
                          <Download className="h-4 w-4" />
                          PDF
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Contract Modal */}
              <Dialog open={showContract} onOpenChange={setShowContract}>
                <DialogContent className="max-w-2xl max-h-[90vh] p-0">
                  <DialogHeader className="p-6 pb-0">
                    <DialogTitle className="flex items-center gap-2">
                      📄 Contrato de Participação Societária
                    </DialogTitle>
                  </DialogHeader>
                  <ScrollArea className="max-h-[70vh] px-6 pb-6">
                    <div className="space-y-4">
                      {/* Header */}
                      <div className="text-center space-y-1 pb-4 border-b border-border">
                        <p className="font-bold text-lg">CONTRATO DE PARTICIPAÇÃO SOCIETÁRIA PRIVADA</p>
                        <p className="text-sm text-muted-foreground">Provax — Plataforma Educacional Digital</p>
                      </div>

                      {/* Partner data */}
                      {profile && (
                        <div className="grid grid-cols-2 gap-3 p-4 rounded-lg bg-muted/50 text-sm">
                          <div>
                            <span className="text-muted-foreground">Sócio Investidor:</span>{" "}
                            <span className="font-semibold">{profile.nome}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">E-mail:</span>{" "}
                            <span className="font-semibold">{profile.email}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Percentual:</span>{" "}
                            <span className="font-semibold">{partnerContract?.percentual_participacao}%</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Valor Investido:</span>{" "}
                            <span className="font-semibold">R$ {Number(partnerContract?.valor_investido).toFixed(2)}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Data de Entrada:</span>{" "}
                            <span className="font-semibold">{new Date(partnerContract?.data_entrada).toLocaleDateString("pt-BR")}</span>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Tipo:</span>{" "}
                            <span className="font-semibold">{partnerContract?.tipo_participacao.replace("_", " ")}</span>
                          </div>
                        </div>
                      )}

                      {/* Clauses */}
                      <div className="space-y-3 pt-2">
                        {clauses.map((c, i) => (
                          <div key={i}>
                            <p className="font-semibold text-sm">{c.title}</p>
                            <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{c.body}</p>
                          </div>
                        ))}
                      </div>

                      {/* Signature status */}
                      <div className="pt-4 border-t border-border space-y-3">
                        {sigStatus && (
                          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-muted/50">
                            {sigStatus.icon === "both" && <CheckCircle className="h-5 w-5 text-green-500" />}
                            {sigStatus.icon === "pending_socio" && <Clock className="h-5 w-5 text-yellow-500" />}
                            {sigStatus.icon === "pending_fundador" && <Clock className="h-5 w-5 text-yellow-500" />}
                            {sigStatus.icon === "none" && <XCircle className="h-5 w-5 text-destructive" />}
                            <span className="text-sm font-medium">{sigStatus.description}</span>
                          </div>
                        )}

                        {sigData.socio_assinado_em && (
                          <p className="text-xs text-muted-foreground text-center">
                            Assinado por você em: {new Date(sigData.socio_assinado_em).toLocaleString("pt-BR")}
                          </p>
                        )}
                        {sigData.fundador_assinado_em && (
                          <p className="text-xs text-muted-foreground text-center">
                            Assinado pelo Fundador em: {new Date(sigData.fundador_assinado_em).toLocaleString("pt-BR")}
                          </p>
                        )}

                        {pd?.contract?.hash && (
                          <p className="text-xs font-mono text-muted-foreground text-center break-all">
                            Hash: {pd.contract.hash}
                          </p>
                        )}

                        {/* Acceptance flow — only if partner hasn't signed yet */}
                        {!partnerAlreadySigned && activeContract && activeContract.status !== "substituido" && (
                          <div className="space-y-3 pt-2 border-t border-border">
                            <div className="flex items-start gap-3">
                              <Checkbox
                                id="accept-terms"
                                checked={acceptTerms}
                                onCheckedChange={(checked) => setAcceptTerms(checked === true)}
                              />
                              <label htmlFor="accept-terms" className="text-sm leading-relaxed cursor-pointer">
                                Declaro que li e aceito os termos do contrato.
                              </label>
                            </div>
                            <Button
                              className="w-full"
                              disabled={!acceptTerms || signMutation.isPending}
                              onClick={() => signMutation.mutate()}
                            >
                              {signMutation.isPending ? "Assinando..." : "✍ Aceitar e Assinar"}
                            </Button>
                          </div>
                        )}

                        {partnerAlreadySigned && (
                          <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-green-500/10 text-green-700 dark:text-green-400">
                            <CheckCircle className="h-4 w-4" />
                            <span className="text-sm font-medium">Contrato já assinado por você</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </ScrollArea>
                </DialogContent>
              </Dialog>

              {/* Distribuição por plano (sem valores financeiros) */}
              {usersByPlan.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Distribuição de Usuários por Plano</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                      <ResponsiveContainer width="100%" height={200} className="sm:w-1/2">
                        <PieChart>
                          <Pie data={usersByPlan} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                            {usersByPlan.map((_, i) => (
                              <Cell key={i} fill={COLORS[i % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="space-y-2">
                        {usersByPlan.map((item, i) => (
                          <div key={item.name} className="flex items-center gap-2 text-sm">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="text-muted-foreground">{item.name}:</span>
                            <span className="font-semibold">{item.value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Partner Payment History */}
              <PartnerPaymentHistory userId={user!.id} />

              <Card className="border-dashed">
                <CardContent className="py-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    🔒 Conforme contrato, dados financeiros detalhados, receita, despesas e dados de outros sócios não são exibidos.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </AdminLayout>
    );
  }

  // ===================== ADMIN VIEW =====================
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-['Space_Grotesk']">Dashboard Administrativo</h1>
          <p className="text-muted-foreground text-sm">Visão geral da plataforma</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "..." : stats?.total_users ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Cadastrados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <CreditCard className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "..." : stats?.paying_users ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Pagantes</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <BookOpen className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "..." : stats?.total_simulados ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Simulados</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-accent/10">
                  <PenTool className="h-5 w-5 text-accent" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{isLoading ? "..." : stats?.total_redacoes ?? 0}</p>
                  <p className="text-xs text-muted-foreground">Redações</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Paying users breakdown */}
        {subsPlanData.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="h-4 w-4 text-primary" />
                Assinantes Ativos por Plano
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {subsPlanData.map((item, i) => (
                  <div key={item.name} className="flex items-center gap-3 p-3 rounded-lg border border-border">
                    <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold">{item.value} {item.value === 1 ? "usuário" : "usuários"}</p>
                      <p className="text-xs text-muted-foreground truncate">{item.name}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Distribuição por Plano</CardTitle>
            </CardHeader>
            <CardContent>
              {usersByPlan.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-4 sm:gap-6">
                  <ResponsiveContainer width="100%" height={200} className="sm:w-1/2">
                    <PieChart>
                      <Pie data={usersByPlan} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}>
                        {usersByPlan.map((_, i) => (
                          <Cell key={i} fill={COLORS[i % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {usersByPlan.map((item, i) => (
                      <div key={item.name} className="flex items-center gap-2 text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-muted-foreground">{item.name}:</span>
                        <span className="font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">Sem dados</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Uso por Categoria</CardTitle>
            </CardHeader>
            <CardContent>
              {usageByMode.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={usageByMode}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="name" className="text-xs" />
                    <YAxis className="text-xs" />
                    <Tooltip />
                    <Bar dataKey="total" fill="hsl(245, 58%, 51%)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-muted-foreground text-sm">Sem dados</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Growth Chart */}
        {signupChart.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Crescimento de Usuários - Últimos 6 Meses</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={signupChart}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="month" className="text-xs" />
                  <YAxis className="text-xs" />
                  <Tooltip />
                  <Area
                    type="monotone"
                    dataKey="usuarios"
                    name="Novos Usuários"
                    stroke="hsl(245, 58%, 51%)"
                    fill="hsl(245, 58%, 51%)"
                    fillOpacity={0.15}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}

function PartnerPaymentHistory({ userId }: { userId: string }) {
  const { data: payments, isLoading } = useQuery({
    queryKey: ["partner-payment-history", userId],
    queryFn: async () => {
      const { data: partner } = await supabase
        .from("partners")
        .select("id")
        .eq("user_id", userId)
        .eq("status", "ativo")
        .maybeSingle();
      if (!partner) return [];
      const { data, error } = await supabase
        .from("partner_payments")
        .select("*")
        .eq("partner_id", partner.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  if (isLoading || !payments?.length) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Histórico de Pagamentos
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {payments.map((pay: any) => (
            <div key={pay.id} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <div>
                <p className="text-sm font-semibold">{pay.mes_referencia}</p>
                <p className="text-xs text-muted-foreground">R$ {Number(pay.valor).toFixed(2)}</p>
              </div>
              <Badge variant={pay.status_pagamento === "pago" ? "default" : "outline"}>
                {pay.status_pagamento === "pago" ? "Pago" : "Pendente"}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
