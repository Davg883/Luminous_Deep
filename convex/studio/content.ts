import { v } from "convex/values";
import { mutation, query, internalMutation } from "../_generated/server";
import { requireStudioAccess } from "../auth/helpers";

export const listPacks = query({
    args: {},
    handler: async (ctx) => {
        await requireStudioAccess(ctx);
        const packs = await ctx.db.query("contentPacks").collect();
        return packs.sort((a, b) => b._creationTime - a._creationTime);
    },
});

export const listAllReveals = query({
    args: {},
    handler: async (ctx) => {
        await requireStudioAccess(ctx);

        const reveals = await ctx.db.query("reveals").collect();
        const objects = await ctx.db.query("objects").collect();

        const linkedRevealIds = new Set(
            objects
                .filter(obj => obj.revealId)
                .map(obj => obj.revealId?.toString())
        );

        const enrichedReveals = await Promise.all(reveals.map(async (reveal) => {
            const isLinked = linkedRevealIds.has(reveal._id.toString());
            const linkedObject = objects.find(obj => obj.revealId?.toString() === reveal._id.toString());
            let sceneName = null;

            if (linkedObject) {
                const scene = await ctx.db.get(linkedObject.sceneId);
                sceneName = scene?.title || "Unknown Scene";
            }

            let scene_slug = "home";
            if (reveal.spaceId) {
                const space = await ctx.db.get(reveal.spaceId);
                scene_slug = space?.slug || "home";
            }

            return {
                ...reveal,
                isLinked,
                linkedObjectId: linkedObject?._id || null,
                linkedSceneName: sceneName,
                linkedObjectName: linkedObject?.name || null,
                scene_slug,
                isAnchored: isLinked,
            };
        }));

        return enrichedReveals.sort((a, b) => {
            const timeA = a.publishedAt || a._creationTime;
            const timeB = b.publishedAt || b._creationTime;
            return timeB - timeA;
        });
    },
});

export const listUnlinkedReveals = query({
    args: {},
    handler: async (ctx) => {
        await requireStudioAccess(ctx);
        const reveals = await ctx.db.query("reveals").collect();
        const objects = await ctx.db.query("objects").collect();
        const linkedRevealIds = new Set(objects.map(obj => obj.revealId?.toString()).filter(Boolean));
        return reveals
            .filter(reveal => !linkedRevealIds.has(reveal._id.toString()))
            .sort((a, b) => b._creationTime - a._creationTime);
    },
});

export const reassignRevealSpace = mutation({
    args: {
        revealId: v.id("reveals"),
        newSceneSlug: v.string()
    },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);

        const newScene = await ctx.db
            .query("scenes")
            .withIndex("by_slug", (q) => q.eq("slug", args.newSceneSlug))
            .first();

        if (!newScene) {
            throw new Error(`Scene with slug '${args.newSceneSlug}' not found.`);
        }

        await ctx.db.patch(args.revealId, { spaceId: newScene._id });

        const linkedObjects = await ctx.db
            .query("objects")
            .filter(q => q.eq(q.field("revealId"), args.revealId))
            .collect();

        for (const obj of linkedObjects) {
            await ctx.db.patch(obj._id, { sceneId: newScene._id });
        }

        return { success: true, newSceneId: newScene._id, movedObjects: linkedObjects.length };
    }
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
        phase: v.optional(v.union(
            v.literal("early_year"),
            v.literal("spring"),
            v.literal("summer"),
            v.literal("autumn"),
            v.literal("winter")
        )),
    },
    handler: async (ctx, args) => {
        const identity = await requireStudioAccess(ctx);

        const existing = await ctx.db
            .query("contentPacks")
            .withIndex("by_hotspot", (q) => q.eq("hotspotId", args.hotspotId))
            .first();

        if (existing && !args.overwriteConfirmed) {
            return { conflict: true, existingId: existing._id, existingTitle: existing.title };
        }

        if (existing && args.overwriteConfirmed) {
            await ctx.db.insert("contentPacksHistory", {
                packId: existing._id,
                hotspotId: existing.hotspotId,
                data: existing,
                archivedAt: Date.now(),
                archivedBy: identity.tokenIdentifier,
            });

            const { overwriteConfirmed, ...data } = args;
            await ctx.db.patch(existing._id, {
                ...data,
                importedBy: identity.tokenIdentifier,
                version: existing.version + 1,
            });
            return { success: true, id: existing._id, updated: true };
        }

        const { overwriteConfirmed, ...data } = args;
        const id = await ctx.db.insert("contentPacks", {
            ...data,
            importedBy: identity.tokenIdentifier,
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
        phase: v.optional(v.union(
            v.literal("early_year"),
            v.literal("spring"),
            v.literal("summer"),
            v.literal("autumn"),
            v.literal("winter")
        )),
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

        let finalSceneId = pack.sceneId;
        const scene = await ctx.db.get(finalSceneId);
        if (!scene) {
            const recovered = await ctx.db.query("scenes").withIndex("by_slug", q => q.eq("slug", pack.domain.toLowerCase())).first();
            if (recovered) finalSceneId = recovered._id;
            else throw new Error(`Target Scene (ID: ${pack.sceneId}) not found.`);
        }

        let voice: any = "systems";
        const domain = pack.domain.toLowerCase();
        if (domain === "workshop") voice = "sparkline";
        else if (domain === "study") voice = "hearth";
        else if (domain === "boathouse") voice = "systems";
        else if (domain === "orangery") voice = "cassie";
        else if (domain === "sanctuary") voice = "neutral";
        else if (domain === "home") voice = "hearth";

        const revealId = await ctx.db.insert("reveals", {
            type: pack.revealType as any,
            title: pack.title,
            content: pack.bodyCopy,
            voice,
            tags: pack.tags,
            mediaUrl: pack.mediaRefs,
            role: "canon",
            status: "published",
            publishedAt: Date.now(),
            spaceId: finalSceneId,
            phase: pack.phase,
        });

        await ctx.db.insert("objects", {
            sceneId: finalSceneId,
            name: pack.title,
            x: 55,
            y: 45,
            hint: pack.hintLine || `Look closer at the ${pack.title.toLowerCase()}`,
            revealId,
            role: "canon",
        });

        await ctx.db.delete(args.id);
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

export const deleteRevealInternal = internalMutation({
    args: { id: v.id("reveals") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
        const objects = await ctx.db
            .query("objects")
            .filter((q) => q.eq(q.field("revealId"), args.id))
            .collect();
        for (const obj of objects) {
            await ctx.db.delete(obj._id);
        }
    },
});

export const deleteReveal = mutation({
    args: { id: v.id("reveals") },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);
        await ctx.db.delete(args.id);
        const objects = await ctx.db
            .query("objects")
            .filter((q) => q.eq(q.field("revealId"), args.id))
            .collect();
        for (const obj of objects) {
            await ctx.db.delete(obj._id);
        }
    },
});

export const updateReveal = mutation({
    args: {
        id: v.id("reveals"),
        title: v.optional(v.string()),
        content: v.optional(v.string()),
        mediaUrl: v.optional(v.string()),
        phase: v.optional(v.union(
            v.literal("early_year"),
            v.literal("spring"),
            v.literal("summer"),
            v.literal("autumn"),
            v.literal("winter")
        ))
    },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);
        const updates: any = {};
        if (args.title !== undefined) updates.title = args.title;
        if (args.content !== undefined) updates.content = args.content;
        if (args.mediaUrl !== undefined) updates.mediaUrl = args.mediaUrl;
        if (args.phase !== undefined) updates.phase = args.phase;
        await ctx.db.patch(args.id, updates);
    }
});
