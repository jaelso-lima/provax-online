/**
 * SimuladoBlocoModal — Gera um simulado a partir de um bloco do cronograma
 * ou de uma matéria do edital, sempre na banca do edital quando disponível.
 *
 * Não altera o fluxo existente: reutiliza a edge function `generate-questions`
 * em modo `prova_completa` com distribuição customizada (mesma estratégia do
 * CustomProvaModal) e cria simulado/questoes/respostas no banco.
 */
import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Sparkles, Play } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { fetchBancas } from "@/services/simuladoRepository";

export interface BlocoItem {
  materia: string;
  topico?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  titulo: string;
  itens: BlocoItem[];
  bancaNome?: string | null;
  editalLabel?: string | null;
  cargo?: string | null;
}

const MAX_POR_ITEM = 20;
const MAX_TOTAL = 100;

export default function SimuladoBlocoModal({
  open, onOpenChange, titulo, itens, bancaNome, editalLabel, cargo,
}: Props) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [bancaId, setBancaId] = useState<string | null>(null);

  const onlyOne = itens.length <= 1;
  const [modo, setModo] = useState<"completo" | "conteudo">(onlyOne ? "conteudo" : "completo");
  const [qtdPorItem, setQtdPorItem] = useState<number[]>([]);
  const [itemIdx, setItemIdx] = useState<number>(0);
  const [qtdUnica, setQtdUnica] = useState<number>(5);

  // Reset state when opening
  useEffect(() => {
    if (!open) return;
    setModo(onlyOne ? "conteudo" : "completo");
    setQtdPorItem(itens.map(() => 5));
    setItemIdx(0);
    setQtdUnica(5);
  }, [open, itens, onlyOne]);

  // Resolve banca_id pelo nome (best-effort)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!bancaNome) { setBancaId(null); return; }
      try {
        const bancas = await fetchBancas();
        if (cancelled) return;
        const target = bancaNome.trim().toLowerCase();
        const hit = bancas.find(b => (b.nome || "").trim().toLowerCase() === target)
          || bancas.find(b => (b.nome || "").trim().toLowerCase().includes(target))
          || bancas.find(b => target.includes((b.nome || "").trim().toLowerCase()));
        setBancaId(hit?.id || null);
      } catch {
        setBancaId(null);
      }
    })();
    return () => { cancelled = true; };
  }, [bancaNome]);

  const distribuicao = useMemo(() => {
    if (modo === "completo") {
      return itens.map((it, i) => ({
        materia_nome: it.materia,
        topicos: it.topico ? [it.topico] : [],
        quantidade: Math.max(0, Math.min(MAX_POR_ITEM, qtdPorItem[i] ?? 0)),
      })).filter(d => d.quantidade > 0);
    }
    const it = itens[itemIdx];
    if (!it) return [];
    return [{
      materia_nome: it.materia,
      topicos: it.topico ? [it.topico] : [],
      quantidade: Math.max(0, Math.min(MAX_TOTAL, qtdUnica)),
    }].filter(d => d.quantidade > 0);
  }, [modo, itens, qtdPorItem, itemIdx, qtdUnica]);

  const total = distribuicao.reduce((s, d) => s + d.quantidade, 0);
  const tooMany = total > MAX_TOTAL;

  const handleGerar = async () => {
    if (!user || total === 0 || tooMany) return;
    setLoading(true);
    try {
      const editalHeader = (editalLabel || cargo)
        ? `IMPORTANTE: A prova é baseada no edital "${editalLabel || cargo}"${cargo && editalLabel ? ` (cargo: ${cargo})` : ""}. Restrinja TODAS as questões aos tópicos listados em cada matéria. Nunca gere conteúdo fora desses tópicos.${bancaNome ? ` Banca do concurso: ${bancaNome}.` : ""}\n\n`
        : (bancaNome ? `IMPORTANTE: Banca do concurso: ${bancaNome}. Restrinja as questões aos tópicos listados.\n\n` : "");

      const distribuicaoText = distribuicao.map(d => {
        const base = `${d.quantidade} questões de ${d.materia_nome}`;
        if (d.topicos.length > 0) {
          const topicosTxt = d.topicos.map(t => `- ${t}`).join("\n");
          return `${base}\n  Tópicos OBRIGATÓRIOS (use APENAS estes assuntos):\n${topicosTxt}`;
        }
        return base;
      }).join("\n\n");

      const distribuicaoPrompt = `${editalHeader}Distribuição (SIGA EXATAMENTE — agrupe por matéria nesta sequência):\n${distribuicaoText}`;

      const { data: aiData, error: aiError } = await supabase.functions.invoke("generate-questions", {
        body: {
          quantidade: total,
          nivel: "medio",
          modo: "concurso",
          tipo_resposta: "multipla_escolha",
          banca: bancaId || undefined,
          provaCompleta: true,
          distribuicao: distribuicaoPrompt,
          distribuicao_json: distribuicao,
        },
      });
      if (aiError) throw new Error(aiError.message || "Erro ao gerar questões");
      if (!aiData?.questoes?.length) throw new Error("IA não retornou questões. Tente reduzir a quantidade.");

      const generated = aiData.questoes as Array<{
        enunciado: string;
        alternativas: { letra: string; texto: string }[];
        resposta_correta: string;
        explicacao?: string;
        materia_nome?: string;
      }>;

      await supabase.rpc("incrementar_uso_diario", {
        _user_id: user.id,
        _quantidade: generated.length,
      });

      const { data: sim, error: sErr } = await supabase
        .from("simulados")
        .insert({
          user_id: user.id,
          tipo: "prova_completa",
          quantidade: generated.length,
          total_questoes: generated.length,
          banca_id: bancaId || null,
          modo: "concurso",
        })
        .select()
        .single();
      if (sErr) throw sErr;

      const questoesInsert = generated.map((q) => ({
        enunciado: q.enunciado,
        alternativas: q.alternativas as unknown,
        resposta_correta: q.resposta_correta,
        explicacao: q.explicacao || null,
        modo: "concurso",
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

      toast({ title: `Simulado gerado! ${generated.length} questões.` });
      onOpenChange(false);
      navigate(`/simulado?modo=concurso&continuar=${sim.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erro ao gerar simulado";
      toast({ title: "Erro ao gerar simulado", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <Sparkles className="h-5 w-5 text-primary" /> Gerar simulado — {titulo}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {bancaNome
              ? <>Questões na banca <span className="font-semibold text-foreground">{bancaNome}</span>{bancaId ? "" : " (filtro best-effort pelo nome)"}.</>
              : "Questões geradas com base nos tópicos selecionados."}
          </DialogDescription>
        </DialogHeader>

        {!onlyOne && (
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setModo("completo")}
              className={`rounded-lg border p-3 text-left transition ${modo === "completo" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}
            >
              <p className="text-sm font-semibold">Bloco completo</p>
              <p className="text-[11px] text-muted-foreground">Quantidade por assunto</p>
            </button>
            <button
              type="button"
              onClick={() => setModo("conteudo")}
              className={`rounded-lg border p-3 text-left transition ${modo === "conteudo" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/40"}`}
            >
              <p className="text-sm font-semibold">Por conteúdo</p>
              <p className="text-[11px] text-muted-foreground">Escolha 1 assunto</p>
            </button>
          </div>
        )}

        {modo === "completo" ? (
          <div className="space-y-2 max-h-[45vh] overflow-y-auto pr-1">
            {itens.map((it, i) => (
              <div key={i} className="rounded-lg border bg-muted/20 p-2 flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{it.materia}</p>
                  {it.topico && <p className="text-[11px] text-muted-foreground truncate">{it.topico}</p>}
                </div>
                <Input
                  type="number"
                  min={0}
                  max={MAX_POR_ITEM}
                  value={qtdPorItem[i] ?? 0}
                  onChange={(e) => {
                    const n = parseInt(e.target.value, 10);
                    setQtdPorItem(prev => {
                      const next = [...prev];
                      next[i] = Number.isFinite(n) ? Math.max(0, Math.min(MAX_POR_ITEM, n)) : 0;
                      return next;
                    });
                  }}
                  className="w-20 text-center"
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {!onlyOne && (
              <div className="space-y-1.5">
                <Label className="text-xs">Conteúdo</Label>
                <select
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={itemIdx}
                  onChange={(e) => setItemIdx(parseInt(e.target.value, 10) || 0)}
                >
                  {itens.map((it, i) => (
                    <option key={i} value={i}>
                      {it.materia}{it.topico ? ` — ${it.topico}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {onlyOne && itens[0] && (
              <div className="rounded-lg border bg-muted/20 p-3 text-sm">
                <p className="font-medium">{itens[0].materia}</p>
                {itens[0].topico && <p className="text-xs text-muted-foreground">{itens[0].topico}</p>}
              </div>
            )}
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade de questões</Label>
              <Input
                type="number"
                min={1}
                max={MAX_TOTAL}
                value={qtdUnica}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setQtdUnica(Number.isFinite(n) ? Math.max(1, Math.min(MAX_TOTAL, n)) : 1);
                }}
              />
            </div>
          </div>
        )}

        <div className={`rounded-lg border p-2 text-xs ${tooMany ? "border-destructive bg-destructive/10 text-destructive" : "border-primary/30 bg-primary/5"}`}>
          Total: <span className="font-bold">{total}</span> {tooMany && <>(limite: {MAX_TOTAL})</>}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>Cancelar</Button>
          <Button onClick={handleGerar} disabled={loading || total === 0 || tooMany} className="gap-1.5">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
            {loading ? "Gerando..." : "Gerar simulado"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}