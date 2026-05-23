import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireOrgPermission, propertyPermissions } from "./lib/permissions";

const buildingTypeValidator = v.union(
  v.literal("residential"),
  v.literal("commercial"),
  v.literal("retail"),
  v.literal("mixed_use"),
  v.literal("parking"),
  v.literal("facility"),
  v.literal("other"),
);

const buildingStatusValidator = v.union(
  v.literal("active"),
  v.literal("inactive"),
  v.literal("archived"),
);

const normalize = (value: string): string => value.trim();
const normalizeCode = (value: string): string => value.trim().toUpperCase();

const assertNonEmpty = (label: string, value: string): string => {
  const normalized = normalize(value);
  if (!normalized) throw new Error(`${label} is required`);
  return normalized;
};

const ensureCodeUnique = async (
  ctx: QueryCtx | MutationCtx,
  organizationId: Id<"organizations">,
  code: string,
  ignoreBuildingId?: Id<"buildings">,
): Promise<void> => {
  const existing = await ctx.db
    .query("buildings")
    .withIndex("by_organizationId_and_code", (q) =>
      q.eq("organizationId", organizationId).eq("code", code),
    )
    .unique();

  if (existing && existing._id !== ignoreBuildingId) {
    throw new Error("Building code already exists in this organization");
  }
};

const verifyPropertyOwnership = async (
  ctx: QueryCtx | MutationCtx,
  propertyId: Id<"properties">,
  organizationId: Id<"organizations">,
): Promise<void> => {
  const property = await ctx.db.get(propertyId);
  if (!property) throw new Error("Property not found");
  if (property.organizationId !== organizationId)
    throw new Error("Property does not belong to this organization");
};

export const list = query({
  args: {
    propertyId: v.optional(v.id("properties")),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireOrgPermission(
      ctx,
      propertyPermissions.read,
    );

    if (args.propertyId !== undefined) {
      await verifyPropertyOwnership(ctx, args.propertyId, organizationId);
    }

    const rows =
      args.propertyId !== undefined
        ? await ctx.db
            .query("buildings")
            .withIndex("by_organizationId_and_propertyId", (q) =>
              q
                .eq("organizationId", organizationId)
                .eq("propertyId", args.propertyId!),
            )
            .order("desc")
            .collect()
        : await ctx.db
            .query("buildings")
            .withIndex("by_organizationId_and_createdAt", (q) =>
              q.eq("organizationId", organizationId),
            )
            .order("desc")
            .collect();

    if (args.includeArchived) return rows;
    return rows.filter((row) => row.status !== "archived");
  },
});

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    name: v.string(),
    code: v.string(),
    type: buildingTypeValidator,
    status: v.optional(buildingStatusValidator),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, clerkUserId } = await requireOrgPermission(
      ctx,
      propertyPermissions.create,
    );

    await verifyPropertyOwnership(ctx, args.propertyId, organizationId);

    const name = assertNonEmpty("Name", args.name);
    const code = assertNonEmpty("Code", normalizeCode(args.code));

    await ensureCodeUnique(ctx, organizationId, code);

    const now = Date.now();
    const buildingId = await ctx.db.insert("buildings", {
      organizationId,
      propertyId: args.propertyId,
      name,
      code,
      type: args.type,
      status: args.status ?? "active",
      address: args.address ? normalize(args.address) : undefined,
      notes: args.notes ? normalize(args.notes) : undefined,
      createdByClerkUserId: clerkUserId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      organizationId,
      actorClerkUserId: clerkUserId,
      action: "building_created",
      entityType: "building",
      entityId: buildingId,
      metadata: { code, name },
      createdAt: now,
    });

    return buildingId;
  },
});

export const update = mutation({
  args: {
    buildingId: v.id("buildings"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    type: v.optional(buildingTypeValidator),
    status: v.optional(buildingStatusValidator),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, clerkUserId } = await requireOrgPermission(
      ctx,
      propertyPermissions.update,
    );

    const building = await ctx.db.get(args.buildingId);
    if (!building) throw new Error("Building not found");
    if (building.organizationId !== organizationId)
      throw new Error("Unauthorized");

    const patch: {
      name?: string;
      code?: string;
      type?:
        | "residential"
        | "commercial"
        | "retail"
        | "mixed_use"
        | "parking"
        | "facility"
        | "other";
      status?: "active" | "inactive" | "archived";
      address?: string;
      notes?: string;
      archivedAt?: number;
      updatedAt: number;
    } = { updatedAt: Date.now() };

    let hasChanges = false;

    if (args.name !== undefined) {
      patch.name = assertNonEmpty("Name", args.name);
      hasChanges = true;
    }

    if (args.code !== undefined) {
      const code = assertNonEmpty("Code", normalizeCode(args.code));
      await ensureCodeUnique(ctx, organizationId, code, building._id);
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

    if (args.address !== undefined) {
      patch.address = normalize(args.address);
      hasChanges = true;
    }

    if (args.notes !== undefined) {
      patch.notes = normalize(args.notes);
      hasChanges = true;
    }

    if (!hasChanges) throw new Error("No fields to update");

    await ctx.db.patch(building._id, patch);

    await ctx.db.insert("auditLogs", {
      organizationId,
      actorClerkUserId: clerkUserId,
      action: "building_updated",
      entityType: "building",
      entityId: building._id,
      metadata: {
        code: patch.code ?? building.code,
        name: patch.name ?? building.name,
      },
      createdAt: patch.updatedAt,
    });

    return building._id;
  },
});

export const archive = mutation({
  args: {
    buildingId: v.id("buildings"),
  },
  handler: async (ctx, args) => {
    const { organizationId, clerkUserId } = await requireOrgPermission(
      ctx,
      propertyPermissions.archive,
    );

    const building = await ctx.db.get(args.buildingId);
    if (!building) throw new Error("Building not found");
    if (building.organizationId !== organizationId)
      throw new Error("Unauthorized");

    const now = Date.now();
    await ctx.db.patch(building._id, {
      status: "archived",
      archivedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      organizationId,
      actorClerkUserId: clerkUserId,
      action: "building_archived",
      entityType: "building",
      entityId: building._id,
      metadata: { code: building.code, name: building.name },
      createdAt: now,
    });

    return building._id;
  },
});
