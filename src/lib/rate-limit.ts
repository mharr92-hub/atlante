/**
 * Rate-limit en memoria, por IP.
 *
 * A propósito simple: no hay Redis ni servicio pago (regla 8). En serverless
 * cada instancia tiene su propio contador, así que esto no es una defensa
 * contra un ataque distribuido — es un freno barato contra el envío repetido
 * del mismo formulario. La protección real del handoff es el token de un solo
 * uso y el secreto compartido.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 60_000;

/** `true` si la petición pasa; `false` si hay que responder 429. */
export function allow(key: string, limit = 20, windowMs = WINDOW_MS): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    if (buckets.size > 5000) sweep(now);
    return true;
  }

  bucket.count += 1;
  return bucket.count <= limit;
}

function sweep(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** IP del cliente detrás del proxy de Vercel. Nunca se registra en logs. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
