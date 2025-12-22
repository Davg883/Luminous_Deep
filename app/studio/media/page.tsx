"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SyncMediaButton } from "@/components/studio/SyncMediaButton";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import clsx from "clsx";
import { Star, Check, Copy } from "lucide-react";

export default function MediaLibraryPage() {
    const media = useQuery(api.studio.mediaQueries.getAllMedia);
    const updateMedia = useMutation((api.studio.mediaQueries as any).updateMedia);
    const [search, setSearch] = useState("");
    const [filterVisualBible, setFilterVisualBible] = useState(false);

    if (media === undefined) return <div className="p-8 text-gray-500 animate-pulse">Loading Media Library...</div>;

    const filtered = media.filter(item =>
        (item.publicId.toLowerCase().includes(search.toLowerCase()) ||
            (item.folder && item.folder.toLowerCase().includes(search.toLowerCase()))) &&
        (!filterVisualBible || (item as any).isVisualBible === true)
    );

    const handleToggleVisualBible = async (id: Id<"media">, currentValue: boolean) => {
        try {
            await updateMedia({ id, isVisualBible: !currentValue });
        } catch (e) {
            console.error("Failed to update Visual Bible status:", e);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
                    <p className="text-gray-500 text-sm">Manage assets synced from Cloudinary • Visual Bible powers AI image generation</p>
                </div>
                <div className="flex gap-2">
                    <SyncMediaButton />
                </div>
            </header>

            {/* Search and Filters */}
            <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 flex gap-4 items-center">
                <input
                    type="text"
                    placeholder="Search media by ID or folder..."
                    className="flex-1 border border-gray-300 rounded px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
                <button
                    onClick={() => setFilterVisualBible(!filterVisualBible)}
                    className={clsx(
                        "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                        filterVisualBible
                            ? "bg-yellow-500 text-yellow-900"
                            : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    )}
                >
                    <Star className={clsx("w-4 h-4", filterVisualBible && "fill-yellow-900")} />
                    Visual Bible Only
                </button>
            </div>

            {/* Visual Bible Info Banner */}
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-xl p-4">
                <div className="flex items-center gap-3">
                    <Star className="w-6 h-6 text-yellow-600 fill-yellow-200" />
                    <div>
                        <h3 className="font-bold text-yellow-800">Visual Bible</h3>
                        <p className="text-sm text-yellow-700">
                            Mark assets as "Visual Bible" to use them as reference images when generating new AI content.
                            Julian's boathouse will always look like Julian's boathouse.
                        </p>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filtered.map(item => (
                    <div key={item._id} className={clsx(
                        "bg-white border rounded-lg overflow-hidden group hover:shadow-lg transition-all duration-300",
                        (item as any).isVisualBible ? "border-yellow-400 ring-2 ring-yellow-200" : "border-gray-200"
                    )}>
                        <div className="aspect-video bg-gray-100 flex items-center justify-center relative overflow-hidden">
                            {item.resourceType === 'video' ? (
                                <video
                                    src={item.url}
                                    className="w-full h-full object-cover"
                                    muted
                                    loop
                                    playsInline
                                    onMouseOver={e => e.currentTarget.play()}
                                    onMouseOut={e => e.currentTarget.pause()}
                                />
                            ) : (
                                <img src={item.url} className="w-full h-full object-cover" loading="lazy" alt={item.publicId} />
                            )}

                            {/* Visual Bible Badge */}
                            {(item as any).isVisualBible && (
                                <div className="absolute top-2 left-2 bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full text-[10px] font-black flex items-center gap-1">
                                    <Star className="w-3 h-3 fill-yellow-900" />
                                    BIBLE
                                </div>
                            )}

                            {/* Hover Actions */}
                            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(item.url);
                                        alert("URL Copied!");
                                    }}
                                    className="p-2 bg-white text-black rounded-lg hover:bg-gray-200"
                                    title="Copy URL"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => handleToggleVisualBible(item._id, (item as any).isVisualBible || false)}
                                    className={clsx(
                                        "p-2 rounded-lg transition-colors",
                                        (item as any).isVisualBible
                                            ? "bg-yellow-500 text-yellow-900"
                                            : "bg-white text-gray-800 hover:bg-yellow-100"
                                    )}
                                    title={`${(item as any).isVisualBible ? "Remove from" : "Add to"} Visual Bible`}
                                >
                                    <Star className={clsx("w-4 h-4", (item as any).isVisualBible && "fill-yellow-900")} />
                                </button>
                            </div>
                        </div>
                        <div className="p-3 text-xs">
                            <div className="font-bold truncate text-gray-800" title={item.publicId}>{item.publicId}</div>
                            <div className="text-gray-500 truncate mt-1">{item.folder || "Root"}</div>
                            <div className="text-gray-400 mt-2 flex justify-between items-center bg-gray-50 p-1 rounded">
                                <span className="uppercase">{item.format}</span>
                                <span>{item.width}x{item.height}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                    No media found. Try syncing or check your search.
                </div>
            )}
        </div>
    );
}
