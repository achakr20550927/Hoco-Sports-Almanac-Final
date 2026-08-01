# Deployment Checklist

## Netlify

- `ADMIN_EMAILS` is comma-separated, for example `admin@example.com,editor@example.com`.
- `STRIPE_SECRET_KEY` is set from the correct Stripe mode/account.
- `STRIPE_MONTHLY_PRICE_ID` points to the monthly recurring price.
- `STRIPE_ANNUAL_PRICE_ID` points to the annual recurring price.
- `STRIPE_WEBHOOK_SECRET` is the endpoint signing secret beginning with `whsec_`.
- Custom domain and HTTPS are active.
- Deploy logs do not print secret values.

## Stripe

- Product exists for HoCo Sports Almanac Membership.
- Monthly recurring price is `$6.95/month`.
- Annual recurring price is `$24.95/year`.
- Webhook endpoint is `https://hocosportsalmanac.com/.netlify/functions/stripe-webhook`.
- Events selected:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
  - `invoice.payment_failed`
  - `charge.refunded`
  - `charge.dispute.created`
- Customer Portal is enabled and tested.
- Test-mode checkout succeeds before live mode.

## Verification

- Create a normal account.
- Confirm duplicate signup is blocked.
- Complete Stripe test checkout.
- Confirm paid access appears only after webhook confirmation.
- Log in as an admin email and publish a test article.
- Confirm a normal user cannot publish by direct function request.
- Confirm `/admin` is not indexed and not accessible to normal users in the UI.
