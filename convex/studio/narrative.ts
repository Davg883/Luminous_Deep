"use node";

import { action } from "../_generated/server";
import { v } from "convex/values";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const generateEpisode = action({
    args: {
        seed: v.string(),
        voice: v.string(),
        tone: v.string(),
        length: v.string(),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("API Key missing");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "models/gemini-3-flash-preview" });

        // 0. Define Voice
        const voicePrompts: Record<string, string> = {
            thea: "You are Thea Lux, a signalwright. Tone: Restrained, intelligent, sci-fi procedural. Style: Jeff VanderMeer meets William Gibson.",
            eleanor: "You are Eleanor Vance, an archivist. Tone: Melancholic, literary, precise. Style: Sebald meets Ishiguro.",
            palimpsaest: "You are The Palimpsaest. Tone: Mythic, timeless, formal. Style: Le Guin meets Borges."
        };
        const persona = voicePrompts[args.voice] || "You are a skilled sci-fi author.";

        try {
            // STAGE 1: THE BEAT SHEET
            // Generate a 5-point structure
            const beatPrompt = `
            ${persona}
            TASK: Create a 5-point 'Beat Sheet' for a story based on seed: "${args.seed}".
            Format: strictly JSON array of strings. Example: ["Beat 1", "Beat 2", ...].
            Do not include markdown formatting.
            `;
            const beatResult = await model.generateContent(beatPrompt);
            const rawBeats = beatResult.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
            let beats: string[] = [];
            try {
                // Handle potential object wrapper
                const parsed = JSON.parse(rawBeats);
                beats = Array.isArray(parsed) ? parsed : parsed.beats || [];
            } catch (e) {
                // Fallback if JSON fails
                beats = [args.seed, "Rising action", "Climax", "Falling action", "Resolution"];
            }

            // STAGE 2: THE EXPANSION (Loop)
            let fullText = "";
            let context = "Start of transmission.";

            for (let i = 0; i < beats.length; i++) {
                const actPrompt = `
                ${persona}
                CONTEXT: You are writing Part ${i + 1} of 5.
                PREVIOUS STORY CONTEXT: ${context.substring(0, 500)}...
                CURRENT BEAT: "${beats[i]}"
                
                TASK: Write 300-400 words of high-fidelity prose for this section.
                - Maintain the voice rigidly.
                - Ensure smooth flow from previous section.
                - If this is not the last beat, end with a micro-cliffhanger or forward momentum.
                - Output ONLY the prose.
                `;
                const actResult = await model.generateContent(actPrompt);
                const actText = actResult.response.text().trim();

                fullText += `## Part ${i + 1}: ${beats[i]}\n\n${actText}\n\n`;
                context = actText; // Update context for next beat (using last act as memory)
            }

            // STAGE 3: METADATA & ASSEMBLY
            // Generate title, summary, and cover prompt based on full text
            const metaPrompt = `
            ${persona}
            ANALYSIS TASK:
            Read this story:
            ${fullText.substring(0, 8000)}...

            OUTPUT: Return strict JSON only.
            {
                "title": "A short, evocative sci-fi title",
                "slug": "000-00X-slug-format",
                "season": 1,
                "episode": 101,
                "summary": "Compelling 2-sentence hook.",
                "coverPrompt": "Midjourney v6 prompt, Cinematic, ${args.tone}, AR 2:3"
            }
            `;
            const metaResult = await model.generateContent(metaPrompt);
            const rawMeta = metaResult.response.text().replace(/```json/g, "").replace(/```/g, "").trim();
            const metadata = JSON.parse(rawMeta);

            // Mapping for Stratum
            const voiceToStratum: Record<string, string> = {
                thea: "signal",
                eleanor: "reflection",
                palimpsaest: "myth",
            };

            return {
                ...metadata,
                content: fullText,
                imagePrompt: metadata.coverPrompt, // Align naming
                voice: args.voice,
                stratum: voiceToStratum[args.voice] ?? "signal"
            };

        } catch (e: any) {
            console.error("Pipeline Error:", e);
            throw new Error(`Generation failed: ${e.message}`);
        }
    },

});

export const generateSeriesSynopsis = action({
    args: {
        seriesId: v.string(), // Defensive change
        mode: v.union(v.literal("synopsis"), v.literal("image_prompt")),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("API Key missing");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "models/gemini-3-flash-preview" });

        // Fetch context
        // We use runQuery to get the data from the DB
        // Requires importing api
        const { api } = await import("../_generated/api");
        const signalsContent = await ctx.runQuery(api.studio.series.getSeriesSignalsContent, { seriesId: args.seriesId });

        if (!signalsContent) {
            return { output: "No signals found for this series to analyze." };
        }

        let prompt = "";

        if (args.mode === "synopsis") {
            prompt = `
            You are a skilled Chief Editor at a premium sci-fi streaming platform (like Netflix or Apple TV+).
            
            TASK:
            Read the following episode summaries/excerpts from the series "The Silent Archive".
            Synthesize them into a compelling, coherent, high-stakes 3-paragraph series plot summary.
            
            TONE:
            Atmospheric, intellectual, mysterious, ominous. 
            Focus on the overarching mystery and the character of Eleanor.
            
            SOURCE MATERIAL:
            ${signalsContent}
            
            OUTPUT:
            Just the 3 paragraphs of text. No intro/outro.
            `;
        } else {
            prompt = `
            You are an expert Art Director for Sci-Fi key art.
            
            TASK:
            Generate a high-fidelity Midjourney v6 prompt for the Series Poster of "The Silent Archive".
            Based on the themes in the text below.
            
            SOURCE MATERIAL:
            ${signalsContent}
            
            OUTPUT:
            A single, detailed image prompt string. Include parameters like --ar 2:3 --v 6.0 --style raw.
            Keywords: Cinematic, Atmospheric, Brutalist Architecture, Subterranean, Glowing interfaces, Lonely figures.
            `;
        }

        // Generate the content using the AI model
        const result = await model.generateContent(prompt);
        return { output: result.response.text().trim() };
    }
});

export const generateTitle = action({
    args: {
        context: v.string(), // summary or content
        voice: v.string(),
    },
    handler: async (ctx, args) => {
        const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("API Key missing");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "models/gemini-3-flash-preview" });

        const systemPrompt = args.voice === "thea"
            ? "You are Thea Lux. Generate a procedural, cryptic file name or title."
            : "Generate a poetic, atmospheric sci-fi title.";

        const prompt = `
        ${systemPrompt}
        TASK: Create a single, compelling title (max 6 words) for this story concept:
        "${args.context.substring(0, 500)}..."
        
        OUTPUT: Return ONLY the title text. No quotes, no markdown.
        `;

        const result = await model.generateContent(prompt);
        return { output: result.response.text().trim() };
    }
});
