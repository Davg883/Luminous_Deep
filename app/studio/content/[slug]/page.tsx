"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useRef } from "react";
import Link from "next/link";
import { Id } from "@/convex/_generated/dataModel";
import { Move, Plus, X } from "lucide-react";
import clsx from "clsx";

export default function SceneEditor() {
    const params = useParams();
    const router = useRouter();
    const slug = params?.slug as string;
    const searchParams = useSearchParams();

    const scene = useQuery(api.studio.scenes.getScene, { slug });
    const unlinkedReveals = useQuery(api.studio.content.listUnlinkedReveals);
    const addObject = useMutation(api.studio.scenes.addObject);
    const addObjectWithReveal = useMutation(api.studio.scenes.addObjectWithExistingReveal);
    const updateScene = useMutation(api.studio.scenes.updateScene);
    const deleteObject = useMutation(api.studio.scenes.deleteObject);
    const updateObjectPosition = useMutation(api.studio.scenes.updateObjectPosition);

    // Editing State
    const [selectedPoint, setSelectedPoint] = useState<{ x: number, y: number } | null>(null);
    const [newItemName, setNewItemName] = useState("");
    const [selectedRevealId, setSelectedRevealId] = useState<Id<"reveals"> | "">("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [manualMediaUrl, setManualMediaUrl] = useState("");

    // Move Mode State
    const [isMoveMode, setIsMoveMode] = useState(false);
    const [movingObjectId, setMovingObjectId] = useState<Id<"objects"> | null>(null);

    const stageRef = useRef<HTMLDivElement>(null);

    if (scene === undefined) return <div className="p-10">Loading Scene Editor...</div>;
    if (scene === null) return <div className="p-10">Scene not found: {slug}</div>;

    const handleUpdateMedia = async () => {
        if (!manualMediaUrl) return;
        setIsSubmitting(true);
        try {
            await updateScene({
                id: scene._id,
                title: scene.title,
                domain: scene.domain,
                backgroundMediaUrl: manualMediaUrl
            });
            alert("Media updated!");
            setManualMediaUrl("");
        } catch (e: any) {
            alert(`Update Failed: ${e.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleStageClick = async (e: React.MouseEvent<HTMLDivElement>) => {
        if (!stageRef.current) return;
        const rect = stageRef.current.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;

        // === MOVE MODE LOGIC ===
        if (isMoveMode) {
            // If an object is selected for moving, relocate it
            if (movingObjectId) {
                setIsSubmitting(true);
                try {
                    await updateObjectPosition({
                        id: movingObjectId,
                        x,
                        y,
                    });
                    console.log("✅ Object relocated to:", x.toFixed(1), y.toFixed(1));
                } catch (e: any) {
                    alert(`Relocation failed: ${e.message}`);
                } finally {
                    setIsSubmitting(false);
                    setMovingObjectId(null);
                }
            }
            // In Move Mode, clicking background does nothing else (no new object form)
            return;
        }

        // === NORMAL MODE: Set point for new object ===
        setSelectedPoint({ x, y });
        setNewItemName("");

        // Auto-select reveal if placing from library
        const placementId = searchParams.get("placeReveal");
        if (placementId) {
            setSelectedRevealId(placementId as any);
        } else {
            setSelectedRevealId("");
        }
    };

    const handleObjectClick = (e: React.MouseEvent, objectId: Id<"objects">) => {
        e.stopPropagation();

        if (isMoveMode) {
            // Select this object for moving
            setMovingObjectId(movingObjectId === objectId ? null : objectId);
        }
    };

    const handleSaveObject = async () => {
        if (!selectedPoint || !newItemName.trim()) return;
        setIsSubmitting(true);
        try {
            if (selectedRevealId) {
                // Link existing reveal
                await addObjectWithReveal({
                    sceneId: scene._id,
                    name: newItemName,
                    x: selectedPoint.x,
                    y: selectedPoint.y,
                    revealId: selectedRevealId as Id<"reveals">,
                });
            } else {
                // Create new placeholder reveal
                await addObject({
                    sceneId: scene._id,
                    name: newItemName,
                    x: selectedPoint.x,
                    y: selectedPoint.y
                });
            }
            setSelectedPoint(null);
            setNewItemName("");
            setSelectedRevealId("");
        } catch (e) {
            alert("Failed to add object");
        } finally {
            setIsSubmitting(false);
        }
    };

    const isVideo = scene.backgroundMediaUrl.includes(".mp4") || scene.backgroundMediaUrl.includes("/video/");
    const movingObject = movingObjectId ? scene.objects.find((o: any) => o._id === movingObjectId) : null;

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
                        {searchParams.get("placeReveal") && (
                            <div className="text-xs text-orange-600 font-bold animate-pulse">
                                • Click anywhere to place your item
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    {/* Move Mode Toggle */}
                    <button
                        onClick={() => {
                            setIsMoveMode(!isMoveMode);
                            setMovingObjectId(null);
                            setSelectedPoint(null);
                        }}
                        className={clsx(
                            "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all",
                            isMoveMode
                                ? "bg-orange-500 text-white"
                                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                        )}
                    >
                        <Move size={16} />
                        {isMoveMode ? "Moving..." : "Move Mode"}
                    </button>
                    <div className="text-xs font-mono text-gray-400">
                        {scene.objects.length} Objects • {isMoveMode ? "Click object, then new spot" : "Click to place"}
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                {/* Visual Stage */}
                <div className="flex-1 bg-gray-900 relative flex items-center justify-center overflow-auto p-8">
                    <div
                        ref={stageRef}
                        className={clsx(
                            "relative shadow-2xl bg-black border border-gray-700 group select-none",
                            isMoveMode && movingObjectId ? "cursor-crosshair" : isMoveMode ? "cursor-pointer" : "cursor-crosshair"
                        )}
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
                                onClick={(e) => handleObjectClick(e, obj._id)}
                                className={clsx(
                                    "absolute w-6 h-6 -ml-3 -mt-3 border-2 rounded-full flex items-center justify-center transition-all z-20",
                                    movingObjectId === obj._id
                                        ? "border-orange-400 bg-orange-500 scale-150 animate-pulse"
                                        : isMoveMode
                                            ? "border-blue-400 bg-blue-500/30 hover:bg-blue-500 hover:scale-125 cursor-grab"
                                            : "border-green-400 bg-green-500/20 hover:bg-green-500 hover:scale-125"
                                )}
                                style={{ left: `${obj.x}%`, top: `${obj.y}%` }}
                                title={`${obj.name} (${Math.round(obj.x)}%, ${Math.round(obj.y)}%)`}
                            >
                                <div className="absolute top-full mt-2 bg-black/80 text-white text-[10px] px-2 py-1 rounded whitespace-nowrap pointer-events-none">
                                    {obj.name}
                                </div>
                            </div>
                        ))}

                        {/* Ghost Object (Placing) */}
                        {selectedPoint && !isMoveMode && (
                            <div
                                className="absolute w-6 h-6 -ml-3 -mt-3 border-2 border-dashed border-yellow-400 bg-yellow-400/30 rounded-full flex items-center justify-center animate-pulse z-30"
                                style={{ left: `${selectedPoint.x}%`, top: `${selectedPoint.y}%` }}
                            >
                                <div className="absolute bottom-full mb-2 bg-yellow-500 text-black font-bold text-[10px] px-2 py-1 rounded whitespace-nowrap">
                                    NEW
                                </div>
                            </div>
                        )}

                        {/* Move Mode Indicator */}
                        {isMoveMode && movingObject && (
                            <div className="absolute top-4 left-4 bg-orange-500 text-white px-3 py-2 rounded-lg text-sm font-bold z-40 shadow-lg">
                                Moving: {movingObject.name} — Click new location
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar Controls */}
                <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
                    {selectedPoint && !isMoveMode ? (
                        <div className="p-6 border-b border-gray-100 bg-yellow-50">
                            <h3 className="font-bold text-yellow-800 mb-4 flex items-center gap-2">
                                <Plus size={16} /> Add New Object
                            </h3>
                            <div className="space-y-4">
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Coordinates</label>
                                    <div className="font-mono text-xs text-gray-700">
                                        X: {selectedPoint.x.toFixed(2)}%<br />
                                        Y: {selectedPoint.y.toFixed(2)}%
                                    </div>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-yellow-700 uppercase">Link Existing Reveal (Recommended)</label>
                                    <select
                                        className="w-full border-2 border-yellow-400 rounded p-2 text-sm outline-none focus:ring-2 focus:ring-yellow-400 bg-yellow-50"
                                        value={selectedRevealId}
                                        onChange={(e) => {
                                            const revealId = e.target.value as Id<"reveals">;
                                            setSelectedRevealId(revealId);
                                            if (revealId && unlinkedReveals) {
                                                const reveal = (unlinkedReveals as any[]).find(r => r._id === revealId);
                                                if (reveal) setNewItemName(reveal.title || "");
                                            }
                                        }}
                                    >
                                        <option value="">Create new placeholder</option>
                                        {(unlinkedReveals || []).map((reveal: any) => (
                                            <option key={reveal._id} value={reveal._id}>
                                                {reveal.title} ({reveal.type})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="text-[10px] font-bold text-gray-500 uppercase">Object Name</label>
                                    <input
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
                    ) : isMoveMode ? (
                        <div className="p-6 border-b border-gray-100 bg-orange-50">
                            <h3 className="font-bold text-orange-800 mb-2 flex items-center gap-2">
                                <Move size={16} /> Move Mode Active
                            </h3>
                            <p className="text-sm text-orange-600">
                                {movingObjectId
                                    ? "Click anywhere on the stage to relocate the object."
                                    : "Click on an object to select it for moving."}
                            </p>
                            {movingObjectId && (
                                <button
                                    onClick={() => setMovingObjectId(null)}
                                    className="mt-4 w-full px-3 py-2 bg-white border border-orange-300 rounded text-xs font-bold hover:bg-orange-100"
                                >
                                    Cancel Move
                                </button>
                            )}
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
                                <div
                                    key={obj._id}
                                    className={clsx(
                                        "group flex items-center justify-between p-3 rounded-lg border transition-all",
                                        movingObjectId === obj._id
                                            ? "bg-orange-100 border-orange-300"
                                            : "bg-gray-50 hover:bg-indigo-50 border-transparent hover:border-indigo-100"
                                    )}
                                >
                                    <div>
                                        <div className="font-bold text-sm text-gray-700 group-hover:text-indigo-700">{obj.name}</div>
                                        <div className="text-[10px] text-gray-400 font-mono">
                                            {Math.round(obj.x)}%, {Math.round(obj.y)}%
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        {isMoveMode && (
                                            <button
                                                onClick={() => setMovingObjectId(obj._id)}
                                                className={clsx(
                                                    "p-1 rounded transition-colors",
                                                    movingObjectId === obj._id
                                                        ? "text-orange-600"
                                                        : "text-gray-400 hover:text-blue-500"
                                                )}
                                                title="Select for moving"
                                            >
                                                <Move size={14} />
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteObject({ id: obj._id })}
                                            className="text-gray-400 hover:text-red-500 p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                            title="Delete Object"
                                        >
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {scene.objects.length === 0 && <p className="text-center text-gray-400 text-xs italic">No objects placed yet.</p>}
                        </div>
                    </div>

                    {/* Cinematic Behavior Toggle */}
                    <div className="p-4 border-t border-gray-200 bg-sky-50">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Cinematic Behavior</label>
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className="relative">
                                <input
                                    type="checkbox"
                                    className="sr-only peer"
                                    checked={scene.shouldLoop ?? true}
                                    onChange={async (e) => {
                                        await updateScene({
                                            id: scene._id,
                                            title: scene.title,
                                            domain: scene.domain,
                                            backgroundMediaUrl: scene.backgroundMediaUrl,
                                            shouldLoop: e.target.checked,
                                        });
                                    }}
                                />
                                <div className="w-10 h-5 bg-gray-200 rounded-full peer peer-checked:bg-sky-500 transition-colors"></div>
                                <div className="absolute left-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-5"></div>
                            </div>
                            <span className="text-sm font-medium text-gray-700 group-hover:text-sky-700">
                                Loop Background Video
                            </span>
                        </label>
                        <p className="text-[10px] text-gray-500 mt-2 italic">
                            If disabled, the video will play once and hold on the final frame (ideal for cinematic entries).
                        </p>
                    </div>

                    {/* Manual Media Override */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Force Background Media</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs"
                                placeholder="Paste Cloudinary URL..."
                                value={manualMediaUrl}
                                onChange={(e) => setManualMediaUrl(e.target.value)}
                            />
                            <button
                                onClick={handleUpdateMedia}
                                disabled={isSubmitting || !manualMediaUrl}
                                className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded hover:bg-indigo-700 disabled:opacity-50"
                            >
                                Save
                            </button>
                        </div>
                    </div>

                    {/* Ambient Audio */}
                    <div className="p-4 border-t border-gray-200 bg-gray-50">
                        <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">Ambient Audio URL (MP3/WAV)</label>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                className="flex-1 border border-gray-300 rounded px-2 py-1 text-xs"
                                placeholder="Paste Audio URL..."
                                defaultValue={scene.ambientAudioUrl || ""}
                                onBlur={async (e) => {
                                    if (e.target.value !== (scene.ambientAudioUrl || "")) {
                                        await updateScene({
                                            id: scene._id,
                                            title: scene.title,
                                            domain: scene.domain,
                                            backgroundMediaUrl: scene.backgroundMediaUrl,
                                            shouldLoop: scene.shouldLoop,
                                            ambientAudioUrl: e.target.value
                                        });
                                        // No alert to keep flow smooth? Or toast?
                                        // alert("Audio updated!");
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
