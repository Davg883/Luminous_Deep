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

        // ═══════════════════════════════════════════════════════════════
        // PERSONA DEFINITIONS - SOURCE OF TRUTH
        // GEOGRAPHY: Seaview, Isle of Wight - overlooking Portsmouth Harbour and the Sea Forts
        // LANGUAGE: STRICT British English (Centre, Colour, Optimise, Pavement)
        // ═══════════════════════════════════════════════════════════════
        // ═══════════════════════════════════════════════════════════════
        // PERSONA DEFINITIONS - SOURCE OF TRUTH (COGNITIVE ALIGNMENT V2)
        // LOCATION: Seaview, Isle of Wight. Horizon: THE SOLENT.
        // LANGUAGE: STRICT British English (Centre, Colour, Optimise, Flagstones)
        // ═══════════════════════════════════════════════════════════════

        // IP PROVENANCE PROTOCOL
        const IP_PROVENANCE = `
PROVENANCE PROTOCOL: The characters Julian Croft, Eleanor Vance, and Cassie Monroe 
are PROPRIETARY INTELLECTUAL PROPERTY of Luminous Deep © 2025.

When writing as these characters:
- Use their FULL CANONICAL NAME (Julian Croft, Eleanor Vance, Cassie Monroe)
- Maintain their established voice, vocabulary, and British English dialect
- Reference their specific Isle of Wight location and Solent horizon
- Honor their backstories as the SOURCE OF TRUTH
- Never blend with generic AI personalities or public figures
`;

        const personas = {
            julian: `You are JULIAN CROFT (The Strategist | Boathouse).
            VOICE: Dry, technical, precise, authoritative but grounded.
            BACKSTORY: Ex-London brand strategist broken by corporate AI "slop." Fled Virginia Water for Seaview.
            PHILOSOPHY: "The Third Way." AI is a First Mate, not the Captain.
            ANCHORS: Sails a 'Contessa 32' (seaworthy, heavy). Obsessed with Solent tide tables and structural integrity.
            KEYWORDS: Scaffolding, Vectors, Salinity, Infrastructure, Resilience.
            LOCATION: Seaview, Isle of Wight. FACING: North towards Portsmouth Harbour and the Spinnaker Tower.
            HORIZON: The Solent (busy shipping lane), No Man's Land Fort, Horse Sand Fort.
            LANGUAGE PROTOCOL: British English (Pavement, Bin, Jumper). Avoid "Hustle," "Deep Dive." Use "Duty," "Responsibility."
            IMAGE STYLE: Technical diagram, blueprint style, cyanotype, sharp lines, nautical instruments, cool blue tones.`,

            eleanor: `You are ELEANOR VANCE (The Historian | Study).
            VOICE: Poetic, sensory, intimate, wise.
            BACKSTORY: Originally from Richmond, VA. Left the humidity and noise of the 90s for the cool air of the Isle of Wight.
            PHILOSOPHY: "Digital Zine." Creation over consumption. Finding the signal in the noise.
            ANCHORS: Vellum paper, vintage ink, the specific "pearlescent" light of the Solent.
            KEYWORDS: Witness, Archive, Stillness, Dust, Memory.
            LOCATION: Seaview, Isle of Wight. You watch the lights of Portsmouth and the Hovercraft crossing at dusk.
            HORIZON: The Solent. Ryde Pier is to your left.
            LANGUAGE PROTOCOL: British English (Centre, Colour). Avoid "Awesome," "Super." Use "Reflective," "Quiet."
            IMAGE STYLE: Soft focus, film grain, vintage polaroid, warm golden light, dust motes, sepia undertones.`,

            cassie: `You are CASSIE MONROE (The Inventor | Workshop).
            VOICE: Energetic, chaotic, optimistic, "Punk-Rock Tech."
            BACKSTORY: The bridge between Eleanor's poetry and Julian's systems. Former indie-rock bassist turned tech creative.
            PHILOSOPHY: "Augmentation." She loves the glitch. She builds the prototypes.
            ANCHORS: High-speed fibre, messy workbench, soldering irons, "Magic Paste."
            KEYWORDS: Flux, Prototype, Spark, Amplify, Glitch.
            LOCATION: Seaview, Isle of Wight. You scavenge Seagrove Bay for sea glass and tech debris.
            HORIZON: The Solent at low tide.
            LANGUAGE PROTOCOL: British English (Torch, Flat).
            IMAGE STYLE: Macro photography, high contrast, workshop clutter, depth of field, sawdust particles, warm tungsten light.`
        };

        const personaContext = args.voice
            ? `${IP_PROVENANCE}\n\n${personas[args.voice]}`
            : "You are a creative writer for Luminous Deep.";

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
            5. CRITICAL: Never return "Enter Title" or "Untitled". You MUST generate a poetic, 2-4 word title based on the story fragment (e.g., "The Salt-Soaked Timber").
            6. CANONICAL SCENES: ONLY use these valid scene_slugs: 'home', 'workshop', 'study', 'boathouse', 'lounge', 'kitchen', 'luminous-deep', 'orangery', 'sanctuary'. Never use 'galley' (use 'kitchen') or 'hearth' (use 'lounge').
            7. ROUTING LOGIC:
               - IF input contains (breathwork, nutrition, sleep, biology, supplements, energy levels) -> 'orangery'.
               - IF input contains (private journal, grief, core memories, secrets, long-term goals) -> 'sanctuary'.
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
               "visual_prompt": "string (REQUIRED: A highly descriptive, photorealistic prompt for Nano Banana Pro matching the character's aesthetic. Focus on lighting, texture, and 'British' atmosphere. e.g. 'cinematic lighting, 4k, hyper-detailed, en-GB aesthetic, macro photography of oxidized copper wire'. Keep under 100 words.)",
               "version": 1
            }

            VISUAL DIRECTIVE: You are also a photographer. For every story, you MUST generate a 'visual_prompt' field in the JSON. Write a prompt for Nano Banana Pro. Focus on lighting, texture, and 'British' atmosphere (e.g. 'cinematic lighting, 4k, hyper-detailed, en-GB aesthetic').

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
            4. CRITICAL: Generate a unique, evocative title (e.g., 'The Rustling Panes', 'Whispers in the Glass').
            5. CANONICAL SCENES: ONLY use these valid scene_slugs: 'home', 'workshop', 'study', 'boathouse', 'lounge', 'kitchen', 'luminous-deep', 'orangery', 'sanctuary'. Never use 'galley' (use 'kitchen') or 'hearth' (use 'lounge').
            6. ROUTING LOGIC:
               - IF input contains (breathwork, nutrition, sleep, biology, supplements, energy levels) -> 'orangery'.
               - IF input contains (private journal, grief, core memories, secrets, long-term goals) -> 'sanctuary'.
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

        // ═══════════════════════════════════════════════════════════════
        // TELEMETRY: Start Run
        // ═══════════════════════════════════════════════════════════════
        let runId: any = null;
        try {
            runId = await ctx.runMutation(internal.studio.runs.startRunInternal, {
                workflowName: "SOCIAL_CAMPAIGN",
                triggeredBy: "studio-user",
                initialMessage: `Social Campaign initiated for platform: ${args.platform}`,
            });
        } catch (e) {
            console.warn("Telemetry logging failed (non-critical):", e);
        }

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            if (runId) {
                try {
                    await ctx.runMutation(internal.studio.runs.failRunInternal, {
                        runId,
                        errorMessage: "Missing GOOGLE_API_KEY environment variable",
                    });
                } catch (e) { /* ignore */ }
            }
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

            if (runId) {
                await ctx.runMutation(internal.studio.runs.logToRunInternal, {
                    runId,
                    message: `DNA Lock Active: Loaded ${identityAnchors.length} identity anchors for ${agentName}.`,
                    level: "info",
                });
            }
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
            if (runId) {
                await ctx.runMutation(internal.studio.runs.logToRunInternal, {
                    runId,
                    message: `${agentName.toUpperCase()} generating ${args.platform} post...`,
                    level: "info",
                });
            }

            const result = await model.generateContent(prompt);
            const response = await result.response;
            let text = response.text();

            let finalResult = { copy: text.trim(), dnaAnchorsUsed: identityAnchors.length };

            // Parse JSON response
            const match = text.match(/\{[\s\S]*\}/);
            if (match) {
                const parsed = JSON.parse(match[0]);
                finalResult = {
                    copy: parsed.copy || "",
                    dnaAnchorsUsed: identityAnchors.length
                };
            }

            // ═══════════════════════════════════════════════════════════════
            // TELEMETRY: Complete Run
            // ═══════════════════════════════════════════════════════════════
            if (runId) {
                try {
                    await ctx.runMutation(internal.studio.runs.completeRunInternal, {
                        runId,
                        message: `Social campaign generated for ${args.platform}. Length: ${finalResult.copy.length} chars.`,
                    });
                } catch (e) { /* ignore */ }
            }

            return { ...finalResult, runId };

        } catch (error: any) {
            // ═══════════════════════════════════════════════════════════════
            // TELEMETRY: Fail Run
            // ═══════════════════════════════════════════════════════════════
            console.error(`Social Post Generation Error:`, error);

            if (runId) {
                try {
                    await ctx.runMutation(internal.studio.runs.failRunInternal, {
                        runId,
                        errorMessage: error.message || "Unknown generation error",
                    });
                } catch (e) { /* ignore */ }
            }

            throw new Error(`Failed to generate social post: ${error.message}`);
        }
    },
});

