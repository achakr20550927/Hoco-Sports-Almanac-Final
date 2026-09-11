const Stripe = require("stripe");
const { connectLambda, getStore } = require("@netlify/blobs");
const { webhookConfig } = require("./_config");
const { json, logSafe, safeError } = require("./_security");
const { periodEnd, planOf, subscriptionId: invoiceSubscriptionId } = require("./_stripe-subscription");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function timestampToIso(timestamp) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : undefined;
}

function normalizePlan(plan, subscription = "free") {
  const value = String(plan || "").trim().toLowerCase();
  if (["monthly", "annual"].includes(value)) return value;
  return subscription === "active" ? "monthly" : "free";
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "Method not allowed" });
  connectLambda(event);
  const signature = event.headers?.["stripe-signature"];
  if (!signature) return json(400, { error: "Missing Stripe signature" });

  let stripeEvent;
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body || "", "base64") : event.body;

  try {
    const config = webhookConfig();
    const stripe = new Stripe(config.secretKey);
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      config.webhookSecret
    );

    const events = getStore("stripe-events");
    const processed = (await events.get("processed", { type: "json" })) || {};
    if (processed[stripeEvent.id]) {
      logSafe("stripe.webhook.duplicate", { eventId: stripeEvent.id, type: stripeEvent.type });
      return json(200, { received: true, duplicate: true });
    }

    await handleStripeEvent(stripe, stripeEvent);
    processed[stripeEvent.id] = {
      type: stripeEvent.type,
      processedAt: new Date().toISOString(),
    };
    const entries = Object.entries(processed).slice(-500);
    await events.setJSON("processed", Object.fromEntries(entries));
    logSafe("stripe.webhook.processed", { eventId: stripeEvent.id, type: stripeEvent.type });
    return json(200, { received: true });
  } catch (error) {
    logSafe("stripe.webhook.error", { message: error.message });
    return json(error.statusCode || 400, safeError("Webhook could not be processed."));
  }
};

async function handleStripeEvent(stripe, stripeEvent) {
  const members = getStore("members");
  const raw = (await members.get("accounts", { type: "json" })) || [];

  const upsert = async (email, patch) => {
    if (!email) return;
    const normalized = normalizeEmail(email);
    const existing = raw.find((member) => normalizeEmail(member.email) === normalized);
    if (existing?.stripeSubscriptionId && patch.stripeSubscriptionId && existing.stripeSubscriptionId !== patch.stripeSubscriptionId && patch.subscription !== "active") return;
    if (existing?.lastStripeEventAt > stripeEvent.created) return;
    const subscriptionStatus = patch.subscription || existing?.subscription || "free";
    const isAdmin = existing?.accountType === "admin";
    const has = (key) => Object.prototype.hasOwnProperty.call(patch, key);
    const nextMember = {
      ...existing,
      name: existing?.name || normalized.split("@")[0],
      email: normalized,
      plan: normalizePlan(patch.plan || existing?.plan, subscriptionStatus),
      subscription: subscriptionStatus,
      accountType: isAdmin ? "admin" : subscriptionStatus === "active" ? "paid" : "free",
      stripeCustomerId: patch.stripeCustomerId || existing?.stripeCustomerId,
      stripeSubscriptionId: patch.stripeSubscriptionId || existing?.stripeSubscriptionId,
      cancelAtPeriodEnd: subscriptionStatus === "active" && has("cancelAtPeriodEnd") ? Boolean(patch.cancelAtPeriodEnd) : Boolean(existing?.cancelAtPeriodEnd && subscriptionStatus === "active"),
      currentPeriodEnd: has("currentPeriodEnd") ? patch.currentPeriodEnd : existing?.currentPeriodEnd,
      signedUpAt: existing?.signedUpAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastStripeEventAt: stripeEvent.created,
    };
    const next = [nextMember, ...raw.filter((member) => normalizeEmail(member.email) !== normalized)];
    await members.setJSON("accounts", next);
  };

  if (["checkout.session.completed", "checkout.session.async_payment_succeeded"].includes(stripeEvent.type)) {
    const session = stripeEvent.data.object;
    const email = session.metadata?.email || session.client_reference_id || session.customer_email || session.customer_details?.email;
    if (session.mode !== "subscription" || !session.customer) return;
    if (!["paid", "no_payment_required"].includes(session.payment_status)) return;
    const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;
    const patch = {
      plan: session.metadata?.plan,
      subscription: "active",
      stripeCustomerId: session.customer,
      stripeSubscriptionId: subscriptionId,
      cancelAtPeriodEnd: false,
    };
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      patch.plan = planOf(subscription, patch.plan);
      patch.subscription = ["active", "trialing"].includes(subscription.status) ? "active" : subscription.status;
      patch.cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
      patch.currentPeriodEnd = periodEnd(subscription);
    }
    await upsert(email, patch);
  }

  if (["customer.subscription.created", "customer.subscription.updated"].includes(stripeEvent.type)) {
    const subscription = stripeEvent.data.object;
    const customer = await stripe.customers.retrieve(subscription.customer);
    await upsert(subscription.metadata?.email || raw.find((member) => member.stripeCustomerId === customer.id)?.email || customer.email, {
      subscription: ["active", "trialing"].includes(subscription.status) ? "active" : subscription.status,
      plan: ["active", "trialing"].includes(subscription.status) ? planOf(subscription) : "free",
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
      cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
      currentPeriodEnd: periodEnd(subscription),
    });
  }

  if (stripeEvent.type === "customer.subscription.deleted") {
    const subscription = stripeEvent.data.object;
    const customer = await stripe.customers.retrieve(subscription.customer);
    await upsert(subscription.metadata?.email || raw.find((member) => member.stripeCustomerId === customer.id)?.email || customer.email, {
      subscription: "cancelled",
      plan: "free",
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscription.id,
      cancelAtPeriodEnd: false,
      currentPeriodEnd: periodEnd(subscription),
    });
  }

  if (stripeEvent.type === "invoice.payment_failed") {
    const invoice = stripeEvent.data.object;
    if (!invoiceSubscriptionId(invoice)) return;
    const customer = await stripe.customers.retrieve(invoice.customer);
    await upsert(customer.email, {
      subscription: "past_due",
      plan: "free",
      stripeCustomerId: customer.id,
      stripeSubscriptionId: invoiceSubscriptionId(invoice),
    });
  }

  if (["invoice.payment_succeeded", "invoice.paid"].includes(stripeEvent.type)) {
    const invoice = stripeEvent.data.object;
    const customer = await stripe.customers.retrieve(invoice.customer);
    let plan = invoice.subscription_details?.metadata?.plan || invoice.parent?.subscription_details?.metadata?.plan;
    let subscriptionId = invoiceSubscriptionId(invoice);
    if (!subscriptionId) return;
    let currentPeriodEnd;
    let cancelAtPeriodEnd = false;
    if (subscriptionId) {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId);
      if (!["active", "trialing"].includes(subscription.status)) return;
      plan = planOf(subscription, plan);
      currentPeriodEnd = periodEnd(subscription);
      cancelAtPeriodEnd = Boolean(subscription.cancel_at_period_end);
    }
    await upsert(raw.find((member) => member.stripeCustomerId === customer.id)?.email || customer.email, {
      subscription: "active",
      plan,
      stripeCustomerId: customer.id,
      stripeSubscriptionId: subscriptionId,
      cancelAtPeriodEnd,
      currentPeriodEnd,
    });
  }

  if (stripeEvent.type === "charge.refunded" || stripeEvent.type === "charge.dispute.created") {
    const charge = stripeEvent.data.object;
    if (!charge.customer) return;
    const customer = await stripe.customers.retrieve(charge.customer);
    await upsert(customer.email, {
      subscription: "review",
      plan: "free",
      stripeCustomerId: customer.id,
    });
  }
}
