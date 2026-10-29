export const TIJAR_SUPER_ADMIN_EMAIL = "musababubakar123@gmail.com";

export function isTijarSuperAdminEmail(email?: string | null): boolean {
  return (email ?? "").trim().toLowerCase() === TIJAR_SUPER_ADMIN_EMAIL;
}
