import { MutationCtx, QueryCtx } from "../_generated/server";
import { requireOrg, RequireOrgResult } from "./requireOrg";

export const propertyPermissions = {
  read: "org:properties:read",
  create: "org:properties:create",
  update: "org:properties:update",
  archive: "org:properties:archive",
} as const;

export const tenantPermissions = {
  read: "org:tenants:read",
  create: "org:tenants:create",
  update: "org:tenants:update",
  archive: "org:tenants:archive",
} as const;

type PropertyPermission =
  (typeof propertyPermissions)[keyof typeof propertyPermissions];
type TenantPermission =
  (typeof tenantPermissions)[keyof typeof tenantPermissions];

export type OrgPermission = PropertyPermission | TenantPermission;

/**
 * Resolves org context and enforces a Clerk custom permission.
 *
 * Priority:
 *   1. Explicit permission present in Clerk JWT claims (org.per / org_permissions)
 *   2. Role fallback: org:admin may perform any action
 *   3. Role fallback: org:member may perform any `*:read` action
 *   4. Deny with a clear error message
 *
 * Never accepts role or permission from frontend args.
 */
export async function requireOrgPermission(
  ctx: QueryCtx | MutationCtx,
  permission: OrgPermission,
): Promise<RequireOrgResult> {
  const org = await requireOrg(ctx);
  const { orgRole, orgPermissions } = org;

  if (orgPermissions.includes(permission)) return org;
  if (orgRole === "org:admin") return org;
  if (orgRole === "org:member" && permission.endsWith(":read")) return org;

  throw new Error("You do not have permission to perform this action.");
}
