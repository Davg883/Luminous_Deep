"use node";

import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
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
 * Handle Stripe webhook events
 * Called from http.ts after receiving the raw payload
 */
export const handleWebhook = internalAction({
    args: {
        payload: v.string(),
        signature: v.string(),
    },
    handler: async (ctx, args): Promise<{ success: boolean; error?: string }> => {
        const stripe = getStripe();

        const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error("STRIPE_WEBHOOK_SECRET not configured");
            return { success: false, error: "Webhook secret not configured" };
        }

        let event: Stripe.Event;
        try {
            event = stripe.webhooks.constructEvent(
                args.payload,
                args.signature,
                webhookSecret
            );
        } catch (err: any) {
            console.error("Stripe webhook signature verification failed:", err.message);
            return { success: false, error: "Signature verification failed" };
        }

        // Idempotency check
        const alreadyProcessed = await ctx.runMutation(internal.users.checkAndMarkWebhookEvent, {
            eventId: event.id,
            type: event.type,
        });

        if (alreadyProcessed) {
            console.log(`Stripe event ${event.id} already processed, skipping`);
            return { success: true };
        }

        try {
            // Handle specific events
            switch (event.type) {
                // ONE-TIME PAYMENT: checkout.session.completed
                case "checkout.session.completed": {
                    const session = event.data.object as Stripe.Checkout.Session;
                    const customerId = session.customer as string;
                    const paymentStatus = session.payment_status;

                    // Only fulfill if payment was successful
                    if (customerId && paymentStatus === "paid") {
                        // For one-time payments, set a long expiry (e.g., 100 years)
                        const endsAt = Date.now() + (100 * 365 * 24 * 60 * 60 * 1000);

                        await ctx.runMutation(internal.users.fulfillSubscription, {
                            stripeCustomerId: customerId,
                            tier: "patron",
                            status: "active",
                            endsAt,
                        });
                        console.log(`One-time payment fulfilled for customer: ${customerId}`);
                    }
                    break;
                }

                // SUBSCRIPTION: invoice.payment_succeeded
                case "invoice.payment_succeeded": {
                    const invoice = event.data.object as Stripe.Invoice;
                    const customerId = invoice.customer as string;
                    const periodEnd = invoice.lines.data[0]?.period?.end;

                    if (customerId && periodEnd) {
                        await ctx.runMutation(internal.users.fulfillSubscription, {
                            stripeCustomerId: customerId,
                            tier: "patron",
                            status: "active",
                            endsAt: periodEnd * 1000, // Convert to milliseconds
                        });
                        console.log(`Subscription fulfilled for customer: ${customerId}`);
                    }
                    break;
                }

                case "customer.subscription.deleted": {
                    const subscription = event.data.object as Stripe.Subscription;
                    const customerId = subscription.customer as string;

                    if (customerId) {
                        await ctx.runMutation(internal.users.revokeSubscription, {
                            stripeCustomerId: customerId,
                        });
                        console.log(`Subscription revoked for customer: ${customerId}`);
                    }
                    break;
                }

                case "customer.subscription.updated": {
                    const subscription = event.data.object as Stripe.Subscription;
                    const customerId = subscription.customer as string;

                    if (customerId) {
                        const status = subscription.status;
                        const tier = status === "active" ? "patron" : "free";
                        const periodEnd = (subscription as any).current_period_end;

                        await ctx.runMutation(internal.users.fulfillSubscription, {
                            stripeCustomerId: customerId,
                            tier: tier as "free" | "patron",
                            status,
                            endsAt: periodEnd ? periodEnd * 1000 : Date.now() + 30 * 24 * 60 * 60 * 1000,
                        });
                        console.log(`Subscription updated for customer: ${customerId}, status: ${status}`);
                    }
                    break;
                }

                default:
                    console.log(`Unhandled Stripe event type: ${event.type}`);
            }

            // Mark as processed
            await ctx.runMutation(internal.users.markWebhookProcessed, {
                eventId: event.id,
            });

            return { success: true };
        } catch (err: any) {
            console.error("Error processing Stripe webhook:", err);
            return { success: false, error: err.message };
        }
    },
});
