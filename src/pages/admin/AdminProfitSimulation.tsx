import { useState } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { Calculator, Plus, Trash2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

export default function AdminProfitSimulation() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPartner, setSelectedPartner] = useState<string>("");
  const [mes, setMes] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [lucro, setLucro] = useState("");

  const { data: partners } = useQuery({
    queryKey: ["admin-partners-sim"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partners")
        .select("id, percentual_participacao, profiles:user_id(nome)")
        .eq("status", "ativo");
      if (error) throw error;
      return data as any[];
    },
  });

  const { data: simulations, isLoading } = useQuery({
    queryKey: ["admin-profit-simulations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("partner_profit_simulation")
        .select("*, partners(percentual_participacao, profiles:user_id(nome))")
        .order("mes_referencia", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

  const addSimulation = useMutation({
    mutationFn: async () => {
      const partner = partners?.find((p: any) => p.id === selectedPartner);
      if (!partner) throw new Error("Selecione um sócio");
      const lucroNum = parseFloat(lucro);
      if (isNaN(lucroNum) || lucroNum < 0) throw new Error("Valor inválido");

      const proporcional = (lucroNum * Number(partner.percentual_participacao)) / 100;

      const { error } = await supabase.from("partner_profit_simulation").upsert({
        partner_id: selectedPartner,
        mes_referencia: `${mes}-01`,
        lucro_simulado: lucroNum,
        valor_proporcional: proporcional,
        criado_por: user!.id,
      }, { onConflict: "partner_id,mes_referencia" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Simulação registrada");
      queryClient.invalidateQueries({ queryKey: ["admin-profit-simulations"] });
      setLucro("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteSim = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("partner_profit_simulation").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Simulação removida");
      queryClient.invalidateQueries({ queryKey: ["admin-profit-simulations"] });
    },
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-['Space_Grotesk'] flex items-center gap-2">
            <Calculator className="h-6 w-6 text-primary" />
            Simulador de Lucros
          </h1>
          <p className="text-muted-foreground text-sm">
            Simulação interna — valores não são visíveis para sócios e não geram obrigação de pagamento
          </p>
        </div>

        {/* Add simulation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Plus className="h-4 w-4" />
              Nova Simulação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-4 gap-4 items-end">
              <div className="space-y-2">
                <Label>Sócio</Label>
                <Select value={selectedPartner} onValueChange={setSelectedPartner}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar..." />
                  </SelectTrigger>
                  <SelectContent>
                    {partners?.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.profiles?.nome || "—"} ({p.percentual_participacao}%)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Mês Referência</Label>
                <Input type="month" value={mes} onChange={(e) => setMes(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Lucro Líquido (R$)</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="Ex: 15000.00"
                  value={lucro}
                  onChange={(e) => setLucro(e.target.value)}
                />
              </div>
              <Button
                onClick={() => addSimulation.mutate()}
                disabled={addSimulation.isPending || !selectedPartner || !lucro}
              >
                {addSimulation.isPending ? "Salvando..." : "Simular"}
              </Button>
            </div>
            {selectedPartner && lucro && (
              <p className="text-sm text-muted-foreground mt-3">
                Valor proporcional:{" "}
                <span className="font-semibold text-foreground">
                  R${" "}
                  {(
                    (parseFloat(lucro) *
                      Number(partners?.find((p: any) => p.id === selectedPartner)?.percentual_participacao ?? 0)) /
                    100
                  ).toFixed(2)}
                </span>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Simulation history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Histórico de Simulações</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-4">Carregando...</p>
            ) : !simulations || simulations.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">Nenhuma simulação registrada</p>
            ) : (
              <div className="space-y-2 max-h-96 overflow-auto">
                {simulations.map((s: any) => (
                  <div key={s.id} className="flex items-center justify-between py-2 px-3 rounded-lg border border-border">
                    <div>
                      <p className="text-sm font-medium">
                        {s.partners?.profiles?.nome || "—"} • {new Date(s.mes_referencia).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Lucro: R$ {Number(s.lucro_simulado).toFixed(2)} →{" "}
                        <span className="font-semibold text-primary">Proporcional: R$ {Number(s.valor_proporcional).toFixed(2)}</span>
                        {" "}({s.partners?.percentual_participacao}%)
                      </p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteSim.mutate(s.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-dashed">
          <CardContent className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              🔒 Estes valores são exclusivamente para simulação interna do fundador.
              <br />
              Não ficam visíveis para sócios e não geram obrigação automática de pagamento.
            </p>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
