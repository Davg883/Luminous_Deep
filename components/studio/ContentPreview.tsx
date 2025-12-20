"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import clsx from "clsx";

interface ContentPackData {
    hotspotId: string;
    domain: string;
    sceneId: Id<"scenes">;
    title: string;
    revealType: string;
    bodyCopy: string;
    hintLine?: string;
    tags: string[];
    canonRefs: string[];
    mediaRefs: string;
    status: string;
    version: number;
}

export function ContentPreview({ pack, sceneTitle }: { pack: ContentPackData, sceneTitle?: string }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex flex-col h-full">
            <div className="bg-gray-100 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-widest border-b border-gray-200 flex justify-between">
                <span>User Experience Preview</span>
                <span>{pack.revealType} Reveal</span>
            </div>

            <div className="p-8 flex-1 flex flex-col items-center justify-center bg-gray-50/50 relative overflow-hidden">
                {/* Simulated Reveal Card */}
                <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-white/40 backdrop-blur-md relative z-10 transition-all hover:scale-[1.01]">
                    <h3 className="text-xl font-bold text-gray-900 mb-4 font-sans">{pack.title}</h3>

                    <div className="text-gray-600 space-y-4 text-sm leading-relaxed max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {pack.bodyCopy.split('\n').map((para, i) => (
                            <p key={i}>{para}</p>
                        ))}
                    </div>

                    {pack.hintLine && (
                        <div className="mt-8 pt-6 border-t border-gray-100">
                            <p className="text-xs font-medium text-gray-400 italic">Hint: {pack.hintLine}</p>
                        </div>
                    )}
                </div>

                {/* Background Decor */}
                <div className="absolute top-4 left-4 text-[10px] text-gray-400 font-mono">
                    DOMAIN: {pack.domain.toUpperCase()} / SCENE: {sceneTitle?.toUpperCase() || "..."}
                </div>
            </div>

            <div className="p-4 bg-white border-t border-gray-100 grid grid-cols-2 gap-4 text-xs">
                <div>
                    <p className="text-gray-400 mb-1 uppercase font-bold text-[9px]">Status</p>
                    <span className={clsx(
                        "px-2 py-0.5 rounded-full font-bold",
                        pack.status === "Published" ? "bg-green-100 text-green-800" :
                            pack.status === "Review" ? "bg-yellow-100 text-yellow-800" :
                                "bg-blue-100 text-blue-800"
                    )}>
                        {pack.status.toUpperCase()}
                    </span>
                </div>
                <div>
                    <p className="text-gray-400 mb-1 uppercase font-bold text-[9px]">Tags</p>
                    <div className="flex flex-wrap gap-1">
                        {pack.tags.map(t => (
                            <span key={t} className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">{t}</span>
                        ))}
                    </div>
                </div>
                <div className="col-span-2">
                    <p className="text-gray-400 mb-1 uppercase font-bold text-[9px]">Canon References</p>
                    <div className="flex flex-wrap gap-1">
                        {pack.canonRefs.map(r => (
                            <span key={r} className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-100">{r}</span>
                        ))}
                    </div>
                </div>
                <div className="col-span-2">
                    <p className="text-gray-400 mb-1 uppercase font-bold text-[9px]">Media Ref</p>
                    <code className="bg-gray-800 text-gray-100 p-1 rounded block truncate">{pack.mediaRefs}</code>
                </div>
            </div>
        </div>
    );
}
