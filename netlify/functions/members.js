const { connectLambda, getStore } = require("@netlify/blobs");
const { getUserEmail, requireAdmin } = require("./_admin");
const { rateLimit } = require("./_rate-limit");
const { json } = require("./_security");

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizePlan(plan, subscription = "free") {
  const value = String(plan || "").trim().toLowerCase();
  if (["monthly", "annual"].includes(value)) return value;
  return subscription === "active" ? "monthly" : "free";
}

function publicMember(member) {
  if (!member) return null;
  const subscription = member.subscription || "free";
  return {
    name: member.name,
    email: member.email,
    plan: normalizePlan(member.plan, subscription),
    subscription,
    accountType: member.accountType || (subscription === "active" ? "paid" : "free"),
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
  const store = getStore("members");
  const members = (await store.get("accounts", { type: "json" })) || [];

  if (event.httpMethod === "GET") {
    if (event.queryStringParameters?.list === "all") {
      const admin = requireAdmin(event, context);
      if (!admin.ok) return admin.response;
      return json(200, {
        members: members.map(publicMember).sort((a, b) => String(b.signedUpAt || "").localeCompare(String(a.signedUpAt || ""))),
      });
    }
    const email = normalizeEmail(getUserEmail(event, context) || event.queryStringParameters?.email);
    if (!email) return json(200, { member: null });
    return json(200, { member: publicMember(members.find((member) => member.email === email)) });
  }

  if (event.httpMethod !== "POST") {
    if (event.httpMethod !== "PATCH") return json(405, { error: "Method not allowed" });
  }

  const limited = rateLimit(event, { key: "members:post", limit: 12, windowMs: 60_000 });
  if (limited.limited) return json(429, { error: "Too many requests" }, { "retry-after": String(limited.retryAfter) });

  const body = JSON.parse(event.body || "{}");
  const email = normalizeEmail(body.email);
  if (!email) return json(400, { error: "Email is required" });

  const existing = members.find((member) => member.email === email);
  if (event.httpMethod === "PATCH") {
    const admin = requireAdmin(event, context);
    if (!admin.ok) return admin.response;

    const plan = normalizePlan(body.plan);
    const subscription = plan === "free" ? "free" : "active";
    const isAdminAccount = existing?.accountType === "admin";
    const nextMember = {
      name: String(body.name || existing?.name || email.split("@")[0]).slice(0, 120),
      email,
      plan,
      subscription,
      accountType: isAdminAccount ? "admin" : subscription === "active" ? "paid" : "free",
      stripeCustomerId: existing?.stripeCustomerId,
      stripeSubscriptionId: existing?.stripeSubscriptionId,
      cancelAtPeriodEnd: plan === "free" ? false : Boolean(existing?.cancelAtPeriodEnd),
      currentPeriodEnd: plan === "free" ? undefined : existing?.currentPeriodEnd,
      signedUpAt: existing?.signedUpAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      manualPlanUpdatedAt: new Date().toISOString(),
      manualPlanUpdatedBy: admin.email,
    };
    const next = [nextMember, ...members.filter((member) => member.email !== email)];
    await store.setJSON("accounts", next);
    return json(200, { member: publicMember(nextMember), members: next.map(publicMember) });
  }

  if (body.mode === "signup" && existing) {
    return json(409, { error: "An account already exists for this email. Please log in instead." });
  }

  const subscription = existing?.subscription || "free";
  const nextMember = {
    name: String(body.name || existing?.name || email.split("@")[0]).slice(0, 120),
    email,
    plan: normalizePlan(existing?.plan, subscription),
    subscription,
    accountType: existing?.accountType || "free",
    stripeCustomerId: existing?.stripeCustomerId,
    stripeSubscriptionId: existing?.stripeSubscriptionId,
    cancelAtPeriodEnd: Boolean(existing?.cancelAtPeriodEnd),
    currentPeriodEnd: existing?.currentPeriodEnd,
    signedUpAt: existing?.signedUpAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const next = [nextMember, ...members.filter((member) => member.email !== email)];
  await store.setJSON("accounts", next);
  return json(200, { member: publicMember(nextMember) });
};
