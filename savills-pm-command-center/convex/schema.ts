import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  numbers: defineTable({
    value: v.number(),
  }),
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  }).index("by_clerk_id", ["clerkId"]),

  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.optional(v.string()),
    plan: v.union(
      v.literal("starter"),
      v.literal("professional"),
      v.literal("business"),
      v.literal("enterprise"),
    ),
    subscriptionStatus: v.union(
      v.literal("trialing"),
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
    ),
    seatLimit: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerkOrgId", ["clerkOrgId"]),

  organizationMembers: defineTable({
    organizationId: v.id("organizations"),
    clerkUserId: v.string(),
    role: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_organizationId_and_clerkUserId", ["organizationId", "clerkUserId"]),

  auditLogs: defineTable({
    organizationId: v.optional(v.id("organizations")),
    actorClerkUserId: v.optional(v.string()),
    action: v.string(),
    entityType: v.string(),
    entityId: v.optional(v.string()),
    metadata: v.optional(v.record(v.string(), v.string())),
    createdAt: v.number(),
  }).index("by_organizationId_and_createdAt", ["organizationId", "createdAt"]),

  properties: defineTable({
    organizationId: v.id("organizations"),
    name: v.string(),
    code: v.string(),
    type: v.union(
      v.literal("residential"),
      v.literal("commercial"),
      v.literal("retail"),
      v.literal("mixed_use"),
      v.literal("administrative"),
      v.literal("industrial"),
      v.literal("other"),
    ),
    status: v.union(
      v.literal("active"),
      v.literal("mobilization"),
      v.literal("inactive"),
      v.literal("archived"),
    ),
    addressLine1: v.optional(v.string()),
    city: v.string(),
    country: v.string(),
    timezone: v.string(),
    currency: v.string(),
    description: v.optional(v.string()),
    createdByClerkUserId: v.string(),
    updatedByClerkUserId: v.optional(v.string()),
    archivedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_organization", ["organizationId"])
    .index("by_organization_and_code", ["organizationId", "code"])
    .index("by_organization_and_status", ["organizationId", "status"])
    .index("by_organization_and_createdAt", ["organizationId", "createdAt"]),

  buildings: defineTable({
    organizationId: v.id("organizations"),
    propertyId: v.id("properties"),
    name: v.string(),
    code: v.string(),
    type: v.union(
      v.literal("residential"),
      v.literal("commercial"),
      v.literal("retail"),
      v.literal("mixed_use"),
      v.literal("parking"),
      v.literal("facility"),
      v.literal("other"),
    ),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("archived"),
    ),
    address: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdByClerkUserId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    archivedAt: v.optional(v.number()),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_organizationId_and_propertyId", ["organizationId", "propertyId"])
    .index("by_organizationId_and_code", ["organizationId", "code"])
    .index("by_organizationId_and_status", ["organizationId", "status"])
    .index("by_organizationId_and_createdAt", ["organizationId", "createdAt"]),

  floors: defineTable({
    organizationId: v.id("organizations"),
    propertyId: v.id("properties"),
    buildingId: v.id("buildings"),
    name: v.string(),
    code: v.string(),
    level: v.number(),
    type: v.union(
      v.literal("residential"),
      v.literal("commercial"),
      v.literal("retail"),
      v.literal("parking"),
      v.literal("amenity"),
      v.literal("mechanical"),
      v.literal("other"),
    ),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("archived"),
    ),
    grossAreaSqm: v.optional(v.number()),
    netAreaSqm: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdByClerkUserId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    archivedAt: v.optional(v.number()),
  })
    .index("by_organizationId", ["organizationId"])
    .index("by_propertyId", ["propertyId"])
    .index("by_buildingId", ["buildingId"])
    .index("by_organizationId_and_propertyId", ["organizationId", "propertyId"])
    .index("by_organizationId_and_buildingId", ["organizationId", "buildingId"])
    .index("by_organizationId_and_code", ["organizationId", "code"])
    .index("by_organizationId_and_status", ["organizationId", "status"]),

  units: defineTable({
    organizationId: v.id("organizations"),
    propertyId: v.id("properties"),
    buildingId: v.id("buildings"),
    floorId: v.id("floors"),
    code: v.string(),
    name: v.string(),
    unitType: v.union(
      v.literal("apartment"),
      v.literal("office"),
      v.literal("retail"),
      v.literal("kiosk"),
      v.literal("clinic"),
      v.literal("storage"),
      v.literal("parking"),
      v.literal("common_area"),
      v.literal("other"),
    ),
    status: v.union(
      v.literal("available"),
      v.literal("reserved"),
      v.literal("occupied"),
      v.literal("under_maintenance"),
      v.literal("under_fit_out"),
      v.literal("blocked"),
      v.literal("vacant_notice"),
      v.literal("legal_hold"),
      v.literal("archived"),
    ),
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
    createdBy: v.string(),
    updatedBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    archivedAt: v.optional(v.number()),
  })
    .index("by_organization", ["organizationId"])
    .index("by_property", ["propertyId"])
    .index("by_building", ["buildingId"])
    .index("by_floor", ["floorId"])
    .index("by_status", ["status"])
    .index("by_organization_code", ["organizationId", "code"])
    .index("by_property_status", ["propertyId", "status"])
    .index("by_floor_status", ["floorId", "status"]),
});
