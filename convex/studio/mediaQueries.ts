import { query, mutation, internalQuery } from "../_generated/server";
import { requireStudioAccess } from "../auth/helpers";
import { v } from "convex/values";

export const getAllMedia = query({
    args: {},
    handler: async (ctx) => {
        await requireStudioAccess(ctx);
        return await ctx.db.query("media").order("desc").collect();
    },
});

// Get only Visual Bible assets (for AI reference)
export const getVisualBibleAssets = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);
        const assets = await ctx.db
            .query("media")
            .withIndex("by_visual_bible", q => q.eq("isVisualBible", true))
            .collect();
        return assets.slice(0, args.limit || 14).map(a => a.url);
    },
});

// Update media metadata (Visual Bible, tags, etc.)
export const updateMedia = mutation({
    args: {
        id: v.id("media"),
        isVisualBible: v.optional(v.boolean()),
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);

        const updates: any = {};
        if (args.isVisualBible !== undefined) updates.isVisualBible = args.isVisualBible;
        if (args.tags !== undefined) updates.tags = args.tags;

        await ctx.db.patch(args.id, updates);
    },
});

// ═══════════════════════════════════════════════════════════════
// IDENTITY ANCHOR SYSTEM: Character Lock for AI Generation
// Slots 1-14 provide mathematical consistency for agent visuals
// ═══════════════════════════════════════════════════════════════

// Slot definitions for UI display
export const IDENTITY_SLOTS = {
    1: { name: "Primary Face", description: "The definitive front-facing portrait" },
    2: { name: "Side Profile", description: "Three-quarter or profile view" },
    3: { name: "Contextual Style", description: "Full-body or environment shot" },
    4: { name: "Expression Set A", description: "Neutral/contemplative" },
    5: { name: "Expression Set B", description: "Engaged/animated" },
    6: { name: "Expression Set C", description: "Focused/working" },
    7: { name: "Hands Reference", description: "Hand poses and gestures" },
    8: { name: "Wardrobe A", description: "Primary outfit reference" },
    9: { name: "Wardrobe B", description: "Secondary outfit reference" },
    10: { name: "Environment A", description: "Primary workspace" },
    11: { name: "Environment B", description: "Secondary location" },
    12: { name: "Props & Tools", description: "Character-specific items" },
    13: { name: "Lighting Reference", description: "Preferred lighting setup" },
    14: { name: "Style Guide", description: "Overall aesthetic reference" },
};

// Get all Identity Anchors for a specific agent
export const getIdentityAnchors = query({
    args: {
        agent: v.union(v.literal("cassie"), v.literal("eleanor"), v.literal("julian")),
    },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);
        return await ctx.db
            .query("media")
            .withIndex("by_identity_anchor", q => q.eq("identityAgent", args.agent))
            .collect();
    },
});

// Internal query for actions to fetch identity anchors
export const getIdentityAnchorsInternal = internalQuery({
    args: {
        agent: v.union(v.literal("cassie"), v.literal("eleanor"), v.literal("julian")),
    },
    handler: async (ctx, args) => {
        const anchors = await ctx.db
            .query("media")
            .withIndex("by_identity_anchor", q => q.eq("identityAgent", args.agent))
            .collect();

        // Sort by slot number and return URLs in order
        return anchors
            .filter(a => a.identitySlot !== undefined)
            .sort((a, b) => (a.identitySlot || 0) - (b.identitySlot || 0))
            .map(a => ({
                slot: a.identitySlot,
                url: a.url,
                publicId: a.publicId,
            }));
    },
});

// Set an image as an Identity Anchor for a specific slot
export const setIdentityAnchor = mutation({
    args: {
        id: v.id("media"),
        agent: v.union(v.literal("cassie"), v.literal("eleanor"), v.literal("julian")),
        slot: v.number(), // 1-14
    },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);

        if (args.slot < 1 || args.slot > 14) {
            throw new Error("Identity slot must be between 1 and 14");
        }

        // Check if this slot is already occupied for this agent
        const existingAnchors = await ctx.db
            .query("media")
            .withIndex("by_identity_anchor", q => q.eq("identityAgent", args.agent))
            .collect();

        const conflictingAnchor = existingAnchors.find(a => a.identitySlot === args.slot);
        if (conflictingAnchor && conflictingAnchor._id !== args.id) {
            // Clear the old anchor
            await ctx.db.patch(conflictingAnchor._id, {
                identitySlot: undefined,
                identityAgent: undefined,
                isVisualBible: false, // Also remove from Visual Bible
            });
        }

        // Set the new anchor
        await ctx.db.patch(args.id, {
            identitySlot: args.slot,
            identityAgent: args.agent,
            isVisualBible: true, // Automatically add to Visual Bible
        });

        return { success: true, slot: args.slot, agent: args.agent };
    },
});

// Clear an Identity Anchor from all slots
export const clearIdentityAnchor = mutation({
    args: {
        id: v.id("media"),
    },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);

        await ctx.db.patch(args.id, {
            identitySlot: undefined,
            identityAgent: undefined,
        });

        return { success: true };
    },
});

// Get Identity Anchor summary for all agents
export const getIdentityAnchorSummary = query({
    args: {},
    handler: async (ctx) => {
        await requireStudioAccess(ctx);

        const allAnchors = await ctx.db.query("media").collect();
        const anchored = allAnchors.filter(a => a.identityAgent && a.identitySlot);

        const summary = {
            cassie: anchored.filter(a => a.identityAgent === "cassie").length,
            eleanor: anchored.filter(a => a.identityAgent === "eleanor").length,
            julian: anchored.filter(a => a.identityAgent === "julian").length,
            total: anchored.length,
            maxPerAgent: 14,
        };

        return summary;
    },
});
