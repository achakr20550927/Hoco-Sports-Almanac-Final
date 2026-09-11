(function (root, factory) {
  const policy = factory();
  if (typeof module === "object" && module.exports) module.exports = policy;
  else root.HocoAccess = policy;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function paid(member) {
    if (!member) return false;
    const status = String(member.subscription || "").toLowerCase();
    if (["cancelled", "canceled", "past_due", "unpaid", "incomplete", "incomplete_expired", "paused", "review"].includes(status)) return false;
    if (member.cancelAtPeriodEnd && member.currentPeriodEnd && Date.parse(member.currentPeriodEnd) <= Date.now()) return false;
    return ["active", "trialing"].includes(status) || ["monthly", "annual"].includes(String(member.plan || "").toLowerCase());
  }

  function access(article) {
    return article?.access || (article?.premium ? "paid" : "public");
  }

  function visible(article, admin = false) {
    return admin || ((article.status || "published") === "published" && access(article) !== "admin");
  }

  function allowed(article, member, admin = false) {
    if (admin) return true;
    if (!visible(article)) return false;
    if (access(article) === "paid") return paid(member);
    if (access(article) === "free") return Boolean(member?.email);
    return true;
  }

  return { paid, access, visible, allowed };
});
