import { internalMutation } from "../_generated/server";
import { v } from "convex/values";

export const upsertMediaRecord = internalMutation({
    args: {
        publicId: v.string(),
        url: v.string(),
        resourceType: v.string(),
        folder: v.optional(v.string()),
        format: v.string(),
        bytes: v.number(),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        // Visual Bible / Identity Anchor fields
        isVisualBible: v.optional(v.boolean()),
        identitySlot: v.optional(v.number()),
        identityAgent: v.optional(v.union(
            v.literal("cassie"),
            v.literal("eleanor"),
            v.literal("julian")
        )),
        // AI-extracted tags from Cloudinary
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("media")
            .withIndex("by_public_id", (q) => q.eq("publicId", args.publicId))
            .first();

        if (existing) {
            // If this asset is being assigned to an identity slot,
            // clear any existing asset in that slot for this agent
            if (args.identitySlot && args.identityAgent) {
                const conflicting = await ctx.db
                    .query("media")
                    .withIndex("by_identity_anchor", q => q.eq("identityAgent", args.identityAgent))
                    .collect();

                for (const conflict of conflicting) {
                    if (conflict.identitySlot === args.identitySlot && conflict._id !== existing._id) {
                        await ctx.db.patch(conflict._id, {
                            identitySlot: undefined,
                            identityAgent: undefined,
                        });
                    }
                }
            }
            await ctx.db.patch(existing._id, args);
        } else {
            // Same conflict resolution for new records
            if (args.identitySlot && args.identityAgent) {
                const conflicting = await ctx.db
                    .query("media")
                    .withIndex("by_identity_anchor", q => q.eq("identityAgent", args.identityAgent))
                    .collect();

                for (const conflict of conflicting) {
                    if (conflict.identitySlot === args.identitySlot) {
                        await ctx.db.patch(conflict._id, {
                            identitySlot: undefined,
                            identityAgent: undefined,
                        });
                    }
                }
            }
            await ctx.db.insert("media", args);
        }
    },
});
