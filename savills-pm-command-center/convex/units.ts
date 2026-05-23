import { mutation, query, MutationCtx, QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { requireOrgPermission, propertyPermissions } from "./lib/permissions";

const unitTypeValidator = v.union(
  v.literal("apartment"),
  v.literal("office"),
  v.literal("retail"),
  v.literal("kiosk"),
  v.literal("clinic"),
  v.literal("storage"),
  v.literal("parking"),
  v.literal("common_area"),
  v.literal("other"),
);

const unitStatusValidator = v.union(
  v.literal("available"),
  v.literal("reserved"),
  v.literal("occupied"),
  v.literal("under_maintenance"),
  v.literal("under_fit_out"),
  v.literal("blocked"),
  v.literal("vacant_notice"),
  v.literal("legal_hold"),
  v.literal("archived"),
);

type UnitType =
  | "apartment"
  | "office"
  | "retail"
  | "kiosk"
  | "clinic"
  | "storage"
  | "parking"
  | "common_area"
  | "other";

type UnitStatus =
  | "available"
  | "reserved"
  | "occupied"
  | "under_maintenance"
  | "under_fit_out"
  | "blocked"
  | "vacant_notice"
  | "legal_hold"
  | "archived";

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
  ignoreUnitId?: Id<"units">,
): Promise<void> => {
  const existing = await ctx.db
    .query("units")
    .withIndex("by_organization_code", (q) =>
      q.eq("organizationId", organizationId).eq("code", code),
    )
    .unique();

  if (existing && existing._id !== ignoreUnitId) {
    throw new Error("Unit code already exists in this organization");
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

const verifyFloorOwnership = async (
  ctx: QueryCtx | MutationCtx,
  floorId: Id<"floors">,
  organizationId: Id<"organizations">,
  buildingId?: Id<"buildings">,
  propertyId?: Id<"properties">,
): Promise<void> => {
  const floor = await ctx.db.get(floorId);
  if (!floor) throw new Error("Floor not found");
  if (floor.organizationId !== organizationId)
    throw new Error("Floor does not belong to this organization");
  if (buildingId !== undefined && floor.buildingId !== buildingId)
    throw new Error("Floor does not belong to this building");
  if (propertyId !== undefined && floor.propertyId !== propertyId)
    throw new Error("Floor does not belong to this property");
};

export const list = query({
  args: {
    propertyId: v.optional(v.id("properties")),
    buildingId: v.optional(v.id("buildings")),
    floorId: v.optional(v.id("floors")),
    status: v.optional(unitStatusValidator),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { organizationId } = await requireOrgPermission(
      ctx,
      propertyPermissions.read,
    );

    // Verify ownership of any provided parent filters before querying
    if (args.floorId !== undefined) {
      await verifyFloorOwnership(
        ctx,
        args.floorId,
        organizationId,
        args.buildingId,
        args.propertyId,
      );
    } else if (args.buildingId !== undefined) {
      await verifyBuildingOwnership(
        ctx,
        args.buildingId,
        organizationId,
        args.propertyId,
      );
    } else if (args.propertyId !== undefined) {
      await verifyPropertyOwnership(ctx, args.propertyId, organizationId);
    }

    // Pick the most-specific safe index
    const rows =
      args.floorId !== undefined
        ? await ctx.db
            .query("units")
            .withIndex("by_floor", (q) => q.eq("floorId", args.floorId!))
            .order("desc")
            .collect()
        : args.buildingId !== undefined
          ? await ctx.db
              .query("units")
              .withIndex("by_building", (q) =>
                q.eq("buildingId", args.buildingId!),
              )
              .order("desc")
              .collect()
          : args.propertyId !== undefined
            ? await ctx.db
                .query("units")
                .withIndex("by_property", (q) =>
                  q.eq("propertyId", args.propertyId!),
                )
                .order("desc")
                .collect()
            : await ctx.db
                .query("units")
                .withIndex("by_organization", (q) =>
                  q.eq("organizationId", organizationId),
                )
                .order("desc")
                .collect();

    // Tenant safety net: when filtering by a single-field parent index,
    // results are pre-verified to be in this org via the ownership check above.
    // Belt-and-suspenders filter in case anything slipped through.
    const orgScoped = rows.filter(
      (row) => row.organizationId === organizationId,
    );

    const statusFiltered = args.status
      ? orgScoped.filter((row) => row.status === args.status)
      : orgScoped;

    if (args.includeArchived) return statusFiltered;
    return statusFiltered.filter((row) => row.status !== "archived");
  },
});

export const create = mutation({
  args: {
    propertyId: v.id("properties"),
    buildingId: v.id("buildings"),
    floorId: v.id("floors"),
    code: v.string(),
    name: v.string(),
    unitType: unitTypeValidator,
    status: unitStatusValidator,
    usageType: v.optional(v.string()),
    internalAreaSqm: v.optional(v.number()),
    externalAreaSqm: v.optional(v.number()),
    grossAreaSqm: v.optional(v.number()),
    netAreaSqm: v.optional(v.number()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    parkingSpaces: v.optional(v.number()),
    storageIncluded: v.optional(v.boolean()),
    baseRentAmount: v.optional(v.number()),
    serviceChargeAmount: v.optional(v.number()),
    currency: v.optional(v.string()),
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
    await verifyFloorOwnership(
      ctx,
      args.floorId,
      organizationId,
      args.buildingId,
      args.propertyId,
    );

    const code = assertNonEmpty("Code", normalizeCode(args.code));
    const name = assertNonEmpty("Name", args.name);

    await ensureCodeUnique(ctx, organizationId, code);

    const now = Date.now();
    const unitId = await ctx.db.insert("units", {
      organizationId,
      propertyId: args.propertyId,
      buildingId: args.buildingId,
      floorId: args.floorId,
      code,
      name,
      unitType: args.unitType,
      status: args.status,
      usageType: args.usageType ? normalize(args.usageType) : undefined,
      internalAreaSqm: args.internalAreaSqm,
      externalAreaSqm: args.externalAreaSqm,
      grossAreaSqm: args.grossAreaSqm,
      netAreaSqm: args.netAreaSqm,
      bedrooms: args.bedrooms,
      bathrooms: args.bathrooms,
      parkingSpaces: args.parkingSpaces,
      storageIncluded: args.storageIncluded,
      baseRentAmount: args.baseRentAmount,
      serviceChargeAmount: args.serviceChargeAmount,
      currency: args.currency
        ? args.currency.trim().toUpperCase() || undefined
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
      action: "unit_created",
      entityType: "unit",
      entityId: unitId,
      metadata: { code, name },
      createdAt: now,
    });

    return unitId;
  },
});

export const update = mutation({
  args: {
    unitId: v.id("units"),
    propertyId: v.optional(v.id("properties")),
    buildingId: v.optional(v.id("buildings")),
    floorId: v.optional(v.id("floors")),
    code: v.optional(v.string()),
    name: v.optional(v.string()),
    unitType: v.optional(unitTypeValidator),
    status: v.optional(unitStatusValidator),
    usageType: v.optional(v.string()),
    internalAreaSqm: v.optional(v.number()),
    externalAreaSqm: v.optional(v.number()),
    grossAreaSqm: v.optional(v.number()),
    netAreaSqm: v.optional(v.number()),
    bedrooms: v.optional(v.number()),
    bathrooms: v.optional(v.number()),
    parkingSpaces: v.optional(v.number()),
    storageIncluded: v.optional(v.boolean()),
    baseRentAmount: v.optional(v.number()),
    serviceChargeAmount: v.optional(v.number()),
    currency: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { organizationId, clerkUserId } = await requireOrgPermission(
      ctx,
      propertyPermissions.update,
    );

    const unit = await ctx.db.get(args.unitId);
    if (!unit) throw new Error("Unit not found");
    if (unit.organizationId !== organizationId)
      throw new Error("Unauthorized");

    // If any parent IDs are being changed, re-validate the full chain
    const nextPropertyId = args.propertyId ?? unit.propertyId;
    const nextBuildingId = args.buildingId ?? unit.buildingId;
    const nextFloorId = args.floorId ?? unit.floorId;

    const parentsChanged =
      args.propertyId !== undefined ||
      args.buildingId !== undefined ||
      args.floorId !== undefined;

    if (parentsChanged) {
      await verifyPropertyOwnership(ctx, nextPropertyId, organizationId);
      await verifyBuildingOwnership(
        ctx,
        nextBuildingId,
        organizationId,
        nextPropertyId,
      );
      await verifyFloorOwnership(
        ctx,
        nextFloorId,
        organizationId,
        nextBuildingId,
        nextPropertyId,
      );
    }

    const patch: {
      propertyId?: Id<"properties">;
      buildingId?: Id<"buildings">;
      floorId?: Id<"floors">;
      code?: string;
      name?: string;
      unitType?: UnitType;
      status?: UnitStatus;
      usageType?: string;
      internalAreaSqm?: number;
      externalAreaSqm?: number;
      grossAreaSqm?: number;
      netAreaSqm?: number;
      bedrooms?: number;
      bathrooms?: number;
      parkingSpaces?: number;
      storageIncluded?: boolean;
      baseRentAmount?: number;
      serviceChargeAmount?: number;
      currency?: string;
      notes?: string;
      archivedAt?: number;
      updatedBy: string;
      updatedAt: number;
    } = { updatedBy: clerkUserId, updatedAt: Date.now() };

    let hasChanges = false;

    if (args.propertyId !== undefined) {
      patch.propertyId = args.propertyId;
      hasChanges = true;
    }
    if (args.buildingId !== undefined) {
      patch.buildingId = args.buildingId;
      hasChanges = true;
    }
    if (args.floorId !== undefined) {
      patch.floorId = args.floorId;
      hasChanges = true;
    }
    if (args.code !== undefined) {
      const code = assertNonEmpty("Code", normalizeCode(args.code));
      await ensureCodeUnique(ctx, organizationId, code, unit._id);
      patch.code = code;
      hasChanges = true;
    }
    if (args.name !== undefined) {
      patch.name = assertNonEmpty("Name", args.name);
      hasChanges = true;
    }
    if (args.unitType !== undefined) {
      patch.unitType = args.unitType;
      hasChanges = true;
    }
    if (args.status !== undefined) {
      patch.status = args.status;
      if (args.status === "archived") patch.archivedAt = patch.updatedAt;
      hasChanges = true;
    }
    if (args.usageType !== undefined) {
      patch.usageType = normalize(args.usageType);
      hasChanges = true;
    }
    if (args.internalAreaSqm !== undefined) {
      patch.internalAreaSqm = args.internalAreaSqm;
      hasChanges = true;
    }
    if (args.externalAreaSqm !== undefined) {
      patch.externalAreaSqm = args.externalAreaSqm;
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
    if (args.bedrooms !== undefined) {
      patch.bedrooms = args.bedrooms;
      hasChanges = true;
    }
    if (args.bathrooms !== undefined) {
      patch.bathrooms = args.bathrooms;
      hasChanges = true;
    }
    if (args.parkingSpaces !== undefined) {
      patch.parkingSpaces = args.parkingSpaces;
      hasChanges = true;
    }
    if (args.storageIncluded !== undefined) {
      patch.storageIncluded = args.storageIncluded;
      hasChanges = true;
    }
    if (args.baseRentAmount !== undefined) {
      patch.baseRentAmount = args.baseRentAmount;
      hasChanges = true;
    }
    if (args.serviceChargeAmount !== undefined) {
      patch.serviceChargeAmount = args.serviceChargeAmount;
      hasChanges = true;
    }
    if (args.currency !== undefined) {
      patch.currency = args.currency.trim().toUpperCase();
      hasChanges = true;
    }
    if (args.notes !== undefined) {
      patch.notes = normalize(args.notes);
      hasChanges = true;
    }

    if (!hasChanges) throw new Error("No fields to update");

    await ctx.db.patch(unit._id, patch);

    await ctx.db.insert("auditLogs", {
      organizationId,
      actorClerkUserId: clerkUserId,
      action: "unit_updated",
      entityType: "unit",
      entityId: unit._id,
      metadata: {
        code: patch.code ?? unit.code,
        name: patch.name ?? unit.name,
      },
      createdAt: patch.updatedAt,
    });

    return unit._id;
  },
});

export const archive = mutation({
  args: {
    unitId: v.id("units"),
  },
  handler: async (ctx, args) => {
    const { organizationId, clerkUserId } = await requireOrgPermission(
      ctx,
      propertyPermissions.archive,
    );

    const unit = await ctx.db.get(args.unitId);
    if (!unit) throw new Error("Unit not found");
    if (unit.organizationId !== organizationId)
      throw new Error("Unauthorized");

    const now = Date.now();
    await ctx.db.patch(unit._id, {
      status: "archived",
      archivedAt: now,
      updatedAt: now,
      updatedBy: clerkUserId,
    });

    await ctx.db.insert("auditLogs", {
      organizationId,
      actorClerkUserId: clerkUserId,
      action: "unit_archived",
      entityType: "unit",
      entityId: unit._id,
      metadata: { code: unit.code, name: unit.name },
      createdAt: now,
    });

    return unit._id;
  },
});
