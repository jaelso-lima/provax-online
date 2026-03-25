/**
 * Shared security headers for all edge functions.
 * 
 * Includes:
 * - CORS headers
 * - CSRF protection via Origin/Referer validation
 * - Security hardening headers (XSS, Content-Type sniffing, clickjacking, etc.)
 */

const ALLOWED_ORIGINS = [
  "https://provax-online.lovable.app",
  "https://id-preview--f77f69ee-d923-4f76-9fc7-4cc8cbcae1a4.lovable.app",
  "https://provax.online",
  "https://www.provax.online",
  "http://localhost:5173",
  "http://localhost:3000",
];

/** Base CORS headers */
export const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

/** Security headers added to every response */
export const securityHeaders: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Type": "application/json",
};

/** Returns combined CORS + security headers */
export function getResponseHeaders(): Record<string, string> {
  return { ...corsHeaders, ...securityHeaders };
}

/**
 * Validates the request origin against allowed origins (CSRF protection).
 * Webhooks (no Origin header) are exempt — they use their own signature validation.
 * Returns null if valid, or an error message if blocked.
 */
export function validateOrigin(req: Request): string | null {
  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");

  // No origin = server-to-server call (webhooks, cron, etc.) — allow
  if (!origin && !referer) return null;

  // Check origin first
  if (origin) {
    if (ALLOWED_ORIGINS.some((allowed) => origin.startsWith(allowed))) return null;
    // Allow Lovable preview origins (dynamic subdomains)
    if (origin.includes(".lovable.app") || origin.includes(".lovableproject.com")) return null;
    return `Origin bloqueada: ${origin}`;
  }

  // Fallback to referer
  if (referer) {
    if (ALLOWED_ORIGINS.some((allowed) => referer.startsWith(allowed))) return null;
    if (referer.includes(".lovable.app") || referer.includes(".lovableproject.com")) return null;
    return `Referer bloqueado: ${referer}`;
  }

  return null;
}

/** Creates a JSON error response with all security headers */
export function errorResponse(message: string, status: number): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: getResponseHeaders(),
  });
}

/** Creates a JSON success response with all security headers */
export function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: getResponseHeaders(),
  });
}

/** Handles OPTIONS preflight */
export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}
