import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const event = JSON.parse(body);

    // We handle checkout.session.completed from Stripe Payment Links
    if (event.type !== "checkout.session.completed") {
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const session = event.data.object;
    const customerEmail = session.customer_details?.email || session.customer_email;

    if (!customerEmail) {
      console.error("No customer email in session");
      return new Response(JSON.stringify({ error: "No email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get amount paid to match the plan
    const amountPaid = (session.amount_total || 0) / 100; // Convert from cents

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Find user by email
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .single();

    if (profileError || !profile) {
      console.error("User not found for email:", customerEmail, profileError);
      return new Response(
        JSON.stringify({ error: "User not found", email: customerEmail }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = profile.id;

    // Find which plan and period matches the amount
    const { data: plans } = await supabase.from("plans").select("*").eq("ativo", true);

    let matchedPlan: any = null;
    let matchedPeriodo = "mensal";

    for (const plan of plans || []) {
      if (Number(plan.preco_mensal) > 0 && Math.abs(Number(plan.preco_mensal) - amountPaid) < 0.5) {
        matchedPlan = plan;
        matchedPeriodo = "mensal";
        break;
      }
      if (Number(plan.preco_semestral) > 0 && Math.abs(Number(plan.preco_semestral) - amountPaid) < 0.5) {
        matchedPlan = plan;
        matchedPeriodo = "semestral";
        break;
      }
      if (Number(plan.preco_anual) > 0 && Math.abs(Number(plan.preco_anual) - amountPaid) < 0.5) {
        matchedPlan = plan;
        matchedPeriodo = "anual";
        break;
      }
    }

    if (!matchedPlan) {
      console.error("No plan matched for amount:", amountPaid);
      // Log it but don't fail — admin can manually activate
      await supabase.from("audit_logs").insert({
        user_id: userId,
        acao: "STRIPE_PAGAMENTO_SEM_PLANO",
        tabela: "subscriptions",
        detalhes: { email: customerEmail, amount: amountPaid, session_id: session.id },
      });
      return new Response(JSON.stringify({ warning: "No plan matched" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Calculate expiration
    let expiresAt: string;
    const now = new Date();
    if (matchedPeriodo === "mensal") {
      now.setMonth(now.getMonth() + 1);
    } else if (matchedPeriodo === "semestral") {
      now.setMonth(now.getMonth() + 6);
    } else {
      now.setFullYear(now.getFullYear() + 1);
    }
    expiresAt = now.toISOString();

    // Cancel existing active subscriptions
    await supabase
      .from("subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "active");

    // Create new subscription
    await supabase.from("subscriptions").insert({
      user_id: userId,
      plan_id: matchedPlan.id,
      periodo: matchedPeriodo,
      status: "active",
      started_at: new Date().toISOString(),
      expires_at: expiresAt,
      origem: "stripe",
      payment_gateway_id: session.id,
    });

    // Update profile plan via secure function
    await supabase.rpc("activate_plan_from_stripe", {
      _user_id: userId,
      _plan_slug: matchedPlan.slug,
    });

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: userId,
      acao: "PLANO_ATIVADO_STRIPE",
      tabela: "subscriptions",
      detalhes: {
        plan: matchedPlan.nome,
        slug: matchedPlan.slug,
        periodo: matchedPeriodo,
        amount: amountPaid,
        session_id: session.id,
        expires_at: expiresAt,
      },
    });

    console.log(`Plan ${matchedPlan.slug} activated for ${customerEmail} (${matchedPeriodo})`);

    return new Response(JSON.stringify({ success: true, plan: matchedPlan.slug }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});