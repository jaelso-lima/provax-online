import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Loader2, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface FilterValues {
  areaId: string;
  materiaId: string;
  topicId: string;
  stateId: string;
  esferaId: string;
  bancaId: string;
  carreiraId: string;
  ano: string;
  cursoId: string;
}

interface CascadingFiltersProps {
  modo: "concurso" | "enem" | "universidade";
  onFiltersChange: (filters: FilterValues) => void;
}

const fadeIn = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: 0.2 },
};

export default function CascadingFilters({ modo, onFiltersChange }: CascadingFiltersProps) {
  const [filters, setFilters] = useState<FilterValues>({
    areaId: "", materiaId: "", topicId: "", stateId: "", esferaId: "", bancaId: "", carreiraId: "", ano: "", cursoId: "",
  });

  const [areas, setAreas] = useState<any[]>([]);
  const [materias, setMaterias] = useState<any[]>([]);
  const [states, setStates] = useState<any[]>([]);
  const [esferas, setEsferas] = useState<any[]>([]);
  const [bancas, setBancas] = useState<any[]>([]);
  const [carreiras, setCarreiras] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [cursos, setCursos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const isConcurso = modo === "concurso";
  const isUniversidade = modo === "universidade";

  // Load areas (concurso/enem) or cursos (universidade) on mount
  useEffect(() => {
    setLoading(true);
    if (isUniversidade) {
      supabase.from("cursos").select("*").eq("liberado", true).order("nome")
        .then(({ data }) => { if (data) setCursos(data); setLoading(false); });
    } else {
      supabase.from("areas").select("*").eq("modo", modo).order("nome")
        .then(({ data }) => { if (data) setAreas(data); setLoading(false); });
    }
  }, [modo]);

  // Cascading: area → materias (concurso/enem)
  useEffect(() => {
    if (isUniversidade) return;
    if (!filters.areaId) { setMaterias([]); return; }
    supabase.from("area_materias").select("materia_id, materias(id, nome)").eq("area_id", filters.areaId)
      .then(({ data }) => {
        if (data) setMaterias(data.map((d: any) => d.materias).filter(Boolean).sort((a: any, b: any) => a.nome.localeCompare(b.nome)));
      });
  }, [filters.areaId]);

  // Cascading: curso → disciplinas (universidade)
  useEffect(() => {
    if (!isUniversidade) return;
    if (!filters.cursoId) { setMaterias([]); return; }
    supabase.from("curso_materias").select("materia_id, materias(id, nome)").eq("curso_id", filters.cursoId)
      .then(({ data }) => {
        if (data) setMaterias(data.map((d: any) => d.materias).filter(Boolean).sort((a: any, b: any) => a.nome.localeCompare(b.nome)));
      });
  }, [filters.cursoId]);

  // Load topics when materia selected (universidade mode)
  useEffect(() => {
    if (!filters.materiaId) { setTopics([]); return; }
    supabase.from("topics").select("*").eq("materia_id", filters.materiaId).order("nome")
      .then(({ data }) => { if (data) setTopics(data); });
  }, [filters.materiaId]);

  // Load states, esferas, bancas, carreiras when needed (concurso only)
  useEffect(() => {
    if (modo !== "concurso" || !filters.materiaId) return;
    Promise.all([
      supabase.from("states").select("*").order("nome"),
      supabase.from("esferas").select("*").order("nome"),
      supabase.from("bancas").select("*").order("nome"),
      supabase.from("carreiras").select("*").order("nome"),
    ]).then(([s, e, b, c]) => {
      if (s.data) setStates(s.data);
      if (e.data) setEsferas(e.data);
      if (b.data) setBancas(b.data);
      if (c.data) setCarreiras(c.data);
    });
  }, [modo, filters.materiaId]);

  // Notify parent on change
  useEffect(() => {
    onFiltersChange(filters);
  }, [filters]);

  const updateFilter = (key: keyof FilterValues, value: string) => {
    setFilters(prev => {
      const next = { ...prev, [key]: value };
      // Reset downstream filters
      const order: (keyof FilterValues)[] = modo === "concurso"
        ? ["areaId", "materiaId", "stateId", "esferaId", "carreiraId", "bancaId", "ano"]
        : ["cursoId", "materiaId", "topicId"];
      const idx = order.indexOf(key);
      for (let i = idx + 1; i < order.length; i++) next[order[i]] = "";
      return next;
    });
  };

  const resetFilters = () => {
    setFilters({ areaId: "", materiaId: "", topicId: "", stateId: "", esferaId: "", bancaId: "", carreiraId: "", ano: "", cursoId: "" });
  };

  if (loading) return <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;

  const anos = [2026, 2025, 2024, 2023, 2022, 2021, 2020];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end">
        {(filters.areaId || filters.cursoId) && (
          <Button variant="ghost" size="sm" onClick={resetFilters} className="h-7 gap-1 text-xs text-muted-foreground">
            <RotateCcw className="h-3 w-3" /> Limpar filtros
          </Button>
        )}
      </div>

      {/* Step 1: Curso (universidade) ou Área (concurso/enem) */}
      <motion.div {...fadeIn}>
        <div className="space-y-1.5">
          {isUniversidade ? (
            <>
              <Label className="text-xs">Curso *</Label>
              <Select value={filters.cursoId} onValueChange={v => updateFilter("cursoId", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione o curso" /></SelectTrigger>
                <SelectContent>{cursos.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
              </Select>
            </>
          ) : (
            <>
              <Label className="text-xs">Área *</Label>
              <Select value={filters.areaId} onValueChange={v => updateFilter("areaId", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione a área" /></SelectTrigger>
                <SelectContent>{areas.map(a => <SelectItem key={a.id} value={a.id}>{a.nome}</SelectItem>)}</SelectContent>
              </Select>
            </>
          )}
        </div>
      </motion.div>

      {/* Step 2: Disciplina / Matéria */}
      <AnimatePresence>
        {((isUniversidade ? filters.cursoId : filters.areaId) && materias.length > 0) && (
          <motion.div key="materia" {...fadeIn}>
            <div className="space-y-1.5">
              <Label className="text-xs">{isUniversidade ? "Disciplina *" : "Disciplina / Matéria *"}</Label>
              <Select value={filters.materiaId} onValueChange={v => updateFilter("materiaId", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione a disciplina" /></SelectTrigger>
                <SelectContent>{materias.map((m: any) => <SelectItem key={m.id} value={m.id}>{m.nome}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Universidade: topic filter */}
      {isUniversidade && (
        <AnimatePresence>
          {filters.materiaId && topics.length > 0 && (
            <motion.div key="topic" {...fadeIn}>
              <div className="space-y-1.5">
                <Label className="text-xs">Tópico (opcional)</Label>
                <Select value={filters.topicId} onValueChange={v => updateFilter("topicId", v)}>
                  <SelectTrigger><SelectValue placeholder="Todos os tópicos" /></SelectTrigger>
                  <SelectContent>{topics.map(t => <SelectItem key={t.id} value={t.id}>{t.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Concurso-specific cascading steps (not shown for universidade) */}
      {isConcurso && !isUniversidade && (
        <AnimatePresence>
          {filters.materiaId && (
            <motion.div key="state" {...fadeIn}>
              <div className="space-y-1.5">
                <Label className="text-xs">Estado (opcional)</Label>
                <Select value={filters.stateId} onValueChange={v => updateFilter("stateId", v)}>
                  <SelectTrigger><SelectValue placeholder="Todos os estados" /></SelectTrigger>
                  <SelectContent>{states.map(s => <SelectItem key={s.id} value={s.id}>{s.nome} ({s.sigla})</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </motion.div>
          )}

          {filters.materiaId && (
            <motion.div key="esfera" {...fadeIn}>
              <div className="space-y-1.5">
                <Label className="text-xs">Esfera (opcional)</Label>
                <Select value={filters.esferaId} onValueChange={v => updateFilter("esferaId", v)}>
                  <SelectTrigger><SelectValue placeholder="Todas as esferas" /></SelectTrigger>
                  <SelectContent>{esferas.map(e => <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </motion.div>
          )}

          {filters.materiaId && (
            <motion.div key="carreira" {...fadeIn}>
              <div className="space-y-1.5">
                <Label className="text-xs">Carreira / Cargo (opcional)</Label>
                <Select value={filters.carreiraId} onValueChange={v => updateFilter("carreiraId", v)}>
                  <SelectTrigger><SelectValue placeholder="Todas as carreiras" /></SelectTrigger>
                  <SelectContent>{carreiras.map(c => <SelectItem key={c.id} value={c.id}>{c.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </motion.div>
          )}

          {filters.materiaId && (
            <motion.div key="banca" {...fadeIn}>
              <div className="space-y-1.5">
                <Label className="text-xs">Banca (opcional)</Label>
                <Select value={filters.bancaId} onValueChange={v => updateFilter("bancaId", v)}>
                  <SelectTrigger><SelectValue placeholder="Todas as bancas" /></SelectTrigger>
                  <SelectContent>{bancas.map(b => <SelectItem key={b.id} value={b.id}>{b.nome}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </motion.div>
          )}

          {filters.materiaId && (
            <motion.div key="ano" {...fadeIn}>
              <div className="space-y-1.5">
                <Label className="text-xs">Ano (opcional)</Label>
                <Select value={filters.ano} onValueChange={v => updateFilter("ano", v)}>
                  <SelectTrigger><SelectValue placeholder="Qualquer ano" /></SelectTrigger>
                  <SelectContent>{anos.map(a => <SelectItem key={a} value={String(a)}>{a}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
