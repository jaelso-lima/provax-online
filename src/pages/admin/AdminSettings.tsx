import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { Save, Video, Play, Users, BarChart3 } from "lucide-react";

export default function AdminSettings() {
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["admin-site-settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .order("chave");
      if (error) throw error;
      return data;
    },
  });

  // Quiz analytics
  const { data: quizStats } = useQuery({
    queryKey: ["admin-quiz-stats"],
    queryFn: async () => {
      const { count: totalUsers } = await supabase
        .from("profiles")
        .select("*", { count: "exact", head: true });

      const { count: completedQuiz } = await supabase
        .from("user_onboarding")
        .select("*", { count: "exact", head: true })
        .eq("onboarding_completo", true);

      const { data: origins } = await supabase
        .from("user_onboarding")
        .select("origem")
        .not("origem", "is", null);

      const originCounts: Record<string, number> = {};
      origins?.forEach((o) => {
        const key = (o as any).origem || "desconhecido";
        originCounts[key] = (originCounts[key] || 0) + 1;
      });

      return {
        totalUsers: totalUsers || 0,
        completedQuiz: completedQuiz || 0,
        originCounts,
      };
    },
    staleTime: 30 * 1000,
  });

  const [values, setValues] = useState<Record<string, string>>({});

  const getVal = (chave: string) => {
    if (values[chave] !== undefined) return values[chave];
    return settings?.find((s) => s.chave === chave)?.valor || "";
  };

  const updateMutation = useMutation({
    mutationFn: async ({ chave, valor }: { chave: string; valor: string }) => {
      const { error } = await supabase
        .from("site_settings")
        .update({ valor })
        .eq("chave", chave);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-site-settings"] });
      queryClient.invalidateQueries({ queryKey: ["site-setting"] });
      toast({ title: "Salvo!", description: "Configuração atualizada com sucesso." });
    },
    onError: () => {
      toast({ title: "Erro", description: "Não foi possível salvar.", variant: "destructive" });
    },
  });

  const handleSave = (chave: string) => {
    const valor = getVal(chave);
    updateMutation.mutate({ chave, valor });
  };

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return "";
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}?rel=0` : "";
  };

  const videoSettings = [
    { chave: "video_landing_url", title: "Vídeo da Landing Page", description: "URL do YouTube exibido na seção hero da página inicial", icon: Video },
    { chave: "video_vsl_url", title: "Vídeo Pós-Quiz (VSL)", description: "URL do YouTube exibido após o onboarding/quiz", icon: Play },
  ];

  const completionRate = quizStats ? (quizStats.totalUsers > 0 ? ((quizStats.completedQuiz / quizStats.totalUsers) * 100).toFixed(1) : "0") : "—";

  const ORIGIN_LABELS: Record<string, string> = {
    facebook: "Facebook",
    instagram: "Instagram",
    youtube: "YouTube",
    google: "Google",
    amigo: "Amigo",
    outros: "Outros",
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Quiz Analytics */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <BarChart3 className="h-5 w-5 text-primary" />
              Análise do Quiz (Onboarding)
            </CardTitle>
            <CardDescription>Dados de conversão e origem dos usuários</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-6">
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{quizStats?.totalUsers ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Total de usuários</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{quizStats?.completedQuiz ?? "—"}</p>
                <p className="text-xs text-muted-foreground">Completaram o quiz</p>
              </div>
              <div className="rounded-lg border p-4 text-center">
                <p className="text-2xl font-bold text-accent">{completionRate}%</p>
                <p className="text-xs text-muted-foreground">Taxa de conclusão</p>
              </div>
            </div>

            {quizStats && Object.keys(quizStats.originCounts).length > 0 && (
              <div>
                <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" /> Origem dos Usuários
                </h4>
                <div className="space-y-2">
                  {Object.entries(quizStats.originCounts)
                    .sort((a, b) => b[1] - a[1])
                    .map(([origin, count]) => {
                      const total = Object.values(quizStats.originCounts).reduce((a, b) => a + b, 0);
                      const pct = ((count / total) * 100).toFixed(1);
                      return (
                        <div key={origin} className="flex items-center gap-3">
                          <span className="text-sm font-medium w-24">{ORIGIN_LABELS[origin] || origin}</span>
                          <div className="flex-1 bg-secondary rounded-full h-4 overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-16 text-right">{count} ({pct}%)</span>
                        </div>
                      );
                    })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Video Settings */}
        {videoSettings.map((vs) => {
          const currentUrl = getVal(vs.chave);
          const embedUrl = getYouTubeEmbedUrl(currentUrl);

          return (
            <Card key={vs.chave}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <vs.icon className="h-5 w-5 text-primary" />
                  {vs.title}
                </CardTitle>
                <CardDescription>{vs.description}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={vs.chave}>URL do YouTube</Label>
                  <div className="flex gap-2">
                    <Input
                      id={vs.chave}
                      placeholder="https://www.youtube.com/watch?v=..."
                      value={getVal(vs.chave)}
                      onChange={(e) => setValues((prev) => ({ ...prev, [vs.chave]: e.target.value }))}
                      className="flex-1"
                    />
                    <Button onClick={() => handleSave(vs.chave)} disabled={updateMutation.isPending} size="sm">
                      <Save className="h-4 w-4 mr-1" /> Salvar
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Aceita URLs como: youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/...
                  </p>
                </div>

                {embedUrl ? (
                  <div>
                    <Label className="text-xs text-muted-foreground mb-2 block">Pré-visualização</Label>
                    <div className="relative w-full rounded-lg overflow-hidden bg-black" style={{ paddingBottom: "56.25%" }}>
                      <iframe
                        className="absolute inset-0 w-full h-full"
                        src={embedUrl}
                        title={vs.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        loading="lazy"
                      />
                    </div>
                  </div>
                ) : currentUrl ? (
                  <p className="text-sm text-destructive">URL inválida. Use uma URL do YouTube válida.</p>
                ) : null}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </AdminLayout>
  );
}
