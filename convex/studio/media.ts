"use node";

import { internalAction, action } from "../_generated/server";
import { internal } from "../_generated/api";
import { requireStudioAccessAction } from "../auth/helpers";
import { v2 as cloudinary } from "cloudinary";

// ═══════════════════════════════════════════════════════════════
// VISUAL BIBLE AUTO-MAPPING
// Filename pattern: LD_BIBLE_{AGENT}_{SLOT}_{description}
// Example: LD_BIBLE_JULIAN_01_front_portrait.jpg
// ═══════════════════════════════════════════════════════════════

type AgentVoice = "cassie" | "eleanor" | "julian";

const AGENT_ALIASES: Record<string, AgentVoice> = {
    cassie: "cassie",
    cass: "cassie",
    workshop: "cassie",
    eleanor: "eleanor",
    el: "eleanor",
    study: "eleanor",
    julian: "julian",
    jul: "julian",
    boathouse: "julian",
};

// Parse LD_BIBLE_ filename to extract agent and slot
function parseVisualBibleFilename(filename: string): { agent: AgentVoice; slot: number } | null {
    // Pattern: LD_BIBLE_{AGENT}_{SLOT} or LD_BIBLE_{AGENT}{SLOT}
    const bibleMatch = filename.match(/^LD_BIBLE_([A-Za-z]+)_?(\d{1,2})/i);
    if (!bibleMatch) return null;

    const agentRaw = bibleMatch[1].toLowerCase();
    const slotRaw = parseInt(bibleMatch[2], 10);

    const agent = AGENT_ALIASES[agentRaw];
    if (!agent) {
        console.warn(`[VISUAL BIBLE] Unknown agent alias: ${agentRaw}`);
        return null;
    }

    if (slotRaw < 1 || slotRaw > 14) {
        console.warn(`[VISUAL BIBLE] Invalid slot number: ${slotRaw} (must be 1-14)`);
        return null;
    }

    return { agent, slot: slotRaw };
}

// Fetch AI tags from Cloudinary using explicit API
async function fetchCloudinaryAITags(publicId: string): Promise<string[]> {
    try {
        console.log(`[AI TAGGING] Requesting analysis for: ${publicId}`);

        // Call Cloudinary's explicit API with AI categorization
        const result = await cloudinary.uploader.explicit(publicId, {
            type: "upload",
            categorization: "google_tagging,imagga_tagging",
            auto_tagging: 0.6, // Minimum confidence threshold
        });

        // Extract tags from categorization results
        const tags: string[] = [];

        // Google Vision tags
        if (result.info?.categorization?.google_tagging?.data) {
            for (const tag of result.info.categorization.google_tagging.data) {
                if (tag.tag && tag.confidence > 0.6) {
                    tags.push(tag.tag.toLowerCase());
                }
            }
        }

        // Imagga tags
        if (result.info?.categorization?.imagga_tagging?.data) {
            for (const tag of result.info.categorization.imagga_tagging.data) {
                if (tag.tag && tag.confidence > 0.6) {
                    tags.push(tag.tag.en.toLowerCase());
                }
            }
        }

        // Also include any existing tags
        if (result.tags && Array.isArray(result.tags)) {
            tags.push(...result.tags);
        }

        // Deduplicate
        const uniqueTags = [...new Set(tags)];
        console.log(`[AI TAGGING] Extracted ${uniqueTags.length} tags: ${uniqueTags.slice(0, 5).join(", ")}...`);

        return uniqueTags;
    } catch (error: any) {
        console.warn(`[AI TAGGING] Failed for ${publicId}: ${error.message}`);
        return [];
    }
}

export const syncCloudinaryAssets = internalAction({
    args: {},
    handler: async (ctx) => {
        try {
            console.log("Starting Cloudinary sync with Visual Bible detection...");

            // 1. Config Cloudinary
            cloudinary.config({
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET,
            });

            // 2. Fetch Assets (Expanded search to include BIBLE assets)
            const result = await cloudinary.search
                .expression('public_id:LD_* OR folder="Luminous Deep site images" OR folder="Luminous Deep/Visual Bible"')
                .sort_by('created_at', 'desc')
                .max_results(500)
                .execute();

            const assets = result.resources;
            const updates: any[] = [];
            const bibleUpdates: any[] = [];
            console.log(`Found ${assets.length} assets to process.`);

            for (const asset of assets) {
                try {
                    const filename = asset.filename || asset.public_id.split("/").pop() || "";

                    // ═══════════════════════════════════════════════════════════════
                    // VISUAL BIBLE DETECTION
                    // ═══════════════════════════════════════════════════════════════
                    const bibleData = parseVisualBibleFilename(filename);
                    let aiTags: string[] = [];

                    if (bibleData) {
                        console.log(`[VISUAL BIBLE] Detected: ${filename} → ${bibleData.agent} Slot ${bibleData.slot}`);

                        // Fetch AI tags for Visual Bible assets
                        aiTags = await fetchCloudinaryAITags(asset.public_id);

                        // Save to media table with identity anchor data
                        await ctx.runMutation(internal.studio.mutations.upsertMediaRecord, {
                            publicId: asset.public_id,
                            url: asset.secure_url,
                            resourceType: asset.resource_type,
                            folder: asset.folder,
                            format: asset.format,
                            bytes: asset.bytes,
                            width: asset.width,
                            height: asset.height,
                            // Visual Bible auto-assignment
                            isVisualBible: true,
                            identityAgent: bibleData.agent,
                            identitySlot: bibleData.slot,
                            tags: aiTags.length > 0 ? aiTags : undefined,
                        });

                        bibleUpdates.push({
                            agent: bibleData.agent,
                            slot: bibleData.slot,
                            publicId: asset.public_id,
                            tagsCount: aiTags.length,
                        });
                    } else {
                        // Standard asset (no Visual Bible)
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
                    }

                    // ═══════════════════════════════════════════════════════════════
                    // SCENE MEDIA MAPPING (existing logic)
                    // ═══════════════════════════════════════════════════════════════
                    let matchedSlug: string | null = null;
                    const standardMatch = filename.match(/^LD_([A-Za-z]+)_([A-Za-z]+)/i);

                    if (standardMatch && !bibleData) { // Don't re-process BIBLE assets
                        const place = standardMatch[1].toLowerCase();
                        const type = standardMatch[2].toLowerCase();

                        if (place === 'workshop') matchedSlug = 'workshop';
                        else if (place === 'study' || place === 'eleanor') matchedSlug = 'study';
                        else if (place === 'boathouse' || place === 'julian') matchedSlug = 'boathouse';
                        else if (place === 'home' || place === 'seagrove') matchedSlug = 'home';
                        else if (place === 'lounge' || place === 'hearth') matchedSlug = 'lounge';
                        else if (place === 'kitchen' || place === 'galley') matchedSlug = 'kitchen';
                        else if (place === 'luminous' || place === 'deep' || place === 'controlroom' || place === 'control') matchedSlug = 'luminous-deep';

                        if (matchedSlug && (type === 'scene' || type === 'zone')) {
                            console.log(`Syncing ${matchedSlug} with media: ${asset.secure_url}`);
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

            console.log(`[SYNC COMPLETE] ${assets.length} assets, ${bibleUpdates.length} Visual Bible items`);

            return {
                status: "success",
                count: assets.length,
                updates,
                visualBible: {
                    count: bibleUpdates.length,
                    items: bibleUpdates,
                }
            };
        } catch (e: any) {
            console.error("CRITICAL SYNC ERROR:", JSON.stringify(e, null, 2));
            const msg = e.error?.message || e.message || "Unknown error";
            throw new Error(`Sync failed: ${msg}`);
        }
    },
});

export const syncMedia = action({
    args: {},
    handler: async (ctx: any): Promise<any> => {
        await requireStudioAccessAction(ctx);
        return await ctx.runAction(internal.studio.media.syncCloudinaryAssets, {});
    },
});
