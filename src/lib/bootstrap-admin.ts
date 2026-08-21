export const DEFAULT_SUPER_ADMIN_EMAIL = "homestitchinteriorsug@gmail.com";

export const DEFAULT_SUPER_ADMIN_EMAILS = [
  "homestitchinteriorsug@gmail.com",
  "elisasaychitoleko2@gmail.com",
];

export function getSuperAdminEmails(): string[] {
  const fromEnv = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
  return [...new Set([...DEFAULT_SUPER_ADMIN_EMAILS, ...fromEnv])];
}

export function isDesignatedSuperAdminEmail(
  email: string | undefined | null
): boolean {
  if (!email) return false;
  return getSuperAdminEmails().includes(email.trim().toLowerCase());
}
