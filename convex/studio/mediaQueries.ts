import { query, mutation } from "../_generated/server";
import { requireStudioAccess } from "../auth/helpers";
import { v } from "convex/values";

export const getAllMedia = query({
    args: {},
    handler: async (ctx) => {
        await requireStudioAccess(ctx);
        return await ctx.db.query("media").order("desc").collect();
    },
});

// Get only Visual Bible assets (for AI reference)
export const getVisualBibleAssets = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);
        const assets = await ctx.db
            .query("media")
            .withIndex("by_visual_bible", q => q.eq("isVisualBible", true))
            .collect();
        return assets.slice(0, args.limit || 14).map(a => a.url);
    },
});

// Update media metadata (Visual Bible, tags, etc.)
export const updateMedia = mutation({
    args: {
        id: v.id("media"),
        isVisualBible: v.optional(v.boolean()),
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);

        const updates: any = {};
        if (args.isVisualBible !== undefined) updates.isVisualBible = args.isVisualBible;
        if (args.tags !== undefined) updates.tags = args.tags;

        await ctx.db.patch(args.id, updates);
    },
});
