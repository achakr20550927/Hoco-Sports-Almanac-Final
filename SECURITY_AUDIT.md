# Security Audit

Date: 2026-08-01

## Architecture Map

- Frontend: static `index.html`, `styles.css`, and vanilla `app.js`.
- Routes: client-side route state for home, archive, article, subscribe, account, admin, about, and contact.
- Backend: Netlify Functions under `netlify/functions`.
- Storage: Netlify Blobs stores `members`, `articles`, and processed Stripe event IDs.
- Authentication: browser-local prototype account state in `localStorage`; no production-grade password/session provider is fully wired.
- Authorization: admin emails come from `ADMIN_EMAILS`; article mutations use Netlify Functions.
- Payments: Stripe Checkout subscriptions, Billing Portal, and signed webhooks.
- Uploads: browser data URLs and external URLs in rich-text content; no dedicated server upload provider.
- Email/password reset: not implemented.
- Analytics/background jobs/scheduled tasks: not implemented.
- Deployment: GitHub to Netlify with `netlify.toml`.

## Findings

| ID | Severity | Category | Affected Area | Description | Impact | Fix Applied | Test | Remaining Action |
|---|---|---|---|---|---|---|---|---|
| SEC-001 | Critical | Authentication | `app.js`, admin APIs | Accounts are prototype/localStorage based, with no real password hashing or server session. | Users/admins are not strongly authenticated for production. | Documented as launch blocker; server admin status centralized. | Manual/code review. | Wire Netlify Identity/Auth0/Supabase Auth before public launch. |
| SEC-002 | High | Payments | `app.js` checkout success | Success query parameter granted active subscription locally. | User could alter URL and unlock paid state in browser. | Removed entitlement grant from query param; waits for webhook/member sync. | `node --check`; review. | Verify deployed webhook end-to-end with Stripe test mode. |
| SEC-003 | High | Stored XSS | `articles.js`, article body | Rich HTML from admin editor was stored/rendered without server sanitizer. | Malicious content could execute script for readers/admins. | Added `sanitize-html` allowlist validation. | `npm test`. | Refactor client rendering to avoid broad `innerHTML`. |
| SEC-004 | High | Stripe Webhooks | `stripe-webhook.js` | Webhook events were not replay/idempotency protected. | Duplicate/retried events could repeatedly alter entitlements. | Added processed event store and safe logging. | Syntax checks; planned integration test. | Run Stripe CLI signed webhook tests. |
| SEC-005 | Medium | API abuse | Netlify Functions | No rate limits on signup/checkout/article mutation routes. | Abuse could create excessive records/sessions. | Added bounded in-memory rate limits. | Syntax checks. | Use durable edge/WAF rate limits for production. |
| SEC-006 | Medium | Security headers | `netlify.toml` | Missing CSP/HSTS/referrer/permissions/frame protections. | Increased browser attack surface. | Added compatible headers. | Header config review. | Remove inline handlers to eliminate CSP `unsafe-inline`. |
| SEC-007 | Medium | Env validation | Stripe functions | Missing Stripe env vars failed inconsistently. | Misconfiguration could cause confusing runtime errors. | Added central config validation and safe errors. | Syntax checks. | Verify Netlify envs in production. |
| SEC-008 | Low | Secrets | Repo | No real secrets found in source scan; docs contain placeholders. | Placeholder strings are safe. | Added `.env.example`; redaction utility. | `rg` scan. | Run external secret scanning/gh history scan before launch. |

## Notes

The site is improved, but it is not fully production-secure until real server-verified authentication replaces the localStorage prototype account flow.
