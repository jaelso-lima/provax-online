import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface PlanConfig {
  plano_slug: string;
  limite_questoes_dia: number;
  acesso_filtro_banca: boolean;
  acesso_filtro_cargo: boolean;
  acesso_comentario: boolean;
  acesso_estatisticas_avancadas: boolean;
  limite_cadernos: number;
  limite_itens_caderno: number;
  acesso_ranking: boolean;
}

const FREE_DEFAULTS: PlanConfig = {
  plano_slug: "free",
  limite_questoes_dia: 15,
  acesso_filtro_banca: true,
  acesso_filtro_cargo: false,
  acesso_comentario: false,
  acesso_estatisticas_avancadas: false,
  limite_cadernos: 1,
  limite_itens_caderno: 3,
  acesso_ranking: false,
};

export function usePlanConfig() {
  const { profile } = useAuth();
  const planoSlug = profile?.plano || "free";
  const isFreePlan = planoSlug === "free";

  const { data: config } = useQuery({
    queryKey: ["planos-config", planoSlug],
    queryFn: async () => {
      const { data } = await supabase
        .from("planos_config")
        .select("*")
        .eq("plano_slug", planoSlug)
        .maybeSingle();
      return (data as PlanConfig | null) ?? FREE_DEFAULTS;
    },
    staleTime: 5 * 60 * 1000,
  });

  return {
    config: config ?? FREE_DEFAULTS,
    isFreePlan,
    isPaid: !isFreePlan,
  };
}
