import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { useAdminRole } from "@/hooks/useAdminRole";

export function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const { hasAdminAccess, isLoading } = useAdminRole();

  if (loading || isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user || !hasAdminAccess) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}
