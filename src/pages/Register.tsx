import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Register() {
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codigoIndicacao, setCodigoIndicacao] = useState("");
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !password) { toast({ title: "Preencha todos os campos", variant: "destructive" }); return; }
    if (password.length < 8) { toast({ title: "Senha deve ter no mínimo 8 caracteres", variant: "destructive" }); return; }
    setLoading(true);
    const { error } = await signUp(email, password, nome, codigoIndicacao.trim() || undefined);
    setLoading(false);
    if (error) { toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" }); }
    else { toast({ title: "Conta criada!", description: "Verifique seu email para confirmar." }); navigate("/login"); }
  };

  return (<div className="flex min-h-screen items-center justify-center bg-background px-4"><Card className="w-full max-w-md">
    <CardHeader className="text-center"><Link to="/" className="mb-2 inline-block font-display text-2xl font-bold text-primary">ProvaX</Link><CardTitle className="font-display text-2xl">Criar Conta</CardTitle><CardDescription>Crie sua conta e ganhe 20 moedas grátis</CardDescription></CardHeader>
    <form onSubmit={handleSubmit}><CardContent className="space-y-4">
      <div className="space-y-2"><Label htmlFor="nome">Nome</Label><Input id="nome" placeholder="Seu nome completo" value={nome} onChange={e => setNome(e.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" type="password" placeholder="Mínimo 8 caracteres" value={password} onChange={e => setPassword(e.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor="indicacao">Código de Indicação (opcional)</Label><Input id="indicacao" placeholder="Ex: A1B2C3D4" value={codigoIndicacao} onChange={e => setCodigoIndicacao(e.target.value)} /></div>
    </CardContent><CardFooter className="flex-col gap-3"><Button type="submit" className="w-full" disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Criar Conta</Button><p className="text-sm text-muted-foreground">Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link></p></CardFooter></form>
  </Card></div>);
}
