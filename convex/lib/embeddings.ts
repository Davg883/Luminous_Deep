
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Support multiple env var names for the API key
const apiKey = process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export const fetchEmbedding = internalAction({
    args: { text: v.string() },
    handler: async (ctx, args) => {
        console.log("[EMBEDDING] Requesting embedding for text length:", args.text.length);
        console.log("[EMBEDDING] API Key present:", !!apiKey);

        if (!apiKey) {
            throw new Error("No Google API key found. Set GOOGLE_API_KEY in Convex environment.");
        }

        try {
            // Use stable text-embedding-004 model (005 not available via this API)
            // Forced update to ensure deployment: v2
            const modelName = "text-embedding-004";
            console.log(`[EMBEDDING] Using model: ${modelName}`);
            const model = genAI.getGenerativeModel({ model: modelName });

            // Embed with simple text input (SDK handles the rest)
            const result = await model.embedContent(args.text);

            console.log("[EMBEDDING] Success! Dimensions:", result.embedding.values.length);
            return result.embedding.values;
        } catch (e: any) {
            console.error("[EMBEDDING] GOOGLE EMBEDDING ERROR:", e.message || e);
            throw new Error(`Embedding failed: ${e.message || e}`);
        }
    }
});
