const { adminEmails } = require("./_config");
const { json } = require("./_security");

function parseAdminEmails() {
  return adminEmails();
}

function getUserEmail(event, context) {
  const netlifyUser = context?.clientContext?.user;
  const identityEmail = netlifyUser?.email;
  const headerEmail = event.headers["x-user-email"] || event.headers["X-User-Email"];
  return String(identityEmail || headerEmail || "").trim().toLowerCase();
}

function isAdminEmail(email) {
  return Boolean(email && parseAdminEmails().includes(String(email).toLowerCase()));
}

function requireAdmin(event, context) {
  const email = getUserEmail(event, context);
  if (!isAdminEmail(email)) {
    return {
      ok: false,
      response: json(403, { error: "Admin access required" }),
    };
  }
  return { ok: true, email };
}

module.exports = { getUserEmail, isAdminEmail, parseAdminEmails, requireAdmin };
