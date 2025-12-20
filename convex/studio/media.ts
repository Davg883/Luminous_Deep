"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";
import { internal } from "../_generated/api";
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
        // Note: 'Luminous Deep site images' might need exact syntax if spaces are involved
        // Search expression: folder="Luminous Deep site images" AND resource_type:image
        const result = await cloudinary.search
            .expression('folder="Luminous Deep site images"')
            .max_results(50)
            .execute();

        const assets = result.resources;
        const updates: { slug: string; url: string; source: string }[] = [];

        // 3. Map Results

        for (const asset of assets) {
            const filename = asset.filename;
            let matchedSlug: string | null = null;

            // --- STRATEGY A: Standard V1 Regex ---
            // Format: LD_<Place>_<Type>_...
            const standardMatch = filename.match(/^LD_([A-Za-z]+)_([A-Za-z]+)/i);

            if (standardMatch) {
                const place = standardMatch[1].toLowerCase();
                const type = standardMatch[2].toLowerCase();

                // Map place to domain slug
                if (place === 'workshop') matchedSlug = 'workshop';
                else if (place === 'study') matchedSlug = 'study';
                else if (place === 'boathouse') matchedSlug = 'boathouse';
                else if (place === 'home' || place === 'seagrove') matchedSlug = 'home';

                // Only update background if type is 'scene' or 'zone'
                if (matchedSlug && (type !== 'scene' && type !== 'zone')) {
                    matchedSlug = null; // Ignore objects/reveals for scene background sync
                }
            }

            // --- STRATEGY B: Legacy Keyword Fallback ---
            if (!matchedSlug) {
                if (filename.toLowerCase().includes("cassie")) matchedSlug = "workshop";
                else if (filename.toLowerCase().includes("eleanor")) matchedSlug = "study";
                else if (filename.toLowerCase().includes("julian")) matchedSlug = "boathouse";
            }

            if (matchedSlug) {
                // 4. Update Convex
                await ctx.runMutation(internal.public.scenes.updateSceneMedia, {
                    slug: matchedSlug,
                    mediaUrl: asset.secure_url,
                });
                updates.push({ slug: matchedSlug, url: asset.secure_url, source: standardMatch ? "Standard V1" : "Legacy" });
            }
        }

        return { status: "success", updates };
    },
});
