import { getUser, login, signup, logout, handleAuthCallback, onAuthChange, requestPasswordRecovery, updateUser, refreshSession } from "@netlify/identity";

let config;
let initialization;
let changeHandler = () => {};
let signedOut = false;
let authVersion = 0;
function accessToken() {
  const cookie = document.cookie.split(";").map(value => value.trim()).find(value => value.startsWith("nf_jwt="));
  return cookie ? decodeURIComponent(cookie.slice(7)) : "";
}
async function sessionFor(user) {
  if (signedOut || !user?.confirmedAt) return null;
  await refreshSession();
  const token = accessToken();
  return token ? { access_token: token, user: { id: user.id, email: user.email, user_metadata: user.userMetadata } } : null;
}

window.HocoAuth = {
  async init() {
    if (initialization) return initialization;
    initialization = (async () => {
      const response = await fetch("/.netlify/functions/auth-config", { cache: "no-store" });
      if (!response.ok) throw new Error("Sign-in configuration is unavailable. Please try again.");
      config = await response.json();
      if (!config.enabled) return { config, session: null };
      let callback;
      try { callback = await handleAuthCallback(); }
      catch {
        history.replaceState({}, "", `${location.pathname}${location.search}#account`);
        return { config, session: null, passwordSetup: true, callbackError: true };
      }
      const user = callback?.user || await getUser();
      onAuthChange((event, nextUser) => {
        if (event === "token_refresh" || event === "user_updated") return;
        const version = ++authVersion;
        signedOut = event === "logout";
        const names = { login: "SIGNED_IN", logout: "SIGNED_OUT", recovery: "PASSWORD_RECOVERY" };
        sessionFor(nextUser).then(session => { if (version === authVersion) changeHandler(names[event], session); }).catch(() => { if (version === authVersion) changeHandler("SIGNED_OUT", null); });
      });
      return { config, session: await sessionFor(user), passwordSetup: ["confirmation", "recovery"].includes(callback?.type) };
    })();
    return initialization;
  },
  onChange(handler) { changeHandler = handler; },
  async headers() {
    await this.init();
    if (!config.enabled || signedOut) return {};
    const session = await sessionFor(await getUser());
    return session ? { authorization: `Bearer ${session.access_token}` } : {};
  },
  async signIn(email, password) {
    await this.init();
    if (!config.enabled) throw new Error("Secure sign-in is not enabled yet.");
    signedOut = false;
    return { session: await sessionFor(await login(email, password)) };
  },
  async signUp(email, password, name) {
    await this.init();
    signedOut = false;
    return { session: await sessionFor(await signup(email, password, { full_name: name })) };
  },
  async sendSetup(email) {
    await this.init();
    const response = await fetch("/.netlify/functions/auth-setup", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email }),
    });
    if (!response.ok) throw new Error("Password setup email could not be sent.");
  },
  async recover(email) { await this.init(); await requestPasswordRecovery(email); },
  async setPassword(password) {
    await this.init();
    if (signedOut || !(await getUser())?.confirmedAt) throw new Error("Verify your email before setting a password.");
    await updateUser({ password });
  },
  async signOut() {
    authVersion++;
    signedOut = true;
    await this.init();
    if (config.enabled) await logout();
  },
};
