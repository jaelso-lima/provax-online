import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, validateOrigin, errorResponse, getResponseHeaders } from "../_shared/security-headers.ts";

serve(async (req) => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  const headers = getResponseHeaders();

  try {
    // CSRF check — public endpoint but still validate origin
    const originError = validateOrigin(req);
    if (originError) return errorResponse(originError, 403);

    const { email, fingerprint, user_agent } = await req.json();

    if (!email) {
      return errorResponse("Email obrigatório", 400);
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || req.headers.get("cf-connecting-ip") 
      || "unknown";

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: rateCheck } = await supabaseAdmin.rpc("check_registration_rate", {
      _ip: ip,
      _fingerprint: fingerprint || "",
    });

    if (rateCheck && !rateCheck.allowed) {
      await supabaseAdmin.from("registration_logs").insert({
        email,
        ip_address: ip,
        device_fingerprint: fingerprint || null,
        user_agent: user_agent || null,
        status: "blocked",
        blocked_reason: rateCheck.reason,
      });

      return new Response(JSON.stringify({ allowed: false, reason: rateCheck.reason }), { headers });
    }

    await supabaseAdmin.from("registration_logs").insert({
      email,
      ip_address: ip,
      device_fingerprint: fingerprint || null,
      user_agent: user_agent || null,
      status: "success",
    });

    return new Response(JSON.stringify({ allowed: true }), { headers });
  } catch (e) {
    console.error("check-registration error:", e);
    return errorResponse("Erro interno", 500);
  }
});
