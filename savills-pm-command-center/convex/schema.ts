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
});
