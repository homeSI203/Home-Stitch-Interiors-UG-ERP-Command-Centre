const STORAGE_KEY = "hsi.auth.rememberedEmails";
const LAST_KEY = "hsi.auth.lastEmail";
const MAX_EMAILS = 8;

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function loadRememberedEmails(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((v) => String(v ?? "").trim())
      .filter((v) => v.includes("@"))
      .slice(0, MAX_EMAILS);
  } catch {
    return [];
  }
}

export function loadLastRememberedEmail(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem(LAST_KEY)?.trim() || loadRememberedEmails()[0] || "";
}

/** Save email only — never store passwords. */
export function rememberLoginEmail(email: string) {
  if (typeof window === "undefined") return;
  const next = normalizeEmail(email);
  if (!next.includes("@")) return;

  const existing = loadRememberedEmails().filter((e) => normalizeEmail(e) !== next);
  const list = [next, ...existing].slice(0, MAX_EMAILS);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  window.localStorage.setItem(LAST_KEY, next);
}

export function removeRememberedEmail(email: string) {
  if (typeof window === "undefined") return;
  const target = normalizeEmail(email);
  const list = loadRememberedEmails().filter((e) => normalizeEmail(e) !== target);
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  const last = window.localStorage.getItem(LAST_KEY);
  if (last && normalizeEmail(last) === target) {
    if (list[0]) window.localStorage.setItem(LAST_KEY, list[0]);
    else window.localStorage.removeItem(LAST_KEY);
  }
}
