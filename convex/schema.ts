import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    users: defineTable({
        name: v.string(),
        tokenIdentifier: v.string(),
        role: v.optional(v.union(v.literal("admin"), v.literal("user"))),
    }).index("by_token", ["tokenIdentifier"]),

    scenes: defineTable({
        slug: v.string(),
        title: v.string(),
        domain: v.union(
            v.literal("workshop"),
            v.literal("study"),
            v.literal("boathouse"),
            v.literal("home"),
            v.literal("lounge"),
            v.literal("kitchen")
        ),
        backgroundMediaUrl: v.string(),
        isPublished: v.boolean(),
        playbackSpeed: v.optional(v.number()),
        // Naming Standard v1 Metadata
        variant: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
    }).index("by_slug", ["slug"]),

    objects: defineTable({
        sceneId: v.id("scenes"),
        name: v.string(),
        x: v.number(),
        y: v.number(),
        hint: v.string(),
        revealId: v.id("reveals"),
        // Naming Standard v1 Metadata
        role: v.optional(v.string()), // e.g. 'transition', 'reveal'
    }).index("by_scene", ["sceneId"]),

    reveals: defineTable({
        type: v.union(
            v.literal("text"),
            v.literal("audio"),
            v.literal("video"),
            v.literal("image")
        ),
        title: v.string(),
        content: v.string(),
        mediaUrl: v.optional(v.string()),
        // Naming Standard v1 Metadata
        voice: v.optional(v.union(
            v.literal("cassie"),
            v.literal("eleanor"),
            v.literal("julian"),
            v.literal("sparkline"),
            v.literal("hearth"),
            v.literal("systems"),
            v.literal("neutral")
        )),

        tone: v.optional(v.string()),
        estimatedTime: v.optional(v.number()),
        tags: v.optional(v.array(v.string())),
        role: v.optional(v.string()), // e.g. 'canon', 'clue', 'flavor'
        status: v.optional(v.union(v.literal("draft"), v.literal("review"), v.literal("published"))),
        publishedAt: v.optional(v.number()),
    }),



    chapters: defineTable({
        slug: v.string(),
        title: v.string(),
        content: v.string(),
        status: v.union(v.literal("draft"), v.literal("published")),
    }).index("by_slug", ["slug"]),

    contentPacks: defineTable({
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
        lastReviewedBy: v.optional(v.string()),
        canonCheckResult: v.optional(v.string()),
        // Audit fields
        importedBy: v.string(), // Clerk userId
        sourceFile: v.optional(v.string()),
    }).index("by_scene", ["sceneId"]).index("by_hotspot", ["hotspotId"]),

    contentPacksHistory: defineTable({
        packId: v.id("contentPacks"),
        hotspotId: v.string(),
        data: v.any(), // Snapshot of the pack data
        archivedAt: v.number(),
        archivedBy: v.string(),
    }).index("by_pack", ["packId"]).index("by_hotspot", ["hotspotId"]),

    media: defineTable({
        publicId: v.string(),
        url: v.string(),
        resourceType: v.string(), // image, video, raw
        folder: v.optional(v.string()),
        format: v.string(),
        bytes: v.number(),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
    }).index("by_public_id", ["publicId"]),
});



