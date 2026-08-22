import { AdminSignInScreen } from "@/features/admin";

export const dynamic = "force-dynamic";

// Typed inline rather than through PageProps<...>: Next only regenerates
// .next/types on a build, so the generated route union does not know about a
// route added since the last one and tsc fails on correct code.
type AdminSignInPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminSignInPage({
  searchParams,
}: AdminSignInPageProps) {
  // `denied` is set by the sign-out redirect when the guard turns someone
  // away; the screen narrows it against the known reasons before rendering.
  // A repeated query param arrives as an array, so anything but a string is
  // treated as absent.
  const { denied } = await searchParams;

  return (
    <AdminSignInScreen
      denied={typeof denied === "string" ? denied : undefined}
    />
  );
}
