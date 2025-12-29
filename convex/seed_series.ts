import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const seedSilentArchive = mutation({
    args: {},
    handler: async (ctx) => {
        // 1. Create Series
        const slug = "the-silent-archive";
        const coverImage = "https://res.cloudinary.com/dptqxjhb8/image/upload/v1735232811/The_Silent_Archive_Cover_V1.png";

        let seriesId: string;
        // Check if existing
        const existing = await ctx.db.query("series")
            .filter(q => q.eq(q.field("slug"), slug))
            .first();

        if (existing) {
            seriesId = existing._id;
            // Ensure status is Published and cover updated
            await ctx.db.patch(existing._id, {
                status: "Published",
                coverImage: coverImage // Ensure image is set 
            });
        } else {
            seriesId = await ctx.db.insert("series", {
                title: "The Silent Archive",
                slug: slug,
                description: "Fiction recovered from a system that remembers too much. Eleanor enters a bunker they said was empty, only to find the machines are still listening.",
                coverImage: coverImage,
                status: "Published",
                tags: ["Sci-Fi", "Mystery"],
            });
        }

        // 2. Link Signals
        const signals = await ctx.db.query("signals").collect();
        let count = 0;
        for (const s of signals) {
            // Apply seriesId to all signals
            await ctx.db.patch(s._id, { seriesId: seriesId });
            count++;
        }

        return `Seeded 'The Silent Archive' (${seriesId}) and linked ${count} signals.`;
    }
});
