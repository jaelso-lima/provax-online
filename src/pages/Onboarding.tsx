import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Target, BookOpen, Clock, Brain, Trophy, Flame, CheckCircle, Play } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

const STEPS = [
  {
    key: "objetivo",
    question: "Qual é seu principal objetivo?",
    icon: Target,
    options: [
      { value: "concurso_publico", label: "Passar em concurso público" },
      { value: "enem", label: "Tirar boa nota no ENEM" },
      { value: "vestibular", label: "Passar no vestibular" },
      { value: "conhecimento", label: "Estudar para aprender" },
    ],
  },
  {
    key: "nivel",
    question: "Qual seu nível atual de conhecimento?",
    icon: Brain,
    options: [
      { value: "iniciante", label: "Iniciante — estou começando agora" },
      { value: "intermediario", label: "Intermediário — já estudei um pouco" },
      { value: "avancado", label: "Avançado — estudo há bastante tempo" },
    ],
  },
  {
    key: "ja_estuda",
    question: "Você já estuda atualmente?",
    icon: BookOpen,
    options: [
      { value: "sim", label: "Sim, estudo regularmente" },
      { value: "as_vezes", label: "Às vezes, sem rotina fixa" },
      { value: "nao", label: "Não, quero começar agora" },
    ],
  },
  {
    key: "tempo_diario",
    question: "Quanto tempo por dia você pode estudar?",
    icon: Clock,
    options: [
      { value: "30min", label: "Até 30 minutos" },
      { value: "1h", label: "1 hora" },
      { value: "2h", label: "2 horas" },
      { value: "3h_mais", label: "3 horas ou mais" },
    ],
  },
  {
    key: "dificuldade",
    question: "Qual sua maior dificuldade nos estudos?",
    icon: Flame,
    options: [
      { value: "foco", label: "Manter o foco e a disciplina" },
      { value: "metodo", label: "Não ter um método eficiente" },
      { value: "tempo", label: "Falta de tempo" },
      { value: "conteudo", label: "Volume de conteúdo muito grande" },
    ],
  },
  {
    key: "meta",
    question: "Qual sua meta de aprovação?",
    icon: Trophy,
    options: [
      { value: "6meses", label: "Quero passar em até 6 meses" },
      { value: "1ano", label: "Quero passar em até 1 ano" },
      { value: "2anos", label: "Quero passar em até 2 anos" },
      { value: "sem_pressa", label: "Sem pressa, quero evoluir" },
    ],
  },
];

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showVSL, setShowVSL] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load existing onboarding state
  const { data: onboardingData } = useQuery({
    queryKey: ["user-onboarding", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data } = await supabase
        .from("user_onboarding")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  // Load VSL video URL
  const { data: vslUrl } = useQuery({
    queryKey: ["site-setting-vsl"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("valor")
        .eq("chave", "video_vsl_url")
        .maybeSingle();
      return data?.valor || "";
    },
    staleTime: 10 * 60 * 1000,
  });

  // Resume from where user left off
  useEffect(() => {
    if (onboardingData) {
      if (onboardingData.onboarding_completo) {
        navigate("/dashboard", { replace: true });
        return;
      }
      const saved: Record<string, string> = {};
      STEPS.forEach((s) => {
        const val = (onboardingData as any)[s.key];
        if (val !== null && val !== undefined) {
          saved[s.key] = typeof val === "boolean" ? (val ? "sim" : "nao") : String(val);
        }
      });
      setAnswers(saved);
      // If all quiz steps done, show VSL
      if (onboardingData.step_atual >= STEPS.length) {
        setShowVSL(true);
      } else {
        setStep(onboardingData.step_atual || 0);
      }
    }
  }, [onboardingData, navigate]);

  const saveProgress = async (newAnswers: Record<string, string>, currentStep: number, complete = false) => {
    if (!user) return;
    const payload: any = {
      user_id: user.id,
      step_atual: currentStep,
      onboarding_completo: complete,
      objetivo: newAnswers.objetivo || null,
      nivel: newAnswers.nivel || null,
      ja_estuda: newAnswers.ja_estuda === "sim" ? true : newAnswers.ja_estuda === "nao" ? false : null,
      tempo_diario: newAnswers.tempo_diario || null,
      dificuldade: newAnswers.dificuldade || null,
      meta: newAnswers.meta || null,
    };

    const { error } = await supabase
      .from("user_onboarding")
      .upsert(payload, { onConflict: "user_id" });

    if (error) console.error("Save onboarding error:", error);
  };

  const handleSelect = async (value: string) => {
    const currentKey = STEPS[step].key;
    const newAnswers = { ...answers, [currentKey]: value };
    setAnswers(newAnswers);

    if (step < STEPS.length - 1) {
      const nextStep = step + 1;
      setStep(nextStep);
      await saveProgress(newAnswers, nextStep);
    } else {
      // Quiz complete → show VSL
      await saveProgress(newAnswers, STEPS.length);
      setShowVSL(true);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleFinishOnboarding = async () => {
    setSaving(true);
    try {
      await saveProgress(answers, STEPS.length, true);

      // Update profile
      const { error } = await supabase
        .from("profiles")
        .update({ onboarding_completo: true })
        .eq("id", user!.id);

      if (error) {
        // Try with bypass
        await supabase.rpc("update_own_profile" as any, {});
      }

      await refreshProfile();
      toast({ title: "Bem-vindo ao ProvaX! 🎉", description: "Seu plano de estudo personalizado está pronto." });
      navigate("/dashboard", { replace: true });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const getYouTubeEmbedUrl = (url: string) => {
    if (!url) return "";
    const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    return match ? `https://www.youtube.com/embed/${match[1]}?rel=0` : url;
  };

  const progress = showVSL ? 100 : ((step) / STEPS.length) * 100;

  // VSL Screen
  if (showVSL) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-3xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
            <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Play className="h-8 w-8 text-primary" />
            </div>
            <h1 className="font-display text-2xl md:text-3xl font-bold mb-2">
              Assista antes de começar
            </h1>
            <p className="text-muted-foreground mb-8 max-w-lg mx-auto">
              Veja como o ProvaX vai transformar seu método de estudo e acelerar sua aprovação.
            </p>

            {vslUrl ? (
              <div className="relative w-full mb-8 rounded-xl overflow-hidden shadow-2xl bg-black" style={{ paddingBottom: "56.25%" }}>
                <iframe
                  className="absolute inset-0 w-full h-full"
                  src={getYouTubeEmbedUrl(vslUrl)}
                  title="ProvaX - Como funciona"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  loading="lazy"
                />
              </div>
            ) : (
              <Card className="mb-8 border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Play className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">Vídeo em breve</p>
                </CardContent>
              </Card>
            )}

            <Button
              size="lg"
              className="h-14 text-lg px-10 group shadow-lg shadow-primary/25"
              onClick={handleFinishOnboarding}
              disabled={saving}
            >
              {saving ? "Preparando..." : "Liberar acesso ao sistema"}
              <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Button>
            <p className="mt-3 text-xs text-muted-foreground">
              Seu plano personalizado está pronto
            </p>
          </motion.div>
        </div>
      </div>
    );
  }

  // Quiz Screen
  const currentStep = STEPS[step];
  const StepIcon = currentStep.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="sticky top-0 z-50 bg-card/95 backdrop-blur-md border-b px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">
              Passo {step + 1} de {STEPS.length}
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Quiz content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              transition={{ duration: 0.25 }}
            >
              <div className="text-center mb-8">
                <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                  <StepIcon className="h-7 w-7 text-primary" />
                </div>
                <h2 className="font-display text-xl md:text-2xl font-bold">
                  {currentStep.question}
                </h2>
              </div>

              <div className="space-y-3">
                {currentStep.options.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => handleSelect(opt.value)}
                    className={`w-full text-left rounded-xl border-2 p-4 transition-all hover:border-primary hover:bg-primary/5 ${
                      answers[currentStep.key] === opt.value
                        ? "border-primary bg-primary/10"
                        : "border-border bg-card"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-sm md:text-base">{opt.label}</span>
                      {answers[currentStep.key] === opt.value && (
                        <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>

              {step > 0 && (
                <Button
                  variant="ghost"
                  className="mt-6"
                  onClick={handleBack}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Button>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
