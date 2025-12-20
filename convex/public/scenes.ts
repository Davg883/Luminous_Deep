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

// Get objects for a scene
export const getSceneObjects = query({
    args: { sceneId: v.id("scenes") },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("objects")
            .withIndex("by_scene", (q: any) => q.eq("sceneId", args.sceneId))
            .collect();
    },
});

// Get reveal content
export const getReveal = query({
    args: { revealId: v.id("reveals") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.revealId);
    }
});

// Internal mutation to update background media
import { internalMutation } from "../_generated/server";

export const updateSceneMedia = internalMutation({
    args: {
        slug: v.string(),
        mediaUrl: v.string(),
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

        await ctx.db.patch(scene._id, {
            backgroundMediaUrl: args.mediaUrl,
        });
    },
});
