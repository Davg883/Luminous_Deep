"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Terminal } from "lucide-react";
import SceneStage from "@/components/narrative/SceneStage";
import ObjectTrigger from "@/components/narrative/ObjectTrigger";
import RevealCard from "@/components/narrative/RevealCard";
import Atmosphere from "@/components/layout/Atmosphere";
import SanctuaryCompass from "@/components/layout/SanctuaryCompass";
import EdgeNav from "@/components/narrative/EdgeNav";
import { SanctuaryTerminal } from "@/components/narrative/SanctuaryTerminal";
import type { Domain } from "@/lib/types";
import { Id } from "@/convex/_generated/dataModel";

export default function DomainPage() {
    const params = useParams();
    const router = useRouter();
    const domain = (params.domain as string);

    // Redirect luminous-deep to its dedicated page
    useEffect(() => {
        if (domain === "luminous-deep") {
            router.replace("/luminous-deep");
        }
    }, [domain, router]);

    // Strict Domain Validation (luminous-deep has its own dedicated page)
    const validDomains = ["workshop", "study", "boathouse", "home", "lounge", "kitchen", "orangery", "sanctuary"];

    // If it's luminous-deep, show loading while redirect happens
    if (domain === "luminous-deep") {
        return (
            <div className="flex items-center justify-center h-screen bg-[#0a0a12] text-[var(--deep-accent)]">
                <div className="animate-pulse font-mono">Descending to the Control Room...</div>
            </div>
        );
    }

    if (!validDomains.includes(domain)) {
        return (
            <div className="flex items-center justify-center h-screen bg-sand text-driftwood">
                <div className="text-center">
                    <h1 className="text-2xl font-serif mb-2">Unknown Territory</h1>
                    <p className="text-sm opacity-60">The path to "{domain}" does not exist.</p>
                </div>
            </div>
        );
    }

    // Fetch scene by slug == domain (for MVP)
    const validatedDomain = domain as Domain;
    const scene = useQuery(api.public.scenes.getScene, { slug: validatedDomain });
    const objects = useQuery(api.public.scenes.getSceneObjects,
        scene ? { sceneId: scene._id } : "skip"
    );

    // Interactive State
    const [activeRevealId, setActiveRevealId] = useState<Id<"reveals"> | null>(null);
    const [isTerminalOpen, setIsTerminalOpen] = useState(false);

    // Helper to fetch the active reveal details
    const activeReveal = useQuery(api.public.scenes.getReveal,
        activeRevealId ? { revealId: activeRevealId } : "skip"
    );

    // Loading state
    if (scene === undefined) {
        return (
            <div className="flex items-center justify-center h-screen bg-sand text-driftwood">
                <div className="animate-pulse">Locating {domain}...</div>
            </div>
        );
    }

    // Scene not found - "Door is Locked" state
    if (scene === null) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-b from-slate-900 to-slate-950 text-white">
                <div className="text-center">
                    <div className="text-6xl mb-6">🚪</div>
                    <h1 className="text-3xl font-serif mb-4">The Door is Locked</h1>
                    <p className="text-sm opacity-60 max-w-md mb-8">
                        This room hasn't been prepared for visitors yet.
                        Perhaps try another path.
                    </p>
                    <button
                        onClick={() => router.push("/")}
                        className="px-6 py-3 bg-white/10 hover:bg-white/20 rounded-lg transition-colors text-sm"
                    >
                        Return to the Shore
                    </button>
                </div>
            </div>
        );
    }

    // Handle object click - either navigate (portal) or reveal content
    const handleObjectClick = (obj: any) => {
        // Check if this is a transition/portal object with a destination
        if (obj.role === "transition" && obj.destinationSlug) {
            // Special Interception: The Sanctuary requires a rite of passage (Threshold)
            if (obj.destinationSlug === "/sanctuary") {
                router.push("/threshold"); // Route to the cinematic transition
            } else {
                router.push(obj.destinationSlug);
            }
        } else if (obj.revealId) {
            setActiveRevealId(obj.revealId);
        }
    };

    return (
        <>
            {/* Background Atmosphere */}
            <Atmosphere domain={validatedDomain} />

            {/* Main Stage */}
            <SceneStage
                mediaUrl={scene.backgroundMediaUrl}
                isFocused={!!activeRevealId}
                playbackSpeed={scene.playbackSpeed}
                shouldLoop={scene.shouldLoop ?? true}
                glimpseUrl={scene.residentAgent?.glimpseUrl}
            >
                {objects?.map((obj: any, index: number) => (
                    <ObjectTrigger
                        key={obj._id}
                        x={obj.x}
                        y={obj.y}
                        label={obj.name}
                        domain={validatedDomain}
                        isPortal={obj.role === "transition"}
                        onClick={() => handleObjectClick(obj)}
                    />
                ))}
            </SceneStage>

            {/* Navigation */}
            <SanctuaryCompass />
            <EdgeNav currentSlug={validatedDomain} />

            {/* Interaction Modal */}
            <RevealCard
                isOpen={!!activeRevealId && !!activeReveal}
                onClose={() => setActiveRevealId(null)}
                title={activeReveal?.title || "Loading..."}
                content={activeReveal?.content || ""}
                type={activeReveal?.type || "text"}
                mediaUrl={activeReveal?.mediaUrl}
                domain={validatedDomain}
            />

            {/* Terminal Hotspot (Study, Boathouse, Workshop) */}
            {["study", "boathouse", "workshop"].includes(validatedDomain) && (
                <>
                    <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => setIsTerminalOpen(true)}
                        className="fixed bottom-8 right-8 z-[9999] p-4 bg-indigo-600 text-white rounded-full hover:bg-indigo-500 transition-all shadow-2xl border-2 border-white"
                    >
                        <Terminal className="w-6 h-6" />
                    </motion.button>

                    <AnimatePresence>
                        {isTerminalOpen && (
                            <>
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsTerminalOpen(false)}
                                    className="fixed inset-0 z-[90] bg-black/60 backdrop-blur-sm"
                                />
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 pointer-events-none"
                                >
                                    <div className="w-full max-w-2xl pointer-events-auto">
                                        <SanctuaryTerminal />
                                        <button
                                            onClick={() => setIsTerminalOpen(false)}
                                            className="mt-4 mx-auto block text-zinc-400 hover:text-white text-xs uppercase tracking-widest transition-colors"
                                        >
                                            Disconnect
                                        </button>
                                    </div>
                                </motion.div>
                            </>
                        )}
                    </AnimatePresence>
                </>
            )}
        </>
    );
}
