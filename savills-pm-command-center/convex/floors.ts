import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireOrgPermission, propertyPermissions } from "./lib/permissions";

const floorTypeValidator = v.union(
  v.literal("residential"),
  v.literal("commercial"),
  v.literal("retail"),
  v.literal("parking"),
  v.literal("amenity"),
  v.literal("mechanical"),
  v.literal("other"),
);

const floorStatusValidator = v.union(
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
  ignoreFloorId?: Id<"floors">,
): Promise<void> => {
  const existing = await ctx.db
    .query("floors")
    .withIndex("by_organizationId_and_code", (q) =>
      q.eq("organizationId", organizationId).eq("code", code),
    )
    .unique();

  if (existing && existing._id !== ignoreFloorId) {
    throw new Error("Floor code already exists in this organization");
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

const verifyBuildingOwnership = async (
  ctx: QueryCtx | MutationCtx,
  buildingId: Id<"buildings">,
  organizationId: Id<"organizations">,
  propertyId?: Id<"properties">,
): Promise<void> => {
  const building = await ctx.db.get(buildingId);
  if (!building) throw new Error("Building not found");
  if (building.organizationId !== organizationId)
    throw new Error("Building does not belong to this organization");
  if (propertyId !== undefined && building.propertyId !== propertyId)
    throw new Error("Building does not belong to this property");
};

export const list = query({
  args: {
    propertyId: v.optional(v.id("properties")),
    buildingId: v.optional(v.id("buildings")),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireOrgPermission(
      ctx,
      propertyPermissions.read,
    );

    if (args.buildingId !== undefined) {
      await verifyBuildingOwnership(
        ctx,
        args.buildingId,
        organizationId,
        args.propertyId,
      );
    } else if (args.propertyId !== undefined) {
      await verifyPropertyOwnership(ctx, args.propertyId, organizationId);
    }

    const rows =
      args.buildingId !== undefined
        ? await ctx.db
            .query("floors")
            .withIndex("by_organizationId_and_buildingId", (q) =>
              q
                .eq("organizationId", organizationId)
                .eq("buildingId", args.buildingId!),
            )
            .order("desc")
            .collect()
        : args.propertyId !== undefined
          ? await ctx.db
              .query("floors")
              .withIndex("by_organizationId_and_propertyId", (q) =>
                q
                  .eq("organizationId", organizationId)
                  .eq("propertyId", args.propertyId!),
              )
              .order("desc")
              .collect()
          : await ctx.db
              .query("floors")
              .withIndex("by_organizationId", (q) =>
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
    buildingId: v.id("buildings"),
    name: v.string(),
    code: v.string(),
    level: v.number(),
    type: floorTypeValidator,
    status: v.optional(floorStatusValidator),
    grossAreaSqm: v.optional(v.number()),
    netAreaSqm: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, clerkUserId } = await requireOrgPermission(
      ctx,
      propertyPermissions.create,
    );

    await verifyPropertyOwnership(ctx, args.propertyId, organizationId);
    await verifyBuildingOwnership(
      ctx,
      args.buildingId,
      organizationId,
      args.propertyId,
    );

    const name = assertNonEmpty("Name", args.name);
    const code = assertNonEmpty("Code", normalizeCode(args.code));

    await ensureCodeUnique(ctx, organizationId, code);

    const now = Date.now();
    const floorId = await ctx.db.insert("floors", {
      organizationId,
      propertyId: args.propertyId,
      buildingId: args.buildingId,
      name,
      code,
      level: args.level,
      type: args.type,
      status: args.status ?? "active",
      grossAreaSqm: args.grossAreaSqm,
      netAreaSqm: args.netAreaSqm,
      notes: args.notes ? normalize(args.notes) : undefined,
      createdByClerkUserId: clerkUserId,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      organizationId,
      actorClerkUserId: clerkUserId,
      action: "floor_created",
      entityType: "floor",
      entityId: floorId,
      metadata: { code, name },
      createdAt: now,
    });

    return floorId;
  },
});

export const update = mutation({
  args: {
    floorId: v.id("floors"),
    name: v.optional(v.string()),
    code: v.optional(v.string()),
    level: v.optional(v.number()),
    type: v.optional(floorTypeValidator),
    status: v.optional(floorStatusValidator),
    grossAreaSqm: v.optional(v.number()),
    netAreaSqm: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, clerkUserId } = await requireOrgPermission(
      ctx,
      propertyPermissions.update,
    );

    const floor = await ctx.db.get(args.floorId);
    if (!floor) throw new Error("Floor not found");
    if (floor.organizationId !== organizationId)
      throw new Error("Unauthorized");

    const patch: {
      name?: string;
      code?: string;
      level?: number;
      type?:
        | "residential"
        | "commercial"
        | "retail"
        | "parking"
        | "amenity"
        | "mechanical"
        | "other";
      status?: "active" | "inactive" | "archived";
      grossAreaSqm?: number;
      netAreaSqm?: number;
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
      await ensureCodeUnique(ctx, organizationId, code, floor._id);
      patch.code = code;
      hasChanges = true;
    }

    if (args.level !== undefined) {
      patch.level = args.level;
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

    if (args.grossAreaSqm !== undefined) {
      patch.grossAreaSqm = args.grossAreaSqm;
      hasChanges = true;
    }

    if (args.netAreaSqm !== undefined) {
      patch.netAreaSqm = args.netAreaSqm;
      hasChanges = true;
    }

    if (args.notes !== undefined) {
      patch.notes = normalize(args.notes);
      hasChanges = true;
    }

    if (!hasChanges) throw new Error("No fields to update");

    await ctx.db.patch(floor._id, patch);

    await ctx.db.insert("auditLogs", {
      organizationId,
      actorClerkUserId: clerkUserId,
      action: "floor_updated",
      entityType: "floor",
      entityId: floor._id,
      metadata: {
        code: patch.code ?? floor.code,
        name: patch.name ?? floor.name,
      },
      createdAt: patch.updatedAt,
    });

    return floor._id;
  },
});

export const archive = mutation({
  args: {
    floorId: v.id("floors"),
  },
  handler: async (ctx, args) => {
    const { organizationId, clerkUserId } = await requireOrgPermission(
      ctx,
      propertyPermissions.archive,
    );

    const floor = await ctx.db.get(args.floorId);
    if (!floor) throw new Error("Floor not found");
    if (floor.organizationId !== organizationId)
      throw new Error("Unauthorized");

    const now = Date.now();
    await ctx.db.patch(floor._id, {
      status: "archived",
      archivedAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditLogs", {
      organizationId,
      actorClerkUserId: clerkUserId,
      action: "floor_archived",
      entityType: "floor",
      entityId: floor._id,
      metadata: { code: floor.code, name: floor.name },
      createdAt: now,
    });

    return floor._id;
  },
});
