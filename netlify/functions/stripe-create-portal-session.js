const Stripe = require("stripe");
const { getStore } = require("@netlify/blobs");
const { getUserEmail } = require("./_admin");

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "");

exports.handler = async (event, context) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method not allowed" };
  }

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
    return {
      statusCode: 400,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ error: "No Stripe customer is attached to this account yet." }),
    };
  }

  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || "http://localhost:4173";
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: `${siteUrl}/?account=billing`,
  });

  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ url: session.url }),
  };
};
