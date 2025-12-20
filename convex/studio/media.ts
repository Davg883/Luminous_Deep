"use node";

import { internalAction, internalMutation, action } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
import { requireStudioAccessAction } from "../auth/helpers";
import { v2 as cloudinary } from "cloudinary";

export const syncCloudinaryAssets = internalAction({
    args: {},
    handler: async (ctx) => {
        // 1. Config Cloudinary
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        // 2. Fetch Assets
        const result = await cloudinary.search
            .expression('folder="Luminous Deep site images" OR folder="LD_Home" OR folder="LD_Study" OR folder="LD_Workshop" OR folder="LD_Boathouse"')
            .max_results(200)
            .execute();

        const assets = result.resources;
        const updates: any[] = [];

        for (const asset of assets) {
            // Save to media table
            await ctx.runMutation(internal.studio.media.upsertMediaRecord, {
                publicId: asset.public_id,
                url: asset.secure_url,
                resourceType: asset.resource_type,
                folder: asset.folder,
                format: asset.format,
                bytes: asset.bytes,
                width: asset.width,
                height: asset.height,
            });

            const filename = asset.filename;
            let matchedSlug: string | null = null;
            const standardMatch = filename.match(/^LD_([A-Za-z]+)_([A-Za-z]+)/i);

            if (standardMatch) {
                const place = standardMatch[1].toLowerCase();
                const type = standardMatch[2].toLowerCase();
                if (place === 'workshop') matchedSlug = 'workshop';
                else if (place === 'study') matchedSlug = 'study';
                else if (place === 'boathouse') matchedSlug = 'boathouse';
                else if (place === 'home' || place === 'seagrove') matchedSlug = 'home';

                if (matchedSlug && (type === 'scene' || type === 'zone')) {
                    await ctx.runMutation(internal.public.scenes.updateSceneMedia, {
                        slug: matchedSlug,
                        mediaUrl: asset.secure_url,
                    });
                    updates.push({ slug: matchedSlug, url: asset.secure_url });
                }
            }
        }

        return { status: "success", count: assets.length, updates };
    },
});

export const upsertMediaRecord = internalMutation({
    args: {
        publicId: v.string(),
        url: v.string(),
        resourceType: v.string(),
        folder: v.string(),
        format: v.string(),
        bytes: v.number(),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
    },
    handler: async (ctx: any, args: any) => {
        const existing = await ctx.db
            .query("media")
            .withIndex("by_public_id", (q: any) => q.eq("publicId", args.publicId))
            .first();


        if (existing) {
            await ctx.db.patch(existing._id, args);
        } else {
            await ctx.db.insert("media", args);
        }
    },
});

export const syncMedia = action({
    args: {},
    handler: async (ctx: any) => {
        await requireStudioAccessAction(ctx);
        return await ctx.runAction(internal.studio.media.syncCloudinaryAssets, {});
    },
});



