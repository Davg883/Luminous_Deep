import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════
// AGENT QUERIES
// ═══════════════════════════════════════════════════════════════

export const listAgents = query({
    args: {},
    handler: async (ctx) => {
        const agents = await ctx.db.query("agents").collect();

        // Enrich with space information
        const enrichedAgents = await Promise.all(
            agents.map(async (agent) => {
                const space = agent.homeSpaceId ? await ctx.db.get(agent.homeSpaceId) : null;
                return {
                    ...agent,
                    homeSpace: space ? {
                        slug: space.slug,
                        title: space.title,
                        domain: space.domain,
                    } : null,
                };
            })
        );

        return enrichedAgents;
    },
});

export const getAgent = query({
    args: { id: v.id("agents") },
    handler: async (ctx, { id }) => {
        const agent = await ctx.db.get(id);
        if (!agent) return null;

        const space = agent.homeSpaceId ? await ctx.db.get(agent.homeSpaceId) : null;
        return {
            ...agent,
            homeSpace: space ? {
                slug: space.slug,
                title: space.title,
                domain: space.domain,
            } : null,
        };
    },
});

export const getAgentsBySpace = query({
    args: { spaceId: v.id("scenes") },
    handler: async (ctx, { spaceId }) => {
        return await ctx.db
            .query("agents")
            .withIndex("by_space", (q) => q.eq("homeSpaceId", spaceId))
            .collect();
    },
});

// ═══════════════════════════════════════════════════════════════
// AGENT MUTATIONS
// ═══════════════════════════════════════════════════════════════

export const createAgent = mutation({
    args: {
        name: v.string(),
        homeSpaceId: v.id("scenes"),
        role: v.string(),
        description: v.optional(v.string()),
        capabilities: v.array(v.string()),
        tools: v.array(v.string()),
        autonomy: v.number(),
        voice: v.optional(v.union(
            v.literal("cassie"),
            v.literal("eleanor"),
            v.literal("julian"),
            v.literal("sparkline"),
            v.literal("hearth"),
            v.literal("systems"),
            v.literal("neutral")
        )),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("agents", {
            ...args,
            isActive: true,
            createdAt: Date.now(),
        });
    },
});

export const updateAgent = mutation({
    args: {
        id: v.id("agents"),
        name: v.optional(v.string()),
        homeSpaceId: v.optional(v.id("scenes")),
        role: v.optional(v.string()),
        description: v.optional(v.string()),
        capabilities: v.optional(v.array(v.string())),
        tools: v.optional(v.array(v.string())),
        autonomy: v.optional(v.number()),
        isActive: v.optional(v.boolean()),
    },
    handler: async (ctx, { id, ...updates }) => {
        const filtered = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        await ctx.db.patch(id, filtered);
        return id;
    },
});

export const toggleAgentActive = mutation({
    args: { id: v.id("agents") },
    handler: async (ctx, { id }) => {
        const agent = await ctx.db.get(id);
        if (!agent) throw new Error("Agent not found");

        await ctx.db.patch(id, { isActive: !agent.isActive });
        return { isActive: !agent.isActive };
    },
});

export const assignAgentToSpace = mutation({
    args: {
        agentId: v.id("agents"),
        spaceId: v.id("scenes"),
    },
    handler: async (ctx, { agentId, spaceId }) => {
        await ctx.db.patch(agentId, { homeSpaceId: spaceId });
        return agentId;
    },
});

export const deleteAgent = mutation({
    args: { id: v.id("agents") },
    handler: async (ctx, { id }) => {
        await ctx.db.delete(id);
        return id;
    },
});
