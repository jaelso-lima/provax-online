import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { partnerService } from "@/services/partnerService";
import { toast } from "sonner";
import { Shield, Settings } from "lucide-react";

export default function AdminPartnerPermissions() {
  const queryClient = useQueryClient();

  const { data: partners } = useQuery({
    queryKey: ["admin-partners-perms"],
    queryFn: () => partnerService.listPartnersWithProfiles(),
  });

  const activePartners = partners?.filter((p: any) => p.status === "ativo") || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-['Space_Grotesk'] flex items-center gap-2">
            <Settings className="h-6 w-6 text-primary" />
            Permissões de Sócios
          </h1>
          <p className="text-muted-foreground text-sm">Defina o que cada sócio pode ver no painel</p>
        </div>

        {activePartners.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground">Nenhum sócio ativo</p>
            </CardContent>
          </Card>
        ) : (
          activePartners.map((partner: any) => (
            <PartnerPermCard key={partner.id} partner={partner} />
          ))
        )}
      </div>
    </AdminLayout>
  );
}

function PartnerPermCard({ partner }: { partner: any }) {
  const queryClient = useQueryClient();

  const { data: permissions } = useQuery({
    queryKey: ["partner-permissions", partner.id],
    queryFn: () => partnerService.getPermissions(partner.id),
  });

  const permMap: Record<string, boolean> = {};
  (permissions || []).forEach((p: any) => {
    permMap[p.permission] = p.enabled;
  });

  const toggleMutation = useMutation({
    mutationFn: ({ perm, enabled }: { perm: string; enabled: boolean }) =>
      partnerService.setPermission(partner.id, perm, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["partner-permissions", partner.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          {partner.profiles?.nome || "—"} ({partner.percentual_participacao}%)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {partnerService.AVAILABLE_PERMISSIONS.map((perm) => (
            <div key={perm.key} className="flex items-center justify-between p-3 rounded-lg border border-border">
              <Label className="text-sm cursor-pointer">{perm.label}</Label>
              <Switch
                checked={permMap[perm.key] ?? false}
                onCheckedChange={(checked) => toggleMutation.mutate({ perm: perm.key, enabled: checked })}
              />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
