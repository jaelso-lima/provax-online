import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, validateOrigin, errorResponse, getResponseHeaders } from "../_shared/security-headers.ts";

Deno.serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const headers = getResponseHeaders();

  try {
    // CSRF check
    const originError = validateOrigin(req);
    if (originError) return errorResponse(originError, 403);

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return errorResponse("Não autorizado", 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return errorResponse("Não autorizado", 401);
    }

    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .in("role", ["admin", "owner"])
      .maybeSingle();

    if (!role) {
      return errorResponse("Acesso negado", 403);
    }

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

        const unavailablePatterns = [
          "não está mais disponível", "nao esta mais disponivel",
          "produto indisponível", "produto indisponivel",
          "product not found", "page not found", "404",
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

    return new Response(JSON.stringify({ results }), { headers });
  } catch (err: any) {
    return errorResponse(err.message, 500);
  }
});
