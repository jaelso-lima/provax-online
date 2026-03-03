import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import AppHeader from "@/components/AppHeader";
import AppFooter from "@/components/AppFooter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { examRadarService } from "@/services/examRadarService";
import type { ExamRadarFilters } from "@/types/modules";
import { MapPin, Calendar, DollarSign, Users, ExternalLink, Search, FileText, ChevronLeft, ChevronRight, Radar, Building2, GraduationCap, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

const NIVEIS = [
  { value: "medio", label: "Médio" },
  { value: "superior", label: "Superior" },
  { value: "tecnico", label: "Técnico" },
  { value: "fundamental", label: "Fundamental" },
];

const ESTADOS_BR = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA",
  "PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO","Nacional"
];

export default function ConcursosAbertos() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<ExamRadarFilters>({ status: "ativo" });
  const [searchInput, setSearchInput] = useState("");

  const { data: examsData, isLoading } = useQuery({
    queryKey: ["exam-radar", filters, page],
    queryFn: () => examRadarService.listExams(filters, page),
  });

  const { data: filterOptions } = useQuery({
    queryKey: ["exam-radar-filters"],
    queryFn: () => examRadarService.getFilterOptions(),
    staleTime: 5 * 60 * 1000,
  });

  const exams = examsData?.data || [];
  const total = examsData?.total || 0;
  const totalPages = Math.ceil(total / 12);

  const handleSearch = () => {
    setFilters((f) => ({ ...f, search: searchInput || undefined }));
    setPage(1);
  };

  const updateFilter = (key: keyof ExamRadarFilters, value: string) => {
    setFilters((f) => ({ ...f, [key]: value === "all" ? undefined : value }));
    setPage(1);
  };

  const formatDate = (d: string | null) => {
    if (!d) return "—";
    return new Date(d + "T00:00:00").toLocaleDateString("pt-BR");
  };

  const formatSalary = (v: number | null) => {
    if (!v) return null;
    return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const isInscricaoAberta = (ate: string | null) => {
    if (!ate) return false;
    return new Date(ate + "T23:59:59") >= new Date();
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AppHeader />
      <main className="flex-1 container py-6 space-y-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold font-['Space_Grotesk'] flex items-center gap-2">
              <Radar className="h-7 w-7 text-primary" />
              Radar de Concursos
            </h1>
            <p className="text-muted-foreground mt-1">
              Acompanhe concursos abertos em todo o Brasil
            </p>
          </div>
          <Badge variant="outline" className="text-sm px-3 py-1">
            {total} concurso{total !== 1 ? "s" : ""} encontrado{total !== 1 ? "s" : ""}
          </Badge>
        </motion.div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-4 pb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="relative lg:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar concurso..."
                  className="pl-9"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                />
              </div>
              <Select value={filters.estado || "all"} onValueChange={(v) => updateFilter("estado", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os estados</SelectItem>
                  {ESTADOS_BR.map((e) => (
                    <SelectItem key={e} value={e}>{e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.nivel || "all"} onValueChange={(v) => updateFilter("nivel", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os níveis</SelectItem>
                  {NIVEIS.map((n) => (
                    <SelectItem key={n.value} value={n.value}>{n.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filters.status || "ativo"} onValueChange={(v) => updateFilter("status", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ativo">Inscrições abertas</SelectItem>
                  <SelectItem value="encerrado">Encerrados</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* List */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardHeader><div className="h-5 bg-muted rounded w-3/4" /></CardHeader>
                <CardContent><div className="space-y-2"><div className="h-4 bg-muted rounded w-1/2" /><div className="h-4 bg-muted rounded w-2/3" /></div></CardContent>
              </Card>
            ))}
          </div>
        ) : exams.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Radar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground text-lg">Nenhum concurso encontrado com esses filtros.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {exams.map((exam, idx) => (
              <motion.div
                key={exam.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
              >
                <Card className="h-full flex flex-col hover:shadow-lg transition-shadow border-l-4 border-l-primary/60">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base leading-tight line-clamp-2">{exam.nome}</CardTitle>
                      {isInscricaoAberta(exam.inscricao_ate) ? (
                        <Badge className="shrink-0 bg-green-500/10 text-green-600 border-green-500/30">Aberto</Badge>
                      ) : (
                        <Badge variant="secondary" className="shrink-0">Encerrado</Badge>
                      )}
                    </div>
                    {exam.orgao && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                        <Building2 className="h-3 w-3" /> {exam.orgao}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-between gap-3">
                    <div className="space-y-1.5 text-sm">
                      {exam.estado && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <MapPin className="h-3.5 w-3.5" /> {exam.estado}
                        </div>
                      )}
                      {exam.banca_nome && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <FileText className="h-3.5 w-3.5" /> {exam.banca_nome}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GraduationCap className="h-3.5 w-3.5" />
                        {NIVEIS.find((n) => n.value === exam.nivel)?.label || exam.nivel}
                      </div>
                      {exam.vagas && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Users className="h-3.5 w-3.5" /> {exam.vagas} vaga{exam.vagas > 1 ? "s" : ""}
                        </div>
                      )}
                      {(exam.salario_de || exam.salario_ate) && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <DollarSign className="h-3.5 w-3.5" />
                          {exam.salario_de && exam.salario_ate
                            ? `${formatSalary(exam.salario_de)} a ${formatSalary(exam.salario_ate)}`
                            : formatSalary(exam.salario_ate || exam.salario_de)}
                        </div>
                      )}
                      {exam.inscricao_ate && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Calendar className="h-3.5 w-3.5" /> Inscrição até {formatDate(exam.inscricao_ate)}
                        </div>
                      )}
                      {exam.area && (
                        <div className="flex items-center gap-2 text-muted-foreground">
                          <Briefcase className="h-3.5 w-3.5" /> {exam.area}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {exam.link && (
                        <Button size="sm" variant="outline" className="text-xs" asChild>
                          <a href={exam.link} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" /> Ver detalhes
                          </a>
                        </Button>
                      )}
                      <Button
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          const params = new URLSearchParams({ modo: "concurso", autostart: "true" });
                          if (exam.banca_nome) params.set("banca_nome", exam.banca_nome);
                          if (exam.area) params.set("area_nome", exam.area);
                          if (exam.nivel) params.set("nivel", exam.nivel);
                          if (exam.estado) params.set("estado", exam.estado);
                          navigate(`/simulado?${params.toString()}`);
                        }}
                      >
                        <FileText className="h-3 w-3 mr-1" /> Gerar simulado
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-4 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Próxima <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}
      </main>
      <AppFooter />
    </div>
  );
}
