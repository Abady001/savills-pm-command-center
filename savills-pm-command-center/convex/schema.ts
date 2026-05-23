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
});
