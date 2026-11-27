// Small, testable helpers for admin-only API routes.

/** "Bearer abc" → "abc"; anything else → null */
export function bearerToken(header: string | null | undefined): string | null {
  if (!header) return null;
  const m = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return m ? m[1] : null;
}

export type AdminCheckDeps = {
  /** returns the user id for a valid token, or null */
  userFromToken: (token: string) => Promise<string | null>;
  /** asks the database whether that token belongs to an admin */
  isAdminWithToken: (token: string) => Promise<boolean>;
  /** cookie-based fallback (same-site requests from the admin dashboard) */
  isAdminFromCookies: () => Promise<boolean>;
};

/** Admin check: a valid Bearer token wins; otherwise the login cookie is used. */
export async function checkAdmin(authorization: string | null | undefined, deps: AdminCheckDeps): Promise<boolean> {
  const token = bearerToken(authorization);
  if (token) {
    const user = await deps.userFromToken(token).catch(() => null);
    if (!user) return false;
    return deps.isAdminWithToken(token).catch(() => false);
  }
  return deps.isAdminFromCookies().catch(() => false);
}
