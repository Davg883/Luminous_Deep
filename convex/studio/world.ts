import { query } from "../_generated/server";

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
