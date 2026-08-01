const Stripe = require("stripe");
const { getStore } = require("@netlify/blobs");
const { stripeConfig } = require("./_config");
const { json, logSafe, safeError } = require("./_security");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

exports.handler = async (event) => {
  const signature = event.headers["stripe-signature"];
  if (!signature) return json(400, { error: "Missing Stripe signature" });

  let stripeEvent;
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body || "", "base64") : event.body;

  try {
    const config = stripeConfig();
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
    const existing = raw.find((member) => member.email === normalized);
    const nextMember = {
      name: existing?.name || normalized.split("@")[0],
      email: normalized,
      subscription: patch.subscription || existing?.subscription || "free",
      accountType: patch.subscription === "active" ? "paid" : existing?.accountType || "free",
      stripeCustomerId: patch.stripeCustomerId || existing?.stripeCustomerId,
      signedUpAt: existing?.signedUpAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [nextMember, ...raw.filter((member) => member.email !== normalized)];
    await members.setJSON("accounts", next);
  };

  if (stripeEvent.type === "checkout.session.completed") {
    const session = stripeEvent.data.object;
    const email = session.customer_details?.email || session.customer_email || session.metadata?.email || session.client_reference_id;
    if (session.mode !== "subscription" || !session.customer) return;
    await upsert(email, {
      subscription: "active",
      stripeCustomerId: session.customer,
    });
  }

  if (stripeEvent.type === "customer.subscription.updated") {
    const subscription = stripeEvent.data.object;
    const customer = await stripe.customers.retrieve(subscription.customer);
    await upsert(customer.email || subscription.metadata?.email, {
      subscription: ["active", "trialing"].includes(subscription.status) ? "active" : subscription.status,
      stripeCustomerId: customer.id,
    });
  }

  if (stripeEvent.type === "customer.subscription.deleted") {
    const subscription = stripeEvent.data.object;
    const customer = await stripe.customers.retrieve(subscription.customer);
    await upsert(customer.email || subscription.metadata?.email, {
      subscription: "cancelled",
      stripeCustomerId: customer.id,
    });
  }

  if (stripeEvent.type === "invoice.payment_failed") {
    const invoice = stripeEvent.data.object;
    const customer = await stripe.customers.retrieve(invoice.customer);
    await upsert(customer.email, {
      subscription: "past_due",
      stripeCustomerId: customer.id,
    });
  }

  if (stripeEvent.type === "charge.refunded" || stripeEvent.type === "charge.dispute.created") {
    const charge = stripeEvent.data.object;
    if (!charge.customer) return;
    const customer = await stripe.customers.retrieve(charge.customer);
    await upsert(customer.email, {
      subscription: "review",
      stripeCustomerId: customer.id,
    });
  }
}
