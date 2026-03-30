import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { corsHeaders } from "../_shared/security-headers.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();
    const event = JSON.parse(body);

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

    const amountPaid = (session.amount_total || 0) / 100;

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
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = profile.id;
    const { data: plans } = await supabase.from("plans").select("*").eq("ativo", true);

    let matchedPlan: any = null;
    let matchedPeriodo = "mensal";

    // Strategy 1: Use Stripe API to get original price (works with coupons)
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (stripeKey) {
      try {
        const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
        const fullSession = await stripe.checkout.sessions.retrieve(session.id, {
          expand: ["line_items.data.price"],
        });

        const lineItem = fullSession.line_items?.data?.[0];
        const originalUnitAmount = lineItem?.price?.unit_amount;
        const priceId = lineItem?.price?.id;

        console.log("Stripe line item:", { priceId, originalUnitAmount, amountPaid });

        if (originalUnitAmount) {
          const originalPrice = originalUnitAmount / 100;

          // Match by original price (before discount)
          for (const plan of plans || []) {
            if (Number(plan.preco_mensal) > 0 && Math.abs(Number(plan.preco_mensal) - originalPrice) < 0.5) {
              matchedPlan = plan;
              matchedPeriodo = "mensal";
              break;
            }
            if (Number(plan.preco_semestral) > 0 && Math.abs(Number(plan.preco_semestral) - originalPrice) < 0.5) {
              matchedPlan = plan;
              matchedPeriodo = "semestral";
              break;
            }
            if (Number(plan.preco_anual) > 0 && Math.abs(Number(plan.preco_anual) - originalPrice) < 0.5) {
              matchedPlan = plan;
              matchedPeriodo = "anual";
              break;
            }
          }
        }

        // Strategy 2: Match by Stripe Payment Link ID
        if (!matchedPlan && session.payment_link) {
          const paymentLinkId = session.payment_link;
          for (const plan of plans || []) {
            if (plan.stripe_link_mensal && plan.stripe_link_mensal.includes(paymentLinkId)) {
              matchedPlan = plan;
              matchedPeriodo = "mensal";
              break;
            }
            if (plan.stripe_link_semestral && plan.stripe_link_semestral.includes(paymentLinkId)) {
              matchedPlan = plan;
              matchedPeriodo = "semestral";
              break;
            }
            if (plan.stripe_link_anual && plan.stripe_link_anual.includes(paymentLinkId)) {
              matchedPlan = plan;
              matchedPeriodo = "anual";
              break;
            }
          }
        }
      } catch (stripeErr) {
        console.error("Stripe API error, falling back to amount match:", stripeErr);
      }
    }

    // Strategy 3: Fallback - match by paid amount (original logic)
    if (!matchedPlan) {
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
    }

    if (!matchedPlan) {
      console.error("No plan matched for amount:", amountPaid);
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
    const now = new Date();
    if (matchedPeriodo === "mensal") {
      now.setMonth(now.getMonth() + 1);
    } else if (matchedPeriodo === "semestral") {
      now.setMonth(now.getMonth() + 6);
    } else {
      now.setFullYear(now.getFullYear() + 1);
    }
    const expiresAt = now.toISOString();

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

    // Update profile plan
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
        amount_paid: amountPaid,
        had_coupon: amountPaid !== ((session.amount_subtotal || 0) / 100),
        session_id: session.id,
        expires_at: expiresAt,
      },
    });

    console.log(`Plan ${matchedPlan.slug} activated for ${customerEmail} (${matchedPeriodo}, paid: ${amountPaid})`);

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
