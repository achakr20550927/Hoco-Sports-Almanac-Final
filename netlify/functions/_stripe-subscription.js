function subscriptionId(invoice) {
  const value = invoice.subscription || invoice.parent?.subscription_details?.subscription;
  return typeof value === "string" ? value : value?.id;
}

function periodEnd(subscription) {
  const timestamp = subscription?.current_period_end || subscription?.items?.data?.[0]?.current_period_end;
  return timestamp ? new Date(timestamp * 1000).toISOString() : undefined;
}

function planOf(subscription, fallback) {
  const interval = subscription?.items?.data?.[0]?.price?.recurring?.interval;
  if (interval === "year") return "annual";
  if (interval === "month") return "monthly";
  const plan = subscription?.metadata?.plan || fallback;
  return ["annual", "monthly"].includes(plan) ? plan : "monthly";
}

module.exports = { subscriptionId, periodEnd, planOf };
