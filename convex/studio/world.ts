import { query, mutation } from "../_generated/server";
import { v } from "convex/values";

export const getWorldMap = query({
    handler: async (ctx) => {
        // Fetch Canon Vault (Level 0)
        const canon = await ctx.db.query("canon_vault").collect();

        // Fetch all signals
        const allSignals = await ctx.db.query("signals")
            .withIndex("by_season_episode")
            .order("asc")
            .collect();

        // Group by stratum (defaulting missing to "signal")
        const myths: typeof allSignals = [];
        const signalsBySeason: Record<number, typeof allSignals> = {};
        const reflections: typeof allSignals = [];

        for (const signal of allSignals) {
            const stratum = signal.stratum ?? "signal";

            if (stratum === "myth") {
                myths.push(signal);
            } else if (stratum === "reflection") {
                reflections.push(signal);
            } else {
                // Group signals by season
                const season = signal.season ?? 0;
                if (!signalsBySeason[season]) {
                    signalsBySeason[season] = [];
                }
                signalsBySeason[season].push(signal);
            }
        }

        return {
            canon,
            myths,
            signalsBySeason,
            reflections,
            // Integrity summary
            integrity: {
                totalCanon: canon.length,
                totalMyths: myths.length,
                totalSignals: allSignals.filter(s => (s.stratum ?? "signal") === "signal").length,
                totalReflections: reflections.length,
                lastUpdated: allSignals[allSignals.length - 1]?.publishedAt ?? null,
            }
        };
    },
});

// ═══════════════════════════════════════════════════════════════
// CANON VAULT MUTATIONS
// ═══════════════════════════════════════════════════════════════

export const publishCanon = mutation({
    args: {
        id: v.optional(v.id("canon_vault")),
        title: v.string(),
        slug: v.string(),
        content: v.string(),
    },
    handler: async (ctx, args) => {
        if (args.id) {
            // Update existing canon entry
            const existing = await ctx.db.get(args.id);
            if (!existing) throw new Error("Canon entry not found");

            await ctx.db.patch(args.id, {
                title: args.title,
                slug: args.slug,
                content: args.content,
                version: (existing.version || 1) + 1,
            });
            return args.id;
        } else {
            // Create new canon entry
            const existing = await ctx.db
                .query("canon_vault")
                .withIndex("by_slug", (q) => q.eq("slug", args.slug))
                .first();

            if (existing) {
                throw new Error(`Canon entry with slug "${args.slug}" already exists`);
            }

            return await ctx.db.insert("canon_vault", {
                title: args.title,
                slug: args.slug,
                content: args.content,
                version: 1,
                lockedAt: Date.now(),
            });
        }
    },
});

export const deleteCanon = mutation({
    args: { id: v.id("canon_vault") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    },
});

export const listCanon = query({
    handler: async (ctx) => {
        return await ctx.db.query("canon_vault").collect();
    },
});
