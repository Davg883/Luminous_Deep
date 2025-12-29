import { internalMutation, internalQuery, query } from "./_generated/server";
import { v } from "convex/values";

// ═══════════════════════════════════════════════════════════════
// USER QUERIES
// ═══════════════════════════════════════════════════════════════

/**
 * Get current authenticated user (public query)
 */
export const getCurrentUser = query({
    handler: async (ctx) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;
        return await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", identity.tokenIdentifier))
            .first();
    },
});

/**
 * Get user by tokenIdentifier (internal, for actions)
 */
export const getCurrentUserInternal = internalQuery({
    args: { tokenIdentifier: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
            .first();
    },
});

// ═══════════════════════════════════════════════════════════════
// USER MUTATIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Upsert user from Clerk webhook
 */
export const upsertUser = internalMutation({
    args: {
        tokenIdentifier: v.string(),
        name: v.string(),
        email: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                name: args.name,
                email: args.email,
            });
            return existing._id;
        } else {
            return await ctx.db.insert("users", {
                ...args,
                subscriptionTier: "free",
            });
        }
    },
});

/**
 * Set Stripe customer ID on user
 */
export const setStripeCustomerId = internalMutation({
    args: {
        userId: v.id("users"),
        stripeCustomerId: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            stripeCustomerId: args.stripeCustomerId,
        });
    },
});

/**
 * Clear Stripe customer ID (useful when switching between test/live modes)
 */
export const clearStripeCustomerId = internalMutation({
    args: { tokenIdentifier: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_token", (q) => q.eq("tokenIdentifier", args.tokenIdentifier))
            .first();
        if (user) {
            await ctx.db.patch(user._id, {
                stripeCustomerId: undefined,
            });
            return true;
        }
        return false;
    },
});

/**
 * Fulfill subscription after successful payment
 */
export const fulfillSubscription = internalMutation({
    args: {
        stripeCustomerId: v.string(),
        tier: v.union(v.literal("free"), v.literal("patron")),
        status: v.string(),
        endsAt: v.number(),
    },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_stripe", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
            .first();

        if (user) {
            await ctx.db.patch(user._id, {
                subscriptionTier: args.tier,
                subscriptionStatus: args.status,
                subscriptionEnds: args.endsAt,
            });
        }
    },
});

/**
 * Revoke subscription
 */
export const revokeSubscription = internalMutation({
    args: { stripeCustomerId: v.string() },
    handler: async (ctx, args) => {
        const user = await ctx.db
            .query("users")
            .withIndex("by_stripe", (q) => q.eq("stripeCustomerId", args.stripeCustomerId))
            .first();

        if (user) {
            await ctx.db.patch(user._id, {
                subscriptionTier: "free",
                subscriptionStatus: "canceled",
            });
        }
    },
});

// ═══════════════════════════════════════════════════════════════
// WEBHOOK EVENT TRACKING (Idempotency)
// ═══════════════════════════════════════════════════════════════

/**
 * Check if webhook event was already processed
 * Returns true if already processed, false if new
 */
export const checkAndMarkWebhookEvent = internalMutation({
    args: {
        eventId: v.string(),
        type: v.string(),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query("webhook_events")
            .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
            .first();

        if (existing) {
            return true; // Already processed
        }

        // Mark as processing
        await ctx.db.insert("webhook_events", {
            eventId: args.eventId,
            type: args.type,
            status: "processing",
            processedAt: Date.now(),
        });

        return false; // New event, proceed with processing
    },
});

/**
 * Mark webhook event as completed
 */
export const markWebhookProcessed = internalMutation({
    args: { eventId: v.string() },
    handler: async (ctx, args) => {
        const event = await ctx.db
            .query("webhook_events")
            .withIndex("by_event_id", (q) => q.eq("eventId", args.eventId))
            .first();

        if (event) {
            await ctx.db.patch(event._id, { status: "processed" });
        }
    },
});
