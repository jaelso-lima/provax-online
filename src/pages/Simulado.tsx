import { useState, useEffect, useRef } from "react";
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
import { Loader2, AlertTriangle, ChevronLeft, ChevronRight, ArrowLeft } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  fetchAreas, fetchCarreiras, fetchBancas, fetchStates,
  fetchEsferas, fetchTopics, fetchMateriasByArea, hasBancaDistribuicao,
  type FilterOption,
} from "@/services/simuladoRepository";
import {
  getProvaCompletaConfig, buildProvaCompletaPromptContext,
  type SimuladoTipoMode,
} from "@/services/simuladoService";

const ENEM_AREAS = [
  { id: "linguagens", nome: "Linguagens" },
  { id: "matematica", nome: "Matemática" },
  { id: "humanas", nome: "Ciências Humanas" },
  { id: "natureza", nome: "Ciências da Natureza" },
];

// Free daily limits
const FREE_DAILY_LIMIT = 10;
// Prova completa: block at question 12 (index 11) for free users
const FREE_PROVA_COMPLETA_LIMIT = 12;

interface Questao {
  id?: string;
  enunciado: string;
  alternativas: { letra: string; texto: string }[];
  resposta_correta: string;
  explicacao?: string;
  materia_nome?: string;
}

// Metadata context for displaying on question cards
interface SimuladoMeta {
  banca_nome?: string;
  area_nome?: string;
  carreira_nome?: string;
  ano?: string;
  estado_nome?: string;
}

export default function Simulado() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const modo = searchParams.get("modo") || "concurso";
  const continuarId = searchParams.get("continuar");
  const autostart = searchParams.get("autostart") === "true";
  const paramBancaNome = searchParams.get("banca_nome");
  const paramAreaNome = searchParams.get("area_nome");
  const paramNivel = searchParams.get("nivel");
  const paramEstado = searchParams.get("estado");
  const [autostartTriggered, setAutostartTriggered] = useState(false);

  const [nivel, setNivel] = useState("");
  const [quantidade, setQuantidade] = useState("5");
  const [loading, setLoading] = useState(false);
  const [resumeLoading, setResumeLoading] = useState(!!continuarId);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showConfirmSair, setShowConfirmSair] = useState(false);
  const [showInsuficiente, setShowInsuficiente] = useState(false);

  // Reference data
  const [carreiras, setCarreiras] = useState<FilterOption[]>([]);
  const [materias, setMaterias] = useState<FilterOption[]>([]);
  const [bancas, setBancas] = useState<FilterOption[]>([]);
  const [states, setStates] = useState<FilterOption[]>([]);
  const [esferas, setEsferas] = useState<FilterOption[]>([]);
  const [areas, setAreas] = useState<FilterOption[]>([]);
  const [topics, setTopics] = useState<FilterOption[]>([]);

  // Filter selections
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

  // Simulado type mode (concurso)
  const [tipoMode, setTipoMode] = useState<SimuladoTipoMode>("disciplina");
  const [provaCompletaAvailable, setProvaCompletaAvailable] = useState(false);
  const [provaCompletaLoading, setProvaCompletaLoading] = useState(false);

  // Simulado state
  const [simuladoId, setSimuladoId] = useState<string | null>(null);
  const [questoes, setQuestoes] = useState<Questao[]>([]);
  const [respostas, setRespostas] = useState<Record<number, string>>({});
  const [currentIdx, setCurrentIdx] = useState(0);
  const [finalizando, setFinalizando] = useState(false);
  const [resultado, setResultado] = useState<any>(null);
  const [startTime, setStartTime] = useState(Date.now());
  const [tempoAcumulado, setTempoAcumulado] = useState(0);
  const finalizarRef = useRef<HTMLDivElement>(null);
  const [simuladoMeta, setSimuladoMeta] = useState<SimuladoMeta>({});

  const isFreePlan = !profile?.plano || profile.plano === "free";
  const isPremiumUser = profile?.plano && profile.plano !== "free";

  // Resume an in-progress simulado
  useEffect(() => {
    if (!continuarId || !user) return;
    const resume = async () => {
      setResumeLoading(true);
      try {
        const { data: sim } = await supabase
          .from("simulados").select("*")
          .eq("id", continuarId).eq("user_id", user.id).eq("status", "em_andamento").single();

        if (!sim) {
          toast({ title: "Simulado não encontrado ou já finalizado", variant: "destructive" });
          navigate("/dashboard"); return;
        }

        const { data: existingRespostas } = await supabase
          .from("respostas").select("*, questoes(id, enunciado, alternativas, resposta_correta, explicacao)")
          .eq("simulado_id", continuarId).order("created_at");

        let allQuestoes: Questao[] = [];
        const savedRespostas: Record<number, string> = {};

        if (existingRespostas && existingRespostas.length > 0) {
          allQuestoes = existingRespostas
            .map((r: any) => ({
              id: r.questoes?.id, enunciado: r.questoes?.enunciado || "",
              alternativas: Array.isArray(r.questoes?.alternativas) ? r.questoes.alternativas : [],
              resposta_correta: r.questoes?.resposta_correta || "", explicacao: r.questoes?.explicacao,
            })).filter((q: Questao) => q.id && q.enunciado);

          existingRespostas.forEach((r: any, i: number) => {
            if (r.resposta_usuario) savedRespostas[i] = r.resposta_usuario;
          });
        }

        if (allQuestoes.length === 0) {
          toast({ title: "Simulado sem questões salvas", description: "Este simulado será arquivado.", variant: "destructive" });
          await supabase.from("simulados").update({ status: "finalizado", finished_at: new Date().toISOString(), pontuacao: 0, acertos: 0 }).eq("id", continuarId);
          navigate(`/simulado?modo=${sim.modo}`); return;
        }

        // Detect if this is a prova_completa for gate logic
        if (sim.tipo === "prova_completa") setTipoMode("prova_completa");

        setSimuladoId(sim.id); setQuestoes(allQuestoes); setRespostas(savedRespostas);
        setTempoAcumulado(sim.tempo_gasto || 0); setStartTime(Date.now());
        const answeredCount = Object.keys(savedRespostas).length;
        setCurrentIdx(answeredCount < allQuestoes.length ? answeredCount : allQuestoes.length - 1);
        toast({ title: "Simulado retomado! Continue de onde parou." });
      } catch (err: any) {
        toast({ title: "Erro ao retomar simulado", description: err.message, variant: "destructive" });
        navigate("/dashboard");
      }
      setResumeLoading(false);
    };
    resume();
  }, [continuarId, user]);

  // Auto-save progress
  useEffect(() => {
    if (!simuladoId || resultado) return;
    const interval = setInterval(async () => {
      const respondidas = Object.keys(respostas).length;
      const tempoTotal = tempoAcumulado + Math.round((Date.now() - startTime) / 1000);
      await supabase.from("simulados").update({ ultima_questao_respondida: respondidas, tempo_gasto: tempoTotal }).eq("id", simuladoId);
    }, 30000);
    return () => clearInterval(interval);
  }, [simuladoId, respostas, resultado, startTime, tempoAcumulado]);

  const handleAnswer = async (letra: string) => {
    const newRespostas = { ...respostas, [currentIdx]: letra };
    setRespostas(newRespostas);
    if (simuladoId && questoes[currentIdx]?.id) {
      const q = questoes[currentIdx];
      await supabase.from("respostas").update({ resposta_usuario: letra, acertou: letra === q.resposta_correta }).eq("simulado_id", simuladoId).eq("questao_id", q.id);
      await supabase.from("simulados").update({ ultima_questao_respondida: Object.keys(newRespostas).length }).eq("id", simuladoId);
    }
  };

  // ─── Load reference data ──────────────────────────────────────
  useEffect(() => {
    if (continuarId) return;
    if (modo === "concurso") {
      Promise.all([fetchCarreiras(), fetchBancas(), fetchStates(), fetchEsferas(), fetchAreas("concurso")])
        .then(([c, b, s, e, a]) => {
          setCarreiras(c); setBancas(b); setStates(s); setEsferas(e); setAreas(a);
          if (autostart && !autostartTriggered) {
            if (paramBancaNome) {
              const matchedBanca = b.find((x: FilterOption) => x.nome.toLowerCase() === paramBancaNome.toLowerCase());
              if (matchedBanca) setBancaId(matchedBanca.id);
            }
            if (paramAreaNome) {
              const matchedArea = a.find((x: FilterOption) => x.nome.toLowerCase() === paramAreaNome.toLowerCase());
              if (matchedArea) setAreaId(matchedArea.id);
            }
            if (paramEstado) {
              const matchedState = s.find((x: FilterOption) => x.nome.toLowerCase() === paramEstado.toLowerCase() || (x as any).sigla?.toLowerCase() === paramEstado.toLowerCase());
              if (matchedState) setStateId(matchedState.id);
            }
            if (paramNivel) setNivel(paramNivel);
            setTipoMode("livre");
          }
        });
    }
  }, [modo, continuarId]);

  // Auto-start: trigger generation once filters are set
  useEffect(() => {
    if (!autostart || autostartTriggered || !user || !profile) return;
    if (modo === "concurso" && areaId && bancas.length > 0 && areas.length > 0) {
      setAutostartTriggered(true);
      setTimeout(() => { setShowConfirm(true); }, 500);
    }
  }, [autostart, autostartTriggered, areaId, bancaId, bancas, areas, user, profile]);

  // Cascading: área → matérias (concurso)
  useEffect(() => {
    if (continuarId) return;
    setMateriaId(""); setTopicId(""); setTopics([]);
    if (!areaId) { setMaterias([]); return; }
    fetchMateriasByArea(areaId).then(setMaterias);
  }, [areaId, continuarId]);

  // Load topics when materia selected
  useEffect(() => {
    if (continuarId) return;
    setTopicId("");
    if (!materiaId) { setTopics([]); return; }
    fetchTopics(materiaId).then(setTopics);
  }, [materiaId, continuarId]);

  // Check prova completa availability when banca + area selected (concurso)
  useEffect(() => {
    if (modo !== "concurso" || !bancaId || !areaId) {
      setProvaCompletaAvailable(false); return;
    }
    setProvaCompletaLoading(true);
    hasBancaDistribuicao(bancaId, areaId)
      .then((available) => setProvaCompletaAvailable(available))
      .finally(() => setProvaCompletaLoading(false));
  }, [bancaId, areaId, modo]);

  // New coin logic: Free users get FREE_DAILY_LIMIT questions/day for free
  // Beyond that, they need coins (1 coin = 1 question)
  // Premium users: unlimited, no coins needed
  const getCusto = () => {
    if (isPremiumUser) return 0;
    if (tipoMode === "prova_completa") return 0; // Free to start, gated at Q12
    return 0; // Free daily limit handles it
  };
  const custo = getCusto();

  const [showUpgradeGate, setShowUpgradeGate] = useState(false);

  const validarFiltros = () => {
    if (modo === "concurso") {
      if (tipoMode === "prova_completa") {
        if (!stateId) { toast({ title: "Selecione o estado", variant: "destructive" }); return false; }
        if (!areaId) { toast({ title: "Selecione a área", variant: "destructive" }); return false; }
        if (!bancaId) { toast({ title: "Selecione a banca para prova completa", variant: "destructive" }); return false; }
      } else {
        if (!areaId) { toast({ title: "Selecione a área", variant: "destructive" }); return false; }
        if (tipoMode === "disciplina" && !materiaId) { toast({ title: "Selecione a matéria", variant: "destructive" }); return false; }
      }
    } else {
      if (!areaEnem) { toast({ title: "Selecione a área do ENEM", variant: "destructive" }); return false; }
    }
    return true;
  };

  const handleGerarClick = async () => {
    if (!validarFiltros()) return;

    // Check daily limit for free users (non prova_completa)
    if (isFreePlan && tipoMode !== "prova_completa") {
      const { data: limitData } = await supabase.rpc("check_daily_limit", { _user_id: user!.id });
      const limit = limitData as any;
      if (limit && !limit.pode_gerar) {
        // Check if user has coins to continue
        const qtd = parseInt(quantidade);
        if ((profile?.saldo_moedas ?? 0) < qtd) {
          setShowInsuficiente(true);
          return;
        }
        // Will use coins
      }
    }

    setShowConfirm(true);
  };

  const handleConfirmarGerar = async () => {
    setShowConfirm(false);
    setLoading(true);
    try {
      // Check daily limit and deduct coins if needed for free users
      if (isFreePlan && tipoMode !== "prova_completa") {
        const { data: limitData } = await supabase.rpc("check_daily_limit", { _user_id: user!.id });
        const limit = limitData as any;
        const qtd = parseInt(quantidade);
        
        if (limit && !limit.pode_gerar) {
          // Beyond daily limit — use coins (1 coin = 1 question)
          const coinCost = qtd;
          if ((profile?.saldo_moedas ?? 0) < coinCost) {
            setShowInsuficiente(true);
            setLoading(false);
            return;
          }
          const { error: moedaErr } = await supabase.rpc("descontar_moedas", { _user_id: user!.id, _valor: coinCost, _descricao: `Simulado extra ${qtd} questões (além do limite diário)` });
          if (moedaErr) throw new Error(moedaErr.message);
        }
      }

      let qtd = parseInt(quantidade);
      let bodyPayload: any = { quantidade: qtd, nivel: nivel || "medio", modo };
      let provaCompletaContext = "";

      // Build metadata context from selected filters
      const meta: SimuladoMeta = {};
      if (modo === "concurso") {
        if (bancaId) meta.banca_nome = bancas.find(b => b.id === bancaId)?.nome;
        if (areaId) meta.area_nome = areas.find(a => a.id === areaId)?.nome;
        if (carreiraId) meta.carreira_nome = carreiras.find(c => c.id === carreiraId)?.nome;
        if (stateId) meta.estado_nome = states.find(s => s.id === stateId)?.nome;
        if (anoConcurso) meta.ano = anoConcurso;
      }
      setSimuladoMeta(meta);

      if (tipoMode === "prova_completa" && modo === "concurso") {
        const config = await getProvaCompletaConfig(bancaId, areaId, carreiraId || undefined);
        if (config.totalQuestoes === 0) {
          toast({ title: "Nenhuma distribuição encontrada", variant: "destructive" }); setLoading(false); return;
        }
        qtd = config.totalQuestoes;
        provaCompletaContext = buildProvaCompletaPromptContext(config.distribuicao);
        bodyPayload = {
          ...bodyPayload,
          quantidade: qtd,
          banca: bancaId || undefined,
          carreira: carreiraId || undefined,
          area: areaId || undefined,
          state: stateId || undefined,
          esfera: esferaId || undefined,
          provaCompleta: true,
          distribuicao: provaCompletaContext,
        };
      } else if (modo === "concurso") {
        bodyPayload = {
          ...bodyPayload,
          materia: materiaId || undefined,
          banca: bancaId || undefined,
          carreira: carreiraId || undefined,
          area: areaId || undefined,
          state: stateId || undefined,
          esfera: esferaId || undefined,
          ano: anoConcurso ? parseInt(anoConcurso) : undefined,
          topic: topicId || undefined,
        };
      } else {
        bodyPayload = { ...bodyPayload, area: ENEM_AREAS.find(a => a.id === areaEnem)?.nome, ano: anoEnem || undefined };
      }

      const { data: aiData, error: aiError } = await supabase.functions.invoke("generate-questions", { body: bodyPayload });
      if (aiError) throw new Error(aiError.message || "Erro ao gerar questões");
      if (aiData?.error) throw new Error(aiData.error);

      const generatedQuestoes: Questao[] = (aiData.questoes || []).map((q: any) => ({
        ...q,
        // Fallback: if AI didn't return materia_nome, use selected matéria name
        materia_nome: q.materia_nome || (materiaId ? materias.find(m => m.id === materiaId)?.nome : undefined),
      }));
      if (generatedQuestoes.length === 0) {
        toast({ title: "IA não retornou questões. Tente novamente.", variant: "destructive" });
        setLoading(false); return;
      }

      // Increment daily usage for free users
      if (isFreePlan && tipoMode !== "prova_completa") {
        await supabase.rpc("incrementar_uso_diario", { _user_id: user!.id, _quantidade: generatedQuestoes.length });
      }

      const simTipo = tipoMode === "prova_completa" ? "prova_completa" : "normal";
      const { data: sim, error: sErr } = await supabase.from("simulados").insert({
        user_id: user!.id, tipo: simTipo, quantidade: generatedQuestoes.length, total_questoes: generatedQuestoes.length,
        carreira_id: carreiraId || null, materia_id: materiaId || null, banca_id: bancaId || null,
        state_id: stateId || null, esfera_id: esferaId || null, area_id: areaId || null, modo,
        topic_id: topicId || null,
      }).select().single();
      if (sErr) throw sErr;

      const questoesInsert = generatedQuestoes.map(q => ({
        enunciado: q.enunciado, alternativas: q.alternativas as any, resposta_correta: q.resposta_correta,
        explicacao: q.explicacao || null, modo, materia_id: materiaId || null,
        area_id: areaId || null,
        topic_id: topicId || null, banca_id: bancaId || null, source: "ai_generated",
      }));
      const { data: savedQuestoes, error: qErr } = await supabase.from("questoes").insert(questoesInsert).select("id");
      if (qErr) console.error("Erro ao salvar questões:", qErr);

      const questoesComId = generatedQuestoes.map((q, i) => ({ ...q, id: savedQuestoes?.[i]?.id || undefined }));
      const respostasInsert = questoesComId.filter(q => q.id).map(q => ({
        simulado_id: sim.id, questao_id: q.id!, resposta_usuario: null, acertou: null, tempo_resposta: 0,
      }));
      if (respostasInsert.length > 0) await supabase.from("respostas").insert(respostasInsert);

      setSimuladoId(sim.id); setQuestoes(questoesComId); setCurrentIdx(0);
      setRespostas({}); setStartTime(Date.now()); setTempoAcumulado(0);
      await refreshProfile();
      toast({ title: `Simulado gerado! ${generatedQuestoes.length} questões.` });
    } catch (err: any) { toast({ title: "Erro ao gerar simulado", description: err.message, variant: "destructive" }); }
    setLoading(false);
  };

  const handleVoltar = () => {
    if (simuladoId && questoes.length > 0 && !resultado) { setShowConfirmSair(true); }
    else { navigate("/dashboard"); }
  };

  const handleSairSalvando = async () => {
    setShowConfirmSair(false);
    if (simuladoId) {
      const tempoTotal = tempoAcumulado + Math.round((Date.now() - startTime) / 1000);
      await supabase.from("simulados").update({ ultima_questao_respondida: Object.keys(respostas).length, tempo_gasto: tempoTotal }).eq("id", simuladoId);
    }
    navigate("/dashboard");
  };

  const handleFinalizar = async () => {
    setFinalizando(true);
    try {
      let acertos = 0;
      const tempoTotal = tempoAcumulado + Math.round((Date.now() - startTime) / 1000);
      for (let i = 0; i < questoes.length; i++) { if (respostas[i] === questoes[i].resposta_correta) acertos++; }
      const nota = Math.round((acertos / questoes.length) * 100);

      // XP: 1 point per correct answer only
      const xpGanho = acertos;
      if (xpGanho > 0) await supabase.rpc("adicionar_xp", { _user_id: user!.id, _xp_ganho: xpGanho });
      await supabase.from("simulados").update({ pontuacao: nota, acertos, tempo_gasto: tempoTotal, status: "finalizado", finished_at: new Date().toISOString(), ultima_questao_respondida: questoes.length }).eq("id", simuladoId!);

      for (let i = 0; i < questoes.length; i++) {
        const q = questoes[i];
        if (q?.id) {
          await supabase.from("respostas").update({ resposta_usuario: respostas[i] || null, acertou: respostas[i] === q.resposta_correta }).eq("simulado_id", simuladoId!).eq("questao_id", q.id);
        }
      }

      await refreshProfile();
      setResultado({ nota, acertos, total: questoes.length, xpGanho, tempoTotal, tempoMedioPorQuestao: Math.round(tempoTotal / questoes.length) });
      toast({ title: `Simulado finalizado! Nota: ${nota}%` });
    } catch (err: any) { toast({ title: "Erro ao finalizar", description: err.message, variant: "destructive" }); }
    setFinalizando(false);
  };

  // ─── Render: Loading state ────────────────────────────────────
  if (resumeLoading) {
    return (
      <div className="flex min-h-screen flex-col bg-background"><AppHeader />
        <main className="container flex flex-1 items-center justify-center">
          <div className="text-center space-y-3">
            <Loader2 className="mx-auto h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Carregando seu simulado...</p>
          </div>
        </main>
      <AppFooter /></div>
    );
  }

  // ─── Render: Resultado ────────────────────────────────────────
  if (resultado) {
    return (
      <div className="flex min-h-screen flex-col bg-background"><AppHeader /><main className="container max-w-3xl flex-1 py-8">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/dashboard")}><ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard</Button>
        <Card><CardHeader className="text-center"><CardTitle className="font-display text-3xl">📊 Relatório do Simulado</CardTitle></CardHeader><CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-3">
          <div className="rounded-lg bg-primary/10 p-4 text-center"><p className="text-sm text-muted-foreground">Nota</p><p className="text-3xl font-bold text-primary">{resultado.nota}%</p></div>
          <div className="rounded-lg bg-accent/10 p-4 text-center"><p className="text-sm text-muted-foreground">Acertos</p><p className="text-3xl font-bold text-accent">{resultado.acertos}/{resultado.total}</p></div>
          <div className="rounded-lg bg-warning/10 p-4 text-center"><p className="text-sm text-muted-foreground">XP Ganho</p><p className="text-3xl font-bold text-warning">+{resultado.xpGanho}</p></div>
        </div>
        <div><h3 className="mb-3 font-display text-lg font-semibold">Correção Detalhada</h3><div className="space-y-3">{questoes.map((q, i) => { const resp = respostas[i]; const correta = resp === q.resposta_correta; return (<Card key={i} className={`border-l-4 ${correta ? "border-l-accent" : "border-l-destructive"}`}><CardContent className="pt-4">
          {(q.materia_nome || simuladoMeta.banca_nome) && <div className="mb-1.5 flex flex-wrap gap-1">{q.materia_nome && <span className="text-[10px] font-medium text-primary bg-primary/10 rounded-full px-2 py-0.5">📚 {q.materia_nome}</span>}{simuladoMeta.banca_nome && <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">🏛️ {simuladoMeta.banca_nome}</span>}{simuladoMeta.carreira_nome && <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded-full px-2 py-0.5">💼 {simuladoMeta.carreira_nome}</span>}</div>}
          <p className="mb-2 text-sm font-medium">{i+1}. {q.enunciado}</p><p className="text-xs"><span className={resp ? (correta ? "text-accent" : "text-destructive") : "text-muted-foreground"}>Sua: {resp || "—"}</span> | <span className="font-medium text-accent">Correta: {q.resposta_correta}</span></p>{q.explicacao && <p className="mt-2 text-xs text-muted-foreground italic">{q.explicacao}</p>}</CardContent></Card>); })}</div></div>
        <div className="flex gap-3 justify-center"><Button onClick={() => navigate("/dashboard")}>Voltar</Button><Button variant="outline" onClick={() => { setResultado(null); setSimuladoId(null); setQuestoes([]); }}>Novo Simulado</Button></div>
      </CardContent></Card></main><AppFooter /></div>
    );
  }

  // ─── Render: Active quiz ──────────────────────────────────────
  if (simuladoId && questoes.length > 0) {
    const q = questoes[currentIdx]; const respondidas = Object.keys(respostas).length; const progresso = Math.round((respondidas / questoes.length) * 100);
    const isProvaCompleta = tipoMode === "prova_completa";
    // Gate at question 12 (index 11) for free users in prova completa
    const isLockedQuestion = isProvaCompleta && isFreePlan && currentIdx >= FREE_PROVA_COMPLETA_LIMIT;

    return (
      <div className="flex min-h-screen flex-col bg-background"><AppHeader /><main className="container max-w-2xl flex-1 py-8">
        <Button variant="ghost" className="mb-4 gap-2" onClick={handleVoltar}><ArrowLeft className="h-4 w-4" /> Voltar</Button>
        <div className="mb-4 space-y-2"><div className="flex items-center justify-between"><span className="text-sm text-muted-foreground">Questão {currentIdx+1} de {questoes.length}</span><span className="text-xs text-muted-foreground">{respondidas}/{questoes.length} respondidas</span></div><Progress value={progresso} className="h-2" /></div>
        
        {isLockedQuestion ? (
          <Card className="border-primary/30">
            <CardContent className="pt-6 text-center space-y-4">
              <div className="text-4xl">🔒</div>
              <h3 className="font-display text-xl font-bold">Para continuar a prova completa, assine o Plano Pro.</h3>
              <p className="text-sm text-muted-foreground">
                Você respondeu <strong>{FREE_PROVA_COMPLETA_LIMIT} questões</strong> da Prova Completa.
                Para desbloquear todas as <strong>{questoes.length} questões</strong>, assine o plano Pro.
              </p>
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
                💡 Com o plano Pro você tem acesso ilimitado a provas completas de todas as bancas!
              </div>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setCurrentIdx(FREE_PROVA_COMPLETA_LIMIT - 1)}>Voltar às questões</Button>
                <Button onClick={() => navigate("/planos")}>Assinar Plano Pro</Button>
              </div>
              <Button variant="ghost" size="sm" className="text-xs text-muted-foreground" onClick={handleFinalizar} disabled={finalizando}>
                {finalizando && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}Finalizar com {Math.min(respondidas, FREE_PROVA_COMPLETA_LIMIT)} questões
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card><CardContent className="pt-6">
            {/* Metadata badges */}
            <div className="mb-3 flex flex-wrap gap-1.5">
              {q.materia_nome && <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">📚 {q.materia_nome}</span>}
              {simuladoMeta.banca_nome && <span className="inline-flex items-center rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-secondary-foreground">🏛️ {simuladoMeta.banca_nome}</span>}
              {simuladoMeta.carreira_nome && <span className="inline-flex items-center rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent-foreground">💼 {simuladoMeta.carreira_nome}</span>}
              {simuladoMeta.area_nome && !q.materia_nome && <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">📂 {simuladoMeta.area_nome}</span>}
              {simuladoMeta.ano && <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">📅 {simuladoMeta.ano}</span>}
            </div>
            <p className="mb-6 text-sm leading-relaxed">{q.enunciado}</p><div className="space-y-2">{q.alternativas.map(o => (<button key={o.letra} className={`w-full rounded-lg border p-3 text-left text-sm transition-colors ${respostas[currentIdx] === o.letra ? "border-primary bg-primary/10 font-medium" : "hover:bg-secondary"}`} onClick={() => handleAnswer(o.letra)}><span className="mr-2 font-semibold">{o.letra})</span>{o.texto}</button>))}</div></CardContent></Card>
        )}

        <div className="mt-4 flex justify-between"><Button variant="outline" disabled={currentIdx === 0} onClick={() => setCurrentIdx(i => i-1)}><ChevronLeft className="mr-1 h-4 w-4" />Anterior</Button><Button disabled={currentIdx === questoes.length-1 || (isProvaCompleta && isFreePlan && currentIdx >= FREE_PROVA_COMPLETA_LIMIT - 1)} onClick={() => setCurrentIdx(i => i+1)}>Próxima<ChevronRight className="ml-1 h-4 w-4" /></Button></div>
        <div className="mt-4 flex flex-wrap gap-1 justify-center">{questoes.map((_, i) => {
          const locked = isProvaCompleta && isFreePlan && i >= FREE_PROVA_COMPLETA_LIMIT;
          return (<button key={i} onClick={() => !locked && setCurrentIdx(i)} className={`h-8 w-8 rounded text-xs font-medium transition-colors ${locked ? "bg-muted text-muted-foreground/50 cursor-not-allowed" : i === currentIdx ? "bg-primary text-primary-foreground" : respostas[i] ? "bg-accent/20 text-accent" : "bg-secondary text-muted-foreground"}`}>{locked ? "🔒" : i+1}</button>);
        })}</div>
        <div ref={finalizarRef} className="mt-6 flex justify-center">
          <Button variant="outline" size="sm" className="text-destructive border-destructive/40 hover:bg-destructive/10 text-sm" onClick={handleFinalizar} disabled={finalizando}>
            {finalizando && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}Finalizar ({respondidas}/{isProvaCompleta && isFreePlan ? FREE_PROVA_COMPLETA_LIMIT : questoes.length})
          </Button>
        </div>
      </main><AppFooter /></div>
    );
  }

  // ─── Render: Configuration form ───────────────────────────────
  return (
    <div className="flex min-h-screen flex-col bg-background"><AppHeader /><main className="container max-w-lg flex-1 py-8">
      <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/dashboard")}><ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard</Button>
      <h1 className="mb-6 font-display text-2xl font-bold">{modo === "enem" ? "🎓 Simulado ENEM" : "🎯 Gerar Simulado"}</h1>
      <p className="mb-4 text-sm text-muted-foreground">Selecione os filtros abaixo para gerar um simulado personalizado.</p>
      <Card><CardContent className="space-y-4 pt-6">

        {/* ─── CONCURSO MODE ─────────────────────────────────── */}
        {modo === "concurso" ? (<>
          {/* Tipo de simulado */}
          <div className="space-y-2">
            <Label className="font-semibold">Tipo de Simulado</Label>
            <RadioGroup value={tipoMode} onValueChange={(v) => setTipoMode(v as SimuladoTipoMode)} className="flex flex-col gap-2">
              <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-secondary/50" onClick={() => setTipoMode("livre")}>
                <RadioGroupItem value="livre" id="tipo-livre" />
                <Label htmlFor="tipo-livre" className="cursor-pointer flex-1">
                  <span className="font-medium">🔘 Simulado Livre</span>
                  <p className="text-xs text-muted-foreground">Questões da área sem filtro de disciplina</p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-secondary/50" onClick={() => setTipoMode("disciplina")}>
                <RadioGroupItem value="disciplina" id="tipo-disciplina" />
                <Label htmlFor="tipo-disciplina" className="cursor-pointer flex-1">
                  <span className="font-medium">🔘 Por Matéria + Assunto</span>
                  <p className="text-xs text-muted-foreground">Foco em uma matéria e assunto específico</p>
                </Label>
              </div>
              <div className="flex items-center space-x-2 rounded-lg border p-3 cursor-pointer hover:bg-secondary/50" onClick={() => setTipoMode("prova_completa")}>
                <RadioGroupItem value="prova_completa" id="tipo-prova" />
                <Label htmlFor="tipo-prova" className="cursor-pointer flex-1">
                  <span className="font-medium">🔘 Prova Completa por Banca</span>
                  <p className="text-xs text-muted-foreground">Distribuição realista baseada em editais</p>
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Prova Completa: filtros simplificados */}
          {tipoMode === "prova_completa" ? (<>
            <div className="space-y-2"><Label>Estado *</Label><Select value={stateId} onValueChange={setStateId}><SelectTrigger><SelectValue placeholder="Selecione o estado" /></SelectTrigger><SelectContent>{states.map(s => <SelectItem key={s.id} value={s.id}>{s.nome} ({(s as any).sigla})</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Esfera</Label><Select value={esferaId} onValueChange={setEsferaId}><SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger><SelectContent>{esferas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Área *</Label><Select value={areaId} onValueChange={setAreaId}><SelectTrigger><SelectValue placeholder="Selecione a área" /></SelectTrigger><SelectContent>{areas.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Carreira (opcional)</Label><Select value={carreiraId} onValueChange={setCarreiraId}><SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger><SelectContent>{carreiras.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Banca *</Label><Select value={bancaId} onValueChange={setBancaId}><SelectTrigger><SelectValue placeholder="Selecione a banca" /></SelectTrigger><SelectContent>{bancas.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent></Select></div>
            
            {bancaId && areaId && (
              <div className={`rounded-lg border p-3 text-sm ${provaCompletaAvailable ? "border-accent bg-accent/5 text-accent" : "border-primary/20 bg-primary/5 text-foreground"}`}>
                {provaCompletaLoading ? (
                  <span className="flex items-center gap-2"><Loader2 className="h-3 w-3 animate-spin" /> Verificando distribuição...</span>
                ) : provaCompletaAvailable ? (
                  "✅ Distribuição oficial disponível para esta banca/área"
                ) : (
                  "📋 Será gerada uma distribuição balanceada automática para esta combinação"
                )}
              </div>
            )}
          </>) : (<>
            {/* Livre / Disciplina: filtros completos */}
            <div className="space-y-2"><Label>Área *</Label><Select value={areaId} onValueChange={setAreaId}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{areas.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent></Select></div>
            
            {tipoMode === "disciplina" && (
              <>
                <div className="space-y-2"><Label>Matéria *</Label><Select value={materiaId} onValueChange={setMateriaId} disabled={!areaId}><SelectTrigger><SelectValue placeholder={areaId ? "Selecione" : "Selecione a área primeiro"} /></SelectTrigger><SelectContent>{materias.map(m => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent></Select></div>
                {topics.length > 0 && (
                  <div className="space-y-2"><Label>Assunto (opcional)</Label><Select value={topicId} onValueChange={setTopicId}><SelectTrigger><SelectValue placeholder="Todos os assuntos" /></SelectTrigger><SelectContent>{topics.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent></Select></div>
                )}
              </>
            )}

            <div className="space-y-2"><Label>Banca</Label><Select value={bancaId} onValueChange={setBancaId}><SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger><SelectContent>{bancas.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Estado</Label><Select value={stateId} onValueChange={setStateId}><SelectTrigger><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent>{states.map(s => <SelectItem key={s.id} value={s.id}>{s.nome} ({(s as any).sigla})</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Carreira</Label><Select value={carreiraId} onValueChange={setCarreiraId}><SelectTrigger><SelectValue placeholder="Todas" /></SelectTrigger><SelectContent>{carreiras.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent></Select></div>
            <div className="space-y-2"><Label>Ano (opcional)</Label><Select value={anoConcurso} onValueChange={setAnoConcurso}><SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger><SelectContent>{[2026,2025,2024,2023,2022,2021,2020].map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent></Select></div>
          </>)}
        </>) : (<>
          {/* ─── ENEM MODE ────────────────────────────────────── */}
          <div className="space-y-2"><Label>Área do ENEM *</Label><Select value={areaEnem} onValueChange={setAreaEnem}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent>{ENEM_AREAS.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-2"><Label>Ano (opcional)</Label><Select value={anoEnem} onValueChange={setAnoEnem}><SelectTrigger><SelectValue placeholder="Qualquer" /></SelectTrigger><SelectContent>{[2026,2025,2024,2023,2022,2021,2020].map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent></Select></div>
        </>)}

        {/* Common fields */}
        <div className="space-y-2"><Label>Dificuldade</Label><Select value={nivel} onValueChange={setNivel}><SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger><SelectContent><SelectItem value="facil">Fácil</SelectItem><SelectItem value="medio">Médio</SelectItem><SelectItem value="dificil">Difícil</SelectItem></SelectContent></Select></div>
        
        {tipoMode !== "prova_completa" && (
          <div className="space-y-2"><Label>Quantidade</Label><Select value={quantidade} onValueChange={setQuantidade}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="5">5 questões</SelectItem><SelectItem value="10">10 questões</SelectItem><SelectItem value="20">20 questões</SelectItem></SelectContent></Select></div>
        )}


        <Button className="w-full" onClick={handleGerarClick} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {tipoMode === "prova_completa" ? "Gerar Prova Completa" : "Gerar Simulado"}
        </Button>
      </CardContent></Card>
    </main>
    <Dialog open={showConfirm} onOpenChange={setShowConfirm}><DialogContent><DialogHeader><DialogTitle>Confirmar Simulado</DialogTitle><DialogDescription>{tipoMode === "prova_completa" ? "Será gerada uma prova completa com distribuição realista." : `Serão geradas ${quantidade} questões.`}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setShowConfirm(false)}>Cancelar</Button><Button onClick={handleConfirmarGerar}>Confirmar</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={showInsuficiente} onOpenChange={setShowInsuficiente}><DialogContent><DialogHeader><DialogTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-warning" />Limite diário atingido</DialogTitle><DialogDescription>Você atingiu o limite de {FREE_DAILY_LIMIT} questões grátis por dia. Use moedas para continuar (1 moeda = 1 questão) ou assine um plano.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setShowInsuficiente(false)}>Fechar</Button><Button variant="outline" onClick={() => { setShowInsuficiente(false); navigate("/comprar-moedas"); }}>Comprar Moedas</Button><Button onClick={() => { setShowInsuficiente(false); navigate("/planos"); }}>Ver Planos</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={showConfirmSair} onOpenChange={setShowConfirmSair}><DialogContent><DialogHeader><DialogTitle>Sair do Simulado?</DialogTitle><DialogDescription>Seu progresso será salvo automaticamente. Você poderá continuar de onde parou no Dashboard.</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" onClick={() => setShowConfirmSair(false)}>Continuar respondendo</Button><Button onClick={handleSairSalvando}>Salvar e sair</Button></DialogFooter></DialogContent></Dialog>
    <AppFooter />
    </div>
  );
}
