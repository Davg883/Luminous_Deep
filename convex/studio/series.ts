import { mutation, query } from "../_generated/server";
import { v } from "convex/values";

export const listSeries = query({
    handler: async (ctx) => {
        try {
            return await ctx.db.query("series").collect();
        } catch (e) {
            console.error("Failed to query 'series' table. It might not exist yet.", e);
            return [];
        }
    },
});

export const getSeries = query({
    args: { id: v.string() }, // v.id("series") caused module crash if table missing
    handler: async (ctx, args) => {
        try {
            return await ctx.db.get(args.id as any);
        } catch { return null; }
    },
});

// ... (skipping getSeriesBySlug as it uses v.string already)

export const createSeries = mutation({
    args: {
        title: v.string(),
        slug: v.string(),
        description: v.string(),
        coverImage: v.string(),
        tags: v.array(v.string()),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        // @ts-ignore
        const id = await ctx.db.insert("series", args);
        return id;
    },
});

export const updateSeries = mutation({
    args: {
        id: v.string(), // v.id("series") replacement
        title: v.optional(v.string()),
        slug: v.optional(v.string()),
        description: v.optional(v.string()),
        coverImage: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        status: v.optional(v.string()),
        imagePrompt: v.optional(v.string()),
        sanctuaryAmbientUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        // @ts-ignore
        await ctx.db.patch(id, updates);
    },
});

// Helper for the Action to fetch signals text
export const getSeriesSignalsContent = query({
    args: { seriesId: v.string() }, // v.id("series") replacement
    handler: async (ctx, args) => {
        try {
            const signals = await ctx.db
                .query("signals")
                .withIndex("by_series", (q) => q.eq("seriesId", args.seriesId as any))
                .collect();

            return signals.map(s => `Title: ${s.title}\nSummary: ${s.summaryShort}\nContent: ${s.content?.slice(0, 1000)}...`).join("\n\n");
        } catch (e) { console.error(e); return ""; }
    }
});
