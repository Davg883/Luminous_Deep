import { mutation, query } from "../_generated/server";
import { v } from "convex/values";
import { requireStudioAccess } from "../auth/helpers";

export const getAllScenes = query({
    args: {},
    handler: async (ctx) => {
        await requireStudioAccess(ctx);
        return await ctx.db.query("scenes").collect();
    },
});

export const getScene = query({
    args: { slug: v.string() },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);
        const scene = await ctx.db
            .query("scenes")
            .withIndex("by_slug", (q: any) => q.eq("slug", args.slug))
            .first();

        if (!scene) return null;

        const objects = await ctx.db
            .query("objects")
            .withIndex("by_scene", (q: any) => q.eq("sceneId", scene._id))
            .collect();

        return { ...scene, objects };
    },
});

export const updateScene = mutation({
    args: {
        id: v.id("scenes"),
        title: v.string(),
        backgroundMediaUrl: v.string(),
        domain: v.union(
            v.literal("workshop"),
            v.literal("study"),
            v.literal("boathouse"),
            v.literal("home"),
            v.literal("lounge"),
            v.literal("kitchen")
        ),
    },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);
        await ctx.db.patch(args.id, {
            title: args.title,
            backgroundMediaUrl: args.backgroundMediaUrl,
            domain: args.domain,
        });
    },
});

export const addObject = mutation({
    args: {
        sceneId: v.id("scenes"),
        name: v.string(),
        x: v.number(),
        y: v.number(),
    },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);

        // Create a placeholder reveal for this new object
        const revealId = await ctx.db.insert("reveals", {
            type: "text",
            title: `${args.name} Content`,
            content: "Placeholder content...",
        });

        await ctx.db.insert("objects", {
            sceneId: args.sceneId,
            name: args.name,
            x: args.x,
            y: args.y,
            hint: `Inspect ${args.name}`,
            revealId: revealId,
        });
    },
});

export const deleteObject = mutation({
    args: {
        id: v.id("objects"),
    },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);
        // Ideally we should delete the reveal too if orphaned, but for MVP just delete object
        await ctx.db.delete(args.id);
    },
});
