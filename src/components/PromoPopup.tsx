import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, X } from "lucide-react";

interface Promo {
  id: string;
  titulo: string;
  descricao: string;
  preco_promocional: number;
  preco_original: number;
  plano_destino: string;
  checkout_url: string | null;
  duracao_timer_minutos: number;
  mostrar_apenas_uma_vez: boolean;
}

export default function PromoPopup() {
  const { user, profile } = useAuth();
  const [promo, setPromo] = useState<Promo | null>(null);
  const [open, setOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [expired, setExpired] = useState(false);

  const checkPromo = useCallback(async () => {
    if (!user || !profile) return;

    const now = new Date().toISOString();
    const { data: promos } = await supabase
      .from("promocoes_popup")
      .select("*")
      .eq("ativo", true)
      .lte("data_inicio", now)
      .gte("data_fim", now)
      .limit(1);

    if (!promos || promos.length === 0) return;
    const p = promos[0] as any;

    // Check exibir_para
    const userPlan = profile.plano || "free";
    if (p.exibir_para === "free" && userPlan !== "free") return;
    if (p.exibir_para === "nao_assinantes" && userPlan !== "free") return;
    // "todos" shows for everyone

    // Check if already viewed
    if (p.mostrar_apenas_uma_vez) {
      const { data: ctrl } = await supabase
        .from("user_popup_controle")
        .select("id")
        .eq("user_id", user.id)
        .eq("popup_id", p.id)
        .maybeSingle();

      if (ctrl) return;
    }

    // Check localStorage timer
    const storageKey = `promo_timer_${p.id}`;
    const saved = localStorage.getItem(storageKey);
    let seconds = p.duracao_timer_minutos * 60;

    if (saved) {
      const { endTime } = JSON.parse(saved);
      const remaining = Math.floor((endTime - Date.now()) / 1000);
      if (remaining <= 0) {
        setExpired(true);
        seconds = 0;
      } else {
        seconds = remaining;
      }
    } else {
      const endTime = Date.now() + seconds * 1000;
      localStorage.setItem(storageKey, JSON.stringify({ endTime }));
    }

    setPromo(p);
    setTimeLeft(seconds);
    setOpen(true);

    // Record view
    await supabase.from("user_popup_controle").upsert(
      { user_id: user.id, popup_id: p.id, visualizado: true, data_visualizacao: new Date().toISOString() },
      { onConflict: "user_id,popup_id" }
    );
  }, [user, profile]);

  useEffect(() => {
    const timer = setTimeout(checkPromo, 3000);
    return () => clearTimeout(timer);
  }, [checkPromo]);

  // Countdown timer
  useEffect(() => {
    if (!open || timeLeft <= 0) return;
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setExpired(true);
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [open]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const handleCTA = async () => {
    if (!promo) return;

    // Mark as converted
    if (user) {
      await supabase
        .from("user_popup_controle")
        .update({ convertido: true })
        .eq("user_id", user.id)
        .eq("popup_id", promo.id);
    }

    if (promo.checkout_url) {
      window.open(promo.checkout_url, "_blank");
    } else {
      window.location.href = "/planos";
    }
    setOpen(false);
  };

  if (!promo) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden border-2 border-primary/30">
        <div className="relative bg-gradient-to-br from-primary/10 via-background to-accent/10 p-6">
          <button
            onClick={() => setOpen(false)}
            className="absolute right-3 top-3 rounded-full p-1 hover:bg-muted transition-colors"
          >
            <X className="h-4 w-4 text-muted-foreground" />
          </button>

          <div className="text-center space-y-4">
            <Badge variant="destructive" className="text-xs animate-pulse">
              🔥 Oferta por tempo limitado
            </Badge>

            <h2 className="text-xl font-bold font-display">{promo.titulo}</h2>
            <p className="text-sm text-muted-foreground">{promo.descricao}</p>

            {/* Price anchor */}
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground line-through">
                De R$ {Number(promo.preco_original).toFixed(2).replace(".", ",")}
              </p>
              <p className="text-3xl font-bold text-primary">
                R$ {Number(promo.preco_promocional).toFixed(2).replace(".", ",")}
              </p>
              <Badge variant="secondary" className="text-xs">
                Plano {promo.plano_destino.toUpperCase()}
              </Badge>
            </div>

            {/* Timer */}
            <div className="flex items-center justify-center gap-2 text-sm">
              <Clock className="h-4 w-4 text-destructive" />
              {expired ? (
                <span className="text-destructive font-medium">Tempo esgotado!</span>
              ) : (
                <span className="font-mono text-lg font-bold text-destructive">
                  {formatTime(timeLeft)}
                </span>
              )}
            </div>

            {/* CTA */}
            <Button
              onClick={handleCTA}
              disabled={expired}
              className="w-full gap-2 text-base font-semibold"
              size="lg"
            >
              <Zap className="h-5 w-5" />
              {expired ? "Oferta expirada" : "Desbloquear agora"}
            </Button>

            <p className="text-[10px] text-muted-foreground">
              Acesso imediato após confirmação do pagamento
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
