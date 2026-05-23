import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireOrgPermission, tenantPermissions } from "./lib/permissions";

const tenantTypeValidator = v.union(
  v.literal("individual"),
  v.literal("company"),
);

const tenantStatusValidator = v.union(
  v.literal("prospect"),
  v.literal("active"),
  v.literal("inactive"),
  v.literal("blacklisted"),
  v.literal("archived"),
);

const tenantCategoryValidator = v.union(
  v.literal("residential"),
  v.literal("commercial"),
  v.literal("retail"),
  v.literal("office"),
  v.literal("anchor"),
  v.literal("temporary"),
  v.literal("staff_housing"),
  v.literal("other"),
);

type TenantType = "individual" | "company";
type TenantStatus =
  | "prospect"
  | "active"
  | "inactive"
  | "blacklisted"
  | "archived";
type TenantCategory =
  | "residential"
  | "commercial"
  | "retail"
  | "office"
  | "anchor"
  | "temporary"
  | "staff_housing"
  | "other";

const normalize = (value: string): string => value.trim();
const normalizeEmail = (value: string): string => value.trim().toLowerCase();
const normalizePhone = (value: string): string => value.replace(/\s+/g, "");

const assertNonEmpty = (label: string, value: string): string => {
  const normalized = normalize(value);
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
};

const ensureEmailUnique = async (
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
  email: string,
  ignoreTenantId?: Id<"tenants">,
): Promise<void> => {
  const existing = await ctx.db
    .query("tenants")
    .withIndex("by_organization_primaryEmail", (q) =>
      q.eq("organizationId", organizationId).eq("primaryEmail", email),
    )
    .unique();
  if (existing && existing._id !== ignoreTenantId) {
    throw new Error("Another tenant in this organization already uses that email");
  }
};

const ensurePhoneUnique = async (
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
  phone: string,
  ignoreTenantId?: Id<"tenants">,
): Promise<void> => {
  const existing = await ctx.db
    .query("tenants")
    .withIndex("by_organization_primaryPhone", (q) =>
      q.eq("organizationId", organizationId).eq("primaryPhone", phone),
    )
    .unique();
  if (existing && existing._id !== ignoreTenantId) {
    throw new Error("Another tenant in this organization already uses that phone");
  }
};

export const list = query({
  args: {
    status: v.optional(tenantStatusValidator),
    tenantType: v.optional(tenantTypeValidator),
    search: v.optional(v.string()),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireOrgPermission(
      ctx,
      tenantPermissions.read,
    );

    const rows = await ctx.db
      .query("tenants")
      .withIndex("by_organization", (q) =>
        q.eq("organizationId", organizationId),
      )
      .order("desc")
      .collect();

    // Belt-and-suspenders tenant scoping
    const orgScoped = rows.filter(
      (row) => row.organizationId === organizationId,
    );

    const archivedFiltered = args.includeArchived
      ? orgScoped
      : orgScoped.filter((row) => row.status !== "archived");

    const statusFiltered = args.status
      ? archivedFiltered.filter((row) => row.status === args.status)
      : archivedFiltered;

    const typeFiltered = args.tenantType
      ? statusFiltered.filter((row) => row.tenantType === args.tenantType)
      : statusFiltered;

    const search = args.search?.trim().toLowerCase();
    if (!search) return typeFiltered;

    return typeFiltered.filter((row) => {
      const haystacks: string[] = [
        row.displayName,
        row.legalName ?? "",
        row.tradeName ?? "",
        row.primaryContactName ?? "",
        row.primaryEmail ?? "",
        row.primaryPhone ?? "",
      ].map((s) => s.toLowerCase());
      return haystacks.some((h) => h.includes(search));
    });
  },
});

export const create = mutation({
  args: {
    tenantType: tenantTypeValidator,
    status: tenantStatusValidator,
    displayName: v.string(),
    legalName: v.optional(v.string()),
    tradeName: v.optional(v.string()),
    primaryContactName: v.optional(v.string()),
    primaryEmail: v.optional(v.string()),
    primaryPhone: v.optional(v.string()),
    secondaryPhone: v.optional(v.string()),
    taxId: v.optional(v.string()),
    commercialRegisterNumber: v.optional(v.string()),
    nationalIdOrPassport: v.optional(v.string()),
    industry: v.optional(v.string()),
    tenantCategory: v.optional(tenantCategoryValidator),
    preferredLanguage: v.optional(v.string()),
    billingAddress: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, clerkUserId } = await requireOrgPermission(
      ctx,
      tenantPermissions.create,
    );

    const displayName = assertNonEmpty("Display name", args.displayName);

    const email = args.primaryEmail
      ? normalizeEmail(args.primaryEmail)
      : undefined;
    const phone = args.primaryPhone
      ? normalizePhone(args.primaryPhone)
      : undefined;

    if (!email && !phone) {
      throw new Error(
        "Provide at least one contact channel (primary email or phone)",
      );
    }

    if (email) await ensureEmailUnique(ctx, organizationId, email);
    if (phone) await ensurePhoneUnique(ctx, organizationId, phone);

    const now = Date.now();
    const tenantId = await ctx.db.insert("tenants", {
      organizationId,
      tenantType: args.tenantType,
      status: args.status,
      displayName,
      legalName: args.legalName ? normalize(args.legalName) : undefined,
      tradeName: args.tradeName ? normalize(args.tradeName) : undefined,
      primaryContactName: args.primaryContactName
        ? normalize(args.primaryContactName)
        : undefined,
      primaryEmail: email,
      primaryPhone: phone,
      secondaryPhone: args.secondaryPhone
        ? normalizePhone(args.secondaryPhone)
        : undefined,
      taxId: args.taxId ? normalize(args.taxId) : undefined,
      commercialRegisterNumber: args.commercialRegisterNumber
        ? normalize(args.commercialRegisterNumber)
        : undefined,
      nationalIdOrPassport: args.nationalIdOrPassport
        ? normalize(args.nationalIdOrPassport)
        : undefined,
      industry: args.industry ? normalize(args.industry) : undefined,
      tenantCategory: args.tenantCategory,
      preferredLanguage: args.preferredLanguage
        ? normalize(args.preferredLanguage)
        : undefined,
      billingAddress: args.billingAddress
        ? normalize(args.billingAddress)
        : undefined,
      notes: args.notes ? normalize(args.notes) : undefined,
      createdBy: clerkUserId,
      updatedBy: clerkUserId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      organizationId,
      actorClerkUserId: clerkUserId,
      action: "tenant_created",
      entityType: "tenant",
      entityId: tenantId,
      metadata: {
        displayName,
        tenantType: args.tenantType,
      },
      createdAt: now,
    });

    return tenantId;
  },
});

export const update = mutation({
  args: {
    tenantId: v.id("tenants"),
    tenantType: v.optional(tenantTypeValidator),
    status: v.optional(tenantStatusValidator),
    displayName: v.optional(v.string()),
    legalName: v.optional(v.string()),
    tradeName: v.optional(v.string()),
    primaryContactName: v.optional(v.string()),
    primaryEmail: v.optional(v.string()),
    primaryPhone: v.optional(v.string()),
    secondaryPhone: v.optional(v.string()),
    taxId: v.optional(v.string()),
    commercialRegisterNumber: v.optional(v.string()),
    nationalIdOrPassport: v.optional(v.string()),
    industry: v.optional(v.string()),
    tenantCategory: v.optional(tenantCategoryValidator),
    preferredLanguage: v.optional(v.string()),
    billingAddress: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, clerkUserId } = await requireOrgPermission(
      ctx,
      tenantPermissions.update,
    );

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");
    if (tenant.organizationId !== organizationId)
      throw new Error("Unauthorized");

    const patch: {
      tenantType?: TenantType;
      status?: TenantStatus;
      displayName?: string;
      legalName?: string;
      tradeName?: string;
      primaryContactName?: string;
      primaryEmail?: string;
      primaryPhone?: string;
      secondaryPhone?: string;
      taxId?: string;
      commercialRegisterNumber?: string;
      nationalIdOrPassport?: string;
      industry?: string;
      tenantCategory?: TenantCategory;
      preferredLanguage?: string;
      billingAddress?: string;
      notes?: string;
      archivedAt?: number;
      updatedBy: string;
      updatedAt: number;
    } = { updatedBy: clerkUserId, updatedAt: Date.now() };

    let hasChanges = false;

    if (args.tenantType !== undefined) {
      patch.tenantType = args.tenantType;
      hasChanges = true;
    }
    if (args.status !== undefined) {
      patch.status = args.status;
      if (args.status === "archived") patch.archivedAt = patch.updatedAt;
      hasChanges = true;
    }
    if (args.displayName !== undefined) {
      patch.displayName = assertNonEmpty("Display name", args.displayName);
      hasChanges = true;
    }
    if (args.legalName !== undefined) {
      patch.legalName = normalize(args.legalName);
      hasChanges = true;
    }
    if (args.tradeName !== undefined) {
      patch.tradeName = normalize(args.tradeName);
      hasChanges = true;
    }
    if (args.primaryContactName !== undefined) {
      patch.primaryContactName = normalize(args.primaryContactName);
      hasChanges = true;
    }
    if (args.primaryEmail !== undefined) {
      const email = normalizeEmail(args.primaryEmail);
      if (email) await ensureEmailUnique(ctx, organizationId, email, tenant._id);
      patch.primaryEmail = email || undefined;
      hasChanges = true;
    }
    if (args.primaryPhone !== undefined) {
      const phone = normalizePhone(args.primaryPhone);
      if (phone) await ensurePhoneUnique(ctx, organizationId, phone, tenant._id);
      patch.primaryPhone = phone || undefined;
      hasChanges = true;
    }
    if (args.secondaryPhone !== undefined) {
      patch.secondaryPhone = normalizePhone(args.secondaryPhone) || undefined;
      hasChanges = true;
    }
    if (args.taxId !== undefined) {
      patch.taxId = normalize(args.taxId);
      hasChanges = true;
    }
    if (args.commercialRegisterNumber !== undefined) {
      patch.commercialRegisterNumber = normalize(args.commercialRegisterNumber);
      hasChanges = true;
    }
    if (args.nationalIdOrPassport !== undefined) {
      patch.nationalIdOrPassport = normalize(args.nationalIdOrPassport);
      hasChanges = true;
    }
    if (args.industry !== undefined) {
      patch.industry = normalize(args.industry);
      hasChanges = true;
    }
    if (args.tenantCategory !== undefined) {
      patch.tenantCategory = args.tenantCategory;
      hasChanges = true;
    }
    if (args.preferredLanguage !== undefined) {
      patch.preferredLanguage = normalize(args.preferredLanguage);
      hasChanges = true;
    }
    if (args.billingAddress !== undefined) {
      patch.billingAddress = normalize(args.billingAddress);
      hasChanges = true;
    }
    if (args.notes !== undefined) {
      patch.notes = normalize(args.notes);
      hasChanges = true;
    }

    if (!hasChanges) throw new Error("No fields to update");

    await ctx.db.patch(tenant._id, patch);

    await ctx.db.insert("auditLogs", {
      organizationId,
      actorClerkUserId: clerkUserId,
      action: "tenant_updated",
      entityType: "tenant",
      entityId: tenant._id,
      metadata: {
        displayName: patch.displayName ?? tenant.displayName,
      },
      createdAt: patch.updatedAt,
    });

    return tenant._id;
  },
});

export const archive = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const { organizationId, clerkUserId } = await requireOrgPermission(
      ctx,
      tenantPermissions.archive,
    );

    const tenant = await ctx.db.get(args.tenantId);
    if (!tenant) throw new Error("Tenant not found");
    if (tenant.organizationId !== organizationId)
      throw new Error("Unauthorized");

    const now = Date.now();
    await ctx.db.patch(tenant._id, {
      status: "archived",
      archivedAt: now,
      updatedAt: now,
      updatedBy: clerkUserId,
    });

    await ctx.db.insert("auditLogs", {
      organizationId,
      actorClerkUserId: clerkUserId,
      action: "tenant_archived",
      entityType: "tenant",
      entityId: tenant._id,
      metadata: { displayName: tenant.displayName },
      createdAt: now,
    });

    return tenant._id;
  },
});
