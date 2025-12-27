"use client";

import React from 'react';
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { ChevronDown, ChevronRight, Lock, ScrollText, Terminal, User, Shield } from 'lucide-react';
import Link from 'next/link';

export default function WorldMapPage() {
    const worldMap = useQuery(api.studio.world.getWorldMap);

    if (worldMap === undefined) {
        return (
            <div className="min-h-screen bg-stone-950 flex items-center justify-center text-emerald-900/50 font-mono text-xs animate-pulse">
                MAPPING NARRATIVE STRATA...
            </div>
        );
    }

    const { canon, myths, signalsBySeason, reflections, integrity } = worldMap;

    return (
        <div className="space-y-12">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-serif text-gray-900 mb-2">World Map</h1>
                    <p className="text-sm text-gray-500 font-mono uppercase tracking-widest">Narrative Command</p>
                </div>
            </div>

            {/* Integrity Panel */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 p-6 bg-gray-100 border border-gray-200 rounded-xl">
                <IntegrityStat label="Canon" value={integrity.totalCanon} icon={Shield} color="violet" />
                <IntegrityStat label="Myths" value={integrity.totalMyths} icon={ScrollText} color="amber" />
                <IntegrityStat label="Signals" value={integrity.totalSignals} icon={Terminal} color="emerald" />
                <IntegrityStat label="Reflections" value={integrity.totalReflections} icon={User} color="rose" />
                <div className="col-span-2 md:col-span-1 flex flex-col justify-center text-center">
                    <span className="text-[10px] font-mono uppercase text-gray-500">Last Updated</span>
                    <span className="text-xs text-gray-600">
                        {integrity.lastUpdated ? new Date(integrity.lastUpdated).toLocaleDateString() : 'N/A'}
                    </span>
                </div>
            </div>

            {/* ════════════════════════════════════════════════════
                    LEVEL 0: CANON (Locked)
                ════════════════════════════════════════════════════ */}
            <StratumSection
                title="CANON"
                subtitle="Immutable World Rules"
                icon={Shield}
                color="violet"
                locked
            >
                {canon.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No canonical documents defined yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {canon.map((doc) => (
                            <li key={doc._id} className="flex items-center gap-3 text-sm">
                                <Lock className="w-3 h-3 text-violet-500" />
                                <span className="text-gray-900">{doc.title}</span>
                                <span className="text-gray-500 text-xs">v{doc.version}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </StratumSection>

            {/* ════════════════════════════════════════════════════
                    LEVEL 1: FOUNDATIONAL MYTHS (Palimpsaest)
                ════════════════════════════════════════════════════ */}
            <StratumSection
                title="FOUNDATIONAL MYTHS"
                subtitle="The Palimpsaest"
                icon={ScrollText}
                color="amber"
            >
                {myths.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No foundational myths written yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {myths.map((myth) => (
                            <NarrativeRow key={myth._id} item={myth} type="myth" />
                        ))}
                    </ul>
                )}
            </StratumSection>

            {/* ════════════════════════════════════════════════════
                    LEVEL 2: SIGNALS (Thea Lux)
                ════════════════════════════════════════════════════ */}
            <StratumSection
                title="SIGNALS"
                subtitle="Thea Lux — Season / Episode Flow"
                icon={Terminal}
                color="emerald"
            >
                {Object.keys(signalsBySeason).length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No signals transmitted yet.</p>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(signalsBySeason).map(([season, signals]) => (
                            <div key={season}>
                                <h4 className="text-xs font-mono uppercase text-gray-500 mb-3">Season {season}</h4>
                                <ul className="space-y-2">
                                    {signals.map((signal) => (
                                        <NarrativeRow key={signal._id} item={signal} type="signal" />
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                )}
            </StratumSection>

            {/* ════════════════════════════════════════════════════
                    LEVEL 3: REFLECTIONS (Eleanor Vance)
                ════════════════════════════════════════════════════ */}
            <StratumSection
                title="REFLECTIONS"
                subtitle="Eleanor Vance"
                icon={User}
                color="rose"
            >
                {reflections.length === 0 ? (
                    <p className="text-gray-500 italic text-sm">No reflections recorded yet.</p>
                ) : (
                    <ul className="space-y-2">
                        {reflections.map((ref) => (
                            <NarrativeRow key={ref._id} item={ref} type="reflection" />
                        ))}
                    </ul>
                )}
            </StratumSection>

        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function IntegrityStat({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
    const colorMap: Record<string, string> = {
        violet: 'text-violet-600 bg-violet-50 border-violet-200',
        amber: 'text-amber-600 bg-amber-50 border-amber-200',
        emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
        rose: 'text-rose-600 bg-rose-50 border-rose-200',
    };
    return (
        <div className={`flex items-center gap-3 p-3 rounded-lg border ${colorMap[color]}`}>
            <Icon className="w-5 h-5" />
            <div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-[10px] font-mono uppercase opacity-60">{label}</p>
            </div>
        </div>
    );
}

function StratumSection({ title, subtitle, icon: Icon, color, locked, children }: {
    title: string;
    subtitle: string;
    icon: React.ElementType;
    color: string;
    locked?: boolean;
    children: React.ReactNode;
}) {
    const [isOpen, setIsOpen] = React.useState(true);
    const colorMap: Record<string, string> = {
        violet: 'border-violet-300 text-violet-600',
        amber: 'border-amber-300 text-amber-600',
        emerald: 'border-emerald-300 text-emerald-600',
        rose: 'border-rose-300 text-rose-600',
    };

    return (
        <div className={`border-l-2 ${colorMap[color]} pl-6`}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 mb-4 w-full text-left"
            >
                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                <Icon className="w-5 h-5" />
                <div>
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">{title}</h3>
                    <p className="text-xs text-gray-500">{subtitle}</p>
                </div>
                {locked && <Lock className="w-3 h-3 text-gray-400 ml-2" />}
            </button>
            {isOpen && <div className="ml-7">{children}</div>}
        </div>
    );
}

function NarrativeRow({ item, type }: { item: any; type: 'myth' | 'signal' | 'reflection' }) {
    const statusPill = item.isLocked ? (
        <span className="px-2 py-0.5 bg-rose-500/20 text-rose-400 text-[9px] uppercase rounded">Locked</span>
    ) : (
        <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] uppercase rounded">Published</span>
    );

    const meta = type === 'signal'
        ? `S${item.season}E${item.episode}`
        : type === 'myth'
            ? 'Myth'
            : 'Reflection';

    return (
        <Link
            href={`/sanctuary/library/reader/${item.slug}`}
            className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded transition-colors group"
        >
            <div className="flex items-center gap-3">
                <span className="text-[10px] font-mono text-gray-500 w-12">{meta}</span>
                <span className="text-sm text-gray-900 group-hover:text-emerald-600 transition-colors">{item.title}</span>
            </div>
            {statusPill}
        </Link>
    );
}
