import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { generateFingerprint } from "@/lib/fingerprint";
import { lovable } from "@/integrations/lovable/index";
import { Separator } from "@/components/ui/separator";

export default function Register() {
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") || "";
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [codigoIndicacao, setCodigoIndicacao] = useState(refCode);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signUp, signIn } = useAuth();
  const navigate = useNavigate();

  const handleGoogleSignUp = async () => {
    if (!aceitouTermos) {
      toast({ title: "É necessário aceitar os Termos de Uso para prosseguir.", variant: "destructive" });
      return;
    }
    setGoogleLoading(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/dashboard`,
    });
    if (error) {
      toast({ title: "Erro ao entrar com Google", description: String(error), variant: "destructive" });
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !password) { toast({ title: "Preencha todos os campos obrigatórios.", variant: "destructive" }); return; }
    if (password.length < 6) { toast({ title: "A senha deve ter no mínimo 6 caracteres.", variant: "destructive" }); return; }
    if (!aceitouTermos) { toast({ title: "É necessário aceitar os Termos de Uso para prosseguir.", variant: "destructive" }); return; }
    setLoading(true);

    try {
      // Anti-fraud check
      const fingerprint = generateFingerprint();
      const { data: checkData, error: checkError } = await supabase.functions.invoke("check-registration", {
        body: { email, fingerprint, user_agent: navigator.userAgent },
      });

      if (checkError) {
        console.error("Registration check error:", checkError);
        // Allow registration if check fails (fail-open for UX)
      } else if (checkData && !checkData.allowed) {
        toast({ title: "Cadastro bloqueado", description: checkData.reason, variant: "destructive" });
        setLoading(false);
        return;
      }

      const { error } = await signUp(email, password, nome, codigoIndicacao.trim() || undefined);
      if (error) {
        const msg = error.message.toLowerCase();
        if (msg.includes("already registered") || msg.includes("already been registered")) {
          toast({ title: "Email já cadastrado", description: "Este email já possui uma conta. Tente fazer login.", variant: "destructive" });
        } else if (msg.includes("password")) {
          toast({ title: "Senha fraca", description: "Escolha uma senha mais forte (mínimo 6 caracteres).", variant: "destructive" });
        } else {
          toast({ title: "Erro ao criar conta", description: error.message, variant: "destructive" });
        }
      } else {
        // Auto-confirm está ativo, fazer login imediato
        const { error: loginError } = await signIn(email, password);
        if (loginError) {
          toast({ title: "Conta criada!", description: "Faça login para continuar." });
          navigate("/login");
        } else {
          toast({ title: "Conta criada com sucesso!", description: "Bem-vindo ao ProvaX!" });
          navigate("/dashboard");
        }
      }
    } catch (err: any) {
      toast({ title: "Erro ao criar conta", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (<div className="flex min-h-screen items-center justify-center bg-background px-4"><Card className="w-full max-w-md">
    <CardHeader className="text-center"><Link to="/" className="mb-2 inline-block font-display text-2xl font-bold"><span className="text-primary">P</span><span className="text-accent">X</span> <span className="text-foreground">ProvaX</span></Link><CardTitle className="font-display text-2xl">Criar Conta</CardTitle><CardDescription>Crie sua conta e ganhe 30 moedas grátis</CardDescription></CardHeader>
    <form onSubmit={handleSubmit}><CardContent className="space-y-4">
      <div className="space-y-2"><Label htmlFor="nome">Nome</Label><Input id="nome" placeholder="Seu nome completo" value={nome} onChange={e => setNome(e.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" type="password" placeholder="Mínimo 8 caracteres" value={password} onChange={e => setPassword(e.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor="indicacao">Código de Indicação (opcional)</Label><Input id="indicacao" placeholder="Ex: A1B2C3D4" value={codigoIndicacao} onChange={e => setCodigoIndicacao(e.target.value)} /></div>
      <div className="flex items-start space-x-2">
        <Checkbox id="termos" checked={aceitouTermos} onCheckedChange={(checked) => setAceitouTermos(checked === true)} />
        <Label htmlFor="termos" className="text-sm leading-snug cursor-pointer">
          Li e aceito os <Link to="/termos" target="_blank" className="text-primary hover:underline">Termos de Uso e Política de Privacidade</Link>.
        </Label>
      </div>
    </CardContent>
    <CardFooter className="flex-col gap-3">
      <Button type="submit" className="w-full" disabled={loading || googleLoading || !aceitouTermos}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Criar Conta
      </Button>
      <div className="flex w-full items-center gap-3">
        <Separator className="flex-1" />
        <span className="text-xs text-muted-foreground">ou</span>
        <Separator className="flex-1" />
      </div>
      <Button type="button" variant="outline" className="w-full" disabled={loading || googleLoading || !aceitouTermos} onClick={handleGoogleSignUp}>
        {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (
          <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
        )}
        Continuar com Google
      </Button>
      <p className="text-sm text-muted-foreground">Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link></p>
    </CardFooter></form>
  </Card></div>);
}
