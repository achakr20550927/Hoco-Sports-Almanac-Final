const Stripe = require("stripe");
const { connectLambda, getStore } = require("@netlify/blobs");
const { getUserEmail } = require("./_admin");
const { required } = require("./_config");
const { rateLimit } = require("./_rate-limit");
const { json, safeError } = require("./_security");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePlan(plan) {
  const value = String(plan || "").trim().toLowerCase();
  return ["monthly", "annual"].includes(value) ? value : "monthly";
}

function timestampToIso(timestamp) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : undefined;
}

function publicMember(member) {
  return {
    name: member.name,
    email: member.email,
    plan: member.plan || (member.subscription === "active" ? "monthly" : "free"),
    subscription: member.subscription || "free",
    accountType: member.accountType || (member.subscription === "active" ? "paid" : "free"),
    stripeCustomerId: member.stripeCustomerId,
    stripeSubscriptionId: member.stripeSubscriptionId,
    cancelAtPeriodEnd: Boolean(member.cancelAtPeriodEnd),
    currentPeriodEnd: member.currentPeriodEnd,
    signedUpAt: member.signedUpAt,
    updatedAt: member.updatedAt,
  };
}

exports.handler = async (event, context) => {
  connectLambda(event);
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const limited = rateLimit(event, { key: "stripe:confirm", limit: 12, windowMs: 60_000 });
  if (limited.limited) return json(429, { error: "Too many requests" }, { "retry-after": String(limited.retryAfter) });

  const { sessionId, email } = JSON.parse(event.body || "{}");
  const normalizedEmail = normalizeEmail(getUserEmail(event, context) || email);
  if (!normalizedEmail || !sessionId) return json(400, { error: "Checkout session and email are required." });

  try {
    const stripe = new Stripe(required("STRIPE_SECRET_KEY"));
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["subscription"],
    });
    const sessionEmail = normalizeEmail(session.customer_details?.email || session.customer_email || session.metadata?.email || session.client_reference_id);
    if (sessionEmail !== normalizedEmail) {
      return json(403, { error: "Checkout session does not match this account." });
    }
    if (session.mode !== "subscription" || session.payment_status !== "paid") {
      return json(400, { error: "Checkout session is not a paid subscription." });
    }

    const subscription = session.subscription;
    const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id;
    const plan = normalizePlan(session.metadata?.plan || subscription?.metadata?.plan);
    const store = getStore("members");
    const members = (await store.get("accounts", { type: "json" })) || [];
    const existing = members.find((member) => normalizeEmail(member.email) === normalizedEmail);
    const nextMember = {
      name: existing?.name || normalizedEmail.split("@")[0],
      email: normalizedEmail,
      plan,
      subscription: "active",
      accountType: existing?.accountType === "admin" ? "admin" : "paid",
      stripeCustomerId: typeof session.customer === "string" ? session.customer : session.customer?.id,
      stripeSubscriptionId: subscriptionId,
      cancelAtPeriodEnd: Boolean(subscription?.cancel_at_period_end),
      currentPeriodEnd: timestampToIso(subscription?.current_period_end),
      signedUpAt: existing?.signedUpAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const next = [nextMember, ...members.filter((member) => normalizeEmail(member.email) !== normalizedEmail)];
    await store.setJSON("accounts", next);
    return json(200, { member: publicMember(nextMember) });
  } catch (error) {
    return json(error.statusCode || 500, safeError("Checkout session could not be confirmed."));
  }
};
