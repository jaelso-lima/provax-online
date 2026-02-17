import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { User, Copy, CheckCircle2 } from "lucide-react";

export default function Perfil() {
  const { profile, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [nome, setNome] = useState(profile?.nome || "");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleSave = async () => {
    if (!profile) return;
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ nome })
      .eq("id", profile.id);
    setSaving(false);

    if (error) {
      toast({ variant: "destructive", title: "Erro", description: error.message });
    } else {
      await refreshProfile();
      toast({ title: "Perfil atualizado!" });
    }
  };

  const copyCode = () => {
    if (profile?.codigo_indicacao) {
      navigator.clipboard.writeText(profile.codigo_indicacao);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <h1 className="font-display text-3xl font-bold">Meu Perfil</h1>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display">
              <User className="h-5 w-5 text-primary" />
              Informações pessoais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Nome</Label>
              <Input value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={profile?.email || ""} disabled />
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : "Salvar"}
            </Button>
          </CardContent>
        </Card>

        <Card className="glass-card">
          <CardHeader>
            <CardTitle className="font-display">Código de Indicação</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-muted-foreground">
              Compartilhe seu código e ganhe 20 moedas para cada amigo que se cadastrar!
            </p>
            <div className="flex items-center gap-2">
              <Input value={profile?.codigo_indicacao || ""} readOnly className="font-mono font-bold" />
              <Button variant="outline" size="icon" onClick={copyCode}>
                {copied ? <CheckCircle2 className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
