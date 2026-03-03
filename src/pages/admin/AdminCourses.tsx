import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Loader2, GraduationCap } from "lucide-react";

interface Curso {
  id: string;
  nome: string;
  descricao: string | null;
  liberado: boolean;
  created_at: string;
}

export default function AdminCourses() {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);

  useEffect(() => {
    loadCursos();
  }, []);

  const loadCursos = async () => {
    setLoading(true);
    const { data } = await supabase.from("cursos").select("*").order("nome");
    setCursos((data as Curso[]) || []);
    setLoading(false);
  };

  const toggleLiberado = async (cursoId: string, newValue: boolean) => {
    setToggling(cursoId);
    const { error } = await supabase
      .from("cursos")
      .update({ liberado: newValue } as any)
      .eq("id", cursoId);

    if (error) {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    } else {
      setCursos(prev => prev.map(c => c.id === cursoId ? { ...c, liberado: newValue } : c));
      toast({ title: newValue ? "Curso liberado!" : "Curso desativado" });
    }
    setToggling(null);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          Gerenciar Cursos
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Libere ou desative cursos para os usuários. Apenas cursos liberados aparecem no módulo Universidade.
        </p>
      </div>

      <div className="grid gap-3">
        {cursos.map(curso => (
          <Card key={curso.id} className={`transition-colors ${curso.liberado ? "border-accent/40" : "border-muted"}`}>
            <CardContent className="flex items-center justify-between py-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{curso.nome}</span>
                  {curso.liberado ? (
                    <Badge variant="default" className="text-xs">Liberado</Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">Desativado</Badge>
                  )}
                </div>
                {curso.descricao && (
                  <p className="text-xs text-muted-foreground mt-1">{curso.descricao}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Label htmlFor={`toggle-${curso.id}`} className="text-xs text-muted-foreground">
                  {curso.liberado ? "Ativo" : "Inativo"}
                </Label>
                <Switch
                  id={`toggle-${curso.id}`}
                  checked={curso.liberado}
                  disabled={toggling === curso.id}
                  onCheckedChange={(v) => toggleLiberado(curso.id, v)}
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
