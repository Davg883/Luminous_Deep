import { v } from "convex/values";
import { query, mutation } from "../_generated/server";
import { requireStudioAccess } from "../auth/helpers";

// ═══════════════════════════════════════════════════════════════
// SOCIAL CAMPAIGN QUERIES & MUTATIONS
// Managing the historical archive of social media content
// ═══════════════════════════════════════════════════════════════

export const listCampaigns = query({
    args: {},
    handler: async (ctx) => {
        await requireStudioAccess(ctx);

        // Fetch campaigns, newest first
        const campaigns = await ctx.db.query("campaigns").order("desc").collect();

        // Fetch agents to join
        // Optimization: In a real large app, we might fetch only distinct agent IDs or use an index
        // For now, fetching all agents is fine as there are few.
        const agents = await ctx.db.query("agents").collect();
        const agentMap = new Map(agents.map(a => [a._id, a]));

        // Join
        return campaigns.map(c => {
            const agent = agentMap.get(c.agentId);
            return {
                ...c,
                agentName: agent?.name || "Unknown Agent",
                agentVoice: agent?.voice || "neutral",
            };
        });
    }
});

export const saveCampaign = mutation({
    args: {
        title: v.string(),
        platform: v.union(
            v.literal("X"),
            v.literal("Instagram"),
            v.literal("Facebook"),
            v.literal("LinkedIn")
        ),
        agentId: v.id("agents"),
        postCopy: v.string(),
        imageUrl: v.optional(v.string()),
        runId: v.optional(v.id("runs")),
        dnaAnchorsUsed: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);

        const campaignId = await ctx.db.insert("campaigns", {
            title: args.title,
            platform: args.platform,
            agentId: args.agentId,
            status: "generated", // Default status
            postCopy: args.postCopy,
            imageUrl: args.imageUrl,
            runId: args.runId,
            dnaAnchorsUsed: args.dnaAnchorsUsed,
            createdAt: Date.now(),
        });

        return campaignId;
    }
});

export const updateCampaignStatus = mutation({
    args: {
        campaignId: v.id("campaigns"),
        status: v.union(
            v.literal("planning"),
            v.literal("generated"),
            v.literal("scheduled"),
            v.literal("posted")
        ),
    },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);
        await ctx.db.patch(args.campaignId, {
            status: args.status,
            postedAt: args.status === "posted" ? Date.now() : undefined
        });
    }
});

export const resonateCampaign = mutation({
    args: {
        campaignId: v.id("campaigns"),
    },
    handler: async (ctx, args) => {
        await requireStudioAccess(ctx);

        const campaign = await ctx.db.get(args.campaignId);
        if (!campaign) throw new Error("Campaign not found");

        // 1. Mark as Active/Posted
        await ctx.db.patch(args.campaignId, {
            status: "posted",
            postedAt: Date.now()
        });

        // 2. Log Telemetry if RunId exists
        if (campaign.runId) {
            const run = await ctx.db.get(campaign.runId);
            if (run) {
                const agentName = campaign.agentId ? (await ctx.db.get(campaign.agentId))?.name : "Unknown Agent";
                const newLog = {
                    timestamp: Date.now(),
                    stepOrder: (run.logs.length || 0) + 1,
                    message: `[${(agentName || "UNKNOWN").toUpperCase()}] Resonating Solent frequency to ${campaign.platform}... [ACTIVE]`,
                    level: "info",
                    data: { campaignId: args.campaignId }
                };

                await ctx.db.patch(campaign.runId, {
                    logs: [...(run.logs || []), newLog] as any
                });
            }
        }
    }
});
