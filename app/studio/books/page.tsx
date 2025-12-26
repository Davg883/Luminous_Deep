"use client";

import React, { useState } from 'react';
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Brain, Sparkles, User, FileText, Save, Terminal, ScrollText } from 'lucide-react';

type NarrativeVoice = 'thea' | 'eleanor' | 'palimpsaest';

const VOICES: Array<{
    id: NarrativeVoice;
    title: string;
    subtitle: string;
    accent: "emerald" | "rose" | "amber";
    icon: React.ElementType;
}> = [
        { id: "thea", title: "Thea Lux", subtitle: "Recovered Transmissions", accent: "emerald", icon: Terminal },
        { id: "eleanor", title: "Eleanor Vance", subtitle: "Reflections & Memory", accent: "rose", icon: User },
        { id: "palimpsaest", title: "The Palimpsaest", subtitle: "Myth & Inheritance", accent: "amber", icon: ScrollText },
    ];

export default function BookCreatorAgent() {
    // STATE
    const [role, setRole] = useState<NarrativeVoice>('thea');
    const [seed, setSeed] = useState('');
    const [tone, setTone] = useState('Ominous');
    const [length, setLength] = useState('Short');
    const [output, setOutput] = useState<any>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    // MUTATIONS
    const saveDraft = useMutation(api.studio.signals.publishSignal);

    // MOCK GENERATOR (Until LLM Integration)
    const handleGenerate = async () => {
        setIsGenerating(true);
        // Simulate thinking time
        await new Promise(resolve => setTimeout(resolve, 2000));

        let mockResponse;

        if (role === 'thea') {
            mockResponse = {
                title: `Transmission: ${seed.substring(0, 20) || "Unknown"}...`,
                summary: `A ${tone.toLowerCase()} recording recovered from the archives. ${seed}`,
                content: `# TRANSMISSION START\n\nSystem Timestamp: [REDACTED]\nSignal Strength: 84%\n\nIt began with ${seed}. The systems were reading normal, but the telemetry indicated a deviation in the core logic. I observed the anomaly for three cycles before logging the discrepancy.\n\n## ACT I: THE ANOMALY\n\n(Draft content based on Thea Lux voice...)\n\n## ACT II: THE DISCOVERY\n\n...\n\n# CONNECTION LOST`,
                coverPrompt: `Cinematic sci-fi concept art, ${tone} atmosphere, abstract representation of ${seed}, trending on artstation, 8k, darker style, procedural tech interface.`,
                season: 0,
                episode: 99,
                slug: `000-099-${seed.split(' ')[0].toLowerCase()}-draft`
            };
        } else if (role === 'eleanor') {
            mockResponse = {
                title: `Reflection: ${seed.substring(0, 20) || "Memory"}`,
                summary: `A personal reflection on ${seed}, written from the archives.`,
                content: `# MEMORY FRAGMENT\n\nI remember when we first encountered ${seed}. The light in the room was different then—softer, perhaps, or maybe I just remember it that way. It reminds me of the old world.\n\n## PART I: THE REMEMBRANCE\n\n(Draft content based on Eleanor Vance voice...)\n\n## PART II: THE LOSS\n\n...\n\n# END OF ENTRY`,
                coverPrompt: `Melancholic oil painting, ${tone} atmosphere, soft lighting, ${seed}, cinematic, emotional, muted colors, gallery style.`,
                season: 0,
                episode: 99,
                slug: `000-099-${seed.split(' ')[0].toLowerCase()}-draft`
            };
        } else {
            // Palimpsaest
            mockResponse = {
                title: `Parable: The ${seed.split(' ')[0] || "Myth"}`,
                summary: `A mythic retelling of ${seed}, passed down through the layers.`,
                content: `# THE FIRST CYCLE\n\nIn the beginning, there was only ${seed}. Before the machines woke, and before the silence fell, it is said that the first ones carried the burden of memory.\n\n## I. THE FOUNDATION\n\n(Draft content based on The Palimpsaest voice...)\n\n## II. THE RETURN\n\n...\n\n# LEGACY ARCHIVED`,
                coverPrompt: `Mythic symbolist art, gold and obsidian, ancient mural style, ${tone} atmosphere, ${seed}, timeless, abstract, geometric patterns.`,
                season: 0,
                episode: 99,
                slug: `000-099-${seed.split(' ')[0].toLowerCase()}-draft`
            };
        }

        setOutput(mockResponse);
        setIsGenerating(false);
    };

    // SAVE HANDLER
    const handleSave = async () => {
        if (!output) return;

        try {
            await saveDraft({
                title: output.title,
                slug: output.slug,
                season: output.season,
                episode: output.episode,
                content: output.content,
                isLocked: true, // Drafts start locked
                glitchPoint: 500
            });
            alert("Draft Saved to Archive.");
        } catch (e) {
            console.error(e);
            alert("Failed to save draft.");
        }
    };

    return (
        <div className="min-h-screen bg-stone-950 text-stone-300 font-sans p-8 md:p-12">
            <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12">

                {/* ════════════════════════════════════════════════════
                    LEFT PANEL: CONTROLS
                ════════════════════════════════════════════════════ */}
                <div className="lg:col-span-4 space-y-8">

                    {/* Header */}
                    <div className="flex items-center gap-4 text-emerald-500 mb-8">
                        <div className="p-3 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                            <Brain className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-xl font-serif text-white">Book Creator</h1>
                            <p className="text-xs font-mono uppercase tracking-widest opacity-60">Narrative Engine v1.1</p>
                        </div>
                    </div>

                    {/* Narrative Voice Selector */}
                    <div className="space-y-4">
                        <label className="text-xs font-mono uppercase tracking-widest text-stone-500">Narrative Voice</label>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {VOICES.map((voice) => {
                                const isSelected = role === voice.id;
                                const Icon = voice.icon;

                                // Dynamic Styles based on Accent
                                let activeClass = '';
                                if (voice.accent === 'emerald') activeClass = 'bg-emerald-900/20 border-emerald-500/50 text-emerald-400';
                                if (voice.accent === 'rose') activeClass = 'bg-rose-900/20 border-rose-500/50 text-rose-400';
                                if (voice.accent === 'amber') activeClass = 'bg-amber-900/20 border-amber-500/50 text-amber-400';

                                return (
                                    <button
                                        key={voice.id}
                                        onClick={() => setRole(voice.id)}
                                        className={`p-4 rounded border transition-all flex flex-col items-center gap-2 text-center h-full hover:border-stone-600 ${isSelected
                                                ? activeClass
                                                : 'bg-stone-900 border-stone-800 text-stone-500'
                                            }`}
                                    >
                                        <Icon className="w-5 h-5 mb-1" />
                                        <span className="text-sm font-bold leading-tight">{voice.title}</span>
                                        <span className="text-[9px] uppercase opacity-60 leading-tight">{voice.subtitle}</span>
                                    </button>
                                );
                            })}
                        </div>
                        <p className="text-[10px] text-stone-600 text-center italic font-serif">Different voices generate different kinds of truth.</p>
                    </div>

                    {/* Seed Input */}
                    <div className="space-y-4">
                        <label className="text-xs font-mono uppercase tracking-widest text-stone-500">Seed Idea</label>
                        <textarea
                            value={seed}
                            onChange={(e) => setSeed(e.target.value)}
                            placeholder="e.g. The Habenula Response..."
                            className="w-full h-32 bg-stone-900 border border-stone-800 rounded p-4 text-stone-300 placeholder-stone-700 focus:border-emerald-500/50 focus:outline-none transition-colors resize-none font-serif"
                        />
                    </div>

                    {/* Parameters */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-xs font-mono uppercase tracking-widest text-stone-500">Tone</label>
                            <select
                                value={tone}
                                onChange={(e) => setTone(e.target.value)}
                                className="w-full bg-stone-900 border border-stone-800 rounded p-3 text-sm focus:border-emerald-500/50 focus:outline-none appearance-none"
                            >
                                <option>Ominous</option>
                                <option>Clinical</option>
                                <option>Nostalgic</option>
                                <option>Frenetic</option>
                                <option>Mythic</option>
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-xs font-mono uppercase tracking-widest text-stone-500">Length</label>
                            <select
                                value={length}
                                onChange={(e) => setLength(e.target.value)}
                                className="w-full bg-stone-900 border border-stone-800 rounded p-3 text-sm focus:border-emerald-500/50 focus:outline-none appearance-none"
                            >
                                <option>Short Signal (500w)</option>
                                <option>Full Log (1500w)</option>
                            </select>
                        </div>
                    </div>

                    {/* Generator Action */}
                    <button
                        onClick={handleGenerate}
                        disabled={!seed || isGenerating}
                        className={`w-full py-4 rounded font-bold tracking-widest uppercase text-sm flex items-center justify-center gap-3 transition-all ${!seed || isGenerating
                            ? 'bg-stone-800 text-stone-600 cursor-not-allowed'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                            }`}
                    >
                        {isGenerating ? (
                            <span className="animate-pulse">Processing...</span>
                        ) : (
                            <>
                                <Sparkles className="w-4 h-4 fill-current" />
                                Initialize Agent
                            </>
                        )}
                    </button>

                </div>


                {/* ════════════════════════════════════════════════════
                    RIGHT PANEL: PREVIEW
                ════════════════════════════════════════════════════ */}
                <div className="lg:col-span-8 bg-stone-900/50 border border-white/5 rounded-2xl p-8 md:p-12 relative overflow-hidden min-h-[600px]">

                    {/* Glass Overlay Effect */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

                    {!output ? (
                        <div className="h-full flex flex-col items-center justify-center text-stone-700 opacity-50">
                            <FileText className="w-16 h-16 mb-6" />
                            <p className="font-mono text-xs uppercase tracking-widest">Waiting for Signal Input</p>
                        </div>
                    ) : (
                        <div className="relative animate-in fade-in slide-in-from-bottom-4 duration-700">

                            {/* JSON / Data Structures */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono uppercase text-stone-500">Generated Title</label>
                                    <input
                                        value={output.title}
                                        readOnly
                                        className="w-full bg-black/30 border border-white/10 rounded p-3 text-emerald-400 font-serif text-lg"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-mono uppercase text-stone-500">Visuals Prompt</label>
                                    <div className="w-full bg-black/30 border border-white/10 rounded p-3 text-stone-400 text-xs font-mono h-[54px] overflow-hidden truncate">
                                        {output.coverPrompt}
                                    </div>
                                </div>
                            </div>

                            {/* Main Content Preview */}
                            <div className="space-y-2 mb-8">
                                <label className="text-[10px] font-mono uppercase text-stone-500">Draft Content</label>
                                <div className="w-full bg-black/30 border border-white/10 rounded p-6 text-stone-300 font-serif leading-relaxed h-[400px] overflow-y-auto custom-scrollbar whitespace-pre-wrap">
                                    {output.content}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex justify-end gap-4">
                                <button
                                    onClick={() => setOutput(null)}
                                    className="px-6 py-3 border border-stone-700 text-stone-500 hover:text-stone-300 rounded uppercase text-xs font-bold tracking-widest transition-colors"
                                >
                                    Discard
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="px-8 py-3 bg-white text-stone-950 hover:bg-stone-200 rounded uppercase text-xs font-bold tracking-widest flex items-center gap-2 shadow-xl transition-colors"
                                >
                                    <Save className="w-4 h-4" />
                                    Save to Draft
                                </button>
                            </div>

                        </div>
                    )}

                </div>
            </div>
        </div>
    );
}
