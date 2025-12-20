"use client";

import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useState, useMemo } from "react";
import { Id } from "@/convex/_generated/dataModel";
import clsx from "clsx";
import { ContentPreview } from "@/components/studio/ContentPreview";
import Link from "next/link";

function MediaResolverStatus({ publicId }: { publicId: string }) {
    const asset = useQuery(api.studio.content.resolveMedia, { publicId });

    if (asset === undefined) return <span className="text-[10px] text-gray-400">Verifying...</span>;
    if (asset === null) return <span className="text-[10px] text-red-400 font-bold">Media Ref Not Found</span>;

    return (
        <div className="flex items-center gap-1.5 bg-green-900/50 text-green-300 px-2 py-1 rounded text-[10px] font-bold border border-green-700/50">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full"></span>
            RESOLVED: {asset.resourceType.toUpperCase()}
        </div>
    );
}

type Tab = "Library" | "Review" | "Import" | "Scenes";


export default function ContentFactoryPage() {
    const packs = useQuery(api.studio.content.listPacks);
    const scenes = useQuery(api.studio.scenes.getAllScenes);
    const importPack = useMutation(api.studio.content.importPack);
    const publishPack = useMutation(api.studio.content.publishPack);
    const updatePack = useMutation(api.studio.content.updatePack);
    const deletePack = useMutation(api.studio.content.deletePack);

    const [activeTab, setActiveTab] = useState<Tab>("Library");

    // Import State
    const [jsonInput, setJsonInput] = useState("");
    const [selectedSceneId, setSelectedSceneId] = useState<Id<"scenes"> | "">("");
    const [validationResult, setValidationResult] = useState<{ errors: string[], warnings: string[] } | null>(null);
    const [previewData, setPreviewData] = useState<any>(null);
    const [overwriteConflict, setOverwriteConflict] = useState<{ id: string, title: string } | null>(null);

    // Filter State
    const [searchQuery, setSearchQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [domainFilter, setDomainFilter] = useState("All");

    // AI State
    const generateContent = useAction(api.studio.ai.generateContent);
    const [isProcessingAI, setIsProcessingAI] = useState(false);

    const handleAIProcess = async () => {
        if (!jsonInput) return;
        setIsProcessingAI(true);
        try {
            const prompt = `You are a creative technical writer for a mystery game. 
            Review the following JSON content pack. Improve the 'body_copy' to be atmospheric, subtle, and consistent with the domain. 
            Ensure strict JSON validity.
            
            Input:
            ${jsonInput}
            
            Return ONLY the valid JSON with no markdown formatting.`;

            const refinedJson = await generateContent({ prompt });
            // Clean up markdown block if present
            const cleanJson = refinedJson.replace(/```json/g, '').replace(/```/g, '').trim();
            setJsonInput(cleanJson);
            validateJson(cleanJson);
        } catch (e) {
            alert("AI processing failed.");
        } finally {
            setIsProcessingAI(false);
        }
    };

    const validateJson = (input: string) => {
        try {
            const data = JSON.parse(input);
            const errors: string[] = [];
            const warnings: string[] = [];

            if (!data.hotspot_id) errors.push("Missing hotspot_id");
            if (!data.domain) errors.push("Missing domain");
            if (!data.hotspot_title) errors.push("Missing hotspot_title");
            if (!data.reveal_type) errors.push("Missing reveal_type");
            if (!data.body_copy) errors.push("Missing body_copy");

            if (data.body_copy && (data.body_copy.length < 50 || data.body_copy.length > 2000)) {
                warnings.push("Body copy length is outside the ideal range (150-300 words recommended).");
            }
            if (!data.tags || data.tags.length === 0) warnings.push("Missing tags (required for discovery).");
            if (!data.canon_refs || data.canon_refs.length === 0) warnings.push("Missing canon_refs.");
            if (!data.media_refs) warnings.push("Missing media_refs.");

            setValidationResult({ errors, warnings });
            if (errors.length === 0) {
                setPreviewData(data);
            } else {
                setPreviewData(null);
            }
        } catch (e) {
            setValidationResult({ errors: ["Invalid JSON format"], warnings: [] });
            setPreviewData(null);
        }
    };

    const handleImport = async (forceOverwrite = false) => {
        if (!jsonInput || !selectedSceneId) return;

        try {
            const data = JSON.parse(jsonInput);
            const items = Array.isArray(data) ? data : [data];

            let successCount = 0;
            let conflictPack = null;

            for (const item of items) {
                const result: any = await importPack({
                    hotspotId: item.hotspot_id,
                    domain: item.domain,
                    sceneId: selectedSceneId as Id<"scenes">,
                    title: item.hotspot_title,
                    revealType: item.reveal_type,
                    bodyCopy: item.body_copy,
                    hintLine: item.hint_line,
                    tags: item.tags || [],
                    canonRefs: item.canon_refs || [],
                    mediaRefs: item.media_refs || "",
                    status: "Draft",
                    version: item.version || 1,
                    overwriteConfirmed: forceOverwrite
                });

                if (result.conflict) {
                    conflictPack = { id: result.existingId, title: result.existingTitle };
                    if (!forceOverwrite) {
                        setOverwriteConflict(conflictPack);
                        return; // Stop and ask for confirmation
                    }
                } else {
                    successCount++;
                }
            }

            setOverwriteConflict(null);
            setJsonInput("");
            setPreviewData(null);
            setValidationResult(null);
            setActiveTab("Library");
            alert(`Import complete: ${successCount} packs saved as Draft.`);
        } catch (e) {
            alert("Import failed. Check JSON format.");
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

    if (packs === undefined || scenes === undefined) return <div className="p-8">Loading Factory...</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold font-sans">Content Factory</h1>
                    <p className="text-gray-500 text-sm">Draft, Review, and Publish the Luminous Deep experience.</p>
                </div>
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    {(["Library", "Review", "Import", "Scenes"] as Tab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
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
                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                            {scene.domain}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <Link href={`/studio/content/${scene.slug}`} className="text-indigo-600 hover:text-indigo-900">
                                            Edit
                                        </Link>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* TAB: LIBRARY */}
            {activeTab === "Library" && (
                <div className="space-y-4">
                    <div className="flex gap-4 items-center bg-white p-4 rounded-lg border border-gray-100 shadow-sm">
                        <input
                            type="text"
                            placeholder="Search hotspots..."
                            className="flex-1 border-none bg-gray-50 rounded-md px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500/20"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <select
                            className="border-none bg-gray-50 rounded-md px-4 py-2 text-sm outline-none"
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                        >
                            <option value="All">All Status</option>
                            <option value="Draft">Draft</option>
                            <option value="Review">Review</option>
                            <option value="Published">Published</option>
                        </select>
                        <select
                            className="border-none bg-gray-50 rounded-md px-4 py-2 text-sm outline-none"
                            value={domainFilter}
                            onChange={(e) => setDomainFilter(e.target.value)}
                        >
                            <option value="All">All Domains</option>
                            <option value="Home">Home</option>
                            <option value="Workshop">Workshop</option>
                            <option value="Study">Study</option>
                            <option value="Boathouse">Boathouse</option>
                        </select>
                    </div>

                    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr className="text-xs font-black text-gray-400 uppercase tracking-widest">
                                    <th className="px-6 py-4 text-left">Hotspot / ID</th>
                                    <th className="px-6 py-4 text-left">Location</th>
                                    <th className="px-6 py-4 text-left">Status</th>
                                    <th className="px-6 py-4 text-left">Version</th>
                                    <th className="px-6 py-4 text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {filteredPacks.map((pack: any) => (
                                    <tr key={pack._id} className="hover:bg-gray-50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-bold text-gray-900">{pack.title}</div>
                                            <div className="text-[10px] font-mono text-gray-400">{pack.hotspotId}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-xs font-medium text-indigo-600 uppercase">{pack.domain}</div>
                                            <div className="text-[11px] text-gray-500">{(scenes || []).find((s: any) => s._id === pack.sceneId)?.title}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={clsx(
                                                "px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider",
                                                pack.status === "Published" ? "bg-green-100 text-green-700" :
                                                    pack.status === "Review" ? "bg-yellow-100 text-yellow-700" :
                                                        "bg-blue-100 text-blue-700"
                                            )}>
                                                {pack.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-500 font-mono">
                                            v{pack.version}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-xs font-bold space-x-3">
                                            {pack.status === "Draft" && (
                                                <button onClick={() => updatePack({ id: pack._id, status: "Review" })} className="text-indigo-600 hover:underline">Submit Review</button>
                                            )}
                                            {pack.status === "Review" && (
                                                <button onClick={() => publishPack({ id: pack._id })} className="text-green-600 hover:underline">Publish</button>
                                            )}
                                            <button onClick={() => deletePack({ id: pack._id })} className="text-gray-400 hover:text-red-600">Delete</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* TAB: REVIEW */}
            {activeTab === "Review" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-4 overflow-y-auto max-h-[80vh] pr-2 custom-scrollbar">
                        <h2 className="text-lg font-bold flex items-center gap-2">
                            <span className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse"></span>
                            Review Queue ({(packs || []).filter((p: any) => p.status === "Review").length})
                        </h2>
                        {(packs || []).filter((p: any) => p.status === "Review").map((pack: any) => (
                            <div key={pack._id} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:border-indigo-300 transition-all cursor-pointer group" onClick={() => setPreviewData(pack)}>
                                <div className="flex justify-between items-start mb-4">
                                    <div>
                                        <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors">{pack.title}</h3>
                                        <p className="text-xs text-gray-500 font-mono uppercase tracking-tight">{pack.domain} / {(scenes || []).find((s: any) => s._id === pack.sceneId)?.title}</p>
                                    </div>
                                    <span className="bg-yellow-100 text-yellow-800 text-[10px] font-black px-2 py-0.5 rounded">IN REVIEW</span>
                                </div>
                                <p className="text-sm text-gray-600 line-clamp-3 mb-4 leading-relaxed italic">"{pack.bodyCopy}"</p>
                                <div className="flex justify-end gap-2">
                                    <button onClick={(e) => { e.stopPropagation(); updatePack({ id: pack._id, status: "Draft" }); }} className="text-xs font-bold px-3 py-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200">Reject</button>
                                    <button onClick={(e) => { e.stopPropagation(); publishPack({ id: pack._id }); }} className="text-xs font-bold px-3 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700">Approve & Publish</button>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="flex flex-col h-[80vh]">
                        <h2 className="text-lg font-bold mb-4">Selected Preview</h2>
                        {previewData ? (
                            <ContentPreview pack={previewData} sceneTitle={(scenes || []).find((s: any) => s._id === previewData.sceneId)?.title} />
                        ) : (
                            <div className="flex-1 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-center p-12">
                                <p>Select an item from the queue to preview it as the user will see it.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB: IMPORT */}
            {activeTab === "Import" && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-[75vh]">
                    <div className="flex flex-col gap-4">
                        <div className="flex justify-between items-center">
                            <h2 className="text-lg font-bold">Import Content Pack</h2>
                            <div className="flex gap-2">
                                <button
                                    onClick={handleAIProcess}
                                    disabled={!jsonInput || isProcessingAI}
                                    className="bg-purple-600 text-white px-4 py-1.5 rounded-md text-sm font-bold shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2"
                                >
                                    {isProcessingAI ? (
                                        <>
                                            <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                                            Refining...
                                        </>
                                    ) : (
                                        <>
                                            <span>✨</span> Refine with Gemini
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={() => validateJson(jsonInput)}
                                    className="bg-indigo-600 text-white px-4 py-1.5 rounded-md text-sm font-bold shadow-sm hover:shadow-md transition-all active:scale-95"
                                >
                                    Validate JSON
                                </button>
                                <button
                                    onClick={() => handleImport(false)}
                                    disabled={!previewData || !selectedSceneId}
                                    className="bg-green-600 text-white px-4 py-1.5 rounded-md text-sm font-bold shadow-sm hover:shadow-md transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Save as Draft
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[10px] uppercase font-black text-gray-400 mb-1">Target Scene</label>
                                        <select
                                            value={selectedSceneId}
                                            onChange={(e) => setSelectedSceneId(e.target.value as Id<"scenes">)}
                                            className="w-full text-sm font-bold border-none bg-gray-50 rounded-md p-2 outline-none focus:ring-2 focus:ring-indigo-500/20"
                                        >
                                            <option value="">Select a scene...</option>
                                            {(scenes || []).map((s: any) => <option key={s._id} value={s._id}>{s.title} ({s.domain})</option>)}
                                        </select>
                                    </div>
                                    <div className="flex items-end">
                                        <button
                                            onClick={() => {
                                                const scene = (scenes || []).find((s: any) => s._id === selectedSceneId);
                                                const template = {
                                                    "hotspot_id": `${scene?.slug || "scene"}_hotspot_${Date.now()}`,
                                                    "domain": scene?.domain || "Home",
                                                    "scene_id": scene?.slug || "home",
                                                    "hotspot_title": "Enter Title",
                                                    "reveal_type": "text",
                                                    "body_copy": "The tide ripples against the pilings...",
                                                    "hint_line": "Look closer at the wood.",
                                                    "tags": ["discovery"],
                                                    "canon_refs": ["sea"],
                                                    "media_refs": "LD_HOME/Tide_Video",
                                                    "version": 1
                                                };
                                                setJsonInput(JSON.stringify(template, null, 2));
                                            }}
                                            className="text-[10px] font-black uppercase tracking-wider text-gray-400 hover:text-indigo-600 px-2 py-1 rounded hover:bg-indigo-50 transition-all"
                                        >
                                            Generate Sample Template
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-1 relative">
                                <textarea
                                    className="w-full h-full bg-gray-900 text-indigo-300 font-mono text-xs p-6 rounded-xl border border-gray-700 shadow-xl outline-none focus:ring-2 focus:ring-indigo-500/50 resize-none"
                                    placeholder='{ "hotspot_id": "...", ... }'
                                    value={jsonInput}
                                    onChange={(e) => {
                                        setJsonInput(e.target.value);
                                        if (e.target.value.trim().endsWith("}")) validateJson(e.target.value);
                                    }}
                                />
                                {previewData?.media_refs && (
                                    <div className="absolute bottom-4 right-4 pointer-events-none">
                                        <MediaResolverStatus publicId={previewData.media_refs} />
                                    </div>
                                )}
                            </div>

                        </div>

                        {validationResult && (
                            <div className={clsx(
                                "p-4 rounded-xl border text-xs font-medium space-y-1",
                                validationResult.errors.length > 0 ? "bg-red-50 border-red-100 text-red-800" : "bg-green-50 border-green-100 text-green-800"
                            )}>
                                {validationResult.errors.length > 0 ? (
                                    <>
                                        <p className="font-black uppercase tracking-widest text-[10px] mb-2">Critical Errors</p>
                                        {validationResult.errors.map(e => <div key={e}>• {e}</div>)}
                                    </>
                                ) : (
                                    <>
                                        <p className="font-black uppercase tracking-widest text-[10px] mb-2 text-green-600">Structure Valid</p>
                                        {validationResult.warnings.map(w => <div key={w} className="text-yellow-700">• {w}</div>)}
                                    </>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col gap-4">
                        <h2 className="text-lg font-bold">Import Preview</h2>
                        {previewData ? (
                            <ContentPreview pack={previewData} sceneTitle={(scenes || []).find((s: any) => s._id === selectedSceneId)?.title} />
                        ) : (
                            <div className="flex-1 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center text-gray-400 text-center p-12">
                                <p>Enter valid JSON and select a scene to see the end-user preview.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Overwrite Confirmation Dialog */}
            {overwriteConflict && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full text-center">
                        <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center text-2xl mx-auto mb-6">⚠️</div>
                        <h3 className="text-xl font-bold text-gray-900 mb-2">Overwrite Hotspot?</h3>
                        <p className="text-gray-500 text-sm mb-8 leading-relaxed">
                            A hotspot with ID <span className="font-mono bg-gray-100 px-1 rounded text-red-500">{overwriteConflict.id}</span> already exists as <strong>"{overwriteConflict.title}"</strong>.
                            <br /><br />The previous version will be archived automatically.
                        </p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setOverwriteConflict(null)} className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-all">Cancel</button>
                            <button onClick={() => handleImport(true)} className="px-4 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 transition-all">Yes, Overwrite</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
