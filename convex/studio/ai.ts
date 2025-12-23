import { action } from "../_generated/server";
import { v } from "convex/values";
import { requireStudioAccessAction } from "../auth/helpers";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { internal } from "../_generated/api";

export const generateContent = action({
    args: {
        prompt: v.string(),
        model: v.optional(v.string()),
        voice: v.optional(v.union(v.literal("cassie"), v.literal("eleanor"), v.literal("julian"))),
        phase: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await requireStudioAccessAction(ctx);

        // ═══════════════════════════════════════════════════════════════
        // TELEMETRY: Start Run
        // ═══════════════════════════════════════════════════════════════
        let runId: any = null;
        try {
            runId = await ctx.runMutation(internal.studio.runs.startRunInternal, {
                workflowName: "NARRATIVE_REFINEMENT",
                triggeredBy: "studio-user",
                initialMessage: `Magic Paste initiated for voice: ${args.voice || "neutral"}`,
            });
        } catch (e) {
            console.warn("Telemetry logging failed (non-critical):", e);
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            // Log error if we have a runId
            if (runId) {
                try {
                    await ctx.runMutation(internal.studio.runs.failRunInternal, {
                        runId,
                        errorMessage: "Missing GOOGLE_API_KEY environment variable",
                    });
                } catch (e) { /* ignore telemetry errors */ }
            }
            throw new Error("Missing GOOGLE_API_KEY");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        // Voice Persona Definitions with Visual Styles
        const personas = {
            cassie: `You are Cassie (The Workshop). 
            Tone: Energetic, messy, optimistic, hands-on. 
            Focus: "How it's made", raw materials, sparks, prototypes, "what if?", sketches.
            Style: Use short sentences. Ask questions. Sound like you're in the middle of a project.
            IMAGE STYLE: Macro photography, high contrast, workshop clutter, depth of field, sawdust particles, warm tungsten light.`,

            eleanor: `You are Eleanor (The Study). 
            Tone: Poetic, slow, observational, deep, nostalgic. 
            Focus: "How it felt", memories, light, dust, books, time preservation, shadows.
            Style: Lyrical, flowing sentences. Use sensory metaphors (smell, touch).
            IMAGE STYLE: Soft focus, film grain, vintage polaroid, warm golden light, dust motes, sepia undertones.`,

            julian: `You are Julian (The Boathouse). 
            Tone: Ultra-technical, dry, analytical, detached, precise. 
            Focus: Systems, physics, hydrodynamics, vectors, "the mechanism", cause and effect. 
            Style: Use scientific jargon properly. Avoid emotion. Describe things as if writing a lab report or engineering log.
            IMAGE STYLE: Technical diagram, blueprint style, cyanotype, sharp lines, nautical instruments, cool blue tones.`
        };

        const personaContext = args.voice ? personas[args.voice] : "You are a creative writer for Luminous Deep.";

        // Narrative Phase Context
        const phases: Record<string, string> = {
            "early_year": "Tone is Uncertain, Sparse, Cold.",
            "spring": "Tone is Energetic, Momentum-driven, Messy.",
            "summer": "Tone is Tense, Overreaching, Warning-heavy.",
            "autumn": "Tone is Clear, Heavy, Insightful.",
            "winter": "Tone is Resolved, Still, Confident."
        };
        const currentPhase = args.phase && phases[args.phase as string] ? phases[args.phase as string] : "Tone is Balanced.";
        const phaseDirective = `CHRONICLE OF BECOMING: This fragment must reflect the '${args.phase || "standard"}' phase. ${currentPhase}\n- Eleanor reflects on the meaning of the phase.\n- Julian documents the system constraints of that phase.\n- Cassie explains the prototypes of that phase.`;

        // Detect if input is likely JSON or Raw Text
        const isJson = args.prompt.trim().startsWith("{") || args.prompt.trim().startsWith("[");

        let systemInstruction;

        if (isJson) {
            systemInstruction = `
            INSTRUCTION: You must use a chain-of-thought reasoning process to analyze the character's voice and the narrative context before outputting the final JSON. Ensure the tone matches the owner (Cassie/Eleanor/Julian) perfectly.

            You are the Luminous Deep Narrative Engine powered by Gemini.
            Your primary goal is to refine raw story notes into a character's specific voice while maintaining strict JSON integrity.
            
            ${phaseDirective}

            VOICE GUIDES:
            - CASSIE: Energetic, process-oriented, focused on 'How it's made'.
            - ELEANOR: Poetic, observant, focused on 'How it feels'.
            - JULIAN: Technical, precise, dry humor, focused on 'How it works'.

            DIRECTIVES:
            1. Output ONLY valid JSON. 
            2. Do not include markdown formatting like \`\`\`json.
            3. Do not change keys. Only update values.
            4. Verify that the hotspot names and hint text are evocative and diegetic.
            5. CRITICAL: Never return "Enter Title" or "Untitled". You MUST generate a poetic, 2-4 word title based on the story fragment (e.g., "The Salt-Soaked Timber").
            6. CANONICAL SCENES: ONLY use these valid scene_slugs: 'home', 'workshop', 'study', 'boathouse', 'lounge', 'kitchen', 'luminous-deep'. Never use 'galley' (use 'kitchen') or 'hearth' (use 'lounge').
            `;
        } else {
            systemInstruction = `
            INSTRUCTION: You are a Story Ingest Engine. You are receiving raw notes or a story fragment. You must convert it into a valid Luminous Deep content pack JSON object.

            Identity Context:
            ${personaContext}
            
            ${phaseDirective}

            TARGET JSON SCHEMA:
            {
               "hotspot_id": "string (snake_case, derived from title)",
               "scene_slug": "string (infer from content, e.g. 'workshop', 'study', 'boathouse')",
               "title": "string (Creative, avoid 'Untitled')",
               "type": "text",
               "content": "string (formatted markdown, approximately 150 words)",
               "hint": "string (short diegetic hint, e.g. 'Inspect the...')",
               "tags": ["string"],
               "canon_refs": ["string"],
               "media_refs": "string (leave empty string if unknown)",
               "image_prompt": "string (OPTIONAL: A visual prompt for image generation in the character's IMAGE STYLE. Describe a scene, object, or moment that could illustrate this story. Keep under 100 words.)",
               "version": 1
            }

            LOCALISATION PROTOCOL: en-GB (BRITISH)
            1. ORTHOGRAPHY: Use British spelling (-OUR, -RE, -ISE).
            2. VOCABULARY: Use British terms (Pavement, Bin, Flat, Lift, Boot, Torch).
            3. AESTHETIC: Reference British details (Transport typography, BS 1363 sockets).
            4. TONE: Avoid US buzzwords. Use 'Duty', 'Responsibility', 'Reflective'.

            DIRECTIVES:
            1. Output ONLY valid JSON.
            2. Create the JSON based on the raw text provided.
            3. Infer the best fitting character voice and scene if not obvious.
            4. CRITICAL: Generate a unique, evocative title (e.g., 'The Rustling Panes', 'Whispers in the Glass').
            5. CANONICAL SCENES: ONLY use these valid scene_slugs: 'home', 'workshop', 'study', 'boathouse', 'lounge', 'kitchen', 'luminous-deep'. Never use 'galley' (use 'kitchen') or 'hearth' (use 'lounge').
            `;
        }

        const fullPrompt = `${systemInstruction}
        
        Task: ${isJson ? "Refresh the 'content' of the provided JSON content object." : "Convert this text into a JSON content pack."}
        Input: ${args.prompt}`;

        try {
            // ═══════════════════════════════════════════════════════════════
            // TELEMETRY: Log "Thinking" Step
            // ═══════════════════════════════════════════════════════════════
            if (runId) {
                try {
                    const voiceLabel = args.voice?.toUpperCase() || "NEUTRAL";
                    await ctx.runMutation(internal.studio.runs.logToRunInternal, {
                        runId,
                        message: `${voiceLabel} (${args.phase || "NO PHASE"}): Analyzing narrative context...`,
                        level: "info",
                    });
                } catch (e) { /* ignore telemetry errors */ }
            }

            const result = await model.generateContent(fullPrompt);
            const response = await result.response;
            let text = response.text();

            // ═══════════════════════════════════════════════════════════════
            // TELEMETRY: Log AI "Chain of Thought" 
            // ═══════════════════════════════════════════════════════════════
            if (runId) {
                try {
                    const voiceLabel = args.voice?.toUpperCase() || "NEUTRAL";

                    // Extract any "thinking" text before the JSON (if present)
                    const thinkingMatch = text.match(/^([\s\S]*?)(\{[\s\S]*\})/);
                    if (thinkingMatch && thinkingMatch[1].trim()) {
                        const thinking = thinkingMatch[1].trim().substring(0, 200);
                        await ctx.runMutation(internal.studio.runs.logToRunInternal, {
                            runId,
                            message: `${voiceLabel}: ${thinking}`,
                            level: "debug",
                        });
                    }

                    // Log processing step
                    await ctx.runMutation(internal.studio.runs.logToRunInternal, {
                        runId,
                        message: `${voiceLabel}: Refining voice patterns... adjusting for en-GB protocol.`,
                        level: "info",
                    });
                } catch (e) { /* ignore telemetry errors */ }
            }

            // Aggressive "Fuzzy" JSON Cleaner
            const match = text.match(/\{[\s\S]*\}/);

            if (match) {
                text = match[0];
            } else {
                text = text.replace(/```json/g, "").replace(/```/g, "").trim();
            }

            // ═══════════════════════════════════════════════════════════════
            // TELEMETRY: Complete Run
            // ═══════════════════════════════════════════════════════════════
            if (runId) {
                try {
                    await ctx.runMutation(internal.studio.runs.completeRunInternal, {
                        runId,
                        message: `Narrative successfully refined for voice: ${args.voice || "neutral"}`,
                    });
                } catch (e) { /* ignore telemetry errors */ }
            }

            return text;
        } catch (error: any) {
            // ═══════════════════════════════════════════════════════════════
            // TELEMETRY: Fail Run
            // ═══════════════════════════════════════════════════════════════
            console.error(`AI Generation Error: Status=${error?.status} Message=${error?.message}`, error);

            const errorMessage = error?.message || "Unknown AI generation error";
            const errorDetails = error?.response?.text?.() || error?.stack || "";

            if (runId) {
                try {
                    await ctx.runMutation(internal.studio.runs.failRunInternal, {
                        runId,
                        errorMessage: errorMessage,
                    });
                } catch (e) { /* ignore telemetry errors */ }
            }

            // Provide a more helpful error message
            if (errorMessage.includes("API_KEY")) {
                throw new Error("Google API Key is invalid or missing. Please check your GOOGLE_API_KEY environment variable in Convex.");
            }
            if (errorMessage.includes("404") || errorMessage.includes("not found")) {
                throw new Error("The AI model was not found. This may be a temporary Gemini API issue. Please try again.");
            }
            if (errorMessage.includes("quota") || errorMessage.includes("rate")) {
                throw new Error("API quota exceeded. Please wait a moment and try again.");
            }

            throw new Error(`AI Generation Failed: ${errorMessage}`);
        }
    },
});

// ═══════════════════════════════════════════════════════════════
// SOCIAL COMMAND CENTRE: Multi-Platform Post Generator
// ═══════════════════════════════════════════════════════════════

export const generateSocialPost = action({
    args: {
        platform: v.union(
            v.literal("X"),
            v.literal("Instagram"),
            v.literal("Facebook"),
            v.literal("LinkedIn")
        ),
        agentId: v.string(),
        topic: v.string(),
        charLimit: v.number(),
    },
    handler: async (ctx, args) => {
        await requireStudioAccessAction(ctx);

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            throw new Error("Missing GOOGLE_API_KEY");
        }

        // Voice mapping from agentId (passed as voice string from frontend for simplicity)
        const agentVoice = args.agentId as "cassie" | "eleanor" | "julian";
        const agentName = agentVoice.charAt(0).toUpperCase() + agentVoice.slice(1);

        // ═══════════════════════════════════════════════════════════════
        // TASK 1: DNA-INJECTED RENDER - Fetch Visual Bible Anchors
        // Query the media table for identity anchors for this agent
        // ═══════════════════════════════════════════════════════════════

        let identityAnchors: { slot: number | undefined; url: string; publicId?: string }[] = [];
        try {
            identityAnchors = await ctx.runQuery(internal.studio.mediaQueries.getIdentityAnchorsInternal, {
                agent: agentVoice,
            });
            console.log(`[SOCIAL POST] DNA Lock: ${identityAnchors.length} anchors for ${agentName}`);
        } catch (e) {
            console.warn("[SOCIAL POST] Could not fetch identity anchors:", e);
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({
            model: "gemini-3-flash-preview",
            generationConfig: { responseMimeType: "application/json" }
        });

        // Platform-specific formatting rules
        const platformRules: Record<string, string> = {
            X: `Twitter/X Format:
- Maximum ${args.charLimit} characters
- Use punchy, conversational tone
- Include 1-2 relevant emojis sparingly
- End with a question or call-to-action when appropriate
- NO hashtags unless absolutely essential`,

            Instagram: `Instagram Format:
- Visual-first storytelling caption
- Use line breaks for readability
- Include 2-3 emojis naturally in the text
- Add a clear call-to-action
- End with 3-5 relevant hashtags on a new line`,

            Facebook: `Facebook Format:
- Longer narrative format allowed
- Use conversational, community-focused tone
- Include a hook in the first line
- Ask questions to encourage engagement
- Keep paragraphs short for mobile readability`,

            LinkedIn: `LinkedIn Format:
- Professional thought leadership tone
- Start with a hook/insight
- Use line breaks between paragraphs
- Include industry-relevant insights
- End with a professional call-to-action
- NO emojis unless very subtle`,
        };

        const voicePersonas: Record<string, string> = {
            cassie: "Cassie: Energetic workshop leader, hands-on, process-focused, 'let me show you how this works' energy.",
            eleanor: "Eleanor: Thoughtful curator, poetic observations, 'here's what I noticed' wisdom.",
            julian: "Julian: Technical expert, precise language, data-driven insights, dry wit.",
            neutral: "Professional brand voice: Confident, clear, inspiring."
        };

        // DNA-INJECTED PROMPT: Character consistency notice
        const dnaLockNotice = identityAnchors.length > 0
            ? `
        CHARACTER LOCK ACTIVE: ${identityAnchors.length}/14 DNA Anchors loaded for ${agentName}.
        You are generating content for a character with strict visual and personality consistency.
        The character ${agentName} has defined reference images across ${identityAnchors.length} identity slots.
        Ensure all descriptions maintain absolute consistency with:
        - Julian: Charcoal wool Gansey sweater, silver-framed glasses, salt-and-pepper beard
        - Eleanor: Soft linen clothing, warm golden tones, literary aesthetic
        - Cassie: Workshop attire, tools, energetic poses, tungsten light
        `
            : "";

        const systemInstruction = `
═══════════════════════════════════════════════════════════════
ROLE: You are the SOCIAL AMBASSADOR for Luminous Deep.
MODE: ✅ WRITE-ENABLED (Creative Generation Active)
═══════════════════════════════════════════════════════════════

Your goal IS to write creative, engaging content for ${args.platform}.
You have FULL CREATIVE AUTHORITY to generate compelling social media posts.

${dnaLockNotice}

VOICE CONTEXT:
${voicePersonas[agentVoice] || voicePersonas.neutral}
Writing as: ${agentName}

PLATFORM REQUIREMENTS:
${platformRules[args.platform]}

CHARACTER LIMIT: ${args.charLimit} characters (STRICT - never exceed)

LOCALISATION PROTOCOL: en-GB (BRITISH)
1. ORTHOGRAPHY: Use British spelling (colour, centre, optimise, programme).
2. VOCABULARY: Use British terms (Pavement, Bin, Flat, Jumper, Trousers).
3. TONE: Professional British brand voice. Avoid American slang.
4. CULTURAL: Reference British contexts where appropriate (BS 1363 sockets, the National Trust, coastal weather).

OUTPUT FORMAT:
Return a JSON object with the following keys:
{
    "copy": "Your generated post text here...",
    "dnaAnchorsUsed": ${identityAnchors.length}
}
        `;

        const prompt = `${systemInstruction}

TOPIC/BRIEF: ${args.topic}

Generate a compelling ${args.platform} post about this topic in the voice of ${agentName}. Be creative, engaging, and on-brand.`;

        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();

            // Parse JSON response
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                return {
                    copy: parsed.copy || "",
                    dnaAnchorsUsed: identityAnchors.length
                };
            }

            // Fallback: treat entire response as copy
            return { copy: text.trim(), dnaAnchorsUsed: identityAnchors.length };
        } catch (error: any) {
            console.error(`Social Post Generation Error:`, error);
            throw new Error(`Failed to generate social post: ${error.message}`);
        }
    },
});

