const MAX_FAILURES = 5;
const WINDOW_MS = 15 * 60 * 1000;
const failures = new Map<string, { count: number; resetAt: number }>();

export function loginAllowed(key: string) {
  const entry = failures.get(key);
  return !entry || entry.resetAt < Date.now() || entry.count < MAX_FAILURES;
}

export function recordLoginFailure(key: string) {
  const entry = failures.get(key);
  if (!entry || entry.resetAt < Date.now()) {
    failures.set(key, { count: 1, resetAt: Date.now() + WINDOW_MS });
  } else {
    entry.count += 1;
  }
}

export function clearLoginFailures(key: string) {
  failures.delete(key);
}