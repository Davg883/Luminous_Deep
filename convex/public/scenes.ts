import { query } from "../_generated/server";
import { v } from "convex/values";

// Get specific scene by slug
export const getScene = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("scenes")
            .withIndex("by_slug", (q: any) => q.eq("slug", args.slug))
            .first();
    },
});

// List all scenes (for space selector)
export const listScenes = query({
    args: {},
    handler: async (ctx) => {
        return await ctx.db.query("scenes").collect();
    },
});

// Get objects for a scene, filtering for published reveals
export const getSceneObjects = query({
    args: { sceneId: v.id("scenes") },
    handler: async (ctx, args) => {
        const objects = await ctx.db
            .query("objects")
            .withIndex("by_scene", (q: any) => q.eq("sceneId", args.sceneId))
            .collect();

        // 1. Fetch all reveals in parallel to check status
        // Note: For high performance at scale, we'd denormalize 'status' onto the object or index better.
        // For current scale (~20 objects per scene), this is acceptable.
        const objectsWithStatus = await Promise.all(objects.map(async (obj: any) => {
            // Portal/transition objects don't have revealId - always include them
            if (obj.role === "transition" || !obj.revealId) {
                return obj;
            }

            // Regular objects: check reveal status
            const reveal = await ctx.db.get(obj.revealId);
            const revealStatus = reveal ? (reveal as any).status : undefined;

            if (reveal && (revealStatus?.toLowerCase() === "published" || revealStatus === undefined)) {
                // Return object if published (or undefined for legacy support during migration)
                return obj;
            }
            return null;
        }));

        // 2. Filter out nulls
        return objectsWithStatus.filter((obj) => obj !== null);
    },
});

// Get reveal content
export const getReveal = query({
    args: { revealId: v.id("reveals") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.revealId);
    }
});

// ═══════════════════════════════════════════════════════════════
// PUBLIC AGENTS QUERIES (for Control Room HUD)
// ═══════════════════════════════════════════════════════════════

// List all agents (public - no auth required)
export const listAgents = query({
    args: {},
    handler: async (ctx) => {
        try {
            const agents = await ctx.db.query("agents").collect();

            // Enrich with space information
            const enrichedAgents = await Promise.all(
                agents.map(async (agent) => {
                    try {
                        const space = agent.homeSpaceId ? await ctx.db.get(agent.homeSpaceId) : null;
                        return {
                            ...agent,
                            homeSpace: space ? {
                                slug: space.slug,
                                title: space.title,
                                domain: space.domain,
                            } : null,
                        };
                    } catch {
                        return { ...agent, homeSpace: null };
                    }
                })
            );

            return enrichedAgents;
        } catch (error) {
            // Return empty array if agents table doesn't exist yet
            console.warn("Failed to fetch agents:", error);
            return [];
        }
    },
});

// List only active agents (for the HUD swarm display)
export const listActiveAgents = query({
    args: {},
    handler: async (ctx) => {
        try {
            const agents = await ctx.db.query("agents").collect();
            const activeAgents = agents.filter(a => a.isActive);

            // Enrich with space information
            const enrichedAgents = await Promise.all(
                activeAgents.map(async (agent) => {
                    try {
                        const space = agent.homeSpaceId ? await ctx.db.get(agent.homeSpaceId) : null;
                        return {
                            ...agent,
                            homeSpace: space ? {
                                slug: space.slug,
                                title: space.title,
                                domain: space.domain,
                            } : null,
                        };
                    } catch {
                        return { ...agent, homeSpace: null };
                    }
                })
            );

            return enrichedAgents;
        } catch (error) {
            // Return empty array if agents table doesn't exist yet
            console.warn("Failed to fetch active agents:", error);
            return [];
        }
    },
});

// Internal mutation to update background media
import { internalMutation } from "../_generated/server";

export const updateSceneMedia = internalMutation({
    args: {
        slug: v.string(),
        mediaUrl: v.string(),
        shouldLoop: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const scene = await ctx.db
            .query("scenes")
            .withIndex("by_slug", (q: any) => q.eq("slug", args.slug))
            .first();

        if (!scene) {
            // Optional: Auto-create scene? For now just skip/error
            console.warn(`Scene ${args.slug} not found for media update`);
            return;
        }

        const patch: any = {
            backgroundMediaUrl: args.mediaUrl,
        };

        if (args.shouldLoop !== undefined) {
            patch.shouldLoop = args.shouldLoop;
        }

        await ctx.db.patch(scene._id, patch);
    },
});

