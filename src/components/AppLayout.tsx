import { ReactNode, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard, Target, FileText, Coins, Crown, User, Trophy, LogOut, Menu, X,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Simulado", href: "/simulado", icon: Target },
  { label: "Redação", href: "/redacao", icon: FileText },
  { label: "Moedas", href: "/comprar-moedas", icon: Coins },
  { label: "Planos", href: "/planos", icon: Crown },
  { label: "Ranking", href: "/ranking", icon: Trophy },
  { label: "Perfil", href: "/perfil", icon: User },
];

export function AppLayout({ children }: { children: ReactNode }) {
  const { signOut, profile } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/");
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="flex h-16 items-center px-6">
          <Link to="/dashboard" className="font-display text-xl font-bold text-gradient">
            PROVAX
          </Link>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            const active = location.pathname === item.href;
            return (
              <Link
                key={item.href}
                to={item.href}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-border p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-display text-sm font-bold text-primary">
              {profile?.nome?.charAt(0)?.toUpperCase() || "U"}
            </div>
            <div className="flex-1 truncate">
              <p className="text-sm font-medium truncate">{profile?.nome || "Usuário"}</p>
              <p className="text-xs text-muted-foreground">{profile?.plano === "premium" ? "Premium" : "Free"}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
        </div>
      </aside>

      {/* Mobile header + overlay */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-8">
          <div className="flex items-center gap-3">
            <button className="lg:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
            <span className="font-display text-lg font-bold text-gradient lg:hidden">PROVAX</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 rounded-full bg-coin/10 px-3 py-1.5 text-sm font-medium">
              <Coins className="h-4 w-4 text-coin" />
              <span>{profile?.saldo_moedas ?? 0}</span>
            </div>
            <ThemeToggle />
          </div>
        </header>

        {/* Mobile nav */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)}>
            <div className="absolute left-0 top-0 h-full w-64 border-r border-border bg-card p-4" onClick={(e) => e.stopPropagation()}>
              <div className="mb-6 font-display text-xl font-bold text-gradient">PROVAX</div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const active = location.pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      to={item.href}
                      onClick={() => setMobileOpen(false)}
                      className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                        active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-secondary"
                      }`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-6 border-t border-border pt-4">
                <Button variant="ghost" size="sm" className="w-full justify-start text-muted-foreground" onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" /> Sair
                </Button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-auto p-4 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
