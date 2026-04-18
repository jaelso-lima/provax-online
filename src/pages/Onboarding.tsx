import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Target, Brain, Clock, Flame, CheckCircle, Play, Crown, Lock } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  const queryClient = useQueryClient();
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [showVSL, setShowVSL] = useState(false);
  const [saving, setSaving] = useState(false);
  const [videoStarted, setVideoStarted] = useState(false);
  const [showPremiumBtn, setShowPremiumBtn] = useState(false);
  const [videoEnded, setVideoEnded] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);
  const playerRef = useRef<any>(null);
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

  // Resume from where user left off — SOURCE OF TRUTH IS user_onboarding TABLE.
  // Do NOT use localStorage / sessionStorage here.
  useEffect(() => {
    if (!onboardingData) return;
    // If truly completed in DB, leave onboarding (ProtectedRoute also enforces this).
    if (onboardingData.onboarding_completo === true) {
      console.log("[Onboarding] DB says complete=true, redirecting to /dashboard");
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
    // Only show VSL if quiz was fully answered (step_atual reached end).
    if ((onboardingData.step_atual ?? 0) >= STEPS.length) {
      setShowVSL(true);
    } else {
      setStep(onboardingData.step_atual || 0);
    }
  }, [onboardingData, navigate]);

  // Poll video progress via YouTube API
  useEffect(() => {
    if (!videoStarted) return;

    progressCheckRef.current = setInterval(() => {
      if (playerRef.current) {
        try {
          const duration = playerRef.current.getDuration?.();
          const current = playerRef.current.getCurrentTime?.();
          if (duration && duration > 0) {
            const pct = Math.min((current / duration) * 100, 100);
            setVideoProgress(pct);

            // Show premium button when 20s before end
            if (duration - current <= 20 && !showPremiumBtn) {
              setShowPremiumBtn(true);
            }

            // Video ended
            if (current >= duration - 1) {
              setVideoEnded(true);
              setShowPremiumBtn(true);
            }
          }
        } catch {}
      }
    }, 1000);

    return () => {
      if (progressCheckRef.current) clearInterval(progressCheckRef.current);
    };
  }, [videoStarted, showPremiumBtn]);

  // Load YouTube IFrame API and create player.
  // CRITICAL: This is invoked DIRECTLY from a user click (touchend/click) so iOS
  // counts it as a user gesture. We start MUTED + playsinline (iOS requirement),
  // then unmute synchronously inside the same gesture context via onReady.
  const startVideo = useCallback(() => {
    if (!vslUrl) return;
    const videoId = getYouTubeId(vslUrl);
    if (!videoId) return;

    setVideoStarted(true);

    const createPlayer = (id: string) => {
      playerRef.current = new (window as any).YT.Player("vsl-player", {
        videoId: id,
        playerVars: {
          autoplay: 1,
          mute: 1, // iOS requires muted for inline autoplay
          playsinline: 1, // iOS: keep inline, do NOT go fullscreen
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event: any) => {
            try {
              // playVideo() inside onReady — runs in the gesture window from the click.
              event.target.playVideo();
              // Try to unmute. iOS may keep it muted; that's OK — user can tap unmute.
              try { event.target.unMute(); event.target.setVolume(100); } catch {}
            } catch (err) {
              console.warn("[VSL] playVideo failed:", err);
            }
          },
          onStateChange: (event: any) => {
            if (event.data === 0) {
              setVideoEnded(true);
              setShowPremiumBtn(true);
              setVideoProgress(100);
            }
          },
          onError: (e: any) => console.warn("[VSL] YT error:", e?.data),
        },
      });
    };

    if ((window as any).YT?.Player) {
      createPlayer(videoId);
      return;
    }

    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
    (window as any).onYouTubeIframeAPIReady = () => createPlayer(videoId);
  }, [vslUrl]);

  // Manual unmute fallback (iOS often keeps player muted after autoplay)
  const handleUnmute = useCallback(() => {
    try {
      playerRef.current?.unMute?.();
      playerRef.current?.setVolume?.(100);
    } catch {}
  }, []);

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

  const markOnboardingComplete = async () => {
    if (!user) return;
    // Update BOTH tables and AWAIT them — this is the source of truth.
    const [{ error: e1 }, { error: e2 }] = await Promise.all([
      supabase
        .from("user_onboarding")
        .upsert(
          {
            user_id: user.id,
            step_atual: STEPS.length,
            onboarding_completo: true,
            objetivo: answers.objetivo || null,
            nivel: answers.nivel || null,
            ja_estuda: null,
            tempo_diario: answers.tempo_diario || null,
            dificuldade: answers.dificuldade || null,
            meta: null,
            origem: answers.origem || null,
          },
          { onConflict: "user_id" }
        ),
      supabase.from("profiles").update({ onboarding_completo: true }).eq("id", user.id),
    ]);
    if (e1) console.error("[Onboarding] user_onboarding update error:", e1);
    if (e2) console.error("[Onboarding] profiles update error:", e2);

    // Invalidate cache so ProtectedRoute reads fresh value on next render
    await queryClient.invalidateQueries({ queryKey: ["onboarding-check", user.id] });
    await refreshProfile();

    console.log("[Onboarding] onboarding_completo persisted = TRUE");
  };

  const handleFinishFree = async () => {
    setSaving(true);
    try {
      await markOnboardingComplete();
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
    if (saving) return;
    setSaving(true);
    try {
      // Persist onboarding BEFORE redirecting so user can never bounce back to /onboarding
      await markOnboardingComplete();
      trackFBEvent("InitiateCheckout", { content_name: "Premium from VSL", value: 29.90, currency: "BRL" });

      // Fetch checkout link directly (avoid /planos roundtrip)
      const { data: plan } = await supabase
        .from("plans")
        .select("stripe_link_mensal")
        .in("slug", ["premium", "start"])
        .eq("ativo", true)
        .order("preco_mensal", { ascending: false })
        .limit(1)
        .maybeSingle();

      const checkoutUrl = plan?.stripe_link_mensal;
      if (checkoutUrl) {
        const url = new URL(checkoutUrl);
        if (user?.email) url.searchParams.set("email", user.email);
        // Open checkout in new tab; user is sent to dashboard immediately.
        // If they pay, webhook upgrades plan; if they cancel, they're already on dashboard (free).
        window.open(url.toString(), "_blank");
        navigate("/dashboard", { replace: true });
      } else {
        navigate("/planos", { replace: true });
      }
    } catch (e) {
      console.error(e);
      toast({ title: "Erro", description: "Tente novamente.", variant: "destructive" });
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

          {/* Video area */}
          {!videoEnded && (
            <div className="px-6 pt-4">
              {vslUrl && getYouTubeId(vslUrl) ? (
                <div className="relative w-full rounded-xl overflow-hidden bg-black" style={{ paddingBottom: "56.25%" }}>
                  {!videoStarted ? (
                    /* Play button — REQUIRED for iOS (no autoplay without user gesture). Universal fallback. */
                    <button
                      type="button"
                      className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer bg-black/80 w-full h-full border-0"
                      onClick={startVideo}
                      aria-label="Iniciar vídeo de boas-vindas"
                    >
                      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/90 shadow-lg shadow-primary/30 transition-transform hover:scale-110">
                        <Play className="h-10 w-10 text-primary-foreground ml-1" />
                      </div>
                      <p className="mt-4 text-sm font-medium text-white/90">Toque para iniciar o vídeo</p>
                      <p className="mt-1 text-xs text-white/60">Vídeo de boas-vindas — necessário para continuar</p>
                    </button>
                  ) : (
                    <>
                      <div id="vsl-player" className="absolute inset-0 w-full h-full" />
                      {/* Click-blocker overlay — prevents user from pausing/seeking VSL */}
                      <div className="absolute inset-0" style={{ pointerEvents: "auto" }} onClick={(e) => e.preventDefault()} aria-hidden="true" />
                      {/* Unmute button — iOS often keeps autoplay muted; universal fallback */}
                      <button
                        type="button"
                        onClick={handleUnmute}
                        className="absolute bottom-3 right-3 z-10 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-medium hover:bg-black/90 transition"
                      >
                        🔊 Ativar som
                      </button>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed">
                  <Play className="h-12 w-12 text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">Vídeo em breve</p>
                </div>
              )}

              {/* Video progress bar */}
              {videoStarted && !videoEnded && (
                <div className="mt-3">
                  <Progress value={videoProgress} className="h-2" />
                  <p className="text-xs text-muted-foreground text-center mt-1">
                    {Math.round(videoProgress)}% do vídeo
                  </p>
                </div>
              )}
            </div>
          )}

          {/* CTA Buttons area */}
          <div className="p-6 space-y-3">
            {/* Info message when buttons are not yet visible */}
            {!videoEnded && !showPremiumBtn && videoStarted && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Lock className="h-4 w-4" />
                <span>Para continuar grátis, aguarde o vídeo de boas-vindas acabar.</span>
              </div>
            )}

            {!videoEnded && !showPremiumBtn && !videoStarted && (
              <p className="text-center text-xs text-muted-foreground">
                Inicie o vídeo acima para ver as opções de plano.
              </p>
            )}

            <AnimatePresence>
              {/* Premium button — appears 20s before end */}
              {showPremiumBtn && (
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

                  {/* Free button — only after video ends */}
                  {videoEnded && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-center pt-1"
                    >
                      <button
                        onClick={handleFinishFree}
                        disabled={saving}
                        className="text-sm underline underline-offset-4 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        Continuar gratuito
                      </button>
                    </motion.div>
                  )}

                  {!videoEnded && (
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <Lock className="h-3 w-3" />
                      <span>Aguarde o vídeo terminar para a opção gratuita</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
