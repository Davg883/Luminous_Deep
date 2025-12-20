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
            const reveal = await ctx.db.get(obj.revealId);
            const revealStatus = reveal ? (reveal as any).status : undefined;

            if (reveal && (revealStatus === "published" || revealStatus === undefined)) {
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
