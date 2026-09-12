import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  useEffect(() => {
    let active = true;

    const releaseAccess = async () => {
      if (!user) return;

      await Promise.all([
        supabase.from("user_onboarding").upsert(
          { user_id: user.id, step_atual: 0, onboarding_completo: true },
          { onConflict: "user_id" },
        ),
        supabase.from("profiles").update({ onboarding_completo: true }).eq("id", user.id),
      ]);

      await queryClient.invalidateQueries({ queryKey: ["onboarding-check", user.id] });
      await refreshProfile();
      if (active) navigate("/dashboard", { replace: true });
    };

    releaseAccess();
    return () => { active = false; };
  }, [navigate, queryClient, refreshProfile, user]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">Preparando seu painel…</p>
    </div>
  );
}