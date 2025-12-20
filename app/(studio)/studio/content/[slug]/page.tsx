"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter } from "next/navigation";
import { useState, useRef } from "react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";

export default function SceneEditor() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;

    const scene = useQuery(api.studio.scenes.getScene, { slug });
    const addObject = useMutation(api.studio.scenes.addObject);
    const deleteObject = useMutation(api.studio.scenes.deleteObject);

    // Editing State
    const [selectedPoint, setSelectedPoint] = useState<{ x: number, y: number } | null>(null);
    const [newItemName, setNewItemName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const stageRef = useRef<HTMLDivElement>(null);

    if (scene === undefined) return <div className="p-10">Loading Scene Editor...</div>;
    if (scene === null) return <div className="p-10">Scene not found: {slug}</div>;

    const handleStageClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (!stageRef.current) return;
        const rect = stageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        setSelectedPoint({ x, y });
        setNewItemName(""); // Reset form
    };

    const handleSaveObject = async () => {
        if (!selectedPoint || !newItemName.trim()) return;
        setIsSubmitting(true);
        try {
            await addObject({
                sceneId: scene._id,
                name: newItemName,
                x: selectedPoint.x,
                y: selectedPoint.y
            });
            setSelectedPoint(null);
            setNewItemName("");
        } catch (e) {
            alert("Failed to add object");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isVideo = scene.backgroundMediaUrl.includes(".mp4") || scene.backgroundMediaUrl.includes("/video/");

    return (
        <div className="flex flex-col h-screen overflow-hidden">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 p-4 flex justify-between items-center shadow-sm z-10">
                <div className="flex items-center gap-4">
                    <Link href="/studio/content" className="text-gray-500 hover:text-gray-900 font-bold text-sm">
                        &larr; Back
                    </Link>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            {scene.title}
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded uppercase">{scene.domain}</span>
                        </h1>
                    </div>
                </div>
                <div className="text-xs font-mono text-gray-400">
                    {scene.objects.length} Objects • Click background to place
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Visual Stage */}
                <div className="flex-1 bg-gray-900 relative flex items-center justify-center overflow-auto p-8">
                    <div
                        ref={stageRef}
                        className="relative shadow-2xl bg-black border border-gray-700 cursor-crosshair group select-none"
                        style={{ width: "1200px", aspectRatio: "16/9" }}
                        onClick={handleStageClick}
                    >
                        {/* Background Media */}
                        {isVideo ? (
                            <video
                                src={scene.backgroundMediaUrl}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                                autoPlay muted loop playsInline
                            />
                        ) : (
                            <img
                                src={scene.backgroundMediaUrl}
                                className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                            />
                        )}

                        {/* Existing Objects */}
                        {scene.objects.map((obj: any) => (
                            <div
                                key={obj._id}
                                className="absolute w-6 h-6 -ml-3 -mt-3 border-2 border-green-400 bg-green-500/20 rounded-full flex items-center justify-center hover:bg-green-500 hover:scale-125 transition-all z-20"
                                style={{ left: `${obj.x}%`, top: `${obj.y}%` }}
                                title={`${obj.name} (${Math.round(obj.x)}%, ${Math.round(obj.y)}%)`}
                            >
                                <div className="absolute top-full mt-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                                    {obj.name}
                                </div>
                            </div>
                        ))}

                        {/* Ghost Object (Placing) */}
                        {selectedPoint && (
                            <div
                                className="absolute w-6 h-6 -ml-3 -mt-3 border-2 border-dashed border-yellow-400 bg-yellow-400/30 rounded-full flex items-center justify-center animate-pulse z-30"
                                style={{ left: `${selectedPoint.x}%`, top: `${selectedPoint.y}%` }}
                            >
                                <div className="absolute bottom-full mb-2 bg-yellow-500 text-black font-bold text-[10px] px-2 py-1 rounded whitespace-nowrap">
                                    NEW
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
                    {selectedPoint ? (
                        <div className="p-6 border-b border-gray-100 bg-yellow-50">
                            <h3 className="font-bold text-yellow-800 mb-4">Add New Object</h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Coordinates</label>
                                    <div className="font-mono text-xs text-gray-700">
                                        X: {selectedPoint.x.toFixed(2)}%<br />
                                        Y: {selectedPoint.y.toFixed(2)}%
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Object Name</label>
                                    <input
                                        autoFocus
                                        type="text"
                                        className="w-full border border-yellow-300 rounded p-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400"
                                        placeholder="e.g. Old Lantern"
                                        value={newItemName}
                                        onChange={(e) => setNewItemName(e.target.value)}
                                        onKeyDown={(e) => e.key === "Enter" && handleSaveObject()}
                                    />
                                </div>
                                <div className="flex gap-2 pt-2">
                                    <button
                                        onClick={() => setSelectedPoint(null)}
                                        className="flex-1 px-3 py-2 bg-white border border-gray-300 rounded text-xs font-bold hover:bg-gray-50"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveObject}
                                        disabled={!newItemName || isSubmitting}
                                        className="flex-1 px-3 py-2 bg-yellow-500 text-yellow-900 rounded text-xs font-bold hover:bg-yellow-400 disabled:opacity-50"
                                    >
                                        Save Object
                                    </button>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="p-6 border-b border-gray-100 text-center text-gray-400 text-sm">
                            Click on the stage to place a new object.
                        </div>
                    )}

                    <div className="flex-1 overflow-y-auto p-4">
                        <h3 className="font-bold text-gray-900 mb-4 text-xs uppercase tracking-wider">Scene Objects</h3>
                        <div className="space-y-2">
                            {scene.objects.map((obj: any) => (
                                <div key={obj._id} className="group flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-all">
                                    <div>
                                        <div className="font-bold text-sm text-gray-700 group-hover:text-indigo-700">{obj.name}</div>
                                        <div className="text-[10px] text-gray-400 font-mono">
                                            {Math.round(obj.x)}%, {Math.round(obj.y)}%
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => deleteObject({ id: obj._id })}
                                        className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Delete Object"
                                    >
                                        🗑️
                                    </button>
                                </div>
                            ))}
                            {scene.objects.length === 0 && (
                                <p className="text-gray-400 text-xs text-center italic mt-10">No objects placed yet.</p>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
