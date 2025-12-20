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
            v.literal("home")
        ),
        backgroundMediaUrl: v.string(),
        isPublished: v.boolean(),
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
            v.literal("neutral")
        )),
        tone: v.optional(v.string()),
        estimatedTime: v.optional(v.number()),
        tags: v.optional(v.array(v.string())),
    }),

    chapters: defineTable({
        slug: v.string(),
        title: v.string(),
        content: v.string(),
        status: v.union(v.literal("draft"), v.literal("published")),
    }).index("by_slug", ["slug"]),
});
