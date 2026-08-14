const Stripe = require("stripe");
const { checkoutConfig, siteUrl } = require("./_config");
const { rateLimit } = require("./_rate-limit");
const { json, logSafe, safeError } = require("./_security");
const { subscriptionLineItem } = require("./_stripe-line-item");

function taxSetupError(error) {
  return /automatic tax|stripe tax|tax settings|tax registration|origin address/i.test(String(error?.message || ""));
}

async function createCheckoutSession(stripe, params) {
  try {
    return await stripe.checkout.sessions.create({
      ...params,
      automatic_tax: { enabled: true },
      billing_address_collection: "auto",
    });
  } catch (error) {
    if (!taxSetupError(error)) throw error;
    logSafe("stripe.checkout.tax_fallback", { message: error.message });
    return stripe.checkout.sessions.create(params);
  }
}

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
    return json(error.statusCode || 500, safeError("Stripe checkout is not configured or unavailable."));
  }
};
