import { Id } from "../_generated/dataModel";
import { MutationCtx, QueryCtx } from "../_generated/server";

// ---------------------------------------------------------------------------
// Clerk claim helpers — support both claim formats:
//   1. Flattened template claims: org_id, org_slug, org_role
//   2. Clerk v2 compact native claims: o.id, o.slg, o.rol (no "org:" prefix)
// ---------------------------------------------------------------------------

function getRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

function getString(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function normalizeOrgRole(role: string | null): string {
  if (!role) return "org:member";
  return role.startsWith("org:") ? role : `org:${role}`;
}

export type OrgClaims = {
  clerkOrgId: string | null;
  orgSlug: string | null;
  orgRole: string;
};

export function readOrgClaims(identity: unknown): OrgClaims {
  const claims = getRecord(identity);
  if (!claims) {
    return { clerkOrgId: null, orgSlug: null, orgRole: "org:member" };
  }

  const compactOrg = getRecord(claims.o);

  const clerkOrgId =
    getString(claims.org_id) ?? getString(compactOrg?.id) ?? null;

  const orgSlug =
    getString(claims.org_slug) ?? getString(compactOrg?.slg) ?? null;

  const orgRole = normalizeOrgRole(
    getString(claims.org_role) ?? getString(compactOrg?.rol),
  );

  return { clerkOrgId, orgSlug, orgRole };
}

// ---------------------------------------------------------------------------
// requireOrg — resolves org context for every domain function
// ---------------------------------------------------------------------------

type RequireOrgResult = {
  organizationId: Id<"organizations">;
  clerkOrgId: string;
  clerkUserId: string;
  orgRole: string;
};

export async function requireOrg(
  ctx: QueryCtx | MutationCtx,
): Promise<RequireOrgResult> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Unauthenticated");
  }

  const { clerkOrgId, orgRole } = readOrgClaims(identity);

  if (!clerkOrgId) {
    throw new Error("No active organization selected");
  }

  const organization = await ctx.db
    .query("organizations")
    .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", clerkOrgId))
    .unique();

  if (!organization) {
    throw new Error("Active organization is not synced yet");
  }

  return {
    organizationId: organization._id,
    clerkOrgId,
    clerkUserId: identity.subject,
    orgRole,
  };
}
