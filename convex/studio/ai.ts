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
            model: "gemini-1.5-flash-latest",
            generationConfig: { responseMimeType: "application/json" }
        });

        // Voice Persona Definitions
        const personas = {
            cassie: `You are Cassie (The Workshop). 
            Tone: Energetic, messy, optimistic, hands-on. 
            Focus: "How it's made", raw materials, sparks, prototypes, "what if?", sketches.
            Style: Use short sentences. Ask questions. Sound like you're in the middle of a project.`,

            eleanor: `You are Eleanor (The Study). 
            Tone: Poetic, slow, observational, deep, nostalgic. 
            Focus: "How it felt", memories, light, dust, books, time preservation, shadows.
            Style: Lyrical, flowing sentences. Use sensory metaphors (smell, touch).`,

            julian: `You are Julian (The Boathouse). 
            Tone: Ultra-technical, dry, analytical, detached, precise. 
            Focus: Systems, physics, hydrodynamics, vectors, "the mechanism", cause and effect. 
            Style: Use scientific jargon properly. Avoid emotion. Describe things as if writing a lab report or engineering log.`
        };

        const personaContext = args.voice ? personas[args.voice] : "You are a creative writer for Luminous Deep.";

        // Detect if input is likely JSON or Raw Text
        const isJson = args.prompt.trim().startsWith("{") || args.prompt.trim().startsWith("[");

        let systemInstruction;

        if (isJson) {
            systemInstruction = `
            INSTRUCTION: You must use a chain-of-thought reasoning process to analyze the character's voice and the narrative context before outputting the final JSON. Ensure the tone matches the owner (Cassie/Eleanor/Julian) perfectly.

            You are the Luminous Deep Narrative Engine powered by Gemini.
            Your primary goal is to refine raw story notes into a character's specific voice while maintaining strict JSON integrity.

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
            `;
        } else {
            systemInstruction = `
            INSTRUCTION: You are a Story Ingest Engine. You are receiving raw notes or a story fragment. You must convert it into a valid Luminous Deep content pack JSON object.

            Identity Context:
            ${personaContext}

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
                        message: `${voiceLabel}: Analyzing narrative context...`,
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
            if (runId) {
                try {
                    await ctx.runMutation(internal.studio.runs.failRunInternal, {
                        runId,
                        errorMessage: error.message || "AI generation failed",
                    });
                } catch (e) { /* ignore telemetry errors */ }
            }
            throw error;
        }
    },
});

