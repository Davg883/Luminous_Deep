import { query } from "../_generated/server";
import { v } from "convex/values";

export const listPublishedSeries = query({
    handler: async (ctx) => {
        // Defensive check: If the table doesn't exist yet, return empty array immediately
        const seriesTable = await ctx.db.query("series").collect().catch(() => null);
        if (!seriesTable) return [];

        // Proceed with the actual query
        // Proceed with the actual query
        const allSeries = await ctx.db
            .query("series")
            .filter((q) => q.eq(q.field("status"), "Published"))
            .collect();

        // Calculate Chapter Counts
        const enrichedSeries = await Promise.all(allSeries.map(async (s) => {
            const signals = await ctx.db
                .query("signals")
                .withIndex("by_series", (q) => q.eq("seriesId", s._id))
                .collect();
            // Count strictly 'signal' stratum
            const count = signals.filter(sig => sig.stratum === "signal").length;
            return { ...s, chapterCount: count };
        }));

        return enrichedSeries;
    },
});

export const getSeriesBySlug = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        const series = await ctx.db
            .query("series")
            .withIndex("by_slug", (q) => q.eq("slug", args.slug))
            .first();

        if (!series) return null;

        // Fetch signals for this series ONLY
        // We need to fetch all signals and filter by seriesId
        // Ideally we have an index by_series needed. I added it in schema!
        // .index("by_series", ["seriesId"])

        const allSignals = await ctx.db
            .query("signals")
            .withIndex("by_series", (q) => q.eq("seriesId", series._id))
            .collect();

        // Filter for strictly 'signal' stratum (removing Myths/Reflections from Series view)
        const signals = allSignals.filter(s => s.stratum === "signal");

        // Sort signals by season/episode
        const sortedSignals = signals.sort((a, b) => {
            if (a.season !== b.season) return a.season - b.season;
            return a.episode - b.episode;
        });

        // Get user progress for these signals
        const identity = await ctx.auth.getUserIdentity();
        let userProgressMap = new Map();

        if (identity) {
            const userId = identity.tokenIdentifier;
            const progressRecords = await ctx.db
                .query("user_progress")
                .withIndex("by_user_signal", (q) => q.eq("userId", userId))
                .collect();

            for (const record of progressRecords) {
                userProgressMap.set(record.signalId, record);
            }
        }

        return {
            series,
            signals: sortedSignals.map(s => ({
                ...s,
                userProgress: userProgressMap.get(s._id) || null
            }))
        };
    },
});
