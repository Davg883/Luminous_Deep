
import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
const genAI = new GoogleGenerativeAI(apiKey);

export const fetchEmbedding = internalAction({
    args: { text: v.string() },
    handler: async (ctx, args) => {
        console.log("Requesting embedding for text length:", args.text.length);

        try {
            const model = genAI.getGenerativeModel({ model: "text-embedding-005" });
            const result = await model.embedContent(args.text);

            // Gemini returns values object which contains embedding array
            console.log("Embedding generated successfully, dimensions:", result.embedding.values.length);
            return result.embedding.values;
        } catch (e) {
            console.error("GOOGLE EMBEDDING ERROR:", e);
            throw e;
        }
    }
});
