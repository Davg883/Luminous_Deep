"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Lock, ScrollText, Terminal, User, Shield, BookOpen, Map, Sparkles } from 'lucide-react';
import { KanbanColumn, KanbanCard, QuickViewModal } from '@/components/studio/AssetGrid';

interface QuickViewData {
    id?: Id<"signals">;
    title: string;
    subtitle?: string;
    coverImage?: string;
    summary?: string;
    badge?: string;
    badgeColor?: 'emerald' | 'amber' | 'violet' | 'rose' | 'blue';
    stratum?: string;
    editable?: boolean;
}

export default function WorldMapPage() {
    const worldMap = useQuery(api.studio.world.getWorldMap);
    const updateSignal = useMutation(api.studio.signals.updateSignal);
    const [quickViewData, setQuickViewData] = useState<QuickViewData | null>(null);

    if (worldMap === undefined) {
        return (
            <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-pulse mb-4">
                        <Map className="w-12 h-12 text-emerald-500/50 mx-auto" />
                    </div>
                    <span className="text-emerald-900/50 font-mono text-xs uppercase tracking-widest">
                        MAPPING NARRATIVE STRATA...
                    </span>
                </div>
            </div>
        );
    }

    const { canon, myths, signalsBySeason, reflections, integrity } = worldMap;

    // Flatten signals for the kanban view
    const allSignals = Object.values(signalsBySeason).flat();

    const openQuickView = (data: QuickViewData) => {
        setQuickViewData(data);
    };

    const handleSaveSignal = async (updates: { coverImage?: string; stratum?: string; title?: string; subtitle?: string }) => {
        if (!quickViewData?.id) return;

        await updateSignal({
            id: quickViewData.id,
            coverImage: updates.coverImage,
            stratum: updates.stratum as "signal" | "myth" | "reflection" | undefined,
            title: updates.title,
            subtitle: updates.subtitle,
        });

        // Close modal after save
        setQuickViewData(null);
    };

    return (
        <div className="min-h-screen bg-[#0a0a0f] text-slate-200 p-6 md:p-8">

            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-500/10 rounded-xl">
                        <Map className="w-6 h-6 text-emerald-500" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-serif text-white mb-1">World Map</h1>
                        <p className="text-xs text-slate-500 font-mono uppercase tracking-widest">Narrative Command • All Strata</p>
                    </div>
                </div>

                {/* Integrity Stats - Compact */}
                <div className="hidden lg:flex items-center gap-4">
                    <IntegrityStat label="Canon" value={integrity.totalCanon} color="amber" />
                    <IntegrityStat label="Myths" value={integrity.totalMyths} color="violet" />
                    <IntegrityStat label="Signals" value={integrity.totalSignals} color="emerald" />
                    <IntegrityStat label="Reflections" value={integrity.totalReflections} color="blue" />
                </div>
            </div>

            {/* ════════════════════════════════════════════════════════════════
                KANBAN BOARD
            ════════════════════════════════════════════════════════════════ */}
            <div className="flex gap-6 overflow-x-auto pb-6 snap-x">

                {/* Column 1: CANON (Gold) - Not editable */}
                <KanbanColumn
                    title="CANON"
                    subtitle="Immutable World Rules"
                    icon={Shield}
                    color="gold"
                    count={canon.length}
                >
                    {canon.length === 0 ? (
                        <EmptyState message="No canonical rules defined" />
                    ) : (
                        canon.map((doc) => (
                            <KanbanCard
                                key={doc._id}
                                title={doc.title}
                                subtitle={`Version ${doc.version}`}
                                isLocked={true}
                                onClick={() => openQuickView({
                                    title: doc.title,
                                    subtitle: `Version ${doc.version}`,
                                    summary: doc.content?.slice(0, 300) + '...',
                                    badge: 'CANON',
                                    badgeColor: 'amber',
                                    editable: false, // Canon is immutable
                                })}
                            />
                        ))
                    )}
                </KanbanColumn>

                {/* Column 2: MYTH (Purple) - Editable signals with stratum='myth' */}
                <KanbanColumn
                    title="MYTH"
                    subtitle="Foundational Stories"
                    icon={ScrollText}
                    color="purple"
                    count={myths.length}
                >
                    {myths.length === 0 ? (
                        <EmptyState message="No foundational myths" />
                    ) : (
                        myths.map((myth) => (
                            <KanbanCard
                                key={myth._id}
                                title={myth.title}
                                subtitle="The Palimpsaest"
                                coverImage={myth.coverImage}
                                isLocked={myth.isLocked}
                                onClick={() => openQuickView({
                                    id: myth._id,
                                    title: myth.title,
                                    subtitle: 'Foundational Myth',
                                    coverImage: myth.coverImage,
                                    summary: myth.summaryShort || myth.content?.slice(0, 300) + '...',
                                    badge: 'MYTH',
                                    badgeColor: 'violet',
                                    stratum: 'myth',
                                    editable: true,
                                })}
                            />
                        ))
                    )}
                </KanbanColumn>

                {/* Column 3: SIGNALS (Green) - Episode Covers */}
                <KanbanColumn
                    title="SIGNALS"
                    subtitle="Thea Lux Protocol"
                    icon={Terminal}
                    color="green"
                    count={allSignals.length}
                >
                    {allSignals.length === 0 ? (
                        <EmptyState message="No signals transmitted" />
                    ) : (
                        allSignals.map((signal) => (
                            <SignalCard
                                key={signal._id}
                                title={signal.title}
                                season={signal.season}
                                episode={signal.episode}
                                coverImage={signal.coverImage}
                                isLocked={signal.isLocked}
                                onClick={() => openQuickView({
                                    id: signal._id,
                                    title: signal.title,
                                    subtitle: `Season ${signal.season} • Episode ${signal.episode}`,
                                    coverImage: signal.coverImage,
                                    summary: signal.summaryShort || signal.content?.slice(0, 300) + '...',
                                    badge: `S${signal.season} E${signal.episode}`,
                                    badgeColor: 'emerald',
                                    stratum: signal.stratum || 'signal',
                                    editable: true,
                                })}
                            />
                        ))
                    )}
                </KanbanColumn>

                {/* Column 4: REFLECTIONS (Blue) */}
                <KanbanColumn
                    title="REFLECTIONS"
                    subtitle="Eleanor's Archive"
                    icon={User}
                    color="blue"
                    count={reflections.length}
                >
                    {reflections.length === 0 ? (
                        <EmptyState message="No reflections recorded" />
                    ) : (
                        reflections.map((ref) => (
                            <KanbanCard
                                key={ref._id}
                                title={ref.title}
                                subtitle="Diary Entry"
                                coverImage={ref.coverImage}
                                isLocked={ref.isLocked}
                                onClick={() => openQuickView({
                                    id: ref._id,
                                    title: ref.title,
                                    subtitle: 'Eleanor Vance',
                                    coverImage: ref.coverImage,
                                    summary: ref.summaryShort || ref.content?.slice(0, 300) + '...',
                                    badge: 'REFLECTION',
                                    badgeColor: 'blue',
                                    stratum: 'reflection',
                                    editable: true,
                                })}
                            />
                        ))
                    )}
                </KanbanColumn>

            </div>

            {/* Quick View/Editor Modal */}
            <QuickViewModal
                isOpen={!!quickViewData}
                onClose={() => setQuickViewData(null)}
                title={quickViewData?.title || ''}
                subtitle={quickViewData?.subtitle}
                coverImage={quickViewData?.coverImage}
                summary={quickViewData?.summary}
                badge={quickViewData?.badge}
                badgeColor={quickViewData?.badgeColor}
                editable={quickViewData?.editable}
                itemId={quickViewData?.id}
                stratum={quickViewData?.stratum}
                onSave={handleSaveSignal}
            />

        </div>
    );
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTS
// ═══════════════════════════════════════════════════════════════

function IntegrityStat({ label, value, color }: { label: string; value: number; color: string }) {
    const colorMap: Record<string, string> = {
        amber: 'text-amber-500',
        violet: 'text-violet-500',
        emerald: 'text-emerald-500',
        blue: 'text-blue-500',
    };

    return (
        <div className="flex items-center gap-2 px-3 py-2 bg-white/[0.03] border border-white/5 rounded-lg">
            <span className={`text-xl font-bold ${colorMap[color]}`}>{value}</span>
            <span className="text-[10px] font-mono uppercase text-slate-500">{label}</span>
        </div>
    );
}

function EmptyState({ message }: { message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-8 text-center">
            <Sparkles className="w-6 h-6 text-slate-600 mb-2" />
            <span className="text-[10px] font-mono text-slate-600 uppercase">{message}</span>
        </div>
    );
}

// Special Signal Card with Cover Art emphasis
function SignalCard({
    title,
    season,
    episode,
    coverImage,
    isLocked,
    onClick
}: {
    title: string;
    season: number;
    episode: number;
    coverImage?: string;
    isLocked?: boolean;
    onClick?: () => void;
}) {
    return (
        <div
            onClick={onClick}
            className="group relative rounded-lg overflow-hidden cursor-pointer transition-all hover:ring-2 hover:ring-emerald-500/50"
        >
            {/* Cover Image - Larger emphasis */}
            <div className="aspect-[3/4] bg-gradient-to-br from-slate-800 to-slate-900">
                {coverImage ? (
                    <img
                        src={coverImage}
                        alt={title}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-8 h-8 text-slate-700" />
                    </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                {/* Episode badge */}
                <div className="absolute top-2 left-2 px-2 py-1 bg-emerald-500/20 border border-emerald-500/30 rounded text-[9px] font-mono font-bold text-emerald-400 backdrop-blur-sm">
                    S{season} E{episode}
                </div>

                {/* Lock indicator */}
                {isLocked && (
                    <div className="absolute top-2 right-2 p-1.5 bg-rose-500/20 border border-rose-500/30 rounded-full backdrop-blur-sm">
                        <Lock className="w-2.5 h-2.5 text-rose-400" />
                    </div>
                )}

                {/* Title */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h4 className="text-xs font-medium text-white line-clamp-2 leading-snug group-hover:text-emerald-400 transition-colors">
                        {title}
                    </h4>
                </div>
            </div>
        </div>
    );
}
