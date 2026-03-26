import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { ArrowLeft, BookOpen, Plus, Trash2, Play, Loader2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { usePlanConfig } from "@/hooks/usePlanConfig";
import UpgradePrompt from "@/components/UpgradePrompt";

interface Caderno {
  id: string;
  nome: string;
  descricao: string | null;
  created_at: string;
  itens_count?: number;
}

interface CadernoItem {
  id: string;
  area_id: string | null;
  materia_id: string | null;
  topic_id: string | null;
  subtopic_id: string | null;
  area_nome?: string;
  materia_nome?: string;
  topic_nome?: string;
  subtopic_nome?: string;
}

export default function Cadernos() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { config, isFreePlan } = usePlanConfig();
  const [cadernos, setCadernos] = useState<Caderno[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoDesc, setNovoDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeMsg, setUpgradeMsg] = useState("");

  // Detail view
  const [selectedCaderno, setSelectedCaderno] = useState<Caderno | null>(null);
  const [itens, setItens] = useState<CadernoItem[]>([]);
  const [loadingItens, setLoadingItens] = useState(false);
  const [generatingSimulado, setGeneratingSimulado] = useState(false);

  // Add item form
  const [showAddItem, setShowAddItem] = useState(false);
  const [areas, setAreas] = useState<any[]>([]);
  const [materias, setMaterias] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [selArea, setSelArea] = useState("");
  const [selMaterias, setSelMaterias] = useState<string[]>([]);
  const [selTopics, setSelTopics] = useState<string[]>([]);
  const [addingItem, setAddingItem] = useState(false);

  useEffect(() => {
    if (user) loadCadernos();
  }, [user]);

  const loadCadernos = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("cadernos")
      .select("*, caderno_itens(id)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setCadernos((data || []).map((c: any) => ({
      ...c,
      itens_count: c.caderno_itens?.length || 0,
    })));
    setLoading(false);
  };

  const handleCreate = async () => {
    if (!novoNome.trim()) return;
    // Check caderno limit
    if (cadernos.length >= config.limite_cadernos) {
      setUpgradeMsg(`Você atingiu o limite de ${config.limite_cadernos} caderno(s) do plano gratuito. Assine para criar mais.`);
      setShowUpgrade(true);
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("cadernos").insert({
      user_id: user!.id, nome: novoNome.trim(), descricao: novoDesc.trim() || null,
    });
    if (error) toast({ title: "Erro ao criar caderno", variant: "destructive" });
    else {
      toast({ title: "Caderno criado!" });
      setNovoNome(""); setNovoDesc(""); setShowCreate(false);
      loadCadernos();
    }
    setCreating(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este caderno?")) return;
    await supabase.from("cadernos").delete().eq("id", id);
    toast({ title: "Caderno excluído" });
    if (selectedCaderno?.id === id) setSelectedCaderno(null);
    loadCadernos();
  };

  const openCaderno = async (caderno: Caderno) => {
    setSelectedCaderno(caderno);
    setLoadingItens(true);
    const { data } = await supabase
      .from("caderno_itens")
      .select("*, areas:area_id(nome), materias:materia_id(nome), topics:topic_id(nome), subtopics:subtopic_id(nome)")
      .eq("caderno_id", caderno.id);
    setItens((data || []).map((d: any) => ({
      id: d.id,
      area_id: d.area_id,
      materia_id: d.materia_id,
      topic_id: d.topic_id,
      subtopic_id: d.subtopic_id,
      area_nome: d.areas?.nome,
      materia_nome: d.materias?.nome,
      topic_nome: d.topics?.nome,
      subtopic_nome: d.subtopics?.nome,
    })));
    setLoadingItens(false);
  };

  const removeItem = async (itemId: string) => {
    await supabase.from("caderno_itens").delete().eq("id", itemId);
    setItens(prev => prev.filter(i => i.id !== itemId));
    toast({ title: "Item removido" });
  };

  // Load areas for add item
  useEffect(() => {
    supabase.from("areas").select("*").eq("modo", "concurso").order("nome")
      .then(({ data }) => setAreas(data || []));
  }, []);

  // Load materias when area selected
  useEffect(() => {
    setSelMaterias([]); setSelTopics([]); setMaterias([]); setTopics([]);
    if (!selArea) return;
    supabase.from("area_materias").select("materia_id, materias(id, nome)").eq("area_id", selArea)
      .then(({ data }) => {
        setMaterias((data || []).map((d: any) => d.materias).filter(Boolean).sort((a: any, b: any) => a.nome.localeCompare(b.nome)));
      });
  }, [selArea]);

  // Load topics when single materia is selected
  useEffect(() => {
    setSelTopics([]); setTopics([]);
    if (selMaterias.length !== 1) return;
    supabase.from("topics").select("*").eq("materia_id", selMaterias[0]).order("nome")
      .then(({ data }) => setTopics(data || []));
  }, [selMaterias]);

  const handleAddItems = async () => {
    if (!selectedCaderno) return;

    // Check item limit
    const newItemsCount = selTopics.length > 0 ? selTopics.length : selMaterias.length > 0 ? selMaterias.length : selArea ? 1 : 0;
    if (newItemsCount === 0) {
      toast({ title: "Selecione pelo menos uma matéria ou tópico", variant: "destructive" });
      return;
    }
    if (itens.length + newItemsCount > config.limite_itens_caderno) {
      setUpgradeMsg(`O plano gratuito permite até ${config.limite_itens_caderno} itens por caderno. Assine para adicionar mais.`);
      setShowUpgrade(true);
      return;
    }

    setAddingItem(true);
    const inserts: any[] = [];

    if (selTopics.length > 0) {
      for (const tid of selTopics) {
        inserts.push({ caderno_id: selectedCaderno.id, area_id: selArea || null, materia_id: selMaterias[0] || null, topic_id: tid });
      }
    } else if (selMaterias.length > 0) {
      for (const mid of selMaterias) {
        inserts.push({ caderno_id: selectedCaderno.id, area_id: selArea || null, materia_id: mid });
      }
    } else if (selArea) {
      inserts.push({ caderno_id: selectedCaderno.id, area_id: selArea });
    }

    const { error } = await supabase.from("caderno_itens").insert(inserts);
    if (error) toast({ title: "Erro ao adicionar itens", variant: "destructive" });
    else {
      toast({ title: `${inserts.length} item(ns) adicionado(s)!` });
      setShowAddItem(false); setSelArea(""); setSelMaterias([]); setSelTopics([]);
      openCaderno(selectedCaderno);
      loadCadernos();
    }
    setAddingItem(false);
  };

  const handleGerarSimulado = async () => {
    if (!selectedCaderno || itens.length === 0) {
      toast({ title: "Adicione conteúdos ao caderno primeiro", variant: "destructive" });
      return;
    }

    setGeneratingSimulado(true);
    try {
      // Build filter context from caderno items
      const materiaIds = [...new Set(itens.filter(i => i.materia_id).map(i => i.materia_id!))];
      const topicIds = [...new Set(itens.filter(i => i.topic_id).map(i => i.topic_id!))];
      const areaIds = [...new Set(itens.filter(i => i.area_id).map(i => i.area_id!))];

      // Build context description for AI
      const contextParts: string[] = [];
      for (const item of itens) {
        const parts = [];
        if (item.materia_nome) parts.push(item.materia_nome);
        if (item.topic_nome) parts.push(item.topic_nome);
        if (item.subtopic_nome) parts.push(item.subtopic_nome);
        if (parts.length > 0) contextParts.push(parts.join(" > "));
      }
      const cadernoContext = contextParts.length > 0
        ? `Gere questões focadas nos seguintes conteúdos do caderno personalizado:\n${contextParts.join("\n")}`
        : "";

      // Determine quantity: distribute across items
      const qtd = Math.max(10, Math.min(itens.length * 5, 50));

      // Check daily limit
      const { data: limitData } = await supabase.rpc("check_daily_limit", { _user_id: user!.id });
      const limit = limitData as any;
      if (limit && !limit.pode_gerar) {
        setUpgradeMsg("Você chegou ao limite diário 🔥 Alunos aprovados treinam todos os dias sem limite. Desbloqueie agora.");
        setShowUpgrade(true);
        setGeneratingSimulado(false);
        return;
      }

      const bodyPayload: any = {
        quantidade: qtd,
        nivel: "misto",
        modo: "concurso",
        tipo_resposta: "multipla_escolha",
        area: areaIds[0] || undefined,
        caderno_context: cadernoContext,
      };

      // If caderno has specific materias/topics, pass them
      if (materiaIds.length === 1) bodyPayload.materia = materiaIds[0];
      if (topicIds.length === 1) bodyPayload.topic = topicIds[0];

      const { data: aiData, error: aiError } = await supabase.functions.invoke("generate-questions", {
        body: bodyPayload,
      });

      if (aiError) throw new Error(typeof aiError === "string" ? aiError : aiError.message || "Erro ao gerar questões");
      if (aiData?.error) throw new Error(aiData.error);

      const generatedQuestoes = aiData?.questoes || [];
      if (generatedQuestoes.length === 0) {
        toast({ title: "IA não retornou questões", description: "Tente novamente.", variant: "destructive" });
        setGeneratingSimulado(false);
        return;
      }

      // Increment daily usage
      await supabase.rpc("incrementar_uso_diario", { _user_id: user!.id, _quantidade: generatedQuestoes.length });

      // Create simulado
      const { data: sim, error: sErr } = await supabase.from("simulados").insert({
        user_id: user!.id,
        tipo: "normal",
        quantidade: generatedQuestoes.length,
        total_questoes: generatedQuestoes.length,
        area_id: areaIds[0] || null,
        materia_id: materiaIds.length === 1 ? materiaIds[0] : null,
        modo: "concurso",
      }).select().single();
      if (sErr) throw sErr;

      // Save questões
      const questoesInsert = generatedQuestoes.map((q: any) => ({
        enunciado: q.enunciado,
        alternativas: q.alternativas,
        resposta_correta: q.resposta_correta,
        explicacao: q.explicacao || null,
        modo: "concurso",
        area_id: areaIds[0] || null,
        materia_id: materiaIds.length === 1 ? materiaIds[0] : null,
        source: "ai_generated",
      }));
      const { data: savedQuestoes } = await supabase.from("questoes").insert(questoesInsert).select("id");

      // Create respostas
      const respostasInsert = (savedQuestoes || []).map((q: any) => ({
        simulado_id: sim.id,
        questao_id: q.id,
        resposta_usuario: null,
        acertou: null,
        tempo_resposta: 0,
      }));
      if (respostasInsert.length > 0) await supabase.from("respostas").insert(respostasInsert);

      toast({ title: `Simulado gerado! ${generatedQuestoes.length} questões do caderno.` });
      navigate(`/simulado?modo=concurso&continuar=${sim.id}`);
    } catch (err: any) {
      toast({ title: "Erro ao gerar simulado", description: err.message, variant: "destructive" });
    }
    setGeneratingSimulado(false);
  };

  // Detail view
  if (selectedCaderno) {
    return (
      <div className="flex min-h-screen flex-col bg-background">
        <AppHeader />
        <main className="container max-w-2xl flex-1 py-8">
          <Button variant="ghost" className="mb-4 gap-2" onClick={() => setSelectedCaderno(null)}>
            <ArrowLeft className="h-4 w-4" /> Voltar aos cadernos
          </Button>

          <div className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold">{selectedCaderno.nome}</h1>
              {selectedCaderno.descricao && <p className="text-sm text-muted-foreground">{selectedCaderno.descricao}</p>}
            </div>
            <Button onClick={handleGerarSimulado} className="gap-2" disabled={itens.length === 0 || generatingSimulado}>
              {generatingSimulado ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
              {generatingSimulado ? "Gerando..." : "Gerar Simulado"}
            </Button>
          </div>

          <Card className="mb-4">
            <CardHeader className="flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Conteúdos ({itens.length}/{config.limite_itens_caderno})</CardTitle>
              <Button size="sm" variant="outline" onClick={() => {
                if (itens.length >= config.limite_itens_caderno) {
                  setUpgradeMsg(`O plano gratuito permite até ${config.limite_itens_caderno} itens por caderno.`);
                  setShowUpgrade(true);
                  return;
                }
                setShowAddItem(true);
              }} className="gap-1">
                <Plus className="h-3 w-3" /> Adicionar
              </Button>
            </CardHeader>
            <CardContent>
              {loadingItens ? (
                <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
              ) : itens.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">Nenhum conteúdo adicionado. Clique em "Adicionar" para começar.</p>
              ) : (
                <div className="space-y-2">
                  {itens.map(item => (
                    <div key={item.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div className="flex flex-wrap gap-1.5">
                        {item.area_nome && <Badge variant="outline">📂 {item.area_nome}</Badge>}
                        {item.materia_nome && <Badge variant="secondary">📚 {item.materia_nome}</Badge>}
                        {item.topic_nome && <Badge className="bg-primary/10 text-primary">📖 {item.topic_nome}</Badge>}
                        {item.subtopic_nome && <Badge className="bg-accent/10 text-accent-foreground">📝 {item.subtopic_nome}</Badge>}
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeItem(item.id)}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        {/* Add Item Dialog */}
        <Dialog open={showAddItem} onOpenChange={setShowAddItem}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Conteúdo</DialogTitle>
              <DialogDescription>Selecione matérias e tópicos para o caderno.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Área</Label>
                <Select value={selArea} onValueChange={setSelArea}>
                  <SelectTrigger><SelectValue placeholder="Selecione a área" /></SelectTrigger>
                  <SelectContent>{areas.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              {materias.length > 0 && (
                <div className="space-y-2">
                  <Label>Matérias (selecione uma ou mais)</Label>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-md border p-2">
                    {materias.map((m: any) => (
                      <label key={m.id} className="flex items-center gap-2 cursor-pointer rounded p-1.5 hover:bg-secondary/50">
                        <Checkbox
                          checked={selMaterias.includes(m.id)}
                          onCheckedChange={(checked) => {
                            setSelMaterias(prev =>
                              checked ? [...prev, m.id] : prev.filter(id => id !== m.id)
                            );
                          }}
                        />
                        <span className="text-sm">{m.nome}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {topics.length > 0 && selMaterias.length === 1 && (
                <div className="space-y-2">
                  <Label>Tópicos específicos (opcional)</Label>
                  <div className="max-h-48 overflow-y-auto space-y-1.5 rounded-md border p-2">
                    {topics.map((t: any) => (
                      <label key={t.id} className="flex items-center gap-2 cursor-pointer rounded p-1.5 hover:bg-secondary/50">
                        <Checkbox
                          checked={selTopics.includes(t.id)}
                          onCheckedChange={(checked) => {
                            setSelTopics(prev =>
                              checked ? [...prev, t.id] : prev.filter(id => id !== t.id)
                            );
                          }}
                        />
                        <span className="text-sm">{t.nome}</span>
                      </label>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Deixe vazio para incluir todos os tópicos da matéria.</p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowAddItem(false)}>Cancelar</Button>
              <Button onClick={handleAddItems} disabled={addingItem || (!selArea && selMaterias.length === 0)}>
                {addingItem && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Adicionar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <UpgradePrompt open={showUpgrade} onOpenChange={setShowUpgrade} description={upgradeMsg} />
        <AppFooter />
      </div>
    );
  }

  // List view
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader />
      <main className="container max-w-2xl flex-1 py-8">
        <Button variant="ghost" className="mb-4 gap-2" onClick={() => navigate("/dashboard")}>
          <ArrowLeft className="h-4 w-4" /> Voltar ao Dashboard
        </Button>

        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold">📓 Meus Cadernos</h1>
          <Button onClick={() => {
            if (cadernos.length >= config.limite_cadernos) {
              setUpgradeMsg(`Você atingiu o limite de ${config.limite_cadernos} caderno(s). Assine para criar mais.`);
              setShowUpgrade(true);
              return;
            }
            setShowCreate(true);
          }} className="gap-2">
            <Plus className="h-4 w-4" /> Novo Caderno
          </Button>
        </div>

        {isFreePlan && (
          <div className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-muted-foreground">
            📝 Plano gratuito: {config.limite_cadernos} caderno(s) com até {config.limite_itens_caderno} itens cada.
            <Button variant="link" size="sm" className="ml-1 h-auto p-0 text-primary" onClick={() => navigate("/planos")}>
              Upgrade para mais
            </Button>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : cadernos.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="mx-auto mb-4 h-12 w-12 text-muted-foreground/30" />
              <h3 className="font-display text-lg font-semibold mb-2">Nenhum caderno criado</h3>
              <p className="text-sm text-muted-foreground mb-4">Crie cadernos personalizados para organizar seus estudos e gerar simulados focados.</p>
              <Button onClick={() => setShowCreate(true)} className="gap-2"><Plus className="h-4 w-4" /> Criar Primeiro Caderno</Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {cadernos.map(c => (
              <Card key={c.id} className="cursor-pointer hover:border-primary/30 transition-colors" onClick={() => openCaderno(c)}>
                <CardContent className="flex items-center justify-between py-4">
                  <div>
                    <h3 className="font-semibold">{c.nome}</h3>
                    {c.descricao && <p className="text-xs text-muted-foreground">{c.descricao}</p>}
                    <p className="text-xs text-muted-foreground mt-1">{c.itens_count} conteúdo(s)</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive"
                      onClick={(e) => { e.stopPropagation(); handleDelete(c.id); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Caderno</DialogTitle>
            <DialogDescription>Crie um caderno para organizar suas matérias e gerar simulados personalizados.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome do Caderno *</Label>
              <Input placeholder="Ex: Polícia Federal, Concurso INSS..." value={novoNome} onChange={e => setNovoNome(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Descrição (opcional)</Label>
              <Textarea placeholder="Observações sobre este caderno..." value={novoDesc} onChange={e => setNovoDesc(e.target.value)} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={creating || !novoNome.trim()}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Caderno
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UpgradePrompt open={showUpgrade} onOpenChange={setShowUpgrade} description={upgradeMsg} />
      <AppFooter />
    </div>
  );
}
