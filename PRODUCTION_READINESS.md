# Production Readiness

## Status

Not fully ready for unrestricted public launch until production authentication is implemented and verified.

## Ready

- Static frontend deploys on Netlify.
- Netlify Functions exist for articles, members, Stripe Checkout, Billing Portal, and webhooks.
- Stripe secret values are expected only in Netlify environment variables.
- Article writes are server-side sanitized and admin-gated.
- Webhook signatures are verified and replay-protected.
- Security headers are configured in `netlify.toml`.
- `.env.example` uses placeholders only.

## Launch Blockers

1. Replace prototype localStorage login with a real auth provider.
2. Ensure admin API authorization derives from a trusted session token, not a browser-controlled email.
3. Verify Stripe live/test separation in Netlify environment variables.
4. Run Stripe test-mode checkout and webhook tests against the deployed Netlify site.
5. Add Privacy Policy, Terms, Refund Policy, and Contact details reviewed by the site owner.

## Operational Follow-Ups

- Configure Netlify deploy notifications.
- Configure uptime monitoring for `https://hocosportsalmanac.com`.
- Configure Stripe webhook failure alerts.
- Define backup/restore expectations for Netlify Blobs.
- Replace browser data URL image handling with a controlled image upload pipeline.
