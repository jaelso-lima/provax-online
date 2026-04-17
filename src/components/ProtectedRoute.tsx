import { useAuth } from "@/contexts/AuthContext";
import { Navigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // Check onboarding status — checks BOTH tables to be resilient.
  // Always refetch on mount so post-checkout / post-quiz navigation sees fresh data.
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
    staleTime: 0,
    refetchOnMount: "always",
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

  // Source of truth: TRUE in EITHER table = onboarding complete.
  // This protects against race conditions where one update lands before the other.
  const completed =
    onboarding?.onboarding_completo === true ||
    profile?.onboarding_completo === true;

  console.log("[ProtectedRoute] onboarding:", {
    user_onboarding: onboarding?.onboarding_completo,
    profile: profile?.onboarding_completo,
    completed,
    path: location.pathname,
  });

  const isOnboardingPage = location.pathname === "/onboarding";

  // Block access to /onboarding if already completed
  if (isOnboardingPage && completed) {
    return <Navigate to="/dashboard" replace />;
  }

  // Force onboarding only if not completed and not already there
  if (!isOnboardingPage && !completed) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
}
