import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireOrgPermission, propertyPermissions } from "./lib/permissions";

const propertyTypeValidator = v.union(
  v.literal("residential"),
  v.literal("commercial"),
  v.literal("retail"),
  v.literal("mixed_use"),
  v.literal("administrative"),
  v.literal("industrial"),
  v.literal("other"),
);

const propertyStatusValidator = v.union(
  v.literal("active"),
  v.literal("mobilization"),
  v.literal("inactive"),
  v.literal("archived"),
);

const normalize = (value: string): string => value.trim();
const normalizeCode = (value: string): string => value.trim().toUpperCase();

const assertNonEmpty = (label: string, value: string): string => {
  const normalizedValue = normalize(value);
  if (!normalizedValue) {
    throw new Error(`${label} is required`);
  }
  return normalizedValue;
};

const ensureCodeUnique = async (
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
  code: string,
  ignorePropertyId?: Id<"properties">,
): Promise<void> => {
  const existing = await ctx.db
    .query("properties")
    .withIndex("by_organization_and_code", (q) =>
      q.eq("organizationId", organizationId).eq("code", code),
    )
    .unique();

  if (existing && existing._id !== ignorePropertyId) {
    throw new Error("Property code already exists in this organization");
  }
};

export const list = query({
  args: {
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireOrgPermission(
      ctx,
      propertyPermissions.read,
    );

    const rows = await ctx.db
      .query("properties")
      .withIndex("by_organization_and_createdAt", (q) =>
        q.eq("organizationId", organizationId),
      )
      .order("desc")
      .collect();

    if (args.includeArchived) {
      return rows;
    }

    return rows.filter((row) => row.status !== "archived");
  },
});

export const get = query({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireOrgPermission(
      ctx,
      propertyPermissions.read,
    );
    const property = await ctx.db.get(args.propertyId);

    if (!property) {
      throw new Error("Property not found");
    }

    if (property.organizationId !== organizationId) {
      throw new Error("Unauthorized");
    }

    return property;
  },
});

export const create = mutation({
  args: {
    name: v.string(),
    code: v.string(),
    type: propertyTypeValidator,
    status: v.optional(propertyStatusValidator),
    addressLine1: v.optional(v.string()),
    city: v.string(),
    country: v.string(),
    timezone: v.string(),
    currency: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, clerkUserId } = await requireOrgPermission(
      ctx,
      propertyPermissions.create,
    );

    const name = assertNonEmpty("Name", args.name);
    const code = assertNonEmpty("Code", normalizeCode(args.code));
    const city = assertNonEmpty("City", args.city);
    const country = assertNonEmpty("Country", args.country);
    const timezone = assertNonEmpty("Timezone", args.timezone);
    const currency = assertNonEmpty("Currency", args.currency);

    await ensureCodeUnique(ctx, organizationId, code);

    const now = Date.now();
    const propertyId = await ctx.db.insert("properties", {
      organizationId,
      name,
      code,
      type: args.type,
      status: args.status ?? "active",
      addressLine1: args.addressLine1 ? normalize(args.addressLine1) : undefined,
      city,
      country,
      timezone,
      currency,
      description: args.description ? normalize(args.description) : undefined,
      createdByClerkUserId: clerkUserId,
      updatedByClerkUserId: clerkUserId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      organizationId,
      actorClerkUserId: clerkUserId,
      action: "property_created",
      entityType: "property",
      entityId: propertyId,
      metadata: { code, name },
      createdAt: now,
    });

    return propertyId;
  },
});

export const update = mutation({
  args: {
    propertyId: v.id("properties"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    type: v.optional(propertyTypeValidator),
    status: v.optional(propertyStatusValidator),
    addressLine1: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    timezone: v.optional(v.string()),
    currency: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, clerkUserId } = await requireOrgPermission(
      ctx,
      propertyPermissions.update,
    );
    const property = await ctx.db.get(args.propertyId);

    if (!property) {
      throw new Error("Property not found");
    }

    if (property.organizationId !== organizationId) {
      throw new Error("Unauthorized");
    }

    const patch: {
      name?: string;
      code?: string;
      type?:
        | "residential"
        | "commercial"
        | "retail"
        | "mixed_use"
        | "administrative"
        | "industrial"
        | "other";
      status?: "active" | "mobilization" | "inactive" | "archived";
      addressLine1?: string;
      city?: string;
      country?: string;
      timezone?: string;
      currency?: string;
      description?: string;
      archivedAt?: number;
      updatedByClerkUserId: string;
      updatedAt: number;
    } = {
      updatedByClerkUserId: clerkUserId,
      updatedAt: Date.now(),
    };

    let hasChanges = false;

    if (args.name !== undefined) {
      patch.name = assertNonEmpty("Name", args.name);
      hasChanges = true;
    }

    if (args.code !== undefined) {
      const code = assertNonEmpty("Code", normalizeCode(args.code));
      await ensureCodeUnique(ctx, organizationId, code, property._id);
      patch.code = code;
      hasChanges = true;
    }

    if (args.type !== undefined) {
      patch.type = args.type;
      hasChanges = true;
    }

    if (args.status !== undefined) {
      patch.status = args.status;
      if (args.status === "archived") {
        patch.archivedAt = patch.updatedAt;
      }
      hasChanges = true;
    }

    if (args.addressLine1 !== undefined) {
      patch.addressLine1 = normalize(args.addressLine1);
      hasChanges = true;
    }

    if (args.city !== undefined) {
      patch.city = assertNonEmpty("City", args.city);
      hasChanges = true;
    }

    if (args.country !== undefined) {
      patch.country = assertNonEmpty("Country", args.country);
      hasChanges = true;
    }

    if (args.timezone !== undefined) {
      patch.timezone = assertNonEmpty("Timezone", args.timezone);
      hasChanges = true;
    }

    if (args.currency !== undefined) {
      patch.currency = assertNonEmpty("Currency", args.currency);
      hasChanges = true;
    }

    if (args.description !== undefined) {
      patch.description = normalize(args.description);
      hasChanges = true;
    }

    if (!hasChanges) {
      throw new Error("No fields to update");
    }

    await ctx.db.patch(property._id, patch);

    await ctx.db.insert("auditLogs", {
      organizationId,
      actorClerkUserId: clerkUserId,
      action: "property_updated",
      entityType: "property",
      entityId: property._id,
      metadata: {
        code: patch.code ?? property.code,
        name: patch.name ?? property.name,
      },
      createdAt: patch.updatedAt,
    });

    return property._id;
  },
});

export const archive = mutation({
  args: {
    propertyId: v.id("properties"),
  },
  handler: async (ctx, args) => {
    const { organizationId, clerkUserId } = await requireOrgPermission(
      ctx,
      propertyPermissions.archive,
    );
    const property = await ctx.db.get(args.propertyId);

    if (!property) {
      throw new Error("Property not found");
    }

    if (property.organizationId !== organizationId) {
      throw new Error("Unauthorized");
    }

    const now = Date.now();
    await ctx.db.patch(property._id, {
      status: "archived",
      archivedAt: now,
      updatedByClerkUserId: clerkUserId,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      organizationId,
      actorClerkUserId: clerkUserId,
      action: "property_archived",
      entityType: "property",
      entityId: property._id,
      metadata: {
        code: property.code,
        name: property.name,
      },
      createdAt: now,
    });

    return property._id;
  },
});
