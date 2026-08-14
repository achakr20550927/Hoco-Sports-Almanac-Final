const Stripe = require("stripe");
const { connectLambda, getStore } = require("@netlify/blobs");
const { getUserEmail } = require("./_admin");
const { required } = require("./_config");
const { rateLimit } = require("./_rate-limit");
const { json, safeError } = require("./_security");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function timestampToIso(timestamp) {
  return timestamp ? new Date(timestamp * 1000).toISOString() : undefined;
}

function publicMember(member) {
  return {
    name: member.name,
    email: member.email,
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

  const limited = rateLimit(event, { key: "stripe:cancel", limit: 5, windowMs: 60_000 });
  if (limited.limited) return json(429, { error: "Too many requests" }, { "retry-after": String(limited.retryAfter) });

  const body = JSON.parse(event.body || "{}");
  const email = normalizeEmail(getUserEmail(event, context) || body.email);
  if (!email) return json(401, { error: "Log in before cancelling a subscription." });

  const store = getStore("members");
  const accounts = (await store.get("accounts", { type: "json" })) || [];
  const existing = accounts.find((account) => normalizeEmail(account.email) === email);

  if (!existing || existing.subscription !== "active" || !existing.stripeCustomerId) {
    return json(403, { error: "Only paid accounts can cancel a subscription." });
  }

  if (existing.cancelAtPeriodEnd) {
    return json(200, { member: publicMember(existing), alreadyCancelled: true });
  }

  try {
    const stripe = new Stripe(required("STRIPE_SECRET_KEY"));
    const subscriptions = await stripe.subscriptions.list({
      customer: existing.stripeCustomerId,
      status: "all",
      limit: 10,
    });
    const subscription =
      subscriptions.data.find((item) => item.id === existing.stripeSubscriptionId && ["active", "trialing"].includes(item.status)) ||
      subscriptions.data.find((item) => ["active", "trialing"].includes(item.status));

    if (!subscription) {
      return json(404, { error: "No active Stripe subscription was found for this account." });
    }

    const updated = await stripe.subscriptions.update(subscription.id, {
      cancel_at_period_end: true,
    });

    const nextMember = {
      ...existing,
      subscription: "active",
      accountType: existing.accountType === "admin" ? "admin" : "paid",
      stripeSubscriptionId: updated.id,
      cancelAtPeriodEnd: true,
      currentPeriodEnd: timestampToIso(updated.current_period_end),
      updatedAt: new Date().toISOString(),
    };

    await store.setJSON("accounts", [nextMember, ...accounts.filter((account) => normalizeEmail(account.email) !== email)]);
    return json(200, { member: publicMember(nextMember) });
  } catch (error) {
    return json(error.statusCode || 500, safeError("Subscription could not be cancelled."));
  }
};
