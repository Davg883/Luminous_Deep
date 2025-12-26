import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const listSignals = query({
    handler: async (ctx) => {
        // Collect all symbols (optimized for admin list)
        return await ctx.db.query("signals")
            .withIndex("by_season_episode")
            .order("desc")
            .collect();
    },
});

export const publishSignal = mutation({
    args: {
        id: v.optional(v.id("signals")),
        title: v.string(),
        slug: v.string(),
        season: v.number(),
        episode: v.number(),
        content: v.string(),
        isLocked: v.boolean(),
        glitchPoint: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const payload = {
            title: args.title,
            slug: args.slug,
            season: args.season,
            episode: args.episode,
            content: args.content,
            isLocked: args.isLocked,
            glitchPoint: args.glitchPoint,
            publishedAt: Date.now(),
        };

        if (args.id) {
            await ctx.db.patch(args.id, payload);
            return args.id;
        } else {
            // Check for slug collision
            const existing = await ctx.db
                .query("signals")
                .withIndex("by_slug", (q) => q.eq("slug", args.slug))
                .first();

            if (existing) {
                await ctx.db.patch(existing._id, payload);
                return existing._id;
            } else {
                return await ctx.db.insert("signals", payload);
            }
        }
    },
});

export const deleteSignal = mutation({
    args: { id: v.id("signals") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});
