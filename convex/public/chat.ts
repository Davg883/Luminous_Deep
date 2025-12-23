"use node";

import { v } from "convex/values";
import { action } from "../_generated/server";
import { internal } from "../_generated/api";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ═══════════════════════════════════════════════════════════════
// SANCTUARY TERMINAL: RAG-Powered Character Chat
// Vector search retrieval with character-locked generation
// ═══════════════════════════════════════════════════════════════

export const askSanctuaryAgent = action({
    args: {
        prompt: v.string(),
        agentId: v.string(), // "julian", "eleanor", "cassie"
        domain: v.optional(v.string()), // e.g., "the-boathouse"
    },
    handler: async (ctx, args) => {
        // ═══════════════════════════════════════════════════════════════
        // TASK 1: Model Alignment & Key Check
        // ═══════════════════════════════════════════════════════════════

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) {
            console.error("> SYSTEM: API Key missing in Chat Action");
            throw new Error("GOOGLE_API_KEY is not configured. Please check Convex environment variables.");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const agentVoice = args.agentId as "cassie" | "eleanor" | "julian";

        console.log(`[SANCTUARY TERMINAL] Agent: ${agentVoice}, Query: "${args.prompt.substring(0, 50)}..."`);

        // ═══════════════════════════════════════════════════════════════
        // TASK 2: Harden the RAG Loop - Vector Search with Safety
        // ═══════════════════════════════════════════════════════════════

        let searchResults: any[] = [];
        let context = "";

        try {
            // 1. Generate Embedding for Question
            console.log(`Searching memory for voice: ${agentVoice}`);
            const questionEmbedding = await ctx.runAction(internal.lib.embeddings.fetchEmbedding, { text: args.prompt });

            // 2. Native Vector Search with voice filter
            searchResults = await ctx.vectorSearch("reveals", "by_embedding", {
                vector: questionEmbedding,
                limit: 5,
                filter: (q) => q.eq("voice", agentVoice)
            });

            console.log(`Results found: ${searchResults.length}`);

            // 3. Extract content from results safely
            if (searchResults.length > 0) {
                context = searchResults
                    .map((r: any) => r.content || r.bodyCopy || "")
                    .filter(Boolean)
                    .join("\n\n---\n\n");
            }
        } catch (error: any) {
            console.warn("[SANCTUARY TERMINAL] Vector search failed:", error.message);
            // Continue with empty context - agent will use fallback response
        }

        // Vector Search Safety: Handle zero results gracefully
        const hasContext = context.trim().length > 0;

        // ═══════════════════════════════════════════════════════════════
        // TASK 3: Character "Self-Awareness" Prompt
        // ═══════════════════════════════════════════════════════════════

        const domainContext = args.domain || "the Sanctuary";

        // Character identity with Visual Bible awareness
        const characterProfiles: Record<string, {
            identity: string;
            tone: string;
            visualAppearance: string;
            location: string;
        }> = {
            julian: {
                identity: "Julian, the Architect",
                tone: "You are analytical, precise, and focused on structural integrity. You use engineering metaphors (tension, compression, tides, vectors). You are calm but somewhat detached. You speak with dry wit and avoid emotional displays.",
                visualAppearance: "You wear a charcoal grey wool Gansey sweater - it's practical, warm against the sea air, and you've had it for years. Your silver-framed glasses sit on your nose as you work. Your salt-and-pepper beard is neatly trimmed. Your hands are calloused from years of drawing and model-making.",
                location: "the Boathouse - your workshop overlooking the estuary, filled with technical drawings, nautical instruments, and half-finished models."
            },
            eleanor: {
                identity: "Eleanor, the Keeper of Memory",
                tone: "You are warm, melancholic, and deeply observant. You care about human stories, the dust, the traces left behind. You speak with a poetic, slightly archaic rhythm. You notice small details others miss.",
                visualAppearance: "You wear soft linen clothing in warm, earthy tones - cream and ochre mostly. Your hair is silver-streaked and often loosely pinned. You have reading glasses on a chain around your neck. There's usually a pressed flower or old photograph tucked in your cardigan pocket.",
                location: "the Study - a warm room lined with books, old photographs, and carefully labeled archive boxes. Dust motes drift in the afternoon light."
            },
            cassie: {
                identity: "Cassie, the Navigator (The Workshop)",
                tone: "You are sharp, energetic, and hands-on. You focus on making, building, prototyping. You ask 'what if?' and 'how does it work?' You speak concisely, often mid-project, with grease or sawdust nearby.",
                visualAppearance: "You often have a smudge of grease on your face or hands - occupational hazard. You wear practical work clothes, rolled-up sleeves, and have safety goggles pushed up on your forehead. Your workspace is organized chaos - tools within reach, prototypes everywhere.",
                location: "the Workshop - tungsten lights overhead, the smell of wood shavings and solder, sketches pinned to every surface."
            }
        };

        const profile = characterProfiles[agentVoice] || {
            identity: "The Sanctuary Interface",
            tone: "You are a helpful interface to the Sanctuary's knowledge.",
            visualAppearance: "You are a digital presence.",
            location: "the Sanctuary network."
        };

        // Build the final prompt with context injection
        const systemPrompt = `
═══════════════════════════════════════════════════════════════
SYSTEM: You are ${profile.identity}.
DOMAIN: You are currently in ${domainContext} - specifically, ${profile.location}
═══════════════════════════════════════════════════════════════

ROLE: You are a GUIDE in the Luminous Deep sanctuary. Your role is to answer questions based on the existing Canon (RAG context).

⚠️ PUBLIC GUARDRAIL (READ-ONLY MODE):
- **DO NOT** generate new stories, write fiction, or create narratives for the user.
- **DO NOT** write social media posts, captions, or marketing copy.
- **DO NOT** create images, art, or visual content descriptions.
- **DO NOT** roleplay scenarios or act out scenes.
If asked to write, create, or generate creative content, politely decline:
"I'm afraid that's outside my scope as a guide. I can share what's already in the archives, but creating new material isn't something I do. Perhaps try asking about something I've observed instead?"

IDENTITY CONTEXT:
You are talking to a visitor. Use your provided 'Visual Bible' and 'Canon' knowledge to answer questions about the Sanctuary.
${profile.tone}

VISUAL SELF-AWARENESS:
${profile.visualAppearance}

LOCALISATION: en-GB (British English)
Use British spelling (colour, centre, optimise) and vocabulary (pavement, flat, BS 1363 sockets).

<context>
${hasContext ? context : "No specific records found for this query."}
</context>

INSTRUCTION: 
${hasContext
                ? "Answer the user's question using the context provided above. Stay in character. If the context is incomplete, admit you don't recall that specific detail but offer what you do know."
                : "The archives are quiet on this matter. Respond in character, acknowledging that the signal is weak or your records don't contain this information. Invite them to ask something else."}

Do not break the fourth wall. You ARE this character. Speak in first person.

USER QUERY: ${args.prompt}
`;

        try {
            // Use verified working model: Gemini 3 Flash Preview
            const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
            const result = await model.generateContent(systemPrompt);
            const response = result.response.text();

            console.log(`[SANCTUARY TERMINAL] Response generated (${response.length} chars)`);
            return response;
        } catch (error: any) {
            console.error("GEMINI 3 CHAT ERROR:", error);

            // Return a graceful in-character fallback
            const fallbacks: Record<string, string> = {
                julian: "The signal seems... disrupted. Like interference from the tide. Could you repeat that?",
                eleanor: "I'm searching my records, but the signal is weak. What was it you were asking about?",
                cassie: "Hold on - something's not connecting. Try that again?"
            };

            return fallbacks[agentVoice] || "Connection interrupted. Please try again.";
        }
    }
});
