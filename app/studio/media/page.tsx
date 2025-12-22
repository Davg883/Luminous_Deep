"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { SyncMediaButton } from "@/components/studio/SyncMediaButton";
import { useState } from "react";
import { Id } from "@/convex/_generated/dataModel";
import clsx from "clsx";
import { Star, Check, Copy, Anchor, X, User, Eye, Shirt, Lightbulb, Hand, MapPin, Wrench, Palette } from "lucide-react";

// ═══════════════════════════════════════════════════════════════
// IDENTITY ANCHOR SYSTEM: Character Lock for AI Generation
// 14 slots provide mathematical consistency for agent visuals
// ═══════════════════════════════════════════════════════════════

type Agent = "cassie" | "eleanor" | "julian";

const IDENTITY_SLOTS: Record<number, { name: string; icon: any; description: string }> = {
    1: { name: "Primary Face", icon: User, description: "The definitive front-facing portrait" },
    2: { name: "Side Profile", icon: Eye, description: "Three-quarter or profile view" },
    3: { name: "Contextual Style", icon: Palette, description: "Full-body or environment shot" },
    4: { name: "Expression A", icon: User, description: "Neutral/contemplative" },
    5: { name: "Expression B", icon: User, description: "Engaged/animated" },
    6: { name: "Expression C", icon: User, description: "Focused/working" },
    7: { name: "Hands Reference", icon: Hand, description: "Hand poses and gestures" },
    8: { name: "Wardrobe A", icon: Shirt, description: "Primary outfit reference" },
    9: { name: "Wardrobe B", icon: Shirt, description: "Secondary outfit reference" },
    10: { name: "Environment A", icon: MapPin, description: "Primary workspace" },
    11: { name: "Environment B", icon: MapPin, description: "Secondary location" },
    12: { name: "Props & Tools", icon: Wrench, description: "Character-specific items" },
    13: { name: "Lighting Ref", icon: Lightbulb, description: "Preferred lighting setup" },
    14: { name: "Style Guide", icon: Palette, description: "Overall aesthetic reference" },
};

const AGENT_COLORS: Record<Agent, { bg: string; border: string; text: string; accent: string }> = {
    cassie: { bg: "bg-amber-500/20", border: "border-amber-500", text: "text-amber-300", accent: "#F59E0B" },
    eleanor: { bg: "bg-violet-500/20", border: "border-violet-500", text: "text-violet-300", accent: "#8B5CF6" },
    julian: { bg: "bg-blue-500/20", border: "border-blue-500", text: "text-blue-300", accent: "#3B82F6" },
};

export default function MediaLibraryPage() {
    const media = useQuery(api.studio.mediaQueries.getAllMedia);
    const updateMedia = useMutation((api.studio.mediaQueries as any).updateMedia);
    const setIdentityAnchor = useMutation(api.studio.mediaQueries.setIdentityAnchor);
    const clearIdentityAnchor = useMutation(api.studio.mediaQueries.clearIdentityAnchor);
    const anchorSummary = useQuery(api.studio.mediaQueries.getIdentityAnchorSummary);

    const [search, setSearch] = useState("");
    const [filterVisualBible, setFilterVisualBible] = useState(false);
    const [selectedMedia, setSelectedMedia] = useState<string | null>(null);
    const [selectedAgent, setSelectedAgent] = useState<Agent>("eleanor");
    const [isSettingAnchor, setIsSettingAnchor] = useState(false);

    if (media === undefined) return <div className="p-8 text-gray-500 animate-pulse">Loading Media Library...</div>;

    const filtered = media.filter((item: any) =>
        (item.publicId.toLowerCase().includes(search.toLowerCase()) ||
            (item.folder && item.folder.toLowerCase().includes(search.toLowerCase()))) &&
        (!filterVisualBible || item.isVisualBible === true)
    );

    const selectedItem = selectedMedia ? media.find((m: any) => m._id === selectedMedia) : null;

    const handleToggleVisualBible = async (id: Id<"media">, currentValue: boolean) => {
        try {
            await updateMedia({ id, isVisualBible: !currentValue });
        } catch (e) {
            console.error("Failed to update Visual Bible status:", e);
        }
    };

    const handleSetIdentityAnchor = async (slot: number) => {
        if (!selectedMedia) return;
        setIsSettingAnchor(true);
        try {
            await setIdentityAnchor({
                id: selectedMedia as Id<"media">,
                agent: selectedAgent,
                slot,
            });
            alert(`✅ Set as ${IDENTITY_SLOTS[slot].name} for ${selectedAgent.charAt(0).toUpperCase() + selectedAgent.slice(1)}`);
        } catch (e: any) {
            console.error("Failed to set identity anchor:", e);
            alert(`Failed to set anchor: ${e.message || e}`);
        } finally {
            setIsSettingAnchor(false);
        }
    };

    const handleClearIdentityAnchor = async () => {
        if (!selectedMedia) return;
        setIsSettingAnchor(true);
        try {
            await clearIdentityAnchor({ id: selectedMedia as Id<"media"> });
            alert("Identity Anchor cleared");
        } catch (e: any) {
            console.error("Failed to clear identity anchor:", e);
        } finally {
            setIsSettingAnchor(false);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Media Library</h1>
                    <p className="text-gray-500 text-sm">Manage assets synced from Cloudinary • Identity Anchors power AI consistency</p>
                </div>
                <div className="flex gap-2">
                    <SyncMediaButton />
                </div>
            </header>

            {/* Identity Anchor Summary - DNA Strength Dashboard */}
            {anchorSummary && (
                <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-5 text-white">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <Anchor className="w-6 h-6 text-violet-400" />
                            <div>
                                <h3 className="font-bold text-lg">DNA Strength</h3>
                                <p className="text-xs text-gray-400">Identity Anchor slots determine AI generation consistency</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <div className="text-2xl font-bold text-violet-400">{anchorSummary.total} / 42</div>
                            <div className="text-xs text-gray-400">Total Anchors</div>
                        </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                        {(["cassie", "eleanor", "julian"] as Agent[]).map(agent => {
                            const filled = anchorSummary[agent] || 0;
                            const percentage = Math.round((filled / 14) * 100);
                            const strength = filled >= 10 ? "STRONG" : filled >= 5 ? "MODERATE" : filled >= 1 ? "WEAK" : "EMPTY";
                            const strengthColor = filled >= 10 ? "text-emerald-400" : filled >= 5 ? "text-yellow-400" : filled >= 1 ? "text-orange-400" : "text-red-400";

                            return (
                                <div key={agent} className={clsx(
                                    "rounded-xl p-4 border backdrop-blur-sm",
                                    AGENT_COLORS[agent].bg,
                                    AGENT_COLORS[agent].border
                                )}>
                                    <div className="flex items-center justify-between mb-2">
                                        <div className={clsx("font-bold capitalize text-lg", AGENT_COLORS[agent].text)}>
                                            {agent}
                                        </div>
                                        <span className={clsx("text-xs font-bold px-2 py-0.5 rounded-full bg-black/30", strengthColor)}>
                                            {strength}
                                        </span>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="h-2 bg-black/30 rounded-full overflow-hidden mb-2">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{
                                                width: `${percentage}%`,
                                                backgroundColor: AGENT_COLORS[agent].accent
                                            }}
                                        />
                                    </div>

                                    <div className="flex items-baseline justify-between">
                                        <span className="text-2xl font-bold text-white">{filled}</span>
                                        <span className="text-sm text-gray-400">/ 14 slots</span>
                                    </div>

                                    {filled < 3 && (
                                        <p className="text-xs text-gray-500 mt-2 italic">
                                            Upload LD_BIBLE_{agent.toUpperCase()}_01 to start
                                        </p>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    {/* Quick Upload Hint */}
                    <div className="mt-4 p-3 bg-black/20 rounded-lg border border-white/5">
                        <div className="flex items-center gap-2 text-sm">
                            <span className="text-violet-400">💡</span>
                            <span className="text-gray-300">
                                <strong>Auto-Sync:</strong> Upload files named <code className="bg-black/30 px-1 rounded">LD_BIBLE_JULIAN_01</code> to Cloudinary, then click Sync. The system will auto-assign Identity Anchors and extract AI tags.
                            </span>
                        </div>
                    </div>
                </div>
            )}

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
                        <h3 className="font-bold text-yellow-800">Visual Bible & Identity Anchors</h3>
                        <p className="text-sm text-yellow-700">
                            Click any asset to open the <strong>Identity Anchor</strong> panel. Assign it to one of 14 slots
                            for Julian, Eleanor, or Cassie to create a mathematical "Character Lock" for AI generation.
                        </p>
                    </div>
                </div>
            </div>

            {/* Main Layout: Grid + Sidebar */}
            <div className="flex gap-6">
                {/* Grid */}
                <div className={clsx(
                    "grid gap-4 transition-all",
                    selectedMedia ? "grid-cols-2 md:grid-cols-2 lg:grid-cols-3 flex-1" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-4 w-full"
                )}>
                    {filtered.map((item: any) => (
                        <div
                            key={item._id}
                            onClick={() => setSelectedMedia(selectedMedia === item._id ? null : item._id)}
                            className={clsx(
                                "bg-white border rounded-lg overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer",
                                selectedMedia === item._id
                                    ? "ring-2 ring-violet-500 border-violet-500"
                                    : (item as any).isVisualBible
                                        ? "border-yellow-400 ring-2 ring-yellow-200"
                                        : "border-gray-200"
                            )}
                        >
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

                                {/* Identity Anchor Badge */}
                                {(item as any).identityAgent && (
                                    <div className={clsx(
                                        "absolute top-2 left-2 px-2 py-1 rounded-full text-[10px] font-black flex items-center gap-1",
                                        AGENT_COLORS[(item as any).identityAgent as Agent]?.bg,
                                        AGENT_COLORS[(item as any).identityAgent as Agent]?.text
                                    )}>
                                        <Anchor className="w-3 h-3" />
                                        {IDENTITY_SLOTS[(item as any).identitySlot]?.name || "Anchor"}
                                    </div>
                                )}

                                {/* Visual Bible Badge (if not identity anchor) */}
                                {(item as any).isVisualBible && !(item as any).identityAgent && (
                                    <div className="absolute top-2 left-2 bg-yellow-500 text-yellow-900 px-2 py-1 rounded-full text-[10px] font-black flex items-center gap-1">
                                        <Star className="w-3 h-3 fill-yellow-900" />
                                        BIBLE
                                    </div>
                                )}

                                {/* Hover Actions */}
                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            navigator.clipboard.writeText(item.url);
                                            alert("URL Copied!");
                                        }}
                                        className="p-2 bg-white text-black rounded-lg hover:bg-gray-200"
                                        title="Copy URL"
                                    >
                                        <Copy className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleToggleVisualBible(item._id, (item as any).isVisualBible || false);
                                        }}
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

                {/* Identity Anchor Sidebar */}
                {selectedItem && (
                    <div className="w-80 bg-gradient-to-b from-slate-900 to-slate-800 rounded-xl p-4 text-white sticky top-4 h-fit">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <Anchor className="w-5 h-5 text-violet-400" />
                                <h3 className="font-bold">Identity Anchor</h3>
                            </div>
                            <button
                                onClick={() => setSelectedMedia(null)}
                                className="p-1 hover:bg-white/10 rounded"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Preview */}
                        <div className="rounded-lg overflow-hidden mb-4 border border-white/10">
                            <img src={selectedItem.url} alt={selectedItem.publicId} className="w-full aspect-square object-cover" />
                        </div>

                        <div className="text-xs text-gray-400 truncate mb-4">
                            {selectedItem.publicId}
                        </div>

                        {/* Current Anchor Status */}
                        {(selectedItem as any).identityAgent && (
                            <div className={clsx(
                                "mb-4 p-3 rounded-lg border",
                                AGENT_COLORS[(selectedItem as any).identityAgent as Agent]?.bg,
                                AGENT_COLORS[(selectedItem as any).identityAgent as Agent]?.border
                            )}>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className={clsx("font-bold capitalize", AGENT_COLORS[(selectedItem as any).identityAgent as Agent]?.text)}>
                                            {(selectedItem as any).identityAgent}
                                        </div>
                                        <div className="text-xs text-gray-300">
                                            Slot {(selectedItem as any).identitySlot}: {IDENTITY_SLOTS[(selectedItem as any).identitySlot]?.name}
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleClearIdentityAnchor}
                                        disabled={isSettingAnchor}
                                        className="px-2 py-1 text-xs bg-red-500/20 text-red-300 rounded hover:bg-red-500/40"
                                    >
                                        Clear
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Agent Selector */}
                        <div className="mb-4">
                            <div className="text-xs text-gray-400 mb-2">Select Agent</div>
                            <div className="flex gap-2">
                                {(["cassie", "eleanor", "julian"] as Agent[]).map(agent => (
                                    <button
                                        key={agent}
                                        onClick={() => setSelectedAgent(agent)}
                                        className={clsx(
                                            "flex-1 py-2 rounded-lg text-sm font-bold capitalize transition-all",
                                            selectedAgent === agent
                                                ? `${AGENT_COLORS[agent].bg} ${AGENT_COLORS[agent].border} border-2`
                                                : "bg-white/5 hover:bg-white/10"
                                        )}
                                        style={selectedAgent === agent ? { borderColor: AGENT_COLORS[agent].accent } : {}}
                                    >
                                        {agent}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Primary Slots */}
                        <div className="space-y-2 mb-4">
                            <div className="text-xs text-gray-400">Primary Slots</div>
                            {[1, 2, 3].map(slot => {
                                const SlotIcon = IDENTITY_SLOTS[slot].icon;
                                return (
                                    <button
                                        key={slot}
                                        onClick={() => handleSetIdentityAnchor(slot)}
                                        disabled={isSettingAnchor}
                                        className={clsx(
                                            "w-full p-3 rounded-lg flex items-center gap-3 transition-all text-left",
                                            "bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500",
                                            "disabled:opacity-50"
                                        )}
                                    >
                                        <SlotIcon className="w-5 h-5" />
                                        <div>
                                            <div className="font-bold text-sm">{IDENTITY_SLOTS[slot].name}</div>
                                            <div className="text-xs text-white/70">{IDENTITY_SLOTS[slot].description}</div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>

                        {/* Extended Slots (Collapsible) */}
                        <details className="group">
                            <summary className="text-xs text-gray-400 cursor-pointer hover:text-white transition-colors mb-2">
                                ▶ Extended Slots (4-14)
                            </summary>
                            <div className="space-y-1 mt-2 max-h-64 overflow-y-auto">
                                {[4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14].map(slot => {
                                    const SlotIcon = IDENTITY_SLOTS[slot].icon;
                                    return (
                                        <button
                                            key={slot}
                                            onClick={() => handleSetIdentityAnchor(slot)}
                                            disabled={isSettingAnchor}
                                            className={clsx(
                                                "w-full p-2 rounded-lg flex items-center gap-2 transition-all text-left text-sm",
                                                "bg-white/5 hover:bg-white/10",
                                                "disabled:opacity-50"
                                            )}
                                        >
                                            <SlotIcon className="w-4 h-4 text-gray-400" />
                                            <span className="truncate">{IDENTITY_SLOTS[slot].name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </details>
                    </div>
                )}
            </div>

            {filtered.length === 0 && (
                <div className="text-center py-20 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                    No media found. Try syncing or check your search.
                </div>
            )}
        </div>
    );
}
