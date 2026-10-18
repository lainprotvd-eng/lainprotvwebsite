# Accounts and map reviews: connection checklist

The implementation is prepared but intentionally disabled until a real backend is connected. Existing map downloads and site navigation remain usable. Do not enable the feature with placeholder settings.

## 1. Create a Supabase project

Create the project in the owner's Supabase account. Use a region near the main audience. No database password, secret API key or service_role key belongs in the repository or chat.

Copy the **Project URL** and **Publishable API key** from the project's Connect/API settings. These are the two public settings used by the browser. `reviews-config.js` is the only file that needs them.

## 2. Initialize the database

Run `backend/reviews.sql` once in the project's SQL Editor. It creates:

- Public nicknames, with case-insensitive uniqueness.
- A fixed list of the 12 existing map project pages.
- Reviews with 1–5 star ratings and 5–2,000 character bodies.
- A unique `(project_slug, user_id)` constraint: one review per authenticated account on each project.
- Row-level policies and column grants: users can only create their own reviews and edit the rating/text of their own visible review.
- A public aggregate rating/count calculated from all visible reviews, independent of pagination.
- A private moderator list and ban list. Users cannot assign themselves moderator access.
- Moderator removal that hides a review from public lists and averages, retaining its account/project slot to prevent reposting.

No emails or password fields are stored in public application tables. Supabase Auth manages passwords.

## 3. Configure authentication before enabling the UI

- Enable email/password authentication and **keep email confirmation enabled**.
- Set Site URL to `https://lainprotv.com/`.
- Add `https://lainprotv.com/` to allowed redirect URLs for email confirmation and password recovery.
- Set a minimum password length of at least 10 characters, matching the registration form.
- Configure a production SMTP sender for confirmation/reset emails. The default trial mail service is not suitable for a public launch.
- Set signup/login rate limits and enable supported bot protection if spam becomes an issue. Multiple separate accounts remain possible: the database enforces one review **per account**, not proof of a person's identity.

## 4. Connect the UI

Set `supabaseUrl` and `publishableKey` in `reviews-config.js`, then set `enabled: true`. This public key is safe only because database policies and column grants restrict access. Never replace it with a secret/service role key.

The JavaScript client is pinned at version 2.118.0 and stored locally in `assets/vendor/supabase-2.118.0.js`. Registration/sign-in links appear in each page's header. Review forms appear on project pages. Both English and Russian are supported.

## 5. Grant moderation access

Register and confirm the owner's normal account. In SQL Editor, run the commented moderator grant at the bottom of `reviews.sql`, substituting the owner's email. Refresh the site: **Remove review** becomes visible for moderators.

To ban a spam account, add its user UUID to `app_private.review_bans` in SQL Editor. This blocks further review creation/edits. Remove its existing reviews with the moderation controls. The assistant needs an authorized backend management connection or owner-executed SQL to remove reviews on request; GitHub access alone is insufficient.

## 6. Acceptance checks against the real project

Before announcing launch, use two ordinary accounts and one moderator account to verify:

1. Signup confirmation, sign-in, sign-out, nickname selection and password recovery.
2. Signed-out users can read reviews/averages but cannot write.
3. The first review succeeds; a duplicate direct insert for the same account/project is rejected by the database.
4. An owner can edit their review; another account cannot edit it or change its author, project, ID, timestamps or moderation status.
5. Nickname changes work and duplicate nicknames are rejected.
6. Average/count update after edits and moderator removal; public pagination has no effect on the total.
7. A removed review cannot be reposted by its original account; bans prevent new reviews and edits.
8. Another device sees the shared reviews after logging in; mobile forms and English/Russian switching work.
9. Public pages/API responses never expose email addresses, passwords, secret keys or moderator table contents.

Local syntax/static checks do not replace these backend integration checks. They are pending until the owner supplies the project settings and initializes the database.

Official references:
- https://supabase.com/docs/guides/auth/passwords
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/getting-started/api-keys
