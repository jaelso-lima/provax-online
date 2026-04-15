

## Plan: Set `provax.online` as Primary Domain

All references to `provax-online.lovable.app` in the codebase need to be replaced with `provax.online`. The custom domain is already in the CORS allowlist (`security-headers.ts`), so the backend already accepts it.

Additionally, you need to set `provax.online` as the **Primary** domain in **Project Settings → Domains** so that `provax-online.lovable.app` redirects to it.

### Code changes (5 files)

1. **`index.html`** — Update canonical URL, og:url, and JSON-LD url from `provax-online.lovable.app` to `provax.online`

2. **`public/robots.txt`** — Update Sitemap URL to `https://provax.online/sitemap.xml`

3. **`src/components/ShareResultCard.tsx`** — Replace share card text references to `provax.online`

4. **`src/lib/editalPdf.ts`** — Replace PDF footer text to `provax.online`

5. **`supabase/functions/_shared/security-headers.ts`** — Keep `provax.online` (already there), remove or keep the lovable.app entry as fallback

### Manual step

Go to **Project Settings → Domains**, find `provax.online`, and set it as **Primary**. This ensures all traffic to the `.lovable.app` URL redirects to `provax.online`.

