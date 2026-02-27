import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import ChatProfessor from "@/components/ChatProfessor";

import Index from "./pages/Index";
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
            <Route path="/termos" element={<TermosDeUso />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <ChatProfessor />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
