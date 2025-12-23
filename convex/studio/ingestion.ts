"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { requireStudioAccessAction } from "../auth/helpers";
import { internal } from "../_generated/api";
import crypto from "crypto";

// Cloudinary will be required lazily inside the action to avoid module loading issues

type AgentIdentity = "julian" | "eleanor" | "cassie" | "unknown";
type AssetRole = "portrait" | "technical_setting" | "mood_piece" | "hands" | "wardrobe" | "environment" | "props" | "unknown";

interface AssetAnalysis {
    agent: AgentIdentity;
    slot: number;
    role: string;
    suggestedName: string;
    tags: string[];
    confidence: number;
    reasoning: string;
}

// ═══════════════════════════════════════════════════════════════
// CORE LOGIC: Vision Analysis (The Digital Registrar)
// ═══════════════════════════════════════════════════════════════

async function analyzeIngestIntentCore(imageBase64: string, mimeType?: string): Promise<AssetAnalysis> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error("Missing GOOGLE_API_KEY environment variable");
    }

    console.log("[SMART INGEST] Analyzing asset with Gemini Vision...");

    const analysisPrompt = `
You are the "Luminous Deep Digital Registrar." Your task is to analyze incoming visual assets (Images or Video Loops) for character archival.

CHARACTERS IN THE LUMINOUS DEEP UNIVERSE:
- JULIAN: A maritime engineer. Associated with analytical precision, brass, cyanotype, boathouse.
- ELEANOR: A literary curator. Associated with nostalgia, books, warm focus, studies.
- CASSIE: A maker. Associated with workshop chaos, tools, sawdust, tungsten light.

YOUR TASK:
Analyze this asset and provide:
1. AGENT: julian | eleanor | cassie.
2. ROLE: (e.g., Portrait, EXPRESSION, HANDS, TOOLS, ENVIRONMENT, LOOPS).
3. SLOT: Suggest 1-14 based on the role.
4. SUGGESTED_NAME: 
   - If Image: LD_BIBLE_[AGENT]_[SLOT]_[ROLE]
   - If Video Loop: LD_SCENE_[ROOM]_[TYPE] (e.g. LD_SCENE_LOUNGE_MAIN, LD_SCENE_KITCHEN_ARTIFACT)
5. TAGS: 5-10 descriptive technical tags.

VIDEO LOOP SPECIFIC:
If the visual appears to be a cinemagraph or background loop (e.g., waves, fire, steam):
- Identify the likely Room: Lounge (Fire), Kitchen (Steam/Kettle), Boathouse (Waves/Water), Study (Dust Motes), Workshop (Sparks).
- Use naming convention: LD_SCENE_[ROOM]_MAIN (for full backgrounds) or LD_SCENE_[ROOM]_ARTIFACT (for small details).

OUTPUT FORMAT (JSON only):
{
    "agent": "string",
    "slot": number,
    "suggestedName": "string",
    "role": "string",
    "tags": ["string"],
    "confidence": number,
    "reasoning": "string"
}
`;

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3-flash-preview:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: analysisPrompt },
                        {
                            inlineData: {
                                mimeType: mimeType || "image/jpeg",
                                data: imageBase64
                            }
                        }
                    ]
                }],
                generationConfig: {
                    temperature: 0.2,
                    maxOutputTokens: 1024,
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[SMART INGEST] Vision API Error:", errorText);
            throw new Error(`Vision analysis failed: ${response.status}`);
        }

        const data = await response.json();
        const textResponse = data.candidates?.[0]?.content?.parts?.[0]?.text;

        if (!textResponse) {
            throw new Error("No analysis returned from Vision API");
        }

        // Parse JSON from response
        const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
            console.error("[SMART INGEST] Could not parse JSON from:", textResponse);
            throw new Error("Invalid analysis response format");
        }

        const analysis = JSON.parse(jsonMatch[0]);

        return {
            agent: analysis.agent || "unknown",
            slot: analysis.slot || 3,
            role: analysis.role || "unknown",
            suggestedName: analysis.suggestedName || `LD_BIBLE_UNKNOWN_${Date.now()}`,
            tags: analysis.tags || [],
            confidence: analysis.confidence || 0.5,
            reasoning: analysis.reasoning || "No reasoning provided",
        };
    } catch (error: any) {
        console.error("[SMART INGEST] Analysis error:", error);
        throw new Error(`Asset analysis failed: ${error.message}`);
    }
}

export const analyzeIngestIntent = action({
    args: {
        imageBase64: v.string(),
        mimeType: v.optional(v.string()),
    },
    handler: async (ctx, args): Promise<AssetAnalysis> => {
        await requireStudioAccessAction(ctx);
        return await analyzeIngestIntentCore(args.imageBase64, args.mimeType);
    }
});

// ═══════════════════════════════════════════════════════════════
// TASK 2: Concurrent Smart Upload (Analysis + Cloudinary Upload)
// ═══════════════════════════════════════════════════════════════

export const smartAgenticUpload = action({
    args: {
        imageBase64: v.string(), // File content (Image or Video)
        thumbnailBase64: v.optional(v.string()), // Optional thumbnail for video analysis
        mimeType: v.optional(v.string()),
        overrideAgent: v.optional(v.union(v.literal("cassie"), v.literal("eleanor"), v.literal("julian"))),
        overrideSlot: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // ═══════════════════════════════════════════════════════════════
        // STEP 0: LAZY LOAD CLOUDINARY (require inside handler for reliability)
        // This prevents ESM module loading issues in Convex
        // ═══════════════════════════════════════════════════════════════

        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const cloudinaryModule = require("cloudinary");
        const cloudinary = cloudinaryModule.v2;

        if (!process.env.CLOUDINARY_API_KEY) {
            throw new Error("CLOUDINARY_API_KEY is not defined in the environment.");
        }

        cloudinary.config({
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
            api_key: process.env.CLOUDINARY_API_KEY,
            api_secret: process.env.CLOUDINARY_API_SECRET,
            secure: true
        });

        // Now proceed with authentication
        await requireStudioAccessAction(ctx);

        const logs: string[] = [];
        const log = (agent: string, message: string) => {
            const entry = `> ${agent.toUpperCase()}: ${message}`;
            logs.push(entry);
            console.log(entry);
        };

        log("SYSTEM", "Cloudinary SDK initialized.");

        // Validate remaining environment variables
        const googleApiKey = process.env.GOOGLE_API_KEY;
        if (!googleApiKey) {
            log("SYSTEM", "✗ Configuration check failed: GOOGLE_API_KEY missing");
            throw new Error("GOOGLE_API_KEY is required for Vision analysis. Verify Convex Environment Variables.");
        }

        // Store Cloudinary credentials for later use (already validated at start)
        const cloudinaryCloud = process.env.CLOUDINARY_CLOUD_NAME!;
        const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY!;
        const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET!;

        log("SYSTEM", "✓ All configuration validated. Starting ingest pipeline...");

        const timestamp = Date.now();

        try {
            log("SYSTEM", "Initiating parallel Vision-to-Cloud streams...");

            // ═══════════════════════════════════════════════════════════════
            // PARALLEL EXECUTION: Fibre Optimization
            // Start Gemini Analysis and Cloudinary Upload simultaneously
            // ═══════════════════════════════════════════════════════════════

            log("SYSTEM", "Starting Vision analysis (parallel)...");
            // If video, use thumbnail for analysis if available, otherwise fallback to main file (risky for video)
            const analysisImage = args.thumbnailBase64 || args.imageBase64;
            // Ensure mime type for analysis is image if we are using thumbnail
            const analysisMime = args.thumbnailBase64 ? "image/jpeg" : (args.mimeType || "image/jpeg");

            const analysisPromise = analyzeIngestIntentCore(analysisImage, analysisMime);

            // For the initial upload, we use a temp name and move it later
            const tempPublicId = `LD_INGEST_TEMP_${timestamp}_${Math.random().toString(36).substring(7)}`;

            log("SYSTEM", `Starting Cloudinary temp upload: ${tempPublicId}...`);
            const uploadPromise = (async () => {
                const mimeType = args.mimeType || "image/jpeg";
                const isVideo = mimeType.startsWith("video/");
                const resourceType = isVideo ? "video" : "image";

                const timestampSec = Math.floor(timestamp / 1000);

                const signatureParams = [
                    ...(isVideo ? ["eager=e_loop,f_auto,q_auto"] : []), // Add eager transform for videos
                    `public_id=${tempPublicId}`,
                    `timestamp=${timestampSec}`
                ].filter(Boolean).sort().join("&");

                const signature = crypto
                    .createHash("sha1")
                    .update(signatureParams + cloudinaryApiSecret)
                    .digest("hex");

                const formData = new FormData();
                formData.append("file", `data:${mimeType};base64,${args.imageBase64}`);
                formData.append("api_key", cloudinaryApiKey);
                formData.append("timestamp", timestampSec.toString());
                formData.append("signature", signature);
                formData.append("public_id", tempPublicId);

                if (isVideo) {
                    formData.append("eager", "e_loop,f_auto,q_auto");
                    formData.append("resource_type", "video");
                }

                log("SYSTEM", `Sending to Cloudinary API (${resourceType})...`);
                // Use correct endpoint based on resource type
                const endpoint = `https://api.cloudinary.com/v1_1/${cloudinaryCloud}/${resourceType}/upload`;

                const response = await fetch(endpoint, {
                    method: "POST",
                    body: formData
                });

                if (!response.ok) {
                    const errorText = await response.text();
                    log("SYSTEM", `✗ Cloudinary upload failed: ${response.status}`);
                    throw new Error(`Cloudinary upload failed (${response.status}): ${errorText}`);
                }

                const result = await response.json();
                log("SYSTEM", `✓ Cloudinary upload complete: ${result.public_id}`);
                return result;
            })();

            // Wait for both streams to settle
            log("SYSTEM", "Waiting for parallel streams to complete...");
            const [analysis, uploadResult] = await Promise.all([analysisPromise, uploadPromise]);
            log("SYSTEM", `✓ Vision analysis complete: ${analysis.agent} (${Math.round(analysis.confidence * 100)}%)`);

            // ═══════════════════════════════════════════════════════════════
            // RECONCILIATION: Map identity to the uploaded asset
            // ═══════════════════════════════════════════════════════════════

            const agent = args.overrideAgent || (analysis.agent !== "unknown" ? analysis.agent as "cassie" | "eleanor" | "julian" : "julian");
            const slot = args.overrideSlot || analysis.slot;

            // TASK 2: Force unique filenames to prevent Cloudinary conflicts
            // Append timestamp + random suffix to ensure uniqueness
            const uniqueSuffix = `${timestamp}_${Math.random().toString(36).substring(2, 6)}`;
            const baseName = analysis.suggestedName || `LD_BIBLE_${agent.toUpperCase()}_${String(slot).padStart(2, "0")}_${analysis.role}`;
            const finalPublicId = `${baseName}_${uniqueSuffix}`;
            const folder = `Luminous Deep/Visual_Bible/${agent}`;

            log(agent, `Identity confirmed (${Math.round(analysis.confidence * 100)}%). Mapping to Slot ${slot}.`);
            log(agent, `Finalizing archival storage...`);

            // Finalize Cloudinary Asset (Rename and Add Context/Tags)
            // Note: cloudinary already configured at function start

            // 1. Rename to final destination
            // Note: Rename endpoint also needs resource_type check if implicit
            // Cloudinary's rename method in SDK usually handles it, but default is image. 
            // We need to specify resource_type if it is video.
            const isVideo = (args.mimeType || "").startsWith("video/");
            const resourceType = isVideo ? "video" : "image";

            const renameFolder = isVideo && baseName.startsWith("LD_SCENE") ? "Luminous Deep/Scenes/Video" : folder;
            const fullPublicId = `${renameFolder}/${finalPublicId}`;

            const finalAsset = await cloudinary.uploader.rename(tempPublicId, fullPublicId, {
                overwrite: true,
                resource_type: resourceType
            });

            // 2. Update metadata (tags and context) separately
            await cloudinary.uploader.explicit(finalAsset.public_id, {
                type: "upload",
                resource_type: resourceType,
                context: `agent=${agent}|slot=${slot}|role=${analysis.role}|confidence=${analysis.confidence}`,
                tags: [agent, analysis.role, "ai-ingested", "fibre-optimized", ...analysis.tags.slice(0, 5)],
            });

            // Step D: Sync to Convex
            log("SYSTEM", "Syncing to Luminous Deep database...");

            await ctx.runMutation(internal.studio.mutations.upsertMediaRecord, {
                publicId: finalAsset.public_id,
                url: finalAsset.secure_url,
                resourceType: finalAsset.resource_type,
                folder: folder,
                format: finalAsset.format,
                bytes: finalAsset.bytes,
                width: finalAsset.width,
                height: finalAsset.height,
                isVisualBible: true,
                identityAgent: agent,
                identitySlot: slot,
                tags: analysis.tags,
            });

            log("SYSTEM", `✓ Ingest complete for ${agent.toUpperCase()}.`);

            return {
                success: true,
                publicId: finalAsset.public_id,
                url: finalAsset.secure_url,
                agent,
                slot,
                role: analysis.role,
                tags: analysis.tags,
                confidence: analysis.confidence,
                reasoning: analysis.reasoning,
                logs,
            };

        } catch (error: any) {
            // Enhanced error telemetry - capture everything
            const errorMessage = error?.message || error?.toString() || "Unknown error occurred";
            const errorStack = error?.stack || "";

            console.error("[SMART INGEST] Full error:", error);
            console.error("[SMART INGEST] Stack:", errorStack);

            log("SYSTEM", "═══════════════════════════════════════════════════");
            log("SYSTEM", `✗ INGEST FAILED: ${errorMessage}`);

            // Check for common configuration issues
            if (errorMessage.includes("config") || errorMessage.includes("credentials") || errorMessage.includes("API")) {
                log("SYSTEM", "✗ Configuration check failed. Verify Convex Environment Variables:");
                log("SYSTEM", "  Required: GOOGLE_API_KEY, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET");
            }

            if (errorMessage.includes("401") || errorMessage.includes("403") || errorMessage.includes("Unauthorized")) {
                log("SYSTEM", "✗ Authentication failed. API keys may be invalid or expired.");
            }

            // Check for Cloudinary-specific errors
            if (errorMessage.includes("Resource not found") || errorMessage.includes("rename")) {
                log("SYSTEM", "✗ Cloudinary rename operation failed. The temp file may not exist.");
            }

            log("SYSTEM", "═══════════════════════════════════════════════════");

            // Throw a detailed error that will be visible in the frontend
            throw new Error(`Ingest failed: ${errorMessage}`);
        }
    }
});
