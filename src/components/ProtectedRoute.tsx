import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Check onboarding status
  const { data: onboarding, isLoading: onboardingLoading } = useQuery({
    queryKey: ["onboarding-check", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("user_onboarding")
        .select("onboarding_completo")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  if (loading || (user && onboardingLoading)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If onboarding not complete and not already on onboarding page, redirect
  const isOnboardingPage = location.pathname === "/onboarding";
  if (!isOnboardingPage && onboarding !== undefined && !onboarding?.onboarding_completo) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
