"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import Link from 'next/link';
import GlitchGate from "@/components/narrative/GlitchGate";
import { Loader2, ChevronRight, Clock, ArrowLeft, Volume2, VolumeX, Music } from "lucide-react";

export default function SignalReaderPage() {
    const params = useParams();
    const router = useRouter();
    // Ensure slug is a string
    const slug = typeof params?.slug === 'string' ? params.slug : null;

    // 1. Fetch Data
    const signal = useQuery(api.public.signals.getSignal, slug ? { slug } : "skip");
    const libraryState = useQuery(api.library.getLibraryState);
    const completeTransmission = useMutation(api.library.completeTransmission);
    const saveProgress = useMutation(api.library.saveProgress);

    // 2. State
    const [progress, setProgress] = useState(0);
    const [isCompleted, setIsCompleted] = useState(false);
    const containerRef = useRef<HTMLElement>(null);

    // 3. Audio State
    const [isAudioPlaying, setIsAudioPlaying] = useState(false);
    const [audioVolume, setAudioVolume] = useState(0.4);
    const [hasInteracted, setHasInteracted] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    // 4. Derived Logic: Read Time (200 wpm)
    const readTime = useMemo(() => {
        if (!signal?.content) return 0;
        const wordCount = signal.content.split(/\s+/).length;
        return Math.ceil(wordCount / 200);
    }, [signal?.content]);

    // 5. Next Episode from Backend
    // Using pre-calculated nextSlug from the query
    // @ts-ignore
    const nextSlug = signal?.nextSlug;

    // 6. Audio Initialization & Cleanup
    useEffect(() => {
        if (signal?.ambientAudioUrl && !audioRef.current) {
            audioRef.current = new Audio(signal.ambientAudioUrl);
            audioRef.current.loop = true;
            audioRef.current.volume = 0;
            audioRef.current.preload = "auto";
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.src = "";
                audioRef.current = null;
            }
        };
    }, [signal?.ambientAudioUrl]);

    // Audio toggle handler
    const toggleAudio = useCallback(() => {
        if (!audioRef.current || !signal?.ambientAudioUrl) return;

        if (!hasInteracted) {
            setHasInteracted(true);
        }

        if (isAudioPlaying) {
            // Fade out
            const fadeOut = setInterval(() => {
                if (audioRef.current && audioRef.current.volume > 0.02) {
                    audioRef.current.volume = Math.max(0, audioRef.current.volume - 0.05);
                } else {
                    if (audioRef.current) {
                        audioRef.current.pause();
                        audioRef.current.volume = 0;
                    }
                    clearInterval(fadeOut);
                }
            }, 50);
            setIsAudioPlaying(false);
        } else {
            // Play with fade in
            audioRef.current.volume = 0;
            audioRef.current.play().catch(() => { });
            setIsAudioPlaying(true);

            // Fade in
            let vol = 0;
            const fadeIn = setInterval(() => {
                vol += 0.05;
                if (audioRef.current && vol < audioVolume) {
                    audioRef.current.volume = vol;
                } else {
                    if (audioRef.current) audioRef.current.volume = audioVolume;
                    clearInterval(fadeIn);
                }
            }, 50);
        }
    }, [isAudioPlaying, hasInteracted, audioVolume, signal?.ambientAudioUrl]);

    // 7. Scroll Tracker & Completion
    useEffect(() => {
        const handleScroll = () => {
            if (!containerRef.current) return;

            // Calculate progress based on container or window
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPosition = window.scrollY;
            const currentProgress = Math.min(100, Math.max(0, (scrollPosition / totalHeight) * 100));
            setProgress(currentProgress);

            if (currentProgress > 90 && !isCompleted && signal) {
                setIsCompleted(true);
                // Fire completion mutation once
                completeTransmission({ signalId: signal._id });
            }
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [isCompleted, signal]);

    // 8. Save Intermediate Progress Throttled
    useEffect(() => {
        if (!signal || isCompleted) return; // Don't save if completed (handled by other mutation)

        const timeout = setTimeout(() => {
            if (progress > 5 && progress < 90) {
                saveProgress({
                    signalId: signal._id,
                    progress: Math.round(progress),
                    isCompleted: false
                });
            }
        }, 2000); // Debounce saves more aggressively

        return () => clearTimeout(timeout);
    }, [progress, isCompleted, signal]);

    // ... (keep existing render logic for loading/404)

    if (signal === undefined) { /* ... */ return <div className="min-h-screen bg-stone-950 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-emerald-900" /></div>; }
    if (signal === null) { /* ... */ return <div>404</div>; }

    return (
        <div className="min-h-screen bg-stone-950 text-stone-300 font-serif selection:bg-emerald-900/30 selection:text-emerald-50 pb-32">

            {/* Floating Audio Control (only if signal has audio) */}
            {signal.ambientAudioUrl && (
                <button
                    onClick={toggleAudio}
                    className={`fixed top-6 right-6 z-50 p-3 rounded-full backdrop-blur-xl transition-all duration-300 group ${isAudioPlaying
                            ? 'bg-cyan-500/20 border border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.3)]'
                            : 'bg-black/40 border border-white/20 hover:border-cyan-500/30'
                        }`}
                    aria-label={isAudioPlaying ? "Mute ambient audio" : "Play ambient audio"}
                >
                    {/* Ripple effect when playing */}
                    {isAudioPlaying && (
                        <>
                            <span className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping" style={{ animationDuration: '2s' }} />
                            <span className="absolute inset-[-4px] rounded-full border border-cyan-500/30 animate-pulse" />
                        </>
                    )}

                    {/* Icon */}
                    {isAudioPlaying ? (
                        <Volume2 className="w-5 h-5 text-cyan-400 relative z-10" />
                    ) : (
                        <VolumeX className="w-5 h-5 text-white/60 group-hover:text-cyan-400 relative z-10 transition-colors" />
                    )}
                </button>
            )}

            {/* First-time audio prompt */}
            {signal.ambientAudioUrl && !hasInteracted && (
                <div className="fixed top-16 right-6 z-40 whitespace-nowrap animate-pulse">
                    <span className="text-[9px] text-cyan-500/60 font-mono tracking-wide flex items-center gap-1">
                        <Music className="w-3 h-3" /> AMBIENT AUDIO AVAILABLE
                    </span>
                </div>
            )}

            {/* Sticky Header */}
            <div className="sticky top-0 z-40 bg-stone-950/80 backdrop-blur-md border-b border-white/5 px-6 py-3 transition-all duration-500">
                <div className="max-w-4xl mx-auto flex justify-between items-center font-mono text-[10px] uppercase tracking-widest text-emerald-600/60">
                    <Link href="/sanctuary/library" className="hover:text-emerald-400 flex items-center gap-2 transition-colors">
                        <ArrowLeft className="w-3 h-3" /> ARCHIVE
                    </Link>
                    <span className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        [ DECRYPT_TIME: {readTime} MIN ]
                    </span>
                </div>
            </div>

            <main className="max-w-prose mx-auto px-6 py-20" ref={containerRef}>
                <article>
                    <header className="mb-12 text-center">
                        <div className="font-mono text-xs text-stone-500 mb-4 uppercase tracking-[0.2em]">
                            Season {signal.season} • Episode {signal.episode}
                        </div>
                        <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-stone-100 to-stone-500 mb-6 font-serif">
                            {signal.title}
                        </h1>
                        <div className="w-24 h-px bg-gradient-to-r from-transparent via-emerald-900/50 to-transparent mx-auto" />
                    </header>

                    <div className="prose prose-invert prose-stone prose-lg max-w-none">
                        <GlitchGate
                            content={signal.content}
                            isLocked={signal.isLocked}
                            glitchPoint={signal.glitchPoint}
                        />
                    </div>
                </article>
            </main>

            {/* Footer / Status */}
            <footer className="py-24 text-center border-t border-white/5 mt-20 pb-40">
                <div className="font-mono text-[10px] text-stone-700 uppercase tracking-widest">
                    End of Transmission
                </div>
            </footer>

            {/* COMMS BAR (Fixed Footer) */}
            <div className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur-xl bg-black/80 border-t border-white/10 px-6 py-4">
                <div className="max-w-4xl mx-auto flex items-center justify-between gap-8">
                    {/* LEFT: Episode Info */}
                    <div className="hidden md:flex flex-col">
                        <span className="font-mono text-[10px] text-stone-500 uppercase tracking-widest">
                            S{signal.season} • E{signal.episode}
                        </span>
                        <span className="font-serif text-sm text-stone-300 truncate max-w-[200px]">
                            {signal.title}
                        </span>
                    </div>

                    {/* CENTER: Progress Bar */}
                    <div className="flex-1 max-w-md flex flex-col gap-2 group cursor-pointer">
                        <div className="flex justify-between text-[9px] font-mono text-stone-600 uppercase tracking-wider group-hover:text-emerald-500/80 transition-colors">
                            <span>Signal Integrity {isCompleted && "(DECRYPTED)"}</span>
                            <span>{Math.round(progress)}%</span>
                        </div>
                        <div className="h-1 bg-stone-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-300 ${isCompleted ? 'bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.5)]' : 'bg-emerald-600/50'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    </div>

                    {/* RIGHT: Next Action */}
                    {nextSlug ? (
                        <Link
                            href={`/sanctuary/library/reader/${nextSlug}`}
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-emerald-900/30 border border-white/5 hover:border-emerald-500/30 rounded transition-colors group"
                        >
                            <span className="font-mono text-[10px] text-stone-400 uppercase tracking-widest group-hover:text-emerald-400">
                                Next Signal
                            </span>
                            <ChevronRight className="w-4 h-4 text-stone-500 group-hover:text-emerald-400 transition-colors" />
                        </Link>
                    ) : (
                        <Link
                            href="/sanctuary/library"
                            className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/5 rounded transition-colors group"
                        >
                            <span className="font-mono text-[10px] text-stone-400 uppercase tracking-widest group-hover:text-white">
                                Return to Archive
                            </span>
                        </Link>
                    )}
                </div>
            </div>
        </div>
    );
}
