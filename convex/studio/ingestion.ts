"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { requireStudioAccessAction } from "../auth/helpers";
import { internal } from "../_generated/api";

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
You are the "Luminous Deep Digital Registrar." Your task is to analyze incoming visual assets for character archival.

CHARACTERS IN THE LUMINOUS DEEP UNIVERSE:
- JULIAN: A maritime engineer. Associated with analytical precision, brass, cyanotype, boathouse.
- ELEANOR: A literary curator. Associated with nostalgia, books, warm focus, studies.
- CASSIE: A maker. Associated with workshop chaos, tools, sawdust, tungsten light.

YOUR TASK:
Analyze this image and provide:
1. AGENT: julian | eleanor | cassie.
2. ROLE: (e.g., Portrait, EXPRESSION, HANDS, TOOLS, ENVIRONMENT).
3. SLOT: Suggest 1-14 based on the role (1=Primary Face, 2=Side Profile, 3=Contextual, 7=Hands, 8-9=Wardrobe, 10-11=Environment, 12=Props, 14=Style).
4. SUGGESTED_NAME: A canonical name like LD_BIBLE_[AGENT]_[SLOT]_[ROLE].
5. TAGS: 5-10 descriptive technical tags.

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
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
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
        imageBase64: v.string(),
        mimeType: v.optional(v.string()),
        overrideAgent: v.optional(v.union(v.literal("cassie"), v.literal("eleanor"), v.literal("julian"))),
        overrideSlot: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await requireStudioAccessAction(ctx);

        const logs: string[] = [];
        const log = (agent: string, message: string) => {
            const entry = `> ${agent.toUpperCase()}: ${message}`;
            logs.push(entry);
            console.log(entry);
        };

        // ═══════════════════════════════════════════════════════════════
        // TASK 1: HARDENED CONFIGURATION VALIDATION
        // Verify all required environment variables before any operations
        // ═══════════════════════════════════════════════════════════════

        log("SYSTEM", "Initializing Smart Ingest pipeline...");

        // 1. Validate Google API Key for Gemini Vision
        const googleApiKey = process.env.GOOGLE_API_KEY;
        if (!googleApiKey) {
            log("SYSTEM", "✗ Configuration check failed: GOOGLE_API_KEY missing");
            throw new Error("GOOGLE_API_KEY is required for Vision analysis. Verify Convex Environment Variables.");
        }

        // 2. Validate Cloudinary credentials
        const cloudinaryCloud = process.env.CLOUDINARY_CLOUD_NAME;
        const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY;
        const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;

        if (!cloudinaryCloud || !cloudinaryApiKey || !cloudinaryApiSecret) {
            log("SYSTEM", "✗ Configuration check failed: Cloudinary credentials incomplete");
            log("SYSTEM", `  CLOUD_NAME: ${cloudinaryCloud ? "✓" : "✗"}`);
            log("SYSTEM", `  API_KEY: ${cloudinaryApiKey ? "✓" : "✗"}`);
            log("SYSTEM", `  API_SECRET: ${cloudinaryApiSecret ? "✓" : "✗"}`);
            throw new Error("Cloudinary configuration missing. Verify Convex Environment Variables.");
        }

        // 3. Pre-initialize Cloudinary SDK configuration
        const { v2: cloudinarySDK } = await import("cloudinary");
        cloudinarySDK.config({
            cloud_name: cloudinaryCloud,
            api_key: cloudinaryApiKey,
            api_secret: cloudinaryApiSecret,
            secure: true,
        });

        log("SYSTEM", "✓ Configuration validated. All credentials present.");

        const timestamp = Date.now();

        try {
            log("SYSTEM", "Initiating parallel Vision-to-Cloud streams...");

            // ═══════════════════════════════════════════════════════════════
            // PARALLEL EXECUTION: Fibre Optimization
            // Start Gemini Analysis and Cloudinary Upload simultaneously
            // ═══════════════════════════════════════════════════════════════

            const analysisPromise = analyzeIngestIntentCore(args.imageBase64, args.mimeType);

            // For the initial upload, we use a temp name and move it later
            const tempPublicId = `LD_INGEST_TEMP_${timestamp}_${Math.random().toString(36).substring(7)}`;

            const uploadPromise = (async () => {
                const mimeType = args.mimeType || "image/jpeg";
                const crypto = await import("crypto");
                const timestampSec = Math.floor(timestamp / 1000);

                const signatureParams = [
                    `public_id=${tempPublicId}`,
                    `timestamp=${timestampSec}`
                ].sort().join("&");

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

                const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloud}/image/upload`, {
                    method: "POST",
                    body: formData
                });

                if (!response.ok) {
                    const error = await response.text();
                    throw new Error(`Initial upload failed: ${error}`);
                }

                return await response.json();
            })();

            // Wait for both streams to settle
            const [analysis, uploadResult] = await Promise.all([analysisPromise, uploadPromise]);

            // ═══════════════════════════════════════════════════════════════
            // RECONCILIATION: Map identity to the uploaded asset
            // ═══════════════════════════════════════════════════════════════

            const agent = args.overrideAgent || (analysis.agent !== "unknown" ? analysis.agent as "cassie" | "eleanor" | "julian" : "julian");
            const slot = args.overrideSlot || analysis.slot;

            // Precise naming from Digital Registrar
            const finalPublicId = analysis.suggestedName || `LD_BIBLE_${agent.toUpperCase()}_${String(slot).padStart(2, "0")}_${analysis.role}_${timestamp}`;
            const folder = `Luminous Deep/Visual_Bible/${agent}`;

            log(agent, `Identity confirmed (${Math.round(analysis.confidence * 100)}%). Mapping to Slot ${slot}.`);
            log(agent, `Finalizing archival storage...`);

            // Finalize Cloudinary Asset (Rename and Add Context/Tags)
            // Note: cloudinarySDK already configured at function start

            // 1. Rename to final destination
            const finalAsset = await cloudinarySDK.uploader.rename(tempPublicId, `${folder}/${finalPublicId}`, {
                overwrite: true,
            });

            // 2. Update metadata (tags and context) separately
            await cloudinarySDK.uploader.explicit(finalAsset.public_id, {
                type: "upload",
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
            // Enhanced error telemetry
            log("SYSTEM", "═══════════════════════════════════════════════════");
            log("SYSTEM", `✗ INGEST FAILED: ${error.message}`);

            // Check for common configuration issues
            if (error.message?.includes("config") || error.message?.includes("credentials") || error.message?.includes("API")) {
                log("SYSTEM", "✗ Configuration check failed. Verify Convex Environment Variables:");
                log("SYSTEM", "  Required: GOOGLE_API_KEY, CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET");
            }

            if (error.message?.includes("401") || error.message?.includes("403") || error.message?.includes("Unauthorized")) {
                log("SYSTEM", "✗ Authentication failed. API keys may be invalid or expired.");
            }

            log("SYSTEM", "═══════════════════════════════════════════════════");
            throw new Error(`Smart upload failed: ${error.message}`);
        }
    }
});
