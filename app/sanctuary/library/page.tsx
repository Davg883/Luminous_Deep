"use client";

import React from 'react';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import Link from 'next/link';
import { Sparkles, Play, BookOpen } from 'lucide-react';

export default function LibraryPage() {
    const libraryState = useQuery(api.library.getLibraryState);

    if (libraryState === undefined) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-pulse mb-4">
                        <Sparkles className="w-12 h-12 text-emerald-500/50 mx-auto" />
                    </div>
                    <span className="text-emerald-900/50 font-mono text-xs uppercase tracking-widest">
                        ACCESSING ARCHIVE INDEX...
                    </span>
                </div>
            </div>
        );
    }

    const { myths, series } = libraryState;

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-slate-200 p-8 md:p-16 pb-40">
            <header className="mb-20 text-center">
                <h1 className="text-4xl md:text-6xl font-serif text-white font-bold mb-4 tracking-tight">
                    The Sanctuary
                </h1>
                <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">
                    Archive Interface v2.0 // Authorized Personnel Only
                </p>
            </header>

            <div className="max-w-7xl mx-auto space-y-20">

                {/* ROW 1: FOUNDATIONAL MYTHS */}
                <section>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-px flex-1 bg-white/10" />
                        <h2 className="font-mono text-xs text-emerald-500 uppercase tracking-[0.2em]">
                            Foundational Myths
                        </h2>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {myths.map((myth) => (
                            <Link
                                key={myth._id}
                                href={`/sanctuary/library/reader/${myth.slug}`}
                                className="group relative block aspect-[4/3] bg-slate-900 rounded-lg overflow-hidden border border-white/5 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:border-emerald-500/30"
                            >
                                {myth.coverImage ? (
                                    <img
                                        src={myth.coverImage}
                                        alt={myth.title}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                                        <div className="absolute inset-0 bg-[url('https://res.cloudinary.com/dptqxjhb8/image/upload/v1735258900/static_noise_placeholder.png')] opacity-20 mix-blend-overlay" />
                                        <span className="text-slate-600 font-mono text-xs relative z-10">SYSTEM STATIC</span>
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-90 transition-opacity" />

                                <div className="absolute inset-0 p-6 flex flex-col justify-end">
                                    <div className="font-mono text-[10px] text-emerald-500 mb-2 opacity-0 group-hover:opacity-100 transform translate-y-2 group-hover:translate-y-0 transition-all duration-500">
                                        MYTHOLOGY
                                    </div>
                                    <h3 className="text-xl font-serif font-bold text-white mb-2 leading-tight">
                                        {myth.title}
                                    </h3>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono uppercase tracking-wider group-hover:text-emerald-400 transition-colors">
                                        <BookOpen className="w-3 h-3" />
                                        Read Protocol
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {myths.length === 0 && (
                            <div className="col-span-full text-center py-12 border border-dashed border-white/10 rounded-lg">
                                <span className="text-slate-600 font-mono text-xs">NO MYTHS DECRYPTED</span>
                            </div>
                        )}
                    </div>
                </section>

                {/* ROW 2: BROADCAST SERIES */}
                <section>
                    <div className="flex items-center gap-4 mb-8">
                        <div className="h-px flex-1 bg-white/10" />
                        <h2 className="font-mono text-xs text-amber-500 uppercase tracking-[0.2em]">
                            Broadcast Series
                        </h2>
                        <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                        {series.map((s) => (
                            <Link
                                key={s._id}
                                href={`/sanctuary/library/${s.slug}`}
                                className="group relative block aspect-[2/3] bg-slate-900 rounded-lg overflow-hidden border border-white/5 transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl hover:shadow-emerald-500/20 hover:border-amber-500/30"
                            >
                                {s.coverImage ? (
                                    <img
                                        src={s.coverImage}
                                        alt={s.title}
                                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-60 group-hover:opacity-100"
                                    />
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center bg-slate-800">
                                        <div className="absolute inset-0 bg-[url('https://res.cloudinary.com/dptqxjhb8/image/upload/v1735258900/static_noise_placeholder.png')] opacity-20 mix-blend-overlay" />
                                        <span className="text-slate-600 font-mono text-xs relative z-10">NO SIGNAL</span>
                                    </div>
                                )}

                                <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-80 group-hover:opacity-60 transition-opacity" />

                                <div className="absolute inset-0 p-6 flex flex-col justify-end transform translate-y-2 group-hover:translate-y-0 transition-transform">
                                    <h2 className="text-2xl font-serif font-bold text-white mb-2 leading-tight">
                                        {s.title}
                                    </h2>

                                    {/* Metadata Label */}
                                    <div className="font-mono text-[10px] text-amber-500/80 mb-3 tracking-widest uppercase">
                                        {s.chapterCount ? `${s.chapterCount} CHAPTERS RECOVERED` : 'SIGNAL TRACE ACTIVE'}
                                    </div>

                                    <div className="h-0 group-hover:h-auto overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-500 delay-100">
                                        <p className="text-xs text-slate-300 line-clamp-3 mb-4">
                                            {s.description}
                                        </p>
                                        <span className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-400">
                                            <Play className="w-3 h-3 fill-current" />
                                            Enter Series
                                        </span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                        {series.length === 0 && (
                            <div className="col-span-full text-center py-12 border border-dashed border-white/10 rounded-lg">
                                <span className="text-slate-600 font-mono text-xs">NO SERIES BROADCASTING</span>
                            </div>
                        )}
                    </div>
                </section>
            </div>
        </div>
    );
}
