"use client";

import React, { useRef, useState, useEffect } from 'react';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from 'next/link';
import { Play, ChevronRight, ChevronLeft, Sparkles, Clock, Lock } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import EpisodeCard from "@/components/library/EpisodeCard";

export default function LibraryPage() {
    const libraryState = useQuery(api.library.getLibraryState);

    // Initial loading state
    if (libraryState === undefined) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-pulse mb-4">
                        <Sparkles className="w-12 h-12 text-emerald-500/50 mx-auto" />
                    </div>
                    <span className="text-emerald-900/50 font-mono text-xs uppercase tracking-widest">
                        DECRYPTING ARCHIVE...
                    </span>
                </div>
            </div>
        );
    }

    const { continueReading, myths, seasonZero, reflections } = libraryState;

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-slate-200 overflow-x-hidden font-sans selection:bg-emerald-900/30 selection:text-emerald-50 pb-32">

            {/* ════════════════════════════════════════════════════
                ROW 1: CONTINUE TRANSMISSION (The Hook)
            ════════════════════════════════════════════════════ */}
            {continueReading && (
                <div className="relative w-full h-[60vh] max-h-[600px] flex items-center overflow-hidden">
                    {/* Background Hero Image */}
                    <div className="absolute inset-0 z-0">
                        <img
                            src={continueReading.coverImage || "https://res.cloudinary.com/dptqxjhb8/image/upload/v1735000000/default_cover_xk2m3n.jpg"}
                            alt="Background"
                            className="w-full h-full object-cover opacity-40 blur-sm scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent" />
                        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
                    </div>

                    <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 flex items-end pb-12">
                        <div className="max-w-2xl">
                            <span className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 text-[10px] font-mono font-bold uppercase tracking-widest mb-4">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Resume Transmission
                            </span>

                            <h1 className="text-4xl md:text-6xl font-serif text-white font-bold leading-tight mb-4">
                                {continueReading.title}
                            </h1>

                            <p className="text-slate-400 text-lg mb-8 line-clamp-2 max-w-xl">
                                {continueReading.summaryShort || continueReading.summaryLong || "The signal awaits your return. Decryption is incomplete."}
                            </p>

                            <div className="flex items-center gap-6">
                                <Link
                                    href={`/sanctuary/library/reader/${continueReading.slug}`}
                                    className="flex items-center gap-3 px-8 py-4 bg-white text-black hover:bg-emerald-400 transition-colors rounded font-bold uppercase tracking-wider text-sm shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:shadow-[0_0_40px_rgba(16,185,129,0.4)]"
                                >
                                    <Play className="w-5 h-5 fill-current" />
                                    Resume S{continueReading.season} E{continueReading.episode}
                                </Link>

                                <div className="flex flex-col gap-1">
                                    <div className="flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-wider">
                                        <span>Decryption Progress</span>
                                        <span className="text-emerald-500">{Math.round(continueReading.userProgress?.progress || 0)}%</span>
                                    </div>
                                    <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500"
                                            style={{ width: `${continueReading.userProgress?.progress || 0}%` }}
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SPACER if no hero */}
            {!continueReading && <div className="h-24" />}

            <div className="space-y-12 relative z-20 -mt-10 px-6 md:px-12">

                {/* ════════════════════════════════════════════════════
                    ROW 2: FOUNDATIONAL MYTHS
                ════════════════════════════════════════════════════ */}
                <ContentRow
                    title="Foundational Myths"
                    items={myths}
                    iconColor="text-violet-500"
                />

                {/* ════════════════════════════════════════════════════
                    ROW 3: SEASON ZERO (The Buried Protocol)
                ════════════════════════════════════════════════════ */}
                <ContentRow
                    title="Season Zero: The Buried Protocol"
                    items={seasonZero}
                    iconColor="text-emerald-500"
                />

                {/* ════════════════════════════════════════════════════
                    ROW 4: REFLECTIONS
                ════════════════════════════════════════════════════ */}
                <ContentRow
                    title="Reflections: Eleanor's Archive"
                    items={reflections}
                    iconColor="text-blue-500"
                />

            </div>
        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// HORIZONTAL ROW COMPONENT
// ═══════════════════════════════════════════════════════════════

interface ContentRowProps {
    title: string;
    items: any[];
    iconColor?: string;
}

function ContentRow({ title, items, iconColor = "text-emerald-500" }: ContentRowProps) {
    const rowRef = useRef<HTMLDivElement>(null);
    const [showLeftArrow, setShowLeftArrow] = useState(false);
    const [showRightArrow, setShowRightArrow] = useState(true);

    const checkScroll = () => {
        if (!rowRef.current) return;
        const { scrollLeft, scrollWidth, clientWidth } = rowRef.current;
        setShowLeftArrow(scrollLeft > 0);
        setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
    };

    useEffect(() => {
        checkScroll();
        window.addEventListener('resize', checkScroll);
        return () => window.removeEventListener('resize', checkScroll);
    }, [items]);

    const scroll = (direction: 'left' | 'right') => {
        if (!rowRef.current) return;
        const scrollAmount = window.innerWidth * 0.7; // Scroll 70% of screen width
        rowRef.current.scrollBy({
            left: direction === 'left' ? -scrollAmount : scrollAmount,
            behavior: 'smooth'
        });
    };

    if (items.length === 0) return null;

    return (
        <div className="relative group/row">
            {/* Header */}
            <div className="flex items-center gap-3 mb-4 group-hover/row:translate-x-1 transition-transform duration-300">
                <span className={clsx("text-lg font-bold font-mono", iconColor)}>N</span>
                <h3 className="text-xl md:text-2xl font-serif text-slate-200 font-bold tracking-tight">
                    {title}
                </h3>
            </div>

            {/* Scroll Buttons - Visible on Row Hover */}
            {showLeftArrow && (
                <button
                    onClick={() => scroll('left')}
                    className="absolute left-0 top-[55%] -translate-y-1/2 z-30 p-3 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full hover:bg-emerald-600 hover:text-white hover:border-emerald-500 text-white opacity-0 group-hover/row:opacity-100 transition-all duration-300 hidden md:block"
                >
                    <ChevronLeft className="w-8 h-8" />
                </button>
            )}

            {showRightArrow && (
                <button
                    onClick={() => scroll('right')}
                    className="absolute right-0 top-[55%] -translate-y-1/2 z-30 p-3 bg-black/50 backdrop-blur-sm border border-white/10 rounded-full hover:bg-emerald-600 hover:text-white hover:border-emerald-500 text-white opacity-0 group-hover/row:opacity-100 transition-all duration-300 hidden md:block"
                >
                    <ChevronRight className="w-8 h-8" />
                </button>
            )}

            {/* Horizontal Scroll Container */}
            <div
                ref={rowRef}
                onScroll={checkScroll}
                className="flex gap-4 overflow-x-auto pb-8 scrollbar-hide snap-x px-1 -mx-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {items.map((item) => (
                    <div key={item._id} className="flex-none w-[200px] md:w-[260px] snap-start">
                        <EpisodeCard signal={item} />
                    </div>
                ))}

                {/* Pad end of list */}
                <div className="flex-none w-12" />
            </div>
        </div>
    );
}
