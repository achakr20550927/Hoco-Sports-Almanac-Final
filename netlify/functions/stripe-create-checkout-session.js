const Stripe = require("stripe");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

  const { plan = "monthly", email } = JSON.parse(event.body || "{}");
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const price =
    plan === "annual"
      ? process.env.STRIPE_ANNUAL_PRICE_ID
      : process.env.STRIPE_MONTHLY_PRICE_ID;

  if (!normalizedEmail) {
    return {
      statusCode: 400,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Create or log into an account before subscribing." }),
    };
  }

  if (!process.env.STRIPE_SECRET_KEY || !price) {
    return {
      statusCode: 500,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "Stripe environment variables are not configured" }),
    };
  }

  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || "http://localhost:4173";
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer_email: normalizedEmail,
    client_reference_id: normalizedEmail,
    line_items: [{ price, quantity: 1 }],
    success_url: `${siteUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${siteUrl}/?checkout=cancelled`,
    allow_promotion_codes: true,
    metadata: { plan, email: normalizedEmail },
    subscription_data: {
      metadata: { plan, email: normalizedEmail },
    },
  });

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: session.url }),
  };
};
