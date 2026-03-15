import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Não autorizado" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "owner"])
      .maybeSingle();

    if (!role) {
      return new Response(JSON.stringify({ error: "Acesso negado" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all active plans with checkout links
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: plans, error } = await serviceClient
      .from("plans")
      .select("id, slug, nome, stripe_link_mensal, stripe_link_semestral, stripe_link_anual")
      .eq("ativo", true);

    if (error) throw error;

    const results: Record<string, { mensal?: string; semestral?: string; anual?: string }> = {};

    const checkLink = async (url: string): Promise<string> => {
      if (!url) return "sem_link";
      try {
        const resp = await fetch(url, {
          method: "GET",
          redirect: "follow",
          headers: { "User-Agent": "ProvaX-LinkChecker/1.0" },
        });
        const text = await resp.text();

        if (resp.status >= 400) return "indisponivel";

        // Cakto shows unavailable patterns when product is inactive
        const unavailablePatterns = [
          "não está mais disponível",
          "nao esta mais disponivel",
          "produto indisponível",
          "produto indisponivel",
          "product not found",
          "page not found",
          "404",
          "checkout não encontrado",
        ];

        const lowerText = text.toLowerCase();
        for (const pattern of unavailablePatterns) {
          if (lowerText.includes(pattern)) return "indisponivel";
        }

        return "ok";
      } catch {
        return "erro_conexao";
      }
    };

    // Check all links in parallel
    const checks: Promise<void>[] = [];

    for (const plan of plans || []) {
      results[plan.id] = {};
      const periods = [
        { key: "mensal" as const, link: plan.stripe_link_mensal },
        { key: "semestral" as const, link: plan.stripe_link_semestral },
        { key: "anual" as const, link: plan.stripe_link_anual },
      ];

      for (const { key, link } of periods) {
        checks.push(
          checkLink(link || "").then((status) => {
            results[plan.id][key] = status;
          })
        );
      }
    }

    await Promise.all(checks);

    return new Response(JSON.stringify({ results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
