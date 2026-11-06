import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@18.5.0";

// CORS mínimo (a Stripe chama servidor a servidor; isto só atende o preflight).
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

// Dias de tolerância depois do fim do período, para a cobrança da renovação chegar.
const GRACE_DAYS = 2;

// Eventos que este webhook trata. Os demais são ignorados com 200.
const HANDLED = new Set([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "invoice.paid",
  "invoice.payment_failed",
  "customer.subscription.deleted",
]);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

function addPeriod(base: Date, periodo: string): Date {
  const d = new Date(base);
  if (periodo === "mensal") d.setMonth(d.getMonth() + 1);
  else if (periodo === "semestral") d.setMonth(d.getMonth() + 6);
  else d.setFullYear(d.getFullYear() + 1);
  return d;
}

function addDays(base: Date, days: number): Date {
  return new Date(base.getTime() + days * 86400000);
}

function idOf(value: any): string | null {
  if (!value) return null;
  return typeof value === "string" ? value : value.id || null;
}

// O ID da assinatura mudou de lugar entre versões da API da Stripe.
function subscriptionIdFromInvoice(invoice: any): string | null {
  return idOf(invoice.subscription) || idOf(invoice.parent?.subscription_details?.subscription);
}

async function audit(supabase: any, userId: string | null, acao: string, detalhes: Record<string, unknown>) {
  try {
    await supabase.from("audit_logs").insert({ user_id: userId, acao, tabela: "subscriptions", detalhes });
  } catch (e) {
    console.error("audit_logs falhou:", e);
  }
}

async function findRowBySubscription(supabase: any, subscriptionId: string) {
  const { data } = await supabase
    .from("subscriptions")
    .select("id, user_id, plan_id, periodo, status, expires_at")
    .eq("payment_gateway_id", subscriptionId)
    .eq("origem", "stripe")
    .order("started_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data || null;
}

// Descobre a qual plano/período do ProvaX o pagamento corresponde.
async function matchPlan(session: any, plans: any[], stripe: any, amountPaid: number) {
  let matchedPlan: any = null;
  let matchedPeriodo = "mensal";

  const byPrice = (price: number) => {
    for (const plan of plans) {
      if (Number(plan.preco_mensal) > 0 && Math.abs(Number(plan.preco_mensal) - price) < 0.5) return { plan, periodo: "mensal" };
      if (Number(plan.preco_semestral) > 0 && Math.abs(Number(plan.preco_semestral) - price) < 0.5) return { plan, periodo: "semestral" };
      if (Number(plan.preco_anual) > 0 && Math.abs(Number(plan.preco_anual) - price) < 0.5) return { plan, periodo: "anual" };
    }
    return null;
  };

  // 1) Preço original do item (funciona mesmo com cupom).
  try {
    const fullSession = await stripe.checkout.sessions.retrieve(session.id, { expand: ["line_items.data.price"] });
    const lineItem = fullSession.line_items?.data?.[0];
    const originalUnitAmount = lineItem?.price?.unit_amount;
    console.log("Stripe line item:", { priceId: lineItem?.price?.id, originalUnitAmount, amountPaid });
    if (originalUnitAmount) {
      const hit = byPrice(originalUnitAmount / 100);
      if (hit) {
        matchedPlan = hit.plan;
        matchedPeriodo = hit.periodo;
      }
    }

    // 2) Link de pagamento.
    if (!matchedPlan && session.payment_link) {
      const paymentLinkId = session.payment_link;
      for (const plan of plans) {
        if (plan.stripe_link_mensal && plan.stripe_link_mensal.includes(paymentLinkId)) { matchedPlan = plan; matchedPeriodo = "mensal"; break; }
        if (plan.stripe_link_semestral && plan.stripe_link_semestral.includes(paymentLinkId)) { matchedPlan = plan; matchedPeriodo = "semestral"; break; }
        if (plan.stripe_link_anual && plan.stripe_link_anual.includes(paymentLinkId)) { matchedPlan = plan; matchedPeriodo = "anual"; break; }
      }
    }
  } catch (stripeErr) {
    console.error("Erro na API da Stripe, usando o valor pago:", stripeErr);
  }

  // 3) Valor efetivamente pago.
  if (!matchedPlan) {
    const hit = byPrice(amountPaid);
    if (hit) {
      matchedPlan = hit.plan;
      matchedPeriodo = hit.periodo;
    }
  }

  return { matchedPlan, matchedPeriodo };
}

// Primeiro pagamento (assinatura ou pagamento único).
async function handleCheckout(session: any, supabase: any, stripe: any) {
  // Só ativa quando o dinheiro entrou (ou o valor foi zerado por cupom).
  if (session.payment_status !== "paid" && session.payment_status !== "no_payment_required") {
    console.log("Pagamento ainda não concluído; aguardando.", { session: session.id, status: session.payment_status });
    return json({ received: true, waiting_payment: true });
  }

  const customerEmail = session.customer_details?.email || session.customer_email;
  if (!customerEmail) {
    console.error("Sessão sem e-mail do cliente:", session.id);
    return json({ received: true, ignored: "no_email" });
  }

  const amountPaid = (session.amount_total || 0) / 100;
  const { data: plans } = await supabase.from("plans").select("*").eq("ativo", true);

  const { matchedPlan, matchedPeriodo } = await matchPlan(session, plans || [], stripe, amountPaid);

  const { data: profile } = await supabase.from("profiles").select("id").eq("email", customerEmail).maybeSingle();

  if (!matchedPlan) {
    // Provavelmente é de outro produto que usa a mesma conta Stripe: ignora sem reenvio.
    console.warn("Nenhum plano do ProvaX corresponde a este pagamento (ignorado).", { session: session.id, amountPaid });
    if (profile) await audit(supabase, profile.id, "STRIPE_PAGAMENTO_SEM_PLANO", { email: customerEmail, amount: amountPaid, session_id: session.id });
    return json({ received: true, ignored: "no_plan_match" });
  }

  if (!profile) {
    // Compra do ProvaX, mas o e-mail ainda não tem conta: 404 faz a Stripe reenviar nos próximos dias.
    console.error("Usuário não encontrado para o e-mail:", customerEmail);
    return json({ error: "User not found", email: customerEmail }, 404);
  }

  const userId = profile.id;
  const subscriptionId = idOf(session.subscription);
  const gatewayKey = subscriptionId || session.id;

  // Idempotência: se a Stripe reenviar o mesmo evento, não duplica.
  const { data: existing } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("payment_gateway_id", gatewayKey)
    .eq("origem", "stripe")
    .limit(1);
  if (existing && existing.length > 0) {
    console.log("Evento repetido, já processado:", gatewayKey);
    return json({ received: true, duplicate: true });
  }

  // Validade: para assinatura, o fim do período informado pela Stripe (+ tolerância).
  let expiresAt: Date;
  if (subscriptionId) {
    try {
      const sub: any = await stripe.subscriptions.retrieve(subscriptionId);
      const endSec = sub.current_period_end ?? sub.items?.data?.[0]?.current_period_end;
      expiresAt = endSec
        ? addDays(new Date(endSec * 1000), GRACE_DAYS)
        : addDays(addPeriod(new Date(), matchedPeriodo), GRACE_DAYS);
    } catch (subErr) {
      console.error("Não consegui ler a assinatura na Stripe; usando o período do plano:", subErr);
      expiresAt = addDays(addPeriod(new Date(), matchedPeriodo), GRACE_DAYS);
    }
  } else {
    expiresAt = addPeriod(new Date(), matchedPeriodo);
  }

  // Cancela assinaturas ativas anteriores deste usuário (troca de plano).
  await supabase
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "active");

  await supabase.from("subscriptions").insert({
    user_id: userId,
    plan_id: matchedPlan.id,
    periodo: matchedPeriodo,
    status: "active",
    started_at: new Date().toISOString(),
    expires_at: expiresAt.toISOString(),
    origem: "stripe",
    payment_gateway_id: gatewayKey,
  });

  await supabase.rpc("activate_plan_from_stripe", { _user_id: userId, _plan_slug: matchedPlan.slug });

  await audit(supabase, userId, "PLANO_ATIVADO_STRIPE", {
    plan: matchedPlan.nome,
    slug: matchedPlan.slug,
    periodo: matchedPeriodo,
    amount_paid: amountPaid,
    had_coupon: amountPaid !== (session.amount_subtotal || 0) / 100,
    session_id: session.id,
    subscription_id: subscriptionId,
    recorrente: !!subscriptionId,
    expires_at: expiresAt.toISOString(),
  });

  console.log("Plano " + matchedPlan.slug + " ativado para " + customerEmail + " (" + matchedPeriodo + ", pago: " + amountPaid + ")");
  return json({ success: true, plan: matchedPlan.slug });
}

// Renovação mensal/semestral/anual de uma assinatura.
async function handleInvoicePaid(invoice: any, supabase: any) {
  const subscriptionId = subscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return json({ received: true, ignored: "not_a_subscription_invoice" });

  const row = await findRowBySubscription(supabase, subscriptionId);
  if (!row) return json({ received: true, ignored: "subscription_not_tracked" });

  // Troca de plano: a assinatura antiga foi substituída, não reativa.
  if (row.status === "cancelled") {
    console.warn("Renovação de uma assinatura já substituída; ignorada:", subscriptionId);
    return json({ received: true, ignored: "row_cancelled" });
  }

  // A primeira fatura já foi tratada pelo checkout.
  if (invoice.billing_reason === "subscription_create") {
    return json({ received: true, ignored: "first_invoice" });
  }

  const current = row.expires_at ? new Date(row.expires_at) : new Date(0);
  const lineEnd = invoice.lines?.data?.[0]?.period?.end;
  const newExpiry = lineEnd
    ? addDays(new Date(lineEnd * 1000), GRACE_DAYS)
    : addPeriod(new Date(Math.max(Date.now(), current.getTime())), row.periodo);

  // Idempotência: se já está estendido, não faz nada.
  if (row.status === "active" && newExpiry.getTime() <= current.getTime()) {
    return json({ received: true, already_applied: true });
  }

  await supabase
    .from("subscriptions")
    .update({ status: "active", expires_at: newExpiry.toISOString(), cancelled_at: null })
    .eq("id", row.id);

  const { data: planData } = await supabase.from("plans").select("slug, nome").eq("id", row.plan_id).maybeSingle();
  if (planData?.slug) {
    await supabase.rpc("activate_plan_from_stripe", { _user_id: row.user_id, _plan_slug: planData.slug });
  }

  await audit(supabase, row.user_id, "STRIPE_RENOVACAO", {
    subscription_id: subscriptionId,
    invoice_id: invoice.id,
    expires_at: newExpiry.toISOString(),
  });

  console.log("Assinatura " + subscriptionId + " renovada até " + newExpiry.toISOString());
  return json({ success: true, renewed: true });
}

// Assinatura encerrada na Stripe. Mantém o acesso até o fim do período pago e deixa
// o próprio sistema expirar (só assinaturas com status "active" são expiradas pelo banco).
async function handleSubscriptionDeleted(subscription: any, supabase: any) {
  const subscriptionId = idOf(subscription);
  if (!subscriptionId) return json({ received: true, ignored: "no_id" });

  const row = await findRowBySubscription(supabase, subscriptionId);
  if (!row) return json({ received: true, ignored: "subscription_not_tracked" });

  const endedSec = subscription.ended_at || subscription.canceled_at;
  const endedAt = endedSec ? new Date(endedSec * 1000) : new Date();
  const current = row.expires_at ? new Date(row.expires_at) : endedAt;

  // Nunca estende; só encurta (tira a tolerância) quando a assinatura realmente acabou.
  if (row.status === "active" && endedAt.getTime() < current.getTime()) {
    await supabase.from("subscriptions").update({ expires_at: endedAt.toISOString() }).eq("id", row.id);
  }

  await audit(supabase, row.user_id, "STRIPE_ASSINATURA_CANCELADA", {
    subscription_id: subscriptionId,
    encerrada_em: endedAt.toISOString(),
    acesso_ate: (row.status === "active" && endedAt.getTime() < current.getTime() ? endedAt : current).toISOString(),
  });

  return json({ success: true, cancelled: true });
}

// Falha na cobrança da renovação: só registra (a Stripe tenta de novo; sem pagamento, o acesso expira).
async function handlePaymentFailed(invoice: any, supabase: any) {
  const subscriptionId = subscriptionIdFromInvoice(invoice);
  if (!subscriptionId) return json({ received: true, ignored: "not_a_subscription_invoice" });

  const row = await findRowBySubscription(supabase, subscriptionId);
  if (!row) return json({ received: true, ignored: "subscription_not_tracked" });

  await audit(supabase, row.user_id, "STRIPE_PAGAMENTO_FALHOU", {
    subscription_id: subscriptionId,
    invoice_id: invoice.id,
    tentativa: invoice.attempt_count ?? null,
    proxima_tentativa: invoice.next_payment_attempt ? new Date(invoice.next_payment_attempt * 1000).toISOString() : null,
  });
  return json({ received: true, logged: true });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.text();

    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const sigHeader = req.headers.get("stripe-signature");

    // Sem segredo configurado, recusa (nunca aceita requisição sem assinatura).
    if (!webhookSecret || !stripeKey) {
      console.error("STRIPE_WEBHOOK_SECRET ou STRIPE_SECRET_KEY não configurado");
      return json({ error: "Webhook não configurado" }, 500);
    }
    if (!sigHeader) {
      return json({ error: "Missing signature" }, 401);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    let event: any;
    try {
      event = await stripe.webhooks.constructEventAsync(body, sigHeader, webhookSecret);
    } catch (err) {
      console.error("Assinatura da Stripe inválida:", err);
      return json({ error: "Invalid signature" }, 400);
    }

    if (!HANDLED.has(event.type)) {
      return json({ received: true });
    }

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        return await handleCheckout(event.data.object, supabase, stripe);
      case "invoice.paid":
        return await handleInvoicePaid(event.data.object, supabase);
      case "customer.subscription.deleted":
        return await handleSubscriptionDeleted(event.data.object, supabase);
      case "invoice.payment_failed":
        return await handlePaymentFailed(event.data.object, supabase);
      default:
        return json({ received: true });
    }
  } catch (err) {
    console.error("Erro no webhook:", err);
    return json({ error: String(err) }, 500);
  }
});
