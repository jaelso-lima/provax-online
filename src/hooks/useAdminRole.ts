import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export type AdminRoleType = "admin" | "owner" | "partner" | null;

export function useAdminRole() {
  const { user } = useAuth();

  const { data: role, isLoading } = useQuery({
    queryKey: ["admin-role", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .single();
      if (error) return null;
      return data.role as AdminRoleType;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const isAdmin = role === "admin" || role === "owner";
  const isOwner = role === "owner";
  const isPartner = role === "partner";
  const hasAdminAccess = isAdmin || isPartner;

  return { role, isAdmin, isOwner, isPartner, hasAdminAccess, isLoading };
}
