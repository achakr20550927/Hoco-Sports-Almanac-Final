# Netlify Identity Password Migration

## Current rollout

This change supports `AUTH_MODE=legacy`, `pilot`, or `identity`.
Production is prepared for **pilot**, not an enforced site-wide authentication migration.
Pilot visitors use `/?auth_pilot=1#account`. The pilot preference stays in that browser.
Unmigrated accounts still use the legacy email-only flow in pilot; that flow is not secure.
Do not describe pilot as a completed security fix or leave it as the permanent configuration.

Netlify Identity must have open registration and **email confirmation required**.
No Resend, Supabase, SMTP password, or service-role key is used by this implementation.
The server verifies bearer tokens against the fixed production Identity `/user` endpoint.
The browser uses the official `@netlify/identity` SDK for login, callbacks, and password updates.

## Existing Customers

1. Open Account and select Send Password Setup Link.
2. Netlify sends confirmation for a new Identity account, or recovery for an existing one.
3. Follow the email link back to the website, choose a password, and save it.
4. Future login checks the password with Netlify Identity.

An old website session cannot authorize password changes. A confirmed Identity session is required.
Bootstrap credentials are generated server-side and never returned, logged, or stored in membership records.
Customers do not need individual administrator invitations. Do not bulk email customers during testing.
The old passwords were never checked or saved and cannot be recovered or imported.

Membership linking uses the confirmed, normalized email. Existing plan, subscription,
Stripe customer/subscription IDs, cancellation state, and paid-through dates stay unchanged.
Only `authUserId` and `authLinkedAt` are added when linking an existing record.
Conflicting links or duplicate emails fail for support review; they are not merged automatically.
Changing a password does not create, cancel, refund, or modify Stripe subscriptions.

## Required Before Site-Wide Activation

- Verify the owner's setup email arrives, callback works, password saves, incorrect passwords fail,
  and login survives a reload. The owner must enter their own password privately in the browser.
- Export a full private membership backup from the verified admin's Backup Records view.
  The local-only `scripts/private-member-backup.cjs` saves JSON, a readable HTML roster, and a
  SHA-256 manifest outside the repository with owner-only filesystem permissions.
- Confirm total records, plan counts, duplicate-email count, and preserved Stripe metadata.
- Test a consented paid account retains its original term and paid article access.
- Set `AUTH_MODE=identity` in Netlify and deploy. Verify that legacy headers cannot authorize
  private reads, member listings, publishing, billing changes, or password changes.
- Make the setup instructions available to customers without sending unsolicited bulk messages.

Do not switch back to the insecure legacy implementation as a workaround for email delivery.
Do not promise zero errors. Email delivery and real-account tests require live verification.
The pre-existing whole-array Netlify Blobs membership storage remains non-transactional and
should receive a separate persistence migration with verified backups and concurrency tests.
