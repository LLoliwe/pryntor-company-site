# Early list backend (R0, not live)

The homepage runs in safe mailto mode until `window.PRYNTOR_WAITLIST` in `index.html` holds a Supabase project URL and anon key.

Founder setup (free plan, no card):
1. Create a Supabase project owned by a Pryntor account. Pick the nearest region on offer and record it in the privacy notice if it changes.
2. Accept or download Supabase's DPA and keep it with company records (POPIA section 21 operator agreement).
3. Run `docs/waitlist-supabase.sql` in the SQL editor.
4. Put the project URL and the public anon key in `window.PRYNTOR_WAITLIST`, and replace `your-project-ref` in the homepage `connect-src` CSP.
5. Test once with your own email, then check the `waitlist` table.

The anon key is public by design; row level security with no policies stops visitors reading the list. Never put the service role key in the site.
Unsubscribes: set `unsubscribed_at` for the row (manually at first). Launch emails must carry an unsubscribe link.
