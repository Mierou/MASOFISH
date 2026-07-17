# MASOFISH Supabase Login Setup

The project includes:

- `auth.html` — Login and Sign Up interface
- `auth.js` — Email/password authentication logic
- `supabase-config.js` — Project URL and public key configuration
- `supabase-client.js` — Shared browser client
- `auth-guard.js` — Redirects unauthenticated users to the login page
- `auth-ui.js` — Displays the current user and Sign Out action
- `supabase-schema.sql` — Optional profile table with Row Level Security

## 1. Create or open a Supabase project

In the Supabase dashboard, open **Project Settings → API**.

Copy:

- Project URL
- Publishable key, or the legacy `anon` key

Do **not** use the `service_role` key in any browser file.

## 2. Edit `supabase-config.js`

Replace:

```js
url: "https://YOUR-PROJECT-REF.supabase.co",
publishableKey: "YOUR-PUBLISHABLE-OR-ANON-KEY",
```

with the real project values.

For the final production deployment, also set:

```js
allowPrototypeMode: false
```

## 3. Configure Supabase Auth URLs

In **Authentication → URL Configuration**, set:

- Site URL: your main Vercel deployment URL
- Additional Redirect URLs:
  - `https://YOUR-VERCEL-DOMAIN.vercel.app/auth.html`
  - your custom domain, when applicable
  - `http://localhost:3000/auth.html` for local testing, when applicable

## 4. Email authentication

Email/password authentication must be enabled under the Supabase Auth provider settings.

When email confirmation is enabled, new users must confirm the email before signing in.

## 5. Optional profile table

Run `supabase-schema.sql` in the Supabase SQL Editor. It creates:

- a `profiles` table
- automatic profile creation after signup
- Row Level Security policies allowing users to read and update only their own profile

Administrator roles should be assigned manually by a trusted administrator, not from the public Sign Up form.

## 6. Deploy to Vercel

Upload all project files to the repository root. `index.html`, `auth.html`, and `supabase-config.js` should be in the same top-level folder.

After changing `supabase-config.js`, commit and redeploy.
