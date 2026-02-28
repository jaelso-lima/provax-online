import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ClipboardList } from "lucide-react";

export default function AdminLogs() {
  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data;
    },
  });

  const getActionColor = (acao: string) => {
    if (acao.includes("FRAUDE") || acao.includes("SUSPENS")) return "destructive";
    if (acao.includes("PLANO") || acao.includes("GRANT")) return "default";
    if (acao.includes("ROLE")) return "secondary";
    return "outline";
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-['Space_Grotesk']">Logs Administrativos</h1>
          <p className="text-muted-foreground text-sm">Histórico de ações na plataforma</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="h-4 w-4" />
              Últimas 100 ações
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px]">
              <div className="space-y-3">
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-8">Carregando...</p>
                ) : logs?.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">Nenhum log registrado</p>
                ) : (
                  logs?.map((log) => (
                    <div key={log.id} className="flex items-start gap-3 border-b border-border pb-3 last:border-0">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant={getActionColor(log.acao) as any} className="text-xs">
                            {log.acao}
                          </Badge>
                          {log.tabela && (
                            <span className="text-xs text-muted-foreground">em {log.tabela}</span>
                          )}
                        </div>
                        {log.detalhes && (
                          <pre className="mt-1 text-xs text-muted-foreground overflow-hidden text-ellipsis whitespace-pre-wrap max-w-full">
                            {typeof log.detalhes === "string" ? log.detalhes : JSON.stringify(log.detalhes, null, 2)}
                          </pre>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(log.created_at).toLocaleString("pt-BR")}
                          {log.user_id && <> • ID: {log.user_id.slice(0, 8)}...</>}
                        </p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
