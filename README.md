# Home maintenance

A shared iPhone web app (PWA) for two people to track what needs doing around the home and keep a record of what was done. Next.js (App Router) + Supabase (auth, Postgres, private photo storage), deployable on Vercel.

## Setup

1. Create a Supabase project. Run `supabase/migrations/0001_init.sql` in the SQL editor.
2. Auth settings: enable email + password sign-in; turn off "Confirm email" (otherwise both users must confirm before first sign-in).
3. Copy `.env.example` to `.env.local` and fill in the project URL and anon key. Set the same two variables in Vercel.
4. `npm install && npm run dev`. Tests: `npm test`. Typecheck: `npm run typecheck`.
5. First user: create an account, then create the household (starter rooms are seeded). Settings has the invite link for the second user (a household holds at most two members).
6. On iPhone: open in Safari, Share, Add to Home Screen.

## Layout

- `supabase/migrations/0001_init.sql`: tables, row-level security (a user only sees their household), `create_household` / `join_household` functions, private `photos` bucket.
- `src/lib/logic.ts`: all rules as pure functions (size filter, sections, room counts, rolling recurrence, search, history). Covered by `logic.test.ts`.
- `src/lib/store.tsx`: loads the household into memory and exposes mutations; reloads after each write and when the app returns to the foreground.
- `src/app`: screens. `(app)` routes: Home, Rooms, room, History, Search, Settings, item detail, close-out.

## Decisions on the spec's open items

These were unconfirmed in the spec; each is one small change to revisit.

| Item | Chosen |
| --- | --- |
| Priority levels | High, Medium, Low |
| Repeat options | Every month, 3, 6, 12 months, or custom weeks/months |
| Starting rooms | Kitchen, Living room, Bedroom, Bathroom, Laundry, Hallway, Garage, Garden, Outside, Whole house (edit in Settings) |
| "No room yet" group | Yes, shown at the bottom of Rooms only when items without a room exist |
| Quick add with photo only | No: text is required (title is the one required field); the camera button is optional |
| Size filter and Needs attention | Needs attention is not filtered; the filter only affects the Priority list (critical always shows) |
| Deleting | Either user, with a confirm dialog |
| Stack | Next.js, Supabase, Vercel |

## Behaviour notes

- A critical item appears only in Critical, not again below. Room counts include it.
- Recurring items stay `done` until `next_due` arrives; "open" is computed from today's date, so no scheduled job is needed. The due date is the completion date plus the interval.
- Changing a waiting item's interval re-rolls its due date from the last completion.
- Photos are downscaled to 1600px JPEG in the browser before upload and shown through signed URLs.
- A done non-recurring item's detail shows Reopen instead of Mark done.

## Not verified

The UI has not been run against a live Supabase project (none was available when this was built). Typecheck, unit tests and a production build pass. Do a pass through sign-up, invite, add, close-out with photos, and a recurring item before relying on it.
