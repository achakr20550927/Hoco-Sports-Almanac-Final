const Stripe = require("stripe");
const { getStore } = require("@netlify/blobs");
const { getUserEmail } = require("./_admin");
const { required, siteUrl } = require("./_config");
const { rateLimit } = require("./_rate-limit");
const { json, safeError } = require("./_security");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const limited = rateLimit(event, { key: "stripe:portal", limit: 10, windowMs: 60_000 });
  if (limited.limited) return json(429, { error: "Too many requests" }, { "retry-after": String(limited.retryAfter) });

  const { email } = JSON.parse(event.body || "{}");
  const authenticatedEmail = getUserEmail(event, context);
  const allowBodyEmail =
    process.env.ALLOW_DEV_ADMIN_HEADER === "true" ||
    process.env.NETLIFY_DEV === "true" ||
    process.env.CONTEXT === "dev";
  const normalizedEmail = String(authenticatedEmail || (allowBodyEmail ? email : "") || "").trim().toLowerCase();
  if (!normalizedEmail) {
    return {
      statusCode: 401,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Log in before managing billing." }),
    };
  }
  const members = getStore("members");
  const accounts = (await members.get("accounts", { type: "json" })) || [];
  const customerId = accounts.find((account) => account.email === normalizedEmail)?.stripeCustomerId;

  if (!customerId) {
    return json(400, { error: "No Stripe customer is attached to this account yet." });
  }

  try {
    const stripe = new Stripe(required("STRIPE_SECRET_KEY"));
    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${siteUrl()}/?account=billing`,
    });

    return json(200, { url: session.url });
  } catch (error) {
    return json(error.statusCode || 500, safeError("Billing portal is unavailable."));
  }
};
