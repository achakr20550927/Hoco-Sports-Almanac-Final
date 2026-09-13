function authMode() {
  const mode = process.env.AUTH_MODE || "legacy";
  if (!["legacy", "pilot", "identity"].includes(mode)) throw new Error("Invalid authentication mode");
  return mode;
}

function publicAuthConfig() {
  const mode = authMode();
  const enabled = mode !== "legacy";
  return { mode, enabled, provider: "netlify-identity" };
}

// Never derive the token-verification destination from a request header.
const identityURL = "https://hocosportsalmanac.com/.netlify/identity";

const verifiedRequests = new WeakMap();
async function verifiedUser(event) {
  if (verifiedRequests.has(event)) return verifiedRequests.get(event);
  const pending = (async () => {
    const authorization = event.headers?.authorization || event.headers?.Authorization || "";
    if (!/^Bearer [^\s]+$/i.test(authorization)) return null;
    const config = publicAuthConfig();
    if (!config.enabled) return null;
    const response = await fetch(`${identityURL}/user`, {
      headers: { authorization }, redirect: "error", signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    const user = await response.json();
    if (!user?.id || !user.email || !user.confirmed_at) return null;
    return { id: user.id, email: user.email.trim().toLowerCase(), name: user.user_metadata?.full_name || "" };
  })();
  verifiedRequests.set(event, pending);
  return pending;
}

module.exports = { authMode, publicAuthConfig, verifiedUser, identityURL };
