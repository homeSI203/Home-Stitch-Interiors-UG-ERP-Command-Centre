export const DEFAULT_SUPER_ADMIN_EMAIL = "homestitchinteriorsug@gmail.com";

export function getSuperAdminEmails(): string[] {
  const fromEnv =
    process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAIL ?? DEFAULT_SUPER_ADMIN_EMAIL;
  return fromEnv
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

export function isDesignatedSuperAdminEmail(
  email: string | undefined | null
): boolean {
  if (!email) return false;
  return getSuperAdminEmails().includes(email.trim().toLowerCase());
}
