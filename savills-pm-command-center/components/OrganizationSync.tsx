"use client";

import { useEffect } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function OrganizationSync() {
  const { isLoaded, organization } = useOrganization();
  const { isLoading: isConvexAuthLoading, isAuthenticated } = useConvexAuth();
  const syncActiveOrganization = useMutation(
    api.organizations.syncActiveOrganization,
  );
  const orgId = organization?.id;
  const orgName = organization?.name;
  const orgSlug = organization?.slug;

  useEffect(() => {
    if (!isLoaded) return;
    if (!orgId || !orgName) return;
    if (isConvexAuthLoading || !isAuthenticated) return;

    void syncActiveOrganization({
      name: orgName,
      slug: orgSlug ?? undefined,
    }).catch((error: unknown) => {
      console.error("Failed to sync active organization", error);
    });
  }, [
    isLoaded,
    isConvexAuthLoading,
    isAuthenticated,
    orgId,
    orgName,
    orgSlug,
    syncActiveOrganization,
  ]);

  return null;
}
