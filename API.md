# API reference

All endpoints live under `/api` and speak JSON. This is the contract the phase 2 interface builds against.

## Conventions

**Authentication.** Sign up and sign in with Supabase Auth from the browser (`supabase.auth.signUp`, `signInWithPassword`). A profile row is created automatically. Send the session's access token as `Authorization: Bearer <token>`; the phase 2 web app will use the session cookie instead. Role and subscription are checked on the server on every request.

**Errors.** Every failure has the same shape, with a stable `code` to branch on:

```json
{ "error": { "code": "duplicate_score_date", "message": "You already have a score for that date. Edit or delete it instead." } }
```

| Status | Meaning | Common codes |
|---|---|---|
| 400 | Invalid input | `bad_request`, `validation_failed` (with `details[].path`) |
| 401 | Not signed in | `unauthorized` |
| 402 | Needs an active subscription | `subscription_required` |
| 403 | Not allowed (for example, not an admin) | `forbidden` |
| 404 | Not found (also used when Row Level Security hides someone else's row) | `not_found` |
| 409 | Conflicts with current state | `duplicate_score_date`, `already_subscribed`, `payment_past_due`, `draw_not_draft`, `draw_out_of_order`, `draw_stale_rollover`, `draw_period_exists`, `slug_taken`, `proof_not_allowed`, `not_awaiting_review`, `cannot_mark_paid`, `cannot_demote_self` |
| 422 | Valid shape, breaks a rule | `score_date_in_future`, `score_older_than_last_five`, `charity_required`, `charity_not_found`, `no_billing_account`, `proof_not_uploaded` |

**Money** is always integer cents. **Dates** are `YYYY-MM-DD` (UTC); timestamps are ISO 8601.

## Public

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/plans` | Monthly and yearly plans and prices |
| GET | `/api/charities` | Directory. `?q=` search, `?category=`, `?featured=true`, `?limit=`, `?offset=`. Returns `items`, `total`, `categories` |
| GET | `/api/charities/:slug` | Charity profile with upcoming events |

## Signed-in member

| Method | Path | Needs subscription | Purpose |
|---|---|---|---|
| GET | `/api/me` | no | Profile and subscription status |
| PATCH | `/api/me` | no | `full_name`, `charity_id`, `charity_percent` (10 to 50) |
| GET | `/api/me/dashboard` | no | Subscription, scores, charity, participation and winnings in one call |
| GET | `/api/scores` | no | Scores, newest first (history stays readable after a lapse) |
| POST | `/api/scores` | **yes** | `{ score: 1-45, played_on }`. One per date; only the newest five are kept |
| PATCH | `/api/scores/:id` | **yes** | Edit `score` and/or `played_on` |
| DELETE | `/api/scores/:id` | **yes** | Delete a score |
| GET | `/api/draws` | no | Published draws |
| GET | `/api/draws/:id` | no | A published draw, its prize tiers, and your entry and win |
| POST | `/api/checkout` | no | `{ plan_code: "monthly" \| "yearly" }` returns `{ url }` for Stripe Checkout. Needs a chosen charity |
| POST | `/api/billing/portal` | no | Returns `{ url }` for Stripe's customer portal (cancel, card, invoices) |
| POST | `/api/donations/checkout` | no | `{ charity_id, amount_cents: 100-1000000 }` returns `{ url }` for a one-off donation |
| POST | `/api/winners/:id/proof-upload` | no | `{ filename }` returns `{ path, token, upload_url }` |
| POST | `/api/winners/:id/proof` | no | `{ path }` registers the uploaded screenshot; the win becomes `submitted` |

**Uploading proof.** The file never passes through this server:

1. `POST /api/winners/:id/proof-upload` with the filename (png, jpg, jpeg or webp, max 5 MB).
2. Upload the file with `supabase.storage.from('proofs').uploadToSignedUrl(path, token, file)`.
3. `POST /api/winners/:id/proof` with the `path`.

A rejected proof can be replaced by repeating the three steps.

## Stripe webhook

| Method | Path | Purpose |
|---|---|---|
| POST | `/api/webhooks/stripe` | Verifies the signature, then mirrors subscription and donation events. The only writer of subscription state |

Configure it to send `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated` and `customer.subscription.deleted`.

## Admin

Every admin route requires `role = admin` (401 without a token, 403 for a member).

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/admin/users` | Search members (`?q=`, `?limit=`, `?offset=`) with their subscription |
| GET | `/api/admin/users/:id` | Profile, subscription, scores, winnings, donations |
| PATCH | `/api/admin/users/:id` | `full_name`, `role`, `charity_id`, `charity_percent` |
| PUT | `/api/admin/users/:id/subscription` | `{ plan_code, status, current_period_end?, cancel_at_period_end? }` manual override (Stripe's next webhook wins) |
| GET, POST | `/api/admin/users/:id/scores` | List or add a score on a member's behalf |
| PATCH, DELETE | `/api/admin/scores/:id` | Edit or delete any score |
| GET, POST | `/api/admin/charities` | All charities including hidden, or create one |
| PATCH, DELETE | `/api/admin/charities/:id` | Edit, or delete (a charity with history is hidden instead: `deactivated: true`) |
| POST | `/api/admin/charities/:id/events` | Add an event |
| PATCH, DELETE | `/api/admin/events/:id` | Edit or delete an event |
| POST | `/api/admin/media/upload-url` | `{ filename }` returns a signed URL for a charity image; save `path` as `image_path` |
| GET, POST | `/api/admin/draws` | List draws, or open a draft `{ period: "YYYY-MM", mode, weighting? }` |
| GET, PATCH | `/api/admin/draws/:id` | Draw with tiers and winners (a preview until published), or change mode of a draft |
| POST | `/api/admin/draws/:id/simulate` | Dry run. Repeatable until published |
| POST | `/api/admin/draws/:id/publish` | Makes exactly what was simulated official and creates the winners |
| GET | `/api/admin/winners` | `?verification=`, `?payout=`, `?draw_id=`; each row has a short-lived `proof_url` |
| POST | `/api/admin/winners/:id/review` | `{ decision: "approve" \| "reject", note? }` (a rejection needs a note) |
| POST | `/api/admin/winners/:id/pay` | Mark an approved win as paid |
| GET | `/api/admin/reports` | Users, prize pool, charity totals, draw statistics |
| GET | `/api/admin/audit` | Recent admin actions (`?limit=`) |

## The monthly cycle

```
admin: POST /draws  ->  POST /draws/:id/simulate (repeat)  ->  POST /draws/:id/publish
member: GET /draws/:id  ->  (winner) proof-upload -> upload -> proof
admin: GET /winners?verification=submitted  ->  review  ->  pay
```
