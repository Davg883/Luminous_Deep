"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api"; // Updated import to allow finding the new file
import { Id } from "@/convex/_generated/dataModel";
import {
    Signal,
    PenTool,
    Lock,
    Unlock,
    Plus,
    Save,
    Trash2,
    RefreshCcw,
    Zap
} from "lucide-react";

export default function SignalTransmitterPage() {
    const signals = useQuery(api.studio.signals.listSignals);
    const publishSignal = useMutation(api.studio.signals.publishSignal);
    const deleteSignal = useMutation(api.studio.signals.deleteSignal);

    const [selectedId, setSelectedId] = useState<Id<"signals"> | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [season, setSeason] = useState(0);
    const [episode, setEpisode] = useState(1);
    const [content, setContent] = useState("");
    const [isLocked, setIsLocked] = useState(true);
    const [glitchPoint, setGlitchPoint] = useState<number>(100);

    // Load selected signal into form
    useEffect(() => {
        if (selectedId && signals) {
            const signal = signals.find(s => s._id === selectedId);
            if (signal) {
                setTitle(signal.title);
                setSlug(signal.slug);
                setSeason(signal.season);
                setEpisode(signal.episode);
                setContent(signal.content);
                setIsLocked(signal.isLocked);
                setGlitchPoint(signal.glitchPoint || 100);
            }
        } else if (!selectedId) {
            // Reset for new entry
            setTitle("");
            setSlug("");
            setSeason(0);
            setEpisode(1);
            setContent("# New Transmission\n\nStart writing...");
            setIsLocked(true);
            setGlitchPoint(50);
        }
    }, [selectedId, signals]);

    // Auto-slug generator
    const generateSlug = (val: string) => {
        return val.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/(^-|-$)+/g, '');
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setTitle(val);
        if (!selectedId) {
            setSlug(`${season.toString().padStart(3, '0')}-${episode.toString().padStart(3, '0')}-${generateSlug(val)}`);
        }
    };

    const handleSave = async () => {
        await publishSignal({
            id: selectedId || undefined,
            title,
            slug,
            season,
            episode,
            content,
            isLocked,
            glitchPoint
        });
        setIsEditing(false);
    };

    const handleDelete = async (id: Id<"signals">) => {
        if (confirm("Are you sure you want to delete this transmission?")) {
            await deleteSignal({ id });
            if (selectedId === id) setSelectedId(null);
        }
    };

    return (
        <div className="flex h-screen bg-[#0a0a0f] text-slate-200 font-sans selection:bg-emerald-500/30">

            {/* 1. Sidebar List */}
            <aside className="w-80 border-r border-white/5 flex flex-col">
                <div className="p-6 border-b border-white/5 bg-white/[0.02]">
                    <div className="flex items-center gap-3 mb-1 text-emerald-500">
                        <Signal className="w-5 h-5" />
                        <h1 className="font-bold tracking-wide text-sm uppercase">Transmissions</h1>
                    </div>
                    <p className="text-xs text-slate-500">Thea Lux Protocol Interface</p>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                    <button
                        onClick={() => { setSelectedId(null); setIsEditing(true); }}
                        className="w-full flex items-center gap-3 p-3 rounded-lg border border-dashed border-white/10 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all text-xs uppercase tracking-wider text-slate-400 hover:text-emerald-400 mb-4"
                    >
                        <Plus className="w-4 h-4" />
                        Create Signal
                    </button>

                    {signals?.map((signal) => (
                        <div
                            key={signal._id}
                            onClick={() => { setSelectedId(signal._id); setIsEditing(true); }}
                            className={`group relative p-4 rounded-lg border transition-all cursor-pointer ${selectedId === signal._id
                                    ? "bg-emerald-950/30 border-emerald-500/50"
                                    : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-mono text-[10px] text-emerald-600">
                                    S{signal.season} • E{signal.episode}
                                </span>
                                {signal.isLocked ? <Lock className="w-3 h-3 text-rose-500" /> : <Unlock className="w-3 h-3 text-emerald-500" />}
                            </div>
                            <h3 className="font-serif text-sm text-slate-200 group-hover:text-white truncate">
                                {signal.title}
                            </h3>
                            <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleDelete(signal._id); }}
                                    className="p-1 hover:bg-rose-500/20 rounded text-rose-500"
                                >
                                    <Trash2 className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </aside>

            {/* 2. Editor Area */}
            <main className="flex-1 flex flex-col relative overflow-hidden bg-[url('https://res.cloudinary.com/dptqxjhb8/image/upload/v1766235198/House_video_z7n1yj.mp4')] bg-cover">
                <div className="absolute inset-0 bg-[#0a0a0f]/95 backdrop-blur-3xl z-0" />

                <div className="relative z-10 flex-1 flex flex-col max-w-5xl mx-auto w-full h-full">

                    {/* Toolbar */}
                    <div className="flex items-center justify-between p-6 border-b border-white/5">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-emerald-500/10 rounded-lg">
                                <PenTool className="w-5 h-5 text-emerald-500" />
                            </div>
                            <div>
                                <h2 className="text-sm font-bold text-slate-200 uppercase tracking-widest">Signal Transmitter</h2>
                                <span className="text-xs text-slate-500 font-mono">{slug || "waiting-for-input..."}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                            >
                                <Save className="w-4 h-4" />
                                Broadcast
                            </button>
                        </div>
                    </div>

                    <div className="flex-1 flex overflow-hidden">
                        {/* Meta & Settings */}
                        <div className="w-72 border-r border-white/5 p-6 space-y-8 overflow-y-auto">

                            <div className="space-y-4">
                                <label className="block text-xs font-mono text-slate-500 uppercase">Indexing</label>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <span className="text-[10px] text-slate-600 uppercase block mb-1">Season</span>
                                        <input
                                            type="number"
                                            value={season}
                                            onChange={(e) => setSeason(parseInt(e.target.value))}
                                            className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm focus:border-emerald-500/50 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <span className="text-[10px] text-slate-600 uppercase block mb-1">Episode</span>
                                        <input
                                            type="number"
                                            value={episode}
                                            onChange={(e) => setEpisode(parseInt(e.target.value))}
                                            className="w-full bg-white/5 border border-white/10 rounded p-2 text-sm focus:border-emerald-500/50 focus:outline-none"
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="block text-xs font-mono text-slate-500 uppercase">Encryption</label>

                                <div
                                    onClick={() => setIsLocked(!isLocked)}
                                    className={`cursor-pointer p-4 rounded-lg border transition-all flex items-center justify-between ${isLocked ? 'bg-rose-950/20 border-rose-500/30' : 'bg-emerald-950/20 border-emerald-500/30'
                                        }`}
                                >
                                    <div className="flex items-center gap-3">
                                        {isLocked ? <Lock className="w-4 h-4 text-rose-500" /> : <Unlock className="w-4 h-4 text-emerald-500" />}
                                        <span className={`text-xs font-bold uppercase ${isLocked ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            {isLocked ? 'Signal Locked' : 'Open Channel'}
                                        </span>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${isLocked ? 'bg-rose-500 animate-pulse' : 'bg-emerald-500'}`} />
                                </div>
                            </div>

                            {isLocked && (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-end">
                                        <label className="block text-xs font-mono text-slate-500 uppercase flex items-center gap-2">
                                            <Zap className="w-3 h-3" /> Glitch Point
                                        </label>
                                        <span className="text-xs font-mono text-emerald-500">{glitchPoint} chars</span>
                                    </div>

                                    <input
                                        type="range"
                                        min="0"
                                        max={content.length}
                                        value={glitchPoint}
                                        onChange={(e) => setGlitchPoint(parseInt(e.target.value))}
                                        className="w-full accent-emerald-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
                                    />

                                    <div className="p-3 bg-black/40 rounded border border-white/5 mt-2">
                                        <p className="text-[10px] text-slate-500 font-mono mb-2 uppercase">Preview Cut-off:</p>
                                        <p className="text-xs font-serif text-slate-400 leading-relaxed line-clamp-3">
                                            ...{content.slice(Math.max(0, glitchPoint - 30), glitchPoint)}
                                            <span className="bg-rose-500 text-white font-mono px-1"> // ERROR </span>
                                        </p>
                                    </div>
                                </div>
                            )}

                        </div>

                        {/* Content Editor */}
                        <div className="flex-1 flex flex-col bg-white/[0.02]">
                            <div className="p-6 border-b border-white/5">
                                <input
                                    type="text"
                                    value={title}
                                    onChange={handleTitleChange}
                                    placeholder="Enter Narrative Title..."
                                    className="w-full bg-transparent text-3xl font-serif text-slate-100 placeholder-slate-700 focus:outline-none"
                                />
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-slate-600 text-xs font-mono">/sanctuary/library/reader/</span>
                                    <input
                                        type="text"
                                        value={slug}
                                        onChange={(e) => setSlug(e.target.value)}
                                        className="bg-transparent text-xs font-mono text-emerald-600 focus:outline-none w-full"
                                    />
                                </div>
                            </div>

                            <textarea
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="flex-1 w-full bg-transparent p-6 resize-none focus:outline-none font-serif text-lg leading-relaxed text-slate-300 placeholder-slate-800"
                                placeholder="# Begin transmission..."
                            />
                        </div>

                    </div>
                </div>
            </main>
        </div>
    );
}
