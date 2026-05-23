import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import OrganizationSync from "@/components/OrganizationSync";
import PropertiesClient from "@/components/properties/PropertiesClient";

export default async function PropertiesPage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 sm:p-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-slate-500">
              <Link href="/dashboard" className="underline underline-offset-4">
                Back to dashboard
              </Link>
            </p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight">Properties</h1>
            <p className="mt-1 text-sm text-slate-500">
              Create and manage properties for the active organization.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <OrganizationSwitcher
              afterSelectOrganizationUrl="/properties"
              afterCreateOrganizationUrl="/properties"
            />
            <UserButton />
          </div>
        </header>

        <OrganizationSync />
        <PropertiesClient />
      </div>
    </main>
  );
}
