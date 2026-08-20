/**
 * Extrai a mensagem real de erro retornada por uma Edge Function.
 * O supabase-js devolve apenas "Edge Function returned a non-2xx status code";
 * o corpo JSON com a mensagem fica em `error.context`.
 */
export async function extractEdgeError(err: unknown, fallback = "Erro inesperado"): Promise<string> {
  const anyErr = err as { message?: string; context?: Response };
  const ctx = anyErr?.context;
  if (ctx && typeof (ctx as Response).clone === "function") {
    try {
      const body = await (ctx as Response).clone().json();
      if (typeof body?.error === "string") return body.error;
      if (typeof body?.message === "string") return body.message;
    } catch {
      try {
        const text = await (ctx as Response).clone().text();
        if (text) return text.slice(0, 300);
      } catch { /* ignore */ }
    }
  }
  return anyErr?.message || fallback;
}
