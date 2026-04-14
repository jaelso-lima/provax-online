import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Coins, LogOut, User, Shield, Briefcase, Menu, X } from "lucide-react";
import { useAdminRole } from "@/hooks/useAdminRole";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import ThemeToggle from "@/components/ThemeToggle";
import ThemeSelector from "@/components/ThemeSelector";
import { useState } from "react";

export default function AppHeader() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const { hasAdminAccess } = useAdminRole();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: isEmployee } = useQuery({
    queryKey: ["is-employee", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("temp_employees")
        .select("id")
        .eq("user_id", user!.id)
        .eq("status", "ativo")
        .maybeSingle();
      return !!data;
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
      <div className="container flex h-14 items-center justify-between px-3 sm:px-4">
        <Link to="/dashboard" className="font-display text-lg sm:text-xl font-bold shrink-0">
          <span className="text-primary">P</span><span className="text-accent">X</span>{" "}
          <span className="text-foreground hidden xs:inline">ProvaX</span>
        </Link>

        {/* Desktop nav */}
        <div className="hidden sm:flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 rounded-full bg-[hsl(var(--coin)/0.1)] px-2.5 py-1 text-sm font-medium">
            <Coins className="h-3.5 w-3.5 text-coin" />
            <span className="text-foreground">{profile?.saldo_moedas ?? 0}</span>
          </div>
          <ThemeToggle />
          {isEmployee && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/funcionario")} title="Painel Funcionário">
              <Briefcase className="h-4 w-4 text-primary" />
            </Button>
          )}
          {hasAdminAccess && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/admin")} title="Painel Admin">
              <Shield className="h-4 w-4 text-primary" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/perfil")}>
            <User className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
          </Button>
        </div>

        {/* Mobile nav */}
        <div className="flex sm:hidden items-center gap-1.5">
          <div className="flex items-center gap-1 rounded-full bg-[hsl(var(--coin)/0.1)] px-2 py-0.5 text-xs font-medium">
            <Coins className="h-3 w-3 text-coin" />
            <span className="text-foreground">{profile?.saldo_moedas ?? 0}</span>
          </div>
          {hasAdminAccess && (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate("/admin")} title="Painel Admin">
              <Shield className="h-4 w-4 text-primary" />
            </Button>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {mobileMenuOpen && (
        <div className="sm:hidden border-t bg-card px-4 py-3 space-y-1 animate-in slide-in-from-top-2 duration-200">
          <ThemeToggle />
          {isEmployee && (
            <button
              onClick={() => { navigate("/funcionario"); setMobileMenuOpen(false); }}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <Briefcase className="h-4 w-4 text-primary" />
              Painel Funcionário
            </button>
          )}
          <button
            onClick={() => { navigate("/perfil"); setMobileMenuOpen(false); }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          >
            <User className="h-4 w-4" />
            Meu Perfil
          </button>
          <button
            onClick={() => { handleLogout(); setMobileMenuOpen(false); }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            Sair
          </button>
        </div>
      )}
    </header>
  );
}
