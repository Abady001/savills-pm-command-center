import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { OrganizationSwitcher, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import OrganizationSync from "@/components/OrganizationSync";

export default async function DashboardPage() {
  const { orgId } = await auth();

  if (!orgId) {
    redirect("/onboarding");
  }

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 p-8">
      <div className="max-w-5xl mx-auto">
        <header className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Savills PM Command Center
            </h1>
            <p className="text-slate-500 text-sm mt-1">
              Organization-scoped property management
            </p>
          </div>
          <div className="flex items-center gap-3">
            <OrganizationSwitcher
              afterSelectOrganizationUrl="/dashboard"
              afterCreateOrganizationUrl="/dashboard"
            />
            <UserButton />
          </div>
        </header>

        <OrganizationSync />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="rounded-lg border bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h2 className="font-semibold mb-1">Properties</h2>
            <p className="text-slate-500 text-sm">
              Portfolio management scoped to this organization.
            </p>
            <Link
              href="/properties"
              className="mt-3 inline-block text-sm font-medium text-slate-900 underline underline-offset-4 dark:text-slate-100"
            >
              Open Properties
            </Link>
          </div>
          <div className="rounded-lg border bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h2 className="font-semibold mb-1">Buildings</h2>
            <p className="text-slate-500 text-sm">
              Manage buildings under properties for this organization.
            </p>
            <Link
              href="/buildings"
              className="mt-3 inline-block text-sm font-medium text-slate-900 underline underline-offset-4 dark:text-slate-100"
            >
              Open Buildings
            </Link>
          </div>
          <div className="rounded-lg border bg-white dark:bg-slate-900 p-6 shadow-sm">
            <h2 className="font-semibold mb-1">Floors</h2>
            <p className="text-slate-500 text-sm">
              Manage floors under buildings for this organization.
            </p>
            <Link
              href="/floors"
              className="mt-3 inline-block text-sm font-medium text-slate-900 underline underline-offset-4 dark:text-slate-100"
            >
              Open Floors
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
