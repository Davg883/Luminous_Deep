import { httpRouter } from "convex/server";
import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { Webhook } from "svix";

const http = httpRouter();

// ═══════════════════════════════════════════════════════════════
// CLERK WEBHOOK — User Sync
// ═══════════════════════════════════════════════════════════════

http.route({
    path: "/clerk/webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const payload = await request.text();
        const headers = request.headers;

        const svixId = headers.get("svix-id");
        const svixTimestamp = headers.get("svix-timestamp");
        const svixSignature = headers.get("svix-signature");

        if (!svixId || !svixTimestamp || !svixSignature) {
            return new Response("Missing svix headers", { status: 400 });
        }

        const webhookSecret = process.env.CLERK_WEBHOOK_SECRET;
        if (!webhookSecret) {
            console.error("CLERK_WEBHOOK_SECRET not configured");
            return new Response("Webhook secret not configured", { status: 500 });
        }

        const wh = new Webhook(webhookSecret);

        let evt: any;
        try {
            evt = wh.verify(payload, {
                "svix-id": svixId,
                "svix-timestamp": svixTimestamp,
                "svix-signature": svixSignature,
            });
        } catch (err) {
            console.error("Clerk webhook verification failed:", err);
            return new Response("Webhook verification failed", { status: 400 });
        }

        // Handle user events
        if (evt.type === "user.created" || evt.type === "user.updated") {
            const issuerDomain = process.env.CLERK_JWT_ISSUER_DOMAIN;
            const tokenIdentifier = `${issuerDomain}|${evt.data.id}`;
            const firstName = evt.data.first_name || "";
            const lastName = evt.data.last_name || "";
            const name = `${firstName} ${lastName}`.trim() || "User";
            const email = evt.data.email_addresses?.[0]?.email_address;

            await ctx.runMutation(internal.users.upsertUser, {
                tokenIdentifier,
                name,
                email,
            });

            console.log(`User synced: ${tokenIdentifier}`);
        }

        return new Response(null, { status: 200 });
    }),
});

// ═══════════════════════════════════════════════════════════════
// STRIPE WEBHOOK — Subscription Events
// Note: Stripe signature verification happens in a node action
// because crypto.timingSafeEqual isn't available in Convex httpAction
// ═══════════════════════════════════════════════════════════════

http.route({
    path: "/stripe/webhook",
    method: "POST",
    handler: httpAction(async (ctx, request) => {
        const signature = request.headers.get("stripe-signature");
        const payload = await request.text();

        if (!signature) {
            return new Response("Missing stripe-signature header", { status: 400 });
        }

        // Forward to a Node action for Stripe signature verification
        try {
            const result = await ctx.runAction(internal.stripeWebhook.handleWebhook, {
                payload,
                signature,
            });

            if (!result.success) {
                return new Response(result.error || "Webhook processing failed", { status: 400 });
            }

            return new Response(null, { status: 200 });
        } catch (err: any) {
            console.error("Stripe webhook error:", err);
            return new Response(err.message || "Internal error", { status: 500 });
        }
    }),
});

export default http;
