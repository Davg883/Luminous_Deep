"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import clsx from "clsx";
import { ContentPreview } from "@/components/studio/ContentPreview";
import Link from "next/link";
import { Trash2, MapPin, Brain } from "lucide-react";

function MediaResolverStatus({ publicId }: { publicId: string }) {
    const asset = useQuery(api.studio.content.resolveMedia, { publicId });

    if (asset === undefined) return <span className="text-[10px] text-gray-400">Verifying...</span>;
    if (asset === null) return <span className="text-[10px] text-red-400 font-bold">Media Ref Not Found</span>;

    return (
        <div className="flex items-center gap-1.5 bg-green-900/50 text-green-300 px-2 py-1 rounded text-[10px] font-bold border border-green-700/50">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
            RESOLVED: {asset.resourceType?.toUpperCase() || "UNKNOWN"}
        </div>
    );
}

type Tab = "Library" | "Review" | "Write" | "Scenes";


export default function ContentFactoryPage() {
    const packs = useQuery(api.studio.content.listPacks);
    const allReveals = useQuery(api.studio.content.listAllReveals);
    const scenes = useQuery(api.studio.scenes.getAllScenes);

    const importPack = useMutation(api.studio.content.importPack);
    const publishPack = useMutation(api.studio.content.publishPack);
    const updatePack = useMutation(api.studio.content.updatePack);
    const deletePack = useMutation(api.studio.content.deletePack);
    const deleteReveal = useMutation(api.studio.content.deleteReveal);
    const reassignRevealSpace = useMutation(api.studio.content.reassignRevealSpace);
    const triggerReindex = useAction((api.studio.content as any).triggerReindex);

    const router = useRouter();

    const [activeTab, setActiveTab] = useState<Tab>("Library");
    const [isSyncing, setIsSyncing] = useState(false);

    // Import State
    const [jsonInput, setJsonInput] = useState("");
    const [selectedSceneId, setSelectedSceneId] = useState<Id<"scenes"> | "">("");
    const [selectedPhase, setSelectedPhase] = useState<"early_year" | "spring" | "summer" | "autumn" | "winter">("early_year");
    const [validationResult, setValidationResult] = useState<{ errors: string[], warnings: string[] } | null>(null);
    const [previewData, setPreviewData] = useState<any>(null);
    const [overwriteConflict, setOverwriteConflict] = useState<{ id: string, title: string } | null>(null);

    // Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState<"All" | "Published" | "Draft" | "Unlinked" | "Review">("All");
    const [domainFilter, setDomainFilter] = useState("All");

    // Clear preview when switching tabs to preventing status hallucination
    useEffect(() => {
        setPreviewData(null);
    }, [activeTab]);

    // Process State
    const generateContent = useAction(api.studio.ai.generateContent);
    const [isProcessingAI, setIsProcessingAI] = useState(false);
    const [publishingIds, setPublishingIds] = useState<Set<string>>(new Set());

    const handleAIProcess = async () => {
        if (!jsonInput) return;
        setIsProcessingAI(true);

        try {
            console.log("=== MAGIC PASTE START ===");
            const refinedJson = await generateContent({
                prompt: jsonInput,
                voice: selectedSceneId === "scenes:boathouse" ? "julian" : selectedSceneId === "scenes:study" ? "eleanor" : "cassie",
                phase: selectedPhase
            });

            // Clean up markdown block
            let cleanJson = refinedJson.replace(/```json/g, '').replace(/```/g, '').trim();

            // ATTEMPT PARSE & REPAIR
            let parsedData;
            try {
                parsedData = JSON.parse(cleanJson);
            } catch (e) {
                console.warn("JSON Parse Failed. Attempting repair...");
                if (!cleanJson.endsWith("}") && !cleanJson.endsWith("]")) {
                    let repairAttempt = cleanJson + "}";
                    try {
                        parsedData = JSON.parse(repairAttempt);
                        cleanJson = repairAttempt;
                    } catch (e2) {
                        repairAttempt = cleanJson + "]}";
                        try {
                            parsedData = JSON.parse(repairAttempt);
                            cleanJson = repairAttempt;
                        } catch (e3) {
                            console.error("Auto-repair failed.");
                        }
                    }
                }
            }

            setJsonInput(cleanJson);
            if (parsedData) {
                validateJson(cleanJson);
            }
        } catch (e: any) {
            console.error("AI PROCESS ERROR:", e);
            alert(`AI Error: ${e.message || "Unknown error"}.`);
        } finally {
            setIsProcessingAI(false);
        }
    };

    const validateJson = (input: string): { success: boolean, data: any | null } => {
        try {
            const raw = JSON.parse(input);
            const data = Array.isArray(raw) ? raw[0] : raw;
            const errors: string[] = [];
            const warnings: string[] = [];
            const nested = data.reveal || data.item || data.result || {};

            const normalized = {
                hotspotId: data.hotspot_id || data.hotspotId || nested.hotspot_id || (data.title || nested.title ? (data.title || nested.title).toLowerCase().replace(/[^a-z0-9]+/g, '_') : ""),
                title: data.title || nested.title || "Untitled",
                sceneSlug: data.scene_slug || data.sceneSlug || data.domain || nested.scene_slug || "workshop",
                bodyCopy: data.content || data.body_copy || data.bodyCopy || nested.content || nested.body_copy || "",
                hintLine: data.hint || data.hint_line || data.hintLine || nested.hint || "",
                revealType: data.type || data.revealType || nested.type || "text",
                tags: data.tags || nested.tags || [],
                canonRefs: data.canon_refs || data.canonRefs || nested.canon_refs || [],
                mediaRefs: data.media_refs || data.mediaRefs || nested.media_refs || "",
                version: data.version || nested.version || 1,
                voice: data.voice || nested.voice || undefined
            };

            if (!normalized.hotspotId) errors.push("Missing hotspot_id");
            if (!normalized.title) warnings.push("Title is placeholder");
            if (!normalized.bodyCopy) errors.push("Missing content");

            setValidationResult({ errors, warnings });

            if (errors.length === 0) {
                const mergedData = { ...data, ...normalized };
                setPreviewData(mergedData);
                return { success: true, data: mergedData };
            } else {
                setPreviewData(null);
                return { success: false, data: null };
            }
        } catch (e) {
            return { success: false, data: null };
        }
    };

    const handleImport = async (forceOverwrite = false) => {
        if (!jsonInput) return;

        try {
            const raw = JSON.parse(jsonInput);
            const items = Array.isArray(raw) ? raw : [raw];
            let successCount = 0;
            let conflictPack = null;

            for (const item of items) {
                const nested = item.reveal || item.item || item.result || {};
                const rawTitle = item.title || nested.title;
                const normalized = {
                    hotspotId: item.hotspot_id || item.hotspotId || nested.hotspot_id || (rawTitle ? rawTitle.toLowerCase().replace(/[^a-z0-9]+/g, '_') : `hotspot_${Date.now()}`),
                    title: (!rawTitle || rawTitle === "Enter Title" || rawTitle === "Untitled") ? "A New Discovery" : rawTitle,
                    sceneSlug: item.scene_slug || item.sceneSlug || item.domain || nested.scene_slug || "workshop",
                    bodyCopy: item.content || item.body_copy || item.bodyCopy || nested.content || nested.body_copy || "",
                    hintLine: item.hint || item.hint_line || item.hintLine || nested.hint || "Inspect closer.",
                    revealType: item.type || item.revealType || nested.type || "text",
                    tags: item.tags || nested.tags || [],
                    canonRefs: item.canon_refs || item.canonRefs || nested.canon_refs || [],
                    mediaRefs: item.media_refs || item.mediaRefs || nested.media_refs || "",
                    version: item.version || nested.version || 1
                };

                // RESOLVE SCENE ID
                // Priority: UI Selection -> JSON Slug -> Domain -> Workshop
                let targetScene = selectedSceneId ? (scenes || []).find((s: any) => s._id === selectedSceneId) : null;

                if (!targetScene) {
                    const slugMap: Record<string, string> = {
                        "galley": "kitchen", "hearth": "lounge", "deck": "boathouse", "lab": "workshop"
                    };
                    const effectiveSlug = slugMap[normalized.sceneSlug.toLowerCase()] || normalized.sceneSlug;

                    targetScene = (scenes || []).find((s: any) => s.slug === effectiveSlug)
                        || (scenes || []).find((s: any) => s.domain.toLowerCase() === effectiveSlug.toLowerCase());
                }

                if (!targetScene) {
                    alert(`Error: Could not find a scene. Please select one.`);
                    return;
                }

                const mutationArgs = {
                    hotspotId: normalized.hotspotId,
                    domain: targetScene.slug,
                    sceneId: targetScene._id,
                    title: normalized.title,
                    revealType: normalized.revealType,
                    bodyCopy: normalized.bodyCopy,
                    hintLine: normalized.hintLine,
                    tags: normalized.tags,
                    canonRefs: normalized.canonRefs,
                    mediaRefs: normalized.mediaRefs,
                    status: "Draft" as const,
                    version: normalized.version,
                    overwriteConfirmed: forceOverwrite,
                    phase: selectedPhase
                };

                const result: any = await importPack(mutationArgs);

                if (result.conflict) {
                    conflictPack = { id: result.existingId, title: result.existingTitle };
                    if (!forceOverwrite) {
                        setOverwriteConflict(conflictPack);
                        return;
                    }
                } else {
                    successCount++;
                }
            }

            setOverwriteConflict(null);
            setJsonInput("");
            setPreviewData(null);
            setValidationResult(null);
            setSelectedSceneId("");

            alert(`Draft Saved Successfully! ${successCount} item(s) moved to Review.`);
            setActiveTab("Review");

        } catch (e: any) {
            console.error("IMPORT ERROR:", e);
            alert(`Save Failed: ${e.message}.`);
        }
    };

    const filteredPacks = useMemo(() => {
        if (!packs) return [];
        return (packs as any[]).filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.hotspotId.toLowerCase().includes(searchQuery.toLowerCase());
            const matchesStatus = statusFilter === "All" || p.status === statusFilter;
            const matchesDomain = domainFilter === "All" || p.domain === domainFilter;
            return matchesSearch && matchesStatus && matchesDomain;
        });
    }, [packs, searchQuery, statusFilter, domainFilter]);

    const filteredReveals = useMemo(() => {
        if (!allReveals) return [];
        return (allReveals as any[]).filter(r => {
            const matchesSearch = (r.title || "").toLowerCase().includes(searchQuery.toLowerCase());
            const revealStatus = !r.isLinked ? "Unlinked" : (r.status === "published" ? "Published" : r.status === "draft" ? "Draft" : "Review");
            const matchesStatus = statusFilter === "All" || revealStatus === statusFilter;
            return matchesSearch && matchesStatus;
        });
    }, [allReveals, searchQuery, statusFilter]);

    if (packs === undefined || scenes === undefined) return <div className="p-8">Loading Factory...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-sans">Content Factory</h1>
                    <p className="text-gray-500 text-sm">Draft, Review, and Publish the Luminous Deep experience.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {(["Library", "Review", "Write", "Scenes"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab as any)}
                            className={clsx(
                                "px-6 py-1.5 rounded-md text-sm font-bold transition-all",
                                activeTab === tab ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
                            )}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
            </div>

            {/* TAB: SCENES */}
            {activeTab === "Scenes" && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slug</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Domain</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {(scenes || []).map((scene: any) => (
                                <tr key={scene._id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">{scene.title}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">{scene.slug}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">{scene.domain}</span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link href={`/studio/content/${scene.slug}`} className="text-indigo-600 hover:text-indigo-900">Edit</Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TAB: LIBRARY */}
            {activeTab === "Library" && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-4">
                        <div className="flex gap-4 items-center bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                            <input
                                type="text"
                                placeholder="Search reveals..."
                                className="flex-1 border-none bg-gray-50 rounded-md px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <select className="border-none bg-gray-50 rounded-md px-4 py-2 text-sm outline-none" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}>
                                <option value="All">All Status</option>
                                <option value="Draft">Draft</option>
                                <option value="Review">Review</option>
                                <option value="Published">Published</option>
                                <option value="Unlinked">Unlinked</option>
                            </select>
                            <button
                                onClick={async () => {
                                    setIsSyncing(true);
                                    try {
                                        const result = await triggerReindex({});
                                        alert(`✅ ${result}`);
                                    } catch (e: any) {
                                        console.error("Reindex Error:", e);
                                        alert(`❌ Sync Failed: ${e.message || e.data || JSON.stringify(e)}`);
                                    } finally {
                                        setTimeout(() => setIsSyncing(false), 2000);
                                    }
                                }}
                                disabled={isSyncing}
                                className={clsx(
                                    "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold text-white transition-all shadow-md",
                                    isSyncing ? "bg-indigo-400 cursor-wait" : "bg-indigo-600 hover:bg-indigo-700 hover:shadow-lg"
                                )}
                            >
                                <Brain className={clsx("w-4 h-4", isSyncing && "animate-pulse")} />
                                {isSyncing ? "Syncing..." : "Reindex Canon"}
                            </button>
                        </div>

                        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden max-h-[70vh] overflow-y-auto">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0">
                                    <tr className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                        <th className="px-4 py-3 text-left">Title</th>
                                        <th className="px-4 py-3 text-left">Type</th>
                                        <th className="px-4 py-3 text-left">Status</th>
                                        <th className="px-4 py-3 text-left">Location</th>
                                        <th className="px-4 py-3 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {filteredReveals.length === 0 ? (
                                        <tr><td colSpan={5} className="px-4 py-12 text-center text-gray-400">No reveals found.</td></tr>
                                    ) : filteredReveals.map((reveal: any) => {
                                        const displayStatus = !reveal.isLinked ? "Unlinked" : reveal.status || "Draft";
                                        const isSelected = previewData?._id === reveal._id;
                                        return (
                                            <tr
                                                key={reveal._id}
                                                className={clsx("transition-colors cursor-pointer", isSelected ? "bg-indigo-50 border-l-4 border-l-indigo-500" : "hover:bg-gray-50")}
                                                onClick={() => setPreviewData(reveal)}
                                            >
                                                <td className="px-4 py-3">
                                                    <div className="text-sm font-bold text-gray-900">{reveal.title || "Untitled"}</div>
                                                    <div className="text-[10px] text-gray-400 truncate max-w-[200px]">{(reveal.content || "").substring(0, 50)}...</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="text-xs font-medium text-indigo-600 uppercase">{reveal.type || "text"}</div>
                                                    {reveal.voice && <div className="text-[10px] text-gray-500 capitalize">{reveal.voice}</div>}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className={clsx("px-2 py-0.5 rounded text-[10px] font-black uppercase",
                                                        displayStatus === "published" ? "bg-green-100 text-green-700" :
                                                            displayStatus === "Unlinked" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                                                    )}>{displayStatus}</span>
                                                </td>
                                                <td className="px-4 py-3 text-xs text-gray-500">
                                                    <div className="flex items-center gap-1 group/loc">
                                                        <select
                                                            value={reveal.scene_slug}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onChange={async (e) => {
                                                                e.stopPropagation();
                                                                await reassignRevealSpace({ revealId: reveal._id, newSceneSlug: e.target.value });
                                                            }}
                                                            className="bg-transparent font-medium border-b border-transparent hover:border-gray-300 focus:border-indigo-500 outline-none text-gray-700 cursor-pointer py-0.5 max-w-[120px]"
                                                        >
                                                            {scenes?.map((s: any) => (
                                                                <option key={s._id} value={s.slug}>{s.title}</option>
                                                            ))}
                                                        </select>
                                                        {reveal.isLinked ? (
                                                            <MapPin className="w-3 h-3 text-gray-300 group-hover/loc:text-indigo-500 transition-colors" />
                                                        ) : (
                                                            <span className="text-[9px] font-black text-amber-600 bg-amber-50 px-1 rounded animate-pulse">UNPLACED</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2 items-center">
                                                        {!reveal.isLinked && (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const fallbackSlug = (scenes || []).find((s: any) => s._id === selectedSceneId)?.slug || "workshop";
                                                                    const targetSlug = reveal.scene_slug || fallbackSlug;
                                                                    router.push(`/studio/content/${targetSlug}?placeReveal=${reveal._id}`);
                                                                }}
                                                                className="text-xs bg-orange-100 text-orange-700 px-2 py-1.5 rounded font-bold hover:bg-orange-200 flex items-center gap-1 transition-colors"
                                                            >
                                                                <MapPin className="w-3 h-3 animate-pulse" /> Place
                                                            </button>
                                                        )}
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (confirm("Delete this reveal?")) deleteReveal({ id: reveal._id });
                                                            }}
                                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            <div className="px-4 py-2 bg-gray-50 border-t text-xs text-gray-500 sticky bottom-0">
                                {filteredReveals.length} of {allReveals?.length || 0} reveals
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col h-[75vh] sticky top-4">
                        <h2 className="text-lg font-bold mb-3 flex items-center gap-2">
                            Preview
                            {previewData && <span className="bg-purple-100 text-purple-700 text-[10px] font-black px-2 py-0.5 rounded">LIBRARY</span>}
                        </h2>
                        {previewData ? (
                            <div className="flex flex-col h-full gap-4 relative">
                                <ContentPreview pack={previewData} sceneTitle={previewData.linkedSceneName || "Unplaced"} />
                                <button
                                    onClick={() => {
                                        const targetSlug = previewData.scene_slug || previewData.domain || "workshop";
                                        router.push(`/studio/content/${targetSlug}?placeReveal=${previewData._id}`);
                                    }}
                                    className="absolute top-16 right-8 bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 px-6 rounded-xl shadow-2xl z-[9999] flex items-center gap-2 animate-bounce cursor-pointer border-2 border-white/20"
                                >
                                    <MapPin className="w-6 h-6" />
                                    <span>ANCHOR TO {(previewData.scene_slug || previewData.domain || "SCENE").toUpperCase()}</span>
                                </button>
                            </div>
                        ) : (
                            <div className="flex-1 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-center p-8">
                                <p>Click a row to preview</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB: REVIEW */}
            {activeTab === "Review" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4 overflow-y-auto max-h-[80vh] pr-2 custom-scrollbar">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <span className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></span>
                            Review Queue ({(packs || []).filter((p: any) => p.status === "Review" || p.status === "Draft").length})
                        </h2>
                        {(packs || []).filter((p: any) => p.status === "Review" || p.status === "Draft").map((pack: any) => (
                            <div key={pack._id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group" onClick={() => setPreviewData(pack)}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{pack.title}</h3>
                                        <p className="text-xs text-gray-500 font-mono uppercase tracking-tight">{pack.domain} / {(scenes || []).find((s: any) => s._id === pack.sceneId)?.title}</p>
                                    </div>
                                    <span className="bg-yellow-100 text-yellow-800 text-[10px] font-black px-2 py-0.5 rounded">NEEDS REVIEW</span>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-3 mb-4 leading-relaxed italic">"{pack.bodyCopy}"</p>
                                <div className="flex justify-end gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); updatePack({ id: pack._id, status: "Draft" }); }} className="text-xs font-bold px-3 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200">Reject</button>
                                    <button
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            setPublishingIds(prev => new Set(prev).add(pack._id));
                                            try {
                                                await publishPack({ id: pack._id });
                                                setActiveTab("Library");
                                            } catch (err) {
                                                alert("Publishing failed.");
                                            } finally {
                                                setPublishingIds(prev => {
                                                    const newSet = new Set(prev);
                                                    newSet.delete(pack._id);
                                                    return newSet;
                                                });
                                            }
                                        }}
                                        disabled={publishingIds.has(pack._id)}
                                        className="text-xs font-bold px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        Approve & Publish
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col h-[80vh]">
                        <h2 className="text-lg font-bold mb-4">Selected Preview</h2>
                        {previewData ? (
                            <ContentPreview
                                pack={previewData}
                                sceneTitle={(scenes || []).find((s: any) => s._id === previewData.sceneId)?.title}
                                sceneBackgroundUrl={(scenes || []).find((s: any) => s._id === previewData.sceneId)?.backgroundMediaUrl}
                            />
                        ) : (
                            <div className="flex-1 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-center p-12">
                                <p>Select an item from the queue to preview it.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB: WRITE */}
            {activeTab === "Write" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[75vh]">
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold">Drop a Story Fragment</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAIProcess}
                                    disabled={!jsonInput || isProcessingAI}
                                    className="bg-purple-600 text-white px-4 py-1.5 rounded-md text-sm font-bold shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isProcessingAI ? "Processing..." : "✨ Magic Paste (Gemini)"}
                                </button>
                                <button onClick={() => validateJson(jsonInput)} className="bg-indigo-600 text-white px-4 py-1.5 rounded-md text-sm font-bold shadow-sm hover:shadow-md transition-all">Validate</button>
                                <button onClick={() => handleImport(false)} disabled={!previewData} className="bg-green-600 text-white px-4 py-1.5 rounded-md text-sm font-bold shadow-sm hover:shadow-md transition-all disabled:opacity-50">Save as Draft</button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Target Scene</label>
                                            <select value={selectedSceneId} onChange={(e) => setSelectedSceneId(e.target.value as Id<"scenes">)} className="w-full text-sm font-bold border-none bg-gray-50 rounded-md p-2 outline-none">
                                                <option value="">Select a scene...</option>
                                                {(scenes || []).map((s: any) => <option key={s?._id} value={s?._id}>{s?.title} ({s?.domain})</option>)}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Narrative Phase</label>
                                            <select value={selectedPhase} onChange={(e) => setSelectedPhase(e.target.value as any)} className="w-full text-sm font-bold border-none bg-gray-50 rounded-md p-2 outline-none">
                                                <option value="early_year">Early Year</option>
                                                <option value="spring">Spring</option>
                                                <option value="summer">Summer</option>
                                                <option value="autumn">Autumn</option>
                                                <option value="winter">Winter</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 relative">
                                <textarea
                                    className="w-full h-full bg-gray-900 text-indigo-300 font-mono text-xs p-6 rounded-xl border border-gray-700 shadow-xl outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                                    placeholder='Paste a raw story fragment here...'
                                    value={jsonInput}
                                    onChange={(e) => {
                                        setJsonInput(e.target.value);
                                        if (e.target.value.trim().endsWith("}")) validateJson(e.target.value);
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <h2 className="text-lg font-bold">Import Preview</h2>
                        {previewData ? (
                            <ContentPreview pack={previewData} sceneTitle={(scenes || []).find((s: any) => s._id === selectedSceneId)?.title} sceneBackgroundUrl={(scenes || []).find((s: any) => s._id === selectedSceneId)?.backgroundMediaUrl} />
                        ) : (
                            <div className="flex-1 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-center p-12">
                                <p>Write or paste your story to visualize it.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {overwriteConflict && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Overwrite Hotspot?</h3>
                        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                            A hotspot with ID <span className="font-mono bg-gray-100 px-1 rounded text-red-500">{overwriteConflict.id}</span> already exists.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setOverwriteConflict(null)} className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all">Cancel</button>
                            <button onClick={() => handleImport(true)} className="px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all">Overwrite</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
