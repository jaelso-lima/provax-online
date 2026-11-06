import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, Loader2, RefreshCw } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

// Para onde a Stripe leva o cliente depois de pagar.
// O plano é ativado pelo webhook (leva alguns segundos), então esta página
// consulta o perfil até o plano mudar e então leva a pessoa ao painel já premium.
const INTERVALO_MS = 2000;
const TENTATIVAS_MAX = 15; // ~30 segundos

export default function PagamentoConfirmado() {
  const { profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [tentativas, setTentativas] = useState(0);

  const refreshRef = useRef(refreshProfile);
  refreshRef.current = refreshProfile;

  const plano = profile?.plano as string | undefined;
  const ativo = !!plano && plano !== "free";
  const demorando = !ativo && tentativas >= TENTATIVAS_MAX;

  // Consulta o perfil de tempos em tempos até o plano ser ativado.
  useEffect(() => {
    if (ativo || demorando) return;
    const id = setTimeout(
      async () => {
        await refreshRef.current();
        setTentativas((n) => n + 1);
      },
      tentativas === 0 ? 0 : INTERVALO_MS,
    );
    return () => clearTimeout(id);
  }, [ativo, demorando, tentativas]);

  // Plano ativo: leva ao painel sozinho depois de uns segundos.
  useEffect(() => {
    if (!ativo) return;
    const id = setTimeout(() => navigate("/dashboard", { replace: true }), 4000);
    return () => clearTimeout(id);
  }, [ativo, navigate]);

  return (
    <AppLayout>
      <div className="mx-auto max-w-md py-12">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-2 border-accent/30 shadow-xl shadow-accent/10">
            <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
              {ativo ? (
                <>
                  <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent/15">
                    <Crown className="h-8 w-8 text-accent" />
                  </div>
                  <h1 className="font-display text-2xl font-bold">Você agora é Premium! 🎉</h1>
                  <p className="text-sm text-muted-foreground">
                    Pagamento confirmado e plano ativo. Estamos levando você ao painel…
                  </p>
                  <Button className="w-full" onClick={() => navigate("/dashboard", { replace: true })}>
                    Ir para o painel agora
                  </Button>
                </>
              ) : demorando ? (
                <>
                  <h1 className="font-display text-xl font-bold">Ainda confirmando seu pagamento</h1>
                  <p className="text-sm text-muted-foreground">
                    Seu pagamento foi recebido, mas a ativação está demorando um pouco mais que o normal.
                    Isso costuma se resolver em instantes. Se o plano não aparecer, fale com o suporte
                    informando o e-mail usado na compra.
                  </p>
                  <Button className="w-full gap-2" onClick={() => setTentativas(0)}>
                    <RefreshCw className="h-4 w-4" /> Verificar de novo
                  </Button>
                  <Button variant="ghost" className="w-full" onClick={() => navigate("/dashboard", { replace: true })}>
                    Ir para o painel
                  </Button>
                </>
              ) : (
                <>
                  <Loader2 className="h-10 w-10 animate-spin text-primary" />
                  <h1 className="font-display text-xl font-bold">Pagamento recebido!</h1>
                  <p className="text-sm text-muted-foreground">
                    Estamos ativando o seu plano Premium. Não feche esta página, leva só alguns segundos.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AppLayout>
  );
}
