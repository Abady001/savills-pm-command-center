import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

export const syncActiveOrganization = mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<Id<"organizations">> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Unauthenticated");

    const rawOrgId = identity.org_id;
    const rawOrgRole = identity.org_role;

    const orgId = typeof rawOrgId === "string" ? rawOrgId : undefined;
    const orgRole = typeof rawOrgRole === "string" ? rawOrgRole : undefined;

    if (!orgId) throw new Error("No active organization selected");

    const clerkUserId = identity.subject;
    const now = Date.now();

    const existingOrg = await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", orgId))
      .unique();

    let organizationId: Id<"organizations">;

    if (existingOrg) {
      await ctx.db.patch(existingOrg._id, {
        name: args.name,
        slug: args.slug,
        updatedAt: now,
      });
      organizationId = existingOrg._id;
    } else {
      organizationId = await ctx.db.insert("organizations", {
        clerkOrgId: orgId,
        name: args.name,
        slug: args.slug,
        plan: "starter",
        subscriptionStatus: "trialing",
        seatLimit: 5,
        createdAt: now,
        updatedAt: now,
      });
    }

    const existingMember = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organizationId_and_clerkUserId", (q) =>
        q.eq("organizationId", organizationId).eq("clerkUserId", clerkUserId),
      )
      .unique();

    if (existingMember) {
      await ctx.db.patch(existingMember._id, {
        role: orgRole ?? "org:member",
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("organizationMembers", {
        organizationId,
        clerkUserId,
        role: orgRole ?? "org:member",
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditLogs", {
      organizationId,
      actorClerkUserId: clerkUserId,
      action: "organization_synced",
      entityType: "organization",
      entityId: organizationId,
      createdAt: now,
    });

    return organizationId;
  },
});

export const current = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;

    const rawOrgId = identity.org_id;
    const orgId = typeof rawOrgId === "string" ? rawOrgId : undefined;
    if (!orgId) return null;

    return await ctx.db
      .query("organizations")
      .withIndex("by_clerkOrgId", (q) => q.eq("clerkOrgId", orgId))
      .unique();
  },
});
