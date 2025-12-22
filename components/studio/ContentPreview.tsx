"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import clsx from "clsx";
import RevealCard from "@/components/narrative/RevealCard"; // Check import path
import Atmosphere from "@/components/layout/Atmosphere"; // Check import path
import { RevealType, Domain } from "@/lib/types";

// Flexible interface for both DB (camelCase) and Raw JSON (snake_case)
interface ContentPackData {
    hotspotId?: string;
    hotspot_id?: string;
    domain?: string;
    sceneSlug?: string; // from raw json
    sceneId?: Id<"scenes">;
    title: string;
    revealType?: string;
    type?: string; // from raw json
    bodyCopy?: string;
    content?: string; // from raw json
    hintLine?: string;
    hint?: string; // from raw json
    hint_line?: string; // from raw json
    tags?: string[];
    canonRefs?: string[];
    canon_refs?: string[]; // from raw json
    mediaRefs?: string;
    media_refs?: string; // from raw json
    status?: string;
    version?: number;
    // Coordinates
    x?: number;
    y?: number;
}

export function ContentPreview({ pack, sceneTitle, sceneBackgroundUrl }: { pack: ContentPackData, sceneTitle?: string, sceneBackgroundUrl?: string }) {
    // Normalize Data
    const displayTitle = pack.title || "Untitled Reveal";
    const displayBody = pack.bodyCopy || pack.content || "";
    // Prioritize hint (new standard), then hint_line (old standard), then hintLine (db)
    const displayHint = pack.hint || pack.hint_line || pack.hintLine || "";
    const displayType = (pack.revealType || pack.type || "text") as RevealType;
    const rawDomain = (pack.domain || pack.sceneSlug || "workshop").toLowerCase();

    // Domain Mapping Logic
    const DOMAIN_MAP: Record<string, { style: Domain, label: string }> = {
        "lounge": { style: "study", label: "THE HEARTH" },
        "study": { style: "study", label: "THE STUDY" },
        "kitchen": { style: "workshop", label: "THE GALLEY" },
        "galley": { style: "workshop", label: "THE GALLEY" }, // Handle aliasing
        "workshop": { style: "workshop", label: "THE WORKSHOP" },
        "lantern": { style: "boathouse", label: "THE LANTERN" },
        "boathouse": { style: "boathouse", label: "THE BOATHOUSE" },
        "luminous-deep": { style: "luminous-deep" as any, label: "LUMINOUS DEEP" },
        "home": { style: "home", label: "HOME" }
    };

    const domainConfig = DOMAIN_MAP[rawDomain] || { style: "workshop", label: rawDomain.toUpperCase() };

    const displayTags = pack.tags || [];
    const displayCanon = pack.canonRefs || pack.canon_refs || [];
    const displayMedia = pack.mediaRefs || pack.media_refs || undefined;
    const displayStatus = pack.status || "Draft";

    const displayX = pack.x || 50;
    const displayY = pack.y || 50;

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
            <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 flex justify-between">
                <span>High-Fidelity Preview</span>
                <span>{domainConfig.label} • {displayType.toUpperCase()}</span>
            </div>

            {/* High Fidelity Environment */}
            <div className="flex-1 relative overflow-hidden bg-black group">
                {/* 1. Atmosphere Layer */}
                <Atmosphere domain={domainConfig.style} className="absolute inset-0 pointer-events-none" />

                {/* 2. Embedded Reveal Card (Scrollable) */}
                <div className="absolute inset-0 z-10 overflow-y-auto custom-scrollbar p-8 flex flex-col items-center">
                    <div className="w-full max-w-md my-auto">
                        <RevealCard
                            title={displayTitle}
                            content={displayBody}
                            type={displayType}
                            domain={domainConfig.style}
                            isOpen={true}
                            onClose={() => { }}
                            mediaUrl={displayMedia}
                            isEmbedded={true}
                        />
                    </div>
                </div>

                {/* 3. Mini-Scene Map (Coordinate Check) */}
                <div className="absolute bottom-4 right-4 w-32 h-24 bg-black/50 backdrop-blur-md border border-white/20 rounded-lg overflow-hidden shadow-2xl opacity-50 group-hover:opacity-100 transition-opacity z-20 pointer-events-none">
                    {sceneBackgroundUrl ? (
                        <div className="relative w-full h-full">
                            <img src={sceneBackgroundUrl} alt="Context" className="w-full h-full object-cover opacity-50 grayscale" />
                            {/* Coordinate Dot */}
                            <div
                                className="absolute w-2 h-2 bg-red-500 rounded-full border border-white shadow-[0_0_10px_rgba(255,0,0,0.8)] transform -translate-x-1/2 -translate-y-1/2 transition-all duration-300"
                                style={{ left: `${displayX}%`, top: `${displayY}%` }}
                            />
                            <div className="absolute bottom-1 left-1 text-[8px] text-white font-mono bg-black/50 px-1 rounded">
                                {displayX},{displayY}
                            </div>
                        </div>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-[8px] text-gray-500 font-mono">
                            NO MAP
                        </div>
                    )}
                </div>

                {/* Decor */}
                <div className="absolute top-4 left-4 text-[10px] text-white/30 font-mono z-0 pointer-events-none">
                    SCENE: {sceneTitle?.toUpperCase() || "..."}
                </div>
            </div>

            {/* Metadata Footer */}
            <div className="p-4 bg-white border-t border-gray-100 grid grid-cols-2 gap-4 text-xs">
                <div className="col-span-2 bg-gray-50 p-2 rounded border border-gray-100 flex items-center gap-2">
                    <span className="text-gray-400 uppercase font-bold text-[9px] w-8">Hint</span>
                    <span className="font-mono text-indigo-600 italic">"{displayHint}"</span>
                </div>
                <div>
                    <p className="text-gray-400 mb-1 uppercase font-bold text-[9px]">Status</p>
                    <span className={clsx(
                        "px-2 py-0.5 rounded-full font-bold",
                        displayStatus === "Published" ? "bg-green-100 text-green-800" : "bg-yellow-100 text-yellow-800"
                    )}>
                        {displayStatus === "Published" ? "PUBLISHED" : "NEEDS REVIEW"}
                    </span>
                </div>
                <div>
                    <p className="text-gray-400 mb-1 uppercase font-bold text-[9px]">Tags</p>
                    <div className="flex flex-wrap gap-1">
                        {displayTags.map(t => (
                            <span key={t} className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{t}</span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
