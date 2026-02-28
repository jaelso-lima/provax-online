import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Coins, LogOut, User, Shield } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";

export default function AppHeader() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();

  const { data: isAdmin } = useQuery({
    queryKey: ["user-role-header", user?.id],
    queryFn: async () => {
      const { data } = await supabase.rpc("is_admin");
      return data as boolean;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });

  const handleLogout = async () => {
    await signOut();
    navigate("/");
  };

  if (!user) return null;

  return (
    <header className="sticky top-0 z-40 border-b bg-card/80 backdrop-blur-sm">
      <div className="container flex h-14 items-center justify-between">
        <Link to="/dashboard" className="font-display text-xl font-bold"><span className="text-primary">P</span><span className="text-accent">X</span> <span className="text-foreground">ProvaX</span></Link>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 rounded-full bg-[hsl(var(--coin)/0.1)] px-3 py-1 text-sm font-medium">
            <Coins className="h-4 w-4 text-coin" />
            <span className="text-foreground">{profile?.saldo_moedas ?? 0}</span>
          </div>
          <ThemeToggle />
          {isAdmin && (
            <Button variant="ghost" size="icon" onClick={() => navigate("/admin")} title="Painel Admin">
              <Shield className="h-4 w-4 text-primary" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={() => navigate("/perfil")}>
            <User className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
