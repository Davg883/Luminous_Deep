"use client";

import { useRef, useEffect, useState, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import Link from 'next/link';
import GlitchGate from "@/components/narrative/GlitchGate";
import { Loader2, ChevronRight, Clock, ArrowLeft } from "lucide-react";

export default function SignalReaderPage() {
    const params = useParams();
    const router = useRouter();
    // Ensure slug is a string
    const slug = typeof params?.slug === 'string' ? params.slug : null;

    // 1. Fetch Data
    const signal = useQuery(api.public.signals.getSignal, slug ? { slug } : "skip");
    const libraryState = useQuery(api.library.getLibraryState);
    const saveProgress = useMutation(api.library.saveProgress);

    // 2. State
    const [progress, setProgress] = useState(0);
    const [isCompleted, setIsCompleted] = useState(false);
    const containerRef = useRef<HTMLElement>(null);

    // 3. Derived Logic: Read Time
    const readTime = useMemo(() => {
        if (!signal?.content) return 0;
        const wordCount = signal.content.split(/\s+/).length;
        return Math.ceil(wordCount / 225);
    }, [signal?.content]);

    // 4. Derived Logic: Find Next Episode
    const nextEpisode = useMemo(() => {
        if (!signal || !libraryState) return null;

        // Find current context (Is it a Myth? Signal? Reflection?)
        let contextList = [];
        if (signal.stratum === "myth") contextList = libraryState.myths;
        else if (signal.stratum === "reflection") contextList = libraryState.reflections;
        else contextList = libraryState.seasonZero; // Default to Season 0

        // Find index
        const currentIndex = contextList.findIndex(s => s._id === signal._id);

        // Return next if exists
        if (currentIndex !== -1 && currentIndex < contextList.length - 1) {
            return contextList[currentIndex + 1];
        }
        return null;
    }, [signal, libraryState]);

    // 5. Scroll Tracker
    useEffect(() => {
        const handleScroll = () => {
            const totalHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrollPosition = window.scrollY;

            // Calculate percentage (0-100)
            const currentProgress = Math.min(100, Math.max(0, (scrollPosition / totalHeight) * 100));
            setProgress(currentProgress);

            // Check completion (90% read counts as done)
            if (currentProgress > 90 && !isCompleted) {
                setIsCompleted(true);
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, [isCompleted]);

    // 6. Save Progress Throttled
    useEffect(() => {
        if (!signal) return;

        const timeout = setTimeout(() => {
            saveProgress({
                signalId: signal._id,
                progress: Math.round(progress),
                isCompleted: isCompleted
            });
        }, 1000); // Debounce saves

        return () => clearTimeout(timeout);
    }, [progress, isCompleted, signal]);


    if (signal === undefined) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center">
                <div className="flex flex-col items-center gap-4 text-emerald-900/50">
                    <Loader2 className="w-8 h-8 animate-spin" />
                    <span className="font-mono text-xs tracking-widest uppercase">Acquiring Signal...</span>
                </div>
            </div>
        );
    }

    if (signal === null) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center text-stone-600">
                <div className="text-center font-mono space-y-4">
                    <div className="text-4xl">404</div>
                    <div className="text-xs uppercase tracking-[0.2em]">Signal Lost</div>
                    <div className="text-[10px] bg-stone-900 p-2 rounded text-stone-500">
                        Target: {slug}
                    </div>
                    <Link href="/sanctuary/library" className="text-xs text-emerald-600 hover:text-emerald-500 underline">
                        Return to Archive
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-stone-950 text-stone-300 font-serif selection:bg-emerald-900/30 selection:text-emerald-50 pb-32">

            {/* Sticky Header */}
            <div className="sticky top-0 z-40 bg-stone-950/80 backdrop-blur-md border-b border-white/5 px-6 py-3 transition-all duration-500">
                <div className="max-w-4xl mx-auto flex justify-between items-center font-mono text-[10px] uppercase tracking-widest text-emerald-600/60">
                    <Link href="/sanctuary/library" className="hover:text-emerald-400 flex items-center gap-2 transition-colors">
                        <ArrowLeft className="w-3 h-3" /> ARCHIVE
                    </Link>
                    <span className="flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        DURATION: {readTime} MIN
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
                            Season {signal.season} • Episode {signal.episode}
                        </span>
                        <span className="font-serif text-sm text-stone-300 truncate max-w-[200px]">
                            {signal.title}
                        </span>
                    </div>
                    <div className="md:hidden font-mono text-xs text-stone-400">
                        EP.{signal.episode.toString().padStart(2, '0')}
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
                    {nextEpisode ? (
                        <Link
                            href={`/sanctuary/library/reader/${nextEpisode.slug}`}
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
