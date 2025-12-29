import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// ... (imports)

export const getLibraryState = query({
    args: {},
    handler: async (ctx) => {
        // 1. Fetch Myths (Stratum = "myth")
        // We use full table scan filtered by stratum (dataset is small)
        const allSignals = await ctx.db.query("signals").collect();
        const myths = allSignals.filter(s => s.stratum === "myth");

        // 2. Fetch Series (Status = "Published")
        let series: Array<any> = [];
        try {
            const allSeries = await ctx.db.query("series").collect();
            // Enrich with chapterCount
            series = await Promise.all(
                allSeries
                    .filter(s => s.status === "Published")
                    .map(async (s) => {
                        const allSigs = await ctx.db.query("signals").withIndex("by_series", q => q.eq("seriesId", s._id)).collect();
                        // Filter by stratum signal
                        const count = allSigs.filter(sig => sig.stratum === "signal").length;
                        return { ...s, chapterCount: count };
                    })
            );
        } catch (e) {
            console.warn("Series table not accessible yet.");
        }

        // 3. Return Strictly Categorized State
        // Deduplicate Myths by Slug
        const uniqueMyths = Array.from(new Map(myths.map(m => [m.slug, m])).values());

        return {
            myths: uniqueMyths.sort((a, b) => (a.releaseDate || 0) - (b.releaseDate || 0)),
            series: series,
        };
    },
});

export const saveProgress = mutation({
    // ... (keep existing implementation of saveProgress, it is fine)
    args: {
        signalId: v.id("signals"),
        progress: v.number(), // 0-100
        isCompleted: v.boolean(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return; // Silent fail if not logged in
        const userId = identity.tokenIdentifier;

        const existing = await ctx.db
            .query("user_progress")
            .withIndex("by_user_signal", (q) => q.eq("userId", userId).eq("signalId", args.signalId))
            .first();

        const now = Date.now();
        if (existing) {
            await ctx.db.patch(existing._id, {
                progress: args.progress,
                isCompleted: args.isCompleted ? true : existing.isCompleted,
                lastReadAt: now,
            });
        } else {
            await ctx.db.insert("user_progress", {
                userId,
                signalId: args.signalId,
                progress: args.progress,
                isCompleted: args.isCompleted,
                lastReadAt: now,
            });
        }
    },
});

export const completeTransmission = mutation({
    args: {
        signalId: v.id("signals"),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return;

        const userId = identity.tokenIdentifier;
        const now = Date.now();

        const existing = await ctx.db
            .query("user_progress")
            .withIndex("by_user_signal", (q) => q.eq("userId", userId).eq("signalId", args.signalId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                progress: 100,
                isCompleted: true,
                lastReadAt: now,
            });
        } else {
            await ctx.db.insert("user_progress", {
                userId,
                signalId: args.signalId,
                progress: 100,
                isCompleted: true,
                lastReadAt: now,
            });
        }
    },
});
