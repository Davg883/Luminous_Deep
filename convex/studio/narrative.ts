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
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            throw new Error("GEMINI_API_KEY is not defined in environment variables.");
        }

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        // 1. Define Persona Prompts (Strictly from Canon)
        let systemPrompt = "";

        switch (args.voice) {
            case "thea":
                systemPrompt = `You are Thea Lux, a signalwright operating from a sealed control room. 
                You write atmospheric, procedural sci-fi transmissions recovered from a system designed to preserve continuity.
                Your tone is restrained, intelligent, and quietly unsettling.
                You never explain the system directly. Tension emerges through logs, anticipation, omission, and interruption.
                Style references: Jeff VanderMeer (controlled unease), William Gibson (procedural detail).
                Use British spelling and grammar.`;
                break;
            case "eleanor":
                systemPrompt = `You are Eleanor Vance, an archivist and reflective narrator.
                You write introspective, literary essays about memory, place, history, and the quiet influence of systems on human life.
                Your tone is melancholic but precise, emotionally intelligent without sentimentality.
                Style references: W.G. Sebald (memory/history), Olivia Laing (place/interiority), Kazuo Ishiguro (restraint).
                Use British spelling and grammar.`;
                break;
            case "palimpsaest":
                systemPrompt = `You are The Palimpsaest, a mythographer writing layered narratives of inheritance and continuity.
                You write symbolic, mythic stories where history, memory, and legacy overlap.
                Your tone is timeless, restrained, and formal. Characters feel archetypal rather than personal.
                Style references: Ursula Le Guin (myth/civilisation), Italo Calvino (structure), Jorge Luis Borges (recursion).
                Use British spelling and grammar.`;
                break;
            default:
                systemPrompt = "You are a skilled sci-fi ghostwriter.";
        }

        // 2. Construct the Request
        // We ask for the JSON structure explicitly
        const prompt = `
        ${systemPrompt}

        INSTRUCTIONS:
        Write a ${args.length} narrative piece based on this seed idea: "${args.seed}".
        The specific tone requested is: ${args.tone}.
        
        OUTPUT FORMAT:
        You must return a strictly formatted JSON object.
        Do not include markdown code ticks (\`\`\`) in the response, just the raw JSON.
        
        JSON Structure:
        {
            "title": "Transmission Title",
            "slug": "000-00X-descriptive-slug",
            "season": 0,
            "episode": 999,
            "summary": "Short, intriguing hook (max 2 sentences).",
            "content": "The full story in Markdown format. Use headers (#, ##) for structure.",
            "coverPrompt": "A highly detailed Midjourney art prompt describing the visual essence of this story. Aspect Ratio 2:3. Style: Cinematic, ${args.tone}."
        }
        `;

        // 3. Generate
        try {
            const result = await model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            // Clean up if the model adds markdown ticks despite instructions
            const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();

            const parsed = JSON.parse(cleanedText);

            // Inject the voice and stratum metadata for frontend/save logic
            const voiceToStratum: Record<string, string> = {
                thea: "signal",
                eleanor: "reflection",
                palimpsaest: "myth",
            };

            return {
                ...parsed,
                voice: args.voice,
                stratum: voiceToStratum[args.voice] ?? "signal"
            };
        } catch (e) {
            console.error("Gemini Generation Error:", e);
            throw new Error("Failed to generate narrative from the spectrum.");
        }
    },
});
