function required(name) {
  const value = process.env[name];
  if (!value) {
    const error = new Error(`Missing required environment variable: ${name}`);
    error.statusCode = 500;
    throw error;
  }
  return value;
}

function optional(name, fallback = "") {
  return process.env[name] || fallback;
}

function siteUrl() {
  return optional("URL", optional("DEPLOY_PRIME_URL", "http://localhost:4173")).replace(/\/$/, "");
}

function stripeConfig() {
  return {
    secretKey: required("STRIPE_SECRET_KEY"),
    webhookSecret: required("STRIPE_WEBHOOK_SECRET"),
    monthlyPriceId: required("STRIPE_MONTHLY_PRICE_ID"),
    annualPriceId: required("STRIPE_ANNUAL_PRICE_ID"),
  };
}

function webhookConfig() {
  return {
    secretKey: required("STRIPE_SECRET_KEY"),
    webhookSecret: required("STRIPE_WEBHOOK_SECRET"),
  };
}

function checkoutConfig() {
  return {
    secretKey: required("STRIPE_SECRET_KEY"),
    prices: {
      monthly: required("STRIPE_MONTHLY_PRICE_ID"),
      annual: required("STRIPE_ANNUAL_PRICE_ID"),
    },
  };
}

function adminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((email) => email.trim().replace(/^\(|\)$/g, "").toLowerCase())
    .filter(Boolean);
}

module.exports = { adminEmails, checkoutConfig, required, siteUrl, stripeConfig, webhookConfig };
