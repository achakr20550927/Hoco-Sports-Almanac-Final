const Stripe = require("stripe");
const { getStore } = require("@netlify/blobs");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

exports.handler = async (event) => {
  const signature = event.headers["stripe-signature"];
  let stripeEvent;
  const rawBody = event.isBase64Encoded ? Buffer.from(event.body || "", "base64") : event.body;

  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    return { statusCode: 400, body: `Webhook Error: ${error.message}` };
  }

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

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};
