import { OrganizationList } from "@clerk/nextjs";

export default function OnboardingPage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-6 p-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">
            Welcome to Savills PM
          </h1>
          <p className="mt-2 text-slate-500 text-sm">
            Create or select an organization to continue.
          </p>
        </div>
        <OrganizationList
          hidePersonal
          afterCreateOrganizationUrl="/dashboard"
          afterSelectOrganizationUrl="/dashboard"
        />
      </div>
    </main>
  );
}
