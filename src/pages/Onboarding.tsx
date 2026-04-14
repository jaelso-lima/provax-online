import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Target, Brain, Clock, Flame, CheckCircle, Play, Crown, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";
import { trackFBEvent } from "@/lib/fbPixel";

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
      { value: "iniciante", label: "Iniciante — estou começando" },
      { value: "intermediario", label: "Intermediário — já estudei um pouco" },
      { value: "avancado", label: "Avançado — estudo há bastante tempo" },
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
    key: "origem",
    question: "Como você conheceu o ProvaX?",
    icon: Target,
    options: [
      { value: "facebook", label: "Facebook" },
      { value: "instagram", label: "Instagram" },
      { value: "youtube", label: "YouTube" },
      { value: "google", label: "Google" },
      { value: "amigo", label: "Indicação de amigo" },
      { value: "outros", label: "Outros" },
    ],
  },
];

const getYouTubeId = (url: string) => {
  const match = url?.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
};

export default function Onboarding() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showVSL, setShowVSL] = useState(false);
  const [saving, setSaving] = useState(false);
  const [vslReady, setVslReady] = useState(false);
  const [showButtons, setShowButtons] = useState(false);
  const [canCloseFree, setCanCloseFree] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const playerRef = useRef<any>(null);
  const vslTimerRef = useRef<NodeJS.Timeout | null>(null);
  const buttonTimerRef = useRef<NodeJS.Timeout | null>(null);
  const progressCheckRef = useRef<NodeJS.Timeout | null>(null);

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
      if (onboardingData.step_atual >= STEPS.length) {
        setShowVSL(true);
      } else {
        setStep(onboardingData.step_atual || 0);
      }
    }
  }, [onboardingData, navigate]);

  // VSL: wait 4 seconds then autoplay, show buttons after 30s, allow free after 40%
  useEffect(() => {
    if (showVSL) {
      vslTimerRef.current = setTimeout(() => setVslReady(true), 4000);
      buttonTimerRef.current = setTimeout(() => setShowButtons(true), 30000);
      
      // Check 40% progress via YouTube API polling
      progressCheckRef.current = setInterval(() => {
        if (playerRef.current) {
          try {
            const duration = playerRef.current.getDuration?.();
            const current = playerRef.current.getCurrentTime?.();
            if (duration && current && current / duration >= 0.4) {
              setCanCloseFree(true);
            }
            if (duration && current && current >= duration - 1) {
              setVideoEnded(true);
              setShowButtons(true);
              setCanCloseFree(true);
            }
          } catch {}
        }
      }, 2000);
    }
    return () => {
      if (vslTimerRef.current) clearTimeout(vslTimerRef.current);
      if (buttonTimerRef.current) clearTimeout(buttonTimerRef.current);
      if (progressCheckRef.current) clearInterval(progressCheckRef.current);
    };
  }, [showVSL]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!showVSL || !vslReady || !vslUrl) return;
    const videoId = getYouTubeId(vslUrl);
    if (!videoId) return;

    const loadAPI = () => {
      if ((window as any).YT?.Player) {
        createPlayer(videoId);
        return;
      }
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
      (window as any).onYouTubeIframeAPIReady = () => createPlayer(videoId);
    };

    const createPlayer = (id: string) => {
      playerRef.current = new (window as any).YT.Player("vsl-player", {
        videoId: id,
        playerVars: {
          autoplay: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
        },
        events: {
          onStateChange: (event: any) => {
            if (event.data === 0) {
              setVideoEnded(true);
              setShowButtons(true);
              setCanCloseFree(true);
            }
          },
        },
      });
    };

    loadAPI();
  }, [showVSL, vslReady, vslUrl]);

  const saveProgress = async (newAnswers: Record<string, string>, currentStep: number, complete = false) => {
    if (!user) return;
    const payload: any = {
      user_id: user.id,
      step_atual: currentStep,
      onboarding_completo: complete,
      objetivo: newAnswers.objetivo || null,
      nivel: newAnswers.nivel || null,
      ja_estuda: null,
      tempo_diario: newAnswers.tempo_diario || null,
      dificuldade: newAnswers.dificuldade || null,
      meta: null,
      origem: newAnswers.origem || null,
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
      await saveProgress(newAnswers, STEPS.length);
      setShowVSL(true);
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
  };

  const handleFinishFree = async () => {
    if (!canCloseFree && showButtons) {
      toast({ title: "Aguarde um pouco mais", description: "Assista pelo menos 40% do vídeo para continuar.", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      await saveProgress(answers, STEPS.length, true);
      await supabase.from("profiles").update({ onboarding_completo: true }).eq("id", user!.id);
      await refreshProfile();
      toast({ title: "Bem-vindo ao ProvaX! 🎉", description: "Seu acesso gratuito foi liberado." });
      navigate("/dashboard", { replace: true });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleGoPremium = async () => {
    setSaving(true);
    try {
      await saveProgress(answers, STEPS.length, true);
      await supabase.from("profiles").update({ onboarding_completo: true }).eq("id", user!.id);
      await refreshProfile();
      trackFBEvent("InitiateCheckout", { content_name: "Premium from VSL" });
      navigate("/planos", { replace: true });
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Tente novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const progress = showVSL ? 100 : ((step) / STEPS.length) * 100;
  const currentStep = STEPS[step];
  const StepIcon = currentStep?.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Progress bar */}
      <div className="sticky top-0 z-40 bg-card/95 backdrop-blur-md border-b px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium">
              Passo {Math.min(step + 1, STEPS.length)} de {STEPS.length}
            </span>
            <span className="text-xs text-muted-foreground">
              {Math.round(progress)}%
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </div>

      {/* Quiz content */}
      {!showVSL && (
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
                {step === 0 && (
                  <p className="text-center text-sm text-muted-foreground mb-6">
                    Responda rápido para personalizar sua experiência
                  </p>
                )}
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
                        <span className="font-medium text-sm md:text-base text-foreground">{opt.label}</span>
                        {answers[currentStep.key] === opt.value && (
                          <CheckCircle className="h-5 w-5 text-primary shrink-0" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                {step > 0 && (
                  <Button variant="ghost" className="mt-6" onClick={handleBack}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Voltar
                  </Button>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* Placeholder when VSL modal is open */}
      {showVSL && (
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <CheckCircle className="h-8 w-8 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Quiz finalizado!</h2>
            <p className="text-muted-foreground text-sm">Assista ao vídeo de boas-vindas para continuar.</p>
          </div>
        </div>
      )}

      {/* VSL Modal */}
      <Dialog open={showVSL} onOpenChange={() => {}}>
        <DialogContent className="max-w-3xl w-[95vw] p-0 gap-0 overflow-hidden border-0 bg-card shadow-2xl [&>button]:hidden">
          <div className="p-6 pb-0">
            <DialogHeader className="text-center space-y-2">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                <Play className="h-6 w-6 text-primary" />
              </div>
              <DialogTitle className="font-display text-xl md:text-2xl">
                Assista ao vídeo de boas-vindas
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                Veja como o ProvaX vai transformar seu método de estudo e acelerar sua aprovação.
              </DialogDescription>
            </DialogHeader>
          </div>

          {/* Video with YouTube IFrame API - no seek, no controls */}
          <div className="px-6 pt-4">
            {vslUrl && getYouTubeId(vslUrl) ? (
              <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingBottom: "56.25%" }}>
                {!vslReady ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="text-center">
                      <div className="mx-auto mb-3 h-12 w-12 rounded-full border-4 border-primary/30 border-t-primary animate-spin" />
                      <p className="text-sm text-muted-foreground">Preparando vídeo...</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div id="vsl-player" className="absolute inset-0 w-full h-full" />
                    {/* Block all interaction with the video */}
                    <div className="absolute inset-0" style={{ pointerEvents: "auto" }} onClick={(e) => e.preventDefault()} />
                  </>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed">
                <Play className="h-12 w-12 text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground">Vídeo em breve</p>
              </div>
            )}
          </div>

          {/* CTA Buttons - appear after 30s or video end */}
          <div className="p-6 space-y-3">
            
            
            <AnimatePresence>
              {showButtons ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-3"
                >
                  <Button
                    size="lg"
                    className="w-full h-14 text-lg bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg shadow-accent/25 group"
                    onClick={handleGoPremium}
                    disabled={saving}
                  >
                    <Crown className="mr-2 h-5 w-5" />
                    {saving ? "Preparando..." : "Assinar Premium"}
                    <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    Simulados ilimitados • Sistema adaptativo • Análise completa
                  </p>
                  <div className="text-center pt-1">
                    <button
                      onClick={handleFinishFree}
                      disabled={saving || !canCloseFree}
                      className={`text-sm underline underline-offset-4 transition-colors ${
                        canCloseFree
                          ? "text-muted-foreground hover:text-foreground"
                          : "text-muted-foreground/40 cursor-not-allowed"
                      }`}
                    >
                      {canCloseFree ? "Continuar gratuito" : "Assista mais um pouco para continuar grátis..."}
                    </button>
                  </div>
                </motion.div>
              ) : (
                <p className="text-center text-xs text-muted-foreground animate-pulse">
                  Aguarde o vídeo para ver as opções...
                </p>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
