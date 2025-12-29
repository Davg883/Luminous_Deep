"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import Stripe from "stripe";

/**
 * Get Stripe client instance
 * Initialized inside handlers to avoid module-load issues
 */
function getStripe() {
    const apiKey = process.env.STRIPE_SECRET_KEY;
    if (!apiKey) {
        throw new Error("STRIPE_SECRET_KEY not configured");
    }
    return new Stripe(apiKey, {
        apiVersion: "2024-12-18.acacia" as any,
    });
}

/**
 * Create a Stripe Checkout Session
 * Uses lazy customer creation (Hub & Spoke model)
 */
export const createCheckoutSession = action({
    args: {
        priceId: v.string(),
        mode: v.optional(v.union(v.literal("subscription"), v.literal("payment"))),
        returnUrl: v.optional(v.string()), // URL to return to after payment
    },
    handler: async (ctx, args): Promise<{ url: string | null }> => {
        const stripe = getStripe();

        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized: Please sign in to continue");
        }

        // Get user from database
        let user = await ctx.runQuery(internal.users.getCurrentUserInternal, {
            tokenIdentifier: identity.tokenIdentifier,
        });

        // Auto-create user if not found (handles users who signed up before webhook was configured)
        if (!user) {
            console.log("User not found, creating...", identity.tokenIdentifier);
            const userId = await ctx.runMutation(internal.users.upsertUser, {
                tokenIdentifier: identity.tokenIdentifier,
                name: identity.name || "User",
                email: identity.email,
            });

            // Fetch the newly created user
            user = await ctx.runQuery(internal.users.getCurrentUserInternal, {
                tokenIdentifier: identity.tokenIdentifier,
            });

            if (!user) {
                throw new Error("Failed to create user. Please try again.");
            }
        }

        let customerId = user.stripeCustomerId;

        // Check if we need to create a new customer
        // Detect test/live mode mismatch: test customers start with cus_test_, live with cus_
        const isTestMode = process.env.STRIPE_SECRET_KEY?.startsWith("sk_test");
        const existingCustomerIsTest = customerId?.includes("test") || false;
        const needsNewCustomer = !customerId || (isTestMode !== existingCustomerIsTest && customerId);

        if (needsNewCustomer) {
            console.log(`Creating new Stripe customer (test mode: ${isTestMode})`);

            const customer = await stripe.customers.create({
                email: user.email || identity.email,
                name: user.name || identity.name,
                metadata: {
                    convexUserId: user._id,
                    tokenIdentifier: identity.tokenIdentifier,
                },
            });

            customerId = customer.id;

            // Save Stripe customer ID to Convex
            await ctx.runMutation(internal.users.setStripeCustomerId, {
                userId: user._id,
                stripeCustomerId: customerId,
            });

            console.log(`Created Stripe customer ${customerId} for user ${user._id}`);
        }

        // Determine checkout mode
        const checkoutMode = args.mode || "subscription";

        // Create Checkout Session
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        const session = await stripe.checkout.sessions.create({
            customer: customerId,
            payment_method_types: ['card'], // Explicitly specify card payments
            line_items: [
                {
                    price: args.priceId,
                    quantity: 1,
                },
            ],
            mode: checkoutMode,
            success_url: args.returnUrl ? `${args.returnUrl}?success=true` : `${appUrl}/sanctuary/library?success=true`,
            cancel_url: args.returnUrl || `${appUrl}/sanctuary/library`,
            // For subscriptions, allow customer to manage billing
            ...(checkoutMode === "subscription" && {
                subscription_data: {
                    metadata: {
                        convexUserId: user._id,
                    },
                },
            }),
        });

        return { url: session.url };
    },
});

/**
 * Create a Stripe Customer Portal session
 * Allows users to manage their subscription
 */
export const createPortalSession = action({
    args: {},
    handler: async (ctx): Promise<{ url: string | null }> => {
        const stripe = getStripe();

        const identity = await ctx.auth.getUserIdentity();
        if (!identity) {
            throw new Error("Unauthorized");
        }

        const user = await ctx.runQuery(internal.users.getCurrentUserInternal, {
            tokenIdentifier: identity.tokenIdentifier,
        });

        if (!user?.stripeCustomerId) {
            throw new Error("No subscription found");
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

        const session = await stripe.billingPortal.sessions.create({
            customer: user.stripeCustomerId,
            return_url: `${appUrl}/sanctuary/library`,
        });

        return { url: session.url };
    },
});
