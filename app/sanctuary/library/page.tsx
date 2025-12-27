"use client";

import React from 'react';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from 'next/link';
import { Play } from 'lucide-react';
import EpisodeCard from "@/components/library/EpisodeCard";

export default function LibraryPage() {
    const libraryState = useQuery(api.library.getLibraryState);

    if (libraryState === undefined) {
        return <div className="min-h-screen bg-stone-950 flex items-center justify-center text-emerald-900/50 font-mono text-xs animate-pulse">ESTABLISHING UPLINK...</div>;
    }

    const { heroSignal, signals } = libraryState;

    return (
        <div className="min-h-screen bg-stone-950 text-stone-300 font-sans selection:bg-emerald-900/30 selection:text-emerald-50 overflow-x-hidden">

            {/* ════════════════════════════════════════════════════
                SERIES HERO (The Silent Archive)
            ════════════════════════════════════════════════════ */}
            <div className="relative min-h-[80vh] w-full flex items-center">
                {/* Background Atmosphere */}
                <div className="absolute inset-0 bg-stone-950">
                    <div className="absolute inset-0 bg-gradient-to-br from-stone-900/20 via-stone-950 to-stone-950" />
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-10" />
                </div>

                <div className="relative z-10 w-full max-w-7xl mx-auto px-6 md:px-12 py-20 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">

                    {/* LEFT: Key Art (Poster) - The Bunker Image */}
                    <div className="md:col-span-4 lg:col-span-3">
                        <div className="relative aspect-[2/3] w-full max-w-[280px] bg-stone-900 rounded-lg shadow-2xl overflow-hidden border border-white/5 group mx-auto">
                            <img
                                src="https://res.cloudinary.com/dptqxjhb8/image/upload/v1766777168940.png"
                                alt="The Truth Lies Buried"
                                className="absolute inset-0 w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                        </div>
                    </div>

                    {/* RIGHT: Series Metadata (Text in Glassmorphic Card) */}
                    <div className="md:col-span-8 lg:col-span-9 flex flex-col justify-center">
                        <div className="p-8 md:p-12 bg-stone-900/40 backdrop-blur-xl border border-white/5 rounded-2xl shadow-2xl">

                            {/* Series Header */}
                            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mb-6 text-xs text-stone-500 font-mono uppercase tracking-widest">
                                <span className="text-emerald-500">Season Zero: The Buried Protocol</span>
                                <span>Sci-Fi</span>
                                <span>Mystery</span>
                                <span>1998-2026</span>
                            </div>

                            {/* Title (Text-based) */}
                            <h1 className="text-4xl md:text-6xl lg:text-7xl font-serif text-white font-bold leading-[0.9] mb-8 tracking-tight">
                                THE SILENT ARCHIVE
                            </h1>

                            <p className="text-lg md:text-xl text-stone-400 max-w-2xl mb-10 leading-relaxed font-serif">
                                Fiction recovered from a system that remembers too much. Eleanor enters a bunker she was told was empty, only to find the machines are still listening.
                            </p>

                            {/* Primary Action */}
                            {heroSignal ? (
                                <Link
                                    href={`/sanctuary/library/reader/${heroSignal.slug}`}
                                    className="inline-flex items-center gap-4 px-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white text-base font-bold tracking-widest uppercase rounded shadow-[0_0_40px_rgba(16,185,129,0.3)] hover:shadow-[0_0_60px_rgba(16,185,129,0.5)] transition-all transform hover:-translate-y-1"
                                >
                                    <Play className="w-6 h-6 fill-current" />
                                    {heroSignal.userProgress?.progress > 0
                                        ? `Resume Episode ${heroSignal.episode}`
                                        : `Play Episode ${heroSignal.episode}`
                                    }
                                </Link>
                            ) : (
                                <div className="inline-flex px-8 py-4 bg-stone-800 text-stone-500 rounded font-mono uppercase tracking-widest cursor-not-allowed">
                                    Offline
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════
                TRANSMISSION LOG (Episode List)
            ════════════════════════════════════════════════════ */}
            <div className="relative z-20 pb-20 pl-6 md:pl-12">
                <h3 className="text-lg text-stone-500 font-mono uppercase tracking-widest mb-8 flex items-center gap-4">
                    <span className="w-8 h-px bg-stone-700" />
                    Transmission Log
                    <span className="w-full h-px bg-stone-800/50" />
                </h3>

                <div className="flex gap-6 overflow-x-auto pb-12 pr-12 scrollbar-none snap-x">
                    {signals.map((signal) => (
                        <div key={signal._id} className="snap-start shrink-0">
                            <EpisodeCard signal={signal} />
                        </div>
                    ))}

                    {/* Placeholder for "Coming Soon" */}
                    <div className="w-64 h-96 shrink-0 bg-stone-900/30 rounded-lg border border-white/5 flex items-center justify-center border-dashed">
                        <span className="font-mono text-xs text-stone-600 uppercase tracking-widest">
                            Awaiting Signal...
                        </span>
                    </div>
                </div>
            </div>

        </div>
    );
}
