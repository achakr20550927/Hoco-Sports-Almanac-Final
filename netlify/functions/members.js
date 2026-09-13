const { connectLambda, getStore } = require("@netlify/blobs");
const { getUserEmail, requireAdmin, isAdminEmail } = require("./_admin");
const { paid } = require("../../access-policy");
const { rateLimit } = require("./_rate-limit");
const { json } = require("./_security");
const { authMode, verifiedUser } = require("./_auth");

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
    email: normalizeEmail(member.email),
    plan: normalizePlan(member.plan, subscription),
    subscription,
    accountType: isAdminEmail(member.email) ? "admin" : paid(member) ? "paid" : "free",
    stripeCustomerId: member.stripeCustomerId,
    stripeSubscriptionId: member.stripeSubscriptionId,
    cancelAtPeriodEnd: Boolean(member.cancelAtPeriodEnd),
    currentPeriodEnd: member.currentPeriodEnd,
    signedUpAt: member.signedUpAt,
    updatedAt: member.updatedAt,
  };
}

async function handle(event, context) {
  connectLambda(event);
  const store = getStore("members");
  const members = (await store.get("accounts", { type: "json" })) || [];

  if (event.httpMethod === "GET") {
    if (event.queryStringParameters?.list === "all" || event.queryStringParameters?.backup === "1") {
      if (event.queryStringParameters?.backup === "1" && !await verifiedUser(event)) return json(403, { error: "Verified admin login required for backup." });
      const admin = await requireAdmin(event, context);
      if (!admin.ok) return admin.response;
      if (event.queryStringParameters?.backup === "1") return json(200, { schemaVersion: 1, exportedAt: new Date().toISOString(), source: "Netlify members/accounts", recordCount: members.length, members });
      return json(200, {
        members: members.map(publicMember).sort((a, b) => String(b.signedUpAt || "").localeCompare(String(a.signedUpAt || ""))),
      });
    }
    const email = normalizeEmail(await getUserEmail(event, context));
    if (!email) return json(200, { member: null });
    return json(200, { member: publicMember(members.find((member) => normalizeEmail(member.email) === email)) });
  }

  if (event.httpMethod !== "POST") {
    if (event.httpMethod !== "PATCH") return json(405, { error: "Method not allowed" });
  }

  const limited = rateLimit(event, { key: "members:post", limit: 12, windowMs: 60_000 });
  if (limited.limited) return json(429, { error: "Too many requests" }, { "retry-after": String(limited.retryAfter) });

  const body = JSON.parse(event.body || "{}");
  const verified = await verifiedUser(event);
  const secureRequest = authMode() === "identity" || Boolean(event.headers?.authorization || event.headers?.Authorization);
  if (secureRequest && !verified) return json(401, { error: "Verify your email and log in to continue." });
  const email = normalizeEmail(event.httpMethod === "PATCH" ? body.email : verified?.email || body.email);
  if (!email) return json(400, { error: "Email is required" });

  const existing = members.find((member) => normalizeEmail(member.email) === email);
  if (!verified && existing?.authUserId && event.httpMethod === "POST") return json(401, { error: "Use your verified email and password to log in." });
  if (verified && members.filter(member => normalizeEmail(member.email) === email).length > 1) return json(409, { error: "Duplicate membership records require support. Your subscription has not changed." });
  if (event.httpMethod === "PATCH") {
    const admin = await requireAdmin(event, context);
    if (!admin.ok) return admin.response;

    if (!["free", "monthly", "annual"].includes(body.plan)) return json(400, { error: "Choose Free, Monthly, or Annual." });
    if (!existing) return json(404, { error: "Member not found. Refresh the member list." });
    const plan = normalizePlan(body.plan);
    const subscription = plan === "free" ? "free" : "active";
    const isAdminAccount = existing?.accountType === "admin";
    const nextMember = {
      ...existing,
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
    const next = [nextMember, ...members.filter((member) => normalizeEmail(member.email) !== email)];
    await store.setJSON("accounts", next);
    return json(200, { member: publicMember(nextMember), members: next.map(publicMember) });
  }

  // Verified users claim the existing record without resetting billing or paid-through dates.
  if (verified && existing) {
    if (existing.authUserId && existing.authUserId !== verified.id) return json(409, { error: "Account link requires support. Your subscription has not changed." });
    if (!existing.authUserId) {
      existing.authUserId = verified.id;
      existing.authLinkedAt = new Date().toISOString();
      await store.setJSON("accounts", members);
    }
    return json(200, { member: publicMember(existing), existingAccount: true });
  }
  if (body.mode === "signup" && existing) {
    return json(200, { member: publicMember(existing), existingAccount: true });
  }

  const subscription = existing?.subscription || "free";
  const nextMember = {
    ...existing,
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
    ...(verified ? { authUserId: verified.id, authLinkedAt: new Date().toISOString() } : {}),
  };
  const next = [nextMember, ...members.filter((member) => normalizeEmail(member.email) !== email)];
  await store.setJSON("accounts", next);
  return json(200, { member: publicMember(nextMember) });
}

exports.handler = async (event, context) => {
  try { return await handle(event, context); }
  catch (error) { return json(error instanceof SyntaxError ? 400 : 503, { error: "Account request failed. Please try again." }); }
};

module.exports = { handler: exports.handler, normalizePlan, publicMember };
