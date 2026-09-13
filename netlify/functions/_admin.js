const { adminEmails } = require("./_config");
const { json } = require("./_security");
const { authMode, verifiedUser } = require("./_auth");
const { connectLambda, getStore } = require("@netlify/blobs");

function parseAdminEmails() {
  return adminEmails();
}

async function getUserEmail(event, context) {
  const authorization = event.headers?.authorization || event.headers?.Authorization;
  if (authorization) {
    const user = await verifiedUser(event);
    if (!user) return "";
    connectLambda(event);
    const members = await getStore("members").get("accounts", { type: "json" }) || [];
    const member = members.find(item => String(item.email || "").trim().toLowerCase() === user.email);
    if (member?.authUserId && member.authUserId !== user.id) return "";
    return user.email;
  }
  if (authMode() === "identity") return "";
  const netlifyUser = context?.clientContext?.user;
  const identityEmail = netlifyUser?.email;
  const headerEmail = event.headers?.["x-user-email"] || event.headers?.["X-User-Email"];
  const email = String(identityEmail || headerEmail || "").trim().toLowerCase();
  if (email && authMode() === "pilot") {
    connectLambda(event);
    const members = await getStore("members").get("accounts", { type: "json" }) || [];
    if (members.some(item => String(item.email || "").trim().toLowerCase() === email && item.authUserId)) return "";
  }
  return email;
}

function isAdminEmail(email) {
  return Boolean(email && parseAdminEmails().includes(String(email).toLowerCase()));
}

async function requireAdmin(event, context) {
  const email = await getUserEmail(event, context);
  if (!isAdminEmail(email)) {
    return {
      ok: false,
      response: json(403, { error: "Admin access required" }),
    };
  }
  return { ok: true, email };
}

module.exports = { getUserEmail, isAdminEmail, parseAdminEmails, requireAdmin };
