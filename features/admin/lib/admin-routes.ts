// One list of admin paths so the proxy, the guard, the nav, and the redirects
// can never drift apart -- a typo in any one of them is either a lockout or an
// open door. Pure constants on purpose: the proxy imports this, so it must not
// pull `server-only` or env into the request path.

export const adminRoutes = {
  dashboard: "/admin",
  signIn: "/admin/sign-in",
  callback: "/admin/auth/callback",
  signOut: "/admin/auth/sign-out",
  subscribers: "/admin/subscribers",
  subscribersExport: "/admin/subscribers/export",
  // Seams. These segments land with Lane H (products, slots) and Lane I
  // (orders); until then the nav links 404 by design.
  products: "/admin/products",
  slots: "/admin/slots",
  orders: "/admin/orders",
} as const;

// Reachable while signed out. The magic-link round trip dies if the callback
// is behind the same redirect as everything else.
export const publicAdminPrefixes = [adminRoutes.signIn, "/admin/auth"] as const;

export function isPublicAdminPath(pathname: string): boolean {
  return publicAdminPrefixes.some((prefix) => pathname.startsWith(prefix));
}
