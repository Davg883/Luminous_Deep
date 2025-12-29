"use client";

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Play, Lock, Clock } from 'lucide-react';

interface EpisodeCardProps {
    signal: any;
}

export default function EpisodeCard({ signal }: EpisodeCardProps) {
    const isLocked = signal.isLocked;
    const progress = signal.userProgress?.progress || 0;
    const isCompleted = signal.userProgress?.isCompleted || false;

    return (
        <Link href={`/sanctuary/library/reader/${signal.slug}`} className="block relative group">
            {/* CARD CONTAINER (Aspect Ratio 2:3) */}
            <motion.div
                className="relative w-64 h-96 bg-stone-900 rounded-lg overflow-hidden border border-white/5 shadow-2xl transition-all duration-500 ease-out"
                whileHover={{
                    scale: 1.05,
                    zIndex: 20,
                    boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.7)"
                }}
            >
                {/* COVER IMAGE */}
                {signal.coverImage ? (
                    <img
                        src={signal.coverImage}
                        alt={signal.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                ) : (
                    <div className="absolute inset-0 bg-stone-950 flex items-center justify-center">
                        <svg className="absolute inset-0 w-full h-full opacity-20" xmlns="http://www.w3.org/2000/svg">
                            <filter id="noiseFilter">
                                <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="3" stitchTiles="stitch" />
                            </filter>
                            <rect width="100%" height="100%" filter="url(#noiseFilter)" />
                        </svg>
                        <span className="relative z-10 font-mono text-[10px] text-emerald-900/60 uppercase tracking-widest">
                            SYSTEM STATIC
                        </span>
                        <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-transparent opacity-50" />
                    </div>
                )}

                {/* DARK GRADIENT OVERLAY (Always visible but deepens on hover) */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80 group-hover:opacity-95 transition-opacity duration-300" />

                {/* CONTENT LAYER */}
                <div className="absolute inset-0 p-6 flex flex-col justify-end">

                    {/* METADATA (Top Right) */}
                    {/* METADATA (Top Right) */}
                    <div className="absolute top-4 right-4 flex flex-col items-end gap-2">
                        {isLocked && (
                            <div className="p-2 bg-rose-500/20 backdrop-blur-md rounded-full border border-rose-500/30 text-rose-400 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                                <Lock className="w-3 h-3" />
                            </div>
                        )}
                        {isCompleted && (
                            <div className="px-2 py-1 bg-emerald-500/20 backdrop-blur-md rounded border border-emerald-500/30 text-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                <span className="text-[9px] font-mono font-bold tracking-widest uppercase">Decrypted</span>
                            </div>
                        )}
                    </div>

                    {/* TEXT CONTENT */}
                    <div className="transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300">
                        {/* SEASON / EPISODE */}
                        <div className="font-mono text-[10px] text-emerald-500 uppercase tracking-widest mb-2 opacity-80">
                            S{signal.season.toString().padStart(2, '0')} E{signal.episode.toString().padStart(2, '0')}
                        </div>

                        {/* TITLE */}
                        <h3 className="text-xl font-serif text-stone-100 leading-tight mb-2 group-hover:text-white transition-colors">
                            {signal.title}
                        </h3>

                        {/* HOVER REVEAL: SUMMARY & ACTION */}
                        <div className="h-0 group-hover:h-auto overflow-hidden opacity-0 group-hover:opacity-100 transition-all duration-300 delay-100">
                            <p className="text-xs text-stone-400 line-clamp-3 mb-4 leading-relaxed font-sans">
                                {signal.summaryShort || "No summary data available."}
                            </p>

                            <div className="flex items-center justify-between mt-2">
                                <span className="flex items-center gap-1 text-[10px] uppercase font-mono text-stone-500">
                                    <Clock className="w-3 h-3" /> {signal.duration || "Unknown"}
                                </span>
                                <button className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded uppercase text-[10px] font-mono tracking-widest transition-colors flex items-center gap-2">
                                    <Play className="w-3 h-3 fill-current" />
                                    {isLocked ? "Decrypt" : "Restore"}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* PROGRESS BAR (Bottom Edge) */}
                    {progress > 0 && (
                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-stone-800">
                            <div
                                className="h-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"
                                style={{ width: `${progress}%` }}
                            />
                        </div>
                    )}
                </div>
            </motion.div>
        </Link>
    );
}
