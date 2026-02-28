import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Loader2, AlertTriangle, ChevronLeft, ChevronRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const CUSTOS: Record<string, number> = { "5": 5, "10": 10, "20": 15, "60": 0 };
const ENEM_AREAS = [
  { id: "linguagens", nome: "Linguagens" },
  { id: "matematica", nome: "Matemática" },
  { id: "humanas", nome: "Ciências Humanas" },
  { id: "natureza", nome: "Ciências da Natureza" },
];

interface Questao {
  id?: string;
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  resposta_correta: string;
  explicacao?: string;
}

export default function Simulado() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modo = searchParams.get("modo") || "concurso";

  const [nivel, setNivel] = useState("");
  const [quantidade, setQuantidade] = useState("5");
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showInsuficiente, setShowInsuficiente] = useState(false);

  const [carreiras, setCarreiras] = useState<any[]>([]);
  const [materias, setMaterias] = useState<any[]>([]);
  const [bancas, setBancas] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [esferas, setEsferas] = useState<any[]>([]);
  const [areas, setAreas] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [cursoId, setCursoId] = useState("");

  const [carreiraId, setCarreiraId] = useState("");
  const [materiaId, setMateriaId] = useState("");
  const [bancaId, setBancaId] = useState("");
  const [stateId, setStateId] = useState("");
  const [esferaId, setEsferaId] = useState("");
  const [areaId, setAreaId] = useState("");
  const [anoConcurso, setAnoConcurso] = useState("");
  const [areaEnem, setAreaEnem] = useState("");
  const [anoEnem, setAnoEnem] = useState("");
  const [topicId, setTopicId] = useState("");
  const [topics, setTopics] = useState<any[]>([]);

  const [simuladoId, setSimuladoId] = useState<string | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [finalizando, setFinalizando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [startTime] = useState(Date.now());

  // Load reference data for concurso mode
  useEffect(() => {
    if (modo === "concurso") {
      supabase.from("carreiras").select("*").order("nome").then(({ data }) => { if (data) setCarreiras(data); });
      supabase.from("bancas").select("*").order("nome").then(({ data }) => { if (data) setBancas(data); });
      supabase.from("states").select("*").order("nome").then(({ data }) => { if (data) setStates(data); });
      supabase.from("esferas").select("*").order("nome").then(({ data }) => { if (data) setEsferas(data); });
      supabase.from("areas").select("*").eq("modo", "concurso").order("nome").then(({ data }) => { if (data) setAreas(data); });
    } else if (modo === "universidade") {
      supabase.from("cursos").select("*").order("nome").then(({ data }) => { if (data) setCursos(data); });
    }
  }, [modo]);

  // Cascading: área → matérias (via area_materias) — concurso
  useEffect(() => {
    if (modo === "universidade") return;
    setMateriaId("");
    setTopicId("");
    setTopics([]);
    if (!areaId) { setMaterias([]); return; }
    supabase.from("area_materias").select("materia_id, materias(id, nome)").eq("area_id", areaId)
      .then(({ data }) => { if (data) setMaterias(data.map((d: any) => d.materias).filter(Boolean)); });
  }, [areaId, modo]);

  // Cascading: curso → disciplinas (via curso_materias) — universidade
  useEffect(() => {
    if (modo !== "universidade") return;
    setMateriaId("");
    setTopicId("");
    setTopics([]);
    if (!cursoId) { setMaterias([]); return; }
    supabase.from("curso_materias").select("materia_id, materias(id, nome)").eq("curso_id", cursoId)
      .then(({ data }) => { if (data) setMaterias(data.map((d: any) => d.materias).filter(Boolean).sort((a: any, b: any) => a.nome.localeCompare(b.nome))); });
  }, [cursoId, modo]);

  // Load topics when materia selected (universidade)
  useEffect(() => {
    setTopicId("");
    if (!materiaId || modo !== "universidade") { setTopics([]); return; }
    supabase.from("topics").select("*").eq("materia_id", materiaId).order("nome")
      .then(({ data }) => { if (data) setTopics(data); });
  }, [materiaId, modo]);

  const custo = quantidade === "60" ? 0 : CUSTOS[quantidade] || 5;
  const isPremiumOnly = quantidade === "60" && profile?.plano !== "premium";

  const validarFiltros = () => {
    if (modo === "concurso") {
      if (!areaId) { toast({ title: "Selecione a área", variant: "destructive" }); return false; }
      if (!materiaId) { toast({ title: "Selecione a matéria", variant: "destructive" }); return false; }
    } else if (modo === "universidade") {
      if (!cursoId) { toast({ title: "Selecione o curso", variant: "destructive" }); return false; }
      if (!materiaId) { toast({ title: "Selecione a disciplina", variant: "destructive" }); return false; }
    } else {
      if (!areaEnem) { toast({ title: "Selecione a área do ENEM", variant: "destructive" }); return false; }
    }
    if (isPremiumOnly) { toast({ title: "60 questões é exclusivo Premium", variant: "destructive" }); return false; }
    return true;
  };

  const handleGerarClick = () => {
    if (!validarFiltros()) return;
    if (custo > 0 && (profile?.saldo_moedas ?? 0) < custo) { setShowInsuficiente(true); return; }
    setShowConfirm(true);
  };

  const handleConfirmarGerar = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      if (custo > 0) {
        const { error: moedaErr } = await supabase.rpc("descontar_moedas", { _user_id: user!.id, _valor: custo, _descricao: `Simulado ${quantidade} questões` });
        if (moedaErr) throw new Error(moedaErr.message);
      }

      const qtd = parseInt(quantidade);
      let bodyPayload: any = { quantidade: qtd, nivel: nivel || "medio", modo };
      if (modo === "concurso") {
        bodyPayload = {
          ...bodyPayload,
          materia: materiaId || undefined,
          banca: bancaId || undefined,
          carreira: carreiraId || undefined,
          area: areaId || undefined,
          state: stateId || undefined,
          esfera: esferaId || undefined,
          ano: anoConcurso ? parseInt(anoConcurso) : undefined,
        };
      } else if (modo === "universidade") {
        bodyPayload = {
          ...bodyPayload,
          materia: materiaId || undefined,
          curso: cursoId || undefined,
          topic: topicId || undefined,
        };
      } else {
        bodyPayload = { ...bodyPayload, area: ENEM_AREAS.find(a => a.id === areaEnem)?.nome, ano: anoEnem || undefined };
      }

      const { data: aiData, error: aiError } = await supabase.functions.invoke("generate-questions", { body: bodyPayload });
      if (aiError) throw new Error(aiError.message || "Erro ao gerar questões");
      if (aiData?.error) throw new Error(aiData.error);

      const generatedQuestoes: Questao[] = aiData.questoes || [];
      if (generatedQuestoes.length === 0) {
        toast({ title: "IA não retornou questões. Tente novamente.", variant: "destructive" });
        if (custo > 0) await supabase.rpc("adicionar_moedas", { _user_id: user!.id, _valor: custo, _descricao: "Reembolso simulado" });
        setLoading(false);
        return;
      }

      const { data: sim, error: sErr } = await supabase.from("simulados").insert({
        user_id: user!.id, tipo: qtd === 60 ? "prova_completa" : "normal", quantidade: generatedQuestoes.length, total_questoes: generatedQuestoes.length,
        carreira_id: carreiraId || null, materia_id: materiaId || null, banca_id: bancaId || null,
        state_id: stateId || null, esfera_id: esferaId || null, area_id: modo !== "universidade" ? (areaId || null) : null, modo,
        topic_id: topicId || null, curso_id: modo === "universidade" ? (cursoId || null) : null,
      }).select().single();
      if (sErr) throw sErr;

      // Save questions to DB for future review
      const questoesInsert = generatedQuestoes.map(q => ({
        enunciado: q.enunciado,
        alternativas: q.alternativas as any,
        resposta_correta: q.resposta_correta,
        explicacao: q.explicacao || null,
        modo,
        materia_id: materiaId || null,
        area_id: modo !== "universidade" ? (areaId || null) : null,
        curso_id: modo === "universidade" ? (cursoId || null) : null,
        topic_id: topicId || null,
        banca_id: bancaId || null,
        source: "ai_generated",
      }));
      const { data: savedQuestoes, error: qErr } = await supabase.from("questoes").insert(questoesInsert).select("id");
      if (qErr) console.error("Erro ao salvar questões:", qErr);

      const questoesComId = generatedQuestoes.map((q, i) => ({
        ...q,
        id: savedQuestoes?.[i]?.id || undefined,
      }));

      setSimuladoId(sim.id); setQuestoes(questoesComId); setCurrentIdx(0); setRespostas({});
      await refreshProfile();
      toast({ title: `Simulado gerado! ${generatedQuestoes.length} questões.` });
    } catch (err: any) { toast({ title: "Erro ao gerar simulado", description: err.message, variant: "destructive" }); }
    setLoading(false);
  };

  const handleFinalizar = async () => {
    setFinalizando(true);
    try {
      let acertos = 0;
      const tempoTotal = Math.round((Date.now() - startTime) / 1000);
      for (let i = 0; i < questoes.length; i++) { if (respostas[i] === questoes[i].resposta_correta) acertos++; }
      const nota = Math.round((acertos / questoes.length) * 100);

      let bonus = 0;
      if (nota >= 90) bonus = 10; else if (nota >= 80) bonus = 5;
      if (bonus > 0) await supabase.rpc("adicionar_moedas", { _user_id: user!.id, _valor: bonus, _descricao: `Bônus nota ${nota}%` });

      // 1 XP por questão acertada
      const xpGanho = acertos;
      if (xpGanho > 0) await supabase.rpc("adicionar_xp", { _user_id: user!.id, _xp_ganho: xpGanho });
      await supabase.from("simulados").update({ pontuacao: nota, acertos, tempo_gasto: tempoTotal, status: "finalizado", finished_at: new Date().toISOString() }).eq("id", simuladoId!);

      // Save respostas to DB for review
      const respostasInsert = questoes.map((q, i) => ({
        simulado_id: simuladoId!,
        questao_id: q.id!,
        resposta_usuario: respostas[i] || null,
        acertou: respostas[i] === q.resposta_correta,
        tempo_resposta: 0,
      })).filter(r => r.questao_id);
      if (respostasInsert.length > 0) {
        await supabase.from("respostas").insert(respostasInsert);
      }

      await refreshProfile();

      setResultado({ nota, acertos, total: questoes.length, bonus, xpGanho, tempoTotal, tempoMedioPorQuestao: Math.round(tempoTotal / questoes.length) });
      toast({ title: `Simulado finalizado! Nota: ${nota}%` });
    } catch (err: any) { toast({ title: "Erro ao finalizar", description: err.message, variant: "destructive" }); }
    setFinalizando(false);
  };

  if (resultado) {
    return (
      <div className="flex min-h-screen flex-col bg-background"><AppHeader /><main className="container max-w-3xl flex-1 py-8"><Card><CardHeader className="text-center"><CardTitle className="font-display text-3xl">📊 Relatório do Simulado</CardTitle></CardHeader><CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <div className="rounded-lg bg-primary/10 p-4 text-center"><p className="text-sm text-muted-foreground">Nota</p><p className="text-3xl font-bold text-primary">{resultado.nota}%</p></div>
          <div className="rounded-lg bg-accent/10 p-4 text-center"><p className="text-sm text-muted-foreground">Acertos</p><p className="text-3xl font-bold text-accent">{resultado.acertos}/{resultado.total}</p></div>
          <div className="rounded-lg bg-warning/10 p-4 text-center"><p className="text-sm text-muted-foreground">Tempo Médio</p><p className="text-3xl font-bold text-warning">{resultado.tempoMedioPorQuestao}s</p></div>
          <div className="rounded-lg bg-coin/10 p-4 text-center"><p className="text-sm text-muted-foreground">XP Ganho</p><p className="text-3xl font-bold text-coin">+{resultado.xpGanho}</p></div>
        </div>
        {resultado.bonus > 0 && <div className="rounded-lg border border-coin bg-coin/5 p-3 text-center text-sm font-medium">🎉 Bônus de {resultado.bonus} moedas!</div>}
        <div><h3 className="mb-3 font-display text-lg font-semibold">Correção Detalhada</h3><div className="space-y-3">{questoes.map((q, i) => { const resp = respostas[i]; const correta = resp === q.resposta_correta; return (<Card key={i} className={`border-l-4 ${correta ? "border-l-accent" : "border-l-destructive"}`}><CardContent className="pt-4"><p className="mb-2 text-sm font-medium">{i+1}. {q.enunciado}</p><p className="text-xs"><span className={resp ? (correta ? "text-accent" : "text-destructive") : "text-muted-foreground"}>Sua: {resp || "—"}</span> | <span className="font-medium text-accent">Correta: {q.resposta_correta}</span></p>{q.explicacao && <p className="mt-2 text-xs text-muted-foreground italic">{q.explicacao}</p>}</CardContent></Card>); })}</div></div>
        <div className="flex gap-3 justify-center"><Button onClick={() => navigate("/dashboard")}>Voltar</Button><Button variant="outline" onClick={() => { setResultado(null); setSimuladoId(null); setQuestoes([]); }}>Novo Simulado</Button></div>
      </CardContent></Card></main><AppFooter /></div>
    );
  }

  if (simuladoId && questoes.length > 0) {
    const q = questoes[currentIdx]; const respondidas = Object.keys(respostas).length; const progresso = Math.round((respondidas / questoes.length) * 100);
    return (
      <div className="flex min-h-screen flex-col bg-background"><AppHeader /><main className="container max-w-2xl flex-1 py-8">
        <div className="mb-4 space-y-2"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Questão {currentIdx+1} de {questoes.length}</span><span className="text-xs text-muted-foreground">{respondidas}/{questoes.length} respondidas</span></div><Progress value={progresso} className="h-2" /></div>
        <div className="mb-4 flex justify-end"><Button variant="destructive" size="sm" onClick={handleFinalizar} disabled={finalizando}>{finalizando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Finalizar</Button></div>
        <Card><CardContent className="pt-6"><p className="mb-6 text-sm leading-relaxed">{q.enunciado}</p><div className="space-y-2">{q.alternativas.map(o => (<button key={o.letra} className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${respostas[currentIdx] === o.letra ? "border-primary bg-primary/10 font-medium" : "hover:bg-secondary"}`} onClick={() => setRespostas(prev => ({ ...prev, [currentIdx]: o.letra }))}><span className="mr-2 font-semibold">{o.letra})</span>{o.texto}</button>))}</div></CardContent></Card>
        <div className="mt-4 flex justify-between"><Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx(i => i-1)}><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button><Button disabled={currentIdx === questoes.length-1} onClick={() => setCurrentIdx(i => i+1)}>Próxima<ChevronRight className="ml-1 h-4 w-4" /></Button></div>
        <div className="mt-4 flex flex-wrap gap-1 justify-center">{questoes.map((_, i) => (<button key={i} onClick={() => setCurrentIdx(i)} className={`h-8 w-8 rounded text-xs font-medium transition-colors ${i === currentIdx ? "bg-primary text-primary-foreground" : respostas[i] ? "bg-accent/20 text-accent" : "bg-secondary text-muted-foreground"}`}>{i+1}</button>))}</div>
      </main><AppFooter /></div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-background"><AppHeader /><main className="container max-w-lg flex-1 py-8">
      <h1 className="mb-6 font-display text-2xl font-bold">{modo === "enem" ? "🎓 Simulado ENEM" : modo === "universidade" ? "🏛️ Simulado Universidade" : "🎯 Gerar Simulado"}</h1>
      <p className="mb-4 text-sm text-muted-foreground">{modo === "universidade" ? "Selecione o curso e disciplina para gerar questões universitárias." : "Selecione os filtros abaixo para gerar um simulado personalizado no padrão da sua banca."}</p>
      <Card><CardContent className="space-y-4 pt-6">
        {modo === "concurso" ? (<>
          <div className="space-y-2"><Label>Estado</Label><Select value={stateId} onValueChange={setStateId}><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent>{states.map(s => <SelectItem key={s.id} value={s.id}>{s.nome} ({s.sigla})</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Esfera</Label><Select value={esferaId} onValueChange={setEsferaId}><SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger><SelectContent>{esferas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Área *</Label><Select value={areaId} onValueChange={setAreaId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{areas.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Matéria *</Label><Select value={materiaId} onValueChange={setMateriaId} disabled={!areaId}><SelectTrigger><SelectValue placeholder={areaId ? "Selecione" : "Selecione a área primeiro"} /></SelectTrigger><SelectContent>{materias.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Carreira</Label><Select value={carreiraId} onValueChange={setCarreiraId}><SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger><SelectContent>{carreiras.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Banca</Label><Select value={bancaId} onValueChange={setBancaId}><SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger><SelectContent>{bancas.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Ano (opcional)</Label><Select value={anoConcurso} onValueChange={setAnoConcurso}><SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger><SelectContent>{[2025,2024,2023,2022,2021,2020].map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent></Select></div>
        </>) : modo === "universidade" ? (<>
          <div className="space-y-2"><Label>Curso *</Label><Select value={cursoId} onValueChange={setCursoId}><SelectTrigger><SelectValue placeholder="Selecione o curso" /></SelectTrigger><SelectContent>{cursos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Disciplina *</Label><Select value={materiaId} onValueChange={setMateriaId} disabled={!cursoId}><SelectTrigger><SelectValue placeholder={cursoId ? "Selecione a disciplina" : "Selecione o curso primeiro"} /></SelectTrigger><SelectContent>{materias.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent></Select></div>
          {topics.length > 0 && (<div className="space-y-2"><Label>Tópico (opcional)</Label><Select value={topicId} onValueChange={setTopicId}><SelectTrigger><SelectValue placeholder="Todos os tópicos" /></SelectTrigger><SelectContent>{topics.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent></Select></div>)}
        </>) : (<>
          <div className="space-y-2"><Label>Área do ENEM *</Label><Select value={areaEnem} onValueChange={setAreaEnem}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{ENEM_AREAS.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Ano (opcional)</Label><Select value={anoEnem} onValueChange={setAnoEnem}><SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger><SelectContent>{[2025,2024,2023,2022,2021,2020].map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent></Select></div>
        </>)}
        <div className="space-y-2"><Label>Dificuldade</Label><Select value={nivel} onValueChange={setNivel}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="facil">Fácil</SelectItem><SelectItem value="medio">Médio</SelectItem><SelectItem value="dificil">Difícil</SelectItem></SelectContent></Select></div>
        <div className="space-y-2"><Label>Quantidade</Label><Select value={quantidade} onValueChange={setQuantidade}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="5">5 questões (5 moedas)</SelectItem><SelectItem value="10">10 questões (10 moedas)</SelectItem><SelectItem value="20">20 questões (15 moedas)</SelectItem><SelectItem value="60">60 questões (Premium)</SelectItem></SelectContent></Select></div>
        <Button className="w-full" onClick={handleGerarClick} disabled={loading || isPremiumOnly}>{loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isPremiumOnly ? "Exclusivo Premium" : `Gerar Simulado (${custo} moedas)`}</Button>
      </CardContent></Card>
    </main>
    <Dialog open={showConfirm} onOpenChange={setShowConfirm}><DialogContent><DialogHeader><DialogTitle>Confirmar Simulado</DialogTitle><DialogDescription>Serão descontadas {custo} moedas ({profile?.saldo_moedas ?? 0} disponíveis).</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button><Button onClick={handleConfirmarGerar}>Confirmar</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={showInsuficiente} onOpenChange={setShowInsuficiente}><DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" />Saldo Insuficiente</DialogTitle><DialogDescription>Precisa de {custo} moedas. Saldo: {profile?.saldo_moedas ?? 0}.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setShowInsuficiente(false)}>Fechar</Button><Button onClick={() => { setShowInsuficiente(false); navigate("/comprar-moedas"); }}>Comprar Moedas</Button></DialogFooter></DialogContent></Dialog>
    <AppFooter />
    </div>
  );
}
