import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { handleCors, getResponseHeaders, corsHeaders } from "../_shared/security-headers.ts";

const log = (step: string, details?: any) => {
  console.log(`[CAKTO-WEBHOOK] ${step}`, details ? JSON.stringify(details) : "");
};

// Map Cakto checkout links to plan slugs and periods
// Premium = slug "start" (R$ 29,90/mês). Legacy links mantidos por segurança/retrocompatibilidade.
const CHECKOUT_MAP: Record<string, { slug: string; periodo: string }> = {
  "https://pay.cakto.com.br/7o62ahx_806491": { slug: "start", periodo: "mensal" }, // Premium R$ 29,90
  "https://pay.cakto.com.br/32a6gtd": { slug: "start", periodo: "mensal" },
  "https://pay.cakto.com.br/5589p3m": { slug: "start", periodo: "trimestral" },
  "https://pay.cakto.com.br/jicz7uh": { slug: "start", periodo: "anual" },
  // Legacy (planos desativados — fallback para Premium se houver pagamento)
  "https://pay.cakto.com.br/y9kys4g": { slug: "start", periodo: "mensal" },
  "https://pay.cakto.com.br/364vjre": { slug: "start", periodo: "trimestral" },
  "https://pay.cakto.com.br/ft7z9ar": { slug: "start", periodo: "anual" },
};

function createSupabaseAdmin() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );
}

async function handleCancellation(customerEmail: string, webhookEvent: string, orderStatus: string) {
  const supabase = createSupabaseAdmin();

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
      acao: "CAKTO_CANCELAMENTO",
      tabela: "subscriptions",
      detalhes: { email: customerEmail, event: webhookEvent, order_status: orderStatus },
    });

    log("Subscription cancelled", { email: customerEmail });
  }
}

async function handleActivation(customerEmail: string, matched: { slug: string; periodo: string }, orderId: string, checkoutLink: string) {
  const supabase = createSupabaseAdmin();

  // Find user
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", customerEmail)
    .single();

  if (profileError || !profile) {
    log("User not found", { email: customerEmail });
    await supabase.from("audit_logs").insert({
      acao: "CAKTO_USUARIO_NAO_ENCONTRADO",
      tabela: "subscriptions",
      detalhes: { email: customerEmail, plan: matched.slug, order_id: orderId },
    });
    return { error: "User not found", status: 404 };
  }

  const userId = profile.id;

  // Calculate expiration
  const now = new Date();
  if (matched.periodo === "mensal") {
    now.setMonth(now.getMonth() + 1);
  } else if (matched.periodo === "trimestral") {
    now.setMonth(now.getMonth() + 3);
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
    return { error: "Plan not found", status: 500 };
  }

  // Cancel existing active subscriptions
  await supabase
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "active");

  // Map trimestral to semestral for DB compatibility (column name)
  const dbPeriodo = matched.periodo === "trimestral" ? "semestral" : matched.periodo;

  // Create new subscription
  await supabase.from("subscriptions").insert({
    user_id: userId,
    plan_id: planData.id,
    periodo: dbPeriodo,
    status: "active",
    started_at: new Date().toISOString(),
    expires_at: expiresAt,
    origem: "cakto",
    payment_gateway_id: orderId,
  });

    // Update profile plan — normaliza slug Premium para "premium"
    const profileSlug = matched.slug === "start" ? "premium" : matched.slug;
    await supabase.rpc("activate_plan_from_stripe", {
      _user_id: userId,
      _plan_slug: profileSlug,
    });

  // Audit log
  await supabase.from("audit_logs").insert({
    user_id: userId,
    acao: "PLANO_ATIVADO_CAKTO",
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
  return { success: true };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    log("Received webhook", body);

    // Cakto webhook payload parsing
    const customerEmail = body.Customer?.email || body.customer?.email || body.email || "";
    const checkoutLink = body.checkout_link || body.Subscription?.checkout_link || body.product_url || "";
    const orderStatus = body.order_status || body.status || "";
    const webhookEvent = body.webhook_event_type || body.event || "";
    const orderId = body.order_id || body.subscription_id || body.transaction_id || "";
    const productName = body.Product?.product_name || body.product?.product_name || body.product_name || "";

    // Handle subscription cancellation
    if (webhookEvent === "subscription_canceled" || webhookEvent === "refund" || orderStatus === "refunded" || orderStatus === "chargedback") {
      if (customerEmail) {
        await handleCancellation(customerEmail, webhookEvent, orderStatus);
      }
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Only process paid/approved orders
    if (orderStatus !== "paid" && orderStatus !== "approved" && webhookEvent !== "order_approved" && webhookEvent !== "subscription_renewed") {
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

    // Match plan by checkout link (exact match)
    let matched = CHECKOUT_MAP[checkoutLink];

    // Strategy 2: Partial match on checkout link (handles coupon params, query strings)
    if (!matched && checkoutLink) {
      const cleanLink = checkoutLink.split("?")[0].split("#")[0];
      matched = CHECKOUT_MAP[cleanLink];

      // Try matching if the webhook link contains one of our known links
      if (!matched) {
        for (const [knownLink, plan] of Object.entries(CHECKOUT_MAP)) {
          if (checkoutLink.includes(knownLink) || knownLink.includes(cleanLink)) {
            matched = plan;
            break;
          }
        }
      }
    }

    // Strategy 3: Match by product name keywords
    if (!matched && productName) {
      const nameLower = productName.toLowerCase();
      if (nameLower.includes("pro")) {
        // Determine period from product name or default to mensal
        if (nameLower.includes("anual") || nameLower.includes("12")) {
          matched = { slug: "pro", periodo: "anual" };
        } else if (nameLower.includes("trimestral") || nameLower.includes("3 meses")) {
          matched = { slug: "pro", periodo: "trimestral" };
        } else {
          matched = { slug: "pro", periodo: "mensal" };
        }
      } else if (nameLower.includes("start")) {
        if (nameLower.includes("anual") || nameLower.includes("12")) {
          matched = { slug: "start", periodo: "anual" };
        } else if (nameLower.includes("trimestral") || nameLower.includes("3 meses")) {
          matched = { slug: "start", periodo: "trimestral" };
        } else {
          matched = { slug: "start", periodo: "mensal" };
        }
      } else if (nameLower.includes("provax")) {
        matched = { slug: "provax-x", periodo: "mensal" };
      }
      if (matched) log("Matched by product name", { productName, matched });
    }

    // Strategy 4: Fallback - match by original amount (before discount)
    if (!matched) {
      const amount = body.Commissions?.charge_amount || body.Commissions?.product_base_price || body.order_value || body.amount || 0;
      const amountNum = typeof amount === "string" ? parseFloat(amount) : amount;
      log("Trying amount match", { amount: amountNum, checkoutLink });

      const supabase = createSupabaseAdmin();
      const { data: plans } = await supabase.from("plans").select("*").eq("ativo", true);

      for (const plan of plans || []) {
        if (Number(plan.preco_mensal) > 0 && Math.abs(Number(plan.preco_mensal) - amountNum) < 0.5) {
          matched = { slug: plan.slug, periodo: "mensal" };
          break;
        }
        if (Number(plan.preco_semestral) > 0 && Math.abs(Number(plan.preco_semestral) - amountNum) < 0.5) {
          matched = { slug: plan.slug, periodo: "trimestral" };
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
      const supabase = createSupabaseAdmin();
      await supabase.from("audit_logs").insert({
        acao: "CAKTO_SEM_PLANO",
        tabela: "subscriptions",
        detalhes: { email: customerEmail, checkout_link: checkoutLink, product: productName, order_id: orderId },
      });
      return new Response(JSON.stringify({ warning: "No plan matched" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const result = await handleActivation(customerEmail, matched, orderId, checkoutLink);

    if (result.error) {
      return new Response(JSON.stringify({ error: result.error }), {
        status: result.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
