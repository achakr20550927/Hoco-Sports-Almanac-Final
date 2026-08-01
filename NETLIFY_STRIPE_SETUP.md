# HoCo Sports Almanac Netlify and Stripe Setup

## 1. Push Code to GitHub

This repo is intended to deploy as a static site with Netlify Functions.

## 2. Create the Netlify Site

1. Go to Netlify.
2. Choose **Add new site**.
3. Choose **Import an existing project**.
4. Pick `achakr20550927/HC-Almanac`.
5. Build command: leave blank.
6. Publish directory: `.`.
7. Functions directory is already configured in `netlify.toml` as `netlify/functions`.

## 3. Set Netlify Environment Variables

In Netlify, go to **Site configuration -> Environment variables** and add:

```text
ADMIN_EMAILS=client-email@example.com
STRIPE_SECRET_KEY=sk_live_or_test_key
STRIPE_MONTHLY_PRICE_ID=price_monthly_id
STRIPE_ANNUAL_PRICE_ID=price_annual_id
STRIPE_WEBHOOK_SECRET=whsec_webhook_secret
```

Use comma-separated emails for multiple admins.

Use the Stripe secret key from the client's Stripe account if all subscription revenue should land directly in that account. The monthly and annual `price_...` IDs must come from that same Stripe account.

## 4. Create Stripe Products

1. In Stripe Dashboard, create a product named `HoCo Sports Almanac`.
2. Add a recurring monthly price: `$6.96/month`.
3. Add a recurring annual price: `$24.95/year`.
4. Copy each `price_...` ID into Netlify.

## 5. Configure Stripe Webhook

1. In Stripe Dashboard, go to **Developers -> Webhooks**.
2. Add endpoint:

```text
https://YOUR-NETLIFY-SITE.netlify.app/.netlify/functions/stripe-webhook
```

3. Subscribe to these events:

```text
checkout.session.completed
customer.subscription.updated
customer.subscription.deleted
```

4. Copy the webhook signing secret into `STRIPE_WEBHOOK_SECRET`.

## 6. Admin Access

The frontend hides Admin unless the logged-in email is in the admin list.

For production security, every write function also enforces admin access server-side. The included `netlify/functions/_admin.js` reads `ADMIN_EMAILS` and rejects non-admin write requests unless Netlify provides an authenticated user whose email matches the env var.

Enable Netlify Identity for real accounts before production launch:

1. Netlify Project configuration -> Identity -> Enable Identity.
2. Set Registration to Open if readers can self-sign up.
3. For local development only, set `ALLOW_DEV_ADMIN_HEADER=true` so the browser prototype can pass the logged-in email to admin functions. Do not set this variable in production.

## 7. Current Storage

The included Netlify article function uses Netlify Blobs:

```text
netlify/functions/articles.js
```

The frontend now loads published articles from `/.netlify/functions/articles` and writes admin publish/edit/delete actions to that function. It falls back to browser `localStorage` only when the site is opened without Netlify Functions during local static preview.

Member records are stored in Netlify Blobs through:

```text
netlify/functions/members.js
```

Stripe webhooks update those member records with `subscription=active` and the Stripe customer ID after successful Checkout.
