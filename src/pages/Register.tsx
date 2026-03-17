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
import { trackFBEvent } from "@/lib/fbPixel";

export default function Register() {
  const [searchParams] = useSearchParams();
  const refCode = searchParams.get("ref") || "";
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [telefone, setTelefone] = useState("");
  const [codigoIndicacao, setCodigoIndicacao] = useState(refCode);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [loading, setLoading] = useState(false);
  const { signUp } = useAuth();
  const navigate = useNavigate();

  // Phone mask and validation
  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 11);
    if (digits.length <= 2) return digits.length ? `(${digits}` : "";
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };
  const phoneDigits = telefone.replace(/\D/g, "");
  const phoneValid = phoneDigits.length >= 10 && phoneDigits.length <= 11;

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  const hasMinLength = password.length >= 6;
  const passwordValid = hasLetter && hasNumber && hasMinLength;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nome || !email || !password || !telefone) { toast({ title: "Preencha todos os campos obrigatórios.", variant: "destructive" }); return; }
    if (!phoneValid) { toast({ title: "Informe um número de telefone válido com DDD.", variant: "destructive" }); return; }
    if (!passwordValid) { toast({ title: "A senha deve ter no mínimo 6 caracteres, incluindo pelo menos 1 letra e 1 número.", variant: "destructive" }); return; }
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

      const { error } = await signUp(email, password, nome, codigoIndicacao.trim() || undefined, phoneDigits);
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
        trackFBEvent("CompleteRegistration", { content_name: "ProvaX Signup" });
        toast({ 
          title: "Conta criada! 📧", 
          description: "Enviamos um link de confirmação para seu email. Verifique sua caixa de entrada (e spam) para ativar sua conta.",
        });
        navigate("/login");
      }
    } catch (err: any) {
      toast({ title: "Erro ao criar conta", description: err.message, variant: "destructive" });
    }
    setLoading(false);
  };

  return (<div className="flex min-h-screen items-center justify-center bg-background px-4"><Card className="w-full max-w-md">
    <CardHeader className="text-center">
      <Link to="/" className="mb-2 inline-block font-display text-2xl font-bold"><span className="text-primary">P</span><span className="text-accent">X</span> <span className="text-foreground">ProvaX</span></Link>
      <CardTitle className="font-display text-2xl">Criar Conta</CardTitle>
      <CardDescription>Você está a menos de 30 segundos de descobrir seu nível em concursos.</CardDescription>
      <p className="text-xs text-muted-foreground mt-1">Cadastro rápido • Sem cartão de crédito • Comece imediatamente</p>
    </CardHeader>
    <form onSubmit={handleSubmit}><CardContent className="space-y-4">
      <div className="space-y-2"><Label htmlFor="nome">Nome</Label><Input id="nome" placeholder="Seu nome completo" value={nome} onChange={e => setNome(e.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor="email">Email</Label><Input id="email" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required /></div>
      <div className="space-y-2"><Label htmlFor="password">Senha</Label><Input id="password" type="password" placeholder="Mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required />
        {password.length > 0 && (
          <div className="space-y-1 text-xs">
            <p className={hasMinLength ? "text-accent" : "text-destructive"}>
              {hasMinLength ? "✓" : "✗"} Mínimo 6 caracteres
            </p>
            <p className={hasLetter ? "text-accent" : "text-destructive"}>
              {hasLetter ? "✓" : "✗"} Pelo menos 1 letra
            </p>
            <p className={hasNumber ? "text-accent" : "text-destructive"}>
              {hasNumber ? "✓" : "✗"} Pelo menos 1 número
            </p>
          </div>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="telefone">Telefone / WhatsApp (opcional)</Label>
        <Input id="telefone" type="tel" placeholder="(11) 99999-9999" value={telefone} onChange={e => setTelefone(formatPhone(e.target.value))} />
        <p className="text-[11px] text-muted-foreground">Usamos seu número apenas para suporte e avisos importantes. Sem spam.</p>
        {telefone.length > 0 && !phoneValid && (
          <p className="text-xs text-destructive">Informe um número de telefone válido com DDD.</p>
        )}
      </div>
      <div className="space-y-2"><Label htmlFor="indicacao">Código de Indicação (opcional)</Label><Input id="indicacao" placeholder="Ex: A1B2C3D4" value={codigoIndicacao} onChange={e => setCodigoIndicacao(e.target.value)} /></div>
      <div className="flex items-start space-x-2">
        <Checkbox id="termos" checked={aceitouTermos} onCheckedChange={(checked) => setAceitouTermos(checked === true)} />
        <Label htmlFor="termos" className="text-sm leading-snug cursor-pointer">
          Li e aceito os <Link to="/termos" target="_blank" className="text-primary hover:underline">Termos de Uso e Política de Privacidade</Link>.
        </Label>
      </div>
    </CardContent>
    <CardFooter className="flex-col gap-3">
      <Button type="submit" className="w-full" disabled={loading || !aceitouTermos}>
        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
        Descobrir meu nível agora
      </Button>
      <p className="text-sm text-muted-foreground">Já tem conta? <Link to="/login" className="text-primary hover:underline">Entrar</Link></p>
    </CardFooter></form>
  </Card></div>);
}
