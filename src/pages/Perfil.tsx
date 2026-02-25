import { useState, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Loader2, Copy, Share2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function Perfil() {
  const { user, profile, refreshProfile } = useAuth();
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

  const copiarCodigo = () => { if (profile?.codigo_indicacao) { navigator.clipboard.writeText(profile.codigo_indicacao); toast({ title: "Código copiado!" }); } };
  const xp = profile?.xp ?? 0; const nivel = profile?.nivel ?? 1;

  return (<div className="flex min-h-screen flex-col bg-background"><AppHeader /><main className="container max-w-lg flex-1 py-8">
    <h1 className="mb-6 font-display text-2xl font-bold">Meu Perfil</h1>
    <Card className="mb-6"><CardContent className="space-y-4 pt-6">
      <div className="space-y-2"><Label>Nome</Label><Input value={nome} onChange={e => setNome(e.target.value)} /></div>
      <div className="space-y-2"><Label>Email</Label><Input value={user?.email || ""} disabled /></div>
      <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label>Plano</Label><Input value={profile?.plano || "free"} disabled /></div><div className="space-y-2"><Label>Saldo</Label><Input value={`${profile?.saldo_moedas ?? 0} moedas`} disabled /></div></div>
      <div className="space-y-2"><Label>Nível {nivel} • {xp} XP</Label><Progress value={Math.min((xp/(nivel*100))*100,100)} className="h-2" /></div>
      <Button onClick={handleSave} disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Salvar</Button>
    </CardContent></Card>
    <Card className="mb-6"><CardContent className="pt-6"><div className="flex items-center justify-between"><div><p className="text-sm font-medium flex items-center gap-2"><Share2 className="h-4 w-4 text-primary" />Código de Indicação</p><p className="text-xs text-muted-foreground mt-1">Ganhe 20 moedas por amigo</p></div><Button variant="outline" size="sm" onClick={copiarCodigo} className="gap-2"><Copy className="h-4 w-4" />{profile?.codigo_indicacao || "..."}</Button></div></CardContent></Card>
    <h2 className="mb-4 font-display text-xl font-semibold">Histórico de Transações</h2>
    {transacoes.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma transação.</p> : (
      <div className="space-y-2">{transacoes.map(t => (<Card key={t.id}><CardHeader className="py-3"><div className="flex items-center justify-between"><div><CardTitle className="text-sm">{t.descricao}</CardTitle><CardDescription>{new Date(t.created_at).toLocaleDateString("pt-BR")}</CardDescription></div><span className={`text-sm font-bold ${t.tipo === "credito" ? "text-accent" : "text-destructive"}`}>{t.tipo === "credito" ? "+" : "-"}{t.valor}</span></div></CardHeader></Card>))}</div>
    )}
  </main><AppFooter /></div>);
}
