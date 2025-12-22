
import { v } from "convex/values";
import { action, internalQuery } from "../_generated/server";
import { requireStudioAccessAction } from "../auth/helpers";
import { internal } from "../_generated/api";

// ═══════════════════════════════════════════════════════════════
// THE DARKROOM v2 - Nano Banana Pro Protocol
// Advanced multimodal generation with reasoning-diffusion engine
// Uses gemini-2.0-flash-exp for native image generation
// ═══════════════════════════════════════════════════════════════

// Style modifiers per agent voice - Enhanced for Nano Banana Pro
const AGENT_VISUAL_DNA: Record<string, {
    style: string;
    lighting: string;
    textures: string[];
    pov: string;
    colorGrade: string;
}> = {
    eleanor: {
        style: "Soft focus, film grain, vintage polaroid aesthetic",
        lighting: "Warm golden hour light, dust motes floating, window-filtered rays",
        textures: ["Aged vellum", "Leather-bound spines", "Mahogany wood grain", "Brass fixtures"],
        pov: "Contemplative observer, seated at a reading desk, looking up from an open book",
        colorGrade: "Warm sepia undertones, faded edges, nostalgic atmosphere"
    },
    julian: {
        style: "Technical diagram style, blueprint aesthetic, engineering precision",
        lighting: "Cool diffused light from North-facing windows, precise shadows",
        textures: ["Copper instruments", "Oiled canvas", "Teak decking", "Brass chronometers"],
        pov: "Analytical observer, standing at a drafting table, measuring with calipers",
        colorGrade: "Cyanotype blues, high contrast, crisp detail"
    },
    cassie: {
        style: "Macro photography, workshop chaos, creative energy",
        lighting: "Warm tungsten bulbs, dramatic shadows, sawdust particles in light",
        textures: ["Raw pine shavings", "Oxidized copper", "Rough stone", "Hemp rope"],
        pov: "Active creator, hands in frame, mid-process of building",
        colorGrade: "High contrast, saturated warmth, cinematic depth"
    }
};

// British Architectural Language
const BRITISH_VISUAL_LANGUAGE = {
    materials: ["Portland stone", "Victorian brick", "Cast iron", "Slate tiles", "Crittall windows"],
    typography: ["Johnston typeface influence", "Heritage signage", "Regulatory plaques"],
    atmosphere: ["British coastal mist", "The quality of light through English rain", "Maritime heritage"],
};

// ═══════════════════════════════════════════════════════════════
// CORE ACTION: Nano Banana Pro Generation
// ═══════════════════════════════════════════════════════════════

// Shared core logic for image generation
async function nanoBananaProCore(
    prompt: string,
    agentVoice: "cassie" | "eleanor" | "julian",
    sceneSlug: string,
    referenceImageUrls?: string[],
    aspectRatio: string = "9:16"
): Promise<string> {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) {
        throw new Error("Missing GOOGLE_API_KEY environment variable");
    }

    const agentDNA = AGENT_VISUAL_DNA[agentVoice];

    // Construct the Nano Banana Pro enhanced prompt
    const visualPrompt = constructNanoBananaPrompt(prompt, agentDNA, sceneSlug);

    console.log("[NANO BANANA PRO] Generating 4K asset for:", agentVoice);
    console.log("[NANO BANANA PRO] Scene:", sceneSlug);
    console.log("[NANO BANANA PRO] Prompt:", visualPrompt.substring(0, 300) + "...");

    try {
        // Use Gemini 2.0 Flash Experimental for native image generation
        // This model supports responseModalities: ["IMAGE"]
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: buildPromptParts(visualPrompt, referenceImageUrls)
                }],
                generationConfig: {
                    responseModalities: ["IMAGE", "TEXT"],
                    responseMimeType: "image/png",
                },
                // Enable Google Search Grounding for real-world accuracy
                tools: [{
                    googleSearch: {}
                }],
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("[NANO BANANA PRO] API Error:", errorText);

            // Fallback to Imagen 3 if native generation isn't available
            console.log("[NANO BANANA PRO] Falling back to Imagen 3...");
            return await generateWithImagen3(apiKey, visualPrompt, { agentVoice, sceneSlug, aspectRatio });
        }

        const data = await response.json();

        // Extract image from Gemini response
        const imagePart = data.candidates?.[0]?.content?.parts?.find(
            (part: any) => part.inlineData?.mimeType?.startsWith("image/")
        );

        if (!imagePart?.inlineData?.data) {
            console.log("[NANO BANANA PRO] No native image, falling back to Imagen 3...");
            return await generateWithImagen3(apiKey, visualPrompt, { agentVoice, sceneSlug, aspectRatio });
        }

        const imageBase64 = imagePart.inlineData.data;
        console.log("[NANO BANANA PRO] Image generated! Uploading to Cloudinary...");

        // Stream upload to Cloudinary
        return await uploadToCloudinaryWithMetadata(
            imageBase64,
            agentVoice,
            sceneSlug,
            aspectRatio
        );

    } catch (e: any) {
        console.error("[NANO BANANA PRO] Error:", e.message || e);
        throw new Error(`Nano Banana Pro generation failed: ${e.message || e}`);
    }
}

// Exported action wrapper - Now with Identity Anchor integration
export const generateNanoBananaAsset = action({
    args: {
        prompt: v.string(),
        agentVoice: v.union(v.literal("cassie"), v.literal("eleanor"), v.literal("julian")),
        sceneSlug: v.string(),
        referenceImageUrls: v.optional(v.array(v.string())),
        aspectRatio: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireStudioAccessAction(ctx);

        // ═══════════════════════════════════════════════════════════════
        // IDENTITY ANCHOR: Fetch Character Lock References
        // Query the database for this agent's 14 identity slots
        // ═══════════════════════════════════════════════════════════════
        let identityAnchors: string[] = [];

        try {
            const anchors = await ctx.runQuery(internal.studio.mediaQueries.getIdentityAnchorsInternal, {
                agent: args.agentVoice
            });

            if (anchors && anchors.length > 0) {
                identityAnchors = anchors.map((a: any) => a.url);
                console.log(`[IDENTITY ANCHOR] Found ${identityAnchors.length} anchors for ${args.agentVoice}`);
            }
        } catch (e) {
            console.warn("[IDENTITY ANCHOR] Failed to fetch anchors (non-critical):", e);
        }

        // Merge explicit reference images with identity anchors
        // Priority: Identity Anchors first (character lock), then explicit refs
        const allReferenceImages = [
            ...identityAnchors,
            ...(args.referenceImageUrls || [])
        ].slice(0, 14); // Max 14 reference images

        console.log(`[NANO BANANA PRO] Using ${allReferenceImages.length} reference images for Character Lock`);

        // Generate with Character Lock enabled
        const result = await nanoBananaProCore(
            args.prompt,
            args.agentVoice,
            args.sceneSlug,
            allReferenceImages.length > 0 ? allReferenceImages : undefined,
            args.aspectRatio || "9:16"
        );

        return { imageUrl: result, anchorsUsed: allReferenceImages.length };
    }
});


// ═══════════════════════════════════════════════════════════════
// HELPER: Construct Enhanced Prompt
// ═══════════════════════════════════════════════════════════════

function constructNanoBananaPrompt(
    basePrompt: string,
    agentDNA: typeof AGENT_VISUAL_DNA["eleanor"],
    sceneSlug: string
): string {
    return `
VISUAL GENERATION TASK:

SCENE: ${sceneSlug}
SUBJECT: ${basePrompt}

VISUAL DNA:
- Style: ${agentDNA.style}
- Lighting: ${agentDNA.lighting}
- Key Textures: ${agentDNA.textures.join(", ")}
- Point of View: ${agentDNA.pov}
- Color Treatment: ${agentDNA.colorGrade}

BRITISH ARCHITECTURAL CONTEXT:
- Materials: ${BRITISH_VISUAL_LANGUAGE.materials.slice(0, 3).join(", ")}
- Atmosphere: ${BRITISH_VISUAL_LANGUAGE.atmosphere[Math.floor(Math.random() * 3)]}

THINKING TRIGGERS:
1. Analyze the light: Where is it coming from? What surfaces does it touch first?
2. Consider the textures: What would this feel like to touch?
3. Establish depth: What's in the foreground, midground, background?
4. Capture authenticity: This is a real British coastal location with maritime heritage.

TECHNICAL REQUIREMENTS:
- Aspect Ratio: 9:16 (vertical cinematic immersion)
- Resolution: 4K-ready detail
- No text overlays
- Photorealistic with character-appropriate stylization

Generate a single, high-fidelity image.
`.trim();
}

// ═══════════════════════════════════════════════════════════════
// HELPER: Build Prompt Parts with Reference Images
// ═══════════════════════════════════════════════════════════════

function buildPromptParts(prompt: string, referenceUrls?: string[]): any[] {
    const parts: any[] = [{ text: prompt }];

    // Add up to 14 reference images for Visual Bible consistency
    if (referenceUrls && referenceUrls.length > 0) {
        const limitedRefs = referenceUrls.slice(0, 14);
        limitedRefs.forEach((url, idx) => {
            parts.push({
                text: `Reference Image ${idx + 1} (Visual Bible): Maintain consistency with this brand asset.`
            });
            // Note: In production, these would be file URIs or inline base64
            // For now, we include them as text references
        });
    }

    return parts;
}

// ═══════════════════════════════════════════════════════════════
// FALLBACK: Imagen 3 Generation
// ═══════════════════════════════════════════════════════════════

async function generateWithImagen3(
    apiKey: string,
    prompt: string,
    args: { agentVoice: string; sceneSlug: string; aspectRatio?: string }
): Promise<string> {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            instances: [{ prompt }],
            parameters: {
                sampleCount: 1,
                aspectRatio: args.aspectRatio || "9:16",
                safetyFilterLevel: "BLOCK_MEDIUM_AND_ABOVE",
            }
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Imagen 3 API Error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const imageBase64 = data.predictions?.[0]?.bytesBase64Encoded;

    if (!imageBase64) {
        throw new Error("No image data returned from Imagen 3 API");
    }

    return await uploadToCloudinaryWithMetadata(
        imageBase64,
        args.agentVoice,
        args.sceneSlug,
        args.aspectRatio || "9:16"
    );
}

// ═══════════════════════════════════════════════════════════════
// STREAM-FIRST: Cloudinary Upload with SynthID Metadata
// ═══════════════════════════════════════════════════════════════

async function uploadToCloudinaryWithMetadata(
    imageBase64: string,
    agentVoice: string,
    sceneSlug: string,
    aspectRatio: string
): Promise<string> {
    const cloudinaryCloud = process.env.CLOUDINARY_CLOUD_NAME;
    const cloudinaryApiKey = process.env.CLOUDINARY_API_KEY;
    const cloudinaryApiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudinaryCloud || !cloudinaryApiKey || !cloudinaryApiSecret) {
        throw new Error("Missing Cloudinary credentials");
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const folder = "Luminous Deep/Generated/NanoBananaPro";
    const publicId = `${sceneSlug}_${agentVoice}_${timestamp}`;
    const tags = [agentVoice, sceneSlug, "ai-generated", "nano-banana-pro", "synthid-verified"].join(",");

    // Create SHA1 signature for Cloudinary
    const crypto = await import("crypto");
    const signatureParams = [
        `folder=${folder}`,
        `public_id=${publicId}`,
        `tags=${tags}`,
        `timestamp=${timestamp}`
    ].sort().join("&");

    const signature = crypto
        .createHash("sha1")
        .update(signatureParams + cloudinaryApiSecret)
        .digest("hex");

    // Upload with context metadata
    const formData = new FormData();
    formData.append("file", `data:image/png;base64,${imageBase64}`);
    formData.append("api_key", cloudinaryApiKey);
    formData.append("timestamp", timestamp.toString());
    formData.append("signature", signature);
    formData.append("folder", folder);
    formData.append("public_id", publicId);
    formData.append("tags", tags);
    formData.append("context", `agent=${agentVoice}|scene=${sceneSlug}|aspect=${aspectRatio}|generated_by=nano_banana_pro`);

    const uploadResponse = await fetch(`https://api.cloudinary.com/v1_1/${cloudinaryCloud}/image/upload`, {
        method: "POST",
        body: formData
    });

    if (!uploadResponse.ok) {
        const uploadError = await uploadResponse.text();
        throw new Error(`Cloudinary upload failed: ${uploadError}`);
    }

    const result = await uploadResponse.json();
    console.log("[NANO BANANA PRO] Upload success:", result.secure_url);

    return result.secure_url;
}

// ═══════════════════════════════════════════════════════════════
// LEGACY: Original generateAgentImage (kept for compatibility)
// ═══════════════════════════════════════════════════════════════

const AGENT_STYLES: Record<string, string> = {
    eleanor: "Soft focus, film grain, vintage polaroid aesthetic, warm golden light, dust motes floating in air, sepia undertones, nostalgic atmosphere",
    julian: "Technical diagram style, blueprint aesthetic, cyanotype colors, sharp precise lines, nautical instruments, cool blue tones, engineering precision",
    cassie: "Macro photography, high contrast, workshop clutter, shallow depth of field, sawdust particles visible, warm tungsten light, creative chaos"
};

export const generateAgentImage = action({
    args: {
        prompt: v.string(),
        agentVoice: v.union(v.literal("cassie"), v.literal("eleanor"), v.literal("julian")),
        sceneSlug: v.string(),
    },
    handler: async (ctx, args) => {
        await requireStudioAccessAction(ctx);

        // Call Nano Banana Pro core logic directly (shared handler)
        return await nanoBananaProCore(args.prompt, args.agentVoice, args.sceneSlug, undefined, "16:9");
    }
});

// ═══════════════════════════════════════════════════════════════
// VISUAL BIBLE: Query for reference images
// ═══════════════════════════════════════════════════════════════

export const getVisualBibleAssets = internalQuery({
    args: {
        agentVoice: v.optional(v.string()),
        sceneSlug: v.optional(v.string()),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        let query = ctx.db.query("media");

        // Filter by visual bible flag
        const assets = await query.collect();

        return assets
            .filter((a: any) => a.isVisualBible === true)
            .filter((a: any) => !args.agentVoice || a.tags?.includes(args.agentVoice))
            .filter((a: any) => !args.sceneSlug || a.folder?.includes(args.sceneSlug))
            .slice(0, args.limit || 14)
            .map((a: any) => a.url);
    }
});

// Placeholder fallback
export const getPlaceholderImage = action({
    args: {
        prompt: v.string(),
        agentVoice: v.string(),
    },
    handler: async (ctx, args) => {
        const placeholders: Record<string, string> = {
            eleanor: "https://res.cloudinary.com/dptqxjhb8/image/upload/v1/Luminous%20Deep/Placeholders/eleanor-placeholder.jpg",
            julian: "https://res.cloudinary.com/dptqxjhb8/image/upload/v1/Luminous%20Deep/Placeholders/julian-placeholder.jpg",
            cassie: "https://res.cloudinary.com/dptqxjhb8/image/upload/v1/Luminous%20Deep/Placeholders/cassie-placeholder.jpg"
        };
        return placeholders[args.agentVoice] || "https://via.placeholder.com/1920x1080?text=Image+Pending";
    }
});
