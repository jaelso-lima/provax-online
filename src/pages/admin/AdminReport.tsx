import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminRole } from "@/hooks/useAdminRole";
import { FileText, Download } from "lucide-react";
import { useState } from "react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function AdminReport() {
  const { isAdmin, isPartner } = useAdminRole();
  const [periodo, setPeriodo] = useState("30");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [generating, setGenerating] = useState(false);
  const [selectedPartnerId, setSelectedPartnerId] = useState<string>("all");

  // PDF section checkboxes
  const [includeFinancial, setIncludeFinancial] = useState(true);
  const [includeCostBreakdown, setIncludeCostBreakdown] = useState(true);
  const [includeGatewayFees, setIncludeGatewayFees] = useState(false);
  const [includePartnerSharing, setIncludePartnerSharing] = useState(true);

  const { data: stats } = useQuery({
    queryKey: ["report-stats", isPartner],
    queryFn: async () => {
      const rpcName = isPartner ? "get_partner_stats" : "get_admin_stats";
      const { data, error } = await supabase.rpc(rpcName);
      if (error) throw error;
      return data as any;
    },
    enabled: isAdmin || isPartner,
  });

  const { data: financialStats } = useQuery({
    queryKey: ["report-financial"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_admin_financial_stats");
      if (error) throw error;
      return data as any;
    },
    enabled: isAdmin,
  });

  const { data: expenses } = useQuery({
    queryKey: ["report-expenses"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expenses").select("*").order("data", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: partners } = useQuery({
    queryKey: ["report-partners"],
    queryFn: async () => {
      const { data, error } = await supabase.from("partners").select("*, profiles:user_id(nome, email)").eq("status", "ativo");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const { data: plans } = useQuery({
    queryKey: ["report-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.from("plans").select("*").eq("ativo", true).order("preco_mensal");
      if (error) throw error;
      return data;
    },
    enabled: isAdmin,
  });

  const getPeriodLabel = () => {
    if (periodo === "custom") return `${customStart} a ${customEnd}`;
    return `Últimos ${periodo} dias`;
  };

  // Calculate estimated revenue from active subscriptions
  const calcRevenue = () => {
    if (!financialStats || !plans) return { bruta: 0, custos: 0, liquida: 0 };
    const subsByPlan = financialStats.subscriptions_by_plan || {};
    let bruta = 0;
    // Estimate monthly revenue from active subs
    for (const [planName, count] of Object.entries(subsByPlan)) {
      const plan = plans.find((p: any) => p.nome === planName);
      if (plan) bruta += (plan.preco_mensal || 0) * (count as number);
    }
    const custos = Number(financialStats.monthly_expenses || 0);
    return { bruta, custos, liquida: bruta - custos };
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 20;

      // Header
      doc.setFontSize(24);
      doc.setTextColor(99, 79, 198);
      doc.text("ProvaX", 14, y);
      doc.setFontSize(10);
      doc.setTextColor(128, 128, 128);
      doc.text("Relatório Consolidado", pageWidth - 14, y, { align: "right" });
      y += 8;
      doc.text(`Gerado em: ${new Date().toLocaleDateString("pt-BR")} às ${new Date().toLocaleTimeString("pt-BR")}`, pageWidth - 14, y, { align: "right" });
      y += 4;
      doc.text(`Período: ${getPeriodLabel()}`, pageWidth - 14, y, { align: "right" });
      y += 10;

      doc.setDrawColor(200, 200, 200);
      doc.line(14, y, pageWidth - 14, y);
      y += 10;

      // Stats section
      doc.setFontSize(14);
      doc.setTextColor(30, 30, 30);
      doc.text("📊 Visão Geral", 14, y);
      y += 8;

      const statsData = [
        ["Total de Usuários", String(stats?.total_users ?? 0)],
        ["Usuários Pagantes", String(stats?.paying_users ?? 0)],
        ["Crescimento Mensal", `${stats?.growth_pct ?? 0}%`],
        ["Total de Simulados", String(stats?.total_simulados ?? 0)],
        ["Total de Redações", String(stats?.total_redacoes ?? 0)],
      ];

      autoTable(doc, {
        startY: y,
        head: [["Métrica", "Valor"]],
        body: statsData,
        theme: "grid",
        headStyles: { fillColor: [99, 79, 198] },
        margin: { left: 14, right: 14 },
      });

      y = (doc as any).lastAutoTable.finalY + 12;

      // Distribution by plan
      if (stats?.users_by_plan) {
        doc.setFontSize(14);
        doc.text("📈 Distribuição por Plano", 14, y);
        y += 8;

        const planData = Object.entries(stats.users_by_plan).map(([name, value]) => [name, String(value)]);
        autoTable(doc, {
          startY: y,
          head: [["Plano", "Usuários"]],
          body: planData,
          theme: "grid",
          headStyles: { fillColor: [99, 79, 198] },
          margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 12;
      }

      // Usage by mode
      if (stats?.usage_by_mode) {
        doc.setFontSize(14);
        doc.text("📊 Uso por Categoria", 14, y);
        y += 8;

        const modeData = Object.entries(stats.usage_by_mode).map(([name, value]) => [
          name === "concurso" ? "Concurso" : name === "enem" ? "ENEM" : "Universidade",
          String(value),
        ]);
        autoTable(doc, {
          startY: y,
          head: [["Categoria", "Simulados"]],
          body: modeData,
          theme: "grid",
          headStyles: { fillColor: [99, 79, 198] },
          margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 12;
      }

      // Financial data (admin only, when checkbox enabled)
      if (isAdmin && financialStats && includeFinancial) {
        if (y > 220) { doc.addPage(); y = 20; }

        const revenue = calcRevenue();

        doc.setFontSize(14);
        doc.text("💰 Dados Financeiros", 14, y);
        y += 8;

        const finData: string[][] = [
          ["Assinaturas Ativas", String(financialStats.active_subscriptions)],
          ["Assinaturas Canceladas", String(financialStats.cancelled_subscriptions)],
        ];

        if (includeCostBreakdown) {
          finData.push(
            ["Receita Bruta (estimada/mês)", `R$ ${revenue.bruta.toFixed(2)}`],
            ["Custos Operacionais (mês)", `R$ ${revenue.custos.toFixed(2)}`],
            ["Lucro Líquido (estimado/mês)", `R$ ${revenue.liquida.toFixed(2)}`],
            ["Despesas Totais Acumuladas", `R$ ${Number(financialStats.total_expenses).toFixed(2)}`],
          );
        } else {
          finData.push(
            ["Despesas do Mês", `R$ ${Number(financialStats.monthly_expenses).toFixed(2)}`],
            ["Despesas Totais", `R$ ${Number(financialStats.total_expenses).toFixed(2)}`],
          );
        }

        if (includeGatewayFees) {
          // Estimated gateway fees (standard 3.99% + R$0.39 per transaction)
          const estimatedFees = revenue.bruta * 0.0399;
          finData.push(
            ["Taxa Gateway (estimada ~3.99%)", `R$ ${estimatedFees.toFixed(2)}`],
            ["Receita Líquida Pós-Gateway", `R$ ${(revenue.bruta - estimatedFees).toFixed(2)}`],
          );
        }

        autoTable(doc, {
          startY: y,
          head: [["Métrica", "Valor"]],
          body: finData,
          theme: "grid",
          headStyles: { fillColor: [39, 174, 96] },
          margin: { left: 14, right: 14 },
        });
        y = (doc as any).lastAutoTable.finalY + 12;

        // Subscriptions by plan
        if (financialStats.subscriptions_by_plan && Object.keys(financialStats.subscriptions_by_plan).length > 0) {
          doc.setFontSize(14);
          doc.text("📦 Assinaturas por Plano", 14, y);
          y += 8;
          const subData = Object.entries(financialStats.subscriptions_by_plan).map(([name, count]) => [name, String(count)]);
          autoTable(doc, {
            startY: y,
            head: [["Plano", "Assinantes"]],
            body: subData,
            theme: "grid",
            headStyles: { fillColor: [39, 174, 96] },
            margin: { left: 14, right: 14 },
          });
          y = (doc as any).lastAutoTable.finalY + 12;
        }

        // Partner profit sharing
        if (includePartnerSharing && partners && partners.length > 0) {
          if (y > 200) { doc.addPage(); y = 20; }
          
          doc.setFontSize(14);
          doc.text("🤝 Ganhos por Cota (Sócios)", 14, y);
          y += 8;

          const partnerData = partners.map((p: any) => {
            const proporcional = revenue.liquida > 0 ? (revenue.liquida * (p.percentual_participacao / 100)) : 0;
            return [
              p.profiles?.nome || "—",
              `${p.percentual_participacao}%`,
              p.tipo_participacao.replace("_", " "),
              `R$ ${Number(p.valor_investido).toFixed(2)}`,
              `R$ ${proporcional.toFixed(2)}`,
            ];
          });

          autoTable(doc, {
            startY: y,
            head: [["Sócio", "%", "Tipo", "Investido", "Ganho Proporcional (mês)"]],
            body: partnerData,
            theme: "grid",
            headStyles: { fillColor: [52, 73, 94] },
            margin: { left: 14, right: 14 },
            columnStyles: { 4: { fontStyle: "bold" } },
          });
          y = (doc as any).lastAutoTable.finalY + 12;
        }

        // Recent expenses
        if (includeCostBreakdown && expenses && expenses.length > 0) {
          if (y > 200) { doc.addPage(); y = 20; }
          doc.setFontSize(14);
          doc.text("📋 Despesas Recentes", 14, y);
          y += 8;
          const expData = expenses.slice(0, 15).map((e) => [
            new Date(e.data + "T12:00:00").toLocaleDateString("pt-BR"),
            e.descricao,
            e.categoria,
            `R$ ${Number(e.valor).toFixed(2)}`,
          ]);
          autoTable(doc, {
            startY: y,
            head: [["Data", "Descrição", "Categoria", "Valor"]],
            body: expData,
            theme: "grid",
            headStyles: { fillColor: [192, 57, 43] },
            margin: { left: 14, right: 14 },
          });
        }
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `ProvaX — Relatório Consolidado — Página ${i} de ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 10,
          { align: "center" }
        );
      }

      const dateStr = new Date().toISOString().split("T")[0];
      const type = isPartner ? "socio" : "admin";
      doc.save(`relatorio-provax-${type}-${dateStr}.pdf`);
      toast.success("Relatório gerado com sucesso!");
    } catch (err) {
      console.error(err);
      toast.error("Erro ao gerar relatório");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-['Space_Grotesk']">Relatório Consolidado</h1>
          <p className="text-muted-foreground text-sm">
            {isPartner ? "Exportar métricas de crescimento" : "Exportar relatório completo com dados financeiros e divisão societária"}
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Configurar Relatório</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Período</Label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger className="w-full sm:w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                  <SelectItem value="90">Últimos 90 dias</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {periodo === "custom" && (
              <div className="flex gap-3">
                <div className="space-y-2">
                  <Label>Início</Label>
                  <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Fim</Label>
                  <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
                </div>
              </div>
            )}

            {/* PDF Section Checkboxes (admin only) */}
            {isAdmin && (
              <div className="space-y-3 rounded-lg border p-4">
                <Label className="font-semibold text-sm">Seções do Relatório</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox id="cb-financial" checked={includeFinancial} onCheckedChange={(v) => setIncludeFinancial(!!v)} />
                  <label htmlFor="cb-financial" className="text-sm cursor-pointer">Incluir Dados Financeiros</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="cb-cost" checked={includeCostBreakdown} onCheckedChange={(v) => setIncludeCostBreakdown(!!v)} disabled={!includeFinancial} />
                  <label htmlFor="cb-cost" className="text-sm cursor-pointer">Incluir Custo Bruto / Líquido</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="cb-gateway" checked={includeGatewayFees} onCheckedChange={(v) => setIncludeGatewayFees(!!v)} disabled={!includeFinancial} />
                  <label htmlFor="cb-gateway" className="text-sm cursor-pointer">Detalhar Taxas de Gateway</label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox id="cb-partners" checked={includePartnerSharing} onCheckedChange={(v) => setIncludePartnerSharing(!!v)} disabled={!includeFinancial} />
                  <label htmlFor="cb-partners" className="text-sm cursor-pointer">Incluir Ganhos por Cota (Sócios)</label>
                </div>
              </div>
            )}

            <div className="pt-2">
              <Button onClick={generatePDF} disabled={generating} className="gap-2">
                <Download className="h-4 w-4" />
                {generating ? "Gerando..." : "Exportar Relatório PDF"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              O relatório incluirá:
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">✅ Total de usuários e pagantes</li>
              <li className="flex items-center gap-2">✅ Crescimento percentual mensal</li>
              <li className="flex items-center gap-2">✅ Distribuição por plano (quantidade)</li>
              <li className="flex items-center gap-2">✅ Uso por categoria (Concurso/ENEM/Universidade)</li>
              <li className="flex items-center gap-2">✅ Total de simulados e redações</li>
              {isAdmin && (
                <>
                  {includeFinancial && (
                    <>
                      <li className="flex items-center gap-2 text-primary font-medium">💰 Assinaturas ativas e canceladas</li>
                      <li className="flex items-center gap-2 text-primary font-medium">💰 Assinaturas por plano</li>
                    </>
                  )}
                  {includeFinancial && includeCostBreakdown && (
                    <>
                      <li className="flex items-center gap-2 text-primary font-medium">💰 Receita Bruta (estimada)</li>
                      <li className="flex items-center gap-2 text-primary font-medium">💰 Custos Operacionais</li>
                      <li className="flex items-center gap-2 text-primary font-medium">💰 Lucro Líquido (estimado)</li>
                      <li className="flex items-center gap-2 text-primary font-medium">📋 Despesas registradas</li>
                    </>
                  )}
                  {includeFinancial && includeGatewayFees && (
                    <li className="flex items-center gap-2 text-primary font-medium">💳 Taxas de Gateway (~3.99%)</li>
                  )}
                  {includeFinancial && includePartnerSharing && (
                    <li className="flex items-center gap-2 text-primary font-medium">🤝 Ganhos proporcionais por cota</li>
                  )}
                </>
              )}
              {isPartner && (
                <li className="flex items-center gap-2 text-muted-foreground">🔒 Dados financeiros não incluídos (acesso restrito)</li>
              )}
            </ul>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}