"use node";

import { internalAction, action } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireStudioAccessAction } from "../auth/helpers";
import { v2 as cloudinary } from "cloudinary";

export const syncCloudinaryAssets = internalAction({
    args: {},
    handler: async (ctx) => {
        console.log("Starting Cloudinary sync for folder: Luminous Deep site images");
        // 1. Config Cloudinary
        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
        });

        // 2. Fetch Assets (Global Search for "LD_")
        // We now search for any public_id starting with "LD_" OR specific folders, to be safe.
        // Also getting both images and video in sorted order.
        const result = await cloudinary.search
            .expression('public_id:LD_* OR folder="Luminous Deep site images"')
            .sort_by('created_at', 'desc')
            .max_results(200)
            .execute();

        const assets = result.resources;
        const updates: any[] = [];

        for (const asset of assets) {
            try {
                // Save to media table
                await ctx.runMutation(internal.studio.mutations.upsertMediaRecord, {
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
                    else if (place === 'study' || place === 'eleanor') matchedSlug = 'study';
                    else if (place === 'boathouse' || place === 'julian') matchedSlug = 'boathouse';
                    else if (place === 'home' || place === 'seagrove') matchedSlug = 'home';

                    if (matchedSlug && (type === 'scene' || type === 'zone')) {
                        await ctx.runMutation(internal.public.scenes.updateSceneMedia, {
                            slug: matchedSlug,
                            mediaUrl: asset.secure_url,
                        });
                        updates.push({ slug: matchedSlug, url: asset.secure_url });
                    }
                }
            } catch (err: any) {
                console.warn(`Failed to process asset ${asset.public_id}: ${err.message}`);
                continue;
            }
        }

        return { status: "success", count: assets.length, updates };
    },
});

export const syncMedia = action({
    args: {},
    handler: async (ctx: any): Promise<any> => {
        await requireStudioAccessAction(ctx);
        return await ctx.runAction(internal.studio.media.syncCloudinaryAssets, {});
    },
});



