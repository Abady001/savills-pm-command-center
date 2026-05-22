"use client";

import { useEffect } from "react";
import { useOrganization } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function OrganizationSync() {
  const { organization } = useOrganization();
  const syncActiveOrganization = useMutation(
    api.organizations.syncActiveOrganization,
  );

  const orgId = organization?.id ?? null;
  const orgName = organization?.name ?? null;
  const orgSlug = organization?.slug ?? null;

  useEffect(() => {
    if (!orgId || !orgName) return;
    syncActiveOrganization({
      name: orgName,
      slug: orgSlug ?? undefined,
    }).catch(console.error);
  }, [orgId, orgName, orgSlug, syncActiveOrganization]);

  return null;
}
