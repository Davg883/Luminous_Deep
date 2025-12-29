"use client";

import React from 'react';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Play, ChevronLeft, Sparkles, Lock, CheckCircle2, Clock } from 'lucide-react';
import clsx from 'clsx';

export default function SeriesDetailPage() {
    const params = useParams();
    const slug = typeof params?.seriesSlug === 'string' ? params.seriesSlug : "";

    const data = useQuery(api.public.series.getSeriesBySlug, { slug });

    // Initial loading state
    if (data === undefined) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-pulse mb-4">
                        <Sparkles className="w-12 h-12 text-emerald-500/50 mx-auto" />
                    </div>
                    <span className="text-emerald-900/50 font-mono text-xs uppercase tracking-widest">
                        DECRYPTING SERIES DATA...
                    </span>
                </div>
            </div>
        );
    }

    if (data === null) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center text-slate-500 font-mono">
                SERIES NOT FOUND
            </div>
        );
    }

    const { series, signals } = data;

    // Find first uncompleted episode for "Continue" button
    const firstUncompleted = signals.find(s => !s.userProgress?.isCompleted);
    const heroEpisode = firstUncompleted || signals[0];

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-slate-200 overflow-x-hidden font-sans selection:bg-emerald-900/30 selection:text-emerald-50 pb-32">

            {/* ════════════════════════════════════════════════════
                HERO SECTION
            ════════════════════════════════════════════════════ */}
            <div className="relative w-full h-[70vh] max-h-[800px] flex items-center overflow-hidden">
                {/* Background Hero Image */}
                <div className="absolute inset-0 z-0">
                    <img
                        src={series.coverImage || "https://res.cloudinary.com/dptqxjhb8/image/upload/v1735000000/default_cover_placeholder.jpg"}
                        alt="Background"
                        className="w-full h-full object-cover opacity-30 blur-sm scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0f] via-[#0a0a0f]/60 to-transparent" />
                    <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0f] via-[#0a0a0f]/80 to-transparent" />
                </div>

                <div className="relative z-10 w-full max-w-[1400px] mx-auto px-6 md:px-12 flex items-center h-full pt-20">
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-12 w-full items-center">

                        {/* Poster */}
                        <div className="hidden md:block md:col-span-4 lg:col-span-3">
                            <div className="relative aspect-[2/3] w-full rounded-lg overflow-hidden border border-white/10 shadow-2xl shadow-emerald-900/20 group">
                                <img
                                    src={series.coverImage}
                                    alt={series.title}
                                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                                />
                                {/* Reflection overlay */}
                                <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                        </div>

                        {/* Text */}
                        <div className="md:col-span-8 lg:col-span-7">
                            <Link href="/sanctuary/library" className="inline-flex items-center gap-2 text-xs font-mono text-slate-500 uppercase tracking-widest mb-6 hover:text-emerald-400 transition-colors">
                                <ChevronLeft className="w-3 h-3" /> Back to Archive
                            </Link>

                            <h1 className="text-5xl md:text-7xl font-serif text-white font-bold leading-[0.9] mb-8">
                                {series.title}
                            </h1>

                            <div className="prose prose-invert prose-lg text-slate-400 mb-10 max-w-2xl leading-relaxed">
                                {series.description ? (
                                    series.description.split('\n').map((p: string, i: number) => (
                                        <p key={i} className="mb-4 text-lg">{p}</p>
                                    ))
                                ) : (
                                    <p className="italic opacity-50">No synopsis available.</p>
                                )}
                            </div>

                            {heroEpisode && (
                                <Link
                                    href={`/sanctuary/library/reader/${heroEpisode.slug}`}
                                    className="inline-flex items-center gap-3 px-8 py-4 bg-white text-black hover:bg-emerald-400 hover:text-black rounded font-bold uppercase tracking-wider text-sm shadow-[0_0_30px_rgba(255,255,255,0.1)] hover:shadow-[0_0_40px_rgba(16,185,129,0.4)] transition-all transform hover:-translate-y-1"
                                >
                                    <Play className="w-5 h-5 fill-current" />
                                    {heroEpisode.userProgress?.progress > 0 ? "Resume Episode" : "Start Series"}
                                </Link>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="relative z-20 px-6 md:px-12 -mt-10 md:-mt-20 max-w-[1400px] mx-auto">
                {/* ════════════════════════════════════════════════════
                     TRANSMISSION LOG (Vertical List)
                ════════════════════════════════════════════════════ */}
                <div className="bg-[#0a0a0f]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 md:p-12 mb-20 shadow-2xl">
                    <header className="flex items-center gap-4 mb-10">
                        <div className="h-px bg-white/10 flex-1" />
                        <h3 className="text-xl font-mono text-emerald-500 uppercase tracking-[0.2em] font-bold">
                            Transmission Log
                        </h3>
                        <div className="h-px bg-white/10 flex-1" />
                    </header>

                    <div className="space-y-4">
                        {signals.map((signal, index) => {
                            const isCompleted = signal.userProgress?.isCompleted;
                            const isLocked = signal.isLocked && !isCompleted; // Example logic, normally locked logic is stricter

                            return (
                                <Link
                                    key={signal._id}
                                    href={`/sanctuary/library/reader/${signal.slug}`}
                                    className="group flex items-center gap-6 p-4 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/5 transition-all duration-300"
                                >
                                    {/* Numbering */}
                                    {/* Thumbnail / Numbering */}
                                    <div className="hidden md:block w-16 h-24 shrink-0 bg-slate-800 rounded overflow-hidden border border-white/10 relative group-hover:border-emerald-500/30 transition-colors">
                                        {signal.coverImage ? (
                                            <img
                                                src={signal.coverImage}
                                                alt={signal.title}
                                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center bg-white/5 font-mono text-xl text-slate-600 group-hover:text-emerald-500 transition-colors">
                                                {(index + 1).toString().padStart(2, '0')}
                                            </div>
                                        )}
                                    </div>

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <h4 className="text-lg md:text-xl font-serif font-bold text-slate-200 group-hover:text-emerald-400 transition-colors truncate">
                                                {signal.title}
                                            </h4>
                                            {isCompleted && (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                            )}
                                        </div>
                                        <div className="flex items-center gap-4 text-xs font-mono text-slate-500 uppercase tracking-wider">
                                            <span>S{signal.season} • E{signal.episode}</span>
                                            {signal.userProgress?.progress > 0 && !isCompleted && (
                                                <span className="text-amber-500">
                                                    IN PROGRESS ({signal.userProgress.progress}%)
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Action Icon */}
                                    <div className="opacity-0 group-hover:opacity-100 transition-opacity transform translate-x-4 group-hover:translate-x-0 duration-300">
                                        <div className="p-3 rounded-full bg-emerald-500/10 text-emerald-500">
                                            <Play className="w-5 h-5 fill-current" />
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}

                        {signals.length === 0 && (
                            <div className="text-center py-12 border border-dashed border-white/10 rounded-lg">
                                <span className="text-slate-600 font-mono text-xs">NO SIGNALS INTERCEPTED</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
