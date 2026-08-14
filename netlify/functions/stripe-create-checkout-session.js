const Stripe = require("stripe");
const { checkoutConfig, siteUrl } = require("./_config");
const { rateLimit } = require("./_rate-limit");
const { json, safeError } = require("./_security");
const { subscriptionLineItem } = require("./_stripe-line-item");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const limited = rateLimit(event, { key: "stripe:checkout", limit: 8, windowMs: 60_000 });
  if (limited.limited) return json(429, { error: "Too many checkout attempts" }, { "retry-after": String(limited.retryAfter) });

  const { plan = "monthly", email } = JSON.parse(event.body || "{}");
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return json(400, { error: "Create or log into an account before subscribing." });
  }

  if (!["monthly", "annual"].includes(plan)) {
    return json(400, { error: "Invalid subscription plan." });
  }

  try {
    const config = checkoutConfig();
    const stripe = new Stripe(config.secretKey);
    const session = await stripe.checkout.sessions.create({
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
    return json(error.statusCode || 500, safeError("Stripe checkout is not configured or unavailable."));
  }
};
