import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Copy, Share2, ArrowLeft } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Perfil() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState(profile?.nome || "");
  const [saving, setSaving] = useState(false);
  const [transacoes, setTransacoes] = useState<any[]>([]);

  useEffect(() => { if (profile) setNome(profile.nome); }, [profile]);

  useEffect(() => {
    if (!user) return;
    supabase.from("moeda_transacoes").select("*").eq("user_id", user.id).order("created_at", { ascending: false }).limit(20)
      .then(({ data }) => { if (data) setTransacoes(data); });
  }, [user]);

  const handleSave = async () => {
    if (!nome.trim()) { toast({ title: "Nome vazio", variant: "destructive" }); return; }
    setSaving(true);
    const { error } = await supabase.from("profiles").update({ nome: nome.trim() }).eq("id", user!.id);
    setSaving(false);
    if (error) toast({ title: "Erro", description: error.message, variant: "destructive" });
    else { toast({ title: "Perfil atualizado!" }); await refreshProfile(); }
  };

  const copiarCodigo = () => {
    if (profile?.codigo_indicacao) {
      navigator.clipboard.writeText(profile.codigo_indicacao);
      toast({ title: "Código copiado!" });
    }
  };

  const xp = profile?.xp ?? 0;
  const nivel = profile?.nivel ?? 1;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="container max-w-lg flex-1 py-6 px-4">
        <Button variant="ghost" size="sm" className="mb-4 gap-1.5 text-muted-foreground" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Button>

        <h1 className="mb-6 font-display text-2xl font-bold">Meu Perfil</h1>

        <Card className="mb-4">
          <CardContent className="space-y-4 pt-6">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome</Label>
              <Input value={nome} onChange={e => setNome(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Email</Label>
              <Input value={user?.email || ""} disabled className="opacity-60" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs">Plano</Label>
                <Input value={profile?.plano || "free"} disabled className="opacity-60" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Moedas</Label>
                <Input value={`${profile?.saldo_moedas ?? 0}`} disabled className="opacity-60" />
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label className="text-xs">Nível {nivel}</Label>
                <span className="text-xs text-muted-foreground">{xp} XP</span>
              </div>
              <Progress value={Math.min((xp / (nivel * 100)) * 100, 100)} className="h-1.5" />
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar
            </Button>
          </CardContent>
        </Card>

        <Card className="mb-4">
          <CardContent className="py-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Share2 className="h-4 w-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">Código de Indicação</p>
                  <p className="text-xs text-muted-foreground">20 moedas por amigo</p>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={copiarCodigo} className="gap-1.5 text-xs">
                <Copy className="h-3 w-3" />{profile?.codigo_indicacao || "..."}
              </Button>
            </div>
          </CardContent>
        </Card>

        {transacoes.length > 0 && (
          <>
            <h2 className="mb-3 font-display text-base font-semibold">Transações</h2>
            <div className="space-y-1.5">
              {transacoes.map(t => (
                <Card key={t.id}>
                  <CardContent className="flex items-center justify-between py-2.5">
                    <div>
                      <p className="text-sm">{t.descricao}</p>
                      <p className="text-[11px] text-muted-foreground">{new Date(t.created_at).toLocaleDateString("pt-BR")}</p>
                    </div>
                    <span className={`text-sm font-bold ${t.tipo === "credito" ? "text-accent" : "text-destructive"}`}>
                      {t.tipo === "credito" ? "+" : "-"}{t.valor}
                    </span>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
