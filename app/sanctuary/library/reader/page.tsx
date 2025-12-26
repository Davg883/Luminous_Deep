"use client";

import React from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { useRouter } from 'next/navigation';
import { Radio, Lock, Play, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function LibraryIndexPage() {
    const signals = useQuery(api.public.signals.listSignals);
    const router = useRouter();

    return (
        <div className="min-h-screen bg-stone-950 text-stone-300 font-serif selection:bg-emerald-900/30 selection:text-emerald-50 p-6 md:p-20">
            {/* Header */}
            <header className="max-w-4xl mx-auto mb-16 border-b border-white/5 pb-8 flex items-end justify-between">
                <div>
                    <div className="flex items-center gap-3 mb-4 text-emerald-600/60">
                        <Radio className="w-5 h-5" />
                        <span className="font-mono text-xs uppercase tracking-[0.2em]">Signal Archive</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-b from-stone-100 to-stone-500">
                        Thea Lux Protocol
                    </h1>
                </div>
                <button
                    onClick={() => router.push('/')}
                    className="hidden md:flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-stone-600 hover:text-stone-400 transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" /> Return to Surface
                </button>
            </header>

            <main className="max-w-4xl mx-auto">
                {signals === undefined ? (
                    <div className="py-20 text-center text-stone-500 font-mono text-xs animate-pulse">
                        SCANNING FREQUENCIES...
                    </div>
                ) : signals.length === 0 ? (
                    <div className="py-20 text-center text-stone-500 font-mono text-xs">
                        NO SIGNALS FOUND IN ARCHIVE
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {signals.map((signal) => (
                            <Link
                                key={signal._id}
                                href={`/sanctuary/library/reader/${signal.slug}`}
                                className="group relative flex items-center gap-6 p-6 rounded-xl bg-stone-900/30 border border-white/5 hover:border-emerald-500/30 hover:bg-stone-900/50 transition-all cursor-pointer overflow-hidden block"
                            >
                                {/* Hover Glow */}
                                <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                <div className="flex-shrink-0 w-16 h-16 bg-black rounded-lg flex items-center justify-center border border-white/5 group-hover:border-emerald-500/30 transition-colors z-10 relative">
                                    <span className="font-mono text-emerald-600 font-bold text-sm group-hover:text-emerald-500">
                                        {signal.season.toString().padStart(2, '0')}.{signal.episode.toString().padStart(2, '0')}
                                    </span>
                                </div>

                                <div className="flex-1 min-w-0 z-10 relative">
                                    <h3 className="text-xl text-stone-300 font-serif group-hover:text-white transition-colors truncate">
                                        {signal.title}
                                    </h3>
                                    <div className="flex items-center gap-4 mt-2">
                                        <span className="text-[10px] uppercase tracking-wider font-mono text-stone-600 group-hover:text-stone-500">
                                            {new Date(signal.publishedAt).toLocaleDateString()}
                                        </span>
                                        {signal.isLocked && (
                                            <span className="flex items-center gap-1 text-[10px] uppercase tracking-wider font-mono text-rose-900/80 bg-rose-900/10 px-1.5 py-0.5 rounded border border-rose-900/20">
                                                <Lock className="w-3 h-3" /> Encrypted
                                            </span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 opacity-100 transition-opacity -translate-x-0 z-10 relative">
                                    <span className="text-[10px] font-mono uppercase tracking-widest text-emerald-500 group-hover:text-emerald-400">Tune In</span>
                                    <div className="p-3 bg-emerald-500/10 rounded-full text-emerald-500 border border-emerald-500/20 group-hover:bg-emerald-500 group-hover:text-black transition-all">
                                        <Play className="w-4 h-4 fill-current" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
