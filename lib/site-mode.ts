export type SiteMode = "coming_soon" | "live";

// Fail closed: anything unexpected -- missing row, fetch failure, bad value --
// resolves to coming_soon rather than accidentally exposing the storefront.
export function resolveSiteMode(value: unknown): SiteMode {
  return value === "live" ? "live" : "coming_soon";
}
