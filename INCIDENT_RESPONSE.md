# Incident Response

## Leaked Stripe Key

1. Revoke or roll the key in Stripe.
2. Update Netlify environment variables.
3. Redeploy.
4. Review Stripe logs for suspicious API calls.
5. Review Git history and remove exposed secrets if necessary.

## Leaked Webhook Secret

1. Roll the webhook signing secret in Stripe.
2. Update `STRIPE_WEBHOOK_SECRET` in Netlify.
3. Redeploy.
4. Review processed webhook events for anomalies.

## Compromised Admin Account

1. Remove the email from `ADMIN_EMAILS`.
2. Redeploy Netlify.
3. Review article changes and Stripe/member logs.
4. Restore or archive malicious content.
5. Re-enable only after account recovery and MFA where available.

## Malicious Article Content

1. Unpublish or delete the article.
2. Review sanitized stored content.
3. Clear caches if needed.
4. Identify the editor account used.

## Data Breach

1. Preserve logs.
2. Identify affected records.
3. Rotate secrets.
4. Notify the site owner and follow applicable legal guidance.

## Service Outage

1. Check Netlify deploy status.
2. Roll back to the last known-good deploy if needed.
3. Check Stripe webhook delivery retries.
4. Communicate status to stakeholders.
