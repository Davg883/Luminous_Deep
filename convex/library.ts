import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getLibraryState = query({
    args: {},
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        const userId = identity?.tokenIdentifier;

        // 1. Fetch all signals
        // We fetch all because we need to categorize them
        const signals = await ctx.db
            .query("signals")
            .collect();

        // 2. Fetch User Progress
        let userProgressMap = new Map();
        if (userId) {
            const progressRecords = await ctx.db
                .query("user_progress")
                .withIndex("by_user_signal", (q) => q.eq("userId", userId))
                .collect();

            for (const record of progressRecords) {
                userProgressMap.set(record.signalId, record);
            }
        }

        // 3. Enrich Signals with Progress
        const enrichedSignals = signals.map(sig => ({
            ...sig,
            userProgress: userProgressMap.get(sig._id) || null
        }));

        // 4. Categorize
        // Myths
        const myths = enrichedSignals
            .filter(s => s.stratum === "myth")
            .sort((a, b) => (a.releaseDate || 0) - (b.releaseDate || 0)); // Chronological

        // Season Zero (stratum === 'signal' OR undefined, and season === 0)
        const seasonZero = enrichedSignals
            .filter(s => ((s.stratum === "signal" || !s.stratum) && s.season === 0))
            .sort((a, b) => a.episode - b.episode);

        // Reflections
        const reflections = enrichedSignals
            .filter(s => s.stratum === "reflection")
            .sort((a, b) => (a.releaseDate || 0) - (b.releaseDate || 0));

        // 5. Determine "Continue Reading"
        // The most recent signal the user has opened (lastReadAt) but not completed.
        let continueReading = null;
        if (userId) {
            const inProgress = enrichedSignals
                .filter(s => s.userProgress && !s.userProgress.isCompleted)
                // Sort by lastReadAt descending (newest first)
                .sort((a, b) => (b.userProgress?.lastReadAt || 0) - (a.userProgress?.lastReadAt || 0));

            if (inProgress.length > 0) {
                continueReading = inProgress[0];
            }
        }

        // 6. Return State
        return {
            continueReading,
            myths,
            seasonZero,
            reflections
        };
    },
});

export const saveProgress = mutation({
    args: {
        signalId: v.id("signals"),
        progress: v.number(), // 0-100
        isCompleted: v.boolean(),
    },
    handler: async (ctx, args) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return; // Silent fail if not logged in

        const userId = identity.tokenIdentifier;
        const now = Date.now();

        // Check for existing record
        const existing = await ctx.db
            .query("user_progress")
            .withIndex("by_user_signal", (q) => q.eq("userId", userId).eq("signalId", args.signalId))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                progress: args.progress,
                isCompleted: args.isCompleted ? true : existing.isCompleted, // Never un-complete
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
