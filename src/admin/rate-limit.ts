const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

export function loginRateLimitKey(email: string): string {
  return email.trim().toLowerCase().slice(0, 254);
}

export function isLoginRateLimited(key: string, now = Date.now()): boolean {
  const state = attempts.get(key);
  if (!state || state.resetAt <= now) {
    attempts.delete(key);
    return false;
  }
  return state.count >= MAX_ATTEMPTS;
}

export function recordLoginFailure(key: string, now = Date.now()): void {
  const state = attempts.get(key);
  attempts.set(
    key,
    !state || state.resetAt <= now
      ? { count: 1, resetAt: now + WINDOW_MS }
      : { ...state, count: state.count + 1 },
  );
}

export function clearLoginFailures(key: string): void {
  attempts.delete(key);
}
