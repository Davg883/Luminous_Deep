"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Plus, Save, Sparkles, Image as ImageIcon, Loader2 } from 'lucide-react';
import { AssetGrid, AssetCard } from '@/components/studio/AssetGrid';

export default function SeriesPage() {
    const seriesList = useQuery(api.studio.series.listSeries);
    const createSeries = useMutation(api.studio.series.createSeries);
    const updateSeries = useMutation(api.studio.series.updateSeries);
    const generateStats = useAction(api.studio.narrative.generateSeriesSynopsis);

    const [selectedId, setSelectedId] = useState<Id<"series"> | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [title, setTitle] = useState("");
    const [slug, setSlug] = useState("");
    const [description, setDescription] = useState("");
    const [coverImage, setCoverImage] = useState("");
    const [imagePrompt, setImagePrompt] = useState("");
    const [status, setStatus] = useState("Published");

    // Generation State
    const [isGenerating, setIsGenerating] = useState(false);

    // Load selected series
    React.useEffect(() => {
        if (selectedId && seriesList) {
            const series = seriesList.find(s => s._id === selectedId);
            if (series) {
                setTitle(series.title);
                setSlug(series.slug);
                setDescription(series.description);
                setCoverImage(series.coverImage);
                setImagePrompt(series.imagePrompt || "");
                setStatus(series.status);
            }
        } else {
            // Reset
            setTitle("");
            setSlug("");
            setDescription("");
            setCoverImage("");
            setImagePrompt("");
            setStatus("Published");
        }
    }, [selectedId, seriesList]);

    const handleSave = async () => {
        if (selectedId) {
            await updateSeries({
                id: selectedId,
                title,
                slug,
                description,
                coverImage,
                status,
                imagePrompt
            });
        } else {
            const newId = await createSeries({
                title,
                slug,
                description,
                coverImage,
                tags: [], // Todo: Add tags UI
                status
            });
            setSelectedId(newId);
        }
        setIsEditing(false);
    };

    const handleGenerate = async (mode: "synopsis" | "image_prompt") => {
        if (!selectedId) return;
        setIsGenerating(true);
        try {
            const result = await generateStats({ seriesId: selectedId, mode });
            if (result && result.output) {
                if (mode === "synopsis") {
                    setDescription(result.output);
                } else {
                    setImagePrompt(result.output);
                }
            }
        } catch (e) {
            console.error(e);
            alert("Generation failed. See console.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div className="flex h-screen bg-[#0a0a0f] text-slate-200">
            {/* 1. Sidebar List */}
            <aside className="w-80 border-r border-white/5 flex flex-col bg-slate-950/50">
                <div className="p-6 border-b border-white/5 flex justify-between items-center">
                    <h1 className="font-serif text-xl text-white">Series</h1>
                    <button
                        onClick={() => { setSelectedId(null); setIsEditing(true); }}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <Plus className="w-5 h-5 text-emerald-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                    {seriesList === undefined ? (
                        <div className="text-center p-4 text-slate-500 text-xs font-mono animate-pulse">LOADING...</div>
                    ) : (
                        <AssetGrid columns={2} gap="sm">
                            {seriesList.map(series => (
                                <AssetCard
                                    key={series._id}
                                    id={series._id}
                                    title={series.title}
                                    subtitle={series.status}
                                    coverImage={series.coverImage}
                                    variant="compact"
                                    onClick={() => { setSelectedId(series._id); setIsEditing(true); }}
                                    isSelected={selectedId === series._id}
                                />
                            ))}
                        </AssetGrid>
                    )}
                </div>
            </aside>

            {/* 2. Main Editor */}
            <main className="flex-1 overflow-y-auto relative">
                {selectedId || isEditing ? (
                    <div className="max-w-4xl mx-auto p-12 space-y-8">
                        {/* Header */}
                        <div className="flex items-center justify-between">
                            <div>
                                <h2 className="text-3xl font-serif text-white font-bold">{title || "New Series"}</h2>
                                <p className="text-slate-500 font-mono text-xs uppercase mt-2">{slug || "no-slug-defined"}</p>
                            </div>
                            <button
                                onClick={handleSave}
                                className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded font-bold uppercase tracking-widest text-xs transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                            >
                                <Save className="w-4 h-4" />
                                Save Series
                            </button>
                        </div>

                        {/* Title & Slug */}
                        <div className="grid grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-mono text-slate-500 uppercase">Series Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded p-3 focus:border-emerald-500/50 focus:outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-mono text-slate-500 uppercase">Slug URL</label>
                                <input
                                    type="text"
                                    value={slug}
                                    onChange={(e) => setSlug(e.target.value)}
                                    className="w-full bg-white/5 border border-white/10 rounded p-3 focus:border-emerald-500/50 focus:outline-none font-mono text-slate-400"
                                />
                            </div>
                        </div>

                        {/* Cover Art */}
                        <div className="space-y-4">
                            <label className="text-xs font-mono text-slate-500 uppercase flex items-center justify-between">
                                <span>Cover Art URL</span>
                                <button
                                    onClick={() => handleGenerate("image_prompt")}
                                    disabled={!selectedId || isGenerating}
                                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 disabled:opacity-50"
                                >
                                    {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    Generate Prompt
                                </button>
                            </label>

                            <div className="flex gap-6">
                                <div className="w-48 aspect-[2/3] bg-white/5 backdrop-blur-md rounded-lg overflow-hidden border border-white/10 shrink-0 relative shadow-2xl">
                                    {coverImage ? (
                                        <img src={coverImage} alt="Cover" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex flex-col items-center justify-center text-slate-700 gap-2">
                                            <ImageIcon className="w-8 h-8 opacity-50" />
                                            <span className="text-[10px] font-mono uppercase">2:3 Preview</span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-4">
                                    <input
                                        type="text"
                                        value={coverImage}
                                        onChange={(e) => setCoverImage(e.target.value)}
                                        placeholder="https://..."
                                        className="w-full bg-white/5 border border-white/10 rounded p-3 focus:border-emerald-500/50 focus:outline-none font-mono text-sm"
                                    />
                                    <div className="relative">
                                        <textarea
                                            value={imagePrompt}
                                            readOnly
                                            placeholder="AI Generated Image Prompt will appear here..."
                                            className="w-full h-24 bg-black/20 border border-white/5 rounded p-3 text-xs font-mono text-slate-500 resize-none focus:outline-none"
                                        />
                                        {imagePrompt && (
                                            <button
                                                className="absolute bottom-2 right-2 text-[10px] text-emerald-500 uppercase tracking-widest hover:text-emerald-400"
                                                onClick={() => navigator.clipboard.writeText(imagePrompt)}
                                            >
                                                Copy
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Synopsis Engine */}
                        <div className="space-y-4 pt-8 border-t border-white/5">
                            <div className="flex items-center justify-between">
                                <label className="text-xs font-mono text-slate-500 uppercase flex items-center gap-2">
                                    <Sparkles className="w-3 h-3" />
                                    Synopsis Engine
                                </label>
                                <button
                                    onClick={() => handleGenerate("synopsis")}
                                    disabled={!selectedId || isGenerating}
                                    className="px-4 py-2 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 rounded text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isGenerating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                    Generate Synopsis
                                </button>
                            </div>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Series synopsis..."
                                className="w-full h-48 bg-white/5 border border-white/10 rounded p-6 text-lg font-serif leading-relaxed text-slate-300 focus:border-emerald-500/50 focus:outline-none resize-y"
                            />
                            <p className="text-xs text-slate-500 italic">
                                * The Synopsis Engine reads all signals linked to this series to generate this text.
                            </p>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-600">
                        <div className="p-4 bg-white/5 rounded-full mb-4">
                            <ImageIcon className="w-8 h-8 opacity-50" />
                        </div>
                        <p className="font-mono text-xs uppercase tracking-widest">Select a Series to Edit</p>
                    </div>
                )}
            </main>
        </div>
    );
}
