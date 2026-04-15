

## Plan: Fix Google OAuth Flow and Onboarding Redirect

### What needs to change

**Problem**: Currently, Google OAuth works for both login and signup but doesn't show the Google account picker, and after Google auth the user is redirected to `/dashboard` or `/simulado` instead of going through the onboarding funnel for new users.

### Changes

**1. Add `prompt: "select_account"` to all Google OAuth calls**
- In `Login.tsx` and `Register.tsx`, add `extraParams: { prompt: "select_account" }` to the `signInWithOAuth` call so users can choose which Google account to use.

**2. Fix post-Google-auth redirect logic**
- In both `Login.tsx` and `Register.tsx`, after successful Google auth:
  - Fetch the user's profile to check `onboarding_completo`
  - If `onboarding_completo` is `false` or no onboarding record exists → redirect to `/onboarding`
  - If `onboarding_completo` is `true` → redirect to `/dashboard`
- This ensures new Google users always go through the quiz → VSL → buttons flow.

**3. Ensure ProtectedRoute still enforces onboarding**
- The existing `ProtectedRoute.tsx` already redirects users with incomplete onboarding to `/onboarding` — no changes needed here.

**4. Confirm VSL button behavior (already correct)**
- "Assinar Premium" → marks onboarding complete → `/planos` (checkout)
- "Continuar gratuito" → marks onboarding complete → `/dashboard`
- Both buttons already work as described. No changes needed to `Onboarding.tsx`.

### Files to edit
- `src/pages/Login.tsx` — add `prompt: "select_account"`, check onboarding status after Google login
- `src/pages/Register.tsx` — add `prompt: "select_account"`, check onboarding status after Google signup

