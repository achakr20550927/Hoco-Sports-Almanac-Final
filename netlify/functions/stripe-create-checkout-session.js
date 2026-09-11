const Stripe = require("stripe");
const { checkoutConfig, siteUrl } = require("./_config");
const { rateLimit } = require("./_rate-limit");
const { json, logSafe, safeError } = require("./_security");
const { subscriptionLineItem } = require("./_stripe-line-item");
const { connectLambda, getStore } = require("@netlify/blobs");
const { getUserEmail } = require("./_admin");
const { paid } = require("../../access-policy");

async function createCheckoutSession(stripe, params) {
  return stripe.checkout.sessions.create({
      ...params,
      automatic_tax: { enabled: true },
      billing_address_collection: "auto",
  });
}

exports.handler = require("./_security").withErrorHandling(async (event, context) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const limited = rateLimit(event, { key: "stripe:checkout", limit: 8, windowMs: 60_000 });
  if (limited.limited) return json(429, { error: "Too many checkout attempts" }, { "retry-after": String(limited.retryAfter) });

  const { plan = "monthly", email } = JSON.parse(event.body || "{}");
  const normalizedEmail = getUserEmail(event, context);
  if (!normalizedEmail) {
    return json(401, { error: "Create or log into an account before subscribing." });
  }

  if (!["monthly", "annual"].includes(plan)) {
    return json(400, { error: "Invalid subscription plan." });
  }
  if (email && String(email).trim().toLowerCase() !== normalizedEmail) return json(403, { error: "Checkout does not match the signed-in account." });

  try {
    connectLambda(event);
    const members = (await getStore({ name: "members", consistency: "strong" }).get("accounts", { type: "json" })) || [];
    const member = members.find((item) => String(item.email).trim().toLowerCase() === normalizedEmail);
    if (!member) return json(401, { error: "Create your account before subscribing." });
    if (paid(member)) return json(409, { error: "You already have paid access. Manage billing from your account." });
    const config = checkoutConfig();
    const stripe = new Stripe(config.secretKey);
    const session = await createCheckoutSession(stripe, {
      mode: "subscription",
      customer_email: normalizedEmail,
      client_reference_id: normalizedEmail,
      line_items: [subscriptionLineItem(plan, config.prices[plan])],
      success_url: `${siteUrl()}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl()}/?checkout=cancelled`,
      allow_promotion_codes: true,
      metadata: { plan, email: normalizedEmail },
      subscription_data: {
        metadata: { plan, email: normalizedEmail },
      },
    });

    return json(200, { url: session.url });
  } catch (error) {
    logSafe("stripe.checkout.error", { message: error.message });
    return json(error.statusCode || 500, safeError("Stripe checkout is not configured or unavailable."));
  }
});
