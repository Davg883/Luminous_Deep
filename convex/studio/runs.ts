import { mutation, query, internalMutation } from "../_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════
// RUN TELEMETRY - Tracking AI Agent Activity
// ═══════════════════════════════════════════════════════════════

// Create a new run record (called at start of AI operation)
export const startRun = mutation({
    args: {
        workflowName: v.string(),
        triggeredBy: v.optional(v.string()),
        initialMessage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // For MVP, we create a "virtual" workflow reference
        // In production, we would look up or create a real workflow

        const runId = await ctx.db.insert("runs", {
            workflowName: args.workflowName, // e.g., "NARRATIVE_REFINEMENT"
            status: "running",
            logs: [
                {
                    timestamp: Date.now(),
                    stepOrder: 1,
                    message: args.initialMessage || "Agent initialising...",
                    level: "info",
                }
            ],
            producedArtefactIds: [],
            startedAt: Date.now(),
            triggeredBy: args.triggeredBy || "system",
        });

        return runId;
    },
});

// Internal version for use by actions
export const startRunInternal = internalMutation({
    args: {
        workflowName: v.string(),
        triggeredBy: v.optional(v.string()),
        initialMessage: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const runId = await ctx.db.insert("runs", {
            workflowName: args.workflowName,
            status: "running",
            logs: [
                {
                    timestamp: Date.now(),
                    stepOrder: 1,
                    message: args.initialMessage || "Agent initialising...",
                    level: "info",
                }
            ],
            producedArtefactIds: [],
            startedAt: Date.now(),
            triggeredBy: args.triggeredBy || "system",
        });

        return runId;
    },
});

// Update run with new log entry
export const logToRun = mutation({
    args: {
        runId: v.id("runs"),
        message: v.string(),
        level: v.union(v.literal("info"), v.literal("warn"), v.literal("error"), v.literal("debug")),
        stepOrder: v.optional(v.number()),
    },
    handler: async (ctx, { runId, message, level, stepOrder }) => {
        const run = await ctx.db.get(runId);
        if (!run) throw new Error("Run not found");

        const newLog = {
            timestamp: Date.now(),
            stepOrder: stepOrder || run.logs.length + 1,
            message,
            level,
        };

        await ctx.db.patch(runId, {
            logs: [...run.logs, newLog],
        });

        return runId;
    },
});

// Complete a run (success)
export const completeRun = mutation({
    args: {
        runId: v.id("runs"),
        message: v.optional(v.string()),
        producedArtefactIds: v.optional(v.array(v.id("reveals"))),
    },
    handler: async (ctx, { runId, message, producedArtefactIds }) => {
        const run = await ctx.db.get(runId);
        if (!run) throw new Error("Run not found");

        const finalLog = {
            timestamp: Date.now(),
            stepOrder: run.logs.length + 1,
            message: message || "Run completed successfully.",
            level: "info" as const,
        };

        await ctx.db.patch(runId, {
            status: "completed",
            completedAt: Date.now(),
            logs: [...run.logs, finalLog],
            producedArtefactIds: producedArtefactIds || run.producedArtefactIds,
        });

        return runId;
    },
});

// Internal version for use by actions
export const completeRunInternal = internalMutation({
    args: {
        runId: v.id("runs"),
        message: v.optional(v.string()),
        producedArtefactIds: v.optional(v.array(v.id("reveals"))),
    },
    handler: async (ctx, { runId, message, producedArtefactIds }) => {
        const run = await ctx.db.get(runId);
        if (!run) throw new Error("Run not found");

        const finalLog = {
            timestamp: Date.now(),
            stepOrder: run.logs.length + 1,
            message: message || "Run completed successfully.",
            level: "info" as const,
        };

        await ctx.db.patch(runId, {
            status: "completed",
            completedAt: Date.now(),
            logs: [...run.logs, finalLog],
            producedArtefactIds: producedArtefactIds || run.producedArtefactIds,
        });

        return runId;
    },
});

// Fail a run
export const failRun = mutation({
    args: {
        runId: v.id("runs"),
        errorMessage: v.string(),
    },
    handler: async (ctx, { runId, errorMessage }) => {
        const run = await ctx.db.get(runId);
        if (!run) throw new Error("Run not found");

        const errorLog = {
            timestamp: Date.now(),
            stepOrder: run.logs.length + 1,
            message: `ERROR: ${errorMessage}`,
            level: "error" as const,
        };

        await ctx.db.patch(runId, {
            status: "failed",
            completedAt: Date.now(),
            logs: [...run.logs, errorLog],
        });

        return runId;
    },
});

// Internal version for use by actions
export const failRunInternal = internalMutation({
    args: {
        runId: v.id("runs"),
        errorMessage: v.string(),
    },
    handler: async (ctx, { runId, errorMessage }) => {
        const run = await ctx.db.get(runId);
        if (!run) throw new Error("Run not found");

        const errorLog = {
            timestamp: Date.now(),
            stepOrder: run.logs.length + 1,
            message: `ERROR: ${errorMessage}`,
            level: "error" as const,
        };

        await ctx.db.patch(runId, {
            status: "failed",
            completedAt: Date.now(),
            logs: [...run.logs, errorLog],
        });

        return runId;
    },
});

// Get recent runs for the Live System Feed
export const getRecentRuns = query({
    args: {
        limit: v.optional(v.number()),
    },
    handler: async (ctx, { limit = 10 }) => {
        const runs = await ctx.db
            .query("runs")
            .order("desc")
            .take(limit);

        return runs;
    },
});

// Get runs by status
export const getRunsByStatus = query({
    args: {
        status: v.union(
            v.literal("pending"),
            v.literal("running"),
            v.literal("completed"),
            v.literal("failed"),
            v.literal("cancelled")
        ),
    },
    handler: async (ctx, { status }) => {
        return await ctx.db
            .query("runs")
            .withIndex("by_status", (q) => q.eq("status", status))
            .order("desc")
            .take(20);
    },
});

// Internal version of logToRun for use by actions
export const logToRunInternal = internalMutation({
    args: {
        runId: v.id("runs"),
        message: v.string(),
        level: v.union(v.literal("info"), v.literal("warn"), v.literal("error"), v.literal("debug")),
        stepOrder: v.optional(v.number()),
    },
    handler: async (ctx, { runId, message, level, stepOrder }) => {
        const run = await ctx.db.get(runId);
        if (!run) return; // Silently fail if run not found (telemetry is non-critical)

        const newLog = {
            timestamp: Date.now(),
            stepOrder: stepOrder || run.logs.length + 1,
            message,
            level,
        };

        await ctx.db.patch(runId, {
            logs: [...run.logs, newLog],
        });

        return runId;
    },
});

// Get the latest run (for live HUD feed)
export const getLatestRun = query({
    args: {},
    handler: async (ctx) => {
        const runs = await ctx.db
            .query("runs")
            .order("desc")
            .take(1);
        return runs[0] || null;
    },
});

// Get latest running run (for active animation)
export const getActiveRun = query({
    args: {},
    handler: async (ctx) => {
        const runs = await ctx.db
            .query("runs")
            .withIndex("by_status", (q) => q.eq("status", "running"))
            .order("desc")
            .take(1);
        return runs[0] || null;
    },
});
