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
import { Loader2, Plus, Trash2, Sparkles } from "lucide-react";
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
  }, [open, modo]);

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
      setShowResumo(false);
    }
  }, [open]);

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
      const distribuicaoText = distribuicaoOnly
        .map((d) => `${d.quantidade} questões de ${d.materia_nome}`)
        .join("\n");
      const distribuicaoPrompt = `Distribuição da prova personalizada (SIGA EXATAMENTE — gere as questões agrupadas por matéria nesta sequência):\n${distribuicaoText}`;

      const bodyPayload: Record<string, unknown> = {
        quantidade: total,
        nivel: nivel || "medio",
        modo,
        tipo_resposta: tipoResposta,
        area: areaId || undefined,
        banca: bancaId || undefined,
        provaCompleta: true,
        distribuicao: distribuicaoPrompt,
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
      const questoesInsert = generated.map((q) => ({
        enunciado: q.enunciado,
        alternativas: q.alternativas as unknown,
        resposta_correta: q.resposta_correta,
        explicacao: q.explicacao || null,
        modo,
        area_id: areaId || null,
        banca_id: bancaId || null,
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
            {/* Filtros base */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs">Área *</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={areaId}
                  onChange={(e) => {
                    setAreaId(e.target.value);
                    setSlots([]);
                  }}
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

            {/* Adicionar matérias */}
            {areaId && (
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
                <Label className="text-xs font-semibold">Matérias selecionadas</Label>
                {slots.map((s) => (
                  <div key={s.materia_id} className="flex items-center gap-2 rounded-lg border bg-muted/20 p-2">
                    <span className="flex-1 text-sm font-medium">{s.materia_nome}</span>
                    <Input
                      type="number"
                      min={0}
                      max={MAX_TOTAL}
                      value={s.quantidade}
                      onChange={(e) => updateQty(s.materia_id, parseInt(e.target.value, 10))}
                      className="w-20 text-center"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => removeSlot(s.materia_id)}
                      aria-label="Remover matéria"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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
              <Button onClick={handlePreview} disabled={!areaId || slots.length === 0 || total === 0 || total > MAX_TOTAL}>
                Revisar e Gerar
              </Button>
            </DialogFooter>
          </div>
        ) : (
          // Resumo
          <div className="space-y-4">
            <div className="rounded-lg border bg-muted/30 p-4 space-y-2">
              <p className="text-sm font-semibold">📋 Você está criando um simulado com:</p>
              <ul className="space-y-1 pl-2">
                {slots.filter((s) => s.quantidade > 0).map((s) => (
                  <li key={s.materia_id} className="text-sm">
                    • <span className="font-medium">{s.quantidade}</span> questões de <span className="font-medium">{s.materia_nome}</span>
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
