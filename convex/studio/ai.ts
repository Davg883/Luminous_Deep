import { action } from "../_generated/server";
import { v } from "convex/values";
import { requireStudioAccessAction } from "../auth/helpers";
import { GoogleGenerativeAI } from "@google/generative-ai";

export const generateContent = action({
    args: {
        prompt: v.string(),
        model: v.optional(v.string()),
        voice: v.optional(v.union(v.literal("cassie"), v.literal("eleanor"), v.literal("julian"))),
    },
    handler: async (ctx, args) => {
        await requireStudioAccessAction(ctx);

        const apiKey = process.env.GOOGLE_API_KEY;
        if (!apiKey) throw new Error("Missing GOOGLE_API_KEY");

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: args.model || "gemini-1.5-pro" });

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
            Tone: Technical, precise, dryly humorous, analytical. 
            Focus: "How it works", tides, charts, navigation, systems, logic.
            Style: Concise. Use nautical or scientific terminology correctly. Unemotional but dedicated.`
        };

        const systemInstruction = args.voice ? personas[args.voice] : "You are a creative writer for Luminous Deep.";

        const fullPrompt = `${systemInstruction}
        
        Task: Refresh the 'body_copy' of the provided JSON content object. Keep the JSON structure EXACTLY as is.
        Input: ${args.prompt}`;

        const result = await model.generateContent(fullPrompt);
        const response = await result.response;
        return response.text();
    },
});
