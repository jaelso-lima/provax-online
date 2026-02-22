import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { email, fingerprint, user_agent } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Email obrigatório" }), { status: 400, headers: corsHeaders });
    }

    // Get client IP
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() 
      || req.headers.get("cf-connecting-ip") 
      || "unknown";

    // Use service role to bypass RLS
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check rate limits
    const { data: rateCheck } = await supabaseAdmin.rpc("check_registration_rate", {
      _ip: ip,
      _fingerprint: fingerprint || "",
    });

    if (rateCheck && !rateCheck.allowed) {
      // Log blocked attempt
      await supabaseAdmin.from("registration_logs").insert({
        email,
        ip_address: ip,
        device_fingerprint: fingerprint || null,
        user_agent: user_agent || null,
        status: "blocked",
        blocked_reason: rateCheck.reason,
      });

      return new Response(JSON.stringify({ 
        allowed: false, 
        reason: rateCheck.reason 
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Log successful registration attempt
    await supabaseAdmin.from("registration_logs").insert({
      email,
      ip_address: ip,
      device_fingerprint: fingerprint || null,
      user_agent: user_agent || null,
      status: "success",
    });

    return new Response(JSON.stringify({ allowed: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("check-registration error:", e);
    return new Response(JSON.stringify({ error: "Erro interno" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
