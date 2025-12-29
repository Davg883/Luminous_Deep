import { query } from "../_generated/server";
import { v } from "convex/values";

export const getSignal = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const signal = await ctx.db
            .query("signals")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();

        if (!signal) return null;

        // Calculate Next Episode Slug
        let nextSlug = null;

        // Only calculate for Series content
        if (signal.seriesId) {
            const seriesSignals = await ctx.db
                .query("signals")
                .withIndex("by_series", q => q.eq("seriesId", signal.seriesId as any)) // Cast for safety
                .collect();

            // Sort by absolute order (Season -> Episode)
            seriesSignals.sort((a, b) => {
                if (a.season !== b.season) return a.season - b.season;
                return a.episode - b.episode;
            });

            const idx = seriesSignals.findIndex(s => s._id === signal._id);
            if (idx !== -1 && idx < seriesSignals.length - 1) {
                nextSlug = seriesSignals[idx + 1].slug;
            }
        }

        return { ...signal, nextSlug };
    },
});

export const listSignals = query({
    handler: async (ctx) => {
        // Fetch all signals (assuming public ones are all "published" for now, or filter by publishedAt)
        return await ctx.db
            .query("signals")
            .withIndex("by_season_episode")
            .order("desc") // Newest episodes first
            .collect();
    },
});
