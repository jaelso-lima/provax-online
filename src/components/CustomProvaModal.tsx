/**
 * CustomProvaModal — Funcionalidade isolada de "Montar Prova Personalizada".
 *
 * Permite ao usuário definir a quantidade de questões por matéria e gera um
 * simulado reutilizando o mesmo fluxo (questoes/simulados/respostas) já existente.
 *
 * NÃO altera o sistema atual: roda em paralelo, usa a mesma edge function
 * `generate-questions` (modo prova_completa com distribuição customizada).
 */
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Trash2, Sparkles, FileText } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  fetchAreas, fetchBancas, fetchMateriasByArea,
  type FilterOption,
} from "@/services/simuladoRepository";

const MAX_TOTAL = 100;

interface MateriaSlot {
  materia_id: string;
  materia_nome: string;
  quantidade: number;
  // Tópicos do edital vinculados a esta matéria (quando origem = edital)
  topicos?: string[];
}

// Estrutura mínima de uma matéria dentro do resultado de análise de edital
interface EditalMateria {
  nome: string;
  conteudos_principais?: string[];
  topicos?: Array<{ nome: string; subtopicos?: Array<{ nome: string }> }>;
}

interface EditalOption {
  id: string;
  label: string;
  cargo: string | null;
  materias: EditalMateria[];
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  modo?: string; // 'concurso' (default) | 'enem'
}

export default function CustomProvaModal({ open, onOpenChange, modo = "concurso" }: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [areas, setAreas] = useState<FilterOption[]>([]);
  const [bancas, setBancas] = useState<FilterOption[]>([]);
  const [materiasDisp, setMateriasDisp] = useState<FilterOption[]>([]);

  const [areaId, setAreaId] = useState("");
  const [bancaId, setBancaId] = useState("");
  const [nivel, setNivel] = useState("misto");
  const [tipoResposta, setTipoResposta] = useState("multipla_escolha");

  // Editais do usuário (análises concluídas)
  const [editais, setEditais] = useState<EditalOption[]>([]);
  const [editalId, setEditalId] = useState(""); // "" = sem edital (comportamento padrão)
  const editalSelecionado = useMemo(() => editais.find((e) => e.id === editalId) || null, [editais, editalId]);

  const [slots, setSlots] = useState<MateriaSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResumo, setShowResumo] = useState(false);

  // Carrega referências quando o modal abre
  useEffect(() => {
    if (!open) return;
    Promise.all([fetchAreas(modo), fetchBancas()]).then(([a, b]) => {
      setAreas(a);
      setBancas(b);
    });
    // Carrega editais analisados do usuário
    if (user) {
      supabase
        .from("edital_analyses")
        .select("id, file_name, cargo_selecionado, resultado")
        .eq("user_id", user.id)
        .eq("status", "concluido")
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data }) => {
          if (!data) return;
          const opts: EditalOption[] = data
            .map((row: any) => {
              const materias = (row.resultado?.materias || []) as EditalMateria[];
              if (!Array.isArray(materias) || materias.length === 0) return null;
              const label = row.cargo_selecionado || row.file_name || "Edital";
              return { id: row.id, label, cargo: row.cargo_selecionado, materias };
            })
            .filter(Boolean) as EditalOption[];
          setEditais(opts);
        });
    }
  }, [open, modo, user]);

  // Cascade: ao escolher área, carrega matérias daquela área
  useEffect(() => {
    if (!areaId) {
      setMateriasDisp([]);
      return;
    }
    fetchMateriasByArea(areaId).then(setMateriasDisp);
  }, [areaId]);

  // Reset ao fechar
  useEffect(() => {
    if (!open) {
      setSlots([]);
      setAreaId("");
      setBancaId("");
      setEditalId("");
      setShowResumo(false);
    }
  }, [open]);

  // Quando o usuário seleciona um edital, pré-popular slots com as matérias do edital
  useEffect(() => {
    if (!editalSelecionado) return;
    const novosSlots: MateriaSlot[] = editalSelecionado.materias.map((m, idx) => {
      // Extrai a lista de tópicos: prioriza `topicos[].nome`, cai para `conteudos_principais`
      const topicosFromTree = Array.isArray(m.topicos)
        ? m.topicos.map((t) => t.nome).filter(Boolean)
        : [];
      const topicos =
        topicosFromTree.length > 0 ? topicosFromTree : Array.isArray(m.conteudos_principais) ? m.conteudos_principais : [];
      return {
        materia_id: `edital-${idx}-${m.nome.slice(0, 20)}`,
        materia_nome: m.nome,
        quantidade: 5,
        topicos,
      };
    });
    setSlots(novosSlots);
    // Limpa área manual já que o edital define o escopo
    setAreaId("");
  }, [editalSelecionado]);

  const total = useMemo(() => slots.reduce((s, x) => s + (Number.isFinite(x.quantidade) ? x.quantidade : 0), 0), [slots]);

  const addSlot = (materia_id: string) => {
    const m = materiasDisp.find((x) => x.id === materia_id);
    if (!m) return;
    if (slots.some((s) => s.materia_id === materia_id)) {
      toast({ title: "Matéria já adicionada", variant: "destructive" });
      return;
    }
    setSlots((prev) => [...prev, { materia_id: m.id, materia_nome: m.nome, quantidade: 5 }]);
  };

  const updateQty = (materia_id: string, qty: number) => {
    setSlots((prev) => prev.map((s) => (s.materia_id === materia_id ? { ...s, quantidade: Math.max(0, Math.min(MAX_TOTAL, qty || 0)) } : s)));
  };

  const removeSlot = (materia_id: string) => {
    setSlots((prev) => prev.filter((s) => s.materia_id !== materia_id));
  };

  const handlePreview = () => {
    if (slots.length === 0) {
      toast({ title: "Adicione ao menos uma matéria", variant: "destructive" });
      return;
    }
    if (total === 0) {
      toast({ title: "Defina a quantidade de questões", variant: "destructive" });
      return;
    }
    if (total > MAX_TOTAL) {
      toast({ title: `Máximo ${MAX_TOTAL} questões por prova`, variant: "destructive" });
      return;
    }
    setShowResumo(true);
  };

  const handleGerar = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const distribuicaoOnly = slots.filter((s) => s.quantidade > 0);
      const usandoEdital = !!editalSelecionado;

      // Monta a distribuição. Se houver edital, anexa os tópicos permitidos por matéria
      // para forçar a IA a gerar APENAS sobre o conteúdo previsto no edital.
      const distribuicaoText = distribuicaoOnly
        .map((d) => {
          const base = `${d.quantidade} questões de ${d.materia_nome}`;
          if (usandoEdital && d.topicos && d.topicos.length > 0) {
            const topicosTxt = d.topicos.slice(0, 25).map((t) => `- ${t}`).join("\n");
            return `${base}\n  Tópicos OBRIGATÓRIOS (use APENAS estes assuntos, NÃO gere nada fora desta lista):\n${topicosTxt}`;
          }
          return base;
        })
        .join("\n\n");

      const editalHeader = usandoEdital
        ? `IMPORTANTE: A prova é baseada no edital "${editalSelecionado!.label}". Restrinja TODAS as questões aos tópicos listados em cada matéria. Se faltarem questões para um tópico específico, complete com OUTROS tópicos da MESMA matéria do edital — NUNCA gere conteúdo fora do edital.\n\n`
        : "";
      const distribuicaoPrompt = `${editalHeader}Distribuição da prova personalizada (SIGA EXATAMENTE — gere as questões agrupadas por matéria nesta sequência):\n${distribuicaoText}`;

      const bodyPayload: Record<string, unknown> = {
        quantidade: total,
        nivel: nivel || "medio",
        modo,
        tipo_resposta: tipoResposta,
        area: areaId || undefined,
        banca: bancaId || undefined,
        provaCompleta: true,
        distribuicao: distribuicaoPrompt,
        distribuicao_json: distribuicaoOnly.map((d) => ({
          quantidade: d.quantidade,
          materia_nome: d.materia_nome,
          topicos: usandoEdital ? d.topicos || [] : [],
        })),
      };

      const { data: aiData, error: aiError } = await supabase.functions.invoke("generate-questions", {
        body: bodyPayload,
      });
      if (aiError) throw new Error(aiError.message || "Erro ao gerar questões");
      if (!aiData || !aiData.questoes || aiData.questoes.length === 0) {
        throw new Error("IA não retornou questões. Tente reduzir a quantidade.");
      }

      const generated = aiData.questoes as Array<{
        enunciado: string;
        alternativas: { letra: string; texto: string }[];
        resposta_correta: string;
        explicacao?: string;
        materia_nome?: string;
      }>;

      // Increment uso diário
      await supabase.rpc("incrementar_uso_diario", {
        _user_id: user.id,
        _quantidade: generated.length,
      });

      // Cria simulado (tipo: prova_completa para reusar comportamento)
      const { data: sim, error: sErr } = await supabase
        .from("simulados")
        .insert({
          user_id: user.id,
          tipo: "prova_completa",
          quantidade: generated.length,
          total_questoes: generated.length,
          area_id: areaId || null,
          banca_id: bancaId || null,
          modo,
        })
        .select()
        .single();
      if (sErr) throw sErr;

      // Insere questões
      const questoesInsert = generated.map((q, idx) => ({
        enunciado: q.enunciado,
        alternativas: q.alternativas as unknown,
        resposta_correta: q.resposta_correta,
        explicacao: q.explicacao || null,
        modo,
        area_id: areaId || null,
        banca_id: bancaId || null,
        materia_nome: q.materia_nome || null,
        source: "ai_generated",
      }));
      const { data: savedQuestoes, error: qErr } = await supabase
        .from("questoes")
        .insert(questoesInsert as never)
        .select("id");
      if (qErr) console.error("Erro ao salvar questões:", qErr);

      const respostasInsert = (savedQuestoes || []).map((sq) => ({
        simulado_id: sim.id,
        questao_id: sq.id,
        resposta_usuario: null,
        acertou: null,
        tempo_resposta: 0,
      }));
      if (respostasInsert.length > 0) {
        await supabase.from("respostas").insert(respostasInsert);
      }

      toast({ title: `Prova personalizada gerada! ${generated.length} questões.` });
      onOpenChange(false);
      // Abre o simulado pelo fluxo de "continuar" — reusa toda a UI/correção existente
      navigate(`/simulado?modo=${modo}&continuar=${sim.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar prova personalizada";
      toast({ title: "Erro ao gerar prova", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Montar Prova Personalizada
          </DialogTitle>
          <DialogDescription>
            Defina a quantidade de questões por matéria. Total máximo: {MAX_TOTAL} questões.
          </DialogDescription>
        </DialogHeader>

        {!showResumo ? (
          <div className="space-y-4">
            {/* Seleção de Edital (opcional — ativa modo "edital" e bloqueia área manual) */}
            {editais.length > 0 && (
              <div className="space-y-1.5 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <Label className="flex items-center gap-1.5 text-xs">
                  <FileText className="h-3.5 w-3.5 text-primary" />
                  Edital (opcional)
                </Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={editalId}
                  onChange={(e) => {
                    setEditalId(e.target.value);
                    if (!e.target.value) setSlots([]);
                  }}
                >
                  <option value="">Sem edital — escolher manualmente</option>
                  {editais.map((ed) => (
                    <option key={ed.id} value={ed.id}>{ed.label}</option>
                  ))}
                </select>
                {editalSelecionado && (
                  <p className="text-xs text-muted-foreground">
                    📚 Sua prova será baseada exclusivamente nos conteúdos previstos no edital{" "}
                    <span className="font-semibold text-foreground">{editalSelecionado.label}</span>.
                  </p>
                )}
              </div>
            )}

            {/* Filtros base */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className={`space-y-1.5 ${editalSelecionado ? "opacity-50" : ""}`}>
                <Label className="text-xs">Área {editalSelecionado ? "(definida pelo edital)" : "*"}</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={areaId}
                  onChange={(e) => {
                    setAreaId(e.target.value);
                    setSlots([]);
                  }}
                  disabled={!!editalSelecionado}
                >
                  <option value="">Selecione</option>
                  {areas.map((a) => (
                    <option key={a.id} value={a.id}>{a.nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Banca (opcional)</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={bancaId}
                  onChange={(e) => setBancaId(e.target.value)}
                >
                  <option value="">Qualquer</option>
                  {bancas.map((b) => (
                    <option key={b.id} value={b.id}>{b.nome}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Dificuldade</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={nivel}
                  onChange={(e) => setNivel(e.target.value)}
                >
                  <option value="misto">🎲 Misto</option>
                  <option value="facil">Fácil</option>
                  <option value="medio">Médio</option>
                  <option value="dificil">Difícil</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Tipo de Questão</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={tipoResposta}
                  onChange={(e) => setTipoResposta(e.target.value)}
                >
                  <option value="multipla_escolha">📝 Múltipla Escolha</option>
                  <option value="certo_errado">✅❌ Certo ou Errado</option>
                  <option value="ambos">🔀 Ambos</option>
                </select>
              </div>
            </div>

            {/* Adicionar matérias (apenas no modo manual — sem edital) */}
            {areaId && !editalSelecionado && (
              <div className="space-y-2 rounded-lg border border-dashed p-3">
                <Label className="text-xs">Adicionar matéria</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) addSlot(e.target.value);
                    e.target.value = "";
                  }}
                >
                  <option value="">Selecione uma matéria…</option>
                  {materiasDisp
                    .filter((m) => !slots.some((s) => s.materia_id === m.id))
                    .map((m) => (
                      <option key={m.id} value={m.id}>{m.nome}</option>
                    ))}
                </select>
              </div>
            )}

            {/* Lista de matérias adicionadas */}
            {slots.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  {editalSelecionado ? "Matérias do edital" : "Matérias selecionadas"}
                </Label>
                {slots.map((s) => (
                  <div key={s.materia_id} className="rounded-lg border bg-muted/20 p-2">
                    <div className="flex items-center gap-2">
                      <span className="flex-1 text-sm font-medium">{s.materia_nome}</span>
                      <Input
                        type="number"
                        min={0}
                        max={MAX_TOTAL}
                        value={s.quantidade}
                        onChange={(e) => updateQty(s.materia_id, parseInt(e.target.value, 10))}
                        className="w-20 text-center"
                      />
                      {!editalSelecionado && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:bg-destructive/10"
                          onClick={() => removeSlot(s.materia_id)}
                          aria-label="Remover matéria"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    {editalSelecionado && s.topicos && s.topicos.length > 0 && (
                      <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                        ✔ {s.topicos.slice(0, 3).join(" · ")}
                        {s.topicos.length > 3 ? ` (+${s.topicos.length - 3} tópicos)` : ""}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Total ao vivo */}
            <div className={`rounded-lg border p-3 text-sm font-medium ${total > MAX_TOTAL ? "border-destructive bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/5 text-foreground"}`}>
              Total de questões: <span className="font-bold">{total}</span>
              {total > MAX_TOTAL && <span className="ml-2 text-xs">(limite: {MAX_TOTAL})</span>}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button
                onClick={handlePreview}
                disabled={(!editalSelecionado && !areaId) || slots.length === 0 || total === 0 || total > MAX_TOTAL}
              >
                Revisar e Gerar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Resumo
          <div className="space-y-4">
            {editalSelecionado && (
              <div className="rounded-lg border border-primary/40 bg-primary/10 p-3 text-sm">
                <p className="font-semibold">
                  📚 Seu simulado será baseado no edital{" "}
                  <span className="text-primary">{editalSelecionado.label}</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  As questões serão restritas exclusivamente aos tópicos previstos no edital.
                </p>
              </div>
            )}
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-semibold">📋 Você está criando um simulado com:</p>
              <ul className="space-y-1 pl-2">
                {slots.filter((s) => s.quantidade > 0).map((s) => (
                  <li key={s.materia_id} className="text-sm">
                    • <span className="font-medium">{s.quantidade}</span> questões de{" "}
                    <span className="font-medium">{s.materia_nome}</span>
                    {editalSelecionado && s.topicos && s.topicos.length > 0 && (
                      <span className="ml-1 text-xs text-muted-foreground">
                        — ✔ {s.topicos.slice(0, 2).join(", ")}
                        {s.topicos.length > 2 ? `, +${s.topicos.length - 2}` : ""}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <div className="mt-2 border-t pt-2 text-sm font-bold">
                Total: {total} questões
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Gerando sua prova personalizada com IA…</p>
                <p className="text-xs text-muted-foreground">Isso pode levar alguns segundos.</p>
              </div>
            ) : (
              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={() => setShowResumo(false)} disabled={loading}>
                  Voltar
                </Button>
                <Button onClick={handleGerar} disabled={loading} className="gap-2">
                  <Plus className="h-4 w-4" /> Gerar Prova
                </Button>
              </DialogFooter>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
