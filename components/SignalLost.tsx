"use client";
import { useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { motion } from "framer-motion";
import { useState } from "react";

export function SignalLost() {
    // 1. Hook up the Convex Action
    const createSession = useAction(api.stripe.createCheckoutSession);
    const [loading, setLoading] = useState(false);

    const handleSubscribe = async () => {
        setLoading(true);
        try {
            // 2. Call the backend - using TEST mode price
            // Pass current URL so user returns here after payment
            const returnUrl = typeof window !== 'undefined' ? window.location.href.split('?')[0] : undefined;
            const { url } = await createSession({
                priceId: "price_1SjhYIFkJMEwhRrU1cDkQVMI",
                mode: "payment",
                returnUrl
            });

            // 3. Redirect to Stripe
            if (url) window.location.href = url;
        } catch (error) {
            console.error("Checkout failed:", error);
            alert("System Error: Unable to establish uplink.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="relative z-50 w-full p-8 mt-12 border-t-2 border-red-900 bg-black/95 backdrop-blur-md">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, ease: "circOut" }}
                className="max-w-2xl mx-auto text-center space-y-6"
            >
                <div className="flex items-center justify-center space-x-2 text-red-600 animate-pulse">
                    <span className="w-2 h-2 bg-red-600 rounded-full" />
                    <h2 className="font-mono text-sm tracking-[0.2em] uppercase">Signal Lost</h2>
                </div>

                <h3 className="font-serif text-3xl text-red-500">Transmission Interrupted</h3>
                <p className="font-mono text-xs text-red-800/80">
                    ENCRYPTION LEVEL INCREASED AT SECTOR 7-G. AUTHORIZATION REQUIRED.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                    <button
                        disabled={loading}
                        onClick={handleSubscribe}
                        className="group relative px-8 py-3 bg-red-950/30 border border-red-900 text-red-500 font-mono text-sm hover:bg-red-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <span className="absolute inset-0 w-full h-full border-t border-b border-transparent group-hover:border-red-500/50 scale-x-0 group-hover:scale-x-100 transition-transform duration-500" />
                        {loading ? "INITIALIZING UPLINK..." : "[ ESTABLISH UPLINK // £0.99 ]"}
                    </button>
                </div>
            </motion.div>
        </div>
    );
}

/**
 * Provisioning State — Show while webhook processes
 */
export function ProvisioningState() {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 text-center"
        >
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full mb-6"
            />
            <div className="flex items-center gap-2 text-emerald-500 mb-2">
                <span className="font-mono text-sm tracking-wider">RE-ROUTING ENCRYPTION</span>
            </div>
            <p className="font-mono text-xs text-slate-600">
                ESTABLISHING SECURE CHANNEL...
            </p>
        </motion.div>
    );
}
