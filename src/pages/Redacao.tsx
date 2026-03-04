import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, CheckCircle, XCircle, Lock } from "lucide-react";

const TEMAS = [
  "Os desafios da educação a distância no Brasil",
  "O impacto das redes sociais na democracia",
  "Caminhos para combater a desigualdade social no Brasil",
  "O papel da tecnologia na preservação ambiental",
  "Saúde mental dos jovens na era digital",
  "A importância da participação cidadã na política",
  "Mobilidade urbana sustentável nas grandes cidades",
  "Os limites entre liberdade de expressão e discurso de ódio",
  "A invisibilidade do trabalho doméstico no Brasil",
  "Desafios para a inclusão digital no Brasil",
];

export default function Redacao() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [tema, setTema] = useState("");
  const [texto, setTexto] = useState("");
  const [loading, setLoading] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [redacaoId, setRedacaoId] = useState<string | null>(null);
  const [resultado, setResultado] = useState<any>(null);

  const isFreePlan = !profile?.plano || profile.plano === "free";

  const iniciarRedacao = async () => {
    setLoading(true);
    try {
      const temaEscolhido = TEMAS[Math.floor(Math.random() * TEMAS.length)];
      const { data, error } = await supabase.from("redacoes").insert({ user_id: user!.id, tema: temaEscolhido, texto: "" }).select().single();
      if (error) throw error;
      setRedacaoId(data.id); setTema(temaEscolhido);
      toast({ title: "Redação iniciada!" });
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
    setLoading(false);
  };

  const enviarRedacao = async () => {
    if (texto.trim().length < 100) { toast({ title: "Mínimo 100 caracteres", variant: "destructive" }); return; }
    setEnviando(true);
    try {
      const { data: aiData, error: aiError } = await supabase.functions.invoke("correct-essay", { body: { tema, texto } });
      if (aiError) throw new Error(aiError.message); if (aiData?.error) throw new Error(aiData.error);
      const c = aiData;
      await supabase.from("redacoes").update({ texto, nota: c.nota_total, competencia_1: c.competencia_1, competencia_2: c.competencia_2, competencia_3: c.competencia_3, competencia_4: c.competencia_4, competencia_5: c.competencia_5, pontos_fortes: c.pontos_fortes?.join("; "), pontos_fracos: c.pontos_fracos?.join("; "), sugestoes: c.sugestoes?.join("; "), feedback_completo: c, status: "corrigida" }).eq("id", redacaoId!);
      
      // XP: 1 point per redação submitted
      await supabase.rpc("adicionar_xp", { _user_id: user!.id, _xp_ganho: 5 }); 
      await refreshProfile();
      setResultado(c); toast({ title: `Redação corrigida!` });
    } catch (err: any) { toast({ title: "Erro", description: err.message, variant: "destructive" }); }
    setEnviando(false);
  };

  if (resultado) {
    const comps = [{num:1,nome:"Norma Culta",nota:resultado.competencia_1},{num:2,nome:"Compreensão do Tema",nota:resultado.competencia_2},{num:3,nome:"Argumentação",nota:resultado.competencia_3},{num:4,nome:"Coesão",nota:resultado.competencia_4},{num:5,nome:"Proposta de Intervenção",nota:resultado.competencia_5}];
    
    // Free users: show only the total score, gate the rest
    if (isFreePlan) {
      return (<div className="flex min-h-screen flex-col bg-background"><AppHeader /><main className="container max-w-3xl flex-1 py-8"><Card><CardHeader className="text-center"><CardTitle className="font-display text-3xl">📝 Redação Enviada</CardTitle><CardDescription>Tema: {tema}</CardDescription></CardHeader><CardContent className="space-y-6">
        <p className="text-center text-5xl font-bold text-primary">{resultado.nota_total}/1000</p>
        
        <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-6 text-center space-y-4">
          <Lock className="mx-auto h-10 w-10 text-primary/60" />
          <h3 className="font-display text-lg font-bold">Para ver sua correção completa e análise detalhada, assine o Plano Pro.</h3>
          <p className="text-sm text-muted-foreground">No Plano Pro você recebe:</p>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>✅ Nota detalhada por competência (C1 a C5)</li>
            <li>✅ Pontos fortes identificados</li>
            <li>✅ Pontos fracos para melhorar</li>
            <li>✅ Sugestões de melhoria personalizadas</li>
            <li>✅ Feedback completo da IA</li>
          </ul>
          <Button size="lg" onClick={() => navigate("/planos")}>Assinar Plano Pro</Button>
        </div>

        <div className="flex gap-3 justify-center"><Button variant="outline" onClick={() => navigate("/dashboard")}>Voltar</Button><Button variant="outline" onClick={() => { setResultado(null); setRedacaoId(null); setTexto(""); }}>Nova Redação</Button></div>
      </CardContent></Card></main><AppFooter /></div>);
    }

    // Premium users: full detailed feedback
    return (<div className="flex min-h-screen flex-col bg-background"><AppHeader /><main className="container max-w-3xl flex-1 py-8"><Card><CardHeader className="text-center"><CardTitle className="font-display text-3xl">📝 Resultado</CardTitle><CardDescription>Tema: {tema}</CardDescription></CardHeader><CardContent className="space-y-6">
      <p className="text-center text-5xl font-bold text-primary">{resultado.nota_total}/1000</p>
      <div className="space-y-3">{comps.map(c => (<div key={c.num} className="flex items-center gap-3"><span className="w-48 text-sm font-medium">C{c.num} - {c.nome}</span><div className="flex-1 rounded-full bg-secondary h-3 overflow-hidden"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(c.nota/200)*100}%` }} /></div><span className="w-16 text-right text-sm font-bold">{c.nota}/200</span></div>))}</div>
      {resultado.pontos_fortes?.length > 0 && <div><h3 className="mb-2 font-display text-base font-semibold flex items-center gap-2"><CheckCircle className="h-4 w-4 text-accent" />Pontos Fortes</h3><ul className="space-y-1">{resultado.pontos_fortes.map((p:string,i:number) => <li key={i} className="text-sm text-muted-foreground">• {p}</li>)}</ul></div>}
      {resultado.pontos_fracos?.length > 0 && <div><h3 className="mb-2 font-display text-base font-semibold flex items-center gap-2"><XCircle className="h-4 w-4 text-destructive" />Pontos Fracos</h3><ul className="space-y-1">{resultado.pontos_fracos.map((e:string,i:number) => <li key={i} className="text-sm text-muted-foreground">• {e}</li>)}</ul></div>}
      {resultado.sugestoes?.length > 0 && <div><h3 className="mb-2 font-display text-base font-semibold">💡 Sugestões de Melhoria</h3><ul className="space-y-1">{resultado.sugestoes.map((s:string,i:number) => <li key={i} className="text-sm text-muted-foreground">• {s}</li>)}</ul></div>}
      {resultado.feedback && <div><h3 className="mb-2 font-display text-base font-semibold">Feedback</h3><p className="text-sm text-muted-foreground whitespace-pre-line">{resultado.feedback}</p></div>}
      <div className="flex gap-3 justify-center"><Button onClick={() => navigate("/dashboard")}>Voltar</Button><Button variant="outline" onClick={() => { setResultado(null); setRedacaoId(null); setTexto(""); }}>Nova Redação</Button></div>
    </CardContent></Card></main><AppFooter /></div>);
  }

  if (redacaoId) {
    return (<div className="flex min-h-screen flex-col bg-background"><AppHeader /><main className="container max-w-2xl flex-1 py-8">
      <h1 className="mb-2 font-display text-2xl font-bold">Redação</h1>
      <Card className="mb-4"><CardHeader><CardTitle className="text-base">Tema</CardTitle><CardDescription className="text-base font-medium">{tema}</CardDescription></CardHeader></Card>
      <Textarea className="min-h-[300px]" placeholder="Escreva sua redação aqui..." value={texto} onChange={e => setTexto(e.target.value)} />
      <p className="mt-2 text-xs text-muted-foreground">{texto.length} caracteres</p>
      {isFreePlan && (
        <p className="mt-1 text-xs text-muted-foreground">
          📋 No plano Free você recebe apenas a nota total. Assine o Pro para correção detalhada.
        </p>
      )}
      <Button className="mt-4 w-full" onClick={enviarRedacao} disabled={enviando}>{enviando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{enviando ? "Corrigindo..." : "Enviar Redação"}</Button>
    </main><AppFooter /></div>);
  }

  return (<div className="flex min-h-screen flex-col bg-background"><AppHeader /><main className="container max-w-lg flex-1 py-8">
    <h1 className="mb-6 font-display text-2xl font-bold">Simulado de Redação</h1>
    <Card><CardContent className="space-y-4 pt-6">
      <p className="text-sm text-muted-foreground">Tema gerado automaticamente. Correção IA no padrão ENEM com nota por competência (0-200).</p>
      {isFreePlan && (
        <div className="rounded-lg border border-muted bg-muted/30 p-3 text-xs text-muted-foreground">
          📋 Plano Free: você recebe a nota total. Assine o Pro para análise detalhada por competência.
        </div>
      )}
      <Button className="w-full" onClick={iniciarRedacao} disabled={loading}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Iniciar Redação (Grátis)</Button>
    </CardContent></Card>
  </main>
  <AppFooter />
  </div>);
}
