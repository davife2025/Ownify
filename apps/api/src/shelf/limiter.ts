/** One shared fixed-window counter. Protects the Hugging Face token on a public demo. */
export function makeLimiter(max: number, windowMs: number, now: () => number = Date.now) {
  let start = now();
  let count = 0;
  return (): { ok: true } | { ok: false; retryAfterSec: number } => {
    const t = now();
    if (t - start >= windowMs) {
      start = t;
      count = 0;
    }
    if (count >= max) return { ok: false, retryAfterSec: Math.ceil((start + windowMs - t) / 1000) };
    count++;
    return { ok: true };
  };
}
