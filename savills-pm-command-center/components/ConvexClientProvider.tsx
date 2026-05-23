"use client";

import { ReactNode } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { useAuth, useOrganization } from "@clerk/nextjs";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function ConvexClientProvider({
  children,
}: {
  children: ReactNode;
}) {
  // Re-mount ConvexProviderWithClerk whenever the active org changes so it
  // fetches a fresh "convex" JWT template token that contains the new org_id.
  // Without this, the provider caches the pre-org-switch token indefinitely
  // because isLoaded/isSignedIn never change on an org switch.
  const { organization } = useOrganization();

  return (
    <ConvexProviderWithClerk
      key={organization?.id ?? "no-org"}
      client={convex}
      useAuth={useAuth}
    >
      {children}
    </ConvexProviderWithClerk>
  );
}
