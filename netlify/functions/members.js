const { getStore } = require("@netlify/blobs");
const { getUserEmail } = require("./_admin");

const json = (statusCode, body) => ({
  statusCode,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function publicMember(member) {
  if (!member) return null;
  return {
    name: member.name,
    email: member.email,
    subscription: member.subscription || "free",
    accountType: member.accountType || (member.subscription === "active" ? "paid" : "free"),
    stripeCustomerId: member.stripeCustomerId,
    signedUpAt: member.signedUpAt,
    updatedAt: member.updatedAt,
  };
}

exports.handler = async (event, context) => {
  const store = getStore("members");
  const members = (await store.get("accounts", { type: "json" })) || [];

  if (event.httpMethod === "GET") {
    const email = normalizeEmail(getUserEmail(event, context) || event.queryStringParameters?.email);
    if (!email) return json(200, { member: null });
    return json(200, { member: publicMember(members.find((member) => member.email === email)) });
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "Method not allowed" });
  }

  const body = JSON.parse(event.body || "{}");
  const email = normalizeEmail(body.email);
  if (!email) return json(400, { error: "Email is required" });

  const existing = members.find((member) => member.email === email);
  if (body.mode === "signup" && existing) {
    return json(409, { error: "An account already exists for this email. Please log in instead." });
  }

  const nextMember = {
    name: body.name || existing?.name || email.split("@")[0],
    email,
    subscription: existing?.subscription || "free",
    accountType: existing?.accountType || "free",
    stripeCustomerId: existing?.stripeCustomerId,
    signedUpAt: existing?.signedUpAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const next = [nextMember, ...members.filter((member) => member.email !== email)];
  await store.setJSON("accounts", next);
  return json(200, { member: publicMember(nextMember) });
};
