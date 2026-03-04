import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AdminRoute } from "@/components/AdminRoute";
import ChatProfessor from "@/components/ChatProfessor";

import Index from "./pages/Index";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminPlans from "./pages/admin/AdminPlans";
import AdminBilling from "./pages/admin/AdminBilling";
import AdminExpenses from "./pages/admin/AdminExpenses";
import AdminReport from "./pages/admin/AdminReport";
import AdminLogs from "./pages/admin/AdminLogs";
import AdminCMS from "./pages/admin/AdminCMS";
import AdminPartners from "./pages/admin/AdminPartners";
import AdminProfitSimulation from "./pages/admin/AdminProfitSimulation";
import AdminExamRadar from "./pages/admin/AdminExamRadar";
import AdminPdfImporter from "./pages/admin/AdminPdfImporter";

import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import Simulado from "./pages/Simulado";
import SimuladoResultado from "./pages/SimuladoResultado";
import Redacao from "./pages/Redacao";
import ComprarMoedas from "./pages/ComprarMoedas";
import Planos from "./pages/Planos";
import Ranking from "./pages/Ranking";
import Perfil from "./pages/Perfil";
import NotFound from "./pages/NotFound";
import TermosDeUso from "./pages/TermosDeUso";
import ConcursosAbertos from "./pages/ConcursosAbertos";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
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
            
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatProfessor />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
