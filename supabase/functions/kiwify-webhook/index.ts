import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const log = (step: string, details?: any) => {
  console.log(`[KIWIFY-WEBHOOK] ${step}`, details ? JSON.stringify(details) : "");
};

// Map Kiwify checkout links to plan slugs and periods
const CHECKOUT_MAP: Record<string, { slug: string; periodo: string }> = {
  "https://pay.kiwify.com.br/izSd5mz": { slug: "provax-x", periodo: "mensal" },
  "https://pay.kiwify.com.br/3hXCsif": { slug: "start", periodo: "mensal" },
  "https://pay.kiwify.com.br/5XRiyM1": { slug: "start", periodo: "semestral" },
  "https://pay.kiwify.com.br/ZQG1qpI": { slug: "start", periodo: "anual" },
  "https://pay.kiwify.com.br/3qht2r5": { slug: "pro", periodo: "mensal" },
  "https://pay.kiwify.com.br/Zajikxf": { slug: "pro", periodo: "semestral" },
  "https://pay.kiwify.com.br/TvMmz9F": { slug: "pro", periodo: "anual" },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    log("Received webhook", { order_status: body.order_status, event: body.webhook_event_type });

    const customerEmail = body.Customer?.email || body.customer?.email;
    const checkoutLink = body.checkout_link || body.Subscription?.checkout_link || "";
    const orderStatus = body.order_status;
    const webhookEvent = body.webhook_event_type || "";
    const orderId = body.order_id || body.subscription_id || "";
    const productName = body.Product?.product_name || body.product?.product_name || "";

    // Handle subscription cancellation
    if (webhookEvent === "subscription_canceled" || orderStatus === "refunded" || orderStatus === "chargedback") {
      if (!customerEmail) {
        log("No email for cancellation");
        return new Response(JSON.stringify({ received: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", customerEmail)
        .single();

      if (profile) {
        await supabase
          .from("subscriptions")
          .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
          .eq("user_id", profile.id)
          .eq("status", "active");

        await supabase.rpc("activate_plan_from_stripe", {
          _user_id: profile.id,
          _plan_slug: "free",
        });

        await supabase.from("audit_logs").insert({
          user_id: profile.id,
          acao: "KIWIFY_CANCELAMENTO",
          tabela: "subscriptions",
          detalhes: { email: customerEmail, event: webhookEvent, order_status: orderStatus },
        });

        log("Subscription cancelled", { email: customerEmail });
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only process paid/approved orders and subscription renewals
    if (orderStatus !== "paid" && webhookEvent !== "order_approved" && webhookEvent !== "subscription_renewed") {
      log("Ignoring event", { orderStatus, webhookEvent });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!customerEmail) {
      log("No customer email");
      return new Response(JSON.stringify({ error: "No email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Match plan by checkout link
    let matched = CHECKOUT_MAP[checkoutLink];

    // Fallback: try to match by amount
    if (!matched) {
      const amount = body.Commissions?.charge_amount || body.order_value || 0;
      const amountNum = typeof amount === "string" ? parseFloat(amount) : amount;
      log("Trying amount match", { amount: amountNum, checkoutLink });

      // Try matching by price
      const supabaseTemp = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: plans } = await supabaseTemp.from("plans").select("*").eq("ativo", true);

      for (const plan of plans || []) {
        if (Number(plan.preco_mensal) > 0 && Math.abs(Number(plan.preco_mensal) - amountNum) < 0.5) {
          matched = { slug: plan.slug, periodo: "mensal" };
          break;
        }
        if (Number(plan.preco_semestral) > 0 && Math.abs(Number(plan.preco_semestral) - amountNum) < 0.5) {
          matched = { slug: plan.slug, periodo: "semestral" };
          break;
        }
        if (Number(plan.preco_anual) > 0 && Math.abs(Number(plan.preco_anual) - amountNum) < 0.5) {
          matched = { slug: plan.slug, periodo: "anual" };
          break;
        }
      }
    }

    if (!matched) {
      log("No plan matched", { checkoutLink, productName });
      const supabaseLog = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabaseLog.from("audit_logs").insert({
        acao: "KIWIFY_SEM_PLANO",
        tabela: "subscriptions",
        detalhes: { email: customerEmail, checkout_link: checkoutLink, product: productName, order_id: orderId },
      });
      return new Response(JSON.stringify({ warning: "No plan matched" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find user
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", customerEmail)
      .single();

    if (profileError || !profile) {
      log("User not found", { email: customerEmail });
      await supabase.from("audit_logs").insert({
        acao: "KIWIFY_USUARIO_NAO_ENCONTRADO",
        tabela: "subscriptions",
        detalhes: { email: customerEmail, plan: matched.slug, order_id: orderId },
      });
      return new Response(
        JSON.stringify({ error: "User not found", email: customerEmail }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = profile.id;

    // Calculate expiration
    const now = new Date();
    if (matched.periodo === "mensal") {
      now.setMonth(now.getMonth() + 1);
    } else if (matched.periodo === "semestral") {
      now.setMonth(now.getMonth() + 6);
    } else {
      now.setFullYear(now.getFullYear() + 1);
    }
    const expiresAt = now.toISOString();

    // Get plan ID
    const { data: planData } = await supabase
      .from("plans")
      .select("id, nome")
      .eq("slug", matched.slug)
      .single();

    if (!planData) {
      log("Plan not found in DB", { slug: matched.slug });
      return new Response(JSON.stringify({ error: "Plan not found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Cancel existing active subscriptions
    await supabase
      .from("subscriptions")
      .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
      .eq("user_id", userId)
      .eq("status", "active");

    // Create new subscription
    await supabase.from("subscriptions").insert({
      user_id: userId,
      plan_id: planData.id,
      periodo: matched.periodo,
      status: "active",
      started_at: new Date().toISOString(),
      expires_at: expiresAt,
      origem: "kiwify",
      payment_gateway_id: orderId,
    });

    // Update profile plan
    await supabase.rpc("activate_plan_from_stripe", {
      _user_id: userId,
      _plan_slug: matched.slug,
    });

    // Audit log
    await supabase.from("audit_logs").insert({
      user_id: userId,
      acao: "PLANO_ATIVADO_KIWIFY",
      tabela: "subscriptions",
      detalhes: {
        plan: planData.nome,
        slug: matched.slug,
        periodo: matched.periodo,
        order_id: orderId,
        checkout_link: checkoutLink,
        expires_at: expiresAt,
      },
    });

    log("Plan activated", { email: customerEmail, plan: matched.slug, periodo: matched.periodo });

    return new Response(JSON.stringify({ success: true, plan: matched.slug }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    log("Error", { error: String(err) });
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
