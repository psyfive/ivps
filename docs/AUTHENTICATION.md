# Opus Authentication

Opus uses Supabase Auth for social-only login. The app does not implement email/password signup, and the Opus profile table stores only the minimal display metadata needed by the product shell.

## Providers

- Google: built-in Supabase OAuth provider, requested scope is `openid email profile`.
- Kakao: built-in Supabase OAuth provider.
- Naver: configured as a Supabase Custom OAuth/OIDC provider with the provider id `custom:naver`.

## Local setup

1. Create a Supabase project.
2. Enable the social providers in Supabase Auth.
3. Add local and production redirect URLs in Supabase Auth URL configuration:
   - `http://localhost:5173`
   - Production site origin, for example `https://opus.example.com`
4. Copy `.env.example` to `.env.local` and fill in:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
5. Apply `supabase/migrations/202604240001_auth_profiles.sql`.

`VITE_SUPABASE_ANON_KEY` is a public browser key, not a service-role secret. Never expose the Supabase service-role key in Vite code.

## Data minimization

Current app-side profile sync stores:

- `id`: Supabase Auth user id.
- `display_name`: display name from OAuth metadata when provided.
- `avatar_url`: avatar URL from OAuth metadata when provided.
- `provider`: OAuth provider name.

The app does not duplicate email into `public.profiles`. Supabase Auth may still hold email/provider metadata internally for login.

## Security requirements

- Enable Row Level Security on every user-owned table.
- Use `auth.uid() = user_id` policies for future Opus tables such as scores, practice sessions, heatmap rows, custom skill cards, and uploaded score metadata.
- Keep uploaded score files in private Supabase Storage buckets and read them with signed URLs.
- Add account deletion before production so a user can delete profile rows, score metadata, storage objects, practice sessions, and custom skill cards.

## Current implementation

- `src/lib/supabaseClient.js`: browser Supabase client created from Vite environment variables.
- `src/context/AuthContext.jsx`: session subscription, social login actions, logout, and minimal profile upsert.
- `src/components/layout/AuthPanel.jsx`: sidebar login/logout UI.
