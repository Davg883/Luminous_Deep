import { v } from "convex/values";
import { mutation, query } from "../_generated/server";
import { requireStudioAccess } from "../auth/helpers";

export const listPacks = query({
    args: {},
    handler: async (ctx) => {
        await requireStudioAccess(ctx);
        return await ctx.db.query("contentPacks").collect();
    },
});

export const importPack = mutation({
    args: {
        hotspotId: v.string(),
        domain: v.string(),
        sceneId: v.id("scenes"),
        title: v.string(),
        revealType: v.string(),
        bodyCopy: v.string(),
        hintLine: v.optional(v.string()),
        tags: v.array(v.string()),
        canonRefs: v.array(v.string()),
        mediaRefs: v.string(),
        status: v.union(v.literal("Draft"), v.literal("Review"), v.literal("Published")),
        version: v.number(),
        sourceFile: v.optional(v.string()),
        overwriteConfirmed: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const identity = await requireStudioAccess(ctx);

        // 1. Check for existing pack with same hotspotId
        const existing = await ctx.db
            .query("contentPacks")
            .withIndex("by_hotspot", (q) => q.eq("hotspotId", args.hotspotId))
            .first();

        if (existing && !args.overwriteConfirmed) {
            return { conflict: true, existingId: existing._id, existingTitle: existing.title };
        }

        if (existing && args.overwriteConfirmed) {
            // Archive existing to history
            await ctx.db.insert("contentPacksHistory", {
                packId: existing._id,
                hotspotId: existing.hotspotId,
                data: existing,
                archivedAt: Date.now(),
                archivedBy: identity.subject,
            });

            // Delete old or we can patch. User said "overwrite confirmed", so let's patch the existing one to keep ID?
            // User script: "Overwriting an existing hotspot requires explicit confirmation and preserves history"
            const { overwriteConfirmed, ...data } = args;
            await ctx.db.patch(existing._id, {
                ...data,
                importedBy: identity.subject,
                version: existing.version + 1,
            });
            return { success: true, id: existing._id, updated: true };
        }

        // 2. Insert new
        const { overwriteConfirmed, ...data } = args;
        const id = await ctx.db.insert("contentPacks", {
            ...data,
            importedBy: identity.subject,
        });
        return { success: true, id };
    },
});


export const updatePack = mutation({
    args: {
        id: v.id("contentPacks"),
        status: v.optional(v.union(v.literal("Draft"), v.literal("Review"), v.literal("Published"))),
        title: v.optional(v.string()),
        bodyCopy: v.optional(v.string()),
        canonCheckResult: v.optional(v.string()),
        lastReviewedBy: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);
        const { id, ...updates } = args;
        await ctx.db.patch(id, updates);
    },
});

export const publishPack = mutation({
    args: { id: v.id("contentPacks") },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);
        const pack = await ctx.db.get(args.id);
        if (!pack) throw new Error("Pack not found");

        // 1. Map Domain to Canonical Voice
        let voice: any = "systems";
        const domain = pack.domain.toLowerCase();
        if (domain === "workshop") voice = "sparkline";
        else if (domain === "study") voice = "hearth";
        else if (domain === "boathouse") voice = "systems";
        else if (domain === "home") voice = "hearth"; // Default home to Eleanor/Hearth for now

        // 2. Create the Reveal
        const revealId = await ctx.db.insert("reveals", {
            type: pack.revealType as any,
            title: pack.title,
            content: pack.bodyCopy,
            voice,
            tags: pack.tags,
            mediaUrl: pack.mediaRefs, // Link the media ref
            role: "canon",
            status: "published",
            publishedAt: Date.now(),
        });

        // 3. Create the Object
        await ctx.db.insert("objects", {
            sceneId: pack.sceneId,
            name: pack.title,
            x: 55, // Offset slightly from center so overlapping isn't perfect
            y: 45,
            hint: pack.hintLine || `Look closer at the ${pack.title.toLowerCase()}`,
            revealId,
            role: "canon",
        });


        // 3. Update status
        await ctx.db.patch(args.id, { status: "Published" });
        return { success: true };
    },
});

export const deletePack = mutation({
    args: { id: v.id("contentPacks") },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);
        await ctx.db.delete(args.id);
    },
});

export const resolveMedia = query({
    args: { publicId: v.string() },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);
        return await ctx.db
            .query("media")
            .withIndex("by_public_id", (q) => q.eq("publicId", args.publicId))
            .first();
    },
});

