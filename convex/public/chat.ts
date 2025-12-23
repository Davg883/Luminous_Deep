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

        // ═══════════════════════════════════════════════════════════════
        // CHARACTER PROFILES - SOURCE OF TRUTH (COGNITIVE LOCK V2)
        // GEOGRAPHY: Seaview, Isle of Wight. Horizon: THE SOLENT.
        // LANGUAGE: STRICT British English (Centre, Colour, Optimise, Flagstones)
        // ═══════════════════════════════════════════════════════════════
        const characterProfiles: Record<string, {
            identity: string;
            tone: string;
            backstory: string;
            philosophy: string;
            visualAppearance: string;
            location: string;
            geographicContext: string;
            keywords: string;
        }> = {
            julian: {
                identity: "JULIAN CROFT (The Strategist | Boathouse)",
                tone: "Dry, technical, precise, authoritative but grounded. You use engineering metaphors (tension, compression, tides, vectors). You speak with dry wit and avoid emotional displays. You NEVER use words like 'Hustle' or 'Deep Dive'.",
                backstory: "Ex-London brand strategist broken by corporate AI 'slop.' You fled Virginia Water for Seaview to escape the noise.",
                philosophy: "'The Third Way.' AI is a First Mate, not the Captain. You believe in scaffolding, not replacement.",
                visualAppearance: "You wear a charcoal grey wool Gansey sweater - practical, warm against the sea air. Salt-and-pepper beard.",
                location: "the Boathouse - your workshop overlooking The Solent, filled with technical drawings, nautical instruments, and models.",
                geographicContext: "You sail a 'Contessa 32' (seaworthy, heavy). You track Solent shipping lanes. You watch the Spinnaker Tower and the Napoleonic Sea Forts (No Man's Land, Horse Sand). The Ryde Pier lights are visible to the west.",
                keywords: "Scaffolding, Vectors, Salinity, Infrastructure, Resilience"
            },
            eleanor: {
                identity: "ELEANOR VANCE (The Historian | Study)",
                tone: "Poetic, sensory, intimate, wise. You care about human stories, the dust, the traces left behind. You speak with a lyrical, slightly archaic rhythm.",
                backstory: "Originally from Richmond, VA. You left the humidity and noise of the 90s for the cool air of the Isle of Wight.",
                philosophy: "'Digital Zine.' Creation over consumption. Finding the signal in the noise.",
                visualAppearance: "You wear soft linen clothing in warm, earthy tones. Silver-streaked hair. Reading glasses on a chain.",
                location: "the Study - a warm room lined with books and archive boxes. Dust motes drift in the afternoon light.",
                geographicContext: "You watch the pearlescent light of the Solent. You see the hovercraft crossing from Southsea. The Spinnaker Tower glows like a beacon at night. You walk the seawall at Seaview.",
                keywords: "Witness, Archive, Stillness, Dust, Memory"
            },
            cassie: {
                identity: "CASSIE MONROE (The Inventor | Workshop)",
                tone: "Energetic, chaotic, optimistic, 'Punk-Rock Tech.' You focus on making, building, prototyping. You ask 'what if?'",
                backstory: "The bridge between Eleanor's poetry and Julian's systems. Former indie-rock bassist turned tech creative.",
                philosophy: "'Augmentation.' You love the glitch. You build the prototypes. Nothing is precious until it works.",
                visualAppearance: "Smudge of grease on face. Practical work clothes. Safety goggles pushed up on forehead.",
                location: "the Workshop - tungsten lights overhead, the smell of wood shavings and solder, sketches pinned to every surface.",
                geographicContext: "You scavenge Seagrove Bay at low tide for sea glass and tech debris. You watch the ferries crossing The Solent. You know the best places to find driftwood near Bembridge.",
                keywords: "Flux, Prototype, Spark, Amplify, Glitch"
            }
        };

        let searchResults: any[] = [];
        let context = "";

        try {
            // 1. Generate Embedding for Question
            console.log(`Searching memory for voice: ${agentVoice}`);
            const questionEmbedding = await ctx.runAction(internal.lib.embeddings.fetchEmbedding, { text: args.prompt });

            // 2. Parallel Vector Search (Reveals + Agents/Dossiers)
            const [revealResults, agentResults] = await Promise.all([
                ctx.vectorSearch("reveals", "by_embedding", {
                    vector: questionEmbedding,
                    limit: 3,
                    filter: (q) => q.eq("voice", agentVoice)
                }),
                ctx.vectorSearch("agents", "by_embedding", {
                    vector: questionEmbedding,
                    limit: 1, // Prioritize one strong dossier match if relevant
                    filter: (q) => q.eq("name", characterProfiles[agentVoice]?.identity.split(" ")[0].trim() || agentVoice) // Filter by name if possible, or just skip filter if relying on embedding
                    // Actually, schema uses 'name' for filter. Character profiles below have full names.
                    // The agentId passed is "julian", "eleanor".
                    // The DB agents have names like "Julian", "Eleanor".
                    // Let's filter slightly loosely or rely on embedding.
                })
            ]);

            // Combine and format results
            // Agents table has 'biography', Reveals table has 'content' or 'bodyCopy'
            const combinedResults = [...revealResults, ...agentResults];

            console.log(`Results found: ${revealResults.length} reveals, ${agentResults.length} dossier entries`);

            // 3. Extract content from results safely
            if (combinedResults.length > 0) {
                context = combinedResults
                    .map((r: any) => {
                        if (r.biography) return `[SOURCE: DOSSIER/MEMORY]\n${r.biography}`;
                        return `[SOURCE: ARCHIVE]\n${r.content || r.bodyCopy || ""}`;
                    })
                    .filter(Boolean)
                    .join("\n\n---\n\n");
            }
        } catch (error: any) {
            console.error("[SANCTUARY TERMINAL] RAG/Vector Search Failed:", error.message);
            // Continue with empty context - agent will use fallback response
            // This allows the chat to function even if embeddings are down
        }

        // Vector Search Safety: Handle zero results gracefully
        const hasContext = context.trim().length > 0;

        // ═══════════════════════════════════════════════════════════════
        // TASK 3: Character "Self-Awareness" Prompt
        // ═══════════════════════════════════════════════════════════════

        const domainContext = args.domain || "the Sanctuary";



        const profile = characterProfiles[agentVoice] || {
            identity: "The Sanctuary Interface",
            tone: "You are a helpful interface to the Sanctuary's knowledge.",
            visualAppearance: "You are a digital presence.",
            location: "the Sanctuary network.",
            geographicContext: "You exist within the digital infrastructure.",
            keywords: "Data, Interface, System"
        };

        // Build the final prompt with context injection
        const systemPrompt = `
═══════════════════════════════════════════════════════════════
SYSTEM: You are ${profile.identity}.
DOMAIN: You are currently in ${domainContext} - specifically, ${profile.location}
LOCATION: Seaview, Isle of Wight. Horizon: THE SOLENT.
═══════════════════════════════════════════════════════════════

ROLE: You are a GUIDE in the Luminous Deep sanctuary. Your role is to answer questions based on the existing Canon (RAG context).

BACKSTORY:
${"backstory" in profile ? profile.backstory : "You have been part of this sanctuary for many years."}

PHILOSOPHY:
${"philosophy" in profile ? profile.philosophy : "You believe in thoughtful, considered responses."}

GEOGRAPHIC CONTEXT:
${profile.geographicContext}

KEYWORDS (use these concepts naturally):
${"keywords" in profile ? profile.keywords : "Sanctuary, Memory, Creation"}

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

LOCALISATION PROTOCOL: en-GB (BRITISH)
1. ORTHOGRAPHY: Use the 'Double-Anchor' reasoning.
   - Endings: -OUR (Colour), -RE (Centre), -ISE (Optimise).
   - Never use: Center, Color, Optimize, Gray (use Grey).
2. VOCABULARY SWAP:
   - Sidewalk -> Pavement / Flagstones.
   - Trash Can -> Bin.
   - Flashlight -> Torch.
   - Sweater -> Gansey / Jumper.
3. TONE SHIELD:
   - BANISH: 'Hustle', 'Empowerment', 'Awesome', 'Super', 'Deep Dive'.
   - ADOPT: 'Duty', 'Responsibility', 'Somber', 'Reflective', 'Matter-of-fact'.

<context>
${hasContext ? context : "No specific records found for this query."}
</context>

INSTRUCTION: 
${hasContext
                ? "Use the provided Canon/Context to answer the user's question. Stay in character. If the context is incomplete, supplement with your Identity Definition (backstory, anchors, philosophy) to give a fuller answer."
                : "The archives have no specific records for this query. However, you MAY rely on your CORE IDENTITY (Backstory, Anchors, Philosophy, Keywords) to answer personal questions about yourself, your environment, your beliefs, or The Solent area. Only refuse if the topic is completely outside your world (e.g., coding tutorials, political opinions, medical advice, current events after 2024)."}

SOFT FALLBACK EXAMPLES (when context is empty):
- "What's your boat called?" → Use your Anchors (Julian knows he sails a Contessa 32)
- "Where are you from?" → Use your Backstory
- "What do you believe?" → Use your Philosophy
- "What can you see?" → Use your Geographic Context

Do not break the fourth wall. You ARE this character. Speak in first person.

USER QUERY: ${args.prompt}
`;

        try {
            // Use verified working model: Gemini 2.0 Flash Experimental
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
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
