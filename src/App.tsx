import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import ChatProfessor from "@/components/ChatProfessor";
import PromoPopup from "@/components/PromoPopup";
import { Loader2 } from "lucide-react";

// Critical path - eager load
import Index from "./pages/Index";
import Login from "./pages/Login";
import Register from "./pages/Register";
import NotFound from "./pages/NotFound";

// Lazy loaded pages
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Simulado = lazy(() => import("./pages/Simulado"));
const SimuladoResultado = lazy(() => import("./pages/SimuladoResultado"));
const Redacao = lazy(() => import("./pages/Redacao"));
const ComprarMoedas = lazy(() => import("./pages/ComprarMoedas"));
const Planos = lazy(() => import("./pages/Planos"));
const Ranking = lazy(() => import("./pages/Ranking"));
const Perfil = lazy(() => import("./pages/Perfil"));
const ConcursosAbertos = lazy(() => import("./pages/ConcursosAbertos"));
const EmployeeDashboard = lazy(() => import("./pages/EmployeeDashboard"));
const AnalisarEdital = lazy(() => import("./pages/AnalisarEdital"));
const EditalEstudoViewer = lazy(() => import("./pages/EditalEstudoViewer"));
const Cadernos = lazy(() => import("./pages/Cadernos"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const TermosDeUso = lazy(() => import("./pages/TermosDeUso"));
const Onboarding = lazy(() => import("./pages/Onboarding"));

// Admin - always lazy
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminPlans = lazy(() => import("./pages/admin/AdminPlans"));
const AdminBilling = lazy(() => import("./pages/admin/AdminBilling"));
const AdminExpenses = lazy(() => import("./pages/admin/AdminExpenses"));
const AdminReport = lazy(() => import("./pages/admin/AdminReport"));
const AdminLogs = lazy(() => import("./pages/admin/AdminLogs"));
const AdminCMS = lazy(() => import("./pages/admin/AdminCMS"));
const AdminPartners = lazy(() => import("./pages/admin/AdminPartners"));
const AdminProfitSimulation = lazy(() => import("./pages/admin/AdminProfitSimulation"));
const AdminExamRadar = lazy(() => import("./pages/admin/AdminExamRadar"));
const AdminPdfImporter = lazy(() => import("./pages/admin/AdminPdfImporter"));
const AdminQuestionsReview = lazy(() => import("./pages/admin/AdminQuestionsReview"));
const AdminPartnerPayments = lazy(() => import("./pages/admin/AdminPartnerPayments"));
const AdminPartnerPermissions = lazy(() => import("./pages/admin/AdminPartnerPermissions"));
const AdminPartnerFinancial = lazy(() => import("./pages/admin/AdminPartnerFinancial"));
const AdminEmployees = lazy(() => import("./pages/admin/AdminEmployees"));
const AdminCourses = lazy(() => import("./pages/admin/AdminCourses"));
const AdminPromocoes = lazy(() => import("./pages/admin/AdminPromocoes"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 min cache
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function PageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/simulado" element={<ProtectedRoute><Simulado /></ProtectedRoute>} />
              <Route path="/simulado/resultado/:id" element={<ProtectedRoute><SimuladoResultado /></ProtectedRoute>} />
              <Route path="/redacao" element={<ProtectedRoute><Redacao /></ProtectedRoute>} />
              <Route path="/comprar-moedas" element={<ProtectedRoute><ComprarMoedas /></ProtectedRoute>} />
              <Route path="/planos" element={<ProtectedRoute><Planos /></ProtectedRoute>} />
              <Route path="/ranking" element={<ProtectedRoute><Ranking /></ProtectedRoute>} />
              <Route path="/perfil" element={<ProtectedRoute><Perfil /></ProtectedRoute>} />
              <Route path="/concursos" element={<ProtectedRoute><ConcursosAbertos /></ProtectedRoute>} />
              <Route path="/analisar-edital" element={<ProtectedRoute><AnalisarEdital /></ProtectedRoute>} />
              <Route path="/analisar-edital/:id" element={<ProtectedRoute><EditalEstudoViewer /></ProtectedRoute>} />
              <Route path="/cadernos" element={<ProtectedRoute><Cadernos /></ProtectedRoute>} />
              <Route path="/funcionario" element={<ProtectedRoute><EmployeeDashboard /></ProtectedRoute>} />
              <Route path="/onboarding" element={<ProtectedRoute><Onboarding /></ProtectedRoute>} />
              <Route path="/termos" element={<TermosDeUso />} />
              <Route path="/admin" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
              <Route path="/admin/users" element={<AdminRoute><AdminUsers /></AdminRoute>} />
              <Route path="/admin/plans" element={<AdminRoute><AdminPlans /></AdminRoute>} />
              <Route path="/admin/billing" element={<AdminRoute><AdminBilling /></AdminRoute>} />
              <Route path="/admin/expenses" element={<AdminRoute><AdminExpenses /></AdminRoute>} />
              <Route path="/admin/report" element={<AdminRoute><AdminReport /></AdminRoute>} />
              <Route path="/admin/logs" element={<AdminRoute><AdminLogs /></AdminRoute>} />
              <Route path="/admin/cms" element={<AdminRoute><AdminCMS /></AdminRoute>} />
              <Route path="/admin/partners" element={<AdminRoute><AdminPartners /></AdminRoute>} />
              <Route path="/admin/profit-simulation" element={<AdminRoute><AdminProfitSimulation /></AdminRoute>} />
              <Route path="/admin/exam-radar" element={<AdminRoute><AdminExamRadar /></AdminRoute>} />
              <Route path="/admin/pdf-importer" element={<AdminRoute><AdminPdfImporter /></AdminRoute>} />
              <Route path="/admin/questions-review" element={<AdminRoute><AdminQuestionsReview /></AdminRoute>} />
              <Route path="/admin/partner-payments" element={<AdminRoute><AdminPartnerPayments /></AdminRoute>} />
              <Route path="/admin/partner-permissions" element={<AdminRoute><AdminPartnerPermissions /></AdminRoute>} />
              <Route path="/admin/partner-financial" element={<AdminRoute><AdminPartnerFinancial /></AdminRoute>} />
              <Route path="/admin/employees" element={<AdminRoute><AdminEmployees /></AdminRoute>} />
              <Route path="/admin/courses" element={<AdminRoute><AdminCourses /></AdminRoute>} />
              <Route path="/admin/promocoes" element={<AdminRoute><AdminPromocoes /></AdminRoute>} />
              
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
          <ChatProfessor />
          <PromoPopup />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
