"use client";

import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import SceneStage from "@/components/narrative/SceneStage";
import Atmosphere from "@/components/layout/Atmosphere";
import RoomSelector from "@/components/narrative/RoomSelector";
import { useAudioSovereign } from "@/components/narrative/AudioSovereign";
import Link from "next/link";
import { Volume2 } from "lucide-react";
import clsx from "clsx";

export default function Home() {
    const scene = useQuery(api.public.scenes.getScene, { slug: "home" });
    const { isMuted, activateSanctuary: activateAudio } = useAudioSovereign();
    const [isRoomSelectorOpen, setIsRoomSelectorOpen] = useState(false);

    // Handle Escape key to close room selector
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === "Escape" && isRoomSelectorOpen) {
                setIsRoomSelectorOpen(false);
            }
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [isRoomSelectorOpen]);

    if (!scene) {
        return (
            <div className="flex items-center justify-center h-screen w-full bg-sand">
                <div className="w-8 h-8 border-2 border-driftwood/20 border-t-driftwood rounded-full animate-spin" />
            </div>
        );
    }

    const isAudioActive = !isMuted;

    return (
        <main className="relative w-full h-screen overflow-hidden">
            <Atmosphere domain="home" />

            {/* Video Background */}
            <SceneStage mediaUrl={scene.backgroundMediaUrl} />

            {/* Glassmorphic Gradient Vignette - Left side contrast */}
            <div
                className={clsx(
                    "absolute inset-0 z-10 pointer-events-none transition-all duration-500",
                    isRoomSelectorOpen && "blur-sm"
                )}
                style={{
                    background: 'linear-gradient(to right, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.35) 35%, transparent 60%)',
                }}
            />

            {/* Hero Typography Overlay */}
            <div
                className={clsx(
                    "absolute inset-0 z-20 flex flex-col justify-center p-12 md:p-16 lg:p-20 transition-all duration-500",
                    isRoomSelectorOpen && "blur-md opacity-30 pointer-events-none"
                )}
            >
                {/* Main Headline */}
                <h1
                    className="font-serif text-5xl md:text-6xl lg:text-7xl text-white leading-tight tracking-tight animate-in fade-in slide-in-from-left-4 duration-1000"
                    style={{
                        textShadow: '0 4px 24px rgba(0,0,0,0.4), 0 2px 8px rgba(0,0,0,0.3)',
                    }}
                >
                    The Luminous Deep
                </h1>

                {/* Sub-headline */}
                <p
                    className="font-sans text-lg md:text-xl text-white/80 mt-4 md:mt-6 max-w-xl tracking-wide leading-relaxed animate-in fade-in slide-in-from-left-4 duration-1000 delay-200"
                    style={{
                        textShadow: '0 2px 12px rgba(0,0,0,0.3)',
                    }}
                >
                    Stories, systems, and quiet intelligence from the edge of the island.
                </p>

                {/* Invitation Navigation */}
                <nav className="mt-10 md:mt-14 flex items-center gap-4 md:gap-6 animate-in fade-in slide-in-from-left-4 duration-1000 delay-500">
                    {/* Begin - Links to Workshop */}
                    <Link
                        href="/workshop"
                        className="font-serif text-lg md:text-xl text-white hover:text-sea transition-colors duration-300"
                        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                    >
                        Begin
                    </Link>

                    <span className="text-white/40 select-none">•</span>

                    {/* The Journey - Opens Room Selector */}
                    <button
                        onClick={() => setIsRoomSelectorOpen(true)}
                        className="font-serif text-lg md:text-xl text-white hover:text-sea transition-colors duration-300"
                        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                    >
                        The Journey
                    </button>

                    <span className="text-white/40 select-none">•</span>

                    {/* Listen - Toggles Ambient Audio */}
                    <button
                        onClick={activateAudio}
                        className={clsx(
                            "font-serif text-lg md:text-xl transition-all duration-300 flex items-center gap-2",
                            isAudioActive
                                ? "text-sea"
                                : "text-white hover:text-sea"
                        )}
                        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                    >
                        Listen
                        {/* Speaker Icon - Visible when audio is active */}
                        <span
                            className={clsx(
                                "transition-all duration-500",
                                isAudioActive
                                    ? "opacity-100 scale-100"
                                    : "opacity-0 scale-75"
                            )}
                        >
                            <Volume2
                                size={18}
                                className={clsx(
                                    "transition-all duration-300",
                                    isAudioActive && "animate-pulse"
                                )}
                            />
                        </span>
                        {/* Subtle glow when active */}
                        {isAudioActive && (
                            <span
                                className="absolute -inset-2 rounded-lg opacity-20 blur-md -z-10"
                                style={{ backgroundColor: 'var(--sea)' }}
                            />
                        )}
                    </button>
                </nav>
            </div>

            {/* Subtle bottom gradient for depth */}
            <div
                className={clsx(
                    "absolute bottom-0 left-0 right-0 h-32 z-10 pointer-events-none transition-all duration-500",
                    isRoomSelectorOpen && "blur-sm"
                )}
                style={{
                    background: 'linear-gradient(to top, rgba(0,0,0,0.3) 0%, transparent 100%)',
                }}
            />

            {/* Room Selector Modal */}
            <RoomSelector
                isOpen={isRoomSelectorOpen}
                onClose={() => setIsRoomSelectorOpen(false)}
            />
        </main>
    );
}
