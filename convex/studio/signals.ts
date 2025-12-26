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

export const rebuildSlugs = mutation({
    args: {},
    handler: async (ctx) => {
        const signals = await ctx.db.query("signals").collect();
        let count = 0;
        const updates = [];

        for (const signal of signals) {
            const saneTitle = signal.title
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
                .replace(/(^-|-$)+/g, '');   // Trim leading/trailing hyphens

            // Default to 'untitled' if title is empty or symbols
            const finalTitle = saneTitle || 'untitled';

            const newSlug = `${signal.season.toString().padStart(3, '0')}-${signal.episode.toString().padStart(3, '0')}-${finalTitle}`;

            await ctx.db.patch(signal._id, { slug: newSlug });
            updates.push(`${signal.title} -> ${newSlug}`);
            count++;
        }
        return `Rebuilt ${count} slugs:\n${updates.join('\n')}`;
    },
});
