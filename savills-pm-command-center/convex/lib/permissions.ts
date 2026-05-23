import { MutationCtx, QueryCtx } from "../_generated/server";
import { requireOrg, RequireOrgResult } from "./requireOrg";

export const propertyPermissions = {
  read: "org:properties:read",
  create: "org:properties:create",
  update: "org:properties:update",
  archive: "org:properties:archive",
} as const;

type PropertyPermission =
  (typeof propertyPermissions)[keyof typeof propertyPermissions];

/**
 * Resolves org context and enforces a Clerk custom permission.
 *
 * Priority:
 *   1. Explicit permission present in Clerk JWT claims (org.per / org_permissions)
 *   2. Role fallback: org:admin may perform any property action
 *   3. Role fallback: org:member may only read
 *   4. Deny with a clear error message
 *
 * Never accepts role or permission from frontend args.
 */
export async function requireOrgPermission(
  ctx: QueryCtx | MutationCtx,
  permission: PropertyPermission,
): Promise<RequireOrgResult> {
  const org = await requireOrg(ctx);
  const { orgRole, orgPermissions } = org;

  if (orgPermissions.includes(permission)) return org;
  if (orgRole === "org:admin") return org;
  if (orgRole === "org:member" && permission === propertyPermissions.read)
    return org;

  throw new Error("You do not have permission to perform this action.");
}
