const buckets = new Map();

function actorKey(event, suffix = "global") {
  const ip =
    event.headers?.["x-nf-client-connection-ip"] ||
    event.headers?.["client-ip"] ||
    event.headers?.["x-forwarded-for"]?.split(",")[0]?.trim() ||
    "unknown";
  return `${ip}:${suffix}`;
}

function rateLimit(event, { key = "global", limit = 20, windowMs = 60_000 } = {}) {
  const now = Date.now();
  const bucketKey = actorKey(event, key);
  const bucket = buckets.get(bucketKey) || { count: 0, resetAt: now + windowMs };
  if (now > bucket.resetAt) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }
  bucket.count += 1;
  buckets.set(bucketKey, bucket);

  if (bucket.count > limit) {
    return {
      limited: true,
      retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
    };
  }
  return { limited: false };
}

module.exports = { rateLimit };
