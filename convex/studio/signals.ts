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
        // Cover Art Fields
        coverImage: v.optional(v.string()),
        subtitle: v.optional(v.string()),
        // Narrative Governance
        stratum: v.optional(v.union(
            v.literal("signal"),
            v.literal("myth"),
            v.literal("reflection")
        )),
        voice: v.optional(v.union(
            v.literal("thea"),
            v.literal("eleanor"),
            v.literal("palimpsaest")
        )),
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
            // Cover Art
            coverImage: args.coverImage,
            subtitle: args.subtitle,
            // Narrative Governance: Default stratum to "signal" if not provided
            stratum: args.stratum ?? "signal",
            voice: args.voice,
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

// Quick Update mutation for World Map editor
export const updateSignal = mutation({
    args: {
        id: v.id("signals"),
        coverImage: v.optional(v.string()),
        stratum: v.optional(v.union(
            v.literal("signal"),
            v.literal("myth"),
            v.literal("reflection")
        )),
        title: v.optional(v.string()),
        subtitle: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { id, ...updates } = args;
        // Filter out undefined values
        const cleanUpdates = Object.fromEntries(
            Object.entries(updates).filter(([_, v]) => v !== undefined)
        );
        await ctx.db.patch(id, cleanUpdates);
        return id;
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
