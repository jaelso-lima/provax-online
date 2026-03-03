import { ReactNode, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Package,
  ArrowLeft,
  Shield,
  Receipt,
  FileText,
  ClipboardList,
  ShoppingBag,
  Handshake,
  Calculator,
  Menu,
  X,
  Radar,
  Upload,
  GraduationCap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAdminRole } from "@/hooks/useAdminRole";

const allNavItems = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "owner", "partner"] },
  { href: "/admin/users", label: "Usuários", icon: Users, roles: ["admin", "owner"] },
  { href: "/admin/plans", label: "Planos", icon: Package, roles: ["admin", "owner"] },
  { href: "/admin/billing", label: "Faturamento", icon: CreditCard, roles: ["admin", "owner"] },
  { href: "/admin/expenses", label: "Despesas", icon: Receipt, roles: ["admin", "owner"] },
  { href: "/admin/partners", label: "Societário", icon: Handshake, roles: ["admin", "owner"] },
  { href: "/admin/profit-simulation", label: "Simulador Lucros", icon: Calculator, roles: ["admin", "owner"] },
  { href: "/admin/exam-radar", label: "Radar Concursos", icon: Radar, roles: ["admin", "owner"] },
  { href: "/admin/pdf-importer", label: "PDF Importer", icon: Upload, roles: ["admin", "owner"] },
  { href: "/admin/courses", label: "Cursos", icon: GraduationCap, roles: ["admin", "owner"] },
  { href: "/admin/cms", label: "Página de Venda", icon: ShoppingBag, roles: ["admin", "owner"] },
  { href: "/admin/report", label: "Relatório PDF", icon: FileText, roles: ["admin", "owner", "partner"] },
  { href: "/admin/logs", label: "Logs", icon: ClipboardList, roles: ["admin", "owner"] },
];

export function AdminLayout({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { role, isPartner } = useAdminRole();
  const [mobileOpen, setMobileOpen] = useState(false);

  const navItems = allNavItems.filter((item) =>
    item.roles.includes(role || "")
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar desktop */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-border bg-card">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg font-['Space_Grotesk']">
              {isPartner ? "Painel Sócio" : "Admin Panel"}
            </span>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                location.pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-border space-y-2">
          <ThemeToggle />
          <Link to="/dashboard">
            <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
              <ArrowLeft className="h-4 w-4" />
              Voltar ao App
            </Button>
          </Link>
        </div>
      </aside>

      {/* Mobile */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden flex items-center justify-between p-4 border-b border-border bg-card">
          <div className="flex items-center gap-2">
            <button onClick={() => setMobileOpen(!mobileOpen)}>
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <Shield className="h-5 w-5 text-primary" />
            <span className="font-bold font-['Space_Grotesk']">
              {isPartner ? "Sócio" : "Admin"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link to="/dashboard">
              <Button variant="ghost" size="icon">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </header>

        {/* Mobile nav overlay */}
        {mobileOpen && (
          <div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <div
              className="absolute left-0 top-0 h-full w-64 border-r border-border bg-card p-4 shadow-lg"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-primary" />
                  <span className="font-bold font-['Space_Grotesk']">
                    {isPartner ? "Painel Sócio" : "Admin Panel"}
                  </span>
                </div>
                <button onClick={() => setMobileOpen(false)}>
                  <X className="h-5 w-5 text-muted-foreground" />
                </button>
              </div>

              <nav className="space-y-1">
                {navItems.map((item) => (
                  <Link
                    key={item.href}
                    to={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                      location.pathname === item.href
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                ))}
              </nav>

              <div className="mt-6 border-t border-border pt-4">
                <Link to="/dashboard" onClick={() => setMobileOpen(false)}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Voltar ao App
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 p-3 sm:p-4 lg:p-8 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
